import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Calendar,
  BellRing,
  FileCheck,
  ChevronRight,
  Check,
  BarChart3,
  Search,
  Stethoscope,
  Activity,
  Layers,
  ArrowRight,
  ShieldAlert,
  Building2,
  Video,
  Flame,
  Send,
  Lock,
  AlertTriangle,
  RotateCcw,
  Eye,
  X,
  Smartphone,
  GraduationCap,
  Scale,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { getMyAttempts, getMyProgressByModule } from '../../services/quizService';
import {
  getUpcomingWorkshops,
  getLiveSessionUrgency,
} from '../../services/courseService';
import { getCourseTeachers } from '../../services/editorialService';
import EditorialCommitteeModal from '../editorial/EditorialCommitteeModal';
import PendingTasksAlertModal from './PendingTasksAlertModal';
import { StudentPortalGuide } from './StudentPortalGuide';
import type { PortalGuideCourseState } from './portalGuideSteps';
import {
  shouldShowPortalGuide,
  markPortalGuideSeen,
  fetchPublishedPortalWelcome,
  filterSlidesForCourse,
  slideToGuideStep,
  PORTAL_GUIDE_VERSION,
} from '../../services/portalGuideService';
import type { PortalWelcomeSlide, Profile } from '../../types/database';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  checkAndNotifyPendingAssignments,
  subscribeToRealtimeAssignments,
  type NotificationPermissionStatus,
} from '../../services/deviceNotificationService';
import {
  isPwaPromptDismissed,
  dismissPwaPrompt,
  PWA_BANNER_DISMISSED_EVENT,
} from '../pwa/DeviceNotificationPromptBanner';
import {
  calculateStudentMetrics,
  checkCertificationEligibility,
  getLastVisitedTopic,
  fetchLastVisitedTopic,
  setLastVisitedTopic,
  getStudentNotifications,
  getHighestUnreadNotificationTone,
  isNotificationReadLocally,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  isTopicCompleted,
  toggleTopicCompleted,
  getCompletedTopics,
  fetchStudentCompletedTopics,
  TOPIC_PROGRESS_EVENT,
  type LastVisitedTopic,
  type StudentNotification,
} from '../../services/studentService';
import {
  listPendingCurriculumLessons,
  resolveResumeLesson,
  isCurriculumNodeCompleted,
} from '../../services/studentResume';
import { areRequiredQuizzesPassed, topicHasEvaluation } from '../../services/quizCompletionGate';
import { findTopicInTree } from '../../services/contentMerge';
import { useQuizTopicFlags } from '../../hooks/useQuizTopicFlags';
import {
  getStudentAssignments,
  submitAssignment,
  getStudentActivityAndStreak,
  getActiveExamLock,
  startAssignedExam,
  assignedExamLocationState,
  buildAssignedExamConfig,
  requestExamRetake,
  getStudentLearningPlans,
} from '../../services/studentPlanService';
import { AssignmentDeliveryEditor } from './AssignmentDeliveryPanel';
import { AssignmentMaterialsList } from './AssignmentMaterialsList';
import { AssignmentReadingChecklist } from './AssignmentReadingChecklist';
import { assignmentRequiresDelivery, describeReadingAssignment } from '../../utils/readingAssignments';
import { fetchServerNotifications, markAllServerNotificationsRead, markServerNotificationRead, mergeServerNotifications } from '../../services/assignmentSubmissionService';
import { StudentStudyHub } from './StudentStudyHub';
import { StudentCertificatePanel } from './StudentCertificatePanel';
import { StudentPerformancePanel } from './StudentPerformancePanel';
import { StudentPortalTabBar, type StudentPortalTab } from './StudentPortalTabBar';
import {
  StudentQuickControlHub,
  getNotificationTypeLabel,
  getNotificationVisualStyle,
  getNotificationToneStyle,
} from './StudentQuickControlHub';
import { calculateStudentKardex } from '../../services/gradebookService';
import type { StudentKardexData } from '../../types/academicGradebook';
import { savePushSubscription } from '../../services/studentToolsService';
import {
  getClinicalCaseExerciseLocation,
  getClinicalCaseLaunchState,
  resolveClinicalAssignmentMode,
} from '../../services/emgExerciseService';
import type { StudentAssignment, StudentStreakInfo, ActiveExamLock, StudentLearningPlan } from '../../types/studentPlan';
import { allModules } from '../../content/modules';
import { getModuleLabel, getTopicPublicUrl } from '../../utils/adminUtils';
import type { ModuleQuizProgress, QuizAttempt } from '../../types/quiz';
import type { LiveWorkshop, Course } from '../../types/database';
import StudentKardexModal from '../admin/StudentKardexModal';
import CourseEnrollmentRequestModal from '../course/CourseEnrollmentRequestModal';
import { useSyllabusCatalog } from '../../hooks/useSyllabusCatalog';
import { moduleIdsForCourse, recommendedNextCourse, sellableCourses } from '../../content/courseCatalog';

function formatRemainingExamTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const EMPTY_STREAK: StudentStreakInfo = {
  currentStreak: 0,
  longestStreak: 0,
  totalActiveDays: 0,
  lastActiveDate: null,
  activeDatesLast30Days: [],
  totalSessions: 0,
};

function settleWithTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  label: string,
  ms = 12_000
): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      console.warn(`[StudentDashboard] timeout ${label} after ${ms}ms`);
      resolve(fallback);
    }, ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        console.error(`[StudentDashboard] ${label}:`, err);
        resolve(fallback);
      });
  });
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    profile,
    isEnrolledInCourse,
    isCoursePending,
    courseIds,
    pendingCourseIds,
    refreshProfile,
    needsAgreementSignature,
  } = useAuth();
  const { quizGate } = useQuizTopicFlags();
  const { grouped, assignments: courseAssignments, courses } = useSyllabusCatalog();
  const sellable = useMemo(() => sellableCourses(courses), [courses]);
  const nextSuggested = recommendedNextCourse(courseIds, courses);

  const openAssignedCase = (asg: StudentAssignment) => {
    navigate(getClinicalCaseExerciseLocation(asg.id), {
      state: getClinicalCaseLaunchState(asg, user?.id),
    });
  };

  const [activeTab, setActiveTab] = useState<StudentPortalTab>('summary');
  const [actionError, setActionError] = useState<string | null>(null);
  const [planCount, setPlanCount] = useState(0);
  const [learningPlans, setLearningPlans] = useState<StudentLearningPlan[]>([]);
  const [showKardexModal, setShowKardexModal] = useState(false);
  const [showPendingTasksModal, setShowPendingTasksModal] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [guideSaving, setGuideSaving] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [guideDismissedThisVisit, setGuideDismissedThisVisit] = useState(false);
  const [guideSlides, setGuideSlides] = useState<PortalWelcomeSlide[] | null>(null);
  const [guidePublishedVersion, setGuidePublishedVersion] = useState<number | null>(null);
  const [guideSourceReady, setGuideSourceReady] = useState(false);
  const [courseForModal, setCourseForModal] = useState<Course | null>(null);
  const [dismissedTopBanner, setDismissedTopBanner] = useState(false);
  const [dismissedLiveBanner, setDismissedLiveBanner] = useState(false);
  const [dismissedPwaBanner, setDismissedPwaBanner] = useState(() =>
    isPwaPromptDismissed(user?.id)
  );
  const [deviceNotifStatus, setDeviceNotifStatus] = useState<NotificationPermissionStatus>('default');
  const [testingDeviceNotif, setTestingDeviceNotif] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [moduleProgress, setModuleProgress] = useState<ModuleQuizProgress[]>([]);
  const [workshops, setWorkshops] = useState<LiveWorkshop[]>([]);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [kardex, setKardex] = useState<StudentKardexData | null>(null);
  const [streak, setStreak] = useState<StudentStreakInfo | null>(null);
  const [submittingAsg, setSubmittingAsg] = useState<StudentAssignment | null>(null);
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitAttachmentCount, setSubmitAttachmentCount] = useState(0);
  const [savingSubmission, setSavingSubmission] = useState(false);
  const [lastVisited, setLastVisited] = useState<LastVisitedTopic | null>(() =>
    user ? getLastVisitedTopic(user.id) : null
  );

  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // Sync tab with URL search param ?tab=...
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['summary', 'performance', 'modules', 'quizzes', 'assignments', 'notifications', 'certificate', 'study'].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab);
    }
  }, [searchParams]);

  // Realtime updates for teacher assignments & device notification permission status
  useEffect(() => {
    if (!user?.id) return;
    setDeviceNotifStatus(getNotificationPermission());
    setDismissedPwaBanner(isPwaPromptDismissed(user.id));

    const onPwaDismiss = () => setDismissedPwaBanner(true);
    window.addEventListener(PWA_BANNER_DISMISSED_EVENT, onPwaDismiss);

    try {
      const unsubscribe = subscribeToRealtimeAssignments(user.id, (updatedAsg) => {
        setAssignments((prev) => {
          const idx = prev.findIndex((a) => a.id === updatedAsg.id);
          if (idx >= 0) {
            const clone = [...prev];
            clone[idx] = updatedAsg;
            return clone;
          }
          return [updatedAsg, ...prev];
        });
        setRefreshTrigger((prev) => prev + 1);
      });

      return () => {
        window.removeEventListener(PWA_BANNER_DISMISSED_EVENT, onPwaDismiss);
        if (unsubscribe) unsubscribe();
      };
    } catch (err) {
      console.warn('[StudentDashboard] Error setting up realtime assignment listener:', err);
      return () => {
        window.removeEventListener(PWA_BANNER_DISMISSED_EVENT, onPwaDismiss);
      };
    }
  }, [user?.id]);

  // Estados para examen asignado y candado estricto
  const [activeExamLock, setActiveExamLock] = useState<ActiveExamLock | null>(null);
  const [selectedExamForModal, setSelectedExamForModal] = useState<StudentAssignment | null>(null);
  const [acceptedExamRules, setAcceptedExamRules] = useState<boolean>(false);
  const [remainingActiveSeconds, setRemainingActiveSeconds] = useState<number | null>(null);
  const [startingExam, setStartingExam] = useState<boolean>(false);

  // Estado para solicitud de reintento de examen
  const [retakeModalAssignment, setRetakeModalAssignment] = useState<StudentAssignment | null>(null);
  const [retakeReason, setRetakeReason] = useState('');
  const [sendingRetake, setSendingRetake] = useState(false);
  const [searchModuleQuery, setSearchModuleQuery] = useState('');
  const [moduleCourseFilter, setModuleCourseFilter] = useState<string>('todos');
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [quizFilter, setQuizFilter] = useState<'all' | 'pending' | 'passed'>('all');
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [completedTopicsSet, setCompletedTopicsSet] = useState<Set<string>>(() =>
    user ? getCompletedTopics(user.id) : new Set()
  );
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [committeeModalOpen, setCommitteeModalOpen] = useState(false);

  // Cargar docentes del curso (colaboradores docentes)
  useEffect(() => {
    let cancelled = false;
    setLoadingTeachers(true);
    getCourseTeachers()
      .then((data) => {
        if (!cancelled) setTeachers(data);
      })
      .catch((err) => {
        console.warn('[StudentDashboard] Error cargando docentes del curso:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingTeachers(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load user data & sync cloud topics
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    Promise.all([
      settleWithTimeout(getMyAttempts(user.id), [], 'attempts'),
      settleWithTimeout(getMyProgressByModule(user.id), [], 'moduleProgress'),
      settleWithTimeout(getUpcomingWorkshops(5), [] as LiveWorkshop[], 'workshops'),
      settleWithTimeout(getStudentAssignments(user.id), [], 'assignments'),
      settleWithTimeout(getStudentActivityAndStreak(user.id), EMPTY_STREAK, 'streak'),
      settleWithTimeout(fetchStudentCompletedTopics(user.id), getCompletedTopics(user.id), 'completedTopics'),
      settleWithTimeout(getStudentLearningPlans(user.id), [], 'plans'),
      settleWithTimeout(fetchLastVisitedTopic(user.id), getLastVisitedTopic(user.id), 'lastVisited'),
    ])
      .then(async ([att, modProg, ws, asgs, stk, syncedTopics, plans, lastCloud]) => {
        if (cancelled) return;
        setAttempts(att);
        setModuleProgress(modProg);
        setWorkshops(ws);
        setAssignments(asgs);
        setStreak(stk);
        setPlanCount(Array.isArray(plans) ? plans.length : 0);
        setLearningPlans(Array.isArray(plans) ? plans : []);
        if (syncedTopics) {
          setCompletedTopicsSet((prev) => {
            if (prev.size === syncedTopics.size && [...prev].every((id) => syncedTopics.has(id))) {
              return prev;
            }
            return syncedTopics;
          });
        }
        if (lastCloud) {
          setLastVisited((prev) => {
            if (
              prev?.topicId === lastCloud.topicId &&
              prev?.moduleId === lastCloud.moduleId &&
              prev?.url === lastCloud.url
            ) {
              return prev;
            }
            return lastCloud;
          });
        } else {
          const localLast = getLastVisitedTopic(user.id);
          setLastVisited((prev) => {
            if (
              prev?.topicId === localLast?.topicId &&
              prev?.moduleId === localLast?.moduleId &&
              prev?.url === localLast?.url
            ) {
              return prev;
            }
            return localLast;
          });
        }

        // Calcular kardex con los datos ya obtenidos en memoria (elimina 5 consultas redundantes a Supabase)
        const nextKardex = await settleWithTimeout(
          calculateStudentKardex(user.id, profile, undefined, undefined, {
            attempts: att,
            moduleProgress: modProg,
            assignments: asgs,
            completedTopicsSet: syncedTopics || undefined,
            workshops: ws,
          }),
          null,
          'kardex'
        );
        if (cancelled) return;
        setKardex(nextKardex);

        // Notifications - pass assignments to include teacher tasks
        const localNotifs = getStudentNotifications(user.id, profile, ws, asgs);
        const serverNotifs = await fetchServerNotifications(user.id);
        if (cancelled) return;
        const mergedNotifs = mergeServerNotifications(localNotifs, serverNotifs).map((n) =>
          isNotificationReadLocally(user.id, n.id) ? { ...n, isRead: true } : n
        );
        setNotifications(mergedNotifs);

        // Notify device in background if permission is active
        const pendingList = asgs.filter((a) => a.status === 'pending');
        if (pendingList.length > 0) {
          void checkAndNotifyPendingAssignments(user.id, asgs);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setActionError('No se pudieron cargar tus datos académicos. Revisa tu conexión e inténtalo de nuevo.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, profile, refreshTrigger]);

  // Detección de urgencia de clase en vivo (dentro de 30 min o en curso)
  const liveUrgency = useMemo(() => {
    return getLiveSessionUrgency(workshops, 30);
  }, [workshops]);
  const isLiveSessionImminent = liveUrgency.isUrgent;

  // Auto-deep-link a la sesión en vivo si el alumno llega con ?join_live=true
  useEffect(() => {
    if (loading || !liveUrgency.isUrgent || !liveUrgency.workshop) return;
    const joinLive = searchParams.get('join_live') === 'true';
    if (joinLive) {
      if (liveUrgency.canAccessStream && liveUrgency.workshop.stream_url) {
        window.open(liveUrgency.workshop.stream_url, '_blank');
      } else {
        navigate(`/taller/${liveUrgency.workshop.id}`);
      }
      searchParams.delete('join_live');
      setSearchParams(searchParams, { replace: true });
    }
  }, [loading, liveUrgency, searchParams, setSearchParams, navigate]);

  const isGuideSnoozedInSession = useCallback(() => {
    try {
      return sessionStorage.getItem('neurosafe_portal_guide_snoozed') === 'true';
    } catch {
      return false;
    }
  }, []);

  const handleSnoozeGuide = () => {
    setGuideOpen(false);
    setGuideDismissedThisVisit(true);
    try {
      sessionStorage.setItem('neurosafe_portal_guide_snoozed', 'true');
    } catch {}
  };

  // Apertura coordinada del modal de tareas (solo si NO hay clase en vivo, ni examen activo, ni guía abierta)
  useEffect(() => {
    if (loading || !user || isLiveSessionImminent || guideOpen) return;

    const isExamActive = Boolean(activeExamLock && (remainingActiveSeconds ?? 1) > 0);
    if (isExamActive) return;

    const pendingList = assignments.filter((a) => a.status === 'pending');
    if (pendingList.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const dismissedDate = localStorage.getItem(`neurosafe_dismiss_pending_modal_${user.id}`);
    let isSnoozedSession = false;
    try {
      isSnoozedSession = sessionStorage.getItem(`neurosafe_pending_tasks_snoozed_${user.id}`) === 'true';
    } catch {}

    if (dismissedDate !== today && !isSnoozedSession) {
      setShowPendingTasksModal(true);
    }
  }, [loading, user, isLiveSessionImminent, guideOpen, activeExamLock, remainingActiveSeconds, assignments]);

  // Derived metrics
  const resumeLesson = useMemo(() => {
    return resolveResumeLesson(completedTopicsSet, lastVisited, undefined, quizGate);
  }, [completedTopicsSet, lastVisited, quizGate]);

  const upcomingPendingLessons = useMemo(() => {
    return listPendingCurriculumLessons(completedTopicsSet, { lastVisited, limit: 4, quizGate });
  }, [completedTopicsSet, lastVisited, quizGate]);

  const pendingLessonByModule = useMemo(() => {
    const map: Record<string, string> = {};
    for (const mod of allModules) {
      const pending = listPendingCurriculumLessons(completedTopicsSet, {
        moduleId: mod.id,
        limit: 1,
        quizGate,
      });
      if (pending[0]) map[mod.id] = pending[0].url;
    }
    return map;
  }, [completedTopicsSet, quizGate]);

  const metrics = useMemo(() => {
    if (!user) return null;
    return calculateStudentMetrics(user.id, moduleProgress, completedTopicsSet);
  }, [user, moduleProgress, completedTopicsSet]);

  const hasStartedCurriculum = (metrics?.totalCompletedCurriculumTopics || 0) > 0 || Boolean(lastVisited);

  const highlightedModules = useMemo(() => {
    if (!metrics) return [];
    const curriculum = metrics.moduleStats.filter((m) => m.countsTowardCurriculum);
    const inProgress = curriculum.filter((m) => m.progressPct > 0 && m.progressPct < 100);
    const notStarted = curriculum.filter((m) => m.progressPct === 0);
    const done = curriculum.filter((m) => m.progressPct === 100);
    return [...inProgress, ...notStarted, ...done].slice(0, 4);
  }, [metrics]);

  const certRequirements = useMemo(() => {
    if (!metrics) return null;
    return checkCertificationEligibility(profile, metrics.overallProgressPct, moduleProgress, kardex);
  }, [profile, metrics, moduleProgress, kardex]);

  // Evitar solapamiento entre la guía de inducción y el modal de tareas pendientes
  useEffect(() => {
    if (guideOpen && showPendingTasksModal) {
      setShowPendingTasksModal(false);
    }
  }, [guideOpen, showPendingTasksModal]);

  // Apertura de la inducción de primer ingreso al portal con bypass para clases en vivo y snooze
  useEffect(() => {
    if (needsAgreementSignature) {
      if (guideOpen) setGuideOpen(false);
      return;
    }
    if (loading || !user || !profile || guideDismissedThisVisit) return;

    const isExamActive = Boolean(activeExamLock && (remainingActiveSeconds ?? 1) > 0);
    if (isExamActive || isLiveSessionImminent || isGuideSnoozedInSession()) {
      if (guideOpen) {
        setGuideOpen(false);
      }
      return;
    }

    if (!guideSourceReady) return;

    const publishedVersion = guidePublishedVersion ?? PORTAL_GUIDE_VERSION;
    if (shouldShowPortalGuide(profile, publishedVersion) && !guideOpen) {
      setGuideStep(0);
      setGuideOpen(true);
    }
  }, [
    loading,
    user,
    profile,
    activeExamLock,
    remainingActiveSeconds,
    guideDismissedThisVisit,
    guideOpen,
    guideSourceReady,
    guidePublishedVersion,
    isLiveSessionImminent,
    isGuideSnoozedInSession,
    needsAgreementSignature,
  ]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    settleWithTimeout(fetchPublishedPortalWelcome(), null, 'portalWelcome', 5000)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setGuideSlides(result.slides);
          setGuidePublishedVersion(result.publishedVersion);
        }
        setGuideSourceReady(true);
      })
      .catch(() => {
        if (!cancelled) setGuideSourceReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Estado del curso para el paso 3 de la guía
  const guideCourseState: PortalGuideCourseState = useMemo(() => {
    if (sellable.some((c) => isEnrolledInCourse(c.id))) return 'active';
    if (sellable.some((c) => isCoursePending(c.id))) return 'pending';
    return 'none';
  }, [sellable, isEnrolledInCourse, isCoursePending]);

  // Etiqueta del botón de acción final en el paso 5
  const guideFinalActionLabel = useMemo(() => {
    if (guideCourseState === 'active') {
      if (resumeLesson) {
        const hasModuleProgress =
          moduleProgress.some(
            (mp) => mp.moduleId === resumeLesson.moduleId && (mp.bestScores?.length || 0) > 0
          ) ||
          Boolean(lastVisited) ||
          (metrics?.overallProgressPct || 0) > 0 ||
          (metrics?.totalCompletedCurriculumTopics || 0) > 0;

        const prefix = hasModuleProgress ? 'Continuar' : 'Empezar';
        return `${prefix}: ${resumeLesson.topicTitle}`;
      }
      return 'Ir a Clases';
    }
    if (guideCourseState === 'pending') {
      return 'Ver estado de mi curso';
    }
    return 'Solicitar admisión';
  }, [guideCourseState, resumeLesson, moduleProgress, lastVisited, metrics]);

  const guideSteps = useMemo(() => {
    const published = guideSlides ? filterSlidesForCourse(guideSlides, guideCourseState) : [];
    if (published.length > 0) return published.map(slideToGuideStep);
    return undefined;
  }, [guideSlides, guideCourseState]);

  // Guardar persistencia en Supabase (RPC propio) y opcionalmente navegar
  const handleSaveGuide = async (action: 'skip' | 'finish') => {
    // Si la acción es 'skip', cerramos la UI de inmediato para 0ms de latencia,
    // y enviamos la persistencia en background sin bloquear la interacción
    if (action === 'skip') {
      setGuideOpen(false);
      setGuideDismissedThisVisit(true);
      void markPortalGuideSeen(guidePublishedVersion ?? PORTAL_GUIDE_VERSION).then(() => {
        void refreshProfile();
      });
      return;
    }

    if (guideSaving) return;
    setGuideSaving(true);
    setGuideError(null);

    const { error } = await markPortalGuideSeen(guidePublishedVersion ?? PORTAL_GUIDE_VERSION);
    if (error) {
      setGuideError(error);
      setGuideSaving(false);
      setGuideOpen(false);
      setGuideDismissedThisVisit(true);
      return;
    }

    await refreshProfile();
    setGuideOpen(false);
    setGuideDismissedThisVisit(true);
    setGuideSaving(false);

    if (action === 'finish') {
      if (guideCourseState === 'active') {
        if (resumeLesson?.url) {
          navigate(resumeLesson.url);
        } else {
          selectTab('modules');
        }
      } else if (guideCourseState === 'pending') {
        selectTab('summary');
        const pendingCourse = sellable.find((c) => isCoursePending(c.id));
        if (pendingCourse) {
          setCourseForModal(pendingCourse);
        }
      } else {
        selectTab('summary');
        const firstSellable = sellable[0];
        if (firstSellable) {
          setCourseForModal(firstSellable);
        }
      }
    }
  };

  // Quizzes list with status
  const quizzesList = useMemo(() => {
    return moduleProgress.flatMap((mp) => {
      return (mp.bestScores || []).map((scoreItem) => {
        return {
          moduleId: mp.moduleId,
          moduleTitle: mp.moduleTitle,
          topicId: scoreItem.topicId,
          topicTitle: scoreItem.topicTitle,
          score: scoreItem.score,
          passed: scoreItem.passed,
          topicUrl: getTopicPublicUrl(mp.moduleId, scoreItem.topicId),
        };
      });
    });
  }, [moduleProgress]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const highestUnreadNotificationTone = useMemo(() => {
    return getHighestUnreadNotificationTone(notifications);
  }, [notifications]);

  const notificationHeaderStyle = useMemo(() => {
    return getNotificationToneStyle(highestUnreadNotificationTone);
  }, [highestUnreadNotificationTone]);

  const pendingAssignments = useMemo(() => {
    return assignments.filter((a) => a.status === 'pending');
  }, [assignments]);

  const pendingAssignmentsCount = pendingAssignments.length;

  const pendingBannerLabel = useMemo(() => {
    if (pendingAssignmentsCount === 0) return '';
    const readingOnly = pendingAssignments.filter(
      (assignment) => describeReadingAssignment(assignment).readingOnly
    ).length;
    if (readingOnly === pendingAssignmentsCount) {
      return pendingAssignmentsCount === 1 ? 'lectura pendiente' : 'lecturas pendientes';
    }
    return pendingAssignmentsCount === 1 ? 'actividad pendiente' : 'actividades pendientes';
  }, [pendingAssignments, pendingAssignmentsCount]);

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAsg || !user) return;
    if (submittingAsg.status !== 'pending' && submittingAsg.status !== 'needs_revision') return;
    if (!submitNotes.trim() && submitAttachmentCount < 1) {
      setActionError('Escribe tu respuesta, sube un archivo o agrega un enlace para entregar.');
      return;
    }
    setSavingSubmission(true);
    try {
      await submitAssignment(submittingAsg.id, user.id, submitNotes.trim() || undefined);
      setSubmittingAsg(null);
      setSubmitNotes('');
      setSubmitAttachmentCount(0);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al enviar la tarea. Inténtalo de nuevo.');
    } finally {
      setSavingSubmission(false);
    }
  };

  const handleSendRetakeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retakeModalAssignment || !user || !retakeReason.trim()) return;
    try {
      setSendingRetake(true);
      await requestExamRetake(retakeModalAssignment.id, user.id, retakeReason.trim());
      const updated = await getStudentAssignments(user.id);
      setAssignments(updated);
      setRetakeModalAssignment(null);
      setRetakeReason('');
      setActionError('Tu solicitud de reintento ha sido enviada al profesor.');
    } catch (err: any) {
      console.error('Error al solicitar reintento:', err);
      setActionError('Hubo un error al enviar la solicitud: ' + (err?.message || 'Intenta de nuevo'));
    } finally {
      setSendingRetake(false);
    }
  };

  const handleStartStrictExam = async () => {
    if (!selectedExamForModal || !user) return;
    setStartingExam(true);
    try {
      const examAssignment = selectedExamForModal;
      const timeLimitMinutes = examAssignment.target_exam_config?.timeLimitMinutes || 20;
      const examConfig = buildAssignedExamConfig(examAssignment);
      const lock = await startAssignedExam(examAssignment.id, user.id, timeLimitMinutes, {
        assignmentTitle: examAssignment.title,
        selectedQuestionIds: examAssignment.target_exam_config?.selectedQuestionIds,
        customQuestions: examAssignment.target_exam_config?.customQuestions,
        config: examConfig,
        moduleId: examConfig.moduleId,
        topicTitle: examAssignment.target_exam_config?.subtopicTitle,
        subtopicTitle: examAssignment.target_subtopic_title || examAssignment.target_exam_config?.subtopicTitle,
      });
      setActiveExamLock(lock);
      setSelectedExamForModal(null);
      setAcceptedExamRules(false);
      navigate('/examenes/sesion', { state: assignedExamLocationState(examAssignment, lock) });
    } catch (err) {
      console.error('Error starting strict exam:', err);
      setActionError('No se pudo iniciar el examen. Por favor intenta de nuevo.');
    } finally {
      setStartingExam(false);
    }
  };

  const resumeAssignedExam = (assignment: StudentAssignment, lock?: ActiveExamLock | null) => {
    navigate('/examenes/sesion', { state: assignedExamLocationState(assignment, lock ?? activeExamLock) });
  };

  useEffect(() => {
    const handleProgress = (event: Event) => {
      const customEvt = event as CustomEvent<{ userId?: string }>;
      if (customEvt?.detail?.userId && customEvt.detail.userId !== user?.id) {
        return;
      }
      if (user?.id) {
        const nextCompleted = getCompletedTopics(user.id);
        setCompletedTopicsSet((prev) => {
          if (prev.size === nextCompleted.size && [...prev].every((id) => nextCompleted.has(id))) {
            return prev;
          }
          return nextCompleted;
        });
        const nextLast = getLastVisitedTopic(user.id);
        setLastVisited((prev) => {
          if (
            prev?.topicId === nextLast?.topicId &&
            prev?.moduleId === nextLast?.moduleId &&
            prev?.url === nextLast?.url
          ) {
            return prev;
          }
          return nextLast;
        });
      }
      setRefreshTrigger((prev) => prev + 1);
    };
    window.addEventListener(TOPIC_PROGRESS_EVENT, handleProgress);
    return () => window.removeEventListener(TOPIC_PROGRESS_EVENT, handleProgress);
  }, [user?.id]);

  // Monitoreo de examen asignado en curso (tiempo continuo)
  useEffect(() => {
    if (!user) return;
    const checkLock = () => {
      const lock = getActiveExamLock(user.id);
      if (lock) {
        const ms = new Date(lock.expiresAt).getTime();
        const diff = Math.max(0, Math.floor((ms - Date.now()) / 1000));
        if (diff > 0) {
          setActiveExamLock(lock);
          setRemainingActiveSeconds(diff);
        } else {
          setActiveExamLock(null);
          setRemainingActiveSeconds(0);
        }
      } else {
        setActiveExamLock((prev) => (prev !== null ? null : prev));
        setRemainingActiveSeconds((prev) => (prev !== null ? null : prev));
      }
    };
    checkLock();
    const interval = setInterval(checkLock, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleToggleTopic = (topicId: string, e: React.MouseEvent, childIds?: string[]) => {
    e.stopPropagation();
    if (!user) return;

    let found: ReturnType<typeof findTopicInTree> = null;
    let moduleId: string | null = null;
    for (const mod of allModules) {
      found = findTopicInTree(mod.topics, topicId);
      if (found) {
        moduleId = mod.id;
        break;
      }
    }

    const currentlyDone = found
      ? isCurriculumNodeCompleted(found, completedTopicsSet, quizGate)
      : isTopicCompleted(user.id, topicId);

    if (found && !currentlyDone && topicHasEvaluation(found, quizGate) && !areRequiredQuizzesPassed(found, quizGate)) {
      const url = getTopicPublicUrl(moduleId || '', topicId) || `/modulo/${moduleId}/${topicId}`;
      navigate(`${url}#evaluacion`);
      return;
    }

    toggleTopicCompleted(user.id, topicId, childIds);
    setCompletedTopicsSet(getCompletedTopics(user.id));
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleMarkNotifRead = (id: string) => {
    if (!user) return;
    markNotificationAsRead(user.id, id);
    void markServerNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllNotifsRead = () => {
    if (!user) return;
    markAllNotificationsAsRead(
      user.id,
      notifications.map((n) => n.id)
    );
    void markAllServerNotificationsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleAttendNotification = (notif: StudentNotification) => {
    handleMarkNotifRead(notif.id);
    if (!notif.linkUrl) return;
    if (notif.linkUrl.startsWith('/portal?') || notif.linkUrl.startsWith('/dashboard?')) {
      const queryString = notif.linkUrl.split('?')[1] || '';
      const params = new URLSearchParams(queryString);
      const targetTab = params.get('tab');
      if (
        targetTab &&
        ['summary', 'performance', 'modules', 'quizzes', 'assignments', 'notifications', 'certificate', 'study'].includes(
          targetTab
        )
      ) {
        selectTab(targetTab as StudentPortalTab);
        return;
      }
    }
    navigate(notif.linkUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            Cargando expediente y progreso académico…
          </p>
        </div>
      </div>
    );
  }

  const rawDisplayName = profile?.display_name || user?.email?.split('@')[0] || 'Médico Residente';
  const cleanDisplayName = rawDisplayName.replace(/^((dr\(a\)|dr|dra)\.?\s*)+/i, '').trim();
  const shortDoctorName = cleanDisplayName.split(/\s+/).slice(0, 2).join(' ') || cleanDisplayName;
  const displayName = rawDisplayName;

  return (
    <div id="contenido-principal" className="min-h-screen pt-16 sm:pt-20 pb-20 px-3 sm:px-6 lg:px-8 xl:px-10 max-w-[1680px] 2xl:max-w-[1800px] mx-auto">
      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-900 text-sm" role="alert">
          {actionError}
        </div>
      )}

      {/* ─── BANNER FAST-TRACK: CLASE EN VIVO INMINENTE O EN PROGRESO (FASE 2) ─── */}
      {liveUrgency.isUrgent && liveUrgency.workshop && !dismissedLiveBanner && (
        <aside
          aria-label="Acceso prioritario a clase en vivo"
          className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700 text-white shadow-xl shadow-rose-950/20 border border-white/20 animate-fade-in relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 border border-white/30 shadow-md">
                <Video className="w-6 h-6 animate-pulse text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-rose-700 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
                    {liveUrgency.isLiveNow ? 'EN VIVO AHORA' : `COMIENZA EN ${liveUrgency.startsInMinutes ?? 0} MIN`}
                  </span>
                  <span className="text-xs font-semibold text-rose-100 uppercase tracking-wider">
                    Acceso Prioritario Fast-Track
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1 leading-snug">
                  {liveUrgency.workshop.title}
                </h3>
                <p className="text-xs text-rose-100/90 mt-0.5 line-clamp-1">
                  {liveUrgency.workshop.description || 'Taller clínico y discusión electromiográfica en tiempo real.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
              {liveUrgency.canAccessStream && liveUrgency.workshop.stream_url ? (
                <a
                  href={liveUrgency.workshop.stream_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-rose-700 hover:bg-rose-50 shadow-lg shadow-black/20 hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-rose-600 text-rose-600" />
                  <span>Entrar al Stream Directo</span>
                </a>
              ) : (
                <Link
                  to={`/taller/${liveUrgency.workshop.id}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-rose-700 hover:bg-rose-50 shadow-lg shadow-black/20 hover:scale-[1.02] transition-all"
                >
                  <Video className="w-4 h-4" />
                  <span>Entrar a la Sala del Taller</span>
                </Link>
              )}

              <Link
                to={`/taller/${liveUrgency.workshop.id}`}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition"
              >
                Ver Ficha
              </Link>

              <button
                type="button"
                onClick={() => setDismissedLiveBanner(true)}
                className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Minimizar aviso"
                aria-label="Cerrar banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ─── Hero Header (Compacto en móvil con CTA principal en primera pantalla) ─── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-6 md:p-8 shadow-xl border border-indigo-500/20 mb-4 sm:mb-6">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          {/* Columna izquierda: Saludo compacto, Cursos en carrusel y Equipo docente condensado */}
          <div className="space-y-2.5 min-w-0 flex-1">
            {/* Fila 1: Saludo de 1 línea + Racha a la derecha */}
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white truncate">
                <span className="sm:hidden">Hola, Dr(a). {shortDoctorName}</span>
                <span className="hidden sm:inline">Hola, Dr(a). {cleanDisplayName}</span>
              </h1>

              {streak && streak.currentStreak > 0 && (
                <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/25 text-orange-300 border border-orange-400/40 font-mono tabular-nums">
                  <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                  <span className="sm:hidden">{streak.currentStreak}d</span>
                  <span className="hidden sm:inline">
                    Racha: {streak.currentStreak} {streak.currentStreak === 1 ? 'día' : 'días'}
                  </span>
                </span>
              )}
            </div>

            {/* Fila 2: Datos institucionales condensados (12-13px) */}
            {(profile?.specialty || profile?.institution) && (
              <div className="flex items-center gap-2 text-xs text-slate-300 truncate">
                {profile?.specialty && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{profile.specialty}</span>
                  </span>
                )}
                {profile?.specialty && profile?.institution && (
                  <span className="text-slate-500 shrink-0">·</span>
                )}
                {profile?.institution && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{profile.institution}</span>
                  </span>
                )}
              </div>
            )}

            {/* Foco de Acción Principal en Móvil ("Continuar donde te quedaste" arriba del doblez) */}
            <div className="md:hidden bg-white/10 dark:bg-slate-900/70 rounded-xl p-3.5 border border-white/15">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <Play className="w-3 h-3 text-blue-400 fill-blue-400" />
                  {resumeLesson
                    ? hasStartedCurriculum
                      ? 'Continuar donde te quedaste'
                      : 'Empieza tu formación'
                    : 'Curso al día'}
                </p>
                {resumeLesson && (
                  <span className="text-[11px] font-mono tabular-nums text-slate-300">
                    {resumeLesson.pendingLessonCount} pend.
                  </span>
                )}
              </div>

              {resumeLesson ? (
                <div>
                  <p className="text-sm font-bold text-white line-clamp-1">
                    {resumeLesson.topicTitle}
                  </p>
                  <p className="text-xs text-slate-300 line-clamp-1 mb-2.5">
                    Módulo {resumeLesson.moduleNumber}: {resumeLesson.moduleTitle}
                    {resumeLesson.firstIncompleteChildTitle
                      ? ` · ${resumeLesson.firstIncompleteChildTitle}`
                      : ''}
                  </p>
                  <Link
                    to={resumeLesson.url}
                    onClick={() => {
                      if (user && resumeLesson) {
                        setLastVisitedTopic(user.id, {
                          moduleId: resumeLesson.moduleId,
                          moduleTitle: resumeLesson.moduleTitle,
                          topicId: resumeLesson.firstIncompleteChildId || resumeLesson.topicId,
                          topicTitle:
                            resumeLesson.firstIncompleteChildTitle || resumeLesson.topicTitle,
                          url: resumeLesson.url,
                          updatedAt: new Date().toISOString(),
                        });
                      }
                    }}
                    className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                  >
                    <span>{hasStartedCurriculum ? 'Continuar lección' : 'Empezar curso'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <p className="text-xs font-medium text-slate-200">
                    Has completado todas las lecciones
                  </p>
                  <button
                    type="button"
                    onClick={() => selectTab('modules')}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white"
                  >
                    <span>Repasar</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Cursos Activos en Carrusel Horizontal (Pills compactas con snap en móvil) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x pt-0.5">
              <span className="text-[11px] font-semibold text-slate-300 shrink-0">Cursos:</span>
              {sellable.filter((course) => isEnrolledInCourse(course.id)).length > 0 ? (
                sellable
                  .filter((course) => isEnrolledInCourse(course.id))
                  .map((course) => {
                    const cId = course.id;
                    const title = course.title;
                    return (
                      <Link
                        key={cId}
                        to={`/portal/curso/${cId}`}
                        className="snap-start shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 hover:text-white border border-emerald-400/40 transition cursor-pointer"
                        title={`Ir al portal y temario de ${title}`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="max-w-[180px] sm:max-w-none truncate">{title}</span>
                        <ArrowRight className="w-3 h-3 text-emerald-400/80 shrink-0" />
                      </Link>
                    );
                  })
              ) : (
                <span className="text-xs text-slate-400 italic shrink-0">
                  Sin cursos activos aún
                </span>
              )}

              {pendingCourseIds.map((cId) => {
                const courseObj = grouped.find((g) => g.course.id === cId)?.course;
                const title = courseObj?.title ?? cId;
                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => courseObj && setCourseForModal(courseObj)}
                    className="snap-start shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30 transition cursor-pointer"
                    title="Solicitud registrada. Haz clic para ver detalles."
                  >
                    <Clock className="w-3 h-3 text-amber-400 animate-pulse shrink-0" />
                    <span className="max-w-[150px] truncate">En espera: {title}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  if (activeExamLock && (remainingActiveSeconds ?? 1) > 0) return;
                  setGuideStep(0);
                  setGuideError(null);
                  setGuideOpen(true);
                }}
                disabled={Boolean(activeExamLock && (remainingActiveSeconds ?? 1) > 0)}
                className="snap-start shrink-0 relative inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/20 transition cursor-pointer disabled:opacity-50"
              >
                <BellRing className="w-3 h-3 text-blue-300 shrink-0" />
                <span>Novedades</span>
                {shouldShowPortalGuide(profile, guidePublishedVersion ?? PORTAL_GUIDE_VERSION) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setCommitteeModalOpen(true)}
                className="snap-start shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-200 hover:text-white border border-indigo-400/40 transition cursor-pointer"
              >
                <Scale className="w-3 h-3 text-indigo-300 shrink-0" />
                <span>Comité editorial</span>
              </button>
            </div>

            {/* ─── Equipo Docente Condensado (Micro-avatares + Enlace discreto en 1 línea) ─── */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {teachers.length > 0 && (
                  <div className="flex -space-x-1.5 shrink-0">
                    {teachers.slice(0, 5).map((t) => {
                      const initials = t.display_name
                        .replace(/^((dr\(a\)|dr|dra)\.?\s*)+/i, '')
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0] || '')
                        .join('')
                        .toUpperCase();
                      return (
                        <Link
                          key={t.id}
                          to={`/especialistas/${t.id}`}
                          title={t.display_name}
                          className="w-6 h-6 rounded-full bg-indigo-800 border border-indigo-400/50 text-[9px] font-bold text-blue-100 flex items-center justify-center hover:z-10 hover:scale-110 transition-transform"
                        >
                          {initials || 'DR'}
                        </Link>
                      );
                    })}
                  </div>
                )}
                <span className="text-slate-300 truncate">
                  {loadingTeachers
                    ? 'Cargando equipo docente…'
                    : teachers.length > 0
                      ? `${teachers.length} docentes titulares y colaboradores`
                      : 'Equipo docente del diplomado'}
                </span>
              </div>

              <Link
                to="/especialistas"
                className="shrink-0 font-semibold text-blue-300 hover:text-white hover:underline inline-flex items-center gap-1 transition"
              >
                <span>Ver equipo docente ({teachers.length})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Quick Resume Card (Desktop / Tablet >= md) */}
          <div className="hidden md:block shrink-0 bg-white/10 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 max-w-sm w-full">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-1 flex items-center gap-1.5">
              <Play className="w-3 h-3 text-blue-400 fill-blue-400" />
              {resumeLesson
                ? hasStartedCurriculum
                  ? 'Continuar donde te quedaste'
                  : 'Empieza tu formación'
                : 'Curso al día'}
            </p>
            {resumeLesson ? (
              <div>
                <p className="text-sm font-bold text-white line-clamp-2">{resumeLesson.topicTitle}</p>
                <p className="text-xs text-slate-300 line-clamp-1">
                  Módulo {resumeLesson.moduleNumber}: {resumeLesson.moduleTitle}
                </p>
                {resumeLesson.firstIncompleteChildTitle && (
                  <p className="text-xs text-blue-200/90 line-clamp-1 mt-1">
                    Siguiente: {resumeLesson.firstIncompleteChildTitle}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-2 mb-3">
                  {resumeLesson.pendingLessonCount}{' '}
                  {resumeLesson.pendingLessonCount === 1 ? 'tema pendiente' : 'temas pendientes'} en el curso
                </p>
                <Link
                  to={resumeLesson.url}
                  onClick={() => {
                    if (user && resumeLesson) {
                      setLastVisitedTopic(user.id, {
                        moduleId: resumeLesson.moduleId,
                        moduleTitle: resumeLesson.moduleTitle,
                        topicId: resumeLesson.firstIncompleteChildId || resumeLesson.topicId,
                        topicTitle: resumeLesson.firstIncompleteChildTitle || resumeLesson.topicTitle,
                        url: resumeLesson.url,
                        updatedAt: new Date().toISOString(),
                      });
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                >
                  {hasStartedCurriculum ? 'Continuar lección' : 'Empezar curso'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-white">Has completado todas las lecciones</p>
                <p className="text-xs text-slate-300 mb-3">Puedes repasar cualquier módulo cuando lo desees</p>
                <button
                  type="button"
                  onClick={() => selectTab('modules')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                >
                  Repasar módulos
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── BANNER DE EXAMEN ASIGNADO EN CURSO (TIEMPO CONTINUO) ─── */}
      {activeExamLock && remainingActiveSeconds !== null && remainingActiveSeconds > 0 && (
        <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-red-500/15 to-indigo-500/15 border-2 border-amber-500/60 dark:border-amber-500/50 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse">
                  Evaluación Activa
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeExamLock.assignmentTitle}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                Tiempo restante:{' '}
                <strong className="text-red-600 dark:text-red-400 font-mono font-black text-sm tracking-wide">
                  {formatRemainingExamTime(remainingActiveSeconds)}
                </strong>
                . El cronómetro corre de forma continua en tiempo real.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const asg = assignments.find((a) => a.id === activeExamLock.assignmentId);
              if (asg) {
                resumeAssignedExam(asg, activeExamLock);
                return;
              }
              navigate('/examenes/sesion', {
                state: {
                  assignmentId: activeExamLock.assignmentId,
                  config: buildAssignedExamConfig(
                    {
                      id: activeExamLock.assignmentId,
                      student_id: user?.id || '',
                      title: activeExamLock.assignmentTitle,
                      type: 'exam',
                      description: '',
                      due_date: activeExamLock.expiresAt,
                      status: 'pending',
                      priority: 'normal',
                      created_at: activeExamLock.startedAt,
                      updated_at: activeExamLock.startedAt,
                      target_exam_config: {
                        ...activeExamLock.config,
                        selectedQuestionIds: activeExamLock.selectedQuestionIds,
                        timeLimitMinutes: activeExamLock.timeLimitMinutes,
                        moduleId: activeExamLock.moduleId,
                      },
                      target_module_id: activeExamLock.moduleId,
                    },
                    activeExamLock
                  ),
                  expiresAt: activeExamLock.expiresAt,
                  strictLock: true,
                  selectedQuestionIds: activeExamLock.selectedQuestionIds,
                  assignmentTitle: activeExamLock.assignmentTitle,
                },
              });
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-black shadow-lg shadow-red-600/30 transition cursor-pointer text-center whitespace-nowrap"
          >
            Reanudar Examen Ahora →
          </button>
        </div>
      )}

      {/* Banner de Solicitudes en Lista de Espera */}
      {pendingCourseIds.length > 0 && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-100">
                Tienes {pendingCourseIds.length}{' '}
                {pendingCourseIds.length === 1 ? 'curso' : 'cursos'} en Lista de Espera de Admisión
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Tu solicitud fue recibida por orden cronológico. El profesor titular evaluará tu admisión en breve.
              </p>
            </div>
          </div>
          <Link
            to="/cursos"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-200/70 dark:bg-amber-900/50 hover:bg-amber-200 text-amber-900 dark:text-amber-100 text-xs font-bold transition shrink-0"
          >
            <span>Ver oferta y estado</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ─── KPI Cards (En móvil: 1 fila compacta de 3 columnas + tira de Kardex; en desktop: 4 columnas) ─── */}
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {/* 1. Progreso Global */}
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Progreso
            </span>
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1 mb-1.5">
            <span className="text-lg sm:text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white leading-none">
              {metrics?.overallProgressPct || 0}%
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400">
              del currículo
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mb-1">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics?.overallProgressPct || 0}%` }}
            />
          </div>
          <p className="text-[10px] sm:text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
            {metrics?.totalCompletedCurriculumTopics || 0}/{metrics?.totalCurriculumTopics || 0}{' '}
            <span className="hidden sm:inline">lecciones</span>
            <span className="sm:hidden">lecc.</span>
          </p>
        </div>

        {/* 2. Créditos CME / Horas Académicas */}
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Horas CME
            </span>
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1 mb-1.5">
            <span className="text-lg sm:text-2xl font-extrabold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 leading-none">
              {metrics?.cmeCreditsEarned || 0}
            </span>
            <span className="text-[10px] sm:text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              /{metrics?.maxCmeCredits || 40}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mb-1">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round(((metrics?.cmeCreditsEarned || 0) / (metrics?.maxCmeCredits || 40)) * 100))}%`,
              }}
            />
          </div>
          <p className="text-[10px] sm:text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
            {metrics?.academicHoursEarned || 0}/{metrics?.maxAcademicHours || 80}h{' '}
            <span className="hidden sm:inline">lectivas</span>
          </p>
        </div>

        {/* 3. Evaluaciones Aprobadas */}
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Quizzes
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1 mb-1.5">
            <span className="text-lg sm:text-2xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 leading-none">
              {certRequirements?.quizzesPassedCount || 0}
            </span>
            <span className="text-[10px] sm:text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
              ({certRequirements?.averageScore || 0}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mb-1">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round(((certRequirements?.quizzesPassedCount || 0) / Math.max(1, certRequirements?.totalQuizzesAvailable || 13)) * 100))}%`,
              }}
            />
          </div>
          <p className="text-[10px] sm:text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
            {attempts.length} <span className="hidden sm:inline">intentos registrados</span>
            <span className="sm:hidden">intentos</span>
          </p>
        </div>

        {/* 4. Desempeño Capa A (Tira horizontal en móvil, 4.ª columna en desktop) */}
        <button
          type="button"
          onClick={() => selectTab('performance')}
          className="col-span-3 lg:col-span-1 px-3 py-2 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-indigo-400 transition text-left flex lg:flex-col items-center lg:items-stretch justify-between gap-2 cursor-pointer"
        >
          <div className="flex items-center lg:justify-between gap-2">
            <div
              className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${
                kardex?.isPassing
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600'
              }`}
            >
              <FileCheck className="w-4 h-4" />
            </div>
            <div className="lg:hidden flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Kardex Capa A:
              </span>
              <span className="text-sm font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                {kardex?.finalGrade ?? '—'}/100
              </span>
            </div>
            <span className="hidden lg:inline text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Desempeño Capa A
            </span>
          </div>

          <div className="hidden lg:block">
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white leading-none">
                {kardex?.finalGrade ?? '—'}
              </span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">/ 100</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1">
              {kardex?.isOfficial
                ? kardex.isPassing
                  ? 'Dictamen: acreditado'
                  : 'Dictamen: aún no acredita'
                : 'Promedio 30+30+20+20'}
            </p>
          </div>

          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-0.5 shrink-0">
            <span>Cómo me evalúan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>

      {/* ─── Top Urgent Alert Banner (Teacher Assigned Activities) ─── */}
      {pendingAssignmentsCount > 0 && !dismissedTopBanner && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-blue-500/10 dark:from-amber-950/40 dark:via-indigo-950/40 dark:to-blue-950/30 border border-amber-300/80 dark:border-amber-700/60 shadow-md backdrop-blur-md animate-fade-in mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30 shrink-0">
                <BellRing className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white">
                    Actividades Pendientes de tu Profesor
                  </span>
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                    {pendingAssignmentsCount} {pendingBannerLabel}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-1 font-medium">
                  {assignments.find((a) => a.status === 'pending') ? (
                    <>
                      Próxima:{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {assignments.find((a) => a.status === 'pending')?.title}
                      </strong>{' '}
                      (Fecha límite:{' '}
                      {new Date(assignments.find((a) => a.status === 'pending')!.due_date).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      )
                    </>
                  ) : (
                    'Tienes tareas y evaluaciones asignadas por tus profesores.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPendingTasksModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-750 border border-indigo-200 dark:border-indigo-800 transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ver Resumen</span>
              </button>
              <button
                type="button"
                onClick={() => selectTab('assignments')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white transition shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <span>Ir a Tareas Asignadas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDismissedTopBanner(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                title="Minimizar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <StudentPortalTabBar
        activeTab={activeTab}
        onSelect={selectTab}
        notificationTone={highestUnreadNotificationTone}
        counts={{
          assignments: pendingAssignmentsCount,
          notifications: unreadCount,
          quizzes: quizzesList.filter((q) => !q.passed).length,
        }}
      />

      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
      {/* ─── TAB 1: Resumen General ─── */}
      {activeTab === 'summary' && (
        <div className="space-y-8">
          <StudentQuickControlHub
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkNotifRead={handleMarkNotifRead}
            onMarkAllNotifsRead={handleMarkAllNotifsRead}
            onAttendNotification={handleAttendNotification}
            resumeLesson={resumeLesson}
            hasStartedCurriculum={hasStartedCurriculum}
            overallProgressPct={metrics?.overallProgressPct || 0}
            upcomingPendingLessons={upcomingPendingLessons}
            workshops={workshops}
            assignments={assignments}
            quizzesList={quizzesList}
            kardex={kardex}
            profile={profile}
            learningPlans={learningPlans}
            onSelectTab={selectTab}
            onSelectExam={(asg) => {
              setSelectedExamForModal(asg);
              setAcceptedExamRules(false);
            }}
            onOpenAssignedCase={(asg) => {
              openAssignedCase(asg);
            }}
            onOpenSubmitModal={(asg, initialNotes = '') => {
              setSubmittingAsg(asg);
              setSubmitNotes(initialNotes);
            }}
            onOpenKardexModal={() => setShowKardexModal(true)}
            onRecordResumeClick={(lesson) => {
              if (user) {
                setLastVisitedTopic(user.id, {
                  moduleId: lesson.moduleId,
                  moduleTitle: lesson.moduleTitle,
                  topicId: lesson.firstIncompleteChildId || lesson.topicId,
                  topicTitle: lesson.firstIncompleteChildTitle || lesson.topicTitle,
                  url: lesson.url,
                  updatedAt: new Date().toISOString(),
                });
              }
            }}
          />

          {/* ─── Cursos en los que estás Activo y Cursando Actualmente ─── */}
          <section className="p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/20">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      Cursos en los que estás Activo y Cursando
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/60">
                      {sellable.filter((course) => isEnrolledInCourse(course.id)).length} de {sellable.length} activos
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Programas avalados por COMEFYR con admisión individual y suscripción verificada.
                  </p>
                </div>
              </div>
              <Link
                to="/cursos"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline shrink-0"
              >
                <span>Ver catálogo y oferta académica</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className={`grid grid-cols-1 gap-4 ${sellable.length >= 3 ? 'md:grid-cols-3' : sellable.length === 2 ? 'md:grid-cols-2' : ''}`}>
              {sellable.map((course) => {
                const courseId = course.id;
                const ids = moduleIdsForCourse(courseAssignments, courseId);
                const courseStats = (metrics?.moduleStats ?? []).filter((m) => ids.includes(m.moduleId));
                const coursePct =
                  courseStats.length > 0
                    ? Math.round(courseStats.reduce((acc, m) => acc + m.progressPct, 0) / courseStats.length)
                    : 0;
                const completed = courseStats.reduce((acc, m) => acc + m.completedTopics, 0);
                const total = courseStats.reduce((acc, m) => acc + m.totalTopics, 0);
                const unlocked = isEnrolledInCourse(courseId);
                const isPending = isCoursePending(courseId);
                const title = course.title;

                return (
                  <div
                    key={courseId}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      unlocked
                        ? 'border-emerald-300/80 dark:border-emerald-700/60 bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900/90 dark:to-slate-900 shadow-xs hover:shadow-md'
                        : isPending
                        ? 'border-amber-300 dark:border-amber-700/60 bg-gradient-to-b from-amber-50/40 via-white to-white dark:from-amber-950/20 dark:via-slate-900/90 dark:to-slate-900 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {courseId === 'principiante'
                            ? 'Nivel 1'
                            : courseId === 'intermedio'
                            ? 'Nivel 2'
                            : courseId === 'avanzado'
                            ? 'Nivel 3'
                            : `Nivel ${course.sort_order || 4}`}
                        </span>
                        {unlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activo / Cursando
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white animate-pulse shadow-2xs">
                            <Clock className="w-3.5 h-3.5" /> En Lista de Espera
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                            <Lock className="w-3 h-3" /> Requiere Admisión
                          </span>
                        )}
                      </div>

                      {unlocked ? (
                        <Link
                          to={`/portal/curso/${courseId}`}
                          className="group block"
                          title={`Ir al panel de ${title}`}
                        >
                          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {title}
                          </h3>
                        </Link>
                      ) : (
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                          {title}
                        </h3>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                        {course.description || 'Programa de especialización clínica.'}
                      </p>

                      {unlocked ? (
                        <div className="space-y-2 mb-4">
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Avance del curso:</span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{coursePct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${coursePct}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {completed} de {total} temas leídos ({ids.length} módulos)
                          </p>
                        </div>
                      ) : isPending ? (
                        <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-200">
                          <p className="font-medium">Tu solicitud está en revisión oficial por el profesor titular.</p>
                        </div>
                      ) : (
                        <div className="p-2.5 mb-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Inversión:</span>
                          <span className="font-extrabold text-slate-900 dark:text-cyan-300">
                            {course.price_display || 'Consultar'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {unlocked ? (
                        <Link
                          to={`/portal/curso/${courseId}`}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm hover:shadow-md transition cursor-pointer"
                        >
                          <span>{coursePct === 100 ? 'Repasar curso' : coursePct > 0 ? 'Continuar clases' : 'Empezar clases'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : isPending ? (
                        <button
                          type="button"
                          onClick={() => setCourseForModal(course)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Ver estado de espera</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCourseForModal(course)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-blue-400/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-cyan-400 text-xs font-bold transition cursor-pointer"
                        >
                          <span>Solicitar admisión</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ─── Cuerpo Docente del Curso y Dirección Académica ─── */}
          <section className="p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      Cuerpo Docente y Comité Editorial
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300/60">
                      Colaboradores Docentes
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Profesores titulares, médicos evaluadores y consejo editorial que dictan y validan el contenido formativo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCommitteeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Ver Comité Editorial</span>
                </button>
                <Link
                  to="/especialistas"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline shrink-0"
                >
                  <span>Directorio completo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {teachers.map((teacher) => (
                <Link
                  key={teacher.id}
                  to={`/especialistas/${teacher.id}`}
                  className="group p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-50/50 via-white to-white dark:from-slate-800/30 dark:via-slate-900/60 dark:to-slate-900/60 hover:border-blue-300 dark:hover:border-cyan-500/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                        {teacher.avatar_url ? (
                          <img src={teacher.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{teacher.display_name?.charAt(0)?.toUpperCase() || 'Dr'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-300/40">
                          <GraduationCap className="w-3 h-3" /> Colaborador Docente
                        </span>
                        {teacher.cedula_verified && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> SEP
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {teacher.display_name}
                    </h3>
                    {teacher.specialty && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 truncate">
                        <Stethoscope className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{teacher.specialty}</span>
                      </p>
                    )}
                    {teacher.institution && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{teacher.institution}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-cyan-400">
                    <span>Ver expediente docente</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Two-column layout: Left Módulos en curso, Right: Talleres en vivo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left 2 Cols: Módulos en Curso (Vista rápida) */}
            <div className="lg:col-span-2">
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        Tus módulos
                      </h2>
                      <p className="text-xs text-slate-500">
                        Continúa el curso desde el módulo que estés trabajando
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => selectTab('modules')}
                    className="text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Ver los 13 módulos
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {highlightedModules.map((mod) => (
                    <div
                      key={mod.moduleId}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-300 dark:hover:border-blue-700 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-lg">{mod.emoji}</span>
                          <span className="text-xs font-semibold font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {mod.progressPct}%
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 mb-1">
                          {mod.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-mono tabular-nums">
                          {mod.completedTopics} de {mod.totalTopics} lecciones leídas
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${mod.progressPct}%` }}
                          />
                        </div>
                        <Link
                          to={pendingLessonByModule[mod.moduleId] || `/modulo/${mod.moduleId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline"
                        >
                          {mod.progressPct === 100
                            ? 'Repasar módulo'
                            : mod.progressPct > 0
                            ? 'Continuar'
                            : 'Empezar'}{' '}
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Talleres en vivo COMEFYR */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Talleres en Vivo
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to="/talleres"
                      className="text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline"
                    >
                      Ver sesiones y grabaciones
                    </Link>
                    <Link
                      to="/biblioteca"
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline hidden sm:inline"
                    >
                      Biblioteca ↗
                    </Link>
                  </div>
                </div>

                {workshops.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
                    <Calendar className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Sin sesiones programadas hoy
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 mb-3">
                      Las convocatorias a webinars y talleres clínicos se publican en este panel.
                    </p>
                    <Link
                      to="/talleres"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline"
                    >
                      Ver catálogo de clases grabadas →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workshops.map((w) => (
                      <div
                        key={w.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-mono tabular-nums bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {new Date(w.scheduled_at).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          {w.recording_url && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                              Grabación lista
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                          {w.title}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 mb-2">
                          {w.description || 'Discusión de casos clínicos y electromiografía en vivo.'}
                        </p>
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/taller/${w.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Ver detalles <ChevronRight className="w-3 h-3" />
                          </Link>
                          {w.recording_url && (
                            <a
                              href={w.recording_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline"
                            >
                              Ver grabación ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Mis Clases y Módulos ─── */}
      {activeTab === 'modules' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Plan de estudios
              </h2>
              <p className="text-sm text-slate-500">
                Tres cursos independientes: Principiante, Intermedio y Avanzado. La referencia rápida se desbloquea con cualquiera.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchModuleQuery}
                onChange={(e) => setSearchModuleQuery(e.target.value)}
                placeholder="Buscar módulo o tema…"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {nextSuggested && (
            <Link
              to="/cursos"
              className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30 text-sm"
            >
              <span>
                Siguiente curso sugerido:{' '}
                <strong>{grouped.find((g) => g.course.id === nextSuggested)?.course.title}</strong>
              </span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <div className={`grid gap-3 ${sellable.length >= 3 ? 'sm:grid-cols-3' : sellable.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
            {sellable.map((course) => {
              const courseId = course.id;
              const ids = moduleIdsForCourse(courseAssignments, courseId);
              const stats = (metrics?.moduleStats ?? []).filter((m) => ids.includes(m.moduleId));
              const pct =
                stats.length > 0
                  ? Math.round(stats.reduce((acc, m) => acc + m.progressPct, 0) / stats.length)
                  : 0;
              const unlocked = isEnrolledInCourse(courseId);
              const isPending = isCoursePending(courseId);
              const title = course.title;

              return (
                <div key={courseId} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold flex items-center gap-2">
                      {title}
                      {!unlocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                    </p>
                    {unlocked ? (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                        Activo
                      </span>
                    ) : isPending ? (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md animate-pulse">
                        En lista
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-slate-500 mt-1">{pct}% de avance</p>
                  <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
                  </div>

                  {unlocked ? (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {ids.length} {ids.length === 1 ? 'módulo' : 'módulos'}
                      </span>
                      <Link
                        to={`/portal/curso/${courseId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-cyan-400 hover:underline cursor-pointer"
                      >
                        <span>Ir a clases</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : !unlocked && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                      {isPending ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-500" /> En lista de espera
                          </span>
                          <button
                            type="button"
                            onClick={() => setCourseForModal(course)}
                            className="text-[11px] font-semibold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                          >
                            Ver estado
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {course.price_display ? course.price_display : 'Requiere admisión'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCourseForModal(course)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                          >
                            <span>Solicitar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Filtro rápido por curso / nivel */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">Filtrar por nivel:</span>
            <button
              type="button"
              onClick={() => setModuleCourseFilter('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                moduleCourseFilter === 'todos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              Todos los módulos
            </button>
            {sellable.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setModuleCourseFilter(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  moduleCourseFilter === c.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {metrics?.moduleStats
              .filter((m) => {
                if (moduleCourseFilter !== 'todos') {
                  const allowedIds = moduleIdsForCourse(courseAssignments, moduleCourseFilter);
                  if (!allowedIds.includes(m.moduleId)) return false;
                }
                return (
                  !searchModuleQuery ||
                  m.title.toLowerCase().includes(searchModuleQuery.toLowerCase()) ||
                  m.moduleId.toLowerCase().includes(searchModuleQuery.toLowerCase())
                );
              })
              .map((mod) => {
                const isExpanded = expandedModuleId === mod.moduleId;
                const fullModule = allModules.find((m) => m.id === mod.moduleId);

                return (
                  <div
                    key={mod.moduleId}
                    className="flex flex-col justify-between p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                          {mod.emoji}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            !mod.countsTowardCurriculum
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              : mod.progressPct === 100
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : mod.progressPct > 0
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {!mod.countsTowardCurriculum
                            ? 'Consulta'
                            : mod.progressPct === 100
                            ? 'Completado'
                            : mod.progressPct > 0
                            ? `${mod.progressPct}% en progreso`
                            : 'Por iniciar'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                        {mod.title}
                      </h3>

                      <p className="text-xs text-slate-500 mb-3">
                        {mod.countsTowardCurriculum
                          ? `${mod.completedTopics} de ${mod.totalTopics} temas completados${mod.quizPassed ? ' · Evaluación aprobada' : ''}`
                          : 'Catálogo de consulta. No suma a tu avance ni pide marcar lecciones.'}
                      </p>

                      {mod.countsTowardCurriculum && (
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-4">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            mod.progressPct === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${mod.progressPct}%` }}
                        />
                      </div>
                      )}

                      {/* Temario desplegable del módulo */}
                      {isExpanded && fullModule && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 mb-4">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            {mod.countsTowardCurriculum ? 'Lecciones del módulo:' : 'Apartados de consulta:'}
                          </p>
                          <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            {fullModule.topics.map((t) => {
                              const childIds = t.children?.map((c) => c.id) || [];
                              const done = isCurriculumNodeCompleted(t, completedTopicsSet, quizGate);
                              return (
                                <React.Fragment key={t.id}>
                                  <li
                                    className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium"
                                  >
                                    <Link
                                      to={`/modulo/${mod.moduleId}/${t.id}`}
                                      className="flex-1 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 line-clamp-1 pr-2"
                                    >
                                      {t.title}
                                    </Link>
                                    {mod.countsTowardCurriculum && (
                                    <button
                                      onClick={(e) => handleToggleTopic(t.id, e, childIds.length > 0 ? childIds : undefined)}
                                      className={`shrink-0 p-1 rounded-md transition ${
                                        done
                                          ? 'text-emerald-500 hover:text-emerald-600'
                                          : 'text-slate-300 hover:text-slate-500 dark:text-slate-600'
                                      }`}
                                      title={done ? 'Lección completada' : 'Marcar lección como completada'}
                                    >
                                      <CheckCircle2
                                        className={`w-4 h-4 ${done ? 'fill-emerald-500 text-white' : ''}`}
                                      />
                                    </button>
                                    )}
                                  </li>
                                  {t.children && t.children.length > 0 && (
                                    <ul className="pl-4 space-y-1 border-l border-slate-200/60 dark:border-slate-700/40 ml-2 my-1">
                                      {t.children.map((sub) => {
                                        const subDone = isCurriculumNodeCompleted(sub, completedTopicsSet, quizGate);
                                        return (
                                          <li
                                            key={sub.id}
                                            className="flex items-center justify-between text-[11px] p-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                          >
                                            <Link
                                              to={`/modulo/${mod.moduleId}/${t.id}/${sub.id}`}
                                              className="flex-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 line-clamp-1 pr-2"
                                            >
                                              {sub.title}
                                            </Link>
                                            {mod.countsTowardCurriculum && (
                                            <button
                                              onClick={(e) => handleToggleTopic(sub.id, e)}
                                              className={`shrink-0 p-0.5 rounded transition ${
                                                subDone
                                                  ? 'text-emerald-500 hover:text-emerald-600'
                                                  : 'text-slate-300 hover:text-slate-500 dark:text-slate-600'
                                              }`}
                                              title={subDone ? 'Subtema completado' : 'Marcar subtema como completado'}
                                            >
                                              <CheckCircle2
                                                className={`w-3.5 h-3.5 ${subDone ? 'fill-emerald-500 text-white' : ''}`}
                                              />
                                            </button>
                                            )}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        to={
                          pendingLessonByModule[mod.moduleId] ||
                          `/modulo/${mod.moduleId}`
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                      >
                        {!mod.countsTowardCurriculum
                          ? 'Consultar'
                          : mod.progressPct === 100
                          ? 'Repasar módulo'
                          : mod.progressPct > 0
                          ? 'Continuar'
                          : 'Empezar'}{' '}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => setExpandedModuleId(isExpanded ? null : mod.moduleId)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                      >
                        {isExpanded ? 'Ocultar' : 'Ver temas'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: Tareas y Evaluaciones ─── */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Evaluaciones de Educación Médica Continua
              </h2>
              <p className="text-sm text-slate-500">
                Aprobación mínima de 70%-80% en cada cuestionario para acreditar horas curriculares
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setQuizFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  quizFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todas ({quizzesList.length})
              </button>
              <button
                onClick={() => setQuizFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  quizFilter === 'pending'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Pendientes ({quizzesList.filter((q) => !q.passed).length})
              </button>
              <button
                onClick={() => setQuizFilter('passed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  quizFilter === 'passed'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Aprobadas ({quizzesList.filter((q) => q.passed).length})
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {quizzesList
              .filter((q) => {
                if (quizFilter === 'pending') return !q.passed;
                if (quizFilter === 'passed') return q.passed;
                return true;
              })
              .map((quiz) => (
                <div
                  key={quiz.topicId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {quiz.moduleTitle}
                      </span>
                      {quiz.passed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Aprobado ({quiz.score}%)
                        </span>
                      ) : quiz.score != null ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Intento no superado ({quiz.score}%)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Sin presentar
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {quiz.topicTitle}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      to={quiz.topicUrl || `/modulo/${quiz.moduleId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                    >
                      {quiz.passed ? 'Repasar / Volver a intentar' : 'Presentar evaluación'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
          </div>

          {/* Historial detallado de intentos */}
          {attempts.length > 0 && (
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
                Historial cronológico de intentos
              </h3>
              <div className="space-y-2">
                {attempts.slice(0, 5).map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-xs border border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {getModuleLabel(att.module_id)}
                      </p>
                      <p className="text-slate-400">
                        {new Date(att.completed_at).toLocaleString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold text-sm ${
                          att.passed ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {att.score}%
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          att.passed
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {att.passed ? 'Aprobado' : 'No aprobado'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Tareas y Evaluaciones Asignadas ─── */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Tareas y Exámenes Personalizados Asignados</span>
              </h2>
              <p className="text-sm text-slate-500">
                Actividades clínicas y exámenes calendarizados por tus profesores y directores académicos
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 w-fit">
              {assignments.length} actividades asignadas
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3 bg-white/40 dark:bg-slate-900/20">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                ¡Estás al día! No tienes tareas pendientes
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Tus profesores te asignarán lecturas dirigidas, casos clínicos o exámenes de refuerzo conforme avances en los módulos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((asg) => {
                const dueTime = new Date(asg.due_date).getTime();
                const now = Date.now();
                const isOverdue = dueTime < now && asg.status === 'pending';
                const daysRemaining = Math.ceil((dueTime - now) / 86400000);
                const reading = describeReadingAssignment(asg, now);

                const isExam = asg.type === 'exam';
                const isCase = asg.type === 'clinical_case';
                const maxAttempts = asg.target_exam_config?.maxAttempts ?? 1;
                const attemptsCount = asg.target_exam_config?.attemptsCount ?? (asg.submitted_at || asg.status === 'submitted' || asg.status === 'approved' ? 1 : 0);
                const isAttemptsLimited = maxAttempts > 0;
                const attemptsExhausted = isAttemptsLimited && attemptsCount >= maxAttempts;
                const retakeStatus = asg.target_exam_config?.retakeStatus || 'none';

                return (
                  <div
                    key={asg.id}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                      asg.status === 'approved'
                        ? 'border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : asg.status === 'submitted'
                        ? 'border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/10'
                        : isOverdue
                        ? 'border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-xs'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            asg.type === 'exam'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : asg.type === 'clinical_case'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : asg.type === 'emg_report'
                              ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {asg.type === 'exam'
                            ? 'Examen Asignado'
                            : asg.type === 'clinical_case'
                            ? 'Caso Clínico'
                            : asg.type === 'emg_report'
                            ? 'Reporte de Trazo EMG'
                            : reading.readingOnly
                            ? 'Lectura'
                            : reading.hasReading
                            ? 'Lectura y entrega'
                            : 'Tarea práctica'}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isExam && retakeStatus === 'requested'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : isExam && retakeStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isExam && retakeStatus === 'rejected'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : asg.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : asg.status === 'submitted'
                              ? (isExam && attemptsExhausted ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300')
                              : isOverdue
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {reading.statusLabel
                            ? reading.statusLabel
                            : isExam && retakeStatus === 'requested'
                            ? 'Reintento Solicitado ⏳'
                            : isExam && retakeStatus === 'approved'
                            ? 'Reintento Autorizado ✓'
                            : isExam && retakeStatus === 'rejected'
                            ? 'Reintento Denegado'
                            : asg.status === 'approved'
                            ? 'Aprobada ✓'
                            : asg.status === 'needs_revision'
                            ? 'Corrección solicitada'
                            : asg.status === 'submitted'
                            ? (isExam && attemptsExhausted ? 'Examen Finalizado' : 'Entregada (En revisión)')
                            : isOverdue
                            ? 'Entrega Vencida'
                            : 'Pendiente de Entrega'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {isCase && asg.status !== 'approved' ? 'Caso Clínico' : asg.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {isCase && asg.status !== 'approved'
                          ? 'Caso clínico sin detalles asignado por tu profesor. Abre la actividad en el simulador para analizar la historia clínica, estudios neurofisiológicos y emitir tu diagnóstico.'
                          : asg.description}
                      </p>
                      {!(isCase && asg.status !== 'approved') && (
                        <AssignmentMaterialsList materials={asg.materials} />
                      )}
                      {reading.hasReading && (
                        <div className="space-y-1.5">
                          {reading.progressLabel && (
                            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200">
                              {reading.progressLabel}
                              {reading.requiresDelivery ? '. La entrega se revisa aparte.' : ''}
                            </p>
                          )}
                          <AssignmentReadingChecklist topicIds={reading.topicIds} doneIds={reading.doneIds} />
                        </div>
                      )}

                      {/* Tags de configuración del examen */}
                      {asg.type === 'exam' && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {asg.target_exam_config?.subtopicTitle && (
                            <span className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                              Subtema: {asg.target_exam_config.subtopicTitle}
                            </span>
                          )}
                          {asg.target_exam_config?.questionCount && (
                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                              {asg.target_exam_config.questionCount} reactivos
                            </span>
                          )}
                          {asg.target_exam_config?.timeLimitMinutes && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {asg.target_exam_config.timeLimitMinutes} min
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                            Mínimo: {asg.min_score || 70}%
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                              attemptsExhausted
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            }`}
                          >
                            Intentos: {attemptsCount} / {maxAttempts > 0 ? maxAttempts : 'Ilimitados'}
                          </span>
                        </div>
                      )}

                      {asg.type === 'clinical_case' && asg.status === 'pending' && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            resolveClinicalAssignmentMode(asg.target_exam_config) === 'study'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                          }`}>
                            {resolveClinicalAssignmentMode(asg.target_exam_config) === 'study'
                              ? 'Modo formativo (con pistas)'
                              : 'Modo examen (sin pistas)'}
                          </span>
                          {asg.target_exam_config?.timeLimitMinutes && resolveClinicalAssignmentMode(asg.target_exam_config) === 'exam' && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {asg.target_exam_config.timeLimitMinutes} min
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                            Diagnóstico oculto hasta resolver
                          </span>
                        </div>
                      )}

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1">
                        <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          Fecha de entrega:{' '}
                          <span className="font-bold">
                            {new Date(asg.due_date).toLocaleString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </p>

                        <p className="text-[11px] text-slate-500">
                          {reading.readingOnly && reading.complete ? (
                            <span className="text-emerald-600 font-medium">
                              Leída el{' '}
                              {asg.reading_completed_at
                                ? new Date(asg.reading_completed_at).toLocaleDateString('es-MX')
                                : 'esta sesión'}
                              {reading.late ? ' · fuera de fecha' : ''}
                            </span>
                          ) : asg.status === 'approved' || asg.status === 'submitted' ? (
                            <span className="text-emerald-600 font-medium">
                              Entregada el {asg.submitted_at ? new Date(asg.submitted_at).toLocaleDateString('es-MX') : 'recientemente'}
                            </span>
                          ) : isOverdue ? (
                            <span className="text-red-500 font-bold">
                              ⚠️ Plazo límite expirado. Puedes entregarla con retraso.
                            </span>
                          ) : daysRemaining <= 1 ? (
                            <span className="text-amber-600 font-bold">
                              ⏰ ¡Vence hoy o en menos de 24 horas!
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium">
                              Quedan {daysRemaining} días para la entrega.
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Grade & Teacher Feedback Display */}
                      {asg.feedback && (
                        <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Evaluación del Profesor:
                            </span>
                            {asg.grade != null && (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-extrabold text-[11px]">
                                {asg.grade}/100 pts
                              </span>
                            )}
                          </div>
                          <p className="text-slate-700 dark:text-slate-200 italic">
                            "{asg.feedback}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      {asg.type === 'exam' ? (
                        activeExamLock && activeExamLock.assignmentId === asg.id ? (
                          <button
                            type="button"
                            onClick={() => resumeAssignedExam(asg, activeExamLock)}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer animate-pulse"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>
                              Continuar Examen en Curso ({formatRemainingExamTime(remainingActiveSeconds || 0)})
                            </span>
                          </button>
                        ) : attemptsExhausted && retakeStatus === 'requested' ? (
                          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-1">
                            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                              <span>Solicitud de Reintento en Revisión</span>
                            </div>
                            <p className="text-[11px] text-amber-700 dark:text-amber-300">
                              Has solicitado permiso para repetir esta evaluación ({attemptsCount}/{maxAttempts} intentos). El docente revisará tu justificación académica.
                            </p>
                          </div>
                        ) : attemptsExhausted && retakeStatus === 'rejected' ? (
                          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center space-y-1.5">
                            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-200">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Reintento No Autorizado</span>
                            </div>
                            <p className="text-[11px] text-rose-700 dark:text-rose-300">
                              {asg.target_exam_config?.retakeReviewNotes
                                ? `Motivo: ${asg.target_exam_config.retakeReviewNotes}`
                                : 'El cuerpo docente ha determinado no otorgar intentos adicionales para este examen.'}
                            </p>
                            {asg.target_exam_config?.allowRetakeRequest !== false && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRetakeModalAssignment(asg);
                                  setRetakeReason('');
                                }}
                                className="inline-flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-300 font-bold underline hover:opacity-80 cursor-pointer"
                              >
                                Reenviar solicitud con nueva justificación
                              </button>
                            )}
                          </div>
                        ) : attemptsExhausted ? (
                          <div className="space-y-2">
                            <div className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {asg.status === 'approved' ? 'Evaluación Aprobada ✓' : 'Intentos Agotados'}{' '}
                                ({attemptsCount}/{maxAttempts})
                              </span>
                            </div>
                            {asg.target_exam_config?.allowRetakeRequest !== false ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setRetakeModalAssignment(asg);
                                  setRetakeReason('');
                                }}
                                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Solicitar Permiso para Repetir Examen</span>
                              </button>
                            ) : (
                              <p className="text-[10px] text-center text-slate-400">
                                Esta evaluación oficial no admite solicitudes de reintento.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {retakeStatus === 'approved' && (
                              <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5 justify-center">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Reintento concedido por el profesor ({attemptsCount}/{maxAttempts})</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedExamForModal(asg);
                                setAcceptedExamRules(false);
                              }}
                              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>
                                {attemptsCount > 0
                                  ? `Realizar Reintento (${attemptsCount + 1}/${maxAttempts > 0 ? maxAttempts : '∞'})`
                                  : 'Realizar Examen Asignado'}
                              </span>
                            </button>
                          </div>
                        )
                      ) : asg.type === 'clinical_case' ? (
                        asg.target_exam_config?.retakeStatus === 'approved' ? (
                          <button
                            type="button"
                            onClick={() => {
                              openAssignedCase(asg);
                            }}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Realizar reintento autorizado</span>
                          </button>
                        ) : asg.status === 'approved' || asg.status === 'submitted' ? (
                          <div className="space-y-2">
                            <div className={`w-full py-2.5 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 border ${
                              asg.status === 'approved'
                                ? 'bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            }`}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>
                                {asg.status === 'approved' ? 'Caso clínico aprobado' : 'Caso entregado'}
                                {asg.grade != null ? ` (${asg.grade}/100)` : ''}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                openAssignedCase(asg);
                              }}
                              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              <span>Revisar caso (sin volver a calificar)</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              openAssignedCase(asg);
                            }}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Resolver Caso Clínico Asignado</span>
                          </button>
                        )
                      ) : reading.readingOnly ? (
                        <div className="w-full py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold text-center">
                          {reading.complete
                            ? reading.statusLabel
                            : 'Abre cada tema. Se marca leído al llegar al final.'}
                        </div>
                      ) : asg.status === 'needs_revision' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSubmittingAsg(asg);
                            setSubmitNotes(asg.student_notes || '');
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Corregir y volver a entregar</span>
                        </button>
                      ) : asg.status === 'approved' ? (
                        <div className="w-full py-2 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center">
                          Actividad Aprobada
                        </div>
                      ) : asg.status === 'submitted' ? (
                        <div className="space-y-2">
                          <div className="w-full py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold text-center border border-indigo-200 dark:border-indigo-800">
                            En revisión del profesor. Ya no se puede modificar.
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSubmittingAsg(asg);
                              setSubmitNotes(asg.student_notes || '');
                            }}
                            className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver lo enviado</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSubmittingAsg(asg);
                            setSubmitNotes('');
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Entregar Tarea / Conclusiones</span>
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

          {/* Modal para que el Alumno entregue su Tarea */}
          {submittingAsg && (
            <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-600" />
                      <span>Entregar: {submittingAsg.title}</span>
                    </h3>
                    {submittingAsg.description && (
                      <p className="text-xs text-slate-500 mt-1">{submittingAsg.description}</p>
                    )}
                    <AssignmentMaterialsList materials={submittingAsg.materials} className="mt-3" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittingAsg(null);
                      setSubmitAttachmentCount(0);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmitAssignment} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                  <section className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                    <label className="block font-bold text-slate-900 dark:text-white">
                      Tu respuesta por escrito
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {submittingAsg.status === 'pending' || submittingAsg.status === 'needs_revision'
                        ? 'Explica el trabajo o deja un comentario para el profesor. Puedes entregar solo con este texto.'
                        : 'Esta entrega ya está en revisión. No se puede editar hasta que el profesor pida una corrección.'}
                    </p>
                    <textarea
                      rows={5}
                      readOnly={submittingAsg.status !== 'pending' && submittingAsg.status !== 'needs_revision'}
                      value={submitNotes}
                      onChange={(e) => setSubmitNotes(e.target.value)}
                      placeholder="Escribe aquí tu respuesta, hallazgos o comentario…"
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500/40 focus:outline-none read-only:opacity-80"
                    />
                  </section>

                  {user && submittingAsg.type !== 'exam' && submittingAsg.type !== 'clinical_case' && (
                    <AssignmentDeliveryEditor
                      assignmentId={submittingAsg.id}
                      studentId={user.id}
                      canEdit={submittingAsg.status === 'pending' || submittingAsg.status === 'needs_revision'}
                      onItemsChange={setSubmitAttachmentCount}
                    />
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 sticky bottom-0 bg-white dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittingAsg(null);
                        setSubmitAttachmentCount(0);
                      }}
                      className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                    >
                      {submittingAsg.status === 'pending' || submittingAsg.status === 'needs_revision' ? 'Cancelar' : 'Cerrar'}
                    </button>
                    {(submittingAsg.status === 'pending' || submittingAsg.status === 'needs_revision') && (
                      <button
                        type="submit"
                        disabled={savingSubmission || (!submitNotes.trim() && submitAttachmentCount < 1)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50"
                      >
                        {savingSubmission ? 'Enviando...' : 'Confirmar entrega'}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal para que el Alumno solicite permiso de repetición de examen */}
          {retakeModalAssignment && (
            <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Solicitar Permiso para Repetir Examen
                      </h3>
                      <p className="text-xs text-slate-500 truncate max-w-xs">
                        {retakeModalAssignment.title}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!sendingRetake) {
                        setRetakeModalAssignment(null);
                        setRetakeReason('');
                      }
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-base font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Información del examen e intentos */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Intentos realizados:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {retakeModalAssignment.target_exam_config?.attemptsCount ?? (retakeModalAssignment.status === 'submitted' || retakeModalAssignment.status === 'approved' ? 1 : 0)} de {retakeModalAssignment.target_exam_config?.maxAttempts ?? 1} reglamentarios
                    </span>
                  </div>
                  {retakeModalAssignment.grade != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Última calificación:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {retakeModalAssignment.grade} / 100 pts
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                    Para mantener la integridad académica del curso COMEFYR, debes enviar una justificación a tu profesor explicando por qué requieres una oportunidad adicional (ej. falla técnica comprobable, profundización de estudio, etc.).
                  </p>
                </div>

                <form onSubmit={handleSendRetakeRequest} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Justificación Académica para el Profesor <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      minLength={15}
                      value={retakeReason}
                      onChange={(e) => setRetakeReason(e.target.value)}
                      placeholder="Estimado profesor: Solicito la oportunidad de repetir esta evaluación debido a que..."
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">Mínimo 15 caracteres. Sé claro y conciso.</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={sendingRetake}
                      onClick={() => {
                        setRetakeModalAssignment(null);
                        setRetakeReason('');
                      }}
                      className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={sendingRetake || retakeReason.trim().length < 15}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {sendingRetake ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Enviando solicitud...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Solicitud al Profesor</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal de Advertencia y Confirmación de Examen Asignado (Candado Estricto) */}
          {selectedExamForModal && (
            <div className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border-2 border-indigo-500/40 dark:border-indigo-500/30 p-6 sm:p-7 space-y-5 shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        Protocolo de Evaluación Oficial
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        {selectedExamForModal.title}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!startingExam) {
                        setSelectedExamForModal(null);
                        setAcceptedExamRules(false);
                      }
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Scope & parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="p-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Tema Evaluado</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5" title={selectedExamForModal.target_subtopic_title || 'General'}>
                      {selectedExamForModal.target_subtopic_title || 'General'}
                    </p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Preguntas</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedExamForModal.target_exam_config?.selectedQuestionIds?.length ||
                       selectedExamForModal.target_exam_config?.questionCount ||
                       10} reactivos
                    </p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Tiempo Límite</p>
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {selectedExamForModal.target_exam_config?.timeLimitMinutes || 20} min
                    </p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Aprobatoria</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {selectedExamForModal.min_score || 80}%
                    </p>
                  </div>
                </div>

                {selectedExamForModal.target_subtopic_title && (
                  <div className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
                    <Layers className="w-4 h-4 shrink-0 text-blue-500" />
                    <span>
                      <strong>Subtema enfocado:</strong> {selectedExamForModal.target_subtopic_title}
                    </span>
                  </div>
                )}

                {/* Important Strict Timing Warning Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500/10 via-amber-500/10 to-red-500/5 border-2 border-red-500/40 dark:border-red-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wide">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Advertencia de Candado Estricto de Tiempo</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    Al hacer clic en <strong className="text-slate-900 dark:text-white">"Comenzar Evaluación Oficial"</strong>, el temporizador iniciará de forma <strong>ininterrumpida e irreversible</strong>.
                  </p>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                    <li>
                      <strong>El tiempo no se detiene:</strong> Incluso si cierras la plataforma, apagas la computadora o se desconecta la red, el reloj continuará corriendo en tiempo real.
                    </li>
                    <li>
                      <strong>Cierre automático forzado:</strong> Al expirar los {selectedExamForModal.target_exam_config?.timeLimitMinutes || 20} minutos reglamentarios, el examen se enviará y calificará con tus respuestas registradas.
                    </li>
                    <li>
                      <strong>Registro académico:</strong> Tu puntaje quedará asentado en el Kardex y será visible para el cuerpo docente y COMEFYR.
                    </li>
                  </ul>
                </div>

                {/* Checkbox of rule acceptance */}
                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer transition select-none">
                  <input
                    type="checkbox"
                    checked={acceptedExamRules}
                    onChange={(e) => setAcceptedExamRules(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                    He leído y acepto las condiciones. Entiendo que debo responder en una sola sesión continua y que el tiempo continuará corriendo si salgo de la plataforma.
                  </span>
                </label>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={startingExam}
                    onClick={() => {
                      setSelectedExamForModal(null);
                      setAcceptedExamRules(false);
                    }}
                    className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition disabled:opacity-50"
                  >
                    Cancelar / Volver Luego
                  </button>
                  <button
                    type="button"
                    disabled={!acceptedExamRules || startingExam}
                    onClick={handleStartStrictExam}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-700 hover:to-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {startingExam ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Iniciando examen...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Comenzar Evaluación Oficial</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

      {/* ─── TAB 4: Centro de Notificaciones ─── */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* Cabecera compacta + Filtros y "Marcar todas" en una sola fila */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Bandeja de Notificaciones y Avisos
                </h2>
                {unreadCount > 0 ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold font-mono tabular-nums ${notificationHeaderStyle.headerBadge}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full bg-white ${
                        highestUnreadNotificationTone === 'urgent' ? 'animate-ping' : ''
                      }`}
                    />
                    {unreadCount} por atender
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Al día
                  </span>
                )}
              </div>

              {deviceNotifStatus === 'granted' && (
                <button
                  type="button"
                  disabled={testingDeviceNotif}
                  onClick={async () => {
                    setTestingDeviceNotif(true);
                    await sendTestNotification();
                    setTimeout(() => setTestingDeviceNotif(false), 4000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-60 inline-flex items-center gap-1"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>{testingDeviceNotif ? 'Alerta enviada' : 'Probar alerta'}</span>
                </button>
              )}
            </div>

            {/* Fila única: Chips de filtro a la izquierda + Acción "Marcar todas" a la derecha */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setNotifFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                    notifFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Todos ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('unread')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    notifFilter === 'unread'
                      ? `${notificationHeaderStyle.headerBadge} shadow-xs`
                      : unreadCount > 0
                        ? 'text-slate-800 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/60'
                        : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {unreadCount > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        notifFilter === 'unread'
                          ? 'bg-white'
                          : highestUnreadNotificationTone === 'urgent'
                            ? 'bg-rose-600'
                            : highestUnreadNotificationTone === 'warning'
                              ? 'bg-amber-500'
                              : highestUnreadNotificationTone === 'success'
                                ? 'bg-emerald-600'
                                : 'bg-sky-600'
                      }`}
                    />
                  )}
                  <span>Por atender ({unreadCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('read')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                    notifFilter === 'read'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Atendidos ({notifications.length - unreadCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllNotifsRead}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1 ${notificationHeaderStyle.markAllBtn}`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Marcar todas leídas</span>
                </button>
              )}
            </div>
          </div>

          {/* Banner PWA delgado y descartable (solo si no está activo ni descartado) */}
          {deviceNotifStatus !== 'granted' && !dismissedPwaBanner && (
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="text-xs text-slate-200 truncate">
                  Recibe alertas instantáneas de tareas y exámenes en tu teléfono o navegador.
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await requestNotificationPermission(user?.id);
                    setDeviceNotifStatus(res);
                    if (
                      res === 'granted' &&
                      'serviceWorker' in navigator &&
                      import.meta.env.VITE_VAPID_PUBLIC_KEY
                    ) {
                      try {
                        const reg = await navigator.serviceWorker.ready;
                        const sub = await reg.pushManager.subscribe({
                          userVisibleOnly: true,
                          applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
                        });
                        await savePushSubscription(sub);
                      } catch (e) {
                        console.warn('Web Push no disponible:', e);
                      }
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                >
                  Activar alertas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dismissPwaPrompt(user?.id);
                    setDismissedPwaBanner(true);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Ocultar aviso"
                  aria-label="Cerrar banner de alertas de dispositivo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {notifications
              .filter((n) => {
                if (notifFilter === 'unread') return !n.isRead;
                if (notifFilter === 'read') return n.isRead;
                return true;
              })
              .map((notif) => {
                const isUnread = !notif.isRead;
                const visual = getNotificationVisualStyle(notif);
                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (isUnread) handleMarkNotifRead(notif.id);
                    }}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isUnread
                        ? `${visual.cardUnread} shadow-sm`
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isUnread ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${visual.statusBadge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${visual.statusDot}`} />
                            {visual.statusLabel}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <Check className="w-3 h-3" />
                            Atendido
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                            isUnread
                              ? visual.typeBadgeUnread
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {getNotificationTypeLabel(notif.type)}
                        </span>

                        <h3
                          className={`text-sm font-bold ${
                            isUnread
                              ? visual.titleUnread
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {notif.title}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                        {new Date(notif.createdAt).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    <p
                      className={`text-xs sm:text-sm leading-relaxed mb-3 ${
                        isUnread
                          ? visual.messageUnread
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {notif.message}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200/60 dark:border-slate-800">
                      {notif.linkUrl ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAttendNotification(notif);
                          }}
                          className={`inline-flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                            isUnread
                              ? visual.actionLinkUnread
                              : 'text-blue-600 dark:text-cyan-400 hover:underline'
                          }`}
                        >
                          <span>{isUnread ? 'Atender e ir a la sección' : 'Ir a la sección'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span />
                      )}

                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkNotifRead(notif.id);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${visual.markReadBtn}`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Marcar como atendido</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <StudentPerformancePanel
          kardex={kardex}
          minPassingGrade={80}
          onOpenKardex={() => setShowKardexModal(true)}
          onSelectTab={(tab) => selectTab(tab)}
        />
      )}

      {/* ─── TAB 5: Constancia y Certificación COMEFYR ─── */}
      {activeTab === 'certificate' && (
        <div className="space-y-8">
          <StudentCertificatePanel
            requirements={certRequirements}
            moduleProgress={moduleProgress}
            completedTopics={completedTopicsSet}
            standing={kardex}
          />
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Acreditación y Certificado de Educación Médica Continua
            </h2>
            <p className="text-sm text-slate-500">
              Colegio Mexicano de Medicina de Rehabilitación (COMEFYR)
            </p>
          </div>

          {/* Requisitos Checklist */}
          <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Requisitos reglamentarios para emisión del diploma:
            </h3>

            <div className="space-y-3">
              {/* Req 1: Cédula Profesional */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  {certRequirements?.cedulaVerified ? (
                    <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      1. Cédula Profesional Verificada ante SEP/DGP
                    </p>
                    <p className="text-xs text-slate-500">
                      {certRequirements?.cedulaVerified
                        ? `Acreditada: ${profile?.cedula_profesional}`
                        : 'Obligatorio para otorgar validez legal a las horas curriculares en México.'}
                    </p>
                  </div>
                </div>
                {!certRequirements?.cedulaVerified && (
                  <Link
                    to="/cuenta"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition"
                  >
                    Validar Cédula
                  </Link>
                )}
              </div>

              {/* Req 2: Dictamen Capa A */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  {certRequirements?.isOfficialPassing ? (
                    <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-400" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      2. Dictamen académico Capa A (un solo número)
                    </p>
                    <p className="text-xs text-slate-500">
                      {certRequirements?.isOfficialPassing
                        ? `Acreditado con ${certRequirements.kardexGrade} / 100`
                        : certRequirements?.kardexOfficial
                          ? `Promedio oficial ${certRequirements.kardexGrade} / 100 (mínimo 80)`
                          : 'Aún faltan cubetas por calificar. El temario ya cuenta como el 20%.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => selectTab('performance')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Ver desempeño
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  {certRequirements?.cedulaVerified && certRequirements.isOfficialPassing ? (
                    <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-slate-400" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      3. Emisión: acreditado + cédula
                    </p>
                    <p className="text-xs text-slate-500">
                      No hay umbral extra de 95% de temario ni de cobertura de quizzes. Eso ya está dentro del kárdex.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Previsualización del Certificado Oficial */}
          <div className="relative overflow-hidden rounded-3xl border-4 border-double border-amber-600/40 bg-gradient-to-br from-amber-50/60 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950 p-8 sm:p-12 text-center shadow-xl">
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-md">
                  NS
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                    Colegio Mexicano de Medicina de Rehabilitación
                  </h3>
                  <p className="text-xs font-bold text-blue-600 dark:text-cyan-400">
                    COMEFYR · Comité de Electrodiagnóstico y Neurofisiología Clínica
                  </p>
                </div>
              </div>

              <p className="text-xs tracking-widest uppercase font-semibold text-slate-500 pt-3">
                Otorga la presente constancia con valor curricular a:
              </p>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white border-b border-amber-500/30 pb-3">
                Dr(a). {displayName}
              </h2>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Por haber completado satisfactoriamente el programa académico de{' '}
                <strong className="text-slate-900 dark:text-white">
                  Electrodiagnóstico Integral y Electromiografía Clínica (ElectroDx Diplomado)
                </strong>
                , con un total de <strong>80 horas curriculares</strong> y{' '}
                <strong>40 créditos de Educación Médica Continua (CME)</strong>.
              </p>

              <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-left border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Folio Digital Oficial:
                  </p>
                  <p className="font-mono text-indigo-600 dark:text-indigo-400">
                    {certRequirements?.certificateFolio}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Cédula Profesional:
                  </p>
                  <p className="font-mono">
                    {profile?.cedula_profesional || 'Pendiente de registrar'}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Fecha de Acreditación:
                  </p>
                  <p>{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'study' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Estudio, planes y reportes</h2>
          <p className="text-sm text-slate-500">
            Planes personalizados activos: {planCount}. Use esta sección para repaso adaptativo, Q&A y entrega de reportes EMG.
          </p>
          <StudentStudyHub
            attempts={attempts}
            moduleProgress={moduleProgress}
            plans={learningPlans}
          />
        </div>
      )}
      </div>

      {user?.id && (
        <PendingTasksAlertModal
          isOpen={showPendingTasksModal}
          onClose={() => setShowPendingTasksModal(false)}
          studentName={displayName}
          studentId={user.id}
          pendingAssignments={assignments.filter((a) => a.status === 'pending')}
          onSelectExam={(asg) => {
            setSelectedExamForModal(asg);
            setAcceptedExamRules(false);
          }}
          onSelectCase={(asg) => {
            openAssignedCase(asg);
          }}
          onSelectOther={(asg) => {
            selectTab('assignments');
            if (assignmentRequiresDelivery(asg)) {
              setSubmittingAsg(asg);
              setSubmitNotes('');
            }
          }}
          onGoToAllAssignments={() => {
            selectTab('assignments');
          }}
        />
      )}

      {user?.id && (
        <StudentKardexModal
          isOpen={showKardexModal}
          onClose={() => setShowKardexModal(false)}
          studentId={user.id}
          profile={profile}
        />
      )}

      {courseForModal && (
        <CourseEnrollmentRequestModal
          course={courseForModal}
          isOpen={Boolean(courseForModal)}
          onClose={() => setCourseForModal(null)}
          onSuccess={async () => {
            await refreshProfile();
          }}
        />
      )}

      <StudentPortalGuide
        open={guideOpen}
        courseState={guideCourseState}
        finalActionLabel={guideFinalActionLabel}
        onBack={() => setGuideStep((prev) => Math.max(0, prev - 1))}
        onNext={() => setGuideStep((prev) => prev + 1)}
        onSkip={() => handleSaveGuide('skip')}
        onFinish={() => handleSaveGuide('finish')}
        onSnooze={handleSnoozeGuide}
        stepIndex={guideStep}
        saving={guideSaving}
        saveError={guideError}
        steps={guideSteps}
      />

      <EditorialCommitteeModal
        isOpen={committeeModalOpen}
        onClose={() => setCommitteeModalOpen(false)}
      />
    </div>
  );
}
