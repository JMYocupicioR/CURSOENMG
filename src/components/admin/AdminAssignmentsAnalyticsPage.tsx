import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Trash2, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import AssignHomeworkModal from './AssignHomeworkModal';
import { AdminLayout } from './AdminLayout';
import {
  AdminAnalyticsScopeBar,
  AnalyticsField,
  AnalyticsFilterGrid,
  AnalyticsKpi,
  analyticsControlClass,
} from './analytics/AdminAnalyticsChrome';
import TeacherQuickGradeModal from './TeacherQuickGradeModal';
import {
  loadGradeableStudents,
  getCohortAssignmentAnalytics,
} from '../../services/academicAnalyticsService';
import {
  deleteAssignment,
  deleteAssignmentBatch,
  updateAssignmentBatchDueDate,
} from '../../services/studentPlanService';
import { describeReadingAssignment, toDatetimeLocalValue } from '../../utils/readingAssignments';
import { filterAssignments, average } from '../../utils/academicAnalytics';
import { useAuth } from '../../contexts/AuthProvider';
import type { AdminProfileRow } from '../../types/admin';
import type { AssignmentAnalyticsFilters, AssignmentAnalyticsRow } from '../../types/academicAnalytics';
import type { AssignmentStatus, AssignmentType, TeacherPendingReviewItem } from '../../types/studentPlan';

const TYPE_LABELS: Record<AssignmentType, string> = {
  exam: 'Examen asignado',
  clinical_case: 'Caso clínico',
  reading: 'Lectura',
  emg_report: 'Reporte EMG',
  practical_task: 'Tarea práctica',
};

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: 'Pendiente',
  submitted: 'Enviada',
  approved: 'Aprobada',
  needs_revision: 'Requiere revisión',
  overdue: 'Vencida',
};

const EMPTY_FILTERS: Omit<AssignmentAnalyticsFilters, 'studentId'> = {
  type: 'all',
  status: 'all',
  search: '',
  from: '',
  to: '',
};

export default function AdminAssignmentsAnalyticsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const studentId = params.get('alumno') || '';

  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [rows, setRows] = useState<AssignmentAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [gradingItem, setGradingItem] = useState<TeacherPendingReviewItem | null>(null);
  const [showHomeworkModal, setShowHomeworkModal] = useState(params.get('nueva') === '1');

  // Estado para confirmación de eliminación
  const [assignmentToDelete, setAssignmentToDelete] = useState<AssignmentAnalyticsRow | null>(null);
  const [batchSchedule, setBatchSchedule] = useState<{
    batchId: string;
    title: string;
    due: string;
    count: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const students = await loadGradeableStudents(user?.id);
      setProfiles(students);
      setRows(await getCohortAssignmentAnalytics(students));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const scopedStudent = profiles.find((p) => p.id === studentId) || null;
  const filtered = useMemo(
    () => filterAssignments(rows, { ...filters, studentId }),
    [rows, filters, studentId]
  );

  const submitted = filtered.filter((row) => {
    if (describeReadingAssignment(row).readingOnly) return false;
    return row.status === 'submitted' || row.status === 'approved' || Boolean(row.submitted_at);
  });
  const graded = filtered.filter((row) => typeof row.grade === 'number');
  const avgGrade = average(graded.map((row) => row.grade || 0));

  useEffect(() => {
    if (params.get('nueva') === '1') setShowHomeworkModal(true);
  }, [params]);

  const closeHomeworkModal = () => {
    setShowHomeworkModal(false);
    if (params.get('nueva')) {
      const next = new URLSearchParams(params);
      next.delete('nueva');
      setParams(next, { replace: true });
    }
  };

  const setStudentId = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set('alumno', id);
    else next.delete('alumno');
    setParams(next, { replace: true });
  };

  const batchSize = (batchId: string | null | undefined) =>
    batchId ? rows.filter((row) => row.batch_id === batchId).length : 0;

  const handleConfirmDelete = async (wholeBatch: boolean) => {
    if (!assignmentToDelete) return;
    setIsDeleting(true);
    try {
      if (wholeBatch && assignmentToDelete.batch_id) {
        const removed = await deleteAssignmentBatch(assignmentToDelete.batch_id);
        setToastMessage(`Se quitó la tarea a ${removed} alumno${removed === 1 ? '' : 's'}.`);
      } else {
        await deleteAssignment(assignmentToDelete.id, assignmentToDelete.student_id);
        setToastMessage('Tarea asignada eliminada del historial del alumno.');
      }
      setAssignmentToDelete(null);
      await load();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar la tarea.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveBatchDueDate = async () => {
    if (!batchSchedule) return;
    setIsSavingBatch(true);
    try {
      await updateAssignmentBatchDueDate(batchSchedule.batchId, batchSchedule.due);
      setBatchSchedule(null);
      setToastMessage('Fecha actualizada para todo el grupo.');
      await load();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo cambiar la fecha.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  return (
    <AdminLayout
      title="Tareas"
      subtitle="Publica la misma tarea a la cohorte o a alumnos elegidos, y califica las entregas"
    >
      <div className="space-y-5 pb-16">
        <AdminAnalyticsScopeBar
          student={scopedStudent}
          cohortHref="/admin/alumnos/tareas"
          studentLabel="Tareas del alumno"
          actions={
            <button
              type="button"
              onClick={() => setShowHomeworkModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva tarea
            </button>
          }
        />

        {toastMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AnalyticsKpi label="Asignadas" value={filtered.length} hint="En la selección actual" />
          <AnalyticsKpi label="Enviadas" value={submitted.length} hint="Con entrega del alumno" />
          <AnalyticsKpi
            label="Pendientes"
            value={filtered.filter((row) => row.status === 'pending').length}
            hint="Sin entregar"
          />
          <AnalyticsKpi label="Promedio" value={graded.length ? avgGrade : '—'} hint="Solo tareas calificadas" />
        </div>

        <AnalyticsFilterGrid>
          <AnalyticsField label="Buscar">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Alumno, título o tipo..."
                className={analyticsControlClass('pl-9')}
              />
            </div>
          </AnalyticsField>
          <AnalyticsField label="Alumno">
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={analyticsControlClass()}
            >
              <option value="">Todos los alumnos</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </AnalyticsField>
          <AnalyticsField label="Tipo">
            <select
              value={filters.type}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, type: e.target.value as AssignmentAnalyticsFilters['type'] }))
              }
              className={analyticsControlClass()}
            >
              <option value="all">Todos los tipos</option>
              {(Object.keys(TYPE_LABELS) as AssignmentType[]).map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </AnalyticsField>
          <AnalyticsField label="Estatus">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value as AssignmentAnalyticsFilters['status'] }))
              }
              className={analyticsControlClass()}
            >
              <option value="all">Todos los estatus</option>
              {(Object.keys(STATUS_LABELS) as AssignmentStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </AnalyticsField>
          <AnalyticsField label="Desde">
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
              className={analyticsControlClass()}
            />
          </AnalyticsField>
          <AnalyticsField label="Hasta">
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
              className={analyticsControlClass()}
            />
          </AnalyticsField>
        </AnalyticsFilterGrid>

        <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 overflow-hidden">
          {loading ? (
            <p className="px-5 py-10 text-sm text-slate-500 text-center">Cargando tareas de la cohorte...</p>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-10 text-sm text-slate-400 text-center">
              No hay tareas con los filtros seleccionados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <caption className="sr-only">Tareas enviadas por los alumnos</caption>
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Alumno</th>
                    <th className="px-4 py-3">Tarea</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Estatus</th>
                    <th className="px-4 py-3">Entrega</th>
                    <th className="px-4 py-3">Nota</th>
                    <th className="px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((row) => {
                    const reading = describeReadingAssignment(row);
                    const mates = batchSize(row.batch_id);
                    return (
                    <tr key={row.id} className="bg-white/70 dark:bg-slate-900/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{row.studentName}</p>
                        <p className="text-xs text-slate-400">{row.studentEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.title}</p>
                        <p className="text-xs text-slate-400">
                          Límite: {row.due_date ? new Date(row.due_date).toLocaleDateString('es-MX') : '—'}
                        </p>
                        {reading.progressLabel && (
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{reading.progressLabel}</p>
                        )}
                        {reading.readingOnly && reading.complete && (
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            {reading.late ? 'Lectura cumplida con retraso' : `Lectura ${reading.done}/${reading.total}`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">
                        {reading.readingOnly
                          ? 'Lectura'
                          : reading.hasReading
                          ? 'Lectura y entrega'
                          : TYPE_LABELS[row.type] || row.type}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold">
                          {reading.statusLabel || STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {reading.readingOnly
                          ? reading.complete
                            ? 'Lectura cumplida'
                            : 'Sin leer'
                          : row.submitted_at
                          ? new Date(row.submitted_at).toLocaleString('es-MX')
                          : 'Sin entregar'}
                      </td>
                      <td className="px-4 py-3 font-black">
                        {typeof row.grade === 'number' ? row.grade : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {mates > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setBatchSchedule({
                                  batchId: row.batch_id!,
                                  title: row.title,
                                  due: toDatetimeLocalValue(row.due_date),
                                  count: mates,
                                })
                              }
                              className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                            >
                              Fecha del grupo
                            </button>
                          )}
                          {row.status === 'submitted' && (
                            <button
                              type="button"
                              onClick={() =>
                                setGradingItem({
                                  assignment: row,
                                  studentProfile: {
                                    id: row.student_id,
                                    display_name: row.studentName,
                                    email: row.studentEmail,
                                  },
                                })
                              }
                              className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              Calificar
                            </button>
                          )}
                          <Link
                            to={`/admin/alumnos/${row.student_id}`}
                            state={{ from: location.pathname + location.search }}
                            className="text-xs font-bold text-slate-500 hover:text-indigo-600"
                          >
                            Expediente
                          </Link>
                          <button
                            type="button"
                            onClick={() => setAssignmentToDelete(row)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Eliminar tarea asignada del historial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        </section>
      </div>

      {/* Modal de Calificación Rápida */}
      <AssignHomeworkModal
        isOpen={showHomeworkModal}
        onClose={closeHomeworkModal}
        profiles={profiles}
        initialStudentId={studentId || undefined}
        initialStudentName={scopedStudent?.display_name}
        onAssigned={async () => {
          closeHomeworkModal();
          await load();
        }}
      />

      <TeacherQuickGradeModal
        isOpen={Boolean(gradingItem)}
        onClose={() => setGradingItem(null)}
        item={gradingItem}
        onGraded={() => {
          setGradingItem(null);
          load();
        }}
      />

      {batchSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Fecha para todo el grupo</h3>
              <p className="mt-1 text-xs text-slate-500">
                {batchSchedule.title}. Cambia el límite de los {batchSchedule.count} alumnos de esta publicación.
              </p>
            </div>
            <label className="block space-y-1 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Nueva fecha límite</span>
              <input
                type="datetime-local"
                value={batchSchedule.due}
                onChange={(event) => setBatchSchedule({ ...batchSchedule, due: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isSavingBatch}
                onClick={() => setBatchSchedule(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingBatch || !batchSchedule.due}
                onClick={handleSaveBatchDueDate}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {isSavingBatch ? 'Guardando…' : 'Guardar fecha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Tarea */}
      {assignmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ¿Eliminar tarea asignada?
                </h3>
                <p className="text-xs text-slate-500">Confirmación docente requerida</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white">
                {assignmentToDelete.title}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <span className="font-semibold">Alumno:</span> {assignmentToDelete.studentName} ({assignmentToDelete.studentEmail})
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <span className="font-semibold">Tipo:</span> {TYPE_LABELS[assignmentToDelete.type] || assignmentToDelete.type}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <span className="font-semibold">Estatus actual:</span> {STATUS_LABELS[assignmentToDelete.status] || assignmentToDelete.status}
                {typeof assignmentToDelete.grade === 'number' && ` · Nota: ${assignmentToDelete.grade}/100`}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs">
              <p className="font-bold mb-1">⚠️ Efecto en el Kardex:</p>
              <p>
                Al eliminar esta tarea, se removerá el registro de entrega y calificación del alumno. Si se trataba de una tarea repetida o con calificación baja que el profesor desea retirar, el promedio de tareas se recalculará automáticamente.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAssignmentToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleConfirmDelete(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {isDeleting
                    ? 'Eliminando...'
                    : assignmentToDelete.batch_id && batchSize(assignmentToDelete.batch_id) > 1
                    ? 'Solo este alumno'
                    : 'Sí, eliminar'}
                </span>
              </button>
              {assignmentToDelete.batch_id && batchSize(assignmentToDelete.batch_id) > 1 && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-300 text-rose-700 text-xs font-bold transition cursor-pointer disabled:opacity-50 dark:border-rose-800 dark:text-rose-300"
                >
                  Quitar a los {batchSize(assignmentToDelete.batch_id)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
