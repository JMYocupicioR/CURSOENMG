import { useState, useEffect, useRef } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Printer,
  QrCode,
  ShieldCheck,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { calculateStudentKardex } from '../../services/gradebookService';
import type { StudentKardexData } from '../../types/academicGradebook';
import type { AdminProfileRow } from '../../types/admin';
import type { Profile } from '../../types/database';
import { BioelectricLightningIcon } from '../brand/BrandLogo';
import { BRAND } from '../../config/brand';

interface StudentKardexModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  profile?: AdminProfileRow | Profile | null;
}

export default function StudentKardexModal({
  isOpen,
  onClose,
  studentId,
  profile,
}: StudentKardexModalProps) {
  const [kardex, setKardex] = useState<StudentKardexData | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      calculateStudentKardex(studentId, profile)
        .then(setKardex)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, studentId, profile]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs print:p-0 print:bg-white print:static print:z-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Actions (Hidden when printing) */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/50 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Expediente Académico y Kardex Oficial
              </h3>
              <p className="text-[11px] text-slate-500">
                Historial consolidado con rúbricas personalizadas y aval COMEFYR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Guardar PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Kardex Official Printable Document */}
        <div
          ref={printRef}
          className="p-6 sm:p-10 overflow-y-auto flex-1 space-y-6 print:overflow-visible print:p-8 print:text-black bg-white dark:bg-slate-900 print:bg-white"
        >
          {loading || !kardex ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Generando Kardex Oficial del alumno...</p>
            </div>
          ) : (
            <div className="space-y-6 font-sans">
              {/* ─── Institutional Header ─── */}
              <div className="border-b-2 border-indigo-900/20 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md border-2 border-indigo-700/60 p-1">
                    <BioelectricLightningIcon size={46} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 block">
                      {BRAND.name} · Educación Médica Continua
                    </span>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      KARDEX ACADÉMICO OFICIAL
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      {BRAND.academicTitle}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-200 dark:sm:border-slate-700 sm:pl-4 space-y-0.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-200">
                    <ShieldCheck className="w-3 h-3 text-indigo-600" /> AVAL ACADÉMICO COMEFYR
                  </span>
                  <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                    Folio: {kardex.folio}
                  </p>
                  <p className="text-[10px] text-slate-400">Emisión: {kardex.generationDate}</p>
                </div>
              </div>

              {/* ─── Student Profile Card ─── */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Médico Cursista
                  </span>
                  <p className="font-black text-slate-900 dark:text-white text-sm">
                    {kardex.studentName}
                  </p>
                  <p className="text-slate-500 text-[11px] truncate">{kardex.email}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Cédula Profesional SEP
                  </span>
                  <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                    <span>{kardex.cedula || 'En proceso'}</span>
                    {kardex.cedulaVerified && (
                      <span className="text-emerald-500 text-[10px] bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded font-black">
                        SEP VERIFICADA
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[11px]">{kardex.specialty}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Sede / Hospital
                  </span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {kardex.institution || 'Sede no especificada'}
                  </p>
                  <p className="text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                    {kardex.residencyYear || 'Médico Residente'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Valor Curricular
                  </span>
                  <p className="font-black text-slate-900 dark:text-white">
                    {kardex.academicHoursEarned} de {kardex.maxAcademicHours} Horas
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    {kardex.cmeCreditsEarned} / {kardex.maxCmeCredits} Créditos CME
                  </p>
                </div>
              </div>

              {/* ─── Final Grade Hero Banner ─── */}
              <div
                className={`rounded-2xl p-5 sm:p-6 border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  kardex.isOfficial && kardex.isPassing
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-300 dark:border-emerald-800'
                    : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-300 dark:border-amber-800'
                }`}
              >
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                    Dictamen Académico Final
                  </span>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    {kardex.status === 'accredited_honors' ? (
                      <Sparkles className="w-5 h-5 text-amber-500 fill-amber-400" />
                    ) : kardex.isPassing ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                    <h2
                      className={`text-base sm:text-lg font-black tracking-tight ${
                        kardex.isPassing
                          ? 'text-emerald-900 dark:text-emerald-100'
                          : 'text-amber-900 dark:text-amber-100'
                      }`}
                    >
                      {kardex.statusLabel}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg">
                    {kardex.isOfficial
                      ? kardex.isPassing
                        ? 'Dictamen oficial Capa A: acreditado (30+30+20+20). La constancia exige este dictamen y cédula verificada.'
                        : 'Dictamen oficial Capa A: aún no alcanza el mínimo de acreditación.'
                      : 'Promedio en curso: solo cubetas con evidencia. Las vacías dicen “sin calificar”; no se inventan 85 ni 90.'}
                  </p>
                </div>

                <div className="text-center sm:text-right shrink-0 bg-white/90 dark:bg-slate-900/90 py-3 px-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {kardex.isOfficial ? 'Dictamen oficial' : 'Promedio en curso'}
                  </span>
                  <div className="flex items-baseline justify-center sm:justify-end gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                      {kardex.finalGrade}
                    </span>
                    <span className="text-xs font-bold text-slate-400">/ 100</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                    Escala 10: {kardex.finalGradeScale10}
                    {kardex.pointsToPass != null && kardex.pointsToPass > 0
                      ? ` · faltan ${kardex.pointsToPass} pts`
                      : ''}
                  </span>
                </div>
              </div>

              {/* ─── Rubrics Breakdown Summary Table ─── */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Desglose de Calificación Ponderada por Rubro (Criterios del Maestro)
                </h3>

                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-4">Rubro Calificable</th>
                        <th className="py-2.5 px-3 text-center">Ponderación</th>
                        <th className="py-2.5 px-3 text-center">Nota Obtenida</th>
                        <th className="py-2.5 px-3 text-right">Puntos Ponderados</th>
                        <th className="py-2.5 px-4">Resumen / Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {kardex.rubricBreakdown.map((rubric) => (
                        <tr key={rubric.rubricId} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {rubric.name}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                            {rubric.weight}%
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                            {rubric.hasEvidence && rubric.rawScore != null ? `${rubric.rawScore}%` : 'Sin calificar'}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                            {rubric.weightedScore} pts
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                            {rubric.summary}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/80 dark:bg-slate-800/40 font-black">
                        <td className="py-3 px-4 text-slate-900 dark:text-white uppercase">
                          Total Calificación Final
                        </td>
                        <td className="py-3 px-3 text-center text-indigo-600">100%</td>
                        <td className="py-3 px-3 text-center">-</td>
                        <td className="py-3 px-3 text-right text-base text-indigo-600 dark:text-indigo-400">
                          {kardex.finalGrade} / 100
                        </td>
                        <td className="py-3 px-4 text-xs font-bold text-emerald-600">
                          {kardex.statusLabel}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ─── Detailed Breakdown: Exams & Assignments ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Exámenes */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-2 bg-slate-50/20">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      Evaluaciones y Quizzes ({kardex.examDetails.length})
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">Calificación</span>
                  </div>

                  {kardex.examDetails.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-3 text-center">
                      No hay evaluaciones registradas aún.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {kardex.examDetails.map((ex) => (
                        <div
                          key={ex.attemptId}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-[11px]"
                        >
                          <div className="truncate pr-2">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {ex.title}
                            </p>
                            <span className="text-[10px] text-slate-400">{ex.date}</span>
                          </div>
                          <span
                            className={`font-black px-2 py-0.5 rounded ${
                              ex.score >= 80
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {ex.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tareas */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-2 bg-slate-50/20">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                      Tareas y Casos Prácticos ({kardex.assignmentDetails.length})
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">Nota</span>
                  </div>

                  {kardex.assignmentDetails.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-3 text-center">
                      No hay tareas asignadas en este periodo.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {kardex.assignmentDetails.map((asg) => (
                        <div
                          key={asg.assignmentId}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-[11px]"
                        >
                          <div className="truncate pr-2">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {asg.title}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              Entrega: {asg.dueDate}
                            </span>
                          </div>
                          <span className="font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {typeof asg.grade === 'number' ? `${asg.grade}%` : 'Entregada'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Detailed Breakdown: Attendance & Milestones ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Asistencias */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-2 bg-slate-50/20">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      Asistencias a Sesiones Clínicas ({kardex.attendanceSummary.attendancePct}%)
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {kardex.attendanceSummary.attendedSessions}/
                      {kardex.attendanceSummary.totalSessions} Sesiones
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {kardex.attendanceSummary.sessions.map((ses) => (
                      <div
                        key={ses.id}
                        className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-[11px]"
                      >
                        <span className="truncate pr-2 text-slate-700 dark:text-slate-300 font-medium">
                          {ses.title}
                        </span>
                        <span
                          className={`font-black text-[10px] px-1.5 py-0.5 rounded ${
                            ses.status === 'present'
                              ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300'
                              : ses.status === 'late'
                              ? 'text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300'
                              : 'text-slate-600 bg-slate-100 dark:bg-slate-700'
                          }`}
                        >
                          {ses.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checklist de Hitos de Calendarización */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-2 bg-slate-50/20">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      Cumplimiento de Cortes Calendarizados
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Avance</span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {kardex.milestoneAudits.map((m) => (
                      <div
                        key={m.milestoneId}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-[11px] flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {m.milestoneTitle}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            Corte: {m.dueDate.slice(0, 10)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-[10px] text-slate-500">
                            {m.completedTopics}/{m.totalTopics}
                          </span>
                          <span
                            className={`font-black text-[10px] px-1.5 py-0.5 rounded ${
                              m.isOnTrack
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {m.isOnTrack ? 'A TIEMPO' : 'REZAGO'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ─── Institutional Signatures and Validation ─── */}
              <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-center text-xs">
                {/* QR Validation */}
                <div className="flex flex-col items-center sm:items-start text-left space-y-1">
                  <div className="w-16 h-16 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center p-1 bg-white">
                    <QrCode className="w-full h-full text-slate-800" />
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">
                    Verificación Electrónica: {kardex.folio}
                  </span>
                </div>

                {/* Signature 1 */}
                <div className="space-y-1">
                  <div className="w-40 border-b border-slate-400 mx-auto mb-1.5" />
                  <p className="font-black text-slate-900 dark:text-white text-[11px]">
                    Dr. Titular del Curso
                  </p>
                  <p className="text-[10px] text-slate-500">Dirección Médica {BRAND.name}</p>
                </div>

                {/* Signature 2 */}
                <div className="space-y-1">
                  <div className="w-40 border-b border-slate-400 mx-auto mb-1.5" />
                  <p className="font-black text-slate-900 dark:text-white text-[11px]">
                    Comité de Evaluación
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Consejo Mexicano de Medicina de Rehabilitación
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 print:hidden shrink-0">
          <span className="text-xs text-slate-400">
            Documento emitido conforme a los lineamientos curriculares vigentes.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Descargar Kardex</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
