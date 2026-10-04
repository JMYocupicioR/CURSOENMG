import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function detectIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    ('standalone' in window.navigator && (window.navigator as any).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export function detectIsIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function detectIsIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iP(hone|od|ad)/.test(ua) && /WebKit/.test(ua) && !/(CriOS|FxiOS|EdgiOS)/.test(ua);
}

export function detectIsAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

interface PWAInstallState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  canInstall: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isIOSSafari: boolean;
  isAndroid: boolean;
  isInstallModalOpen: boolean;
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  openInstallModal: () => void;
  closeInstallModal: () => void;
  triggerInstall: () => Promise<'accepted' | 'dismissed' | 'manual_instructions'>;
}

export const usePWAInstallStore = create<PWAInstallState>((set, get) => ({
  deferredPrompt: null,
  canInstall: false,
  isStandalone: typeof window !== 'undefined' ? detectIsStandalone() : false,
  isIOS: typeof navigator !== 'undefined' ? detectIsIOS() : false,
  isIOSSafari: typeof navigator !== 'undefined' ? detectIsIOSSafari() : false,
  isAndroid: typeof navigator !== 'undefined' ? detectIsAndroid() : false,
  isInstallModalOpen: false,

  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt, canInstall: Boolean(prompt) }),
  openInstallModal: () => set({ isInstallModalOpen: true }),
  closeInstallModal: () => set({ isInstallModalOpen: false }),

  triggerInstall: async () => {
    const { deferredPrompt } = get();

    // 1. Android & Chromium desktop: invoke native prompt
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          set({ deferredPrompt: null, canInstall: false, isInstallModalOpen: false });
        }
        return choice.outcome;
      } catch (err) {
        console.warn('[PWA] Error launching install prompt:', err);
      }
    }

    // 2. iOS or browser without native prompt event: show guided modal
    set({ isInstallModalOpen: true });
    return 'manual_instructions';
  },
}));

// Initialize window listeners once
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    usePWAInstallStore.getState().setDeferredPrompt(e as BeforeInstallPromptEvent);
  });

  window.addEventListener('appinstalled', () => {
    usePWAInstallStore.setState({
      deferredPrompt: null,
      canInstall: false,
      isStandalone: true,
      isInstallModalOpen: false,
    });
  });

  // Watch for display mode changes (e.g. user adds to home screen and launches)
  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  mediaQuery.addEventListener?.('change', (e) => {
    usePWAInstallStore.setState({ isStandalone: e.matches });
  });
}
