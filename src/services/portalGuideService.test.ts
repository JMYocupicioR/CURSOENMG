import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  shouldShowPortalGuide,
  markPortalGuideSeen,
  PORTAL_GUIDE_VERSION,
  filterSlidesForCourse,
  moveMediaWithinKind,
  resolveSlideMedia,
  slideMediaItems,
  slideToGuideStep,
  validatePortalWelcomeDraft,
  detailFromText,
} from './portalGuideService';
import { supabase } from '../lib/supabase';
import type { PortalWelcomeSlide, Profile } from '../types/database';

describe('portalGuideService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('shouldShowPortalGuide', () => {
    it('returns true when profile is null or undefined', () => {
      expect(shouldShowPortalGuide(null)).toBe(true);
      expect(shouldShowPortalGuide(undefined)).toBe(true);
    });

    it('returns true when portal_guide_version is 0 or missing', () => {
      expect(shouldShowPortalGuide({} as Profile)).toBe(true);
      expect(shouldShowPortalGuide({ portal_guide_version: 0 } as Profile)).toBe(true);
    });

    it('returns false when portal_guide_version >= PORTAL_GUIDE_VERSION', () => {
      expect(shouldShowPortalGuide({ portal_guide_version: PORTAL_GUIDE_VERSION } as Profile)).toBe(false);
      expect(shouldShowPortalGuide({ portal_guide_version: 2 } as Profile)).toBe(false);
    });
  });

  describe('markPortalGuideSeen', () => {
    it('calls RPC mark_portal_guide_seen with current version', async () => {
      const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: { id: 'test-user', portal_guide_version: 1 } as any,
        error: null,
      } as any);

      const result = await markPortalGuideSeen();
      expect(rpcSpy).toHaveBeenCalledWith('mark_portal_guide_seen', {
        p_version: 1,
      });
      expect(result).toEqual({ error: null });
    });

    it('returns error message if RPC fails', async () => {
      vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: null,
        error: { message: 'Database error connecting' } as any,
      } as any);

      const result = await markPortalGuideSeen();
      expect(result.error).toBe('Database error connecting');
    });

    it('handles thrown exceptions gracefully', async () => {
      vi.spyOn(supabase, 'rpc').mockRejectedValue(new Error('Network failure'));

      const result = await markPortalGuideSeen();
      expect(result.error).toBe('Network failure');
    });
  });

  describe('published slides', () => {
    const slide = (overrides: Partial<PortalWelcomeSlide>): PortalWelcomeSlide => ({
      id: overrides.id ?? '1',
      sort_order: overrides.sort_order ?? 10,
      enabled: overrides.enabled ?? true,
      audience: overrides.audience ?? 'all',
      kicker: 'Guía',
      title: overrides.title ?? 'Pantalla',
      body: 'Texto',
      detail: [],
      media_items: overrides.media_items ?? [],
      media_kind: overrides.media_kind ?? 'none',
      media_url: overrides.media_url ?? null,
      media_alt: overrides.media_alt ?? null,
      updated_by: null,
      created_at: '',
      updated_at: '',
    });

    it('keeps slides for everyone and the one that matches enrollment', () => {
      const slides = [
        slide({ id: 'a', title: 'Bienvenida', sort_order: 30 }),
        slide({ id: 'b', title: 'Inscrito', audience: 'enrolled', sort_order: 10 }),
        slide({ id: 'c', title: 'Espera', audience: 'waitlist', sort_order: 20 }),
        slide({ id: 'd', title: 'Oculta', enabled: false, sort_order: 5 }),
      ];
      expect(filterSlidesForCourse(slides, 'active').map((item) => item.id)).toEqual(['b', 'a']);
      expect(filterSlidesForCourse(slides, 'pending').map((item) => item.id)).toEqual(['c', 'a']);
      expect(filterSlidesForCourse(slides, 'none').map((item) => item.id)).toEqual(['a']);
    });

    it('turns a YouTube link into an embed and drops an unknown video', () => {
      expect(
        resolveSlideMedia(
          slide({ media_kind: 'video', media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Clase' })
        )
      ).toEqual({
        kind: 'video',
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        alt: 'Clase',
      });
      expect(resolveSlideMedia(slide({ media_kind: 'video', media_url: 'https://example.com/clip.mp4' }))).toBeNull();
    });

    it('puts a photo url back on the photo list when it was saved as a video', () => {
      const items = slideMediaItems(
        slide({
          media_items: [
            {
              id: 'photo',
              kind: 'video',
              url: 'https://pubodzfmqmawrfnmrce.supabase.co/storage/v1/object/public/course-images/portal.jpg',
              label: 'Portal Alumno',
            },
            {
              id: 'clip',
              kind: 'video',
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              label: 'Clase',
            },
          ],
        })
      );
      expect(items.map((item) => item.kind)).toEqual(['image', 'video']);
    });

    it('reorders photos without moving the video between them', () => {
      const items = [
        { id: 'i1', kind: 'image' as const, url: 'https://images.unsplash.com/a.jpg', label: 'A' },
        { id: 'v', kind: 'video' as const, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', label: 'V' },
        { id: 'i2', kind: 'image' as const, url: 'https://images.unsplash.com/b.jpg', label: 'B' },
      ];
      expect(moveMediaWithinKind(items, 'i2', -1).map((item) => item.id)).toEqual(['i2', 'v', 'i1']);
    });

    it('keeps every video link on the same slide', () => {
      const step = slideToGuideStep(
        slide({
          title: 'Videos',
          media_items: [
            { id: 'a', kind: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', label: 'Uno' },
            { id: 'b', kind: 'video', url: 'https://vimeo.com/123456789', label: 'Dos' },
          ],
        })
      );
      expect(step.media).toEqual([
        { kind: 'video', src: 'https://www.youtube.com/embed/dQw4w9WgXcQ', alt: 'Uno' },
        { kind: 'video', src: 'https://player.vimeo.com/video/123456789', alt: 'Dos' },
      ]);
    });

    it('rejects a video that is not an allowed host', () => {
      expect(
        validatePortalWelcomeDraft({
          kicker: '',
          title: 'Video',
          body: '',
          detail: detailFromText('una\n\ndos'),
          audience: 'all',
          enabled: true,
          media_items: [
            { id: 'v', kind: 'video', url: 'https://example.com/video', label: '' },
          ],
        })
      ).toMatch(/YouTube/);
    });
  });
});
