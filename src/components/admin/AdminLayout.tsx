import { useState } from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { useStaffViewStore } from '../../stores/staffViewStore';
import { useAdminPendingCounts } from '../../hooks/useAdminPendingCounts';
import { BRAND } from '../../config/brand';
import { TeacherQuickDock } from './TeacherQuickDock';

const SIDEBAR_STORAGE_KEY = 'electrodx_admin_sidebar_collapsed_v1';

function NavBadge({ count, compact = false }: { count: number; compact?: boolean }) {
  if (count <= 0) return null;
  if (compact) {
    return (
      <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black leading-none flex items-center justify-center shadow-xs">
        {count > 99 ? '99+' : count}
      </span>
    );
  }
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
  subtitle?: string;
  items: AdminNavTab[];
};

export function AdminLayout({
  title,
  subtitle,
  headerActions,
  children,
  fullBleed = false,
}: {
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  fullBleed?: boolean;
}) {
  const location = useLocation();
  const { isAdmin, isEditor, user } = useAuth();
  const isStaff = isAdmin || isEditor;
  const enterStudentMode = useStaffViewStore((s) => s.enterStudentMode);
  const {
    pendingEnrollments,
    pendingCourseEnrollments,
    pendingRevisions,
    pendingTeacherReviews,
    pendingQuizzes,
  } = useAdminPendingCounts();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const groups: NavGroup[] = [
    {
      id: 'hoy',
      title: 'Operación diaria',
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
      title: 'Contenido y cursos',
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
    <div
      className={`pt-16 sm:pt-20 pb-24 lg:pb-10 px-4 sm:px-6 lg:px-8 xl:px-10 mx-auto ${
        fullBleed ? 'max-w-[1880px]' : 'max-w-[1680px] 2xl:max-w-[1800px]'
      }`}
    >
      <TeacherQuickDock />

      {/* Mobile Sticky Horizontal Navigation */}
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
            onClick={() => {
              if (isStaff) enterStudentMode();
            }}
            className="sm:hidden shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl text-indigo-600 dark:text-cyan-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            title="Ver como alumno"
            aria-label="Ver como alumno"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
        {/* Desktop Collapsible Navigation Rail */}
        <aside
          className={`hidden lg:block flex-shrink-0 transition-all duration-200 ${
            collapsed ? 'lg:w-[68px]' : 'lg:w-56 xl:w-60'
          }`}
        >
          <div className="p-2.5 xl:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs lg:sticky lg:top-20">
            <div
              className={`flex items-center ${
                collapsed ? 'justify-center' : 'justify-between gap-2'
              } mb-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800`}
            >
              {!collapsed && (
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-1">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900 dark:text-white text-xs xl:text-sm truncate leading-tight">
                      Panel Docente
                    </p>
                    <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                      Dirección {BRAND.shortName}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                title={collapsed ? 'Expandir menú lateral' : 'Compactar menú lateral'}
                aria-label={collapsed ? 'Expandir menú lateral' : 'Compactar menú lateral'}
              >
                {collapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Desktop 3-Group Navigation */}
            <nav className="hidden lg:flex lg:flex-col space-y-4">
              {groups.map((group) => {
                const visibleItems = group.items.filter((t) => !t.adminOnly || isAdmin);
                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.id} className="space-y-0.5">
                    {!collapsed ? (
                      <div className="px-2.5 pb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block truncate">
                          {group.title}
                        </span>
                      </div>
                    ) : (
                      <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1 mx-2" />
                    )}

                    <div className="space-y-0.5">
                      {visibleItems.map(({ to, label, shortLabel, icon: Icon, exact, badge }) => {
                        const active = isActive(to, exact);
                        return (
                          <Link
                            key={to}
                            to={to}
                            title={label}
                            className={`relative flex items-center ${
                              collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-2.5 py-2'
                            } rounded-xl text-xs xl:text-[13px] font-medium transition-all ${
                              active
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/25 font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 flex-shrink-0 ${
                                active ? 'text-white' : 'text-slate-400'
                              }`}
                            />
                            {!collapsed && (
                              <span className="flex-1 min-w-0 truncate">{shortLabel ?? label}</span>
                            )}
                            <NavBadge count={badge} compact={collapsed} />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            {!collapsed && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 hidden lg:block px-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                    Sesión Directiva
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {isAdmin ? 'Admin' : 'Docente'}
                  </span>
                </div>
                <p className="truncate text-slate-400 dark:text-slate-500 mt-0.5 text-[10px]">
                  {user?.email}
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main id="contenido-principal" className="flex-1 min-w-0 w-full">
          {/* Unified Compact Executive Header Bar */}
          <div className="mb-4 lg:mb-5 pb-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {/* Compact Breadcrumb */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-1">
                <Link to="/" className="hover:text-blue-600 dark:hover:text-cyan-400 transition">
                  {BRAND.shortName}
                </Link>
                <span>/</span>
                <Link
                  to="/admin"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition"
                >
                  Administración
                </Link>
                {location.pathname !== '/admin' && currentTab && (
                  <>
                    <span>/</span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      {currentTab.shortLabel ?? currentTab.label}
                    </span>
                  </>
                )}
              </div>

              {title && (
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Unified Right Toolbar: Page Header Actions + Student View Switch */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {headerActions}

              <div className="hidden sm:flex items-center gap-2">
                {headerActions && (
                  <span className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
                )}
                <span className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isAdmin ? 'Administrador' : 'Profesor'}</span>
                </span>
                <Link
                  to="/portal"
                  onClick={() => {
                    if (isStaff) enterStudentMode();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-400 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
                  title="Abrir la experiencia del alumno en el portal"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
                  <span>Ver como alumno</span>
                </Link>
              </div>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
