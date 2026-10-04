import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Lightbulb,
  ChevronRight,
  BookOpen,
  Award,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import type { QuizAnswerRecord, QuizQuestion, QuizWithQuestions } from '../../types/quiz';

interface QuizResultsProps {
  quiz: QuizWithQuestions;
  displayQuestions: QuizQuestion[];
  result: { score: number; passed: boolean; answers: QuizAnswerRecord[] };
  responses: Record<string, string[]>;
  nextTopicUrl?: string;
  returnToTopicUrl?: string;
  onRetry?: () => void;
  canRetry?: boolean;
  attemptCount?: number;
  maxAttempts?: number;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function QuizResults({
  quiz,
  displayQuestions,
  result,
  responses,
  nextTopicUrl,
  returnToTopicUrl,
  onRetry,
  canRetry = true,
}: QuizResultsProps) {
  const lang = useSettingsStore((s) => s.language);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const totalQuestions = displayQuestions.length;
  const correctCount = result.answers.filter((a) => a.correct).length;

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xl overflow-hidden transition-all">
      {/* ─── Cabecera de Resultado ────────────────────────────────────────── */}
      <div
        className={`px-6 py-8 text-center border-b ${
          result.passed
            ? 'bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/20'
            : 'bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/20'
        }`}
      >
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border ${
            result.passed
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
          }`}
        >
          {result.passed ? (
            <>
              <Award className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Lesson Acredited' : 'Lección Acreditada'}
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Needs Review' : 'Requiere Repaso'}
            </>
          )}
        </div>

        {/* Círculo / Marcador de Puntaje */}
        <div className="relative w-28 h-28 mx-auto mb-3 flex items-center justify-center">
          <div
            className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center shadow-inner ${
              result.passed
                ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                : 'border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400'
            }`}
          >
            <span className="text-3xl font-black">{result.score}%</span>
            <span className="text-[10px] text-slate-400 font-medium">
              {correctCount} / {totalQuestions}
            </span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {result.passed
            ? lang === 'en'
              ? 'Congratulations! You passed the evaluation.'
              : '¡Felicidades! Evaluación aprobada'
            : lang === 'en'
            ? 'Score below threshold'
            : 'Puntaje insuficiente para acreditar'}
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {result.passed
            ? lang === 'en'
              ? 'This lesson has been marked as completed and added to your module progress.'
              : 'Esta lección ha sido marcada como completada automáticamente y sumada al progreso de tu módulo.'
            : !canRetry
            ? lang === 'en'
              ? `Minimum required: ${quiz.pass_score}%. You have reached the limit of allowed attempts for this topic. Contact your instructor for a retry.`
              : `Mínimo requerido: ${quiz.pass_score}%. Has completado el intento permitido para este tema. Para una nueva oportunidad de evaluación, solicita un reintento a tu profesor o administrador.`
            : lang === 'en'
            ? `Minimum required: ${quiz.pass_score}%. Review the clinical pearls below and try again.`
            : `Mínimo requerido: ${quiz.pass_score}%. Revisa las perlas clínicas y explicaciones a continuación para volver a intentarlo.`}
        </p>

        {/* Acciones principales */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {result.passed && nextTopicUrl && (
            <Link
              to={nextTopicUrl}
              onClick={() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                if (document.documentElement) document.documentElement.scrollTop = 0;
                if (document.body) document.body.scrollTop = 0;
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <span>{lang === 'en' ? 'Continue to Next Topic' : 'Continuar al siguiente tema'}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}

          {returnToTopicUrl && (
            <Link
              to={returnToTopicUrl}
              onClick={() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                if (document.documentElement) document.documentElement.scrollTop = 0;
                if (document.body) document.body.scrollTop = 0;
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all active:scale-95"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>{lang === 'en' ? 'Back to Lesson' : 'Volver al texto del tema'}</span>
            </Link>
          )}

          {!result.passed && canRetry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{lang === 'en' ? 'Retry Evaluation' : 'Reintentar evaluación'}</span>
            </button>
          )}

          {!result.passed && !canRetry && nextTopicUrl && (
            <Link
              to={nextTopicUrl}
              onClick={() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                if (document.documentElement) document.documentElement.scrollTop = 0;
                if (document.body) document.body.scrollTop = 0;
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold transition-all active:scale-95"
            >
              <span>{lang === 'en' ? 'Next Topic' : 'Continuar al siguiente tema'}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* ─── Revisión Detallada con Perlas Clínicas ────────────────────────── */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
          <BookOpen className="w-4 h-4 text-cyan-500" />
          <span>{lang === 'en' ? 'Clinical Answers Review' : 'Revisión y Perlas Clínicas'}</span>
        </div>

        <div className="space-y-3">
          {displayQuestions.map((q, idx) => {
            const answer = result.answers.find((a) => a.questionId === q.id);
            const isCorrect = answer?.correct ?? false;
            const selectedOptIds = responses[q.id] ?? [];
            const isExpanded = expandedQuestion === q.id;

            return (
              <div
                key={q.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                  className="w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
                >
                  <div
                    className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 text-xs font-bold ${
                      isCorrect
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : 'bg-red-500/20 text-red-500'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-400 font-medium mb-1">
                      {lang === 'en' ? 'Question' : 'Pregunta'} {idx + 1}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                      {q.stem}
                    </p>
                  </div>

                  <div className="shrink-0 text-slate-400 mt-1">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3">
                    {/* Opciones */}
                    <div className="space-y-1.5">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = selectedOptIds.includes(opt.id);
                        const isOptCorrect =
                          opt.isCorrect === true ||
                          Boolean(answer?.correctIds?.includes(opt.id));

                        return (
                          <div
                            key={opt.id}
                            className={`flex items-start gap-3 p-3 rounded-lg text-xs font-medium border ${
                              isOptCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                                : isSelected && !isOptCorrect
                                ? 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
                                : 'bg-white/40 dark:bg-slate-800/40 border-transparent text-slate-500'
                            }`}
                          >
                            <span className="shrink-0 font-bold w-5 h-5 rounded-md border flex items-center justify-center text-[10px]">
                              {OPTION_LETTERS[oIdx] ?? oIdx + 1}
                            </span>
                            <span className="flex-1 leading-relaxed">{opt.text}</span>
                            {isOptCorrect && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                ✓ Correcta
                              </span>
                            )}
                            {isSelected && !isOptCorrect && (
                              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 shrink-0">
                                ✗ Tu respuesta
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explicación / Perla clínica */}
                    {q.explanation && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide block mb-0.5">
                            Perla Clínica Oficial
                          </span>
                          <p className="text-slate-700 dark:text-amber-200/90 leading-relaxed">
                            {q.explanation}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
