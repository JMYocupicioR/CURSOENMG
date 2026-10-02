import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle2, Smartphone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import {
  getNotificationDiagnostics,
  requestNotificationPermission,
  type NotificationPermissionStatus,
} from '../../services/deviceNotificationService';
import { usePWAInstallStore } from '../../stores/pwaInstallStore';

const DISMISS_KEY_PREFIX = 'neurosafe_notif_prompt_dismissed_';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function DeviceNotificationPromptBanner() {
  const { user, profile, isAdmin, isEditor } = useAuth();
  const isStaff = isAdmin || isEditor;
  const openInstallModal = usePWAInstallStore((s) => s.openInstallModal);

  const [diagnostics, setDiagnostics] = useState(() => getNotificationDiagnostics());
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [justGranted, setJustGranted] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setIsVisible(false);
      return;
    }

    const diag = getNotificationDiagnostics();
    setDiagnostics(diag);

    // Only prompt if permission is 'default' (not yet decided)
    if (diag.permission !== 'default') {
      setIsVisible(false);
      return;
    }

    // Check if user dismissed recently
    const dismissedTime = localStorage.getItem(`${DISMISS_KEY_PREFIX}${user.id}`);
    if (dismissedTime) {
      const diff = Date.now() - parseInt(dismissedTime, 10);
      if (diff < DISMISS_DURATION_MS) {
        setIsVisible(false);
        return;
      }
    }

    // Show after slight delay for better UX
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [user?.id]);

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}${user.id}`, Date.now().toString());
    }
    setIsVisible(false);
  };

  const handleEnable = async () => {
    if (!user?.id) return;
    setIsRequesting(true);
    try {
      const res: NotificationPermissionStatus = await requestNotificationPermission(
        user.id,
        isStaff ? 'admin' : 'student'
      );
      const updatedDiag = getNotificationDiagnostics();
      setDiagnostics(updatedDiag);

      if (res === 'granted') {
        setJustGranted(true);
        setTimeout(() => {
          setIsVisible(false);
        }, 3500);
      } else {
        handleDismiss();
      }
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isVisible || !user) return null;

  const doctorName = profile?.display_name
    ? `Dr(a). ${profile.display_name.split(' ')[0]}`
    : 'Doctor(a)';

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ duration: 0.3 }}
        aria-label="Aviso para activar alertas y notificaciones del dispositivo"
        className="relative z-40 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white shadow-lg border-b border-indigo-500/30"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left side: Icon & Text */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20">
                {justGranted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 animate-bounce" />
                ) : diagnostics.needsIOSInstall ? (
                  <Smartphone className="w-5 h-5 text-indigo-200" />
                ) : (
                  <Bell className="w-5 h-5 text-indigo-200 animate-pulse" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                {justGranted ? (
                  <p className="text-xs sm:text-sm font-bold text-emerald-200">
                    ✅ ¡Alertas activadas exitosamente! Recibirás avisos en este dispositivo.
                  </p>
                ) : diagnostics.needsIOSInstall ? (
                  <p className="text-xs sm:text-sm font-medium text-indigo-100">
                    <strong className="text-white">{doctorName}:</strong> Para recibir alertas en tu iPhone, primero debes{' '}
                    <strong className="text-white underline">agregar la app a tu Pantalla de Inicio</strong>.
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm font-medium text-indigo-100">
                    <strong className="text-white">{doctorName}:</strong> Activa las alertas de ElectroDx en este dispositivo para recibir avisos de{' '}
                    <strong className="text-white">
                      {isStaff
                        ? 'entregas de alumnos, tareas por calificar y nuevas admisiones'
                        : 'nuevas tareas, exámenes asignados, calificaciones y clases en vivo'}
                    </strong>
                    .
                  </p>
                )}
              </div>
            </div>

            {/* Right side: Actions */}
            {!justGranted && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                {diagnostics.needsIOSInstall ? (
                  <button
                    type="button"
                    onClick={openInstallModal}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs transition shadow-sm cursor-pointer"
                  >
                    Ver cómo instalar en iPhone
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnable}
                    disabled={isRequesting}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isRequesting ? 'Activando...' : 'Activar Alertas'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Recordármelo después"
                  aria-label="Cerrar aviso de alertas"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
