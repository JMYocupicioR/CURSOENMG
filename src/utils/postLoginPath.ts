const STUDENT_HOME_PATHS = new Set(['/', '/portal', '/dashboard', '/estudiante']);

/** Pantallas de entrada del alumno. La bandeja docente vive en /admin. */
export function isStudentHomePath(path: string): boolean {
  const pathname = path.split('?')[0]?.split('#')[0] ?? '';
  return STUDENT_HOME_PATHS.has(pathname);
}

export function postLoginPath(options: {
  next?: string | null;
  isAdmin?: boolean;
  isEditor?: boolean;
  isContributor?: boolean;
}): string {
  const next = options.next?.trim() || null;
  const isStaff = Boolean(options.isAdmin || options.isEditor);
  const nextIsInternal = Boolean(next && next.startsWith('/') && !next.startsWith('//'));
  if (nextIsInternal && next && !(isStaff && isStudentHomePath(next))) return next;
  if (isStaff) return '/admin';
  if (options.isContributor) return '/colaborador';
  return '/portal';
}

/** Admin o profesor en la home del alumno deben caer en la bandeja, salvo modo estudiante.
 *  El admin se queda en `/`: ahí vive el landing del profesor. */
export function shouldRedirectToStaffInbox(options: {
  isStaff: boolean;
  isAdmin?: boolean;
  isLoading: boolean;
  hydrated: boolean;
  studentMode: boolean;
  pathname: string;
}): boolean {
  if (options.isLoading || !options.hydrated || !options.isStaff || options.studentMode) return false;
  const pathname = options.pathname.split('?')[0]?.split('#')[0] ?? '';
  if (options.isAdmin && pathname === '/') return false;
  return isStudentHomePath(options.pathname);
}

export function postLoginPathFromRoles(roles: string[], next?: string | null): string {
  return postLoginPath({
    next,
    isAdmin: roles.includes('admin'),
    isEditor: roles.includes('editor'),
    isContributor: roles.includes('contributor'),
  });
}
