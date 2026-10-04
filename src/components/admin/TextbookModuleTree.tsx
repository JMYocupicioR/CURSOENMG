import { useMemo, useState } from 'react';
import { CheckSquare, ChevronDown, ChevronRight, Settings2, Square } from 'lucide-react';
import { countTopicNodes, type TextbookInclusion } from '../../pdf/textbook/buildTextbookModel';
import { contributorsForModule, contributorsForTopics, type TextbookContributor } from '../../pdf/textbook/textbookCredits';
import {
  flattenTopics,
  isTopicIncluded,
  patchTopicOverride,
  resolveTopicInclusion,
  type TextbookCreditOptions,
  type TopicPrintOverride,
} from '../../pdf/textbook/textbookOptions';
import type { Module } from '../../types/content';
import type { PublishedTopic } from '../../types/database';

const TOPIC_TOGGLES: { key: keyof TopicPrintOverride; label: string }[] = [
  { key: 'outlineOnly', label: 'Solo esquema' },
  { key: 'body', label: 'Cuerpo' },
  { key: 'pearls', label: 'Perlas' },
  { key: 'keyPoints', label: 'Puntos clave' },
  { key: 'images', label: 'Imágenes' },
  { key: 'teachingPdfs', label: 'PDFs' },
  { key: 'bibliography', label: 'Biblio' },
  { key: 'authors', label: 'Autores' },
  { key: 'editedDate', label: 'Fecha' },
];

function AuthorChip({
  person,
  disabled,
  onToggle,
}: {
  person: TextbookContributor;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
        disabled
          ? 'border-slate-200 dark:border-slate-700 text-slate-400 line-through bg-slate-50 dark:bg-slate-950'
          : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200'
      }`}
    >
      {disabled ? <Square className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
      <span>{person.label}</span>
      <span className="opacity-70">· {person.topicIds.length}</span>
    </button>
  );
}

export function TextbookModuleTree({
  modules,
  selectedModuleIds,
  previewModuleId,
  contributors,
  inclusion,
  creditOptions,
  topicOverrides,
  publishedTopics,
  onToggleModule,
  onPreview,
  onToggleAuthor,
  onChangeOverrides,
}: {
  modules: Module[];
  selectedModuleIds: string[];
  previewModuleId: string | null;
  contributors: TextbookContributor[];
  inclusion: TextbookInclusion;
  creditOptions: TextbookCreditOptions;
  topicOverrides: Record<string, TopicPrintOverride>;
  publishedTopics: PublishedTopic[];
  onToggleModule: (id: string) => void;
  onPreview: (id: string) => void;
  onToggleAuthor: (id: string) => void;
  onChangeOverrides: (next: Record<string, TopicPrintOverride>) => void;
}) {
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [openTopics, setOpenTopics] = useState<string[]>([]);
  const publishedById = useMemo(
    () => new Map(publishedTopics.map((topic) => [topic.id, topic])),
    [publishedTopics]
  );

  const toggleModuleOpen = (id: string) => {
    setOpenModules((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <ul className="mt-3 space-y-1.5 max-h-[36rem] overflow-auto pr-1">
      {modules.map((mod) => {
        const checked = selectedModuleIds.includes(mod.id);
        const previewing = previewModuleId === mod.id;
        const expanded = openModules.includes(mod.id);
        const chapterAuthors = contributorsForModule(contributors, mod.id);
        const rows = flattenTopics(mod.topics);

        return (
          <li key={mod.id} className="rounded-xl border border-transparent">
            <div className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${previewing ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''}`}>
              <button type="button" onClick={() => onToggleModule(mod.id)} className="text-slate-500" aria-label={checked ? 'Quitar módulo' : 'Incluir módulo'}>
                {checked ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => toggleModuleOpen(mod.id)} className="text-slate-400" aria-expanded={expanded} aria-label={expanded ? 'Cerrar temas' : 'Ver temas y autores'}>
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => onPreview(mod.id)} className="flex-1 text-left text-sm">
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {String(mod.number).padStart(2, '0')}. {mod.title}
                </span>
                <span className="block text-[11px] text-slate-500">
                  {countTopicNodes(mod.topics)} temas
                  {chapterAuthors.length ? ` · ${chapterAuthors.length} ${chapterAuthors.length === 1 ? 'autor' : 'autores'}` : ''}
                </span>
              </button>
            </div>

            {expanded && (
              <div className="ml-6 mr-1 mb-2 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Autores del capítulo</p>
                  {chapterAuthors.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">Aún no hay editores publicados en este módulo.</p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {chapterAuthors.map((person) => (
                        <AuthorChip
                          key={person.id}
                          person={person}
                          disabled={creditOptions.disabledAuthorIds.includes(person.id)}
                          onToggle={() => onToggleAuthor(person.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <ul className="space-y-1">
                  {rows.map(({ topic, depth, path }) => {
                    const included = isTopicIncluded(topic.id, path, topicOverrides);
                    const ancestorExcluded = path.slice(0, -1).some((id) => topicOverrides[id]?.included === false);
                    const optionsOpen = openTopics.includes(topic.id);
                    const topicAuthors = contributorsForTopics(contributors, [topic.id]);
                    const published = publishedById.get(topic.id);
                    const override = topicOverrides[topic.id];
                    const resolved = resolveTopicInclusion(inclusion, override);

                    return (
                      <li key={topic.id}>
                        <div className="flex items-start gap-1.5" style={{ paddingLeft: depth * 12 }}>
                          <button
                            type="button"
                            disabled={ancestorExcluded}
                            onClick={() => onChangeOverrides(patchTopicOverride(topicOverrides, topic.id, { included: included && !ancestorExcluded ? false : true }))}
                            className="mt-0.5 text-slate-500 disabled:opacity-40"
                            aria-label={included ? 'Excluir tema' : 'Incluir tema'}
                          >
                            {included ? <CheckSquare className="w-3.5 h-3.5 text-indigo-600" /> : <Square className="w-3.5 h-3.5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-1">
                              <p className={`text-xs font-medium ${included ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 line-through'}`}>
                                {topic.title}
                              </p>
                              <button
                                type="button"
                                onClick={() => setOpenTopics((current) => current.includes(topic.id) ? current.filter((id) => id !== topic.id) : [...current, topic.id])}
                                className="ml-auto shrink-0 text-slate-400 hover:text-indigo-600"
                                aria-label={`Opciones de ${topic.title}`}
                              >
                                <Settings2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              {topicAuthors.length
                                ? topicAuthors.map((person) => person.name).join(', ')
                                : 'Sin autores registrados'}
                              {published?.version ? ` · v${published.version}` : ''}
                              {published?.published_at
                                ? ` · ${new Date(published.published_at).toLocaleDateString('es-MX')}`
                                : ''}
                            </p>
                          </div>
                        </div>
                        {optionsOpen && (
                          <div className="mt-1 mb-2 flex flex-wrap gap-1" style={{ paddingLeft: depth * 12 + 22 }}>
                            {TOPIC_TOGGLES.map((item) => {
                              const on = Boolean((resolved as any)[item.key]);
                              return (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() => onChangeOverrides(patchTopicOverride(topicOverrides, topic.id, { [item.key]: !on }))}
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                    on
                                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200'
                                      : 'border-slate-200 text-slate-400 dark:border-slate-700'
                                  }`}
                                >
                                  {item.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
