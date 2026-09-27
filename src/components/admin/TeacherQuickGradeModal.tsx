import React, { useState } from 'react';
import {
  X,
  Award,
  Stethoscope,
  Building2,
  GraduationCap,
  FileText,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Save,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import type { TeacherPendingReviewItem } from '../../types/studentPlan';
import { gradeAssignment } from '../../services/studentPlanService';
import { AssignmentSubmissionReview } from '../student/AssignmentDeliveryPanel';
import { AssignmentMaterialsList } from '../student/AssignmentMaterialsList';
import { getEmgReportForAssignment, gradeEmgReport } from '../../services/studentToolsService';
import { useAuth } from '../../contexts/AuthProvider';

interface TeacherQuickGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: TeacherPendingReviewItem | null;
  onGraded: () => void;
}

const QUICK_COMMENTS = [
  'Excelente análisis topográfico y correlación neurofisiológica impecable.',
  'Buen reporte clínico. Se recomienda revisar latencias distales de conducción sensitiva.',
  'Diagnóstico certero. Profundizar en la caracterización de potenciales de denervación activa.',
  'Análisis completado satisfactoriamente con apego a guías clínicas de electromiografía.',
  'Aprobado. Repasar la diferenciación entre radiculopatía y plexopatía en este segmento.',
];

const QUICK_SCORES = [100, 95, 90, 85, 80, 75, 70];

const EMG_RUBRIC = [
  { id: 'hallazgos', label: 'Hallazgos técnicos' },
  { id: 'impresion', label: 'Impresión diagnóstica' },
  { id: 'correlacion', label: 'Correlación clínica' },
  { id: 'limitaciones', label: 'Limitaciones del estudio' },
] as const;

export default function TeacherQuickGradeModal({
  isOpen,
  onClose,
  item,
  onGraded,
}: TeacherQuickGradeModalProps) {
  const { user, profile } = useAuth();
  const [grade, setGrade] = useState<number>(item?.assignment.grade ?? 85);
  const [feedback, setFeedback] = useState<string>(item?.assignment.feedback ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emgReportId, setEmgReportId] = useState<string | null>(null);
  const [rubric, setRubric] = useState<Record<string, number>>({
    hallazgos: 20,
    impresion: 20,
    correlacion: 20,
    limitaciones: 20,
  });

  // Sync state when item changes
  React.useEffect(() => {
    if (item) {
      setGrade(item.assignment.grade ?? 85);
      setFeedback(item.assignment.feedback ?? '');
      setError(null);
      setEmgReportId(null);
      if (item.assignment.type === 'emg_report') {
        getEmgReportForAssignment(item.assignment.id)
          .then((report) => {
            if (!report) return;
            setEmgReportId(report.id);
            if (report.rubric && typeof report.rubric === 'object') {
              setRubric((prev) => ({ ...prev, ...(report.rubric as Record<string, number>) }));
            }
            if (typeof report.rubric_score === 'number') setGrade(report.rubric_score);
          })
          .catch(() => undefined);
      }
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const { assignment, studentProfile } = item;

  const handleSave = async (event: { preventDefault(): void }, decision: 'approved' | 'needs_revision') => {
    event.preventDefault();
    if (grade < 0 || grade > 100) {
      setError('La calificación debe estar entre 0 y 100.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const reviewerName = profile?.display_name || user?.email || 'Profesor Titular';
      const rubricTotal = EMG_RUBRIC.reduce((sum, row) => sum + Number(rubric[row.id] ?? 0), 0);
      const finalGrade = assignment.type === 'emg_report' ? Math.min(100, rubricTotal) : Number(grade);
      const baseFeedback = feedback.trim() || 'Evaluado por el Profesor Titular.';
      const signedFeedback = `${baseFeedback} — ${reviewerName}`;
      if (assignment.type === 'emg_report' && emgReportId) {
        await gradeEmgReport({
          reportId: emgReportId,
          rubric,
          score: finalGrade,
          feedback: signedFeedback,
        });
      }
      await gradeAssignment(
        assignment.id,
        assignment.student_id,
        finalGrade,
        signedFeedback,
        user?.id,
        decision
      );
      onGraded();
      onClose();
    } catch (err: any) {
      console.error('[TeacherQuickGradeModal] Error saving grade:', err);
      setError(err?.message || 'Error al guardar la calificación. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'clinical_case':
        return { label: 'Caso Clínico EMG', color: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30' };
      case 'emg_report':
        return { label: 'Reporte de Trazos', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' };
      case 'practical_task':
        return { label: 'Tarea Práctica', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' };
      case 'exam':
        return { label: 'Examen Asignado', color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' };
      default:
        return { label: 'Asignación Médica', color: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' };
    }
  };

  const badge = getTypeBadge(assignment.type);

  const getScoreColor = (sc: number) => {
    if (sc >= 90) return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40';
    if (sc >= 80) return 'text-blue-600 dark:text-blue-400 border-blue-500/40 bg-blue-50 dark:bg-blue-950/40';
    if (sc >= 70) return 'text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-50 dark:bg-amber-950/40';
    return 'text-rose-600 dark:text-rose-400 border-rose-500/40 bg-rose-50 dark:bg-rose-950/40';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 text-white flex items-start justify-between gap-4 border-b border-indigo-500/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-cyan-300 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
                <span className="text-[10px] text-indigo-200 font-mono">
                  ID: {assignment.id.slice(0, 10)}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Calificación Docente de Entrega
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student & Submission Info */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Student Profile Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                {studentProfile?.display_name?.charAt(0) || <GraduationCap className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {studentProfile?.display_name || 'Médico Residente'}
                </p>
                <p className="text-xs text-slate-500">{studentProfile?.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 sm:text-right">
              {studentProfile?.institution && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-[11px]">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  {studentProfile.institution}
                </span>
              )}
              {studentProfile?.residency_year && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-[11px] font-semibold text-blue-600 dark:text-cyan-400">
                  <Stethoscope className="w-3 h-3" />
                  {studentProfile.residency_year}
                </span>
              )}
            </div>
          </div>

          {/* Assignment Description & Submission Details */}
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Caso o Tarea Evaluada
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {assignment.title}
              </h4>
              {assignment.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {assignment.description}
                </p>
              )}
              <AssignmentMaterialsList materials={assignment.materials} className="mt-2" />
            </div>

            {/* Timestamps */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Fecha de entrega: {assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleString('es-MX') : 'Reciente'}
              </span>
              <span>•</span>
              <span>Vencimiento: {new Date(assignment.due_date).toLocaleDateString('es-MX')}</span>
            </div>

            {/* Student Notes / Work */}
            {assignment.student_notes && (
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60">
                <span className="text-[11px] font-bold text-blue-800 dark:text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                  Notas y Diagnóstico del Alumno:
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {assignment.student_notes}
                </p>
              </div>
            )}

            {/* Submission Link if provided */}
            {assignment.submission_url && !assignment.submission_url.startsWith('exam_session:') && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                <span className="truncate max-w-sm text-slate-600 dark:text-slate-300 font-mono">
                  {assignment.submission_url}
                </span>
                <a
                  href={assignment.submission_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                >
                  <span>Abrir reporte</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <AssignmentSubmissionReview assignmentId={assignment.id} />
          </div>

          {/* Grading Form */}
          <form onSubmit={(event) => void handleSave(event, 'approved')} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4">
            {assignment.type === 'emg_report' && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Rúbrica EMG (25 pts c/u)</p>
                {EMG_RUBRIC.map((row) => (
                  <label key={row.id} className="flex items-center justify-between gap-3 text-xs">
                    <span>{row.label}</span>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={rubric[row.id] ?? 0}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setRubric((prev) => ({ ...prev, [row.id]: value }));
                        const next = { ...rubric, [row.id]: value };
                        setGrade(EMG_RUBRIC.reduce((sum, item) => sum + Number(next[item.id] ?? 0), 0));
                      }}
                      className="w-20 px-2 py-1 rounded-lg border text-right"
                    />
                  </label>
                ))}
              </div>
            )}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Grade Input & Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Calificación Asignada (0 - 100 pts)
                </label>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreColor(grade)}`}>
                  {grade >= 70 ? 'Acreditado' : 'No Acreditado'} ({grade} pts)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-28 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-xl text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {QUICK_SCORES.map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setGrade(sc)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        grade === sc
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clinical Feedback */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                  Retroalimentación y Observaciones Docentes
                </label>
              </div>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Escribe comentarios formativos sobre la técnica, correlación anatómica o hallazgos del caso…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />

              {/* Quick Feedback Chips */}
              <div className="mt-2 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Comentarios formativos frecuentes (haz clic para insertar):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_COMMENTS.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFeedback((prev) => (prev ? `${prev} ${c}` : c))}
                      className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-300 border border-slate-200 dark:border-slate-700 transition truncate max-w-xs text-left"
                    >
                      + {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={(event) => void handleSave(event, 'needs_revision')}
                className="px-4 py-2.5 rounded-xl border border-amber-300 text-amber-800 dark:text-amber-200 text-xs font-bold disabled:opacity-50"
              >
                Devolver para corrección
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando calificación…' : 'Guardar y Acreditar Entrega'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
