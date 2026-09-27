export const QUIZ_CATALOG_PATH = '/admin/quizzes';

const STORAGE_KEY = 'neurosafe.quizCatalogReturn';
const FOCO_RE = /^quiz-row-[A-Za-z0-9_-]+$/;

export type QuizCatalogStatus = 'all' | 'with_quiz' | 'no_quiz';

export type QuizCatalogFilters = {
  q?: string;
  modulo?: string;
  estado?: QuizCatalogStatus;
};

export type QuizCatalogFocus = {
  moduleId: string;
  topicId: string;
};

export function quizRowDomId(moduleId: string, topicId: string): string {
  const safe = `${moduleId}--${topicId}`.replace(/[^A-Za-z0-9_-]/g, '-');
  return `quiz-row-${safe}`;
}

export function isQuizRowDomId(value: string | null | undefined): value is string {
  return Boolean(value && FOCO_RE.test(value));
}

export function parseQuizCatalogStatus(value: string | null | undefined): QuizCatalogStatus {
  if (value === 'with_quiz' || value === 'no_quiz') return value;
  return 'all';
}

export function buildQuizCatalogPath(
  filters: QuizCatalogFilters,
  focus?: QuizCatalogFocus | null,
): string {
  const params = new URLSearchParams();
  const q = filters.q?.trim();
  if (q) params.set('q', q);
  if (filters.modulo && filters.modulo !== 'all') params.set('modulo', filters.modulo);
  if (filters.estado && filters.estado !== 'all') params.set('estado', filters.estado);
  const search = params.toString();
  const hash = focus ? `#${quizRowDomId(focus.moduleId, focus.topicId)}` : '';
  return `${QUIZ_CATALOG_PATH}${search ? `?${search}` : ''}${hash}`;
}

/** Solo la lista de evaluaciones, nunca el editor `/admin/quizzes/:topicId`. */
export function isQuizCatalogPath(path: string): boolean {
  if (!path.startsWith('/')) return false;
  const pathname = path.split(/[?#]/)[0];
  return pathname === QUIZ_CATALOG_PATH;
}

export function rememberQuizCatalogReturn(path: string): void {
  if (!isQuizCatalogPath(path)) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // Modo privado u origen sin storage.
  }
}

export function readQuizCatalogReturn(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value && isQuizCatalogPath(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearQuizCatalogReturn(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function quizCatalogReturnFromLocation(state: unknown, search: string): string | null {
  const fromState =
    state && typeof state === 'object' && 'from' in state
      ? (state as { from?: unknown }).from
      : undefined;
  if (typeof fromState === 'string' && isQuizCatalogPath(fromState)) return fromState;

  try {
    const raw = search.startsWith('?') ? search.slice(1) : search;
    const fromParam = new URLSearchParams(raw).get('from');
    if (fromParam && isQuizCatalogPath(fromParam)) return fromParam;
  } catch {
    // ignore
  }

  return readQuizCatalogReturn();
}

/**
 * Abre el editor conservando filtros de la lista.
 * `foco` guarda el id del renglón para reconstruir el ancla al volver.
 */
export function quizEditorPath(
  topicId: string,
  moduleId: string | undefined,
  catalogReturn: string | null,
): string {
  const params = new URLSearchParams();
  if (moduleId) params.set('moduleId', moduleId);
  if (catalogReturn && isQuizCatalogPath(catalogReturn)) {
    const withoutHash = catalogReturn.split('#')[0] ?? catalogReturn;
    const query = withoutHash.split('?')[1] ?? '';
    new URLSearchParams(query).forEach((value, key) => {
      if (key !== 'moduleId') params.set(key, value);
    });
    const hash = catalogReturn.includes('#')
      ? catalogReturn.slice(catalogReturn.indexOf('#') + 1)
      : '';
    if (isQuizRowDomId(hash)) params.set('foco', hash);
  }
  const search = params.toString();
  return `/admin/quizzes/${encodeURIComponent(topicId)}${search ? `?${search}` : ''}`;
}

/** Vuelve del editor a la lista, con los filtros y el renglón marcado. */
export function catalogPathFromEditorSearch(search: string): string {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  params.delete('moduleId');
  const foco = params.get('foco');
  params.delete('foco');
  const rest = params.toString();
  const hash = isQuizRowDomId(foco) ? `#${foco}` : '';
  return `${QUIZ_CATALOG_PATH}${rest ? `?${rest}` : ''}${hash}`;
}
