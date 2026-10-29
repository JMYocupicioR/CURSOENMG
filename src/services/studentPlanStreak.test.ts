import { describe, expect, it } from 'vitest';
import { getStudentActivityAndStreak, getStudentActivityLogs } from './studentPlanService';
import { calculateStudentAttendanceMetrics } from './attendanceService';

describe('short-term technical debt fixes', () => {
  it('returns zero streak and empty activity logs for a student without activity instead of synthetic data', async () => {
    const streak = await getStudentActivityAndStreak('unused-user-id-test', []);
    expect(streak.currentStreak).toBe(0);
    expect(streak.longestStreak).toBe(0);
    expect(streak.totalActiveDays).toBe(0);
    expect(streak.lastActiveDate).toBeNull();
    expect(streak.activeDatesLast30Days).toEqual([]);
    expect(streak.totalSessions).toBe(0);

    const logs = await getStudentActivityLogs('unused-user-id-test');
    expect(logs).toEqual([]);
  });

  it('computes attendance metrics from preloaded records without querying Supabase', async () => {
    const metrics = await calculateStudentAttendanceMetrics('student-1', {
      eligibleSessionsCount: 4,
      preloadedRecords: [
        {
          id: 'att-1',
          student_id: 'student-1',
          session_title: 'Sesión 1',
          session_date: '2026-10-01',
          status: 'present',
          session_modality: 'online',
          created_at: '2026-10-01T00:00:00Z',
        },
        {
          id: 'att-2',
          student_id: 'student-1',
          session_title: 'Sesión 2',
          session_date: '2026-10-08',
          status: 'late',
          session_modality: 'online',
          created_at: '2026-10-08T00:00:00Z',
        },
      ],
    });

    expect(metrics.totalSessions).toBe(4);
    expect(metrics.attendedSessions).toBe(1);
    expect(metrics.lateSessions).toBe(1);
    expect(metrics.absentSessions).toBe(2);
    expect(metrics.attendancePct).toBe(45); // (1.0 + 0.8) / 4 = 45%
  });
});

