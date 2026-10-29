import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Eye,
  FileCheck,
  GraduationCap,
  Play,
  Send,
  ShieldCheck,
  UserCheck,
  Video,
} from 'lucide-react';
import type { LiveWorkshop, Profile } from '../../types/database';
import {
  getHighestUnreadNotificationTone,
  resolveNotificationTone,
  type NotificationColorTone,
  type StudentNotification,
} from '../../services/studentService';
import type { StudentAssignment, StudentLearningPlan } from '../../types/studentPlan';
import type { StudentKardexData } from '../../types/academicGradebook';
import type { StudentPortalTab } from './StudentPortalTabBar';
import type { ResumeLesson } from '../../services/studentResume';

export interface QuickQuizItem {
  moduleId: string;
  moduleTitle: string;
  topicId: string;
  topicTitle: string;
  score: number | null;
  passed: boolean;
  topicUrl: string | null;
}

const NOTIFICATION_TYPE_LABELS: Record<StudentNotification['type'], string> = {
  academic: 'Académico',
  workshop: 'Taller en Vivo',
  quiz: 'Evaluación',
  cedula: 'Cédula SEP',
  system: 'Sistema',
};

export function getNotificationTypeLabel(type: StudentNotification['type']): string {
  return NOTIFICATION_TYPE_LABELS[type] || 'Aviso';
}

export interface NotificationVisualStyle {
  tone: NotificationColorTone;
  cardUnread: string;
  statusBadge: string;
  statusDot: string;
  statusLabel: string;
  typeBadgeUnread: string;
  titleUnread: string;
  messageUnread: string;
  actionLinkUnread: string;
  markReadBtn: string;
  headerIcon: string;
  headerBadge: string;
  markAllBtn: string;
  containerBorder: string;
}

const TONE_PRIORITY_ORDER: Record<NotificationColorTone, number> = {
  urgent: 0,
  warning: 1,
  info: 2,
  success: 3,
};

export function getNotificationToneStyle(tone: NotificationColorTone): NotificationVisualStyle {
  switch (tone) {
    case 'urgent':
      return {
        tone: 'urgent',
        cardUnread:
          'border-l-4 border-l-rose-600 border-rose-300 dark:border-rose-800/90 bg-rose-50/75 dark:bg-rose-950/35 cursor-pointer',
        statusBadge: 'bg-rose-600 text-white',
        statusDot: 'bg-white animate-pulse',
        statusLabel: 'Urgente · Por atender',
        typeBadgeUnread: 'bg-rose-100 text-rose-900 dark:bg-rose-900/70 dark:text-rose-200',
        titleUnread: 'text-rose-950 dark:text-rose-100',
        messageUnread: 'text-rose-900/90 dark:text-rose-200/90',
        actionLinkUnread: 'text-rose-700 dark:text-rose-300 hover:underline',
        markReadBtn:
          'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/50',
        headerIcon: 'bg-rose-600 text-white',
        headerBadge: 'bg-rose-600 text-white',
        markAllBtn:
          'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/70',
        containerBorder: 'border-rose-300 dark:border-rose-800',
      };
    case 'warning':
      return {
        tone: 'warning',
        cardUnread:
          'border-l-4 border-l-amber-500 border-amber-300 dark:border-amber-800/80 bg-amber-50/75 dark:bg-amber-950/30 cursor-pointer',
        statusBadge: 'bg-amber-500 text-white',
        statusDot: 'bg-white',
        statusLabel: 'Próximo · Por atender',
        typeBadgeUnread: 'bg-amber-100 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200',
        titleUnread: 'text-amber-950 dark:text-amber-100',
        messageUnread: 'text-amber-900/90 dark:text-amber-200/90',
        actionLinkUnread: 'text-amber-800 dark:text-amber-300 hover:underline',
        markReadBtn:
          'bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50',
        headerIcon: 'bg-amber-500 text-white',
        headerBadge: 'bg-amber-500 text-white',
        markAllBtn:
          'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/70',
        containerBorder: 'border-amber-300 dark:border-amber-800',
      };
    case 'success':
      return {
        tone: 'success',
        cardUnread:
          'border-l-4 border-l-emerald-500 border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/75 dark:bg-emerald-950/30 cursor-pointer',
        statusBadge: 'bg-emerald-600 text-white',
        statusDot: 'bg-white',
        statusLabel: 'Acreditado · Nuevo',
        typeBadgeUnread:
          'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/70 dark:text-emerald-200',
        titleUnread: 'text-emerald-950 dark:text-emerald-100',
        messageUnread: 'text-emerald-900/90 dark:text-emerald-200/90',
        actionLinkUnread: 'text-emerald-700 dark:text-emerald-300 hover:underline',
        markReadBtn:
          'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
        headerIcon: 'bg-emerald-600 text-white',
        headerBadge: 'bg-emerald-600 text-white',
        markAllBtn:
          'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/70',
        containerBorder: 'border-emerald-300 dark:border-emerald-800',
      };
    case 'info':
    default:
      return {
        tone: 'info',
        cardUnread:
          'border-l-4 border-l-sky-500 border-sky-300 dark:border-sky-800/80 bg-sky-50/75 dark:bg-sky-950/30 cursor-pointer',
        statusBadge: 'bg-sky-600 text-white',
        statusDot: 'bg-white',
        statusLabel: 'Sistema · Por atender',
        typeBadgeUnread: 'bg-sky-100 text-sky-900 dark:bg-sky-900/70 dark:text-sky-200',
        titleUnread: 'text-sky-950 dark:text-sky-100',
        messageUnread: 'text-sky-900/90 dark:text-sky-200/90',
        actionLinkUnread: 'text-sky-700 dark:text-sky-300 hover:underline',
        markReadBtn:
          'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 hover:bg-sky-100 dark:hover:bg-sky-900/50',
        headerIcon: 'bg-sky-600 text-white',
        headerBadge: 'bg-sky-600 text-white',
        markAllBtn:
          'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-200 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/70',
        containerBorder: 'border-sky-300 dark:border-sky-800',
      };
  }
}

export function getNotificationVisualStyle(
  notif: StudentNotification,
  nowMs = Date.now()
): NotificationVisualStyle {
  return getNotificationToneStyle(resolveNotificationTone(notif, nowMs));
}

interface StudentQuickControlHubProps {
  notifications: StudentNotification[];
  unreadCount: number;
  onMarkNotifRead: (id: string) => void;
  onMarkAllNotifsRead: () => void;
  onAttendNotification: (notif: StudentNotification) => void;
  resumeLesson: ResumeLesson | null;
  hasStartedCurriculum: boolean;
  overallProgressPct: number;
  upcomingPendingLessons: ResumeLesson[];
  workshops: LiveWorkshop[];
  assignments: StudentAssignment[];
  quizzesList: QuickQuizItem[];
  kardex: StudentKardexData | null;
  profile: Profile | null;
  learningPlans: StudentLearningPlan[];
  onSelectTab: (tab: StudentPortalTab) => void;
  onSelectExam: (asg: StudentAssignment) => void;
  onOpenAssignedCase: (asg: StudentAssignment) => void;
  onOpenSubmitModal: (asg: StudentAssignment, initialNotes?: string) => void;
  onOpenKardexModal: () => void;
  onRecordResumeClick: (lesson: ResumeLesson) => void;
}

export function StudentQuickControlHub({
  notifications,
  unreadCount,
  onMarkNotifRead,
  onMarkAllNotifsRead,
  onAttendNotification,
  resumeLesson,
  hasStartedCurriculum,
  overallProgressPct,
  upcomingPendingLessons,
  workshops,
  assignments,
  quizzesList,
  kardex,
  profile,
  learningPlans,
  onSelectTab,
  onSelectExam,
  onOpenAssignedCase,
  onOpenSubmitModal,
  onOpenKardexModal,
  onRecordResumeClick,
}: StudentQuickControlHubProps) {
  // Prioritize unread notifications first, then by urgency tone, then by newest
  const nowMs = Date.now();
  const prioritizedNotifications = [...notifications]
    .sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      if (!a.isRead && !b.isRead) {
        const toneDiff =
          TONE_PRIORITY_ORDER[resolveNotificationTone(a, nowMs)] -
          TONE_PRIORITY_ORDER[resolveNotificationTone(b, nowMs)];
        if (toneDiff !== 0) return toneDiff;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 4);

  const highestUnreadTone = getHighestUnreadNotificationTone(notifications, nowMs);
  const headerToneStyle = getNotificationToneStyle(highestUnreadTone);
  const unreadUrgentCount = notifications.filter(
    (n) => !n.isRead && resolveNotificationTone(n, nowMs) === 'urgent'
  ).length;
  const unreadWarningCount = notifications.filter(
    (n) => !n.isRead && resolveNotificationTone(n, nowMs) === 'warning'
  ).length;
  const unreadInfoCount = notifications.filter(
    (n) => !n.isRead && resolveNotificationTone(n, nowMs) === 'info'
  ).length;

  // Categorize assignments
  const actionRequiredAssignments = assignments.filter(
    (a) => a.status === 'pending' || a.status === 'needs_revision'
  );
  const submittedAssignments = assignments.filter(
    (a) => a.status === 'submitted' || a.status === 'approved' || a.grade != null
  );
  const inReviewCount = assignments.filter((a) => a.status === 'submitted').length;
  const gradedOrApprovedCount = assignments.filter(
    (a) => a.status === 'approved' || a.grade != null
  ).length;
  const needsRevisionOrOverdueCount = actionRequiredAssignments.filter((a) => {
    const isOverdue = new Date(a.due_date).getTime() < Date.now() && a.status === 'pending';
    return a.status === 'needs_revision' || isOverdue;
  }).length;

  // Quizzes
  const pendingQuizzes = quizzesList.filter((q) => !q.passed);
  const passedQuizzes = quizzesList.filter((q) => q.passed);

  // Kardex & accreditation checks
  const cedulaVerified = Boolean(profile?.cedula_verified);
  const hasCedulaNumber = Boolean(profile?.cedula_profesional?.trim());
  const pendingMilestone = kardex?.milestoneAudits.find((audit) => !audit.isOnTrack) ?? null;
  const unmarkedSessions = kardex
    ? Math.max(0, kardex.attendanceSummary.totalSessions - kardex.attendanceSummary.sessions.length)
    : 0;
  const missingBucketNames = kardex
    ? kardex.rubricBreakdown
        .filter((bucket) => kardex.missingBuckets.includes(bucket.rubricId))
        .map((bucket) => bucket.name)
    : [];

  const nextWorkshop = workshops[0] ?? null;

  return (
    <section aria-label="Centro de seguimiento rápido del alumno" className="space-y-4 sm:space-y-5">
      {/* ─── BARRA DE CÓDIGO DE COLORES SEMÁNTICO (Visible en tablet/desktop para no ocupar espacio vertical en móvil) ─── */}
      <div className="hidden md:flex p-3.5 sm:px-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
            Código de Alertas:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onSelectTab('notifications')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold border transition cursor-pointer ${
              unreadUrgentCount > 0
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                unreadUrgentCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>Rojo: Exámenes, Tareas (&lt;24h) y Clase (≤5 min)</span>
            {unreadUrgentCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[11px] font-mono tabular-nums">
                {unreadUrgentCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('notifications')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/70 transition cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Amarillo: Clase futura (&gt;5 min) y Entregas en tiempo</span>
            {(unreadWarningCount > 0 || actionRequiredAssignments.length > 0) && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white text-[11px] font-mono tabular-nums">
                {unreadWarningCount || actionRequiredAssignments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('notifications')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-200 border border-sky-200 dark:border-sky-800/70 transition cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>Azul claro: Recordatorios y Sistema</span>
            {unreadInfoCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-sky-600 text-white text-[11px] font-mono tabular-nums">
                {unreadInfoCount}
              </span>
            )}
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/70">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Verde: Acreditado</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Gris: Atendido</span>
          </span>
        </div>
      </div>

      {/* ─── GRID PRINCIPAL DE 4 PILARES EN LA PRIMERA PÁGINA ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        {/* ══════════════════════════════════════════════════════════════════
            PILAR 1: AVISOS Y NOTIFICACIONES (SEMÁNTICO POR URGENCIA -> GRIS AL ATENDERSE)
            ══════════════════════════════════════════════════════════════════ */}
        <div
          className={`p-4 sm:p-6 rounded-2xl border transition-all flex flex-col justify-between ${
            unreadCount > 0
              ? `${headerToneStyle.containerBorder} bg-white dark:bg-slate-900 shadow-sm`
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'
          }`}
        >
          <div>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl shrink-0 transition-colors ${
                    unreadCount > 0
                      ? headerToneStyle.headerIcon
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                    Avisos y Notificaciones
                  </h2>
                  {unreadCount > 0 ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold font-mono tabular-nums ${headerToneStyle.headerBadge}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full bg-white ${
                          highestUnreadTone === 'urgent' ? 'animate-ping' : ''
                        }`}
                      />
                      {unreadCount} por atender
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Al día
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllNotifsRead}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${headerToneStyle.markAllBtn}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Atender todos</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectTab('notifications')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  Bandeja ({notifications.length})
                </button>
              </div>
            </div>

            {/* Lista rápida de avisos */}
            {prioritizedNotifications.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Sin avisos registrados
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aquí aparecerán notificaciones de calificaciones, tareas y talleres.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {prioritizedNotifications.map((notif) => {
                  const isUnread = !notif.isRead;
                  const visual = getNotificationVisualStyle(notif, nowMs);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (isUnread) onMarkNotifRead(notif.id);
                      }}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isUnread
                          ? visual.cardUnread
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isUnread ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${visual.statusBadge}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${visual.statusDot}`} />
                              {visual.statusLabel}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              <Check className="w-3 h-3" />
                              Atendido
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              isUnread
                                ? visual.typeBadgeUnread
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {getNotificationTypeLabel(notif.type)}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                          {new Date(notif.createdAt).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>

                      <p
                        className={`text-sm font-semibold mt-1.5 line-clamp-1 ${
                          isUnread
                            ? visual.titleUnread
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <p
                        className={`text-xs mt-0.5 line-clamp-2 leading-relaxed ${
                          isUnread
                            ? visual.messageUnread
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {notif.message}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between gap-2">
                        {notif.linkUrl ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAttendNotification(notif);
                            }}
                            className={`inline-flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                              isUnread
                                ? visual.actionLinkUnread
                                : 'text-blue-600 dark:text-cyan-400 hover:underline'
                            }`}
                          >
                            <span>{isUnread ? 'Atender e ir a la sección' : 'Ir a la sección'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span />
                        )}

                        {isUnread && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkNotifRead(notif.id);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${visual.markReadBtn}`}
                          >
                            <Check className="w-3 h-3" />
                            <span>Marcar atendido</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {unreadCount > 0
                ? unreadUrgentCount > 0
                  ? `Tienes ${unreadUrgentCount} alerta(s) urgente(s) en rojo por atender`
                  : `Tienes ${unreadCount} aviso(s) pendientes de lectura`
                : 'Bandeja de avisos al día'}
            </span>
            <button
              type="button"
              onClick={() => onSelectTab('notifications')}
              className="font-semibold text-blue-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos los avisos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PILAR 2: CLASES PENDIENTES Y PRÓXIMA SESIÓN EN VIVO (AZUL CLÍNICO)
            ══════════════════════════════════════════════════════════════════ */}
        <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Clases Pendientes y Sesiones
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold font-mono tabular-nums bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {resumeLesson?.pendingLessonCount ?? 0} por cursar
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Continúa exactamente donde te quedaste y revisa tu siguiente sesión en vivo
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab('modules')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
              >
                Ir a Clases ({overallProgressPct}%)
              </button>
            </div>

            {/* Tarjeta de reanudación inmediata */}
            {resumeLesson ? (
              <div className="p-4 rounded-xl border border-l-4 border-l-blue-600 border-blue-200 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/25 mb-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-blue-600 text-white">
                        {hasStartedCurriculum ? 'En curso' : 'Primera clase'}
                      </span>
                      <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 truncate">
                        Módulo {resumeLesson.moduleNumber}: {resumeLesson.moduleTitle}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1 line-clamp-1">
                      {resumeLesson.topicTitle}
                    </p>
                    {resumeLesson.firstIncompleteChildTitle && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                        Siguiente subtema: <strong>{resumeLesson.firstIncompleteChildTitle}</strong>
                      </p>
                    )}
                  </div>
                  <Link
                    to={resumeLesson.url}
                    onClick={() => onRecordResumeClick(resumeLesson)}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{hasStartedCurriculum ? 'Continuar clase' : 'Empezar clase'}</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/25 mb-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      ¡Temario curricular completado al 100%!
                    </p>
                    <p className="text-xs text-slate-500">
                      Todas las lecciones obligatorias han sido acreditadas.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTab('modules')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                >
                  Repasar
                </button>
              </div>
            )}

            {/* Siguientes clases pendientes en fila */}
            {(() => {
              const nextLessonsInQueue = upcomingPendingLessons
                .filter(
                  (l) =>
                    !resumeLesson ||
                    l.moduleId !== resumeLesson.moduleId ||
                    l.topicId !== resumeLesson.topicId
                )
                .slice(0, 3);
              if (nextLessonsInQueue.length === 0) return null;
              return (
                <div className="space-y-2 mb-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Siguientes lecciones pendientes en tu ruta:
                  </p>
                  {nextLessonsInQueue.map((lesson) => (
                    <Link
                      key={`${lesson.moduleId}-${lesson.topicId}`}
                      to={lesson.url}
                      onClick={() => onRecordResumeClick(lesson)}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-blue-700 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Módulo {lesson.moduleNumber} · {lesson.moduleTitle}
                        </p>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {lesson.topicTitle}
                          {lesson.firstIncompleteChildTitle ? ` — ${lesson.firstIncompleteChildTitle}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-cyan-400">
                        <span>Abrir</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  ))}
                </div>
              );
            })()}

            {/* Próxima Clase en Vivo / Taller */}
            <div className="p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Video className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  {nextWorkshop ? (
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        Próxima clase en vivo: {nextWorkshop.title}
                      </p>
                      <p className="text-[11px] font-mono tabular-nums text-indigo-700 dark:text-indigo-300">
                        {new Date(nextWorkshop.scheduled_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Clases en Vivo y Grabaciones COMEFYR
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Sin sesión en vivo hoy · Consulta sesiones grabadas
                      </p>
                    </div>
                  )}
                </div>
                <Link
                  to={nextWorkshop ? `/taller/${nextWorkshop.id}` : '/talleres'}
                  className="shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 transition"
                >
                  {nextWorkshop ? 'Ver sesión' : 'Grabaciones'}
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Avance curricular: {overallProgressPct}%
            </span>
            <button
              type="button"
              onClick={() => onSelectTab('modules')}
              className="font-semibold text-blue-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos los módulos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PILAR 3: TAREAS PENDIENTES, TAREAS ENVIADAS Y CALIFICACIONES
            ══════════════════════════════════════════════════════════════════ */}
        <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    needsRevisionOrOverdueCount > 0
                      ? 'bg-rose-600 text-white'
                      : actionRequiredAssignments.length > 0
                        ? 'bg-amber-500 text-white'
                        : 'bg-indigo-600 text-white'
                  }`}
                >
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Tareas: Pendientes y Enviadas
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Entregas por realizar, tareas enviadas en revisión y retroalimentación docente
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab('assignments')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              >
                Ver todas ({assignments.length})
              </button>
            </div>

            {/* 3 Contadores de Estado de Tareas */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <button
                type="button"
                onClick={() => onSelectTab('assignments')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  actionRequiredAssignments.length > 0
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  Por entregar
                </p>
                <p className="text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {actionRequiredAssignments.length}
                </p>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('assignments')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  inReviewCount > 0
                    ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                  Enviadas (Revisión)
                </p>
                <p className="text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {inReviewCount}
                </p>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('assignments')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  gradedOrApprovedCount > 0
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Calificadas
                </p>
                <p className="text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {gradedOrApprovedCount}
                </p>
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No tienes tareas asignadas en este momento
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aquí verás tanto tus tareas pendientes como el historial de tareas enviadas y calificadas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1. Pendientes o que requieren corrección */}
                {actionRequiredAssignments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Requieren tu entrega ({actionRequiredAssignments.length})
                    </p>
                    {actionRequiredAssignments.slice(0, 2).map((asg) => {
                      const dueTime = new Date(asg.due_date).getTime();
                      const isOverdue = dueTime < Date.now() && asg.status === 'pending';
                      const isNeedsRevision = asg.status === 'needs_revision';
                      const isUrgentRed = isOverdue || isNeedsRevision;
                      const isExam = asg.type === 'exam';
                      const isCase = asg.type === 'clinical_case';

                      return (
                        <div
                          key={asg.id}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                            isUrgentRed
                              ? 'border-l-4 border-l-rose-600 border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30'
                              : 'border-l-4 border-l-amber-500 border-amber-200 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                  isUrgentRed
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-amber-500 text-white'
                                }`}
                              >
                                {isNeedsRevision
                                  ? 'Corrección solicitada'
                                  : isOverdue
                                    ? 'Vencida'
                                    : 'Pendiente'}
                              </span>
                              <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                Límite:{' '}
                                {new Date(asg.due_date).toLocaleDateString('es-MX', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white mt-1 truncate">
                              {isCase ? 'Caso Clínico Asignado' : asg.title}
                            </p>
                          </div>

                          <div className="shrink-0">
                            {isExam ? (
                              <button
                                type="button"
                                onClick={() => onSelectExam(asg)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
                              >
                                Realizar Examen
                              </button>
                            ) : isCase ? (
                              <button
                                type="button"
                                onClick={() => onOpenAssignedCase(asg)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
                              >
                                Resolver Caso
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenSubmitModal(asg, asg.student_notes || '')}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition cursor-pointer inline-flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                <span>{isNeedsRevision ? 'Corregir' : 'Entregar'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Tareas Enviadas y Calificadas */}
                {submittedAssignments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      Tareas enviadas y calificadas ({submittedAssignments.length})
                    </p>
                    {submittedAssignments.slice(0, 3).map((asg) => {
                      const isApprovedOrGraded = asg.status === 'approved' || asg.grade != null;
                      const isCase = asg.type === 'clinical_case';
                      return (
                        <div
                          key={asg.id}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                            isApprovedOrGraded
                              ? 'border-l-4 border-l-emerald-600 border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'border-l-4 border-l-indigo-600 border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                  isApprovedOrGraded
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-indigo-600 text-white'
                                }`}
                              >
                                {isApprovedOrGraded
                                  ? asg.grade != null
                                    ? `Calificada: ${asg.grade}/100`
                                    : 'Aprobada ✓'
                                  : 'Enviada · En revisión'}
                              </span>
                              {asg.submitted_at && (
                                <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                  Enviada:{' '}
                                  {new Date(asg.submitted_at).toLocaleDateString('es-MX', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white mt-1 truncate">
                              {asg.title}
                            </p>
                            {asg.feedback && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-1 mt-0.5">
                                Retroalimentación: "{asg.feedback}"
                              </p>
                            )}
                          </div>

                          <div className="shrink-0">
                            {isCase ? (
                              <button
                                type="button"
                                onClick={() => onOpenAssignedCase(asg)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver caso</span>
                              </button>
                            ) : asg.type !== 'exam' ? (
                              <button
                                type="button"
                                onClick={() => onOpenSubmitModal(asg, asg.student_notes || '')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver entrega</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectTab('assignments')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"
                              >
                                Detalle
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {submittedAssignments.length} enviada(s) · {actionRequiredAssignments.length} pendiente(s)
            </span>
            <button
              type="button"
              onClick={() => onSelectTab('assignments')}
              className="font-semibold text-blue-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Gestionar tareas y entregas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PILAR 4: RADAR DE PENDIENTES CRÍTICOS Y REQUISITOS DE ACREDITACIÓN
            ══════════════════════════════════════════════════════════════════ */}
        <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Radar de Acreditación y Pendientes Clave
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Cuestionarios curriculares, Cédula SEP, asistencia y dictamen Capa A
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenKardexModal}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer inline-flex items-center gap-1"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Mi Kardex</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {/* 1. Evaluaciones / Quizzes del Temario */}
              <div
                className={`p-3 rounded-xl border ${
                  pendingQuizzes.length > 0
                    ? 'border-l-4 border-l-amber-500 border-amber-200 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-l-4 border-l-emerald-600 border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        pendingQuizzes.length > 0 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Quizzes del Temario:{' '}
                        <span className="font-mono tabular-nums">
                          {passedQuizzes.length}/{quizzesList.length} aprobados
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {pendingQuizzes.length > 0
                          ? `Siguiente: ${pendingQuizzes[0].topicTitle}${
                              pendingQuizzes[0].score != null
                                ? ` (Último: ${pendingQuizzes[0].score}%)`
                                : ''
                            }`
                          : 'Todos los cuestionarios disponibles han sido acreditados.'}
                      </p>
                    </div>
                  </div>
                  {pendingQuizzes.length > 0 ? (
                    <Link
                      to={pendingQuizzes[0].topicUrl || `/modulo/${pendingQuizzes[0].moduleId}`}
                      className="shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition"
                    >
                      Presentar ({pendingQuizzes.length})
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectTab('quizzes')}
                      className="shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                    >
                      Ver
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Cédula Profesional SEP (Requisito legal COMEFYR) */}
              <div
                className={`p-3 rounded-xl border ${
                  cedulaVerified
                    ? 'border-l-4 border-l-emerald-600 border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : hasCedulaNumber
                      ? 'border-l-4 border-l-amber-500 border-amber-200 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20'
                      : 'border-l-4 border-l-rose-600 border-rose-300 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Award
                      className={`w-4 h-4 shrink-0 ${
                        cedulaVerified
                          ? 'text-emerald-600'
                          : hasCedulaNumber
                            ? 'text-amber-600'
                            : 'text-rose-600'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Cédula Profesional SEP (Requisito de Constancia)
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {cedulaVerified
                          ? `Verificada oficialmente (${profile?.cedula_profesional})`
                          : hasCedulaNumber
                            ? `Cédula ${profile?.cedula_profesional} pendiente de validación SEP`
                            : 'Indispensable registrar tu cédula para emisión del diploma COMEFYR'}
                      </p>
                    </div>
                  </div>
                  {!cedulaVerified && (
                    <Link
                      to={hasCedulaNumber ? '/cuenta' : '/perfil'}
                      className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold text-white transition ${
                        hasCedulaNumber
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-rose-600 hover:bg-rose-700'
                      }`}
                    >
                      {hasCedulaNumber ? 'Validar' : 'Registrar'}
                    </Link>
                  )}
                </div>
              </div>

              {/* 3. Asistencia a Sesiones en Vivo (20% del Kardex) */}
              <div
                className={`p-3 rounded-xl border ${
                  (kardex?.attendanceSummary.absentSessions ?? 0) > 0
                    ? 'border-l-4 border-l-amber-500 border-amber-200 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-l-4 border-l-blue-600 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Asistencia a Sesiones (20% del Kardex)
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                        {kardex && kardex.attendanceSummary.totalSessions > 0
                          ? `${kardex.attendanceSummary.attendedSessions} presentes · ${kardex.attendanceSummary.lateSessions} retardos · ${kardex.attendanceSummary.absentSessions} faltas${
                              unmarkedSessions > 0 ? ` · ${unmarkedSessions} por pasar lista` : ''
                            }`
                          : 'Sin sesiones computadas aún en el corte actual'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectTab('performance')}
                    className="shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Detalle
                  </button>
                </div>
              </div>

              {/* 4. Dictamen Capa A, Cortes del Calendario y Planes de Estudio */}
              <div
                className={`p-3 rounded-xl border ${
                  pendingMilestone || missingBucketNames.length > 0
                    ? 'border-l-4 border-l-indigo-600 border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20'
                    : 'border-l-4 border-l-emerald-600 border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {pendingMilestone ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Promedio Capa A:{' '}
                        <span className="font-mono tabular-nums">
                          {kardex?.finalGrade ?? '—'} / 100
                        </span>{' '}
                        (Mín. 80)
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {pendingMilestone
                          ? `Corte pendiente: ${pendingMilestone.milestoneTitle} (${pendingMilestone.completedTopics}/${pendingMilestone.totalTopics} temas)`
                          : missingBucketNames.length > 0
                            ? `Falta evidencia en: ${missingBucketNames.join(', ')}`
                            : learningPlans.length > 0
                              ? `${learningPlans.length} plan(es) de estudio activo(s)`
                              : 'Todas las cubetas de evaluación tienen registro activo'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectTab('performance')}
                    className="shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 cursor-pointer"
                  >
                    Desempeño
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onSelectTab('study')}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 font-semibold cursor-pointer"
            >
              Planes de estudio y reportes EMG ({learningPlans.length})
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('certificate')}
              className="font-semibold text-blue-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Requisitos de Constancia</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── ACCESOS DIRECTOS A HERRAMIENTAS CLÍNICAS Y SIMULADORES ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link
          to="/ejercicios"
          className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-700 transition flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
              Simulador de Casos EMG
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Trazos y diagnóstico neurofisiológico
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
        </Link>

        <Link
          to="/herramientas/plexo-braquial"
          className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-700 transition flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
              Calculadora de Plexo Braquial
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Correlación topográfica de 5 pasos
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
        </Link>

        <Link
          to="/examenes"
          className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400 dark:hover:border-emerald-700 transition flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
              Simulador Examen COMEFYR
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Modo tutor y entrenamiento cronometrado
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
        </Link>

        <button
          type="button"
          onClick={onOpenKardexModal}
          className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600 transition flex items-center gap-3 text-left cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
              Expediente y Kardex Oficial
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Desglose 30+30+20+20 e impresión
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
        </button>
      </div>
    </section>
  );
}
