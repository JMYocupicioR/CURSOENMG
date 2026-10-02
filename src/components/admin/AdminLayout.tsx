import { Link, useLocation } from 'react-router-dom';
import {
  Shield,
  Inbox,
  Users,
  FileCheck,
  ScrollText,
  ClipboardList,
  Video,
  Lock,
  Eye,
  CheckCircle2,
  GraduationCap,
  Stethoscope,
  Calendar,
  UserCheck,
  Sparkles,
  BookMarked,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { useStaffViewStore } from '../../stores/staffViewStore';
import { useAdminPendingCounts } from '../../hooks/useAdminPendingCounts';
import { BRAND } from '../../config/brand';
import { TeacherQuickDock } from './TeacherQuickDock';

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-[1.25rem] px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[0.65rem] font-bold leading-none flex items-center justify-center shadow-xs">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export type AdminNavTab = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: typeof Inbox;
  exact: boolean;
  badge: number;
  adminOnly?: boolean;
};

export type NavGroup = {
  id: string;
  title: string;
  subtitle: string;
  items: AdminNavTab[];
};

export function AdminLayout({
  title,
  subtitle,
  children,
  fullBleed = false,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  fullBleed?: boolean;
}) {
  const location = useLocation();
  const { isAdmin, isEditor, user } = useAuth();
  const isStaff = isAdmin || isEditor;
  const enterStudentMode = useStaffViewStore((s) => s.enterStudentMode);
  const { pendingEnrollments, pendingCourseEnrollments, pendingRevisions, pendingTeacherReviews, pendingQuizzes } = useAdminPendingCounts();

  const groups: NavGroup[] = [
    {
      id: 'hoy',
      title: 'Hoy',
      subtitle: 'cada clase',
      items: [
        {
          to: '/admin',
          label: 'Bandeja',
          icon: Inbox,
          exact: true,
          badge:
            pendingTeacherReviews +
            pendingCourseEnrollments +
            pendingEnrollments +
            pendingQuizzes +
            pendingRevisions,
        },
        {
          to: '/admin/calendario',
          label: 'Calendario',
          icon: Calendar,
          exact: false,
          badge: 0,
        },
        {
          to: '/admin/alumnos/tareas',
          label: 'Tareas',
          icon: ClipboardList,
          exact: false,
          badge: pendingTeacherReviews,
        },
        {
          to: '/admin/alumnos',
          label: 'Alumnos',
          icon: Users,
          exact: false,
          badge: 0,
        },
      ],
    },
    {
      id: 'curso',
      title: 'Contenido',
      subtitle: 'Aqui editas el contenido del curso',
      items: [
        {
          to: '/admin/temario',
          label: 'Temario',
          icon: ClipboardList,
          exact: false,
          badge: 0,
        },
        {
          to: '/admin/exportacion',
          label: 'Exportación de material didáctico',
          shortLabel: 'Exportación',
          icon: BookMarked,
          exact: false,
          badge: 0,
        },
        {
          to: '/admin/quizzes',
          label: 'Evaluaciones',
          icon: GraduationCap,
          exact: false,
          badge: 0,
        },
        {
          to: '/admin/ejercicios',
          label: 'Casos',
          icon: Stethoscope,
          exact: false,
          badge: 0,
        },
        {
          to: '/admin/talleres',
          label: 'Clases en vivo',
          icon: Video,
          exact: false,
          badge: 0,
        },
        {
          to: '/admin/induccion',
          label: 'Inducción',
          icon: Sparkles,
          exact: false,
          badge: 0,
        },
      ],
    },
    {
      id: 'direccion',
      title: 'Dirección',
      subtitle: 'de vez en cuando',
      items: [
        {
          to: '/admin/admisiones',
          label: 'Admisiones',
          icon: UserCheck,
          exact: false,
          badge: pendingCourseEnrollments + pendingEnrollments,
          adminOnly: true,
        },
        {
          to: '/admin/usuarios',
          label: 'Médicos',
          icon: Users,
          exact: false,
          badge: 0,
          adminOnly: true,
        },
        {
          to: '/admin/acceso',
          label: 'Acceso',
          icon: Lock,
          exact: false,
          badge: 0,
          adminOnly: true,
        },
        {
          to: '/admin/revisiones',
          label: 'Cola editorial',
          icon: FileCheck,
          exact: false,
          badge: pendingRevisions + pendingQuizzes,
        },
        {
          to: '/admin/auditoria',
          label: 'Auditoría',
          icon: ScrollText,
          exact: false,
          badge: 0,
          adminOnly: true,
        },
      ],
    },
  ];

  const allTabs = groups.flatMap((g) => g.items).filter((t) => !t.adminOnly || isAdmin);

  const isActive = (to: string, exact: boolean) => {
    if (exact) return location.pathname === to;
    if (to === '/admin/alumnos') {
      return (
        location.pathname === '/admin/alumnos' ||
        location.pathname === '/admin/progreso' ||
        /^\/admin\/(alumnos|progreso)\/[0-9a-f-]{8,}$/i.test(location.pathname)
      );
    }
    return location.pathname.startsWith(to);
  };

  const currentTab = allTabs.find((t) => isActive(t.to, t.exact)) ?? allTabs[0];

  return (
    <div className={`pt-20 sm:pt-24 pb-24 lg:pb-10 px-4 sm:px-6 mx-auto ${fullBleed ? 'max-w-screen-2xl' : 'max-w-7xl'}`}>
      <TeacherQuickDock />
      {/* Top Breadcrumb & Status Bar — desktop. On mobile this row sat under the fixed header. */}
      <div className="mb-4 lg:mb-6 hidden sm:flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
          <Link to="/" className="hover:text-blue-600 transition">{BRAND.shortName}</Link>
          <span>/</span>
          <Link to="/admin" className="hover:text-indigo-600 font-medium">Administración</Link>
          {location.pathname !== '/admin' && (
            <>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-semibold">{currentTab.label}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isAdmin ? 'Administrador' : 'Profesor'}</span>
          </span>
          <Link
            to="/portal"
            onClick={() => { if (isStaff) enterStudentMode(); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
            title="Abrir la experiencia del alumno en el portal"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
            <span>Ver como alumno</span>
          </Link>
        </div>
      </div>

      <div className="lg:hidden sticky top-14 sm:top-16 z-30 -mx-4 sm:-mx-6 mb-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-3 py-2">
          {location.pathname !== '/admin' && (
            <Link
              to="/admin"
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Panel
            </Link>
          )}
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none flex gap-1.5">
            {allTabs.map(({ to, label, shortLabel, icon: Icon, exact, badge }) => {
              const active = isActive(to, exact);
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{shortLabel ?? label}</span>
                  <NavBadge count={badge} />
                </Link>
              );
            })}
          </div>
          <Link
            to="/portal"
            onClick={() => { if (isStaff) enterStudentMode(); }}
            className="sm:hidden shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl text-indigo-600 dark:text-cyan-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            title="Ver como alumno"
            aria-label="Ver como alumno"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
        <aside className="hidden lg:block lg:w-64 flex-shrink-0">
          <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm lg:sticky lg:top-24">
            <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-900 dark:text-white text-sm truncate">Panel Docente</p>
                <p className="text-[11px] text-slate-400 truncate">Dirección {BRAND.shortName}</p>
              </div>
            </div>

            {/* Desktop 3-Group Navigation */}
            <nav className="hidden lg:flex lg:flex-col space-y-5">
              {groups.map((group) => {
                const visibleItems = group.items.filter((t) => !t.adminOnly || isAdmin);
                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.id} className="space-y-1">
                    <div className="px-3 pb-1 flex items-baseline justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {group.title}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                        {group.subtitle}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {visibleItems.map(({ to, label, shortLabel, icon: Icon, exact, badge }) => {
                        const active = isActive(to, exact);
                        return (
                          <Link
                            key={to}
                            to={to}
                            title={label}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                              active
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                            <span className="flex-1 min-w-0 truncate">{shortLabel ?? label}</span>
                            <NavBadge count={badge} />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 hidden lg:block text-xs">
              <p className="font-bold text-slate-700 dark:text-slate-200">Sesión Directiva</p>
              <p className="truncate text-slate-500 dark:text-slate-400 mt-0.5 text-[11px]">{user?.email}</p>
              <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                Diplomado en Electrodiagnostico v1.0
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {title && (
            <div className={subtitle ? 'mb-4 lg:mb-6' : 'mb-3 lg:mb-4'}>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
