import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Building2,
  Stethoscope,
  GraduationCap,
  Search,
  Scale,
  Shield,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { getPublicProfiles } from '../../services/editorialService';
import type { Profile } from '../../types/database';
import { BRAND } from '../../config/brand';
import { LockedProfilePhoto } from './LockedProfilePhoto';

export default function SpecialistsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSepVerified, setFilterSepVerified] = useState(false);

  useEffect(() => {
    getPublicProfiles()
      .then(setProfiles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredProfiles = useMemo(() => {
    let result = profiles;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        return (
          p.display_name?.toLowerCase().includes(q) ||
          p.institution?.toLowerCase().includes(q) ||
          p.specialty?.toLowerCase().includes(q) ||
          p.academic_institution?.toLowerCase().includes(q) ||
          p.credentials?.toLowerCase().includes(q)
        );
      });
    }

    if (filterSepVerified) {
      result = result.filter((p) => p.cedula_verified === true);
    }

    return result;
  }, [profiles, searchQuery, filterSepVerified]);

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 max-w-4xl mx-auto">
      {/* ─── Hero Header ─── */}
      <div className="flex items-center gap-3.5 mb-3">
        <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-cyan-400 border border-blue-500/20 shadow-xs">
          <Users className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Directorio de Especialistas Colaboradores
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {BRAND.enableAccreditation
              ? 'ElectroDx Diplomado · Aval COMEFYR · Red Nacional de Electrodiagnóstico'
              : 'ElectroDx Diplomado · Red Nacional de Médicos en Electrodiagnóstico'}
          </p>
        </div>
      </div>

      <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
        {BRAND.enableAccreditation
          ? 'Médicos especialistas y residentes en formación en Medicina de Rehabilitación y Neurofisiología Clínica, acreditados institucionalmente por el COMEFYR y activos en la validación diagnóstica y docencia de electromiografía.'
          : 'Médicos especialistas y residentes en formación en Medicina de Rehabilitación y Neurofisiología Clínica, cursistas y colaboradores activos en la validación diagnóstica y docencia de electromiografía.'}
      </p>

      {/* ─── Search and Quick Filters ─── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-4 mb-8 shadow-xs backdrop-blur-md">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, especialidad, hospital o cédula profesional…"
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterSepVerified(!filterSepVerified)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                filterSepVerified
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verificados SEP</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Specialists Grid ─── */}
      <section className="mb-12">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Cargando directorio de especialistas…</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/20 p-8">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
              {searchQuery ? 'Sin coincidencias' : 'Directorio en actualización'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No se encontraron especialistas que coincidan con la búsqueda.'
                : 'Próximamente se publicará la nómina de especialistas colaboradores avalados.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredProfiles.map((p) => (
              <Link
                key={p.id}
                to={`/especialistas/${p.id}`}
                className="group min-w-0 overflow-hidden p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-blue-50/20 via-white to-white dark:from-slate-800/40 dark:via-slate-900/60 dark:to-slate-900/60 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-cyan-500/40 transition-all flex items-start gap-4"
              >
                <LockedProfilePhoto
                  src={p.avatar_url}
                  fallback={<span>{p.display_name?.charAt(0)?.toUpperCase() || 'Dr'}</span>}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-base font-bold text-white shadow-sm"
                />

                {/* Info */}
                <div className="min-w-0 space-y-1.5 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                      {p.display_name}
                    </h3>
                    {p.cedula_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> SEP
                      </span>
                    )}
                  </div>

                  {p.credentials && (
                    <p className="text-xs text-blue-600 dark:text-cyan-400 font-medium">
                      {p.credentials}
                    </p>
                  )}

                  {p.institution && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{p.institution}</span>
                    </p>
                  )}

                  {p.specialty && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{p.specialty} {p.residency_year ? `(${p.residency_year})` : ''}</span>
                    </p>
                  )}

                  {p.academic_institution && p.academic_institution !== p.institution && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                      <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{p.academic_institution}</span>
                    </p>
                  )}

                  <div className="pt-2 flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Ver expediente académico</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ─── Institutional Cross-Links & COMEFYR Framework ─── */}
      <div className="grid gap-6 sm:grid-cols-2 text-slate-600 dark:text-slate-300">
        <section className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 p-6 bg-gradient-to-br from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-slate-900/60 dark:to-slate-900/60 shadow-xs">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-fit mb-3">
            <Scale className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Comité Editorial y Dirección
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Conoce a los directores académicos y médicos dictaminadores responsables de la curaduría científica de los 13 módulos formativos.
          </p>
          <Link
            to="/comite-editorial"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>Ver Comité Editorial</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-white/70 dark:bg-slate-900/40 shadow-xs">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit mb-3">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Acreditación y Criterios de Ingreso
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Todos los médicos listados cuentan con cédula profesional registrada ante la SEP y validación de práctica clínica activa en electrodiagnóstico.
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{BRAND.enableAccreditation ? 'Registro y Aval COMEFYR Oficial' : 'Registro de Posgrado y Validación Médica Oficial'}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
