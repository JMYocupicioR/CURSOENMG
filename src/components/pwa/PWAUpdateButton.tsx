import { Sparkles, RefreshCw } from 'lucide-react';
import { usePWAUpdateStore } from '../../stores/pwaUpdateStore';

export function PWAUpdateButton() {
  const { needRefresh, isUpdating, updateApp } = usePWAUpdateStore();

  if (!needRefresh) return null;

  return (
    <button
      type="button"
      onClick={() => void updateApp()}
      disabled={isUpdating}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-500/25 border border-emerald-400/40 animate-pulse transition-all cursor-pointer disabled:opacity-75 disabled:cursor-wait"
      title="Nueva versión disponible. Clic para actualizar a la última versión web."
      aria-label="Actualizar a la nueva versión de la aplicación"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">Actualizar versión</span>
      <span className="sm:hidden">Actualizar</span>
      <Sparkles className="w-3 h-3 text-amber-200 hidden md:inline" />
    </button>
  );
}
