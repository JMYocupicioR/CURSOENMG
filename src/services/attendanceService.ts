import { supabase } from '../lib/supabase';
import {
  isMissingRelationError,
  isTableMissingInSupabase,
  markTableAsMissingInSupabase,
} from './tableAvailability';
import type { ClassAttendanceRecord, SessionModality } from '../types/academicGradebook';
import type { WorkshopAttendanceSummary } from '../types/academicAnalytics';
import type { LiveWorkshop } from '../types/database';

const KEY_LOCAL_ATTENDANCE = 'neurosafe_class_attendances_';

export function normalizeSessionModality(value: unknown): SessionModality {
  return value === 'in_person' ? 'in_person' : 'online';
}

function attendanceKey(record: Pick<ClassAttendanceRecord, 'student_id' | 'session_title' | 'session_date' | 'workshop_id'>): string {
  if (record.workshop_id) {
    return `${record.student_id}|ws_${record.workshop_id}`;
  }
  return `${record.student_id}|${record.session_title}|${record.session_date}`;
}

function normalizeAttendanceRecord(row: ClassAttendanceRecord): ClassAttendanceRecord {
  return {
    ...row,
    session_modality: normalizeSessionModality(row.session_modality),
    excuse_reason: row.excuse_reason ?? null,
    recorded_by: row.recorded_by ?? null,
  };
}

export const DEFAULT_COURSE_SESSIONS: { title: string; date: string }[] = [];

export async function getStudentAttendance(studentId: string): Promise<ClassAttendanceRecord[]> {
  if (!studentId) return [];

  if (!isTableMissingInSupabase('class_attendances')) {
    try {
      const { data, error, status } = await supabase
        .from('class_attendances')
        .select('*')
        .eq('student_id', studentId)
        .order('session_date', { ascending: false });

      if (isMissingRelationError(error, status)) {
        markTableAsMissingInSupabase('class_attendances');
      } else if (!error && data) {
        return (data as ClassAttendanceRecord[]).map(normalizeAttendanceRecord);
      }
    } catch {
      // Transient network error: fall back to local cache without disabling table
    }
  }

  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ATTENDANCE}${studentId}`);
    if (raw) {
      return (JSON.parse(raw) as ClassAttendanceRecord[]).map(normalizeAttendanceRecord);
    }
  } catch {
    // ignore cache parse errors
  }

  return [];
}

export async function getWorkshopAttendance(workshopId: string): Promise<ClassAttendanceRecord[]> {
  if (!workshopId) return [];

  if (!isTableMissingInSupabase('class_attendances')) {
    try {
      const { data, error, status } = await supabase
        .from('class_attendances')
        .select('*')
        .eq('workshop_id', workshopId);

      if (isMissingRelationError(error, status)) {
        markTableAsMissingInSupabase('class_attendances');
      } else if (!error && data) {
        return (data as ClassAttendanceRecord[]).map(normalizeAttendanceRecord);
      }
    } catch {
      // Transient network error: fall back to local cache
    }
  }

  // Fallback cache
  const results: ClassAttendanceRecord[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEY_LOCAL_ATTENDANCE)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw) as ClassAttendanceRecord[];
          const matches = list.filter((r) => r.workshop_id === workshopId);
          results.push(...matches.map(normalizeAttendanceRecord));
        }
      }
    }
  } catch {
    // ignore
  }

  return results;
}

export async function saveStudentAttendanceRecord(record: ClassAttendanceRecord): Promise<void> {
  const normalized = normalizeAttendanceRecord(record);

  // 1. Local storage cache
  try {
    const raw = localStorage.getItem(`${KEY_LOCAL_ATTENDANCE}${normalized.student_id}`);
    const list: ClassAttendanceRecord[] = raw ? JSON.parse(raw) : [];
    const existingIdx = list.findIndex((r) => {
      if (normalized.workshop_id && r.workshop_id) {
        return r.workshop_id === normalized.workshop_id;
      }
      return r.session_title === normalized.session_title && r.session_date === normalized.session_date;
    });

    if (existingIdx !== -1) {
      list[existingIdx] = { ...list[existingIdx], ...normalized, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...normalized, updated_at: new Date().toISOString() });
    }

    localStorage.setItem(`${KEY_LOCAL_ATTENDANCE}${normalized.student_id}`, JSON.stringify(list));
  } catch (e) {
    console.warn('[attendanceService] Error saving local attendance:', e);
  }

  // 2. Supabase
  if (!isTableMissingInSupabase('class_attendances')) {
    const payload: any = {
      session_title: normalized.session_title,
      session_date: normalized.session_date,
      workshop_id: normalized.workshop_id ?? null,
      student_id: normalized.student_id,
      status: normalized.status,
      session_modality: normalizeSessionModality(normalized.session_modality),
      minutes_attended: normalized.minutes_attended ?? null,
      notes: normalized.notes ?? null,
      excuse_reason: normalized.excuse_reason ?? null,
      recorded_by: normalized.recorded_by ?? null,
      updated_at: new Date().toISOString(),
    };

    try {
      // Intentar primero con conflicto en student_id,workshop_id si workshop_id existe
      let conflictField = normalized.workshop_id ? 'student_id,workshop_id' : 'student_id,session_title,session_date';
      let res = await supabase.from('class_attendances').upsert(payload, { onConflict: conflictField });

      if (res.error && normalized.workshop_id) {
        // Fallback a unicidad original (student_id,session_title,session_date)
        conflictField = 'student_id,session_title,session_date';
        res = await supabase.from('class_attendances').upsert(payload, { onConflict: conflictField });
      }

      // Si falla por columnas nuevas (excuse_reason o recorded_by no presentes aún)
      if (res.error && /(excuse_reason|recorded_by)/i.test(res.error.message || '')) {
        const { excuse_reason: _e, recorded_by: _r, ...compatPayload } = payload;
        res = await supabase.from('class_attendances').upsert(compatPayload, { onConflict: conflictField });
      }

      // Si falla por session_modality
      if (res.error && /session_modality/i.test(res.error.message || '')) {
        const { session_modality: _m, excuse_reason: _e, recorded_by: _r, ...legacyPayload } = payload;
        res = await supabase.from('class_attendances').upsert(legacyPayload, { onConflict: conflictField });
      }

      if (isMissingRelationError(res.error, res.status)) {
        markTableAsMissingInSupabase('class_attendances');
      }
    } catch {
      // No deshabilitar la tabla ante cortes de red momentáneos
    }
  }
}

export async function getCohortAttendance(studentIds: string[] = []): Promise<ClassAttendanceRecord[]> {
  const byKey = new Map<string, ClassAttendanceRecord>();
  const validIds = Array.from(new Set(studentIds.filter(Boolean)));

  if (!isTableMissingInSupabase('class_attendances')) {
    try {
      let query = supabase.from('class_attendances').select('*');
      if (validIds.length > 0) {
        query = query.in('student_id', validIds);
      }
      const { data, error, status } = await query.order('session_date', { ascending: false });

      if (isMissingRelationError(error, status)) {
        markTableAsMissingInSupabase('class_attendances');
      } else if (!error && data) {
        for (const row of data as ClassAttendanceRecord[]) {
          const normalized = normalizeAttendanceRecord(row);
          byKey.set(attendanceKey(normalized), normalized);
        }
      }
    } catch {
      // Fallback al caché local
    }
  }

  for (const studentId of studentIds) {
    try {
      const raw = localStorage.getItem(`${KEY_LOCAL_ATTENDANCE}${studentId}`);
      if (!raw) continue;
      const list = (JSON.parse(raw) as ClassAttendanceRecord[]).map(normalizeAttendanceRecord);
      for (const row of list) {
        const key = attendanceKey(row);
        if (!byKey.has(key)) byKey.set(key, row);
      }
    } catch {
      // ignore cache parse errors
    }
  }

  return [...byKey.values()].sort((a, b) => {
    const dateCmp = (b.session_date || '').localeCompare(a.session_date || '');
    if (dateCmp !== 0) return dateCmp;
    return (a.session_title || '').localeCompare(b.session_title || '', 'es');
  });
}

export async function saveCohortAttendanceBatch(records: ClassAttendanceRecord[]): Promise<void> {
  for (const rec of records) {
    await saveStudentAttendanceRecord(rec);
  }
}

export interface StudentAttendanceMetricsResult {
  totalSessions: number;
  attendedSessions: number;
  lateSessions: number;
  excusedSessions: number;
  absentSessions: number;
  attendancePct: number;
  hasAuditedSessions: boolean;
  records: ClassAttendanceRecord[];
}

export async function calculateStudentAttendanceMetrics(
  studentId: string,
  options?: { eligibleSessionsCount?: number; preloadedRecords?: ClassAttendanceRecord[] }
): Promise<StudentAttendanceMetricsResult> {
  const records = options?.preloadedRecords ?? (await getStudentAttendance(studentId));
  const eligibleSessions = options?.eligibleSessionsCount ?? 0;

  if (records.length === 0) {
    if (eligibleSessions > 0) {
      return {
        totalSessions: eligibleSessions,
        attendedSessions: 0,
        lateSessions: 0,
        excusedSessions: 0,
        absentSessions: eligibleSessions,
        attendancePct: 0,
        hasAuditedSessions: true,
        records: [],
      };
    }

    return {
      totalSessions: 0,
      attendedSessions: 0,
      lateSessions: 0,
      excusedSessions: 0,
      absentSessions: 0,
      attendancePct: 100,
      hasAuditedSessions: false,
      records: [],
    };
  }

  let presentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;
  let absentCount = 0;
  let points = 0;

  for (const r of records) {
    if (r.status === 'present') {
      presentCount++;
      points += 1.0;
    } else if (r.status === 'late') {
      lateCount++;
      points += 0.8; // 80% de valor por retardo
    } else if (r.status === 'excused') {
      excusedCount++;
      points += 1.0; // Falta justificada cuenta al 100%
    } else {
      absentCount++;
      points += 0;
    }
  }

  // Denominador: el mayor entre las marcas registradas y las sesiones auditadas a la fecha
  const effectiveTotal = Math.max(records.length, eligibleSessions);
  const attendancePct = effectiveTotal === 0 ? 100 : Math.min(100, Math.round((points / effectiveTotal) * 100));

  return {
    totalSessions: effectiveTotal,
    attendedSessions: presentCount,
    lateSessions: lateCount,
    excusedSessions: excusedCount,
    absentSessions: absentCount + Math.max(0, effectiveTotal - records.length),
    attendancePct,
    hasAuditedSessions: true,
    records,
  };
}

export function computeWorkshopAttendanceSummary(
  workshop: LiveWorkshop,
  cohortStudentIds: string[],
  cohortRecords: ClassAttendanceRecord[]
): WorkshopAttendanceSummary {
  const workshopRecords = cohortRecords.filter((r) => {
    if (r.workshop_id && workshop.id) return r.workshop_id === workshop.id;
    const sessionDate = workshop.scheduled_at ? workshop.scheduled_at.split('T')[0] : '';
    return r.session_title === workshop.title && r.session_date === sessionDate;
  });

  const studentRecordMap = new Map<string, ClassAttendanceRecord>();
  for (const rec of workshopRecords) {
    studentRecordMap.set(rec.student_id, rec);
  }

  let present = 0;
  let late = 0;
  let excused = 0;
  let absent = 0;
  let pending = 0;
  let points = 0;

  for (const sId of cohortStudentIds) {
    const rec = studentRecordMap.get(sId);
    if (!rec) {
      pending++;
    } else if (rec.status === 'present') {
      present++;
      points += 1.0;
    } else if (rec.status === 'late') {
      late++;
      points += 0.8;
    } else if (rec.status === 'excused') {
      excused++;
      points += 1.0;
    } else {
      absent++;
    }
  }

  const evaluatedCount = present + late + excused + absent;
  const attendancePct = evaluatedCount > 0 ? Math.round((points / evaluatedCount) * 100) : 0;

  let rollCallStatus: 'not_started' | 'incomplete' | 'completed' = 'not_started';
  if (evaluatedCount === cohortStudentIds.length && cohortStudentIds.length > 0) {
    rollCallStatus = 'completed';
  } else if (evaluatedCount > 0) {
    rollCallStatus = 'incomplete';
  }

  return {
    workshopId: workshop.id,
    title: workshop.title,
    scheduledAt: workshop.scheduled_at,
    modality: normalizeSessionModality(workshop.session_modality),
    status: workshop.status,
    attendanceClosed: !!workshop.attendance_closed,
    countsForKardex: workshop.counts_for_kardex ?? true,
    totalExpected: cohortStudentIds.length,
    presentCount: present,
    lateCount: late,
    excusedCount: excused,
    absentCount: absent,
    pendingCount: pending,
    attendancePct,
    rollCallStatus,
  };
}
