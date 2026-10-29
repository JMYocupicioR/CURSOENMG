import type { DragEvent, MouseEvent, ReactNode } from 'react';

type LockedProfilePhotoProps = {
  src?: string | null;
  fallback: ReactNode;
  className: string;
};

function blockSave(event: MouseEvent | DragEvent) {
  event.preventDefault();
}

export function LockedProfilePhoto({ src, fallback, className }: LockedProfilePhotoProps) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden select-none touch-manipulation [-webkit-touch-callout:none] [-webkit-user-drag:none] ${className}`}
      onContextMenu={blockSave}
      onDragStart={blockSave}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={48}
          height={48}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full max-h-full max-w-full object-cover select-none [-webkit-user-drag:none]"
        />
      ) : (
        fallback
      )}
      {src ? <span aria-hidden className="absolute inset-0 z-10" /> : null}
    </div>
  );
}
