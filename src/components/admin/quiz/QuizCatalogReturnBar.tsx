import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthProvider';
import {
  clearQuizCatalogReturn,
  quizCatalogReturnFromLocation,
} from '../../../utils/quizCatalogNavigation';

export function QuizCatalogReturnBar({ kind }: { kind: 'topic' | 'module' }) {
  const location = useLocation();
  const { isAdmin, isEditor } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const returnTo = quizCatalogReturnFromLocation(location.state, location.search);

  if (dismissed || !returnTo || (!isAdmin && !isEditor)) return null;

  const detail =
    kind === 'topic'
      ? 'Cuando termines de leerlo, vuelve a la lista para agregarle el cuestionario.'
      : 'Cuando termines de revisar el módulo, vuelve a la lista para agregar cuestionarios.';

  return (
    <div
      className="sticky top-14 sm:top-16 z-40 mb-5"
      role="region"
      aria-label="Regreso a evaluaciones"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-950 px-4 py-3 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Lista de evaluaciones</p>
          <p className="text-xs text-indigo-200 mt-0.5">{detail}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              clearQuizCatalogReturn();
              setDismissed(true);
            }}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
            Ocultar
          </button>
          <Link
            to={returnTo}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-indigo-950 hover:bg-indigo-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a la lista
          </Link>
        </div>
      </div>
    </div>
  );
}
