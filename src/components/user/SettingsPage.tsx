import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Globe,
  Moon,
  Sun,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  Users,
  Scale,
  BookOpen,
  GraduationCap,
  Home,
  Shield,
  Bell,
  Smartphone,
  Download,
  Send,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuth } from '../../contexts/AuthProvider';
import { useStaffViewStore } from '../../stores/staffViewStore';
import { usePWAInstallStore } from '../../stores/pwaInstallStore';
import { usePWAUpdateStore } from '../../stores/pwaUpdateStore';
import {
  getNotificationDiagnostics,
  requestNotificationPermission,
  sendTestNotification,
} from '../../services/deviceNotificationService';
import { BackButton } from '../common/BackButton';

export default function SettingsPage() {
  const { isDarkMode, toggleDarkMode } = useSettingsStore();
  const { updatePassword, user, isAdmin, isEditor } = useAuth();
  const navigate = useNavigate();
  const isStaff = isAdmin || isEditor;
  const studentMode = useStaffViewStore((s) => s.view) === 'student' && isStaff;
  const enterStudentMode = useStaffViewStore((s) => s.enterStudentMode);
  const exitStudentMode = useStaffViewStore((s) => s.exitStudentMode);

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  const { isStandalone, isIOS, triggerInstall } = usePWAInstallStore();
  const { needRefresh, isUpdating, isChecking, updateApp, checkForUpdate } = usePWAUpdateStore();
  const [updateCheckMessage, setUpdateCheckMessage] = useState<string | null>(null);
  const [notifDiag, setNotifDiag] = useState(() => getNotificationDiagnostics());
  const [requestingNotifs, setRequestingNotifs] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const handleManualUpdateCheck = async () => {
    setUpdateCheckMessage(null);
    const found = await checkForUpdate();
    if (!found) {
      setUpdateCheckMessage('La plataforma ya está en la versión más reciente.');
      setTimeout(() => setUpdateCheckMessage(null), 4000);
    }
  };

  const handleToggleNotifications = async () => {
    if (!user?.id) return;
    setRequestingNotifs(true);
    try {
      await requestNotificationPermission(user.id, isStaff ? 'admin' : 'student');
      setNotifDiag(getNotificationDiagnostics());
    } finally {
      setRequestingNotifs(false);
    }
  };

  const handleSendTestNotification = async () => {
    setTestSent(true);
    await sendTestNotification(isStaff ? 'admin' : 'student');
    setTimeout(() => setTestSent(false), 3000);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);

    if (!user?.email) {
      setPassError('No hay una sesión activa. Vuelve a iniciar sesión.');
      return;
    }
    if (currentPassword.length < 1) {
      setPassError('Escribe tu contraseña actual.');
      return;
    }
    if (newPassword.length < 8) {
      setPassError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Las contraseñas no coinciden.');
      return;
    }
    if (newPassword === currentPassword) {
      setPassError('La nueva contraseña debe ser distinta de la actual.');
      return;
    }

    setSavingPass(true);
    const result = await updatePassword(newPassword, currentPassword);
    setSavingPass(false);

    if (result.error) {
      setPassError(result.error);
    } else {
      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordChange(false);
        setPassSuccess(false);
      }, 3000);
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
      <BackButton fallback="/cuenta" />

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ajustes</h1>
      <p className="text-sm text-slate-500 mb-8">Preferencias de la aplicación y seguridad</p>

      {isStaff && (
        <>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
            Vista de la plataforma
          </h2>
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30 mb-8 shadow-sm">
            <SettingRow
              icon={studentMode ? Shield : GraduationCap}
              title={studentMode ? 'Modo estudiante activo' : isAdmin ? 'Panel de administración' : 'Panel del profesor'}
              description={
                studentMode
                  ? 'Estás viendo la plataforma como la ve un alumno. El aviso ámbar solo aparece para ti.'
                  : 'Al entrar, el panel abre directamente. Desde aquí puedes revisar la experiencia del alumno.'
              }
              action={
                <button
                  type="button"
                  onClick={() => {
                    if (studentMode) {
                      exitStudentMode();
                      navigate('/admin');
                    } else {
                      enterStudentMode();
                      navigate('/portal');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    studentMode
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-200'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {studentMode ? 'Volver al panel' : 'Entrar en modo estudiante'}
                </button>
              }
            />
          </section>
        </>
      )}

      {/* Preferencias de interfaz */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
        Preferencias Generales
      </h2>
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30 divide-y divide-slate-100 dark:divide-slate-800 mb-8 shadow-sm">
        <SettingRow
          icon={isDarkMode ? Sun : Moon}
          title="Tema"
          description={isDarkMode ? 'Modo oscuro activo' : 'Modo claro activo'}
          action={
            <button
              type="button"
              onClick={toggleDarkMode}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cambiar a {isDarkMode ? 'claro' : 'oscuro'}
            </button>
          }
        />
        <SettingRow
          icon={Globe}
          title="Idioma del curso"
          description="Español (predeterminado)"
          action={
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Español
            </span>
          }
        />
      </section>

      {/* Seguridad de la cuenta */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
        Seguridad de la Cuenta
      </h2>
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-cyan-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Contraseña de acceso</p>
              <p className="text-sm text-slate-500">Actualiza tu contraseña para mantener tu cuenta protegida</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowPasswordChange(!showPasswordChange);
              setPassError(null);
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            {showPasswordChange ? 'Cancelar' : 'Cambiar'}
          </button>
        </div>

        {showPasswordChange && (
          <form onSubmit={handlePasswordSubmit} className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Contraseña actual
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Tu contraseña actual"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirmar Nueva Contraseña
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            {passError && (
              <p className="text-xs text-red-500 font-medium">{passError}</p>
            )}

            {passSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>¡Contraseña actualizada exitosamente!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={savingPass}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition disabled:opacity-50"
            >
              {savingPass ? 'Guardando...' : 'Guardar Nueva Contraseña'}
            </button>
          </form>
        )}
      </section>

      {/* ── Notificaciones del dispositivo ── */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
        Notificaciones y alertas del dispositivo
      </h2>
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30 mb-8 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Alertas Push en tiempo real</h3>
                {notifDiag.permission === 'granted' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> Activadas
                  </span>
                ) : notifDiag.permission === 'denied' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                    <AlertTriangle className="w-3 h-3" /> Bloqueadas
                  </span>
                ) : notifDiag.needsIOSInstall ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    Requiere PWA en iPhone
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    Sin activar
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                {notifDiag.permission === 'granted'
                  ? 'Este dispositivo está autorizado para recibir avisos de tareas entregadas, calificaciones y clases en vivo.'
                  : notifDiag.permission === 'denied'
                  ? 'Las notificaciones fueron bloqueadas en la configuración de tu navegador. Haz clic en el ícono de ajustes o candado junto a la URL para desbloquearlas.'
                  : notifDiag.needsIOSInstall
                  ? 'En iPhone, Apple exige agregar la app a tu Pantalla de Inicio (Safari > Compartir > Agregar a Inicio) para habilitar alertas.'
                  : 'Recibe alertas nativas con sonido y vibración cuando un profesor asigne una tarea o un alumno envíe una entrega.'}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center gap-2 self-end sm:self-center shrink-0">
            {notifDiag.permission === 'granted' ? (
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={testSent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-blue-500" />
                <span>{testSent ? '¡Alerta enviada!' : 'Probar alerta'}</span>
              </button>
            ) : notifDiag.needsIOSInstall ? (
              <button
                type="button"
                onClick={() => void triggerInstall()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Guía para iPhone</span>
              </button>
            ) : notifDiag.permission !== 'denied' ? (
              <button
                type="button"
                onClick={handleToggleNotifications}
                disabled={requestingNotifs}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{requestingNotifs ? 'Solicitando...' : 'Activar Alertas'}</span>
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Instalación de la Aplicación (PWA) ── */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
        Aplicación Móvil y de Escritorio (PWA)
      </h2>
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30 mb-8 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Estado de Instalación</h3>
                {isStandalone ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> Modo App Standalone
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    Navegador web
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                {isStandalone
                  ? 'ElectroDx está instalada como aplicación nativa en tu pantalla de inicio con soporte de caché sin conexión y sin barras de navegador.'
                  : isIOS
                  ? 'Instala la app en tu iPhone para disfrutar de la experiencia a pantalla completa y habilitar la recepción de alertas.'
                  : 'Instala la aplicación en tu Android o computadora para un acceso directo instantáneo y máxima velocidad.'}
              </p>
            </div>
          </div>

          {!isStandalone && (
            <div className="self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => void triggerInstall()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? 'Cómo instalar en iPhone' : 'Instalar en este dispositivo'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Control de Actualizaciones Web / Despliegues */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center shrink-0">
              <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isChecking || isUpdating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Versión Web y Actualizaciones</span>
                {needRefresh && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-2.5 h-2.5" /> Nueva versión lista
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {needRefresh
                  ? 'Se ha detectado una nueva versión en el servidor lista para activarse.'
                  : updateCheckMessage || 'Tu navegador sincroniza automáticamente los últimos despliegues del Diplomado.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 self-end sm:self-center">
            {needRefresh ? (
              <button
                type="button"
                onClick={() => void updateApp()}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? 'Actualizando...' : 'Actualizar ahora'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleManualUpdateCheck()}
                disabled={isChecking}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Comprobando...' : 'Comprobar actualizaciones'}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
        Acerca del programa
      </h2>
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
        <LinkRow to="/" icon={Home} title="Página de inicio" description="Sitio público de ElectroDx" />
        <LinkRow to="/cursos" icon={GraduationCap} title="Oferta de cursos" description="Principiante, intermedio y avanzado" />
        <LinkRow to="/temario" icon={BookOpen} title="Temario público" description="Resumen del programa para consulta" />
        <LinkRow to="/especialistas" icon={Users} title="Directorio de especialistas" description="Colaboradores y docentes del programa" />
        <LinkRow to="/comite-editorial" icon={Scale} title="Comité editorial" description="Dirección académica y aval del contenido" />
      </section>
    </div>
  );
}

function LinkRow({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: typeof Sun;
  title: string;
  description: string;
}) {
  return (
    <Link to={to} className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
          <Icon className="w-4 h-4 text-slate-500" />
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <span className="text-xs font-semibold text-blue-600 dark:text-cyan-400">Ver</span>
    </Link>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Sun;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
          <Icon className="w-4 h-4 text-slate-500" />
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
