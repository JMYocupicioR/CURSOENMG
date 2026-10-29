import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  Activity,
  ChevronRight,
  Sliders,
  Calendar,
  FileText,
  UserCheck,
  AlertTriangle,
  BookOpen,
  FileQuestion,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getAdminProfiles } from '../../services/editorialService';
import { getCohortAcademicSummaries } from '../../services/gradebookService';
import { filterGradeableStudents } from '../../utils/adminUtils';
import { useAuth } from '../../contexts/AuthProvider';
import GradebookConfigModal from './GradebookConfigModal';
import AttendanceTrackerModal from './AttendanceTrackerModal';
import StudentKardexModal from './StudentKardexModal';
import AssignExamModal from './AssignExamModal';
import { AssignClinicalCaseModal } from './AssignClinicalCaseModal';
import type { AdminProfileRow } from '../../types/admin';
import type { StudentCohortSummary } from '../../types/academicGradebook';
import { BRAND } from '../../config/brand';

export default function AdminStudentsListPage() {
  const location = useLocation();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [summaries, setSummaries] = useState<Map<string, StudentCohortSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterResidency, setFilterResidency] = useState<string>('all');
  const [filterCompliance, setFilterCompliance] = useState<string>('all');

  // Modals state
  const [showRubricsModal, setShowRubricsModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showAssignExamModal, setShowAssignExamModal] = useState(false);
  const [showAssignCaseModal, setShowAssignCaseModal] = useState(false);
  const [kardexStudent, setKardexStudent] = useState<AdminProfileRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAdminProfiles(false, 'all');
      const studentsOnly = filterGradeableStudents(data, user?.id);
      setProfiles(studentsOnly);
      const summMap = await getCohortAcademicSummaries(studentsOnly);
      setSummaries(summMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.display_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.institution && p.institution.toLowerCase().includes(q)) ||
        (p.cedula_profesional && p.cedula_profesional.includes(q));

      const matchResidency =
        filterResidency === 'all'
          ? true
          : (p.residency_year || '').toLowerCase().includes(filterResidency.toLowerCase());

      const sSummary = summaries.get(p.id);
      const matchCompliance =
        filterCompliance === 'all'
          ? true
          : sSummary?.complianceStatus === filterCompliance;

      return matchSearch && matchResidency && matchCompliance;
    });
  }, [profiles, search, filterResidency, filterCompliance, summaries]);

  // Cohort global aggregates
  const cohortMetrics = useMemo(() => {
    if (profiles.length === 0 || summaries.size === 0) {
      return {
        avgProgress: 0,
        avgGrade: 0,
        avgAttendance: 0,
        atRiskCount: 0,
      };
    }

    let sumProg = 0;
    let sumGrade = 0;
    let sumAtt = 0;
    let atRisk = 0;

    profiles.forEach((p) => {
      const s = summaries.get(p.id);
      if (s) {
        sumProg += s.overallProgressPct;
        sumGrade += s.finalWeightedGrade;
        sumAtt += s.attendancePct ?? 0;
        if (s.complianceStatus === 'at_risk' || s.complianceStatus === 'lagging') {
          atRisk++;
        }
      }
    });

    const count = profiles.length;
    return {
      avgProgress: Math.round(sumProg / count),
      avgGrade: Math.round((sumGrade / count) * 10) / 10,
      avgAttendance: Math.round(sumAtt / count),
      atRiskCount: atRisk,
    };
  }, [profiles, summaries]);

  return (
    <AdminLayout
      title="Alumnos"
      subtitle="Expediente de la cohorte, calificaciones ponderadas, asistencias y planes académicos"
    >
      <div className="space-y-6 pb-20">
        {/* Top Control Bar: Action Buttons */}
        <div className="hidden lg:flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-1">
              Gestión Docente:
            </span>

            <button
              type="button"
              onClick={() => setShowRubricsModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Configurar Rúbricas</span>
            </button>

            <Link
              to="/admin/calendario"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/80 border border-violet-200 dark:border-violet-800 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span>Calendarización & Checklist</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowAttendanceModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Pase de Lista</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAssignExamModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>+ Asignar Examen Masivo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAssignCaseModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>+ Asignar Caso EMG</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {BRAND.enableAccreditation ? (
                <>Evaluación avalada por <strong>COMEFYR</strong></>
              ) : (
                <>Evaluación Oficial del <strong>Diplomado</strong></>
              )}
            </span>
          </div>
        </div>

        {/* Enhanced Cohort Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Total Médicos Cursistas
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {profiles.length}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {profiles.filter((p) => p.enrollment_status === 'approved').length} admitidos
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {profiles.filter((p) => p.cedula_verified).length} con Cédula SEP verificada
            </div>
          </div>

          <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Avance Curricular Promedio
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {cohortMetrics.avgProgress}%
              </span>
              <span className="text-xs font-semibold text-slate-400">Cohorte general</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-700/70 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500 min-w-[6px]"
                style={{ width: `${Math.max(2, cohortMetrics.avgProgress)}%` }}
              />
            </div>
          </div>

          <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Promedio General de Notas
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {cohortMetrics.avgGrade}
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                / 100 pts
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Ponderación según rúbrica académica activa
            </div>
          </div>

          <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Asistencia & Cumplimiento
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {cohortMetrics.avgAttendance}%
              </span>
              {cohortMetrics.atRiskCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> {cohortMetrics.atRiskCount} con rezago
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-600">Al corriente</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">Sesiones clínicas y talleres en vivo</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar alumno por nombre, correo, hospital o cédula..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterResidency}
              onChange={(e) => setFilterResidency(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              <option value="all">Todos los grados</option>
              <option value="R1">Residentes R1</option>
              <option value="R2">Residentes R2</option>
              <option value="R3">Residentes R3</option>
              <option value="R4">Residentes R4</option>
              <option value="adscrito">Médicos Adscritos</option>
            </select>

            <select
              value={filterCompliance}
              onChange={(e) => setFilterCompliance(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              <option value="all">Todo cumplimiento</option>
              <option value="on_track">Al corriente</option>
              <option value="at_risk">En riesgo</option>
              <option value="lagging">Rezagado</option>
            </select>
          </div>
        </div>

        {/* Enhanced Students List Table */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 overflow-hidden shadow-xs">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Cargando progreso y calificaciones de alumnos...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No se encontraron alumnos con los criterios seleccionados.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((student) => {
                const isApproved = student.enrollment_status === 'approved';
                const sSummary = summaries.get(student.id);
                const progressPct = sSummary?.overallProgressPct ?? 0;
                const completedTopics = sSummary?.completedTopicsCount ?? 0;
                const totalTopics = sSummary?.totalTopicsCount ?? 142;

                return (
                  <div
                    key={student.id}
                    className="p-5 sm:p-6 space-y-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Fila 1: Datos del Alumno y Acciones */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Identidad */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0 overflow-hidden">
                          {student.avatar_url ? (
                            <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            student.display_name?.slice(0, 2).toUpperCase() || 'DR'
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                              {student.display_name}
                            </h3>
                            {student.residency_year && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                                {student.residency_year}
                              </span>
                            )}
                            {student.cedula_verified && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> SEP Verificada
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {isApproved ? 'Admitido' : 'Pendiente'}
                            </span>
                            {isApproved && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                                  student.agreements_signed
                                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {student.agreements_signed ? 'Acuerdos firmados' : 'Sin firmar'}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 truncate max-w-lg">
                            {student.email} · <span className="text-slate-600 dark:text-slate-400 font-medium">{student.institution || 'Sede no registrada'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Estado de Calendario y Botones de Acción a la derecha */}
                      <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                        {sSummary && (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold shrink-0 ${
                              sSummary.complianceStatus === 'on_track'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : sSummary.complianceStatus === 'at_risk'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {sSummary.complianceStatus === 'on_track' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : sSummary.complianceStatus === 'at_risk' ? (
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            )}
                            <span>{sSummary.complianceLabel}</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setKardexStudent(student)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition shadow-2xs cursor-pointer"
                          title="Ver e Imprimir Kardex Académico Oficial"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Kardex</span>
                        </button>

                        <Link
                          to={`/admin/alumnos/${student.id}`}
                          state={{ from: location.pathname + location.search }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer group"
                        >
                          <Activity className="w-3.5 h-3.5 text-cyan-300 group-hover:scale-110 transition-transform" />
                          <span>Ver Expediente</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </Link>
                      </div>
                    </div>

                    {/* Fila 2: Panel de Desempeño: Barra de Progreso + Mini-Kardex */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Barra de Progreso Curricular (7 columnas en desktop) */}
                      <div className="md:col-span-7 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Avance en Plataforma</span>
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                              {progressPct}%
                            </span>
                            <span className="text-[11px] text-slate-400 font-semibold">completado</span>
                          </div>
                        </div>

                        <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-700/70 overflow-hidden p-0.5">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 rounded-full transition-all duration-500 min-w-[4px]"
                            style={{ width: `${Math.max(2, progressPct)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          <span>{completedTopics} de {totalTopics} temas estudiados</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {Math.round((progressPct / 100) * 40 * 10) / 10} / 40 créditos CME
                          </span>
                        </div>
                      </div>

                      {/* Mini-Kardex (5 columnas con borde divisorio) */}
                      <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-slate-200/80 dark:border-slate-700/80 pt-3 md:pt-0 md:pl-4">
                        {sSummary ? (
                          <div>
                          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
                            <Link
                              to={`/admin/alumnos/examenes?alumno=${student.id}`}
                              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs hover:border-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                              aria-label={`Analizar exámenes de ${student.display_name}`}
                              title="Análisis de exámenes del alumno"
                            >
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                                Exámenes
                              </span>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                {sSummary.examAverage == null ? '—' : `${sSummary.examAverage}%`}
                              </span>
                            </Link>

                            <Link
                              to={`/admin/alumnos/tareas?alumno=${student.id}`}
                              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs hover:border-violet-400 hover:bg-violet-50/70 dark:hover:bg-violet-950/40 transition cursor-pointer"
                              aria-label={`Ver tareas enviadas de ${student.display_name}`}
                              title="Tareas enviadas por el alumno"
                            >
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                                Tareas
                              </span>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                {sSummary.assignmentsSubmitted}/{sSummary.assignmentsTotal}
                              </span>
                            </Link>

                            <Link
                              to={`/admin/alumnos/asistencias?alumno=${student.id}`}
                              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs hover:border-emerald-400 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                              aria-label={`Ver asistencias de ${student.display_name}`}
                              title="Asistencias a cursos del alumno"
                            >
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                                Asist.
                              </span>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                {sSummary.attendancePct == null ? '—' : `${sSummary.attendancePct}%`}
                              </span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => setKardexStudent(student)}
                              className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 shadow-2xs hover:bg-indigo-100 dark:hover:bg-indigo-900/70 transition cursor-pointer"
                              aria-label={`Abrir kárdex y nota final de ${student.display_name}`}
                              title="Kárdex y ponderación de la calificación final"
                            >
                              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider block">
                                Nota Final
                              </span>
                              <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                                {sSummary.isOfficial ? sSummary.officialGrade : sSummary.finalWeightedGrade}
                              </span>
                            </button>
                          </div>
                          <p className="mt-2 text-[10px] text-slate-400 text-center md:text-right">
                            Clic en cada rubro para analizar datos o abrir el kárdex.
                          </p>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 text-center py-2">Calculando métricas...</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <GradebookConfigModal
        isOpen={showRubricsModal}
        onClose={() => setShowRubricsModal(false)}
        onSaved={loadData}
      />

      <AttendanceTrackerModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        profiles={profiles}
        onSaved={loadData}
      />

      {kardexStudent && (
        <StudentKardexModal
          isOpen={Boolean(kardexStudent)}
          onClose={() => setKardexStudent(null)}
          studentId={kardexStudent.id}
          profile={kardexStudent}
        />
      )}

      <AssignExamModal
        isOpen={showAssignExamModal}
        onClose={() => setShowAssignExamModal(false)}
        profiles={profiles}
        onAssigned={loadData}
      />

      <AssignClinicalCaseModal
        isOpen={showAssignCaseModal}
        onClose={() => setShowAssignCaseModal(false)}
        profiles={profiles}
        onAssigned={loadData}
      />
    </AdminLayout>
  );
}
