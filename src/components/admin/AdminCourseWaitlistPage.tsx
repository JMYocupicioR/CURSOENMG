import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  GraduationCap,
  BadgeCheck,
  Building2,
  CreditCard,
  RefreshCw,
  Eye,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  getAdminCourseWaitlist,
  adminAdmitStudentAndApproveProfile,
  adminRejectCourseRequestAndSyncProfile,
  revokeCourseAccessAndSyncProfile,
} from '../../services/courseService';
import { getAdminProfiles, rejectPhysicianEnrollment, verifyPhysicianEnrollment } from '../../services/editorialService';
import type { AdminProfileRow } from '../../types/admin';
import type { CourseWaitlistRow, CourseEnrollmentStatus, CourseId } from '../../types/database';
import { useSyllabusCatalog } from '../../hooks/useSyllabusCatalog';
import { sellableCourses, isCourseId } from '../../content/courseCatalog';
import StudentKardexModal from './StudentKardexModal';

const STATUS_FILTERS: { id: CourseEnrollmentStatus | 'all'; label: string }[] = [
  { id: 'pending', label: 'En lista de espera' },
  { id: 'active', label: 'Admitidos' },
  { id: 'rejected', label: 'Rechazados' },
  { id: 'all', label: 'Todos los registros' },
];

export default function AdminCourseWaitlistPage() {
  const { courses } = useSyllabusCatalog();
  const [searchParams] = useSearchParams();
  const courseTabs = useMemo(
    () => [
      { id: 'all' as const, label: 'Todos los cursos' },
      ...sellableCourses(courses).map((course) => ({ id: course.id as CourseId, label: course.title })),
    ],
    [courses]
  );
  const requestedCourse = searchParams.get('course');
  const [waitlist, setWaitlist] = useState<CourseWaitlistRow[]>([]);
  const [profilePending, setProfilePending] = useState<AdminProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseId | 'all'>(
    isCourseId(requestedCourse) ? requestedCourse : 'all'
  );
  const [selectedStatus, setSelectedStatus] = useState<CourseEnrollmentStatus | 'all'>('pending');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Modal para admitir
  const [admitTarget, setAdmitTarget] = useState<CourseWaitlistRow | null>(null);
  const [admitPaymentMethod, setAdmitPaymentMethod] = useState('transferencia');
  const [admitPaymentRef, setAdmitPaymentRef] = useState('');
  const [admitNotes, setAdmitNotes] = useState('');

  // Modal de Kardex
  const [kardexStudent, setKardexStudent] = useState<CourseWaitlistRow | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminCourseWaitlist(
        selectedCourse === 'all' ? null : selectedCourse,
        selectedStatus
      );
      setWaitlist(data);
      if (selectedStatus === 'pending' || selectedStatus === 'all') {
        const profiles = await getAdminProfiles(false, 'enrollment_pending');
        const queuedIds = new Set(data.filter((row) => row.status === 'pending').map((row) => row.user_id));
        setProfilePending(
          profiles.filter((profile) => profile.enrollment_status === 'pending' && !queuedIds.has(profile.id))
        );
      } else {
        setProfilePending([]);
      }
    } catch (err: any) {
      console.error('Error al cargar lista de espera:', err);
      setError(err?.message || 'No se pudo cargar la lista de espera');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCourse, selectedStatus]);

  const handleConfirmAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitTarget) return;

    setActionBusyId(admitTarget.enrollment_id);
    try {
      await adminAdmitStudentAndApproveProfile(admitTarget.user_id, admitTarget.course_id, {
        method: admitPaymentMethod,
        reference: admitPaymentRef || undefined,
        notes: admitNotes || undefined,
      });
      showToast(`¡Dr(a). ${admitTarget.display_name} ha sido admitido(a) a ${admitTarget.course_title}!`);
      setAdmitTarget(null);
      await loadData();
    } catch (err: any) {
      alert(`Error al admitir: ${err?.message || 'Error inesperado'}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleReject = async (row: CourseWaitlistRow) => {
    const reason = window.prompt(
      `¿Rechazar solicitud de ${row.display_name} para ${row.course_title}?\nMotivo (opcional):`,
      ''
    );
    if (reason === null) return;

    setActionBusyId(row.enrollment_id);
    try {
      await adminRejectCourseRequestAndSyncProfile(row.user_id, row.course_id, reason || undefined);
      showToast(`Solicitud de ${row.display_name} rechazada.`);
      await loadData();
    } catch (err: any) {
      alert(`Error: ${err?.message}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleApproveProfile = async (profile: AdminProfileRow) => {
    setActionBusyId(profile.id);
    try {
      await verifyPhysicianEnrollment(profile.id);
      showToast(`¡Dr(a). ${profile.display_name} quedó aprobado(a)!`);
      await loadData();
    } catch (err: any) {
      alert(`Error al aprobar: ${err?.message || 'Error inesperado'}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRejectProfile = async (profile: AdminProfileRow) => {
    const reason = window.prompt(`¿Rechazar la solicitud de ${profile.display_name}?\nMotivo (opcional):`, '');
    if (reason === null) return;
    setActionBusyId(profile.id);
    try {
      await rejectPhysicianEnrollment(profile.id, reason || undefined);
      showToast(`Solicitud de ${profile.display_name} rechazada.`);
      await loadData();
    } catch (err: any) {
      alert(`Error: ${err?.message}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRevoke = async (row: CourseWaitlistRow) => {
    if (!window.confirm(`¿Revocar acceso al curso ${row.course_title} para ${row.display_name}?`)) return;

    setActionBusyId(row.enrollment_id);
    try {
      await revokeCourseAccessAndSyncProfile(row.user_id, row.course_id);
      showToast(`Acceso revocado para ${row.display_name}.`);
      await loadData();
    } catch (err: any) {
      alert(`Error al revocar: ${err?.message}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const filteredList = useMemo(() => {
    let list = waitlist;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.display_name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.cedula_profesional && r.cedula_profesional.toLowerCase().includes(q)) ||
          (r.institution && r.institution.toLowerCase().includes(q)) ||
          (r.specialty && r.specialty.toLowerCase().includes(q))
      );
    }
    return list;
  }, [waitlist, searchQuery]);

  const pendingCount = useMemo(
    () => waitlist.filter((r) => r.status === 'pending').length + profilePending.length,
    [waitlist, profilePending]
  );

  return (
    <AdminLayout
      title="Admisiones y Lista de Espera de Cursos"
      subtitle="Control de aspirantes a los cursos de ElectroDx, cola de admisión cronológica y aprobación de suscripciones por el profesor."
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-2xl border border-slate-700 dark:border-slate-300 animate-slideUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Metric summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/25 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              En lista de espera
            </p>
            <p className="text-2xl font-black text-amber-900 dark:text-amber-100">{pendingCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Filtrados en vista</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{filteredList.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cursos disponibles</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
              {sellableCourses(courses).map((course) => course.title).join(' • ') || 'Sin cursos vendibles'}
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Recargar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Course Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {courseTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedCourse(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedCourse === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status filter & Search bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedStatus(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedStatus === f.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por médico, cédula, hospital..."
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          Cargando solicitudes de cursos...
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredList.length === 0 && profilePending.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 text-slate-500">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="font-bold text-slate-700 dark:text-slate-300">
            {selectedStatus === 'pending'
              ? 'No hay solicitudes pendientes en lista de espera'
              : 'No se encontraron registros con los filtros seleccionados'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Los aspirantes que soliciten admisión a un curso aparecerán aquí organizados por turno de llegada.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {profilePending
            .filter((profile) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return (
                profile.display_name?.toLowerCase().includes(q) ||
                profile.email?.toLowerCase().includes(q) ||
                profile.cedula_profesional?.toLowerCase().includes(q) ||
                profile.institution?.toLowerCase().includes(q) ||
                profile.specialty?.toLowerCase().includes(q)
              );
            })
            .map((profile) => (
              <div
                key={profile.id}
                className="p-5 rounded-2xl border border-amber-300/80 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white">{profile.display_name || 'Médico sin nombre'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {profile.specialty || profile.institution || profile.email}
                    {profile.cedula_profesional ? ` · Cédula: ${profile.cedula_profesional}` : ''}
                  </p>
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mt-1">Perfil pendiente de aprobación</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={actionBusyId === profile.id}
                    onClick={() => handleRejectProfile(profile)}
                    className="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={actionBusyId === profile.id}
                    onClick={() => handleApproveProfile(profile)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {actionBusyId === profile.id ? 'Aprobando...' : 'Aprobar'}
                  </button>
                </div>
              </div>
            ))}
          {filteredList.map((row) => {
            const isPending = row.status === 'pending';
            const isActive = row.status === 'active';
            const isRejected = row.status === 'rejected';
            const isBusy = actionBusyId === row.enrollment_id;

            return (
              <div
                key={row.enrollment_id}
                className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs hover:shadow-xs transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left side: Doctor & Waitlist info */}
                <div className="flex items-start gap-3.5 flex-1">
                  {/* Position badge */}
                  {isPending && (
                    <div
                      className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 flex items-center justify-center font-black text-xs text-amber-800 dark:text-amber-300 shrink-0 shadow-2xs"
                      title={`Turno #${row.waitlist_position} en la lista de espera`}
                    >
                      #{row.waitlist_position}
                    </div>
                  )}

                  {/* Doctor details */}
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {row.display_name}
                      </h3>
                      {row.cedula_profesional && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Cédula: {row.cedula_profesional}
                          {row.cedula_verified && <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 inline" />}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : isPending
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : isRejected
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {isActive ? 'Admitido' : isPending ? 'En Lista de Espera' : isRejected ? 'Rechazado' : row.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>{row.email}</span>
                      {row.phone && <span>Tel: {row.phone}</span>}
                      {row.specialty && <span>{row.specialty}</span>}
                      {row.institution && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {row.institution}
                        </span>
                      )}
                    </div>

                    {/* Course & request metadata */}
                    <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
                      <div className="inline-flex items-center gap-1.5 font-bold text-blue-700 dark:text-cyan-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200/60 dark:border-blue-800/60">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>{row.course_title}</span>
                      </div>

                      <span className="text-slate-400">
                        Solicitado:{' '}
                        <strong className="text-slate-600 dark:text-slate-300">
                          {new Date(row.requested_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </strong>
                      </span>

                      {row.payment_reference && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          Ref: {row.payment_reference}
                        </span>
                      )}
                    </div>

                    {/* Notes from applicant */}
                    {row.request_notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        "{row.request_notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side: Action Buttons */}
                <div className="flex flex-wrap md:flex-col items-center md:items-end gap-2 shrink-0">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setAdmitTarget(row);
                          setAdmitPaymentRef(row.payment_reference || '');
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Admitir al curso</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleReject(row)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium transition cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </button>
                    </>
                  )}

                  {isActive && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleRevoke(row)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 text-xs font-medium transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revocar acceso</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setKardexStudent(row)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
                    title="Ver expediente y progreso del médico"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Kardex</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmación de Admisión */}
      {admitTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Admitir cursista al curso
                  </h3>
                  <p className="text-xs text-slate-500">{admitTarget.course_title}</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
              <p className="font-bold text-slate-900 dark:text-white">{admitTarget.display_name}</p>
              <p className="text-slate-500">{admitTarget.email}</p>
              {admitTarget.cedula_profesional && (
                <p className="text-slate-500">Cédula: {admitTarget.cedula_profesional}</p>
              )}
            </div>

            <form onSubmit={handleConfirmAdmission} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Método de pago / Modalidad
                </label>
                <select
                  value={admitPaymentMethod}
                  onChange={(e) => setAdmitPaymentMethod(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white"
                >
                  <option value="transferencia">Transferencia bancaria / SPEI</option>
                  <option value="tarjeta">Tarjeta de crédito / Débito</option>
                  <option value="efectivo">Depósito en efectivo</option>
                  <option value="beca">Beca institucional 100%</option>
                  <option value="cortesia">Cortesía docente / Invitación</option>
                  <option value="manual">Manual / Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Referencia o folio de pago
                </label>
                <input
                  type="text"
                  value={admitPaymentRef}
                  onChange={(e) => setAdmitPaymentRef(e.target.value)}
                  placeholder="Ej. SPEI-892348 o Comprobante #123"
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notas administrativas <span className="font-normal text-slate-400">(Opcional)</span>
                </label>
                <textarea
                  value={admitNotes}
                  onChange={(e) => setAdmitNotes(e.target.value)}
                  rows={2}
                  placeholder="Observaciones de admisión..."
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdmitTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionBusyId !== null}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {actionBusyId !== null ? 'Admitiendo...' : 'Aprobar y Admitir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Kardex del Alumno */}
      {kardexStudent && (
        <StudentKardexModal
          isOpen={Boolean(kardexStudent)}
          onClose={() => setKardexStudent(null)}
          studentId={kardexStudent.user_id}
          profile={{
            id: kardexStudent.user_id,
            display_name: kardexStudent.display_name,
            credentials: null,
            institution: kardexStudent.institution,
            specialty: kardexStudent.specialty,
            residency_year: kardexStudent.residency_year,
            cedula_profesional: kardexStudent.cedula_profesional,
            comefyr_member_id: null,
            avatar_url: kardexStudent.avatar_url,
            bio: null,
            is_public: false,
            verified_at: null,
            enrollment_status: 'approved',
            enrollment_verified_at: null,
            enrollment_requested_at: null,
            created_at: kardexStudent.requested_at,
            updated_at: kardexStudent.requested_at,
            cedula_verified: kardexStudent.cedula_verified,
            cedula_data: null,
            academic_institution: null,
            show_in_editorial_committee: false,
            subspecialty: null,
            specialty_cedula: null,
            cmmr_certified: false,
            cmmr_number: null,
            phone: kardexStudent.phone,
            linkedin_url: null,
            orcid_id: null,
            clinical_interests: null,
            admin_notes: null,
            completed_topics: null,
          }}
        />
      )}
    </AdminLayout>
  );
}
