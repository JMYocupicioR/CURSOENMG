import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Home,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  RotateCcw,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { useSettingsStore } from '../../stores/settingsStore';
import { useMergedModule } from '../../hooks/useMergedModule';
import { useTopicProgress } from '../../hooks/useTopicProgress';
import { getAllFlatTopics } from '../../services/contentMerge';
import {
  getQuizFlagForTopic,
  getQuizWithQuestions,
  getAttemptCountForQuiz,
  getBestAttempt,
} from '../../services/quizService';
import { recordQuizPassed } from '../../services/quizCompletionGate';
import { markTopicCompleted } from '../../services/studentService';
import { QuizPlayer } from '../quiz/QuizPlayer';
import { CourseGate } from '../CourseGate';
import type { QuizTopicFlag, QuizWithQuestions, QuizAttempt } from '../../types/quiz';

export default function TopicQuizPage() {
  const { moduleId, topicId } = useParams<{ moduleId: string; topicId: string }>();
  const navigate = useNavigate();
  const lang = useSettingsStore((s) => s.language);
  const { user } = useAuth();
  const homeHref = user ? '/portal' : '/';
  const homeLabel = lang === 'en' ? 'Home' : user ? 'Portal' : 'Inicio';

  const { module: mod, loading: moduleLoading } = useMergedModule(moduleId);
  const { isCompleted: isTopicDoneHook } = useTopicProgress();

  const [quizFlag, setQuizFlag] = useState<QuizTopicFlag | null>(null);
  const [quizData, setQuizData] = useState<QuizWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [bestAttempt, setBestAttempt] = useState<QuizAttempt | null>(null);

  // Flatten topics to find the current topic and surrounding topics
  const allFlat = useMemo(() => (mod ? getAllFlatTopics(mod.topics) : []), [mod]);
  const currentFlatIndex = allFlat.findIndex((f) => f.topic.id === topicId);
  const currentFlat = currentFlatIndex >= 0 ? allFlat[currentFlatIndex] : null;
  const topic = currentFlat?.topic ?? null;
  const topicPath = currentFlat?.path ?? [topicId || ''];
  const topicReadingUrl = `/modulo/${moduleId}/${topicPath.join('/')}`;

  const nextFlat = currentFlatIndex >= 0 && currentFlatIndex < allFlat.length - 1
    ? allFlat[currentFlatIndex + 1]
    : null;
  const nextTopicUrl = nextFlat
    ? `/modulo/${mod?.id ?? moduleId}/${nextFlat.path.join('/')}`
    : `/modulo/${mod?.id ?? moduleId}`;


  const loadQuizInfo = useCallback(async () => {
    if (!topicId) return;
    setLoading(true);
    setError(null);

    try {
      const flag = await getQuizFlagForTopic(topicId);
      const isApproved =
        flag &&
        flag.question_count > 0 &&
        (flag.clinical_validation_status ?? 'approved') === 'approved';

      if (!isApproved) {
        setQuizFlag(null);
        setQuizData(null);
        setLoading(false);
        return;
      }

      setQuizFlag(flag);

      const [publishedQuiz, attemptsCount, best] = await Promise.all([
        getQuizWithQuestions(topicId),
        user ? getAttemptCountForQuiz(flag.topic_id, user.id).catch(() => 0) : 0,
        user ? getBestAttempt(topicId, user.id).catch(() => null) : null,
      ]);

      setQuizData(publishedQuiz);
      setAttemptCount(attemptsCount);
      setBestAttempt(best);
    } catch (e) {
      console.error('[TopicQuizPage] Error loading quiz:', e);
      setError(e instanceof Error ? e.message : 'Error al cargar la evaluación');
    } finally {
      setLoading(false);
    }
  }, [topicId, user]);

  useEffect(() => {
    loadQuizInfo();
  }, [loadQuizInfo]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

  const handlePass = useCallback(() => {
    if (user && topicId) {
      recordQuizPassed(user.id, topicId);
      markTopicCompleted(user.id, topicId);
    }
    loadQuizInfo();
  }, [user, topicId, loadQuizInfo]);

  const handleDirectComplete = useCallback(() => {
    if (user && topic) {
      markTopicCompleted(user.id, topic.id);
    }
    navigate(nextTopicUrl);
  }, [user, topic, navigate, nextTopicUrl]);

  if (moduleLoading || loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center pt-24 px-4 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {lang === 'en' ? 'Loading assessment…' : 'Cargando evaluación del tema…'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-20 text-center">
        <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-slate-800/60 border border-rose-200/80 dark:border-rose-900/50 shadow-lg">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {lang === 'en' ? 'Unable to load evaluation' : 'No fue posible cargar la evaluación'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            {error}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={loadQuizInfo}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Retry' : 'Reintentar'}
            </button>
            <Link
              to={topicReadingUrl}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold transition-all"
            >
              {lang === 'en' ? 'Return to lesson' : 'Volver a la lección'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!mod || !topic) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-28 pb-20 text-center">
        <p className="text-slate-600 dark:text-slate-300 font-medium mb-4">
          {lang === 'en' ? 'Topic not found.' : 'Tema no encontrado.'}
        </p>
        <Link
          to={`/modulo/${moduleId}`}
          className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'en' ? 'Back to module' : 'Volver al módulo'}
        </Link>
      </div>
    );
  }

  // If there is no approved quiz for this topic, students don't need a quiz
  if (!quizFlag || !quizData) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-20 text-center">
        <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 shadow-lg">
          <BookOpen className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {lang === 'en' ? 'No assessment required' : 'Lectura sin examen obligatorio'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            {lang === 'en'
              ? 'This topic does not require a formal evaluation at this time. You can complete it directly and continue.'
              : 'Este tema no requiere un cuestionario formal en este momento. Puedes marcarlo como completado directamente y continuar.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {user && (
              <button
                type="button"
                onClick={handleDirectComplete}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'en' ? 'Mark completed and continue' : 'Marcar tema como leído y continuar'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <Link
              to={topicReadingUrl}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold transition-all"
            >
              {lang === 'en' ? 'Return to lesson' : 'Volver a la lección'}
            </Link>
            {nextFlat && (
              <Link
                to={nextTopicUrl}
                className="px-5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all"
              >
                {lang === 'en' ? 'Next lesson' : 'Siguiente lección'}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const effectiveMaxAttempts = quizData.max_attempts ?? 1;
  const isAlreadyPassed = Boolean(bestAttempt?.passed || isTopicDoneHook(topic.id));
  const hasExhaustedAttempts = attemptCount >= effectiveMaxAttempts;
  const canAttempt = !hasExhaustedAttempts || (!isAlreadyPassed && effectiveMaxAttempts > attemptCount);

  const modTitle = (lang === 'en' && mod.titleEn) || mod.title;
  const topicTitle = (lang === 'en' && topic.titleEn) || topic.title;

  return (
    <CourseGate moduleId={moduleId!} topicId={topic.id}>
      <main id="contenido-principal" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-24">
        {/* ── Breadcrumbs ── */}
        <nav className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
          <Link to={homeHref} className="hover:text-blue-500 transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /> {homeLabel}
          </Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <Link to={`/modulo/${mod.id}`} className="hover:text-blue-500 transition-colors truncate max-w-[140px] sm:max-w-none">
            {mod.emoji} {modTitle}
          </Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <Link to={topicReadingUrl} className="hover:text-blue-500 transition-colors truncate max-w-[160px] sm:max-w-none">
            {topicTitle}
          </Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <span className="text-slate-800 dark:text-white font-medium">
            {lang === 'en' ? 'Assessment' : 'Evaluación'}
          </span>
        </nav>

        {/* ── Header Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 sm:p-7 rounded-3xl bg-white/80 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 shadow-lg shadow-slate-200/30 dark:shadow-black/20"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
              <ClipboardList className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Clinical Topic Quiz' : 'Evaluación de Acreditación'}</span>
            </div>

            <Link
              to={topicReadingUrl}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Review topic lesson' : 'Volver a leer el tema'}</span>
            </Link>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-2">
            {quizData.title || `Evaluación: ${topicTitle}`}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            {lang === 'en'
              ? `Mastery check for "${topicTitle}". Pass this quiz with at least ${quizData.pass_score}% to credit this lesson toward your diploma.`
              : `Comprueba tu dominio de "${topicTitle}". Aprueba esta evaluación con mínimo ${quizData.pass_score}% para acreditar el tema en tu expediente académico.`}
          </p>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
            <span>
              <strong>{lang === 'en' ? 'Questions:' : 'Reactivos:'}</strong> {quizData.questions.length}
            </span>
            <span>•</span>
            <span>
              <strong>{lang === 'en' ? 'Min score:' : 'Puntaje mínimo:'}</strong> {quizData.pass_score}%
            </span>
            <span>•</span>
            <span>
              <strong>{lang === 'en' ? 'Allowed attempts:' : 'Intentos permitidos:'}</strong>{' '}
              {effectiveMaxAttempts === 1 ? '1 único intento' : `${effectiveMaxAttempts} intentos`}
            </span>
            {user && (
              <>
                <span>•</span>
                <span className={attemptCount >= effectiveMaxAttempts ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                  <strong>{lang === 'en' ? 'Attempts used:' : 'Intentos realizados:'}</strong> {attemptCount} / {effectiveMaxAttempts}
                </span>
              </>
            )}
          </div>
        </motion.div>

        {/* ── State 1: Already Passed ── */}
        {isAlreadyPassed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/50 shadow-md"
          >
            <div className="flex items-start gap-3.5">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                  {lang === 'en' ? 'Topic already completed and passed' : 'Evaluación acreditada con éxito'}
                </h2>
                <p className="text-xs sm:text-sm text-emerald-800/90 dark:text-emerald-300 leading-relaxed mb-4">
                  {lang === 'en'
                    ? `You have successfully passed this chapter evaluation${bestAttempt?.score != null ? ` with a score of ${bestAttempt.score}%` : ''}. Your progress is saved.`
                    : `Has acreditado satisfactoriamente este tema${bestAttempt?.score != null ? ` con una calificación de ${bestAttempt.score}%` : ''}. Tu avance cuenta para tu constancia y créditos CME.`}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={nextTopicUrl}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all"
                  >
                    <span>{lang === 'en' ? 'Continue to next topic' : 'Continuar al siguiente tema'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to={topicReadingUrl}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                    <span>{lang === 'en' ? 'Re-read topic' : 'Volver a leer el tema'}</span>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── State 2: Failed and Attempt Limit Reached ── */}
        {!isAlreadyPassed && hasExhaustedAttempts && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 sm:p-7 rounded-3xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 shadow-md"
          >
            <div className="flex items-start gap-3.5">
              <ShieldAlert className="w-7 h-7 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-1">
                  {lang === 'en' ? 'Attempt limit reached' : 'Límite de intentos completado'}
                </h2>
                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 leading-relaxed mb-4">
                  {lang === 'en'
                    ? `You have completed your allowed attempt(s) for this topic (${attemptCount} of ${effectiveMaxAttempts})${bestAttempt?.score != null ? ` with a score of ${bestAttempt.score}% (minimum required: ${quizData.pass_score}%)` : ''}. If you need an additional opportunity to pass this evaluation, please contact your instructor or course administrator.`
                    : `Has completado el límite de intentos permitidos para este tema (${attemptCount} de ${effectiveMaxAttempts})${bestAttempt?.score != null ? ` con calificación de ${bestAttempt.score}% (mínimo aprobatorio: ${quizData.pass_score}%)` : ''}. Si requieres una nueva oportunidad de evaluación, solicita a tu profesor o administrador académico un reintento.`}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={topicReadingUrl}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/25 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Review lesson content' : 'Volver a estudiar el tema'}</span>
                  </Link>

                  <Link
                    to={`/modulo/${mod.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                    <span>{lang === 'en' ? 'Back to module index' : 'Volver al índice del módulo'}</span>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── State 3: Active Quiz Player ── */}
        {canAttempt && !isAlreadyPassed && (
          <div className="rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 shadow-xl p-4 sm:p-6 md:p-8">
            <QuizPlayer
              topicId={topic.id}
              moduleId={mod.id}
              quizFlag={quizFlag}
              nextTopicUrl={nextTopicUrl}
              returnToTopicUrl={topicReadingUrl}
              onPass={handlePass}
            />
          </div>
        )}

        {/* ── Bottom Navigation Bar ── */}
        <div className="flex items-center justify-between gap-3 mt-12 pt-6 border-t border-slate-200/60 dark:border-slate-700/40">
          <Link
            to={topicReadingUrl}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/30 hover:border-blue-300 dark:hover:border-blue-600 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Back to lesson reading' : 'Volver al texto del tema'}</span>
          </Link>

          {nextFlat && (
            <Link
              to={nextTopicUrl}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/30 hover:border-blue-300 dark:hover:border-blue-600 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all"
            >
              <span>{lang === 'en' ? 'Next lesson' : 'Siguiente tema'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </main>
    </CourseGate>
  );
}
