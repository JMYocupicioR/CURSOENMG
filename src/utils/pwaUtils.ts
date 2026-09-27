/**
 * PWA Utilities – iOS-hardened
 * Handles storage persistence, standalone detection, install prompts,
 * and App Shell re-caching on every launch.
 */

/** Detect if running in iOS standalone (installed) mode */
export function isIOSStandalone(): boolean {
  return (
    ('standalone' in window.navigator &&
      (window.navigator as any).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/** Detect iOS Safari (not Chrome/Firefox/Edge on iOS) */
export function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  return (
    /iP(hone|od|ad)/.test(ua) &&
    /WebKit/.test(ua) &&
    !/(CriOS|FxiOS|EdgiOS)/.test(ua)
  );
}

/** Detect any iOS browser */
export function isIOS(): boolean {
  return /iP(hone|od|ad)/.test(navigator.userAgent);
}

/**
 * Ask the browser to keep Cache/IndexedDB data under storage pressure.
 * Chrome and Safari grant this on their own (installed app, bookmark, or
 * high site engagement). A refusal is normal in a regular tab and is not
 * an application error.
 */
let persistentStorageRequest: Promise<boolean> | null = null;
let persistentStorageLogged = false;

export function requestPersistentStorage(): Promise<boolean> {
  if (!persistentStorageRequest) {
    persistentStorageRequest = requestPersistentStorageOnce().finally(() => {
      persistentStorageRequest = null;
    });
  }
  return persistentStorageRequest;
}

async function requestPersistentStorageOnce(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;

  try {
    if (navigator.storage.persisted && (await navigator.storage.persisted())) {
      logPersistentStorage(true);
      return true;
    }

    const granted = await navigator.storage.persist();
    logPersistentStorage(granted);
    return granted;
  } catch (error) {
    if (!persistentStorageLogged) {
      persistentStorageLogged = true;
      console.warn('[PWA] Persistent storage request failed:', error);
    }
    return false;
  }
}

function logPersistentStorage(granted: boolean): void {
  if (persistentStorageLogged) return;
  persistentStorageLogged = true;
  if (granted) {
    console.log('[PWA] Persistent storage granted');
    return;
  }
  console.debug(
    '[PWA] Browser did not grant persistent storage. Offline data can still be evicted under storage pressure.'
  );
}

/** Estimate storage quota usage */
export async function getStorageEstimate(): Promise<{
  used: number;
  quota: number;
} | null> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      return { used: est.usage ?? 0, quota: est.quota ?? 0 };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Re-cache the App Shell on every launch.
 * iOS purges Cache API after 7 days of inactivity.
 * This ensures the core shell assets are always fresh.
 */
export async function reCacheAppShell(): Promise<void> {
  if (!('caches' in window)) return;

  try {
    // Delete legacy unversioned shell cache if it exists to prevent stale HTML referencing obsolete CSS/JS bundles
    if (await caches.has('app-shell-v1')) {
      await caches.delete('app-shell-v1');
      console.log('[PWA] Purged legacy app-shell-v1 cache ✓');
    }
  } catch (error) {
    console.warn('[PWA] Cache cleanup failed:', error);
  }
}

/**
 * Detect if user should see iOS install prompt.
 * Returns true if: on iOS Safari, NOT already installed, and not dismissed recently.
 */
export function shouldShowInstallPrompt(): boolean {
  if (!isIOSSafari()) return false;
  if (isIOSStandalone()) return false;

  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed) {
    const dismissedAt = parseInt(dismissed, 10);
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (Date.now() - dismissedAt < threeDays) return false;
  }

  return true;
}

/** Mark install prompt as dismissed */
export function dismissInstallPrompt(): void {
  localStorage.setItem('pwa-install-dismissed', Date.now().toString());
}

/**
 * Force refresh the service worker.
 * Useful for a manual "Update App" button in the UI.
 */
export async function forceUpdateServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.update();
      console.log('[PWA] Service Worker update triggered ✓');
      return true;
    }
  } catch (error) {
    console.warn('[PWA] SW update failed:', error);
  }
  return false;
}

/**
 * Get the current app version from the SW registration for debug/display.
 */
export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION || '1.0.0';
}
