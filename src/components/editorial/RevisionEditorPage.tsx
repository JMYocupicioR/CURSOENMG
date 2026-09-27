import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, Send, Plus, Trash2 } from 'lucide-react';
import { allModules, getModuleById } from '../../content/modules';
import { useAuth } from '../../contexts/AuthProvider';
import { getRevisionById, saveRevision, submitRevision, getPublishedTopic } from '../../services/editorialService';
import { findTopicInTree, findTopicPathInTree, topicToRevisionPayload, getAllFlatTopics } from '../../services/contentMerge';
import { getReferencesForTopic, normalizeReferences } from '../../content/topicReferences';
import { useAllModules } from '../../hooks/useAllModules';
import { useMergedModule } from '../../hooks/useMergedModule';
import { useGoBack } from '../../hooks/useGoBack';
import { BackButton } from '../common/BackButton';
import { slugify } from '../../utils/slugify';
import type { Topic } from '../../types/content';
import type { RevisionAction, RevisionPayload } from '../../types/database';
import {
  externalListToVideoMedia,
  resolveExternalVideos,
  validateMediaPayload,
} from '../../utils/mediaValidation';
import { MediaPreview } from './MediaPreview';

const emptyPayload = (): RevisionPayload => ({
  title: '',
  content: '',
  videoUrls: [],
  youtubeUrls: [],
  vimeoUrls: [],
  embedUrls: [],
  externalVideos: [],
  imageUrls: [],
  clinicalPearls: [],
  keyPoints: [],
});

function withExternalVideos(payload: RevisionPayload): RevisionPayload {
  return { ...payload, externalVideos: resolveExternalVideos(payload) };
}

export default function RevisionEditorPage() {
  const { revisionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const goBack = useGoBack('/colaborador');
  const { user, isVerifiedContributor } = useAuth();
  const { modules: availableModules } = useAllModules();

  const queryModuleId = searchParams.get('moduleId');
  const queryTopicId = searchParams.get('topicId');
  const queryAction = searchParams.get('action') as RevisionAction | null;
  const queryParentId = searchParams.get('parentId');

  const [moduleId, setModuleId] = useState(queryModuleId ?? allModules[0]?.id ?? '');
  const { module: mergedModule } = useMergedModule(moduleId);
  const [targetTopicId, setTargetTopicId] = useState<string | null>(queryTopicId);
  const [parentId, setParentId] = useState<string | null>(queryParentId);
  const [action, setAction] = useState<RevisionAction>(queryAction === 'update' ? 'update' : 'create');
  const [payload, setPayload] = useState<RevisionPayload>(emptyPayload());
  const [currentId, setCurrentId] = useState<string | undefined>(revisionId);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourceHint, setSourceHint] = useState<string | null>(null);

  useEffect(() => {
    if (revisionId || !queryTopicId || !queryModuleId) return;

    let cancelled = false;

    async function loadSourceTopic() {
      const mod = getModuleById(queryModuleId!);
      const staticTopic = mod ? findTopicInTree(mod.topics, queryTopicId!) : null;

      const published = await getPublishedTopic(queryTopicId!);
      let payloadFromSource: RevisionPayload;

      const ancestorIds = (() => {
        const path = mod ? findTopicPathInTree(mod.topics, queryTopicId!) : null;
        return path ? path.slice(0, -1) : [];
      })();
      const inheritedReferences = getReferencesForTopic(queryModuleId!, queryTopicId!, ancestorIds);

      if (published) {
        payloadFromSource = {
          id: published.id,
          title: published.title,
          titleEn: published.title_en ?? undefined,
          description: published.description ?? undefined,
          content: published.content ?? undefined,
          videoUrls: published.media?.videoUrls ?? [],
          youtubeUrls: published.media?.youtubeUrls ?? [],
          vimeoUrls: published.media?.vimeoUrls ?? [],
          embedUrls: published.media?.embedUrls ?? [],
          imageUrls: published.media?.imageUrls ?? [],
          clinicalPearls: published.clinical_pearls ?? [],
          keyPoints: published.key_points ?? [],
          references: published.media?.references?.length ? published.media.references : inheritedReferences,
        };
      } else if (staticTopic) {
        payloadFromSource = topicToRevisionPayload(staticTopic);
        if (!payloadFromSource.references?.length) {
          payloadFromSource = { ...payloadFromSource, references: inheritedReferences };
        }
      } else {
        return;
      }

      if (cancelled) return;

      const topicRef = staticTopic as Topic | null;
      const hasChildren = Boolean(topicRef?.children?.length);
      const hasContent = Boolean(payloadFromSource.content?.trim());
      const hasDescription = Boolean(payloadFromSource.description?.trim());

      if (!hasContent && hasDescription && !hasChildren) {
        payloadFromSource = {
          ...payloadFromSource,
          content: payloadFromSource.description,
        };
      }

      if (hasChildren && !hasContent) {
        setSourceHint(
          'Este tema es una sección contenedora: no tiene texto propio, solo subtemas. ' +
            'Para editar el contenido clínico, abre la subsección específica (ej. Historia, Rol clínico) ' +
            'y usa «Proponer edición» allí. Aquí puedes editar título y descripción de la sección.'
        );
      } else if (!hasContent && !hasDescription) {
        setSourceHint('Este tema no tiene contenido de texto todavía. Puedes agregarlo aquí.');
      } else {
        setSourceHint(null);
      }

      setPayload(withExternalVideos(payloadFromSource));
      setTargetTopicId(queryTopicId);
      setAction('update');
      if (queryModuleId) setModuleId(queryModuleId);
      if (queryParentId) setParentId(queryParentId);
    }

    loadSourceTopic().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [revisionId, queryTopicId, queryModuleId, queryParentId]);

  useEffect(() => {
    if (!revisionId || !user) return;
    getRevisionById(revisionId).then((rev) => {
      if (!rev) return;
      if (rev.payload.revisionType === 'module') {
        navigate(`/colaborador/nuevo-modulo?revisionId=${rev.id}`, { replace: true });
        return;
      }
      setModuleId(rev.module_id);
      setPayload(withExternalVideos(rev.payload));
      setCurrentId(rev.id);
      setTargetTopicId(rev.target_topic_id);
      setParentId(rev.parent_id);
      setAction(rev.action);
    });
  }, [revisionId, user]);

  const updatePayload = (patch: Partial<RevisionPayload>) => setPayload((p) => ({ ...p, ...patch }));

  const handleSave = async (submit = false) => {
    if (!user) return;
    setError(null);
    setMessage(null);

    const mediaErrors = validateMediaPayload({
      ...payload,
      ...externalListToVideoMedia(resolveExternalVideos(payload)),
    });
    if (mediaErrors.length) {
      setError(mediaErrors.join(' '));
      return;
    }
    if (!payload.title.trim()) {
      setError('El título es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      const videoMedia = externalListToVideoMedia(resolveExternalVideos(payload));
      const { externalVideos: _discard, ...rest } = payload;
      const slug = payload.slug?.trim() || slugify(payload.title);
      const references = normalizeReferences(payload.references);
      const normalized: RevisionPayload = {
        ...rest,
        id: action === 'create' ? slug : (targetTopicId ?? payload.id),
        slug: action === 'create' ? slug : payload.slug,
        revisionType: 'topic',
        references,
        ...videoMedia,
        media: {
          videoUrls: videoMedia.videoUrls,
          youtubeUrls: videoMedia.youtubeUrls,
          vimeoUrls: videoMedia.vimeoUrls,
          embedUrls: videoMedia.embedUrls,
          imageUrls: rest.imageUrls ?? [],
          pdfUrls: rest.pdfUrls ?? [],
          references,
        },
      };

      const saved = await saveRevision({
        id: currentId,
        targetTopicId,
        moduleId,
        parentId,
        action,
        payload: normalized,
        authorId: user.id,
      });
      setCurrentId(saved.id);

      if (submit) {
        await submitRevision(saved.id);
        setMessage('Propuesta enviada a revisión. Un administrador la publicará si es aprobada.');
        goBack('/colaborador');
      } else {
        setMessage('Borrador guardado.');
        navigate(`/colaborador/revision/${saved.id}`, { replace: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (!isVerifiedContributor) {
    return (
      <div className="pt-24 px-4 max-w-lg mx-auto text-center">
        <p className="text-slate-600 mb-4">Necesitas verificación de administrador para proponer contenido.</p>
        <Link to="/perfil" className="text-blue-600 underline">Completar perfil</Link>
      </div>
    );
  }

  const selectedModule = mergedModule ?? availableModules.find((m) => m.id === moduleId) ?? getModuleById(moduleId);
  const topicOptions = selectedModule ? getAllFlatTopics(selectedModule.topics) : [];
  const parentTopic = parentId ? findTopicInTree(selectedModule?.topics ?? [], parentId) : null;

  const pageTitle =
    action === 'update'
      ? `Proponer edición${targetTopicId ? `: ${payload.title || targetTopicId}` : ''}`
      : parentId
        ? `Nuevo subtema${parentTopic ? ` en «${parentTopic.title}»` : ''}`
        : 'Nuevo tema';

  return (
    <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
      <BackButton fallback="/colaborador" />

      <h1 className="text-2xl font-bold mb-2">{pageTitle}</h1>
      {action === 'create' && (
        <p className="text-sm text-slate-500 mb-6">
          {parentId
            ? 'Estás proponiendo un subtema nuevo. Se publicará dentro de la sección indicada tras aprobación.'
            : 'Estás proponiendo un tema nuevo en el módulo seleccionado. Se publicará tras aprobación editorial.'}
        </p>
      )}

      {action === 'update' && (
        <p className="text-sm text-slate-500 mb-4">
          Estás proponiendo cambios sobre un tema existente. El administrador verá un diff antes de publicar.
        </p>
      )}

      {action === 'update' && sourceHint && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-900 dark:text-amber-100">
          {sourceHint}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Módulo</span>
            <select
              value={moduleId}
              disabled={action === 'update'}
              onChange={(e) => setModuleId(e.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
            >
              {availableModules.map((m) => (
                <option key={m.id} value={m.id}>{m.number}. {m.title}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Tipo de propuesta</span>
            <select
              value={action}
              disabled={Boolean(revisionId) || Boolean(queryTopicId)}
              onChange={(e) => setAction(e.target.value as RevisionAction)}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
            >
              <option value="create">Contenido nuevo</option>
              <option value="update">Editar tema existente</option>
            </select>
          </label>
        </div>

        {action === 'create' && (
          <label className="block">
            <span className="text-sm font-medium">Ubicación (tema padre)</span>
            <select
              value={parentId ?? ''}
              disabled={Boolean(queryParentId) && Boolean(revisionId)}
              onChange={(e) => setParentId(e.target.value || null)}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="">Raíz del módulo (tema principal)</option>
              {topicOptions.map(({ topic, path }) => (
                <option key={topic.id} value={topic.id}>
                  {'  '.repeat(Math.max(0, path.length - 1))}{topic.title}
                </option>
              ))}
            </select>
          </label>
        )}

        {action === 'create' && (
          <label className="block">
            <span className="text-sm font-medium">Identificador (URL)</span>
            <input
              value={payload.slug ?? ''}
              onChange={(e) => updatePayload({ slug: e.target.value })}
              placeholder={slugify(payload.title) || 'ej. mi-nuevo-tema'}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm"
            />
          </label>
        )}

        <label className="block">
          <span className="text-sm font-medium">Título *</span>
          <input
            value={payload.title}
            onChange={(e) => updatePayload({ title: e.target.value })}
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Descripción breve</span>
          <input
            value={payload.description ?? ''}
            onChange={(e) => updatePayload({ description: e.target.value })}
            placeholder="Resumen del tema (opcional)"
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contenido (texto / markdown)</span>
          <textarea
            rows={12}
            value={payload.content ?? ''}
            onChange={(e) => updatePayload({ content: e.target.value })}
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm"
          />
        </label>

        <MediaEditorSection
          title="Imágenes externas"
          items={payload.imageUrls ?? []}
          onChange={(imageUrls) => updatePayload({ imageUrls })}
          fields={[
            { key: 'src', label: 'URL directa de imagen (https://...)' },
            { key: 'alt', label: 'Texto alternativo (obligatorio)' },
            { key: 'caption', label: 'Pie de foto (opcional)' },
          ]}
        />

        <MediaEditorSection
          title="Videos externos"
          items={resolveExternalVideos(payload)}
          onChange={(externalVideos) => updatePayload({ externalVideos })}
          fields={[
            { key: 'title', label: 'Título del video' },
            {
              key: 'url',
              label: 'URL del video (YouTube, Vimeo, Google Drive, Loom, Dailymotion, etc.)',
            },
          ]}
        />

        <div>
          <MediaEditorSection
            title="Bibliografía de este tema"
            items={(payload.references ?? []).map((ref) => ({
              authors: ref.authors ?? '',
              title: ref.title ?? '',
              journal: ref.journal ?? '',
              year: ref.year === undefined || ref.year === null ? '' : String(ref.year),
              url: ref.url ?? '',
            }))}
            onChange={(items) => updatePayload({
              references: items.map((item) => ({
                authors: item.authors,
                title: item.title,
                journal: item.journal,
                year: item.year,
                url: item.url || undefined,
              })),
            })}
            fields={[
              { key: 'authors', label: 'Autores' },
              { key: 'year', label: 'Año' },
              { key: 'title', label: 'Título' },
              { key: 'journal', label: 'Revista, editorial o fuente' },
              { key: 'url', label: 'Enlace (PubMed, DOI o editorial, opcional)' },
            ]}
            emptyLabel="Sin citas propias. Al publicar vacío, el tema hereda la bibliografía de su sección."
          />
          <p className="mt-2 text-xs text-slate-500">
            El alumno ve esta lista al final del tema. Si la dejas vacía al publicar, el tema vuelve a heredar la bibliografía de su sección o la del módulo.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-4">
          <h2 className="text-sm font-semibold mb-3">Vista previa en tiempo real</h2>
          <MediaPreview payload={payload} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Save className="w-4 h-4" /> Guardar borrador
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Send className="w-4 h-4" /> Enviar a revisión
          </button>
        </div>
      </div>
    </div>
  );
}

function MediaEditorSection<T extends Record<string, string>>({
  title,
  items,
  onChange,
  fields,
  emptyLabel = 'Sin elementos. Solo se almacenan enlaces externos.',
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  fields: { key: keyof T; label: string }[];
  emptyLabel?: string;
}) {
  const add = () => onChange([...items, Object.fromEntries(fields.map((f) => [f.key, ''])) as T]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, key: keyof T, value: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: value };
    onChange(next);
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button type="button" onClick={add} className="inline-flex items-center gap-1 text-sm text-blue-600">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>
      {items.length === 0 && <p className="text-xs text-slate-400">{emptyLabel}</p>}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            {fields.map((f) => (
              <label key={String(f.key)} className="block sm:col-span-1">
                <span className="text-xs text-slate-500">{f.label}</span>
                <input
                  value={String(item[f.key] ?? '')}
                  onChange={(e) => update(i, f.key, e.target.value)}
                  className="mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                />
              </label>
            ))}
            <button type="button" onClick={() => remove(i)} className="text-red-500 text-sm inline-flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Quitar
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
