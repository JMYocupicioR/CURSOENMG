import { describe, expect, it, beforeEach } from 'vitest';
import {
  getAutoOpenClassWizardPref,
  setAutoOpenClassWizardPref,
  resetAutoOpenClassWizardSession,
  markAutoOpenClassWizardSessionSeen,
  hasAutoOpenClassWizardBeenSeenThisSession,
  AUTO_OPEN_CLASS_WIZARD_STORAGE_KEY,
  AUTO_OPEN_CLASS_WIZARD_SESSION_KEY,
} from './classWizardPreferences';

describe('classWizardPreferences', () => {
  const localStore: Record<string, string> = {};
  const sessionStore: Record<string, string> = {};

  beforeEach(() => {
    for (const key in localStore) delete localStore[key];
    for (const key in sessionStore) delete sessionStore[key];

    // Mock localStorage
    globalThis.localStorage = {
      getItem: (key: string) => localStore[key] ?? null,
      setItem: (key: string, val: string) => { localStore[key] = String(val); },
      removeItem: (key: string) => { delete localStore[key]; },
      clear: () => { for (const key in localStore) delete localStore[key]; },
      key: () => null,
      length: 0,
    } as any;

    // Mock sessionStorage
    globalThis.sessionStorage = {
      getItem: (key: string) => sessionStore[key] ?? null,
      setItem: (key: string, val: string) => { sessionStore[key] = String(val); },
      removeItem: (key: string) => { delete sessionStore[key]; },
      clear: () => { for (const key in sessionStore) delete sessionStore[key]; },
      key: () => null,
      length: 0,
    } as any;
  });

  it('defaults to true when no preference is saved', () => {
    expect(getAutoOpenClassWizardPref()).toBe(true);
  });

  it('can be disabled and persisted as false', () => {
    setAutoOpenClassWizardPref(false);
    expect(localStore[AUTO_OPEN_CLASS_WIZARD_STORAGE_KEY]).toBe('false');
    expect(getAutoOpenClassWizardPref()).toBe(false);
  });

  it('can be re-enabled and persisted as true', () => {
    setAutoOpenClassWizardPref(false);
    expect(getAutoOpenClassWizardPref()).toBe(false);

    setAutoOpenClassWizardPref(true);
    expect(localStore[AUTO_OPEN_CLASS_WIZARD_STORAGE_KEY]).toBe('true');
    expect(getAutoOpenClassWizardPref()).toBe(true);
  });

  it('manages session seen state correctly', () => {
    expect(hasAutoOpenClassWizardBeenSeenThisSession()).toBe(false);

    markAutoOpenClassWizardSessionSeen();
    expect(hasAutoOpenClassWizardBeenSeenThisSession()).toBe(true);
    expect(sessionStore[AUTO_OPEN_CLASS_WIZARD_SESSION_KEY]).toBe('true');

    resetAutoOpenClassWizardSession();
    expect(hasAutoOpenClassWizardBeenSeenThisSession()).toBe(false);
  });
});
