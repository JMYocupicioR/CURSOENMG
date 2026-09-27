import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Home, ClipboardList, CheckCircle2, Sparkles, Filter, RotateCcw, Clock, ArrowRight, Play } from 'lucide-react';
import { OfflineButton } from '../OfflineButton';
import { useSettingsStore } from '../../stores/settingsStore';
import { useMergedModule } from '../../hooks/useMergedModule';
import { useQuizTopicFlags } from '../../hooks/useQuizTopicFlags';
import { useAuth } from '../../contexts/AuthProvider';
import { ProposeSubtopicLink } from '../editorial/TopicContribution';
import { ModuleTopicRow, TopicFilterType } from './ModuleTopicTree';
import { CourseGate } from '../CourseGate';
import { QuizCatalogReturnBar } from '../admin/quiz/QuizCatalogReturnBar';
import { useTopicProgress } from '../../hooks/useTopicProgress';
import { isAppendixModule } from '../../content/appendixModules';
import { listPendingCurriculumLessons } from '../../services/studentResume';

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { module: mod, loading } = useMergedModule(moduleId);
  const { canProposeContent, user } = useAuth();
  const homeHref = user ? '/portal' : '/';
  const { hasQuiz, moduleQuizCount } = useQuizTopicFlags();
  const lang = useSettingsStore((s) => s.language);
  const [filter, setFilter] = useState<TopicFilterType>(() =>
    searchParams.get('filtro') === 'pendientes' ? 'pending' : 'all'
  );
  const { getModuleStats, markSection, completedTopicIds } = useTopicProgress();

  useEffect(() => {
    if (mod && moduleId && moduleId !== mod.id) {
      navigate(`/modulo/${mod.id}`, { replace: true });
    }
  }, [mod, moduleId, navigate]);

  const stats = useMemo(() => {
    return mod
      ? getModuleStats(mod.topics)
      : { total: 0, completed: 0, pending: 0, percent: 0, isFullyCompleted: false };
  }, [mod, getModuleStats]);

  const moduleResume = useMemo(() => {
    if (!mod) return null;
    return listPendingCurriculumLessons(completedTopicIds, {
      moduleId: mod.id,
      limit: 1,
    })[0] ?? null;
  }, [mod, completedTopicIds]);

  if (loading && !mod) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 text-center text-slate-500">
        {lang === 'en' ? 'Loading…' : 'Cargando…'}
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 text-center">
        <h1 className="text-2xl font-bold mb-4">{lang === 'en' ? 'Module not found' : 'Módulo no encontrado'}</h1>
        <Link to={homeHref} className="text-blue-500 hover:underline">{lang === 'en' ? '← Back to home' : '← Volver al portal'}</Link>
      </div>
    );
  }

  const quizCount = moduleQuizCount(mod.id);
  const isConsultation = isAppendixModule(mod.id);

  return (
    <CourseGate moduleId={mod.id}>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-20">
        <QuizCatalogReturnBar kind="module" />
        <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6 sm:mb-8">
          <Link to={homeHref} className="hover:text-blue-500 transition-colors flex items-center gap-1 min-h-[2rem]">
            <Home className="w-3.5 h-3.5" /> {lang === 'en' ? 'Home' : user ? 'Portal' : 'Inicio'}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-800 dark:text-white font-medium">{mod.emoji} {(lang === 'en' && mod.titleEn) || mod.title}</span>
        </nav>

        {/* Module Hero Banner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className={`h-1.5 w-20 rounded-full ${
            stats.isFullyCompleted
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
              : `bg-gradient-to-r ${mod.color}`
          } mb-5 transition-colors duration-500`} />
          <div className="flex items-start gap-4 sm:gap-5">
            <div className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${
              stats.isFullyCompleted
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                : `bg-gradient-to-br ${mod.color}`
            } text-white text-2xl sm:text-3xl shadow-lg flex-shrink-0 transition-all duration-500`}>
              {mod.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="text-xs sm:text-sm font-mono text-slate-400 dark:text-slate-500">
                  {lang === 'en' ? 'Module' : 'Módulo'} {String(mod.number).padStart(2, '0')}
                </p>
                {stats.isFullyCompleted && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    {lang === 'en' ? 'Module Completed' : 'Módulo Completado'}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                {(lang === 'en' && mod.titleEn) || mod.title}
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {(lang === 'en' && mod.descriptionEn) || mod.description}
              </p>
              {quizCount > 0 && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                  <ClipboardList className="w-4 h-4" />
                  {quizCount} {lang === 'en' ? 'assessments available' : 'evaluaciones disponibles'}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <OfflineButton moduleId={mod.id} />
                {canProposeContent && (
                  <ProposeSubtopicLink moduleId={mod.id} label="Agregar tema al módulo" />
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {isConsultation ? (
          <div className="mb-8 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/50">
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              {lang === 'en' ? 'Consultation material' : 'Material de consulta'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'en'
                ? 'These pages collect shared sources. They do not count as lessons and do not change your course progress. Each topic shows its own references at the end of the text.'
                : 'Estas páginas reúnen fuentes compartidas. No son lecciones y no cambian tu avance del curso. Cada tema muestra su bibliografía al final del texto.'}
            </p>
          </div>
        ) : (
        /* Student Progress Card & Filters */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-white/90 via-slate-50/80 to-blue-50/30 dark:from-slate-800/90 dark:via-slate-800/60 dark:to-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 backdrop-blur-md shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {lang === 'en' ? 'Your Module Progress' : 'Tu Progreso en este Módulo'}
                </span>
                {stats.isFullyCompleted && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {lang === 'en' ? '100% Completed' : '¡100% Completado!'}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>{stats.completed} de {stats.total} {lang === 'en' ? 'lessons completed' : 'lecciones completadas'}</span>
                <span className="text-sm font-mono font-semibold text-blue-600 dark:text-cyan-400">({stats.percent}%)</span>
              </h2>
            </div>

            {/* Quick Batch Actions */}
            <div className="flex items-center gap-2 text-xs">
              {moduleResume && stats.pending > 0 && (
                <Link
                  to={moduleResume.url}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  {lang === 'en' ? 'Continue pending lesson' : 'Continuar pendiente'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => mod && markSection(mod.topics, true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {lang === 'en' ? 'Mark all complete' : 'Marcar todo como completado'}
              </button>
              {stats.completed > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(lang === 'en' ? 'Reset progress for this module?' : '¿Deseas reiniciar el progreso de este módulo?')) {
                      if (mod) markSection(mod.topics, false);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  title={lang === 'en' ? 'Reset module progress' : 'Reiniciar progreso'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{lang === 'en' ? 'Reset' : 'Reiniciar'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Fluid animated progress bar */}
          <div className="w-full bg-slate-200/80 dark:bg-slate-700/70 rounded-full h-2.5 mt-3.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.percent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                stats.isFullyCompleted
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500'
              }`}
            />
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-slate-200/60 dark:border-slate-700/40">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                {lang === 'en' ? 'Filter:' : 'Mostrar:'}
              </span>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                {lang === 'en' ? 'All' : 'Todos'} ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  filter === 'pending'
                    ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                {lang === 'en' ? 'Pending' : 'Pendientes'} ({stats.pending})
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  filter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                {lang === 'en' ? 'Completed' : 'Completados'} ({stats.completed})
              </button>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
              {lang === 'en'
                ? '💡 Click the lesson number or check icon to toggle completion'
                : '💡 Haz clic en el número o check de cada tema para marcarlo'}
            </p>
          </div>
        </motion.div>
        )}

        {/* Empty States for Filters */}
        {!isConsultation && filter === 'pending' && stats.pending === 0 && (
          <div className="p-8 text-center rounded-3xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 my-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
              {lang === 'en' ? 'All caught up!' : '¡Excelente trabajo! Has completado todas las lecciones'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {lang === 'en'
                ? 'There are no pending lessons in this module. You can review them anytime.'
                : 'No tienes temas pendientes en este módulo. Puedes repasar cualquier lección cuando lo desees.'}
            </p>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              {lang === 'en' ? 'View all topics' : 'Ver todos los temas'}
            </button>
          </div>
        )}

        {!isConsultation && filter === 'completed' && stats.completed === 0 && (
          <div className="p-8 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 my-6">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
              {lang === 'en' ? 'No completed lessons yet' : 'Aún no has completado lecciones en este módulo'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {lang === 'en'
                ? 'Mark lessons as completed to register your progress towards your diploma and CME credits.'
                : 'Marca las lecciones conforme las estudies para registrar tu avance curricular y créditos CME.'}
            </p>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              {lang === 'en' ? 'View all topics' : 'Ver todos los temas'}
            </button>
          </div>
        )}

        {/* Topics Tree */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="space-y-3 sm:space-y-4"
        >
          {mod.topics.map((topic, i) => (
            <ModuleTopicRow
              key={topic.id}
              topic={topic}
              moduleId={mod.id}
              moduleNumber={mod.number}
              indexPath={`${mod.number}.${i + 1}`}
              depth={0}
              lang={lang}
              hasQuiz={hasQuiz}
              canProposeContent={canProposeContent}
              trackProgress={!isConsultation}
              filter={isConsultation ? 'all' : filter}
            />
          ))}
        </motion.div>

        <div className="mt-10 text-center">
          <Link to="/portal?tab=modules" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-500 transition-colors min-h-[44px]">
            {lang === 'en' ? '← Back to all modules' : '← Volver a mis clases'}
          </Link>
        </div>
      </main>
    </CourseGate>
  );
}
