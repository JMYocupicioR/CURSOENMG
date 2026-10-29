import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, FileText, ImageIcon, Link2, Plus, Sparkles, Trash2, Video, X } from 'lucide-react';
import { AgreementEditor } from '../agreements/AgreementEditor';
import { AgreementRoster } from '../agreements/AgreementRoster';
import { AdminLayout } from './AdminLayout';
import { StudentPortalGuide } from '../student/StudentPortalGuide';
import { PortalGuideMediaView } from '../student/PortalGuideMediaView';
import type { PortalGuideCourseState, PortalGuideStep } from '../student/portalGuideSteps';
import { useAuth } from '../../contexts/AuthProvider';
import { uploadTeachingFile } from '../../services/teachingStorage';
import {
  deletePortalWelcomeSlide,
  detailFromText,
  fetchPortalWelcomeEditor,
  filterSlidesForCourse,
  publishPortalWelcome,
  reorderPortalWelcomeSlides,
  MAX_SLIDE_MEDIA,
  moveMediaWithinKind,
  savePortalWelcomeSlide,
  setPortalWelcomeSlideEnabled,
  slideMediaItems,
  slideToGuideStep,
  validatePortalWelcomeDraft,
  type PortalWelcomeDraft,
} from '../../services/portalGuideService';
import type { PortalWelcomeAudience, PortalWelcomeMediaItem, PortalWelcomeMediaItemKind, PortalWelcomeSlide } from '../../types/database';

const AUDIENCE_LABEL: Record<PortalWelcomeAudience, string> = {
  all: 'Todos',
  enrolled: 'Inscritos',
  waitlist: 'En lista de espera',
  no_course: 'Sin curso',
};

const LENS: { id: PortalGuideCourseState; label: string; short: string }[] = [
  { id: 'active', label: 'Inscrito', short: 'Inscrito' },
  { id: 'pending', label: 'En lista de espera', short: 'En espera' },
  { id: 'none', label: 'Sin curso', short: 'Sin curso' },
];

const EMPTY_DRAFT: PortalWelcomeDraft = {
  kicker: '',
  title: '',
  body: '',
  detail: [],
  audience: 'all',
  enabled: true,
  media_items: [],
};

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setDesktop(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return desktop;
}

const fieldClass =
  'mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white';

function draftFromSlide(slide: PortalWelcomeSlide): PortalWelcomeDraft {
  return {
    kicker: slide.kicker,
    title: slide.title,
    body: slide.body,
    detail: slide.detail ?? [],
    audience: slide.audience,
    enabled: slide.enabled,
    media_items: slideMediaItems(slide),
  };
}

const MEDIA_TAB_COPY: Record<
  PortalWelcomeMediaItemKind,
  { label: string; add: string; empty: string; url: string; text: string }
> = {
  image: {
    label: 'Foto',
    add: 'Agregar otra foto',
    empty: 'Todavía no hay fotos. Si agregas varias, el alumno las ve en carrusel.',
    url: 'Enlace de la imagen',
    text: 'Texto alternativo',
  },
  video: {
    label: 'Video',
    add: 'Agregar otro video',
    empty: 'Todavía no hay videos. Cada video guarda su propio enlace.',
    url: 'Enlace del video',
    text: 'Título del video',
  },
  link: {
    label: 'Link',
    add: 'Agregar otro enlace',
    empty: 'Todavía no hay enlaces.',
    url: 'Enlace https',
    text: 'Texto del enlace',
  },
};

function openingMediaTab(items: PortalWelcomeMediaItem[]): PortalWelcomeMediaItemKind {
  if (items.some((item) => item.kind === 'image')) return 'image';
  if (items.some((item) => item.kind === 'video')) return 'video';
  if (items.some((item) => item.kind === 'link')) return 'link';
  return 'image';
}

function MediaThumb({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url.startsWith('https://') || failed) return null;
  return (
    <img
      src={url}
      alt={alt || 'Vista previa de la foto'}
      className="h-24 w-full rounded-xl border border-slate-200 object-cover dark:border-slate-700"
      onError={() => setFailed(true)}
    />
  );
}

function sameDraft(a: PortalWelcomeDraft, b: PortalWelcomeDraft): boolean {
  return (
    a.kicker === b.kicker &&
    a.title === b.title &&
    a.body === b.body &&
    a.audience === b.audience &&
    a.enabled === b.enabled &&
    JSON.stringify(a.media_items) === JSON.stringify(b.media_items) &&
    a.detail.join('\n') === b.detail.join('\n')
  );
}

/** Pantallas seguidas que no son para todos forman una sola variante (inscrito / espera / sin curso). */
function clustersOf(slides: PortalWelcomeSlide[]): PortalWelcomeSlide[][] {
  const sorted = [...slides].sort(
    (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'es')
  );
  const clusters: PortalWelcomeSlide[][] = [];
  for (const slide of sorted) {
    const last = clusters[clusters.length - 1];
    if (slide.audience !== 'all' && last?.every((item) => item.audience !== 'all')) {
      last.push(slide);
    } else {
      clusters.push([slide]);
    }
  }
  return clusters;
}

function orderedIdsAfterMove(
  slides: PortalWelcomeSlide[],
  slideId: string,
  direction: -1 | 1,
  lens: PortalGuideCourseState
): string[] | null {
  const clusters = clustersOf(slides);
  const visible = filterSlidesForCourse(slides, lens);
  const fromVisible = visible.findIndex((slide) => slide.id === slideId);
  const target = visible[fromVisible + direction];
  if (!target) return null;
  const fromCluster = clusters.findIndex((cluster) => cluster.some((slide) => slide.id === slideId));
  const toCluster = clusters.findIndex((cluster) => cluster.some((slide) => slide.id === target.id));
  if (fromCluster < 0 || toCluster < 0 || fromCluster === toCluster) return null;
  const next = clusters.slice();
  const current = next[fromCluster];
  next[fromCluster] = next[toCluster];
  next[toCluster] = current;
  return next.flat().map((slide) => slide.id);
}

function SlidePreview({
  step,
  index,
  total,
}: {
  step: PortalGuideStep;
  index: number | null;
  total: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {index === null ? 'No entra en esta secuencia' : `Paso ${index + 1} de ${total}`}
      </p>
      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
        {step.kicker || 'Guía'}
      </p>
      <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{step.title || 'Sin título'}</h3>
      <PortalGuideMediaView media={step.media ?? []} title={step.title || 'Video'} compact />
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {step.body || 'Sin texto todavía.'}
      </p>
      {step.detail && step.detail.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
          {step.detail.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminPortalWelcomePage() {
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const [slides, setSlides] = useState<PortalWelcomeSlide[]>([]);
  const [publishedVersion, setPublishedVersion] = useState(1);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<PortalWelcomeDraft>(EMPTY_DRAFT);
  const [savedDraft, setSavedDraft] = useState<PortalWelcomeDraft>(EMPTY_DRAFT);
  const [detailText, setDetailText] = useState('');
  const [savedDetail, setSavedDetail] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  const [lens, setLens] = useState<PortalGuideCourseState>('active');
  const [section, setSection] = useState<'guide' | 'agreements'>('guide');
  const [mediaTab, setMediaTab] = useState<PortalWelcomeMediaItemKind>('image');

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    const result = await fetchPortalWelcomeEditor();
    setSlides(result.slides);
    setPublishedVersion(result.publishedVersion);
    setPublishedAt(result.publishedAt);
    setError(result.error);
    if (initial) setLoading(false);
    return result.slides;
  }, []);

  useEffect(() => {
    void load(true).then((loaded) => {
      const first = filterSlidesForCourse(loaded, 'active')[0];
      if (first && window.matchMedia('(min-width: 1024px)').matches) {
        setEditingId(first.id);
        const next = draftFromSlide(first);
        setDraft(next);
        setSavedDraft(next);
        setDetailText((first.detail ?? []).join('\n'));
        setSavedDetail((first.detail ?? []).join('\n'));
        setMediaTab(openingMediaTab(next.media_items));
      }
    });
  }, [load]);

  const visibleSlides = useMemo(() => filterSlidesForCourse(slides, lens), [slides, lens]);
  const visibleIds = useMemo(() => new Set(visibleSlides.map((slide) => slide.id)), [visibleSlides]);
  const otherSlides = useMemo(
    () => slides.filter((slide) => !visibleIds.has(slide.id)),
    [slides, visibleIds]
  );

  const previewSteps = useMemo(
    () => visibleSlides.map(slideToGuideStep),
    [visibleSlides]
  );

  const dirty =
    editingId !== null &&
    (!sameDraft({ ...draft, detail: detailFromText(detailText) }, { ...savedDraft, detail: detailFromText(savedDetail) }) ||
      detailText !== savedDetail);

  const draftStep = useMemo(() => {
    const fake: PortalWelcomeSlide = {
      id: editingId && editingId !== 'new' ? editingId : 'draft',
      sort_order: 0,
      created_at: '',
      updated_at: '',
      updated_by: null,
      media_kind: 'none',
      media_url: null,
      media_alt: null,
      ...draft,
      detail: detailFromText(detailText),
    };
    return slideToGuideStep(fake);
  }, [draft, detailText, editingId]);

  const draftIndex = editingId && editingId !== 'new' ? visibleSlides.findIndex((slide) => slide.id === editingId) : -1;

  const confirmDiscard = () => {
    if (!dirty) return true;
    return window.confirm('Hay cambios sin guardar. ¿Descartarlos?');
  };

  const openEditor = (slide: PortalWelcomeSlide | null) => {
    if (!confirmDiscard()) return;
    if (!slide) {
      setEditingId('new');
      setDraft(EMPTY_DRAFT);
      setSavedDraft(EMPTY_DRAFT);
      setDetailText('');
      setSavedDetail('');
      setMediaTab('image');
      return;
    }
    const next = draftFromSlide(slide);
    setEditingId(slide.id);
    setDraft(next);
    setSavedDraft(next);
    const lines = (slide.detail ?? []).join('\n');
    setDetailText(lines);
    setSavedDetail(lines);
    setMediaTab(openingMediaTab(next.media_items));
    setError(null);
  };

  const persist = async () => {
    if (!user?.id || !editingId) return;
    const nextDraft = { ...draft, detail: detailFromText(detailText) };
    const validation = validatePortalWelcomeDraft(nextDraft);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError(null);
    const sortOrder =
      editingId !== 'new'
        ? slides.find((slide) => slide.id === editingId)?.sort_order ?? (slides.length + 1) * 10
        : (slides.reduce((max, slide) => Math.max(max, slide.sort_order), 0) || 0) + 10;
    const result = await savePortalWelcomeSlide(editingId === 'new' ? null : editingId, nextDraft, sortOrder, user.id);
    setSaving(false);
    if (result.error || !result.slide) {
      setError(result.error ?? 'No se pudo guardar la pantalla');
      return;
    }
    setNotice('Pantalla guardada. Quien aún no cierre esta versión la verá así.');
    const next = draftFromSlide(result.slide);
    setEditingId(result.slide.id);
    setDraft(next);
    setSavedDraft(next);
    const lines = (result.slide.detail ?? []).join('\n');
    setDetailText(lines);
    setSavedDetail(lines);
    await load();
  };

  const move = async (slideId: string, direction: -1 | 1) => {
    const ordered = orderedIdsAfterMove(slides, slideId, direction, lens);
    if (!ordered) return;
    setError(null);
    const result = await reorderPortalWelcomeSlides(ordered);
    if (result.error) setError(result.error);
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm('¿Eliminar esta pantalla de la guía?')) return;
    setError(null);
    const result = await deletePortalWelcomeSlide(id);
    if (result.error) setError(result.error);
    if (editingId === id) {
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      setSavedDraft(EMPTY_DRAFT);
      setDetailText('');
      setSavedDetail('');
    }
    await load();
  };

  const toggle = async (slide: PortalWelcomeSlide) => {
    const result = await setPortalWelcomeSlideEnabled(slide.id, !slide.enabled);
    if (result.error) setError(result.error);
    if (editingId === slide.id) {
      const enabled = !slide.enabled;
      setDraft((current) => ({ ...current, enabled }));
      setSavedDraft((current) => ({ ...current, enabled }));
    }
    await load();
  };

  const updateMedia = (id: string, patch: Partial<PortalWelcomeMediaItem>) => {
    setDraft((current) => ({
      ...current,
      media_items: current.media_items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const addMedia = (kind: PortalWelcomeMediaItemKind) => {
    setDraft((current) => {
      if (current.media_items.length >= MAX_SLIDE_MEDIA) return current;
      return {
        ...current,
        media_items: [...current.media_items, { id: crypto.randomUUID(), kind, url: '', label: '' }],
      };
    });
  };

  const moveMedia = (id: string, direction: -1 | 1) => {
    setDraft((current) => ({
      ...current,
      media_items: moveMediaWithinKind(current.media_items, id, direction),
    }));
  };

  const removeMedia = (id: string) => {
    setDraft((current) => ({
      ...current,
      media_items: current.media_items.filter((item) => item.id !== id),
    }));
  };

  const onImage = async (id: string, file: File | undefined) => {
    if (!file || !user?.id) return;
    setSaving(true);
    setError(null);
    const uploaded = await uploadTeachingFile(user.id, 'image', file);
    setSaving(false);
    if (uploaded.error || !uploaded.url) {
      setError(uploaded.error ?? 'No se pudo subir la imagen');
      return;
    }
    updateMedia(id, { url: uploaded.url, kind: 'image' });
  };

  const closeEditor = () => {
    if (!confirmDiscard()) return;
    setEditingId(null);
  };

  useEffect(() => {
    if (isDesktop || !editingId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeEditor();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDesktop, editingId, dirty]);

  const publish = async () => {
    setPublishing(true);
    setError(null);
    const result = await publishPortalWelcome();
    setPublishing(false);
    setConfirmPublish(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNotice(
      result.version
        ? `Guía publicada. Versión ${result.version}. Quienes ya la habían cerrado la verán de nuevo.`
        : 'Guía publicada.'
    );
    await load();
  };

  const renderCard = (slide: PortalWelcomeSlide, index: number | null) => {
    const selected = editingId === slide.id;
    const position = index === null ? -1 : index;
    return (
        <li key={slide.id} className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => openEditor(slide)}
          className={`min-w-0 flex-1 rounded-2xl border p-3 text-left transition ${
            selected
              ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
          } ${slide.enabled ? '' : 'opacity-60'}`}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {index === null ? '·' : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                {slide.kicker || 'Guía'} · {AUDIENCE_LABEL[slide.audience]}
                {!slide.enabled ? ' · oculta' : ''}
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">{slide.title}</p>
              {slide.body && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{slide.body}</p>
              )}
              <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                {(slide.detail?.length ?? 0) > 0 && <span>{slide.detail.length} viñetas</span>}
                {slideMediaItems(slide).filter((item) => item.kind === 'image').length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {slideMediaItems(slide).filter((item) => item.kind === 'image').length}
                  </span>
                )}
                {slideMediaItems(slide).filter((item) => item.kind === 'video').length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    {slideMediaItems(slide).filter((item) => item.kind === 'video').length}
                  </span>
                )}
                {slideMediaItems(slide).filter((item) => item.kind === 'link').length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    {slideMediaItems(slide).filter((item) => item.kind === 'link').length}
                  </span>
                )}
              </p>
            </div>
          </div>
        </button>
        {index !== null && (
          <div className="flex flex-col justify-center gap-1">
            <button
              type="button"
              aria-label="Subir"
              disabled={position === 0}
              onClick={() => void move(slide.id, -1)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Bajar"
              disabled={position === visibleSlides.length - 1}
              onClick={() => void move(slide.id, 1)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <AdminLayout
      fullBleed
      title="Inducción"
      subtitle={
        section === 'agreements'
          ? 'Texto que el alumno lee y firma antes de entrar al diplomado.'
          : 'La guía que ve el alumno la primera vez. Cada pantalla puede llevar varias fotos, videos o enlaces.'
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 sm:max-w-md" role="group" aria-label="Sección">
          <button
            type="button"
            aria-pressed={section === 'guide'}
            onClick={() => setSection('guide')}
            className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${
              section === 'guide'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Guía
          </button>
          <button
            type="button"
            aria-pressed={section === 'agreements'}
            onClick={() => setSection('agreements')}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold ${
              section === 'agreements'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            Acuerdos
          </button>
        </div>
        {section === 'agreements' ? (
          <>
            <AgreementRoster />
            <AgreementEditor />
          </>
        ) : null}
        {section === 'guide' ? (
        <>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Versión publicada: <strong>{publishedVersion}</strong>
            {publishedAt ? ` · ${new Date(publishedAt).toLocaleString('es-MX')}` : ''}
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              Guardar actualiza esta versión. Publicar de nuevo se la muestra otra vez a quien ya la cerró.
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (visibleSlides.length === 0) {
                  setError('Este alumno no vería pantallas. Activa al menos una o cambia el tipo de inscripción.');
                  return;
                }
                setError(null);
                setPreviewStep(0);
                setPreviewOpen(true);
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
            >
              <Eye className="h-4 w-4" />
              Previsualizar
            </button>
            <button
              type="button"
              onClick={() => openEditor(null)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              <Plus className="h-4 w-4" />
              Nueva pantalla
            </button>
            <button
              type="button"
              onClick={() => setConfirmPublish(true)}
              className="col-span-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white sm:col-span-1"
            >
              <Sparkles className="h-4 w-4" />
              Publicar de nuevo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Tipo de alumno">
          {LENS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={lens === option.id}
              onClick={() => {
                setLens(option.id);
                setPreviewStep(0);
              }}
              className={`min-h-[40px] rounded-xl px-2 text-sm font-semibold ${
                lens === option.id
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="block leading-tight">{option.short}</span>
              <span className="block text-[11px] font-medium opacity-70">
                {filterSlidesForCourse(slides, option.id).length} pantallas
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}

        {confirmPublish && (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="text-sm text-amber-950 dark:text-amber-100">
              Publicar sube la versión. Los alumnos que ya cerraron la guía la volverán a ver al entrar.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void publish()}
                disabled={publishing}
                className="min-h-[44px] rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {publishing ? 'Publicando…' : 'Publicar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmPublish(false)}
                className="min-h-[44px] rounded-xl border border-amber-300 px-4 text-sm font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Cargando pantallas…</p>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
            <div className="space-y-5">
              {visibleSlides.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Este alumno no vería pantallas. Muestra alguna o crea una para todos.
                </p>
              ) : (
                <section>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Secuencia · {visibleSlides.length} pantallas
                  </h2>
                  <ol className="space-y-2">{visibleSlides.map((slide, index) => renderCard(slide, index))}</ol>
                </section>
              )}

              {otherSlides.length > 0 && (
                <section>
                  <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    No las ve este alumno
                  </h2>
                  <p className="mb-2 text-xs text-slate-500">
                    Cambian según la inscripción, o están ocultas. Elige otro tipo arriba para verlas en la secuencia.
                  </p>
                  <ul className="space-y-2">{otherSlides.map((slide) => renderCard(slide, null))}</ul>
                </section>
              )}
            </div>

            <aside
              className={
                isDesktop
                  ? 'space-y-4 lg:sticky lg:top-24'
                  : editingId
                    ? 'fixed inset-0 z-[100] flex flex-col bg-white dark:bg-slate-950'
                    : 'hidden'
              }
              role={isDesktop || !editingId ? undefined : 'dialog'}
              aria-modal={isDesktop || !editingId ? undefined : true}
              aria-label={editingId === 'new' ? 'Nueva pantalla' : 'Editar pantalla'}
            >
              {!isDesktop && editingId && (
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-slate-800">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingId === 'new' ? 'Nueva pantalla' : 'Editar pantalla'}
                  </h2>
                  <button
                    type="button"
                    onClick={closeEditor}
                    aria-label="Cerrar editor"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
              {editingId ? (
                <div className={isDesktop ? 'space-y-4' : 'min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4'}>
                  <SlidePreview
                    step={draftStep}
                    index={draftIndex >= 0 ? draftIndex : null}
                    total={Math.max(visibleSlides.length, 1)}
                  />
                  <form
                    id="portal-slide-editor"
                    className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void persist();
                    }}
                  >
                    {isDesktop && (
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-bold text-slate-900 dark:text-white">
                          {editingId === 'new' ? 'Nueva pantalla' : 'Editar pantalla'}
                        </h2>
                        {editingId !== 'new' && (
                          <button
                            type="button"
                            onClick={() => void remove(editingId)}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        )}
                      </div>
                    )}
                    <label className="block text-sm">
                      Etiqueta
                      <input
                        value={draft.kicker}
                        onChange={(event) => setDraft({ ...draft, kicker: event.target.value })}
                        className={fieldClass}
                        maxLength={60}
                      />
                    </label>
                    <label className="block text-sm">
                      Título
                      <input
                        value={draft.title}
                        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                        className={fieldClass}
                        maxLength={140}
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      Texto
                      <textarea
                        value={draft.body}
                        onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                        className={`${fieldClass} min-h-24`}
                        maxLength={2000}
                      />
                    </label>
                    <label className="block text-sm">
                      Viñetas, una por línea
                      <textarea
                        value={detailText}
                        onChange={(event) => setDetailText(event.target.value)}
                        className={`${fieldClass} min-h-20`}
                      />
                    </label>
                    <label className="block text-sm">
                      Quién la ve
                      <select
                        value={draft.audience}
                        onChange={(event) =>
                          setDraft({ ...draft, audience: event.target.value as PortalWelcomeAudience })
                        }
                        className={fieldClass}
                      >
                        {Object.entries(AUDIENCE_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <fieldset className="space-y-3">
                      <legend className="text-sm font-semibold">Fotos, videos y enlaces</legend>
                      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800" role="tablist" aria-label="Tipo de medio">
                        {(Object.keys(MEDIA_TAB_COPY) as PortalWelcomeMediaItemKind[]).map((kind) => {
                          const count = draft.media_items.filter((item) => item.kind === kind).length;
                          const selected = mediaTab === kind;
                          return (
                            <button
                              key={kind}
                              type="button"
                              role="tab"
                              aria-selected={selected}
                              onClick={() => setMediaTab(kind)}
                              className={`min-h-[36px] rounded-lg text-xs font-semibold ${
                                selected
                                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                                  : 'text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {MEDIA_TAB_COPY[kind].label}
                              {count > 0 ? ` ${count}` : ''}
                            </button>
                          );
                        })}
                      </div>
                      {draft.media_items.filter((item) => item.kind === mediaTab).length === 0 && (
                        <p className="text-xs text-slate-500">{MEDIA_TAB_COPY[mediaTab].empty}</p>
                      )}
                      {draft.media_items
                        .filter((item) => item.kind === mediaTab)
                        .map((item, offset, list) => (
                          <div key={item.id} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {list.length > 1 ? `${MEDIA_TAB_COPY[mediaTab].label} ${offset + 1}` : MEDIA_TAB_COPY[mediaTab].label}
                              </span>
                              <button type="button" aria-label={`Quitar ${MEDIA_TAB_COPY[mediaTab].label.toLowerCase()} ${offset + 1}`} onClick={() => removeMedia(item.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-rose-700">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            {list.length > 1 && (
                              <div className="flex gap-2">
                                <button type="button" disabled={offset === 0} onClick={() => moveMedia(item.id, -1)} className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-30 dark:border-slate-700">
                                  <ChevronUp className="h-3.5 w-3.5" /> Subir
                                </button>
                                <button type="button" disabled={offset === list.length - 1} onClick={() => moveMedia(item.id, 1)} className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-30 dark:border-slate-700">
                                  <ChevronDown className="h-3.5 w-3.5" /> Bajar
                                </button>
                              </div>
                            )}
                            {mediaTab === 'image' && (
                              <>
                                <MediaThumb url={item.url} alt={item.label} />
                                <label className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold normal-case tracking-normal text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                                  {saving ? 'Subiendo…' : 'Subir JPG, PNG o WebP'}
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="sr-only"
                                    onChange={(event) => void onImage(item.id, event.target.files?.[0])}
                                  />
                                </label>
                              </>
                            )}
                            <label className="block text-sm">
                              {mediaTab === 'video' ? 'Enlace de YouTube, Vimeo, Drive o Loom' : MEDIA_TAB_COPY[mediaTab].url}
                              <input
                                value={item.url}
                                onChange={(event) => updateMedia(item.id, { url: event.target.value })}
                                className={fieldClass}
                                placeholder="https://"
                              />
                            </label>
                            <label className="block text-sm">
                              {MEDIA_TAB_COPY[mediaTab].text}
                              <input
                                value={item.label}
                                onChange={(event) => updateMedia(item.id, { label: event.target.value })}
                                className={fieldClass}
                                maxLength={180}
                              />
                            </label>
                          </div>
                        ))}
                      <button
                        type="button"
                        disabled={draft.media_items.length >= MAX_SLIDE_MEDIA}
                        onClick={() => addMedia(mediaTab)}
                        className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <Plus className="h-4 w-4" />
                        {MEDIA_TAB_COPY[mediaTab].add}
                      </button>
                    </fieldset>
                    {isDesktop && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={saving || !dirty}
                          className="min-h-[44px] flex-1 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {saving ? 'Guardando…' : 'Guardar'}
                        </button>
                        {editingId !== 'new' && (
                          <button
                            type="button"
                            onClick={() => {
                              const slide = slides.find((item) => item.id === editingId);
                              if (slide) void toggle(slide);
                            }}
                            className="min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-semibold dark:border-slate-700"
                          >
                            {draft.enabled ? 'Ocultar' : 'Mostrar'}
                          </button>
                        )}
                      </div>
                    )}
                  </form>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
                  Elige una pantalla de la secuencia para verla y editarla.
                </p>
              )}
              {!isDesktop && editingId && (
                <div className="space-y-2 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950">
                  <button
                    type="submit"
                    form="portal-slide-editor"
                    disabled={saving || !dirty}
                    className="min-h-[48px] w-full rounded-xl bg-blue-600 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  {editingId !== 'new' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const slide = slides.find((item) => item.id === editingId);
                          if (slide) void toggle(slide);
                        }}
                        className="min-h-[44px] rounded-xl border border-slate-200 text-sm font-semibold dark:border-slate-700"
                      >
                        {draft.enabled ? 'Ocultar' : 'Mostrar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(editingId)}
                        className="min-h-[44px] rounded-xl text-sm font-semibold text-rose-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>
        )}
        </>
        ) : null}
      </div>

      <StudentPortalGuide
        open={previewOpen}
        courseState={lens}
        finalActionLabel="Cerrar vista previa"
        onBack={() => setPreviewStep((step) => Math.max(0, step - 1))}
        onNext={() => setPreviewStep((step) => step + 1)}
        onSkip={() => setPreviewOpen(false)}
        onFinish={() => setPreviewOpen(false)}
        stepIndex={previewStep}
        saving={false}
        saveError={null}
        steps={previewSteps}
        headerExtra={
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Ver como</span>
            {LENS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setLens(option.id);
                  setPreviewStep(0);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  lens === option.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />
    </AdminLayout>
  );
}
