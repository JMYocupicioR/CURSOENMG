export interface HighlightedPart {
  text: string;
  hit: boolean;
}

const SNIPPET_LEN = 120;

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

export function findSearchMatchRanges(text: string, query: string): { start: number; end: number }[] {
  const q = normalizeSearchText(query.trim());
  if (q.length < 2 || !text) return [];

  const { normalized, map } = buildNormalizedIndex(text);
  const ranges: { start: number; end: number }[] = [];
  let from = 0;

  while (from < normalized.length) {
    const idx = normalized.indexOf(q, from);
    if (idx === -1) break;
    const last = idx + q.length - 1;
    ranges.push({ start: map[idx], end: map[last] + 1 });
    from = idx + q.length;
  }

  return ranges;
}

export function splitHighlightedParts(text: string, query: string): HighlightedPart[] {
  const ranges = findSearchMatchRanges(text, query);
  if (!ranges.length) return [{ text, hit: false }];

  const parts: HighlightedPart[] = [];
  let last = 0;
  for (const range of ranges) {
    if (range.start > last) {
      parts.push({ text: text.slice(last, range.start), hit: false });
    }
    parts.push({ text: text.slice(range.start, range.end), hit: true });
    last = range.end;
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last), hit: false });
  }
  return parts;
}

export function extractSearchSnippet(text: string, query: string, maxLen = SNIPPET_LEN): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const ranges = findSearchMatchRanges(cleaned, query);
  if (!ranges.length) {
    return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen).trim()}…` : cleaned;
  }

  const match = ranges[0];
  const pad = Math.max(20, Math.floor((maxLen - (match.end - match.start)) / 2));
  let start = Math.max(0, match.start - pad);
  let end = Math.min(cleaned.length, match.end + pad);

  if (start > 0) {
    const space = cleaned.indexOf(' ', start);
    if (space > start && space < start + 16) start = space + 1;
  }
  if (end < cleaned.length) {
    const space = cleaned.lastIndexOf(' ', end);
    if (space > end - 16 && space > match.end) end = space;
  }

  let snippet = cleaned.slice(start, end).trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < cleaned.length) snippet = `${snippet}…`;
  return snippet;
}

function buildNormalizedIndex(text: string): { normalized: string; map: number[] } {
  let normalized = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const chunk = text[i].normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    for (let j = 0; j < chunk.length; j += 1) {
      normalized += chunk[j];
      map.push(i);
    }
  }
  return { normalized, map };
}
