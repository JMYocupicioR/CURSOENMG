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
import { calendarItemStartDate, itemsInRange, startOfWeekMonday, endOfWeekMonday } from '../../utils/academicCalendar';

// Teacher Modals
import TeacherQuickGradeModal from './TeacherQuickGradeModal';
import AssignExamModal from './AssignExamModal';
import { AssignClinicalCaseModal } from './AssignClinicalCaseModal';
import AttendanceTrackerModal from './AttendanceTrackerModal';
import StudentKardexModal from './StudentKardexModal';
import { CreateLiveClassModal } from './CreateLiveClassModal';
import { TopicAdoptionInbox, type TopicAdoptionSummary } from './TopicAdoptionInbox';

interface CollapsibleDashboardSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgClass: string;
  badgeContent: React.ReactNode;
  badgeVariant?: 'alarm' | 'success' | 'warning' | 'info' | 'neutral';
  headerAction?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleDashboardSection({
  title,
  subtitle,
  icon,
  iconBgClass,
  badgeContent,
  badgeVariant = 'neutral',
  headerAction,
  isOpen,
  onToggle,
  children,
}: CollapsibleDashboardSectionProps) {
  const isAlarm = badgeVariant === 'alarm';

  return (
    <section
      className={`rounded-3xl border transition-colors bg-white dark:bg-slate-900 overflow-hidden shadow-xs ${
        isAlarm
          ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20 hover:border-rose-400 dark:hover:border-rose-700'
          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* ── Clickable Header Bar ── */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isOpen}
        className="w-full p-4 flex flex-wrap items-center justify-between gap-3 text-left cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold shrink-0 transition-transform ${
              isOpen ? 'scale-105' : ''
            } ${iconBgClass}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
              {badgeContent}
            </div>
            {subtitle && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          {headerAction && (
            <div onClick={(e) => e.stopPropagation()}>
              {headerAction}
            </div>
          )}
          <button
            type="button"
            className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            aria-label={isOpen ? 'Colapsar sección' : 'Expandir sección'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Collapsible Content ── */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20">
          {children}
        </div>
      )}
    </section>
  );
}

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

  // Topic Adoption summary & collapsible sections state (all collapsed by default)
  const [topicSummary, setTopicSummary] = useState<TopicAdoptionSummary | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allSectionIds = ['topics', 'submissions', 'waitlist', 'quizzes', 'editorial', 'retakes', 'atRisk', 'calendar'];
  const areAllOpen = allSectionIds.every((id) => openSections[id]);
  const toggleAllSections = () => {
    if (areAllOpen) {
      setOpenSections({});
    } else {
      const all: Record<string, boolean> = {};
      allSectionIds.forEach((id) => { all[id] = true; });
      setOpenSections(all);
    }
  };

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

  // Total pending alarms calculation for visual guidance (red = action needed)
  const totalPendingAlarms = useMemo(() => {
    let count = 0;
    if (topicSummary && topicSummary.myTopicsCount === 0) count++;
    if (sortedSubmissions.length > 0) count += sortedSubmissions.length;
    if (admissionCount > 0) count += admissionCount;
    if (pendingQuizzes.length > 0) count += pendingQuizzes.length;
    if (pendingTopicRevisions.length > 0) count += pendingTopicRevisions.length;
    if (pendingRetakes.length > 0) count += pendingRetakes.length;
    if (atRiskStudents.length > 0) count += atRiskStudents.length;
    return count;
  }, [
    topicSummary,
    sortedSubmissions.length,
    admissionCount,
    pendingQuizzes.length,
    pendingTopicRevisions.length,
    pendingRetakes.length,
    atRiskStudents.length,
  ]);

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
          BANDEJA: GUÍA VISUAL Y SECCIONES COLAPSABLES
          ══════════════════════════════════════════════════════════════════════════ */}
      
      {/* ── Barra de Guía Visual y Resumen de Pendientes ── */}
      <div className="mb-6 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
              totalPendingAlarms > 0
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {totalPendingAlarms > 0 ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Guía de Pendientes de la Bandeja
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black border inline-flex items-center gap-1.5 ${
                  totalPendingAlarms > 0
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border-rose-300 dark:border-rose-800 shadow-2xs'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                {totalPendingAlarms > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                {totalPendingAlarms > 0
                  ? `${totalPendingAlarms} ${totalPendingAlarms === 1 ? 'pendiente que resolver' : 'pendientes que resolver'}`
                  : 'Todo al día (0 pendientes)'}
              </span>
            </div>
            {/* Color coding legend as user requested */}
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Rojo = Alarma / Pendientes a resolver
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Ámbar = En propuesta
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Verde = Al día / Confirmado
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleAllSections}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            <span>{areAllOpen ? 'Colapsar todas las secciones' : 'Expandir todas las secciones'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* ── 1. Temas Docentes y Asignación de Clases (AL INICIO, colapsable, colapsado por defecto) ── */}
        <TopicAdoptionInbox
          onChanged={loadData}
          isOpen={openSections['topics'] ?? false}
          onToggle={() => toggleSection('topics')}
          onSummaryChange={setTopicSummary}
        />

        {/* ── 2. Entregas por calificar (colapsable, colapsada por defecto) ── */}
        <CollapsibleDashboardSection
          id="submissions"
          title="Entregas por calificar"
          subtitle="Tareas y casos clínicos que esperan tu evaluación"
          icon={<FileCheck className="w-4 h-4" />}
          iconBgClass={
            sortedSubmissions.length > 0
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          }
          badgeVariant={sortedSubmissions.length > 0 ? 'alarm' : 'success'}
          badgeContent={
            sortedSubmissions.length > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {sortedSubmissions.length} por calificar (Alarma)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Al día · 0 por calificar
              </span>
            )
          }
          headerAction={
            <Link
              to="/admin/alumnos/tareas?nueva=1"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-2xs"
            >
              Nueva tarea
            </Link>
          }
          isOpen={openSections['submissions'] ?? false}
          onToggle={() => toggleSection('submissions')}
        >
          {sortedSubmissions.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Al día: no hay tareas ni casos clínicos pendientes de calificación en este momento.</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs">
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {studentProfile?.display_name || 'Médico Cursista'}
                          </p>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                            {assignment.type === 'clinical_case'
                              ? 'Caso EMG'
                              : assignment.type === 'emg_report'
                              ? 'Reporte de Trazos'
                              : 'Tarea Práctica'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Pendiente
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
        </CollapsibleDashboardSection>

        {/* ── 3. Médicos en lista de espera (colapsable, colapsada por defecto) ── */}
        <CollapsibleDashboardSection
          id="waitlist"
          title="Médicos en lista de espera"
          subtitle="Solicitudes de acceso y admisión pendientes de aprobación"
          icon={<Clock className="w-4 h-4" />}
          iconBgClass={
            admissionCount > 0 || waitlistError
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          }
          badgeVariant={admissionCount > 0 || waitlistError ? 'alarm' : 'success'}
          badgeContent={
            waitlistError ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                Sin lectura
              </span>
            ) : admissionCount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {admissionCount} por admitir (Alarma)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Al día · 0 por admitir
              </span>
            )
          }
          headerAction={
            <Link
              to="/admin/admisiones"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Ver todas las admisiones →
            </Link>
          }
          isOpen={openSections['waitlist'] ?? false}
          onToggle={() => toggleSection('waitlist')}
        >
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
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs">
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
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
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
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.course_title}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          Por admitir
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
        </CollapsibleDashboardSection>

        {/* ── 4. Cola de revisión de quizzes (Validación clínica) ── */}
        <CollapsibleDashboardSection
          id="quizzes"
          title="Cola de revisión de quizzes"
          subtitle="Evaluaciones pendientes de validación clínica de reactivos"
          icon={<GraduationCap className="w-4 h-4" />}
          iconBgClass={
            pendingQuizzes.length > 0
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          }
          badgeVariant={pendingQuizzes.length > 0 ? 'alarm' : 'success'}
          badgeContent={
            pendingQuizzes.length > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {pendingQuizzes.length} por validar (Alarma)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Al día · 0 exámenes pendientes
              </span>
            )
          }
          headerAction={
            pendingQuizzes.length > 0 ? (
              <Link
                to="/admin/revisiones?tab=clinical"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Abrir validación clínica →
              </Link>
            ) : undefined
          }
          isOpen={openSections['quizzes'] ?? false}
          onToggle={() => toggleSection('quizzes')}
        >
          {pendingQuizzes.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Al día: no hay exámenes ni cuestionarios pendientes de revisión clínica.</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs">
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
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Pendiente
                          </span>
                          {isDuplicate && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
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
        </CollapsibleDashboardSection>

        {/* ── 5. Temas pendientes de aprobación (Cola editorial) ── */}
        <CollapsibleDashboardSection
          id="editorial"
          title="Temas pendientes de aprobación"
          subtitle="Propuestas curriculares y lecciones por aprobar en el temario"
          icon={<FileCheck className="w-4 h-4" />}
          iconBgClass={
            pendingTopicRevisions.length > 0
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          }
          badgeVariant={pendingTopicRevisions.length > 0 ? 'alarm' : 'success'}
          badgeContent={
            pendingTopicRevisions.length > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {pendingTopicRevisions.length} propuestas por aprobar
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Al día · 0 propuestas pendientes
              </span>
            )
          }
          headerAction={
            pendingTopicRevisions.length > 0 ? (
              <Link
                to="/admin/revisiones"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Abrir cola editorial completa →
              </Link>
            ) : undefined
          }
          isOpen={openSections['editorial'] ?? false}
          onToggle={() => toggleSection('editorial')}
        >
          {pendingTopicRevisions.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Al día: no hay temas ni propuestas editoriales pendientes de aprobación en el temario.</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs">
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
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                            {isQuiz ? 'Evaluación' : `Módulo ${rev.module_id}`}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Por aprobar
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
        </CollapsibleDashboardSection>

        {/* ── 6. Reintentos de examen (colapsable, colapsado por defecto) ── */}
        <CollapsibleDashboardSection
          id="retakes"
          title="Reintentos de examen"
          subtitle="Solicitudes de alumnos que requieren aprobación o rechazo"
          icon={<RotateCcw className="w-4 h-4" />}
          iconBgClass={
            pendingRetakes.length > 0
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          }
          badgeVariant={pendingRetakes.length > 0 ? 'alarm' : 'success'}
          badgeContent={
            pendingRetakes.length > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {pendingRetakes.length} solicitudes (Alarma)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Al día · 0 solicitudes
              </span>
            )
          }
          isOpen={openSections['retakes'] ?? false}
          onToggle={() => toggleSection('retakes')}
        >
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
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
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
        </CollapsibleDashboardSection>

        {/* ── 7. Alumnos en riesgo (colapsable, colapsado por defecto) ── */}
        <CollapsibleDashboardSection
          id="atRisk"
          title="Alumnos en riesgo"
          subtitle="Estudiantes con rezago académico o calificación menor a 70 pts"
          icon={<AlertTriangle className="w-4 h-4" />}
          iconBgClass={
            atRiskStudents.length > 0
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          }
          badgeVariant={atRiskStudents.length > 0 ? 'alarm' : 'success'}
          badgeContent={
            atRiskStudents.length > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {atRiskStudents.length} en alerta académica
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Al día · Sin alumnos en riesgo
              </span>
            )
          }
          headerAction={
            <Link
              to="/admin/alumnos"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Ver todos los alumnos →
            </Link>
          }
          isOpen={openSections['atRisk'] ?? false}
          onToggle={() => toggleSection('atRisk')}
        >
          {atRiskStudents.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Excelente: ningún alumno de la cohorte se encuentra en estado de riesgo o rezago académico.</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs">
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
        </CollapsibleDashboardSection>

        {/* ── 8. La clase de esta semana (colapsable, colapsado por defecto) ── */}
        <CollapsibleDashboardSection
          id="calendar"
          title="La clase de esta semana"
          subtitle="Próxima sesión en vivo o evento agendado en el calendario"
          icon={<Calendar className="w-4 h-4" />}
          iconBgClass="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
          badgeVariant={thisWeekClass ? 'info' : 'neutral'}
          badgeContent={
            thisWeekClass ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {calendarItemStartDate(thisWeekClass.startsAt, thisWeekClass.allDay).toLocaleDateString('es-MX', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Sin clase programada
              </span>
            )
          }
          headerAction={
            <Link
              to="/admin/calendario"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>{thisWeekClass ? 'Abrir calendario' : 'Programar en el calendario'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
          isOpen={openSections['calendar'] ?? false}
          onToggle={() => toggleSection('calendar')}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                {thisWeekClass ? (
                  <div>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm">
                      {thisWeekClass.title}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                      Fecha:{' '}
                      <span className="text-indigo-600 dark:text-cyan-400 font-bold">
                        {calendarItemStartDate(thisWeekClass.startsAt, thisWeekClass.allDay).toLocaleDateString('es-MX', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">
                    No hay ninguna clase en vivo o evento programado para esta semana.
                  </p>
                )}
              </div>
            </div>

            <Link
              to="/admin/calendario"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 font-bold text-xs text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition shrink-0"
            >
              <span>{thisWeekClass ? 'Ver en calendario' : 'Programar clase'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CollapsibleDashboardSection>
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
