import { useEffect, useState, useRef } from 'react';
import { Video, Lock, Clock, Bell, CheckCircle, AlertCircle, Play } from 'lucide-react';
import type { LiveWorkshop } from '../../types/database';
import {
  getWorkshopAccessTiming,
  triggerLiveClassFiveMinuteAlert,
  type WorkshopAccessTiming,
} from '../../utils/liveSessionUtils';

interface LiveClassCountdownProps {
  workshop: LiveWorkshop;
  isRegistered: boolean;
  onRegister?: () => void;
  loadingReg?: boolean;
  className?: string;
}

export function LiveClassCountdown({
  workshop,
  isRegistered,
  onRegister,
  loadingReg = false,
  className = '',
}: LiveClassCountdownProps) {
  const [timing, setTiming] = useState<WorkshopAccessTiming>(() =>
    getWorkshopAccessTiming(workshop, new Date())
  );
  const [alertDismissed, setAlertDismissed] = useState(false);
  const previousCanAccessRef = useRef<boolean>(timing.canAccess);

  // Intervalo de 1 segundo para la cuenta regresiva en tiempo real
  useEffect(() => {
    const checkTiming = () => {
      const nextTiming = getWorkshopAccessTiming(workshop, new Date());
      setTiming(nextTiming);

      // Si recién se activa el acceso a los 5 minutos (transición locked -> accessible)
      if (!previousCanAccessRef.current && nextTiming.canAccess && !nextTiming.isPast) {
        triggerLiveClassFiveMinuteAlert(workshop);
      }
      previousCanAccessRef.current = nextTiming.canAccess;
    };

    checkTiming();
    const interval = setInterval(checkTiming, 1000);
    return () => clearInterval(interval);
  }, [workshop]);

  // Si el usuario ingresa a la página y faltan <= 5 min (o está en vivo), disparar alerta 5 min una sola vez
  useEffect(() => {
    if (isRegistered && timing.canAccess && !timing.isPast) {
      triggerLiveClassFiveMinuteAlert(workshop);
    }
  }, [isRegistered, timing.canAccess, timing.isPast, workshop]);

  const { isPast, isLiveNow, canAccess, timeRemaining, accessOpensAt, scheduledAt } =
    timing;

  const formattedStartTime = scheduledAt.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedOpenTime = accessOpensAt.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 p-6 transition-all ${className}`}
      aria-live="polite"
    >
      {/* ─── CASO 1: LA CLASE YA FINALIZÓ ─── */}
      {isPast ? (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold mb-3">
            <Clock className="w-3.5 h-3.5" /> Sesión Concluida
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Este taller ya finalizó</h3>
          {workshop.recording_url ? (
            <div className="mt-4">
              <a
                href={workshop.recording_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md transition-all cursor-pointer"
              >
                <Video className="w-5 h-5" /> Ver grabación de la clase
              </a>
            </div>
          ) : (
            <p className="text-sm text-slate-500">La grabación aún no está disponible en la biblioteca.</p>
          )}
        </div>
      ) : (
        <>
          {/* ─── ESTADO DEL REGISTRO DEL ALUMNO ─── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">
                Registro al taller
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isRegistered
                  ? 'Estás registrado(a). El sistema te alertará y activará el acceso 5 minutos antes del inicio.'
                  : 'Regístrate para asegurar tu lugar en la sesión en vivo.'}
              </p>
            </div>

            {isRegistered ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold text-xs border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle className="w-4 h-4" /> Registrado para asistir
              </div>
            ) : (
              <button
                type="button"
                onClick={onRegister}
                disabled={loadingReg}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                {loadingReg ? 'Registrando...' : 'Registrarme a esta clase'}
              </button>
            )}
          </div>

          {/* ─── ALERTA DESTACADA DE 5 MINUTOS (CUANDO LA SALA ESTÁ ABIERTA) ─── */}
          {canAccess && isRegistered && !alertDismissed && (
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-red-500/15 via-rose-500/10 to-amber-500/15 border border-red-300 dark:border-red-800/70 text-slate-900 dark:text-white flex items-start justify-between gap-3 animate-fade-in shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bell className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                      🔴 Alerta de Clase en Vivo
                    </span>
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                  </div>
                  <p className="text-sm font-semibold mt-0.5">
                    {isLiveNow
                      ? '¡La clase está transmitiéndose en vivo ahora mismo!'
                      : `¡La sala ya está abierta! Faltan ${Math.max(1, timing.startsInMinutes)} min para iniciar a las ${formattedStartTime}.`}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Ingresa con tiempo para verificar tu micrófono, audífonos y conexión estable.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAlertDismissed(true)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1"
                title="Ocultar aviso"
              >
                ✕
              </button>
            </div>
          )}

          {/* ─── SECCIÓN DE CUENTA REGRESIVA Y ACCESO AL STREAM ─── */}
          <div className="mt-6 text-center">
            {/* Si aún faltan más de 5 minutos: MOSTRAR CONTADOR REGRESIVO Y BOTÓN BLOQUEADO */}
            {!canAccess ? (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-300 dark:border-amber-800/80">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                  <span>Inicio en {scheduledAt.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} a las {formattedStartTime}</span>
                </div>

                <p className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                  Tiempo restante para el inicio de la clase
                </p>

                {/* RELOJ DE CUENTA REGRESIVA */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-sm mx-auto">
                  <div className="p-2 sm:p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <span className="block text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
                      {timeRemaining.days.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] sm:text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                      Días
                    </span>
                  </div>

                  <div className="p-2 sm:p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <span className="block text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
                      {timeRemaining.hours.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] sm:text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                      Horas
                    </span>
                  </div>

                  <div className="p-2 sm:p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <span className="block text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
                      {timeRemaining.minutes.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] sm:text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                      Min
                    </span>
                  </div>

                  <div className="p-2 sm:p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <span className="block text-2xl sm:text-3xl font-black font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                      {timeRemaining.seconds.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] sm:text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                      Seg
                    </span>
                  </div>
                </div>

                {/* EXPLICACIÓN DE REGLA DE 5 MINUTOS */}
                <div className="max-w-md mx-auto p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    El acceso a la transmisión se activará automáticamente a las{' '}
                    <strong>{formattedOpenTime}</strong> (5 minutos antes de la clase).
                  </span>
                </div>

                {/* BOTÓN BLOQUEADO / DESHABILITADO */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="El acceso estará disponible 5 minutos antes de que empiece la clase"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-sm border border-slate-300 dark:border-slate-700 cursor-not-allowed select-none opacity-80"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Entrar al Stream en Vivo (Disponible 5 min antes)</span>
                  </button>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                    El botón cambiará a rojo activo automáticamente sin necesidad de recargar la página.
                  </p>
                </div>
              </div>
            ) : (
              /* SI FALTAN <= 5 MINUTOS O ESTÁ EN VIVO: BOTÓN DE ACCESO ACTIVO Y VIBRANTE */
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-xs font-black uppercase tracking-wider border border-red-300 dark:border-red-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
                  {isLiveNow ? '🔴 EN VIVO AHORA' : `🔴 SALA ABIERTA (Inicia en ${timing.startsInMinutes} min)`}
                </div>

                {!isLiveNow && timeRemaining.totalSeconds > 0 && (
                  <p className="text-sm font-mono font-bold text-slate-600 dark:text-slate-300">
                    Comienza exactamente en{' '}
                    <span className="text-red-600 dark:text-red-400 tabular-nums">
                      {timeRemaining.minutes.toString().padStart(2, '0')}:
                      {timeRemaining.seconds.toString().padStart(2, '0')}
                    </span>
                  </p>
                )}

                {workshop.stream_url ? (
                  <div className="pt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      El enlace de transmisión está activo para los alumnos inscritos:
                    </p>
                    <a
                      href={workshop.stream_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm sm:text-base shadow-xl shadow-red-600/30 hover:shadow-red-600/40 hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer ring-4 ring-red-500/20"
                    >
                      <Video className="w-5 h-5 animate-pulse" />
                      <span>Entrar al Stream en Vivo</span>
                      <Play className="w-4 h-4 fill-white" />
                    </a>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs font-medium max-w-md mx-auto flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      El docente está por conectar el enlace de transmisión en vivo a esta sala. Mantente en esta página.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

