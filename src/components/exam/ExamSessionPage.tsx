import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import { useGoBack } from '../../hooks/useGoBack';
import { Loader2, Clock, Send, LayoutGrid, X, Brain, ChevronLeft, ShieldAlert } from 'lucide-react';
import type { ExamConfig, ExamAttemptRecord, ExamQuestion } from '../../types/exam';
import {
  clearExamAttemptCaches,
  loadExamQuestions,
  prepareExamQuestions,
  restoreExamQuestions,
  submitExam,
  loadExamAttempt,
  withRandomOptionOrder,
  shuffleArray,
} from '../../services/examService';
import type { ExamOptionOrder } from '../../utils/examQuestionOrder';
import { stripExamAnswerKeys } from '../../utils/examIntegrity';
import {
  getActiveExamLock,
  completeAssignedExam,
} from '../../services/studentPlanService';
import { useExamRunner } from '../../hooks/useExamRunner';
import { ExamQuestionCard } from './ExamQuestionCard';
import { ExamPaletteNav } from './ExamPaletteNav';
import { setExamSessionLock } from '../../utils/pwaUpdate';

type LocationState = {
  config?: ExamConfig;
  resumeAttemptId?: string;
  assignmentId?: string;
  strictLock?: boolean;
  expiresAt?: string;
  startedAt?: string;
  selectedQuestionIds?: string[];
  assignmentTitle?: string;
};

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type PreparedExam = { questions: ExamQuestion[]; optionOrder: ExamOptionOrder };

/** Caché local del examen preparado: conserva orden de preguntas y de opciones tras una recarga */
function readQuestionCache(key: string): PreparedExam | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Formato v2: { questions, optionOrder }
    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return {
        questions: parsed.questions.map(stripExamAnswerKeys),
        optionOrder: parsed.optionOrder ?? {},
      };
    }
    // Formato legado: arreglo de preguntas sin permutación registrada
    if (Array.isArray(parsed) && parsed.length > 0) {
      return { questions: parsed.map(stripExamAnswerKeys), optionOrder: {} };
    }
    return null;
  } catch {
    return null;
  }
}

function writeQuestionCache(key: string, prepared: PreparedExam): void {
  try {
    localStorage.setItem(key, JSON.stringify(prepared));
  } catch {}
}

export default function ExamSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useGoBack('/examenes');
  const { user } = useAuth();
  const state = location.state as LocationState | null;

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [optionOrder, setOptionOrder] = useState<ExamOptionOrder>({});
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [resumeAttempt, setResumeAttempt] = useState<ExamAttemptRecord | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Estados de Asignación y Candado Estricto
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(state?.assignmentId || null);
  const [isStrictLock, setIsStrictLock] = useState<boolean>(state?.strictLock ?? false);
  const [expiresAt, setExpiresAt] = useState<string | null>(state?.expiresAt || null);
  const [assignmentTitle, setAssignmentTitle] = useState<string>(state?.assignmentTitle || 'Examen Asignado');

  useEffect(() => {
    setExamSessionLock(true);
    return () => setExamSessionLock(false);
  }, []);

  // Cargar preguntas al montar
  useEffect(() => {
    async function init() {
      setLoading(true);

      // Recuperar candado guardado si el usuario recargó o volvió
      const savedLock = user ? getActiveExamLock(user.id) : null;
      const targetAssignmentId = state?.assignmentId || savedLock?.assignmentId || null;
      const targetExpiresAt = state?.expiresAt || savedLock?.expiresAt || null;
      const targetStrictLock = state?.strictLock !== undefined ? state.strictLock : Boolean(savedLock);
      const targetQuestionIds = state?.selectedQuestionIds || savedLock?.selectedQuestionIds;

      if (targetAssignmentId) setActiveAssignmentId(targetAssignmentId);
      if (targetExpiresAt) setExpiresAt(targetExpiresAt);
      if (targetStrictLock) setIsStrictLock(true);
      if (savedLock?.assignmentTitle) setAssignmentTitle(savedLock.assignmentTitle);

      // Caso 1: reanudar examen existente
      if (state?.resumeAttemptId) {
        const attempt = await loadExamAttempt(state.resumeAttemptId);
        if (attempt && attempt.status === 'IN_PROGRESS') {
          setResumeAttempt(attempt);
          const { questions: allQs } = await loadExamQuestions(attempt.config);

          // Reconstruye el orden exacto de preguntas Y de opciones con el que se
          // respondió: `answers` guarda índices de opción, así que sin la
          // permutación original la reanudación calificaría otra opción.
          setQuestions(
            restoreExamQuestions(attempt.question_ids, allQs, attempt.option_order).map(stripExamAnswerKeys)
          );
          setOptionOrder(attempt.option_order ?? {});
          setConfig(attempt.config);

          // El cronómetro de una evaluación asignada vive en el intento, no solo
          // en localStorage: sobrevive a un cambio de dispositivo.
          if (attempt.expires_at) setExpiresAt(attempt.expires_at);
          if (attempt.assignment_id) {
            setActiveAssignmentId(attempt.assignment_id);
            setIsStrictLock(true);
          }

          setLoading(false);
          return;
        }
      }

      // Caso 2: examen asignado o nuevo examen
      const cfgRaw = state?.config || (savedLock?.config as ExamConfig | undefined);
      const cfg =
        cfgRaw && typeof cfgRaw === 'object' && (cfgRaw.mode || cfgRaw.moduleId || cfgRaw.topicNames?.length)
          ? cfgRaw
          : savedLock
            ? {
                mode: 'TOPIC_SPECIFIC' as const,
                moduleId: savedLock.moduleId,
                questionCount: savedLock.selectedQuestionIds?.length || 10,
                timeLimitSeconds: savedLock.timeLimitMinutes * 60,
                feedbackMode: 'end' as const,
              }
            : null;
      if (!cfg) {
        navigate('/examenes', { replace: true });
        return;
      }
      setConfig(cfg);

      // Cache de preguntas preparadas (mantiene el orden de preguntas y opciones si hay recarga)
      const sessionCacheKey = targetAssignmentId
        ? `neurosafe_exam_qs_asg_${targetAssignmentId}`
        : state?.resumeAttemptId
        ? `neurosafe_exam_qs_att_${state.resumeAttemptId}`
        : null;

      const targetCustomQuestions = (state as any)?.customQuestions || (savedLock as any)?.customQuestions;

      if (sessionCacheKey) {
        const cached = readQuestionCache(sessionCacheKey);
        if (cached) {
          setQuestions(cached.questions);
          setOptionOrder(cached.optionOrder);
          setLoading(false);
          return;
        }
      }

      let allQs: ExamQuestion[] = [];
      if (targetCustomQuestions && Array.isArray(targetCustomQuestions) && targetCustomQuestions.length > 0) {
        allQs = targetCustomQuestions;
      } else {
        const { questions: fetchedQs } = await loadExamQuestions({
          topicNames: cfg.topicNames,
          moduleId: cfg.moduleId,
        });
        allQs = fetchedQs;
      }

      let prepared: { questions: ExamQuestion[]; optionOrder: ExamOptionOrder };

      // Si el profesor seleccionó preguntas específicas o cargó personalizadas
      if (targetCustomQuestions && targetCustomQuestions.length > 0) {
        prepared = withRandomOptionOrder(allQs);
      } else if (targetQuestionIds && targetQuestionIds.length > 0) {
        const qMap = new Map(allQs.map(q => [q.id, q]));
        const exact = targetQuestionIds.map(id => qMap.get(id)).filter(Boolean) as ExamQuestion[];
        const base = exact.length > 0 ? exact : allQs;
        prepared = withRandomOptionOrder(shuffleArray(base));
      } else {
        prepared = prepareExamQuestions(allQs, cfg);
      }

      if (sessionCacheKey && prepared.questions.length > 0) {
        writeQuestionCache(sessionCacheKey, prepared);
      }

      setQuestions(prepared.questions);
      setOptionOrder(prepared.optionOrder);
      setLoading(false);
    }
    init();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Advertencia de navegador ante intento de cierre/recarga si es estricto
  useEffect(() => {
    if (!isStrictLock) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'La evaluación asignada está en curso. El cronómetro continuará corriendo en tiempo real incluso si sales.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isStrictLock]);

  // Estado inicial para reanudación
  const initialState = resumeAttempt ? {
    currentQuestionIndex: resumeAttempt.current_question_index,
    answers: resumeAttempt.answers ?? {},
    flagged: resumeAttempt.flagged ?? {},
    timeRemainingSeconds: resumeAttempt.time_remaining_seconds ?? null,
  } : undefined;

  const handleSubmit = useCallback(async (
    answers: Record<string, number>,
    durationSeconds: number,
    attemptId: string | null
  ) => {
    if (!user || !config) return false;
    setSubmitting(true);
    setSubmitError(null);

    const result = await submitExam({
      userId: user.id,
      config,
      questions,
      answers,
      durationSeconds,
      attemptId,
    });

    if (!result) {
      setSubmitting(false);
      setSubmitError('No se pudo calificar el examen en el servidor. Revisa tu conexión e inténtalo de nuevo; tu progreso sigue guardado.');
      return false;
    }

    // El RPC ya asienta la asignación. Si vino de fallback local, reintentamos
    // sin mandar una nota calculada en el cliente cuando hay sessionId.
    if (activeAssignmentId && user.id) {
      try {
        await completeAssignedExam(
          activeAssignmentId,
          user.id,
          result.scorePercentage,
          result.durationSeconds,
          result.sessionId
        );
      } catch (err) {
        console.error('[ExamSessionPage] No se pudo asentar el examen asignado:', err);
      }
    }

    clearExamAttemptCaches(attemptId, activeAssignmentId);

    setSubmitting(false);
    navigate('/examenes/resultados', {
      state: {
        sessionId: result.sessionId,
        questions: result.questions.length > 0 ? result.questions : questions,
        config,
        answers,
        durationSeconds: result.durationSeconds,
        assignmentId: activeAssignmentId,
        serverScore: {
          scorePercentage: result.scorePercentage,
          correctAnswers: result.correctAnswers,
          totalQuestions: result.totalQuestions,
          passed: result.passed,
        },
      },
      replace: true,
    });
    return true;
  }, [user, config, questions, navigate, activeAssignmentId]);

  const runner = useExamRunner({
    questions,
    config: config ?? { mode: 'FULL_SIMULATION', feedbackMode: 'immediate' },
    resumeAttemptId: resumeAttempt?.id ?? null,
    initialState,
    expiresAt,
    assignmentId: activeAssignmentId,
    optionOrder,
    onSubmit: handleSubmit,
  });

  // Deja el intento en la URL: si el alumno recarga, la sesión se reanuda con las
  // respuestas y el orden originales en lugar de empezar un examen nuevo.
  useEffect(() => {
    if (!runner.attemptId || state?.resumeAttemptId === runner.attemptId) return;
    navigate(location.pathname, {
      replace: true,
      state: { ...(state ?? {}), resumeAttemptId: runner.attemptId },
    });
  }, [runner.attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { currentIndex, currentQuestion, answers, flagged, reveals, timeLeft, isSubmitting } = runner;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [currentIndex]);

  const unansweredCount = questions.length - Object.keys(answers).length;
  const isImmediateFeedback = config?.feedbackMode === 'immediate';

  // Timer color
  const timerColor = timeLeft !== null
    ? timeLeft < 60 ? 'text-red-400' : timeLeft < 300 ? 'text-amber-400' : 'text-cyan-400'
    : 'text-slate-400';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
          <p className="text-slate-300 text-sm">Preparando el examen…</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6">
        <div className="max-w-md text-center space-y-3">
          <p className="text-white font-semibold">No hay reactivos para este examen</p>
          <p className="text-slate-400 text-sm">
            El banco de preguntas no devolvió ítems para el módulo o temas asignados. Avisa a tu profesor o intenta de nuevo.
          </p>
          <button
            type="button"
            onClick={() => navigate('/portal')}
            className="mt-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm"
          >
            Volver al portal
          </button>
        </div>
      </div>
    );
  }

  if (submitting || isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center shadow-xl shadow-cyan-500/30 animate-pulse">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <p className="text-white font-semibold">Procesando resultados…</p>
          <p className="text-slate-400 text-sm">Guardando tu examen en Supabase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Barra superior */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 h-14 flex items-center px-4 gap-3">
        <button
          onClick={async () => {
            if (isStrictLock) {
              setShowExitWarning(true);
              return;
            }
            // Si no contestó nada, se cierra el intento para no dejar un examen
            // fantasma que dispare el modal de recuperación en cada visita.
            // Con respuestas ya dadas se conserva IN_PROGRESS para poder reanudar.
            if (Object.keys(runner.answers).length === 0) {
              await runner.abandonExam();
            }
            goBack('/examenes');
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          title={isStrictLock ? 'Salir de la evaluación' : 'Volver'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          {isStrictLock ? (
            <>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                <ShieldAlert className="w-3 h-3" /> Cronometrado
              </span>
              <span className="text-xs text-slate-400 truncate hidden sm:block">{assignmentTitle}</span>
            </>
          ) : (
            <span className="text-xs text-slate-500 hidden sm:block">
              {config?.feedbackMode === 'immediate' ? '🎓 Modo Tutor' : '📋 Modo Examen'} ·
            </span>
          )}
          <span className="text-sm font-medium text-slate-300 truncate">
            Pregunta {currentIndex + 1} de {questions.length}
          </span>
        </div>

        {/* Temporizador */}
        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 text-sm font-mono font-bold ${timerColor} bg-white/5 px-3 py-1.5 rounded-lg border border-white/10`}>
            <Clock className="w-3.5 h-3.5" />
            {formatTime(timeLeft)}
          </div>
        )}

        <button
          onClick={() => setShowPalette(!showPalette)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Ir a pregunta</span>
        </button>

        <button
          onClick={() => setShowConfirmSubmit(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-cyan-500/20 transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          Enviar
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="fixed top-14 left-0 right-0 z-20 h-1 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Layout principal */}
      <div className="pt-20 pb-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-6">
            {/* Contenido principal */}
            <div className="flex-1 min-w-0">
              {submitError && (
                <p role="alert" className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {submitError}
                </p>
              )}
              {currentQuestion && (
                <ExamQuestionCard
                  question={currentQuestion}
                  selectedOptionIndex={answers[currentQuestion.id]}
                  isFlagged={!!flagged[currentQuestion.id]}
                  feedbackMode={config?.feedbackMode ?? 'immediate'}
                  showFeedback={isImmediateFeedback && answers[currentQuestion.id] !== undefined}
                  questionNumber={currentIndex + 1}
                  total={questions.length}
                  onSelectOption={idx => runner.selectAnswer(currentQuestion.id, idx)}
                  onToggleFlag={() => runner.toggleFlag(currentQuestion.id)}
                  onNext={runner.goNext}
                  onPrev={runner.goPrev}
                  isFirst={currentIndex === 0}
                  isLast={currentIndex === questions.length - 1}
                  reveal={reveals[currentQuestion.id] ?? null}
                />
              )}

              {/* Botón de envío final en última pregunta */}
              {currentIndex === questions.length - 1 && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setShowConfirmSubmit(true)}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold shadow-xl shadow-cyan-500/20 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    Finalizar examen
                  </button>
                </div>
              )}
            </div>

            {/* Paleta lateral (desktop) */}
            <div className="hidden lg:block w-52 shrink-0">
              <div className="sticky top-24">
                <ExamPaletteNav
                  questions={questions}
                  currentIndex={currentIndex}
                  answers={answers}
                  flagged={flagged}
                  reveals={reveals}
                  showResult={isImmediateFeedback}
                  onGoTo={runner.goToQuestion}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paleta flotante (mobile) */}
      {showPalette && (
        <div className="fixed inset-0 z-40 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm lg:hidden">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-white">Ir a pregunta</span>
              <button onClick={() => setShowPalette(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ExamPaletteNav
              questions={questions}
              currentIndex={currentIndex}
              answers={answers}
              flagged={flagged}
              reveals={reveals}
              showResult={isImmediateFeedback}
              onGoTo={i => { runner.goToQuestion(i); setShowPalette(false); }}
            />
          </div>
        </div>
      )}

      {/* Modal de confirmación de envío */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center">
              <Send className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">¿Finalizar el examen?</h3>
            {unansweredCount > 0 ? (
              <p className="text-amber-400 text-sm mb-6">
                Tienes {unansweredCount} pregunta{unansweredCount !== 1 ? 's' : ''} sin responder.
              </p>
            ) : (
              <p className="text-slate-400 text-sm mb-6">Has respondido todas las preguntas.</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-all"
              >
                Continuar
              </button>
              <button
                onClick={() => { setShowConfirmSubmit(false); runner.submitExam(); }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-400 transition-all"
              >
                Enviar examen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Advertencia de Salida (Modo Estricto) */}
      {showExitWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Clock className="w-7 h-7 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white">
              ¿Deseas salir de la evaluación asignada?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta es una <strong>evaluación oficial obligatoria con tiempo continuo</strong>.
              <br /><br />
              <strong className="text-amber-400">El cronómetro seguirá corriendo en tiempo real</strong> incluso si cierras esta pestaña o sales de la plataforma.
              <br /><br />
              Al llegar a cero, el examen se enviará automáticamente con las respuestas guardadas hasta este momento.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitWarning(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                Permanecer en el Examen
              </button>
              <button
                type="button"
                onClick={() => navigate('/mi-progreso')}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-semibold text-xs border border-white/10 transition cursor-pointer"
              >
                Salir (El tiempo no se pausa)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
