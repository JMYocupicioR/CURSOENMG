import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../LoadingSpinner';
import { BrandLogo } from '../brand/BrandLogo';

export default function ResetPasswordPage() {
  const { updatePassword, user } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let settled = false;

    const accept = () => {
      if (settled) return;
      settled = true;
      setHasValidSession(true);
      setCheckingSession(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      if (
        event === 'PASSWORD_RECOVERY' ||
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION' ||
        event === 'TOKEN_REFRESHED'
      ) {
        accept();
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session || user) accept();
    });

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setCheckingSession(false);
    }, 4000);

    return () => {
      settled = true;
      window.clearTimeout(timer);
      authListener.subscription.unsubscribe();
    };
  }, [user]);

  // Validaciones en tiempo real
  const rules = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasNumberOrSymbol: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password),
      matches: password.length > 0 && password === confirmPassword,
    };
  }, [password, confirmPassword]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (rules.minLength) score += 1;
    if (rules.hasUpper) score += 1;
    if (rules.hasNumberOrSymbol) score += 1;
    return score;
  }, [rules]);

  const strengthLabel = useMemo(() => {
    if (password.length === 0) return { text: '', color: 'bg-slate-700', textColor: 'text-slate-400' };
    if (strengthScore <= 1) return { text: 'Débil', color: 'bg-red-500', textColor: 'text-red-400' };
    if (strengthScore === 2) return { text: 'Media', color: 'bg-amber-500', textColor: 'text-amber-400' };
    return { text: 'Segura y recomendada', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
  }, [password, strengthScore]);

  const canSubmit = rules.minLength && rules.hasUpper && rules.hasNumberOrSymbol && rules.matches && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setLoading(true);

    const result = await updatePassword(password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex flex-col items-center justify-center bg-slate-950 px-4">
        <LoadingSpinner />
        <p className="text-slate-400 text-xs mt-4">Verificando enlace de seguridad...</p>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen pt-24 pb-16 px-4 flex items-center justify-center relative overflow-hidden bg-slate-950 text-slate-100">
      {/* Resplandor de fondo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full mx-auto relative z-10">
        <div className="rounded-3xl border border-slate-800/90 bg-slate-900/85 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <BrandLogo variant="compact" size="sm" showAccreditation={false} theme="dark" />
              <p className="text-[11px] text-slate-400 mt-1">Seguridad de la Cuenta</p>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>COMEFYR</span>
            </div>
          </div>

          {!hasValidSession && !success ? (
            /* Link inválido o expirado */
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Enlace no válido o expirado</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Por motivos de bioseguridad informática, los enlaces de recuperación expiran tras su uso o al transcurrir el tiempo límite.
              </p>
              <Link
                to="/auth/login?mode=recovery"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:opacity-95 transition shadow-lg shadow-blue-500/20"
              >
                Solicitar nuevo enlace de recuperación
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : success ? (
            /* Confirmación de éxito */
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">¡Contraseña actualizada!</h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto mb-6">
                Tu nueva contraseña ha sido guardada de forma segura. Ya puedes acceder a las clases y módulos clínicos con tus nuevas credenciales.
              </p>
              <button
                onClick={() => navigate('/dashboard', { replace: true })}
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs uppercase tracking-wider hover:opacity-95 transition shadow-lg shadow-emerald-500/20"
              >
                Continuar a la Plataforma
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            /* Formulario de nueva contraseña */
            <div>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-white">Establecer Nueva Contraseña</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Crea una contraseña segura para tu acceso como médico o cursista.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campo Nueva Contraseña */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
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

                {/* Medidor de Fortaleza */}
                {password.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Fortaleza:</span>
                      <span className={`font-semibold ${strengthLabel.textColor}`}>{strengthLabel.text}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strengthScore >= 1 ? strengthLabel.color : 'bg-transparent'
                        } flex-1`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strengthScore >= 2 ? strengthLabel.color : 'bg-transparent'
                        } flex-1`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strengthScore >= 3 ? strengthLabel.color : 'bg-transparent'
                        } flex-1`}
                      />
                    </div>
                  </div>
                )}

                {/* Campo Confirmar Contraseña */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu nueva contraseña"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Requisitos de Seguridad */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-[11px]">
                  <p className="font-semibold text-slate-400 mb-1">Requisitos de la contraseña:</p>
                  <div className="flex items-center gap-1.5">
                    {rules.minLength ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={rules.minLength ? 'text-slate-300' : 'text-slate-500'}>
                      Al menos 8 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {rules.hasUpper ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={rules.hasUpper ? 'text-slate-300' : 'text-slate-500'}>
                      Al menos una letra mayúscula (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {rules.hasNumberOrSymbol ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={rules.hasNumberOrSymbol ? 'text-slate-300' : 'text-slate-500'}>
                      Al menos un número o símbolo especial
                    </span>
                  </div>
                  {confirmPassword.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-850">
                      {rules.matches ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span className={rules.matches ? 'text-emerald-400' : 'text-red-400'}>
                        {rules.matches ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                      </span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs uppercase tracking-wider hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-blue-500/20 mt-3"
                >
                  {loading ? 'Guardando nueva contraseña...' : 'Actualizar Contraseña'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
