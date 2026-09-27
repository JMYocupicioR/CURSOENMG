import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  FileCheck,
  GraduationCap,
  Inbox,
  Shield,
  Stethoscope,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { useAdminPendingCounts } from '../../hooks/useAdminPendingCounts';
import { useStaffViewStore } from '../../stores/staffViewStore';
import { ComefyrBadge } from './ComefyrBadge';

const SHORTCUTS = [
  {
    to: '/admin',
    label: 'Bandeja',
    desc: 'Pendientes de hoy',
    icon: Inbox,
    countKey: 'inbox' as const,
  },
  {
    to: '/admin/calendario',
    label: 'Calendario',
    desc: 'Clases de la semana',
    icon: Calendar,
    countKey: null,
  },
  {
    to: '/admin/alumnos/tareas',
    label: 'Tareas',
    desc: 'Entregas y reintentos',
    icon: ClipboardList,
    countKey: 'tasks' as const,
  },
  {
    to: '/admin/alumnos',
    label: 'Alumnos',
    desc: 'Kardex del grupo',
    icon: Users,
    countKey: null,
  },
  {
    to: '/admin/quizzes',
    label: 'Evaluaciones',
    desc: 'Cuestionarios del temario',
    icon: GraduationCap,
    countKey: 'quizzes' as const,
  },
  {
    to: '/admin/ejercicios',
    label: 'Casos',
    desc: 'Ejercicios clínicos',
    icon: Stethoscope,
    countKey: null,
  },
  {
    to: '/admin/talleres',
    label: 'Clases en vivo',
    desc: 'Talleres programados',
    icon: Video,
    countKey: null,
  },
  {
    to: '/admin/admisiones',
    label: 'Admisiones',
    desc: 'Solicitudes por revisar',
    icon: UserCheck,
    countKey: 'admissions' as const,
  },
  {
    to: '/admin/revisiones',
    label: 'Cola editorial',
    desc: 'Revisiones de contenido',
    icon: FileCheck,
    countKey: 'revisions' as const,
  },
];

export function TeacherLanding() {
  const { profile, user } = useAuth();
  const enterStudentMode = useStaffViewStore((s) => s.enterStudentMode);
  const counts = useAdminPendingCounts();
  const name = profile?.display_name?.trim() || user?.email?.split('@')[0] || 'Profesor';

  const countFor = (key: (typeof SHORTCUTS)[number]['countKey']) => {
    if (key === 'inbox') return counts.totalPending;
    if (key === 'tasks') return counts.pendingTeacherReviews;
    if (key === 'quizzes') return counts.pendingQuizzes;
    if (key === 'admissions') return counts.pendingEnrollments + counts.pendingCourseEnrollments;
    if (key === 'revisions') return counts.pendingRevisions + counts.pendingQuizzes;
    return 0;
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <section className="relative overflow-hidden px-4 pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-10 w-[400px] h-[300px] bg-cyan-500/5 dark:bg-cyan-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <ComefyrBadge />
            </div>
            <div className="mb-4 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-500/20">
                <Shield className="w-3.5 h-3.5" />
                Panel del profesor
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto mb-4 leading-[1.15]">
              {name}, la dirección del diplomado está en tu bandeja
            </h1>
            <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
              Admisiones, tareas, clases y contenido del posgrado, listos para la sesión de hoy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-12">
              <Link
                to="/admin"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] transition-all"
              >
                <Inbox className="w-5 h-5" />
                <span>Abrir bandeja</span>
                {counts.totalPending > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                    {counts.totalPending > 9 ? '9+' : counts.totalPending}
                  </span>
                )}
              </Link>
              <Link
                to="/admin/calendario"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all shadow-xs"
              >
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Calendario de la semana</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {SHORTCUTS.map((item) => {
              const count = countFor(item.countKey);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center gap-3 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all"
                >
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 shrink-0">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{item.label}</span>
                      {count > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                          {count > 9 ? '9+' : count}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</span>
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={enterStudentMode}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
            >
              Ver el sitio como lo ve un alumno
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
