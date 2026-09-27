import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { findTopicByPath, getAllFlatTopics } from '../../services/contentMerge';
import { useMergedModule } from '../../hooks/useMergedModule';
import { useAuth } from '../../contexts/AuthProvider';
import { ContributionBanner, ContributorContentActions, ProposeQuizLink } from '../editorial/TopicContribution';
import { TopicStudyTools } from '../student/TopicStudyTools';
import { TopicDiscussion } from '../student/TopicDiscussion';
import { QuizTopicBadge } from '../quiz/QuizTopicBadge';
import { OfflineTopicBadge } from '../OfflineTopicBadge';
import { getQuizFlagForTopic } from '../../services/quizService';
import { CourseGate } from '../CourseGate';
import { QuizCatalogReturnBar } from '../admin/quiz/QuizCatalogReturnBar';
import type { QuizTopicFlag } from '../../types/quiz';
import { Topic } from '../../types/content';
import { ChevronRight, Home, ArrowLeft, ArrowRight, List, X, ChevronUp, BookMarked, ExternalLink, Play, Lightbulb, Target, ImageIcon, CheckCircle2, Clock, ClipboardList, Sparkles, FileText } from 'lucide-react';
import { QuickTopicMaterialModal } from '../editorial/QuickTopicMaterialModal';
import { isAppendixModule } from '../../content/appendixModules';
import { resolveTopicReferences, type Reference } from '../../content/topicReferences';
import {
  toggleTopicCompleted,
  markMultipleTopics,
  setLastVisitedTopic,
  getCompletedTopics,
  TOPIC_PROGRESS_EVENT,
  getAllTopicIds,
} from '../../services/studentService';
import { getPassedQuizTopicIdsSync } from '../../services/quizCompletionGate';
import {
  buildLessonResumeUrl,
  findNextIncompleteFlatTopic,
  getNextPendingCurriculumLesson,
  isCurriculumNodeCompleted,
} from '../../services/studentResume';
import { useSettingsStore } from '../../stores/settingsStore';
import { localizedTopic } from '../../hooks/useLocalizedContent';
import { getVideoEmbedSrc, parseVideoUrl, videoMediaToExternalList } from '../../utils/mediaValidation';
import { useTopicProgress } from '../../hooks/useTopicProgress';
import { RichContent, renderInline, type RichHeadingLevel } from '../content/RichContent';
import { stripLegacyPdfMarkdown, topicPdfList } from '../../utils/topicPrintables';

export type { TopicPdf } from '../../utils/topicPrintables';
export { stripLegacyPdfMarkdown, topicPdfList };

function PdfDocumentsSection({ topic }: { topic: Topic }) {
  const pdfs = topicPdfList(topic);
  if (pdfs.length === 0) return null;

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
        <FileText className="w-3.5 h-3.5" />
        <span>Documentos y Guías PDF ({pdfs.length})</span>
      </div>
      <div className={`grid gap-3 ${pdfs.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {pdfs.map((pdf, idx) => (
          <a
            key={idx}
            href={pdf.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-purple-200/60 dark:border-purple-800/40 bg-gradient-to-br from-purple-50/70 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/10 p-4 flex items-start gap-3.5 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-md hover:shadow-purple-500/10 transition-all text-left"
          >
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  PDF
                </span>
                {pdf.author && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Por {pdf.author}
                  </span>
                )}
              </div>
              <h5 className="text-sm font-bold text-slate-900 dark:text-white mt-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                {pdf.title}
              </h5>
              {pdf.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                  {pdf.description}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 mt-2.5">
                <span>Ver / Descargar documento</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── Video Section ─── */
function topicHasVideos(topic: Topic): boolean {
  return videoMediaToExternalList(topic).length > 0;
}

function ExternalVideosSection({ topic }: { topic: Topic }) {
  const videos = videoMediaToExternalList(topic);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);

  if (videos.length === 0) return null;

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        <Play className="w-3.5 h-3.5" />
        <span>Videos ({videos.length})</span>
      </div>
      <div className={`grid gap-3 ${videos.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {videos.map((video, idx) => {
          const parsed = parseVideoUrl(video.url);
          if (!parsed) return null;
          return (
            <div key={idx} className="group">
              {activeVideo === idx ? (
                <div className="rounded-xl overflow-hidden border border-emerald-200/50 dark:border-emerald-700/30 shadow-lg shadow-emerald-500/5">
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={getVideoEmbedSrc(parsed)}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      allowFullScreen
                      title={video.title}
                    />
                  </div>
                  <div className="px-3 py-2 bg-slate-50/80 dark:bg-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">{video.title}</span>
                    <button
                      onClick={() => setActiveVideo(null)}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setActiveVideo(idx)}
                  className="w-full rounded-xl border border-slate-200/60 dark:border-slate-700/30 bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-800/60 dark:to-emerald-900/10 p-4 flex items-center gap-3 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md hover:shadow-emerald-500/5 transition-all group text-left"
                >
                  <span className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-400/20 transition-colors">
                    <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400 ml-0.5" />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                      {video.title}
                    </span>
                    <span className="block text-[0.7rem] text-slate-400 dark:text-slate-500 mt-0.5">Click para reproducir</span>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Clinical Pearls Box ─── */
function ClinicalPearlsBox({
  pearls,
  lang,
  highlightQuery,
}: {
  pearls: string[];
  lang?: string;
  highlightQuery?: string;
}) {
  const label = lang === 'en' ? 'Clinical Pearls' : 'Perlas Clínicas';
  return (
    <div className="mt-5 rounded-xl border border-amber-200/60 dark:border-amber-700/30 bg-gradient-to-br from-amber-50/80 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/10 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </span>
        <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">{label}</h4>
      </div>
      <ul className="space-y-2">
        {pearls.map((pearl, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
            <span className="text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0">💡</span>
            <span>{renderInline(pearl, `pearl-${i}`, 'screen', highlightQuery)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Key Points Box ─── */
function KeyPointsBox({
  points,
  lang,
  highlightQuery,
}: {
  points: string[];
  lang?: string;
  highlightQuery?: string;
}) {
  const label = lang === 'en' ? 'Key Points' : 'Puntos Clave';
  return (
    <div className="mt-5 rounded-xl border border-blue-200/60 dark:border-blue-700/30 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/10 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-800/40 flex items-center justify-center">
          <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </span>
        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">{label}</h4>
      </div>
      <ul className="space-y-2">
        {points.map((point, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-blue-900 dark:text-blue-200">
            <span className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0">📌</span>
            <span>{renderInline(point, `kp-${i}`, 'screen', highlightQuery)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Image Gallery ─── */
function ImageGallery({ images }: { images: { src: string; alt: string; caption?: string }[] }) {
  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
        <ImageIcon className="w-3.5 h-3.5" />
        <span>Imágenes ({images.length})</span>
      </div>
      <div className={`grid gap-4 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {images.map((img, idx) => (
          <figure key={idx} className="rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-700/30 shadow-sm">
            <img src={img.src} alt={img.alt} className="w-full h-auto object-cover" loading="lazy" />
            {img.caption && (
              <figcaption className="px-3 py-2 bg-slate-50/80 dark:bg-slate-800/80 text-xs text-slate-500 dark:text-slate-400 text-center italic">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}

function TopicBody({
  topic,
  lang,
  headingLevel = 3,
  highlightQuery,
}: {
  topic: Topic;
  lang: 'es' | 'en';
  headingLevel?: RichHeadingLevel;
  highlightQuery?: string;
}) {
  const lt = localizedTopic(topic, lang);
  const cleanContent = stripLegacyPdfMarkdown(lt.content);
  const hasContent = Boolean(cleanContent);
  const hasPdfs = topicPdfList(topic).length > 0;
  const hasExtras = Boolean(
    (lt.clinicalPearls && lt.clinicalPearls.length > 0)
    || (lt.keyPoints && lt.keyPoints.length > 0)
    || (topic.imageUrls && topic.imageUrls.length > 0)
    || topicHasVideos(topic)
    || hasPdfs
  );
  if (!hasContent && !hasExtras) return null;

  return (
    <div>
      {hasContent && (
        <RichContent text={cleanContent} headingLevel={headingLevel} highlightQuery={highlightQuery} />
      )}
      {lt.clinicalPearls && lt.clinicalPearls.length > 0 && (
        <ClinicalPearlsBox pearls={lt.clinicalPearls} lang={lang} highlightQuery={highlightQuery} />
      )}
      {lt.keyPoints && lt.keyPoints.length > 0 && (
        <KeyPointsBox points={lt.keyPoints} lang={lang} highlightQuery={highlightQuery} />
      )}
      {topic.imageUrls && topic.imageUrls.length > 0 && (
        <ImageGallery images={topic.imageUrls} />
      )}
      {topicHasVideos(topic) && <ExternalVideosSection topic={topic} />}
      {hasPdfs && <PdfDocumentsSection topic={topic} />}
    </div>
  );
}

function NestedTopicSections({
  topics,
  lang,
  parentIndex,
  registerRef,
  headingLevel = 3,
  moduleId,
  referenceModuleId,
  ancestors = [],
  topicHasQuiz,
  highlightQuery,
}: {
  topics: Topic[];
  lang: 'es' | 'en';
  parentIndex: string;
  registerRef: (id: string, el: HTMLElement | null) => void;
  headingLevel?: 3 | 4;
  moduleId?: string;
  referenceModuleId?: string;
  ancestors?: Topic[];
  topicHasQuiz?: (topicId: string) => boolean;
  highlightQuery?: string;
}) {
  const Heading = headingLevel === 3 ? 'h3' : 'h4';
  return (
    <div className="space-y-6">
      {topics.map((child, i) => {
        const lt = localizedTopic(child, lang);
        const nested = Boolean(child.children?.length);
        return (
          <section
            key={child.id}
            ref={(el) => registerRef(child.id, el)}
            id={`section-${child.id}`}
            className="scroll-mt-24"
          >
            <Heading className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              <span className="font-mono text-xs text-slate-400 dark:text-slate-500 mr-2">
                {parentIndex}.{i + 1}
              </span>
              {lt.title}
            </Heading>
            {lang === 'es' && child.titleEn && (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5 pl-8">{child.titleEn}</p>
            )}
            {lang === 'en' && child.title !== lt.title && (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5 pl-8">{child.title}</p>
            )}
            <div className="mt-3">
              <TopicBody
                topic={child}
                lang={lang}
                headingLevel={headingLevel === 3 ? 4 : 5}
                highlightQuery={highlightQuery}
              />
              {!nested && referenceModuleId && (
                <TopicBibliography
                  references={resolveTopicReferences(referenceModuleId, child, ancestors)}
                  lang={lang}
                  compact
                />
              )}
            </div>
            {!nested && moduleId && topicHasQuiz && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/40 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {topicHasQuiz(child.id) ? 'Este tema ya tiene cuestionario' : 'Este tema aún no tiene cuestionario'}
                </p>
                <ProposeQuizLink
                  moduleId={moduleId}
                  topicId={child.id}
                  hasQuiz={topicHasQuiz(child.id)}
                  prominent
                />
              </div>
            )}
            {nested && (
              <div className="mt-4 ml-3 sm:ml-4 pl-3 sm:pl-4 border-l border-slate-200/70 dark:border-slate-700/50">
                <NestedTopicSections
                  topics={child.children!}
                  lang={lang}
                  parentIndex={`${parentIndex}.${i + 1}`}
                  registerRef={registerRef}
                  headingLevel={4}
                  moduleId={moduleId}
                  referenceModuleId={referenceModuleId}
                  ancestors={[...ancestors, child]}
                  topicHasQuiz={topicHasQuiz}
                  highlightQuery={highlightQuery}
                />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TocTopicTree({
  topics,
  lang,
  activeSection,
  isTopicDone,
  scrollToSection,
  depth = 0,
  canProposeContent,
  moduleId,
  topicHasQuiz,
}: {
  topics: Topic[];
  lang: 'es' | 'en';
  activeSection: string;
  isTopicDone: (id: string) => boolean;
  scrollToSection: (id: string) => void;
  depth?: number;
  canProposeContent?: boolean;
  moduleId?: string;
  topicHasQuiz?: (topicId: string) => boolean;
}) {
  return (
    <nav className={depth === 0 ? 'space-y-1' : 'mt-0.5 ml-3 space-y-0.5 border-l border-slate-200/70 dark:border-slate-700/40 pl-2'}>
      {topics.map((child, i) => {
        const childDone = isTopicDone(child.id);
        const isActive = activeSection === child.id;
        const hasKids = Boolean(child.children?.length);
        return (
          <div key={child.id}>
            <button
              type="button"
              onClick={() => scrollToSection(child.id)}
              className={`w-full text-left rounded-xl transition-all duration-200 flex items-start gap-2 ${
                depth === 0 ? 'px-3 py-2 text-sm' : 'px-2 py-1.5 text-xs'
              } ${
                isActive
                  ? childDone
                    ? 'bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-medium border-l-2 border-emerald-500 shadow-xs'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border-l-2 border-blue-500 shadow-xs'
                  : childDone
                    ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/30 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {childDone ? (
                <CheckCircle2 className={`${depth === 0 ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-emerald-500 flex-shrink-0 mt-0.5`} />
              ) : (
                <span className="font-mono text-[0.65rem] text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0">
                  {i + 1}
                </span>
              )}
              <span className="line-clamp-2 leading-snug flex-1">{localizedTopic(child, lang).title}</span>
              {childDone && depth === 0 && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5">
                  ✓
                </span>
              )}
            </button>
            {canProposeContent && moduleId && !hasKids && (
              <div className="pl-7 pr-1 pb-1">
                <ProposeQuizLink
                  moduleId={moduleId}
                  topicId={child.id}
                  hasQuiz={topicHasQuiz?.(child.id)}
                />
              </div>
            )}
            {hasKids && (
              <TocTopicTree
                topics={child.children!}
                lang={lang}
                activeSection={activeSection}
                isTopicDone={isTopicDone}
                scrollToSection={scrollToSection}
                depth={depth + 1}
                canProposeContent={canProposeContent}
                moduleId={moduleId}
                topicHasQuiz={topicHasQuiz}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

/* ─── References Section ─── */
function TopicBibliography({
  references,
  lang,
  compact = false,
}: {
  references: Reference[];
  lang: 'es' | 'en';
  compact?: boolean;
}) {
  if (!references.length) return null;

  return (
    <section className={`${compact ? 'mt-4 pt-4' : 'mt-8 pt-6'} border-t border-slate-200/60 dark:border-slate-700/30`}>
      <h3 className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
        <BookMarked className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        <span>{lang === 'en' ? 'References' : 'Bibliografía'} ({references.length})</span>
      </h3>
      <ol className="space-y-3">
        {references.map((ref, i) => (
          <li key={`${ref.authors}-${ref.title}-${i}`} className="flex items-start gap-2.5 text-[0.85rem] sm:text-sm leading-relaxed">
            <span className="text-[0.7rem] font-mono text-slate-400 dark:text-slate-500 mt-1 flex-shrink-0 w-5 text-right">{i + 1}.</span>
            <div className="text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{ref.authors}</span>
              {' '}
              <span className="italic">{ref.title}.</span>
              {(ref.journal || ref.year) && (
                <>
                  {' '}
                  <span>
                    {[ref.journal, ref.year].filter(Boolean).join(', ')}.
                  </span>
                </>
              )}
              {ref.url && (
                <>
                  {' '}
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {lang === 'en' ? 'Open' : 'Abrir'} <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ─── Main Component ─── */
export default function TopicPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const lang = useSettingsStore((s) => s.language);
  const { canProposeContent, user } = useAuth();
  const homeHref = user ? '/portal' : '/';
  const homeLabel = lang === 'en' ? 'Home' : user ? 'Portal' : 'Inicio';
  const { module: mod, loading: moduleLoading, refresh: refreshModule } = useMergedModule(moduleId);
  const highlightQuery = useMemo(
    () => new URLSearchParams(location.search).get('q')?.trim() ?? '',
    [location.search],
  );
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  const [showTOC, setShowTOC] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [quizFlag, setQuizFlag] = useState<QuizTopicFlag | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const mainRef = useRef<HTMLElement>(null);

  // Scroll tracking for scroll-to-top button and active section
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);

      // Reading progress
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setReadingProgress(Math.min(100, Math.round((window.scrollY / docHeight) * 100)));
      }

      // Determine active section
      const entries = Array.from(sectionRefs.current.entries());
      let active = '';
      for (const [id, el] of entries) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) active = id;
      }
      if (active) setActiveSection(active);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const resetScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

  // Scroll to top on route change, unless we are searching for a term or jumping to a hash anchor
  useEffect(() => {
    if (!location.hash && !new URLSearchParams(location.search).get('q')) {
      resetScrollToTop();
      const rAF = requestAnimationFrame(resetScrollToTop);
      const timer = window.setTimeout(resetScrollToTop, 50);
      setShowTOC(false);
      return () => {
        cancelAnimationFrame(rAF);
        window.clearTimeout(timer);
      };
    }
    setShowTOC(false);
  }, [location.pathname, location.key, resetScrollToTop]);

  const scrollToSection = useCallback((id: string) => {
    const el = sectionRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowTOC(false);
    }
  }, []);

  useEffect(() => {
    const sectionId = location.hash.startsWith('#section-')
      ? location.hash.slice('#section-'.length)
      : '';
    if (location.hash === '#evaluacion') {
      let attempts = 0;
      let timer = 0;
      const tryScroll = () => {
        const el = document.getElementById('evaluacion');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        if (attempts < 16) {
          attempts += 1;
          timer = window.setTimeout(tryScroll, 80);
        }
      };
      timer = window.setTimeout(tryScroll, 50);
      return () => window.clearTimeout(timer);
    }
    if (!sectionId) return;

    let attempts = 0;
    let timer = 0;
    const tryScroll = () => {
      const el = sectionRefs.current.get(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (attempts < 12) {
        attempts += 1;
        timer = window.setTimeout(tryScroll, 80);
      }
    };
    timer = window.setTimeout(tryScroll, 50);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (location.hash || !highlightQuery || moduleLoading) return;
    let attempts = 0;
    let timer = 0;
    const tryScroll = () => {
      const el = document.querySelector<HTMLElement>('[data-search-hit]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (attempts < 16) {
        attempts += 1;
        timer = window.setTimeout(tryScroll, 80);
      }
    };
    timer = window.setTimeout(tryScroll, 80);
    return () => window.clearTimeout(timer);
  }, [highlightQuery, location.pathname, location.search, moduleLoading]);

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el);
  }, []);

  const currentTopicCandidates = useMemo(() => {
    if (!mod) return [];
    const basePath = `/modulo/${moduleId}/`;
    const topicPathStr = location.pathname.replace(basePath, '');
    const pathParts = topicPathStr.split('/').filter(Boolean);
    const { topic: resolvedTopic } = findTopicByPath(mod.topics, pathParts);
    if (!resolvedTopic) return [];

    // Strictly the current topic (and potential URL slug alias)
    const list: string[] = [resolvedTopic.id];
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart !== resolvedTopic.id) {
      list.push(lastPart);
    }
    return Array.from(new Set(list));
  }, [mod, moduleId, location.pathname]);

  useEffect(() => {
    if (!currentTopicCandidates.length) {
      setQuizFlag(null);
      return;
    }
    let isMounted = true;
    (async () => {
      for (const tid of currentTopicCandidates) {
        try {
          const flag = await getQuizFlagForTopic(tid);
          if (
            flag &&
            flag.question_count > 0 &&
            (flag.clinical_validation_status ?? 'pending_review') === 'approved' &&
            isMounted
          ) {
            setQuizFlag(flag);
            return;
          }
        } catch {
          // continue search
        }
      }
      if (isMounted) setQuizFlag(null);
    })();
    return () => {
      isMounted = false;
    };
  }, [currentTopicCandidates]);

  const pathParts = useMemo(() => {
    const basePath = `/modulo/${moduleId}/`;
    const topicPathStr = location.pathname.replace(basePath, '');
    return topicPathStr.split('/').filter(Boolean);
  }, [moduleId, location.pathname]);

  useEffect(() => {
    if (mod && moduleId && moduleId !== mod.id) {
      const canonicalPath = pathParts.length > 0
        ? `/modulo/${mod.id}/${pathParts.join('/')}`
        : `/modulo/${mod.id}`;
      navigate(canonicalPath, { replace: true });
    }
  }, [mod, moduleId, navigate, pathParts]);

  const { topic, breadcrumbs } = useMemo(() => {
    if (!mod) return { topic: null as Topic | null, breadcrumbs: [] as Topic[] };
    return findTopicByPath(mod.topics, pathParts);
  }, [mod, pathParts]);

  const allFlat = useMemo(() => (mod ? getAllFlatTopics(mod.topics) : []), [mod]);
  const currentIndex = allFlat.findIndex((f) => f.path.join('/') === pathParts.join('/'));
  const prevTopic = currentIndex > 0 ? allFlat[currentIndex - 1] : null;
  const nextTopic = currentIndex >= 0 && currentIndex < allFlat.length - 1 ? allFlat[currentIndex + 1] : null;

  const { isCompleted: isTopicDoneHook, getModuleStats, completedTopicIds, quizGate } = useTopicProgress();
  const modStats = useMemo(() => {
    return mod ? getModuleStats(mod.topics) : null;
  }, [mod, getModuleStats]);
  const isModuleCompleted = modStats?.isFullyCompleted ?? false;

  const nextPendingTarget = useMemo(() => {
    if (!mod || !topic) return null;
    const nextInModule = findNextIncompleteFlatTopic(allFlat, currentIndex, completedTopicIds, quizGate);
    if (nextInModule) {
      return {
        title: localizedTopic(nextInModule.topic, lang).title,
        url: `/modulo/${mod.id}/${nextInModule.path.join('/')}`,
      };
    }
    const nextAcross = getNextPendingCurriculumLesson(
      completedTopicIds,
      {
        moduleId: mod.id,
        topicId: pathParts[0] || topic.id,
      },
      undefined,
      quizGate
    );
    if (!nextAcross) return null;
    return { title: nextAcross.topicTitle, url: nextAcross.url.split('#')[0] };
  }, [allFlat, currentIndex, completedTopicIds, lang, mod, pathParts, quizGate, topic]);

  const topicHasQuiz = useCallback(
    (topicId: string) => quizGate.quizTopicIds.has(topicId),
    [quizGate]
  );
  const hasEvaluation = Boolean(
    quizFlag &&
      quizFlag.question_count > 0 &&
      (quizFlag.clinical_validation_status ?? 'approved') === 'approved'
  );
  const evaluationPassed = Boolean(
    quizFlag && quizGate.passedQuizTopicIds.has(quizFlag.topic_id)
  );
  const quizTargetTopicId = quizFlag?.topic_id || topic?.id || '';

  useEffect(() => {
    if (user && mod && topic) {
      setLastVisitedTopic(user.id, {
        moduleId: mod.id,
        moduleTitle: mod.title,
        topicId: topic.id,
        topicTitle: localizedTopic(topic, lang).title,
        url: location.pathname,
        updatedAt: new Date().toISOString(),
      });
      if (hasEvaluation) {
        setIsCompleted(evaluationPassed);
      } else {
        setIsCompleted(isCurriculumNodeCompleted(topic, getCompletedTopics(user.id), quizGate));
      }
    }
  }, [user, mod, topic, location.pathname, lang, quizGate, hasEvaluation, evaluationPassed]);

  useEffect(() => {
    const handleProgress = () => {
      if (!user || !topic) return;
      if (hasEvaluation) {
        setIsCompleted(Boolean(quizFlag && getPassedQuizTopicIdsSync(user.id).has(quizFlag.topic_id)));
      } else {
        setIsCompleted(isCurriculumNodeCompleted(topic, getCompletedTopics(user.id), quizGate));
      }
    };
    window.addEventListener(TOPIC_PROGRESS_EVENT, handleProgress);
    return () => window.removeEventListener(TOPIC_PROGRESS_EVENT, handleProgress);
  }, [user, topic, quizGate, hasEvaluation, quizFlag]);

  if (moduleLoading && !mod) {
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

  if (!topic) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 text-center">
        <h1 className="text-2xl font-bold mb-4">{lang === 'en' ? 'Topic not found' : 'Tema no encontrado'}</h1>
        <Link to={`/modulo/${moduleId}`} className="text-blue-500 hover:underline">{lang === 'en' ? '← Back to module' : '← Volver al módulo'}</Link>
      </div>
    );
  }

  const hasChildContent = topic.children && topic.children.length > 0;
  const isLeafTopic = !hasChildContent;
  const tracksProgress = !isAppendixModule(mod.id);
  const topicAncestors = breadcrumbs.slice(0, -1);
  const lt = localizedTopic(topic, lang);
  const modTitle = (lang === 'en' && mod.titleEn) || mod.title;

  return (
    <CourseGate moduleId={moduleId!} topicId={topic.id}>
      <main ref={mainRef} id="contenido-principal" className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 pt-20 sm:pt-24 pb-24">
        <QuizCatalogReturnBar kind="topic" />
        {/* Grid layout: content + sidebar */}
        <div className="lg:grid lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px] lg:gap-10 xl:gap-14">
        {/* Content Column */}
        <div className="min-w-0">
        {/* Breadcrumbs */}
        <nav className="flex flex-wrap items-center gap-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 sm:mb-8">
          <Link to={homeHref} className="hover:text-blue-500 transition-colors flex items-center gap-1 min-h-[2rem]">
            <Home className="w-3.5 h-3.5" /> {homeLabel}
          </Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <Link to={`/modulo/${mod.id}`} className="hover:text-blue-500 transition-colors truncate max-w-[140px] sm:max-w-none min-h-[2rem] inline-flex items-center gap-1.5">
            {isModuleCompleted ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {mod.emoji} {modTitle}
              </span>
            ) : (
              <span>{mod.emoji} {modTitle}</span>
            )}
          </Link>
          {breadcrumbs.map((bc, i) => (
            <span key={bc.id} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
              {i < breadcrumbs.length - 1 ? (
                <Link to={`/modulo/${mod.id}/${pathParts.slice(0, i + 1).join('/')}`} className="hover:text-blue-500 transition-colors truncate max-w-[100px] sm:max-w-none min-h-[2rem] inline-flex items-center">
                  {localizedTopic(bc, lang).title}
                </Link>
              ) : (
                <span className="text-slate-800 dark:text-white font-medium truncate max-w-[140px] sm:max-w-none">{localizedTopic(bc, lang).title}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Topic Header */}
        <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Module color accent bar: green if completed, original mod.color if not */}
          <div className={`h-1.5 w-20 rounded-full transition-colors duration-500 ${
            isModuleCompleted
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/30'
              : `bg-gradient-to-r ${mod.color}`
          } mb-4`} />

          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
              {lt.title}
            </h1>
            {quizFlag && quizFlag.question_count > 0 && (
              <QuizTopicBadge label={lang === 'en' ? 'Assessment' : 'Evaluación'} />
            )}
            {mod?.id && <OfflineTopicBadge moduleId={mod.id} lang={lang} />}
          </div>
          {lang === 'es' && topic.titleEn && (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic mb-4">{topic.titleEn}</p>
          )}
          {lang === 'en' && topic.title !== lt.title && (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic mb-4">{topic.title}</p>
          )}

          {topic.contributionMeta && (
            <ContributionBanner meta={topic.contributionMeta} />
          )}


          {canProposeContent && mod && (
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ⚡ Agregar Material al Tema (Video, PDF, Imagen, Perla)
                </button>
              </div>

              {hasChildContent && (
                <p className="text-xs text-violet-600 dark:text-violet-400 mb-2">
                  Al final de cada subtema puedes agregar o modificar su cuestionario.
                </p>
              )}
              <ContributorContentActions
                moduleId={mod.id}
                topicId={topic.id}
                parentPath={pathParts}
                parentId={pathParts.length > 1 ? pathParts[pathParts.length - 2] : null}
                isLeafTopic={isLeafTopic}
                showSubtopic={!isLeafTopic || !hasChildContent}
                showQuiz={false}
              />
            </div>
          )}

          {/* Main content */}
          {Boolean(stripLegacyPdfMarkdown(lt.content)) && (
            <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/30 shadow-sm">
              <RichContent
                text={stripLegacyPdfMarkdown(lt.content)}
                headingLevel={2}
                highlightQuery={highlightQuery}
              />
              {lt.clinicalPearls && lt.clinicalPearls.length > 0 && (
                <ClinicalPearlsBox pearls={lt.clinicalPearls} lang={lang} highlightQuery={highlightQuery} />
              )}
              {lt.keyPoints && lt.keyPoints.length > 0 && (
                <KeyPointsBox points={lt.keyPoints} lang={lang} highlightQuery={highlightQuery} />
              )}
              {topic.imageUrls && topic.imageUrls.length > 0 && (
                <ImageGallery images={topic.imageUrls} />
              )}
              {topicHasVideos(topic) && <ExternalVideosSection topic={topic} />}
              {topicPdfList(topic).length > 0 && <PdfDocumentsSection topic={topic} />}
            </div>
          )}
          {/* Media without content */}
          {!stripLegacyPdfMarkdown(lt.content) && (topicHasVideos(topic) || topicPdfList(topic).length > 0 || lt.clinicalPearls?.length || lt.keyPoints?.length) && (
            <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/30 shadow-sm">
              {lt.clinicalPearls && lt.clinicalPearls.length > 0 && (
                <ClinicalPearlsBox pearls={lt.clinicalPearls} lang={lang} highlightQuery={highlightQuery} />
              )}
              {lt.keyPoints && lt.keyPoints.length > 0 && (
                <KeyPointsBox points={lt.keyPoints} lang={lang} highlightQuery={highlightQuery} />
              )}
              {topicHasVideos(topic) && <ExternalVideosSection topic={topic} />}
              {topicPdfList(topic).length > 0 && <PdfDocumentsSection topic={topic} />}
            </div>
          )}

          {isLeafTopic && (
            <TopicBibliography
              references={resolveTopicReferences(mod.id, topic, topicAncestors)}
              lang={lang}
            />
          )}

          {canProposeContent && mod && isLeafTopic && (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-slate-800/40 px-4 py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {topicHasQuiz(topic.id) ? 'Este tema ya tiene cuestionario' : 'Este tema aún no tiene cuestionario'}
              </p>
              <ProposeQuizLink
                moduleId={mod.id}
                topicId={topic.id}
                hasQuiz={topicHasQuiz(topic.id)}
                prominent
              />
            </div>
          )}

          {/* Children: auto-expanded article sections */}
          {hasChildContent && (
            <div className="space-y-6 mt-6">
              {topic.children!.map((child, i) => {
                const lc = localizedTopic(child, lang);
                const childPath = `/modulo/${mod.id}/${[...pathParts, child.id].join('/')}`;
                const hasGrandchildren = child.children && child.children.length > 0;

                return (
                  <motion.section
                    key={child.id}
                    ref={(el) => registerRef(child.id, el)}
                    id={`section-${child.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.35 }}
                    className="scroll-mt-20"
                  >
                    <div className="rounded-2xl bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/30 shadow-sm overflow-hidden">
                      {/* Section header */}
                      <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 flex items-start gap-3">
                        <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-600 dark:text-slate-300 text-xs font-mono font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-tight">
                            {hasGrandchildren ? (
                              <Link to={childPath} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {lc.title}
                              </Link>
                            ) : (
                              lc.title
                            )}
                          </h2>
                          {lang === 'es' && child.titleEn && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">{child.titleEn}</p>
                          )}
                          {lang === 'en' && child.title !== lc.title && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">{child.title}</p>
                          )}
                        </div>
                        {hasGrandchildren && (
                          <Link
                            to={childPath}
                            className="flex-shrink-0 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 mt-1 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            {child.children!.length} {lang === 'en' ? 'subtopics' : 'subtemas'} <ChevronRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>

                      {canProposeContent && mod && !child.children?.length && (
                        <div className="px-5 sm:px-6 pb-3 border-b border-slate-100 dark:border-slate-700/40">
                          <ContributorContentActions
                            moduleId={mod.id}
                            topicId={child.id}
                            parentPath={[...pathParts, child.id]}
                            parentId={topic.id}
                            isLeafTopic
                            showSubtopic={false}
                            showQuiz={false}
                            compact
                          />
                        </div>
                      )}

                      {(hasGrandchildren
                        || lc.content
                        || lc.clinicalPearls?.length
                        || lc.keyPoints?.length
                        || child.imageUrls?.length
                        || topicHasVideos(child)) && (
                        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                          <div className="border-t border-slate-100 dark:border-slate-700/40 pt-4 space-y-5">
                            <TopicBody topic={child} lang={lang} highlightQuery={highlightQuery} />
                            {!hasGrandchildren && (
                              <TopicBibliography
                                references={resolveTopicReferences(mod.id, child, breadcrumbs)}
                                lang={lang}
                                compact
                              />
                            )}
                            {hasGrandchildren && (
                              <NestedTopicSections
                                topics={child.children!}
                                lang={lang}
                                parentIndex={String(i + 1)}
                                registerRef={registerRef}
                                moduleId={canProposeContent && mod ? mod.id : undefined}
                                referenceModuleId={mod.id}
                                ancestors={[...breadcrumbs, child]}
                                topicHasQuiz={canProposeContent ? topicHasQuiz : undefined}
                                highlightQuery={highlightQuery}
                              />
                            )}
                          </div>
                        </div>
                      )}
                      {canProposeContent && mod && !hasGrandchildren && (
                        <div className="px-5 sm:px-6 pb-5 pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/40">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {topicHasQuiz(child.id) ? 'Este tema ya tiene cuestionario' : 'Este tema aún no tiene cuestionario'}
                          </p>
                          <ProposeQuizLink
                            moduleId={mod.id}
                            topicId={child.id}
                            hasQuiz={topicHasQuiz(child.id)}
                            prominent
                          />
                        </div>
                      )}
                    </div>
                  </motion.section>
                );
              })}
            </div>
          )}

          {user && mod && topic && (
            <>
              <TopicDiscussion moduleId={mod.id} topicId={topic.id} />
              <TopicStudyTools
                moduleId={mod.id}
                topicId={topic.id}
                url={location.pathname}
                title={lt.title}
                pearls={lt.clinicalPearls}
                keyPoints={lt.keyPoints}
              />
            </>
          )}


          {/* Lesson Completion Action Button (Bottom of Topic) */}
          {user && tracksProgress && (
            <div className="my-10 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 bg-gradient-to-br from-white via-slate-50 to-blue-50/30 dark:from-slate-800/60 dark:via-slate-900/50 dark:to-slate-950/60 backdrop-blur-sm shadow-md flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {lang === 'en' ? 'Lesson Completed' : 'Lección Completada'}
                    </span>
                  ) : hasEvaluation ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {lang === 'en' ? 'Lesson Pending · Assessment Required' : 'Lección Pendiente · Evaluación Requerida'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {lang === 'en' ? 'Lesson Pending' : 'Lección Pendiente'}
                    </span>
                  )}
                </div>
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {isCompleted
                    ? (lang === 'en' ? 'Lesson registered in your curriculum' : 'Lección registrada en tu progreso académico')
                    : hasEvaluation
                    ? (lang === 'en' ? 'Have you finished studying this topic?' : '¿Concluiste la lectura de este tema?')
                    : (lang === 'en' ? 'Finished studying this lesson?' : '¿Terminaste de estudiar esta lección?')}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                  {isCompleted
                    ? nextPendingTarget
                      ? (lang === 'en' ? `Next pending topic: ${nextPendingTarget.title}` : `Siguiente tema pendiente: ${nextPendingTarget.title}`)
                      : (lang === 'en' ? 'This lesson counts towards your course completion and CME credits.' : 'Esta lección ya suma a tu porcentaje de avance y créditos CME en tu portal de alumno.')
                    : hasEvaluation
                    ? (lang === 'en' ? 'To credit this lesson in your curriculum, you must complete and pass the topic evaluation.' : 'Para acreditar esta lección en tu historial académico, debes realizar y aprobar el cuestionario de evaluación.')
                    : (lang === 'en' ? 'Mark as completed when you finish studying to register your progress in the portal.' : 'Márcala como completada al concluir tu lectura para registrar tu avance en el portal de alumno.')}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
                {hasEvaluation && !isCompleted ? (
                  <Link
                    to={`/modulo/${mod.id}/evaluacion/${quizTargetTopicId}`}
                    onClick={resetScrollToTop}
                    className="px-5 py-3 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-600/25 flex items-center gap-2 transition-all active:scale-95"
                  >
                    <ClipboardList className="w-4 h-4" />
                    {lang === 'en' ? 'Take Topic Assessment' : 'Realizar evaluación del tema'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : hasEvaluation && isCompleted ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-300/60 dark:border-emerald-800">
                      <CheckCircle2 className="w-4 h-4" />
                      {lang === 'en' ? 'Assessment passed' : 'Evaluación aprobada'}
                    </span>
                    <Link
                      to={`/modulo/${mod.id}/evaluacion/${quizTargetTopicId}`}
                      onClick={resetScrollToTop}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 border border-cyan-200 dark:border-cyan-800 transition-colors flex items-center gap-1.5"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      {lang === 'en' ? 'Review assessment' : 'Revisar evaluación'}
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user || !topic) return;
                      const childIds = topic.children ? getAllTopicIds(topic.children) : [];
                      const nextState = toggleTopicCompleted(user.id, topic.id, childIds);
                      setIsCompleted(nextState);
                    }}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                      isCompleted
                        ? 'bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isCompleted
                      ? (lang === 'en' ? 'Completed (unmark)' : 'Completada (desmarcar)')
                      : (lang === 'en' ? 'Mark as completed' : 'Marcar como completada')}
                  </button>
                )}
                {isCompleted && nextPendingTarget && (
                  <Link
                    to={nextPendingTarget.url}
                    onClick={resetScrollToTop}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 flex items-center gap-2 active:scale-95"
                  >
                    {lang === 'en' ? 'Continue next' : 'Continuar siguiente'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Prev/Next Navigation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-12 pt-8 border-t border-slate-200/60 dark:border-slate-700/30">
            {prevTopic ? (
              <Link
                to={`/modulo/${mod.id}/${prevTopic.path.join('/')}`}
                onClick={resetScrollToTop}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all text-sm group flex-1 min-w-0"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[0.65rem] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">{lang === 'en' ? 'Previous' : 'Anterior'}</span>
                  <span className="block truncate text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                    {localizedTopic(prevTopic.topic, lang).title}
                  </span>
                </div>
              </Link>
            ) : <div className="hidden sm:block flex-1" />}

            {hasEvaluation && !isCompleted ? (
              <Link
                to={`/modulo/${mod.id}/evaluacion/${quizTargetTopicId}`}
                onClick={resetScrollToTop}
                className="flex items-center justify-end gap-3 px-4 py-3.5 rounded-xl bg-cyan-50/80 dark:bg-cyan-950/30 border border-cyan-200/70 dark:border-cyan-800/50 hover:border-cyan-400 dark:hover:border-cyan-500 transition-all text-sm group flex-1 min-w-0 text-right shadow-xs"
              >
                <div className="min-w-0">
                  <span className="block text-[0.65rem] uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-0.5 font-semibold">
                    {lang === 'en' ? 'Next step' : 'Siguiente paso'}
                  </span>
                  <span className="block truncate text-cyan-950 dark:text-cyan-100 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors font-bold">
                    {lang === 'en' ? 'Topic Assessment' : 'Evaluación del tema'}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-600 group-hover:text-cyan-700 transition-colors flex-shrink-0" />
              </Link>
            ) : isCompleted && nextPendingTarget ? (
              <Link
                to={nextPendingTarget.url}
                onClick={resetScrollToTop}
                className="flex items-center justify-end gap-3 px-4 py-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-sm group flex-1 min-w-0 text-right"
              >
                <div className="min-w-0">
                  <span className="block text-[0.65rem] uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-0.5">
                    {lang === 'en' ? 'Next pending' : 'Siguiente pendiente'}
                  </span>
                  <span className="block truncate text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                    {nextPendingTarget.title}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-500 group-hover:text-blue-600 transition-colors flex-shrink-0" />
              </Link>
            ) : nextTopic ? (
              <Link
                to={`/modulo/${mod.id}/${nextTopic.path.join('/')}`}
                onClick={resetScrollToTop}
                className="flex items-center justify-end gap-3 px-4 py-3.5 rounded-xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all text-sm group flex-1 min-w-0 text-right"
              >
                <div className="min-w-0">
                  <span className="block text-[0.65rem] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">{lang === 'en' ? 'Next' : 'Siguiente'}</span>
                  <span className="block truncate text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                    {localizedTopic(nextTopic.topic, lang).title}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
              </Link>
            ) : <div className="hidden sm:block flex-1" />}
          </div>
        </motion.article>
        </div>{/* End Content Column */}

        {/* ── Desktop TOC Sidebar (sticky in grid) ── */}
        {hasChildContent && (
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(var(--app-height,100vh)-8rem)] overflow-y-auto">
              <div className="bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/30 shadow-lg p-4">
                {/* Progress bar in TOC */}
                {(() => {
                  const completedChildrenCount = topic.children
                    ? topic.children.filter((c) => isTopicDoneHook(c.id)).length
                    : 0;
                  const totalChildrenCount = topic.children?.length ?? 0;
                  const childrenCompletionPct = totalChildrenCount > 0
                    ? Math.round((completedChildrenCount / totalChildrenCount) * 100)
                    : 0;
                  const isAllChildrenDone = totalChildrenCount > 0 && completedChildrenCount === totalChildrenCount;

                  return (
                    <>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ease-out ${
                              isAllChildrenDone
                                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                            }`}
                            style={{ width: `${Math.max(readingProgress, childrenCompletionPct)}%` }}
                          />
                        </div>
                        <span className={`text-[0.65rem] font-mono tabular-nums font-bold ${
                          isAllChildrenDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {completedChildrenCount}/{totalChildrenCount} ({childrenCompletionPct}%)
                        </span>
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <List className="w-3.5 h-3.5" /> Contenido
                        </span>
                        {isAllChildrenDone && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            ✓ Completado
                          </span>
                        )}
                      </h4>
                      <TocTopicTree
                        topics={topic.children!}
                        lang={lang}
                        activeSection={activeSection}
                        isTopicDone={isTopicDoneHook}
                        scrollToSection={scrollToSection}
                        canProposeContent={canProposeContent}
                        moduleId={mod?.id}
                        topicHasQuiz={topicHasQuiz}
                      />
                    </>
                  );
                })()}
                {/* Back to module link */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/40 space-y-2">
                  {isCompleted && nextPendingTarget && (
                    <Link
                      to={nextPendingTarget.url}
                      className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors"
                    >
                      <ArrowRight className="w-3 h-3" />
                      <span className="line-clamp-2">
                        {lang === 'en' ? 'Continue to' : 'Continuar a'} {nextPendingTarget.title}
                      </span>
                    </Link>
                  )}
                  <Link
                    to={`/modulo/${mod.id}`}
                    className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>{lang === 'en' ? 'Back to module' : 'Volver al módulo'}</span>
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        )}
        </div>{/* End Grid */}
      </main>

      {/* Desktop TOC is now in the grid above — removed fixed sidebar */}

      {/* ── Mobile TOC Button ── */}
      {hasChildContent && (
        <button
          onClick={() => setShowTOC(true)}
          className="lg:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-blue-600 dark:bg-blue-500 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          aria-label="Tabla de contenido"
        >
          <List className="w-5 h-5" />
        </button>
      )}

      {/* ── Mobile TOC Bottom Sheet ── */}
      <AnimatePresence>
        {showTOC && hasChildContent && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowTOC(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[70vh] overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <List className="w-4 h-4" /> Contenido
                </h4>
                <button onClick={() => setShowTOC(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(70vh-4rem)] p-4">
                <TocTopicTree
                  topics={topic.children!}
                  lang={lang}
                  activeSection={activeSection}
                  isTopicDone={isTopicDoneHook}
                  scrollToSection={scrollToSection}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Scroll to Top ── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-4 lg:bottom-8 lg:right-8 z-30 w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/40 shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform backdrop-blur-sm"
            aria-label="Ir arriba"
          >
            <ChevronUp className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Quick Topic Material Modal for Teachers ── */}
      {mod && topic && (
        <QuickTopicMaterialModal
          isOpen={isMaterialModalOpen}
          onClose={() => setIsMaterialModalOpen(false)}
          moduleId={mod.id}
          topic={topic}
          onSuccess={refreshModule}
        />
      )}
    </CourseGate>
  );
}
