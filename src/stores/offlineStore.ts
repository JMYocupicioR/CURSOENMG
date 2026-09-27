import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { requestPersistentStorage, reCacheAppShell } from '../utils/pwaUtils';
import { getDocumentAssetUrls, getModuleCacheUrls, putCacheUrls } from '../utils/offlineContent';

export interface ModuleCacheStatus {
  cached: boolean;
  cachedAt: string | null;
}

interface OfflineStore {
  /** Track cache status per module ID */
  moduleStatus: Record<string, ModuleCacheStatus>;
  /** Current network status */
  isOnline: boolean;
  /** Whether the browser supports Service Workers */
  isSupported: boolean;
  /** Whether a cache operation is in progress */
  isCaching: string | null; // moduleId being cached, or null

  /** Cache a specific module (all its routes) */
  cacheModule: (moduleId: string) => Promise<void>;
  /** Remove a specific module from cache */
  removeModule: (moduleId: string) => Promise<void>;
  /** Cache all modules at once */
  cacheAllModules: (moduleIds: string[]) => Promise<void>;
  /** Set online/offline status */
  setOnline: (online: boolean) => void;
  /** Initialize: check SW support and restore status */
  initialize: () => void;
}

const CACHE_NAME = 'emg-modules-v2';
let offlineListenersBound = false;

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set, get) => ({
      moduleStatus: {},
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
      isCaching: null,

      initialize: () => {
        const isSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
        set({ isSupported, isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true });

        if (typeof window !== 'undefined' && !offlineListenersBound) {
          offlineListenersBound = true;
          window.addEventListener('online', () => set({ isOnline: true }));
          window.addEventListener('offline', () => set({ isOnline: false }));
        }

        // main.tsx already requests persistent storage on production startup.
        if (isSupported && import.meta.env.PROD) {
          void reCacheAppShell();
        }

        void reconcileCachedModules();
      },

      cacheModule: async (moduleId: string) => {
        if (typeof caches === 'undefined') return;

        set({ isCaching: moduleId });

        try {
          void requestPersistentStorage();
          const cache = await caches.open(CACHE_NAME);
          const urls = [...getModuleCacheUrls(moduleId), ...getDocumentAssetUrls(), '/'];
          const stored = await putCacheUrls(cache, urls);

          if (stored === 0) {
            set({ isCaching: null });
            return;
          }

          set((state) => ({
            moduleStatus: {
              ...state.moduleStatus,
              [moduleId]: {
                cached: true,
                cachedAt: new Date().toISOString(),
              },
            },
            isCaching: null,
          }));
        } catch (error) {
          console.error(`[Offline] Failed to cache module ${moduleId}:`, error);
          set({ isCaching: null });
        }
      },

      removeModule: async (moduleId: string) => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const urls = getModuleCacheUrls(moduleId);

          for (const url of urls) {
            await cache.delete(url);
          }

          set((state) => ({
            moduleStatus: {
              ...state.moduleStatus,
              [moduleId]: { cached: false, cachedAt: null },
            },
          }));
        } catch (error) {
          console.error(`[Offline] Failed to remove module ${moduleId}:`, error);
        }
      },

      cacheAllModules: async (moduleIds: string[]) => {
        const { cacheModule } = get();
        for (const id of moduleIds) {
          await cacheModule(id);
        }
      },

      setOnline: (online: boolean) => set({ isOnline: online }),
    }),
    {
      name: 'offline-storage',
      partialize: (state) => ({
        moduleStatus: state.moduleStatus,
      }),
    }
  )
);

async function reconcileCachedModules(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const status = useOfflineStore.getState().moduleStatus;
    let changed = false;
    const next = { ...status };

    for (const [moduleId, entry] of Object.entries(status)) {
      if (!entry.cached) continue;
      const hit = await cache.match(`/modulo/${moduleId}`);
      if (!hit) {
        next[moduleId] = { cached: false, cachedAt: null };
        changed = true;
      }
    }

    if (changed) useOfflineStore.setState({ moduleStatus: next });
  } catch {
    // Cache API unavailable or blocked — keep persisted flags
  }
}
