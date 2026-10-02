import { supabase } from '../lib/supabase';
import { allModules } from '../content/modules';
import { getAllTopicIds } from './studentService';
import {
  isMissingRelationError,
  isTableMissingInSupabase,
  markTableAsMissingInSupabase,
} from './tableAvailability';
import type { AcademicMilestone, StudentMilestoneAudit, MilestoneTopicCheckItem } from '../types/academicGradebook';
import type { Topic } from '../types/content';

export const KEY_LOCAL_MILESTONES = 'neurosafe_academic_milestones_';
const KEY_ADMIN_BACKUP = 'neurosafe_academic_milestones_admin_';

// Hitos de corte predeterminados para la cohorte médica COMEFYR 2026
export const DEFAULT_ACADEMIC_MILESTONES: AcademicMilestone[] = [
  {
    id: 'mls_corte_1_fundamentos',
    cohort_id: '2026-general',
    title: 'Corte 1: Fundamentos de Neurofisiología y Conducción Nerviosa Básica',
    description: 'Bases bioeléctricas, neuroconducción motora y sensitiva, filtros y montaje de electrodos.',
    start_date: '2026-08-01T00:00:00Z',
    due_date: '2026-09-15T23:59:59Z',
    target_topic_ids: [
      'history',
      'clinical-role',
      'ethical-aspects',
      'safety-patient',
      'resting-potential',
      'action-potential',
      'nerve-structure',
      'motor-conduction',
      'sensory-conduction',
      'mixed-nerve',
      'temperature-effects',
    ],
    passing_grade: 80,
    order_index: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mls_corte_2_emg_aguja',
    cohort_id: '2026-general',
    title: 'Corte 2: Electromiografía de Aguja y Respuestas Tardías',
    description: 'Actividad de inserción, actividad espontánea anormal, morfología de PAUMs, onda F y reflejo H.',
    start_date: '2026-09-16T00:00:00Z',
    due_date: '2026-10-15T23:59:59Z',
    target_topic_ids: [
      'f-waves',
      'h-reflex',
      'axon-reflex',
      'blink-reflex',
      'emg-electrodes',
      'insertional-activity',
      'spontaneous-activity',
      'fibrillations-psws',
      'fasciculations',
      'mup-parameters',
      'recruitment-pattern',
    ],
    passing_grade: 80,
    order_index: 2,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mls_corte_3_union_radiculopatias',
    cohort_id: '2026-general',
    title: 'Corte 3: Unión Neuromuscular, Plexos y Radiculopatías',
    description: 'Estimulación repetitiva, miastenia gravis, ELA (Gold Coast) y mapeo miotomal de radiculopatías.',
    start_date: '2026-10-16T00:00:00Z',
    due_date: '2026-11-15T23:59:59Z',
    target_topic_ids: [
      'repetitive-stimulation-basics',
      'myasthenia-protocol',
      'lambert-eaton-protocol',
      'cervical-radiculopathy',
      'lumbosacral-radiculopathy',
      'brachial-plexus-anatomy',
      'lumbosacral-plexus',
      'als-gold-coast-criteria',
    ],
    passing_grade: 80,
    order_index: 3,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mls_corte_4_patologias_certificacion',
    cohort_id: '2026-general',
    title: 'Corte 4: Polineuropatías, Miopatías y Certificación COMEFYR',
    description: 'Criterios CIDP EAN/PNS 2021, variantes de Guillain-Barré, miopatías inflamatorias y control de calidad.',
    start_date: '2026-11-16T00:00:00Z',
    due_date: '2026-12-15T23:59:59Z',
    target_topic_ids: [
      'cidp-criteria-2021',
      'gbs-subtypes',
      'diabetic-neuropathy',
      'inflammatory-myopathies',
      'dystrophies',
      'qc-standards',
      'safety-electrical',
      'report-writing-standards',
    ],
    passing_grade: 80,
    order_index: 4,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

// Mapeo auxiliar de temas para resolver títulos rápidamente
function findTopicMetadata(topicId: string): { topicTitle: string; moduleId: string; moduleTitle: string } {
  for (const mod of allModules) {
    const searchRecursive = (topics: Topic[]): Topic | null => {
      for (const t of topics) {
        if (t.id === topicId) return t;
        if (t.children && t.children.length > 0) {
          const found = searchRecursive(t.children);
          if (found) return found;
        }
      }
      return null;
    };

    const target = searchRecursive(mod.topics);
    if (target) {
      return {
        topicTitle: target.title,
        moduleId: mod.id,
        moduleTitle: mod.title,
      };
    }
  }

  return {
    topicTitle: `Tema ${topicId}`,
    moduleId: 'general',
    moduleTitle: 'Temario General',
  };
}

/** Calendar day written by admins (`YYYY-MM-DD` or ISO), without timezone shift. */
export function calendarDayKey(iso: string | null | undefined): string {
  const key = (iso ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : '';
}

export function toMilestoneTimestamp(value: string, endOfDay = false): string {
  const key = calendarDayKey(value);
  if (!key) return value;
  return endOfDay ? `${key}T23:59:59.000Z` : `${key}T00:00:00.000Z`;
}

export function normalizeMilestone(milestone: AcademicMilestone): AcademicMilestone {
  const start = calendarDayKey(milestone.start_date) || calendarDayKey(milestone.due_date);
  const due = calendarDayKey(milestone.due_date) || start;
  return {
    ...milestone,
    start_date: start ? toMilestoneTimestamp(start, false) : milestone.start_date,
    due_date: due ? toMilestoneTimestamp(due, true) : milestone.due_date,
  };
}

function timestampValue(iso: string | undefined): number {
  const parsed = Date.parse(iso ?? '');
  if (!Number.isFinite(parsed)) return 0;
  // Seed rows reused period dates as updated_at (e.g. 2026-11-16). Those must
  // not outrank a real admin save made earlier in the year.
  if (parsed > Date.now() + 60_000) return 0;
  return parsed;
}

function newestUpdatedAt(list: AcademicMilestone[]): number {
  return list.reduce((max, item) => Math.max(max, timestampValue(item.updated_at)), 0);
}

export function milestoneDateSignature(milestone: AcademicMilestone): string {
  return `${calendarDayKey(milestone.start_date)}|${calendarDayKey(milestone.due_date)}`;
}

export function isDefaultSeedMilestone(milestone: AcademicMilestone): boolean {
  return DEFAULT_ACADEMIC_MILESTONES.some(
    (seed) =>
      (seed.id === milestone.id || seed.order_index === milestone.order_index) &&
      milestoneDateSignature(seed) === milestoneDateSignature(milestone)
  );
}

export function hasCustomAdminDates(list: AcademicMilestone[]): boolean {
  return list.some((item) => !isDefaultSeedMilestone(item));
}

/** Seed August–December rows are placeholders, not a saved admin calendar. */
export function usableAdminSchedule(list: AcademicMilestone[]): AcademicMilestone[] {
  const normalized = list.map(normalizeMilestone);
  return hasCustomAdminDates(normalized) ? normalized : [];
}

function sortMilestones(list: AcademicMilestone[]): AcademicMilestone[] {
  return [...list].sort((a, b) => a.order_index - b.order_index || a.due_date.localeCompare(b.due_date));
}

/** Prefer the schedule the admin last saved when remote rows are stale or unsynced. */
export function pickAuthoritativeMilestones(
  remote: AcademicMilestone[],
  local: AcademicMilestone[]
): AcademicMilestone[] {
  const rem = remote.map(normalizeMilestone);
  const loc = local.map(normalizeMilestone);
  if (!rem.length) return loc;
  if (!loc.length) return rem;

  // Hardcoded August–December seed must never hide dates typed in the calendar.
  if (hasCustomAdminDates(loc) && !hasCustomAdminDates(rem)) return sortMilestones(loc);
  if (hasCustomAdminDates(rem) && !hasCustomAdminDates(loc)) return sortMilestones(rem);

  const remoteIds = new Set(rem.map((item) => item.id));
  const hasOverlap = loc.some((item) => remoteIds.has(item.id));
  if (!hasOverlap) {
    return newestUpdatedAt(loc) >= newestUpdatedAt(rem) ? loc : rem;
  }

  const byId = new Map<string, AcademicMilestone>();
  for (const item of rem) byId.set(item.id, item);
  for (const item of loc) {
    const current = byId.get(item.id);
    const localIsCustom = !isDefaultSeedMilestone(item);
    const remoteIsSeed = current ? isDefaultSeedMilestone(current) : true;
    if (!current || (localIsCustom && remoteIsSeed) || timestampValue(item.updated_at) >= timestampValue(current.updated_at)) {
      byId.set(item.id, item);
    }
  }
  return sortMilestones([...byId.values()]);
}

function parseMilestoneList(raw: string | null): AcademicMilestone[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as AcademicMilestone[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function readLocalMilestones(): AcademicMilestone[] {
  try {
    const working = parseMilestoneList(localStorage.getItem(KEY_LOCAL_MILESTONES));
    const backup = parseMilestoneList(localStorage.getItem(KEY_ADMIN_BACKUP));
    return pickAuthoritativeMilestones(working, backup);
  } catch {
    return [];
  }
}

export function readStoredCustomMilestones(): AcademicMilestone[] {
  return usableAdminSchedule(readLocalMilestones());
}

function writeLocalMilestones(list: AcademicMilestone[]): void {
  try {
    localStorage.setItem(KEY_LOCAL_MILESTONES, JSON.stringify(list));
    if (hasCustomAdminDates(list)) {
      localStorage.setItem(KEY_ADMIN_BACKUP, JSON.stringify(list));
    }
  } catch (error) {
    console.warn('[academicScheduleService] Local save error:', error);
  }
}

async function persistMilestonesRemote(list: AcademicMilestone[]): Promise<void> {
  if (!list.length || isTableMissingInSupabase('academic_milestones')) return;
  try {
    const { error, status } = await (supabase.from as any)('academic_milestones').upsert(
      list.map(toAcademicMilestoneRow),
      { onConflict: 'id' }
    );
    if (isMissingRelationError(error, status)) {
      markTableAsMissingInSupabase('academic_milestones');
    } else if (error) {
      console.warn('[academicScheduleService] No se pudieron sincronizar los cortes:', error.message);
    }
  } catch (error) {
    console.warn('[academicScheduleService] Error de red al sincronizar cortes:', error);
  }
}

/** Only columns that exist on the live `academic_milestones` table. Extra keys 400. */
export function toAcademicMilestoneRow(milestone: AcademicMilestone) {
  const normalized = normalizeMilestone(milestone);
  return {
    id: normalized.id,
    cohort_id: normalized.cohort_id,
    title: normalized.title,
    description: normalized.description,
    start_date: normalized.start_date,
    due_date: normalized.due_date,
    target_topic_ids: normalized.target_topic_ids ?? [],
    passing_grade: normalized.passing_grade,
    order_index: normalized.order_index,
  };
}

/** Re-save cortes already on screen so a later PDF download cannot fall back to seed dates. */
export function rememberAdminMilestones(list: AcademicMilestone[]): void {
  const normalized = list.map(normalizeMilestone);
  if (!hasCustomAdminDates(normalized)) return;
  writeLocalMilestones(normalized);
  void persistMilestonesRemote(normalized);
}

export async function getAcademicMilestones(): Promise<AcademicMilestone[]> {
  const local = readLocalMilestones();
  let remoteRaw: AcademicMilestone[] = [];

  if (!isTableMissingInSupabase('academic_milestones')) {
    try {
      const { data, error, status } = await (supabase.from as any)('academic_milestones')
        .select('*')
        .order('order_index', { ascending: true });

      if (isMissingRelationError(error, status)) {
        markTableAsMissingInSupabase('academic_milestones');
      } else if (!error && Array.isArray(data)) {
        remoteRaw = data as AcademicMilestone[];
      }
    } catch {
      // Network / client errors must not hide a later successful read.
    }
  }

  const custom = pickAuthoritativeMilestones(
    usableAdminSchedule(remoteRaw),
    usableAdminSchedule(local)
  );
  const result = (
    custom.length ? custom : local.length ? local : remoteRaw
  ).map(normalizeMilestone);

  if (result.length) writeLocalMilestones(result);
  if (hasCustomAdminDates(result) && !hasCustomAdminDates(remoteRaw)) {
    void persistMilestonesRemote(result);
  }
  return result;
}

export async function saveMilestone(milestone: AcademicMilestone): Promise<AcademicMilestone> {
  const updatedItem = normalizeMilestone({
    ...milestone,
    updated_at: new Date().toISOString(),
  });

  const list = usableAdminSchedule(readLocalMilestones());
  const next = list.length ? [...list] : [];
  const idx = next.findIndex((item) => item.id === milestone.id);
  if (idx !== -1) next[idx] = updatedItem;
  else next.push(updatedItem);
  writeLocalMilestones(next);

  if (!isTableMissingInSupabase('academic_milestones')) {
    try {
      const { data, error, status } = await (supabase.from as any)('academic_milestones')
        .upsert(toAcademicMilestoneRow(updatedItem), { onConflict: 'id' })
        .select()
        .single();
      if (isMissingRelationError(error, status)) {
        markTableAsMissingInSupabase('academic_milestones');
      } else if (error) {
        throw new Error(`No se pudo guardar el corte en el servidor: ${error.message}`);
      } else if (data) {
        const saved = normalizeMilestone(data as AcademicMilestone);
        const synced = next.map((item) => (item.id === saved.id ? saved : item));
        writeLocalMilestones(synced);
        await persistMilestonesRemote(synced);
        return saved;
      }
    } catch (error) {
      console.warn('[academicScheduleService] Error de red al guardar el corte:', error);
    }
  }

  await persistMilestonesRemote(next);
  return updatedItem;
}

export async function deleteMilestone(milestoneId: string): Promise<void> {
  writeLocalMilestones(readLocalMilestones().filter((item) => item.id !== milestoneId));

  if (!isTableMissingInSupabase('academic_milestones')) {
    try {
      const { error, status } = await (supabase.from as any)('academic_milestones').delete().eq('id', milestoneId);
      if (isMissingRelationError(error, status)) {
        markTableAsMissingInSupabase('academic_milestones');
      }
    } catch {
      // Keep the local deletion even if remote delete fails.
    }
  }
}

export async function getStudentMilestoneAudits(
  studentId: string,
  completedTopicSet: Set<string>,
  providedMilestones?: AcademicMilestone[]
): Promise<StudentMilestoneAudit[]> {
  const milestones = providedMilestones || (await getAcademicMilestones());
  const now = new Date();

  return milestones.map((milestone) => {
    const dueDate = new Date(milestone.due_date);
    const isPastDue = now > dueDate;

    const topicChecks: MilestoneTopicCheckItem[] = (milestone.target_topic_ids || []).map((tid) => {
      const meta = findTopicMetadata(tid);
      const isCompleted = completedTopicSet.has(tid);

      let status: 'on_time' | 'late' | 'pending' = 'pending';
      if (isCompleted) {
        // En una implementación con timestamp guardado, se compararía completion_date con due_date
        status = 'on_time';
      } else if (isPastDue) {
        status = 'late';
      }

      return {
        topicId: tid,
        topicTitle: meta.topicTitle,
        moduleId: meta.moduleId,
        moduleTitle: meta.moduleTitle,
        completed: isCompleted,
        status,
      };
    });

    const totalTopics = topicChecks.length;
    const completedTopics = topicChecks.filter((t) => t.completed).length;
    const progressPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 100;
    const isOnTrack = !isPastDue || progressPct >= 80;

    return {
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      dueDate: milestone.due_date,
      totalTopics,
      completedTopics,
      progressPct,
      isOnTrack,
      topics: topicChecks,
    };
  });
}
