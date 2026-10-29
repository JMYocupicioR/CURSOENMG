import { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { allModules } from '../../content/modules';
import { isAppendixModule } from '../../content/appendixModules';
import type { Topic } from '../../types/content';
import { READING_TOPIC_LIMIT } from '../../utils/readingAssignments';

interface LeafTopic {
  id: string;
  title: string;
  trail: string;
}

interface ModuleGroup {
  id: string;
  label: string;
  topics: LeafTopic[];
}

function collectLeaves(topics: Topic[], trail: string[], into: LeafTopic[]) {
  for (const topic of topics) {
    if (topic.children && topic.children.length > 0) {
      collectLeaves(topic.children, [...trail, topic.title], into);
    } else {
      into.push({ id: topic.id, title: topic.title, trail: trail.join(' · ') });
    }
  }
}

function topicGroups(): ModuleGroup[] {
  return allModules
    .filter((mod) => !isAppendixModule(mod.id))
    .map((mod) => {
      const topics: LeafTopic[] = [];
      collectLeaves(mod.topics, [], topics);
      return {
        id: mod.id,
        label: `Módulo ${mod.number}. ${mod.title}`,
        topics,
      };
    })
    .filter((group) => group.topics.length > 0);
}

interface ReadingTopicPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ReadingTopicPicker({ selectedIds, onChange }: ReadingTopicPickerProps) {
  const groups = useMemo(() => topicGroups(), []);
  const [query, setQuery] = useState('');
  const [openModuleId, setOpenModuleId] = useState<string | null>(groups[0]?.id ?? null);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const needle = query.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        topics: group.topics.filter((topic) => {
          const haystack = `${topic.title} ${topic.trail} ${group.label}`.toLowerCase();
          return haystack.includes(needle);
        }),
      }))
      .filter((group) => group.topics.length > 0);
  }, [groups, needle]);

  const toggle = (id: string) => {
    if (selected.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
      return;
    }
    if (selectedIds.length >= READING_TOPIC_LIMIT) return;
    onChange([...selectedIds, id]);
  };

  const toggleModule = (group: ModuleGroup) => {
    const visibleIds = group.topics.map((topic) => topic.id);
    const allOn = visibleIds.every((id) => selected.has(id));
    if (allOn) {
      const drop = new Set(visibleIds);
      onChange(selectedIds.filter((id) => !drop.has(id)));
      return;
    }
    const next = [...selectedIds];
    for (const id of visibleIds) {
      if (next.length >= READING_TOPIC_LIMIT) break;
      if (!selected.has(id)) next.push(id);
    }
    onChange(next);
  };

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
          <BookOpen className="h-3.5 w-3.5 text-amber-600" />
          Temas por leer
        </span>
        <span className="text-[10px] text-slate-400">
          {selectedIds.length}/{READING_TOPIC_LIMIT}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">
        Se marca leído al llegar al final del tema. Si ya lo había leído, esa parte queda cumplida al publicar.
      </p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Buscar tema o módulo"
          placeholder="Buscar tema o módulo"
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {visibleGroups.length === 0 ? (
          <p className="py-3 text-center text-slate-400">Ningún tema coincide con la búsqueda.</p>
        ) : (
          visibleGroups.map((group) => {
            const open = needle ? true : openModuleId === group.id;
            const selectedInGroup = group.topics.filter((topic) => selected.has(topic.id)).length;
            return (
              <div key={group.id} className="rounded-xl bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={selectedInGroup === group.topics.length && group.topics.length > 0}
                    ref={(node) => {
                      if (node) node.indeterminate = selectedInGroup > 0 && selectedInGroup < group.topics.length;
                    }}
                    onChange={() => toggleModule(group)}
                    aria-label={`Seleccionar temas de ${group.label}`}
                    className="rounded text-amber-600"
                  />
                  <button
                    type="button"
                    onClick={() => setOpenModuleId(open && !needle ? null : group.id)}
                    className="min-w-0 flex-1 truncate text-left font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {group.label}
                  </button>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {selectedInGroup}/{group.topics.length}
                  </span>
                </div>
                {open && (
                  <ul className="space-y-0.5 px-2 pb-2">
                    {group.topics.map((topic) => (
                      <li key={topic.id}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/70">
                          <input
                            type="checkbox"
                            checked={selected.has(topic.id)}
                            onChange={() => toggle(topic.id)}
                            className="mt-0.5 rounded text-amber-600"
                          />
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-700 dark:text-slate-200">
                              {topic.title}
                            </span>
                            {topic.trail && (
                              <span className="block text-[10px] text-slate-400">{topic.trail}</span>
                            )}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
