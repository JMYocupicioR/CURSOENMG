import { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  getAttemptCountForQuiz,
  getQuizWithQuestions,
  submitQuizAttempt,
} from '../../services/quizService';
import { markTopicCompleted } from '../../services/studentService';
import { recordQuizPassed } from '../../services/quizCompletionGate';
import { shuffleOptions, shuffleQuestions } from '../../utils/quizScoring';
import { localizeQuizQuestion } from '../../utils/quizLocalization';
import type { QuizAnswerRecord, QuizTopicFlag, QuizWithQuestions } from '../../types/quiz';
import { QuizResults } from './QuizResults';

interface QuizPlayerProps {
  topicId: string;
  moduleId: string;
  quizFlag: QuizTopicFlag;
  onPass?: () => void;
  nextTopicUrl?: string;
  returnToTopicUrl?: string;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function QuizPlayer({
  topicId,
  quizFlag: _quizFlag,
  onPass,
  nextTopicUrl,
  returnToTopicUrl,
}: QuizPlayerProps) {
  const { user } = useAuth();
  const lang = useSettingsStore((s) => s.language);

  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string[]>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [submitted, setSubmitted] = useState<{
    score: number;
    passed: boolean;
    answers: QuizAnswerRecord[];
    revealedQuestions?: QuizWithQuestions['questions'];
  } | null>(null);
  const [attemptBlocked, setAttemptBlocked] = useState<string | null>(null);

  // Timer interval
  useEffect(() => {
    if (submitted || loading) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, loading]);

  const loadQuizData = async () => {
    setLoading(true);
    setError(null);
    setResponses({});
    setStep(0);
    setElapsedSeconds(0);
    setSubmitted(null);

    try {
      const data = await getQuizWithQuestions(topicId);
      if (!data || !data.questions || data.questions.length === 0) {
        setError(
          lang === 'en'
            ? 'No questions available for this quiz.'
            : 'No hay preguntas disponibles para esta evaluación.'
        );
        setLoading(false);
        return;
      }

      const maxAllowed = data.max_attempts ?? 1;
      if (user) {
        const count = await getAttemptCountForQuiz(data.id, user.id);
        setAttemptsCount(count);
        if (count >= maxAllowed) {
          setAttemptBlocked(
            lang === 'en'
              ? `Maximum of ${maxAllowed} attempt(s) reached for this evaluation.`
              : `Has alcanzado el límite de ${maxAllowed} intento(s) permitido(s) para este tema.`
          );
        }
      }

      setQuiz(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el cuestionario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizData();
  }, [topicId, user, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [step]);

  const displayQuestions = useMemo(() => {
    if (!quiz) return [];
    const ordered = shuffleQuestions(quiz.questions, quiz.shuffle_questions);
    return ordered.map((q) =>
      localizeQuizQuestion(
        {
          ...q,
          options: shuffleOptions(q.options, quiz.shuffle_options),
        },
        lang
      )
    );
  }, [quiz, lang]);

  const current = displayQuestions[step];

  const selectOption = (questionId: string, optionId: string, multiple: boolean) => {
    setResponses((prev) => {
      const currentSelected = prev[questionId] ?? [];
      if (multiple) {
        const next = currentSelected.includes(optionId)
          ? currentSelected.filter((id) => id !== optionId)
          : [...currentSelected, optionId];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const handleSubmit = async () => {
    if (!quiz || !user || isSubmitting) return;

    const unanswered = displayQuestions.filter((q) => !(responses[q.id]?.length));
    if (unanswered.length > 0) {
      setError(
        lang === 'en'
          ? `Please answer all questions before submitting (${unanswered.length} remaining).`
          : `Por favor responde todas las preguntas antes de finalizar (${unanswered.length} pendiente(s)).`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const attempt = await submitQuizAttempt({
        topicId,
        durationSeconds: elapsedSeconds,
        answers: displayQuestions.map((q) => ({
          questionId: q.id,
          selectedIds: responses[q.id] ?? [],
        })),
      });

      // Si aprobó, acreditar inmediatamente el tema y disparar callback
      if (attempt.passed) {
        if (user) {
          recordQuizPassed(user.id, topicId);
          markTopicCompleted(user.id, topicId);
        }
        onPass?.();
      }

      setSubmitted({
        score: attempt.score,
        passed: attempt.passed,
        answers: attempt.answers,
        revealedQuestions: attempt.revealed_questions,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al calificar la evaluación');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="mt-10 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <p className="text-sm font-medium text-slate-500">
            {lang === 'en' ? 'Preparing evaluation...' : 'Preparando evaluación en Modo Examen…'}
          </p>
        </div>
      </section>
    );
  }

  if (attemptBlocked) {
    return (
      <section className="mt-10 p-6 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">
              Límite de intentos alcanzado
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300">{attemptBlocked}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!quiz || displayQuestions.length === 0) {
    return null;
  }

  if (submitted) {
    const effectiveMax = quiz.max_attempts ?? 1;
    const canRetry = (attemptsCount + 1) < effectiveMax;
    return (
      <QuizResults
        quiz={quiz}
        displayQuestions={submitted.revealedQuestions?.length ? submitted.revealedQuestions : displayQuestions}
        result={submitted}
        responses={responses}
        nextTopicUrl={nextTopicUrl}
        returnToTopicUrl={returnToTopicUrl}
        onRetry={loadQuizData}
        canRetry={canRetry}
        attemptCount={attemptsCount + 1}
        maxAttempts={effectiveMax}
      />
    );
  }

  const answeredCount = Object.keys(responses).filter((k) => responses[k]?.length > 0).length;
  const progressPct = ((step + 1) / displayQuestions.length) * 100;
  const isSelected = (optId: string) => (responses[current?.id]?.includes(optId));

  return (
    <section className="mt-10 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-sm transition-all">
      {/* ─── Barra Superior: Modo Examen & Temporizador ─────────────────── */}
      <div className="px-5 sm:px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-600 dark:text-cyan-400 block leading-none mb-1">
              Modo Examen · COMEFYR
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
              {quiz.title ?? (lang === 'en' ? 'Lesson Assessment' : 'Evaluación del Tema')}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Cronómetro */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Contador de preguntas */}
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
            {step + 1} / {displayQuestions.length}
          </span>
        </div>
      </div>

      {/* ─── Barra de Progreso ────────────────────────────────────────── */}
      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* ─── Contenido de la Pregunta ──────────────────────────────────── */}
      {current && (
        <div className="p-5 sm:p-7 space-y-6">
          {/* Metadatos de la pregunta */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/20">
                Reactivo #{step + 1}
              </span>
              {current.difficulty && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                  {current.difficulty === 'basic'
                    ? 'Básico'
                    : current.difficulty === 'advanced'
                    ? 'Avanzado'
                    : 'Intermedio'}
                </span>
              )}
            </div>

            <span className="text-[11px] text-slate-400">
              Acreditación mínima: {quiz.pass_score}%
            </span>
          </div>

          {/* Enunciado clínico */}
          <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
            {current.stem}
          </p>

          {/* Imagen clínica si existe */}
          {current.image_url && (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black/20 max-h-72 flex items-center justify-center">
              <img
                src={current.image_url}
                alt={current.image_alt ?? 'Imagen clínica'}
                className="max-h-72 object-contain"
              />
            </div>
          )}

          {/* Opciones interactivas con letras A, B, C, D */}
          <div
            className="space-y-2.5"
            role={current.type === 'multiple' ? 'group' : 'radiogroup'}
            aria-label={current.type === 'multiple' ? 'Seleccione todas las correctas' : 'Seleccione una opción'}
          >
            {current.options.map((opt, optIndex) => {
              const selected = isSelected(opt.id);
              const letter = OPTION_LETTERS[optIndex] ?? String(optIndex + 1);

              return (
                <button
                  key={opt.id}
                  type="button"
                  role={current.type === 'multiple' ? 'checkbox' : 'radio'}
                  aria-checked={selected}
                  onClick={() =>
                    selectOption(current.id, opt.id, current.type === 'multiple')
                  }
                  className={`w-full min-h-[44px] flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all active:scale-[0.99] touch-manipulation ${
                    selected
                      ? 'border-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/15 text-slate-900 dark:text-white shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span
                    className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-black mt-0.5 transition-colors ${
                      selected
                        ? 'border-cyan-500 bg-cyan-500 text-white shadow-sm'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="text-sm sm:text-base font-normal leading-relaxed flex-1">
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="mx-5 sm:mx-7 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Barra Inferior de Navegación ──────────────────────────────── */}
      <div className="px-5 sm:px-7 py-4 border-t border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{lang === 'en' ? 'Previous' : 'Anterior'}</span>
        </button>

        {/* Indicadores de preguntas (dots) */}
        <div className="flex items-center gap-1.5 max-w-[180px] overflow-x-auto py-1">
          {displayQuestions.map((q, qIdx) => {
            const hasAnswer = (responses[q.id]?.length ?? 0) > 0;
            const isCurrent = qIdx === step;

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setStep(qIdx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  isCurrent
                    ? 'w-6 bg-cyan-500 ring-2 ring-cyan-500/30'
                    : hasAnswer
                    ? 'bg-indigo-500 dark:bg-indigo-400'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
                title={`Ir a pregunta ${qIdx + 1}`}
              />
            );
          })}
        </div>

        {step < displayQuestions.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <span>{lang === 'en' ? 'Next' : 'Siguiente'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {isSubmitting
                ? 'Calificando…'
                : lang === 'en'
                ? 'Submit Examination'
                : `Finalizar Examen (${answeredCount}/${displayQuestions.length})`}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
