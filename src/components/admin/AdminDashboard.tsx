import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck,
  CheckCircle2,
  Video,
  Sparkles,
  ArrowRight,
  Check,
  Activity,
  Clock,
  RotateCcw,
  Calendar,
  AlertTriangle,
  FileQuestion,
  ChevronDown,
  UserCheck,
  ExternalLink,
  Pencil,
  GraduationCap,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  getAdminProfiles,
  getPendingRevisions,
  reviewRevision,
  verifyPhysicianEnrollment,
} from '../../services/editorialService';
import {
  getAdminCourseWaitlist,
  adminAdmitStudentAndApproveProfile,
} from '../../services/courseService';
import {
  getTeacherPendingReviewItems,
  approveExamRetake,
  rejectExamRetake,
} from '../../services/studentPlanService';
import {
  listQuizzesForValidation,
  setQuizValidationStatus,
} from '../../services/quizValidationService';
import { findDuplicateStems } from '../../utils/quizDuplicates';
import { allModules } from '../../content/modules';
import { getCohortAcademicSummaries } from '../../services/gradebookService';
import { filterGradeableStudents } from '../../utils/adminUtils';
import { useAuth } from '../../contexts/AuthProvider';
import type { AdminProfileRow } from '../../types/admin';
import type { CourseWaitlistRow, ContentRevision } from '../../types/database';
import type { TeacherPendingReviewItem } from '../../types/studentPlan';
import type { QuizValidationItem } from '../../types/quiz';
import type { StudentCohortSummary } from '../../types/academicGradebook';
import type { CalendarItem } from '../../types/academicCalendar';
import { loadAcademicCalendarFeed } from '../../services/academicCalendarService';
import { itemsInRange, startOfWeekMonday, endOfWeekMonday } from '../../utils/academicCalendar';

// Teacher Modals
import TeacherQuickGradeModal from './TeacherQuickGradeModal';
import AssignExamModal from './AssignExamModal';
import { AssignClinicalCaseModal } from './AssignClinicalCaseModal';
import AttendanceTrackerModal from './AttendanceTrackerModal';
import StudentKardexModal from './StudentKardexModal';
import { CreateLiveClassModal } from './CreateLiveClassModal';
import { TopicAdoptionInbox } from './TopicAdoptionInbox';

export default function AdminDashboard() {
  const { user, profile, isAdmin } = useAuth();

  // State for data
  const [waitlistItems, setWaitlistItems] = useState<CourseWaitlistRow[]>([]);
  const [profilePending, setProfilePending] = useState<AdminProfileRow[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<TeacherPendingReviewItem[]>([]);
  const [pendingTopicRevisions, setPendingTopicRevisions] = useState<ContentRevision[]>([]);
  const [pendingQuizzes, setPendingQuizzes] = useState<QuizValidationItem[]>([]);
  const [pendingRetakes, setPendingRetakes] = useState<TeacherPendingReviewItem[]>([]);
  const [allProfiles, setAllProfiles] = useState<AdminProfileRow[]>([]);
  const [cohortSummaries, setCohortSummaries] = useState<Map<string, StudentCohortSummary>>(new Map());
  const [weekItems, setWeekItems] = useState<CalendarItem[]>([]);

  // Action busy states
  const [admittingId, setAdmittingId] = useState<string | null>(null);
  const [approvingRevId, setApprovingRevId] = useState<string | null>(null);
  const [approvingQuizId, setApprovingQuizId] = useState<string | null>(null);
  const [retakeActionId, setRetakeActionId] = useState<string | null>(null);
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [gradingItem, setGradingItem] = useState<TeacherPendingReviewItem | null>(null);
  const [kardexStudent, setKardexStudent] = useState<AdminProfileRow | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showAssignExamModal, setShowAssignExamModal] = useState(false);
  const [showAssignCaseModal, setShowAssignCaseModal] = useState(false);
  const [showCreateLiveClassModal, setShowCreateLiveClassModal] = useState(false);

  const assignDropdownRef = useRef<HTMLDivElement>(null);

  // Close Assign dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(e.target as Node)) {
        setShowAssignDropdown(false);
      }
    }
    if (showAssignDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAssignDropdown]);

  const loadData = async () => {
    try {
      const [allActiveProfiles, waitlistData, pendingProfiles, revisionsData, quizzesData] = await Promise.all([
        getAdminProfiles(false, 'all').catch(() => []),
        getAdminCourseWaitlist(null, 'pending')
          .then((rows) => {
            setWaitlistError(null);
            return rows;
          })
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : 'No se pudo leer la lista de espera';
            setWaitlistError(message);
            return [] as CourseWaitlistRow[];
          }),
        getAdminProfiles(false, 'enrollment_pending').catch(() => [] as AdminProfileRow[]),
        getPendingRevisions().catch(() => []),
        listQuizzesForValidation().catch(() => []),
      ]);

      setWaitlistItems(waitlistData);
      const queuedIds = new Set(waitlistData.map((row) => row.user_id));
      setProfilePending(
        pendingProfiles.filter(
          (profile) => profile.enrollment_status === 'pending' && !queuedIds.has(profile.id)
        )
      );
      setPendingTopicRevisions(revisionsData);

      // Quizzes pendientes de validación clínica
      const pendingQ = (quizzesData as QuizValidationItem[]).filter(
        (q) => (q.clinical_validation_status ?? 'pending_review') === 'pending_review'
      );
      setPendingQuizzes(pendingQ);

      // Filter only real students
      const studentsOnly = filterGradeableStudents(allActiveProfiles, user?.id);
      setAllProfiles(studentsOnly);

      // Calendar feed
      const calendarFeed = await loadAcademicCalendarFeed(studentsOnly).catch(() => ({
        items: [] as CalendarItem[],
        warnings: [],
      }));
      setWeekItems(calendarFeed.items);

      // Teacher inbox: Submissions & Exam retakes
      const { pendingSubmissions: subs, pendingRetakes: rets } =
        await getTeacherPendingReviewItems(studentsOnly);
      setPendingSubmissions(subs);
      setPendingRetakes(rets);

      // Summaries for at-risk students
      const summaries = await getCohortAcademicSummaries(studentsOnly);
      setCohortSummaries(summaries);
    } catch (e) {
      console.error('[AdminDashboard] Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const admissionCount = waitlistItems.length + profilePending.length;

  const handleApproveProfile = async (profile: AdminProfileRow) => {
    setAdmittingId(profile.id);
    try {
      await verifyPhysicianEnrollment(profile.id);
      setSuccessMessage(`¡Dr(a). ${profile.display_name} quedó aprobado(a)!`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(`Error al aprobar al médico: ${err?.message || 'Error inesperado'}`);
    } finally {
      setAdmittingId(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // 1. Quick Admit for Waitlist row
  const handleQuickAdmit = async (item: CourseWaitlistRow) => {
    setAdmittingId(item.enrollment_id);
    try {
      await adminAdmitStudentAndApproveProfile(item.user_id, item.course_id, {
        method: 'transferencia',
        notes: 'Admitido directamente desde la Bandeja del profesor',
      });
      setSuccessMessage(`¡Dr(a). ${item.display_name} ha sido admitido(a) a ${item.course_title}!`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(`Error al admitir al médico: ${err?.message || 'Error inesperado'}`);
    } finally {
      setAdmittingId(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // 2. Quick Approve topic revision
  const handleQuickApproveTopic = async (revId: string, title?: string) => {
    setApprovingRevId(revId);
    try {
      await reviewRevision(revId, 'approved', 'Aprobado directamente desde la Bandeja docente.');
      setSuccessMessage(`¡Tema "${title || 'propuesta'}" aprobado exitosamente!`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(`Error al aprobar tema: ${err?.message || 'Error inesperado'}`);
    } finally {
      setApprovingRevId(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // 3. Quick Approve Quiz Clinical Validation
  const handleApproveQuiz = async (quiz: QuizValidationItem) => {
    setApprovingQuizId(quiz.id);
    try {
      await setQuizValidationStatus([quiz.id], 'approved', 'Aprobado directamente desde la Bandeja docente.');
      setSuccessMessage(`¡Evaluación "${quiz.title || quiz.topic_id}" aprobada exitosamente!`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(`Error al aprobar evaluación: ${err?.message || 'Error inesperado'}`);
    } finally {
      setApprovingQuizId(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // 4. Quick Reject Quiz Clinical Validation
  const handleRejectQuiz = async (quiz: QuizValidationItem) => {
    const reason = window.prompt(
      `Indica el motivo del rechazo para la evaluación "${quiz.title || quiz.topic_id}":`,
      'Requiere ajuste de reactivos o claves de respuesta.'
    );
    if (!reason) return;

    setApprovingQuizId(quiz.id);
    try {
      await setQuizValidationStatus([quiz.id], 'rejected', reason);
      setSuccessMessage(`Evaluación "${quiz.title || quiz.topic_id}" marcada como rechazada.`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(`Error al rechazar evaluación: ${err?.message || 'Error inesperado'}`);
    } finally {
      setApprovingQuizId(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // 5. Approve retake
  const handleApproveRetake = async (item: TeacherPendingReviewItem) => {
    setRetakeActionId(item.assignment.id);
    try {
      await approveExamRetake(
        item.assignment.id,
        item.assignment.student_id,
        profile?.display_name || 'Profesor Titular',
        'Reintento autorizado por el Profesor Titular.'
      );
      setSuccessMessage('¡Solicitud de reintento aprobada! El alumno cuenta con 1 nuevo intento.');
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Error al aprobar el reintento.');
    } finally {
      setRetakeActionId(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // 6. Reject retake
  const handleRejectRetake = async (item: TeacherPendingReviewItem) => {
    const reason = window.prompt(
      'Indica el motivo del rechazo para notificar al médico cursista:',
      'Periodo de evaluaciones concluido o cupo de intentos alcanzado.'
    );
    if (!reason) return;

    setRetakeActionId(item.assignment.id);
    try {
      await rejectExamRetake(
        item.assignment.id,
        item.assignment.student_id,
        profile?.display_name || 'Profesor Titular',
        reason
      );
      setSuccessMessage('Solicitud de reintento rechazada con notificación al alumno.');
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Error al rechazar el reintento.');
    } finally {
      setRetakeActionId(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Submissions sorted OLDEST first (la más antigua arriba)
  const sortedSubmissions = useMemo(() => {
    return [...pendingSubmissions].sort((a, b) => {
      const da = a.assignment.submitted_at || a.assignment.updated_at;
      const db = b.assignment.submitted_at || b.assignment.updated_at;
      return new Date(da).getTime() - new Date(db).getTime();
    });
  }, [pendingSubmissions]);

  // Quizzes sorted by module sequence and title
  const sortedPendingQuizzes = useMemo(() => {
    const moduleOrder = new Map(allModules.map((mod, index) => [mod.id, mod.number || index + 1]));
    return [...pendingQuizzes].sort((a, b) => {
      const orderA = moduleOrder.get(a.module_id) ?? 99;
      const orderB = moduleOrder.get(b.module_id) ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.title ?? a.topic_id).localeCompare(b.title ?? b.topic_id, 'es');
    });
  }, [pendingQuizzes]);

  // Duplicate questions detection for quizzes
  const duplicateQuizIds = useMemo(() => {
    const rows = pendingQuizzes.flatMap((quiz) =>
      (quiz.questions ?? []).map((q) => ({
        quizId: quiz.id,
        topicId: quiz.topic_id,
        stem: q.stem,
      }))
    );
    const hits = findDuplicateStems(rows);
    const set = new Set<string>();
    for (const hit of hits.values()) {
      for (const qId of hit.quizIds) {
        set.add(qId);
      }
    }
    return set;
  }, [pendingQuizzes]);

  const displayedQuizzes = useMemo(() => {
    return showAllQuizzes ? sortedPendingQuizzes : sortedPendingQuizzes.slice(0, 6);
  }, [sortedPendingQuizzes, showAllQuizzes]);

  // Alumnos en riesgo
  const atRiskStudents = useMemo(() => {
    return allProfiles
      .map((p) => {
        const summary = cohortSummaries.get(p.id);
        return { profile: p, summary };
      })
      .filter(({ summary }) => {
        if (!summary) return false;
        return (
          summary.complianceStatus === 'at_risk' ||
          summary.complianceStatus === 'lagging' ||
          summary.finalWeightedGrade < 70
        );
      });
  }, [allProfiles, cohortSummaries]);

  // Next class this week (single line)
  const thisWeekClass = useMemo(() => {
    const now = new Date();
    const currentWeekItems = itemsInRange(weekItems, startOfWeekMonday(now), endOfWeekMonday(now));
    const liveWorkshop = currentWeekItems.find((i) => i.type === 'workshop' || i.type === 'class');
    return liveWorkshop || currentWeekItems[0] || null;
  }, [weekItems]);

  return (
    <AdminLayout
      title="Bandeja"
      subtitle="Decisiones que esperan tu firma y gestión directa de la cohorte."
    >
      {/* ── Barra Chica de Acciones de Clase (3 Acciones) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1">
            Acciones de clase:
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. Pase de lista */}
          <button
            type="button"
            onClick={() => setShowAttendanceModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Pase de lista</span>
          </button>

          {/* 2. Asignar (menú con Examen y Caso EMG) */}
          <div className="relative" ref={assignDropdownRef}>
            <button
              type="button"
              onClick={() => setShowAssignDropdown(!showAssignDropdown)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Asignar</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAssignDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showAssignDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 z-30 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignDropdown(false);
                    setShowAssignExamModal(true);
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                >
                  <FileQuestion className="w-4 h-4 text-indigo-500" />
                  <span>Examen</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignDropdown(false);
                    setShowAssignCaseModal(true);
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-600 dark:hover:text-teal-400 transition cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-teal-500" />
                  <span>Caso EMG</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Clase en vivo */}
          <button
            type="button"
            onClick={() => setShowCreateLiveClassModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition shadow-sm shadow-rose-600/20 cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span>Clase en vivo</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          BANDEJA: COLA DE DECISIONES CORTAS
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-8">
        {/* ── 1. Médicos en lista de espera (con Admitir en la misma fila) ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Médicos en lista de espera</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    waitlistError
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      : admissionCount > 0
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {waitlistError ? 'sin lectura' : `${admissionCount} por admitir`}
                </span>
              </h2>
            </div>
            <Link
              to="/admin/admisiones"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Ver todas las admisiones →
            </Link>
          </div>

          {waitlistError ? (
            <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>No se pudo leer la lista de espera: {waitlistError}</span>
            </div>
          ) : admissionCount === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Al día: no hay solicitudes de médicos en lista de espera pendientes de admisión.</span>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
              {profilePending.map((profile) => (
                <div
                  key={profile.id}
                  className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {(profile.display_name || 'M').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {profile.display_name || 'Médico sin nombre'}
                        </p>
                        <span className="px-2 py-0.2 rounded-md text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          Perfil por aprobar
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {profile.specialty || profile.institution || profile.email}
                        {profile.cedula_profesional ? ` · Cédula: ${profile.cedula_profesional}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      disabled={admittingId === profile.id}
                      onClick={() => handleApproveProfile(profile)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{admittingId === profile.id ? 'Aprobando...' : 'Aprobar'}</span>
                    </button>
                  </div>
                </div>
              ))}
              {waitlistItems.map((item) => (
                <div
                  key={item.enrollment_id}
                  className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {item.display_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {item.display_name}
                        </p>
                        <span className="px-2 py-0.2 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.course_title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.specialty || item.institution || item.email}
                        {item.cedula_profesional ? ` · Cédula: ${item.cedula_profesional}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.requested_at).toLocaleDateString('es-MX')}
                    </span>
                    <button
                      type="button"
                      disabled={admittingId === item.enrollment_id}
                      onClick={() => handleQuickAdmit(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{admittingId === item.enrollment_id ? 'Admitiendo...' : 'Admitir'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 2. Entregas por calificar (la más antigua arriba, con Calificar en la fila) ── */}
        <section>
            <div className="flex items-center justify-between mb-3 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <FileCheck className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Entregas por calificar</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    sortedSubmissions.length > 0
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {sortedSubmissions.length} por calificar
                </span>
              </h2>
            </div>
            <Link
              to="/admin/alumnos/tareas?nueva=1"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shrink-0"
            >
              Nueva tarea
            </Link>
          </div>

          {sortedSubmissions.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Al día: no hay tareas ni casos clínicos pendientes de calificación en este momento.</span>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
              {sortedSubmissions.map((item) => {
                const { assignment, studentProfile } = item;
                const submittedDate = assignment.submitted_at
                  ? new Date(assignment.submitted_at).toLocaleDateString('es-MX', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Reciente';

                return (
                  <div
                    key={assignment.id}
                    className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-xs"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0">
                        {studentProfile?.display_name?.charAt(0) || 'M'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {studentProfile?.display_name || 'Médico Cursista'}
                          </p>
                          <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                            {assignment.type === 'clinical_case'
                              ? 'Caso EMG'
                              : assignment.type === 'emg_report'
                              ? 'Reporte de Trazos'
                              : 'Tarea Práctica'}
                          </span>
                        </div>
                        <p className="font-medium text-slate-700 dark:text-slate-300 truncate mt-0.5">
                          {assignment.title}
                        </p>
                        {assignment.student_notes && (
                          <p className="text-[11px] text-slate-500 italic truncate">
                            "{assignment.student_notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{submittedDate}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGradingItem(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Calificar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 3. Cola de revisión de quizzes y exámenes (Validación clínica) ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Cola de revisión de quizzes</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    pendingQuizzes.length > 0
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {pendingQuizzes.length} {pendingQuizzes.length === 1 ? 'examen pendiente' : 'exámenes pendientes de revisión'}
                </span>
              </h2>
            </div>
            {pendingQuizzes.length > 0 && (
              <Link
                to="/admin/revisiones?tab=clinical"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Abrir validación clínica completa →
              </Link>
            )}
          </div>

          {pendingQuizzes.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Al día: no hay exámenes ni cuestionarios pendientes de revisión clínica.</span>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
              {displayedQuizzes.map((quiz) => {
                const title = quiz.title || `Evaluación: ${quiz.topic_id}`;
                const mod = allModules.find((m) => m.id === quiz.module_id);
                const modLabel = mod ? `Módulo ${mod.number}: ${mod.title}` : `Módulo ${quiz.module_id}`;
                const isDuplicate = duplicateQuizIds.has(quiz.id);

                return (
                  <div
                    key={quiz.id}
                    className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-xs"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0">
                        Q
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {title}
                          </p>
                          <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            Pendiente
                          </span>
                          {isDuplicate && (
                            <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              Duplicado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          <span className="font-medium text-slate-600 dark:text-slate-400">{modLabel}</span>
                          {' · '}
                          <span>{quiz.topic_id}</span>
                          {' · '}
                          <span>{quiz.question_count ?? (quiz.questions?.length || 0)} reactivos</span>
                          {' · '}
                          <span>{quiz.attempt_count ?? 0} intentos</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 flex-wrap">
                      <Link
                        to={`/admin/quizzes/${quiz.topic_id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 transition text-[11px]"
                      >
                        <Pencil className="w-3 h-3 text-slate-400" />
                        <span>Corregir</span>
                      </Link>
                      <Link
                        to={`/tema/${quiz.topic_id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 transition text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <span>Ver tema</span>
                      </Link>
                      <button
                        type="button"
                        disabled={approvingQuizId === quiz.id}
                        onClick={() => handleRejectQuiz(quiz)}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold transition disabled:opacity-50 cursor-pointer text-[11px]"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        disabled={approvingQuizId === quiz.id}
                        onClick={() => handleApproveQuiz(quiz)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xs transition disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{approvingQuizId === quiz.id ? 'Aprobando...' : 'Aprobar'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {pendingQuizzes.length > 6 && (
                <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 text-center flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAllQuizzes(!showAllQuizzes)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {showAllQuizzes
                      ? 'Mostrar menos'
                      : `Ver los ${pendingQuizzes.length} exámenes pendientes en esta lista (${pendingQuizzes.length - 6} más)`}
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <Link
                    to="/admin/revisiones?tab=clinical"
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Ir a panel de validación clínica</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── 4. Todos los pendientes de aprobación de los temas (Cola editorial) ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <FileCheck className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Temas pendientes de aprobación</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    pendingTopicRevisions.length > 0
                      ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {pendingTopicRevisions.length} propuestas
                </span>
              </h2>
            </div>
            {pendingTopicRevisions.length > 0 && (
              <Link
                to="/admin/revisiones"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Abrir cola editorial completa →
              </Link>
            )}
          </div>

          {pendingTopicRevisions.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Al día: no hay temas ni propuestas editoriales pendientes de aprobación en el temario.</span>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
              {pendingTopicRevisions.map((rev) => {
                const title = rev.payload?.title || rev.target_topic_id || 'Tema en revisión';
                const isQuiz = rev.payload?.revisionType === 'quiz';
                return (
                  <div
                    key={rev.id}
                    className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {isQuiz ? 'Q' : 'T'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {title}
                          </p>
                          <span className="px-2 py-0.2 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                            {isQuiz ? 'Evaluación' : `Módulo ${rev.module_id}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          Acción: {rev.action === 'create' ? 'Nuevo tema' : 'Modificación curricular'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <Link
                        to="/admin/revisiones"
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 transition text-[11px]"
                      >
                        Revisar
                      </Link>
                      <button
                        type="button"
                        disabled={approvingRevId === rev.id}
                        onClick={() => handleQuickApproveTopic(rev.id, title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-2xs transition disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{approvingRevId === rev.id ? 'Aprobando...' : 'Aprobar Tema'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 5. Reintentos de examen (con Aprobar o Rechazar) ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                <RotateCcw className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Reintentos de examen</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    pendingRetakes.length > 0
                      ? 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {pendingRetakes.length} solicitudes
                </span>
              </h2>
            </div>
          </div>

          {pendingRetakes.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Sin solicitudes de reintento de examen pendientes.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingRetakes.map((ret) => (
                <div
                  key={ret.assignment.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          {ret.studentProfile?.display_name || 'Médico Cursista'}
                        </p>
                        <p className="text-slate-400 text-[11px]">{ret.studentProfile?.email}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                        Reintento Solicitado
                      </span>
                    </div>

                    <div className="mt-2 text-slate-600 dark:text-slate-300 space-y-1">
                      <p>
                        <strong className="text-slate-700 dark:text-slate-200">Examen:</strong> {ret.assignment.title}
                      </p>
                      {ret.assignment.target_exam_config?.retakeReason && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-[11px] italic">
                          "{ret.assignment.target_exam_config.retakeReason}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={retakeActionId === ret.assignment.id}
                      onClick={() => handleRejectRetake(ret)}
                      className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold transition disabled:opacity-50 cursor-pointer text-xs"
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      disabled={retakeActionId === ret.assignment.id}
                      onClick={() => handleApproveRetake(ret)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shadow-2xs disabled:opacity-50 cursor-pointer text-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Aprobar (+1 Intento)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 6. Alumnos en riesgo (con nombre, calificación y enlace a kárdex) ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Alumnos en riesgo</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    atRiskStudents.length > 0
                      ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {atRiskStudents.length} en alerta
                </span>
              </h2>
            </div>
            <Link
              to="/admin/alumnos"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Ver todos los alumnos →
            </Link>
          </div>

          {atRiskStudents.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Excelente: ningún alumno de la cohorte se encuentra en estado de riesgo o rezago académico.</span>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
              {atRiskStudents.slice(0, 5).map(({ profile: std, summary }) => (
                <div
                  key={std.id}
                  className="p-3.5 sm:px-4 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {std.display_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {std.display_name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {std.institution || std.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                      {summary?.finalWeightedGrade ?? 0} pts · {summary?.complianceLabel || 'En riesgo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setKardexStudent(std)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 transition text-[11px] cursor-pointer"
                    >
                      Ver Kárdex
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <TopicAdoptionInbox onChanged={loadData} />

        {/* ── 7. La clase de esta semana (una sola línea del calendario) ── */}
        <section className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              {thisWeekClass ? (
                <p className="text-slate-800 dark:text-slate-200 truncate">
                  <strong className="text-slate-900 dark:text-white">Esta semana:</strong>{' '}
                  <span className="text-indigo-600 dark:text-cyan-400 font-semibold">
                    {new Date(thisWeekClass.startsAt).toLocaleDateString('es-MX', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>{' '}
                  · {thisWeekClass.title}
                </p>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">
                  <strong className="text-slate-700 dark:text-slate-300">Esta semana:</strong> Sin clase en vivo o evento programado.
                </p>
              )}
            </div>
          </div>

          <Link
            to="/admin/calendario"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
          >
            <span>{thisWeekClass ? 'Abrir calendario' : 'Programar en el calendario'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          MODALES DE DOCENCIA Y ACCIONES
          ══════════════════════════════════════════════════════════════════════════ */}
      {/* 1. Modal Rápido de Calificación */}
      <TeacherQuickGradeModal
        isOpen={Boolean(gradingItem)}
        onClose={() => setGradingItem(null)}
        item={gradingItem}
        onGraded={() => {
          setSuccessMessage('¡Calificación y retroalimentación guardadas con éxito!');
          loadData();
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
      />

      {/* 2. Asignar Examen */}
      <AssignExamModal
        isOpen={showAssignExamModal}
        onClose={() => setShowAssignExamModal(false)}
        profiles={allProfiles}
        onAssigned={() => {
          setSuccessMessage('¡Examen asignado exitosamente al grupo!');
          loadData();
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
      />

      {/* 3. Asignar Caso Clínico EMG */}
      <AssignClinicalCaseModal
        isOpen={showAssignCaseModal}
        onClose={() => setShowAssignCaseModal(false)}
        profiles={allProfiles}
        onAssigned={() => {
          setSuccessMessage('¡Caso clínico EMG asignado exitosamente!');
          loadData();
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
      />

      {/* 4. Pase de Lista / Asistencia */}
      <AttendanceTrackerModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        profiles={allProfiles}
        onSaved={() => {
          setSuccessMessage('¡Asistencia registrada correctamente!');
          loadData();
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
      />

      {/* 5. Kárdex del Alumno */}
      {kardexStudent && (
        <StudentKardexModal
          isOpen={Boolean(kardexStudent)}
          onClose={() => setKardexStudent(null)}
          studentId={kardexStudent.id}
          profile={kardexStudent}
        />
      )}

      {/* 6. Crear Clase en Vivo */}
      <CreateLiveClassModal
        isOpen={showCreateLiveClassModal}
        onClose={() => setShowCreateLiveClassModal(false)}
        onSuccess={async () => {
          await loadData();
          setSuccessMessage('¡Clase programada / grabación actualizada correctamente!');
          setTimeout(() => setSuccessMessage(null), 4000);
          return true;
        }}
      />
    </AdminLayout>
  );
}
