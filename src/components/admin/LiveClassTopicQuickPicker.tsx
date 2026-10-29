import { useMemo, useState } from 'react';
import { Search, X, Plus, Check, Layers } from 'lucide-react';
import type { Module, Topic } from '../../types/content';

export interface LiveClassTopicEntry {
  topicId: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
  parentTitle?: string | null;
  parentTopicId?: string | null;
  isSubtopic: boolean;
}

function appendTopics(
  list: LiveClassTopicEntry[],
  mod: Module,
  topics: Topic[],
  parent: { id: string; title: string } | null,
) {
  for (const topic of topics) {
    list.push({
      topicId: topic.id,
      title: topic.title,
      moduleId: mod.id,
      moduleTitle: mod.title,
      parentTitle: parent?.title ?? null,
      parentTopicId: parent?.id ?? null,
      isSubtopic: Boolean(parent),
    });
    if (topic.children?.length) {
      appendTopics(list, mod, topic.children, { id: topic.id, title: topic.title });
    }
  }
}

export function buildLiveClassTopicCatalog(modules: Module[]): LiveClassTopicEntry[] {
  const list: LiveClassTopicEntry[] = [];
  for (const mod of modules) {
    appendTopics(list, mod, mod.topics, null);
  }
  return list;
}

function childrenByParent(catalog: LiveClassTopicEntry[]): Map<string, string[]> {
  const byParent = new Map<string, string[]>();
  for (const entry of catalog) {
    if (!entry.parentTopicId) continue;
    const list = byParent.get(entry.parentTopicId) ?? [];
    list.push(entry.topicId);
    byParent.set(entry.parentTopicId, list);
  }
  return byParent;
}

export function descendantTopicIds(catalog: LiveClassTopicEntry[], topicId: string): string[] {
  const byParent = childrenByParent(catalog);
  const out: string[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    for (const childId of byParent.get(id) ?? []) {
      if (seen.has(childId)) continue;
      seen.add(childId);
      out.push(childId);
      walk(childId);
    }
  };
  walk(topicId);
  return out;
}

/** Un tema general arrastra a todos sus subtemas. Un subtema suelto no arrastra hermanos. */
export function topicIdsIncludedBySelection(
  catalog: LiveClassTopicEntry[],
  topicId: string,
): string[] {
  const descendants = descendantTopicIds(catalog, topicId);
  return descendants.length > 0 ? [topicId, ...descendants] : [topicId];
}

export interface SelectedTopicGroup {
  entry: LiveClassTopicEntry;
  children: LiveClassTopicEntry[];
  removeIds: string[];
}

export function groupSelectedLiveClassTopics(
  catalog: LiveClassTopicEntry[],
  selectedIds: string[],
): SelectedTopicGroup[] {
  const selected = new Set(selectedIds);
  const covered = new Set<string>();
  for (const id of selectedIds) {
    for (const descendantId of descendantTopicIds(catalog, id)) {
      if (selected.has(descendantId)) covered.add(descendantId);
    }
  }
  const byId = new Map(catalog.map((entry) => [entry.topicId, entry]));
  const groups: SelectedTopicGroup[] = [];
  for (const id of selectedIds) {
    if (covered.has(id)) continue;
    const entry = byId.get(id);
    if (!entry) continue;
    const children = descendantTopicIds(catalog, id)
      .filter((descendantId) => selected.has(descendantId))
      .map((descendantId) => byId.get(descendantId))
      .filter((item): item is LiveClassTopicEntry => Boolean(item));
    groups.push({
      entry,
      children,
      removeIds: [id, ...children.map((child) => child.topicId)],
    });
  }
  return groups;
}

function subtopicCountLabel(count: number): string {
  return count === 1 ? '1 subtema' : `${count} subtemas`;
}

interface LiveClassTopicQuickPickerProps {
  catalog: LiveClassTopicEntry[];
  primaryTopicId: string;
  primaryTopicTitle: string;
  selectedAdditionalIds: string[];
  onSelectedAdditionalIdsChange: (ids: string[]) => void;
  disabled?: boolean;
  maxResults?: number;
  /** Temas sugeridos al enfocar el buscador (sin escribir). */
  suggestedEntries?: LiveClassTopicEntry[];
  title?: string;
  hint?: string;
  showPrimaryChip?: boolean;
  searchPlaceholder?: string;
}

export function LiveClassTopicQuickPicker({
  catalog,
  primaryTopicId,
  primaryTopicTitle,
  selectedAdditionalIds,
  onSelectedAdditionalIdsChange,
  disabled = false,
  maxResults = 8,
  suggestedEntries = [],
  title = 'Temas incluidos en esta sesión',
  hint = 'El docente asignado arriba se vinculará oficialmente a cada tema al guardar.',
  showPrimaryChip = true,
  searchPlaceholder = 'Buscar tema o subtema para sumar a la clase…',
}: LiveClassTopicQuickPickerProps) {
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const selectedGroups = useMemo(
    () => groupSelectedLiveClassTopics(catalog, selectedAdditionalIds),
    [catalog, selectedAdditionalIds],
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((entry) => {
        if (entry.topicId === primaryTopicId) return false;
        if (selectedAdditionalIds.includes(entry.topicId)) return false;
        const haystack = [
          entry.title,
          entry.moduleTitle,
          entry.parentTitle ?? '',
          entry.topicId,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, maxResults);
  }, [catalog, query, primaryTopicId, selectedAdditionalIds, maxResults]);

  const visibleSuggestions = useMemo(() => {
    if (query.trim()) return searchResults;
    if (!searchFocused) return [];
    return suggestedEntries
      .filter(
        (entry) =>
          entry.topicId !== primaryTopicId && !selectedAdditionalIds.includes(entry.topicId),
      )
      .slice(0, maxResults);
  }, [
    query,
    searchFocused,
    searchResults,
    suggestedEntries,
    primaryTopicId,
    selectedAdditionalIds,
    maxResults,
  ]);

  const visibleIds = useMemo(
    () => new Set(visibleSuggestions.map((entry) => entry.topicId)),
    [visibleSuggestions],
  );

  const showResultsPanel =
    !disabled && (query.trim().length > 0 || (searchFocused && visibleSuggestions.length > 0));

  const addEntry = (topicId: string) => {
    if (disabled || topicId === primaryTopicId) return;
    const incoming = topicIdsIncludedBySelection(catalog, topicId).filter(
      (id) => id !== primaryTopicId,
    );
    onSelectedAdditionalIdsChange([...new Set([...selectedAdditionalIds, ...incoming])]);
    setQuery('');
    setSearchFocused(false);
  };

  const removeIds = (ids: string[]) => {
    if (disabled) return;
    const drop = new Set(ids);
    onSelectedAdditionalIdsChange(selectedAdditionalIds.filter((id) => !drop.has(id)));
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{title}</p>
        {hint ? (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        {showPrimaryChip ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white border border-blue-600"
            title="Tema desde el que abriste esta ficha"
          >
            <Check className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[220px]">{primaryTopicTitle}</span>
            <span className="text-[9px] font-black uppercase opacity-80">Principal</span>
          </span>
        ) : null}
        {selectedGroups.map((group) =>
          group.children.length > 0 ? (
            <div
              key={group.entry.topicId}
              className="w-full rounded-lg border border-indigo-200/80 dark:border-indigo-800/60 bg-indigo-50/80 dark:bg-indigo-950/40 px-2 py-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 min-w-0 text-[11px] font-bold text-indigo-900 dark:text-indigo-100">
                  <Layers className="w-3 h-3 shrink-0 text-indigo-500" />
                  <span className="truncate" title={group.entry.title}>
                    {group.entry.title}
                  </span>
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                    {subtopicCountLabel(group.children.length)}
                  </span>
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeIds(group.removeIds)}
                    className="p-0.5 rounded-md hover:bg-indigo-200/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 cursor-pointer shrink-0"
                    aria-label={`Quitar ${group.entry.title} y sus subtemas`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {group.children.map((child) => (
                  <span
                    key={child.topicId}
                    className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-900 text-indigo-800 dark:text-indigo-200 border border-indigo-200/70 dark:border-indigo-800/50 max-w-full"
                  >
                    <span className="truncate max-w-[200px]" title={child.title}>
                      {child.title}
                    </span>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => removeIds([child.topicId])}
                        className="p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-500 cursor-pointer"
                        aria-label={`Quitar ${child.title}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <span
              key={group.entry.topicId}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-800/60 max-w-full"
            >
              {group.entry.isSubtopic ? (
                <Layers className="w-3 h-3 shrink-0 text-indigo-500" />
              ) : null}
              <span className="truncate max-w-[180px]" title={group.entry.title}>
                {group.entry.title}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeIds([group.entry.topicId])}
                  className="p-0.5 rounded-md hover:bg-indigo-200/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 cursor-pointer"
                  aria-label={`Quitar ${group.entry.title}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ),
        )}
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setSearchFocused(false), 150);
          }}
          disabled={disabled}
          placeholder={searchPlaceholder}
          className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:opacity-50"
        />
        {query && !disabled && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showResultsPanel && (
        <div
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          {!query.trim() && visibleSuggestions.length > 0 ? (
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
              Sugeridos en este módulo
            </p>
          ) : null}
          {visibleSuggestions.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-slate-500">Sin coincidencias.</p>
          ) : (
            <ul className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {visibleSuggestions.map((entry) => {
                const descendantCount = descendantTopicIds(catalog, entry.topicId).length;
                const nested =
                  entry.isSubtopic &&
                  Boolean(entry.parentTopicId) &&
                  visibleIds.has(entry.parentTopicId as string);
                return (
                  <li key={entry.topicId}>
                    <button
                      type="button"
                      onClick={() => addEntry(entry.topicId)}
                      className={`w-full text-left py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition flex items-start gap-2 cursor-pointer ${
                        descendantCount > 0
                          ? 'px-3 bg-slate-50/80 dark:bg-slate-800/50'
                          : nested
                            ? 'pl-7 pr-3'
                            : 'px-3'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {entry.title}
                        </span>
                        {descendantCount > 0 ? (
                          <span className="block text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 truncate">
                            Tema general · se incluyen sus {subtopicCountLabel(descendantCount)}
                          </span>
                        ) : (
                          <span className="block text-[10px] text-slate-500 truncate">
                            {entry.isSubtopic && entry.parentTitle
                              ? `${entry.parentTitle} · ${entry.moduleTitle}`
                              : entry.moduleTitle}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
