import type { LiveWorkshop } from '../types/database';
import { sendDeviceNotification } from '../services/deviceNotificationService';

/** Umbral en minutos previos al inicio de clase en los cuales se activa el acceso al stream */
export const LIVE_ACCESS_WINDOW_MINUTES = 5;

export interface WorkshopTimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

export interface WorkshopAccessTiming {
  isPast: boolean;
  isLiveNow: boolean;
  canAccess: boolean; // true si está en vivo o faltan <= LIVE_ACCESS_WINDOW_MINUTES
  startsInMinutes: number;
  diffSeconds: number; // Segundos hasta el inicio (negativo si ya pasó la hora)
  diffMinutes: number;
  timeRemaining: WorkshopTimeRemaining;
  accessOpensAt: Date;
  scheduledAt: Date;
  statusLabel: 'past' | 'live' | 'accessible' | 'locked';
}

/**
 * Calcula con precisión de segundos el estado de acceso y el tiempo restante para un taller o clase en vivo.
 */
export function getWorkshopAccessTiming(
  workshop: Pick<LiveWorkshop, 'scheduled_at' | 'duration_minutes' | 'status'>,
  now = new Date()
): WorkshopAccessTiming {
  const scheduledAt = new Date(workshop.scheduled_at);
  const nowMs = now.getTime();
  const startMs = scheduledAt.getTime();
  const durationMin = workshop.duration_minutes || 90;
  const endMs = startMs + durationMin * 60 * 1000;

  // La sala abre 5 minutos antes del inicio oficial
  const accessOpensAt = new Date(startMs - LIVE_ACCESS_WINDOW_MINUTES * 60 * 1000);

  if (Number.isNaN(startMs)) {
    return {
      isPast: true,
      isLiveNow: false,
      canAccess: false,
      startsInMinutes: 0,
      diffSeconds: 0,
      diffMinutes: 0,
      timeRemaining: { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 },
      accessOpensAt: new Date(),
      scheduledAt: new Date(),
      statusLabel: 'past',
    };
  }

  const isCompletedStatus = workshop.status === 'completed' || workshop.status === 'cancelled';
  const isPast = isCompletedStatus || nowMs > endMs;
  const isLiveExplicit = workshop.status === 'live';
  const isDuringScheduledWindow = nowMs >= startMs && nowMs <= endMs;
  const isLiveNow = !isPast && (isLiveExplicit || isDuringScheduledWindow);

  const diffMs = startMs - nowMs;
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffMs / 60000);

  // Acceso habilitado si la clase está en vivo o faltan 5 minutos o menos (y aún no ha terminado)
  const canAccess = !isPast && (isLiveNow || diffMs <= LIVE_ACCESS_WINDOW_MINUTES * 60 * 1000);

  // Calcular desglose de cuenta regresiva
  const clampedRemainingSec = Math.max(0, diffSeconds);
  const days = Math.floor(clampedRemainingSec / 86400);
  const hours = Math.floor((clampedRemainingSec % 86400) / 3600);
  const minutes = Math.floor((clampedRemainingSec % 3600) / 60);
  const seconds = clampedRemainingSec % 60;

  let statusLabel: WorkshopAccessTiming['statusLabel'] = 'locked';
  if (isPast) {
    statusLabel = 'past';
  } else if (isLiveNow) {
    statusLabel = 'live';
  } else if (canAccess) {
    statusLabel = 'accessible';
  }

  return {
    isPast,
    isLiveNow,
    canAccess,
    startsInMinutes: diffMinutes,
    diffSeconds,
    diffMinutes,
    timeRemaining: {
      days,
      hours,
      minutes,
      seconds,
      totalSeconds: clampedRemainingSec,
    },
    accessOpensAt,
    scheduledAt,
    statusLabel,
  };
}

/**
 * Función booleana directa para verificar si un alumno tiene permitido ingresar al stream en vivo
 */
export function canAccessLiveWorkshop(
  workshop: Pick<LiveWorkshop, 'scheduled_at' | 'duration_minutes' | 'status'>,
  now = new Date()
): boolean {
  return getWorkshopAccessTiming(workshop, now).canAccess;
}

/**
 * Formatea el tiempo restante en un texto conciso y legible en español
 */
export function formatTimeRemainingText(tr: WorkshopTimeRemaining): string {
  if (tr.totalSeconds <= 0) return '0 min';
  if (tr.days > 0) {
    return `${tr.days}d ${tr.hours}h ${tr.minutes}m`;
  }
  if (tr.hours > 0) {
    return `${tr.hours}h ${tr.minutes}m ${tr.seconds}s`;
  }
  return `${tr.minutes}m ${tr.seconds.toString().padStart(2, '0')}s`;
}

/**
 * Emite un tono sonoro armónico y nítido mediante Web Audio API en el navegador
 */
export function playLiveClassAlertSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Primer tono: Re5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Segundo tono armónico: La5 (880.00 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.16);
    gain2.gain.setValueAtTime(0.18, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.debug('[playLiveClassAlertSound] Audio no permitido o silenciado por el navegador:', err);
  }
}

const ALERTED_WORKSHOPS_KEY = 'neurosafe_live_class_5min_alerted_';

/**
 * Dispara la alerta al alumno cuando faltan <= 5 minutos para su clase en vivo.
 * Memoriza la alerta en sessionStorage para dispararse una sola vez por clase y sesión.
 */
export async function triggerLiveClassFiveMinuteAlert(
  workshop: LiveWorkshop,
  options: { playSound?: boolean } = { playSound: true }
): Promise<boolean> {
  if (typeof window === 'undefined' || !workshop) return false;

  const storageKey = `${ALERTED_WORKSHOPS_KEY}${workshop.id}`;
  try {
    const alreadyAlerted = sessionStorage.getItem(storageKey);
    if (alreadyAlerted) {
      return false;
    }
    sessionStorage.setItem(storageKey, new Date().toISOString());
  } catch {
    // Si sessionStorage no está disponible, continuar
  }

  if (options.playSound) {
    playLiveClassAlertSound();
  }

  // Notificación nativa del dispositivo/navegador si el alumno las tiene activas
  try {
    await sendDeviceNotification({
      title: '🔴 ¡Tu clase en vivo inicia en 5 minutos!',
      body: `«${workshop.title}» está por comenzar. Haz clic para entrar a la sala ahora.`,
      url: `/taller/${workshop.id}`,
      tag: `live_class_5min_${workshop.id}`,
      requireInteraction: true,
    });
  } catch (e) {
    console.warn('[triggerLiveClassFiveMinuteAlert] Error enviando notificación push:', e);
  }

  return true;
}

