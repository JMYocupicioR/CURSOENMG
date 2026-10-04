import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSettingsStore } from './stores/settingsStore';
import { useOfflineStore } from './stores/offlineStore';
import {
  BookOpen,
  Sun,
  Moon,
  Menu,
  X,
  Users,
  LogIn,
  Scale,
  GraduationCap,
  Shield,
  ChevronRight,
  Wrench,
  Lock,
  ClipboardList,
  PanelLeft,
  Search,
  Video,
  Sparkles,
  Settings,
  LogOut,
  Play,
  Smartphone,
} from 'lucide-react';
import { useCommandPaletteStore } from './stores/commandPaletteStore';
import { usePWAInstallStore } from './stores/pwaInstallStore';
import { BrandLogo } from './components/brand/BrandLogo';
import { CourseSidebar } from './components/CourseSidebar';
import { BRAND } from './config/brand';
import { OfflineIndicator } from './components/OfflineButton';
import { PWAUpdateButton } from './components/pwa/PWAUpdateButton';
import { UserMenu } from './components/user/UserMenu';
import { TeacherCommentBell } from './components/admin/TeacherCommentBell';
import { useAuth } from './contexts/AuthProvider';
import { useStaffViewStore } from './stores/staffViewStore';
import { useAdminPendingCounts } from './hooks/useAdminPendingCounts';
import { useStudentPendingAssignments } from './hooks/useStudentPendingAssignments';
import { isSupabaseConfigured } from './lib/supabase';
import { flushProgressOutbox, getLastVisitedTopic } from './services/studentService';

function navClass(active: boolean) {
  return `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
    active
      ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-cyan-400 font-semibold'
      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
  }`;
}

function MobileNavRow({
  to,
  icon,
  label,
  onClick,
  trailing,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-medium text-sm transition"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {trailing}
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    </Link>
  );
}

export function Header() {
  const { isDarkMode, toggleDarkMode } = useSettingsStore();
  const openCommandPalette = useCommandPaletteStore((s) => s.open);
  const initializeOffline = useOfflineStore((s) => s.initialize);
  const { user, profile, isAdmin, isEditor, isPendingApproval, signOut } = useAuth();
  const isStaff = isAdmin || isEditor;
  const isStandalone = usePWAInstallStore((s) => s.isStandalone);
  const triggerInstall = usePWAInstallStore((s) => s.triggerInstall);
  const studentMode = useStaffViewStore((s) => s.view) === 'student' && isStaff;
  const { totalPending } = useAdminPendingCounts();
  const { pendingCount } = useStudentPendingAssignments();
  const location = useLocation();

  const [courseSidebarOpen, setCourseSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLoggedIn = Boolean(user);
  const showPublicNav = !isLoggedIn;
  const showStudentNav = isLoggedIn && (!isStaff || studentMode);
  const homeHref = !isLoggedIn ? '/' : studentMode ? '/portal' : isStaff ? '/admin' : '/portal';
  const portalActive = location.pathname === '/portal' || location.pathname === '/dashboard' || location.pathname === '/estudiante';
  const courseActive = location.pathname.startsWith('/modulo');
  const simulatorsActive =
    location.pathname.startsWith('/herramientas') ||
    location.pathname === '/ejercicios' ||
    location.pathname.startsWith('/simuladores');
  const examsActive = location.pathname.startsWith('/examenes');

  const openCourseSidebar = () => {
    setMobileMenuOpen(false);
    setCourseSidebarOpen(true);
  };

  useEffect(() => {
    const handleOpenSidebar = () => setCourseSidebarOpen(true);
    window.addEventListener('open-course-sidebar', handleOpenSidebar);
    return () => window.removeEventListener('open-course-sidebar', handleOpenSidebar);
  }, []);

  useEffect(() => {
    initializeOffline();
  }, [initializeOffline]);

  useEffect(() => {
    if (!user?.id) return;
    const flush = () => {
      void flushProgressOutbox(user.id);
    };
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [user?.id]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setCourseSidebarOpen(false);
  }, [location.pathname]);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Médico';
  const resumeTopic = user ? getLastVisitedTopic(user.id) : null;
  const roleLabel = studentMode
    ? 'Modo estudiante'
    : isAdmin
    ? 'Administrador'
    : isEditor
    ? 'Profesor'
    : isPendingApproval
    ? 'Admisión en revisión'
    : 'Médico inscrito';
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/70 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={homeHref} className="flex items-center group transition-transform hover:scale-[1.02]">
              <BrandLogo variant="full" size="md" />
            </Link>
          </div>

          {(!isAdmin || studentMode) && (
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label="Principal">
            {showPublicNav && (
              <>
                <Link to="/temario" className={navClass(location.pathname === '/temario' || location.pathname === '/programa')}>
                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                  <span>Temario</span>
                </Link>
                <Link to="/cursos" className={navClass(location.pathname === '/cursos')}>
                  <GraduationCap className="w-4 h-4" />
                  <span>Cursos</span>
                </Link>
              </>
            )}

            {showStudentNav && (
              <Link to="/portal" className={navClass(portalActive)}>
                <GraduationCap className="w-4 h-4" />
                <span>Portal</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </Link>
            )}

            {showStudentNav && (
              <button
                type="button"
                onClick={openCourseSidebar}
                className={navClass(courseActive)}
                aria-label="Abrir contenido del curso"
              >
                <PanelLeft className="w-4 h-4" />
                <span>Curso</span>
              </button>
            )}

            {(showPublicNav || showStudentNav) && (
              <Link to={showPublicNav ? '/simuladores/publico' : '/simuladores'} className={navClass(simulatorsActive)}>
                <Wrench className="w-4 h-4" />
                <span>Simuladores</span>
                {showPublicNav && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    PRO
                  </span>
                )}
              </Link>
            )}

            {showStudentNav && (
              <Link to="/examenes" className={navClass(examsActive)}>
                <ClipboardList className="w-4 h-4" />
                <span>Evaluaciones</span>
              </Link>
            )}

            {showStudentNav && (
              <Link to="/talleres" className={navClass(location.pathname.startsWith('/talleres') || location.pathname.startsWith('/taller'))}>
                <Video className="w-4 h-4" />
                <span>Clases en Vivo</span>
              </Link>
            )}

            {showStudentNav && (
              <Link to="/biblioteca" className={navClass(location.pathname.startsWith('/biblioteca') || location.pathname.startsWith('/especialistas/contenido'))}>
                <Sparkles className="w-4 h-4" />
                <span>Biblioteca</span>
              </Link>
            )}

            {showPublicNav && isSupabaseConfigured && (
              <>
                <Link to="/especialistas" className={navClass(location.pathname.startsWith('/especialistas'))}>
                  <Users className="w-4 h-4" />
                  <span>Especialistas</span>
                </Link>
                <Link to="/comite-editorial" className={navClass(location.pathname === '/comite-editorial')}>
                  <Scale className="w-4 h-4" />
                  <span>Comité</span>
                </Link>
              </>
            )}
          </nav>
          )}

          {isAdmin && !studentMode && (
            <nav className="hidden lg:flex items-center" aria-label="Temas">
              <button
                type="button"
                onClick={openCourseSidebar}
                className={navClass(courseActive)}
                aria-label="Abrir navegación de temas"
                title="Navegación de temas y edición rápida del temario"
              >
                <PanelLeft className="w-4 h-4" />
                <span>Temas</span>
              </button>
            </nav>
          )}

          <div className="hidden lg:flex items-center gap-2">
            {/* Buscador Rápido Global (Cmd+K / Ctrl+K) */}
            <button
              type="button"
              onClick={openCommandPalette}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs transition-all shadow-xs cursor-pointer group"
              title="Búsqueda global (Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors" />
              <span className="hidden xl:inline text-slate-500 dark:text-slate-400">Buscar...</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                ⌘K
              </kbd>
            </button>

            <PWAUpdateButton />
            <OfflineIndicator />

            {isSupabaseConfigured && user && (isAdmin || isEditor) && <TeacherCommentBell />}

            {isSupabaseConfigured && user && isAdmin && !studentMode && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 dark:from-indigo-950/60 dark:to-purple-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all shadow-xs"
                title="Panel de Administración"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Admin</span>
                {totalPending > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {totalPending > 9 ? '9+' : totalPending}
                  </span>
                )}
              </Link>
            )}

            {isSupabaseConfigured && user ? (
              <UserMenu />
            ) : isSupabaseConfigured ? (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/auth/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Ingresar</span>
                </Link>
                <Link
                  to="/auth/registro"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white hover:opacity-95 shadow-sm shadow-blue-500/20 transition"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Registro</span>
                </Link>
              </div>
            ) : null}



            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 hover:text-blue-600 dark:hover:text-cyan-400 transition-all shadow-xs cursor-pointer"
              aria-label={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            </button>
          </div>

          <div className="flex lg:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={openCommandPalette}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              aria-label="Buscar"
              title="Buscar (Ctrl + K)"
            >
              <Search className="w-4 h-4" />
            </button>

            <PWAUpdateButton />
            <OfflineIndicator />

            {isSupabaseConfigured && user && (isAdmin || isEditor) && (
              <div className="scale-90">
                <TeacherCommentBell />
              </div>
            )}

            {isSupabaseConfigured && user && (
              <div className="scale-90">
                <UserMenu />
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú de cuenta'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed top-14 sm:top-16 right-0 bottom-0 w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-5">
              {isSupabaseConfigured && user ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <p className="text-[11px] font-semibold text-blue-600 dark:text-cyan-400 mt-0.5">{roleLabel}</p>
                    </div>
                  </div>

                  {isPendingApproval ? (
                    <Link
                      to="/portal"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm font-semibold"
                    >
                      <Lock className="w-4 h-4 shrink-0" />
                      Ver estado de admisión
                    </Link>
                  ) : resumeTopic ? (
                    <Link
                      to={resumeTopic.url}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800"
                    >
                      <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Play className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-indigo-500">Continuar</span>
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{resumeTopic.topicTitle}</span>
                      </span>
                    </Link>
                  ) : null}

                  <button
                    type="button"
                    onClick={openCourseSidebar}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-blue-600 text-white text-left shadow-md shadow-blue-500/20"
                  >
                    <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-blue-100">Temario</span>
                      <span className="block text-sm font-semibold">Ver temas del curso</span>
                    </span>
                  </button>

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Cuenta</span>
                    <MobileNavRow
                      to="/cuenta"
                      onClick={closeMobileMenu}
                      icon={<GraduationCap className="w-4 h-4 text-blue-500" />}
                      label="Mi cuenta"
                    />
                    {!isStandalone && (
                      <button
                        type="button"
                        onClick={() => {
                          closeMobileMenu();
                          void triggerInstall();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 text-blue-700 dark:text-cyan-300 font-bold text-xs transition cursor-pointer mb-1"
                      >
                        <div className="flex items-center gap-2.5">
                          <Smartphone className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
                          <span>Instalar App en este teléfono</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-extrabold uppercase tracking-wider">
                          Instalar
                        </span>
                      </button>
                    )}
                    <MobileNavRow
                      to="/cuenta/ajustes"
                      onClick={closeMobileMenu}
                      icon={<Settings className="w-4 h-4 text-slate-500" />}
                      label="Ajustes"
                    />
                    {isStaff && (
                      <MobileNavRow
                        to={studentMode ? '/admin' : '/portal'}
                        onClick={() => {
                          if (studentMode) useStaffViewStore.getState().exitStudentMode();
                          else useStaffViewStore.getState().enterStudentMode();
                          closeMobileMenu();
                        }}
                        icon={<GraduationCap className="w-4 h-4 text-amber-500" />}
                        label={studentMode ? 'Salir del modo estudiante' : 'Entrar en modo estudiante'}
                      />
                    )}
                    {(isAdmin || isEditor) && (
                      <MobileNavRow
                        to="/admin"
                        onClick={closeMobileMenu}
                        icon={<Shield className="w-4 h-4 text-violet-500" />}
                        label={isAdmin ? 'Panel de administración' : 'Panel del profesor'}
                        trailing={
                          totalPending > 0 ? (
                            <span className="min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                              {totalPending > 9 ? '9+' : totalPending}
                            </span>
                          ) : undefined
                        }
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        closeMobileMenu();
                        void signOut();
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </>
              ) : isSupabaseConfigured ? (
                <div className="space-y-2.5">
                  <Link
                    to="/auth/registro"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white text-sm font-bold shadow-md shadow-blue-500/20"
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Registro estudiante</span>
                  </Link>
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium hover:bg-slate-200"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Ingresar a mi cuenta</span>
                  </Link>
                </div>
              ) : null}

              {showPublicNav && (
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400 block mb-3">
                  Programa
                </span>
                <div className="space-y-1">
                  <MobileNavRow
                    to="/temario"
                    onClick={closeMobileMenu}
                    icon={<BookOpen className="w-4 h-4 text-blue-600 dark:text-cyan-400" />}
                    label="Temario"
                  />
                  <MobileNavRow
                    to="/cursos"
                    onClick={closeMobileMenu}
                    icon={<GraduationCap className="w-4 h-4" />}
                    label="Cursos"
                  />
                  <MobileNavRow
                    to="/simuladores/publico"
                    onClick={closeMobileMenu}
                    icon={<Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                    label="Simuladores"
                  />
                  {isSupabaseConfigured && (
                    <>
                      <MobileNavRow
                        to="/especialistas"
                        onClick={closeMobileMenu}
                        icon={<Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                        label="Especialistas"
                      />
                      <MobileNavRow
                        to="/comite-editorial"
                        onClick={closeMobileMenu}
                        icon={<Scale className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                        label={BRAND.enableAccreditation ? 'Comité editorial y aval' : 'Comité editorial'}
                      />
                    </>
                  )}
                </div>
              </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">


              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tema</span>
                <button
                  onClick={toggleDarkMode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  {isDarkMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-slate-700" />
                      <span>Oscuro</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <span className="text-[10px] text-slate-400">
                  {BRAND.enableAccreditation
                    ? 'Avalado por el Colegio Mexicano de Medicina de Rehabilitación A.C.'
                    : BRAND.tagline}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <CourseSidebar isOpen={courseSidebarOpen} onClose={() => setCourseSidebarOpen(false)} />
    </>
  );
}
