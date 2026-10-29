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
  ExternalLink,
  Plus,
  MoreHorizontal,
  GraduationCap,
  PackageOpen,
  Layers,
  Settings,
  Search,
  UserPlus,
  Calendar,
  Sparkles,
  X,
  Users,
  SlidersHorizontal,
  Zap,
  Loader2,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useSyllabusCatalog } from '../../hooks/useSyllabusCatalog';
import { useAuth } from '../../contexts/AuthProvider';
import { QuickCreateTopicModal } from './QuickCreateTopicModal';
import {
  CourseEditorModal,
  type CourseEditorSavePayload,
  type CourseEditorTab,
} from './CourseEditorModal';
import {
  TopicConfigDrawer,
  type TopicDrawerTab,
  type TeacherOption,
} from './TopicConfigDrawer';
import AssignExamModal from './AssignExamModal';
import AcademicScheduleManagerModal from './AcademicScheduleManagerModal';
import { AdminQuizEditorModal } from './quiz/AdminQuizEditorModal';
import { CreateLiveClassModal } from './CreateLiveClassModal';
import { SortableList } from '../common/SortableList';
import {
  assignModuleToCourse,
  createCourse,
  createWorkshop,
  deleteCourse,
  getWorkshops,
  reorderCourseModules,
  setCourseModuleVisible,
  setSyllabusTopicOverrides,
  updateCourseMetadata,
  updateWorkshop,
} from '../../services/courseService';
import {
  getAdminProfiles,
  getAllPublishedQuizzes,
  getCourseTeachers,
  updateTopicDirectly,
  deleteTopicDirectly,
} from '../../services/editorialService';
import {
  assignTopicsToTeacher,
  listTopicTeachingCommitments,
  removeTeacherFromTopics,
} from '../../services/topicTeachingService';
import {
  DEFAULT_ACADEMIC_MILESTONES,
  getAcademicMilestones,
  saveMilestone,
} from '../../services/academicScheduleService';
import type {
  Course,
  CourseId,
  LiveWorkshop,
  TopicTeachingCommitment,
} from '../../types/database';
import type { Module, Topic } from '../../types/content';
import type { AcademicMilestone } from '../../types/academicGradebook';
import type { AdminProfileRow } from '../../types/admin';
import { allModules } from '../../content/modules';
import {
  isTopicDeletedOverride,
  nextCourseSortOrder,
} from '../../content/courseCatalog';
import { moveItem, siblingOverrideInputs } from '../../utils/syllabusTree';

type TopicFilterMode = 'all' | 'mine' | 'unassigned' | 'assigned' | 'scheduled' | 'hidden';

const WEEKDAY_OPTIONS: { day: number; label: string }[] = [
  { day: 1, label: 'Lun' },
  { day: 2, label: 'Mar' },
  { day: 3, label: 'Mié' },
  { day: 4, label: 'Jue' },
  { day: 5, label: 'Vie' },
  { day: 6, label: 'Sáb' },
];

function getDefaultFirstSessionDate(): string {
  const d = new Date();
  const diff = (4 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

function computeNextSessionDates(
  startDateStr: string,
  weekdays: number[],
  count: number
): string[] {
  if (!startDateStr || count <= 0) return [];
  const validDays = weekdays.length > 0 ? new Set(weekdays) : new Set([4]);
  const cursor = new Date(`${startDateStr}T12:00:00`);
  if (Number.isNaN(cursor.getTime())) return [];

  const results: string[] = [];
  let safety = 0;
  while (results.length < count && safety < 1500) {
    if (validDays.has(cursor.getDay())) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, '0');
      const dd = String(cursor.getDate()).padStart(2, '0');
      results.push(`${yyyy}-${mm}-${dd}`);
    }
    cursor.setDate(cursor.getDate() + 1);
    safety += 1;
  }
  return results;
}

function getInitials(name: string): string {
  const clean = name.replace(/^(Dr\.|Dra\.|Mtro\.|Mtra\.|Lic\.)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getShortDoctorName(name: string): string {
  const trimmed = name.trim();
  const prefixMatch = trimmed.match(/^(Dr\.|Dra\.|Mtro\.|Mtra\.)\s+/i);
  const prefix = prefixMatch ? prefixMatch[1] + ' ' : '';
  const withoutPrefix = trimmed.replace(/^(Dr\.|Dra\.|Mtro\.|Mtra\.|Lic\.)\s+/i, '').trim();
  const parts = withoutPrefix.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return trimmed;
  // Ej. "Juan Marcos Yocupicio Robles" -> "Dr. J. Yocupicio"
  return `${prefix}${parts[0][0]}. ${parts[parts.length - 2] || parts[1]}`;
}

function collectTopicAndChildrenIds(topic: Topic): string[] {
  const ids = [topic.id];
  if (topic.children?.length) {
    for (const child of topic.children) {
      ids.push(...collectTopicAndChildrenIds(child));
    }
  }
  return ids;
}

export default function AdminSyllabusPage() {
  const { user, profile } = useAuth();
  const {
    courses,
    assignments,
    grouped,
    unassigned,
    overrides,
    reload,
    modulesForStaff,
  } = useSyllabusCatalog();

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<CourseId | null>(null);

  // Course Editor Modal
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [editCourseModalOpen, setEditCourseModalOpen] = useState(false);
  const [templateCourseForClone, setTemplateCourseForClone] = useState<Course | null>(null);
  const [courseModalInitialTab, setCourseModalInitialTab] = useState<CourseEditorTab>('general');

  // Teaching, Schedule & Quiz Data
  const [adminWorkshops, setAdminWorkshops] = useState<LiveWorkshop[]>([]);
  const [commitments, setCommitments] = useState<TopicTeachingCommitment[]>([]);
  const [milestones, setMilestones] = useState<AcademicMilestone[]>(DEFAULT_ACADEMIC_MILESTONES);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<AdminProfileRow[]>([]);
  const [quizTopicIds, setQuizTopicIds] = useState<Set<string>>(new Set());

  // Minimalist Filters, Quick Teacher Assignment & Auto-Schedule Bar
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<TopicFilterMode>('all');
  const [showFacultyBar, setShowFacultyBar] = useState(false);
  const [quickAssignTeacher, setQuickAssignTeacher] = useState<TeacherOption | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [showAutoScheduleBar, setShowAutoScheduleBar] = useState(false);
  const [autoStartDate, setAutoStartDate] = useState<string>(() => getDefaultFirstSessionDate());
  const [autoWeekdays, setAutoWeekdays] = useState<number[]>([4]);
  const [autoTime, setAutoTime] = useState<string>('19:00');
  const [autoDuration, setAutoDuration] = useState<number>(90);
  const [autoScope, setAutoScope] = useState<'unscheduled' | 'all'>('unscheduled');
  const [autoScheduling, setAutoScheduling] = useState(false);

  // Menus & Confirmation Modals
  const [moduleMenuId, setModuleMenuId] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<{
    id: CourseId;
    title: string;
    moduleCount: number;
    moduleTitles: string[];
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [topicToDelete, setTopicToDelete] = useState<{
    moduleId: string;
    moduleTitle: string;
    topicId: string;
    topicTitle: string;
    isSubtopic?: boolean;
  } | null>(null);

  // Active Topic Configuration Drawer
  const [activeTopicDrawer, setActiveTopicDrawer] = useState<{
    moduleId: string;
    topicId: string;
    parentTopicId?: string | null;
    initialTab: TopicDrawerTab;
  } | null>(null);

  // Create Topic / Subtopic Modal
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

  // Exam, Quiz & Live Class Modals
  const [examModalState, setExamModalState] = useState<{
    isOpen: boolean;
    courseId?: string;
    moduleId?: string;
    topicId?: string;
    subtopicId?: string;
  }>({
    isOpen: false,
  });

  const [quizModalState, setQuizModalState] = useState<{
    isOpen: boolean;
    moduleId?: string;
    topicId?: string;
  }>({
    isOpen: false,
  });

  const [classWizardState, setClassWizardState] = useState<{
    isOpen: boolean;
    moduleId?: string;
    topicId?: string | null;
    workshop?: LiveWorkshop | null;
  }>({
    isOpen: false,
  });

  const loadAuxiliaryData = async () => {
    const [workshopRows, commitmentRows, milestoneRows, courseTeachers, profilesList, quizzesList] =
      await Promise.all([
        getWorkshops({ limit: 150 }).catch(() => [] as LiveWorkshop[]),
        listTopicTeachingCommitments().catch(() => [] as TopicTeachingCommitment[]),
        getAcademicMilestones().catch(() => DEFAULT_ACADEMIC_MILESTONES),
        getCourseTeachers().catch(() => []),
        getAdminProfiles(false, 'all').catch(() => [] as AdminProfileRow[]),
        getAllPublishedQuizzes().catch(() => []),
      ]);

    setAdminWorkshops(workshopRows);
    setCommitments(commitmentRows);
    setMilestones(milestoneRows.length ? milestoneRows : DEFAULT_ACADEMIC_MILESTONES);
    setAdminProfiles(profilesList);
    setQuizTopicIds(new Set(quizzesList.map((q) => q.topic_id)));

    // Construir lista unificada de profesores (titulares, colaboradores docentes y comité)
    const map = new Map<string, TeacherOption>();

    // Presets institucionales siempre disponibles
    map.set('preset_juan_marcos', {
      id: user?.id || 'preset_juan_marcos',
      name: 'Dr. Juan Marcos Yocupicio Robles',
      specialty: 'Neurofisiología Clínica y Rehabilitación',
      roleLabel: 'Director / Titular',
    });

    for (const p of courseTeachers) {
      if (!p.display_name) continue;
      map.set(p.id, {
        id: p.id,
        name: p.display_name,
        specialty: p.specialty || p.credentials || 'Especialista Docente',
        roleLabel: p.show_in_editorial_committee ? 'Comité Académico' : 'Colaborador Docente',
        avatarUrl: p.avatar_url,
      });
    }

    for (const prof of profilesList) {
      if (!prof.display_name) continue;
      const roles = prof.roles ?? [];
      const isFaculty =
        roles.includes('admin') ||
        roles.includes('editor') ||
        roles.includes('contributor') ||
        prof.show_in_editorial_committee;
      if (isFaculty && !map.has(prof.id)) {
        map.set(prof.id, {
          id: prof.id,
          name: prof.display_name,
          specialty: prof.specialty || prof.credentials || 'Médico Docente',
          roleLabel: roles.includes('admin')
            ? 'Administrador Docente'
            : roles.includes('editor')
            ? 'Profesor Editor'
            : 'Profesor Adjunto',
          avatarUrl: prof.avatar_url,
        });
      }
    }

    // Incluir también cualquier profesor que ya tenga compromisos registrados
    for (const c of commitmentRows) {
      if (c.teacher_id && c.teacher_name && !map.has(c.teacher_id)) {
        map.set(c.teacher_id, {
          id: c.teacher_id,
          name: c.teacher_name,
          specialty: 'Profesor Asignado',
          roleLabel: 'Docente',
        });
      }
    }

    setTeacherOptions(Array.from(map.values()));
  };

  useEffect(() => {
    void loadAuxiliaryData();
  }, [user?.id]);

  const sortedCourses = useMemo(
    () =>
      [...courses].sort(
        (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'es')
      ),
    [courses]
  );

  const moduleById = useMemo(
    () => new Map(modulesForStaff.map((m) => [m.id, m])),
    [modulesForStaff]
  );

  useEffect(() => {
    if (!sortedCourses.length) {
      setSelectedCourseId(null);
      return;
    }
    if (!selectedCourseId || !sortedCourses.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId(sortedCourses[0].id);
    }
  }, [sortedCourses, selectedCourseId]);

  // Expandir el primer módulo automáticamente al cambiar de curso para que el médico vea sus temas de inmediato
  useEffect(() => {
    if (!selectedCourseId) return;
    const courseRows = assignments
      .filter((a) => a.course_id === selectedCourseId)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (courseRows.length > 0 && expandedModules.size === 0) {
      setExpandedModules(new Set([courseRows[0].module_id]));
    }
  }, [selectedCourseId, assignments]);

  useEffect(() => {
    if (!moduleMenuId) return;
    const close = () => setModuleMenuId(null);
    document.addEventListener('mousedown', close);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [moduleMenuId]);

  const selectedCourse = sortedCourses.find((course) => course.id === selectedCourseId) ?? null;

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  const run = async (key: string, fn: () => Promise<void>, success?: string) => {
    setBusyKey(key);
    setError(null);
    try {
      await fn();
      await reload();
      if (success) notifySuccess(success);
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
        return {
          topic,
          index,
          order: ov?.sort_order ?? index,
          visible: ov?.is_visible ?? true,
          deleted: isTopicDeletedOverride(ov),
        };
      })
      .filter((row) => !row.deleted)
      .sort((a, b) => a.order - b.order || a.index - b.index);

  const nextSortOrder = (courseId: CourseId) =>
    assignments
      .filter((a) => a.course_id === courseId)
      .reduce((max, a) => Math.max(max, a.sort_order), 0) + 1;

  // Índices rápidos de compromisos docentes y talleres por topic_id
  const commitmentsByTopicId = useMemo(() => {
    const map = new Map<string, TopicTeachingCommitment[]>();
    for (const c of commitments) {
      if (c.status === 'withdrawn') continue;
      const list = map.get(c.topic_id) ?? [];
      list.push(c);
      map.set(c.topic_id, list);
    }
    return map;
  }, [commitments]);

  const workshopByTopicId = useMemo(() => {
    const map = new Map<string, LiveWorkshop>();
    for (const w of adminWorkshops) {
      if (w.status === 'cancelled') continue;
      if (w.topic_id && !map.has(w.topic_id)) {
        map.set(w.topic_id, w);
      }
    }
    for (const c of commitments) {
      if (c.workshop_id && c.status !== 'withdrawn') {
        const w = adminWorkshops.find((wk) => wk.id === c.workshop_id && wk.status !== 'cancelled');
        if (w && !map.has(c.topic_id)) {
          map.set(c.topic_id, w);
        }
      }
    }
    return map;
  }, [adminWorkshops, commitments]);

  const milestoneByTopicId = useMemo(() => {
    const map = new Map<string, { milestone: AcademicMilestone; index: number }>();
    milestones.forEach((m, index) => {
      for (const tid of m.target_topic_ids ?? []) {
        if (!map.has(tid)) {
          map.set(tid, { milestone: m, index: index + 1 });
        }
      }
    });
    return map;
  }, [milestones]);

  const isMyCommitment = (c: TopicTeachingCommitment): boolean => {
    if (user?.id && c.teacher_id === user.id) return true;
    const myDisplay = (profile?.display_name || '').trim().toLowerCase();
    const cName = (c.teacher_name || '').trim().toLowerCase();
    if (myDisplay && cName && (cName.includes(myDisplay) || myDisplay.includes(cName))) {
      return true;
    }
    if (c.teacher_id === 'preset_juan_marcos' && (!myDisplay || myDisplay.includes('juan'))) {
      return true;
    }
    return false;
  };

  // Estadísticas ejecutivas del curso seleccionado
  const courseStats = useMemo(() => {
    if (!selectedCourse) {
      return {
        moduleCount: 0,
        totalTopics: 0,
        assignedTopics: 0,
        unassignedTopics: 0,
        scheduledTopics: 0,
        hiddenTopics: 0,
        myTopics: 0,
        coveragePct: 0,
        teacherCounts: new Map<string, { name: string; count: number; option?: TeacherOption }>(),
      };
    }
    const modRows = rowsForCourse(selectedCourse.id);
    let totalTopics = 0;
    let assignedTopics = 0;
    let scheduledTopics = 0;
    let hiddenTopics = 0;
    let myTopics = 0;
    const teacherCounts = new Map<string, { name: string; count: number; option?: TeacherOption }>();

    for (const { mod } of modRows) {
      const tRows = topicRowsForModule(mod);
      for (const tRow of tRows) {
        totalTopics += 1;
        if (!tRow.visible) hiddenTopics += 1;
        const comms = commitmentsByTopicId.get(tRow.topic.id) ?? [];
        if (comms.some(isMyCommitment)) {
          myTopics += 1;
        }
        if (comms.length > 0) {
          assignedTopics += 1;
          for (const c of comms) {
            const prev = teacherCounts.get(c.teacher_id);
            const tName = c.teacher_name || 'Profesor';
            const opt = teacherOptions.find((o) => o.id === c.teacher_id);
            teacherCounts.set(c.teacher_id, {
              name: tName,
              count: (prev?.count ?? 0) + 1,
              option: opt,
            });
          }
        }
        if (workshopByTopicId.has(tRow.topic.id)) {
          scheduledTopics += 1;
        }
      }
    }

    const unassignedTopics = Math.max(0, totalTopics - assignedTopics);
    const coveragePct = totalTopics > 0 ? Math.round((assignedTopics / totalTopics) * 100) : 0;

    return {
      moduleCount: modRows.length,
      totalTopics,
      assignedTopics,
      unassignedTopics,
      scheduledTopics,
      hiddenTopics,
      myTopics,
      coveragePct,
      teacherCounts,
    };
  }, [
    selectedCourse,
    assignments,
    modulesForStaff,
    overrides,
    commitmentsByTopicId,
    workshopByTopicId,
    teacherOptions,
    user?.id,
    profile?.display_name,
  ]);

  // Lista de temas candidatos para el Auto-Calendario Inteligente
  const autoSchedulePlan = useMemo(() => {
    if (!selectedCourse) return [];
    const modRows = rowsForCourse(selectedCourse.id);
    const targets: { mod: Module; topic: Topic; existingWorkshop?: LiveWorkshop }[] = [];
    for (const { mod } of modRows) {
      const tRows = topicRowsForModule(mod).filter((r) => r.visible);
      for (const tRow of tRows) {
        const existing = workshopByTopicId.get(tRow.topic.id);
        if (autoScope === 'unscheduled' && existing) continue;
        targets.push({ mod, topic: tRow.topic, existingWorkshop: existing });
      }
    }
    const dates = computeNextSessionDates(autoStartDate, autoWeekdays, targets.length);
    return targets.map((item, idx) => ({
      ...item,
      dateStr: dates[idx] || autoStartDate,
    }));
  }, [
    selectedCourse,
    assignments,
    modulesForStaff,
    overrides,
    workshopByTopicId,
    autoScope,
    autoStartDate,
    autoWeekdays,
  ]);

  const handleToggleAutoWeekday = (day: number) => {
    setAutoWeekdays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const handleApplyAutoSchedule = async () => {
    if (!selectedCourse || !user || autoSchedulePlan.length === 0) return;
    setAutoScheduling(true);
    setError(null);
    try {
      const streamUrl = selectedCourse.live_meeting_url || null;
      for (const item of autoSchedulePlan) {
        const isoDateTime = new Date(`${item.dateStr}T${autoTime || '19:00'}:00`).toISOString();
        const title = `Clase: ${item.topic.title}`;
        let savedWorkshop: LiveWorkshop;
        if (item.existingWorkshop) {
          savedWorkshop = await updateWorkshop(item.existingWorkshop.id, {
            title,
            scheduled_at: isoDateTime,
            duration_minutes: autoDuration || 90,
            stream_url: item.existingWorkshop.stream_url || streamUrl,
          });
        } else {
          savedWorkshop = await createWorkshop({
            module_id: item.mod.id,
            topic_id: item.topic.id,
            title,
            description: item.topic.description ?? null,
            scheduled_at: isoDateTime,
            duration_minutes: autoDuration || 90,
            stream_url: streamUrl,
            recording_url: null,
            max_capacity: null,
            clinical_case_revision_id: null,
            clinical_case_json: null,
            status: 'scheduled',
            created_by: user.id,
          });
        }
        const comms = commitmentsByTopicId.get(item.topic.id) ?? [];
        if (comms.length > 0) {
          await assignTopicsToTeacher({
            topicIds: [item.topic.id],
            moduleId: item.mod.id,
            teacherId: comms[0].teacher_id,
            teacherName: comms[0].teacher_name || 'Profesor',
            workshopId: savedWorkshop.id,
          });
        }
      }
      await loadAuxiliaryData();
      setShowAutoScheduleBar(false);
      notifySuccess(
        `¡Calendario generado! Se programaron ${autoSchedulePlan.length} sesiones en vivo automáticamente.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el calendario automático');
    } finally {
      setAutoScheduling(false);
    }
  };

  const handleSaveCourseModal = async (payload: CourseEditorSavePayload) => {
    if (payload.id && selectedCourse && payload.id === selectedCourse.id) {
      await run(
        `meta-${selectedCourse.id}`,
        async () => {
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
            const currentModIds = rowsForCourse(selectedCourse.id).map(
              (r) => r.assignment.module_id
            );
            const toAdd = payload.selectedModuleIds.filter((id) => !currentModIds.includes(id));
            for (let i = 0; i < toAdd.length; i++) {
              await assignModuleToCourse(
                toAdd[i],
                selectedCourse.id,
                nextSortOrder(selectedCourse.id) + i,
                true
              );
            }
          }
        },
        `Curso "${payload.title}" actualizado.`
      );
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
        notifySuccess(`Curso "${created.title}" creado con éxito.`);
      } finally {
        setBusyKey(null);
      }
    }
  };

  const reorderModules = (courseId: CourseId, from: number, to: number) => {
    const ids = rowsForCourse(courseId).map((row) => row.assignment.module_id);
    const swapped = moveItem(ids, from, to);
    void run(`reorder-${courseId}`, () => reorderCourseModules(courseId, swapped), 'Orden de módulos actualizado.');
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
        ),
      'Orden de temas actualizado.'
    );
  };

  const moveSiblings = (moduleId: string, siblings: Topic[], topicId: string, direction: -1 | 1) => {
    const idx = siblings.findIndex((topic) => topic.id === topicId);
    const next = idx + direction;
    if (idx < 0 || next < 0 || next >= siblings.length) return;
    const swapped = moveItem(siblings, idx, next);
    void run(
      `topic-${topicId}`,
      () =>
        setSyllabusTopicOverrides(
          moduleId,
          siblingOverrideInputs(
            swapped.map((topic) => topic.id),
            moduleId,
            overrides
          )
        ),
      'Orden de subtemas actualizado.'
    );
  };

  const toggleTopicVisible = (
    moduleId: string,
    topicId: string,
    currentlyVisible: boolean,
    sortOrder: number
  ) => {
    void run(
      `hide-${topicId}`,
      () =>
        setSyllabusTopicOverrides(moduleId, [
          { topic_id: topicId, sort_order: Math.max(0, sortOrder), is_visible: !currentlyVisible },
        ]),
      !currentlyVisible ? 'Tema visible para los alumnos.' : 'Tema oculto a los alumnos.'
    );
  };

  const handleConfirmDeleteTopic = async () => {
    if (!topicToDelete) return;
    const { moduleId, topicId, topicTitle } = topicToDelete;
    setTopicToDelete(null);
    await run(
      `del-topic-${topicId}`,
      async () => {
        await deleteTopicDirectly({
          moduleId,
          topicId,
          authorId: user?.id,
        });
      },
      `Tema "${topicTitle}" eliminado del temario.`
    );
  };

  const handleQuickAssignTeacherToTopic = async (
    moduleId: string,
    topic: Topic,
    teacher: TeacherOption
  ) => {
    const allIds = collectTopicAndChildrenIds(topic);
    setBusyKey(`assign-${topic.id}`);
    try {
      await assignTopicsToTeacher({
        topicIds: allIds,
        moduleId,
        teacherId: teacher.id,
        teacherName: teacher.name,
      });
      const updated = await listTopicTeachingCommitments();
      setCommitments(updated);
      notifySuccess(`"${topic.title}" asignado a ${teacher.name}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo asignar el profesor');
    } finally {
      setBusyKey(null);
    }
  };

  const handleQuickAssignTeacherToModule = async (mod: Module, teacher: TeacherOption) => {
    const tRows = topicRowsForModule(mod);
    const allIds = tRows.flatMap((r) => collectTopicAndChildrenIds(r.topic));
    if (!allIds.length) return;
    setBusyKey(`assign-mod-${mod.id}`);
    try {
      await assignTopicsToTeacher({
        topicIds: allIds,
        moduleId: mod.id,
        teacherId: teacher.id,
        teacherName: teacher.name,
      });
      const updated = await listTopicTeachingCommitments();
      setCommitments(updated);
      notifySuccess(`Módulo "${mod.title}" (${tRows.length} temas) asignado a ${teacher.name}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo asignar el módulo');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRequestDeleteCourse = (course: Course) => {
    const rows = rowsForCourse(course.id);
    setCourseToDelete({
      id: course.id,
      title: course.title,
      moduleCount: rows.length,
      moduleTitles: rows.map((r) => `${r.mod.emoji} ${r.mod.title}`),
    });
  };

  const handleConfirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await deleteCourse(courseToDelete.id);
      const deletedTitle = courseToDelete.title;
      setCourseToDelete(null);
      await reload();
      notifySuccess(`El curso "${deletedTitle}" fue eliminado. Los módulos pasaron a "Sin asignar".`);
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

  const currentCourseModuleIds = useMemo(
    () => (selectedCourse ? rowsForCourse(selectedCourse.id).map((r) => r.mod.id) : []),
    [selectedCourse, assignments, modulesForStaff]
  );

  const areAllModulesExpanded =
    currentCourseModuleIds.length > 0 &&
    currentCourseModuleIds.every((id) => expandedModules.has(id));

  const toggleExpandAllModules = () => {
    if (areAllModulesExpanded) {
      setExpandedModules(new Set());
    } else {
      setExpandedModules(new Set(currentCourseModuleIds));
    }
  };

  // Resolver datos del tema activo en el Drawer lateral
  const drawerContext = useMemo(() => {
    if (!activeTopicDrawer) return null;
    const mod = moduleById.get(activeTopicDrawer.moduleId) ?? null;
    if (!mod) return null;
    const tRows = topicRowsForModule(mod);

    if (activeTopicDrawer.parentTopicId) {
      const parentRow = tRows.find((r) => r.topic.id === activeTopicDrawer.parentTopicId);
      const parent = parentRow?.topic ?? null;
      const siblings = (parent?.children ?? []).filter((sub) => {
        const ov = overrides.find((o) => o.module_id === mod.id && o.topic_id === sub.id);
        return !isTopicDeletedOverride(ov);
      });
      const subIdx = siblings.findIndex((s) => s.id === activeTopicDrawer.topicId);
      const sub = siblings[subIdx] ?? null;
      if (!sub) return null;
      const ov = overrides.find((o) => o.module_id === mod.id && o.topic_id === sub.id);
      return {
        mod,
        topic: sub,
        parentTopic: parent,
        isVisible: ov?.is_visible ?? true,
        sortOrder: ov?.sort_order ?? subIdx,
        canMoveUp: subIdx > 0,
        canMoveDown: subIdx >= 0 && subIdx < siblings.length - 1,
        siblings,
      };
    }

    const idx = tRows.findIndex((r) => r.topic.id === activeTopicDrawer.topicId);
    const row = tRows[idx];
    if (!row) return null;
    return {
      mod,
      topic: row.topic,
      parentTopic: null,
      isVisible: row.visible,
      sortOrder: row.order,
      canMoveUp: idx > 0,
      canMoveDown: idx >= 0 && idx < tRows.length - 1,
      siblings: tRows.map((r) => r.topic),
    };
  }, [activeTopicDrawer, moduleById, overrides]);

  const assignableCourses = sortedCourses.filter((course) => course.id !== selectedCourseId);
  const scheduledPct =
    courseStats.totalTopics > 0
      ? Math.round((courseStats.scheduledTopics / courseStats.totalTopics) * 100)
      : 0;

  return (
    <AdminLayout
      title="Organizador del temario"
      subtitle="Configura profesores adjuntos, calendario de sesiones, contenido y evaluaciones por tema."
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          {busyKey && (
            <span className="text-xs font-semibold text-blue-600 dark:text-cyan-400 animate-pulse px-2">
              Guardando cambios…
            </span>
          )}
          {error && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-xl">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl animate-fadeIn">
              ✓ {successMsg}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setTemplateCourseForClone(null);
              setCourseModalInitialTab('general');
              setCreateCourseOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo curso</span>
          </button>

          <Link
            to="/cursos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Catálogo público</span>
          </Link>

          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              preview
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-cyan-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>{preview ? 'Cerrar vista previa' : 'Mapa de cursos'}</span>
          </button>
        </div>
      }
    >
      {preview && (
        <div className="mb-5 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 animate-fadeIn">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-300">
              Mapa rápido de módulos visibles por curso (vista alumno)
            </p>
            <button
              type="button"
              onClick={() => setPreview(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Cerrar
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {grouped.map(({ course, modules }) => (
              <div
                key={course.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
              >
                <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2 truncate">
                  {course.title}
                </p>
                <ul className="space-y-1">
                  {modules.map((mod) => (
                    <li key={mod.id} className="text-xs text-slate-700 dark:text-slate-300 truncate">
                      {mod.emoji} {mod.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── LAYOUT PRINCIPAL: COLUMNA DE CURSOS + ÁREA DE TEMARIO ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[265px_1fr] gap-5 items-start">
        {/* ─── RIEL LATERAL DE CURSOS ─── */}
        <aside className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs lg:sticky lg:top-20">
          <div className="flex items-center justify-between gap-2 mb-2.5 px-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Cursos
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                {sortedCourses.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setTemplateCourseForClone(null);
                setCourseModalInitialTab('general');
                setCreateCourseOpen(true);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
              title="Crear nuevo curso"
            >
              <Plus className="w-3 h-3" />
              <span>Nuevo</span>
            </button>
          </div>

          <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-0.5 scrollbar-thin">
            {sortedCourses.map((course) => {
              const moduleCount = rowsForCourse(course.id).length;
              const active = course.id === selectedCourseId;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? 'border-blue-500/80 dark:border-blue-500/70 bg-blue-50/90 dark:bg-blue-950/50 shadow-2xs'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <GraduationCap
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        active ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <p
                          className={`text-xs sm:text-[13px] font-bold leading-snug line-clamp-2 ${
                            active
                              ? 'text-blue-950 dark:text-white'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {course.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                            active
                              ? 'bg-blue-100/80 dark:bg-blue-900/60 text-blue-700 dark:text-cyan-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {moduleCount} {moduleCount === 1 ? 'módulo' : 'módulos'}
                        </span>
                        {!course.is_active && (
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            · Inactivo
                          </span>
                        )}
                        {!course.is_sellable && (
                          <span className="text-[10px] text-slate-400">· Incluido</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Módulos sin asignar */}
          <div className="mt-3.5 pt-3.5 border-t border-dashed border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <PackageOpen className="w-3.5 h-3.5" />
                <span>Sin asignar</span>
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                {unassigned.length}
              </span>
            </div>
            {unassigned.length === 0 ? (
              <p className="text-xs text-slate-400 px-1">Todos los módulos tienen curso.</p>
            ) : (
              <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5 scrollbar-thin">
                {unassigned.map((mod) => (
                  <li
                    key={mod.id}
                    className="text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800"
                  >
                    <span
                      className="line-clamp-2 break-words leading-tight flex-1 min-w-0 text-[11px] font-medium"
                      title={mod.title}
                    >
                      {mod.emoji} {mod.title}
                    </span>
                    {selectedCourseId && (
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() =>
                          void run(
                            `assign-${mod.id}`,
                            () =>
                              assignModuleToCourse(
                                mod.id,
                                selectedCourseId,
                                nextSortOrder(selectedCourseId),
                                true
                              ),
                            `Módulo "${mod.title}" asignado al curso.`
                          )
                        }
                        className="shrink-0 px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
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

        {/* ─── PANEL CENTRAL DEL CURSO Y TEMARIO ─── */}
        <section className="min-w-0 space-y-4">
          {!selectedCourse ? (
            <div className="p-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Aún no hay cursos
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Crea el primer curso para empezar a organizar el temario.
              </p>
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
            <>
              {/* ─── 1. TARJETA EJECUTIVA DEL CURSO ─── */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-cyan-400">
                        Ficha comercial y operativa
                      </span>
                      {selectedCourse.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Curso activo
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          Inactivo
                        </span>
                      )}
                      {selectedCourse.is_sellable && (
                        <button
                          type="button"
                          onClick={() => {
                            setCourseModalInitialTab('general');
                            setEditCourseModalOpen(true);
                          }}
                          className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:ring-1 hover:ring-emerald-400 transition cursor-pointer"
                          title="Clic para cambiar precio o acreditación"
                        >
                          {selectedCourse.price_display?.trim() || 'Consultar'}
                        </button>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                      {selectedCourse.title}
                    </h2>
                  </div>

                  {/* Botones limpios de configuración del curso */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFacultyBar((v) => !v);
                        setShowAutoScheduleBar(false);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        showFacultyBar || quickAssignTeacher
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Profesores ({teacherOptions.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAutoScheduleBar((v) => !v);
                        setShowFacultyBar(false);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        showAutoScheduleBar
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/70'
                      }`}
                      title="Autoprogramar fechas semanales para los temas del curso"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Autoprogramar fechas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setScheduleModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                      title="Configurar fechas de corte y checklist del curso"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                      <span>Cortes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTemplateCourseForClone(null);
                        setCourseModalInitialTab('general');
                        setEditCourseModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 text-blue-700 dark:text-cyan-300 text-xs font-bold border border-blue-200/80 dark:border-blue-800 transition cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Configurar curso</span>
                    </button>
                  </div>
                </div>

                {/* Franja ejecutiva de métricas del curso con barras de progreso */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Docente Titular
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-5 h-5 rounded-md bg-blue-600/15 dark:bg-blue-500/20 text-blue-700 dark:text-cyan-300 text-[10px] font-black flex items-center justify-center shrink-0">
                        {getInitials(selectedCourse.instructor_name || 'Dr. Juan Marcos Yocupicio')}
                      </span>
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {selectedCourse.instructor_name || 'Dr. Juan Marcos Yocupicio'}
                      </p>
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Estructura
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">
                      {courseStats.moduleCount} módulos · {courseStats.totalTopics} temas
                    </p>
                  </div>

                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Cobertura Docente
                      </span>
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                        {courseStats.coveragePct}%
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">
                      {courseStats.assignedTopics} de {courseStats.totalTopics} con profesor
                    </p>
                    <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-700/80 mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, courseStats.coveragePct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Clases con Fecha
                      </span>
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                        {scheduledPct}%
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">
                      {courseStats.scheduledTopics} programadas · Mín.{' '}
                      {selectedCourse.min_passing_grade ?? 80}%
                    </p>
                    <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-700/80 mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, scheduledPct)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* ─── PANEL DESPLEGABLE DE PROFESORES Y ASIGNACIÓN EN 1 CLIC ─── */}
                {(showFacultyBar || quickAssignTeacher) && (
                  <div className="p-3.5 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/25 space-y-3 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Asignación Rápida a Profesores Adjuntos (Modo 1 Clic)
                        </h3>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          Selecciona un profesor aquí abajo y luego haz clic en el botón{' '}
                          <strong>+ Asignar</strong> de cualquier tema o módulo para asignárselo sin abrir ventanas.
                        </p>
                      </div>
                      {quickAssignTeacher && (
                        <button
                          type="button"
                          onClick={() => setQuickAssignTeacher(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 cursor-pointer shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Salir de asignación rápida</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {teacherOptions.map((teacher) => {
                        const isSelected = quickAssignTeacher?.id === teacher.id;
                        const count = courseStats.teacherCounts.get(teacher.id)?.count ?? 0;
                        return (
                          <button
                            key={teacher.id}
                            type="button"
                            onClick={() =>
                              setQuickAssignTeacher(isSelected ? null : teacher)
                            }
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/25'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                              }`}
                            >
                              {getInitials(teacher.name)}
                            </span>
                            <span>{teacher.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {count} {count === 1 ? 'tema' : 'temas'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ─── PANEL DESPLEGABLE: AUTO-CALENDARIO INTELIGENTE POR SEMANA ─── */}
                {showAutoScheduleBar && (
                  <div className="p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3.5 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          Auto-Calendario Inteligente de Sesiones en Vivo
                        </h3>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          Elige el día de inicio y los días de clase; el sistema asignará consecutivamente las fechas a cada tema del curso.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAutoScheduleBar(false)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cerrar</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          1. Fecha de 1ª sesión
                        </label>
                        <input
                          type="date"
                          value={autoStartDate}
                          onChange={(e) => setAutoStartDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          2. Días de transmisión
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {WEEKDAY_OPTIONS.map((w) => {
                            const active = autoWeekdays.includes(w.day);
                            return (
                              <button
                                key={w.day}
                                type="button"
                                onClick={() => handleToggleAutoWeekday(w.day)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                  active
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {w.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          3. Hora y duración
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={autoTime}
                            onChange={(e) => setAutoTime(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                          />
                          <select
                            value={autoDuration}
                            onChange={(e) => setAutoDuration(Number(e.target.value))}
                            className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold shrink-0"
                          >
                            <option value={60}>60m</option>
                            <option value={90}>90m</option>
                            <option value={120}>2h</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          4. Alcance
                        </label>
                        <select
                          value={autoScope}
                          onChange={(e) => setAutoScope(e.target.value as 'unscheduled' | 'all')}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        >
                          <option value="unscheduled">Solo temas aún sin fecha</option>
                          <option value="all">Reprogramar todos los temas</option>
                        </select>
                      </div>
                    </div>

                    {/* Vista previa rápida de las primeras fechas */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-900/50">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 min-w-0">
                        {autoSchedulePlan.length === 0 ? (
                          <span className="text-slate-500">
                            Todos los temas ya tienen fecha programada (cambia a &ldquo;Reprogramar todos&rdquo; si deseas actualizarlos).
                          </span>
                        ) : (
                          <>
                            <span className="font-bold text-amber-900 dark:text-amber-300">
                              Vista previa ({autoSchedulePlan.length} sesiones):
                            </span>
                            {autoSchedulePlan.slice(0, 3).map((p, idx) => (
                              <span
                                key={p.topic.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold truncate max-w-[200px]"
                              >
                                <span className="text-amber-600 dark:text-amber-400 font-bold">
                                  {new Date(`${p.dateStr}T12:00:00`).toLocaleDateString('es-MX', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                  :
                                </span>
                                <span className="truncate">{idx + 1}. {p.topic.title}</span>
                              </span>
                            ))}
                            {autoSchedulePlan.length > 3 && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                … hasta{' '}
                                {new Date(
                                  `${autoSchedulePlan[autoSchedulePlan.length - 1].dateStr}T12:00:00`
                                ).toLocaleDateString('es-MX', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={autoScheduling || autoSchedulePlan.length === 0}
                        onClick={() => void handleApplyAutoSchedule()}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {autoScheduling ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Programando…</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>Programar {autoSchedulePlan.length} sesiones</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── 2. TEMARIO DEL CURSO (VISTA EJECUTIVA COMPACTA) ─── */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs space-y-3.5">
                {/* Barra unificada: Título + Buscador + Píldoras de Filtro + Expandir */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-cyan-400 shrink-0">
                      <ListTree className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Temario del curso
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-cyan-400" />
                        {courseStats.moduleCount}{' '}
                        {courseStats.moduleCount === 1 ? 'módulo' : 'módulos'}
                      </span>
                    </div>
                  </div>

                  {/* Buscador + Píldoras + Botón Expandir */}
                  <div className="flex flex-wrap items-center gap-2 flex-1 xl:justify-end">
                    <div className="relative w-full sm:w-60 lg:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (e.target.value.trim() && !areAllModulesExpanded) {
                            setExpandedModules(new Set(currentCourseModuleIds));
                          }
                        }}
                        placeholder="Filtrar tema o profesor..."
                        className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/30 outline-none"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                      {[
                        { id: 'all', label: `Todos (${courseStats.totalTopics})` },
                        { id: 'mine', label: `Mis temas (${courseStats.myTopics})` },
                        {
                          id: 'unassigned',
                          label: `Sin profesor (${courseStats.unassignedTopics})`,
                        },
                        { id: 'assigned', label: `Con profesor (${courseStats.assignedTopics})` },
                        {
                          id: 'scheduled',
                          label: `Con fecha (${courseStats.scheduledTopics})`,
                        },
                        ...(courseStats.hiddenTopics > 0
                          ? [{ id: 'hidden', label: `Ocultos (${courseStats.hiddenTopics})` }]
                          : []),
                      ].map((pill) => {
                        const active = filterMode === pill.id;
                        return (
                          <button
                            key={pill.id}
                            type="button"
                            onClick={() => {
                              setFilterMode(pill.id as TopicFilterMode);
                              if (pill.id !== 'all' && !areAllModulesExpanded) {
                                setExpandedModules(new Set(currentCourseModuleIds));
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                              active
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                                : 'bg-slate-100/80 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                            }`}
                          >
                            {pill.label}
                          </button>
                        );
                      })}
                    </div>

                    {currentCourseModuleIds.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleExpandAllModules}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                      >
                        {areAllModulesExpanded ? 'Colapsar módulos' : 'Expandir todos'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de Módulos del Curso */}
                {courseStats.moduleCount === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Este curso no tiene módulos
                    </p>
                    <p className="text-xs text-slate-500 mb-3">
                      Asigna módulos desde la bandeja &ldquo;Sin asignar&rdquo; o desde Configurar curso.
                    </p>
                    {unassigned.length > 0 && (
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() => {
                          const mod = unassigned[0];
                          void run(
                            `assign-${mod.id}`,
                            () =>
                              assignModuleToCourse(
                                mod.id,
                                selectedCourse.id,
                                nextSortOrder(selectedCourse.id),
                                true
                              ),
                            `Módulo "${mod.title}" asignado.`
                          );
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Asignar &ldquo;{unassigned[0].title}&rdquo;
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
                      const allModTopicRows = topicRowsForModule(mod);

                      // Filtrar temas según búsqueda y píldora activa
                      const filteredTopicRows = allModTopicRows.filter((tRow) => {
                        const comms = commitmentsByTopicId.get(tRow.topic.id) ?? [];
                        const hasTeacher = comms.length > 0;
                        const hasDate = workshopByTopicId.has(tRow.topic.id);

                        if (filterMode === 'mine' && !comms.some(isMyCommitment)) return false;
                        if (filterMode === 'unassigned' && hasTeacher) return false;
                        if (filterMode === 'assigned' && !hasTeacher) return false;
                        if (filterMode === 'scheduled' && !hasDate) return false;
                        if (filterMode === 'hidden' && tRow.visible) return false;

                        const q = searchQuery.trim().toLowerCase();
                        if (!q) return true;
                        const matchTitle = tRow.topic.title.toLowerCase().includes(q);
                        const matchChild = (tRow.topic.children ?? []).some((c) =>
                          c.title.toLowerCase().includes(q)
                        );
                        const matchTeacher = comms.some((c) =>
                          (c.teacher_name || '').toLowerCase().includes(q)
                        );
                        return matchTitle || matchChild || matchTeacher;
                      });

                      if (
                        (searchQuery.trim() || filterMode !== 'all') &&
                        filteredTopicRows.length === 0
                      ) {
                        return null;
                      }

                      // Resumen minimalista de profesores en este módulo
                      const moduleAssignedCount = allModTopicRows.filter(
                        (r) => (commitmentsByTopicId.get(r.topic.id)?.length ?? 0) > 0
                      ).length;
                      const moduleTeachers = Array.from(
                        new Set(
                          allModTopicRows.flatMap((r) =>
                            (commitmentsByTopicId.get(r.topic.id) ?? []).map(
                              (c) => c.teacher_name || 'Profesor'
                            )
                          )
                        )
                      );

                      return (
                        <div
                          className={`mb-2.5 p-3 sm:p-3.5 rounded-2xl border transition-all duration-150 ${
                            isOpen
                              ? 'border-blue-300/80 dark:border-blue-500/40 bg-slate-50/40 dark:bg-slate-800/50 shadow-2xs'
                              : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2.5">
                            {/* Título del módulo */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="shrink-0">{handle}</div>
                              <button
                                type="button"
                                className="flex flex-1 min-w-0 items-center gap-2.5 text-left cursor-pointer group"
                                onClick={() => toggleModuleExpanded(mod.id)}
                              >
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                                  {mod.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`font-bold text-sm leading-snug truncate text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors ${
                                        visible ? '' : 'opacity-50'
                                      }`}
                                    >
                                      {mod.title}
                                    </span>
                                    {!visible && (
                                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-full px-2 py-0.5 shrink-0">
                                        <EyeOff className="w-2.5 h-2.5" />
                                        Oculto
                                      </span>
                                    )}
                                  </div>
                                  {/* Subtítulo minimalista de docentes del módulo */}
                                  {moduleTeachers.length > 0 && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                      👨‍⚕️ {moduleTeachers.slice(0, 2).map(getShortDoctorName).join(', ')}
                                      {moduleTeachers.length > 2 && ` +${moduleTeachers.length - 2}`}
                                      {' · '}
                                      {moduleAssignedCount}/{allModTopicRows.length} con docente
                                    </p>
                                  )}
                                </div>
                              </button>
                            </div>

                            {/* Badges minimalistas del módulo y acciones */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {quickAssignTeacher && (
                                <button
                                  type="button"
                                  disabled={busyKey !== null}
                                  onClick={() =>
                                    void handleQuickAssignTeacherToModule(mod, quickAssignTeacher)
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition cursor-pointer hidden sm:inline-flex items-center gap-1"
                                  title={`Asignar todos los temas de este módulo a ${quickAssignTeacher.name}`}
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>Asignar módulo</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => toggleModuleExpanded(mod.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 transition cursor-pointer"
                              >
                                <Layers className="w-3 h-3 text-blue-500 dark:text-cyan-400" />
                                <span>
                                  {allModTopicRows.length}{' '}
                                  {allModTopicRows.length === 1 ? 'tema' : 'temas'}
                                </span>
                                {isOpen ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Menú de acciones del módulo */}
                              <div className="relative">
                                <button
                                  type="button"
                                  aria-label="Acciones del módulo"
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setModuleMenuId((current) =>
                                      current === mod.id ? null : mod.id
                                    );
                                  }}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                                {moduleMenuId === mod.id && (
                                  <div
                                    className="absolute right-0 top-full mt-1 z-30 min-w-[210px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1.5"
                                    onMouseDown={(event) => event.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                      onClick={() => {
                                        setModuleMenuId(null);
                                        handleOpenCreateModal(mod.id, mod.title, null, null);
                                      }}
                                    >
                                      <Plus className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Agregar tema nuevo</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                      disabled={busyKey !== null}
                                      onClick={() => {
                                        setModuleMenuId(null);
                                        void run(
                                          `vis-${mod.id}`,
                                          () => setCourseModuleVisible(mod.id, !visible),
                                          !visible ? 'Módulo visible.' : 'Módulo oculto.'
                                        );
                                      }}
                                    >
                                      {visible ? (
                                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                      ) : (
                                        <Eye className="w-3.5 h-3.5 text-emerald-500" />
                                      )}
                                      <span>{visible ? 'Ocultar módulo' : 'Mostrar módulo'}</span>
                                    </button>
                                    {assignableCourses.map((course) => (
                                      <button
                                        key={course.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                                        disabled={busyKey !== null}
                                        onClick={() => {
                                          setModuleMenuId(null);
                                          void run(
                                            `move-${mod.id}`,
                                            () =>
                                              assignModuleToCourse(
                                                mod.id,
                                                course.id,
                                                nextSortOrder(course.id),
                                                visible
                                              ),
                                            `Módulo movido a ${course.title}.`
                                          );
                                        }}
                                      >
                                        Mover a {course.title}
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-t border-slate-100 dark:border-slate-800 mt-1 pt-2"
                                      disabled={busyKey !== null}
                                      onClick={() => {
                                        setModuleMenuId(null);
                                        void run(
                                          `move-${mod.id}`,
                                          () => assignModuleToCourse(mod.id, null, 0, visible),
                                          `Módulo "${mod.title}" movido a Sin asignar.`
                                        );
                                      }}
                                    >
                                      Quitar del curso
                                    </button>
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer hidden sm:flex"
                                aria-label="Subir módulo"
                                disabled={busyKey !== null || index === 0}
                                onClick={() =>
                                  reorderModules(selectedCourse.id, index, index - 1)
                                }
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer hidden sm:flex"
                                aria-label="Bajar módulo"
                                disabled={busyKey !== null || index === moduleRows.length - 1}
                                onClick={() =>
                                  reorderModules(selectedCourse.id, index, index + 1)
                                }
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* ─── LISTA MINIMALISTA DE TEMAS DEL MÓDULO ─── */}
                          {isOpen && (
                            <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-700/60 space-y-1.5">
                              <ul className="space-y-1.5">
                                {filteredTopicRows.map(
                                  ({ topic, order, visible: topicVisible }, tIndex) => {
                                    const topicComms = commitmentsByTopicId.get(topic.id) ?? [];
                                    const scheduledWorkshop = workshopByTopicId.get(topic.id);
                                    const milestoneEntry = milestoneByTopicId.get(topic.id);
                                    const hasTopicQuiz = quizTopicIds.has(topic.id);
                                    const visibleSubtopics = (topic.children ?? []).filter(
                                      (sub) => {
                                        const ov = overrides.find(
                                          (o) => o.module_id === mod.id && o.topic_id === sub.id
                                        );
                                        return !isTopicDeletedOverride(ov);
                                      }
                                    );

                                    const hasContentReady =
                                      (topic.content?.trim().length ?? 0) > 80 ||
                                      (topic.clinicalPearls?.length ?? 0) > 0 ||
                                      visibleSubtopics.length > 0;
                                    const hasTeachingFull =
                                      topicComms.length > 0 && Boolean(scheduledWorkshop);
                                    const hasTeachingPartial =
                                      topicComms.length > 0 || Boolean(scheduledWorkshop);

                                    const healthTooltip = [
                                      `Salud del tema: ${topic.title}`,
                                      `• Contenido: ${hasContentReady ? 'Listo' : 'Borrador / Pendiente'}`,
                                      `• Docencia: ${
                                        hasTeachingFull
                                          ? 'Profesor y fecha listos'
                                          : topicComms.length > 0
                                          ? 'Con profesor (falta fecha)'
                                          : scheduledWorkshop
                                          ? 'Con fecha (falta profesor)'
                                          : 'Pendiente de asignar'
                                      }`,
                                      `• Evaluación: ${hasTopicQuiz ? 'Quiz activo' : 'Sin quiz aún'}`,
                                    ].join('\n');

                                    return (
                                      <li
                                        key={topic.id}
                                        className="group/topic rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/80 transition-all shadow-2xs"
                                      >
                                        {/* Fila principal del Tema (Clic abre el Panel de Configuración del Tema) */}
                                        <div
                                          role="button"
                                          tabIndex={0}
                                          onClick={() =>
                                            setActiveTopicDrawer({
                                              moduleId: mod.id,
                                              topicId: topic.id,
                                              parentTopicId: null,
                                              initialTab: 'teaching',
                                            })
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              setActiveTopicDrawer({
                                                moduleId: mod.id,
                                                topicId: topic.id,
                                                parentTopicId: null,
                                                initialTab: 'teaching',
                                              });
                                            }
                                          }}
                                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2.5 cursor-pointer"
                                        >
                                          {/* Izquierda: Número + Semáforo Minimalista + Título + Indicadores discretos */}
                                          <div
                                            className={`flex items-center gap-2 min-w-0 flex-1 ${
                                              topicVisible ? '' : 'opacity-50'
                                            }`}
                                          >
                                            <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 w-5 shrink-0">
                                              {String(tIndex + 1).padStart(2, '0')}
                                            </span>

                                            {/* Semáforo minimalista de 3 puntos (Contenido · Docencia · Quiz) */}
                                            <span
                                              title={healthTooltip}
                                              className="inline-flex items-center gap-1 px-1.5 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 shrink-0"
                                            >
                                              <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                  hasContentReady
                                                    ? 'bg-emerald-500'
                                                    : 'bg-slate-300 dark:bg-slate-600'
                                                }`}
                                              />
                                              <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                  hasTeachingFull
                                                    ? 'bg-indigo-500'
                                                    : hasTeachingPartial
                                                    ? 'bg-amber-400'
                                                    : 'bg-slate-300 dark:bg-slate-600'
                                                }`}
                                              />
                                              <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                  hasTopicQuiz
                                                    ? 'bg-emerald-500'
                                                    : 'bg-slate-300 dark:bg-slate-600'
                                                }`}
                                              />
                                            </span>

                                            <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover/topic:text-blue-600 dark:group-hover/topic:text-cyan-400 transition-colors truncate">
                                              {topic.title}
                                            </span>

                                            {!topicVisible && (
                                              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded px-1.5 py-0.5 shrink-0">
                                                Oculto
                                              </span>
                                            )}

                                            {hasTopicQuiz && (
                                              <span
                                                className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 rounded px-1.5 py-0.2 shrink-0 hidden md:inline-block"
                                                title="Este tema cuenta con Quiz de evaluación"
                                              >
                                                Quiz
                                              </span>
                                            )}

                                            <span className="text-[11px] font-semibold text-blue-600 dark:text-cyan-400 opacity-0 group-hover/topic:opacity-100 transition-opacity hidden lg:inline-flex items-center gap-0.5 shrink-0">
                                              <SlidersHorizontal className="w-3 h-3 mr-0.5" />
                                              Configurar
                                            </span>
                                          </div>

                                          {/* Derecha: Píldoras Minimalistas (Profesor + Fecha) + Acciones Rápidas */}
                                          <div
                                            className="flex items-center justify-end gap-1.5 shrink-0 flex-wrap"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {/* Píldora minimalista de Profesor Asignado */}
                                            {quickAssignTeacher ? (
                                              <button
                                                type="button"
                                                disabled={busyKey !== null}
                                                onClick={() =>
                                                  void handleQuickAssignTeacherToTopic(
                                                    mod.id,
                                                    topic,
                                                    quickAssignTeacher
                                                  )
                                                }
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs"
                                              >
                                                <UserPlus className="w-3 h-3" />
                                                <span>
                                                  + {getShortDoctorName(quickAssignTeacher.name)}
                                                </span>
                                              </button>
                                            ) : topicComms.length > 0 ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setActiveTopicDrawer({
                                                    moduleId: mod.id,
                                                    topicId: topic.id,
                                                    parentTopicId: null,
                                                    initialTab: 'teaching',
                                                  })
                                                }
                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 text-[11px] font-semibold hover:bg-indigo-100 transition cursor-pointer"
                                                title={`Profesor asignado: ${topicComms
                                                  .map((c) => c.teacher_name)
                                                  .join(', ')}. Clic para cambiar.`}
                                              >
                                                <span className="w-4 h-4 rounded bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                                  {getInitials(
                                                    topicComms[0].teacher_name || 'Profesor'
                                                  )}
                                                </span>
                                                <span className="max-w-[120px] truncate">
                                                  {getShortDoctorName(
                                                    topicComms[0].teacher_name || 'Profesor'
                                                  )}
                                                </span>
                                                {topicComms.length > 1 && (
                                                  <span className="text-[10px] font-black">
                                                    +{topicComms.length - 1}
                                                  </span>
                                                )}
                                              </button>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setActiveTopicDrawer({
                                                    moduleId: mod.id,
                                                    topicId: topic.id,
                                                    parentTopicId: null,
                                                    initialTab: 'teaching',
                                                  })
                                                }
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 dark:hover:text-indigo-300 text-[11px] font-medium transition cursor-pointer"
                                                title="Asignar profesor adjunto a este tema"
                                              >
                                                <UserPlus className="w-3 h-3" />
                                                <span>Docente</span>
                                              </button>
                                            )}

                                            {/* Píldora minimalista de Fecha / Corte */}
                                            {scheduledWorkshop ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setActiveTopicDrawer({
                                                    moduleId: mod.id,
                                                    topicId: topic.id,
                                                    parentTopicId: null,
                                                    initialTab: 'teaching',
                                                  })
                                                }
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 border border-blue-200/70 dark:border-blue-800/60 text-[11px] font-semibold cursor-pointer"
                                                title={`Clase programada: ${new Date(
                                                  scheduledWorkshop.scheduled_at
                                                ).toLocaleString('es-MX')}`}
                                              >
                                                <Calendar className="w-3 h-3" />
                                                <span>
                                                  {new Date(
                                                    scheduledWorkshop.scheduled_at
                                                  ).toLocaleDateString('es-MX', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                  })}
                                                </span>
                                              </button>
                                            ) : milestoneEntry ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setActiveTopicDrawer({
                                                    moduleId: mod.id,
                                                    topicId: topic.id,
                                                    parentTopicId: null,
                                                    initialTab: 'teaching',
                                                  })
                                                }
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold cursor-pointer"
                                                title={`${milestoneEntry.milestone.title}`}
                                              >
                                                <span>C{milestoneEntry.index}</span>
                                              </button>
                                            ) : null}

                                            {/* Acciones discretas (Visibilidad, Orden y Eliminar) */}
                                            <div className="flex items-center gap-0.5 pl-1 border-l border-slate-200/70 dark:border-slate-800">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  toggleTopicVisible(
                                                    mod.id,
                                                    topic.id,
                                                    topicVisible,
                                                    order
                                                  )
                                                }
                                                disabled={busyKey !== null}
                                                title={
                                                  topicVisible
                                                    ? 'Ocultar tema a los alumnos'
                                                    : 'Mostrar tema a los alumnos'
                                                }
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                              >
                                                {topicVisible ? (
                                                  <Eye className="w-3.5 h-3.5" />
                                                ) : (
                                                  <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                                                )}
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => moveTopic(mod.id, topic.id, -1)}
                                                disabled={busyKey !== null || tIndex === 0}
                                                title="Subir tema"
                                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 transition cursor-pointer hidden sm:inline-flex"
                                              >
                                                <ChevronUp className="w-3.5 h-3.5" />
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => moveTopic(mod.id, topic.id, 1)}
                                                disabled={
                                                  busyKey !== null ||
                                                  tIndex === filteredTopicRows.length - 1
                                                }
                                                title="Bajar tema"
                                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 transition cursor-pointer hidden sm:inline-flex"
                                              >
                                                <ChevronDown className="w-3.5 h-3.5" />
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setTopicToDelete({
                                                    moduleId: mod.id,
                                                    moduleTitle: mod.title,
                                                    topicId: topic.id,
                                                    topicTitle: topic.title,
                                                  })
                                                }
                                                disabled={busyKey !== null}
                                                title="Eliminar tema"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Subtemas (si existen) */}
                                        {visibleSubtopics.length > 0 && (
                                          <ul className="px-3 pb-2.5 pt-1 ml-5 border-t border-slate-100 dark:border-slate-800/70 space-y-1">
                                            {visibleSubtopics.map((sub, subIndex) => {
                                              const subOv = overrides.find(
                                                (o) =>
                                                  o.module_id === mod.id && o.topic_id === sub.id
                                              );
                                              const subVisible = subOv?.is_visible ?? true;
                                              const subOrder = subOv?.sort_order ?? subIndex;
                                              const subComms =
                                                commitmentsByTopicId.get(sub.id) ?? [];

                                              return (
                                                <li
                                                  key={sub.id}
                                                  onClick={() =>
                                                    setActiveTopicDrawer({
                                                      moduleId: mod.id,
                                                      topicId: sub.id,
                                                      parentTopicId: topic.id,
                                                      initialTab: 'teaching',
                                                    })
                                                  }
                                                  className={`flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-slate-800 text-xs cursor-pointer transition ${
                                                    subVisible ? '' : 'opacity-50'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <span className="text-blue-500/70 dark:text-cyan-400/70 shrink-0 select-none">
                                                      ↳
                                                    </span>
                                                    <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
                                                      {sub.title}
                                                    </span>
                                                    {!subVisible && (
                                                      <span className="text-[9px] uppercase font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded px-1 py-0.2 shrink-0">
                                                        Oculto
                                                      </span>
                                                    )}
                                                  </div>

                                                  <div
                                                    className="flex items-center gap-1 shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    {subComms.length > 0 && (
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                                                        {getInitials(
                                                          subComms[0].teacher_name || 'DR'
                                                        )}
                                                      </span>
                                                    )}

                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        toggleTopicVisible(
                                                          mod.id,
                                                          sub.id,
                                                          subVisible,
                                                          subOrder
                                                        )
                                                      }
                                                      title={
                                                        subVisible
                                                          ? 'Ocultar subtema'
                                                          : 'Mostrar subtema'
                                                      }
                                                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                                    >
                                                      {subVisible ? (
                                                        <Eye className="w-3 h-3" />
                                                      ) : (
                                                        <EyeOff className="w-3 h-3 text-amber-500" />
                                                      )}
                                                    </button>

                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setTopicToDelete({
                                                          moduleId: mod.id,
                                                          moduleTitle: mod.title,
                                                          topicId: sub.id,
                                                          topicTitle: sub.title,
                                                          isSubtopic: true,
                                                        })
                                                      }
                                                      title="Eliminar subtema"
                                                      className="p-1 rounded text-slate-400 hover:text-rose-600"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        )}
                                      </li>
                                    );
                                  }
                                )}
                              </ul>

                              {/* Pie del módulo: Agregar tema */}
                              <div className="pt-2 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenCreateModal(mod.id, mod.title, null, null)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-blue-400/80 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-cyan-400 text-xs font-bold hover:bg-blue-100/60 transition cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Agregar tema en {mod.title.split(':')[0]}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ─── PANEL LATERAL DE CONFIGURACIÓN DEL TEMA (DRAWER) ─── */}
      <TopicConfigDrawer
        isOpen={Boolean(drawerContext)}
        onClose={() => setActiveTopicDrawer(null)}
        course={selectedCourse}
        module={drawerContext?.mod ?? null}
        topic={drawerContext?.topic ?? null}
        parentTopic={drawerContext?.parentTopic ?? null}
        isVisible={drawerContext?.isVisible ?? true}
        sortOrder={drawerContext?.sortOrder ?? 0}
        canMoveUp={drawerContext?.canMoveUp ?? false}
        canMoveDown={drawerContext?.canMoveDown ?? false}
        initialTab={activeTopicDrawer?.initialTab ?? 'teaching'}
        teachers={teacherOptions}
        commitments={commitments}
        workshops={adminWorkshops}
        milestones={milestones}
        courseModules={modulesForStaff}
        hasQuiz={drawerContext ? quizTopicIds.has(drawerContext.topic.id) : false}
        onToggleVisible={() => {
          if (!drawerContext) return;
          toggleTopicVisible(
            drawerContext.mod.id,
            drawerContext.topic.id,
            drawerContext.isVisible,
            drawerContext.sortOrder
          );
        }}
        onMove={(direction) => {
          if (!drawerContext) return;
          if (drawerContext.parentTopic) {
            moveSiblings(
              drawerContext.mod.id,
              drawerContext.siblings,
              drawerContext.topic.id,
              direction
            );
          } else {
            moveTopic(drawerContext.mod.id, drawerContext.topic.id, direction);
          }
        }}
        onAssignTeacher={async ({
          teacherId,
          teacherName,
          includeSubtopics,
          milestoneId,
        }) => {
          if (!drawerContext) return;
          const targetIds = includeSubtopics
            ? collectTopicAndChildrenIds(drawerContext.topic)
            : [drawerContext.topic.id];
          await assignTopicsToTeacher({
            topicIds: targetIds,
            moduleId: drawerContext.mod.id,
            teacherId,
            teacherName,
            milestoneId,
          });
          const updated = await listTopicTeachingCommitments();
          setCommitments(updated);
          if (!teacherOptions.some((t) => t.id === teacherId)) {
            setTeacherOptions((prev) => [
              ...prev,
              {
                id: teacherId,
                name: teacherName,
                specialty: 'Profesor Adjunto',
                roleLabel: 'Docente',
              },
            ]);
          }
        }}
        onRemoveTeacher={async ({ teacherId, commitmentIds, includeSubtopics }) => {
          if (!drawerContext) return;
          const targetIds = includeSubtopics
            ? collectTopicAndChildrenIds(drawerContext.topic)
            : [drawerContext.topic.id];
          await removeTeacherFromTopics({
            topicIds: targetIds,
            teacherId,
            commitmentIds,
          });
          const updated = await listTopicTeachingCommitments();
          setCommitments(updated);
        }}
        onScheduleClass={async ({
          workshopId,
          title,
          scheduledAt,
          durationMinutes,
          streamUrl,
          teacherId,
          teacherName,
          additionalTopics = [],
        }) => {
          if (!drawerContext || !user) return;
          let savedWorkshop: LiveWorkshop;
          if (workshopId) {
            savedWorkshop = await updateWorkshop(workshopId, {
              title,
              scheduled_at: scheduledAt,
              duration_minutes: durationMinutes,
              stream_url: streamUrl || null,
            });
          } else {
            savedWorkshop = await createWorkshop({
              module_id: drawerContext.mod.id,
              topic_id: drawerContext.topic.id,
              title,
              description: drawerContext.topic.description ?? null,
              scheduled_at: scheduledAt,
              duration_minutes: durationMinutes,
              stream_url: streamUrl || null,
              recording_url: null,
              max_capacity: null,
              clinical_case_revision_id: null,
              clinical_case_json: null,
              status: 'scheduled',
              created_by: user.id,
            });
          }
          if (teacherId && teacherName) {
            const sessionTopics = [
              { topicId: drawerContext.topic.id, moduleId: drawerContext.mod.id },
              ...additionalTopics.filter((t) => t.topicId !== drawerContext.topic.id),
            ];
            const byModule = new Map<string, string[]>();
            for (const item of sessionTopics) {
              const list = byModule.get(item.moduleId) ?? [];
              if (!list.includes(item.topicId)) list.push(item.topicId);
              byModule.set(item.moduleId, list);
            }
            for (const [moduleId, topicIds] of byModule) {
              await assignTopicsToTeacher({
                topicIds,
                moduleId,
                teacherId,
                teacherName,
                workshopId: savedWorkshop.id,
              });
            }
          }
          await loadAuxiliaryData();
        }}
        onAssignMilestone={async (milestoneId) => {
          if (!drawerContext) return;
          const topicId = drawerContext.topic.id;
          // 1. Remover el tema de otros cortes si estaba y agregarlo al corte elegido
          for (const m of milestones) {
            const currentList = m.target_topic_ids ?? [];
            const hasIt = currentList.includes(topicId);
            if (m.id === milestoneId && !hasIt) {
              await saveMilestone({
                ...m,
                target_topic_ids: [...currentList, topicId],
              });
            } else if (m.id !== milestoneId && hasIt) {
              await saveMilestone({
                ...m,
                target_topic_ids: currentList.filter((id) => id !== topicId),
              });
            }
          }
          // 2. Si ya hay un profesor asignado, actualizar su milestone_id también
          const topicComms = commitmentsByTopicId.get(topicId) ?? [];
          for (const c of topicComms) {
            await assignTopicsToTeacher({
              topicIds: [topicId],
              moduleId: drawerContext.mod.id,
              teacherId: c.teacher_id,
              teacherName: c.teacher_name || 'Profesor',
              milestoneId,
            });
          }
          await loadAuxiliaryData();
        }}
        onSaveTopicMeta={async ({ title, description, clinicalPearl }) => {
          if (!drawerContext || !user) return;
          await updateTopicDirectly({
            moduleId: drawerContext.mod.id,
            topicId: drawerContext.topic.id,
            parentId: drawerContext.parentTopic?.id ?? null,
            title,
            description,
            content: drawerContext.topic.content,
            clinicalPearls: clinicalPearl
              ? [clinicalPearl, ...(drawerContext.topic.clinicalPearls?.slice(1) ?? [])]
              : drawerContext.topic.clinicalPearls,
            authorId: user.id,
          });
          await reload();
        }}
        onCreateSubtopic={() => {
          if (!drawerContext) return;
          handleOpenCreateModal(
            drawerContext.mod.id,
            drawerContext.mod.title,
            drawerContext.topic.id,
            drawerContext.topic.title
          );
        }}
        onSelectSubtopic={(sub) => {
          if (!drawerContext) return;
          setActiveTopicDrawer({
            moduleId: drawerContext.mod.id,
            topicId: sub.id,
            parentTopicId: drawerContext.topic.id,
            initialTab: 'teaching',
          });
        }}
        onOpenQuizEditor={() => {
          if (!drawerContext) return;
          setQuizModalState({
            isOpen: true,
            moduleId: drawerContext.mod.id,
            topicId: drawerContext.topic.id,
          });
        }}
        onOpenAssignExam={() => {
          if (!drawerContext) return;
          setExamModalState({
            isOpen: true,
            courseId: selectedCourse?.id,
            moduleId: drawerContext.mod.id,
            topicId: drawerContext.parentTopic
              ? drawerContext.parentTopic.id
              : drawerContext.topic.id,
            subtopicId: drawerContext.parentTopic ? drawerContext.topic.id : undefined,
          });
        }}
        onOpenClassWizard={() => {
          if (!drawerContext) return;
          setClassWizardState({
            isOpen: true,
            moduleId: drawerContext.mod.id,
            topicId: drawerContext.topic.id,
            workshop: workshopByTopicId.get(drawerContext.topic.id) ?? null,
          });
        }}
      />

      {/* ─── MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE TEMA ─── */}
      {topicToDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Eliminar {topicToDelete.isSubtopic ? 'subtema' : 'tema'}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  ¿Quitar &ldquo;{topicToDelete.topicTitle}&rdquo;?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Módulo: {topicToDelete.moduleTitle}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
              Este tema dejará de aparecer en el temario del curso. Si solo deseas ocultarlo temporalmente sin quitarlo, usa el ícono del ojo (👁️).
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setTopicToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteTopic()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE CURSO ─── */}
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
                <h3
                  id="modal-delete-title"
                  className="text-base font-extrabold text-slate-900 dark:text-white truncate"
                >
                  ¿Eliminar &ldquo;{courseToDelete.title}&rdquo;?
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
                onClick={handleConfirmDeleteCourse}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Eliminando…' : 'Sí, eliminar curso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODALES COMPLEMENTARIOS ─── */}
      <CourseEditorModal
        isOpen={createCourseOpen || editCourseModalOpen}
        onClose={() => {
          setCreateCourseOpen(false);
          setEditCourseModalOpen(false);
          setTemplateCourseForClone(null);
        }}
        course={editCourseModalOpen ? selectedCourse : null}
        templateCourse={createCourseOpen ? templateCourseForClone : null}
        initialTab={courseModalInitialTab}
        allCourses={courses}
        allModules={allModules}
        assignedModuleIds={
          editCourseModalOpen && selectedCourse
            ? rowsForCourse(selectedCourse.id).map((r) => r.assignment.module_id)
            : templateCourseForClone
            ? rowsForCourse(templateCourseForClone.id).map((r) => r.assignment.module_id)
            : []
        }
        workshops={adminWorkshops}
        teachers={teacherOptions.map((t) => ({ name: t.name, title: t.specialty }))}
        onSave={handleSaveCourseModal}
        onDelete={
          editCourseModalOpen && selectedCourse
            ? () => handleRequestDeleteCourse(selectedCourse)
            : undefined
        }
        onDuplicate={
          editCourseModalOpen && selectedCourse
            ? () => {
                const base = selectedCourse;
                setEditCourseModalOpen(false);
                setTemplateCourseForClone(base);
                setCourseModalInitialTab('general');
                setCreateCourseOpen(true);
              }
            : undefined
        }
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
          notifySuccess(`Tema "${createdTopicId}" creado y publicado en el temario.`);
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
          notifySuccess('Examen creado y enviado exitosamente a los alumnos.');
        }}
      />

      <AdminQuizEditorModal
        isOpen={quizModalState.isOpen}
        onClose={() => setQuizModalState({ isOpen: false })}
        initialModuleId={quizModalState.moduleId}
        initialTopicId={quizModalState.topicId}
        onSaved={async () => {
          await loadAuxiliaryData();
          notifySuccess('Cuestionario (Quiz) del tema actualizado.');
        }}
      />

      <CreateLiveClassModal
        isOpen={classWizardState.isOpen}
        onClose={() => setClassWizardState({ isOpen: false })}
        initialModuleId={classWizardState.moduleId}
        initialTopicId={classWizardState.topicId}
        initialWorkshop={classWizardState.workshop}
        onSuccess={async () => {
          setClassWizardState({ isOpen: false });
          await loadAuxiliaryData();
          notifySuccess('Clase en vivo sincronizada con el calendario y el tema.');
        }}
      />

      <AcademicScheduleManagerModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        profiles={adminProfiles}
        onUpdated={async () => {
          await loadAuxiliaryData();
          notifySuccess('Calendario de cortes actualizado.');
        }}
      />
    </AdminLayout>
  );
}
