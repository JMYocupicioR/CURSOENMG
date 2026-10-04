import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Upload,
  Save,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  CheckCircle2,
  Building2,
  GraduationCap,
  Stethoscope,
  Sparkles,
  Award,
  FileCheck,
  Check,
  X,
  AlertCircle,
  Shield,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { adminUpdateProfile } from '../../services/editorialService';
import { sb } from '../../lib/supabase';
import type { Profile } from '../../types/database';
import { isEnrollmentProfileComplete } from '../../utils/adminUtils';
import { verifyCedula, type CedulaVerificationResult } from '../../services/cedulaService';
import { BRAND } from '../../config/brand';
import {
  POPULAR_HOSPITALS,
  POPULAR_UNIVERSITIES,
  POPULAR_SPECIALTIES,
  RESIDENCY_YEARS,
  ACADEMIC_CATEGORIES,
  COMMON_CREDENTIALS,
} from '../../utils/medicalCatalog';

const MEDICAL_CATEGORIES = [
  {
    id: 'resident',
    title: 'Médico Residente de Rehabilitación',
    description: 'En formación activa de la especialidad (R1 a R4)',
    icon: GraduationCap,
  },
  {
    id: 'specialist_rehab',
    title: 'Especialista en Medicina de Rehabilitación',
    description: 'Médico certificado o adscrito en medicina física y rehabilitación',
    icon: Stethoscope,
  },
  {
    id: 'neurophysiologist',
    title: 'Neurofisiólogo Clínico / Cursista',
    description: 'Especialista o fellow enfocado en electrodiagnóstico avanzado',
    icon: Sparkles,
  },
  {
    id: 'other_doctor',
    title: 'Médico Especialista Afín',
    description: 'Neurología, Ortopedia, Medicina del Trabajo o cursista libre',
    icon: Building2,
  },
];

export default function ProfileSetupPage() {
  const { userId: routeUserId } = useParams();
  const {
    user,
    profile: ownProfile,
    isAdmin,
    updateProfile,
    uploadAvatar,
    isVerifiedContributor,
    enrollmentStatus,
    isEnrolledPhysician,
  } = useAuth();

  const editingOther = Boolean(routeUserId && isAdmin && routeUserId !== user?.id);
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [loadingTarget, setLoadingTarget] = useState(Boolean(routeUserId));
  const [targetError, setTargetError] = useState<string | null>(null);
  const profile = editingOther ? targetProfile : ownProfile;

  useEffect(() => {
    if (!routeUserId) {
      setLoadingTarget(false);
      return;
    }
    if (!isAdmin) {
      setTargetError('Solo un administrador puede editar el perfil de otro usuario.');
      setLoadingTarget(false);
      return;
    }
    let cancelled = false;
    setLoadingTarget(true);
    setTargetError(null);
    sb.from('profiles')
      .select('*')
      .eq('id', routeUserId)
      .maybeSingle()
      .then(({ data, error }: { data: Profile | null; error: { message: string } | null }) => {
        if (cancelled) return;
        if (error) setTargetError(error.message);
        else if (!data) setTargetError('No se encontró el perfil de este usuario.');
        else setTargetProfile(data);
        setLoadingTarget(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routeUserId, isAdmin]);

  const [form, setForm] = useState({
    display_name: profile?.display_name ?? '',
    credentials: profile?.credentials ?? '',
    institution: profile?.institution ?? '',
    academic_institution: profile?.academic_institution ?? '',
    specialty: profile?.specialty ?? '',
    residency_year: profile?.residency_year ?? '',
    cedula_profesional: profile?.cedula_profesional ?? '',
    comefyr_member_id: profile?.comefyr_member_id ?? '',
    bio: profile?.bio ?? '',
    is_public: profile?.is_public ?? true,
    cedula_verified: profile?.cedula_verified ?? false,
    cedula_data: profile?.cedula_data ?? null,
    subspecialty: profile?.subspecialty ?? '',
    specialty_cedula: profile?.specialty_cedula ?? '',
    cmmr_certified: profile?.cmmr_certified ?? false,
    cmmr_number: profile?.cmmr_number ?? '',
    phone: profile?.phone ?? '',
    linkedin_url: profile?.linkedin_url ?? '',
    orcid_id: profile?.orcid_id ?? '',
  });

  // Categoría médica asistida
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const spec = (profile?.specialty ?? '').toLowerCase();
    const cred = (profile?.credentials ?? '').toLowerCase();
    const year = (profile?.residency_year ?? '').toLowerCase();
    if (year.startsWith('r') || spec.includes('residente') || cred.includes('residente')) {
      return 'resident';
    }
    if (spec.includes('neurofisiolog') || cred.includes('neurofisiolog')) {
      return 'neurophysiologist';
    }
    if (spec.includes('rehabilitaci') || cred.includes('rehabilitaci')) {
      return 'specialist_rehab';
    }
    return 'resident';
  });

  const [confirmedProfessional, setConfirmedProfessional] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Estados de verificación de Cédula SEP
  const [verifyingCedula, setVerifyingCedula] = useState(false);
  const [cedulaError, setCedulaError] = useState<string | null>(null);
  const [cedulaSuccessResult, setCedulaSuccessResult] = useState<CedulaVerificationResult | null>(null);

  // Estados de avatar
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);

  const institutionInputRef = useRef<HTMLInputElement>(null);
  const academicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarImgFailed(false);
  }, [profile?.avatar_url]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      display_name: profile.display_name ?? '',
      credentials: profile.credentials ?? '',
      institution: profile.institution ?? '',
      academic_institution: profile.academic_institution ?? '',
      specialty: profile.specialty ?? '',
      residency_year: profile.residency_year ?? '',
      cedula_profesional: profile.cedula_profesional ?? '',
      comefyr_member_id: profile.comefyr_member_id ?? '',
      bio: profile.bio ?? '',
      is_public: profile.is_public ?? true,
      cedula_verified: profile.cedula_verified ?? false,
      cedula_data: profile.cedula_data ?? null,
      subspecialty: profile.subspecialty ?? '',
      specialty_cedula: profile.specialty_cedula ?? '',
      cmmr_certified: profile.cmmr_certified ?? false,
      cmmr_number: profile.cmmr_number ?? '',
      phone: profile.phone ?? '',
      linkedin_url: profile.linkedin_url ?? '',
      orcid_id: profile.orcid_id ?? '',
    });

    if (profile.cedula_verified && profile.cedula_data) {
      const d = profile.cedula_data as any;
      setCedulaSuccessResult({
        found: true,
        cedula: profile.cedula_profesional || d.cedula || '',
        fullName: d.nombreCompleto || d.fullName || `${d.nombre || ''} ${d.primerApellido || ''}`.trim(),
        firstName: d.nombre || '',
        paternalSurname: d.primerApellido || '',
        maternalSurname: d.segundoApellido || '',
        profession: d.profesion || d.titulo || '',
        rawProfession: d.profesion || '',
        institution: d.institucion || profile.academic_institution || '',
        registrationYear: d.anioRegistro || d.registrationYear || '',
        type: d.tipo || d.type || '',
        isMedical: true,
        rawData: d,
      });
    }
  }, [profile]);

  // Manejador de Categoría Asistida
  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    if (catId === 'resident') {
      const curYear = form.residency_year?.startsWith('R') ? form.residency_year : 'R2';
      setForm((prev) => ({
        ...prev,
        residency_year: curYear,
        specialty: prev.specialty?.trim() ? prev.specialty : 'Medicina de Rehabilitación',
        credentials: `Médico Residente ${curYear}`,
      }));
    } else if (catId === 'specialist_rehab') {
      setForm((prev) => ({
        ...prev,
        residency_year: prev.residency_year?.startsWith('R') ? 'Médico Adscrito' : (prev.residency_year || 'Médico Adscrito'),
        specialty: 'Medicina de Rehabilitación',
        credentials: prev.credentials?.includes('Residente') || !prev.credentials
          ? 'Médico Especialista en Medicina de Rehabilitación'
          : prev.credentials,
      }));
    } else if (catId === 'neurophysiologist') {
      setForm((prev) => ({
        ...prev,
        residency_year: prev.residency_year?.startsWith('R') ? 'Médico Certificado' : (prev.residency_year || 'Médico Certificado'),
        specialty: 'Neurofisiología Clínica / Electrodiagnóstico',
        credentials: 'Neurofisiólogo Clínico',
      }));
    } else if (catId === 'other_doctor') {
      setForm((prev) => ({
        ...prev,
        residency_year: prev.residency_year?.startsWith('R') ? 'Médico Especialista' : (prev.residency_year || 'Médico Especialista'),
        specialty: prev.specialty || 'Neurología / Especialidad Afín',
        credentials: prev.credentials || 'Médico Especialista',
      }));
    }
  };

  const handleSelectResidencyYear = (year: string) => {
    setForm((prev) => ({
      ...prev,
      residency_year: year,
      credentials: `Médico Residente ${year}`,
    }));
  };

  // Manejador de Verificación SEP
  const handleVerify = async () => {
    const clean = (form.cedula_profesional || '').replace(/\D/g, '').trim();
    if (!clean) {
      setCedulaError('Ingresa un número de cédula válido (6 a 8 dígitos).');
      return;
    }
    if (clean.length < 5 || clean.length > 10) {
      setCedulaError('La cédula profesional debe contener entre 6 y 8 dígitos.');
      return;
    }

    setVerifyingCedula(true);
    setCedulaError(null);

    try {
      const res = await verifyCedula(clean);
      if (res.found) {
        setCedulaSuccessResult(res);
        setForm((prev) => ({
          ...prev,
          cedula_profesional: clean,
          cedula_verified: true,
          cedula_data: res.rawData || res,
          display_name: prev.display_name?.trim() ? prev.display_name : `Dr(a). ${res.fullName}`,
          academic_institution: prev.academic_institution?.trim() ? prev.academic_institution : (res.institution || ''),
          specialty:
            prev.specialty?.trim() && prev.specialty !== 'General'
              ? prev.specialty
              : res.suggestedCategory === 'specialist_rehab'
              ? 'Medicina de Rehabilitación'
              : res.suggestedCategory === 'neurophysiologist'
              ? 'Neurofisiología Clínica / Electrodiagnóstico'
              : prev.specialty || 'Medicina de Rehabilitación',
        }));
        if (res.suggestedCategory) {
          setSelectedCategory(res.suggestedCategory);
        }
      } else {
        setCedulaSuccessResult(null);
        setCedulaError(res.error || 'No se encontró registro para esta cédula en la Dirección General de Profesiones (SEP).');
      }
    } catch (err: any) {
      setCedulaSuccessResult(null);
      setCedulaError(err?.message || 'Error al conectar con el Registro Nacional de Profesionistas.');
    } finally {
      setVerifyingCedula(false);
    }
  };

  // Manejador de Guardar Perfil
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedProfessional) {
      setError('Debes confirmar que eres profesional de la salud.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);

    const result = editingOther && routeUserId
      ? await adminUpdateProfile(routeUserId, form)
          .then(() => ({ error: null as string | null }))
          .catch((err: unknown) => ({
            error: err instanceof Error ? err.message : 'No se pudo guardar el perfil.',
          }))
      : await updateProfile(form as Partial<Profile>);
    if (!result.error && editingOther && routeUserId) {
      setTargetProfile((prev) => (prev ? { ...prev, ...form } : prev));
    }
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else if (isEnrollmentProfileComplete(form)) {
      setMessage('✅ Perfil guardado con éxito. Tu expediente profesional está completo.');
    } else {
      setMessage('✅ Perfil guardado. Te sugerimos completar todos los campos para tu expediente oficial.');
    }
  };

  // Manejador de Subida de Avatar
  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarMessage(null);
    setUploadingAvatar(true);

    const result = await uploadAvatar(file);
    setUploadingAvatar(false);

    if (result.error) {
      setAvatarError(result.error);
    } else {
      setAvatarImgFailed(false);
      setAvatarMessage('Foto de perfil actualizada correctamente.');
    }
  };

  const [removingAvatar, setRemovingAvatar] = useState(false);
  const handleRemoveAvatar = async () => {
    setRemovingAvatar(true);
    setAvatarError(null);
    setAvatarMessage(null);
    const result = await updateProfile({ avatar_url: null });
    setRemovingAvatar(false);
    if (result.error) {
      setAvatarError(result.error);
    } else {
      setAvatarImgFailed(false);
      setAvatarMessage('Foto eliminada correctamente.');
    }
  };

  const enrollmentBanner = () => {
    if (isEnrolledPhysician) {
      return (
        <div className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-sm text-emerald-800 dark:text-emerald-200 shadow-sm">
          <CheckCircle className="w-5 h-5 mt-0.5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              {isVerifiedContributor ? 'Colaborador Médico Verificado' : 'Inscripción Médica Aprobada'}
            </p>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 mt-0.5">
              {isVerifiedContributor
                ? (BRAND.enableAccreditation
                    ? 'Tienes acceso a evaluaciones clínicas, emisión de constancias y propuesta de contenidos avalados por COMEFYR.'
                    : 'Tienes acceso a evaluaciones clínicas, emisión de constancias y propuesta de contenidos del posgrado.')
                : 'Tu perfil está activo en el posgrado. Tienes acceso completo a módulos y evaluaciones de casos clínicos.'}
            </p>
          </div>
        </div>
      );
    }
    if (enrollmentStatus === 'pending') {
      return (
        <div className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-sm text-amber-800 dark:text-amber-200 shadow-sm">
          <Clock className="w-5 h-5 mt-0.5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-100">Solicitud en revisión</p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-0.5">
              Tu solicitud de inscripción médica está en proceso de revisión por el comité académico. Te notificaremos en cuanto sea aprobada.
            </p>
          </div>
        </div>
      );
    }
    if (enrollmentStatus === 'rejected') {
      return (
        <div className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/80 text-sm text-red-800 dark:text-red-200 shadow-sm">
          <XCircle className="w-5 h-5 mt-0.5 text-rose-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-rose-900 dark:text-rose-100">Solicitud pendiente de corrección</p>
            <p className="text-xs text-rose-800/80 dark:text-rose-200/80 mt-0.5">
              Verifica que tus credenciales, sede y cédula profesional coincidan para que el comité pueda aprobar tu expediente.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-900/20 via-cyan-900/15 to-indigo-900/20 border border-cyan-500/20 text-slate-700 dark:text-slate-300 text-sm flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">Asistente de Expediente Profesional</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verifica tu cédula ante la Dirección General de Profesiones (SEP) o utiliza los botones de autocompletado rápido para configurar tu perfil médico en un par de clics.
          </p>
        </div>
      </div>
    );
  };

  if (routeUserId && (loadingTarget || targetError || !profile)) {
    return (
      <div className="pt-24 pb-16 px-4 max-w-3xl mx-auto">
        <Link to="/admin/usuarios" className="text-sm text-cyan-600 dark:text-cyan-400 font-semibold">
          Volver al directorio
        </Link>
        <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
          {targetError || 'Cargando perfil del usuario…'}
        </p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 max-w-3xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          {editingOther && (
            <Link to={`/admin/alumnos/${routeUserId}`} className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
              Volver al expediente
            </Link>
          )}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-cyan-500" />
            {editingOther ? 'Editar perfil del usuario' : 'Mi perfil profesional'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {editingOther
              ? `Estás editando el expediente de ${profile?.display_name || 'este usuario'}. Desde aquí puedes verificar la cédula ante la SEP.`
              : 'Expediente de posgrado médico, verificación SEP y constancias COMEFYR'}
          </p>
        </div>
      </div>

      {editingOther ? null : enrollmentBanner()}

      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-slate-950/5 space-y-8">
        
        {/* ─── FOTO DE PERFIL / AVATAR ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-cyan-500/10 overflow-hidden shrink-0">
            {profile?.avatar_url && !avatarImgFailed ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setAvatarImgFailed(true)}
              />
            ) : (
              (form.display_name || 'MD').charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              {editingOther ? (
                <span className="text-[11px] text-slate-500">La foto se conserva. Puedes corregir datos y verificar la cédula.</span>
              ) : (
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold cursor-pointer border border-slate-200 dark:border-slate-700 transition">
                {uploadingAvatar ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                    <span>Subiendo foto...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-cyan-500" />
                    <span>Subir nueva foto</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={handleAvatar}
                />
              </label>
              )}

              {!editingOther && profile?.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={removingAvatar}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-semibold border border-rose-500/20 transition cursor-pointer"
                  title="Eliminar foto actual o limpiar URL dañada"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{removingAvatar ? 'Eliminando...' : 'Quitar foto'}</span>
                </button>
              )}

              {!editingOther && (
                <span className="text-[11px] text-slate-500">JPG, PNG o WebP (máx. 1 MB). Visible en tu perfil público.</span>
              )}
            </div>
            {avatarError && <p className="text-xs text-rose-500 mt-2 font-medium">{avatarError}</p>}
            {avatarMessage && <p className="text-xs text-emerald-500 mt-2 font-medium">{avatarMessage}</p>}
          </div>
        </div>

        {/* ─── ASISTENTE DE CÉDULA PROFESIONAL (SEP MÉXICO) ─── */}
        <div className="space-y-3 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-cyan-500" />
              Cédula profesional (Verificación Oficial SEP)
            </label>
            {form.cedula_verified ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verificada ante la SEP
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Opcional
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            No es obligatoria para usar la plataforma. Puedes guardarla más adelante si la necesitas para constancia o diploma.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={form.cedula_profesional ?? ''}
                onChange={(e) => {
                  setForm({ ...form, cedula_profesional: e.target.value, cedula_verified: false });
                  setCedulaError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleVerify();
                  }
                }}
                placeholder="ej. 12345678 (6 a 8 dígitos)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition font-mono"
              />
            </div>
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifyingCedula || !form.cedula_profesional?.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-500/10 transition cursor-pointer shrink-0"
            >
              {verifyingCedula ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Consultando SEP...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Verificar Cédula SEP</span>
                </>
              )}
            </button>
          </div>

          {/* Error o aviso no encontrado */}
          {cedulaError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{cedulaError}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  ¿En trámite o residente R1? Puedes llenar tus datos manualmente en los campos correspondientes.
                </p>
              </div>
            </div>
          )}

          {/* Tarjeta de Verificación SEP Exitosa */}
          {form.cedula_verified && cedulaSuccessResult && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-emerald-950/30 dark:bg-emerald-950/50 border border-emerald-500/50 text-emerald-900 dark:text-emerald-200 text-xs space-y-3 shadow-md"
            >
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cédula Oficial Verificada
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                  #{cedulaSuccessResult.cedula}
                </span>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Titular Registrado(a)</p>
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {cedulaSuccessResult.fullName}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Título Oficial:</span>{' '}
                  <strong className="text-slate-800 dark:text-slate-100">{cedulaSuccessResult.profession}</strong>
                </div>
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Institución de Egreso:</span>{' '}
                  <strong className="text-slate-800 dark:text-slate-100">{cedulaSuccessResult.institution}</strong>
                </div>
                {cedulaSuccessResult.registrationYear && (
                  <div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Año de Expedición:</span>{' '}
                    <strong className="text-slate-800 dark:text-slate-100">{cedulaSuccessResult.registrationYear}</strong>
                  </div>
                )}
                {cedulaSuccessResult.type && (
                  <div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tipo:</span>{' '}
                    <strong className="text-slate-800 dark:text-slate-100">{cedulaSuccessResult.type}</strong>
                  </div>
                )}
              </div>

              {/* Botones de acción rápida para aplicar datos de la SEP */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-emerald-500/20">
                {cedulaSuccessResult.fullName && form.display_name !== `Dr(a). ${cedulaSuccessResult.fullName}` && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, display_name: `Dr(a). ${cedulaSuccessResult.fullName}` }))}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-200 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" /> Aplicar nombre oficial a perfil
                  </button>
                )}
                {cedulaSuccessResult.institution && form.academic_institution !== cedulaSuccessResult.institution && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, academic_institution: cedulaSuccessResult.institution }))}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-200 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" /> Aplicar institución de egreso
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* ─── ASISTENTE DE CATEGORÍA FORMATIVA Y NIVEL ACADÉMICO ─── */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Categoría formativa / Perfil asistido
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {MEDICAL_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-cyan-500 dark:border-cyan-500 shadow-md shadow-cyan-500/5'
                      : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                      {cat.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {cat.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Grado de residencia rápido si es Residente */}
          {selectedCategory === 'resident' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3.5 rounded-2xl bg-cyan-950/20 dark:bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Año de Residencia Médica</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Selecciona tu grado formativo actual</p>
              </div>
              <div className="flex gap-1.5">
                {RESIDENCY_YEARS.map((year) => {
                  const isSelected = form.residency_year === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleSelectResidencyYear(year)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-sm font-extrabold'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* ─── FORMULARIO DE DETALLES PROFESIONALES ─── */}
        <form onSubmit={handleSave} className="space-y-6">

          {/* Nombre completo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Nombre completo con título profesional *
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                required
                value={form.display_name ?? ''}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="ej. Dr. Juan Marcos Morales Ruiz"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
              />
            </div>
          </div>

          {/* Sede Hospitalaria con Carrusel de Chips y Datalist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-cyan-500" />
                Sede hospitalaria (Hospital / Clínica) *
              </label>
              {form.institution && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, institution: '' })}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition flex items-center gap-1 cursor-pointer"
                  title="Limpiar sede"
                >
                  <X className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>

            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                ref={institutionInputRef}
                type="text"
                required
                list="profile-popular-hospitals-list"
                value={form.institution ?? ''}
                onChange={(e) => setForm({ ...form, institution: e.target.value })}
                placeholder={'ej. T1: "Ignacio García Téllez" IMSS Mérida, INR, CMN Siglo XXI...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
              />
            </div>

            <datalist id="profile-popular-hospitals-list">
              {POPULAR_HOSPITALS.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>

            {/* Chips de sedes rápidas */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                <span>Sedes frecuentes (selecciona en un clic):</span>
                {form.institution && !POPULAR_HOSPITALS.includes(form.institution) && form.institution.trim().length >= 3 && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Sede personalizada
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                {POPULAR_HOSPITALS.slice(0, 10).map((h) => {
                  const isSelected = form.institution === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, institution: isSelected ? '' : h }))}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] transition flex items-center gap-1.5 border cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/60 font-semibold shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 text-cyan-500 shrink-0" /> : <span className="text-slate-400 font-bold">+</span>}
                      <span className="whitespace-nowrap">{h}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Institución Académica / Universidad de Egreso */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-cyan-500" />
                Institución académica / Universidad de egreso
              </label>
              <div className="flex items-center gap-2">
                {form.academic_institution && form.cedula_verified && (
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Autocompletado SEP
                  </span>
                )}
                {form.academic_institution && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, academic_institution: '' })}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition flex items-center gap-1 cursor-pointer"
                    title="Limpiar universidad"
                  >
                    <X className="w-3 h-3" /> Limpiar
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                ref={academicInputRef}
                type="text"
                list="profile-popular-universities-list"
                value={form.academic_institution ?? ''}
                onChange={(e) => setForm({ ...form, academic_institution: e.target.value })}
                placeholder="ej. Universidad Nacional Autónoma de México (UNAM), UVM, IPN..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
              />
            </div>

            <datalist id="profile-popular-universities-list">
              {POPULAR_UNIVERSITIES.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>

            {/* Chips de universidades rápidas */}
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
              {POPULAR_UNIVERSITIES.slice(0, 8).map((u) => {
                const isSelected = form.academic_institution === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, academic_institution: isSelected ? '' : u }))}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] transition flex items-center gap-1.5 border cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/60 font-semibold shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3 text-cyan-500 shrink-0" /> : <span className="text-slate-400 font-bold">+</span>}
                    <span className="whitespace-nowrap">{u}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid de Especialidad y Año / Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Especialidad */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-cyan-500" /> Especialidad médica
              </label>
              <input
                type="text"
                value={form.specialty ?? ''}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                placeholder="ej. Medicina de Rehabilitación"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:border-cyan-500 outline-none transition"
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {POPULAR_SPECIALTIES.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, specialty: s }))}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 transition cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Año de residencia o categoría académica */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-cyan-500" /> Grado formativo o rol
              </label>
              <input
                type="text"
                value={form.residency_year ?? ''}
                onChange={(e) => setForm({ ...form, residency_year: e.target.value })}
                placeholder="ej. R4 Residente, Médico Adscrito"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:border-cyan-500 outline-none transition"
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {ACADEMIC_CATEGORIES.slice(0, 5).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, residency_year: r }))}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 transition cursor-pointer"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Credenciales médicas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Credenciales médicas (Aparecen en diplomas y constancias) *
            </label>
            <input
              type="text"
              required
              value={form.credentials ?? ''}
              onChange={(e) => setForm({ ...form, credentials: e.target.value })}
              placeholder="ej. Médico Especialista en Medicina de Rehabilitación"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:border-cyan-500 outline-none transition"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {COMMON_CREDENTIALS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, credentials: c }))}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 transition cursor-pointer"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Número de socio COMEFYR */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-cyan-500" />
                {BRAND.enableAccreditation
                  ? 'Número de socio COMEFYR (opcional para constancias avaladas)'
                  : 'Número de Colegiado o Registro Profesional (opcional)'}
              </label>
              <span className="text-[11px] text-slate-400">
                {BRAND.enableAccreditation ? 'Colegio Mexicano de Medicina de Rehabilitación' : 'Registro Oficial'}
              </span>
            </div>
            <input
              type="text"
              value={form.comefyr_member_id ?? ''}
              onChange={(e) => setForm({ ...form, comefyr_member_id: e.target.value })}
              placeholder="ej. CM-12345"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:border-cyan-500 outline-none transition font-mono"
            />
          </div>

          {/* Biografía breve */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Biografía breve / Intereses clínicos
            </label>
            <textarea
              rows={3}
              value={form.bio ?? ''}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="ej. Médico especialista enfocado en electrodiagnóstico, plexopatías y trastornos neuromusculares. Profesor de posgrado..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:border-cyan-500 outline-none transition"
            />
          </div>

          {/* ─── EXPEDIENTE CURRICULAR Y ACREDITACIONES MÉDICAS ─── */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Ampliación de Currículum y Acreditación Médica
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subespecialidad / Fellowships
                </label>
                <input
                  type="text"
                  value={form.subspecialty ?? ''}
                  onChange={(e) => setForm({ ...form, subspecialty: e.target.value })}
                  placeholder="ej. Electrodiagnóstico y Patología Neuromuscular"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cédula Profesional de Especialidad (SEP)
                </label>
                <input
                  type="text"
                  value={form.specialty_cedula ?? ''}
                  onChange={(e) => setForm({ ...form, specialty_cedula: e.target.value })}
                  placeholder="ej. 87654321"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Certificación Consejo Mexicano (CMMR)
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="cmmr_checkbox"
                    checked={form.cmmr_certified}
                    onChange={(e) => setForm({ ...form, cmmr_certified: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-700"
                  />
                  <label htmlFor="cmmr_checkbox" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    Certificación CMMR vigente
                  </label>
                </div>
              </div>

              {form.cmmr_certified && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Número de Folio / Registro CMMR
                  </label>
                  <input
                    type="text"
                    value={form.cmmr_number ?? ''}
                    onChange={(e) => setForm({ ...form, cmmr_number: e.target.value })}
                    placeholder="ej. CMMR-2024-998"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Teléfono de Contacto Profesional
                </label>
                <input
                  type="tel"
                  value={form.phone ?? ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="ej. +52 999 123 4567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Enlace Perfil LinkedIn
                </label>
                <input
                  type="url"
                  value={form.linkedin_url ?? ''}
                  onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Identificador ORCID (Investigación)
                </label>
                <input
                  type="text"
                  value={form.orcid_id ?? ''}
                  onChange={(e) => setForm({ ...form, orcid_id: e.target.value })}
                  placeholder="0000-0002-..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Checkboxes de visibilidad y declaración */}
          <div className="space-y-3 pt-2">
            <div>
              <label className={`flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 ${profile?.enrollment_status === 'approved' ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                <input
                  type="checkbox"
                  checked={form.is_public}
                  disabled={profile?.enrollment_status !== 'approved'}
                  onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-700 disabled:cursor-not-allowed"
                />
                <span>Mostrar mi perfil públicamente en la lista de especialistas de ElectroDx Diplomado</span>
              </label>
              {profile?.enrollment_status !== 'approved' && (
                <p className="mt-1 pl-7 text-[11px] text-slate-500 dark:text-slate-400">
                  Disponible cuando tu inscripción al diplomado esté aprobada.
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedProfessional}
                onChange={(e) => setConfirmedProfessional(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-700"
              />
              <span>Confirmo ser profesional de la salud o médico en formación y que los datos proporcionados son verídicos.</span>
            </label>
          </div>

          {/* Mensajes de error / éxito */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Botón de Guardar Perfil */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 dark:text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-60 transition cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando expediente...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar perfil profesional</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
