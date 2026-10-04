import { Sparkles, RefreshCw, X } from 'lucide-react';
import { usePWAUpdateStore } from '../../stores/pwaUpdateStore';

export function PWAUpdateBanner() {
  const { needRefresh, dismissed, isUpdating, updateApp, dismissUpdate } = usePWAUpdateStore();

  if (!needRefresh || dismissed) return null;

  return (
    <div
      role="alert"
      className="relative z-50 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-4 py-2.5 shadow-lg border-b border-emerald-500/30"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 shrink-0">
            <Sparkles className="w-4 h-4 text-amber-200" />
          </span>
          <p className="font-medium truncate">
            <strong className="font-bold">¡Nueva versión disponible!</strong> Se han publicado mejoras y actualizaciones en la plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void updateApp()}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-75 disabled:cursor-wait"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Actualizando...' : 'Actualizar ahora'}</span>
          </button>
          <button
            type="button"
            onClick={dismissUpdate}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Posponer actualización"
            title="Actualizar más tarde"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
