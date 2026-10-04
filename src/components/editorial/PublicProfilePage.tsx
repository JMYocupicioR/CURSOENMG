import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Building2,
  Stethoscope,
  GraduationCap,
  CheckCircle2,
  FileCheck,
  Shield,
  Award,
} from 'lucide-react';
import { getProfileById } from '../../services/editorialService';
import { BackButton } from '../common/BackButton';
import type { Profile } from '../../types/database';
import { BRAND } from '../../config/brand';

export default function PublicProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getProfileById(userId)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 px-4 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Cargando expediente médico…</p>
      </div>
    );
  }

  if (!profile || !profile.is_public) {
    return (
      <div className="pt-32 pb-20 px-4 max-w-md mx-auto text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Perfil no disponible
        </h2>
        <p className="text-sm text-slate-500">
          Este perfil médico no se encuentra público o el enlace ha cambiado.
        </p>
        <BackButton
          fallback="/especialistas"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 transition cursor-pointer"
        />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 max-w-3xl mx-auto">
      {/* ─── Breadcrumb Navigation ─── */}
      <BackButton
        fallback="/especialistas"
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 mb-6 transition cursor-pointer"
      />

      {/* ─── Main Profile Card ─── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden mb-6">
        {/* Banner Cover Accent */}
        <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800 relative">
          {BRAND.enableAccreditation && (
            <div className="absolute right-4 top-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-white text-[11px] font-medium backdrop-blur-md border border-white/10">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>Aval COMEFYR</span>
            </div>
          )}
        </div>

        <div className="px-6 sm:px-8 pb-8 pt-0 relative">
          {/* Avatar and Key Identity */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 mb-5">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-4 border-white dark:border-slate-900 shadow-md flex items-center justify-center font-bold text-2xl overflow-hidden shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{profile.display_name?.charAt(0)?.toUpperCase() || 'Dr'}</span>
              )}
            </div>

            {profile.cedula_verified && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold w-fit">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cédula Verificada ante la SEP
              </span>
            )}
          </div>

          {/* Name & Academic Meta */}
          <div className="space-y-1.5 mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {profile.display_name}
            </h1>
            {profile.credentials && (
              <p className="text-sm font-semibold text-blue-600 dark:text-cyan-400">
                {profile.credentials}
              </p>
            )}
          </div>

          {/* Detailed Badges */}
          <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {profile.institution && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <Building2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Sede Hospitalaria
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                    {profile.institution}
                  </span>
                </div>
              </div>
            )}

            {profile.specialty && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <Stethoscope className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Especialidad Médica
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                    {profile.specialty} {profile.residency_year ? `(${profile.residency_year})` : ''}
                  </span>
                </div>
              </div>
            )}

            {profile.academic_institution && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <GraduationCap className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Institución Académica de Egreso
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                    {profile.academic_institution}
                  </span>
                </div>
              </div>
            )}

            {profile.cedula_profesional && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <FileCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Cédula Profesional Oficial
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 font-mono">
                    {profile.cedula_profesional}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bio / Semblanza */}
          {profile.bio && (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Semblanza Profesional
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
