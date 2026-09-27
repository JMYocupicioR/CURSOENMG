import { useMemo, type JSX, type ReactNode } from 'react';
import { splitHighlightedParts } from '../../search/searchText';

export type RichHeadingLevel = 2 | 3 | 4 | 5;
export type RichContentTone = 'screen' | 'print';

const HEADING_CLASS: Record<2 | 3 | 4 | 5 | 6, string> = {
  2: 'text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-tight tracking-tight mt-6 mb-2 first:mt-0',
  3: 'text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-tight mt-5 mb-2 first:mt-0',
  4: 'text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 leading-snug mt-4 mb-1.5 first:mt-0',
  5: 'text-sm font-semibold text-slate-700 dark:text-slate-200 mt-3 mb-1 first:mt-0',
  6: 'text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-1 first:mt-0',
};

const PRINT_HEADING_CLASS: Record<2 | 3 | 4 | 5 | 6, string> = {
  2: 'text-[13.5pt] font-semibold text-slate-900 leading-tight tracking-tight mt-4 mb-2 first:mt-0',
  3: 'text-[12pt] font-semibold text-slate-900 leading-tight mt-3.5 mb-1.5 first:mt-0',
  4: 'text-[11pt] font-semibold text-slate-800 leading-snug mt-3 mb-1 first:mt-0',
  5: 'text-[10.5pt] font-semibold text-slate-800 mt-2.5 mb-1 first:mt-0',
  6: 'text-[10.5pt] font-semibold text-slate-700 mt-2.5 mb-1 first:mt-0',
};

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const BULLET_RE = /^[•\-\*]\s+/;
const ORDERED_RE = /^(\d+)[.)]\s+/;

type ClassifiedLine =
  | { kind: 'heading'; mdLevel: number; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'ordered'; start: number; text: string }
  | { kind: 'table'; raw: string }
  | { kind: 'blockquote'; text: string }
  | { kind: 'paragraph'; text: string };

function classifyLine(line: string): ClassifiedLine | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const heading = trimmed.match(HEADING_RE);
  if (heading) {
    return { kind: 'heading', mdLevel: heading[1].length, text: heading[2].trim() };
  }
  if (BULLET_RE.test(trimmed)) {
    return { kind: 'bullet', text: trimmed.replace(BULLET_RE, '') };
  }
  const ordered = trimmed.match(ORDERED_RE);
  if (ordered) {
    return { kind: 'ordered', start: Number(ordered[1]), text: trimmed.replace(ORDERED_RE, '') };
  }
  if (trimmed.startsWith('|')) {
    return { kind: 'table', raw: line };
  }
  if (trimmed.startsWith('>')) {
    return { kind: 'blockquote', text: trimmed.replace(/^>\s*/, '') };
  }
  return { kind: 'paragraph', text: trimmed };
}

function resolveHeadingLevel(mdLevel: number, baseHeadingLevel: RichHeadingLevel): 2 | 3 | 4 | 5 | 6 {
  const level = baseHeadingLevel + (mdLevel - 2);
  return Math.min(6, Math.max(2, level)) as 2 | 3 | 4 | 5 | 6;
}

let activeHighlightQuery = '';

export function renderInline(
  text: string,
  keyPrefix: string,
  tone: RichContentTone = 'screen',
  highlightQuery?: string,
): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <a
        key={`${keyPrefix}-link-${match.index}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className={
          tone === 'print'
            ? 'text-slate-800 underline underline-offset-2 decoration-slate-400 font-medium'
            : 'text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-blue-400/40 hover:decoration-blue-500 transition-colors font-medium'
        }
      >
        {match[1]} ↗
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  const query = highlightQuery ?? activeHighlightQuery;
  return parts.flatMap((part, i) => {
    if (typeof part !== 'string') return [part];
    return formatTextSegment(part, `${keyPrefix}-${i}`, tone, query);
  });
}

function renderTable(lines: string[], keyBase: string, tone: RichContentTone) {
  const rows = lines
    .filter(l => l.trim().startsWith('|'))
    .map(line => {
      const parts = line.trim().split('|');
      if (parts[0] === '') parts.shift();
      if (parts[parts.length - 1] === '') parts.pop();
      return parts.map(p => p.trim());
    });

  if (rows.length < 1) return null;

  const dataRows = rows.filter(row => !row.every(cell => /^[\s-:]+$/.test(cell)));
  if (dataRows.length === 0) return null;

  const header = dataRows[0];
  const body = dataRows.slice(1);
  const print = tone === 'print';

  return (
    <div
      key={keyBase}
      className={
        print
          ? 'book-table-wrap my-3 border border-slate-300 bg-white'
          : 'my-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900/40'
      }
    >
      <table className={print ? 'w-full text-left border-collapse' : 'w-full text-left border-collapse min-w-[450px]'}>
        <thead>
          <tr className={print ? 'bg-slate-100' : 'bg-slate-50/80 dark:bg-slate-800/80'}>
            {header.map((cell, i) => (
              <th
                key={i}
                className={
                  print
                    ? 'px-2 py-1.5 text-[9pt] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300'
                    : 'px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700'
                }
              >
                {renderInline(cell, `${keyBase}-th-${i}`, tone)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={print ? '' : 'divide-y divide-slate-100 dark:divide-slate-800'}>
          {body.map((row, ri) => (
            <tr key={ri} className={print ? '' : 'hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors'}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={
                    print
                      ? 'px-2 py-1.5 text-[10pt] text-slate-800 leading-relaxed border-b border-slate-200'
                      : 'px-4 py-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed'
                  }
                >
                  {renderInline(cell, `${keyBase}-tr-${ri}-td-${ci}`, tone)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderBulletList(items: string[], keyBase: string, tone: RichContentTone) {
  const print = tone === 'print';
  return (
    <ul key={keyBase} className={print ? 'list-none space-y-1 my-2 ml-0' : 'list-none space-y-1.5 my-3 ml-1'}>
      {items.map((item, lIdx) => (
        <li key={`${keyBase}-${lIdx}`} className="flex items-start gap-2">
          <span className={print ? 'text-slate-700 mt-0.5 flex-shrink-0' : 'text-blue-500 dark:text-blue-400 mt-1 flex-shrink-0'}>•</span>
          <span>{renderInline(item, `${keyBase}-${lIdx}`, tone)}</span>
        </li>
      ))}
    </ul>
  );
}

function renderOrderedList(items: { start: number; text: string }[], keyBase: string, tone: RichContentTone) {
  const print = tone === 'print';
  return (
    <ol
      key={keyBase}
      start={items[0]?.start ?? 1}
      className={
        print
          ? 'list-decimal my-2 ml-5 space-y-1 marker:text-slate-700'
          : 'list-decimal my-3 ml-6 space-y-1.5 marker:text-blue-500 dark:marker:text-blue-400'
      }
    >
      {items.map((item, lIdx) => (
        <li key={`${keyBase}-${lIdx}`} className="pl-1">
          {renderInline(item.text, `${keyBase}-${lIdx}`, tone)}
        </li>
      ))}
    </ol>
  );
}

function renderBlockquote(lines: string[], keyBase: string, tone: RichContentTone) {
  const print = tone === 'print';
  return (
    <blockquote
      key={keyBase}
      className={
        print
          ? 'my-2 pl-3 py-1.5 border-l-2 border-slate-400 bg-slate-50 text-slate-800 text-[10.5pt] leading-relaxed'
          : 'my-3 pl-4 py-2.5 border-l-4 border-indigo-500 dark:border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-r-xl text-slate-700 dark:text-slate-300 text-sm leading-relaxed'
      }
    >
      {lines.map((line, idx) => (
        <p key={`${keyBase}-${idx}`} className={idx > 0 ? 'mt-1.5' : ''}>
          {renderInline(line, `${keyBase}-${idx}`, tone)}
        </p>
      ))}
    </blockquote>
  );
}

function renderHeading(
  text: string,
  mdLevel: number,
  baseHeadingLevel: RichHeadingLevel,
  key: string,
  tone: RichContentTone,
) {
  const level = resolveHeadingLevel(mdLevel, baseHeadingLevel);
  const Tag = (`h${level}`) as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return (
    <Tag key={key} className={(tone === 'print' ? PRINT_HEADING_CLASS : HEADING_CLASS)[level]}>
      {renderInline(text, key, tone)}
    </Tag>
  );
}

function renderBlockLines(
  lines: string[],
  keyBase: string,
  headingLevel: RichHeadingLevel,
  tone: RichContentTone,
): ReactNode[] {
  const parts: ReactNode[] = [];
  let i = 0;
  let group = 0;

  while (i < lines.length) {
    const classified = classifyLine(lines[i]);
    if (!classified) {
      i += 1;
      continue;
    }

    const gKey = `${keyBase}-g${group++}`;

    if (classified.kind === 'heading') {
      parts.push(renderHeading(classified.text, classified.mdLevel, headingLevel, gKey, tone));
      i += 1;
      continue;
    }

    if (classified.kind === 'bullet') {
      const items: string[] = [];
      while (i < lines.length) {
        const next = classifyLine(lines[i]);
        if (next?.kind !== 'bullet') break;
        items.push(next.text);
        i += 1;
      }
      parts.push(renderBulletList(items, gKey, tone));
      continue;
    }

    if (classified.kind === 'ordered') {
      const items: { start: number; text: string }[] = [];
      while (i < lines.length) {
        const next = classifyLine(lines[i]);
        if (next?.kind !== 'ordered') break;
        items.push({ start: next.start, text: next.text });
        i += 1;
      }
      parts.push(renderOrderedList(items, gKey, tone));
      continue;
    }

    if (classified.kind === 'blockquote') {
      const bqLines: string[] = [];
      while (i < lines.length) {
        const next = classifyLine(lines[i]);
        if (next?.kind !== 'blockquote') break;
        bqLines.push(next.text);
        i += 1;
      }
      parts.push(renderBlockquote(bqLines, gKey, tone));
      continue;
    }

    if (classified.kind === 'table') {
      const tableLines: string[] = [];
      while (i < lines.length) {
        const next = classifyLine(lines[i]);
        if (next?.kind !== 'table') break;
        tableLines.push(next.raw);
        i += 1;
      }
      const table = renderTable(tableLines, gKey, tone);
      if (table) parts.push(table);
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const next = classifyLine(lines[i]);
      if (next?.kind !== 'paragraph') break;
      paragraphLines.push(next.text);
      i += 1;
    }
    parts.push(
      <p key={gKey} className="mt-3 first:mt-0">
        {renderInline(paragraphLines.join(' '), gKey, tone)}
      </p>,
    );
  }

  return parts;
}

function formatTextSegment(
  text: string,
  keyBase: string,
  tone: RichContentTone = 'screen',
  highlightQuery = '',
): (string | JSX.Element)[] {
  const result: (string | JSX.Element)[] = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > last) {
      result.push(...highlightClinical(text.slice(last, match.index), `${keyBase}-${last}`, tone, highlightQuery));
    }
    result.push(
      <strong
        key={`b-${keyBase}-${match.index}`}
        className={tone === 'print' ? 'font-semibold text-slate-900' : 'font-semibold text-slate-900 dark:text-white'}
      >
        {wrapSearchHits(match[1], highlightQuery, `${keyBase}-b-${match.index}`, tone)}
      </strong>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    result.push(...highlightClinical(text.slice(last), `${keyBase}-${last}`, tone, highlightQuery));
  }
  return result;
}

function highlightClinical(
  text: string,
  key: string,
  tone: RichContentTone = 'screen',
  highlightQuery = '',
): (string | JSX.Element)[] {
  const clinicalRegex = /([≥≤><]?\s*\d+[\.\d]*\s*(?:ms|mV|µV|m\/s|mm²|Hz|°C|%|m\/seg))/g;
  const parts: (string | JSX.Element)[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = clinicalRegex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <span
        key={`cv-${key}-${match.index}`}
        className={
          tone === 'print'
            ? 'font-mono text-[0.9em] px-0.5 text-slate-800 whitespace-nowrap'
            : 'font-mono text-[0.85em] px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 whitespace-nowrap'
        }
      >
        {wrapSearchHits(match[1], highlightQuery, `${key}-cv-${match.index}`, tone)}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  if (parts.length === 0) parts.push(text);
  return parts.flatMap((part, i) =>
    typeof part === 'string' ? wrapSearchHits(part, highlightQuery, `${key}-t-${i}`, tone) : [part],
  );
}

function wrapSearchHits(
  text: string,
  query: string,
  keyBase: string,
  tone: RichContentTone,
): (string | JSX.Element)[] {
  if (!query.trim() || query.trim().length < 2) return [text];
  const parts = splitHighlightedParts(text, query);
  if (parts.length === 1 && !parts[0].hit) return [text];
  return parts.map((part, i) =>
    part.hit ? (
      <mark
        key={`${keyBase}-hit-${i}`}
        data-search-hit=""
        className={
          tone === 'print'
            ? 'bg-amber-100 text-inherit rounded-sm px-0.5'
            : 'bg-amber-200/90 dark:bg-amber-400/25 text-inherit rounded-sm px-0.5'
        }
      >
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}

export function RichContent({
  text,
  className = '',
  headingLevel = 2,
  tone = 'screen',
  highlightQuery = '',
}: {
  text: string;
  className?: string;
  headingLevel?: RichHeadingLevel;
  tone?: RichContentTone;
  highlightQuery?: string;
}) {
  const rendered = useMemo(() => {
    const previousQuery = activeHighlightQuery;
    activeHighlightQuery = highlightQuery;
    try {
      const normalized = text.replace(/\r\n/g, '\n');
      const blocks = normalized.split(/\n\n+/);

      return blocks.flatMap((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return [];
        return renderBlockLines(trimmed.split('\n'), `b-${bIdx}`, headingLevel, tone);
      });
    } finally {
      activeHighlightQuery = previousQuery;
    }
  }, [text, headingLevel, tone, highlightQuery]);

  return (
    <div
      className={
        tone === 'print'
          ? `text-[length:var(--book-body,11pt)] leading-[var(--book-line,1.55)] text-slate-800 ${className}`
          : `text-[0.95rem] sm:text-base leading-[1.8] text-slate-700 dark:text-slate-300 ${className}`
      }
    >
      {rendered}
    </div>
  );
}
