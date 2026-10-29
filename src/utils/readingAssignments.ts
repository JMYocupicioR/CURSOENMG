import type { AssignmentStatus, AssignmentType } from '../types/studentPlan';

export const READING_TOPIC_LIMIT = 40;
export const READING_REMINDER_HOURS = 48;
export const DELIVERY_REMINDER_HOURS = 24;

export type HomeworkKind = 'reading' | 'reading_delivery' | 'delivery';

export interface ReadingAssignmentFields {
  type: AssignmentType;
  status: AssignmentStatus;
  due_date: string;
  requires_delivery?: boolean | null;
  reading_topic_ids?: string[] | null;
  reading_done_ids?: string[] | null;
  reading_completed_at?: string | null;
}

export interface ReadingAssignmentView {
  hasReading: boolean;
  requiresDelivery: boolean;
  readingOnly: boolean;
  topicIds: string[];
  doneIds: string[];
  total: number;
  done: number;
  complete: boolean;
  late: boolean;
  /** Texto del estatus cuando la tarea es solo lectura. */
  statusLabel: string | null;
  /** Texto corto de la parte de lectura cuando también hay entrega. */
  progressLabel: string | null;
}

export function assignmentRequiresDelivery(assignment: {
  type: AssignmentType;
  requires_delivery?: boolean | null;
}): boolean {
  if (typeof assignment.requires_delivery === 'boolean') return assignment.requires_delivery;
  return assignment.type === 'practical_task' || assignment.type === 'emg_report';
}

export function readingTopicIds(assignment: { reading_topic_ids?: string[] | null }): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of assignment.reading_topic_ids ?? []) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    ids.push(trimmed);
  }
  return ids;
}

export function describeReadingAssignment(
  assignment: ReadingAssignmentFields,
  now = Date.now()
): ReadingAssignmentView {
  const topicIds = readingTopicIds(assignment);
  const doneSet = new Set((assignment.reading_done_ids ?? []).map((id) => id.trim()).filter(Boolean));
  const doneIds = topicIds.filter((id) => doneSet.has(id));
  const total = topicIds.length;
  const done = doneIds.length;
  const hasReading = total > 0;
  const complete =
    hasReading && (done === total || Boolean(assignment.reading_completed_at));
  const completedAt = assignment.reading_completed_at
    ? new Date(assignment.reading_completed_at).getTime()
    : Number.NaN;
  const dueAt = new Date(assignment.due_date).getTime();
  const late = complete && Number.isFinite(completedAt) && Number.isFinite(dueAt) && completedAt > dueAt;
  const requiresDelivery = assignmentRequiresDelivery(assignment);
  const readingOnly = hasReading && !requiresDelivery;
  const overdue = Number.isFinite(dueAt) && dueAt < now && assignment.status === 'pending';

  let statusLabel: string | null = null;
  if (readingOnly && complete && late) statusLabel = 'Lectura cumplida con retraso';
  else if (readingOnly && complete) statusLabel = 'Lectura cumplida';
  else if (readingOnly && overdue) statusLabel = 'Lectura vencida';
  else if (readingOnly) statusLabel = 'Lectura pendiente';

  const progressLabel = hasReading && requiresDelivery
    ? complete
      ? late
        ? `Lectura ${done}/${total}, con retraso`
        : `Lectura ${done}/${total} lista`
      : `Lectura ${done}/${total}`
    : null;

  return {
    hasReading,
    requiresDelivery,
    readingOnly,
    topicIds,
    doneIds,
    total,
    done,
    complete,
    late,
    statusLabel,
    progressLabel,
  };
}

export function reminderWindowHours(assignment: ReadingAssignmentFields): number {
  return describeReadingAssignment(assignment).hasReading
    ? READING_REMINDER_HOURS
    : DELIVERY_REMINDER_HOURS;
}

export function dueSoonCopy(
  assignment: ReadingAssignmentFields & { title?: string | null },
  hoursLeft: number
): { title: string; body: string } | null {
  if (!(hoursLeft > 0) || hoursLeft > reminderWindowHours(assignment)) return null;
  const reading = describeReadingAssignment(assignment);
  const when = new Date(assignment.due_date).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const title = assignment.title?.trim() || 'tu tarea';

  if (assignment.type === 'clinical_case') {
    return {
      title: 'Caso clínico por vencer',
      body: `Vence el ${when}. Ábrelo para resolverlo.`,
    };
  }

  if (reading.readingOnly) {
    return {
      title: `Lectura por vencer: ${title}`,
      body: `Llevas ${reading.done} de ${reading.total} temas. La fecha límite es el ${when}.`,
    };
  }

  if (reading.hasReading && reading.complete) {
    return {
      title: `Falta tu entrega: ${title}`,
      body: `La lectura ya está cumplida. La entrega vence el ${when}.`,
    };
  }

  if (reading.hasReading) {
    return {
      title: `Lectura por vencer: ${title}`,
      body: `Llevas ${reading.done} de ${reading.total} temas y aún falta la entrega. Fecha límite: ${when}.`,
    };
  }

  if (hoursLeft > DELIVERY_REMINDER_HOURS) return null;

  return {
    title: `Entrega próxima: ${title}`,
    body: `Vence el ${when}.`,
  };
}

export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
