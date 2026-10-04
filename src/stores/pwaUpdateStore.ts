import { create } from 'zustand';

interface PWAUpdateState {
  needRefresh: boolean;
  isUpdating: boolean;
  isChecking: boolean;
  lastCheckTime: number | null;
  dismissed: boolean;
  updateHandler: (() => Promise<void> | void) | null;
  setNeedRefresh: (need: boolean, handler?: () => Promise<void> | void) => void;
  dismissUpdate: () => void;
  updateApp: () => Promise<void>;
  checkForUpdate: () => Promise<boolean>;
}

export const usePWAUpdateStore = create<PWAUpdateState>((set, get) => ({
  needRefresh: false,
  isUpdating: false,
  isChecking: false,
  lastCheckTime: null,
  dismissed: false,
  updateHandler: null,

  setNeedRefresh: (need, handler) =>
    set({
      needRefresh: need,
      dismissed: false,
      updateHandler: handler ?? get().updateHandler,
    }),

  dismissUpdate: () => set({ dismissed: true }),

  updateApp: async () => {
    const { updateHandler, isUpdating } = get();
    if (isUpdating) return;
    set({ isUpdating: true });

    try {
      if (updateHandler) {
        await updateHandler();
      } else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
        window.location.reload();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('[PWA] Error actualizando la aplicación:', err);
      window.location.reload();
    }
  },

  checkForUpdate: async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    set({ isChecking: true });
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        set({ lastCheckTime: Date.now() });

        if (registration.waiting) {
          get().setNeedRefresh(true);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.warn('[PWA] Error comprobando actualizaciones:', err);
      return false;
    } finally {
      set({ isChecking: false });
    }
  },
}));
