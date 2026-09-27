import { sb as supabase } from '../lib/supabase';
import { allModules } from '../content/modules';
import type {
  ModuleQuizProgress,
  QuizAttempt,
  QuizAnswerRecord,
  QuizOption,
  QuizQuestion,
  QuizTopicFlag,
  QuizWithQuestions,
} from '../types/quiz';

import {
  getAllLocalQuizFlags,
  getLocalQuizFlagForTopic,
} from './localQuizzesFallback';

function sanitizeOptions(options: unknown[]): QuizOption[] {
  return (options ?? []).map((raw) => {
    const opt = raw as QuizOption;
    return {
      id: opt.id,
      text: opt.text,
      textEn: opt.textEn,
    };
  });
}

function mapSanitizedQuestion(row: Record<string, unknown>): QuizQuestion {
  return {
    ...(row as unknown as QuizQuestion),
    options: sanitizeOptions((row.options as unknown[]) ?? []),
    explanation: null,
    explanation_en: null,
  };
}

function mapAttemptAnswers(raw: unknown): QuizAnswerRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const rec = item as Record<string, unknown>;
    return {
      questionId: String(rec.questionId ?? rec.question_id ?? ''),
      selectedIds: Array.isArray(rec.selectedIds) ? (rec.selectedIds as string[]) : [],
      correct: Boolean(rec.correct ?? rec.isCorrect),
      correctIds: Array.isArray(rec.correctIds) ? (rec.correctIds as string[]) : undefined,
    };
  });
}

export async function getQuizFlagForTopic(topicId: string): Promise<QuizTopicFlag | null> {
  try {
    const { data, error } = await supabase
      .from('quiz_topic_flags')
      .select('*')
      .eq('topic_id', topicId)
      .maybeSingle();
    if (!error && data && (data as QuizTopicFlag).question_count > 0) {
      return data as QuizTopicFlag;
    }
  } catch (e) {
    console.warn('[quizService] Error fetching quiz flag from DB:', e);
  }
  return getLocalQuizFlagForTopic(topicId);
}

export async function getAllQuizFlags(): Promise<QuizTopicFlag[]> {
  const local = getAllLocalQuizFlags().filter((f) => f.question_count > 0);
  try {
    const { data, error } = await supabase.from('quiz_topic_flags').select('*');
    if (!error && data && data.length > 0) {
      const merged = new Map(local.map((flag) => [flag.topic_id, flag]));
      for (const flag of data as QuizTopicFlag[]) {
        if (flag.question_count > 0) merged.set(flag.topic_id, flag);
      }
      return Array.from(merged.values());
    }
  } catch (e) {
    console.warn('[quizService] Error fetching all quiz flags from DB:', e);
  }
  return local;
}

export async function getQuizWithQuestions(topicId: string): Promise<QuizWithQuestions | null> {
  const { data, error } = await supabase.rpc('get_quiz_for_attempt', {
    p_topic_id: topicId,
  });

  if (error) {
    throw new Error(error.message || 'No fue posible cargar la evaluación en el servidor.');
  }

  if (!data || typeof data !== 'object') return null;
  const payload = data as QuizWithQuestions;
  return {
    ...payload,
    questions: (payload.questions ?? []).map((q) =>
      mapSanitizedQuestion(q as unknown as Record<string, unknown>)
    ),
  };
}

export interface QuizAttemptSubmitInput {
  topicId: string;
  durationSeconds: number;
  answers: { questionId: string; selectedIds: string[] }[];
}

export async function submitQuizAttempt(input: QuizAttemptSubmitInput): Promise<QuizAttempt> {
  const { data, error } = await supabase.rpc('submit_quiz_attempt', {
    p_topic_id: input.topicId,
    p_answers: input.answers,
    p_duration_seconds: input.durationSeconds,
  });

  if (error || !data) {
    throw new Error(
      error?.message ||
        'No fue posible calificar la evaluación. Verifica tu conexión e inténtalo de nuevo. El intento no se acreditó.'
    );
  }

  const payload = data as QuizAttempt & { revealed_questions?: QuizQuestion[] };
  return {
    ...payload,
    answers: mapAttemptAnswers(payload.answers),
    revealed_questions: payload.revealed_questions,
  };
}

export async function getMyAttempts(userId: string, limit = 100): Promise<QuizAttempt[]> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as QuizAttempt[]).map((attempt) => ({
    ...attempt,
    answers: mapAttemptAnswers(attempt.answers),
  }));
}

export async function getAttemptCountForQuiz(quizOrTopicId: string, userId: string): Promise<number> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quizOrTopicId);
  const query = supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count, error } = isUuid
    ? await query.eq('quiz_id', quizOrTopicId)
    : await query.eq('topic_id', quizOrTopicId);

  if (error) throw error;
  return count ?? 0;
}

export async function getBestAttempt(topicId: string, userId: string): Promise<QuizAttempt | null> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('topic_id', topicId)
    .eq('user_id', userId)
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const attempt = data as QuizAttempt;
  return { ...attempt, answers: mapAttemptAnswers(attempt.answers) };
}

export async function getMyProgressByModule(userId: string): Promise<ModuleQuizProgress[]> {
  const [{ data: flags, error: flagsError }, { data: attempts, error: attemptsError }] = await Promise.all([
    supabase.from('quiz_topic_flags').select('*'),
    supabase.from('quiz_attempts').select('*').eq('user_id', userId),
  ]);
  if (flagsError) throw flagsError;
  if (attemptsError) throw attemptsError;

  const quizFlags = ((flags ?? []) as QuizTopicFlag[]).filter(
    (flag) => (flag.clinical_validation_status ?? 'pending_review') === 'approved'
  );
  const userAttempts = (attempts ?? []) as QuizAttempt[];

  const bestByTopic = new Map<string, QuizAttempt>();
  for (const attempt of userAttempts) {
    const prev = bestByTopic.get(attempt.topic_id);
    if (!prev || attempt.score > prev.score) bestByTopic.set(attempt.topic_id, attempt);
  }

  const moduleIds = [...new Set(quizFlags.map((f) => f.module_id))];

  return moduleIds.map((moduleId) => {
    const mod = allModules.find((m) => m.id === moduleId);
    const moduleFlags = quizFlags.filter((f) => f.module_id === moduleId);
    const attempted = moduleFlags.filter((f) => bestByTopic.has(f.topic_id));
    const scores = attempted
      .map((f) => bestByTopic.get(f.topic_id)?.score)
      .filter((s): s is number => s != null);
    const averageScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    return {
      moduleId,
      moduleTitle: mod?.title ?? moduleId,
      quizzesAvailable: moduleFlags.length,
      quizzesAttempted: attempted.length,
      averageScore,
      bestScores: attempted.map((f) => {
        const best = bestByTopic.get(f.topic_id)!;
        return {
          topicId: f.topic_id,
          topicTitle: f.title ?? f.topic_id,
          score: best.score,
          passed: best.passed,
        };
      }),
    };
  });
}

export async function deleteQuizAttempt(attemptId: string, userId?: string): Promise<void> {
  if (userId) {
    try {
      const cacheKey = `quiz_attempts_${userId}`;
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const list = JSON.parse(raw) as QuizAttempt[];
        localStorage.setItem(cacheKey, JSON.stringify(list.filter((a) => a.id !== attemptId)));
      }
    } catch {}
  }

  // 1. Intentar eliminación directa
  const { error } = await supabase.from('quiz_attempts').delete().eq('id', attemptId);
  if (error) {
    console.warn('[quizService] deleteQuizAttempt direct delete failed, trying RPC fallback:', error.message);
    const { error: rpcError } = await (supabase.rpc as any)('admin_delete_quiz_attempt', {
      p_attempt_id: attemptId,
    });
    if (rpcError) throw rpcError;
  }
}

