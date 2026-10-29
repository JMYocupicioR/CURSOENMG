import type { Module, Topic } from '../types/content';
import type { Course, CourseId, CourseModuleRow, SyllabusTopicOverride } from '../types/database';

export const COURSE_IDS = ['principiante', 'intermedio', 'avanzado'] as const;
export const SELLABLE_COURSE_IDS: CourseId[] = ['principiante', 'intermedio', 'avanzado'];

export const DEFAULT_COURSES: Course[] = [
  {
    id: 'principiante',
    title: 'Curso Principiante',
    description:
      'Fundamentos de neurofisiología clínica, técnicas de neuroconducción y EMG de aguja, anatomía topográfica, patologías neuromusculares frecuentes y control de calidad. Pensado para quien inicia en electrodiagnóstico.',
    sort_order: 1,
    price_display: 'Consultar',
    is_active: true,
    is_sellable: true,
    updated_at: '',
    updated_by: null,
  },
  {
    id: 'intermedio',
    title: 'Curso Intermedio',
    description:
      'De la técnica a la práctica real: criterios diagnósticos, algoritmos, diagnóstico diferencial por síndrome y planificación del estudio con informe EMG.',
    sort_order: 2,
    price_display: 'Consultar',
    is_active: true,
    is_sellable: true,
    updated_at: '',
    updated_by: null,
  },
  {
    id: 'avanzado',
    title: 'Curso Avanzado',
    description:
      'Técnicas especiales, casos clínicos de alta complejidad y actualizaciones por patología para el electrodiagnóstico de referencia.',
    sort_order: 3,
    price_display: 'Consultar',
    is_active: true,
    is_sellable: true,
    updated_at: '',
    updated_by: null,
  },
];

/** Default module → course assignment (mirrors the SQL seed). */
export const DEFAULT_COURSE_MODULES: CourseModuleRow[] = [
  { module_id: 'fundamentals', course_id: 'principiante', sort_order: 1, is_visible: true },
  { module_id: 'nerve-conduction', course_id: 'principiante', sort_order: 2, is_visible: true },
  { module_id: 'emg-needle', course_id: 'principiante', sort_order: 3, is_visible: true },
  { module_id: 'late-responses', course_id: 'principiante', sort_order: 4, is_visible: true },
  { module_id: 'repetitive-stimulation', course_id: 'principiante', sort_order: 5, is_visible: true },
  { module_id: 'evoked-potentials', course_id: 'principiante', sort_order: 6, is_visible: true },
  { module_id: 'topographic-anatomy', course_id: 'principiante', sort_order: 7, is_visible: true },
  { module_id: 'pathologies', course_id: 'principiante', sort_order: 8, is_visible: true },
  { module_id: 'safety-qc', course_id: 'principiante', sort_order: 9, is_visible: true },
  { module_id: 'diagnostic-criteria', course_id: 'intermedio', sort_order: 1, is_visible: true },
  { module_id: 'syndrome-differential', course_id: 'intermedio', sort_order: 2, is_visible: true },
  { module_id: 'emg-report-planning', course_id: 'intermedio', sort_order: 3, is_visible: true },
  { module_id: 'special-studies', course_id: 'avanzado', sort_order: 1, is_visible: true },
  { module_id: 'complex-clinical-cases', course_id: 'avanzado', sort_order: 2, is_visible: true },
  { module_id: 'pathology-updates', course_id: 'avanzado', sort_order: 3, is_visible: true },
];

export const NEXT_COURSE_RECOMMENDATION: Partial<Record<string, CourseId>> = {
  principiante: 'intermedio',
  intermedio: 'avanzado',
};

const COURSE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_COURSE_IDS = new Set(['all', 'new', 'none', 'admin', 'temario', 'cursos']);

export function isCourseId(value: string | null | undefined): value is CourseId {
  return typeof value === 'string' && value.length >= 2 && value.length <= 64 && COURSE_SLUG_RE.test(value);
}

export function normalizeCourseId(value: string): CourseId {
  return value.trim().toLowerCase();
}

export function assertCreateableCourseId(rawId: string, existingIds: Iterable<string>): CourseId {
  const id = normalizeCourseId(rawId);
  if (!isCourseId(id)) {
    throw new Error('El identificador debe tener 2–64 caracteres: minúsculas, números y guiones.');
  }
  if (RESERVED_COURSE_IDS.has(id)) {
    throw new Error(`El identificador "${id}" está reservado. Elige otro slug.`);
  }
  const taken = new Set(existingIds);
  if (taken.has(id)) {
    throw new Error('Ya existe un curso con ese identificador.');
  }
  return id;
}

export function sellableCourses(courses: Course[]): Course[] {
  return [...courses]
    .filter((course) => course.is_sellable)
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'es'));
}

export function sellableCourseIds(courses: Course[]): CourseId[] {
  return sellableCourses(courses).map((course) => course.id);
}

export function previousSellableCourseId(courseId: CourseId, courses: Course[] = DEFAULT_COURSES): CourseId | null {
  const ids = sellableCourseIds(courses);
  const idx = ids.indexOf(courseId);
  return idx > 0 ? ids[idx - 1] : null;
}

export function courseDisplayTitle(courseId: string, courses?: Course[]): string {
  const found = courses?.find((course) => course.id === courseId);
  if (found?.title) return found.title;
  return courseId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function nextCourseSortOrder(courses: Course[]): number {
  return courses.reduce((max, course) => Math.max(max, course.sort_order), 0) + 1;
}

export function getCourseById(courses: Course[], courseId: string): Course | undefined {
  return courses.find((c) => c.id === courseId);
}

export function getAssignmentForModule(
  assignments: CourseModuleRow[],
  moduleId: string
): CourseModuleRow | undefined {
  return assignments.find((row) => row.module_id === moduleId);
}

export function getCourseIdForModule(assignments: CourseModuleRow[], moduleId: string): CourseId | null {
  const row = getAssignmentForModule(assignments, moduleId);
  return row ? row.course_id : null;
}

export function moduleIdsForCourse(assignments: CourseModuleRow[], courseId: CourseId, visibleOnly = true): string[] {
  return assignments
    .filter((row) => row.course_id === courseId && (!visibleOnly || row.is_visible))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => row.module_id);
}

export interface GroupedSyllabusModuleRow {
  module: Module;
  isVisible: boolean;
}

export interface GroupedSyllabusCourse {
  course: Course;
  modules: Module[];
  hiddenModules: Module[];
  /** Módulos del curso en sort_order, incluyendo ocultos. */
  rows: GroupedSyllabusModuleRow[];
}

export function groupModulesByCourse(
  modules: Module[],
  courses: Course[],
  assignments: CourseModuleRow[]
): { grouped: GroupedSyllabusCourse[]; unassigned: Module[] } {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const validCourseIds = new Set(courses.map((c) => c.id));
  const assignedIds = new Set(
    assignments.filter((a) => validCourseIds.has(a.course_id)).map((a) => a.module_id)
  );
  const sortedCourses = [...courses].sort((a, b) => a.sort_order - b.sort_order);

  const grouped = sortedCourses.map((course) => {
    const rows = assignments
      .filter((a) => a.course_id === course.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const visible: Module[] = [];
    const hidden: Module[] = [];
    const orderedRows: GroupedSyllabusModuleRow[] = [];
    for (const row of rows) {
      const mod = byId.get(row.module_id);
      if (!mod) continue;
      orderedRows.push({ module: mod, isVisible: row.is_visible });
      if (row.is_visible) visible.push(mod);
      else hidden.push(mod);
    }
    return { course, modules: visible, hiddenModules: hidden, rows: orderedRows };
  });

  const unassigned = modules.filter((m) => !assignedIds.has(m.id));
  return { grouped, unassigned };
}

export const DELETED_TOPIC_SORT_ORDER = -999;

export function isTopicDeletedOverride(ov?: SyllabusTopicOverride | null): boolean {
  return Boolean(ov && ov.sort_order <= DELETED_TOPIC_SORT_ORDER && ov.is_visible === false);
}

export interface SyllabusOverrideOptions {
  /** Si es true, reordena pero no elimina temas ocultos (vista staff). */
  includeHidden?: boolean;
  /** Si es true, incluye también los temas marcados como eliminados (-999). */
  includeDeleted?: boolean;
}

function applyTopicListOverrides(
  topics: Topic[],
  byId: Map<string, SyllabusTopicOverride>,
  includeHidden: boolean,
  includeDeleted = false
): Topic[] {
  return topics
    .map((topic, index) => {
      const ov = byId.get(topic.id);
      const deleted = isTopicDeletedOverride(ov);
      const children = topic.children?.length
        ? applyTopicListOverrides(topic.children, byId, includeHidden, includeDeleted)
        : topic.children;
      return {
        topic: children === topic.children ? topic : { ...topic, children },
        index,
        order: ov?.sort_order ?? index,
        visible: ov?.is_visible ?? true,
        deleted,
      };
    })
    .filter((entry) => {
      if (entry.deleted) return includeDeleted;
      return includeHidden || entry.visible;
    })
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map((entry) => entry.topic);
}

export function applySyllabusTopicOverrides(
  mod: Module,
  overrides: SyllabusTopicOverride[],
  options?: SyllabusOverrideOptions
): Module {
  const forMod = overrides.filter((o) => o.module_id === mod.id);
  if (forMod.length === 0) return mod;

  const byId = new Map(forMod.map((o) => [o.topic_id, o]));
  return {
    ...mod,
    topics: applyTopicListOverrides(
      mod.topics,
      byId,
      options?.includeHidden ?? false,
      options?.includeDeleted ?? false
    ),
  };
}

export function applyOverridesToModules(
  modules: Module[],
  overrides: SyllabusTopicOverride[],
  options?: SyllabusOverrideOptions
): Module[] {
  if (!overrides.length) return modules;
  return modules.map((mod) => applySyllabusTopicOverrides(mod, overrides, options));
}

export function recommendedNextCourse(owned: CourseId[], courses: Course[] = DEFAULT_COURSES): CourseId | null {
  const ownedSet = new Set(owned);
  for (const course of sellableCourses(courses)) {
    if (!ownedSet.has(course.id)) return course.id;
  }
  return null;
}
