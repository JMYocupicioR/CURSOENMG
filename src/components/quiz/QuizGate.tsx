import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import type { QuizTopicFlag } from '../../types/quiz';
import { QuizPlayer } from './QuizPlayer';

export function QuizGate({
  topicId,
  moduleId,
  quizFlag,
  onPass,
  nextTopicUrl,
}: {
  topicId: string;
  moduleId: string;
  quizFlag: QuizTopicFlag | null;
  onPass?: () => void;
  nextTopicUrl?: string;
}) {
  const location = useLocation();
  const {
    user,
    isEnrolledPhysician,
    isLoading,
  } = useAuth();

  if (!quizFlag || quizFlag.question_count === 0) return null;

  const validationStatus = quizFlag.clinical_validation_status ?? 'pending_review';
  if (validationStatus !== 'approved') {
    return null;
  }

  const loginUrl = `/auth/login?next=${encodeURIComponent(location.pathname)}`;

  if (isLoading) {
    return (
      <section id="evaluacion" className="mt-10 scroll-mt-24 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40">
        <p className="text-sm text-slate-500">Cargando evaluación…</p>
      </section>
    );
  }

  return (
    <div id="evaluacion" className="mt-10 scroll-mt-24">
      {!user && (
        <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <span><strong>Modo Formativo:</strong> Estás realizando esta evaluación en modo práctica. Inicia sesión para guardar tu historial oficial y créditos CME.</span>
          <Link to={loginUrl} className="shrink-0 font-semibold underline hover:text-amber-600">Iniciar sesión</Link>
        </div>
      )}

      {user && !isEnrolledPhysician && (
        <div className="mb-4 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-800 dark:text-indigo-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <span><strong>Evaluación Formativa:</strong> Tus aciertos sumarán a tu avance del módulo. Para acreditación curricular oficial, completa tu cédula profesional en tu perfil.</span>
          <Link to="/perfil" className="shrink-0 font-semibold underline hover:text-indigo-600">Completar perfil</Link>
        </div>
      )}

      <QuizPlayer
        topicId={topicId}
        moduleId={moduleId}
        quizFlag={quizFlag}
        onPass={onPass}
        nextTopicUrl={nextTopicUrl}
      />
    </div>
  );
}
