import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  ArrowRight,
  Award,
  KeyRound,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { isSupabaseConfigured } from '../../lib/supabase';
import { postLoginPath } from '../../utils/postLoginPath';
import { BrandLogo } from '../brand/BrandLogo';
import { BackButton } from '../common/BackButton';

interface LoginPageProps {
  initialMode?: 'password' | 'otp' | 'recovery';
}

export default function LoginPage({ initialMode = 'password' }: LoginPageProps) {
  const { signInWithOtp, signInWithPassword, resetPassword, user, isAdmin, isEditor, roles, isLoading, isSessionReady } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') ?? undefined;
  const joinLive = searchParams.get('join_live') === 'true';
  const redirectToWorkshop = searchParams.get('redirect_to_workshop') ?? undefined;
  const paramMode = searchParams.get('mode');

  const [mode, setMode] = useState<'password' | 'otp' | 'recovery'>(
    paramMode === 'recovery' ? 'recovery' : initialMode
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Comprobar si llega con error de enlace expirado
  useEffect(() => {
    if (searchParams.get('error') === 'expired') {
      setMode('recovery');
      setError('El enlace de acceso o recuperación ha expirado o ya fue utilizado. Por favor, solicita uno nuevo.');
    }
  }, [searchParams]);

  // Manejo de temporizador de reenvío
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    if (!user || isLoading || !isSessionReady) return;
    navigate(
      postLoginPath({
        next: nextPath,
        joinLive,
        redirectToWorkshop,
        isAdmin,
        isEditor,
        isContributor: roles.includes('contributor'),
      }),
      { replace: true }
    );
  }, [user, isLoading, isSessionReady, isAdmin, isEditor, roles, nextPath, joinLive, redirectToWorkshop, navigate]);

  useEffect(() => {
    if (searchParams.get('verified') === '1') setSent(true);
  }, [searchParams]);

function translateAuthError(msg: string): string {
  if (!msg) return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  if (msg.includes('Invalid login credentials')) {
    return 'Correo electrónico o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Tu correo no ha sido confirmado aún. Revisa tu bandeja de entrada o solicita un enlace mágico.';
  }
  if (msg.includes('Too many requests') || msg.includes('rate limit')) {
    return 'Demasiados intentos fallidos. Por seguridad, espera unos minutos antes de volver a intentar.';
  }
  if (msg.includes('User disabled')) {
    return 'Esta cuenta ha sido deshabilitada. Contacta a la dirección médica.';
  }
  return msg;
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const sanitizedEmail = email.trim().toLowerCase();

    try {
      if (mode === 'password') {
        const result = await signInWithPassword(sanitizedEmail, password);
        if (result.error) {
          setError(translateAuthError(result.error));
        }
      } else if (mode === 'otp') {
        const result = await signInWithOtp(sanitizedEmail, nextPath);
        if (result.error) {
          setError(translateAuthError(result.error));
          return;
        }
        setSent(true);
        setResendCooldown(60);
      } else if (mode === 'recovery') {
        const result = await resetPassword(sanitizedEmail);
        if (result.error) {
          setError(translateAuthError(result.error));
          return;
        }
        setSent(true);
        setResendCooldown(60);
      }
    } catch (err: any) {
      setError(translateAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setLoading(true);
    setError(null);

    try {
      if (mode === 'recovery') {
        const result = await resetPassword(email);
        if (result.error) setError(result.error);
        else setResendCooldown(60);
      } else {
        const result = await signInWithOtp(email, nextPath);
        if (result.error) setError(result.error);
        else setResendCooldown(60);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al reenviar el correo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="pt-28 px-4 max-w-lg mx-auto text-center">
        <p className="text-red-500">Supabase no está configurado. Revisa tu archivo .env</p>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen pt-24 pb-16 px-4 flex items-center justify-center relative overflow-hidden bg-slate-950 text-slate-100">
      {/* Luces de fondo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full mx-auto relative z-10">
        <BackButton
          fallback={nextPath && nextPath.startsWith('/') ? nextPath : '/'}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 mb-6 transition cursor-pointer"
        />

        <div className="rounded-3xl border border-slate-800/90 bg-slate-900/85 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <BrandLogo variant="compact" size="sm" showAccreditation={false} theme="dark" />
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'recovery' ? 'Recuperación de Acceso' : 'Acceso a la Plataforma Médica'}
              </p>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-medium flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>COMEFYR</span>
            </div>
          </div>

          {/* Selector de modo si no está en recuperación */}
          {mode !== 'recovery' ? (
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => { setMode('password'); setError(null); setSent(false); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  mode === 'password'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Contraseña
              </button>
              <button
                type="button"
                onClick={() => { setMode('otp'); setError(null); setSent(false); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  mode === 'otp'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Enlace Mágico
              </button>
            </div>
          ) : (
            <div className="mb-6 pb-3 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Recuperar Contraseña</h3>
              </div>
              <button
                type="button"
                onClick={() => { setMode('password'); setError(null); setSent(false); }}
                className="text-xs text-slate-400 hover:text-cyan-400 transition"
              >
                Volver a Iniciar Sesión
              </button>
            </div>
          )}

          {/* Estado de correo enviado */}
          {sent ? (
            <div className="flex flex-col items-center text-center py-4 gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="font-bold text-white text-lg">
                {mode === 'recovery' ? 'Instrucciones enviadas' : 'Revisa tu correo'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                {mode === 'recovery' ? (
                  <>
                    Enviamos un enlace seguro para restablecer tu contraseña a <strong>{email}</strong>.
                    Haz clic en el enlace del correo para crear tu nueva contraseña.
                  </>
                ) : (
                  <>
                    Enviamos un enlace de acceso directo a <strong>{email}</strong>. Haz clic para entrar sin contraseña.
                  </>
                )}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Si no lo ves en unos minutos, revisa tu carpeta de correo no deseado (Spam).
              </p>

              <div className="flex flex-col gap-2 w-full mt-3">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResend}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 disabled:opacity-50 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar correo'}
                </button>

                <button
                  type="button"
                  onClick={() => { setSent(false); setMode('password'); setError(null); }}
                  className="text-xs text-cyan-400 hover:underline font-semibold mt-1"
                >
                  Regresar a Iniciar Sesión
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'recovery' && (
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ingresa tu correo electrónico registrado. Te enviaremos un enlace oficial con el que podrás establecer una nueva contraseña de forma inmediata.
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                    placeholder="medico@hospital.mx"
                  />
                </div>
              </div>

              {mode === 'password' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => { setMode('recovery'); setError(null); setSent(false); }}
                      className="text-[11px] text-cyan-400 hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                      placeholder="Tu contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs uppercase tracking-wider hover:opacity-95 disabled:opacity-50 transition shadow-lg shadow-blue-500/20 mt-2"
              >
                {loading
                  ? 'Verificando...'
                  : mode === 'password'
                  ? 'Iniciar Sesión'
                  : mode === 'recovery'
                  ? 'Enviar Enlace de Restablecimiento'
                  : 'Enviar Enlace Mágico'}
              </button>

              {mode === 'recovery' && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('otp'); setError(null); }}
                    className="text-xs text-slate-400 hover:text-cyan-300 transition"
                  >
                    ¿Prefieres entrar directamente con <span className="text-cyan-400 font-semibold underline">Enlace Mágico</span>?
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Banner de Registro Exclusivo para Estudiantes */}
          <div className="mt-8 pt-6 border-t border-slate-800/90 text-center">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <GraduationCap className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">¿Eres Estudiante o Residente?</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Crea tu cuenta de estudiante para acceder a evaluaciones clínicas y obtener constancias avaladas por COMEFYR.
              </p>
              <Link
                to="/auth/registro"
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-slate-700"
              >
                Registrarme como Estudiante <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
