import type { RevisionPayload } from '../../types/database';

const FIELDS: { key: keyof RevisionPayload; label: string }[] = [
  { key: 'title', label: 'Título' },
  { key: 'titleEn', label: 'Título (EN)' },
  { key: 'description', label: 'Descripción' },
  { key: 'content', label: 'Contenido' },
  { key: 'contentEn', label: 'Contenido (EN)' },
];

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    if (typeof value[0] === 'string') return value.join('\n');
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function formatMediaSummary(media: {
  videoUrls?: unknown[];
  youtubeUrls?: { title?: string; videoId?: string }[];
  vimeoUrls?: unknown[];
  embedUrls?: unknown[];
  imageUrls?: unknown[];
}): string {
  const parts: string[] = [];
  if (media.youtubeUrls?.length) {
    parts.push(
      `YouTube (${media.youtubeUrls.length}):\n` +
        media.youtubeUrls.map((y) => `  • ${y.title || 'Video'} (${y.videoId || ''})`).join('\n')
    );
  }
  if (media.videoUrls?.length) {
    parts.push(`Videos directos (${media.videoUrls.length}):\n` + media.videoUrls.map((v) => `  • ${String(v)}`).join('\n'));
  }
  if (media.vimeoUrls?.length) {
    parts.push(`Vimeo (${media.vimeoUrls.length}):\n` + media.vimeoUrls.map((v) => `  • ${String(v)}`).join('\n'));
  }
  if (media.embedUrls?.length) {
    parts.push(`Embeds (${media.embedUrls.length}):\n` + media.embedUrls.map((e) => `  • ${String(e)}`).join('\n'));
  }
  if (media.imageUrls?.length) {
    parts.push(`Imágenes (${media.imageUrls.length}):\n` + media.imageUrls.map((i) => `  • ${String(i)}`).join('\n'));
  }
  return parts.length > 0 ? parts.join('\n\n') : 'Sin elementos multimedia';
}

function formatReferences(value: RevisionPayload['references']): string {
  if (!value?.length) return '—';
  return value
    .map((ref, index) => {
      const source = [ref.journal, ref.year].filter(Boolean).join(', ');
      const link = ref.url ? ` ${ref.url}` : '';
      return `${index + 1}. ${ref.authors} ${ref.title}.${source ? ` ${source}.` : ''}${link}`;
    })
    .join('\n');
}

function changed(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
}

export function RevisionDiff({
  current,
  proposed,
}: {
  current: RevisionPayload;
  proposed: RevisionPayload;
}) {
  const diffs = FIELDS.filter(({ key }) => changed(current[key], proposed[key]));

  const mediaChanged =
    changed(current.videoUrls, proposed.videoUrls) ||
    changed(current.youtubeUrls, proposed.youtubeUrls) ||
    changed(current.vimeoUrls, proposed.vimeoUrls) ||
    changed(current.embedUrls, proposed.embedUrls) ||
    changed(current.imageUrls, proposed.imageUrls);
  const referencesChanged = changed(current.references, proposed.references);

  if (diffs.length === 0 && !mediaChanged && !referencesChanged) {
    return (
      <p className="text-sm text-slate-500 italic">Sin cambios detectados respecto a la versión actual.</p>
    );
  }

  return (
    <div className="space-y-4">
      {diffs.map(({ key, label }) => (
        <div key={key} className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Actual · {label}
            </p>
            <pre className="text-xs whitespace-pre-wrap text-slate-600 dark:text-slate-300 font-sans">
              {formatValue(current[key])}
            </pre>
          </div>
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 p-3 bg-emerald-50/30 dark:bg-emerald-900/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-2">
              Propuesto · {label}
            </p>
            <pre className="text-xs whitespace-pre-wrap text-slate-700 dark:text-slate-200 font-sans">
              {formatValue(proposed[key])}
            </pre>
          </div>
        </div>
      ))}

      {referencesChanged && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Bibliografía actual</p>
            <pre className="text-xs whitespace-pre-wrap font-sans text-slate-600 dark:text-slate-300">
              {formatReferences(current.references)}
            </pre>
          </div>
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 p-3 bg-emerald-50/30 dark:bg-emerald-900/10">
            <p className="text-xs font-semibold uppercase text-emerald-600 mb-2">Bibliografía propuesta</p>
            <pre className="text-xs whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-200">
              {formatReferences(proposed.references)}
            </pre>
          </div>
        </div>
      )}

      {mediaChanged && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Media actual</p>
            <pre className="text-xs whitespace-pre-wrap font-sans text-slate-600 dark:text-slate-300">
              {formatMediaSummary({
                videoUrls: current.videoUrls,
                youtubeUrls: current.youtubeUrls,
                vimeoUrls: current.vimeoUrls,
                embedUrls: current.embedUrls,
                imageUrls: current.imageUrls,
              })}
            </pre>
          </div>
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 p-3 bg-emerald-50/30 dark:bg-emerald-900/10">
            <p className="text-xs font-semibold uppercase text-emerald-600 mb-2">Media propuesta</p>
            <pre className="text-xs whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-200">
              {formatMediaSummary({
                videoUrls: proposed.videoUrls,
                youtubeUrls: proposed.youtubeUrls,
                vimeoUrls: proposed.vimeoUrls,
                embedUrls: proposed.embedUrls,
                imageUrls: proposed.imageUrls,
              })}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
