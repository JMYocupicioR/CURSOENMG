import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Calendar,
  BellRing,
  FileCheck,
  ChevronRight,
  Sparkles,
  BarChart3,
  Search,
  Stethoscope,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Video,
  Brain,
  Flame,
  Send,
  Lock,
  AlertTriangle,
  Edit3,
  RotateCcw,
  Eye,
  X,
  Smartphone,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { getMyAttempts, getMyProgressByModule } from '../../services/quizService';
import { getUpcomingWorkshops } from '../../services/courseService';
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
import type { PortalWelcomeSlide } from '../../types/database';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  checkAndNotifyPendingAssignments,
  subscribeToRealtimeAssignments,
  type NotificationPermissionStatus,
} from '../../services/deviceNotificationService';
import {
  calculateStudentMetrics,
  checkCertificationEligibility,
  getLastVisitedTopic,
  getStudentNotifications,
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
import { fetchServerNotifications, markAllServerNotificationsRead, markServerNotificationRead, mergeServerNotifications } from '../../services/assignmentSubmissionService';
import { StudentStudyHub } from './StudentStudyHub';
import { StudentCertificatePanel } from './StudentCertificatePanel';
import { StudentPerformancePanel } from './StudentPerformancePanel';
import { StudentPortalTabBar, type StudentPortalTab } from './StudentPortalTabBar';
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
    hasPremiumAccess,
    isAdmin,
    isEditor,
    isEnrolledInCourse,
    isCoursePending,
    courseIds,
    pendingCourseIds,
    refreshProfile,
  } = useAuth();
  const isPremiumUser = hasPremiumAccess || isAdmin || isEditor;
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
  const [lastVisited, setLastVisited] = useState<LastVisitedTopic | null>(null);

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

    try {
      const unsubscribe = subscribeToRealtimeAssignments(user.id, (updatedAsg, eventType) => {
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
        if (unsubscribe) unsubscribe();
      };
    } catch (err) {
      console.warn('[StudentDashboard] Error setting up realtime assignment listener:', err);
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
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [quizFilter, setQuizFilter] = useState<'all' | 'pending' | 'passed'>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [completedTopicsSet, setCompletedTopicsSet] = useState<Set<string>>(() =>
    user ? getCompletedTopics(user.id) : new Set()
  );

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
    ])
      .then(async ([att, modProg, ws, asgs, stk, syncedTopics, plans]) => {
        if (cancelled) return;
        setAttempts(att);
        setModuleProgress(modProg);
        setWorkshops(ws);
        setAssignments(asgs);
        setStreak(stk);
        setPlanCount(Array.isArray(plans) ? plans.length : 0);
        setLearningPlans(Array.isArray(plans) ? plans : []);
        if (syncedTopics) {
          setCompletedTopicsSet(syncedTopics);
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
        setNotifications(mergeServerNotifications(localNotifs, serverNotifs));

        // Check for pending tasks and trigger modal & device notification
        const pendingList = asgs.filter((a) => a.status === 'pending');
        if (pendingList.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const dismissedDate = localStorage.getItem(`neurosafe_dismiss_pending_modal_${user.id}`);
          if (dismissedDate !== today && !guideOpen) {
            setShowPendingTasksModal(true);
          }
          // Notify device in background if permission is active
          void checkAndNotifyPendingAssignments(user.id, asgs);
        }

        // Last visited
        const last = getLastVisitedTopic(user.id);
        setLastVisited(last);
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
  }, [user, moduleProgress, completedTopicsSet, refreshTrigger]);

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

  // Apertura de la inducción de primer ingreso al portal
  useEffect(() => {
    if (loading || !user || !profile || guideDismissedThisVisit) return;

    const isExamActive = Boolean(activeExamLock && (remainingActiveSeconds ?? 1) > 0);
    if (isExamActive) {
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
  }, [loading, user?.id, profile, activeExamLock, remainingActiveSeconds, guideDismissedThisVisit, guideOpen, guideSourceReady, guidePublishedVersion]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchPublishedPortalWelcome().then((result) => {
      if (cancelled) return;
      if (result) {
        setGuideSlides(result.slides);
        setGuidePublishedVersion(result.publishedVersion);
      }
      setGuideSourceReady(true);
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

  const pendingAssignmentsCount = useMemo(() => {
    return assignments.filter((a) => a.status === 'pending').length;
  }, [assignments]);

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
    const handleProgress = () => {
      if (user?.id) {
        setCompletedTopicsSet(getCompletedTopics(user.id));
        setLastVisited(getLastVisitedTopic(user.id));
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
        setActiveExamLock(null);
        setRemainingActiveSeconds(null);
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

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Médico Residente';

  return (
    <div id="contenido-principal" className="min-h-screen pt-20 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-900 text-sm" role="alert">
          {actionError}
        </div>
      )}
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 md:p-10 shadow-2xl border border-indigo-500/20 mb-8">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {streak && streak.currentStreak > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/25 text-orange-300 border border-orange-400/40 shadow-xs">
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                Racha: {streak.currentStreak} {streak.currentStreak === 1 ? 'día' : 'días'}
              </span>
            )}

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Hola, Dr(a). {displayName}
            </h1>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-300">
              {profile?.specialty && (
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-blue-400" />
                  {profile.specialty}
                </span>
              )}
              {profile?.institution && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  {profile.institution}
                </span>
              )}
            </div>

            {/* Cursos Activos / Cursando Actualmente */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-slate-300">Cursos activos:</span>
              {sellable.filter((course) => isEnrolledInCourse(course.id)).length > 0 ? (
                sellable.filter((course) => isEnrolledInCourse(course.id)).map((course) => {
                  const cId = course.id;
                  const title = course.title;
                  return (
                    <span
                      key={cId}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-xs"
                      title="Estás formalmente admitido y cursando este programa"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{title} (Cursando)</span>
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-slate-400 italic">
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30 transition cursor-pointer"
                    title="Solicitud registrada. Haz clic para ver detalles."
                  >
                    <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                    <span>En espera: {title}</span>
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
                title={
                  activeExamLock && (remainingActiveSeconds ?? 1) > 0
                    ? 'Termina el examen en curso para ver la guía'
                    : 'Ver la guía del portal'
                }
                className="text-xs text-slate-300 hover:text-white underline underline-offset-4 decoration-slate-400 hover:decoration-white transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Guía del portal
              </button>
            </div>
          </div>

          {/* Quick Resume Card */}
          <div className="shrink-0 bg-white/10 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 max-w-sm w-full">
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
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition-all"
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
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition-all"
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

      {/* ─── 4 Academic KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
        {/* 1. Progreso Global */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Progreso Global
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {metrics?.overallProgressPct || 0}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">del currículo</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics?.overallProgressPct || 0}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {metrics?.totalCompletedCurriculumTopics || 0} de {metrics?.totalCurriculumTopics || 0} lecciones completadas
          </p>
        </div>

        {/* 2. Créditos CME / Horas Académicas */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Créditos CME / Horas
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {metrics?.cmeCreditsEarned || 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              / {metrics?.maxCmeCredits || 40} pts CME
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round(((metrics?.cmeCreditsEarned || 0) / (metrics?.maxCmeCredits || 40)) * 100))}%`,
              }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            {metrics?.academicHoursEarned || 0} de {metrics?.maxAcademicHours || 80} horas lectivas
          </p>
        </div>

        {/* 3. Evaluaciones Aprobadas */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Evaluaciones
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {certRequirements?.quizzesPassedCount || 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              aprobadas ({certRequirements?.averageScore || 0}% prom.)
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round(((certRequirements?.quizzesPassedCount || 0) / Math.max(1, certRequirements?.totalQuizzesAvailable || 13)) * 100))}%`,
              }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {attempts.length} intentos totales registrados
          </p>
        </div>

        {/* 4. Desempeño Capa A */}
        <button
          type="button"
          onClick={() => selectTab('performance')}
          className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Desempeño Capa A
            </span>
            <div className={`p-2 rounded-xl ${kardex?.isPassing ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600'}`}>
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {kardex?.finalGrade ?? '—'}
            </span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            {kardex?.isOfficial
              ? kardex.isPassing
                ? 'Dictamen oficial: acreditado'
                : 'Dictamen oficial: aún no acredita'
              : 'Promedio en curso · 30+30+20+20'}
          </p>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
            Cómo me evalúan <ChevronRight className="w-3.5 h-3.5" />
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
                    {pendingAssignmentsCount} {pendingAssignmentsCount === 1 ? 'actividad requiere tu entrega' : 'actividades requieren tu entrega'}
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
        counts={{
          assignments: pendingAssignmentsCount,
          notifications: unreadCount,
        }}
      />

      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
      {/* ─── TAB 1: Resumen General ─── */}
      {activeTab === 'summary' && (
        <div className="space-y-8">
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
                          {courseId === 'principiante' ? 'Nivel 1' : courseId === 'intermedio' ? 'Nivel 2' : 'Nivel 3'}
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

                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                        {title}
                      </h3>
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
                        <button
                          type="button"
                          onClick={() => selectTab('modules')}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm hover:shadow-md transition cursor-pointer"
                        >
                          <span>{coursePct === 100 ? 'Repasar curso' : coursePct > 0 ? 'Continuar clases' : 'Empezar clases'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
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

          {/* Two-column layout: Left Tasks & Next classes, Right: Workshops & Tools */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left 2 Cols: Tareas pendientes & Clases en curso */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tareas y Evaluaciones Pendientes Card */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Tareas y Evaluaciones Pendientes
                        </h2>
                        {pendingAssignmentsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white animate-pulse">
                            {pendingAssignmentsCount} del Profesor
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Actividades asignadas por tus profesores y cuestionarios curriculares
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {pendingAssignmentsCount > 0 && (
                      <button
                        onClick={() => setShowPendingTasksModal(true)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Resumen rápido
                      </button>
                    )}
                    <button
                      onClick={() => selectTab(pendingAssignmentsCount > 0 ? 'assignments' : 'quizzes')}
                      className="text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      Ver todas
                    </button>
                  </div>
                </div>

                {/* Si no hay ni tareas del profesor pendientes ni quizzes del temario pendientes */}
                {pendingAssignmentsCount === 0 && quizzesList.filter((q) => !q.passed).length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      ¡Excelente! No tienes evaluaciones ni tareas pendientes en este momento
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Has completado todas las actividades asignadas por tus profesores y los módulos cursados hasta ahora.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 1. SECCIÓN: TAREAS ASIGNADAS POR EL PROFESOR (Prioridad Máxima) */}
                    {pendingAssignmentsCount > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Asignadas por tus Profesores ({pendingAssignmentsCount})
                          </span>
                          <button
                            onClick={() => selectTab('assignments')}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            Ir a Tareas Asignadas &rarr;
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {assignments
                            .filter((a) => a.status === 'pending')
                            .slice(0, 3)
                            .map((asg) => {
                              const dueTime = new Date(asg.due_date).getTime();
                              const now = Date.now();
                              const isOverdue = dueTime < now;
                              const daysRemaining = Math.ceil((dueTime - now) / 86400000);
                              const isExam = asg.type === 'exam';
                              const isCase = asg.type === 'clinical_case';

                              return (
                                <div
                                  key={asg.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 hover:border-indigo-300 dark:hover:border-indigo-700 transition gap-3"
                                >
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                          isExam
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                            : isCase
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                        }`}
                                      >
                                        {isExam ? 'Examen Asignado' : isCase ? 'Caso Clínico' : 'Tarea Práctica'}
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                          isOverdue
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                            : daysRemaining <= 1
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        }`}
                                      >
                                        {isOverdue
                                          ? 'Vencida'
                                          : daysRemaining <= 1
                                          ? '¡Vence hoy!'
                                          : `Quedan ${daysRemaining} días`}
                                      </span>
                                    </div>

                                    <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                                      {isCase ? 'Caso Clínico' : asg.title}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Entrega:{' '}
                                      <strong>
                                        {new Date(asg.due_date).toLocaleDateString('es-MX', {
                                          day: 'numeric',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </strong>
                                    </p>
                                  </div>

                                  <div className="shrink-0 flex items-center gap-2">
                                    {isExam ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedExamForModal(asg);
                                          setAcceptedExamRules(false);
                                        }}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs transition cursor-pointer"
                                      >
                                        <Play className="w-3 h-3 fill-white" />
                                        <span>Realizar Examen</span>
                                      </button>
                                    ) : isCase ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          openAssignedCase(asg);
                                        }}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-xs transition cursor-pointer"
                                      >
                                        <Sparkles className="w-3 h-3" />
                                        <span>
                                          {asg.target_exam_config?.retakeStatus === 'approved'
                                            ? 'Reintentar caso'
                                            : asg.status === 'pending'
                                              ? 'Resolver Caso'
                                              : 'Revisar caso'}
                                        </span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          selectTab('assignments');
                                          setSubmittingAsg(asg);
                                        }}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition cursor-pointer"
                                      >
                                        <span>Entregar</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* 2. SECCIÓN: QUIZZES DEL TEMARIO */}
                    {quizzesList.filter((q) => !q.passed).length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Quizzes del Temario ({quizzesList.filter((q) => !q.passed).length})
                        </span>
                        <div className="space-y-2">
                          {quizzesList
                            .filter((q) => !q.passed)
                            .slice(0, 3)
                            .map((quiz) => (
                              <div
                                key={quiz.topicId}
                                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-300 dark:hover:border-blue-700 transition"
                              >
                                <div className="space-y-1 pr-3">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                    {quiz.moduleTitle}
                                  </span>
                                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                                    {quiz.topicTitle}
                                  </p>
                                  {quiz.score != null ? (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                      Último intento: {quiz.score}% (Mínimo aprobatorio: 70%)
                                    </p>
                                  ) : (
                                    <p className="text-xs text-slate-400">Sin intentos realizados aún</p>
                                  )}
                                </div>
                                <Link
                                  to={quiz.topicUrl || `/modulo/${quiz.moduleId}`}
                                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                                >
                                  Presentar <ArrowRight className="w-3 h-3" />
                                </Link>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Temas pendientes del temario */}
              {upcomingPendingLessons.length > 0 && (
                <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Temas pendientes
                        </h2>
                        <p className="text-xs text-slate-500">
                          Retoma el curso desde el siguiente contenido que aún no completas
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectTab('modules')}
                      className="text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline"
                    >
                      Ver módulos
                    </button>
                  </div>

                  <div className="space-y-2">
                    {upcomingPendingLessons.map((lesson, index) => (
                      <Link
                        key={`${lesson.moduleId}-${lesson.topicId}`}
                        to={lesson.url}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-300 dark:hover:border-blue-700 transition"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Módulo {lesson.moduleNumber}: {lesson.moduleTitle}
                          </p>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {lesson.topicTitle}
                          </p>
                          {lesson.firstIncompleteChildTitle && (
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {lesson.firstIncompleteChildTitle}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                          {index === 0 ? 'Continuar' : 'Abrir'}
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Módulos en Curso (Vista rápida) */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Tus módulos
                      </h2>
                      <p className="text-xs text-slate-500">
                        Continúa el curso desde el módulo que estés trabajando
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => selectTab('modules')}
                    className="text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline"
                  >
                    Ver los 13 módulos
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {highlightedModules.map((mod) => (
                    <div
                      key={mod.moduleId}
                      className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:shadow-sm transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-lg">{mod.emoji}</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {mod.progressPct}%
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                          {mod.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
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

            {/* Right Column: Talleres en vivo & Herramientas Clínicas */}
            <div className="space-y-6">
              {/* Talleres en Vivo COMEFYR */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
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
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline hidden sm:inline"
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
                      className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Ver catálogo de clases grabadas →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workshops.map((w) => (
                      <div
                        key={w.id}
                        className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {new Date(w.scheduled_at).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          {w.recording_url && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                              Grabación lista
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                          {w.title}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 mb-2">
                          {w.description || 'Discusión de casos clínicos y electromiografía en vivo.'}
                        </p>
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/taller/${w.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Ver detalles <ChevronRight className="w-3 h-3" />
                          </Link>
                          {w.recording_url && (
                            <a
                              href={w.recording_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
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

              {/* Herramientas de Práctica y Simulación */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Simuladores y Herramientas
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Complementa tu aprendizaje con motores de cálculo clínico
                </p>

                <div className="space-y-2.5">
                  <Link
                    to="/herramientas/plexo-braquial"
                    className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 hover:shadow-md transition group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          Calculadora de Plexo Braquial
                        </p>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isPremiumUser
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300/40'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {isPremiumUser ? <Sparkles className="w-2.5 h-2.5 text-amber-500" /> : <Lock className="w-2.5 h-2.5 text-amber-500" />}
                          Premium
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Algoritmo ponderado de 5 pasos raíces/cordones
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                  </Link>

                  <Link
                    to="/ejercicios"
                    className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/60 hover:shadow-md transition group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition">
                          Simulador de Casos Clínicos EMG
                        </p>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isPremiumUser
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300/40'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {isPremiumUser ? <Sparkles className="w-2.5 h-2.5 text-amber-500" /> : <Lock className="w-2.5 h-2.5 text-amber-500" />}
                          Premium
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Ejercicios prácticos interactivos con trazos
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                  </Link>

                  {/* Simulador de Examen COMEFYR — nuevo */}
                  <Link
                    to="/examenes"
                    className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 to-indigo-950/60 border border-cyan-700/30 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-900/20 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:scale-105 transition">
                        <Brain className="w-4 h-4 text-white" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                          Simulador de Examen COMEFYR
                        </p>
                        <p className="text-[10px] text-slate-400">
                          85 preguntas · Modo Tutor / Examen Real
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">⚡ NUEVO</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
                    </div>
                  </Link>
                </div>
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

                  {!unlocked && (
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {metrics?.moduleStats
              .filter(
                (m) =>
                  !searchModuleQuery ||
                  m.title.toLowerCase().includes(searchModuleQuery.toLowerCase()) ||
                  m.moduleId.toLowerCase().includes(searchModuleQuery.toLowerCase())
              )
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
                            : asg.type === 'practical_task'
                            ? 'Tarea práctica'
                            : 'Tarea de Lectura'}
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
                          {isExam && retakeStatus === 'requested'
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
                          {asg.status === 'approved' || asg.status === 'submitted' ? (
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
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5" title={selectedExamForModal.target_topic_title || 'General'}>
                      {selectedExamForModal.target_topic_title || 'General'}
                    </p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Preguntas</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedExamForModal.target_exam_config?.selectedQuestionIds?.length ||
                       selectedExamForModal.target_exam_config?.numberOfQuestions ||
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Bandeja de Notificaciones y Avisos
              </h2>
              <p className="text-sm text-slate-500">
                Avisos académicos, confirmación de cédula y convocatorias COMEFYR
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllNotifsRead}
                className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* PWA Device Notification Settings Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/40 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/20 border border-blue-200/80 dark:border-blue-900/60 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Alertas en tu Dispositivo y Teléfono (PWA)
                    </h3>
                    {deviceNotifStatus === 'granted' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck className="w-3 h-3" /> Activadas
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
                    {deviceNotifStatus === 'granted'
                      ? 'Recibirás avisos directos en tu barra de notificaciones y pantalla de bloqueo cuando tus profesores asignen exámenes, casos clínicos o registren calificaciones.'
                      : 'Activa las notificaciones del navegador o PWA para recibir avisos instantáneos de tus tareas y exámenes sin tener que entrar a revisar manualmente.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {deviceNotifStatus === 'granted' ? (
                  <button
                    type="button"
                    disabled={testingDeviceNotif}
                    onClick={async () => {
                      setTestingDeviceNotif(true);
                      await sendTestNotification();
                      setTimeout(() => setTestingDeviceNotif(false), 4000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-300 text-xs font-bold hover:bg-blue-50 dark:hover:bg-slate-750 border border-blue-200 dark:border-blue-800 transition shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>{testingDeviceNotif ? '¡Alerta enviada!' : 'Probar Notificación'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await requestNotificationPermission(user?.id);
                      setDeviceNotifStatus(res);
                      if (res === 'granted' && 'serviceWorker' in navigator && import.meta.env.VITE_VAPID_PUBLIC_KEY) {
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
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Activar Alertas de Dispositivo</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleMarkNotifRead(notif.id)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                  notif.isRead
                    ? 'border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 opacity-80'
                    : 'border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        notif.isRead ? 'bg-transparent' : 'bg-blue-600 dark:bg-cyan-400'
                      }`}
                    />
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        notif.type === 'cedula'
                          ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                          : notif.type === 'workshop'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {notif.type}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {notif.title}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(notif.createdAt).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-4 mb-3">
                  {notif.message}
                </p>

                {notif.linkUrl && (
                  <div className="pl-4">
                    <Link
                      to={notif.linkUrl}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline"
                    >
                      Ir a la sección <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
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
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500 text-white" />
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
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500 text-white" />
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
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500 text-white" />
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
            setSubmittingAsg(asg);
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
        stepIndex={guideStep}
        saving={guideSaving}
        saveError={guideError}
        steps={guideSteps}
      />
    </div>
  );
}
