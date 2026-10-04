import { useState, useEffect } from 'react';
import {
  BellRing,
  Calendar,
  Clock,
  Play,
  ArrowRight,
  X,
  Sparkles,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import type { StudentAssignment } from '../../types/studentPlan';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  type NotificationPermissionStatus,
} from '../../services/deviceNotificationService';

interface PendingTasksAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  studentId: string;
  pendingAssignments: StudentAssignment[];
  onSelectExam: (assignment: StudentAssignment) => void;
  onSelectCase: (assignment: StudentAssignment) => void;
  onSelectOther: (assignment: StudentAssignment) => void;
  onGoToAllAssignments: () => void;
}

export default function PendingTasksAlertModal({
  isOpen,
  onClose,
  studentName,
  studentId,
  pendingAssignments,
  onSelectExam,
  onSelectCase,
  onSelectOther,
  onGoToAllAssignments,
}: PendingTasksAlertModalProps) {
  const [permission, setPermission] = useState<NotificationPermissionStatus>('default');
  const [requestingPerm, setRequestingPerm] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, [isOpen]);

  if (!isOpen || pendingAssignments.length === 0) return null;

  const handleRequestPermission = async () => {
    setRequestingPerm(true);
    try {
      const res = await requestNotificationPermission(studentId);
      setPermission(res);
      if (res === 'granted') {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 5000);
      }
    } finally {
      setRequestingPerm(false);
    }
  };

  const handleTestAlert = async () => {
    setTestSent(true);
    await sendTestNotification();
    setTimeout(() => setTestSent(false), 5000);
  };

  const handleClose = () => {
    if (dontShowToday) {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`neurosafe_dismiss_pending_modal_${studentId}`, today);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header decoration bar */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-indigo-600 to-cyan-500" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Aviso del Profesor
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {pendingAssignments.length} {pendingAssignments.length === 1 ? 'actividad pendiente' : 'actividades pendientes'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
                Tareas y Evaluaciones Asignadas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {studentName ? `Dr(a). ${studentName}, tus` : 'Tus'} profesores han calendarizado actividades requeridas para tu acreditación.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-700 dark:text-slate-200 flex-1">
          {/* PWA / Device Notification Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5 sm:mt-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-blue-950 dark:text-blue-200">
                      Alertas automáticas en tu dispositivo (PWA)
                    </p>
                    {permission === 'granted' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck className="w-3 h-3" /> Activo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                    {permission === 'granted'
                      ? 'Tu dispositivo está configurado para recibir alertas cuando tu profesor asigne exámenes o califique entregas.'
                      : 'Recibe alertas sonoras y en pantalla cuando tu profesor asigne un examen o esté por vencer.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {permission === 'granted' ? (
                  <button
                    type="button"
                    onClick={handleTestAlert}
                    disabled={testSent}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-cyan-300 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-slate-700 border border-blue-200 dark:border-blue-800 transition shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {testSent ? '¡Alerta enviada!' : 'Probar Alerta'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    disabled={requestingPerm}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>{requestingPerm ? 'Activando...' : 'Activar Alertas'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List of Pending Assignments */}
          <div className="space-y-3">
            {pendingAssignments.map((asg) => {
              const dueTime = new Date(asg.due_date).getTime();
              const now = Date.now();
              const isOverdue = dueTime < now;
              const daysRemaining = Math.ceil((dueTime - now) / 86400000);
              const isExam = asg.type === 'exam';
              const isCase = asg.type === 'clinical_case';

              return (
                <div
                  key={asg.id}
                  className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            isExam
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : isCase
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {isExam ? 'Examen Asignado' : isCase ? 'Caso Clínico' : 'Tarea Práctica'}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : daysRemaining <= 1
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {isOverdue
                            ? 'Plazo Vencido'
                            : daysRemaining <= 1
                            ? '¡Vence en < 24 hrs!'
                            : `Vence en ${daysRemaining} días`}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {isCase ? 'Caso Clínico' : asg.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {isCase
                          ? 'Caso clínico sin detalles asignado por tu profesor. Abre la actividad para analizar los antecedentes, estudios y resolver el diagnóstico.'
                          : asg.description}
                      </p>
                    </div>
                  </div>

                  {/* Details + Action Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Entrega:{' '}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {new Date(asg.due_date).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </strong>
                      </span>
                    </div>

                    <div>
                      {isExam ? (
                        <button
                          type="button"
                          onClick={() => {
                            handleClose();
                            onSelectExam(asg);
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-sm transition cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Realizar Examen</span>
                        </button>
                      ) : isCase ? (
                        <button
                          type="button"
                          onClick={() => {
                            handleClose();
                            onSelectCase(asg);
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-sm transition cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Resolver Caso Clínico</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            handleClose();
                            onSelectOther(asg);
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition cursor-pointer"
                        >
                          <span>Entregar Tarea</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850/80 border-t border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>No mostrar este recordatorio de nuevo hoy</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Revisar más tarde
            </button>
            <button
              type="button"
              onClick={() => {
                handleClose();
                onGoToAllAssignments();
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-sm cursor-pointer"
            >
              <span>Ver todas las tareas ({pendingAssignments.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
