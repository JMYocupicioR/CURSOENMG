import { describe, expect, it } from 'vitest';
import {
  assignmentRequiresDelivery,
  describeReadingAssignment,
  dueSoonCopy,
  readingTopicIds,
} from './readingAssignments';
import type { ReadingAssignmentFields } from './readingAssignments';

function readingTask(overrides: Partial<ReadingAssignmentFields> = {}): ReadingAssignmentFields {
  return {
    type: 'reading',
    status: 'pending',
    due_date: '2026-11-05T18:00:00.000Z',
    requires_delivery: false,
    reading_topic_ids: ['a', 'b', 'c'],
    reading_done_ids: ['a'],
    reading_completed_at: null,
    ...overrides,
  };
}

describe('describeReadingAssignment', () => {
  it('keeps a practical task as delivery when the flag is missing', () => {
    expect(assignmentRequiresDelivery({ type: 'practical_task' })).toBe(true);
    expect(assignmentRequiresDelivery({ type: 'reading' })).toBe(false);
    expect(assignmentRequiresDelivery({ type: 'reading', requires_delivery: true })).toBe(true);
  });

  it('counts distinct topics and leaves the delivery open', () => {
    const view = describeReadingAssignment(
      readingTask({
        requires_delivery: true,
        reading_topic_ids: ['a', 'a', ' b '],
        reading_done_ids: ['a'],
      }),
      Date.parse('2026-11-01T12:00:00.000Z')
    );
    expect(readingTopicIds({ reading_topic_ids: ['a', 'a', ' b '] })).toEqual(['a', 'b']);
    expect(view.done).toBe(1);
    expect(view.total).toBe(2);
    expect(view.complete).toBe(false);
    expect(view.readingOnly).toBe(false);
    expect(view.statusLabel).toBeNull();
    expect(view.progressLabel).toBe('Lectura 1/2');
  });

  it('marks a reading-only task complete without closing a delivery', () => {
    const now = Date.parse('2026-11-01T12:00:00.000Z');
    const done = describeReadingAssignment(
      readingTask({
        reading_done_ids: ['a', 'b', 'c'],
        reading_completed_at: '2026-11-01T10:00:00.000Z',
        status: 'approved',
      }),
      now
    );
    expect(done.complete).toBe(true);
    expect(done.late).toBe(false);
    expect(done.statusLabel).toBe('Lectura cumplida');

    const late = describeReadingAssignment(
      readingTask({
        reading_done_ids: ['a', 'b', 'c'],
        reading_completed_at: '2026-11-06T10:00:00.000Z',
        status: 'approved',
      }),
      now
    );
    expect(late.late).toBe(true);
    expect(late.statusLabel).toBe('Lectura cumplida con retraso');
  });

  it('calls a pending reading overdue only after the due date', () => {
    const view = describeReadingAssignment(
      readingTask(),
      Date.parse('2026-11-06T12:00:00.000Z')
    );
    expect(view.statusLabel).toBe('Lectura vencida');
  });
});

describe('dueSoonCopy', () => {
  const now = Date.parse('2026-11-04T18:00:00.000Z');

  it('reminds a reading two days ahead and a delivery only inside one day', () => {
    const reading = dueSoonCopy(readingTask({ due_date: new Date(now + 40 * 3600_000).toISOString() }), 40);
    expect(reading?.title).toContain('Lectura por vencer');

    const delivery = dueSoonCopy(
      {
        ...readingTask({
          type: 'practical_task',
          requires_delivery: true,
          reading_topic_ids: [],
          due_date: new Date(now + 30 * 3600_000).toISOString(),
        }),
        title: 'Reporte',
      },
      30
    );
    expect(delivery).toBeNull();
  });

  it('asks for the delivery once the reading is already done', () => {
    const copy = dueSoonCopy(
      {
        ...readingTask({
          requires_delivery: true,
          reading_done_ids: ['a', 'b', 'c'],
          reading_completed_at: '2026-11-04T10:00:00.000Z',
          due_date: new Date(now + 10 * 3600_000).toISOString(),
        }),
        title: 'Latencias',
      },
      10
    );
    expect(copy?.title).toContain('Falta tu entrega');
  });
});
