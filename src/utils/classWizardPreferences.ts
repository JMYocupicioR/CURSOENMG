export const AUTO_OPEN_CLASS_WIZARD_STORAGE_KEY = 'electrodx_auto_open_class_wizard_on_login';
export const AUTO_OPEN_CLASS_WIZARD_SESSION_KEY = 'electrodx_class_wizard_auto_opened_session';

function getStorage(type: 'local' | 'session'): Storage | null {
  try {
    if (typeof window !== 'undefined') {
      return type === 'local' ? window.localStorage : window.sessionStorage;
    }
    if (typeof globalThis !== 'undefined') {
      return type === 'local' ? (globalThis as any).localStorage : (globalThis as any).sessionStorage;
    }
  } catch {}
  return null;
}

/**
 * Consulta si el Modo Fácil (Asistente de Clase) debe abrirse automáticamente al iniciar sesión.
 * Por defecto está activado (true) a menos que el usuario lo desmarque explícitamente con el checklist botón.
 */
export function getAutoOpenClassWizardPref(): boolean {
  try {
    const storage = getStorage('local');
    if (!storage) return true;
    const val = storage.getItem(AUTO_OPEN_CLASS_WIZARD_STORAGE_KEY);
    if (val === 'false') return false;
    return true;
  } catch {
    return true;
  }
}

/**
 * Guarda la preferencia del usuario sobre si ver esta pantalla al inicio.
 */
export function setAutoOpenClassWizardPref(enabled: boolean): void {
  try {
    const storage = getStorage('local');
    if (!storage) return;
    storage.setItem(AUTO_OPEN_CLASS_WIZARD_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {}
}

/**
 * Limpia la marca de la sesión para que al iniciar sesión nuevamente se vuelva a abrir de forma automática.
 */
export function resetAutoOpenClassWizardSession(): void {
  try {
    const storage = getStorage('session');
    if (!storage) return;
    storage.removeItem(AUTO_OPEN_CLASS_WIZARD_SESSION_KEY);
  } catch {}
}

/**
 * Marca que el asistente ya fue mostrado en esta sesión para no ser intrusivo durante la navegación interna.
 */
export function markAutoOpenClassWizardSessionSeen(): void {
  try {
    const storage = getStorage('session');
    if (!storage) return;
    storage.setItem(AUTO_OPEN_CLASS_WIZARD_SESSION_KEY, 'true');
  } catch {}
}

/**
 * Comprueba si ya fue abierto automáticamente en la sesión actual de navegación.
 */
export function hasAutoOpenClassWizardBeenSeenThisSession(): boolean {
  try {
    const storage = getStorage('session');
    if (!storage) return false;
    return Boolean(storage.getItem(AUTO_OPEN_CLASS_WIZARD_SESSION_KEY));
  } catch {
    return false;
  }
}
