import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Bell,
  ClipboardList,
  LogOut,
  PenLine,
  Settings,
  Shield,
  UserCircle,
  Crown,
  GraduationCap,
  CheckCircle2,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { useStaffViewStore } from '../../stores/staffViewStore';
import { useAdminPendingCounts } from '../../hooks/useAdminPendingCounts';
import { useSyllabusCatalog } from '../../hooks/useSyllabusCatalog';
import { usePWAInstallStore } from '../../stores/pwaInstallStore';
import { courseDisplayTitle, sellableCourses } from '../../content/courseCatalog';
import {
  ENROLLMENT_META,
  getPermissionSummary,
  ROLE_META,
} from '../../utils/roleLabels';

export function UserMenu() {
  const location = useLocation();
  const {
    user,
    profile,
    roles,
    isAdmin,
    isEditor,
    canProposeContent,
    isEnrolledPhysician,
    isEnrolledInCourse,
    enrollmentStatus,
    bootstrapAvailable,
    claimBootstrapAdmin,
    signOut,
  } = useAuth();
  const { totalPending } = useAdminPendingCounts();
  const isStaff = isAdmin || isEditor;
  const isStandalone = usePWAInstallStore((s) => s.isStandalone);
  const triggerInstall = usePWAInstallStore((s) => s.triggerInstall);
  const studentMode = useStaffViewStore((s) => s.view) === 'student' && isStaff;
  const enterStudentMode = useStaffViewStore((s) => s.enterStudentMode);
  const exitStudentMode = useStaffViewStore((s) => s.exitStudentMode);
  const { courses } = useSyllabusCatalog();
  const activeSellable = sellableCourses(courses).filter((course) => isEnrolledInCourse(course.id));
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgFailed(false);
  }, [profile?.avatar_url]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Usuario';
  
  // Cálculo inteligente de iniciales: primer letra del primer nombre y primer letra del último apellido
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const initials = getInitials(displayName);

  // Rol representativo principal para el subtítulo del chip
  const primaryRole = studentMode
    ? 'Modo estudiante'
    : isAdmin
    ? 'Administrador'
    : roles.includes('editor')
    ? 'Editor Académico'
    : roles.includes('contributor')
    ? 'Colaborador'
    : isEnrolledPhysician
    ? 'Médico Inscrito'
    : 'Médico Alumno';

  const permissions = getPermissionSummary({
    roles,
    verifiedAt: profile?.verified_at ?? null,
    enrollmentStatus,
    canProposeContent,
    isEnrolledPhysician,
    isAdmin,
  });

  const handleClaimAdmin = async () => {
    setClaimError(null);
    setClaiming(true);
    const res = await claimBootstrapAdmin();
    setClaiming(false);
    if (res.error) setClaimError(res.error);
    else setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all group cursor-pointer"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de usuario"
      >
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 overflow-hidden flex items-center justify-center text-white text-xs font-bold tracking-wider shadow-xs ring-2 ring-white/90 dark:ring-slate-900">
            {profile?.avatar_url && !imgFailed ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              initials
            )}
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
            title="Sesión activa"
          />
        </div>

        <div className="hidden md:flex flex-col text-left justify-center min-w-0 pr-0.5">
          <span
            className="text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[10rem] lg:max-w-[13rem] xl:max-w-[16rem] truncate leading-tight group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors"
            title={displayName}
          >
            {displayName}
          </span>
          <span className={`text-[10px] font-medium leading-tight truncate ${studentMode ? 'text-amber-600 dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'}`}>
            {primaryRole}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-84 max-h-[calc(var(--app-height,100dvh)-env(safe-area-inset-bottom,0px)-5.75rem)] overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-300/40 dark:shadow-black/60 z-[60]"
        >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 overflow-hidden flex items-center justify-center text-white text-sm font-bold shadow-sm ring-2 ring-white dark:ring-slate-800 shrink-0">
                {profile?.avatar_url && !imgFailed ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate" title={displayName}>
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-cyan-300">
                    {primaryRole}
                  </span>
                  {enrollmentStatus === 'approved' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Inscrito
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/80">
              {roles.length ? (
                roles.map((role) => (
                  <span
                    key={role}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${ROLE_META[role].badgeClass}`}
                  >
                    {ROLE_META[role].label}
                  </span>
                ))
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Sin rol asignado
                </span>
              )}
              {enrollmentStatus !== 'approved' && (
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${ENROLLMENT_META[enrollmentStatus].badgeClass}`}
                >
                  {ENROLLMENT_META[enrollmentStatus].label}
                </span>
              )}
            </div>

            <div className="mt-3">
              <p className="text-[0.65rem] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">
                Permisos activos
              </p>
              <ul className="space-y-1">
                {permissions.map((p) => (
                  <li key={p} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Cursos activos y cursando */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[0.65rem] uppercase tracking-wide text-slate-400 font-semibold">
                  Cursos activos cursando
                </p>
                {activeSellable.length > 0 && (
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                    Acceso directo
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeSellable.length > 0 ? (
                  activeSellable.map((course) => (
                    <Link
                      key={course.id}
                      to={`/portal/curso/${course.id}`}
                      onClick={() => setOpen(false)}
                      title={`Ir al panel de ${courseDisplayTitle(course.id, courses)}`}
                      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 border border-emerald-300/70 hover:border-emerald-400 dark:border-emerald-700/60 transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate max-w-[170px]">{courseDisplayTitle(course.id, courses)}</span>
                      <ChevronRight className="w-2.5 h-2.5 text-emerald-600/70 dark:text-emerald-400/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </Link>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Sin cursos activos</span>
                )}
              </div>
            </div>
          </div>

          {bootstrapAvailable && !isAdmin && (
            <div className="px-4 py-3 border-b border-amber-200/60 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/20">
              <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                No hay administrador. Como CEO puedes activar el acceso completo.
              </p>
              {claimError && <p className="text-xs text-red-600 mb-2">{claimError}</p>}
              <button
                type="button"
                disabled={claiming}
                onClick={handleClaimAdmin}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50"
              >
                <Crown className="w-4 h-4" />
                {claiming ? 'Activando…' : 'Activar administrador'}
              </button>
            </div>
          )}

          <div className="py-1">
            <MenuLink to="/portal?tab=notifications" icon={Bell} onClick={() => setOpen(false)}>
              Notificaciones
            </MenuLink>
            {isStaff ? (
              studentMode ? (
                <MenuLink to="/admin" icon={Shield} onClick={() => { exitStudentMode(); setOpen(false); }}>
                  {isAdmin ? 'Volver al panel admin' : 'Volver al panel'}
                </MenuLink>
              ) : (
                <MenuLink to="/portal" icon={GraduationCap} onClick={() => { enterStudentMode(); setOpen(false); }}>
                  Entrar en modo estudiante
                </MenuLink>
              )
            ) : (
              <MenuLink to="/portal" icon={GraduationCap} onClick={() => setOpen(false)}>
                Mi portal
              </MenuLink>
            )}
            <MenuLink to="/cuenta" icon={UserCircle} onClick={() => setOpen(false)}>
              Mi cuenta
            </MenuLink>
            {canProposeContent && (
              <MenuLink to="/colaborador" icon={PenLine} onClick={() => setOpen(false)}>
                Colaborar
              </MenuLink>
            )}
            {canProposeContent && (
              <MenuLink
                to="/colaborador/cuestionario"
                icon={ClipboardList}
                onClick={() => setOpen(false)}
                state={{ from: location.pathname + location.search }}
              >
                Cuestionarios
              </MenuLink>
            )}
            {(isAdmin || isEditor) && (
              <MenuLink
                to="/admin"
                icon={Shield}
                onClick={() => setOpen(false)}
                badge={totalPending > 0 ? (totalPending > 9 ? '9+' : String(totalPending)) : undefined}
              >
                {isAdmin ? 'Administración' : 'Panel del profesor'}
              </MenuLink>
            )}
            {!isStandalone && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void triggerInstall();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>Instalar App</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300">
                  PWA
                </span>
              </button>
            )}
            <MenuLink
              to="/cuenta/ajustes"
              icon={Settings}
              onClick={() => setOpen(false)}
              state={{ from: location.pathname + location.search }}
            >
              Ajustes
            </MenuLink>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 p-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  to,
  icon: Icon,
  children,
  onClick,
  badge,
  state,
}: {
  to: string;
  icon: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
  badge?: string;
  state?: any;
}) {
  return (
    <Link
      to={to}
      state={state}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      <Icon className="w-4 h-4 text-slate-400" />
      <span className="flex-1">{children}</span>
      {badge && (
        <span className="min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[0.6rem] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </Link>
  );
}
