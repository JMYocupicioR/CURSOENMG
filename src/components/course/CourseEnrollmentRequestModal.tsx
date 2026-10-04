import { useState } from 'react';
import {
  X,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import { requestCourseEnrollment } from '../../services/courseService';
import type { Course, CourseId } from '../../types/database';

interface CourseEnrollmentRequestModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CourseEnrollmentRequestModal({
  course,
  isOpen,
  onClose,
  onSuccess,
}: CourseEnrollmentRequestModalProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [notes, setNotes] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      await requestCourseEnrollment(course.id as CourseId, {
        notes,
        paymentReference: paymentRef,
      });
      await refreshProfile();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al solicitar admisión:', err);
      setError(err?.message || 'No se pudo enviar la solicitud de admisión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-course-enrollment-title"
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-cyan-400 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400">
                Suscripción Académica
              </p>
              <h2 id="modal-course-enrollment-title" className="text-xl font-extrabold text-slate-900 dark:text-white">
                {course.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice & Price */}
        <div className="mb-5 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30">
          <div className="flex items-start gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <p className="font-bold mb-1">Admisión sujeta a aprobación del profesor</p>
              <p>
                Cada nivel es una suscripción independiente. Al enviar tu solicitud ingresarás a la{' '}
                <strong>lista de espera oficial</strong> por orden de llegada. El profesor/administrador revisará tus
                credenciales y te dará admisión.
              </p>
            </div>
          </div>
          {course.price_display && (
            <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs font-semibold">
              <span className="text-amber-800 dark:text-amber-300">Precio mostrado:</span>
              <span className="text-sm font-extrabold text-amber-900 dark:text-amber-100 bg-amber-200/50 dark:bg-amber-900/50 px-2.5 py-0.5 rounded-lg">
                {course.price_display}
              </span>
            </div>
          )}
        </div>

        {/* Applicant details summary */}
        <div className="mb-5 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Médico aspirante:</span>
            <span className="font-bold text-slate-800 dark:text-white">{profile?.display_name || user?.email}</span>
          </div>
          {profile?.cedula_profesional && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Cédula Profesional:</span>
              <span className="font-mono font-semibold flex items-center gap-1">
                {profile.cedula_profesional}
                {profile.cedula_verified && <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 inline" />}
              </span>
            </div>
          )}
          {(profile?.specialty || profile?.residency_year) && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Especialidad / Nivel:</span>
              <span className="font-medium">
                {[profile.specialty, profile.residency_year].filter(Boolean).join(' • ')}
              </span>
            </div>
          )}
          {profile?.institution && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Sede:
              </span>
              <span className="font-medium truncate max-w-[200px]">{profile.institution}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas o motivación para el profesor{' '}
              <span className="font-normal text-slate-400">(Opcional)</span>
            </label>
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={400}
                placeholder="Ej. Médico en formación con interés en electrodiagnóstico neuromuscular..."
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Referencia o comprobante de pago <span className="font-normal text-slate-400">(Opcional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Ej. Transferencia SPEI #123456 / Comprobante BBVA"
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Si ya realizaste tu pago o cuentas con un folio, indícalo aquí para acelerar tu admisión.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition disabled:opacity-50"
            >
              {loading ? (
                <span>Enviando solicitud...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Unirme a la lista de espera</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
