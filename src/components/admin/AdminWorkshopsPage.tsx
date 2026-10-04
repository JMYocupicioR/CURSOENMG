import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Video,
  Plus,
  Users,
  XCircle,
  Bell,
  UserCheck,
  Lock,
  Unlock,
  BookOpen,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  getWorkshops,
  createWorkshop,
  updateWorkshop,
  setWorkshopAttendanceClosed,
} from '../../services/courseService';
import { sendAcademicPush } from '../../services/studentToolsService';
import { loadGradeableStudents } from '../../services/academicAnalyticsService';
import {
  getCohortAttendance,
  computeWorkshopAttendanceSummary,
} from '../../services/attendanceService';
import { allModules } from '../../content/modules';
import { useAuth } from '../../contexts/AuthProvider';
import type { LiveWorkshop, WorkshopStatus } from '../../types/database';
import type { Module } from '../../types/content';
import type { AdminProfileRow } from '../../types/admin';
import type { ClassAttendanceRecord, SessionModality } from '../../types/academicGradebook';
import { CreateLiveClassModal } from './CreateLiveClassModal';

export default function AdminWorkshopsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workshops, setWorkshops] = useState<LiveWorkshop[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [students, setStudents] = useState<AdminProfileRow[]>([]);
  const [cohortRecords, setCohortRecords] = useState<ClassAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [editingWorkshop, setEditingWorkshop] = useState<LiveWorkshop | null>(null);
  const [sessionModality, setSessionModality] = useState<SessionModality>('online');
  const [countsForKardex, setCountsForKardex] = useState(true);
  const [pushTitle, setPushTitle] = useState('Aviso académico ElectroDx');
  const [pushBody, setPushBody] = useState('');
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [ws, stud] = await Promise.all([
        getWorkshops(),
        loadGradeableStudents(user?.id),
      ]);
      setWorkshops(ws);
      setModules(allModules);
      setStudents(stud);

      const records = await getCohortAttendance(stud.map((s) => s.id));
      setCohortRecords(records);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const studentIds = useMemo(() => students.map((s) => s.id), [students]);

  const summaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeWorkshopAttendanceSummary>>();
    for (const w of workshops) {
      map.set(w.id, computeWorkshopAttendanceSummary(w, studentIds, cohortRecords));
    }
    return map;
  }, [workshops, studentIds, cohortRecords]);

  const topicTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of allModules) {
      for (const t of m.topics) {
        map.set(t.id, t.title);
        if (t.children) {
          for (const c of t.children) {
            map.set(c.id, c.title);
          }
        }
      }
    }
    return map;
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scheduledAt || !moduleId) return;
    if (!user?.id) {
      alert('Debes iniciar sesión para programar una clase.');
      return;
    }

    try {
      await createWorkshop({
        title,
        description,
        module_id: moduleId,
        topic_id: null,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: 90,
        stream_url: streamUrl || null,
        recording_url: recordingUrl || null,
        clinical_case_revision_id: null,
        clinical_case_json: null,
        status: 'draft',
        max_capacity: 100,
        session_modality: sessionModality,
        counts_for_kardex: countsForKardex,
        created_by: user.id,
      } as any);
      setIsCreating(false);
      setTitle('');
      setDescription('');
      setScheduledAt('');
      setStreamUrl('');
      setRecordingUrl('');
      setSessionModality('online');
      setCountsForKardex(true);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al crear');
    }
  };

  const setStatus = async (id: string, status: WorkshopStatus) => {
    // Si intenta finalizar, advertir si el pase de lista está incompleto
    if (status === 'completed') {
      const sum = summaries.get(id);
      if (sum && sum.rollCallStatus !== 'completed') {
        const proceed = window.confirm(
          `Aviso de Control Escolar:\n\nLa lista de asistencia para esta sesión está ${
            sum.rollCallStatus === 'not_started' ? 'PENDIENTE (0 marcados)' : `INCOMPLETA (${sum.pendingCount} cursistas sin marcar)`
          }.\n\n¿Deseas finalizar el taller de todos modos? Presiona "Cancelar" si deseas pasar lista primero.`
        );
        if (!proceed) {
          navigate(`/admin/alumnos/asistencias?tab=pase&workshopId=${id}`);
          return;
        }
      }
    }

    try {
      await updateWorkshop(id, { status });
      load();
    } catch (e) {
      alert('Error al actualizar estado');
    }
  };

  const toggleAttendanceClosed = async (id: string, current: boolean) => {
    try {
      await setWorkshopAttendanceClosed(id, !current);
      load();
    } catch (e) {
      alert('Error al cambiar cierre de lista');
    }
  };

  return (
    <AdminLayout
      title="Clases en vivo"
      subtitle="Sesiones programadas, enlaces de transmisión y grabaciones de la cohorte"
    >
      {/* Aviso Push */}
      <div className="mb-6 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-3 text-slate-900 dark:text-white">
          <Bell className="w-4 h-4 text-indigo-600" /> Aviso push a cursistas
        </h3>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPushStatus(null);
            try {
              const result = await sendAcademicPush({
                title: pushTitle,
                body: pushBody,
                url: '/talleres',
              });
              setPushStatus(
                `Enviados ${result.sent} de ${result.queued}. Fallidos: ${result.failed}.`
              );
              setPushBody('');
            } catch (err) {
              setPushStatus(err instanceof Error ? err.message : 'No se pudo enviar');
            }
          }}
        >
          <input
            className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 text-xs font-semibold dark:bg-slate-800"
            value={pushTitle}
            onChange={(e) => setPushTitle(e.target.value)}
            required
          />
          <textarea
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs font-normal dark:bg-slate-800"
            rows={2}
            placeholder="Mensaje del aviso (taller, recordatorio, cambio de horario)"
            value={pushBody}
            onChange={(e) => setPushBody(e.target.value)}
            required
          />
          <button
            type="submit"
            className="min-h-[40px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Enviar aviso
          </button>
          {pushStatus && <p className="text-xs font-bold text-slate-500">{pushStatus}</p>}
        </form>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Programación y Asistencia de Talleres
          </h3>
          <p className="text-xs text-slate-500">
            Programa sesiones híbridas y gestiona el pase de lista oficial para el Kardex.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          {isCreating ? (
            'Cancelar'
          ) : (
            <>
              <Plus className="w-4 h-4" /> Programar Taller
            </>
          )}
        </button>
      </div>

      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-8 shadow-xs"
        >
          <h3 className="text-sm font-black mb-4 uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Nuevo Taller Clínico o Clase en Vivo
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Título del Taller
              </label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Taller 1: Fundamentos de Neuroconducción"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs font-semibold bg-transparent dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Módulo Académico
              </label>
              <select
                required
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs font-semibold bg-transparent dark:text-white"
              >
                <option value="">Selecciona un módulo...</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha y Hora de la Sesión
              </label>
              <input
                required
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs font-semibold bg-transparent dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Modalidad
              </label>
              <select
                value={sessionModality}
                onChange={(e) => setSessionModality(e.target.value as SessionModality)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs font-semibold bg-transparent dark:text-white"
              >
                <option value="online">En línea (Zoom / Streaming)</option>
                <option value="in_person">Presencial (Aula / Laboratorio EMG)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Enlace de Transmisión (Zoom / Meet)
              </label>
              <input
                type="url"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs font-semibold bg-transparent dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Enlace de Clase Grabada (YouTube / Drive / Vimeo)
              </label>
              <input
                type="url"
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                placeholder="https://drive.google.com/... o https://youtube.com/..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs font-semibold bg-transparent dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={countsForKardex}
                  onChange={(e) => setCountsForKardex(e.target.checked)}
                  className="rounded-sm text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Computa para el 20% de asistencia en Kardex</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Descripción del caso o temario del taller
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs bg-transparent dark:text-white"
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              Guardar Taller
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-12">Cargando talleres...</p>
      ) : workshops.length === 0 ? (
        <div className="text-center py-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-semibold">No hay talleres programados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workshops.map((w) => {
            const mod = modules.find((m) => m.id === w.module_id);
            const date = new Date(w.scheduled_at);
            const summary = summaries.get(w.id);
            const isClosed = !!w.attendance_closed;

            return (
              <div
                key={w.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition"
              >
                <div>
                  <div className="flex justify-between items-start mb-2.5 gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
                      {w.title}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase font-black rounded-md shrink-0 ${
                        w.status === 'live'
                          ? 'bg-red-100 text-red-600 animate-pulse'
                          : w.status === 'scheduled'
                          ? 'bg-orange-100 text-orange-600'
                          : w.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 line-clamp-1 font-medium">
                      {mod?.title || 'Módulo académico'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
                        w.session_modality === 'in_person'
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                      }`}
                    >
                      {w.session_modality === 'in_person' ? 'Presencial' : 'En línea'}
                    </span>
                  </div>

                  {w.topic_id && (
                    <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                      <BookOpen className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      <span className="truncate">Tema: {topicTitleMap.get(w.topic_id) || w.topic_id}</span>
                    </div>
                  )}

                  <div className="space-y-2 mb-4 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {date.toLocaleDateString('es-MX', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {w.stream_url && (
                      <div className="flex items-center gap-2 truncate">
                        <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a
                          href={w.stream_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                        >
                          Enlace de acceso
                        </a>
                      </div>
                    )}

                    {w.recording_url && (
                      <div className="flex items-center gap-2 truncate text-emerald-600 dark:text-emerald-400 font-bold">
                        <Video className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <a
                          href={w.recording_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline truncate"
                        >
                          Grabación disponible
                        </a>
                      </div>
                    )}

                    {/* Estadísticas reales de asistencia */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {summary ? (
                        summary.rollCallStatus === 'completed' ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {summary.presentCount + summary.lateCount} / {summary.totalExpected} presentes ({summary.attendancePct}%)
                          </span>
                        ) : summary.rollCallStatus === 'incomplete' ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {summary.totalExpected - summary.pendingCount} / {summary.totalExpected} asentados ({summary.pendingCount} pendientes)
                          </span>
                        ) : (
                          <span className="font-bold text-slate-400">
                            {summary.totalExpected} cursistas (Sin pase de lista)
                          </span>
                        )
                      ) : (
                        <span>Cohorte activa</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones del Taller */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/alumnos/asistencias?tab=pase&workshopId=${w.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isClosed ? 'Ver / Editar Lista' : 'Pasar Lista'}</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setEditingWorkshop(w)}
                      className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Actualizar enlaces de transmisión o grabación"
                    >
                      <Video className="w-3.5 h-3.5 text-rose-500" />
                      <span className="hidden sm:inline">Enlaces</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleAttendanceClosed(w.id, isClosed)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                      title={isClosed ? 'Reabrir lista para edición' : 'Cerrar lista oficialmente'}
                    >
                      {isClosed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Estado de Transmisión */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {w.status === 'draft' && (
                      <button
                        onClick={() => setStatus(w.id, 'scheduled')}
                        className="flex-1 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-200 transition"
                      >
                        Programar
                      </button>
                    )}
                    {w.status === 'scheduled' && (
                      <button
                        onClick={() => setStatus(w.id, 'live')}
                        className="flex-1 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition"
                      >
                        Iniciar En Vivo
                      </button>
                    )}
                    {w.status === 'live' && (
                      <button
                        onClick={() => setStatus(w.id, 'completed')}
                        className="flex-1 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 transition"
                      >
                        Finalizar Taller
                      </button>
                    )}
                    {['draft', 'scheduled'].includes(w.status) && (
                      <button
                        onClick={() => setStatus(w.id, 'cancelled')}
                        className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                        title="Cancelar sesión"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Enlaces y Grabaciones */}
      <CreateLiveClassModal
        isOpen={Boolean(editingWorkshop)}
        onClose={() => setEditingWorkshop(null)}
        initialWorkshop={editingWorkshop}
        onSuccess={load}
      />
    </AdminLayout>
  );
}
