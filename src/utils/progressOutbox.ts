export interface ProgressOutboxItem {
  topicId: string;
  completed: boolean;
  at: string;
}

export const PROGRESS_OUTBOX_KEY_PREFIX = 'neurosafe_progress_outbox_';

export function progressOutboxKey(userId: string): string {
  return `${PROGRESS_OUTBOX_KEY_PREFIX}${userId}`;
}

export function mergeOutboxItems(
  existing: ProgressOutboxItem[],
  incoming: ProgressOutboxItem[]
): ProgressOutboxItem[] {
  const map = new Map<string, ProgressOutboxItem>();
  for (const item of existing) {
    map.set(item.topicId, item);
  }
  for (const item of incoming) {
    const prev = map.get(item.topicId);
    if (!prev || item.at >= prev.at) {
      map.set(item.topicId, item);
    }
  }
  return [...map.values()];
}

export function applyOutboxToCompletedSet(
  completed: Iterable<string>,
  outbox: ProgressOutboxItem[]
): Set<string> {
  const next = new Set(completed);
  const ordered = [...outbox].sort((a, b) => a.at.localeCompare(b.at));
  for (const item of ordered) {
    if (item.completed) next.add(item.topicId);
    else next.delete(item.topicId);
  }
  return next;
}

export function readProgressOutbox(userId: string): ProgressOutboxItem[] {
  if (!userId || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(progressOutboxKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ProgressOutboxItem => {
      return (
        Boolean(item) &&
        typeof item.topicId === 'string' &&
        typeof item.completed === 'boolean' &&
        typeof item.at === 'string'
      );
    });
  } catch {
    return [];
  }
}

export function writeProgressOutbox(userId: string, items: ProgressOutboxItem[]): void {
  if (!userId || typeof localStorage === 'undefined') return;
  try {
    if (items.length === 0) {
      localStorage.removeItem(progressOutboxKey(userId));
      return;
    }
    localStorage.setItem(progressOutboxKey(userId), JSON.stringify(items));
  } catch (error) {
    console.warn('[ProgressOutbox] Could not persist outbox:', error);
  }
}

export function enqueueProgressOutbox(
  userId: string,
  topicIds: string[],
  completed: boolean,
  at = new Date().toISOString()
): ProgressOutboxItem[] {
  if (!userId || topicIds.length === 0) return readProgressOutbox(userId);
  const incoming = topicIds.map((topicId) => ({ topicId, completed, at }));
  const merged = mergeOutboxItems(readProgressOutbox(userId), incoming);
  writeProgressOutbox(userId, merged);
  return merged;
}

/**
 * Drop flushed writes, but keep a newer local write that arrived while the request was in flight.
 */
export function outboxAfterFlush(
  current: ProgressOutboxItem[],
  flushed: ProgressOutboxItem[]
): ProgressOutboxItem[] {
  const flushedAt = new Map(flushed.map((item) => [item.topicId, item.at]));
  return current.filter((item) => {
    const at = flushedAt.get(item.topicId);
    if (!at) return true;
    return item.at > at;
  });
}

export function removeProgressOutboxItems(
  userId: string,
  topicIds: string[],
  flushed?: ProgressOutboxItem[]
): ProgressOutboxItem[] {
  if (!userId) return [];
  const current = readProgressOutbox(userId);
  const remaining = flushed
    ? outboxAfterFlush(current, flushed.filter((item) => topicIds.includes(item.topicId)))
    : current.filter((item) => !topicIds.includes(item.topicId));
  writeProgressOutbox(userId, remaining);
  return remaining;
}
