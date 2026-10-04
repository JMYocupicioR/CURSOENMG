import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Stethoscope,
  Building2,
  GraduationCap,
  BookOpen,
  Mail,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { BRAND } from '../../config/brand';

export function PendingApprovalGate() {
  const { user, profile, refreshProfile, signOut, enrollmentStatus, isRejected } = useAuth();
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCheckStatus = async () => {
    setChecking(true);
    setCheckMessage(null);
    try {
      await refreshProfile();
      if (enrollmentStatus === 'approved') {
        navigate('/dashboard', { replace: true });
        return;
      }
      setCheckMessage('Tu expediente sigue en proceso de revisión por la Dirección y el Comité.');
    } catch {
      setCheckMessage('Error al verificar estatus. Intenta nuevamente.');
    } finally {
      setChecking(false);
    }
  };

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Médico Aspirante';

  return (
    <div className="min-h-[85vh] pt-28 pb-20 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Glowing Background Card */}
        <div className="relative rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-amber-500/20 dark:border-amber-500/30 p-6 sm:p-10 shadow-2xl overflow-hidden">
          {/* Neon Glow Blobs */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

          {/* Header Icon */}
          <div className="relative z-10 text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-amber-600/20 border border-amber-500/30 text-amber-500 mb-4 shadow-lg shadow-amber-500/10 animate-pulse">
              <Lock className="w-10 h-10 text-amber-500" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Clock className="w-3.5 h-3.5" />
                {isRejected ? 'Solicitud Rechazada' : 'Expediente en Espera de Aprobación'}
              </span>
              {BRAND.enableAccreditation && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Aval COMEFYR
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isRejected
                ? 'Acceso no Aprobado al Curso'
                : 'Acceso Restringido: Solicitud en Revisión'}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2 max-w-lg mx-auto leading-relaxed">
              {isRejected
                ? 'Tu solicitud de ingreso al programa formativo no ha sido aprobada por la Dirección Académica. Para mayor información, puedes contactar al comité.'
                : `${BRAND.name} es un programa de posgrado de alta especialidad con cupo selecto y coordinación académica. Tu registro ha sido recibido y está pendiente de ser aprobado desde el panel de administración.`}
            </p>
          </div>

          {/* User Dossier Card */}
          <div className="relative z-10 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 mb-6 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    Dr(a). {displayName}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {user?.email}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                isRejected
                  ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              }`}>
                {isRejected ? 'Rechazado' : 'Pendiente Comité'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              {profile?.institution && (
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <Building2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span><strong>Sede:</strong> {profile.institution}</span>
                </div>
              )}
              {profile?.residency_year && (
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Nivel:</strong> {profile.residency_year}</span>
                </div>
              )}
              {profile?.specialty && (
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300 sm:col-span-2">
                  <Stethoscope className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Especialidad:</strong> {profile.specialty}</span>
                </div>
              )}
              {profile?.cedula_profesional && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 sm:col-span-2">
                  <FileCheck2 className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>Cédula: <strong>{profile.cedula_profesional}</strong></span>
                  {profile.cedula_verified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Verificada SEP
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">(En validación)</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Feedback message */}
          {checkMessage && (
            <div className="relative z-10 mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{checkMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="relative z-10 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-semibold text-sm shadow-md hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Verificando estatus…' : 'Comprobar Estado de Aprobación'}</span>
            </button>

            <Link
              to="/temario"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition text-center"
            >
              <BookOpen className="w-4 h-4" />
              <span>Ver Temario General</span>
            </Link>

            <button
              onClick={() => signOut()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="sm:hidden">Cerrar sesión</span>
            </button>
          </div>

          {/* Footer note */}
          <div className="relative z-10 mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-400">
            <p>
              ¿Tienes dudas con tu inscripción? Consulta al{' '}
              <Link to="/comite-editorial" className="text-blue-600 dark:text-cyan-400 hover:underline">
                Comité Editorial
              </Link>{' '}
              o escribe a{' '}
              <a href="mailto:jmyocupicior@gmail.com" className="text-blue-600 dark:text-cyan-400 hover:underline">
                jmyocupicior@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
