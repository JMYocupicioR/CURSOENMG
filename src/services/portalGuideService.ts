import { supabase } from '../lib/supabase';
import type {
  PortalWelcomeAudience,
  PortalWelcomeMediaItem,
  PortalWelcomeMediaItemKind,
  PortalWelcomeMediaKind,
  PortalWelcomeSlide,
  Profile,
} from '../types/database';
import { getVideoEmbedSrc, isAllowedImageUrl, parseVideoUrl } from '../utils/mediaValidation';
import type { PortalGuideCourseState, PortalGuideMedia, PortalGuideStep } from '../components/student/portalGuideSteps';

const db = supabase as any;

export const PORTAL_GUIDE_VERSION = 1;

export type { PortalWelcomeAudience, PortalWelcomeMediaItem, PortalWelcomeMediaKind, PortalWelcomeSlide };

export const MAX_SLIDE_MEDIA = 30;

export interface PortalWelcomeDraft {
  kicker: string;
  title: string;
  body: string;
  detail: string[];
  audience: PortalWelcomeAudience;
  enabled: boolean;
  media_items: PortalWelcomeMediaItem[];
}

const AUDIENCES: PortalWelcomeAudience[] = ['all', 'enrolled', 'waitlist', 'no_course'];

export function shouldShowPortalGuide(
  profile: Profile | null | undefined,
  publishedVersion: number = PORTAL_GUIDE_VERSION
): boolean {
  const version = profile?.portal_guide_version ?? 0;
  return version < publishedVersion;
}

export async function markPortalGuideSeen(
  version: number = PORTAL_GUIDE_VERSION
): Promise<{ error: string | null }> {
  try {
    const { error } = await db.rpc('mark_portal_guide_seen', {
      p_version: version,
    });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar la guía del portal';
    return { error: message };
  }
}

export function audienceForCourseState(state: PortalGuideCourseState): Exclude<PortalWelcomeAudience, 'all'> {
  if (state === 'active') return 'enrolled';
  if (state === 'pending') return 'waitlist';
  return 'no_course';
}

export function filterSlidesForCourse(
  slides: PortalWelcomeSlide[],
  state: PortalGuideCourseState
): PortalWelcomeSlide[] {
  const audience = audienceForCourseState(state);
  return slides
    .filter((slide) => slide.enabled && (slide.audience === 'all' || slide.audience === audience))
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'es'));
}

const MEDIA_KINDS: PortalWelcomeMediaItemKind[] = ['image', 'video', 'link'];

function separatePortalMedia(items: PortalWelcomeMediaItem[]): PortalWelcomeMediaItem[] {
  return items.map((item) => {
    const url = item.url.trim();
    if (!url) return item;
    const video = Boolean(parseVideoUrl(url));
    const image = isAllowedImageUrl(url) && !/\.svg(?:$|\?)/i.test(url);
    if (item.kind === 'video' && image && !video) return { ...item, kind: 'image' };
    if (item.kind === 'image' && video && !image) return { ...item, kind: 'video' };
    return item;
  });
}

export function moveMediaWithinKind(
  items: PortalWelcomeMediaItem[],
  id: string,
  direction: -1 | 1
): PortalWelcomeMediaItem[] {
  const currentIndex = items.findIndex((item) => item.id === id);
  if (currentIndex < 0) return items;
  const kind = items[currentIndex].kind;
  const siblings = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.kind === kind);
  const position = siblings.findIndex(({ item }) => item.id === id);
  const neighbor = siblings[position + direction];
  if (!neighbor) return items;
  const next = items.slice();
  next[currentIndex] = items[neighbor.index];
  next[neighbor.index] = items[currentIndex];
  return next;
}

export function slideMediaItems(
  slide: Pick<PortalWelcomeSlide, 'id' | 'title' | 'media_items' | 'media_kind' | 'media_url' | 'media_alt'>
): PortalWelcomeMediaItem[] {
  if (Array.isArray(slide.media_items) && slide.media_items.length > 0) {
    return separatePortalMedia(
      slide.media_items.filter(
        (item) => item && MEDIA_KINDS.includes(item.kind) && typeof item.url === 'string'
      )
    );
  }
  const url = slide.media_url?.trim() ?? '';
  if ((slide.media_kind === 'image' || slide.media_kind === 'video') && url) {
    return separatePortalMedia([
      {
        id: `${slide.id}-media`,
        kind: slide.media_kind,
        url,
        label: slide.media_alt?.trim() ?? '',
      },
    ]);
  }
  return [];
}

export function resolveMediaItem(
  item: PortalWelcomeMediaItem,
  fallbackAlt: string
): PortalGuideMedia | null {
  const url = item.url.trim();
  if (!url.startsWith('https://') || url.length > 2000) return null;
  if (item.kind === 'image') {
    if (!isAllowedImageUrl(url) || /\.svg(?:$|\?)/i.test(url)) return null;
    return { kind: 'image', src: url, alt: item.label.trim() || fallbackAlt };
  }
  if (item.kind === 'video') {
    const parsed = parseVideoUrl(url);
    if (!parsed) return null;
    return { kind: 'video', src: getVideoEmbedSrc(parsed), alt: item.label.trim() || fallbackAlt };
  }
  return { kind: 'link', href: url, label: item.label.trim() || url };
}

export function resolveSlideMedia(
  slide: Pick<PortalWelcomeSlide, 'id' | 'title' | 'media_items' | 'media_kind' | 'media_url' | 'media_alt'>
): PortalGuideMedia | null {
  const [first] = slideMediaItems(slide);
  return first ? resolveMediaItem(first, slide.title) : null;
}

export function resolveSlideMediaList(
  slide: Pick<PortalWelcomeSlide, 'id' | 'title' | 'media_items' | 'media_kind' | 'media_url' | 'media_alt'>
): PortalGuideMedia[] {
  return slideMediaItems(slide)
    .map((item) => resolveMediaItem(item, slide.title))
    .filter((item): item is PortalGuideMedia => item !== null);
}

export function slideToGuideStep(slide: PortalWelcomeSlide): PortalGuideStep {
  return {
    id: slide.id,
    kicker: slide.kicker || 'Guía',
    title: slide.title,
    body: slide.body,
    detail: slide.detail?.filter((item) => item.trim()) ?? [],
    media: resolveSlideMediaList(slide),
  };
}

export function validatePortalWelcomeDraft(draft: PortalWelcomeDraft): string | null {
  const title = draft.title.trim();
  const body = draft.body.trim();
  const kicker = draft.kicker.trim();
  if (!title) return 'El título es obligatorio.';
  if (title.length > 140) return 'El título admite hasta 140 caracteres.';
  if (kicker.length > 60) return 'La etiqueta admite hasta 60 caracteres.';
  if (body.length > 2000) return 'El texto admite hasta 2000 caracteres.';
  if (!AUDIENCES.includes(draft.audience)) return 'Elige a quién se muestra esta pantalla.';
  if (draft.detail.length > 8) return 'Cada pantalla admite hasta 8 viñetas.';
  if (draft.detail.some((item) => item.trim().length > 240)) {
    return 'Cada viñeta admite hasta 240 caracteres.';
  }
  if (draft.media_items.length > MAX_SLIDE_MEDIA) {
    return `Cada pantalla admite hasta ${MAX_SLIDE_MEDIA} fotos, videos o enlaces.`;
  }
  for (const item of draft.media_items) {
    const url = item.url.trim();
    const label = item.label.trim();
    if (!MEDIA_KINDS.includes(item.kind)) return 'Elige si el medio es imagen, video o enlace.';
    if (!url) return 'Completa el enlace de cada medio o quítalo.';
    if (!url.startsWith('https://') || url.length > 2000) return 'Cada enlace debe empezar con https://.';
    if (label.length > 180) return 'El texto de cada medio admite hasta 180 caracteres.';
    if (item.kind === 'image') {
      if (/\.svg(?:$|\?)/i.test(url) || !isAllowedImageUrl(url)) {
        return 'Usa una imagen JPG, PNG o WebP, o súbela desde este formulario.';
      }
      if (!label) return 'Cada imagen necesita un texto alternativo.';
    }
    if (item.kind === 'video' && !parseVideoUrl(url)) {
      return 'El video debe ser un enlace de YouTube, Vimeo, Google Drive, Loom o Dailymotion.';
    }
  }
  return null;
}

export function detailFromText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function mapSlide(row: PortalWelcomeSlide): PortalWelcomeSlide {
  const slide = {
    ...row,
    detail: Array.isArray(row.detail) ? row.detail : [],
    media_url: row.media_url ?? null,
    media_alt: row.media_alt ?? null,
    media_items: Array.isArray(row.media_items) ? row.media_items : [],
  };
  return { ...slide, media_items: slideMediaItems(slide) };
}

export async function fetchPublishedPortalWelcome(): Promise<{
  publishedVersion: number;
  slides: PortalWelcomeSlide[];
} | null> {
  try {
    const [settingsResult, slidesResult] = await Promise.all([
      db.from('portal_welcome_settings').select('published_version').eq('id', 1).maybeSingle(),
      db
        .from('portal_welcome_slides')
        .select('*')
        .eq('enabled', true)
        .order('sort_order', { ascending: true }),
    ]);
    if (settingsResult.error || slidesResult.error) return null;
    const publishedVersion = settingsResult.data?.published_version;
    if (!publishedVersion || !slidesResult.data?.length) return null;
    return {
      publishedVersion,
      slides: slidesResult.data.map(mapSlide),
    };
  } catch {
    return null;
  }
}

export async function fetchPortalWelcomeEditor(): Promise<{
  publishedVersion: number;
  publishedAt: string | null;
  slides: PortalWelcomeSlide[];
  error: string | null;
}> {
  try {
    const [settingsResult, slidesResult] = await Promise.all([
      db.from('portal_welcome_settings').select('published_version, published_at').eq('id', 1).maybeSingle(),
      db.from('portal_welcome_slides').select('*').order('sort_order', { ascending: true }),
    ]);
    const error = settingsResult.error?.message || slidesResult.error?.message || null;
    return {
      publishedVersion: settingsResult.data?.published_version ?? PORTAL_GUIDE_VERSION,
      publishedAt: settingsResult.data?.published_at ?? null,
      slides: (slidesResult.data ?? []).map(mapSlide),
      error,
    };
  } catch (err: unknown) {
    return {
      publishedVersion: PORTAL_GUIDE_VERSION,
      publishedAt: null,
      slides: [],
      error: err instanceof Error ? err.message : 'No se pudo cargar la guía',
    };
  }
}

export async function savePortalWelcomeSlide(
  id: string | null,
  draft: PortalWelcomeDraft,
  sortOrder: number,
  userId: string
): Promise<{ slide: PortalWelcomeSlide | null; error: string | null }> {
  const validation = validatePortalWelcomeDraft(draft);
  if (validation) return { slide: null, error: validation };

  const mediaItems = draft.media_items.map((item) => ({
    id: item.id,
    kind: item.kind,
    url: item.url.trim(),
    label: item.label.trim(),
  }));
  const firstVisual = mediaItems.find((item) => item.kind === 'image' || item.kind === 'video');
  const payload = {
    sort_order: sortOrder,
    enabled: draft.enabled,
    audience: draft.audience,
    kicker: draft.kicker.trim(),
    title: draft.title.trim(),
    body: draft.body.trim(),
    detail: draft.detail.map((item) => item.trim()).filter(Boolean),
    media_items: mediaItems,
    media_kind: firstVisual?.kind ?? 'none',
    media_url: firstVisual?.url ?? null,
    media_alt: firstVisual?.kind === 'image' ? firstVisual.label || null : null,
    updated_by: userId,
  };

  try {
    const query = id
      ? db.from('portal_welcome_slides').update(payload).eq('id', id).select('*').single()
      : db.from('portal_welcome_slides').insert(payload).select('*').single();
    const { data, error } = await query;
    if (error || !data) return { slide: null, error: error?.message ?? 'No se pudo guardar la pantalla' };
    return { slide: mapSlide(data), error: null };
  } catch (err: unknown) {
    return { slide: null, error: err instanceof Error ? err.message : 'No se pudo guardar la pantalla' };
  }
}

export async function setPortalWelcomeSlideEnabled(
  id: string,
  enabled: boolean
): Promise<{ error: string | null }> {
  const { error } = await db.from('portal_welcome_slides').update({ enabled }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deletePortalWelcomeSlide(id: string): Promise<{ error: string | null }> {
  const { error } = await db.from('portal_welcome_slides').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function reorderPortalWelcomeSlides(
  orderedIds: string[]
): Promise<{ error: string | null }> {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      db.from('portal_welcome_slides').update({ sort_order: (index + 1) * 10 }).eq('id', id)
    )
  );
  const failed = results.find((result) => result.error);
  return { error: failed?.error?.message ?? null };
}

export async function publishPortalWelcome(): Promise<{ version: number | null; error: string | null }> {
  try {
    const { data, error } = await db.rpc('publish_portal_welcome');
    if (error) return { version: null, error: error.message };
    return { version: typeof data === 'number' ? data : null, error: null };
  } catch (err: unknown) {
    return { version: null, error: err instanceof Error ? err.message : 'No se pudo publicar la guía' };
  }
}
