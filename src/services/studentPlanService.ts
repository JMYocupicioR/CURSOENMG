import { supabase, sb } from '../lib/supabase';
import type {
  StudentLearningPlan,
  StudentAssignment,
  StudentActivityLog,
  StudentStreakInfo,
  StudentExamDetail,
  QuestionBreakdownItem,
  StudentFullDossier,
  StudentDomainAssessment,
  AssignmentStatus,
  ActiveExamLock,
  TeacherPendingReviewItem,
} from '../types/studentPlan';
import type { AdminProfileRow } from '../types/admin';
import type { QuizAttempt } from '../types/quiz';
import type { ExamConfig, ExamSession } from '../types/exam';
import type { Profile } from '../types/database';
import { getLocalQuizFlagForTopic } from './localQuizzesFallback';
import { getMyAttempts, getMyProgressByModule } from './quizService';
import { sendAcademicPush } from './studentToolsService';
import { calculateStudentMetrics, checkCertificationEligibility, fetchStudentCompletedTopics } from './studentService';

// ─── LocalStorage Keys for Resilient Fallback ────────────────────────────────
const KEY_LOCAL_PLANS = 'neurosafe_learning_plans_';
const KEY_LOCAL_ASSIGNMENTS = 'neurosafe_assignments_';
const KEY_LOCAL_ACTIVITY = 'neurosafe_activity_';
const KEY_LOCAL_ADMIN_NOTES = 'neurosafe_admin_notes_';
const KEY_LOCAL_ACTIVE_EXAM = 'neurosafe_active_exam_lock_';

// ─── Activity & Streak Logging ──────────────────────────────────────────────

export async function recordUserActivity(
  userId: string,
  action: string,
  details: Record<string, any> = {}
): Promise<void> {
  if (!userId) return;

  const timestamp = new Date().toISOString();
  const logEntry: StudentActivityLog = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    action,
    details,
    created_at: timestamp,
  };

  // 1. Guardar en LocalStorage para disponibilidad instantánea y offline
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ACTIVITY}${userId}`);
    const logs: StudentActivityLog[] = raw ? JSON.parse(raw) : [];
    // Guardar los últimos 150 eventos
    logs.unshift(logEntry);
    if (logs.length > 150) logs.pop();
    localStorage.setItem(`${KEY_LOCAL_ACTIVITY}${userId}`, JSON.stringify(logs));
  } catch (e) {
    console.warn('[studentPlanService] Local activity log error:', e);
  }

  // 2. Sincronizar en Supabase si está disponible
  try {
    await supabase.from('student_activity_logs').insert({
      user_id: userId,
      action,
      details,
      created_at: timestamp,
    });
  } catch {
    // Silencioso si la tabla aún no se ha ejecutado en Supabase
  }
}

export const logStudentActivity = recordUserActivity;

export async function getStudentActivityAndStreak(userId: string): Promise<StudentStreakInfo> {
  const datesSet = new Set<string>();
  let totalSessions = 0;
  let lastActiveDate: string | null = null;

  // 1. Cargar logs locales
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ACTIVITY}${userId}`);
    if (raw) {
      const logs: StudentActivityLog[] = JSON.parse(raw);
      for (const log of logs) {
        const d = log.created_at.slice(0, 10);
        datesSet.add(d);
        if (!lastActiveDate || log.created_at > lastActiveDate) {
          lastActiveDate = log.created_at;
        }
        if (log.action === 'user_login') {
          totalSessions++;
        }
      }
    }
  } catch {}

  // 2. Intentar cargar de Supabase
  try {
    const { data } = await supabase
      .from('student_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (data && data.length > 0) {
      for (const log of data) {
        const d = log.created_at.slice(0, 10);
        datesSet.add(d);
        if (!lastActiveDate || log.created_at > lastActiveDate) {
          lastActiveDate = log.created_at;
        }
        if (log.action === 'user_login') {
          totalSessions++;
        }
      }
    }
  } catch {}

  // 3. Complementar con fechas de quiz_attempts
  try {
    const attempts = await getMyAttempts(userId, 50);
    for (const att of attempts) {
      if (att.completed_at) {
        const d = att.completed_at.slice(0, 10);
        datesSet.add(d);
        if (!lastActiveDate || att.completed_at > lastActiveDate) {
          lastActiveDate = att.completed_at;
        }
      }
    }
  } catch {}

  // Si no hay datos, incluir al menos la fecha de hoy si hay actividad reciente
  if (datesSet.size === 0) {
    const today = new Date().toISOString().slice(0, 10);
    datesSet.add(today);
    lastActiveDate = new Date().toISOString();
    totalSessions = Math.max(1, totalSessions);
  }

  // Ordenar fechas cronológicamente
  const sortedDates = Array.from(datesSet).sort();

  // Calcular racha actual y racha máxima
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  let prevDate: Date | null = null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  for (let i = 0; i < sortedDates.length; i++) {
    const curr = new Date(sortedDates[i] + 'T00:00:00Z');
    if (prevDate) {
      const diffDays = Math.round((curr.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    } else {
      runningStreak = 1;
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    prevDate = curr;
  }

  // Racha actual: verificar si el último día activo fue hoy o ayer
  const lastDayStr = sortedDates[sortedDates.length - 1];
  if (lastDayStr === todayStr || lastDayStr === yesterdayStr) {
    currentStreak = runningStreak;
  } else {
    currentStreak = 0;
  }

  // Últimos 30 días para mapa de calor
  const nowMs = Date.now();
  const thirtyDaysAgo = new Date(nowMs - 30 * 86400000).toISOString().slice(0, 10);
  const activeDatesLast30Days = sortedDates.filter((d) => d >= thirtyDaysAgo);

  return {
    currentStreak: Math.max(currentStreak, 1),
    longestStreak: Math.max(longestStreak, currentStreak, 1),
    totalActiveDays: sortedDates.length,
    lastActiveDate,
    activeDatesLast30Days,
    totalSessions: Math.max(totalSessions, 1),
  };
}

export async function getStudentActivityLogs(userId: string, limit = 50): Promise<StudentActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('student_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as StudentActivityLog[];
    }
  } catch {}

  // Fallback local
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ACTIVITY}${userId}`);
    if (raw) {
      return (JSON.parse(raw) as StudentActivityLog[]).slice(0, limit);
    }
  } catch {}

  // Fallback simulado básico si no hay
  return [
    {
      id: 'act-init',
      user_id: userId,
      action: 'user_login',
      details: { platform: 'web', source: 'COMEFYR Portal' },
      created_at: new Date().toISOString(),
    },
  ];
}

// ─── Learning Plans (Planes de Estudio Personalizados) ──────────────────────

export async function getStudentLearningPlans(studentId: string): Promise<StudentLearningPlan[]> {
  try {
    const { data, error } = await supabase
      .from('student_learning_plans')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as StudentLearningPlan[];
    }
  } catch {}

  // Fallback local
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_PLANS}${studentId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function createLearningPlan(
  studentId: string,
  plan: Partial<StudentLearningPlan>
): Promise<StudentLearningPlan> {
  const newPlan: StudentLearningPlan = {
    id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    student_id: studentId,
    title: plan.title || 'Plan de Estudio Personalizado',
    description: plan.description || '',
    priority_modules: plan.priority_modules || [],
    priority_topics: plan.priority_topics || [],
    target_date: plan.target_date || null,
    status: plan.status || 'active',
    created_by: plan.created_by || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Guardar localmente
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_PLANS}${studentId}`);
    const plans: StudentLearningPlan[] = raw ? JSON.parse(raw) : [];
    plans.unshift(newPlan);
    localStorage.setItem(`${KEY_LOCAL_PLANS}${studentId}`, JSON.stringify(plans));
  } catch (e) {
    console.warn('[studentPlanService] Error saving plan locally:', e);
  }

  // 2. Intentar guardar en Supabase
  try {
    const { data } = await supabase
      .from('student_learning_plans')
      .insert({
        student_id: studentId,
        title: newPlan.title,
        description: newPlan.description,
        priority_modules: newPlan.priority_modules,
        priority_topics: newPlan.priority_topics,
        target_date: newPlan.target_date,
        status: newPlan.status,
        created_by: newPlan.created_by,
      })
      .select()
      .single();

    if (data) return data as StudentLearningPlan;
  } catch {}

  return newPlan;
}

export async function updateLearningPlan(
  planId: string,
  studentId: string,
  updates: Partial<StudentLearningPlan>
): Promise<void> {
  // 1. Local
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_PLANS}${studentId}`);
    if (raw) {
      const plans: StudentLearningPlan[] = JSON.parse(raw);
      const idx = plans.findIndex((p) => p.id === planId);
      if (idx !== -1) {
        plans[idx] = { ...plans[idx], ...updates, updated_at: new Date().toISOString() };
        localStorage.setItem(`${KEY_LOCAL_PLANS}${studentId}`, JSON.stringify(plans));
      }
    }
  } catch {}

  // 2. Supabase
  try {
    await supabase
      .from('student_learning_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', planId);
  } catch {}
}

export async function deleteLearningPlan(planId: string, studentId: string): Promise<void> {
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_PLANS}${studentId}`);
    if (raw) {
      const plans: StudentLearningPlan[] = JSON.parse(raw);
      const filtered = plans.filter((p) => p.id !== planId);
      localStorage.setItem(`${KEY_LOCAL_PLANS}${studentId}`, JSON.stringify(filtered));
    }
  } catch {}

  try {
    await supabase.from('student_learning_plans').delete().eq('id', planId);
  } catch {}
}

// ─── Assignments (Tareas y Exámenes Calendarizados) ─────────────────────────

export async function getStudentAssignments(studentId: string): Promise<StudentAssignment[]> {
  try {
    const { data, error } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('student_id', studentId)
      .order('due_date', { ascending: true });

    if (!error && data) {
      return data as StudentAssignment[];
    }
  } catch {}

  // Fallback local
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getStudentAssignmentById(
  assignmentId: string,
  studentId?: string
): Promise<StudentAssignment | null> {
  try {
    let query = supabase.from('student_assignments').select('*').eq('id', assignmentId);
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query.maybeSingle();
    if (!error && data) return data as StudentAssignment;
  } catch {}

  if (!studentId) return null;

  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`);
    if (!raw) return null;
    const list: StudentAssignment[] = JSON.parse(raw);
    return list.find((a) => a.id === assignmentId) ?? null;
  } catch {
    return null;
  }
}

export async function createAssignment(
  assignment: Omit<StudentAssignment, 'id' | 'created_at' | 'updated_at'>
): Promise<StudentAssignment> {
  const newAssignment: StudentAssignment = {
    ...assignment,
    id: `asg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    status: assignment.status || 'pending',
    priority: assignment.priority || 'normal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const writeLocal = (row: StudentAssignment, replaceId?: string) => {
    try {
      const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${assignment.student_id}`);
      const list: StudentAssignment[] = raw ? JSON.parse(raw) : [];
      const next = replaceId
        ? list.map((item) => (item.id === replaceId ? row : item))
        : [row, ...list.filter((item) => item.id !== row.id)];
      if (replaceId && !next.some((item) => item.id === row.id)) {
        next.unshift(row);
      }
      localStorage.setItem(`${KEY_LOCAL_ASSIGNMENTS}${assignment.student_id}`, JSON.stringify(next));
    } catch (e) {
      console.warn('[studentPlanService] Error saving assignment locally:', e);
    }
  };

  writeLocal(newAssignment);

  const { data, error } = await sb
    .from('student_assignments')
    .insert({
      student_id: assignment.student_id,
      plan_id: assignment.plan_id ?? null,
      title: assignment.title,
      type: assignment.type,
      description: assignment.description,
      target_module_id: assignment.target_module_id ?? null,
      target_topic_id: assignment.target_topic_id ?? null,
      target_exam_config: assignment.target_exam_config ?? {},
      due_date: assignment.due_date,
      status: newAssignment.status,
      priority: newAssignment.priority,
      min_score: assignment.min_score ?? null,
      assigned_by: assignment.assigned_by ?? null,
      ...(assignment.materials && assignment.materials.length > 0 ? { materials: assignment.materials } : {}),
    })
    .select()
    .single();

  if (error || !data) {
    try {
      const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${assignment.student_id}`);
      if (raw) {
        const list: StudentAssignment[] = JSON.parse(raw);
        localStorage.setItem(
          `${KEY_LOCAL_ASSIGNMENTS}${assignment.student_id}`,
          JSON.stringify(list.filter((item) => item.id !== newAssignment.id))
        );
      }
    } catch {}
    throw error || new Error('No se pudo crear la asignación en el servidor.');
  }

  writeLocal(data as StudentAssignment, newAssignment.id);
  const saved = data as StudentAssignment;
  void sendAcademicPush({
    userId: saved.student_id,
    title: `Nueva tarea: ${saved.title}`,
    body: saved.description || 'Tu profesor publicó una actividad en el portal.',
    url: '/portal?tab=assignments',
  }).catch(() => undefined);
  return saved;
}

export async function createBatchAssignments(
  studentIds: string[],
  assignmentData: Omit<StudentAssignment, 'id' | 'created_at' | 'updated_at' | 'student_id'>
): Promise<StudentAssignment[]> {
  const results: StudentAssignment[] = [];
  for (const sId of studentIds) {
    try {
      const created = await createAssignment({
        ...assignmentData,
        student_id: sId,
      });
      results.push(created);
    } catch (e) {
      console.warn(`[createBatchAssignments] Error creating assignment for student ${sId}:`, e);
    }
  }
  return results;
}

// ─── Active Exam Lock Management (Anti-abandono & Cronómetro continuo) ────────

export function getActiveExamLock(studentId: string): ActiveExamLock | null {
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ACTIVE_EXAM}${studentId}`);
    if (!raw) return null;
    const lock: ActiveExamLock = JSON.parse(raw);
    return lock;
  } catch {
    return null;
  }
}

export function setActiveExamLock(studentId: string, lock: ActiveExamLock): void {
  try {
    localStorage.setItem(`${KEY_LOCAL_ACTIVE_EXAM}${studentId}`, JSON.stringify(lock));
  } catch (e) {
    console.warn('[setActiveExamLock] Error:', e);
  }
}

export function clearActiveExamLock(studentId: string): void {
  try {
    localStorage.removeItem(`${KEY_LOCAL_ACTIVE_EXAM}${studentId}`);
  } catch {}
}

export async function startAssignedExam(
  assignmentId: string,
  studentId: string,
  timeLimitMinutes: number,
  meta?: Partial<ActiveExamLock>
): Promise<ActiveExamLock> {
  const now = new Date();
  const startedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + timeLimitMinutes * 60 * 1000).toISOString();

  const lock: ActiveExamLock = {
    assignmentId,
    studentId,
    assignmentTitle: meta?.assignmentTitle || 'Examen Asignado',
    startedAt,
    expiresAt,
    timeLimitMinutes,
    selectedQuestionIds: meta?.selectedQuestionIds,
    config: meta?.config || {},
    moduleId: meta?.moduleId,
    topicTitle: meta?.topicTitle,
    subtopicTitle: meta?.subtopicTitle,
  };

  setActiveExamLock(studentId, lock);

  // Update in local assignments list
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`);
    if (raw) {
      const list: StudentAssignment[] = JSON.parse(raw);
      const idx = list.findIndex((a) => a.id === assignmentId);
      if (idx !== -1) {
        list[idx].target_exam_config = {
          ...list[idx].target_exam_config,
          startedAt,
          expiresAt,
        };
        list[idx].updated_at = startedAt;
        localStorage.setItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`, JSON.stringify(list));
      }
    }
  } catch {}

  // Update in Supabase
  try {
    await supabase
      .from('student_assignments')
      .update({
        updated_at: startedAt,
      })
      .eq('id', assignmentId);
  } catch {}

  return lock;
}

export function buildAssignedExamConfig(
  assignment: StudentAssignment,
  lock?: ActiveExamLock | null
): ExamConfig {
  const raw = assignment.target_exam_config || {};
  const lockCfg =
    lock?.config && typeof lock.config === 'object' && Object.keys(lock.config).length > 0
      ? lock.config
      : {};
  const merged = { ...raw, ...lockCfg } as NonNullable<StudentAssignment['target_exam_config']> & ExamConfig;
  const timeLimitMinutes = Number(merged.timeLimitMinutes || lock?.timeLimitMinutes || 20);
  const selectedIds = merged.selectedQuestionIds || lock?.selectedQuestionIds;
  const questionCount = merged.questionCount || selectedIds?.length || 10;

  return {
    mode:
      merged.mode ||
      (merged.topicNames?.length || merged.moduleId || assignment.target_module_id
        ? 'TOPIC_SPECIFIC'
        : 'FULL_SIMULATION'),
    moduleId: merged.moduleId || assignment.target_module_id || lock?.moduleId || undefined,
    topicNames: merged.topicNames,
    questionCount,
    timeLimitSeconds: timeLimitMinutes * 60,
    feedbackMode: merged.feedbackMode || 'end',
  };
}

export function assignedExamLocationState(assignment: StudentAssignment, lock?: ActiveExamLock | null) {
  const config = buildAssignedExamConfig(assignment, lock);
  const timeLimitMinutes =
    assignment.target_exam_config?.timeLimitMinutes || lock?.timeLimitMinutes || 20;
  const selectedQuestionIds =
    assignment.target_exam_config?.selectedQuestionIds || lock?.selectedQuestionIds;

  return {
    assignmentId: assignment.id,
    config: {
      ...config,
      timeLimitMinutes,
      strictLock: true,
      expiresAt: lock?.expiresAt,
      selectedQuestionIds,
    },
    expiresAt: lock?.expiresAt,
    strictLock: true as const,
    selectedQuestionIds,
    assignmentTitle: assignment.title || lock?.assignmentTitle || 'Examen Asignado',
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function rpcLooksUnavailable(error: { message?: string; code?: string } | null | undefined): boolean {
  const code = error?.code || '';
  const message = (error?.message || '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    message.includes('could not find the function') ||
    message.includes('does not exist')
  );
}

function patchLocalAssignment(studentId: string, assignmentId: string, patch: Partial<StudentAssignment>): void {
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`);
    if (!raw) return;
    const list: StudentAssignment[] = JSON.parse(raw);
    const idx = list.findIndex((a) => a.id === assignmentId);
    if (idx === -1) return;
    list[idx] = { ...list[idx], ...patch, updated_at: patch.updated_at || new Date().toISOString() };
    localStorage.setItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`, JSON.stringify(list));
  } catch {}
}

export async function completeAssignedExam(
  assignmentId: string,
  studentId: string,
  score: number,
  durationSeconds: number,
  examSessionId?: string | null,
  feedback?: string
): Promise<void> {
  clearActiveExamLock(studentId);

  const completedAt = new Date().toISOString();
  const notes =
    feedback ||
    `Evaluación completada. Calificación: ${score}/100 pts. Tiempo: ${Math.round(durationSeconds / 60)} min.`;
  const sessionId = examSessionId && isUuid(examSessionId) ? examSessionId : null;

  const applyLocalCompletion = (row?: Partial<StudentAssignment>) => {
    const passed = (row?.grade ?? score) >= (row?.min_score ?? 70);
    patchLocalAssignment(studentId, assignmentId, {
      ...(row || {}),
      grade: row?.grade ?? score,
      status: row?.status ?? (passed ? 'approved' : 'submitted'),
      submitted_at: row?.submitted_at ?? completedAt,
      reviewed_at: row?.reviewed_at ?? completedAt,
      reviewed_by: row?.reviewed_by ?? null,
      feedback: row?.feedback ?? notes,
      student_notes: row?.student_notes ?? notes,
      updated_at: row?.updated_at ?? completedAt,
    });
  };

  applyLocalCompletion();

  if (!isUuid(assignmentId)) {
    return;
  }

  const { data: rpcRow, error: rpcError } = await sb.rpc('complete_my_assigned_exam', {
    p_assignment_id: assignmentId,
    p_exam_session_id: sessionId,
    p_score: sessionId ? null : score,
    p_duration_seconds: durationSeconds,
  });

  const completedRow = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
  if (!rpcError && completedRow) {
    applyLocalCompletion(completedRow as StudentAssignment);
    return;
  }

  if (rpcError && !rpcLooksUnavailable(rpcError)) {
    const msg = (rpcError.message || '').toLowerCase();
    if (msg.includes('no quedan intentos') || msg.includes('sesión de examen no válida')) {
      console.warn('[completeAssignedExam] RPC rejected:', rpcError.message);
    } else {
      console.warn('[completeAssignedExam] RPC failed, using submission fallback:', rpcError.message);
    }
  }

  const { data: submittedRow, error: submitError } = await sb.rpc('submit_my_assignment', {
    p_assignment_id: assignmentId,
    p_notes: notes,
    p_submission_url: sessionId ? `exam_session:${sessionId}` : null,
  });

  if (!submitError) {
    applyLocalCompletion((submittedRow as StudentAssignment) || { status: 'submitted', submitted_at: completedAt });
    return;
  }

  const submitMsg = (submitError.message || '').toLowerCase();
  if (submitMsg.includes('no disponible') || submitMsg.includes('no encontrada')) {
    applyLocalCompletion({ status: 'submitted', submitted_at: completedAt });
    return;
  }

  // Campos que el trigger de integridad sí permite al alumno.
  const { data: updatedRow, error: updateError } = await sb
    .from('student_assignments')
    .update({
      status: 'submitted',
      submitted_at: completedAt,
      student_notes: notes,
      submission_url: sessionId ? `exam_session:${sessionId}` : null,
      updated_at: completedAt,
    })
    .eq('id', assignmentId)
    .eq('student_id', studentId)
    .select('id, status, submitted_at')
    .maybeSingle();

  if (updateError || !updatedRow) {
    console.error(
      '[completeAssignedExam] No se pudo asentar la entrega en el servidor:',
      updateError?.message || 'sin filas actualizadas'
    );
    return;
  }

  applyLocalCompletion({ status: 'submitted', submitted_at: completedAt });
}

/**
 * El alumno solicita formalmente permiso al profesor para repetir un examen asignado
 */
export async function requestExamRetake(
  assignmentId: string,
  studentId: string,
  reason: string
): Promise<void> {
  const now = new Date().toISOString();
  let newConfig: any = null;

  // Local
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`);
    if (raw) {
      const list: StudentAssignment[] = JSON.parse(raw);
      const idx = list.findIndex((a) => a.id === assignmentId);
      if (idx !== -1) {
        newConfig = {
          ...(list[idx].target_exam_config || {}),
          retakeStatus: 'requested',
          retakeReason: reason,
          retakeRequestedAt: now,
        };
        list[idx] = {
          ...list[idx],
          target_exam_config: newConfig,
          updated_at: now,
        };
        localStorage.setItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`, JSON.stringify(list));
      }
    }
  } catch {}

  // Supabase
  try {
    if (newConfig) {
      await supabase
        .from('student_assignments')
        .update({
          target_exam_config: newConfig,
          updated_at: now,
        })
        .eq('id', assignmentId);
    }
  } catch {}

  await logStudentActivity(studentId, 'Solicitud de reintento de examen enviada', {
    assignmentId,
    reason,
  });
}

/**
 * El profesor o administrador aprueba el reintento del examen
 */
export async function approveExamRetake(
  assignmentId: string,
  studentId: string,
  adminId?: string,
  additionalAttempts = 1,
  notes?: string
): Promise<void> {
  const now = new Date().toISOString();
  let newConfig: any = null;

  // Local
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`);
    if (raw) {
      const list: StudentAssignment[] = JSON.parse(raw);
      const idx = list.findIndex((a) => a.id === assignmentId);
      if (idx !== -1) {
        const currentMax = list[idx].target_exam_config?.maxAttempts || 1;
        newConfig = {
          ...(list[idx].target_exam_config || {}),
          retakeStatus: 'approved',
          retakeReviewedAt: now,
          retakeReviewedBy: adminId || 'Profesor Titular',
          retakeReviewNotes: notes || 'Reintento autorizado por el cuerpo docente.',
          maxAttempts: currentMax + additionalAttempts,
        };
        list[idx] = {
          ...list[idx],
          target_exam_config: newConfig,
          status: 'pending', // Se reabre para que pueda resolverlo
          updated_at: now,
        };
        localStorage.setItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`, JSON.stringify(list));
      }
    }
  } catch {}

  // Supabase
  try {
    if (newConfig) {
      await supabase
        .from('student_assignments')
        .update({
          target_exam_config: newConfig,
          status: 'pending',
          updated_at: now,
        })
        .eq('id', assignmentId);
    }
  } catch {}

  await logStudentActivity(studentId, 'Reintento de examen autorizado por el profesor', {
    assignmentId,
    adminId,
    additionalAttempts,
  });
}

/**
 * El profesor o administrador rechaza el reintento del examen
 */
export async function rejectExamRetake(
  assignmentId: string,
  studentId: string,
  adminId?: string,
  reason?: string
): Promise<void> {
  const now = new Date().toISOString();
  let newConfig: any = null;

  // Local
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`);
    if (raw) {
      const list: StudentAssignment[] = JSON.parse(raw);
      const idx = list.findIndex((a) => a.id === assignmentId);
      if (idx !== -1) {
        newConfig = {
          ...(list[idx].target_exam_config || {}),
          retakeStatus: 'rejected',
          retakeReviewedAt: now,
          retakeReviewedBy: adminId || 'Profesor Titular',
          retakeReviewNotes: reason || 'Solicitud de reintento no autorizada para este periodo.',
        };
        list[idx] = {
          ...list[idx],
          target_exam_config: newConfig,
          updated_at: now,
        };
        localStorage.setItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`, JSON.stringify(list));
      }
    }
  } catch {}

  // Supabase
  try {
    if (newConfig) {
      await supabase
        .from('student_assignments')
        .update({
          target_exam_config: newConfig,
          updated_at: now,
        })
        .eq('id', assignmentId);
    }
  } catch {}

  await logStudentActivity(studentId, 'Solicitud de reintento de examen denegada', {
    assignmentId,
    adminId,
    reason,
  });
}

export async function submitAssignment(
  assignmentId: string,
  studentId: string,
  studentNotes?: string,
  submissionUrl?: string
): Promise<void> {
  const submittedAt = new Date().toISOString();

  // Local
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`);
    if (raw) {
      const list: StudentAssignment[] = JSON.parse(raw);
      const idx = list.findIndex((a) => a.id === assignmentId);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          status: 'submitted',
          submitted_at: submittedAt,
          student_notes: studentNotes ?? list[idx].student_notes,
          submission_url: submissionUrl ?? list[idx].submission_url,
          updated_at: submittedAt,
        };
        localStorage.setItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`, JSON.stringify(list));
      }
    }
  } catch {}

  const { error } = await sb.rpc('submit_my_assignment', {
    p_assignment_id: assignmentId,
    p_notes: studentNotes ?? null,
    p_submission_url: submissionUrl ?? null,
  });
  if (error) throw error;
}

export async function gradeAssignment(
  assignmentId: string,
  studentId: string,
  grade: number,
  feedback: string,
  reviewerId?: string,
  decision?: 'approved' | 'needs_revision'
): Promise<void> {
  const reviewedAt = new Date().toISOString();
  const status: AssignmentStatus = decision ?? (grade >= 70 ? 'approved' : 'needs_revision');

  // Local
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`);
    if (raw) {
      const list: StudentAssignment[] = JSON.parse(raw);
      const idx = list.findIndex((a) => a.id === assignmentId);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          grade,
          feedback,
          status,
          reviewed_at: reviewedAt,
          reviewed_by: reviewerId ?? list[idx].reviewed_by,
          updated_at: reviewedAt,
        };
        localStorage.setItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`, JSON.stringify(list));
      }
    }
  } catch {}

  if (!isUuid(assignmentId)) {
    return;
  }

  const { data, error } = await sb
    .from('student_assignments')
    .update({
      grade,
      feedback,
      status,
      reviewed_at: reviewedAt,
      reviewed_by: reviewerId ?? null,
      updated_at: reviewedAt,
    })
    .eq('id', assignmentId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('No se pudo asentar la calificación. Revisa permisos y el identificador del revisor.');
  }

  const title = status === 'needs_revision' ? 'Corrección solicitada' : `Calificación: ${grade}/100`;
  void sendAcademicPush({
    userId: studentId,
    title,
    body: feedback || 'Tu profesor revisó tu entrega.',
    url: '/portal?tab=assignments',
  }).catch(() => undefined);
}

export async function deleteAssignment(assignmentId: string, studentId: string): Promise<void> {
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`);
    if (raw) {
      const list: StudentAssignment[] = JSON.parse(raw);
      const filtered = list.filter((a) => a.id !== assignmentId);
      localStorage.setItem(`${KEY_LOCAL_ASSIGNMENTS}${studentId}`, JSON.stringify(filtered));
    }
  } catch {}

  try {
    const { error } = await supabase.from('student_assignments').delete().eq('id', assignmentId);
    if (error) {
      console.warn('[studentPlanService] deleteAssignment direct delete failed, trying RPC fallback:', error.message);
      await (supabase.rpc as any)('admin_delete_student_assignment', {
        p_assignment_id: assignmentId,
      });
    }
  } catch (e) {
    console.error('[studentPlanService] deleteAssignment error:', e);
  }
}

// ─── Desglose Pregunta por Pregunta (Aciertos y Errores) ────────────────────

export async function getDetailedExamBreakdown(attempt: QuizAttempt): Promise<StudentExamDetail> {
  const questionMap = new Map<string, any>();
  for (const q of attempt.revealed_questions ?? []) {
    questionMap.set(q.id, q);
  }

  const questionBreakdowns: QuestionBreakdownItem[] = (attempt.answers || []).map((ans, idx) => {
    const qData = questionMap.get(ans.questionId);

    let stem = qData?.stem ?? `Pregunta #${idx + 1}`;
    let imageUrl = qData?.image_url ?? qData?.imageUrl ?? null;
    let explanation = qData?.explanation ?? qData?.pearl ?? 'Revisar criterios diagnósticos en el módulo correspondiente.';
    let pearl = qData?.pearl ?? null;
    let difficulty = qData?.difficulty ?? 'intermedio';
    let isCritical = Boolean(qData?.is_critical);

    let selectedOptionText = 'Sin respuesta';
    let correctOptionText = 'No especificada';

    if (qData?.options) {
      // Manejar formato de opciones (pueden ser {id, text, isCorrect} o {text, is_correct})
      const opts = qData.options;
      const selOpt = opts.find((o: any) =>
        ans.selectedIds?.includes(o.id) || ans.selectedIds?.includes(String(opts.indexOf(o)))
      );
      if (selOpt) {
        selectedOptionText = selOpt.text;
      } else if (ans.selectedIds && ans.selectedIds.length > 0) {
        selectedOptionText = `Opción seleccionada [${ans.selectedIds.join(', ')}]`;
      }

      const correctOpt = opts.find((o: any) => o.isCorrect === true || o.is_correct === true);
      if (correctOpt) {
        correctOptionText = correctOpt.text;
      }
    }

    return {
      questionId: ans.questionId,
      stem,
      imageUrl,
      selectedOptionText,
      correctOptionText,
      isCorrect: ans.correct,
      explanation,
      pearl,
      difficulty,
      isCritical,
    };
  });

  const correctCount = questionBreakdowns.filter((q) => q.isCorrect).length;
  const incorrectCount = questionBreakdowns.length - correctCount;

  return {
    attemptId: attempt.id,
    quizId: attempt.quiz_id,
    topicId: attempt.topic_id,
    moduleId: attempt.module_id,
    title: getLocalQuizFlagForTopic(attempt.topic_id)?.title ?? `Evaluación: ${attempt.topic_id}`,
    score: attempt.score,
    passed: attempt.passed,
    completedAt: attempt.completed_at,
    durationSeconds: attempt.duration_seconds,
    totalQuestions: questionBreakdowns.length,
    correctCount,
    incorrectCount,
    questions: questionBreakdowns,
  };
}

// ─── Notas Docentes Confidenciales ──────────────────────────────────────────

export async function saveAdminStudentNotes(studentId: string, notes: string): Promise<void> {
  // Local
  try {
    localStorage.setItem(`${KEY_LOCAL_ADMIN_NOTES}${studentId}`, notes);
  } catch {}

  // Supabase
  try {
    await supabase.from('profiles').update({ admin_notes: notes }).eq('id', studentId);
  } catch {}
}

export function getAdminStudentNotes(studentId: string, serverNotes?: string | null): string {
  if (serverNotes) return serverNotes;
  try {
    return localStorage.getItem(`${KEY_LOCAL_ADMIN_NOTES}${studentId}`) || '';
  } catch {
    return '';
  }
}

// ─── Expediente Completo del Alumno (Full Dossier Aggregator) ───────────────

export async function getStudentFullDossier(studentId: string): Promise<StudentFullDossier> {
  // 1. Obtener perfil
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  const profile: Profile = profileData ?? {
    id: studentId,
    display_name: 'Médico Cursista',
    credentials: null,
    institution: null,
    specialty: null,
    residency_year: null,
    cedula_profesional: null,
    comefyr_member_id: null,
    avatar_url: null,
    bio: null,
    is_public: false,
    verified_at: null,
    enrollment_status: 'approved',
    enrollment_verified_at: null,
    enrollment_requested_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 2. Roles
  let roles: string[] = ['student'];
  try {
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', studentId);
    if (rolesData && rolesData.length > 0) {
      roles = rolesData.map((r: any) => r.role);
    }
  } catch {}

  // 3. Progreso curricular y Quizzes
  let moduleProgress = await getMyProgressByModule(studentId).catch(() => []);
  let quizAttempts = await getMyAttempts(studentId, 100).catch(() => []);
  const completedTopicsSet = await fetchStudentCompletedTopics(studentId).catch(() => new Set<string>());

  // 4. Métricas globales
  const studentMetrics = calculateStudentMetrics(studentId, moduleProgress, completedTopicsSet);
  const { calculateStudentKardex } = await import('./gradebookService');
  const kardex = await calculateStudentKardex(studentId, profile).catch(() => null);
  const certRequirements = checkCertificationEligibility(
    profile,
    studentMetrics.overallProgressPct,
    moduleProgress,
    kardex
      ? { isOfficial: kardex.isOfficial, isPassing: kardex.isPassing, officialGrade: kardex.officialGrade }
      : null
  );

  const scores = quizAttempts.map((a) => a.score);
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const quizzesPassedCount = quizAttempts.filter((a) => a.passed).length;

  // 5. Sesiones de examen simulador
  let examSessions: ExamSession[] = [];
  try {
    const { data: sessionsData } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('user_id', studentId)
      .order('started_at', { ascending: false });
    if (sessionsData) examSessions = sessionsData as ExamSession[];
  } catch {}

  // 6. Actividad y Racha
  const streakInfo = await getStudentActivityAndStreak(studentId);
  const activityLogs = await getStudentActivityLogs(studentId, 30);

  // 7. Planes y Asignaciones
  const learningPlans = await getStudentLearningPlans(studentId);
  const assignments = await getStudentAssignments(studentId);

  // 8. Evaluación de Dominios (Áreas Bien Dominadas vs Áreas de Oportunidad)
  const topicStats = new Map<
    string,
    { topicName: string; moduleId: string; total: number; correct: number; criticalFailures: number }
  >();

  // A partir de los intentos de quizzes
  for (const att of quizAttempts) {
    const tName = att.topic_id;
    const current = topicStats.get(tName) ?? {
      topicName: tName,
      moduleId: att.module_id,
      total: 0,
      correct: 0,
      criticalFailures: 0,
    };
    current.total++;
    if (att.passed) current.correct++;
    if (!att.passed && att.score < 50) current.criticalFailures++;
    topicStats.set(tName, current);
  }

  const masteredTopics: StudentDomainAssessment['masteredTopics'] = [];
  const opportunityTopics: StudentDomainAssessment['opportunityTopics'] = [];

  topicStats.forEach((stat) => {
    const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    if (accuracy >= 80) {
      masteredTopics.push({
        topicName: stat.topicName,
        moduleId: stat.moduleId,
        accuracyPct: accuracy,
        totalAttempts: stat.total,
      });
    } else {
      opportunityTopics.push({
        topicName: stat.topicName,
        moduleId: stat.moduleId,
        accuracyPct: accuracy,
        totalAttempts: stat.total,
        criticalFailures: stat.criticalFailures,
        recommendedActions: `Reforzar lectura clínica del Módulo ${stat.moduleId} y realizar examen focalizado.`,
      });
    }
  });

  // Si aún no tiene muchos intentos de quiz, pre-poblar recomendaciones basadas en el catálogo curricular
  if (masteredTopics.length === 0 && opportunityTopics.length === 0) {
    masteredTopics.push({
      topicName: 'Fundamentos de Conducción Sensitiva',
      moduleId: 'nerve-conduction',
      accuracyPct: 90,
      totalAttempts: 2,
    });
    opportunityTopics.push({
      topicName: 'Plexo Braquial: Criterios Topográficos',
      moduleId: 'topographic-anatomy',
      accuracyPct: 60,
      totalAttempts: 1,
      criticalFailures: 1,
      recommendedActions: 'Completar el simulador de 5 pasos de Plexo Braquial y revisar caso clínico.',
    });
  }

  // Integrar notas locales del admin si no están en el perfil
  profile.admin_notes = getAdminStudentNotes(studentId, profile.admin_notes);

  return {
    profile,
    roles,
    metrics: {
      overallProgressPct: studentMetrics.overallProgressPct,
      totalCurriculumTopics: studentMetrics.totalCurriculumTopics,
      completedTopicsCount: studentMetrics.totalCompletedCurriculumTopics,
      cmeCreditsEarned: studentMetrics.cmeCreditsEarned,
      maxCmeCredits: studentMetrics.maxCmeCredits,
      academicHoursEarned: studentMetrics.academicHoursEarned,
      maxAcademicHours: studentMetrics.maxAcademicHours,
      averageScore,
      quizzesAttemptedCount: quizAttempts.length,
      quizzesPassedCount,
      isCertificationEligible: certRequirements.isEligible,
      certificateFolio: certRequirements.certificateFolio,
    },
    moduleProgress,
    moduleStats: studentMetrics.moduleStats,
    completedTopicIds: Array.from(completedTopicsSet),
    quizAttempts,
    examSessions,
    domainAssessment: {
      masteredTopics,
      opportunityTopics,
    },
    streakInfo,
    activityLogs,
    learningPlans,
    assignments,
  };
}

export async function getAllStudentAssignments(
  knownProfiles?: AdminProfileRow[]
): Promise<StudentAssignment[]> {
  const allAssignmentsMap = new Map<string, StudentAssignment>();

  try {
    const { data } = await supabase
      .from('student_assignments')
      .select('*')
      .order('due_date', { ascending: false });

    if (data && Array.isArray(data)) {
      (data as StudentAssignment[]).forEach((item) => allAssignmentsMap.set(item.id, item));
    }
  } catch (e) {
    console.warn('[studentPlanService] Supabase error fetching cohort assignments:', e);
  }

  if (knownProfiles) {
    for (const prof of knownProfiles) {
      try {
        const raw = localStorage.getItem(`${KEY_LOCAL_ASSIGNMENTS}${prof.id}`);
        if (raw) {
          const list: StudentAssignment[] = JSON.parse(raw);
          list.forEach((item) => {
            if (!allAssignmentsMap.has(item.id)) {
              allAssignmentsMap.set(item.id, item);
            }
          });
        }
      } catch {
        // ignore cache parse errors
      }
    }
  }

  return [...allAssignmentsMap.values()].sort((a, b) => {
    const da = a.submitted_at || a.updated_at || a.due_date;
    const db = b.submitted_at || b.updated_at || b.due_date;
    return new Date(db).getTime() - new Date(da).getTime();
  });
}

/**
 * Recupera todas las entregas de tareas/casos pendientes de calificación ('submitted')
 * y las solicitudes de reintento de examen activas ('requested') para el panel docente.
 */
export async function getTeacherPendingReviewItems(
  knownProfiles?: AdminProfileRow[]
): Promise<{
  pendingSubmissions: TeacherPendingReviewItem[];
  pendingRetakes: TeacherPendingReviewItem[];
}> {
  const profileMap = new Map<string, AdminProfileRow>();
  if (knownProfiles) {
    knownProfiles.forEach((p) => profileMap.set(p.id, p));
  }

  const allAssignments = await getAllStudentAssignments(knownProfiles);

  const pendingSubmissions: TeacherPendingReviewItem[] = [];
  const pendingRetakes: TeacherPendingReviewItem[] = [];

  for (const asg of allAssignments) {
    const studentProfile = profileMap.get(asg.student_id);

    // Entregas enviadas esperando calificación docente
    if (asg.status === 'submitted') {
      pendingSubmissions.push({
        assignment: asg,
        studentProfile,
      });
    }

    // Solicitudes de reintento de examen
    if (asg.target_exam_config?.retakeStatus === 'requested') {
      pendingRetakes.push({
        assignment: asg,
        studentProfile,
      });
    }
  }

  // Ordenar por fecha más reciente
  pendingSubmissions.sort((a, b) => {
    const da = a.assignment.submitted_at || a.assignment.updated_at;
    const db = b.assignment.submitted_at || b.assignment.updated_at;
    return new Date(db).getTime() - new Date(da).getTime();
  });

  pendingRetakes.sort((a, b) => {
    const da = a.assignment.target_exam_config?.retakeRequestedAt || a.assignment.updated_at;
    const db = b.assignment.target_exam_config?.retakeRequestedAt || b.assignment.updated_at;
    return new Date(db).getTime() - new Date(da).getTime();
  });

  return {
    pendingSubmissions,
    pendingRetakes,
  };
}
