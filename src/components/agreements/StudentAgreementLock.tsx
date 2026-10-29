import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import AgreementsPage from './AgreementsPage';

const COURSE_PREFIXES = [
  '/portal',
  '/dashboard',
  '/estudiante',
  '/modulo',
  '/ejercicios',
  '/examenes',
  '/herramientas',
  '/simuladores',
  '/talleres',
  '/taller',
  '/mi-progreso',
];

export function isStudentCoursePath(pathname: string): boolean {
  const path = pathname.split('?')[0]?.split('#')[0] ?? '';
  if (path === '/simuladores/publico') return false;
  return COURSE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Cubre el curso hasta que el paquete vigente esté firmado. No se cierra con Escape ni con el fondo. */
export function StudentAgreementLock() {
  const { needsAgreementSignature, isLoading } = useAuth();
  const { pathname } = useLocation();
  const open = !isLoading && needsAgreementSignature && isStudentCoursePath(pathname);
  const panelRef = useFocusTrap(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/75 px-3 py-6 sm:px-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="firma-acuerdos-alumno"
        className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.preventDefault();
        }}
      >
        <h2 id="firma-acuerdos-alumno" className="sr-only">
          Firma los acuerdos para continuar el curso
        </h2>
        <AgreementsPage embedded />
      </div>
    </div>
  );
}
