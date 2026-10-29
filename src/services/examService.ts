/**
 * Servicio de Exámenes para NeuroSAFEMX.
 * Híbrido: prioriza Supabase; si falla, usa datos locales (emgQuestionsFallback).
 */

import { sb, supabaseAnonKey, supabaseUrl } from '../lib/supabase';
import type {
  ExamQuestion,
  ExamConfig,
  ExamAttemptRecord,
  ExamAttemptState,
  ExamSession,
  ExamAnswerRecord,
  ExamGapAnalysis,
} from '../types/exam';
import {
  EMG_QUESTIONS_FALLBACK,
  QUESTIONS_BY_TOPIC,
} from '../data/emgQuestionsFallback';
import type { ExamOptionOrder } from '../utils/examQuestionOrder';
import type { ExamAnswerReveal, SubmitExamResult } from '../types/exam';
import {
  parseExamAnswerReveal,
  parseExamAnswerRevealMap,
  questionsHaveAnswerKeys,
  rpcLooksUnavailable,
  stripExamAnswerKeys,
} from '../utils/examIntegrity';

export {
  applyOptionOrder,
  prepareExamQuestions,
  restoreExamQuestions,
  shuffleArray,
  withRandomOptionOrder,
} from '../utils/examQuestionOrder';
export type { ExamOptionOrder } from '../utils/examQuestionOrder';

/** Antigüedad máxima de un intento para ofrecerlo como reanudable */
export const PENDING_ATTEMPT_MAX_AGE_HOURS = 24;

// ─── Carga de Preguntas ───────────────────────────────────────────────────────

export interface LoadExamQuestionsOptions {
  /** Staff (admin/editor): lee el banco completo con claves. El alumno nunca debe pasar true. */
  revealAnswers?: boolean;
  criticalOnly?: boolean;
  failedOnly?: boolean;
  questionIds?: string[];
}

function asExamQuestionList(raw: unknown): ExamQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw as ExamQuestion[];
}

/** Carga preguntas publicadas. El alumno recibe el banco sin claves. */
export async function loadExamQuestions(
  config?: Partial<Pick<ExamConfig, 'topicNames' | 'moduleId'>>,
  options: LoadExamQuestionsOptions = {}
): Promise<{ questions: ExamQuestion[]; source: 'supabase' | 'fallback' }> {
  const { revealAnswers = false, criticalOnly = false, failedOnly = false, questionIds } = options;

  if (!revealAnswers) {
    try {
      const { data, error } = await sb.rpc('get_exam_questions_for_attempt', {
        p_topic_names: config?.topicNames ?? null,
        p_module_id: config?.moduleId ?? null,
        p_question_ids: questionIds ?? null,
        p_critical_only: criticalOnly,
        p_failed_only: failedOnly,
      });
      if (error) throw error;
      const questions = asExamQuestionList(data).map(stripExamAnswerKeys);
      if (questions.length === 0) throw new Error('No questions found in RPC');
      return { questions, source: 'supabase' };
    } catch (err) {
      if (!rpcLooksUnavailable(err as { message?: string; code?: string })) {
        console.warn('[examService] get_exam_questions_for_attempt failed:', err);
      }
    }
  }

  try {
    let query = sb
      .from('exam_questions')
      .select('*')
      .eq('status', 'PUBLISHED');

    if (config?.moduleId) {
      query = query.eq('module_id', config.moduleId);
    }
    if (config?.topicNames && config.topicNames.length > 0) {
      query = query.in('topic_name', config.topicNames);
    }
    if (questionIds && questionIds.length > 0) {
      query = query.in('id', questionIds);
    }
    if (criticalOnly) {
      query = query.eq('is_critical', true);
    }

    const { data, error } = await query.order('topic_name').order('difficulty');

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No questions found in Supabase');

    const questions = data as ExamQuestion[];
    return {
      questions: revealAnswers ? questions : questions.map(stripExamAnswerKeys),
      source: 'supabase',
    };
  } catch (err) {
    console.warn('[examService] Supabase failed, using fallback data:', err);

    let questions = EMG_QUESTIONS_FALLBACK;
    if (config?.topicNames && config.topicNames.length > 0) {
      questions = questions.filter(q => config.topicNames!.includes(q.topic_name));
    }
    if (config?.moduleId) {
      questions = questions.filter(q => q.module_id === config.moduleId);
    }
    if (questionIds && questionIds.length > 0) {
      const idSet = new Set(questionIds);
      questions = questions.filter(q => idSet.has(q.id));
    }
    if (criticalOnly) {
      questions = questions.filter(q => q.is_critical);
    }
    if (failedOnly) {
      questions = questions.filter(q => q.is_critical);
    }
    return {
      questions: revealAnswers ? questions : questions.map(stripExamAnswerKeys),
      source: 'fallback',
    };
  }
}

/** Carga preguntas solo de los temas fallados por el usuario */
export async function loadFailedQuestions(): Promise<{ questions: ExamQuestion[]; source: 'supabase' | 'fallback' }> {
  return loadExamQuestions(undefined, { failedOnly: true });
}

// ─── Gestión de Intentos en Curso ─────────────────────────────────────────────

export interface CreateExamAttemptOptions {
  optionOrder?: ExamOptionOrder;
  expiresAt?: string | null;
  assignmentId?: string | null;
}

/** Marca ABANDONED los intentos en curso del usuario. Retorna cuántos cerró. */
export async function abandonInProgressAttempts(
  userId: string,
  exceptAttemptId?: string | null
): Promise<number> {
  try {
    let query = sb
      .from('exam_attempts')
      .update({ status: 'ABANDONED' })
      .eq('user_id', userId)
      .eq('status', 'IN_PROGRESS');

    if (exceptAttemptId) query = query.neq('id', exceptAttemptId);

    const { data, error } = await query.select('id');
    if (error) throw error;
    return (data ?? []).length;
  } catch (err) {
    console.warn('[examService] abandonInProgressAttempts failed:', err);
    return 0;
  }
}

/**
 * Crea un nuevo intento de examen en Supabase.
 * Cierra primero cualquier intento en curso del usuario: solo puede haber uno
 * vivo a la vez (índice único parcial `uq_exam_attempts_one_in_progress`).
 */
export async function createExamAttempt(
  userId: string,
  config: ExamConfig,
  questionIds: string[],
  options: CreateExamAttemptOptions = {}
): Promise<ExamAttemptRecord | null> {
  try {
    await abandonInProgressAttempts(userId);

    const { data, error } = await sb
      .from('exam_attempts')
      .insert({
        user_id: userId,
        mode: config.mode,
        config,
        question_ids: questionIds,
        current_question_index: 0,
        answers: {},
        flagged: {},
        option_order: options.optionOrder ?? {},
        expires_at: options.expiresAt ?? null,
        assignment_id: options.assignmentId ?? null,
        time_remaining_seconds: config.timeLimitSeconds ?? null,
        status: 'IN_PROGRESS',
      })
      .select()
      .single();

    if (error) throw error;
    return data as ExamAttemptRecord;
  } catch (err) {
    console.error('[examService] createExamAttempt failed:', err);
    return null;
  }
}

function toAttemptUpdate(state: Partial<ExamAttemptState>): Partial<ExamAttemptRecord> {
  const updateData: Partial<ExamAttemptRecord> = {};
  if (state.currentQuestionIndex !== undefined) updateData.current_question_index = state.currentQuestionIndex;
  if (state.answers !== undefined) updateData.answers = state.answers;
  if (state.flagged !== undefined) updateData.flagged = state.flagged;
  if (state.timeRemainingSeconds !== undefined) updateData.time_remaining_seconds = state.timeRemainingSeconds;
  return updateData;
}

/** Guarda el estado actual del examen (auto-guardado) */
export async function saveExamProgress(
  attemptId: string,
  state: Partial<ExamAttemptState>
): Promise<boolean> {
  try {
    const { error } = await sb
      .from('exam_attempts')
      .update(toAttemptUpdate(state))
      .eq('id', attemptId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Guardado de último instante al cerrar/ocultar la pestaña.
 * Usa `fetch` con `keepalive` porque una petición normal se cancela cuando el
 * documento se descarga; `sendBeacon` no sirve aquí (solo hace POST y no acepta
 * las cabeceras de autorización que exige PostgREST).
 */
export function flushExamProgress(
  attemptId: string,
  state: Partial<ExamAttemptState>,
  accessToken: string | null
): void {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return;

  const payload = toAttemptUpdate(state);
  if (Object.keys(payload).length === 0) return;

  try {
    void fetch(`${supabaseUrl}/rest/v1/exam_attempts?id=eq.${encodeURIComponent(attemptId)}`, {
      method: 'PATCH',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Último recurso: si el navegador ya bloqueó la petición no hay nada que hacer.
  }
}

/**
 * Obtiene el intento en curso del usuario, si existe y sigue siendo reciente.
 * Los intentos sin actividad en las últimas horas se consideran abandonados y
 * no se ofrecen para reanudar (además `abandon_stale_exam_attempts` los cierra).
 */
export async function getPendingExamAttempt(
  userId: string,
  maxAgeHours: number = PENDING_ATTEMPT_MAX_AGE_HOURS
): Promise<ExamAttemptRecord | null> {
  try {
    const cutoff = new Date(Date.now() - maxAgeHours * 3_600_000).toISOString();

    const { data, error } = await sb
      .from('exam_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'IN_PROGRESS')
      .gte('updated_at', cutoff)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as ExamAttemptRecord | null;
  } catch {
    return null;
  }
}

/** Carga un intento específico por ID */
export async function loadExamAttempt(attemptId: string): Promise<ExamAttemptRecord | null> {
  try {
    const { data, error } = await sb
      .from('exam_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (error) throw error;
    return data as ExamAttemptRecord;
  } catch {
    return null;
  }
}

/** Marca el intento como abandonado. COMPLETED solo lo escribe el RPC de envío. */
export async function finalizeExamAttempt(
  attemptId: string,
  status: 'COMPLETED' | 'ABANDONED' = 'ABANDONED'
): Promise<boolean> {
  const { error } = await sb.from('exam_attempts').update({ status }).eq('id', attemptId);
  if (error) console.warn('[examService] finalizeExamAttempt failed:', error);
  return !error;
}

/**
 * Borra la caché local asociada a un intento.
 * Sin esto quedaban llaves `neurosafe_exam_qs_*` huérfanas que podían devolver
 * un examen viejo al alumno.
 */
export function clearExamAttemptCaches(attemptId?: string | null, assignmentId?: string | null): void {
  const keys = [
    attemptId ? `neurosafe_exam_qs_att_${attemptId}` : null,
    assignmentId ? `neurosafe_exam_qs_asg_${assignmentId}` : null,
    assignmentId ? `neurosafe_asg_answers_${assignmentId}` : null,
  ].filter((k): k is string => Boolean(k));

  keys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });
}

// ─── Calificación en servidor ─────────────────────────────────────────────────

export async function gradeExamAnswer(
  attemptId: string,
  questionId: string,
  selectedIndex: number
): Promise<ExamAnswerReveal | null> {
  const { data, error } = await sb.rpc('grade_exam_answer', {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_selected_index: selectedIndex,
  });
  if (error) {
    if (!rpcLooksUnavailable(error)) {
      console.warn('[examService] grade_exam_answer failed:', error.message);
    }
    return null;
  }
  return parseExamAnswerReveal(data);
}

export async function loadExamAttemptReveals(
  attemptId: string
): Promise<Record<string, ExamAnswerReveal>> {
  const { data, error } = await sb.rpc('get_exam_attempt_reveals', {
    p_attempt_id: attemptId,
  });
  if (error) return {};
  return parseExamAnswerRevealMap(data);
}

function parseSubmitExamResult(raw: unknown): SubmitExamResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const nested = rec.session && typeof rec.session === 'object'
    ? rec.session as Record<string, unknown>
    : null;
  const sessionId = String(rec.sessionId ?? rec.session_id ?? nested?.id ?? '');
  if (!sessionId) return null;
  const questions = asExamQuestionList(rec.questions);
  const answersRaw = Array.isArray(rec.answers) ? rec.answers : [];
  const scorePercentage = Number(
    rec.scorePercentage ?? rec.score_percentage ?? nested?.score_percentage ?? 0
  );
  const correctAnswers = Number(
    rec.correctAnswers ?? rec.correct_answers ?? nested?.correct_answers ?? 0
  );
  const totalQuestions = Number(
    rec.totalQuestions ?? rec.total_questions ?? nested?.total_questions ?? questions.length
  );
  return {
    sessionId,
    scorePercentage,
    correctAnswers,
    totalQuestions,
    passed: Boolean(rec.passed ?? nested?.passed ?? scorePercentage >= 70),
    durationSeconds: Number(
      rec.durationSeconds ?? rec.duration_seconds ?? nested?.duration_seconds ?? 0
    ),
    assignmentId: rec.assignmentId
      ? String(rec.assignmentId)
      : rec.assignment_id
        ? String(rec.assignment_id)
        : null,
    questions,
    answers: answersRaw as SubmitExamResult['answers'],
  };
}

export interface SubmitExamPayload {
  userId: string;
  config: ExamConfig;
  questions: ExamQuestion[];
  answers: Record<string, number>;
  durationSeconds: number;
  attemptId?: string | null;
}

/**
 * Califica el examen en el servidor. Si el RPC aún no está aplicado, no inventa
 * una nota local: solo cae al insert cliente cuando las preguntas todavía traen
 * claves (banco local / staff).
 */
export async function submitExam(payload: SubmitExamPayload): Promise<SubmitExamResult | null> {
  const { userId, config, questions, answers, durationSeconds, attemptId } = payload;

  if (attemptId) {
    const { data, error } = await sb.rpc('submit_exam_session', {
      p_attempt_id: attemptId,
      p_answers: answers,
      p_duration_seconds: durationSeconds,
    });
    if (!error) {
      const parsed = parseSubmitExamResult(data);
      if (parsed) return parsed;
    } else if (!rpcLooksUnavailable(error)) {
      console.error('[examService] submit_exam_session failed:', error.message);
      return null;
    }
  }

  if (!questionsHaveAnswerKeys(questions)) {
    console.error('[examService] No se puede calificar en el cliente: el banco no trae claves');
    return null;
  }

  let correctCount = 0;
  const answerRecords: Omit<ExamAnswerRecord, 'id' | 'session_id'>[] = [];

  questions.forEach(q => {
    const selectedIdx = answers[q.id];
    const isAnswered = selectedIdx !== undefined;
    const isCorrect = isAnswered
      ? (q.options[selectedIdx]?.is_correct ?? false)
      : false;

    if (isCorrect) correctCount++;

    if (isAnswered) {
      answerRecords.push({
        question_id: q.id,
        topic_name: q.topic_name,
        module_id: q.module_id,
        is_critical: q.is_critical,
        difficulty: q.difficulty,
        selected_option_index: selectedIdx,
        is_correct: isCorrect,
        time_spent_seconds: 0,
      });
    }
  });

  const scorePercentage = questions.length > 0
    ? Math.round((correctCount / questions.length) * 100)
    : 0;

  try {
    const { data: sessionData, error: sessionError } = await sb
      .from('exam_sessions')
      .insert({
        user_id: userId,
        mode: config.mode,
        module_id: config.moduleId ?? null,
        selected_topics: config.topicNames ?? [],
        question_count_config: config.questionCount ?? null,
        feedback_mode: config.feedbackMode,
        time_limit_seconds: config.timeLimitSeconds ?? null,
        total_questions: questions.length,
        correct_answers: correctCount,
        score_percentage: scorePercentage,
        duration_seconds: durationSeconds,
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (sessionError) throw sessionError;
    const sessionId = sessionData.id as string;

    if (answerRecords.length > 0) {
      const withSession = answerRecords.map(a => ({ ...a, session_id: sessionId }));
      await sb.from('exam_answers').insert(withSession);
    }

    if (attemptId) {
      await finalizeExamAttempt(attemptId, 'COMPLETED');
    }

    return {
      sessionId,
      scorePercentage,
      correctAnswers: correctCount,
      totalQuestions: questions.length,
      passed: scorePercentage >= 70,
      durationSeconds,
      questions,
      answers: answerRecords.map(a => ({
        question_id: a.question_id,
        selected_option_index: a.selected_option_index,
        is_correct: a.is_correct,
        topic_name: a.topic_name,
        module_id: a.module_id,
        is_critical: a.is_critical,
      })),
    };
  } catch (err) {
    console.error('[examService] submitExam fallback failed:', err);
    return null;
  }
}

// ─── Carga de Resultados ──────────────────────────────────────────────────────

export interface ExamResultsData {
  session: ExamSession;
  answers: Array<ExamAnswerRecord & { question: ExamQuestion }>;
}

export async function loadExamResults(
  sessionId: string,
  allQuestions: ExamQuestion[] = []
): Promise<ExamResultsData | null> {
  try {
    const { data: review, error: reviewError } = await sb.rpc('get_exam_session_review', {
      p_session_id: sessionId,
    });
    if (!reviewError && review && typeof review === 'object') {
      const rec = review as Record<string, unknown>;
      const session = (rec.session ?? rec) as ExamSession;
      const revealed = asExamQuestionList(rec.questions);
      const questionsMap = new Map(revealed.map(q => [q.id, q]));
      allQuestions.forEach(q => {
        if (!questionsMap.has(q.id) && questionsHaveAnswerKeys([q])) {
          questionsMap.set(q.id, q);
        }
      });
      const rawAnswers = (Array.isArray(rec.answers) ? rec.answers : []) as ExamAnswerRecord[];
      return {
        session,
        answers: rawAnswers.map(a => ({
          ...a,
          question: questionsMap.get(a.question_id) ?? ({
            id: a.question_id,
            stem: 'Pregunta no disponible',
            options: [],
            topic_name: a.topic_name ?? 'Desconocido',
          } as unknown as ExamQuestion),
        })),
      };
    }
  } catch (err) {
    console.warn('[examService] get_exam_session_review failed:', err);
  }

  try {
    const [sessionRes, answersRes] = await Promise.all([
      sb.from('exam_sessions').select('*').eq('id', sessionId).single(),
      sb.from('exam_answers').select('*').eq('session_id', sessionId),
    ]);

    if (sessionRes.error) throw sessionRes.error;

    const session = sessionRes.data as ExamSession;
    const rawAnswers = (answersRes.data ?? []) as ExamAnswerRecord[];
    const questionsMap = new Map(allQuestions.map(q => [q.id, q]));

    const answers = rawAnswers.map(a => ({
      ...a,
      question: questionsMap.get(a.question_id) ?? ({
        id: a.question_id,
        stem: 'Pregunta no disponible',
        options: [],
        topic_name: a.topic_name ?? 'Desconocido',
      } as unknown as ExamQuestion),
    }));

    return { session, answers };
  } catch (err) {
    console.error('[examService] loadExamResults failed:', err);
    return null;
  }
}

// ─── Analítica de Brechas ─────────────────────────────────────────────────────

export async function loadGapAnalysis(userId: string): Promise<ExamGapAnalysis[]> {
  try {
    const { data, error } = await sb.rpc('get_exam_gap_analysis', { p_user_id: userId });
    if (error) throw error;
    return (data ?? []) as ExamGapAnalysis[];
  } catch {
    return [];
  }
}

/** Lista los temas disponibles con sus conteos (sin descargar el banco). */
export async function loadAvailableTopics(): Promise<Array<{
  topic_name: string;
  module_id: string;
  count: number;
  critical_count: number;
}>> {
  try {
    const { data, error } = await sb.rpc('get_exam_topic_stats');
    if (!error && Array.isArray(data) && data.length > 0) {
      return (data as Array<{ topic_name: string; module_id: string; count: number; critical_count: number }>).map(row => ({
        topic_name: row.topic_name,
        module_id: row.module_id,
        count: Number(row.count),
        critical_count: Number(row.critical_count),
      }));
    }
    if (error && !rpcLooksUnavailable(error)) throw error;
  } catch (err) {
    console.warn('[examService] get_exam_topic_stats failed:', err);
  }

  return Object.entries(QUESTIONS_BY_TOPIC).map(([topic_name, qs]) => ({
    topic_name,
    module_id: qs[0].module_id,
    count: qs.length,
    critical_count: qs.filter(q => q.is_critical).length,
  })).sort((a, b) => b.count - a.count);
}
