import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, BookOpen, CheckCircle2, Clock, Circle } from 'lucide-react';
import { Topic } from '../../types/content';
import { localizedTopic } from '../../hooks/useLocalizedContent';
import { ProposeSubtopicLink, ProposeQuizLink } from '../editorial/TopicContribution';
import { QuizTopicBadge } from '../quiz/QuizTopicBadge';
import { OfflineTopicBadge } from '../OfflineTopicBadge';
import { useTopicProgress } from '../../hooks/useTopicProgress';
import { areRequiredQuizzesPassed, topicHasEvaluation } from '../../services/quizCompletionGate';

function getPreview(topic: Topic): string {
  const src = topic.content || (topic.children?.[0]?.content) || '';
  if (!src) return '';
  const clean = src
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[•\-\*]\s/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  return clean.length > 100 ? clean.slice(0, 100) + '…' : clean;
}

function topicTreeHasQuiz(
  topic: Topic,
  hasQuiz: (topicId: string) => boolean
): boolean {
  if (!topic.children?.length) return hasQuiz(topic.id);
  return topic.children.some((child) => topicTreeHasQuiz(child, hasQuiz));
}

function countLeafQuizzes(
  topic: Topic,
  hasQuiz: (topicId: string) => boolean
): number {
  if (!topic.children?.length) return hasQuiz(topic.id) ? 1 : 0;
  return topic.children.reduce((sum, child) => sum + countLeafQuizzes(child, hasQuiz), 0);
}

export type TopicFilterType = 'all' | 'pending' | 'completed';

export interface ModuleTopicRowProps {
  topic: Topic;
  moduleId: string;
  moduleNumber: number;
  indexPath: string;
  depth: number;
  lang: 'es' | 'en';
  hasQuiz: (topicId: string) => boolean;
  canProposeContent: boolean;
  trackProgress?: boolean;
  parentPath?: string[];
  filter?: TopicFilterType;
}

function ModuleTopicRow({
  topic,
  moduleId,
  moduleNumber,
  indexPath,
  depth,
  lang,
  hasQuiz,
  canProposeContent,
  trackProgress = true,
  parentPath = [],
  filter = 'all',
}: ModuleTopicRowProps) {
  const navigate = useNavigate();
  const {
    isCompleted,
    isVisited,
    getParentTopicStats,
    toggleTopic,
    quizGate,
  } = useTopicProgress();

  const isLeaf = !topic.children?.length;
  const showQuizBadge = isLeaf ? hasQuiz(topic.id) : topicTreeHasQuiz(topic, hasQuiz);
  const childCount = topic.children?.length ?? 0;
  const preview = getPreview(topic);
  const lt = localizedTopic(topic, lang);

  const currentPath = [...parentPath, topic.id];
  const topicUrl = `/modulo/${moduleId}/${currentPath.join('/')}`;

  // Progress calculations
  const leafCompleted = trackProgress && isCompleted(topic.id);
  const leafVisited = trackProgress && isVisited(topic.id);
  const parentStats = trackProgress && !isLeaf ? getParentTopicStats(topic) : null;
  const isSectionDone = parentStats ? parentStats.status === 'completed' : leafCompleted;

  // Filter visibility logic
  if (filter === 'completed') {
    if (isLeaf && !leafCompleted) return null;
    if (!isLeaf && parentStats && parentStats.completed === 0) return null;
  } else if (filter === 'pending') {
    if (isLeaf && leafCompleted) return null;
    if (!isLeaf && isSectionDone) return null;
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) {
      return;
    }
    navigate(topicUrl);
  };

  const requiresEvaluation = topicHasEvaluation(topic, quizGate);
  const evaluationPassed = areRequiredQuizzesPassed(topic, quizGate);

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (requiresEvaluation && !evaluationPassed) {
      navigate(`${topicUrl}#evaluacion`);
      return;
    }
    toggleTopic(topic);
  };

  return (
    <div className={depth > 0 ? 'ml-3 sm:ml-4 border-l border-slate-200/60 dark:border-slate-700/40 pl-2 sm:pl-3' : ''}>
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
        <div
          role="button"
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if ((e.target as HTMLElement).closest('a, button')) return;
              e.preventDefault();
              navigate(topicUrl);
            }
          }}
          className={`group flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl backdrop-blur-sm border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${
            isSectionDone
              ? 'bg-emerald-50/30 dark:bg-emerald-950/15 border-emerald-300/60 dark:border-emerald-800/60 hover:border-emerald-500'
              : 'bg-white/75 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600'
          }`}
        >
          <div className="flex-shrink-0 flex items-center pt-0.5">
            {trackProgress ? (
            <button
              type="button"
              onClick={handleToggleClick}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                isSectionDone
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 hover:bg-emerald-600 scale-100 hover:scale-105'
                  : 'bg-slate-100 dark:bg-slate-700/70 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
              title={
                requiresEvaluation && !evaluationPassed
                  ? (lang === 'en'
                    ? 'Pass the lesson assessment to mark this complete'
                    : 'Aprueba la evaluación del tema para marcarlo como completado')
                  : isSectionDone
                  ? (lang === 'en' ? 'Completed · Click to mark pending' : 'Completado · Clic para marcar como pendiente')
                  : (lang === 'en' ? 'Mark as completed' : 'Marcar como completado')
              }
              aria-label={isSectionDone ? 'Completado' : 'Marcar como completado'}
            >
              {isSectionDone ? (
                <CheckCircle2 className="w-5 h-5 fill-white text-emerald-600" />
              ) : (
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  {indexPath}
                </span>
              )}
            </button>
            ) : (
              <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-700/70 font-mono text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                {indexPath}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header: Title + Status Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Link
                to={topicUrl}
                className={`font-semibold transition-colors text-sm sm:text-base leading-snug ${
                  isSectionDone
                    ? 'text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                    : 'text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {lt.title}
              </Link>

              {trackProgress && isLeaf && (
                <>
                  {leafCompleted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      {lang === 'en' ? 'Completed' : 'Completado'}
                    </span>
                  ) : leafVisited ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800">
                      <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      {lang === 'en' ? 'Seen · Pending' : 'Visto · Pendiente'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      <Circle className="w-2.5 h-2.5 text-slate-400" />
                      {lang === 'en' ? 'Pending' : 'Pendiente'}
                    </span>
                  )}
                </>
              )}

              {trackProgress && !isLeaf && parentStats && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    parentStats.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-800'
                      : parentStats.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300/70 dark:border-blue-800'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {parentStats.status === 'completed' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      {lang === 'en'
                        ? `Section completed (${parentStats.completed}/${parentStats.total})`
                        : `Sección completada (${parentStats.completed}/${parentStats.total})`}
                    </>
                  ) : parentStats.status === 'in_progress' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      {lang === 'en'
                        ? `In progress (${parentStats.completed}/${parentStats.total})`
                        : `En progreso (${parentStats.completed}/${parentStats.total})`}
                    </>
                  ) : (
                    <>
                      <Circle className="w-2.5 h-2.5 text-slate-400" />
                      {lang === 'en'
                        ? `Pending (0/${parentStats.total})`
                        : `Pendiente (0/${parentStats.total})`}
                    </>
                  )}
                </span>
              )}

              {showQuizBadge && <QuizTopicBadge label={lang === 'en' ? 'Quiz' : 'Evaluación'} />}
              <OfflineTopicBadge moduleId={moduleId} lang={lang} />
            </div>

            {preview && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {preview}
              </p>
            )}

            {/* Parent Section Progress Bar and Subtopic Count */}
            {trackProgress && childCount > 0 && parentStats && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/40">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[0.7rem] sm:text-xs text-slate-500 dark:text-slate-400">
                      {parentStats.completed} de {parentStats.total} {lang === 'en' ? 'subtopics completed' : 'subtemas completados'} ({parentStats.percent}%)
                    </span>
                    {countLeafQuizzes(topic, hasQuiz) > 0 && (
                      <span className="text-[0.7rem] text-indigo-500 font-medium">
                        · {countLeafQuizzes(topic, hasQuiz)} {lang === 'en' ? 'quizzes' : 'evaluaciones'}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleClick}
                    className="text-[11px] font-medium text-slate-500 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    {parentStats.status === 'completed'
                      ? (lang === 'en' ? 'Mark section pending' : 'Desmarcar sección')
                      : (lang === 'en' ? 'Mark all section complete' : 'Marcar sección completa')}
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      parentStats.status === 'completed'
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}
                    style={{ width: `${parentStats.percent}%` }}
                  />
                </div>
              </div>
            )}

            {canProposeContent && isLeaf && (
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <ProposeQuizLink moduleId={moduleId} topicId={topic.id} hasQuiz={hasQuiz(topic.id)} />
              </div>
            )}
            {canProposeContent && depth === 0 && (
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <ProposeSubtopicLink moduleId={moduleId} parentId={topic.id} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </motion.div>

      {topic.children && topic.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {topic.children.map((child, i) => (
            <ModuleTopicRow
              key={child.id}
              topic={child}
              moduleId={moduleId}
              moduleNumber={moduleNumber}
              indexPath={`${indexPath}.${i + 1}`}
              depth={depth + 1}
              lang={lang}
              hasQuiz={hasQuiz}
              canProposeContent={canProposeContent}
              trackProgress={trackProgress}
              parentPath={currentPath}
              filter={filter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { ModuleTopicRow, topicTreeHasQuiz, getPreview };

