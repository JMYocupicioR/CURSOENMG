import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Topic } from '../types/content';
import { X, Search, ChevronDown, ChevronRight, BookOpen, Lock, CheckCircle2, Circle, Pencil, ListTree } from 'lucide-react';
import { useQuizTopicFlags } from '../hooks/useQuizTopicFlags';
import { QuizTopicBadge } from './quiz/QuizTopicBadge';
import { useAuth } from '../contexts/AuthProvider';
import { useCourseStore } from '../stores/courseStore';
import { useTopicProgress } from '../hooks/useTopicProgress';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useSyllabusCatalog } from '../hooks/useSyllabusCatalog';
import { applyOverridesToModules, getCourseIdForModule, groupModulesByCourse } from '../content/courseCatalog';
import type { CourseId, CourseModuleRow, SyllabusTopicOverride } from '../types/database';
import { CourseSyllabusEditorTree } from './admin/CourseSyllabusEditorTree';
import { QuickCreateTopicModal } from './admin/QuickCreateTopicModal';
import { QuickTopicMaterialModal } from './editorial/QuickTopicMaterialModal';
import { CreateLiveClassModal } from './admin/CreateLiveClassModal';
import type { SyllabusQuickAddAction } from './admin/SyllabusQuickAddMenu';
import {
  assignmentsWithModuleOrder,
  assignmentsWithModuleVisibility,
  mergeOverrideInputs,
  moveItem,
  siblingOverrideInputs,
  visibilityOverrideInput,
} from '../utils/syllabusTree';
import {
  reorderCourseModules,
  setCourseModuleVisible,
  setSyllabusTopicOverrides,
} from '../services/courseService';
import {
  buildCourseDocuments,
  lessonHrefWithQuery,
  searchDocuments,
} from '../search/courseSearch';
import { HighlightedSearchText } from '../search/HighlightedSearchText';

interface CourseSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const EDIT_MODE_KEY = 'neurosafe.courseSidebar.editMode';

function topicTreeHasQuiz(topic: Topic, hasQuiz: (id: string) => boolean): boolean {
  if (!topic.children?.length) return hasQuiz(topic.id);
  return topic.children.some((child) => topicTreeHasQuiz(child, hasQuiz));
}

export function CourseSidebar({ isOpen, onClose }: CourseSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasQuiz, moduleQuizCount } = useQuizTopicFlags();
  const { hasPremiumAccess, hasCourseAccess, isAdmin, isEditor } = useAuth();
  const canEditSyllabus = isAdmin || isEditor;
  const { moduleAccess, load: loadCourse } = useCourseStore();
  const {
    grouped,
    courses,
    mergedModules,
    assignments,
    overrides,
    reload,
  } = useSyllabusCatalog();
  const { isCompleted, getModuleStats } = useTopicProgress();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!canEditSyllabus) {
      setEditMode(false);
      return;
    }
    try {
      setEditMode(sessionStorage.getItem(EDIT_MODE_KEY) === '1');
    } catch {
      setEditMode(false);
    }
  }, [canEditSyllabus]);
  const [draftAssignments, setDraftAssignments] = useState<CourseModuleRow[] | null>(null);
  const [draftOverrides, setDraftOverrides] = useState<SyllabusTopicOverride[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<{
    label: string;
    assignments: CourseModuleRow[];
    overrides: SyllabusTopicOverride[];
    revert: () => Promise<void>;
  } | null>(null);
  const undoTimer = useRef<number | null>(null);

  const [createTopic, setCreateTopic] = useState<{
    moduleId: string;
    moduleTitle: string;
    parentId?: string | null;
    parentTitle?: string | null;
  } | null>(null);
  const [material, setMaterial] = useState<{
    moduleId: string;
    topic: Topic;
    initialTab: 'pdf' | 'video';
  } | null>(null);
  const [liveClass, setLiveClass] = useState<{ moduleId: string; topicId?: string | null } | null>(null);

  const assignmentsEff = draftAssignments ?? assignments;
  const overridesEff = draftOverrides ?? overrides;

  const studentGrouped = useMemo(() => {
    if (!draftAssignments && !draftOverrides) return grouped;
    const mods = applyOverridesToModules(mergedModules, overridesEff);
    return groupModulesByCourse(mods, courses, assignmentsEff).grouped;
  }, [draftAssignments, draftOverrides, grouped, mergedModules, overridesEff, courses, assignmentsEff]);

  const staffGrouped = useMemo(() => {
    const mods = applyOverridesToModules(mergedModules, overridesEff, { includeHidden: true });
    return groupModulesByCourse(mods, courses, assignmentsEff).grouped;
  }, [mergedModules, overridesEff, courses, assignmentsEff]);

  const modulesForSearch = useMemo(
    () => (editMode ? staffGrouped : studentGrouped).flatMap((g) => (editMode ? g.rows.map((r) => r.module) : g.modules)),
    [editMode, staffGrouped, studentGrouped]
  );

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const currentModuleId = useMemo(() => {
    const match = location.pathname.match(/\/modulo\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  useEffect(() => {
    if (currentModuleId) {
      setExpandedModules((prev) => new Set(prev).add(currentModuleId));
    }
  }, [currentModuleId]);

  useEffect(() => {
    if (editMode) return;
    onClose();
  }, [location.pathname, editMode]);

  const searchDocumentsIndex = useMemo(
    () => buildCourseDocuments(modulesForSearch),
    [modulesForSearch],
  );
  const emojiByModule = useMemo(
    () => new Map(modulesForSearch.map((mod) => [mod.id, mod.emoji])),
    [modulesForSearch],
  );
  const searchResults = useMemo(
    () => searchDocuments(searchDocumentsIndex, searchQuery, 15),
    [searchDocumentsIndex, searchQuery],
  );

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }, []);

  const persistSnapshot = (
    label: string,
    nextAssignments: CourseModuleRow[],
    nextOverrides: SyllabusTopicOverride[],
    revert: () => Promise<void>
  ) => {
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    setUndo({
      label,
      assignments: assignmentsEff,
      overrides: overridesEff,
      revert,
    });
    setDraftAssignments(nextAssignments);
    setDraftOverrides(nextOverrides);
    undoTimer.current = window.setTimeout(() => setUndo(null), 8000);
  };

  const runPersist = async (
    fn: () => Promise<void>,
    fallbackAssignments: CourseModuleRow[],
    fallbackOverrides: SyllabusTopicOverride[]
  ) => {
    setBusy(true);
    try {
      await fn();
      await reload();
      setDraftAssignments(null);
      setDraftOverrides(null);
    } catch (error) {
      setDraftAssignments(fallbackAssignments);
      setDraftOverrides(fallbackOverrides);
      setUndo(null);
      console.error('[CourseSidebar] no se pudo guardar el temario', error);
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!undo) return;
    const snapshot = undo;
    setUndo(null);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    setDraftAssignments(snapshot.assignments);
    setDraftOverrides(snapshot.overrides);
    setBusy(true);
    try {
      await snapshot.revert();
      await reload();
      setDraftAssignments(null);
      setDraftOverrides(null);
    } catch (error) {
      console.error('[CourseSidebar] undo failed', error);
    } finally {
      setBusy(false);
    }
  };

  const handleReorderModules = (courseId: string, moduleIds: string[], from: number, to: number) => {
    const nextIds = moveItem(moduleIds, from, to);
    const nextAssignments = assignmentsWithModuleOrder(assignmentsEff, courseId, nextIds);
    persistSnapshot(
      'Orden de módulos actualizado',
      nextAssignments,
      overridesEff,
      () => reorderCourseModules(courseId as CourseId, moduleIds)
    );
    void runPersist(() => reorderCourseModules(courseId as CourseId, nextIds), assignmentsEff, overridesEff);
  };

  const handleReorderTopics = (moduleId: string, siblings: Topic[], from: number, to: number) => {
    const nextSiblings = moveItem(siblings, from, to);
    const inputs = siblingOverrideInputs(
      nextSiblings.map((t) => t.id),
      moduleId,
      overridesEff
    );
    const previousInputs = siblingOverrideInputs(
      siblings.map((t) => t.id),
      moduleId,
      overridesEff
    );
    const nextOverrides = mergeOverrideInputs(moduleId, overridesEff, inputs);
    persistSnapshot(
      'Orden del alumno actualizado',
      assignmentsEff,
      nextOverrides,
      () => setSyllabusTopicOverrides(moduleId, previousInputs)
    );
    void runPersist(() => setSyllabusTopicOverrides(moduleId, inputs), assignmentsEff, overridesEff);
  };

  const handleToggleModuleVisible = (moduleId: string, nextVisible: boolean) => {
    const nextAssignments = assignmentsWithModuleVisibility(assignmentsEff, moduleId, nextVisible);
    persistSnapshot(
      nextVisible ? 'Módulo visible para alumnos' : 'Módulo oculto a alumnos',
      nextAssignments,
      overridesEff,
      () => setCourseModuleVisible(moduleId, !nextVisible)
    );
    void runPersist(() => setCourseModuleVisible(moduleId, nextVisible), assignmentsEff, overridesEff);
  };

  const handleToggleTopicVisible = (moduleId: string, topic: Topic, siblings: Topic[], nextVisible: boolean) => {
    const input = visibilityOverrideInput(topic.id, nextVisible, siblings, moduleId, overridesEff);
    const previous = visibilityOverrideInput(topic.id, !nextVisible, siblings, moduleId, overridesEff);
    const nextOverrides = mergeOverrideInputs(moduleId, overridesEff, [input]);
    persistSnapshot(
      nextVisible ? 'Tema visible para alumnos' : 'Tema oculto a alumnos',
      assignmentsEff,
      nextOverrides,
      () => setSyllabusTopicOverrides(moduleId, [previous])
    );
    void runPersist(() => setSyllabusTopicOverrides(moduleId, [input]), assignmentsEff, overridesEff);
  };

  const handleQuickAdd = (
    action: SyllabusQuickAddAction,
    ctx: { moduleId: string; moduleTitle: string; topic?: Topic; parentId?: string | null }
  ) => {
    if (action === 'topic') {
      setCreateTopic({ moduleId: ctx.moduleId, moduleTitle: ctx.moduleTitle, parentId: null });
      return;
    }
    if (action === 'subtopic' && ctx.topic) {
      setCreateTopic({
        moduleId: ctx.moduleId,
        moduleTitle: ctx.moduleTitle,
        parentId: ctx.topic.id,
        parentTitle: ctx.topic.title,
      });
      return;
    }
    if (action === 'document' && ctx.topic) {
      setMaterial({ moduleId: ctx.moduleId, topic: ctx.topic, initialTab: 'pdf' });
      return;
    }
    if (action === 'link' && ctx.topic) {
      setMaterial({ moduleId: ctx.moduleId, topic: ctx.topic, initialTab: 'video' });
      return;
    }
    if (action === 'live-class') {
      setLiveClass({ moduleId: ctx.moduleId, topicId: ctx.topic?.id ?? null });
      return;
    }
    if (action === 'quiz' && ctx.topic) {
      navigate(`/colaborador/cuestionario?moduleId=${ctx.moduleId}&topicId=${ctx.topic.id}`, {
        state: { from: location.pathname + location.search },
      });
      return;
    }
    if (action === 'edit' && ctx.topic) {
      const params = new URLSearchParams({
        moduleId: ctx.moduleId,
        topicId: ctx.topic.id,
        action: 'update',
      });
      if (ctx.parentId) params.set('parentId', ctx.parentId);
      navigate(`/colaborador/nueva-revision?${params.toString()}`, {
        state: { from: location.pathname + location.search },
      });
    }
  };

  const setEditModePersist = (next: boolean) => {
    setEditMode(next);
    try {
      sessionStorage.setItem(EDIT_MODE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const isSearching = searchQuery.trim().length >= 2;
  const modalOpen = Boolean(createTopic || material || liveClass);
  const panelRef = useFocusTrap(isOpen && !modalOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (createTopic || material || liveClass) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, createTopic, material, liveClass]);

  const visibleModuleCount = studentGrouped.reduce((sum, g) => sum + g.modules.length, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={editMode ? 'Editar temario del curso' : 'Contenido del curso'}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-[70] w-[85vw] sm:w-80 md:w-96 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
          >
            <div ref={panelRef} className="flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">Curso</h2>
                  <p className="text-[0.65rem] text-slate-400 dark:text-slate-500">
                    {visibleModuleCount} módulos
                    {editMode ? ' · editando temario' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canEditSyllabus && (
                  <button
                    type="button"
                    onClick={() => setEditModePersist(!editMode)}
                    className={`p-2 rounded-lg transition-colors ${
                      editMode
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                    aria-pressed={editMode}
                    title={editMode ? 'Salir de edición' : 'Editar temario'}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Cerrar curso"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {editMode && (
              <div className="px-4 py-2 border-b border-blue-100 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-950/30 text-[11px] text-blue-800 dark:text-blue-200 font-medium">
                Arrastra para reordenar. El alumno recorre este mismo orden. Los documentos y links se cuelgan del tema, no del árbol.
              </div>
            )}

            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/40 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar en el temario..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-700 dark:text-slate-200"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3" style={{ WebkitOverflowScrolling: 'touch' }}>
              {isSearching ? (
                <div className="space-y-0.5">
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No se encontraron temas</p>
                  ) : (
                    searchResults.map((r) => (
                      <Link
                        key={r.id}
                        to={lessonHrefWithQuery(r.href ?? `/modulo/${r.moduleId}`, searchQuery)}
                        className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors min-h-[44px]"
                      >
                        <span className="text-base flex-shrink-0 mt-0.5">
                          {emojiByModule.get(r.moduleId ?? '') ?? '📘'}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-slate-700 dark:text-slate-300 leading-snug">{r.title}</span>
                          {r.breadcrumb && (
                            <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate">
                              {r.breadcrumb}
                            </span>
                          )}
                          {r.snippet && (
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                              <HighlightedSearchText text={r.snippet} query={searchQuery} />
                            </span>
                          )}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              ) : editMode ? (
                <CourseSyllabusEditorTree
                  grouped={staffGrouped}
                  overrides={overridesEff}
                  pathname={location.pathname}
                  currentModuleId={currentModuleId}
                  expandedModules={expandedModules}
                  hasQuiz={hasQuiz}
                  busy={busy}
                  onToggleModule={toggleModule}
                  onReorderModules={handleReorderModules}
                  onReorderTopics={handleReorderTopics}
                  onToggleModuleVisible={handleToggleModuleVisible}
                  onToggleTopicVisible={handleToggleTopicVisible}
                  onQuickAdd={handleQuickAdd}
                />
              ) : (
                <div className="space-y-4">
                  {studentGrouped.map(({ course, modules }) => {
                    if (!modules.length) return null;
                    const courseLocked = !hasCourseAccess(course.id);
                    return (
                      <div key={course.id}>
                        <div className="px-3 py-1.5 mb-1 flex items-center gap-2">
                          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {course.title}
                          </p>
                          {courseLocked && <Lock className="w-3 h-3 text-amber-500" />}
                        </div>
                        <div className="space-y-1">
                  {modules.map((mod) => {
                    const isExpanded = expandedModules.has(mod.id);
                    const isCurrent = currentModuleId === mod.id;
                    const access = moduleAccess.get(mod.id);
                    const isFree = access?.required_tier === 'free';
                    const assignedCourse = getCourseIdForModule(assignmentsEff, mod.id);
                    const isLocked = !isFree && !(assignedCourse ? hasCourseAccess(assignedCourse as CourseId) : hasPremiumAccess);

                    return (
                      <div key={mod.id}>
                        <button
                          onClick={() => toggleModule(mod.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all min-h-[44px] ${
                            isCurrent
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <span className="text-base flex-shrink-0">{mod.emoji}</span>
                          <span className={`flex-1 text-left leading-snug ${isCurrent ? 'font-semibold' : 'font-medium'}`}>
                            {mod.title}
                          </span>
                          {isLocked && <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mr-1" />}
                          {moduleQuizCount(mod.id) > 0 && (
                            <QuizTopicBadge compact />
                          )}
                          <span className="text-[0.6rem] text-slate-400 dark:text-slate-500 font-mono flex-shrink-0 mr-1">
                            {(() => {
                              const s = getModuleStats(mod.topics);
                              return s.completed > 0 ? `${s.completed}/${s.total}` : `${s.total}`;
                            })()}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-4 pl-3 border-l-2 border-slate-200/60 dark:border-slate-700/40 space-y-0.5 py-1">
                                {mod.topics.map((topic) => {
                                  const topicUrl = `/modulo/${mod.id}/${topic.id}`;
                                  const isActive = location.pathname.startsWith(topicUrl);
                                  const done = isCompleted(topic.id);

                                  return (
                                    <Link
                                      key={topic.id}
                                      to={topicUrl}
                                      className={`block px-3 py-2 rounded-lg text-[0.8rem] sm:text-sm transition-all min-h-[40px] flex items-center gap-2 ${
                                        isActive
                                          ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border-l-2 border-blue-500 -ml-[2px] pl-[14px]'
                                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                                      }`}
                                    >
                                      {done ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                      ) : (
                                        <Circle className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                                      )}
                                      <span className={`leading-snug flex-1 ${done ? 'font-medium text-slate-800 dark:text-slate-200' : ''}`}>
                                        {topic.title}
                                      </span>
                                      {topicTreeHasQuiz(topic, hasQuiz) && <QuizTopicBadge compact />}
                                    </Link>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </nav>

            {undo && (
              <div className="flex-shrink-0 px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2">
                <p className="flex-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">{undo.label}</p>
                <button
                  type="button"
                  onClick={() => void handleUndo()}
                  className="text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:underline"
                >
                  Deshacer
                </button>
              </div>
            )}

            <div className="flex-shrink-0 px-4 py-3 border-t border-slate-100 dark:border-slate-800/40 space-y-2">
              {editMode ? (
                <Link
                  to="/admin/temario"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-semibold min-h-[44px]"
                >
                  <ListTree className="w-4 h-4" />
                  Organizador completo
                </Link>
              ) : (
                <Link
                  to="/portal?tab=modules"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all font-semibold min-h-[44px]"
                >
                  <BookOpen className="w-4 h-4" />
                  Ir a mis clases
                </Link>
              )}
            </div>
            </div>
          </motion.aside>

          {createTopic && (
            <QuickCreateTopicModal
              isOpen
              onClose={() => setCreateTopic(null)}
              moduleId={createTopic.moduleId}
              moduleTitle={createTopic.moduleTitle}
              parentId={createTopic.parentId}
              parentTitle={createTopic.parentTitle}
              onSuccess={async () => {
                await reload();
                setCreateTopic(null);
              }}
            />
          )}
          {material && (
            <QuickTopicMaterialModal
              isOpen
              onClose={() => setMaterial(null)}
              moduleId={material.moduleId}
              topic={material.topic}
              initialTab={material.initialTab}
              onSuccess={() => {
                void reload();
                setMaterial(null);
              }}
            />
          )}
          {liveClass && (
            <CreateLiveClassModal
              isOpen
              onClose={() => setLiveClass(null)}
              initialModuleId={liveClass.moduleId}
              initialTopicId={liveClass.topicId}
              onSuccess={async () => {
                setLiveClass(null);
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
