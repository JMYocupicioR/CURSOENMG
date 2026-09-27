import { isAppendixModule } from '../content/appendixModules';
import { allModules } from '../content/modules';
import { supabase, sb } from '../lib/supabase';
import type { Topic } from '../types/content';
import type { LiveWorkshop, Profile } from '../types/database';
import type { ModuleQuizProgress } from '../types/quiz';
import type { StudentAssignment } from '../types/studentPlan';
import { TOPIC_PROGRESS_EVENT } from './quizCompletionGate';
import {
  applyOutboxToCompletedSet,
  enqueueProgressOutbox,
  readProgressOutbox,
  removeProgressOutboxItems,
} from '../utils/progressOutbox';

export { TOPIC_PROGRESS_EVENT };

export interface LastVisitedTopic {
  moduleId: string;
  moduleTitle: string;
  topicId: string;
  topicTitle: string;
  url: string;
  updatedAt: string;
}

export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  type: 'academic' | 'workshop' | 'quiz' | 'cedula' | 'system';
  severity?: 'info' | 'success' | 'warning';
  createdAt: string;
  linkUrl?: string;
  isRead: boolean;
}

export interface StudentModuleStats {
  moduleId: string;
  title: string;
  emoji: string;
  color: string;
  totalTopics: number;
  completedTopics: number;
  progressPct: number;
  quizAttempted: boolean;
  quizPassed: boolean;
  quizScore?: number;
  /** False for consultation appendices such as the bibliography module. */
  countsTowardCurriculum: boolean;
}

export interface KardexStanding {
  isOfficial: boolean;
  isPassing: boolean;
  officialGrade: number | null;
}

export interface CertificationRequirements {
  cedulaVerified: boolean;
  modulesCompletedPct: number;
  quizzesPassedCount: number;
  totalQuizzesAvailable: number;
  averageScore: number;
  isEligible: boolean;
  certificateFolio?: string;
  kardexOfficial: boolean;
  kardexGrade: number | null;
  isOfficialPassing: boolean;
}

// ─── LocalStorage Keys ───────────────────────────────────────────────────────

const KEY_COMPLETED_TOPICS = 'neurosafe_student_completed_topics_';
const KEY_VISITED_TOPICS = 'neurosafe_student_visited_topics_';
const KEY_LAST_TOPIC = 'neurosafe_student_last_topic_';
const KEY_NOTIFICATIONS_READ = 'neurosafe_student_notif_read_';

function notifyProgressUpdated(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent(TOPIC_PROGRESS_EVENT, {
        detail: { userId, timestamp: Date.now() },
      })
    );
  } catch (e) {
    console.warn('[StudentService] Error dispatching progress event:', e);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getAllTopicIds(topics: Topic[]): string[] {
  const ids: string[] = [];
  for (const t of topics) {
    ids.push(t.id);
    if (t.children && t.children.length > 0) {
      ids.push(...getAllTopicIds(t.children));
    }
  }
  return ids;
}

// ─── Topic Progress (Local-First + Cloud Synchronization) ────────────────────

/**
 * Fetches completed topics from Supabase (student_completed_topics and profiles.completed_topics),
 * merges them with any existing local topics in localStorage, and automatically syncs
 * any locally completed topics to Supabase if they are not yet in the cloud.
 */
export async function fetchStudentCompletedTopics(userId: string): Promise<Set<string>> {
  if (!userId || userId === 'anonymous_student') {
    return getCompletedTopics(userId);
  }

  const merged = new Set<string>();

  // 1. Fuente autoritativa: Supabase
  let dbTopics: string[] = [];
  let cloudReached = false;
  try {
    const { data, error } = await sb
      .from('student_completed_topics')
      .select('topic_id')
      .eq('user_id', userId);

    if (!error && data && Array.isArray(data)) {
      cloudReached = true;
      dbTopics = data.map((r: { topic_id: string }) => r.topic_id);
      dbTopics.forEach((id) => merged.add(id));
    }
  } catch {
    cloudReached = false;
  }

  // 2. Caché local identificada (no acredita por sí sola si el servidor respondió)
  const localSet = getCompletedTopics(userId);
  if (!cloudReached) {
    localSet.forEach((id) => merged.add(id));
  } else {
    localSet.forEach((id) => {
      if (merged.has(id)) return;
      // Conservar en cola local solo para reconciliar lecciones sin evaluación
      merged.add(id);
    });
  }

  // 3. Read from profiles.completed_topics as complementary/fallback source
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('completed_topics')
      .eq('id', userId)
      .single();

    if (profile?.completed_topics && Array.isArray(profile.completed_topics)) {
      profile.completed_topics.forEach((id: string) => merged.add(id));
    }
  } catch {}

  // 4. Apply queued offline writes (LWW), then flush what the network can take.
  const queuedOutbox = readProgressOutbox(userId);
  const withOutbox = applyOutboxToCompletedSet(merged, queuedOutbox);
  merged.clear();
  withOutbox.forEach((id) => merged.add(id));
  await flushProgressOutbox(userId);

  // 5. Normalize and propagate bidirectional completion between parents and children
  for (const m of allModules) {
    for (const t of m.topics) {
      if (t.children && t.children.length > 0) {
        const childIds = getAllTopicIds(t.children);
        // If parent is marked completed, ensure all children are also in merged
        if (merged.has(t.id)) {
          childIds.forEach((cid) => merged.add(cid));
        } else {
          // If all children are marked completed, ensure parent is in merged
          const allChildrenDone = childIds.length > 0 && childIds.every((cid) => merged.has(cid));
          if (allChildrenDone) {
            merged.add(t.id);
          }
        }
      }
    }
  }

  const pendingDeletes = new Set(
    queuedOutbox.filter((item) => !item.completed).map((item) => item.topicId)
  );
  pendingDeletes.forEach((id) => merged.delete(id));

  // 6. Reconciliar caché local hacia student_completed_topics (no profiles)
  const missingInDb = cloudReached
    ? Array.from(merged).filter((id) => !dbTopics.includes(id) && !pendingDeletes.has(id))
    : [];
  if (missingInDb.length > 0) {
    try {
      const rows = missingInDb.map((tid) => ({
        user_id: userId,
        topic_id: tid,
        completed_at: new Date().toISOString(),
      }));
      await sb.from('student_completed_topics').upsert(rows, { onConflict: 'user_id, topic_id' });
    } catch (e) {
      console.warn('[StudentService] No se pudieron reconciliar temas locales:', e);
    }
  }

  // 7. Cache merged truth back into localStorage
  try {
    localStorage.setItem(
      `${KEY_COMPLETED_TOPICS}${userId}`,
      JSON.stringify(Array.from(merged))
    );
  } catch {}

  return merged;
}

/**
 * Background helper to persist topic completions/deletions to Supabase.
 * Writes to a local outbox first so offline / failed upserts are not lost.
 */
async function syncTopicCompletionToSupabase(
  userId: string,
  topicIds: string[],
  isCompleted: boolean,
  fullCurrentSet: Set<string>
) {
  void fullCurrentSet;
  if (!userId || userId === 'anonymous_student') return;

  enqueueProgressOutbox(userId, topicIds, isCompleted);
  await flushProgressOutbox(userId);
}

/** Push queued topic completions/uncompletions when the device is online. */
export async function flushProgressOutbox(userId: string): Promise<void> {
  if (!userId || userId === 'anonymous_student') return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const items = readProgressOutbox(userId);
  if (items.length === 0) return;

  const completedIds = items.filter((item) => item.completed).map((item) => item.topicId);
  const pendingIds = items.filter((item) => !item.completed).map((item) => item.topicId);
  const succeeded: string[] = [];

  try {
    if (completedIds.length > 0) {
      const completedAt = new Map(items.map((item) => [item.topicId, item.at]));
      const rows = completedIds.map((tid) => ({
        user_id: userId,
        topic_id: tid,
        completed_at: completedAt.get(tid) ?? new Date().toISOString(),
      }));
      const { error } = await sb
        .from('student_completed_topics')
        .upsert(rows, { onConflict: 'user_id, topic_id' });
      if (error) throw error;
      succeeded.push(...completedIds);
    }

    if (pendingIds.length > 0) {
      for (const tid of pendingIds) {
        const { error } = await supabase
          .from('student_completed_topics')
          .delete()
          .eq('user_id', userId)
          .eq('topic_id', tid);
        if (error) throw error;
        succeeded.push(tid);
      }
    }

    removeProgressOutboxItems(userId, succeeded);

    try {
      await sb.from('student_activity_logs').insert({
        user_id: userId,
        action: 'topic_progress_sync',
        details: { completedIds, pendingIds, count: items.length },
      });
    } catch {
      // Activity log is best-effort
    }
  } catch (e) {
    if (succeeded.length > 0) {
      removeProgressOutboxItems(userId, succeeded);
    }
    console.warn('[StudentService] Error syncing student_completed_topics:', e);
  }
}

export function getCompletedTopics(userId: string): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(`${KEY_COMPLETED_TOPICS}${userId}`);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function isTopicCompleted(userId: string, topicId: string): boolean {
  return getCompletedTopics(userId).has(topicId);
}

export function toggleTopicCompleted(
  userId: string,
  topicId: string,
  childTopicIds?: string[]
): boolean {
  if (!userId || !topicId) return false;
  const current = getCompletedTopics(userId);
  let isNowCompleted = false;
  const affectedIds = [topicId, ...(childTopicIds || [])];

  if (current.has(topicId)) {
    for (const cid of affectedIds) {
      current.delete(cid);
    }
    isNowCompleted = false;
  } else {
    for (const cid of affectedIds) {
      current.add(cid);
    }
    isNowCompleted = true;
  }

  try {
    localStorage.setItem(
      `${KEY_COMPLETED_TOPICS}${userId}`,
      JSON.stringify(Array.from(current))
    );
    notifyProgressUpdated(userId);
  } catch (e) {
    console.warn('[StudentService] Error saving completed topics:', e);
  }

  // Sync to Supabase in background
  syncTopicCompletionToSupabase(userId, affectedIds, isNowCompleted, current).catch(console.warn);

  return isNowCompleted;
}

export function markTopicCompleted(userId: string, topicId: string): void {
  if (!userId || !topicId) return;
  const current = getCompletedTopics(userId);
  if (!current.has(topicId)) {
    current.add(topicId);
    try {
      localStorage.setItem(
        `${KEY_COMPLETED_TOPICS}${userId}`,
        JSON.stringify(Array.from(current))
      );
      notifyProgressUpdated(userId);
    } catch (e) {
      console.warn('[StudentService] Error saving completed topics:', e);
    }
    syncTopicCompletionToSupabase(userId, [topicId], true, current).catch(console.warn);
  }
}

export function markTopicPending(userId: string, topicId: string): void {
  if (!userId || !topicId) return;
  const current = getCompletedTopics(userId);
  if (current.has(topicId)) {
    current.delete(topicId);
    try {
      localStorage.setItem(
        `${KEY_COMPLETED_TOPICS}${userId}`,
        JSON.stringify(Array.from(current))
      );
      notifyProgressUpdated(userId);
    } catch (e) {
      console.warn('[StudentService] Error updating pending topic:', e);
    }
    syncTopicCompletionToSupabase(userId, [topicId], false, current).catch(console.warn);
  }
}

export function markMultipleTopics(
  userId: string,
  topicIds: string[],
  completed: boolean
): void {
  if (!userId || !topicIds.length) return;
  const current = getCompletedTopics(userId);
  let changed = false;

  for (const tid of topicIds) {
    if (completed) {
      if (!current.has(tid)) {
        current.add(tid);
        changed = true;
      }
    } else {
      if (current.has(tid)) {
        current.delete(tid);
        changed = true;
      }
    }
  }

  if (changed) {
    try {
      localStorage.setItem(
        `${KEY_COMPLETED_TOPICS}${userId}`,
        JSON.stringify(Array.from(current))
      );
      notifyProgressUpdated(userId);
    } catch (e) {
      console.warn('[StudentService] Error batch updating topics:', e);
    }
    syncTopicCompletionToSupabase(userId, topicIds, completed, current).catch(console.warn);
  }
}

// ─── Visited Topics ─────────────────────────────────────────────────────────

export function getVisitedTopics(userId: string): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(`${KEY_VISITED_TOPICS}${userId}`);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function isTopicVisited(userId: string, topicId: string): boolean {
  return getVisitedTopics(userId).has(topicId);
}

export function markTopicVisited(userId: string, topicId: string): void {
  if (!userId || !topicId) return;
  const current = getVisitedTopics(userId);
  if (!current.has(topicId)) {
    current.add(topicId);
    try {
      localStorage.setItem(
        `${KEY_VISITED_TOPICS}${userId}`,
        JSON.stringify(Array.from(current))
      );
      notifyProgressUpdated(userId);
    } catch (e) {
      console.warn('[StudentService] Error saving visited topics:', e);
    }
  }
}

// ─── Last Visited Topic ─────────────────────────────────────────────────────

export function getLastVisitedTopic(userId: string): LastVisitedTopic | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${KEY_LAST_TOPIC}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setLastVisitedTopic(userId: string, data: LastVisitedTopic): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${KEY_LAST_TOPIC}${userId}`, JSON.stringify(data));
    markTopicVisited(userId, data.topicId);
  } catch (e) {
    console.warn('[StudentService] Error saving last visited topic:', e);
  }
}

// ─── Global & Module Metrics ────────────────────────────────────────────────

export function calculateStudentMetrics(
  userId: string,
  moduleProgressList: ModuleQuizProgress[] = [],
  customCompletedTopics?: Set<string>
) {
  const completed = customCompletedTopics ?? getCompletedTopics(userId);
  let totalCurriculumTopics = 0;
  let totalCompletedCurriculumTopics = 0;

  const moduleStats: StudentModuleStats[] = allModules.map((m) => {
    const countsTowardCurriculum = !isAppendixModule(m.id);
    const topicIds = getAllTopicIds(m.topics);
    const totalTopics = topicIds.length;
    const completedCount = topicIds.filter((id) => completed.has(id)).length;
    const progressPct = countsTowardCurriculum && totalTopics > 0
      ? Math.round((completedCount / totalTopics) * 100)
      : 0;

    if (countsTowardCurriculum) {
      totalCurriculumTopics += totalTopics;
      totalCompletedCurriculumTopics += completedCount;
    }

    const quizProg = moduleProgressList.find((p) => p.moduleId === m.id);
    const quizAttempted = (quizProg?.quizzesAttempted ?? 0) > 0;
    const quizPassed = (quizProg?.bestScores?.some((s) => s.passed) ?? false);
    const quizScore = quizProg?.averageScore ?? undefined;

    return {
      moduleId: m.id,
      title: m.title,
      emoji: m.emoji || '📖',
      color: m.color || 'from-blue-600 to-indigo-600',
      totalTopics,
      completedTopics: completedCount,
      progressPct,
      quizAttempted,
      quizPassed,
      quizScore,
      countsTowardCurriculum,
    };
  });

  const overallProgressPct =
    totalCurriculumTopics > 0
      ? Math.round((totalCompletedCurriculumTopics / totalCurriculumTopics) * 100)
      : 0;

  // CME Credits: 40 créditos totales COMEFYR / 80 horas académicas curriculares
  const maxCmeCredits = 40;
  const maxAcademicHours = 80;
  const cmeCreditsEarned = Math.round((overallProgressPct / 100) * maxCmeCredits * 10) / 10;
  const academicHoursEarned = Math.round((overallProgressPct / 100) * maxAcademicHours);

  return {
    moduleStats,
    totalCurriculumTopics,
    totalCompletedCurriculumTopics,
    overallProgressPct,
    cmeCreditsEarned,
    maxCmeCredits,
    academicHoursEarned,
    maxAcademicHours,
  };
}

// ─── Notifications ──────────────────────────────────────────────────────────

export function getStudentNotifications(
  userId: string,
  profile: Profile | null,
  workshops: LiveWorkshop[] = [],
  assignments: StudentAssignment[] = []
): StudentNotification[] {
  const readMap: Record<string, boolean> = (() => {
    try {
      const raw = localStorage.getItem(`${KEY_NOTIFICATIONS_READ}${userId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();

  const notifs: StudentNotification[] = [];

  // 0. Teacher Assigned Tasks & Exams
  assignments.forEach((asg) => {
    const isExam = asg.type === 'exam';
    const typeLabel = isExam
      ? 'Examen Asignado'
      : asg.type === 'clinical_case'
      ? 'Caso Clínico'
      : asg.type === 'emg_report'
      ? 'Reporte de Trazo EMG'
      : 'Tarea Asignada';

    // Pending assignment
    if (asg.status === 'pending') {
      const dueTime = new Date(asg.due_date).getTime();
      const now = Date.now();
      const isUrgent = dueTime - now < 24 * 60 * 60 * 1000;
      const daysRemaining = Math.ceil((dueTime - now) / 86400000);
      const dueStr = new Date(asg.due_date).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });

      notifs.push({
        id: `notif_asg_${asg.id}`,
        title: `${isUrgent ? '⏰ ¡Urgente! ' : '📋 '}${typeLabel}: ${asg.title}`,
        message: `${asg.description || 'Actividad requerida por tu profesor.'} Fecha límite: ${dueStr} (${daysRemaining <= 1 ? '¡vence pronto!' : `quedan ${daysRemaining} días`}).`,
        type: 'quiz',
        severity: isUrgent ? 'warning' : 'info',
        createdAt: asg.created_at,
        linkUrl: `/dashboard?tab=assignments`,
        isRead: !!readMap[`notif_asg_${asg.id}`],
      });
    }

    // Evaluated / Graded by Teacher
    if (asg.grade != null && asg.reviewed_at) {
      notifs.push({
        id: `notif_asg_reviewed_${asg.id}`,
        title: `⭐ Calificación: ${asg.title}`,
        message: `Tu profesor ha evaluado tu entrega con ${asg.grade}/100 pts.${asg.feedback ? ` Comentario: "${asg.feedback}"` : ''}`,
        type: 'academic',
        severity: (asg.grade ?? 0) >= (asg.min_score ?? 70) ? 'success' : 'warning',
        createdAt: asg.reviewed_at || asg.updated_at,
        linkUrl: `/dashboard?tab=assignments`,
        isRead: !!readMap[`notif_asg_reviewed_${asg.id}`],
      });
    }
  });

  // 1. Cédula Profesional status
  if (profile?.cedula_verified) {
    notifs.push({
      id: 'notif_cedula_verified',
      title: 'Cédula Profesional Verificada',
      message: `Tu cédula profesional (${profile.cedula_profesional}) fue validada exitosamente ante la Dirección General de Profesiones (SEP). Cumples con el requisito legal COMEFYR.`,
      type: 'cedula',
      severity: 'success',
      createdAt: profile.enrollment_verified_at || '2026-09-12T00:00:00Z',
      linkUrl: '/cuenta',
      isRead: !!readMap['notif_cedula_verified'],
    });
  } else if (profile?.cedula_profesional) {
    notifs.push({
      id: 'notif_cedula_pending',
      title: 'Validación de Cédula en Proceso',
      message: `Hemos recibido tu cédula ${profile.cedula_profesional}. Puedes solicitar validación inmediata ante el Registro Nacional de Profesionistas en tu perfil.`,
      type: 'cedula',
      severity: 'warning',
      createdAt: '2026-09-11T12:00:00Z',
      linkUrl: '/cuenta',
      isRead: !!readMap['notif_cedula_pending'],
    });
  } else {
    notifs.push({
      id: 'notif_cedula_missing',
      title: 'Registra tu Cédula Profesional',
      message: 'Para emitir tu diploma con créditos curriculares COMEFYR al finalizar el curso, es indispensable registrar tu número de cédula.',
      type: 'cedula',
      severity: 'warning',
      createdAt: '2026-09-10T08:00:00Z',
      linkUrl: '/perfil',
      isRead: !!readMap['notif_cedula_missing'],
    });
  }

  // 2. Upcoming Workshops
  const activeWorkshops = workshops.filter((w) => w.status === 'scheduled' || w.status === 'live');
  if (activeWorkshops.length > 0) {
    const nextW = activeWorkshops[0];
    notifs.push({
      id: `notif_workshop_${nextW.id}`,
      title: `Taller en Vivo: ${nextW.title}`,
      message: `Sesión interactiva de discusión de casos clínicos. Programado para el ${new Date(nextW.scheduled_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.`,
      type: 'workshop',
      severity: 'info',
      createdAt: nextW.created_at || '2026-09-11T10:00:00Z',
      linkUrl: `/taller/${nextW.id}`,
      isRead: !!readMap[`notif_workshop_${nextW.id}`],
    });
  } else {
    notifs.push({
      id: 'notif_workshop_default',
      title: 'Próxima Sesión Clínica COMEFYR',
      message: 'Los profesores de la comisión de Electrodiagnóstico anunciarán el próximo webinar interactivo sobre Conducción Nerviosa.',
      type: 'workshop',
      severity: 'info',
      createdAt: '2026-09-10T14:00:00Z',
      linkUrl: '/talleres',
      isRead: !!readMap['notif_workshop_default'],
    });
  }

  // 3. Academic consensus announcement
  notifs.push({
    id: 'notif_academic_consensus',
    title: 'Actualización de Criterios Clínicos 2026',
    message: 'Se han integrado los criterios diagnósticos actualizados: Criterios Gold Coast 2019 en ELA y Guía EAN/PNS 2021 en CIDP en los módulos 09 y 10.',
    type: 'academic',
    severity: 'info',
    createdAt: '2026-09-08T09:00:00Z',
    linkUrl: '/modulo/diagnostic-criteria',
    isRead: !!readMap['notif_academic_consensus'],
  });

  // 4. Clinical tool announcement
  notifs.push({
    id: 'notif_plexo_tool',
    title: 'Nueva Calculadora Topográfica de Plexo Braquial',
    message: 'Utiliza el motor de cálculo diagnóstico de 5 pasos para correlacionar raíces, troncos y cordones con hallazgos electromiográficos.',
    type: 'system',
    severity: 'info',
    createdAt: '2026-09-05T08:00:00Z',
    linkUrl: '/herramientas/plexo-braquial',
    isRead: !!readMap['notif_plexo_tool'],
  });

  return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markNotificationAsRead(userId: string, notifId: string): void {
  if (!userId || !notifId) return;
  try {
    const raw = localStorage.getItem(`${KEY_NOTIFICATIONS_READ}${userId}`);
    const map = raw ? JSON.parse(raw) : {};
    map[notifId] = true;
    localStorage.setItem(`${KEY_NOTIFICATIONS_READ}${userId}`, JSON.stringify(map));
  } catch (e) {
    console.warn('[StudentService] Error saving read notif:', e);
  }
}

export function markAllNotificationsAsRead(userId: string, notifIds: string[]): void {
  if (!userId) return;
  try {
    const raw = localStorage.getItem(`${KEY_NOTIFICATIONS_READ}${userId}`);
    const map = raw ? JSON.parse(raw) : {};
    for (const id of notifIds) {
      map[id] = true;
    }
    localStorage.setItem(`${KEY_NOTIFICATIONS_READ}${userId}`, JSON.stringify(map));
  } catch (e) {
    console.warn('[StudentService] Error saving read all notifs:', e);
  }
}

// ─── Certification Verification ─────────────────────────────────────────────

export function checkCertificationEligibility(
  profile: Profile | null,
  overallProgressPct: number,
  moduleProgressList: ModuleQuizProgress[] = [],
  standing?: KardexStanding | null
): CertificationRequirements {
  const cedulaVerified = Boolean(profile?.cedula_verified);
  const totalQuizzesAvailable = moduleProgressList.reduce(
    (acc, m) => acc + (m.quizzesAvailable || 0),
    0
  );
  const quizzesPassedCount = moduleProgressList.reduce(
    (acc, m) => acc + (m.bestScores?.filter((s) => s.passed).length || 0),
    0
  );

  const scores = moduleProgressList
    .flatMap((m) => m.bestScores?.map((s) => s.score) || [])
    .filter((s) => typeof s === 'number');

  const averageScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const isOfficialPassing = Boolean(standing?.isOfficial && standing.isPassing);
  const isEligible = cedulaVerified && isOfficialPassing;

  const userSeed = (profile?.id || 'COMEFYR').substring(0, 6).toUpperCase();
  const certificateFolio = `COMEFYR-EMG-2026-${userSeed}`;

  return {
    cedulaVerified,
    modulesCompletedPct: overallProgressPct,
    quizzesPassedCount,
    totalQuizzesAvailable,
    averageScore,
    isEligible,
    certificateFolio,
    kardexOfficial: Boolean(standing?.isOfficial),
    kardexGrade: standing?.officialGrade ?? null,
    isOfficialPassing,
  };
}

export function checkCourseCertificationEligibility(
  profile: Profile | null,
  completedTopics: Set<string>,
  moduleProgressList: ModuleQuizProgress[],
  courseModuleIds: string[],
  standing?: KardexStanding | null
): CertificationRequirements {
  const modules = allModules.filter((m) => courseModuleIds.includes(m.id));
  const topicIds = modules.flatMap((m) => getAllTopicIds(m.topics));
  const completedCount = topicIds.filter((id) => completedTopics.has(id)).length;
  const overallProgressPct = topicIds.length > 0 ? Math.round((completedCount / topicIds.length) * 100) : 0;
  const filteredProgress = moduleProgressList.filter((m) => courseModuleIds.includes(m.moduleId));
  return checkCertificationEligibility(profile, overallProgressPct, filteredProgress, standing);
}
