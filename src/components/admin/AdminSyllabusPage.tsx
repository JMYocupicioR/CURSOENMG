import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ListTree,
  Trash2,
  AlertTriangle,
  Edit3,
  ExternalLink,
  Plus,
  MoreHorizontal,
  GraduationCap,
  PackageOpen,
  ArrowUpDown,
  Layers,
  Settings,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useSyllabusCatalog } from '../../hooks/useSyllabusCatalog';
import { QuickCreateTopicModal } from './QuickCreateTopicModal';
import { CourseEditorModal, type CourseEditorSavePayload } from './CourseEditorModal';
import AssignExamModal from './AssignExamModal';
import { SortableList } from '../common/SortableList';
import {
  assignModuleToCourse,
  createCourse,
  deleteCourse,
  getUpcomingWorkshops,
  reorderCourseModules,
  setCourseModuleVisible,
  setSyllabusTopicOverrides,
  updateCourseMetadata,
} from '../../services/courseService';
import type { Course, CourseId, LiveWorkshop } from '../../types/database';
import type { Module, Topic } from '../../types/content';
import { allModules } from '../../content/modules';
import { nextCourseSortOrder } from '../../content/courseCatalog';
import { moveItem, siblingOverrideInputs } from '../../utils/syllabusTree';

export default function AdminSyllabusPage() {
  const { courses, assignments, grouped, unassigned, overrides, reload, modulesForStaff } = useSyllabusCatalog();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<CourseId | null>(null);
  const [metaExpanded, setMetaExpanded] = useState(false);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [editCourseModalOpen, setEditCourseModalOpen] = useState(false);
  const [adminWorkshops, setAdminWorkshops] = useState<LiveWorkshop[]>([]);
  const [moduleMenuId, setModuleMenuId] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<{
    id: CourseId;
    title: string;
    moduleCount: number;
    moduleTitles: string[];
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void getUpcomingWorkshops().then(setAdminWorkshops);
  }, []);

  const [reorderConfirm, setReorderConfirm] = useState<{
    title: string;
    itemType: 'módulo' | 'tema' | 'subtema';
    direction: 'arriba' | 'abajo';
    fromPosition: number;
    toPosition: number;
    onConfirm: () => void;
  } | null>(null);

  const [createTopicState, setCreateTopicState] = useState<{
    isOpen: boolean;
    moduleId: string;
    moduleTitle?: string;
    parentId?: string | null;
    parentTitle?: string | null;
  }>({
    isOpen: false,
    moduleId: '',
  });

  const [examModalState, setExamModalState] = useState<{
    isOpen: boolean;
    courseId?: string;
    moduleId?: string;
    topicId?: string;
    subtopicId?: string;
  }>({
    isOpen: false,
  });

  const handleOpenAssignExam = (moduleId: string, topicId?: string, subtopicId?: string) => {
    setExamModalState({
      isOpen: true,
      courseId: selectedCourse?.id,
      moduleId,
      topicId,
      subtopicId,
    });
  };

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'es')),
    [courses]
  );

  const moduleById = useMemo(() => new Map(modulesForStaff.map((m) => [m.id, m])), [modulesForStaff]);

  useEffect(() => {
    if (!sortedCourses.length) {
      setSelectedCourseId(null);
      return;
    }
    if (!selectedCourseId || !sortedCourses.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId(sortedCourses[0].id);
    }
  }, [sortedCourses, selectedCourseId]);

  useEffect(() => {
    if (!moduleMenuId) return;
    const close = () => setModuleMenuId(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
    return () => document.removeEventListener('mousedown', close);
  }, [moduleMenuId]);

  const selectedCourse = sortedCourses.find((course) => course.id === selectedCourseId) ?? null;
  const selectedGrouped = grouped.find((entry) => entry.course.id === selectedCourseId);

  const run = async (key: string, fn: () => Promise<void>, success?: string) => {
    setBusyKey(key);
    setError(null);
    try {
      await fn();
      await reload();
      if (success) {
        setSuccessMsg(success);
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el temario');
    } finally {
      setBusyKey(null);
    }
  };

  const rowsForCourse = (courseId: CourseId) =>
    assignments
      .filter((a) => a.course_id === courseId && moduleById.has(a.module_id))
      .sort((a, b) => a.sort_order - b.sort_order || a.module_id.localeCompare(b.module_id))
      .map((a) => ({ assignment: a, mod: moduleById.get(a.module_id)! }));

  const topicRowsForModule = (mod: Module) =>
    mod.topics
      .map((topic, index) => {
        const ov = overrides.find((o) => o.module_id === mod.id && o.topic_id === topic.id);
        return { topic, index, order: ov?.sort_order ?? index, visible: ov?.is_visible ?? true };
      })
      .sort((a, b) => a.order - b.order || a.index - b.index);

  const nextSortOrder = (courseId: CourseId) =>
    assignments.filter((a) => a.course_id === courseId).reduce((max, a) => Math.max(max, a.sort_order), 0) + 1;

  const handleSaveCourseModal = async (payload: CourseEditorSavePayload) => {
    if (payload.id && selectedCourse && payload.id === selectedCourse.id) {
      await run(`meta-${selectedCourse.id}`, async () => {
        await updateCourseMetadata(selectedCourse.id, {
          title: payload.title,
          description: payload.description,
          price_display: payload.price_display,
          is_active: payload.is_active,
          is_sellable: payload.is_sellable,
          instructor_name: payload.instructor_name,
          instructor_title: payload.instructor_title,
          live_meeting_url: payload.live_meeting_url,
          live_schedule_notes: payload.live_schedule_notes,
          active_workshop_id: payload.active_workshop_id,
          syllabus_brochure_url: payload.syllabus_brochure_url,
          min_passing_grade: payload.min_passing_grade,
        });

        if (payload.selectedModuleIds) {
          const currentModIds = rowsForCourse(selectedCourse.id).map((r) => r.assignment.module_id);
          const toAdd = payload.selectedModuleIds.filter((id) => !currentModIds.includes(id));
          for (let i = 0; i < toAdd.length; i++) {
            await assignModuleToCourse(toAdd[i], selectedCourse.id, nextSortOrder(selectedCourse.id) + i, true);
          }
        }
      }, `Curso "${payload.title}" actualizado con éxito.`);
    } else if (payload.id) {
      setBusyKey('create-course');
      try {
        const created = await createCourse({
          id: payload.id,
          title: payload.title,
          description: payload.description,
          price_display: payload.price_display,
          is_active: payload.is_active,
          is_sellable: payload.is_sellable,
          sort_order: nextCourseSortOrder(courses),
        });

        await updateCourseMetadata(created.id, {
          instructor_name: payload.instructor_name,
          instructor_title: payload.instructor_title,
          live_meeting_url: payload.live_meeting_url,
          live_schedule_notes: payload.live_schedule_notes,
          active_workshop_id: payload.active_workshop_id,
          syllabus_brochure_url: payload.syllabus_brochure_url,
          min_passing_grade: payload.min_passing_grade,
        });

        if (payload.selectedModuleIds?.length) {
          for (let i = 0; i < payload.selectedModuleIds.length; i++) {
            await assignModuleToCourse(payload.selectedModuleIds[i], created.id, i + 1, true);
          }
        }

        await reload();
        setSelectedCourseId(created.id);
        setSuccessMsg(`Curso "${created.title}" creado con éxito.`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } finally {
        setBusyKey(null);
      }
    }
  };

  const reorderModules = (courseId: CourseId, from: number, to: number) => {
    const ids = rowsForCourse(courseId).map((row) => row.assignment.module_id);
    const swapped = moveItem(ids, from, to);
    void run(`reorder-${courseId}`, () => reorderCourseModules(courseId, swapped));
  };

  const moveTopic = (moduleId: string, topicId: string, direction: -1 | 1) => {
    const mod = moduleById.get(moduleId);
    if (!mod) return;
    const rows = topicRowsForModule(mod);
    const idx = rows.findIndex((r) => r.topic.id === topicId);
    const next = idx + direction;
    if (idx < 0 || next < 0 || next >= rows.length) return;
    const swapped = [...rows];
    [swapped[idx], swapped[next]] = [swapped[next], swapped[idx]];
    void run(
      `topic-${topicId}`,
      () =>
        setSyllabusTopicOverrides(
          moduleId,
          swapped.map((r, i) => ({ topic_id: r.topic.id, sort_order: i, is_visible: r.visible }))
        )
    );
  };

  const moveSiblings = (moduleId: string, siblings: Topic[], topicId: string, direction: -1 | 1) => {
    const idx = siblings.findIndex((topic) => topic.id === topicId);
    const next = idx + direction;
    if (idx < 0 || next < 0 || next >= siblings.length) return;
    const swapped = moveItem(siblings, idx, next);
    void run(`topic-${topicId}`, () =>
      setSyllabusTopicOverrides(moduleId, siblingOverrideInputs(swapped.map((topic) => topic.id), moduleId, overrides))
    );
  };

  const requestReorderModule = (modTitle: string, courseId: CourseId, from: number, to: number) => {
    const direction = to < from ? 'arriba' : 'abajo';
    setReorderConfirm({
      title: modTitle,
      itemType: 'módulo',
      direction,
      fromPosition: from + 1,
      toPosition: to + 1,
      onConfirm: () => reorderModules(courseId, from, to),
    });
  };

  const requestMoveTopic = (topicTitle: string, moduleId: string, topicId: string, direction: -1 | 1) => {
    const mod = moduleById.get(moduleId);
    if (!mod) return;
    const rows = topicRowsForModule(mod);
    const idx = rows.findIndex((r) => r.topic.id === topicId);
    if (idx < 0) return;
    const next = idx + direction;
    if (next < 0 || next >= rows.length) return;

    setReorderConfirm({
      title: topicTitle,
      itemType: 'tema',
      direction: direction === -1 ? 'arriba' : 'abajo',
      fromPosition: idx + 1,
      toPosition: next + 1,
      onConfirm: () => moveTopic(moduleId, topicId, direction),
    });
  };

  const requestMoveSibling = (
    subTitle: string,
    moduleId: string,
    siblings: Topic[],
    topicId: string,
    direction: -1 | 1
  ) => {
    const idx = siblings.findIndex((t) => t.id === topicId);
    if (idx < 0) return;
    const next = idx + direction;
    if (next < 0 || next >= siblings.length) return;

    setReorderConfirm({
      title: subTitle,
      itemType: 'subtema',
      direction: direction === -1 ? 'arriba' : 'abajo',
      fromPosition: idx + 1,
      toPosition: next + 1,
      onConfirm: () => moveSiblings(moduleId, siblings, topicId, direction),
    });
  };

  const toggleTopicVisible = (moduleId: string, topicId: string, currentlyVisible: boolean, sortOrder: number) => {
    void run(`hide-${topicId}`, () =>
      setSyllabusTopicOverrides(moduleId, [
        { topic_id: topicId, sort_order: sortOrder, is_visible: !currentlyVisible },
      ])
    );
  };

  const handleRequestDelete = (course: Course) => {
    const rows = rowsForCourse(course.id);
    setCourseToDelete({
      id: course.id,
      title: course.title,
      moduleCount: rows.length,
      moduleTitles: rows.map((r) => `${r.mod.emoji} ${r.mod.title}`),
    });
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await deleteCourse(courseToDelete.id);
      const deletedTitle = courseToDelete.title;
      setCourseToDelete(null);
      await reload();
      setSuccessMsg(`El curso "${deletedTitle}" fue eliminado. Los módulos pasaron a "Sin asignar".`);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el curso');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenCreateModal = (
    moduleId: string,
    moduleTitle?: string,
    parentId?: string | null,
    parentTitle?: string | null
  ) => {
    setCreateTopicState({
      isOpen: true,
      moduleId,
      moduleTitle,
      parentId,
      parentTitle,
    });
  };

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const assignableCourses = sortedCourses.filter((course) => course.id !== selectedCourseId);

  return (
    <AdminLayout
      title="Organizador del temario"
      subtitle="Administra el catálogo de cursos, asigna módulos, reordena el temario y edita la ficha comercial."
    >
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setCreateCourseOpen(true)}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nuevo curso
        </button>
        <Link
          to="/cursos"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <ExternalLink className="w-4 h-4" />
          Ver catálogo público
        </Link>
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold"
        >
          <ListTree className="w-4 h-4" />
          {preview ? 'Salir de vista previa' : 'Ver temario como alumno'}
        </button>
        {busyKey && <span className="text-xs text-slate-500">Guardando…</span>}
        {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
        {successMsg && (
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 rounded-xl animate-fadeIn">
            ✓ {successMsg}
          </p>
        )}
      </div>

      {preview && (
        <div className="mb-8 p-5 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20">
          <p className="text-sm font-bold mb-3">Así verá el alumno el temario (módulos visibles)</p>
          {grouped.map(({ course, modules }) => (
            <div key={course.id} className="mb-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">{course.title}</p>
              <ul className="mt-1 space-y-1">
                {modules.map((mod) => (
                  <li key={mod.id} className="text-sm">
                    {mod.emoji} {mod.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,280px)_1fr] gap-6 items-start">
        {/* Course rail */}
        <aside className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cursos</h2>
            <span className="text-[10px] font-bold text-slate-400">{sortedCourses.length}</span>
          </div>
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
            {sortedCourses.map((course) => {
              const moduleCount = rowsForCourse(course.id).length;
              const active = course.id === selectedCourseId;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition cursor-pointer ${
                    active
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 shadow-xs'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <GraduationCap
                      className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-400'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate ${active ? 'text-blue-900 dark:text-cyan-100' : 'text-slate-800 dark:text-slate-200'}`}>
                        {course.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {moduleCount} módulo{moduleCount === 1 ? '' : 's'}
                        {!course.is_active && ' · Inactivo'}
                        {!course.is_sellable && ' · Incluido'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <PackageOpen className="w-3.5 h-3.5" />
                Sin asignar
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                {unassigned.length}
              </span>
            </div>
            {unassigned.length === 0 ? (
              <p className="text-xs text-slate-500">Todos los módulos tienen curso.</p>
            ) : (
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {unassigned.map((mod) => (
                  <li key={mod.id} className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="line-clamp-2 break-words leading-tight flex-1 min-w-0" title={mod.title}>
                      {mod.emoji} {mod.title}
                    </span>
                    {selectedCourseId && (
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() =>
                          void run(`assign-${mod.id}`, () =>
                            assignModuleToCourse(mod.id, selectedCourseId, nextSortOrder(selectedCourseId), true)
                          )
                        }
                        className="shrink-0 px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        + Aquí
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Detail panel */}
        <section className="min-w-0">
          {!selectedCourse ? (
            <div className="p-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Aún no hay cursos</p>
              <p className="text-xs text-slate-500 mb-4">Crea el primer curso para empezar a organizar el temario.</p>
              <button
                type="button"
                onClick={() => setCreateCourseOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Crear curso
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <CourseMetaForm
                course={selectedCourse}
                expanded={metaExpanded}
                onToggleExpanded={() => setMetaExpanded((v) => !v)}
                onOpenEditorModal={() => setEditCourseModalOpen(true)}
                busy={busyKey === `meta-${selectedCourse.id}`}
                onSave={(payload) =>
                  run(`meta-${selectedCourse.id}`, () => updateCourseMetadata(selectedCourse.id, payload))
                }
                onDelete={() => handleRequestDelete(selectedCourse)}
              />

              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-cyan-400 shadow-2xs shrink-0">
                      <ListTree className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Temario del curso</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Arrastra para reordenar o usa las flechas. Expande un módulo para ver temas y subtemas.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-cyan-400" />
                    {selectedGrouped?.rows.length ?? 0} {selectedGrouped?.rows.length === 1 ? 'módulo' : 'módulos'}
                  </span>
                </div>

                {(selectedGrouped?.rows.length ?? 0) === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Este curso no tiene módulos
                    </p>
                    <p className="text-xs text-slate-500 mb-3">
                      Asigna módulos desde la bandeja &quot;Sin asignar&quot; o muévelos desde otro curso.
                    </p>
                    {unassigned.length > 0 && (
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() => {
                          const mod = unassigned[0];
                          void run(`assign-${mod.id}`, () =>
                            assignModuleToCourse(mod.id, selectedCourse.id, nextSortOrder(selectedCourse.id), true)
                          );
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Asignar &quot;{unassigned[0].title}&quot;
                      </button>
                    )}
                  </div>
                ) : (
                  <SortableList
                    items={rowsForCourse(selectedCourse.id)}
                    getId={(row) => row.mod.id}
                    disabled={busyKey !== null}
                    onReorder={(from, to) => reorderModules(selectedCourse.id, from, to)}
                    renderItem={(row, handle, index) => {
                      const moduleRows = rowsForCourse(selectedCourse.id);
                      const { assignment, mod } = row;
                      const visible = assignment.is_visible;
                      const isOpen = expandedModules.has(mod.id);
                      const topicCount = topicRowsForModule(mod).length;
                      return (
                        <div
                          className={`mb-3 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
                            isOpen
                              ? 'border-blue-400/60 dark:border-blue-500/50 bg-blue-50/20 dark:bg-slate-800/70 shadow-sm ring-1 ring-blue-500/15'
                              : 'border-slate-200/90 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600/80 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 shadow-2xs'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Module Header / Title Trigger */}
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              <div className="pt-1 sm:pt-0 shrink-0">{handle}</div>
                              <button
                                type="button"
                                className="flex flex-1 min-w-0 items-start sm:items-center gap-3 text-left cursor-pointer group"
                                onClick={() => toggleModuleExpanded(mod.id)}
                              >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl bg-slate-100/90 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-600/40 shadow-2xs group-hover:scale-105 transition-transform">
                                  {mod.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`font-bold text-sm leading-snug break-words text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors ${
                                        visible ? '' : 'opacity-50'
                                      }`}
                                    >
                                      {mod.title}
                                    </span>
                                    {!visible && (
                                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-full px-2 py-0.5 shadow-2xs shrink-0">
                                        <EyeOff className="w-2.5 h-2.5" />
                                        Oculto
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Right status badges & Chevron (desktop badge inline) */}
                                <div className="flex items-center gap-2 shrink-0 ml-1">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50/90 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-cyan-300 dark:border-blue-800/60 shadow-2xs hidden sm:inline-flex">
                                    <Layers className="w-3 h-3 text-blue-500 dark:text-cyan-400" />
                                    {topicCount} {topicCount === 1 ? 'tema' : 'temas'}
                                  </span>
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-cyan-400 group-hover:bg-blue-50 dark:group-hover:bg-slate-700/60 transition-all">
                                    {isOpen ? (
                                      <ChevronUp className="w-4 h-4 shrink-0" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 shrink-0" />
                                    )}
                                  </div>
                                </div>
                              </button>
                            </div>

                            {/* Sub-row with count and actions on mobile, inline on desktop */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 pl-7 sm:pl-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-slate-700/50">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50/90 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-cyan-300 dark:border-blue-800/60 shadow-2xs sm:hidden">
                                <Layers className="w-3 h-3 text-blue-500 dark:text-cyan-400" />
                                {topicCount} {topicCount === 1 ? 'tema' : 'temas'}
                              </span>

                              <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                                <div className="relative">
                                  <button
                                    type="button"
                                    aria-label="Acciones del módulo"
                                    className="p-2 sm:p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/80 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:bg-slate-700/60 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 dark:hover:border-slate-600 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setModuleMenuId((current) => (current === mod.id ? null : mod.id));
                                    }}
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {moduleMenuId === mod.id && (
                                    <div
                                      className="absolute right-0 top-full mt-1 z-20 min-w-[200px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1"
                                      onMouseDown={(event) => event.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                                        disabled={busyKey !== null}
                                        onClick={() => {
                                          setModuleMenuId(null);
                                          void run(`vis-${mod.id}`, () => setCourseModuleVisible(mod.id, !visible));
                                        }}
                                      >
                                        {visible ? 'Ocultar módulo' : 'Mostrar módulo'}
                                      </button>
                                      {assignableCourses.map((course) => (
                                        <button
                                          key={course.id}
                                          type="button"
                                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                                          disabled={busyKey !== null}
                                          onClick={() => {
                                            setModuleMenuId(null);
                                            void run(`move-${mod.id}`, () =>
                                              assignModuleToCourse(mod.id, course.id, nextSortOrder(course.id), visible)
                                            );
                                          }}
                                        >
                                          Mover a {course.title}
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                        disabled={busyKey !== null}
                                        onClick={() => {
                                          setModuleMenuId(null);
                                          const ok = window.confirm(
                                            `¿Quitar "${mod.title}" del curso? Pasará a "Sin asignar".`
                                          );
                                          if (!ok) return;
                                          void run(`move-${mod.id}`, () => assignModuleToCourse(mod.id, null, 0, visible));
                                        }}
                                      >
                                        Quitar del curso
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  className="p-2 sm:p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/80 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:bg-slate-700/60 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 dark:hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                                  aria-label="Subir módulo"
                                  disabled={busyKey !== null || index === 0}
                                  onClick={() => requestReorderModule(mod.title, selectedCourse.id, index, index - 1)}
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  className="p-2 sm:p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/80 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:bg-slate-700/60 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 dark:hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                                  aria-label="Bajar módulo"
                                  disabled={busyKey !== null || index === moduleRows.length - 1}
                                  onClick={() => requestReorderModule(mod.title, selectedCourse.id, index, index + 1)}
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {isOpen && (
                            <ModuleTopicsPanel
                              mod={mod}
                              busy={busyKey !== null}
                              overrides={overrides}
                              topicRows={topicRowsForModule(mod)}
                              onCreateTopic={() => handleOpenCreateModal(mod.id, mod.title, null, null)}
                              onCreateSubtopic={(topic) =>
                                handleOpenCreateModal(mod.id, mod.title, topic.id, topic.title)
                              }
                              onAssignExam={(topic, sub) => handleOpenAssignExam(mod.id, topic.id, sub?.id)}
                              onMoveTopic={(topic, direction) => requestMoveTopic(topic.title, mod.id, topic.id, direction)}
                              onMoveSibling={(sub, siblings, topicId, direction) =>
                                requestMoveSibling(sub.title, mod.id, siblings, topicId, direction)
                              }
                              onToggleTopicVisible={(topicId, topicVisible, order) =>
                                toggleTopicVisible(mod.id, topicId, topicVisible, order)
                              }
                            />
                          )}
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {courseToDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-title"
        >
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                  Confirmación de eliminación
                </span>
                <h3 id="modal-delete-title" className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                  ¿Eliminar &quot;{courseToDelete.title}&quot;?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">ID: {courseToDelete.id}</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <p>Esta acción eliminará el curso del catálogo y de la base de datos.</p>
              {courseToDelete.moduleCount > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {courseToDelete.moduleCount} módulo(s) asignado(s):
                  </p>
                  <ul className="pl-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-400 max-h-32 overflow-y-auto">
                    {courseToDelete.moduleTitles.map((title, i) => (
                      <li key={i} className="truncate">
                        • {title}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 p-2 rounded-lg mt-2">
                    Los módulos no se borran: pasan a <strong>Sin asignar</strong>.
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 italic">Este curso no tiene módulos asignados.</p>
              )}
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                También se limpiarán referencias en constancias y listas de espera.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setCourseToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Eliminando…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Sí, eliminar curso
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {reorderConfirm && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-reorder-title"
        >
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-cyan-400 shrink-0">
                <ArrowUpDown className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-cyan-400">
                  Confirmar reordenamiento
                </span>
                <h3 id="modal-reorder-title" className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                  ¿Mover {reorderConfirm.itemType} hacia {reorderConfirm.direction}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium break-words">
                  {reorderConfirm.itemType.charAt(0).toUpperCase() + reorderConfirm.itemType.slice(1)}: <span className="font-bold text-slate-800 dark:text-slate-200">&ldquo;{reorderConfirm.title}&rdquo;</span>
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/60 font-semibold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                  Posición {reorderConfirm.fromPosition}
                </span>
                <span className="text-blue-500 dark:text-cyan-400 font-black text-sm">➔</span>
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-cyan-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-cyan-400" />
                  Posición {reorderConfirm.toPosition}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Esta acción modificará el orden en que los alumnos recorren este contenido en el diplomado.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReorderConfirm(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  reorderConfirm.onConfirm();
                  setReorderConfirm(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sí, mover {reorderConfirm.direction}
              </button>
            </div>
          </div>
        </div>
      )}

      <CourseEditorModal
        isOpen={createCourseOpen || editCourseModalOpen}
        onClose={() => {
          setCreateCourseOpen(false);
          setEditCourseModalOpen(false);
        }}
        course={editCourseModalOpen ? selectedCourse : null}
        allCourses={courses}
        allModules={allModules}
        assignedModuleIds={selectedCourse ? rowsForCourse(selectedCourse.id).map((r) => r.assignment.module_id) : []}
        workshops={adminWorkshops}
        onSave={handleSaveCourseModal}
        onDelete={editCourseModalOpen && selectedCourse ? () => handleRequestDelete(selectedCourse) : undefined}
      />

      <QuickCreateTopicModal
        isOpen={createTopicState.isOpen}
        onClose={() => setCreateTopicState((prev) => ({ ...prev, isOpen: false }))}
        moduleId={createTopicState.moduleId}
        moduleTitle={createTopicState.moduleTitle}
        parentId={createTopicState.parentId}
        parentTitle={createTopicState.parentTitle}
        onSuccess={async (createdTopicId) => {
          await reload();
          setSuccessMsg(`Tema "${createdTopicId}" creado y publicado en el temario.`);
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />

      <AssignExamModal
        isOpen={examModalState.isOpen}
        onClose={() => setExamModalState((prev) => ({ ...prev, isOpen: false }))}
        initialCourseId={examModalState.courseId}
        initialModuleId={examModalState.moduleId}
        initialTopicId={examModalState.topicId}
        initialSubtopicId={examModalState.subtopicId}
        onAssigned={async () => {
          setExamModalState((prev) => ({ ...prev, isOpen: false }));
          setSuccessMsg('Examen final creado y enviado exitosamente a los alumnos.');
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />
    </AdminLayout>
  );
}

function CourseMetaForm({
  course,
  expanded,
  onToggleExpanded,
  onOpenEditorModal,
  busy,
  onSave,
  onDelete,
}: {
  course: Course;
  expanded: boolean;
  onToggleExpanded: () => void;
  onOpenEditorModal: () => void;
  busy: boolean;
  onSave: (payload: Partial<Omit<Course, 'id' | 'updated_at' | 'updated_by'>>) => void;
  onDelete: () => void;
}) {
  const [localTitle, setLocalTitle] = useState(course.title);
  const [localDesc, setLocalDesc] = useState(course.description);
  const [localPrice, setLocalPrice] = useState(course.price_display ?? '');
  const [localActive, setLocalActive] = useState(course.is_active);
  const [localSellable, setLocalSellable] = useState(course.is_sellable);
  const [localInstructorName, setLocalInstructorName] = useState(course.instructor_name ?? 'Dr. Juan Marcos Yocupicio Robles');
  const [localInstructorTitle, setLocalInstructorTitle] = useState(course.instructor_title ?? 'Especialista en Neurofisiología Clínica');
  const [localLiveMeetingUrl, setLocalLiveMeetingUrl] = useState(course.live_meeting_url ?? '');
  const [localLiveScheduleNotes, setLocalLiveScheduleNotes] = useState(course.live_schedule_notes ?? '');
  const [localSyllabusBrochureUrl, setLocalSyllabusBrochureUrl] = useState(course.syllabus_brochure_url ?? '');
  const [localMinPassingGrade, setLocalMinPassingGrade] = useState(course.min_passing_grade ?? 80);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const pricePresets = ['$4,500 MXN', '$3,500 MXN', '$2,500 MXN', 'Consultar', 'Beca 100%'];

  useEffect(() => {
    setLocalTitle(course.title);
    setLocalDesc(course.description);
    setLocalPrice(course.price_display ?? '');
    setLocalActive(course.is_active);
    setLocalSellable(course.is_sellable);
    setLocalInstructorName(course.instructor_name ?? 'Dr. Juan Marcos Yocupicio Robles');
    setLocalInstructorTitle(course.instructor_title ?? 'Especialista en Neurofisiología Clínica');
    setLocalLiveMeetingUrl(course.live_meeting_url ?? '');
    setLocalLiveScheduleNotes(course.live_schedule_notes ?? '');
    setLocalSyllabusBrochureUrl(course.syllabus_brochure_url ?? '');
    setLocalMinPassingGrade(course.min_passing_grade ?? 80);
    setSavedSuccess(false);
  }, [
    course.id,
    course.title,
    course.description,
    course.price_display,
    course.is_active,
    course.is_sellable,
    course.instructor_name,
    course.instructor_title,
    course.live_meeting_url,
    course.live_schedule_notes,
    course.syllabus_brochure_url,
    course.min_passing_grade,
  ]);

  const dirty =
    localTitle !== course.title ||
    localDesc !== course.description ||
    (localPrice.trim() || null) !== (course.price_display?.trim() || null) ||
    localActive !== course.is_active ||
    localSellable !== course.is_sellable ||
    localInstructorName !== (course.instructor_name ?? 'Dr. Juan Marcos Yocupicio Robles') ||
    localInstructorTitle !== (course.instructor_title ?? 'Especialista en Neurofisiología Clínica') ||
    localLiveMeetingUrl !== (course.live_meeting_url ?? '') ||
    localLiveScheduleNotes !== (course.live_schedule_notes ?? '') ||
    localSyllabusBrochureUrl !== (course.syllabus_brochure_url ?? '') ||
    localMinPassingGrade !== (course.min_passing_grade ?? 80);

  const handleSave = () => {
    onSave({
      title: localTitle,
      description: localDesc,
      price_display: localSellable ? localPrice.trim() || null : null,
      is_active: localActive,
      is_sellable: localSellable,
      instructor_name: localInstructorName.trim() || null,
      instructor_title: localInstructorTitle.trim() || null,
      live_meeting_url: localLiveMeetingUrl.trim() || null,
      live_schedule_notes: localLiveScheduleNotes.trim() || null,
      syllabus_brochure_url: localSyllabusBrochureUrl.trim() || null,
      min_passing_grade: localMinPassingGrade,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpanded();
          }
        }}
        className="w-full flex flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
      >
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400">
            Ficha comercial y operativa
          </span>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 truncate">
            {localTitle}
            {!localActive && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                Inactivo
              </span>
            )}
            {dirty && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Sin guardar
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenEditorModal();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 text-blue-700 dark:text-cyan-300 text-xs font-bold border border-blue-200/80 dark:border-blue-800 transition shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configuración completa (4 pestañas)</span>
          </button>

          {localSellable ? (
            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              {localPrice.trim() || 'Consultar'}
            </span>
          ) : (
            <span className="text-xs text-slate-500">Material incluido</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-4 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Título oficial del curso
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
              />
            </div>
            {localSellable ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Precio mostrado en la web
                </label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold"
                  value={localPrice}
                  onChange={(e) => setLocalPrice(e.target.value)}
                  placeholder="Ej. $4,500 MXN o Consultar"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {pricePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLocalPrice(preset)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic flex items-center">
                Este curso es material de referencia compartido y no tiene precio propio.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Descripción pedagógica pública
            </label>
            <textarea
              className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              rows={3}
              value={localDesc}
              onChange={(e) => setLocalDesc(e.target.value)}
            />
          </div>

          {/* Metadata Operativa en Formulario Inline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Docente Titular
              </label>
              <input
                className="w-full border rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold"
                value={localInstructorName}
                onChange={(e) => setLocalInstructorName(e.target.value)}
                placeholder="Dr. Juan Marcos Yocupicio Robles"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Especialidad / Cargo Docente
              </label>
              <input
                className="w-full border rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                value={localInstructorTitle}
                onChange={(e) => setLocalInstructorTitle(e.target.value)}
                placeholder="Especialista en Neurofisiología Clínica"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Aula Virtual Recurrente (Zoom / Meet)
              </label>
              <input
                type="url"
                className="w-full border rounded-xl px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                value={localLiveMeetingUrl}
                onChange={(e) => setLocalLiveMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Horario Habitual de Transmisión
              </label>
              <input
                type="text"
                className="w-full border rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                value={localLiveScheduleNotes}
                onChange={(e) => setLocalLiveScheduleNotes(e.target.value)}
                placeholder="Jueves 19:00 hrs CDMX"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                URL del Folleto PDF Oficial
              </label>
              <input
                type="url"
                className="w-full border rounded-xl px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                value={localSyllabusBrochureUrl}
                onChange={(e) => setLocalSyllabusBrochureUrl(e.target.value)}
                placeholder="https://.../brochure.pdf"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nota Mínima Aprobatoria (%)
              </label>
              <input
                type="number"
                min={60}
                max={100}
                className="w-full border rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold"
                value={localMinPassingGrade}
                onChange={(e) => setLocalMinPassingGrade(Number(e.target.value) || 80)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={localSellable}
                onChange={(e) => setLocalSellable(e.target.checked)}
                className="w-4 h-4 rounded-md"
              />
              Se vende por separado
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={localActive}
                onChange={(e) => setLocalActive(e.target.checked)}
                className="w-4 h-4 rounded-md"
              />
              Curso activo (visible para aspirantes)
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className="min-h-[40px] px-3.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" />
                Eliminar curso
              </span>
            </button>
            <div className="flex items-center gap-2.5">
              {savedSuccess && !dirty && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">✓ Ficha guardada</span>
              )}
              <button
                type="button"
                disabled={busy || !dirty}
                className="min-h-[40px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                onClick={handleSave}
              >
                {busy ? 'Guardando…' : 'Guardar ficha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModuleTopicsPanel({
  mod,
  busy,
  overrides,
  topicRows,
  onCreateTopic,
  onCreateSubtopic,
  onMoveTopic,
  onMoveSibling,
  onToggleTopicVisible,
  onAssignExam,
}: {
  mod: Module;
  busy: boolean;
  overrides: { module_id: string; topic_id: string; is_visible?: boolean; sort_order?: number }[];
  topicRows: { topic: Topic; order: number; visible: boolean }[];
  onCreateTopic: () => void;
  onCreateSubtopic: (topic: Topic) => void;
  onMoveTopic: (topic: Topic, direction: -1 | 1) => void;
  onMoveSibling: (sub: Topic, siblings: Topic[], topicId: string, direction: -1 | 1) => void;
  onToggleTopicVisible: (topicId: string, visible: boolean, order: number) => void;
  onAssignExam: (topic: Topic, subtopic?: Topic) => void;
}) {
  return (
    <div className="mt-3.5 space-y-2 pt-3.5 border-t border-slate-200/70 dark:border-slate-700/60">
      <ul className="space-y-2">
        {topicRows.map(({ topic, order, visible: topicVisible }, tIndex, tArr) => (
          <li
            key={topic.id}
            className="text-sm p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600/70 transition-all shadow-2xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className={`flex items-start gap-2 min-w-0 flex-1 ${topicVisible ? '' : 'opacity-50'}`}>
                <a
                  href={`/modulo/${mod.id}/${topic.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-xs sm:text-sm leading-snug break-words text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-cyan-400 hover:underline inline-flex items-start gap-1.5 flex-1 group/link"
                >
                  <span className="break-words">{topic.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-blue-500 shrink-0 mt-0.5 transition-colors" />
                </a>
                {!topicVisible && (
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded px-1.5 py-0.5 shrink-0">
                    Oculto
                  </span>
                )}
              </div>
              <div className="flex items-center justify-end gap-1.5 shrink-0 self-end sm:self-auto pt-1 sm:pt-0">
                <button
                  type="button"
                  onClick={() => onAssignExam(topic)}
                  className="px-2.5 py-1.5 rounded-lg border border-purple-300/80 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors inline-flex items-center gap-1 active:scale-95 shadow-2xs cursor-pointer"
                  title="Crear o asignar examen final de este tema"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Examen</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCreateSubtopic(topic)}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-300/80 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors inline-flex items-center gap-1 active:scale-95 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Subtema
                </button>
                <a
                  href={`/colaborador/nueva-revision?moduleId=${mod.id}&topicId=${topic.id}&action=update&from=/admin/temario`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg border border-slate-200/90 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-700/60 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 dark:hover:border-slate-600 transition-all shadow-2xs"
                  title="Editar contenido"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  className="p-1.5 rounded-lg border border-slate-200/90 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-700/60 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 dark:hover:border-slate-600 disabled:opacity-25 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer active:scale-95"
                  disabled={busy || tIndex === 0}
                  aria-label="Subir tema"
                  onClick={() => onMoveTopic(topic, -1)}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg border border-slate-200/90 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-700/60 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 dark:hover:border-slate-600 disabled:opacity-25 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer active:scale-95"
                  disabled={busy || tIndex === tArr.length - 1}
                  aria-label="Bajar tema"
                  onClick={() => onMoveTopic(topic, 1)}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg border border-slate-200/90 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-700/60 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 dark:hover:border-slate-600 disabled:opacity-25 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer active:scale-95"
                  disabled={busy}
                  aria-label={topicVisible ? 'Ocultar tema' : 'Mostrar tema'}
                  onClick={() => onToggleTopicVisible(topic.id, topicVisible, order)}
                >
                  {topicVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>
            </div>
            {topic.children && topic.children.length > 0 && (
              <ul className="mt-2.5 ml-1 sm:ml-3 pl-2.5 sm:pl-3 border-l-2 border-blue-400/40 dark:border-blue-500/30 space-y-1.5">
                {topic.children.map((sub, subIndex, subArr) => {
                  const subVisible =
                    overrides.find((o) => o.module_id === mod.id && o.topic_id === sub.id)?.is_visible ?? true;
                  const subOrder =
                    overrides.find((o) => o.module_id === mod.id && o.topic_id === sub.id)?.sort_order ?? subIndex;
                  return (
                    <li
                      key={sub.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/40 gap-1.5 sm:gap-2 shadow-2xs ${
                        subVisible ? '' : 'opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-1.5 min-w-0 flex-1">
                        <span className="text-blue-500/70 dark:text-cyan-400/70 shrink-0 select-none">↳</span>
                        <a
                          href={`/modulo/${mod.id}/${topic.id}/${sub.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 hover:underline break-words leading-snug flex-1"
                        >
                          {sub.title}
                        </a>
                        {!subVisible && (
                          <span className="text-[9px] uppercase font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded px-1 py-0.2 shrink-0">
                            Oculto
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-1 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => onAssignExam(topic, sub)}
                          className="px-2 py-1 rounded-md border border-purple-200 dark:border-purple-900/50 bg-purple-50/70 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-[11px] font-medium hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors inline-flex items-center gap-1 active:scale-95 shadow-2xs cursor-pointer"
                          title="Crear o asignar examen de este subtema"
                        >
                          <GraduationCap className="w-3 h-3" />
                          <span className="hidden md:inline">Examen</span>
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded-md border border-slate-200/90 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-700/60 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 dark:hover:border-slate-600 disabled:opacity-25 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer active:scale-95"
                          disabled={busy || subIndex === 0}
                          aria-label="Subir subtema"
                          onClick={() => onMoveSibling(sub, topic.children ?? [], sub.id, -1)}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded-md border border-slate-200/90 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-700/60 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 dark:hover:border-slate-600 disabled:opacity-25 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer active:scale-95"
                          disabled={busy || subIndex === subArr.length - 1}
                          aria-label="Bajar subtema"
                          onClick={() => onMoveSibling(sub, topic.children ?? [], sub.id, 1)}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded-md border border-slate-200/90 dark:border-slate-700/80 bg-slate-100/90 dark:bg-slate-700/60 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 dark:hover:border-slate-600 disabled:opacity-25 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer active:scale-95"
                          disabled={busy}
                          aria-label={subVisible ? 'Ocultar subtema' : 'Mostrar subtema'}
                          onClick={() => onToggleTopicVisible(sub.id, subVisible, subOrder)}
                        >
                          {subVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div className="pt-2.5 mt-2 border-t border-dashed border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
        <button
          type="button"
          onClick={onCreateTopic}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-blue-400/80 dark:border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-600 dark:text-cyan-400 text-xs font-bold hover:bg-blue-100/70 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar tema nuevo
        </button>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{topicRows.length} temas</span>
      </div>
    </div>
  );
}
