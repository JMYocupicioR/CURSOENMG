import type { AcademicMilestone, GradebookRubricConfig, RubricKey } from '../types/academicGradebook';
import type {
  CalendarBoardView,
  CalendarItem,
  CalendarItemType,
  CalendarRubricSnapshot,
} from '../types/academicCalendar';
import type { LiveWorkshop } from '../types/database';
import type { AssignmentType, StudentAssignment } from '../types/studentPlan';

const ASSIGNMENT_RUBRIC: Record<AssignmentType, RubricKey> = {
  exam: 'exams',
  clinical_case: 'assignments',
  reading: 'assignments',
  emg_report: 'assignments',
  practical_task: 'assignments',
};

const TYPE_FROM_ASSIGNMENT: Record<AssignmentType, CalendarItemType> = {
  exam: 'exam',
  clinical_case: 'clinical_case',
  reading: 'reading',
  emg_report: 'emg_report',
  practical_task: 'practical_task',
};

export const CALENDAR_TYPE_LABELS: Record<CalendarItemType, string> = {
  session: 'Clase en vivo',
  exam: 'Examen',
  clinical_case: 'Caso EMG',
  reading: 'Lectura',
  emg_report: 'Informe EMG',
  practical_task: 'Tarea práctica',
  milestone: 'Corte académico',
};

/** Local calendar day key YYYY-MM-DD (week starts conceptually Monday). */
export function toLocalDateKey(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
}

export function startOfWeekMonday(date: Date): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = next.getDay(); // 0 Sunday
  const offset = weekday === 0 ? -6 : 1 - weekday;
  next.setDate(next.getDate() + offset);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfWeekMonday(date: Date): Date {
  const start = startOfWeekMonday(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeekMonday(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function getMonthGridDays(anchor: Date): Date[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeekMonday(firstOfMonth);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function addMonths(anchor: Date, delta: number): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
}

export function addDays(anchor: Date, delta: number): Date {
  const next = new Date(anchor);
  next.setDate(anchor.getDate() + delta);
  return next;
}

export function formatMonthTitle(anchor: Date): string {
  const label = anchor.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeekTitle(anchor: Date): string {
  const start = startOfWeekMonday(anchor);
  const end = endOfWeekMonday(anchor);
  const startLabel = start.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  const endLabel = end.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

export function assignmentRubricKey(type: AssignmentType): RubricKey {
  return ASSIGNMENT_RUBRIC[type] ?? 'assignments';
}

export function assignmentGroupKey(assignment: StudentAssignment): string {
  const day = toLocalDateKey(assignment.due_date);
  const patternId = assignment.target_exam_config?.patternId ?? '';
  const moduleId = assignment.target_module_id ?? assignment.target_exam_config?.moduleId ?? '';
  return [assignment.type, assignment.title.trim(), day, patternId, moduleId].join('|');
}

function isDeliveredStatus(status: StudentAssignment['status']): boolean {
  return status === 'submitted' || status === 'approved' || status === 'needs_revision';
}

export function groupAssignmentsIntoEvents(assignments: StudentAssignment[]): CalendarItem[] {
  const groups = new Map<string, StudentAssignment[]>();
  for (const assignment of assignments) {
    if (!assignment.due_date) continue;
    const key = assignmentGroupKey(assignment);
    const list = groups.get(key);
    if (list) list.push(assignment);
    else groups.set(key, [assignment]);
  }

  return [...groups.entries()].map(([key, rows]) => {
    const first = rows[0];
    const studentIds = [...new Set(rows.map((row) => row.student_id))];
    const submittedCount = rows.filter((row) => isDeliveredStatus(row.status)).length;
    const approvedCount = rows.filter((row) => row.status === 'approved').length;
    const pendingCount = rows.filter((row) => row.status === 'pending' || row.status === 'overdue').length;
    const dueDay = toLocalDateKey(first.due_date);
    return {
      id: `asggrp_${key}`,
      type: TYPE_FROM_ASSIGNMENT[first.type],
      title: first.title,
      description: first.description,
      materials: first.materials ?? null,
      startsAt: dueDay || first.due_date,
      endsAt: dueDay || first.due_date,
      allDay: true,
      rubricKey: assignmentRubricKey(first.type),
      countsForKardex: true,
      sourceIds: rows.map((row) => row.id),
      assignmentIds: rows.map((row) => row.id),
      studentIds,
      studentCount: studentIds.length,
      submittedCount,
      approvedCount,
      pendingCount,
      moduleId: first.target_module_id ?? first.target_exam_config?.moduleId ?? null,
      topicId: first.target_topic_id ?? null,
      patternId: first.target_exam_config?.patternId ?? null,
      assignmentType: first.type,
    };
  });
}

export function workshopToCalendarItem(workshop: LiveWorkshop): CalendarItem {
  const start = new Date(workshop.scheduled_at);
  const duration = workshop.duration_minutes || 90;
  const end = new Date(start.getTime() + duration * 60_000);
  const counts = workshop.counts_for_kardex !== false;
  return {
    id: `ws_${workshop.id}`,
    type: 'session',
    title: workshop.title,
    description: workshop.description,
    startsAt: workshop.scheduled_at,
    endsAt: end.toISOString(),
    allDay: false,
    rubricKey: 'attendance',
    countsForKardex: counts,
    sourceIds: [workshop.id],
    assignmentIds: [],
    studentIds: [],
    studentCount: 0,
    submittedCount: 0,
    approvedCount: 0,
    pendingCount: 0,
    workshopId: workshop.id,
    moduleId: workshop.module_id,
    topicId: workshop.topic_id,
    workshopStatus: workshop.status,
    modality: workshop.session_modality ?? null,
  };
}

export function milestoneToCalendarItem(milestone: AcademicMilestone): CalendarItem {
  return {
    id: `mls_${milestone.id}`,
    type: 'milestone',
    title: milestone.title,
    description: milestone.description,
    startsAt: milestone.start_date,
    endsAt: milestone.due_date,
    allDay: true,
    rubricKey: 'curriculum',
    countsForKardex: true,
    sourceIds: [milestone.id],
    assignmentIds: [],
    studentIds: [],
    studentCount: 0,
    submittedCount: 0,
    approvedCount: 0,
    pendingCount: 0,
    milestoneId: milestone.id,
    passingGrade: milestone.passing_grade,
    topicCount: milestone.target_topic_ids?.length ?? 0,
  };
}

function itemDateKey(iso: string, allDay: boolean): string {
  if (allDay && /^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  return toLocalDateKey(iso);
}

export function itemOverlapsDay(item: CalendarItem, day: Date): boolean {
  const key = toLocalDateKey(day);
  if (!key) return false;
  const startKey = itemDateKey(item.startsAt, item.allDay);
  const endKey = itemDateKey(item.endsAt || item.startsAt, item.allDay);
  if (!startKey || !endKey) return false;
  return key >= startKey && key <= endKey;
}

export function itemsForDay(items: CalendarItem[], day: Date): CalendarItem[] {
  return items
    .filter((item) => itemOverlapsDay(item, day))
    .sort((a, b) => {
      if (a.type === 'milestone' && b.type !== 'milestone') return -1;
      if (b.type === 'milestone' && a.type !== 'milestone') return 1;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
}

export function itemsInRange(items: CalendarItem[], start: Date, end: Date): CalendarItem[] {
  const startKey = toLocalDateKey(start);
  const endKey = toLocalDateKey(end);
  return items
    .filter((item) => {
      const itemStart = itemDateKey(item.startsAt, item.allDay);
      const itemEnd = itemDateKey(item.endsAt || item.startsAt, item.allDay);
      return itemStart <= endKey && itemEnd >= startKey;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function buildRubricSnapshot(
  config: GradebookRubricConfig,
  items: CalendarItem[]
): CalendarRubricSnapshot {
  const buckets = config.rubrics.map((rubric) => ({
    key: rubric.id,
    name: rubric.name,
    weight: rubric.weight,
    enabled: rubric.enabled,
    description: rubric.description,
    eventCount: items.filter((item) => {
      if (!rubric.enabled) return false;
      if (item.rubricKey !== rubric.id) return false;
      if (item.type === 'session' && !item.countsForKardex) return false;
      return true;
    }).length,
  }));

  return {
    title: config.title,
    minPassingGrade: config.minPassingGrade,
    totalWeight: buckets.reduce((sum, bucket) => sum + (bucket.enabled ? bucket.weight : 0), 0),
    buckets,
    config,
  };
}

/** Lecturas e informes EMG comparten el filtro Tareas con la tarea práctica. */
export const HOMEWORK_CALENDAR_TYPES: CalendarItemType[] = ['practical_task', 'reading', 'emg_report'];

export function calendarTypesForFilter(filter: CalendarItemType | 'all'): CalendarItemType[] | 'all' {
  if (filter === 'all') return 'all';
  if (filter === 'practical_task') return HOMEWORK_CALENDAR_TYPES;
  return [filter];
}

export function filterItemsByTypes(items: CalendarItem[], types: CalendarItemType[] | 'all'): CalendarItem[] {
  if (types === 'all' || types.length === 0) return items;
  const allowed = new Set(types);
  return items.filter((item) => allowed.has(item.type));
}

/** All-day values stored as YYYY-MM-DD stay on that calendar day in any timezone. */
export function calendarItemStartDate(startsAt: string, allDay: boolean): Date {
  if (allDay && /^\d{4}-\d{2}-\d{2}/.test(startsAt)) return parseLocalDateKey(startsAt.slice(0, 10));
  return new Date(startsAt);
}

export function localDateTimeInputValue(date: Date, hours = 19, minutes = 0): string {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  const tzOffset = next.getTimezoneOffset() * 60000;
  return new Date(next.getTime() - tzOffset).toISOString().slice(0, 16);
}

export const CALENDAR_BOARD_VIEW_STORAGE_KEY = 'neurosafe_admin_calendar_view';

export function isCalendarBoardView(value: unknown): value is CalendarBoardView {
  return value === 'month' || value === 'week' || value === 'agenda';
}

export function readCalendarBoardView(storage?: Pick<Storage, 'getItem'> | null): CalendarBoardView | null {
  try {
    const raw = storage?.getItem(CALENDAR_BOARD_VIEW_STORAGE_KEY);
    return isCalendarBoardView(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeCalendarBoardView(
  view: CalendarBoardView,
  storage?: Pick<Storage, 'setItem'> | null
): void {
  try {
    storage?.setItem(CALENDAR_BOARD_VIEW_STORAGE_KEY, view);
  } catch {
    // Private mode / quota — keep the in-memory view.
  }
}

export function defaultCalendarBoardView(options?: {
  storage?: Pick<Storage, 'getItem'> | null;
  narrowViewport?: boolean;
}): CalendarBoardView {
  const stored = readCalendarBoardView(options?.storage);
  if (stored) return stored;
  return options?.narrowViewport ? 'week' : 'month';
}
