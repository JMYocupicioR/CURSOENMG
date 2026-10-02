import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, sb } from '../lib/supabase';
import type { AppRole, CourseId, EnrollmentStatus, Profile, Subscription } from '../types/database';
import { recordUserActivity } from '../services/studentPlanService';
import { hasActivePremiumSubscription, isEnrolledInCourse as enrolledInCourse } from '../utils/courseEnrollment';
import { readAuthSnapshot, writeAuthSnapshot } from '../lib/authSnapshot';
import { useStaffViewStore } from '../stores/staffViewStore';
import { resetAutoOpenClassWizardSession } from '../utils/classWizardPreferences';

export interface StudentRegistrationData {
  email: string;
  password: string;
  fullName: string;
  credentials?: string;
  institution: string;
  academicInstitution?: string;
  specialty?: string;
  residencyYear?: string;
  cedulaProfesional?: string;
  comefyrMemberId?: string;
  cedulaVerified?: boolean;
  cedulaData?: Record<string, any> | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  /** Roles y perfil del usuario de la sesión ya se cargaron. Evita redirigir antes de saber si es admin. */
  isSessionReady: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isStudent: boolean;
  isVerifiedContributor: boolean;
  canProposeContent: boolean;
  isEnrolledPhysician: boolean;
  hasPremiumAccess: boolean;
  courseIds: CourseId[];
  pendingCourseIds: CourseId[];
  hasCourseAccess: (courseId: CourseId) => boolean;
  isEnrolledInCourse: (courseId: CourseId) => boolean;
  isCoursePending: (courseId: CourseId) => boolean;
  hasAnySellableCourse: boolean;
  subscription: Subscription | null;
  enrollmentStatus: EnrollmentStatus;
  isEnrollmentPending: boolean;
  isPendingApproval: boolean;
  isRejected: boolean;
  isCommitteeMember: boolean;
  bootstrapAvailable: boolean;
  refreshProfile: () => Promise<void>;
  signInWithOtp: (email: string, nextPath?: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpStudent: (data: StudentRegistrationData) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  claimBootstrapAdmin: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string, currentPassword?: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  uploadAvatar: (file: File) => Promise<{ url: string | null; error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type ReadyUserData = {
  status: 'ready';
  profile: Profile | null;
  roles: AppRole[];
  bootstrapAvailable: boolean;
  hasPremiumAccess: boolean;
  subscription: Subscription | null;
  courseIds: CourseId[];
  pendingCourseIds: CourseId[];
  courseSchemaReady: boolean;
};

type UserDataResult = ReadyUserData | { status: 'offline' };

function isTransportError(error: { message?: string } | null | undefined): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('offline') ||
    msg.includes('timeout') ||
    msg.includes('err_internet_disconnected')
  );
}

async function fetchUserData(userId: string): Promise<UserDataResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { status: 'offline' };
  }

  const [ctxRes, pendingRes] = await Promise.all([
    supabase.rpc('get_my_auth_context'),
    supabase
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', userId)
      .eq('status', 'pending'),
  ]);

  const parsedPendingCourseIds = ((pendingRes.data as { course_id: string }[] | null) ?? [])
    .map((row) => row.course_id)
    .filter((id): id is CourseId => typeof id === 'string' && id.length > 0);

  const ctx = ctxRes.data;
  const ctxError = ctxRes.error;

  if (!ctxError && ctx && typeof ctx === 'object') {
    const payload = ctx as {
      profile?: Profile | null;
      roles?: AppRole[];
      bootstrap_available?: boolean;
      has_premium?: boolean;
      subscription?: Subscription | null;
      course_ids?: CourseId[] | null;
    };
    const parsedCourseIds = Array.isArray(payload.course_ids)
      ? payload.course_ids.filter((id): id is CourseId => typeof id === 'string' && id.length > 0)
      : [];
    return {
      status: 'ready',
      profile: payload.profile ?? null,
      roles: (payload.roles ?? []) as AppRole[],
      bootstrapAvailable: payload.bootstrap_available === true,
      hasPremiumAccess: payload.has_premium === true,
      subscription: payload.subscription ?? null,
      courseIds: parsedCourseIds,
      pendingCourseIds: parsedPendingCourseIds,
      courseSchemaReady: Object.prototype.hasOwnProperty.call(payload, 'course_ids'),
    };
  }

  if (ctxError && isTransportError(ctxError)) {
    return { status: 'offline' };
  }

  if (ctxError) console.error('[Auth] get_my_auth_context:', ctxError.message);

  const [profileRes, rolesRes, bootstrapRes, subRes, coursesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase.rpc('bootstrap_admin_available'),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('tier', 'premium')
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ]);

  if (rolesRes.error && isTransportError(rolesRes.error)) {
    return { status: 'offline' };
  }

  if (profileRes.error) console.error('[Auth] profiles:', profileRes.error.message);
  if (rolesRes.error) console.error('[Auth] user_roles:', rolesRes.error.message);

  const roles = ((rolesRes.data as any[])?.map((r) => r.role as AppRole) ?? []) as AppRole[];
  const sub = subRes.data as Subscription | null;
  const subExpired = sub?.expires_at ? new Date(sub.expires_at) < new Date() : false;
  const hasPremiumFromSub = !!sub && sub.is_active && !subExpired;
  const hasPremiumFromRole = roles.includes('admin') || roles.includes('editor');

  const fallbackCourseIds = ((coursesRes.data as { course_id: string }[] | null) ?? [])
    .map((row) => row.course_id)
    .filter((id): id is CourseId => typeof id === 'string' && id.length > 0);

  return {
    status: 'ready',
    profile: (profileRes.data as Profile | null) ?? null,
    roles,
    bootstrapAvailable: bootstrapRes.data === true,
    hasPremiumAccess: hasPremiumFromSub || hasPremiumFromRole,
    subscription: sub ?? null,
    courseIds: fallbackCourseIds,
    pendingCourseIds: parsedPendingCourseIds,
    courseSchemaReady: !coursesRes.error,
  };
}

function applyAuthSnapshot(userId: string, apply: (snapshot: { roles: AppRole[]; profile: Profile | null }) => void) {
  const snap = readAuthSnapshot(userId);
  if (!snap) return;
  apply(snap);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [courseIds, setCourseIds] = useState<CourseId[]>([]);
  const [pendingCourseIds, setPendingCourseIds] = useState<CourseId[]>([]);
  const [courseSchemaReady, setCourseSchemaReady] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const loadUserData = useCallback(async (userId: string) => {
    applyAuthSnapshot(userId, (snap) => {
      setProfile(snap.profile);
      setRoles(snap.roles);
      if (snap.roles.includes('admin') || snap.roles.includes('editor')) {
        setHasPremiumAccess(true);
      }
    });

    try {
      const data = await fetchUserData(userId);
      if (data.status === 'offline') return;
      setProfile(data.profile);
      setRoles(data.roles);
      setBootstrapAvailable(data.bootstrapAvailable);
      setHasPremiumAccess(data.hasPremiumAccess);
      setCourseIds(data.courseIds);
      setPendingCourseIds(data.pendingCourseIds);
      setCourseSchemaReady(data.courseSchemaReady);
      setSubscription(data.subscription);
      writeAuthSnapshot({
        userId,
        roles: data.roles,
        profile: data.profile,
      });
    } catch (error) {
      console.error('[Auth] loadUserData:', error);
    } finally {
      setLoadedUserId(userId);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) return;
    await loadUserData(session.user.id);
  }, [loadUserData, session?.user.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.warn('[Auth] getSession error, limpiando sesión local inválida:', error.message);
          void supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          setSession(null);
          setIsLoading(false);
          return;
        }
        setSession(data?.session ?? null);
        if (data?.session?.user) {
          recordUserActivity(data.session.user.id, 'user_session_active', { source: 'app_launch' });
          loadUserData(data.session.user.id).finally(() => {
            if (mounted) setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error('[Auth] getSession failed:', error);
        void supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        if (mounted) {
          setSession(null);
          setIsLoading(false);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'INITIAL_SESSION') {
        // getSession().then() above ya maneja la carga inicial.
        // Solo necesitamos actuar aquí si getSession no lo hizo (poco probable pero defensivo).
        return;
      }
      if (event === 'TOKEN_REFRESH_FAILED') {
        console.warn('[Auth] Token refresh falló (400 / invalid_grant). Limpiando tokens locales.');
        void supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null);
        setProfile(null);
        setRoles([]);
        setBootstrapAvailable(false);
        setHasPremiumAccess(false);
        setCourseIds([]);
        setPendingCourseIds([]);
        setCourseSchemaReady(false);
        setSubscription(null);
        setLoadedUserId(null);
        setIsLoading(false);
        return;
      }
      if (nextSession?.user) {
        if (event === 'SIGNED_IN') {
          useStaffViewStore.getState().exitStudentMode();
          resetAutoOpenClassWizardSession();
          recordUserActivity(nextSession.user.id, 'user_login', { source: 'auth_event' });
        }
        // TOKEN_REFRESHED: recargar datos para reflejar cambios de suscripción/rol
        loadUserData(nextSession.user.id);
      } else {
        setProfile(null);
        setRoles([]);
        setBootstrapAvailable(false);
        setHasPremiumAccess(false);
        setCourseIds([]);
        setPendingCourseIds([]);
        setCourseSchemaReady(false);
        setSubscription(null);
        setLoadedUserId(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signInWithOtp = useCallback(async (email: string, nextPath?: string) => {
    const next = nextPath && nextPath.startsWith('/') ? nextPath : '/dashboard';
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { error: error.message };
      if (data.session?.user) {
        await loadUserData(data.session.user.id);
      }
      return { error: null };
    },
    [loadUserData]
  );

  const signUpStudent = useCallback(
    async (data: StudentRegistrationData) => {
      const {
        email,
        password,
        fullName,
        credentials,
        institution,
        academicInstitution,
        specialty,
        residencyYear,
        cedulaProfesional,
        comefyrMemberId,
        cedulaVerified,
        cedulaData,
      } = data;

      if (!password || password.length < 8) {
        return { error: 'La contraseña es obligatoria y debe tener al menos 8 caracteres.', needsEmailConfirmation: false };
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            credentials: credentials?.trim() || null,
            institution: institution.trim(),
            academic_institution: academicInstitution?.trim() || null,
            specialty: specialty?.trim() || null,
            residency_year: residencyYear?.trim() || null,
            cedula_profesional: cedulaProfesional?.trim() || null,
            comefyr_member_id: comefyrMemberId?.trim() || null,
            cedula_verified: cedulaVerified ?? false,
            cedula_data: cedulaData ?? null,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        return { error: error.message, needsEmailConfirmation: false };
      }

      if (signUpData.session?.user) {
        await loadUserData(signUpData.session.user.id);
        return { error: null, needsEmailConfirmation: false };
      }

      return { error: null, needsEmailConfirmation: true };
    },
    [loadUserData]
  );

  const signOut = useCallback(async () => {
    useStaffViewStore.getState().exitStudentMode();
    resetAutoOpenClassWizardSession();
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setBootstrapAvailable(false);
    setHasPremiumAccess(false);
    setCourseIds([]);
    setPendingCourseIds([]);
    setCourseSchemaReady(false);
    setSubscription(null);
    setLoadedUserId(null);
  }, []);

  const claimBootstrapAdmin = useCallback(async () => {
    const { error } = await supabase.rpc('claim_bootstrap_admin');
    if (!error) await refreshProfile();
    return { error: error?.message ?? null };
  }, [refreshProfile]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const redirectTo = `${window.location.origin}/auth/actualizar-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      return { error: error?.message ?? null };
    } catch (err: any) {
      return { error: err?.message || 'Error al solicitar el enlace de recuperación de contraseña.' };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string, currentPassword?: string) => {
    try {
      if (currentPassword) {
        const email = session?.user.email;
        if (!email) return { error: 'No hay una sesión activa. Vuelve a iniciar sesión.' };
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });
        if (signInError) return { error: 'La contraseña actual no es correcta.' };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (!error) return { error: null };

      const msg = error.message.toLowerCase();
      if (msg.includes('reauth') || msg.includes('nonce') || msg.includes('recent login')) {
        return {
          error: 'Por seguridad debes confirmar tu contraseña actual. Si ya lo hiciste, cierra sesión y usa “Olvidé mi contraseña”.',
        };
      }
      return { error: error.message };
    } catch (err: any) {
      return { error: err?.message || 'Error al actualizar la contraseña.' };
    }
  }, [session?.user.email]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!session?.user.id) return { error: 'No autenticado' };
      const allowed: (keyof Profile)[] = [
        'display_name',
        'credentials',
        'institution',
        'academic_institution',
        'specialty',
        'residency_year',
        'cedula_profesional',
        'comefyr_member_id',
        'avatar_url',
        'bio',
        'is_public',
        'subspecialty',
        'specialty_cedula',
        'cmmr_certified',
        'cmmr_number',
        'phone',
        'linkedin_url',
        'orcid_id',
        'clinical_interests',
      ];
      const payload: Record<string, unknown> = {};
      for (const key of allowed) {
        if (key in updates) payload[key] = updates[key];
      }

      const { error } = await sb.rpc('update_my_profile', { p_updates: payload });
      if (!error) await refreshProfile();
      return { error: error?.message ?? null };
    },
    [refreshProfile, session?.user.id]
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!session?.user.id) return { url: null, error: 'No autenticado' };
      if (file.size > 1024 * 1024) return { url: null, error: 'Máximo 1 MB' };
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        return { url: null, error: 'Formato no permitido (JPG, PNG, WebP)' };
      }

      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${session.user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        const storageError = uploadError as { message?: string; statusCode?: string };
        const msg = (storageError.message || '').toLowerCase();
        const statusCode = String(storageError.statusCode || '');
        // Storage responde HTTP 400 para casi cualquier fallo (objeto ausente,
        // MIME, RLS). Solo el texto "bucket not found" significa que falta el bucket.
        if (msg.includes('bucket not found')) {
          return {
            url: null,
            error: 'El bucket de almacenamiento "avatars" no existe en Supabase.',
          };
        }
        if (
          msg.includes('row-level security') ||
          msg.includes('access denied') ||
          statusCode === '403' ||
          statusCode === '42501'
        ) {
          return {
            url: null,
            error: 'Permiso de almacenamiento restringido en el bucket avatars.',
          };
        }
        return { url: null, error: storageError.message || 'No se pudo subir la foto' };
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      const { error: profileError } = await updateProfile({ avatar_url: url });
      return { url, error: profileError };
    },
    [session?.user.id, updateProfile]
  );

  const value = useMemo<AuthContextValue>(() => {
    const hasContributorRole = roles.includes('contributor');
    const isAdmin = roles.includes('admin');
    const isEditor = roles.includes('editor');
    const isStudent = roles.includes('student');
    const canProposeContent =
      isAdmin ||
      isEditor ||
      (Boolean(profile?.verified_at) && hasContributorRole);
    const isVerifiedContributor = canProposeContent;
    const enrollmentStatus: EnrollmentStatus = profile?.enrollment_status ?? 'none';
    const isEnrolledPhysician =
      isAdmin ||
      isEditor ||
      (enrollmentStatus === 'approved' && Boolean(profile?.enrollment_verified_at));
    const isPendingApproval =
      !isAdmin && !isEditor && (enrollmentStatus === 'pending' || enrollmentStatus === 'none');
    const isRejected =
      !isAdmin && !isEditor && enrollmentStatus === 'rejected';
    const isCommitteeMember = isAdmin || isEditor;
    const effectivePremium = hasPremiumAccess;
    const staffOrPremium = isAdmin || isEditor || effectivePremium;
    const legacyUnlock = !courseSchemaReady && isEnrolledPhysician;
    const ownedCourses: CourseId[] = courseIds;
    const paidPremium = hasActivePremiumSubscription(subscription);
    const legacyStudentUnlock =
      !courseSchemaReady &&
      enrollmentStatus === 'approved' &&
      Boolean(profile?.enrollment_verified_at);
    const hasAnySellableCourse =
      staffOrPremium || legacyUnlock || ownedCourses.some((id) => id !== 'referencia');
    const hasCourseAccess = (courseId: CourseId) => {
      if (staffOrPremium || legacyUnlock) return true;
      if (courseId === 'referencia') return hasAnySellableCourse;
      return ownedCourses.includes(courseId);
    };
    const isEnrolledInCourse = (courseId: CourseId) =>
      enrolledInCourse(courseId, ownedCourses, {
        premiumSubscription: paidPremium,
        legacyStudentUnlock,
      });

    return {
      session,
      user: session?.user ?? null,
      profile,
      roles,
      isLoading,
      isSessionReady: !session?.user || loadedUserId === session.user.id,
      isAdmin,
      isEditor,
      isStudent,
      isVerifiedContributor,
      canProposeContent,
      isEnrolledPhysician,
      hasPremiumAccess: effectivePremium,
      courseIds: ownedCourses,
      pendingCourseIds,
      hasCourseAccess,
      isEnrolledInCourse,
      isCoursePending: (courseId: CourseId) => pendingCourseIds.includes(courseId),
      hasAnySellableCourse,
      subscription,
      enrollmentStatus,
      isEnrollmentPending: enrollmentStatus === 'pending',
      isPendingApproval,
      isRejected,
      isCommitteeMember,
      bootstrapAvailable,
      refreshProfile,
      signInWithOtp,
      signInWithPassword,
      resetPassword,
      updatePassword,
      signUpStudent,
      signOut,
      claimBootstrapAdmin,
      updateProfile,
      uploadAvatar,
    };
  }, [
      session,
      profile,
      roles,
      isLoading,
      loadedUserId,
      hasPremiumAccess,
      courseIds,
      pendingCourseIds,
      courseSchemaReady,
      subscription,
      bootstrapAvailable,
      refreshProfile,
      signInWithOtp,
      signInWithPassword,
      resetPassword,
      updatePassword,
      signUpStudent,
      signOut,
      claimBootstrapAdmin,
      updateProfile,
      uploadAvatar,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
