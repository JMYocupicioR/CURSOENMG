import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, Plus, Download, CheckCircle, ShieldCheck, Zap } from 'lucide-react';
import { usePWAInstallStore } from '../../stores/pwaInstallStore';
import { BRAND } from '../../config/brand';

export default function PWAInstallModal() {
  const {
    isInstallModalOpen,
    closeInstallModal,
    isStandalone,
    isIOS,
    canInstall,
    triggerInstall,
  } = usePWAInstallStore();

  if (!isInstallModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeInstallModal}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* App Header */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
              <img src="/icons/icon-192x192.png" alt={BRAND.name} className="w-12 h-12 rounded-xl object-cover" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Instalar {BRAND.shortName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Experiencia médica nativa sin límites
              </p>
            </div>
          </div>

          {/* Value props */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Carga ultra-rápida</span>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Alertas en vivo</span>
            </div>
          </div>

          {/* Platform specific instructions */}
          {isStandalone ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                ¡La app ya está instalada en este dispositivo!
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                Estás disfrutando de la versión Standalone con acceso directo y soporte sin conexión.
              </p>
            </div>
          ) : isIOS ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  En iPhone / iPad sigue estos 2 sencillos pasos en Safari:
                </p>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      Toca el botón <Share className="w-3.5 h-3.5 text-blue-600 inline" /> <strong>Compartir</strong> en la barra inferior de Safari.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      Baja y selecciona <strong className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded"><Plus className="w-3 h-3" /> Agregar a pantalla de inicio</strong>.
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300">
                💡 <strong>Importante en iOS:</strong> Apple requiere que agregues la app a Inicio para poder habilitar alertas de sonido y vibración para tus clases y tareas.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {canInstall ? (
                <button
                  type="button"
                  onClick={async () => {
                    await triggerInstall();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar ahora en este dispositivo</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    En Android / Google Chrome:
                  </p>
                  <p>
                    Toca el menú de opciones de tu navegador (los tres puntos <strong>⋮</strong> arriba a la derecha) y presiona <strong>&quot;Instalar aplicación&quot;</strong> o <strong>&quot;Agregar a la pantalla principal&quot;</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer button */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={closeInstallModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Entendido
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
