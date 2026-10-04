import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, CheckCircle, XCircle, GraduationCap, RotateCcw } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getAdminQuizAttempts } from '../../services/editorialService';
import { getQuestionStats } from '../../services/quizValidationService';
import { deleteQuizAttempt } from '../../services/quizService';
import { getModuleLabel, getTopicPublicUrl } from '../../utils/adminUtils';
import { allModules } from '../../content/modules';
import type { AdminQuizAttemptRow } from '../../types/admin';

export default function AdminQuizAttemptsPage() {
  const [attempts, setAttempts] = useState<AdminQuizAttemptRow[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getQuestionStats>>>([]);
  const [moduleFilter, setModuleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteAttempt = async (attempt: AdminQuizAttemptRow) => {
    const confirmed = window.confirm(
      `¿Deseas eliminar este intento de "${attempt.display_name}" (${attempt.score}%)?\n\nAl eliminar este intento, el alumno tendrá la oportunidad de volver a presentar la evaluación.`
    );
    if (!confirmed) return;
    setDeletingId(attempt.id);
    try {
      await deleteQuizAttempt(attempt.id, attempt.user_id ?? undefined);
      setAttempts((prev) => prev.filter((a) => a.id !== attempt.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el intento.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminQuizAttempts(200)
      .then((rows) => {
        if (!cancelled) setAttempts(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    getQuestionStats(moduleFilter || null)
      .then((questionStats) => {
        if (!cancelled) setStats(questionStats);
      })
      .catch(() => {
        if (!cancelled) setStats([]);
      });
    return () => {
      cancelled = true;
    };
  }, [moduleFilter]);

  return (
    <AdminLayout title="Intentos de evaluación">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Auditoría de Evaluaciones COMEFYR</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registro de calificaciones y duración de exámenes respondidos por los alumnos.
          </p>
        </div>
        <Link
          to="/admin/quizzes"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition shrink-0"
        >
          <GraduationCap className="w-4 h-4" />
          <span>Editor de Quizzes</span>
        </Link>
      </div>

      <div className="mb-6 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-bold">Reactivos con mayor tasa de fallo</h3>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border"
          >
            <option value="">Todos los módulos</option>
            {allModules.map((mod) => (
              <option key={mod.id} value={mod.id}>
                {mod.number}. {mod.title}
              </option>
            ))}
          </select>
        </div>
        {stats.length === 0 ? (
          <p className="text-xs text-slate-500">Aún no hay suficientes intentos para calcular tasas por reactivo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Reactivo</th>
                  <th className="px-3 py-2">Módulo</th>
                  <th className="px-3 py-2">Intentos</th>
                  <th className="px-3 py-2">Fallo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.map((row) => (
                  <tr key={row.question_id}>
                    <td className="px-3 py-2">
                      <p className="line-clamp-2">{row.stem}</p>
                      <p className="text-[11px] text-slate-400">{row.quiz_title}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">{getModuleLabel(row.module_id)}</td>
                    <td className="px-3 py-2">{row.attempt_count}</td>
                    <td className="px-3 py-2 font-semibold text-amber-700">{row.miss_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {loading && <p className="text-sm text-slate-500">Cargando intentos…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && attempts.length === 0 && (
        <p className="text-sm text-slate-500">Aún no hay intentos registrados.</p>
      )}

      {!loading && attempts.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Módulo / Tema</th>
                <th className="px-4 py-3">Puntaje</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {attempts.map((row) => {
                const topicUrl = getTopicPublicUrl(row.module_id, row.topic_id);
                return (
                  <tr key={row.id} className="bg-white/70 dark:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{row.display_name}</p>
                      <p className="text-xs text-slate-400">{row.user_email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {getModuleLabel(row.module_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          row.passed ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {row.passed ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        {row.score}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(row.completed_at).toLocaleString('es-MX')}
                      {row.duration_seconds != null && ` · ${row.duration_seconds}s`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {topicUrl && (
                          <Link
                            to={topicUrl}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="Ir a la lectura del tema"
                          >
                            <ClipboardList className="w-3.5 h-3.5" /> Lectura
                          </Link>
                        )}
                        <Link
                          to={`/modulo/${row.module_id}/evaluacion/${row.topic_id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                          title="Ver pantalla de examen del tema"
                        >
                          Evaluación
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => handleDeleteAttempt(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition disabled:opacity-50"
                          title="Eliminar este intento para permitir que el alumno vuelva a presentar la evaluación"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{deletingId === row.id ? 'Restableciendo…' : 'Permitir reintento'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
