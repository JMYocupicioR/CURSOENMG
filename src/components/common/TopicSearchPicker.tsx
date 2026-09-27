import { useMemo, useState } from 'react';
import { Search, X, CheckCircle2 } from 'lucide-react';
import { getAllFlatTopics } from '../../services/contentMerge';
import {
  buildCourseDocuments,
  searchDocuments,
  searchLabel,
  type CourseSearchDocument,
  type CourseSearchHit,
} from '../../search/courseSearch';
import { HighlightedSearchText } from '../../search/HighlightedSearchText';
import type { Module } from '../../types/content';

export interface TopicSearchSelection {
  moduleId: string;
  topicId: string;
  title: string;
  breadcrumb: string;
}

interface TopicSearchPickerProps {
  modules: Module[];
  excludeTopicId?: string;
  value: TopicSearchSelection | null;
  onChange: (next: TopicSearchSelection) => void;
  currentModuleId?: string;
}

type PickerRow = {
  topicId: string;
  moduleId: string;
  title: string;
  breadcrumb: string;
  snippet?: string;
  label?: string;
};

function topicIdOf(doc: CourseSearchDocument): string | undefined {
  return doc.topicPath?.[doc.topicPath.length - 1];
}

function eligibleLeafIds(modules: Module[], excludeTopicId?: string): Set<string> {
  const ids = new Set<string>();
  for (const mod of modules) {
    for (const { topic } of getAllFlatTopics(mod.topics ?? [])) {
      if (topic.children?.length) continue;
      if (!topic.content?.trim() && !topic.description?.trim()) continue;
      if (excludeTopicId && topic.id === excludeTopicId) continue;
      ids.add(topic.id);
    }
  }
  return ids;
}

function toRowFromDoc(doc: CourseSearchDocument): PickerRow | null {
  const topicId = topicIdOf(doc);
  if (!topicId || !doc.moduleId) return null;
  return {
    topicId,
    moduleId: doc.moduleId,
    title: doc.title,
    breadcrumb: doc.breadcrumb,
  };
}

function toRowFromHit(hit: CourseSearchHit): PickerRow | null {
  const topicId = hit.topicPath?.[hit.topicPath.length - 1];
  if (!topicId || !hit.moduleId) return null;
  return {
    topicId,
    moduleId: hit.moduleId,
    title: hit.title,
    breadcrumb: hit.breadcrumb,
    snippet: hit.snippet,
    label: searchLabel(hit.matchKind),
  };
}

export function TopicSearchPicker({
  modules,
  excludeTopicId,
  value,
  onChange,
  currentModuleId,
}: TopicSearchPickerProps) {
  const [query, setQuery] = useState('');
  const [onlyCurrentModule, setOnlyCurrentModule] = useState(false);

  const eligibleDocs = useMemo(() => {
    const allowed = eligibleLeafIds(modules, excludeTopicId);
    return buildCourseDocuments(modules).filter((doc) => {
      const id = topicIdOf(doc);
      return Boolean(id && allowed.has(id));
    });
  }, [modules, excludeTopicId]);

  const scopedDocs = useMemo(() => {
    if (!onlyCurrentModule || !currentModuleId) return eligibleDocs;
    return eligibleDocs.filter((doc) => doc.moduleId === currentModuleId);
  }, [eligibleDocs, onlyCurrentModule, currentModuleId]);

  const rows = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) {
      return scopedDocs
        .filter((doc) => !currentModuleId || doc.moduleId === currentModuleId || onlyCurrentModule)
        .slice(0, 12)
        .flatMap((doc) => {
          const row = toRowFromDoc(doc);
          return row ? [row] : [];
        });
    }
    return searchDocuments(scopedDocs, q, 12).flatMap((hit) => {
      const row = toRowFromHit(hit);
      return row ? [row] : [];
    });
  }, [scopedDocs, query, currentModuleId, onlyCurrentModule]);

  const isSearching = query.trim().length >= 2;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
          Tema destino
        </label>
        {currentModuleId && (
          <button
            type="button"
            onClick={() => setOnlyCurrentModule((prev) => !prev)}
            className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition ${
              onlyCurrentModule
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            {onlyCurrentModule ? 'Solo este módulo' : 'Limitar a este módulo'}
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título o texto de la lección..."
          autoFocus
          className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600"
            title="Borrar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {value && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 truncate">{value.title}</p>
            <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 truncate">{value.breadcrumb}</p>
          </div>
        </div>
      )}

      <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-slate-400">
            {isSearching
              ? 'No hay temas que coincidan. Prueba con otra palabra del texto.'
              : 'No hay hojas en esta lista. Busca por título o por una palabra de la lección.'}
          </p>
        ) : (
          rows.map((row) => {
            const selected = value?.topicId === row.topicId && value?.moduleId === row.moduleId;
            return (
              <button
                type="button"
                key={`${row.moduleId}-${row.topicId}`}
                onClick={() =>
                  onChange({
                    moduleId: row.moduleId,
                    topicId: row.topicId,
                    title: row.title,
                    breadcrumb: row.breadcrumb,
                  })
                }
                className={`w-full text-left px-3 py-2.5 min-h-[48px] transition ${
                  selected
                    ? 'bg-indigo-50 dark:bg-indigo-950/50'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                }`}
              >
                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                  {isSearching ? <HighlightedSearchText text={row.title} query={query} /> : row.title}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{row.breadcrumb}</p>
                {row.snippet && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    <HighlightedSearchText text={row.snippet} query={query} />
                    {row.label && (
                      <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                        {row.label}
                      </span>
                    )}
                  </p>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
