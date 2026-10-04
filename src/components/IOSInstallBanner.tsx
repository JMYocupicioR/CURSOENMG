import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, X, Plus } from 'lucide-react';
import { shouldShowInstallPrompt, dismissInstallPrompt } from '../utils/pwaUtils';
import { BioelectricLightningIcon } from './brand/BrandLogo';
import { BRAND } from '../config/brand';

/**
 * iOS Install Banner
 * Educates users on how to "Add to Home Screen" in Safari.
 * Only shows on iOS Safari when the app is NOT installed and
 * has not been dismissed in the last 3 days.
 */
export default function IOSInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Delay check slightly so page loads first
    const timer = setTimeout(() => {
      if (shouldShowInstallPrompt()) {
        setShow(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    dismissInstallPrompt();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-[4.75rem] left-0 right-0 z-50 mx-auto max-w-lg lg:bottom-0"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
        >
          <div className="mx-3 mb-3 rounded-2xl bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 shadow-2xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <BioelectricLightningIcon size={26} />
                <span className="text-white font-semibold text-sm">
                  Instalar {BRAND.shortName}
                </span>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Instructions */}
            <div className="space-y-2 text-sm">
              <p className="text-gray-300">
                Agrega esta app a tu pantalla de inicio para acceso rápido y uso sin conexión:
              </p>
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-700/40">
                <span className="text-blue-400 font-mono text-xs bg-blue-500/10 px-2 py-0.5 rounded">
                  1
                </span>
                <span className="text-gray-200 text-xs flex items-center gap-1.5">
                  Toca el botón <Share className="w-4 h-4 text-blue-400 inline-block" /> Compartir
                </span>
              </div>
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-700/40">
                <span className="text-blue-400 font-mono text-xs bg-blue-500/10 px-2 py-0.5 rounded">
                  2
                </span>
                <span className="text-gray-200 text-xs flex items-center gap-1.5">
                  Desplaza y selecciona
                  <span className="inline-flex items-center gap-1 bg-gray-600/60 rounded px-1.5 py-0.5">
                    <Plus className="w-3 h-3" />
                    Agregar a Inicio
                  </span>
                </span>
              </div>
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="mt-3 w-full py-2 rounded-xl bg-gray-700/60 hover:bg-gray-600/60 
                         text-gray-300 text-xs font-medium transition-colors"
            >
              Ahora no
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
