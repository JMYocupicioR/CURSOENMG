import { useState, useEffect } from 'react';
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
  User,
  Users,
  Scale,
  Settings,
  X,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { useStaffViewStore } from '../../stores/staffViewStore';
import { useStudentPendingAssignments } from '../../hooks/useStudentPendingAssignments';

type DockItem = {
  id: string;
  label: string;
  to?: string;
  action?: 'more';
  icon: LucideIcon;
  well: string;
  activeWell: string;
  iconColor: string;
  isActive: boolean;
  badge?: string | number;
};

export function MobileBottomNav() {
  const location = useLocation();
  const { user, profile, isAdmin, isEditor } = useAuth();
  const isStaff = isAdmin || isEditor;
  const studentMode = useStaffViewStore((s) => s.view) === 'student' && isStaff;
  const { pendingCount } = useStudentPendingAssignments();
  const [moreOpen, setMoreOpen] = useState(false);
  const path = location.pathname;

  useEffect(() => {
    setMoreOpen(false);
  }, [path, location.search]);

  if (
    path.startsWith('/examenes/sesion') ||
    (isStaff && !studentMode) ||
    (isStaff && path.startsWith('/admin'))
  ) {
    return null;
  }

  const examBadge = pendingCount > 0 ? (pendingCount > 9 ? '9+' : pendingCount) : undefined;

  const isMoreRouteActive =
    path.startsWith('/perfil') ||
    path.startsWith('/cuenta') ||
    path.startsWith('/especialistas') ||
    path.startsWith('/comite-editorial');

  // Regla de 5 destinos principales (Material Design / iOS HIG) con Touch Target >= 48x48px
  const studentItems: DockItem[] = [
    {
      id: 'portal',
      label: 'Portal',
      to: '/portal',
      icon: LayoutDashboard,
      well: 'bg-indigo-500/15',
      activeWell: 'bg-indigo-600 text-white shadow-sm',
      iconColor: 'text-indigo-300',
      isActive: path === '/portal' || path === '/dashboard' || path === '/estudiante',
      badge: examBadge,
    },
    {
      id: 'study',
      label: 'Estudio',
      to: '/temario',
      icon: BookOpen,
      well: 'bg-blue-500/15',
      activeWell: 'bg-blue-600 text-white shadow-sm',
      iconColor: 'text-blue-300',
      isActive:
        path.startsWith('/modulo') ||
        path === '/temario' ||
        path === '/programa' ||
        path.startsWith('/talleres') ||
        path.startsWith('/taller') ||
        path.startsWith('/biblioteca'),
    },
    {
      id: 'practice',
      label: 'Práctica',
      to: '/simuladores',
      icon: Activity,
      well: 'bg-emerald-500/15',
      activeWell: 'bg-emerald-600 text-white shadow-sm',
      iconColor: 'text-emerald-300',
      isActive:
        path.startsWith('/simuladores') ||
        path.startsWith('/ejercicios') ||
        path.startsWith('/examenes') ||
        path.startsWith('/herramientas'),
    },
    {
      id: 'courses',
      label: isStaff ? 'Panel' : 'Cursos',
      to: isStaff ? '/admin' : '/cursos',
      icon: isStaff ? Shield : GraduationCap,
      well: 'bg-amber-500/15',
      activeWell: 'bg-amber-600 text-white shadow-sm',
      iconColor: 'text-amber-300',
      isActive: isStaff ? path.startsWith('/admin') : path.startsWith('/cursos'),
    },
    {
      id: 'more',
      label: 'Perfil',
      action: 'more',
      icon: User,
      well: 'bg-slate-500/20',
      activeWell: 'bg-slate-700 text-white shadow-sm',
      iconColor: 'text-slate-300',
      isActive: moreOpen || isMoreRouteActive,
    },
  ];

  const guestItems: DockItem[] = [
    {
      id: 'home',
      label: 'Inicio',
      to: '/',
      icon: Home,
      well: 'bg-indigo-500/15',
      activeWell: 'bg-indigo-600 text-white shadow-sm',
      iconColor: 'text-indigo-300',
      isActive: path === '/',
    },
    {
      id: 'topics',
      label: 'Temas',
      to: '/temario',
      icon: BookOpen,
      well: 'bg-blue-500/15',
      activeWell: 'bg-blue-600 text-white shadow-sm',
      iconColor: 'text-blue-300',
      isActive: path === '/temario' || path === '/programa',
    },
    {
      id: 'courses',
      label: 'Cursos',
      to: '/cursos',
      icon: GraduationCap,
      well: 'bg-amber-500/15',
      activeWell: 'bg-amber-600 text-white shadow-sm',
      iconColor: 'text-amber-300',
      isActive: path.startsWith('/cursos'),
    },
    {
      id: 'login',
      label: 'Ingresar',
      to: '/auth/login',
      icon: LogIn,
      well: 'bg-emerald-500/15',
      activeWell: 'bg-emerald-600 text-white shadow-sm',
      iconColor: 'text-emerald-300',
      isActive: path.startsWith('/auth') || path === '/login' || path === '/registro',
    },
  ];

  const navItems = user ? studentItems : guestItems;

  return (
    <>
      {/* Sheet / Drawer Rápido para Perfil, Clases, Práctica Directa y Directorio Docente */}
      {moreOpen && user && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-black/60 backdrop-blur-xs flex items-end justify-center"
          onClick={() => setMoreOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Menú rápido del estudiante y perfil"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl bg-slate-900 border-t border-slate-800 p-4 pb-24 text-white shadow-2xl animate-fade-in"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {profile?.display_name || user.email}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {[profile?.specialty, profile?.institution].filter(Boolean).join(' · ') ||
                    'Médico Inscrito'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <Link
                to="/talleres"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70"
              >
                <Video className="w-4 h-4 text-violet-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Clases en Vivo</p>
                  <p className="text-[10px] text-slate-400 truncate">Talleres y grabaciones</p>
                </div>
              </Link>

              <Link
                to="/ejercicios"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70"
              >
                <Activity className="w-4 h-4 text-teal-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Casos Clínicos</p>
                  <p className="text-[10px] text-slate-400 truncate">Entrenamiento EMG</p>
                </div>
              </Link>

              <Link
                to="/examenes"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70"
              >
                <ClipboardList className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Exámenes</p>
                  <p className="text-[10px] text-slate-400 truncate">Simulador COMEFYR</p>
                </div>
              </Link>

              <Link
                to="/simuladores/trazos"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70"
              >
                <Waves className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Trazos EMG</p>
                  <p className="text-[10px] text-slate-400 truncate">Morfología CMAP/SNAP</p>
                </div>
              </Link>
            </div>

            <div className="space-y-1.5">
              <Link
                to="/perfil"
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/70 text-xs font-medium text-slate-200"
              >
                <span className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-blue-400" />
                  <span>Mi Perfil Académico y Cédula SEP</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>

              <Link
                to="/especialistas"
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/70 text-xs font-medium text-slate-200"
              >
                <span className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Directorio de Equipo Docente</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>

              <Link
                to="/comite-editorial"
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/70 text-xs font-medium text-slate-200"
              >
                <span className="flex items-center gap-2.5">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  <span>Comité Editorial y Aval</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>

              <Link
                to="/cuenta/ajustes"
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/70 text-xs font-medium text-slate-200"
              >
                <span className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Ajustes y Alertas del Dispositivo</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Accesos rápidos del estudiante"
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-5 items-stretch gap-1 px-2 py-1 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const inner = (
              <>
                <span
                  className={`relative w-9 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    item.isActive ? item.activeWell : item.well
                  }`}
                >
                  <Icon
                    className={`w-[19px] h-[19px] ${item.isActive ? 'text-white' : item.iconColor}`}
                    strokeWidth={2.25}
                  />
                  {item.badge != null && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold font-mono tabular-nums leading-none flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-semibold leading-none tracking-tight truncate max-w-full ${
                    item.isActive ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </>
            );

            if (item.action === 'more') {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  className="flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-1 active:scale-95 transition-transform cursor-pointer"
                >
                  {inner}
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                to={item.to || '/portal'}
                aria-current={item.isActive ? 'page' : undefined}
                className="flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-1 active:scale-95 transition-transform"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
