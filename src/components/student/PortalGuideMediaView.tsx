import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import type { PortalGuideMedia } from './portalGuideSteps';

function ImageCarousel({
  images,
  compact,
}: {
  images: { src: string; alt: string }[];
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const signature = images.map((image) => image.src).join('\n');

  useEffect(() => {
    setIndex(0);
    setFailed({});
  }, [signature]);

  if (images.length === 0) return null;
  const current = images[Math.min(index, images.length - 1)];
  const many = images.length > 1;

  return (
    <div role="region" aria-roledescription="carrusel" aria-label="Fotos">
      {failed[current.src] ? (
        <div className="flex h-32 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-800">
          <ImageOff className="h-4 w-4" />
          <span>Imagen no disponible</span>
        </div>
      ) : (
        <img
          src={current.src}
          alt={current.alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed((prev) => ({ ...prev, [current.src]: true }))}
          className={`w-full rounded-xl border border-slate-200 object-contain bg-slate-100 dark:border-slate-800 dark:bg-slate-800 ${
            compact ? 'h-36' : 'h-52 sm:h-56'
          }`}
        />
      )}
      {many && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Foto anterior"
            disabled={index === 0}
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 disabled:opacity-30 dark:border-slate-700 dark:text-slate-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400" aria-live="polite">
            {index + 1} de {images.length}
          </span>
          <button
            type="button"
            aria-label="Foto siguiente"
            disabled={index >= images.length - 1}
            onClick={() => setIndex((value) => Math.min(images.length - 1, value + 1))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 disabled:opacity-30 dark:border-slate-700 dark:text-slate-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function PortalGuideMediaView({
  media,
  title,
  compact,
}: {
  media: PortalGuideMedia[];
  title: string;
  compact?: boolean;
}) {
  const images = media.filter((item) => item.kind === 'image');
  const videos = media.filter((item) => item.kind === 'video');
  const links = media.filter((item) => item.kind === 'link');
  if (images.length + videos.length + links.length === 0) return null;

  return (
    <div className={compact ? 'mt-3 space-y-3' : 'mb-4 space-y-4'}>
      <ImageCarousel images={images} compact={compact} />
      {videos.map((item, mediaIndex) => (
        <div
          key={`${item.src}-${mediaIndex}`}
          className="relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
          style={{ paddingBottom: '56.25%' }}
        >
          <iframe
            src={item.src}
            title={item.alt || title}
            loading="lazy"
            className="absolute inset-0 h-full w-full"
            allow="encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      ))}
      {links.map((item, mediaIndex) => (
        <a
          key={`${item.href}-${mediaIndex}`}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[44px] items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-700 underline-offset-2 hover:underline dark:border-slate-700 dark:text-blue-300"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
