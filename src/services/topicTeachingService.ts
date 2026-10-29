import { sb } from '../lib/supabase';
import {
  isMissingRelationError,
  isTableMissingInSupabase,
  markTableAsMissingInSupabase,
} from './tableAvailability';
import type { TopicTeachingCommitment, WorkshopInstructor } from '../types/database';

export const TOPIC_TEACHING_COHORT_ID = '2026-general';

const COMMITMENTS_TABLE = 'topic_teaching_commitments';
const INSTRUCTORS_TABLE = 'workshop_instructors';
const KEY_LOCAL_COMMITMENTS = 'neurosafe_topic_teaching_commitments_v1';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(val: string | null | undefined): boolean {
  return typeof val === 'string' && UUID_RE.test(val.trim());
}

function rpcError(error: { message?: string } | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

function readLocalCommitments(): TopicTeachingCommitment[] {
  try {
    const raw = localStorage.getItem(KEY_LOCAL_COMMITMENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TopicTeachingCommitment[]) : [];
  } catch {
    return [];
  }
}

function writeLocalCommitments(rows: TopicTeachingCommitment[]): void {
  try {
    localStorage.setItem(KEY_LOCAL_COMMITMENTS, JSON.stringify(rows));
  } catch {
    // Ignore storage quota errors
  }
}

function mergeRemoteAndLocalCommitments(
  remote: TopicTeachingCommitment[],
  local: TopicTeachingCommitment[],
  cohortId: string
): TopicTeachingCommitment[] {
  const byKey = new Map<string, TopicTeachingCommitment>();

  for (const row of remote) {
    if (row.cohort_id !== cohortId) continue;
    const key = `${row.cohort_id}:${row.topic_id}:${row.teacher_id}`;
    byKey.set(key, row);
  }

  for (const loc of local) {
    if (loc.cohort_id !== cohortId) continue;
    const key = `${loc.cohort_id}:${loc.topic_id}:${loc.teacher_id}`;
    const rem = byKey.get(key);
    if (!rem) {
      if (loc.status !== 'withdrawn') {
        byKey.set(key, loc);
      }
    } else {
      // Si el registro local fue retirado explícitamente más recientemente o tiene metadatos enriquecidos
      if (loc.status === 'withdrawn') {
        byKey.delete(key);
      } else {
        byKey.set(key, {
          ...rem,
          teacher_name: rem.teacher_name || loc.teacher_name || 'Profesor',
          milestone_id: loc.milestone_id ?? rem.milestone_id ?? null,
          workshop_id: loc.workshop_id ?? rem.workshop_id ?? null,
        });
      }
    }
  }

  return Array.from(byKey.values()).filter((r) => r.status !== 'withdrawn');
}

async function teacherNamesById(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id) => isUuid(id)))];
  if (!unique.length) return new Map();
  const { data, error } = await sb.from('profiles').select('id, display_name').in('id', unique);
  if (error || !data) return new Map();
  return new Map(
    (data as { id: string; display_name: string | null }[]).map((row) => [
      row.id,
      row.display_name?.trim() || 'Profesor',
    ])
  );
}

function withTeacherName<T extends { teacher_id: string; teacher_name?: string | null }>(
  rows: T[],
  names: Map<string, string>
): T[] {
  return rows.map((row) => ({
    ...row,
    teacher_name: names.get(row.teacher_id) ?? row.teacher_name ?? null,
  }));
}

export async function listTopicTeachingCommitments(
  cohortId: string = TOPIC_TEACHING_COHORT_ID
): Promise<TopicTeachingCommitment[]> {
  const local = readLocalCommitments();
  if (isTableMissingInSupabase(COMMITMENTS_TABLE)) {
    return local.filter((r) => r.cohort_id === cohortId && r.status !== 'withdrawn');
  }
  try {
    const { data, error, status } = await sb
      .from(COMMITMENTS_TABLE)
      .select('*')
      .eq('cohort_id', cohortId)
      .neq('status', 'withdrawn')
      .order('proposed_at', { ascending: false });
    if (isMissingRelationError(error, status)) {
      markTableAsMissingInSupabase(COMMITMENTS_TABLE);
      return local.filter((r) => r.cohort_id === cohortId && r.status !== 'withdrawn');
    }
    if (error) throw rpcError(error, 'No se pudieron leer los temas adoptados.');
    const rows = (data ?? []) as TopicTeachingCommitment[];
    const names = await teacherNamesById(rows.map((row) => row.teacher_id));
    const enrichedRemote = withTeacherName(rows, names);
    return mergeRemoteAndLocalCommitments(enrichedRemote, local, cohortId);
  } catch (error) {
    if (isMissingRelationError(error as { message?: string })) {
      markTableAsMissingInSupabase(COMMITMENTS_TABLE);
      return local.filter((r) => r.cohort_id === cohortId && r.status !== 'withdrawn');
    }
    return local.filter((r) => r.cohort_id === cohortId && r.status !== 'withdrawn');
  }
}

export async function proposeTopicCommitments(
  topicIds: string[],
  moduleId: string,
  cohortId: string = TOPIC_TEACHING_COHORT_ID
): Promise<TopicTeachingCommitment[]> {
  const { data, error } = await sb.rpc('propose_topic_commitments', {
    p_topic_ids: topicIds,
    p_module_id: moduleId,
    p_cohort_id: cohortId,
  });
  if (error) throw rpcError(error, 'No se pudo adoptar el tema.');
  return (Array.isArray(data) ? data : data ? [data] : []) as TopicTeachingCommitment[];
}

export async function confirmTopicCommitment(input: {
  commitmentId: string;
  milestoneId: string;
  scheduledAt?: string | null;
  durationMinutes?: number;
  title?: string | null;
}): Promise<TopicTeachingCommitment> {
  const { data, error } = await sb.rpc('confirm_topic_commitment', {
    p_commitment_id: input.commitmentId,
    p_milestone_id: input.milestoneId,
    p_scheduled_at: input.scheduledAt ?? null,
    p_duration_minutes: input.durationMinutes ?? 90,
    p_title: input.title ?? null,
  });
  if (error) throw rpcError(error, 'No se pudo confirmar el tema.');
  if (!data) throw new Error('No se pudo confirmar el tema.');
  return data as TopicTeachingCommitment;
}

export async function autoConfirmAllPendingCommitments(): Promise<number> {
  try {
    const { data, error } = await sb.rpc('auto_confirm_all_pending_commitments');
    if (!error && typeof data === 'number') return data;
  } catch {
    // Si la función RPC aún no está en la base de datos, continuar con fallback
  }

  try {
    const { data } = await sb
      .from(COMMITMENTS_TABLE)
      .select('id')
      .eq('status', 'proposed');
    if (!data || !data.length) return 0;

    for (const item of data) {
      try {
        await sb.rpc('confirm_topic_commitment', {
          p_commitment_id: item.id,
          p_milestone_id: 'corte-1',
          p_scheduled_at: null,
          p_duration_minutes: 90,
          p_title: null,
        });
      } catch {
        // Ignorar errores individuales en el fallback
      }
    }
    return data.length;
  } catch {
    return 0;
  }
}

export async function withdrawTopicCommitment(commitmentId: string): Promise<TopicTeachingCommitment> {
  // Actualizar estado local si existe
  const local = readLocalCommitments();
  const localIdx = local.findIndex((c) => c.id === commitmentId);
  if (localIdx >= 0) {
    local[localIdx] = { ...local[localIdx], status: 'withdrawn' };
    writeLocalCommitments(local);
  }

  const { data, error } = await sb.rpc('withdraw_topic_commitment', {
    p_commitment_id: commitmentId,
  });
  if (error) {
    if (localIdx >= 0) return local[localIdx];
    throw rpcError(error, 'No se pudo retirar el tema.');
  }
  if (!data) {
    if (localIdx >= 0) return local[localIdx];
    throw new Error('No se pudo retirar el tema.');
  }
  return data as TopicTeachingCommitment;
}

/**
 * Asigna directamente uno o varios temas (p. ej. un tema y sus subtemas) a un profesor adjunto / colaborador docente.
 * Funciona tanto con cuentas registradas en Supabase como con docentes invitados, con persistencia híbrida inmediata.
 */
export async function assignTopicsToTeacher(input: {
  topicIds: string[];
  moduleId: string;
  teacherId: string;
  teacherName: string;
  milestoneId?: string | null;
  workshopId?: string | null;
  cohortId?: string;
}): Promise<TopicTeachingCommitment[]> {
  const cohortId = input.cohortId || TOPIC_TEACHING_COHORT_ID;
  const nowIso = new Date().toISOString();
  const cleanIds = [...new Set(input.topicIds.map((id) => id.trim()).filter(Boolean))];
  if (!cleanIds.length) return [];

  let remoteRows: TopicTeachingCommitment[] = [];

  // 1. Intentar RPC administrativo si teacherId es un UUID válido
  if (isUuid(input.teacherId) && !isTableMissingInSupabase(COMMITMENTS_TABLE)) {
    try {
      const { data: rpcData, error: rpcErr } = await sb.rpc('admin_assign_topic_teacher', {
        p_topic_ids: cleanIds,
        p_module_id: input.moduleId,
        p_teacher_id: input.teacherId,
        p_milestone_id: input.milestoneId ?? null,
        p_cohort_id: cohortId,
      });

      if (!rpcErr && rpcData) {
        remoteRows = (Array.isArray(rpcData) ? rpcData : [rpcData]) as TopicTeachingCommitment[];
      } else {
        // Fallback: upsert directo en la tabla topic_teaching_commitments
        const upsertPayload = cleanIds.map((topicId) => ({
          cohort_id: cohortId,
          module_id: input.moduleId,
          topic_id: topicId,
          teacher_id: input.teacherId,
          status: 'confirmed' as const,
          milestone_id: input.milestoneId ?? null,
          workshop_id: input.workshopId ?? null,
          proposed_at: nowIso,
          confirmed_at: nowIso,
        }));
        const { data: upData, error: upErr } = await sb
          .from(COMMITMENTS_TABLE)
          .upsert(upsertPayload, { onConflict: 'cohort_id,topic_id,teacher_id' })
          .select('*');
        if (!upErr && upData) {
          remoteRows = upData as TopicTeachingCommitment[];
        }
      }
    } catch {
      // Continuar con persistencia local resiliente
    }
  }

  // 2. Sincronizar en caché local autoritativa para respuesta instantánea y soporte offline/invitados
  const local = readLocalCommitments();
  const byKey = new Map<string, TopicTeachingCommitment>();
  for (const item of local) {
    byKey.set(`${item.cohort_id}:${item.topic_id}:${item.teacher_id}`, item);
  }

  const createdOrUpdated: TopicTeachingCommitment[] = cleanIds.map((topicId) => {
    const rem = remoteRows.find((r) => r.topic_id === topicId);
    const key = `${cohortId}:${topicId}:${input.teacherId}`;
    const existing = byKey.get(key);
    const row: TopicTeachingCommitment = {
      id: rem?.id || existing?.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      cohort_id: cohortId,
      module_id: input.moduleId,
      topic_id: topicId,
      teacher_id: input.teacherId,
      teacher_name: input.teacherName.trim() || 'Profesor',
      status: 'confirmed',
      milestone_id: input.milestoneId !== undefined ? input.milestoneId : (rem?.milestone_id ?? existing?.milestone_id ?? null),
      workshop_id: input.workshopId !== undefined ? input.workshopId : (rem?.workshop_id ?? existing?.workshop_id ?? null),
      proposed_at: rem?.proposed_at || existing?.proposed_at || nowIso,
      confirmed_by: rem?.confirmed_by || null,
      confirmed_at: rem?.confirmed_at || nowIso,
    };
    byKey.set(key, row);
    return row;
  });

  writeLocalCommitments(Array.from(byKey.values()));
  return createdOrUpdated;
}

/**
 * Desasigna / retira a un profesor de uno o varios temas.
 */
export async function removeTeacherFromTopics(input: {
  topicIds: string[];
  teacherId: string;
  commitmentIds?: string[];
  cohortId?: string;
}): Promise<void> {
  const cohortId = input.cohortId || TOPIC_TEACHING_COHORT_ID;
  const topicSet = new Set(input.topicIds);

  // 1. Marcar como withdrawn en caché local inmediatamente
  const local = readLocalCommitments();
  const updatedLocal = local.map((c) => {
    if (
      (c.cohort_id === cohortId && c.teacher_id === input.teacherId && topicSet.has(c.topic_id)) ||
      (input.commitmentIds && input.commitmentIds.includes(c.id))
    ) {
      return { ...c, status: 'withdrawn' as const };
    }
    return c;
  });
  writeLocalCommitments(updatedLocal);

  // 2. Retirar en Supabase
  if (input.commitmentIds?.length) {
    for (const cid of input.commitmentIds) {
      if (cid.startsWith('local_')) continue;
      try {
        await sb.rpc('withdraw_topic_commitment', { p_commitment_id: cid });
      } catch {
        try {
          await sb.from(COMMITMENTS_TABLE).update({ status: 'withdrawn' }).eq('id', cid);
        } catch {
          // Ignorar error de red
        }
      }
    }
  } else if (isUuid(input.teacherId) && !isTableMissingInSupabase(COMMITMENTS_TABLE)) {
    try {
      await sb
        .from(COMMITMENTS_TABLE)
        .update({ status: 'withdrawn' })
        .eq('cohort_id', cohortId)
        .eq('teacher_id', input.teacherId)
        .in('topic_id', input.topicIds);
    } catch {
      // Ignorar si falla en remoto
    }
  }
}

export async function listWorkshopInstructorNames(workshopId: string): Promise<string[]> {
  if (!workshopId || isTableMissingInSupabase(INSTRUCTORS_TABLE)) return [];
  try {
    const { data, error, status } = await sb
      .from(INSTRUCTORS_TABLE)
      .select('teacher_id')
      .eq('workshop_id', workshopId);
    if (isMissingRelationError(error, status)) {
      markTableAsMissingInSupabase(INSTRUCTORS_TABLE);
      return [];
    }
    if (error) return [];
    const rows = (data ?? []) as Pick<WorkshopInstructor, 'teacher_id'>[];
    const names = await teacherNamesById(rows.map((row) => row.teacher_id));
    return rows
      .map((row) => names.get(row.teacher_id) || 'Profesor')
      .filter((name, index, list) => list.indexOf(name) === index);
  } catch {
    return [];
  }
}

export async function assignWorkshopToTopics(
  workshopId: string,
  topics: { topicId: string; moduleId: string }[],
  teacherId: string,
  cohortId: string = TOPIC_TEACHING_COHORT_ID
): Promise<void> {
  if (!workshopId || !topics.length) return;
  try {
    for (const item of topics) {
      try {
        await proposeTopicCommitments([item.topicId], item.moduleId, cohortId);
      } catch {
        // Ignorar si ya estaba propuesto o adoptado
      }
    }

    const topicIds = topics.map((t) => t.topicId);
    await sb
      .from(COMMITMENTS_TABLE)
      .update({ workshop_id: workshopId, status: 'confirmed' })
      .eq('cohort_id', cohortId)
      .eq('teacher_id', teacherId)
      .in('topic_id', topicIds);

    // Sincronizar también en local
    const local = readLocalCommitments();
    const nextLocal = local.map((c) =>
      c.cohort_id === cohortId && c.teacher_id === teacherId && topicIds.includes(c.topic_id)
        ? { ...c, workshop_id: workshopId, status: 'confirmed' as const }
        : c
    );
    writeLocalCommitments(nextLocal);

    if (isUuid(teacherId)) {
      try {
        await sb
          .from(INSTRUCTORS_TABLE)
          .upsert(
            { workshop_id: workshopId, teacher_id: teacherId },
            { onConflict: 'workshop_id,teacher_id' }
          );
      } catch {
        // Ignorar si la tabla no existe o ya está asociado
      }
    }
  } catch (err) {
    console.warn('[topicTeachingService] assignWorkshopToTopics error:', err);
  }
}
