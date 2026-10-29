import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Mail, Settings, Shield, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { StudentAgreementsCard } from '../agreements/StudentAgreementsCard';
import {
  ENROLLMENT_META,
  getPermissionSummary,
  ROLE_META,
} from '../../utils/roleLabels';

export default function AccountPage() {
  const {
    user,
    profile,
    roles,
    isAdmin,
    isEditor,
    canProposeContent,
    isEnrolledPhysician,
    enrollmentStatus,
    bootstrapAvailable,
    claimBootstrapAdmin,
  } = useAuth();

  const [avatarImgFailed, setAvatarImgFailed] = useState(false);

  const permissions = getPermissionSummary({
    roles,
    verifiedAt: profile?.verified_at ?? null,
    enrollmentStatus,
    canProposeContent,
    isEnrolledPhysician,
    isAdmin,
  });

  const [claimError, setClaimError] = useState<string | null>(null);

  const handleClaim = async () => {
    const result = await claimBootstrapAdmin();
    setClaimError(result.error);
  };

  return (
    <div id="contenido-principal" className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mi cuenta</h1>
          <p className="text-sm text-slate-500 mt-1">Roles, permisos y acceso a la plataforma</p>
        </div>
        <Link
          to="/cuenta/ajustes"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Settings className="w-4 h-4" />
          Ajustes
        </Link>
      </div>

      {bootstrapAvailable && !isAdmin && (
        <div className="mb-6 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-900 dark:text-amber-100">Activar administrador</p>
              <p className="text-sm text-amber-800/80 dark:text-amber-200/80 mt-1">
                Eres el primer usuario. Activa tu rol de administrador para gestionar roles de los demás médicos.
              </p>
              <button
                type="button"
                onClick={handleClaim}
                className="mt-3 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium min-h-[44px]"
              >
                Activar administrador
              </button>
              {claimError && (
                <p className="mt-2 text-sm text-red-700" role="alert">
                  {claimError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30 p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
            {profile?.avatar_url && !avatarImgFailed ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setAvatarImgFailed(true)}
              />
            ) : (
              (profile?.display_name ?? 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {profile?.display_name ?? 'Sin nombre'}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </p>
            {profile?.credentials && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {profile.credentials}
                {profile.institution ? ` · Sede: ${profile.institution}` : ''}
                {profile.academic_institution ? ` · Egreso: ${profile.academic_institution}` : ''}
              </p>
            )}
          </div>
        </div>
        <Link
          to="/perfil"
          className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600 hover:underline"
        >
          <User className="w-4 h-4" />
          Editar perfil profesional
        </Link>
      </section>

      {/* ─── EXPEDIENTE PROFESIONAL & CÉDULA SEP ─── */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30 p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-500" />
            Expediente Profesional & Cédula
          </h2>
          {profile?.cedula_verified ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cédula Verificada (SEP)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              <AlertCircle className="w-3.5 h-3.5" /> Cédula No Verificada
            </span>
          )}
        </div>

        {profile?.cedula_verified ? (
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Número de Cédula Oficial:</p>
                <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                  #{profile.cedula_profesional}
                </p>
              </div>
              {profile.cedula_data?.anioRegistro && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Año de Expedición:</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {profile.cedula_data.anioRegistro}
                  </p>
                </div>
              )}
            </div>

            {profile.cedula_data?.profesion && (
              <div>
                <p className="text-slate-500 dark:text-slate-400">Título / Especialidad Registrada:</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {profile.cedula_data.profesion}
                </p>
              </div>
            )}

            {profile.cedula_data?.institucion && (
              <div>
                <p className="text-slate-500 dark:text-slate-400">Institución de Egreso:</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {profile.cedula_data.institucion}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs">
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Tu expediente está registrado como <strong>Cédula no verificada</strong>. Tienes acceso normal a tus cursos, temas y evaluaciones.
            </p>
            {profile?.cedula_profesional && (
              <p className="mt-1 text-slate-500 dark:text-slate-400 font-mono">
                Cédula ingresada: #{profile.cedula_profesional} (Pendiente de validación ante la SEP)
              </p>
            )}
            <div className="mt-3">
              <Link
                to="/perfil"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition"
              >
                Validar mi Cédula ante la SEP
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30 p-5 mb-6">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-500" />
          Roles asignados
        </h2>
        {roles.length ? (
          <ul className="space-y-3">
            {roles.map((role) => (
              <li key={role} className="flex items-start gap-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${ROLE_META[role].badgeClass}`}>
                  {ROLE_META[role].label}
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-400">{ROLE_META[role].description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            Aún no tienes roles. Un administrador puede asignarte colaborador, editor o administrador.
          </p>
        )}
      </section>

      {user && !isAdmin && !isEditor && <StudentAgreementsCard userId={user.id} />}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30 p-5 mb-6">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Estado de inscripción</h2>
        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${ENROLLMENT_META[enrollmentStatus].badgeClass}`}>
          {ENROLLMENT_META[enrollmentStatus].label}
        </span>
        {profile?.verified_at && (
          <p className="text-sm text-slate-500 mt-3">
            Colaborador verificado el {new Date(profile.verified_at).toLocaleDateString('es-MX')}
          </p>
        )}
        {profile?.enrollment_verified_at && (
          <p className="text-sm text-slate-500 mt-1">
            Inscripción aprobada el {new Date(profile.enrollment_verified_at).toLocaleDateString('es-MX')}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30 p-5">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Permisos activos</h2>
        <ul className="space-y-2">
          {permissions.map((p) => (
            <li key={p} className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {p}
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <Stat label="Admin" value={isAdmin} />
          <Stat label="Editor" value={isEditor} />
          <Stat label="Propone contenido" value={canProposeContent} />
          <Stat label="Médico inscrito" value={isEnrolledPhysician} />
        </dl>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <dt className="text-slate-400">{label}</dt>
      <dd className={`font-medium ${value ? 'text-emerald-600' : 'text-slate-500'}`}>
        {value ? 'Sí' : 'No'}
      </dd>
    </div>
  );
}
