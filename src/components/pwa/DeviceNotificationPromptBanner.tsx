import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, Smartphone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import {
  getNotificationDiagnostics,
  requestNotificationPermission,
  type NotificationPermissionStatus,
} from '../../services/deviceNotificationService';
import { usePWAInstallStore } from '../../stores/pwaInstallStore';

export const PWA_PROMPT_DISMISS_KEY_PREFIX = 'neurosafe_notif_prompt_dismissed_';
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const PWA_BANNER_DISMISSED_EVENT = 'neurosafe:pwa-banner-dismissed';

export function isPwaPromptDismissed(userId?: string | null): boolean {
  if (!userId) return false;
  try {
    const dismissedTime = localStorage.getItem(`${PWA_PROMPT_DISMISS_KEY_PREFIX}${userId}`);
    if (!dismissedTime) return false;
    return Date.now() - parseInt(dismissedTime, 10) < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

export function dismissPwaPrompt(userId?: string | null): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${PWA_PROMPT_DISMISS_KEY_PREFIX}${userId}`, Date.now().toString());
    window.dispatchEvent(new CustomEvent(PWA_BANNER_DISMISSED_EVENT));
  } catch {}
}

export default function DeviceNotificationPromptBanner() {
  const { user, isAdmin, isEditor } = useAuth();
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

    if (diag.permission !== 'default') {
      setIsVisible(false);
      return;
    }

    if (isPwaPromptDismissed(user.id)) {
      setIsVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1200);

    const onExternalDismiss = () => setIsVisible(false);
    window.addEventListener(PWA_BANNER_DISMISSED_EVENT, onExternalDismiss);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(PWA_BANNER_DISMISSED_EVENT, onExternalDismiss);
    };
  }, [user?.id]);

  const handleDismiss = () => {
    dismissPwaPrompt(user?.id);
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
        }, 2500);
      } else {
        handleDismiss();
      }
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isVisible || !user) return null;

  return (
    <aside
      aria-label="Aviso para activar alertas y notificaciones del dispositivo"
      className="relative z-40 mt-14 sm:mt-16 -mb-14 sm:-mb-16 bg-indigo-900 dark:bg-indigo-950 text-white border-b border-indigo-700/60"
    >
      <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {justGranted ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : diagnostics.needsIOSInstall ? (
            <Smartphone className="w-4 h-4 text-indigo-300 shrink-0" />
          ) : (
            <Bell className="w-4 h-4 text-indigo-300 shrink-0" />
          )}

          <p className="text-xs font-medium text-indigo-100 truncate">
            {justGranted
              ? 'Alertas activadas en este dispositivo.'
              : diagnostics.needsIOSInstall
                ? 'Instala ElectroDx en tu iPhone para recibir alertas de tareas y clases.'
                : isStaff
                  ? 'Activa alertas de entregas y admisiones en este dispositivo.'
                  : 'Activa alertas de tareas, exámenes y clases en vivo en tu dispositivo.'}
          </p>
        </div>

        {!justGranted && (
          <div className="flex items-center gap-1.5 shrink-0">
            {diagnostics.needsIOSInstall ? (
              <button
                type="button"
                onClick={openInstallModal}
                className="px-2.5 py-1 rounded-lg bg-white text-indigo-950 hover:bg-indigo-50 font-semibold text-[11px] transition cursor-pointer whitespace-nowrap"
              >
                Instalar en iPhone
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnable}
                disabled={isRequesting}
                className="px-2.5 py-1 rounded-lg bg-white text-indigo-950 hover:bg-indigo-50 font-semibold text-[11px] transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isRequesting ? 'Activando...' : 'Activar alertas'}
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-md text-indigo-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Cerrar aviso"
              aria-label="Cerrar aviso de alertas"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
