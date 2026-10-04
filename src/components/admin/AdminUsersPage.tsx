import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Shield,
  Mail,
  Calendar,
  AlertTriangle,
  Users,
  Stethoscope,
  XCircle,
  GraduationCap,
  CheckCircle2,
  Search,
  Lock,
  Sparkles,
  Scale,
  Copy,
  Check,
  Building2,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  Activity,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  getAdminProfiles,
  verifyContributor,
  grantRole,
  revokeRole,
  revokeContributor,
  grantPremiumAccess,
  revokePremiumAccess,
  toggleEditorialCommitteeVisibility,
  toggleSpecialistVisibility,
  adminDeleteUser,
} from '../../services/editorialService';
import type { AdminProfileRow } from '../../types/admin';
import type { AppRole, CourseEnrollment, CourseId } from '../../types/database';
import { useAuth } from '../../contexts/AuthProvider';
import {
  getCourseEnrollmentsForUsers,
  grantCourseAccessAndApproveProfile,
  revokeCourseAccessAndSyncProfile,
} from '../../services/courseService';
import { useSyllabusCatalog } from '../../hooks/useSyllabusCatalog';
import { courseDisplayTitle, sellableCourses } from '../../content/courseCatalog';

type Tab = 'enrolled' | 'comite' | 'premium' | 'all';

const TAB_CONFIG: { id: Tab; label: string; icon: any }[] = [
  { id: 'enrolled', label: 'Médicos Admitidos', icon: Stethoscope },
  { id: 'comite', label: 'Comité Editorial y Especialistas', icon: Scale },
  { id: 'premium', label: 'Usuarios Premium', icon: Sparkles },
  { id: 'all', label: 'Directorio General', icon: Users },
];

function readInitialTab(): Tab {
  const requested = new URLSearchParams(window.location.search).get('tab');
  if (requested === 'enrollment_pending') return 'all';
  if (requested === 'enrolled' || requested === 'comite' || requested === 'premium' || requested === 'all') {
    return requested;
  }
  return 'enrolled';
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const location = useLocation();
  const { courses } = useSyllabusCatalog();
  const sellable = useMemo(() => sellableCourses(courses), [courses]);

  // Get initial tab from URL if present - Default to directory of admitted physicians
  const [tab, setTab] = useState<Tab>(readInitialTab);
  const [users, setUsers] = useState<AdminProfileRow[]>([]);
  const [allUsersCache, setAllUsersCache] = useState<AdminProfileRow[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSepVerified, setFilterSepVerified] = useState(false);
  const [filterResidentsOnly, setFilterResidentsOnly] = useState(false);
  const [filterComiteVisible, setFilterComiteVisible] = useState(false);
  const [filterSpecialistVisible, setFilterSpecialistVisible] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [currentTabData, allData] = await Promise.all([
        getAdminProfiles(false, tab),
        getAdminProfiles(false, 'all'),
      ]);
      setUsers(currentTabData);
      setAllUsersCache(allData);
      const ids = Array.from(new Set([...currentTabData, ...allData].map((u) => u.id)));
      try {
        setCourseEnrollments(await getCourseEnrollmentsForUsers(ids));
      } catch {
        setCourseEnrollments([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [tab]);

  const run = async (userId: string, fn: () => Promise<void>) => {
    setLoadingId(userId);
    setError(null);
    try {
      await fn();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error en la operación');
    } finally {
      setLoadingId(null);
    }
  };

  const copyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delete user state & action
  const [deleteTarget, setDeleteTarget] = useState<AdminProfileRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleting(true);
    setError(null);
    try {
      await adminDeleteUser(targetId);
      setDeleteTarget(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar usuario permanentemente');
    } finally {
      setDeleting(false);
    }
  };

  // Tab counts
  const counts = useMemo(() => {
    return {
      enrolled: allUsersCache.filter((u) => u.enrollment_status === 'approved').length,
      comite: allUsersCache.filter((u) => u.show_in_editorial_committee || u.is_public || u.roles.some((r) => r === 'editor' || r === 'admin' || r === 'contributor')).length,
      all: allUsersCache.length,
      premium: allUsersCache.filter((u) => u.has_premium).length,
    };
  }, [allUsersCache]);

  // Filtered users according to search & chips
  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((u) => {
        return (
          u.display_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.cedula_profesional?.toLowerCase().includes(q) ||
          u.institution?.toLowerCase().includes(q) ||
          u.specialty?.toLowerCase().includes(q)
        );
      });
    }

    if (filterSepVerified) {
      result = result.filter((u) => u.cedula_verified === true);
    }

    if (filterResidentsOnly) {
      result = result.filter((u) => {
        const yr = (u.residency_year || '').toUpperCase();
        return yr.includes('R1') || yr.includes('R2') || yr.includes('R3') || yr.includes('R4') || yr.includes('RESIDENT');
      });
    }

    if (filterComiteVisible) {
      result = result.filter((u) => u.show_in_editorial_committee === true);
    }

    if (filterSpecialistVisible) {
      result = result.filter((u) => u.is_public === true);
    }

    return result;
  }, [users, searchQuery, filterSepVerified, filterResidentsOnly, filterComiteVisible, filterSpecialistVisible]);

  return (
    <AdminLayout title="Coordinación y Estatus de Médicos">
      {/* ─── Navigation Tabs with live badge counters ─── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => {
          let count = 0;
          if (id === 'enrolled') count = counts.enrolled;
          else if (id === 'comite') count = counts.comite;
          else if (id === 'all') count = counts.all;
          else if (id === 'premium') count = counts.premium;

          const isActive = tab === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{label}</span>
              {count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Search Bar and Quick Filters ─── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/40 p-4 mb-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar médico por nombre, correo, cédula profesional, sede o especialidad…"
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterSepVerified(!filterSepVerified)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                filterSepVerified
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verificada SEP</span>
            </button>

            <button
              onClick={() => setFilterResidentsOnly(!filterResidentsOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                filterResidentsOnly
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Residentes (R1-R4)</span>
            </button>

            <button
              onClick={() => setFilterComiteVisible(!filterComiteVisible)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                filterComiteVisible
                  ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>En Comité Editorial</span>
            </button>

            <button
              onClick={() => setFilterSpecialistVisible(!filterSpecialistVisible)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                filterSpecialistVisible
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>En Especialistas</span>
            </button>

            <Link
              to="/admin/admisiones"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/70 transition"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>
                Lista de espera ({courseEnrollments.filter((r) => r.status === 'pending').length})
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Cargando directorio de médicos…</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-900/20">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
            No se encontraron usuarios
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No hay registros que coincidan con la búsqueda.'
              : 'No hay médicos en esta categoría actualmente.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredUsers.map((u) => {
            const isSelf = u.id === user?.id;

            const isPending = u.enrollment_status === 'pending' || u.enrollment_status === 'none';
            const isApproved = u.enrollment_status === 'approved';
            const isRejected = u.enrollment_status === 'rejected';

            const isCommittee = u.roles.includes('editor') || u.roles.includes('admin');

            return (
              <li
                key={u.id}
                className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  isPending
                    ? 'border-amber-300/70 dark:border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10'
                    : isCommittee
                    ? 'border-violet-300/70 dark:border-violet-500/30 bg-violet-50/20 dark:bg-violet-950/10'
                    : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left Column: Doctor Identity & Meta */}
                  <div className="flex gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-slate-500 dark:text-slate-300">
                          {u.display_name?.charAt(0)?.toUpperCase() || 'M'}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      {/* Name & Account Email */}
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                          {u.display_name}
                        </p>
                        {isSelf && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Tu cuenta
                          </span>
                        )}
                      </div>

                      {/* Email with 1-click copy */}
                      {u.email && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.email}</span>
                          <button
                            onClick={() => copyEmail(u.email, u.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Copiar correo"
                          >
                            {copiedId === u.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Hospital & Credentials */}
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 pt-0.5">
                        {u.institution && (
                          <p className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span><strong>Sede:</strong> {u.institution}</span>
                          </p>
                        )}
                        {u.academic_institution && u.academic_institution !== u.institution && (
                          <p className="text-[11px] text-slate-400 pl-5">
                            Egreso: {u.academic_institution}
                          </p>
                        )}
                        {u.specialty && (
                          <p className="flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{u.specialty} {u.residency_year ? `(${u.residency_year})` : ''}</span>
                          </p>
                        )}
                      </div>

                      {/* Cédula Profesional SEP Badge */}
                      {u.cedula_profesional && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-xs text-slate-500">
                            Cédula: <strong>{u.cedula_profesional}</strong>
                          </span>
                          {u.cedula_verified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Verificada SEP
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                              No verificada
                            </span>
                          )}
                        </div>
                      )}

                      {/* Registration Date */}
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                        <Calendar className="w-3 h-3" />
                        Registrado: {new Date(u.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>

                      {/* Status and Role Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {/* Admission Status Badge */}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-300/40">
                            <Lock className="w-3 h-3" /> En espera de admisión
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-300/40">
                            <CheckCircle2 className="w-3 h-3" /> Acceso activo al curso
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 text-xs font-semibold border border-red-300/40">
                            <XCircle className="w-3 h-3" /> Solicitud rechazada
                          </span>
                        )}

                        {/* Role Badges */}
                        {u.roles.includes('admin') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-300/40">
                            <Shield className="w-3 h-3" /> Dirección / Admin
                          </span>
                        )}
                        {u.roles.includes('editor') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-semibold border border-violet-300/40">
                            <Scale className="w-3 h-3" /> Comité Editorial
                          </span>
                        )}
                        {u.roles.includes('contributor') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-300/40">
                            <GraduationCap className="w-3 h-3" /> Colaborador Docente
                          </span>
                        )}
                        {u.has_premium && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-300/40">
                            <Sparkles className="w-3 h-3" /> Premium
                          </span>
                        )}

                        {/* Course Waitlist Badges */}
                        {courseEnrollments
                          .filter((r) => r.user_id === u.id && r.status === 'pending')
                          .map((r) => {
                            const courseLabel =
                              r.course_id === 'principiante'
                                ? 'Principiante'
                                : r.course_id === 'intermedio'
                                ? 'Intermedio'
                                : 'Avanzado';
                            return (
                              <Link
                                key={r.course_id}
                                to={`/admin/admisiones?course=${r.course_id}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300/60 hover:bg-amber-200 transition"
                                title="Ver en lista de espera de admisiones"
                              >
                                <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                <span>Espera: {courseLabel}</span>
                              </Link>
                            );
                          })}

                        {/* Public Visibility Badges - Only applicable for approved physicians */}
                        {isApproved && (
                          <>
                            {u.show_in_editorial_committee ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-100/90 dark:bg-violet-950/70 text-violet-800 dark:text-violet-300 text-xs font-bold border border-violet-300/60">
                                <Eye className="w-3 h-3 text-violet-600 dark:text-violet-400" /> En Comité Editorial
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-medium border border-slate-200/60 dark:border-slate-700/60">
                                <EyeOff className="w-3 h-3" /> Oculto en Comité
                              </span>
                            )}

                            {u.is_public ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100/90 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 text-xs font-bold border border-indigo-300/60">
                                <Eye className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> En Especialistas
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-medium border border-slate-200/60 dark:border-slate-700/60">
                                <EyeOff className="w-3 h-3" /> Oculto en Especialistas
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Administrative Controls & Public Visibility */}
                  <div className="flex flex-col gap-2.5 min-w-[240px]">
                    {/* Primary Button: Expediente y Progreso Académico */}
                    <Link
                      to={`/admin/usuarios/${u.id}/perfil`}
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-200 text-xs font-bold hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar perfil y verificar cédula</span>
                    </Link>

                    <Link
                      to={`/admin/alumnos/${u.id}`}
                      state={{ from: location.pathname + location.search }}
                      className="w-full inline-flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                        <span>Expediente y Progreso</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </Link>

                    {/* Section 2: Public Visibility Controls (Only available if approved) */}
                    {isApproved ? (
                      <div className="bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/40 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-indigo-950/30 p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold tracking-wide uppercase text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Visibilidad Pública</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Web Oficial</span>
                        </div>

                        {/* Toggle Comité Editorial */}
                        <button
                          type="button"
                          disabled={loadingId === u.id}
                          onClick={() => run(u.id, () => toggleEditorialCommitteeVisibility(u.id, !u.show_in_editorial_committee))}
                          className={`w-full inline-flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                            u.show_in_editorial_committee
                              ? 'bg-violet-100 dark:bg-violet-950/70 text-violet-800 dark:text-violet-200 border border-violet-300/60 hover:bg-violet-200 dark:hover:bg-violet-900/60 font-semibold'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                          }`}
                          title={u.show_in_editorial_committee ? 'Clic para ocultar de /comite-editorial' : 'Clic para mostrar en /comite-editorial'}
                        >
                          <span className="flex items-center gap-1.5">
                            {u.show_in_editorial_committee ? (
                              <Eye className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span>Comité Editorial</span>
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            u.show_in_editorial_committee
                              ? 'bg-violet-200 dark:bg-violet-900/80 text-violet-900 dark:text-violet-100'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            {u.show_in_editorial_committee ? 'Visible (Ocultar)' : 'Oculto (Mostrar)'}
                          </span>
                        </button>

                        {/* Toggle Especialistas */}
                        <button
                          type="button"
                          disabled={loadingId === u.id}
                          onClick={() => run(u.id, () => toggleSpecialistVisibility(u.id, !u.is_public))}
                          className={`w-full inline-flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                            u.is_public
                              ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-200 border border-indigo-300/60 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 font-semibold'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                          }`}
                          title={u.is_public ? 'Clic para ocultar del Directorio de Especialistas' : 'Clic para mostrar en el Directorio de Especialistas'}
                        >
                          <span className="flex items-center gap-1.5">
                            {u.is_public ? (
                              <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span>Especialistas</span>
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            u.is_public
                              ? 'bg-indigo-200 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-100'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            {u.is_public ? 'Visible (Ocultar)' : 'Oculto (Mostrar)'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          <span>Visibilidad Pública Inactiva</span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                          {isRejected
                            ? 'Solicitud rechazada: el usuario no es visible en ningún directorio público.'
                            : 'La visibilidad se habilita al admitir un curso desde Admisiones.'}
                        </p>
                      </div>
                    )}

                    {/* Section 3: Committee & Roles Governance (Not for self) */}
                    {!isSelf && (
                      <div className="bg-slate-100/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                        <span className="text-[11px] font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400 block">
                          Gestión de Roles
                        </span>

                        {/* Toggle Comité Editorial Role */}
                        {u.roles.includes('editor') ? (
                          <button
                            type="button"
                            disabled={loadingId === u.id}
                            onClick={() => {
                              if (!confirm(`¿Remover a ${u.display_name} del rol de Comité Editorial?`)) return;
                              run(u.id, () => revokeRole(u.id, 'editor' as AppRole));
                            }}
                            className="w-full inline-flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 text-xs font-semibold hover:bg-violet-200 transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Scale className="w-3.5 h-3.5" /> Rol Editor
                            </span>
                            <span className="text-[10px] text-violet-500 underline">Remover</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={loadingId === u.id}
                            onClick={() => run(u.id, () => grantRole(u.id, 'editor' as AppRole))}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-xs font-medium transition cursor-pointer"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>Asignar Rol Editor</span>
                          </button>
                        )}

                        {/* Toggle Colaborador Docente */}
                        {u.roles.includes('contributor') ? (
                          <button
                            type="button"
                            disabled={loadingId === u.id}
                            onClick={() => {
                              if (!confirm(`¿Remover rol de Colaborador Docente?`)) return;
                              run(u.id, () => revokeContributor(u.id));
                            }}
                            className="w-full inline-flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-semibold hover:bg-blue-200 transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5" /> Colaborador Docente
                            </span>
                            <span className="text-[10px] text-blue-500 underline">Remover</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={loadingId === u.id}
                            onClick={() => run(u.id, () => verifyContributor(u.id))}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs font-medium transition cursor-pointer"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Hacer Colaborador Docente</span>
                          </button>
                        )}

                        {/* Toggle Administrador */}
                        {u.roles.includes('admin') ? (
                          <button
                            type="button"
                            disabled={loadingId === u.id}
                            onClick={() => {
                              if (!confirm(`¿Remover privilegios de administrador para ${u.display_name}?`)) return;
                              run(u.id, () => revokeRole(u.id, 'admin' as AppRole));
                            }}
                            className="w-full inline-flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-200 transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5" /> Administrador
                            </span>
                            <span className="text-[10px] text-indigo-500 underline">Remover</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={loadingId === u.id}
                            onClick={() => run(u.id, () => grantRole(u.id, 'admin' as AppRole))}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs font-medium transition cursor-pointer"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Hacer Administrador</span>
                          </button>
                        )}

                        {/* Premium Toggle */}
                        {!u.has_premium ? (
                          <button
                            type="button"
                            disabled={loadingId === u.id}
                            onClick={() => {
                              const ref = window.prompt('Referencia/Folio de pago o beca (opcional):', 'Admisión oficial');
                              if (ref === null) return;
                              run(u.id, () => grantPremiumAccess(u.id, 'manual', ref || undefined));
                            }}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 transition cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Otorgar Acceso Premium</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={loadingId === u.id}
                            onClick={() => {
                              if (!confirm('¿Revocar suscripción premium?')) return;
                              run(u.id, () => revokePremiumAccess(u.id));
                            }}
                            className="w-full inline-flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-200 transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> Premium Activo
                            </span>
                            <span className="text-[10px] text-amber-600 underline">Revocar</span>
                          </button>
                        )}

                        <div className="pt-1 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cursos por nivel</p>
                          {sellable.map((course) => {
                            const courseId = course.id;
                            const activeEnrollment = courseEnrollments.find(
                              (row) => row.user_id === u.id && row.course_id === courseId && row.status === 'active'
                            );
                            const pendingEnrollment = courseEnrollments.find(
                              (row) => row.user_id === u.id && row.course_id === courseId && row.status === 'pending'
                            );
                            const label = courseDisplayTitle(courseId, courses);

                            if (activeEnrollment) {
                              return (
                                <button
                                  key={courseId}
                                  type="button"
                                  disabled={loadingId === u.id}
                                  onClick={() => {
                                    if (!confirm(`¿Revocar ${label} para ${u.display_name}?`)) return;
                                    run(u.id, () => revokeCourseAccessAndSyncProfile(u.id, courseId));
                                  }}
                                  className="w-full inline-flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
                                >
                                  <span>{label} activo</span>
                                  <span className="text-[10px] underline">Revocar</span>
                                </button>
                              );
                            }

                            if (pendingEnrollment) {
                              return (
                                <div
                                  key={courseId}
                                  className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 space-y-1"
                                >
                                  <div className="flex items-center text-xs">
                                    <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                      <span>{label}: Espera</span>
                                    </span>
                                  </div>
                                  {pendingEnrollment.request_notes && (
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400 italic line-clamp-1">
                                      "{pendingEnrollment.request_notes}"
                                    </p>
                                  )}
                                  <Link
                                    to={`/admin/admisiones?course=${courseId}`}
                                    className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-xs transition"
                                  >
                                    Resolver en Admisiones
                                  </Link>
                                </div>
                              );
                            }

                            return (
                              <button
                                key={courseId}
                                type="button"
                                disabled={loadingId === u.id}
                                onClick={() => {
                                  const ref = window.prompt(`Referencia de pago para ${label} (opcional):`, '');
                                  if (ref === null) return;
                                  run(u.id, () =>
                                    grantCourseAccessAndApproveProfile(u.id, courseId as CourseId, {
                                      method: 'manual',
                                      reference: ref || undefined,
                                    })
                                  );
                                }}
                                className="w-full inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
                              >
                                Otorgar {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Section 4: Danger Zone - Eliminar Usuario Permanentemente (Not for self) */}
                    {!isSelf && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <button
                          type="button"
                          disabled={loadingId === u.id || deleting}
                          onClick={() => setDeleteTarget(u)}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-200/80 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/25 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 text-xs font-semibold shadow-2xs transition cursor-pointer"
                          title="Eliminar usuario, credenciales de acceso y todo su historial de la plataforma"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Eliminar Usuario Definitivamente</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ─── Modal de Confirmación de Eliminación Permanente ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-red-200 dark:border-red-900/60 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900/80">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Eliminar Usuario y Datos
                </h3>
                <p className="text-xs text-slate-500">Acción permanente e irreversible</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Usuario: <span className="font-mono text-blue-600 dark:text-blue-400">{deleteTarget.display_name}</span>
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Correo: <span className="font-mono">{deleteTarget.email}</span>
              </p>
              {deleteTarget.cedula_profesional && (
                <p className="text-slate-500 dark:text-slate-400">
                  Cédula: <span className="font-mono">{deleteTarget.cedula_profesional}</span>
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs text-red-800 dark:text-red-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Se purgarán de raíz los siguientes registros:</span>
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-red-700 dark:text-red-400">
                <li>Cuenta de autenticación en Supabase Auth</li>
                <li>Perfil público, cédula y roles asignados</li>
                <li>Intentos y respuestas en el simulador de examen</li>
                <li>Intentos de evaluación y progreso de temas</li>
                <li>Inscripciones a talleres y suscripciones</li>
              </ul>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteUser}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Eliminando…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, Eliminar Definitivamente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
