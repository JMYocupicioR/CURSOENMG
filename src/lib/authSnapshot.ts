import type { AppRole, Profile } from '../types/database';

const STORAGE_KEY = 'neurosafe.auth-snapshot.v1';

export interface AuthSnapshot {
  userId: string;
  roles: AppRole[];
  profile: Profile | null;
}

export function readAuthSnapshot(userId: string): AuthSnapshot | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSnapshot;
    if (!parsed || parsed.userId !== userId || !Array.isArray(parsed.roles)) return null;
    return {
      userId: parsed.userId,
      roles: parsed.roles,
      profile: parsed.profile ?? null,
    };
  } catch {
    return null;
  }
}

export function writeAuthSnapshot(snapshot: AuthSnapshot): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // El navegador puede rechazar el almacenamiento; la sesión en línea sigue igual.
  }
}
