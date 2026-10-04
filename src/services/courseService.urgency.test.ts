import { describe, expect, it } from 'vitest';
import { getLiveSessionUrgency } from './courseService';
import type { LiveWorkshop } from '../types/database';

describe('getLiveSessionUrgency', () => {
  const baseWorkshop: LiveWorkshop = {
    id: 'ws-1',
    module_id: 'm1',
    topic_id: null,
    title: 'Taller Clínico EMG en Vivo',
    description: 'Sesión interactiva',
    scheduled_at: '2026-10-03T18:00:00.000Z',
    duration_minutes: 90,
    stream_url: 'https://meet.google.com/abc-defg-hij',
    recording_url: null,
    max_capacity: 50,
    clinical_case_revision_id: null,
    clinical_case_json: null,
    status: 'scheduled',
    created_by: 'teacher-1',
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z',
  };

  it('returns not urgent when list is empty', () => {
    const res = getLiveSessionUrgency([], 30);
    expect(res.isUrgent).toBe(false);
    expect(res.isLiveNow).toBe(false);
    expect(res.startsInMinutes).toBeNull();
    expect(res.workshop).toBeNull();
  });

  it('detects an active session with status live immediately', () => {
    const liveWs: LiveWorkshop = {
      ...baseWorkshop,
      status: 'live',
    };
    const res = getLiveSessionUrgency([liveWs], 30);
    expect(res.isUrgent).toBe(true);
    expect(res.isLiveNow).toBe(true);
    expect(res.startsInMinutes).toBe(0);
    expect(res.workshop?.id).toBe('ws-1');
  });

  it('detects an imminent scheduled session starting in 15 minutes', () => {
    const now = new Date('2026-10-03T17:45:00.000Z');
    const res = getLiveSessionUrgency([baseWorkshop], 30, now);
    expect(res.isUrgent).toBe(true);
    expect(res.isLiveNow).toBe(false);
    expect(res.startsInMinutes).toBe(15);
    expect(res.workshop?.id).toBe('ws-1');
  });

  it('ignores a scheduled session starting in 60 minutes when threshold is 30', () => {
    const now = new Date('2026-10-03T17:00:00.000Z');
    const res = getLiveSessionUrgency([baseWorkshop], 30, now);
    expect(res.isUrgent).toBe(false);
    expect(res.isLiveNow).toBe(false);
    expect(res.workshop).toBeNull();
  });

  it('detects a session in progress that started 10 minutes ago within duration window', () => {
    const now = new Date('2026-10-03T18:10:00.000Z');
    const res = getLiveSessionUrgency([baseWorkshop], 30, now);
    expect(res.isUrgent).toBe(true);
    expect(res.isLiveNow).toBe(true);
    expect(res.startsInMinutes).toBe(-10);
    expect(res.workshop?.id).toBe('ws-1');
  });

  it('ignores a workshop that finished beyond its duration window', () => {
    const now = new Date('2026-10-03T20:30:00.000Z'); // 2h 30m after scheduled start, duration is 90 min
    const res = getLiveSessionUrgency([baseWorkshop], 30, now);
    expect(res.isUrgent).toBe(false);
    expect(res.isLiveNow).toBe(false);
  });
});
