import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { useStaffViewStore } from '../../stores/staffViewStore';

export function AdminStudentModeBanner() {
  const { isAdmin, isEditor } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const view = useStaffViewStore((s) => s.view);
  const exitStudentMode = useStaffViewStore((s) => s.exitStudentMode);
  const isStaff = isAdmin || isEditor;
  const inStudentMode = isStaff && view === 'student';
  const onAdminSurface = location.pathname.startsWith('/admin');

  // Solo salir del modo estudiante si veníamos de una pantalla NO admin y navegamos hacia /admin.
  // Si el usuario estaba en /admin y activó "Ver como alumno", no debe cancelarse en ese mismo instante.
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = location.pathname;

    if (inStudentMode && !prevPath.startsWith('/admin') && location.pathname.startsWith('/admin')) {
      exitStudentMode();
    }
  }, [inStudentMode, location.pathname, exitStudentMode]);

  if (!inStudentMode || onAdminSurface) return null;

  return (
    <>
      <div className="h-10" aria-hidden />
      <div className="fixed top-14 sm:top-16 inset-x-0 z-40 border-b border-amber-300/80 dark:border-amber-700/70 bg-amber-50/95 dark:bg-amber-950/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 min-w-0 text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-100">
            <Eye className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-300" />
            <span className="truncate">Modo estudiante — así ve la plataforma un alumno</span>
          </p>
          <button
            type="button"
            onClick={() => {
              exitStudentMode();
              navigate('/admin');
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition"
          >
            <Shield className="w-3.5 h-3.5" />
            Volver al panel
          </button>
        </div>
      </div>
    </>
  );
}
