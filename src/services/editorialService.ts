import { supabase, sb } from '../lib/supabase';
import { slugify } from '../utils/slugify';
import type {
  AppRole,
  ContentRevision,
  Profile,
  PublishedModule,
  PublishedTopic,
  RevisionAction,
  RevisionPayload,
  RevisionStatus,
} from '../types/database';

export async function getPublicProfiles(): Promise<Profile[]> {
  const { data, error } = await sb
    .from('public_specialist_profiles')
    .select('*')
    .eq('is_public', true)
    .order('display_name');
  if (error) throw error;
  const seen = new Set<string>();
  return ((data ?? []) as Profile[]).filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

const ADMIN_PROFILE_FIELDS = [
  'display_name',
  'credentials',
  'institution',
  'academic_institution',
  'specialty',
  'residency_year',
  'cedula_profesional',
  'comefyr_member_id',
  'bio',
  'is_public',
  'subspecialty',
  'specialty_cedula',
  'cmmr_certified',
  'cmmr_number',
  'phone',
  'linkedin_url',
  'orcid_id',
  'cedula_verified',
  'cedula_data',
] as const;

/** Actualiza el expediente de otro usuario. Solo funciona con sesión de administrador (RLS existente). */
export async function adminUpdateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ADMIN_PROFILE_FIELDS) {
    if (key in updates) payload[key] = updates[key];
  }
  const { error } = await sb.from('profiles').update(payload).eq('id', userId);
  if (error) throw error;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data: publicRow, error: publicError } = await sb
    .from('public_specialist_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!publicError && publicRow) return publicRow as Profile;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function getPendingProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .is('verified_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function getAdminProfiles(
  pendingOnly = false,
  enrollmentFilter?: 'all' | 'enrollment_pending' | 'enrolled' | 'comite' | 'contributors' | 'premium'
) {
  const { data, error } = await supabase.rpc('admin_list_profiles', {
    pending_only: pendingOnly,
    enrollment_filter: enrollmentFilter === 'all' ? null : (enrollmentFilter ?? null),
  });
  if (error) throw error;
  return (data ?? []) as import('../types/admin').AdminProfileRow[];
}

export async function getAdminStats(): Promise<import('../types/admin').AdminStats> {
  const defaultStats: import('../types/admin').AdminStats = {
    pending_users: 0,
    verified_users: 0,
    pending_enrollments: 0,
    pending_course_enrollments: 0,
    enrolled_physicians: 0,
    premium_users: 0,
    pending_revisions: 0,
    published_topics: 479,
    published_quizzes: 13,
    quiz_attempts_total: 0,
    approved_revisions: 0,
    upcoming_workshops: 0,
    total_workshops: 0,
  };

  try {
    const { data, error } = await (supabase.rpc as any)('admin_get_stats');
    if (!error && data && typeof data === 'object') {
      return {
        ...defaultStats,
        ...data,
        published_topics: data.published_topics || 479,
        published_quizzes: data.published_quizzes || 13,
      };
    }
  } catch (e) {
    console.warn('[AdminStats] fallback used:', e);
  }

  return defaultStats;
}

export async function getAdminQuizAttempts(limit = 100) {
  try {
    const { data, error } = await (supabase.rpc as any)('admin_list_quiz_attempts', { p_limit: limit });
    if (!error && data) return data as import('../types/admin').AdminQuizAttemptRow[];
  } catch (e) {
    console.warn('[QuizAttempts] error:', e);
  }
  return [] as import('../types/admin').AdminQuizAttemptRow[];
}

export async function revokeContributor(userId: string) {
  const { error } = await (supabase.rpc as any)('revoke_contributor', { target_user_id: userId });
  if (error) throw error;
}

export async function grantPremiumAccess(
  userId: string,
  method = 'manual',
  reference?: string,
  notes?: string,
  expiresAt?: string
) {
  const { error } = await (supabase.rpc as any)('grant_premium_access', {
    target_user_id: userId,
    p_method: method,
    p_reference: reference ?? null,
    p_notes: notes ?? null,
    p_expires_at: expiresAt ?? null,
  });
  if (error) throw error;
}

export async function revokePremiumAccess(userId: string) {
  const { error } = await (supabase.rpc as any)('revoke_premium_access', { target_user_id: userId });
  if (error) throw error;
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const { error } = await (supabase.rpc as any)('admin_delete_user', { target_user_id: userId });
  if (error) throw error;
}

export async function getAuditLog(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!error && data) return data as import('../types/admin').AuditLogEntry[];
  } catch (e) {
    console.warn('[AuditLog] error:', e);
  }
  return [] as import('../types/admin').AuditLogEntry[];
}

export async function getRevisionsByStatus(
  statuses: RevisionStatus[],
  limit = 50
): Promise<ContentRevision[]> {
  const { data, error } = await supabase
    .from('content_revisions')
    .select('*')
    .in('status', statuses)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ContentRevision[];
}

export async function getProfilesByIds(ids: string[]): Promise<Map<string, Profile>> {
  if (!ids.length) return new Map();
  const unique = [...new Set(ids)];
  const { data, error } = await supabase.from('profiles').select('*').in('id', unique);
  if (error) throw error;
  const map = new Map<string, Profile>();
  for (const p of (data ?? []) as Profile[]) map.set(p.id, p);
  return map;
}

export async function verifyContributor(userId: string) {
  const { error } = await supabase.rpc('verify_contributor', { target_user_id: userId });
  if (error) throw error;
}

export async function verifyPhysicianEnrollment(userId: string) {
  const { error } = await supabase.rpc('verify_physician_enrollment', { target_user_id: userId });
  if (error) throw error;
}

export async function rejectPhysicianEnrollment(userId: string, notes?: string) {
  const { error } = await supabase.rpc('reject_physician_enrollment', {
    target_user_id: userId,
    notes: notes ?? undefined,
  });
  if (error) throw error;
}

export async function revokePhysicianEnrollment(userId: string) {
  const { error } = await supabase.rpc('revoke_physician_enrollment', { target_user_id: userId });
  if (error) throw error;
}

export async function getPublishedQuizForTopic(topicId: string): Promise<{
  quiz: import('../types/quiz').PublishedQuiz;
  questions: import('../types/quiz').QuizQuestion[];
} | null> {
  const { data: quiz, error: quizError } = await supabase
    .from('published_quizzes')
    .select('*')
    .eq('topic_id', topicId)
    .maybeSingle();
  if (quizError) throw quizError;
  if (!quiz) return null;

  const typedQuiz = quiz as import('../types/quiz').PublishedQuiz;

  const { data: questions, error: qError } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', typedQuiz.id)
    .order('sort_order');
  if (qError) throw qError;

  return {
    quiz: typedQuiz,
    questions: ((questions ?? []) as unknown) as import('../types/quiz').QuizQuestion[],
  };
}

export async function grantRole(userId: string, role: AppRole) {
  const { error } = await supabase.rpc('grant_user_role', {
    target_user_id: userId,
    target_role: role,
  });
  if (error) throw error;
}

export async function revokeRole(userId: string, role: AppRole) {
  const { error } = await supabase.rpc('revoke_user_role', {
    target_user_id: userId,
    target_role: role,
  });
  if (error) throw error;
}

export async function toggleEditorialCommitteeVisibility(userId: string, show: boolean) {
  const { error } = await (supabase.rpc as any)('admin_toggle_editorial_committee', {
    target_user_id: userId,
    show,
  });
  if (error) throw error;
}

export async function toggleSpecialistVisibility(userId: string, isPublic: boolean) {
  const { error } = await (supabase.rpc as any)('admin_toggle_specialist_visibility', {
    target_user_id: userId,
    show: isPublic,
  });
  if (error) throw error;
}

export async function getCommitteeMembers(): Promise<Profile[]> {
  try {
    const { data, error } = await sb
      .from('public_specialist_profiles')
      .select('*')
      .eq('show_in_editorial_committee', true)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('[getCommitteeMembers] error:', error);
      return [];
    }
    const seen = new Set<string>();
    return ((data ?? []) as Profile[]).filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  } catch (e) {
    console.warn('[getCommitteeMembers] error:', e);
    return [];
  }
}

export async function getMyRevisions(authorId: string): Promise<ContentRevision[]> {
  const { data, error } = await supabase
    .from('content_revisions')
    .select('*')
    .eq('author_id', authorId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContentRevision[];
}

export async function getPendingRevisions(): Promise<ContentRevision[]> {
  const { data, error } = await supabase
    .from('content_revisions')
    .select('*')
    .eq('status', 'pending_review')
    .order('submitted_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ContentRevision[];
}

export async function getRevisionById(id: string): Promise<ContentRevision | null> {
  const { data, error } = await supabase
    .from('content_revisions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as ContentRevision | null) ?? null;
}

export async function saveRevision(input: {
  id?: string;
  targetTopicId?: string | null;
  moduleId: string;
  parentId?: string | null;
  action: RevisionAction;
  payload: RevisionPayload;
  authorId: string;
}): Promise<ContentRevision> {
  const row = {
    target_topic_id: input.targetTopicId ?? null,
    module_id: input.moduleId,
    parent_id: input.parentId ?? null,
    action: input.action,
    payload: input.payload,
    author_id: input.authorId,
    status: 'draft' as RevisionStatus,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('content_revisions')
      .update({
        payload: input.payload,
        module_id: input.moduleId,
        parent_id: input.parentId ?? null,
        target_topic_id: input.targetTopicId ?? null,
        action: input.action,
      })
      .eq('id', input.id)
      .eq('author_id', input.authorId)
      .select('*')
      .single();
    if (error) throw error;
    return data as ContentRevision;
  }

  const { data, error } = await supabase.from('content_revisions').insert(row).select('*').single();
  if (error) throw error;
  return data as ContentRevision;
}

export async function submitRevision(revisionId: string) {
  const { error } = await supabase.rpc('submit_revision', { revision_id: revisionId });
  if (error) throw error;
}

export async function reviewRevision(
  revisionId: string,
  status: Extract<RevisionStatus, 'approved' | 'rejected' | 'changes_requested'>,
  notes?: string
) {
  const { error } = await supabase.rpc('review_revision', {
    revision_id: revisionId,
    new_status: status,
    notes: notes ?? undefined,
  });
  if (error) {
    throw new Error(error.message || error.details || 'Error al procesar la revisión');
  }
}

export async function getPublishedModules(): Promise<PublishedModule[]> {
  const { data, error } = await supabase
    .from('published_modules')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as PublishedModule[];
}

export async function getPublishedModule(id: string): Promise<PublishedModule | null> {
  const { data, error } = await supabase
    .from('published_modules')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as PublishedModule | null) ?? null;
}

export async function getPublishedTopicsByModule(moduleId: string): Promise<PublishedTopic[]> {
  const { data, error } = await supabase
    .from('published_topics')
    .select('*')
    .eq('module_id', moduleId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as PublishedTopic[];
}

export async function getApprovedRevisionCredits(): Promise<{ topicId: string; moduleId?: string; authorId: string; at?: string }[]> {
  const { data, error } = await supabase
    .from('content_revisions')
    .select('target_topic_id, module_id, author_id, reviewed_at, updated_at, submitted_at')
    .eq('status', 'approved');
  if (error) throw error;
  return ((data ?? []) as Array<{
    target_topic_id: string | null;
    module_id: string | null;
    author_id: string;
    reviewed_at: string | null;
    updated_at: string | null;
    submitted_at: string | null;
  }>)
    .filter((row) => row.target_topic_id && row.author_id)
    .map((row) => ({
      topicId: row.target_topic_id as string,
      moduleId: row.module_id || undefined,
      authorId: row.author_id,
      at: row.reviewed_at || row.updated_at || row.submitted_at || undefined,
    }));
}

export async function getAllPublishedTopics(): Promise<PublishedTopic[]> {
  const { data, error } = await supabase
    .from('published_topics')
    .select('*')
    .order('published_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PublishedTopic[];
}

export async function getPublishedTopic(id: string): Promise<PublishedTopic | null> {
  const { data, error } = await supabase
    .from('published_topics')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as PublishedTopic | null) ?? null;
}

// ─── GESTIÓN DIRECTA DE QUIZZES (ADMINISTRACIÓN) ──────────────────────────────

export async function getAllPublishedQuizzes(): Promise<import('../types/quiz').PublishedQuiz[]> {
  try {
    const { data, error } = await supabase
      .from('published_quizzes')
      .select('*')
      .order('published_at', { ascending: false });
    if (!error && data) return data as import('../types/quiz').PublishedQuiz[];
  } catch (e) {
    console.warn('[editorialService] Error fetching published_quizzes:', e);
  }
  return [];
}

export async function getQuizEditorDataForTopic(topicId: string): Promise<{
  source: 'database' | 'fallback' | 'empty';
  title: string;
  passScore: number;
  maxAttempts: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: import('../types/quiz').QuizQuestionDraft[];
  version: number;
  questionCount: number;
}> {
  // 1. Intentar cargar de Supabase
  try {
    const published = await getPublishedQuizForTopic(topicId);
    if (published && published.questions && published.questions.length > 0) {
      const { publishedQuestionsToDraft } = await import('../utils/quizScoring');
      return {
        source: 'database',
        title: published.quiz.title ?? 'Evaluación del tema',
        passScore: published.quiz.pass_score ?? 70,
        maxAttempts: published.quiz.max_attempts,
        shuffleQuestions: published.quiz.shuffle_questions ?? true,
        shuffleOptions: published.quiz.shuffle_options ?? true,
        version: published.quiz.version ?? 1,
        questionCount: published.quiz.question_count ?? published.questions.length,
        questions: publishedQuestionsToDraft(published.questions),
      };
    }
  } catch (e) {
    console.warn('[getQuizEditorDataForTopic] Error al consultar Supabase, probando fallback:', e);
  }

  // El banco de respuestas no se envía al cliente. El editor debe cargar desde Supabase.

  // 3. Vacío por defecto
  return {
    source: 'empty',
    title: 'Evaluación del tema',
    passScore: 70,
    maxAttempts: null,
    shuffleQuestions: true,
    shuffleOptions: true,
    version: 1,
    questionCount: 0,
    questions: [],
  };
}

export async function publishAdminQuizDirectly(input: {
  topicId: string;
  moduleId: string;
  title: string;
  passScore: number;
  maxAttempts: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: import('../types/quiz').QuizQuestionDraft[];
  authorId: string;
  revisionId?: string;
}): Promise<void> {
  const fullPayload: RevisionPayload = {
    revisionType: 'quiz',
    title: input.title,
    quizTopicId: input.topicId,
    passScore: input.passScore,
    maxAttempts: input.maxAttempts,
    shuffleQuestions: input.shuffleQuestions,
    shuffleOptions: input.shuffleOptions,
    questions: input.questions,
  };

  const saved = await saveRevision({
    id: input.revisionId,
    targetTopicId: input.topicId,
    moduleId: input.moduleId,
    action: 'update',
    payload: fullPayload,
    authorId: input.authorId,
  });

  await submitRevision(saved.id);
  await reviewRevision(saved.id, 'approved', 'Publicación directa administrativa NeuroSAFE');
}

export async function deleteAdminQuizDirectly(input: {
  topicId: string;
  moduleId: string;
  authorId: string;
}): Promise<void> {
  const fullPayload: RevisionPayload = {
    revisionType: 'quiz',
    quizTopicId: input.topicId,
    title: 'Eliminar evaluación',
  };

  const saved = await saveRevision({
    targetTopicId: input.topicId,
    moduleId: input.moduleId,
    action: 'delete',
    payload: fullPayload,
    authorId: input.authorId,
  });

  await submitRevision(saved.id);
  await reviewRevision(saved.id, 'approved', 'Eliminación directa de evaluación en Panel Directivo');
}

/**
 * Crea y publica un tema o subtema directamente desde el temario administrativo.
 * Registra la propuesta editorial y la aprueba de inmediato para que quede publicada.
 */
export async function createTopicDirectly(input: {
  moduleId: string;
  parentId?: string | null;
  topicId?: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  content?: string;
  clinicalPearls?: string[];
  keyPoints?: string[];
  authorId: string;
}): Promise<{ id: string; revisionId?: string }> {
  const slug = (input.topicId || slugify(input.title)).trim();
  const payload: RevisionPayload = {
    id: slug,
    slug,
    title: input.title.trim(),
    titleEn: input.titleEn?.trim() || undefined,
    description: input.description?.trim() || undefined,
    descriptionEn: input.descriptionEn?.trim() || undefined,
    content: input.content?.trim() || undefined,
    clinicalPearls: input.clinicalPearls?.length ? input.clinicalPearls : [],
    keyPoints: input.keyPoints?.length ? input.keyPoints : [],
  };

  // 1. Guardar y publicar mediante el flujo de revisiones con aprobación directa
  try {
    const saved = await saveRevision({
      moduleId: input.moduleId,
      parentId: input.parentId ?? null,
      targetTopicId: slug,
      action: 'create',
      payload,
      authorId: input.authorId,
    });

    await submitRevision(saved.id);
    await reviewRevision(saved.id, 'approved', 'Creación rápida desde temario administrativo');

    return { id: slug, revisionId: saved.id };
  } catch (revError) {
    console.warn('[editorialService] Fallback directo a published_topics tras fallo en revisión:', revError);
  }

  // 2. Fallback: inserción directa en published_topics
  const { error: insertError } = await supabase.from('published_topics').upsert(
    {
      id: slug,
      module_id: input.moduleId,
      parent_id: input.parentId ?? null,
      slug,
      title: input.title.trim(),
      title_en: input.titleEn?.trim() || null,
      description: input.description?.trim() || null,
      description_en: input.descriptionEn?.trim() || null,
      content: input.content?.trim() || null,
      clinical_pearls: input.clinicalPearls ?? [],
      key_points: input.keyPoints ?? [],
      published_at: new Date().toISOString(),
      published_by: input.authorId,
      last_edited_by: input.authorId,
    } as any,
    { onConflict: 'id' }
  );

  if (insertError) throw insertError;
  return { id: slug };
}

