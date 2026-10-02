import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Activity,
  ClipboardList,
  Video,
  Waves,
  GraduationCap,
  LayoutDashboard,
  Home,
  LogIn,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { useStaffViewStore } from '../../stores/staffViewStore';
import { useStudentPendingAssignments } from '../../hooks/useStudentPendingAssignments';

type DockItem = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  well: string;
  activeWell: string;
  iconColor: string;
  isActive: boolean;
  badge?: string | number;
};

export function MobileBottomNav() {
  const location = useLocation();
  const { user, isAdmin, isEditor } = useAuth();
  const isStaff = isAdmin || isEditor;
  const studentMode = useStaffViewStore((s) => s.view) === 'student' && isStaff;
  const { pendingCount } = useStudentPendingAssignments();
  const path = location.pathname;

  if (
    path.startsWith('/examenes/sesion') ||
    (isStaff && !studentMode) ||
    (isStaff && path.startsWith('/admin'))
  ) {
    return null;
  }

  const examBadge = pendingCount > 0 ? (pendingCount > 9 ? '9+' : pendingCount) : undefined;

  const studentItems: DockItem[] = [
    {
      id: 'portal',
      label: 'Portal',
      to: '/portal',
      icon: LayoutDashboard,
      well: 'bg-indigo-500/15',
      activeWell: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30',
      iconColor: 'text-indigo-300',
      isActive: path === '/portal' || path === '/dashboard' || path === '/estudiante',
    },
    {
      id: 'topics',
      label: 'Temas',
      to: '/temario',
      icon: BookOpen,
      well: 'bg-blue-500/15',
      activeWell: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30',
      iconColor: 'text-blue-300',
      isActive: path.startsWith('/modulo') || path === '/temario' || path === '/programa',
    },
    {
      id: 'cases',
      label: 'Casos',
      to: '/ejercicios',
      icon: Activity,
      well: 'bg-teal-500/15',
      activeWell: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/30',
      iconColor: 'text-teal-300',
      isActive: path.startsWith('/ejercicios'),
    },
    {
      id: 'exams',
      label: 'Examen',
      to: '/examenes',
      icon: ClipboardList,
      well: 'bg-rose-500/15',
      activeWell: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/30',
      iconColor: 'text-rose-300',
      isActive: path.startsWith('/examenes'),
      badge: examBadge,
    },
    {
      id: 'classes',
      label: 'Clases',
      to: '/talleres',
      icon: Video,
      well: 'bg-violet-500/15',
      activeWell: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/30',
      iconColor: 'text-violet-300',
      isActive: path.startsWith('/talleres') || path.startsWith('/taller'),
    },
    {
      id: 'sims',
      label: 'Simular',
      to: '/simuladores',
      icon: Waves,
      well: 'bg-cyan-500/15',
      activeWell: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30',
      iconColor: 'text-cyan-300',
      isActive:
        path.startsWith('/simuladores') ||
        path.startsWith('/herramientas'),
    },
    {
      id: 'courses',
      label: isStaff ? 'Panel' : 'Cursos',
      to: isStaff ? '/admin' : '/cursos',
      icon: isStaff ? Shield : GraduationCap,
      well: 'bg-amber-500/15',
      activeWell: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30',
      iconColor: 'text-amber-300',
      isActive: isStaff ? path.startsWith('/admin') : path.startsWith('/cursos'),
    },
  ];

  const guestItems: DockItem[] = [
    {
      id: 'home',
      label: 'Inicio',
      to: '/',
      icon: Home,
      well: 'bg-indigo-500/15',
      activeWell: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30',
      iconColor: 'text-indigo-300',
      isActive: path === '/',
    },
    {
      id: 'topics',
      label: 'Temas',
      to: '/temario',
      icon: BookOpen,
      well: 'bg-blue-500/15',
      activeWell: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30',
      iconColor: 'text-blue-300',
      isActive: path === '/temario' || path === '/programa',
    },
    {
      id: 'courses',
      label: 'Cursos',
      to: '/cursos',
      icon: GraduationCap,
      well: 'bg-amber-500/15',
      activeWell: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30',
      iconColor: 'text-amber-300',
      isActive: path.startsWith('/cursos'),
    },
    {
      id: 'login',
      label: 'Ingresar',
      to: '/auth/login',
      icon: LogIn,
      well: 'bg-emerald-500/15',
      activeWell: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30',
      iconColor: 'text-emerald-300',
      isActive: path.startsWith('/auth') || path === '/login' || path === '/registro',
    },
  ];

  const navItems = user ? studentItems : guestItems;

  return (
    <nav
      aria-label="Accesos rápidos del estudiante"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-between gap-0.5 px-1.5 pt-1.5 pb-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.to}
              aria-current={item.isActive ? 'page' : undefined}
              className="flex flex-1 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-1 active:scale-95 transition-transform"
            >
              <span
                className={`relative w-8 h-8 rounded-xl flex items-center justify-center ${
                  item.isActive ? item.activeWell : item.well
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] ${item.isActive ? 'text-white' : item.iconColor}`}
                  strokeWidth={2.25}
                />
                {item.badge != null && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-1 rounded-full bg-rose-500 text-white text-[8px] font-black leading-none flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </span>
              <span
                className={`text-[9px] font-semibold leading-none tracking-tight truncate max-w-full ${
                  item.isActive ? 'text-white' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
