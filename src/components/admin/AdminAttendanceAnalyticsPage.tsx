import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  UserCheck,
  Users,
  Search,
  AlertTriangle,
  Clock,
  Video,
  Lock,
  Unlock,
  FileSpreadsheet,
  ListFilter,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  AdminAnalyticsScopeBar,
  AnalyticsField,
  AnalyticsFilterGrid,
  AnalyticsKpi,
  analyticsControlClass,
} from './analytics/AdminAnalyticsChrome';
import AttendanceCockpit from './AttendanceCockpit';
import AttendanceCohortHeatmap from './AttendanceCohortHeatmap';
import {
  loadGradeableStudents,
  getCohortAttendanceAnalytics,
} from '../../services/academicAnalyticsService';
import {
  getCohortAttendance,
  computeWorkshopAttendanceSummary,
} from '../../services/attendanceService';
import { getWorkshops, setWorkshopAttendanceClosed } from '../../services/courseService';
import { filterAttendance } from '../../utils/academicAnalytics';
import { useAuth } from '../../contexts/AuthProvider';
import type { AdminProfileRow } from '../../types/admin';
import type { LiveWorkshop } from '../../types/database';
import type {
  AttendanceAnalyticsFilters,
  AttendanceAnalyticsRow,
  WorkshopAttendanceSummary,
} from '../../types/academicAnalytics';
import type { AttendanceStatus, ClassAttendanceRecord, SessionModality } from '../../types/academicGradebook';

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Presente',
  late: 'Retardo',
  excused: 'Justificada',
  absent: 'Falta',
};

const MODALITY_LABELS: Record<SessionModality, string> = {
  in_person: 'Presencial',
  online: 'En línea',
};

const EMPTY_FILTERS: Omit<AttendanceAnalyticsFilters, 'studentId'> = {
  status: 'all',
  modality: 'all',
  sessionTitle: '',
  search: '',
  from: '',
  to: '',
};

type ActiveTab = 'sesiones' | 'pase' | 'alumnos';
type AlumnosSubView = 'heatmap' | 'table';

export default function AdminAttendanceAnalyticsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const currentTab = (params.get('tab') as ActiveTab) || 'sesiones';
  const selectedWorkshopId = params.get('workshopId') || '';
  const studentId = params.get('alumno') || '';

  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [workshops, setWorkshops] = useState<LiveWorkshop[]>([]);
  const [cohortRecords, setCohortRecords] = useState<ClassAttendanceRecord[]>([]);
  const [rows, setRows] = useState<AttendanceAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Sub-vista en pestaña Alumnos
  const [alumnosSubView, setAlumnosSubView] = useState<AlumnosSubView>('heatmap');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const load = async () => {
    setLoading(true);
    try {
      const [students, ws] = await Promise.all([
        loadGradeableStudents(user?.id),
        getWorkshops(),
      ]);
      setProfiles(students);
      setWorkshops(ws);

      const records = await getCohortAttendance(students.map((s) => s.id));
      setCohortRecords(records);

      const analyticsRows = await getCohortAttendanceAnalytics(students);
      setRows(analyticsRows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  // Cambiar pestaña
  const setTab = (tab: ActiveTab, extraParams?: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v) next.set(k, v);
        else next.delete(k);
      });
    }
    setParams(next, { replace: true });
  };

  const setStudentId = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set('alumno', id);
    else next.delete('alumno');
    setParams(next, { replace: true });
  };

  // Resúmenes calculados por taller
  const workshopSummaries = useMemo<WorkshopAttendanceSummary[]>(() => {
    const studentIds = profiles.map((p) => p.id);
    return workshops.map((w) => computeWorkshopAttendanceSummary(w, studentIds, cohortRecords));
  }, [workshops, profiles, cohortRecords]);

  // KPIs Globales del Programa
  const globalKpis = useMemo(() => {
    const totalWorkshops = workshops.length;
    const closedWorkshops = workshops.filter((w) => w.attendance_closed).length;
    const heldWorkshops = workshops.filter(
      (w) =>
        w.status === 'completed' ||
        w.attendance_closed ||
        (w.scheduled_at && new Date(w.scheduled_at) <= new Date())
    ).length;

    // Calcular asistencia promedio de los talleres con registros
    const summariesWithAttendance = workshopSummaries.filter(
      (s) => s.presentCount + s.lateCount + s.excusedCount + s.absentCount > 0
    );
    const avgAttendance =
      summariesWithAttendance.length > 0
        ? Math.round(
            summariesWithAttendance.reduce((acc, s) => acc + s.attendancePct, 0) /
              summariesWithAttendance.length
          )
        : 100;

    return { totalWorkshops, closedWorkshops, heldWorkshops, avgAttendance };
  }, [workshops, workshopSummaries]);

  // Filtros de la tabla plana de alumnos
  const scopedStudent = profiles.find((p) => p.id === studentId) || null;
  const filtered = useMemo(
    () => filterAttendance(rows, { ...filters, studentId }),
    [rows, filters, studentId]
  );

  const sessions = useMemo(() => {
    return [...new Set(rows.map((row) => row.sessionTitle).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'es')
    );
  }, [rows]);

  const presentPts = filtered.reduce((sum, row) => {
    if (row.status === 'present' || row.status === 'excused') return sum + 1;
    if (row.status === 'late') return sum + 0.8;
    return sum;
  }, 0);
  const attendancePct = filtered.length === 0 ? 100 : Math.round((presentPts / filtered.length) * 100);

  // Alternar cierre de lista
  const handleToggleAttendanceClosed = async (workshopId: string, currentClosed: boolean) => {
    try {
      await setWorkshopAttendanceClosed(workshopId, !currentClosed);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cambiar estado de cierre de lista');
    }
  };

  return (
    <AdminLayout
      title="Hub de Asistencias y Talleres"
      subtitle="Supervisión docente, pase de lista de cohorte y auditoría de la rúbrica del 20% para el Kardex oficial"
    >
      <div className="space-y-6 pb-16">
        {/* Barra de Pestañas Principales */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setTab('sesiones')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentTab === 'sesiones'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Sesiones y Talleres</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {workshops.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab('pase')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentTab === 'pase'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Pase de Lista</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('alumnos')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentTab === 'alumnos'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Auditoría de Alumnos</span>
            </button>
          </div>

          {currentTab === 'sesiones' && (
            <button
              type="button"
              onClick={() => {
                const targetWorkshop =
                  workshops.find((w) => w.status === 'live') ||
                  workshops.find((w) => w.status === 'scheduled') ||
                  workshops[0];
                setTab('pase', { workshopId: targetWorkshop?.id || '' });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Pasar Lista Ahora</span>
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* PESTAÑA 1: SESIONES Y TALLERES (DASHBOARD)                                */}
        {/* ========================================================================= */}
        {currentTab === 'sesiones' && (
          <div className="space-y-6">
            {/* KPIs del Programa */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <AnalyticsKpi
                label="Talleres Programados"
                value={globalKpis.totalWorkshops}
                hint="Total en el plan académico"
              />
              <AnalyticsKpi
                label="Sesiones Celebradas"
                value={`${globalKpis.heldWorkshops} / ${globalKpis.totalWorkshops}`}
                hint={`${globalKpis.closedWorkshops} listas asentadas y cerradas`}
              />
              <AnalyticsKpi
                label="Asistencia Promedio"
                value={`${globalKpis.avgAttendance}%`}
                hint="Ponderada de sesiones evaluadas"
              />
              <AnalyticsKpi
                label="Médicos Cursistas"
                value={profiles.length}
                hint="Matrícula activa en cohorte"
              />
            </div>

            {/* Listado de Talleres */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Catálogo de Talleres y Estado de Listas
                </h3>
                <span className="text-xs text-slate-400">
                  Haz clic en «Pasar lista» para asentar o editar la cohorte
                </span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-400 text-sm">Cargando talleres...</div>
              ) : workshops.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400 font-semibold">No hay talleres registrados en la base de datos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {workshops.map((w) => {
                    const summary = workshopSummaries.find((s) => s.workshopId === w.id);
                    const isClosed = !!w.attendance_closed;

                    return (
                      <div
                        key={w.id}
                        className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                      >
                        {/* Info Principal */}
                        <div className="space-y-1.5 flex-1 min-w-[280px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                w.session_modality === 'in_person'
                                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                  : 'bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
                              }`}
                            >
                              {w.session_modality === 'in_person' ? 'Presencial' : 'En línea (Zoom)'}
                            </span>

                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                w.status === 'live'
                                  ? 'bg-red-100 text-red-700 animate-pulse'
                                  : w.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {w.status === 'live' ? 'En Vivo' : w.status === 'completed' ? 'Finalizado' : 'Programado'}
                            </span>

                            {isClosed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                                <Lock className="w-3 h-3" /> Lista Cerrada
                              </span>
                            ) : summary?.rollCallStatus === 'incomplete' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                                <Clock className="w-3 h-3" /> Incompleta ({summary.pendingCount} pendientes)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300">
                                <AlertTriangle className="w-3 h-3" /> Sin pase de lista
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-bold text-slate-900 dark:text-white">
                            {w.title}
                          </h4>

                          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {w.scheduled_at
                                ? new Date(w.scheduled_at).toLocaleDateString('es-MX', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Fecha por definir'}
                            </span>
                            {w.stream_url && (
                              <a
                                href={w.stream_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                <Video className="w-3.5 h-3.5" /> Enlace de transmisión
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Desglose y Barra de Distribución */}
                        {summary && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-5 lg:border-l lg:border-slate-100 dark:lg:border-slate-800 lg:pl-6">
                            <div className="space-y-1.5 min-w-[170px]">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-500">Asistencia</span>
                                <span className="text-slate-900 dark:text-white">
                                  {summary.attendancePct}%
                                </span>
                              </div>

                              {/* Barra apilada */}
                              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                                {summary.totalExpected > 0 && (
                                  <>
                                    <div
                                      style={{
                                        width: `${(summary.presentCount / summary.totalExpected) * 100}%`,
                                      }}
                                      className="bg-emerald-500 h-full"
                                      title={`Presentes: ${summary.presentCount}`}
                                    />
                                    <div
                                      style={{
                                        width: `${(summary.lateCount / summary.totalExpected) * 100}%`,
                                      }}
                                      className="bg-amber-500 h-full"
                                      title={`Retardos: ${summary.lateCount}`}
                                    />
                                    <div
                                      style={{
                                        width: `${(summary.excusedCount / summary.totalExpected) * 100}%`,
                                      }}
                                      className="bg-blue-500 h-full"
                                      title={`Justificadas: ${summary.excusedCount}`}
                                    />
                                    <div
                                      style={{
                                        width: `${(summary.absentCount / summary.totalExpected) * 100}%`,
                                      }}
                                      className="bg-rose-500 h-full"
                                      title={`Faltas: ${summary.absentCount}`}
                                    />
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {summary.presentCount} P
                                </span>
                                <span>·</span>
                                <span className="text-amber-600 dark:text-amber-400">
                                  {summary.lateCount} R
                                </span>
                                <span>·</span>
                                <span className="text-blue-600 dark:text-blue-400">
                                  {summary.excusedCount} J
                                </span>
                                <span>·</span>
                                <span className="text-rose-600 dark:text-rose-400">
                                  {summary.absentCount} F
                                </span>
                              </div>
                            </div>

                            {/* Botones de Acción */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setTab('pase', { workshopId: w.id })}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>{summary.rollCallStatus === 'not_started' ? 'Pasar lista' : 'Editar lista'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleAttendanceClosed(w.id, isClosed)}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                                title={isClosed ? 'Reabrir lista para edición' : 'Cerrar lista oficialmente'}
                              >
                                {isClosed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 2: PASE DE LISTA (COCKPIT DE CAPTURA)                             */}
        {/* ========================================================================= */}
        {currentTab === 'pase' && (
          <AttendanceCockpit
            workshops={workshops}
            selectedWorkshopId={selectedWorkshopId || workshops[0]?.id || ''}
            onSelectWorkshop={(id) => setTab('pase', { workshopId: id })}
            students={profiles}
            onSaved={load}
            onClose={() => setTab('sesiones')}
          />
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 3: AUDITORÍA Y ALUMNOS (HEATMAP + REGISTROS)                      */}
        {/* ========================================================================= */}
        {currentTab === 'alumnos' && (
          <div className="space-y-5">
            {/* Sub-toggle: Heatmap vs Tabla Plana */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Auditoría Académica de Cohorte
                </h3>
                <p className="text-xs text-slate-500">
                  Monitoreo de cumplimiento del 20% de asistencia exigido por la rúbrica oficial
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAlumnosSubView('heatmap')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    alumnosSubView === 'heatmap'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Matriz Heatmap</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAlumnosSubView('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    alumnosSubView === 'table'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Libro de Registros</span>
                </button>
              </div>
            </div>

            {/* Vista Matriz (Heatmap) */}
            {alumnosSubView === 'heatmap' && (
              <AttendanceCohortHeatmap
                students={profiles}
                workshops={workshops}
                records={cohortRecords}
              />
            )}

            {/* Vista Tabla de Registros Plana */}
            {alumnosSubView === 'table' && (
              <div className="space-y-5">
                <AdminAnalyticsScopeBar
                  student={scopedStudent}
                  cohortHref="/admin/alumnos/asistencias?tab=alumnos"
                  studentLabel="Asistencias del alumno"
                  actions={
                    <button
                      type="button"
                      onClick={() => setTab('pase')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Pase de lista
                    </button>
                  }
                />

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <AnalyticsKpi label="Registros" value={filtered.length} />
                  <AnalyticsKpi
                    label="Presentes"
                    value={filtered.filter((row) => row.status === 'present').length}
                  />
                  <AnalyticsKpi
                    label="Retardos"
                    value={filtered.filter((row) => row.status === 'late').length}
                  />
                  <AnalyticsKpi
                    label="Faltas"
                    value={filtered.filter((row) => row.status === 'absent').length}
                  />
                  <AnalyticsKpi
                    label="Asistencia"
                    value={`${attendancePct}%`}
                    hint="Ponderada (retardo = 80%)"
                  />
                </div>

                <AnalyticsFilterGrid>
                  <AnalyticsField label="Buscar">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={filters.search}
                        onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                        placeholder="Alumno, sesión o notas..."
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

                  <AnalyticsField label="Modalidad">
                    <select
                      value={filters.modality}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          modality: e.target.value as AttendanceAnalyticsFilters['modality'],
                        }))
                      }
                      className={analyticsControlClass()}
                    >
                      <option value="all">Presencial y en línea</option>
                      <option value="in_person">Presencial</option>
                      <option value="online">En línea</option>
                    </select>
                  </AnalyticsField>

                  <AnalyticsField label="Estatus">
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          status: e.target.value as AttendanceAnalyticsFilters['status'],
                        }))
                      }
                      className={analyticsControlClass()}
                    >
                      <option value="all">Todos los estatus</option>
                      {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </AnalyticsField>

                  <AnalyticsField label="Sesión o curso">
                    <select
                      value={filters.sessionTitle}
                      onChange={(e) => setFilters((prev) => ({ ...prev, sessionTitle: e.target.value }))}
                      className={analyticsControlClass()}
                    >
                      <option value="">Todas las sesiones</option>
                      {sessions.map((title) => (
                        <option key={title} value={title}>
                          {title}
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
                    <p className="px-5 py-10 text-sm text-slate-500 text-center">Cargando asistencias...</p>
                  ) : filtered.length === 0 ? (
                    <p className="px-5 py-10 text-sm text-slate-400 text-center">
                      No hay asistencias con los filtros seleccionados.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-left text-[10px] uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Alumno</th>
                            <th className="px-4 py-3">Sesión</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Modalidad</th>
                            <th className="px-4 py-3">Estatus</th>
                            <th className="px-4 py-3">Justificante / Notas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filtered.map((row) => (
                            <tr key={row.id} className="bg-white/70 dark:bg-slate-900/40">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-800 dark:text-slate-100">
                                  {row.studentName}
                                </p>
                                <p className="text-xs text-slate-400">{row.studentEmail}</p>
                              </td>
                              <td className="px-4 py-3 font-medium">{row.sessionTitle}</td>
                              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                {row.sessionDate
                                  ? new Date(`${row.sessionDate}T00:00:00`).toLocaleDateString('es-MX')
                                  : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-black ${
                                    row.modality === 'in_person'
                                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                      : 'bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
                                  }`}
                                >
                                  {MODALITY_LABELS[row.modality]}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs font-bold">
                                {STATUS_LABELS[row.status]}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500">
                                {row.excuseReason ? (
                                  <div>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400 block">
                                      {row.excuseReason}
                                    </span>
                                    {row.notes && <span className="text-slate-400 text-[11px]">{row.notes}</span>}
                                  </div>
                                ) : (
                                  row.notes || '—'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
