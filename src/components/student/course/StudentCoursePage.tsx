import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Play,
  Video,
  CheckCircle2,
  Clock,
  BookOpen,
  FileText,
  ClipboardList,
  Award,
  Sparkles,
  Lock,
  Download,
  AlertCircle,
  ExternalLink,
  Search,
  Check,
  Calendar,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthProvider';
import { useSyllabusCatalog } from '../../../hooks/useSyllabusCatalog';
import { useTopicProgress } from '../../../hooks/useTopicProgress';
import { useQuizTopicFlags } from '../../../hooks/useQuizTopicFlags';
import {
  moduleIdsForCourse,
  sellableCourses,
} from '../../../content/courseCatalog';
import {
  getLastVisitedTopic,
  fetchStudentCompletedTopics,
  type LastVisitedTopic,
} from '../../../services/studentService';
import {
  resolveResumeLesson,
  type ResumeLesson,
} from '../../../services/studentResume';
import {
  getUpcomingWorkshops,
  getLiveSessionUrgency,
} from '../../../services/courseService';
import { getMyAttempts } from '../../../services/quizService';
import { calculateStudentKardex } from '../../../services/gradebookService';
import type { LiveWorkshop, Course } from '../../../types/database';
import type { Module } from '../../../types/content';
import type { QuizAttempt } from '../../../types/quiz';
import type { StudentKardexData } from '../../../types/academicGradebook';
import CourseEnrollmentRequestModal from '../../course/CourseEnrollmentRequestModal';

type CourseTab = 'temario' | 'materiales' | 'tareas' | 'kardex';

export default function StudentCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const {
    user,
    isAdmin,
    isEditor,
    isEnrolledInCourse,
    isCoursePending,
  } = useAuth();

  const { courses, assignments, modulesForStaff, reload } = useSyllabusCatalog();
  const { isCompleted, completedTopicIds } = useTopicProgress();
  const { hasQuiz } = useQuizTopicFlags();

  const [activeTab, setActiveTab] = useState<CourseTab>('temario');
  const [courseSwitcherOpen, setCourseSwitcherOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [workshops, setWorkshops] = useState<LiveWorkshop[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [kardex, setKardex] = useState<StudentKardexData | null>(null);
  const [lastVisited, setLastVisited] = useState<LastVisitedTopic | null>(null);
  const [enrollModalCourse, setEnrollModalCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. Identificar el curso activo
  const currentCourse = useMemo(() => {
    if (!courseId) return null;
    return courses.find((c) => c.id.toLowerCase() === courseId.toLowerCase()) ?? null;
  }, [courses, courseId]);

  // 2. Cursos en los que el alumno está inscrito (para el switcher)
  const enrolledCourses = useMemo(() => {
    return sellableCourses(courses).filter((c) => isEnrolledInCourse(c.id));
  }, [courses, isEnrolledInCourse]);

  const isEnrolled = currentCourse ? isEnrolledInCourse(currentCourse.id) || isAdmin || isEditor : false;
  const isPending = currentCourse ? isCoursePending(currentCourse.id) : false;

  // 3. Módulos asignados a este curso en particular
  const courseModuleIds = useMemo(() => {
    if (!currentCourse) return [];
    return moduleIdsForCourse(assignments, currentCourse.id);
  }, [assignments, currentCourse]);

  const courseModules = useMemo(() => {
    const map = new Map(modulesForStaff.map((m) => [m.id, m]));
    return courseModuleIds.map((id) => map.get(id)).filter(Boolean) as Module[];
  }, [courseModuleIds, modulesForStaff]);

  // Expandir el primer módulo por defecto
  useEffect(() => {
    if (courseModules.length > 0 && expandedModules.size === 0) {
      setExpandedModules(new Set([courseModules[0].id]));
    }
  }, [courseModules, expandedModules.size]);

  // 4. Cargar datos del estudiante para este curso
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      getUpcomingWorkshops(),
      getMyAttempts(user.id),
      calculateStudentKardex(user.id),
      fetchStudentCompletedTopics(user.id),
    ])
      .then(([wsRes, attRes, kdxRes]) => {
        if (!isMounted) return;
        if (wsRes.status === 'fulfilled') setWorkshops(wsRes.value);
        if (attRes.status === 'fulfilled') setAttempts(attRes.value);
        if (kdxRes.status === 'fulfilled') setKardex(kdxRes.value);
        setLastVisited(getLastVisitedTopic(user.id));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id, currentCourse?.id]);

  // 5. Métricas de progreso del curso
  const { totalCourseTopics, completedCourseTopics, progressPct } = useMemo(() => {
    let total = 0;
    let done = 0;

    courseModules.forEach((mod) => {
      mod.topics.forEach((t) => {
        total++;
        if (isCompleted(t.id)) done++;
        if (t.children) {
          t.children.forEach((c) => {
            total++;
            if (isCompleted(c.id)) done++;
          });
        }
      });
    });

    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { totalCourseTopics: total, completedCourseTopics: done, progressPct: pct };
  }, [courseModules, isCompleted]);

  // 6. Fast-Track: Reanudar lección en este curso
  const resumeLesson: ResumeLesson | null = useMemo(() => {
    if (!courseModules.length) return null;
    return resolveResumeLesson(
      completedTopicIds,
      lastVisited,
      courseModules
    );
  }, [completedTopicIds, lastVisited, courseModules]);

  // 7. Fast-Track: Taller / Clase en Vivo activa relacionada con este curso
  const liveSessionAlert = useMemo(() => {
    if (!currentCourse) return null;

    // Buscar si hay talleres vinculados a los módulos de este curso
    const courseWorkshops = workshops.filter((w) => {
      if (currentCourse.active_workshop_id && w.id === currentCourse.active_workshop_id) return true;
      if (w.module_id && courseModuleIds.includes(w.module_id)) return true;
      return false;
    });

    const urgency = getLiveSessionUrgency(courseWorkshops, 45);
    const activeWorkshop = urgency.workshop;
    const streamUrl = activeWorkshop?.stream_url || currentCourse.live_meeting_url;

    if (urgency.isLiveNow || urgency.isUrgent) {
      return {
        title: activeWorkshop?.title || `Sesión en vivo de ${currentCourse.title}`,
        scheduledAt: activeWorkshop?.scheduled_at || currentCourse.live_schedule_notes || 'En curso',
        isLiveNow: urgency.isLiveNow,
        streamUrl,
        type: 'workshop',
      };
    }

    // Si tiene enlace recurrente configurado y no hay taller urgente en este momento
    if (currentCourse.live_meeting_url) {
      return {
        title: `Aula Virtual: ${currentCourse.title}`,
        scheduledAt: currentCourse.live_schedule_notes || 'Horario programado',
        isLiveNow: false,
        streamUrl: currentCourse.live_meeting_url,
        type: 'meeting',
      };
    }

    return null;
  }, [currentCourse, workshops, courseModuleIds]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Pantalla cuando el curso no existe
  if (!currentCourse && !loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Curso no encontrado</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          El curso que intentas abrir no existe o ha sido modificado.
        </p>
        <Link
          to="/portal"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Mi Portal
        </Link>
      </main>
    );
  }

  // Pantalla de bloqueo si el alumno no está inscrito en este curso
  if (!isEnrolled && currentCourse && !loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20">
        <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1 inline-block">
            Inscripción Requerida
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
            {currentCourse.title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto mb-6 leading-relaxed">
            {currentCourse.description ||
              'Este curso requiere una inscripción activa autorizada por el profesor titular para acceder a sus clases, evaluaciones y aula en vivo.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {isPending ? (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>Tu solicitud para este curso está en lista de espera y será aprobada en breve.</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEnrollModalCourse(currentCourse)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Solicitar Admisión al Curso</span>
              </button>
            )}
            <Link
              to="/portal"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Mi Portal</span>
            </Link>
          </div>
        </div>

        {enrollModalCourse && (
          <CourseEnrollmentRequestModal
            isOpen={true}
            onClose={() => setEnrollModalCourse(null)}
            course={enrollModalCourse}
            onSuccess={() => {
              setEnrollModalCourse(null);
              reload();
            }}
          />
        )}
      </main>
    );
  }

  const instructorName = currentCourse?.instructor_name || 'Dr. Juan Marcos Yocupicio Robles';
  const instructorTitle = currentCourse?.instructor_title || 'Especialista en Neurofisiología Clínica';

  return (
    <main id="contenido-principal" className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
      {/* ─── NAVEGACIÓN SUPERIOR Y SWITCHER DE CURSO ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          to="/portal"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Mi Portal</span>
        </Link>

        {/* Switcher de curso activo */}
        {enrolledCourses.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setCourseSwitcherOpen(!courseSwitcherOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Cambiar Curso: {currentCourse?.title}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {courseSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-1.5 z-40 animate-fadeIn">
                <p className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1.5">
                  Tus Cursos Inscritos
                </p>
                {enrolledCourses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCourseSwitcherOpen(false);
                      navigate(`/portal/curso/${c.id}`);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-left transition ${
                      c.id === currentCourse?.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                    {c.id === currentCourse?.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── HERO DEL CURSO (ENCABEZADO DE IMPACTO) ─── */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50/70 to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-cyan-300 border border-blue-200/60 dark:border-blue-800">
                <GraduationCap className="w-3.5 h-3.5" />
                DIPLOMADO OFICIAL
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3" />
                Inscrito Activo
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {currentCourse?.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentCourse?.description}
            </p>

            {/* Ficha rápida del profesor y modalidad */}
            <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
                Docente: <strong className="text-slate-900 dark:text-slate-100">{instructorName}</strong> ({instructorTitle})
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
              <span>Modalidad: <strong>Híbrido (En vivo + Asíncrono)</strong></span>
              {currentCourse?.live_schedule_notes && (
                <>
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    {currentCourse.live_schedule_notes}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Widget de Progreso del Curso */}
          <div className="lg:w-72 p-5 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs shrink-0">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                Progreso del Curso
              </span>
              <span className="text-blue-600 dark:text-cyan-400 text-sm font-black">
                {progressPct}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700/80 overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-medium">
              {completedCourseTopics} de {totalCourseTopics} temas completados
            </p>
          </div>
        </div>
      </section>

      {/* ─── BANNER DINÁMICO EN TIEMPO REAL (FAST-TRACK UX) ─── */}
      {liveSessionAlert ? (
        <section
          className={`p-5 rounded-2xl border shadow-md transition-all mb-8 ${
            liveSessionAlert.isLiveNow
              ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-500/80 animate-pulse'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white border-blue-500/80'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-xs shrink-0">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/25">
                    {liveSessionAlert.isLiveNow ? '🔴 EN VIVO AHORA' : '⚡ AULA VIRTUAL EN VIVO'}
                  </span>
                  <span className="text-xs text-white/80">{liveSessionAlert.scheduledAt}</span>
                </div>
                <h3 className="text-base sm:text-lg font-black">{liveSessionAlert.title}</h3>
              </div>
            </div>

            {liveSessionAlert.streamUrl ? (
              <a
                href={liveSessionAlert.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black text-sm shadow-lg transition active:scale-95 shrink-0"
              >
                <span>Entrar a la clase en vivo</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <span className="text-xs font-semibold bg-white/20 px-3 py-2 rounded-xl text-center">
                El enlace se habilitará al iniciar
              </span>
            )}
          </div>
        </section>
      ) : resumeLesson ? (
        <section className="p-5 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 mb-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-blue-600 text-white shrink-0 shadow-md shadow-blue-500/25">
                <Play className="w-5 h-5 fill-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-cyan-400">
                  Continuar donde te quedaste
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {resumeLesson.firstIncompleteChildTitle || resumeLesson.topicTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {resumeLesson.moduleTitle} · {resumeLesson.pendingLessonCount} lecciones pendientes
                </p>
              </div>
            </div>

            <Link
              to={resumeLesson.url}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition active:scale-95 shrink-0"
            >
              <span>Continuar lección actual</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      ) : null}

      {/* ─── PESTAÑAS DEL CURSO ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 mb-6 overflow-x-auto">
        {[
          { id: 'temario', label: 'Temario Asignado', icon: BookOpen, count: courseModules.length },
          { id: 'materiales', label: 'Materiales & PDFs', icon: FileText },
          { id: 'tareas', label: 'Tareas & Casos', icon: ClipboardList },
          { id: 'kardex', label: 'Kardex & Constancia', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as CourseTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── CONTENIDO DE PESTAÑAS ─── */}

      {/* PESTAÑA 1: TEMARIO ASIGNADO (AISLADO POR CURSO) */}
      {activeTab === 'temario' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Módulos de este nivel ({courseModules.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Solo se muestran los contenidos pertenecientes a este diplomado.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en el temario…"
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-3">
            {courseModules
              .filter(
                (m) =>
                  !searchQuery ||
                  m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  m.description.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((mod, modIdx) => {
                const isExpanded = expandedModules.has(mod.id);

                // Calcular progreso del módulo
                let modTopicsCount = 0;
                let modCompletedCount = 0;
                mod.topics.forEach((t) => {
                  modTopicsCount++;
                  if (isCompleted(t.id)) modCompletedCount++;
                  if (t.children) {
                    t.children.forEach((c) => {
                      modTopicsCount++;
                      if (isCompleted(c.id)) modCompletedCount++;
                    });
                  }
                });
                const modPct = modTopicsCount > 0 ? Math.round((modCompletedCount / modTopicsCount) * 100) : 0;
                const isFullyDone = modPct === 100;

                return (
                  <div
                    key={mod.id}
                    className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs transition"
                  >
                    <button
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="text-2xl shrink-0">{mod.emoji || '📖'}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              Módulo {modIdx + 1}
                            </span>
                            {isFullyDone && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3 h-3" /> Completado
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                            {mod.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                            {modPct}%
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {modCompletedCount}/{modTopicsCount} temas
                          </p>
                        </div>
                        <div className="p-1 rounded-lg text-slate-400">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 pt-3">
                          {mod.description}
                        </p>

                        <div className="space-y-1.5">
                          {mod.topics.map((t, tIdx) => {
                            const done = isCompleted(t.id);
                            const hasSubtopics = Boolean(t.children?.length);

                            return (
                              <div
                                key={t.id}
                                className="p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {done ? (
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                                      {tIdx + 1}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                      {t.title}
                                    </p>
                                    {hasSubtopics && (
                                      <p className="text-[10px] text-slate-400">
                                        {t.children?.length} subtemas incluidos
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {hasQuiz(t.id) && (
                                    <Link
                                      to={`/modulo/${mod.id}/evaluacion/${t.id}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                    >
                                      <Award className="w-3 h-3" />
                                      Quiz
                                    </Link>
                                  )}
                                  <Link
                                    to={`/modulo/${mod.id}/${t.id}`}
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition ${
                                      done
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                                    }`}
                                  >
                                    <span>{done ? 'Repasar' : 'Estudiar'}</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: MATERIALES Y DESCARGABLES */}
      {activeTab === 'materiales' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">
              Folleto & Temario Oficial del Curso
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Descarga la guía pedagógica estructurada con las competencias clínicas y los criterios electrofisiológicos a evaluar durante el diplomado.
            </p>
            {currentCourse?.syllabus_brochure_url ? (
              <a
                href={currentCourse.syllabus_brochure_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Folleto del Curso (PDF)</span>
              </a>
            ) : (
              <Link
                to="/temario"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>Ver Programa Académico en Plataforma</span>
              </Link>
            )}
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">
              Lecturas y Bibliografía Recomendada
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Material de consulta seleccionado por el comité para este nivel.
            </p>
            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Guía AANEM: Parámetros Normales y Técnicas de Neuroconducción</p>
                  <p className="text-[11px] text-slate-500">Documento de consenso internacional para valores de referencia.</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Control de Calidad y Artefactos en EMG</p>
                  <p className="text-[11px] text-slate-500">Criterios de validación de trazos y reducción de interferencia.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: TAREAS Y CASOS CLÍNICOS */}
      {activeTab === 'tareas' && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
          <ClipboardList className="w-10 h-10 text-blue-600 dark:text-cyan-400 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
            Tareas y Casos Asignados
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
            Revisa tus entregas activas y los casos prácticos con simulador asignados por el profesor titular para este curso.
          </p>
          <Link
            to="/portal?tab=assignments"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
          >
            <span>Ver Centro de Tareas y Entregas</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* PESTAÑA 4: KARDEX Y CONSTANCIA */}
      {activeTab === 'kardex' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Acreditación de {currentCourse?.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Requisito mínimo de aprobación: {currentCourse?.min_passing_grade || 80}/100 en evaluaciones y 100% de lecciones.
                </p>
              </div>
              <Link
                to="/portal?tab=certificate"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition"
              >
                <Award className="w-4 h-4" />
                <span>Ver Constancia Académica</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] uppercase font-bold text-slate-400">Avance de Temas</span>
                <p className="text-lg font-black text-slate-900 dark:text-white">{progressPct}%</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] uppercase font-bold text-slate-400">Quizzes Intentados</span>
                <p className="text-lg font-black text-slate-900 dark:text-white">{attempts.length}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] uppercase font-bold text-slate-400">Calificación Actual</span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {kardex?.finalGrade ? `${kardex.finalGrade}/100` : 'En progreso'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
