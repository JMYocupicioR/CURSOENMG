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

function rpcError(error: { message?: string } | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

async function teacherNamesById(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
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
  if (isTableMissingInSupabase(COMMITMENTS_TABLE)) return [];
  try {
    const { data, error, status } = await sb
      .from(COMMITMENTS_TABLE)
      .select('*')
      .eq('cohort_id', cohortId)
      .neq('status', 'withdrawn')
      .order('proposed_at', { ascending: false });
    if (isMissingRelationError(error, status)) {
      markTableAsMissingInSupabase(COMMITMENTS_TABLE);
      return [];
    }
    if (error) throw rpcError(error, 'No se pudieron leer los temas adoptados.');
    const rows = (data ?? []) as TopicTeachingCommitment[];
    const names = await teacherNamesById(rows.map((row) => row.teacher_id));
    return withTeacherName(rows, names);
  } catch (error) {
    if (isMissingRelationError(error as { message?: string })) {
      markTableAsMissingInSupabase(COMMITMENTS_TABLE);
      return [];
    }
    throw error;
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

export async function withdrawTopicCommitment(commitmentId: string): Promise<TopicTeachingCommitment> {
  const { data, error } = await sb.rpc('withdraw_topic_commitment', {
    p_commitment_id: commitmentId,
  });
  if (error) throw rpcError(error, 'No se pudo retirar el tema.');
  if (!data) throw new Error('No se pudo retirar el tema.');
  return data as TopicTeachingCommitment;
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
