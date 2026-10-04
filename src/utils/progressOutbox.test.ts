import { describe, expect, it } from 'vitest';
import {
  applyOutboxToCompletedSet,
  mergeOutboxItems,
  outboxAfterFlush,
  type ProgressOutboxItem,
} from './progressOutbox';

describe('mergeOutboxItems', () => {
  it('keeps the later write per topic (complete then undo)', () => {
    const existing: ProgressOutboxItem[] = [
      { topicId: 'history', completed: true, at: '2026-01-01T10:00:00.000Z' },
    ];
    const incoming: ProgressOutboxItem[] = [
      { topicId: 'history', completed: false, at: '2026-01-01T11:00:00.000Z' },
    ];
    expect(mergeOutboxItems(existing, incoming)).toEqual(incoming);
  });

  it('does not let an older cloud-era write overwrite a newer local one', () => {
    const existing: ProgressOutboxItem[] = [
      { topicId: 'history', completed: true, at: '2026-01-01T12:00:00.000Z' },
    ];
    const incoming: ProgressOutboxItem[] = [
      { topicId: 'history', completed: false, at: '2026-01-01T11:00:00.000Z' },
    ];
    expect(mergeOutboxItems(existing, incoming)).toEqual(existing);
  });
});

describe('applyOutboxToCompletedSet', () => {
  it('adds completions and honors later uncomplete so progress is not lost or resurrected', () => {
    const merged = applyOutboxToCompletedSet(['cloud-only', 'history'], [
      { topicId: 'local-new', completed: true, at: '2026-01-01T10:00:00.000Z' },
      { topicId: 'history', completed: false, at: '2026-01-01T11:00:00.000Z' },
    ]);
    expect(merged.has('cloud-only')).toBe(true);
    expect(merged.has('local-new')).toBe(true);
    expect(merged.has('history')).toBe(false);
  });
});

describe('outboxAfterFlush', () => {
  it('keeps a read that was saved while the previous sync was still running', () => {
    const current: ProgressOutboxItem[] = [
      { topicId: 'history', completed: true, at: '2026-01-01T12:00:00.000Z' },
      { topicId: 'ethics', completed: true, at: '2026-01-01T10:00:00.000Z' },
    ];
    const flushed: ProgressOutboxItem[] = [
      { topicId: 'history', completed: false, at: '2026-01-01T11:00:00.000Z' },
      { topicId: 'ethics', completed: true, at: '2026-01-01T10:00:00.000Z' },
    ];
    expect(outboxAfterFlush(current, flushed)).toEqual([
      { topicId: 'history', completed: true, at: '2026-01-01T12:00:00.000Z' },
    ]);
  });
});
