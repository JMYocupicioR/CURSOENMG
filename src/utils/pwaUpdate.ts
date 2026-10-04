import { usePWAUpdateStore } from '../stores/pwaUpdateStore';

const EXAM_LOCK_KEY = 'neurosafe_exam_active';

export function setExamSessionLock(active: boolean) {
  try {
    if (active) sessionStorage.setItem(EXAM_LOCK_KEY, '1');
    else sessionStorage.removeItem(EXAM_LOCK_KEY);
  } catch {
    // ignore
  }
}

export function isExamSessionLocked() {
  try {
    return sessionStorage.getItem(EXAM_LOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function registerPwaUpdates() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  void import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] Nueva versión disponible detectada por el Service Worker.');
          if (isExamSessionLocked()) {
            console.log('[PWA] Actualización aplazada: Examen activo en curso.');
            return;
          }
          // Notificar al store reactivo para activar el botón superior y el banner
          usePWAUpdateStore.getState().setNeedRefresh(true, async () => {
            await updateSW(true);
          });
        },
        onRegisteredSW(_swUrl, registration) {
          if (!registration) return;

          // 1. Chequeo periódico cada 30 minutos
          setInterval(() => {
            if (!isExamSessionLocked()) {
              void registration.update();
            }
          }, 30 * 60 * 1000);

          // 2. Chequeo al recuperar foco o visibilidad tras inactividad (> 15 min)
          let lastVisibilityCheck = Date.now();
          const checkOnFocus = () => {
            const now = Date.now();
            if (now - lastVisibilityCheck > 15 * 60 * 1000 && !isExamSessionLocked()) {
              lastVisibilityCheck = now;
              void registration.update();
            }
          };

          window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkOnFocus();
          });
          window.addEventListener('focus', checkOnFocus);
        },
      });
    })
    .catch(() => {
      // PWA plugin no disponible en tests
    });
}
