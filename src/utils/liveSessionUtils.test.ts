import { describe, expect, it } from 'vitest';
import {
  getWorkshopAccessTiming,
  canAccessLiveWorkshop,
  formatTimeRemainingText,
} from './liveSessionUtils';
import type { LiveWorkshop } from '../types/database';

describe('liveSessionUtils - Control de acceso y cuenta regresiva a clases en vivo', () => {
  const baseWorkshop: Pick<LiveWorkshop, 'scheduled_at' | 'duration_minutes' | 'status'> = {
    scheduled_at: '2026-11-02T20:00:00.000Z',
    duration_minutes: 90,
    status: 'scheduled',
  };

  it('bloquea el acceso si faltan más de 5 minutos para el inicio', () => {
    // 30 minutos antes
    const now = new Date('2026-11-02T19:30:00.000Z');
    const timing = getWorkshopAccessTiming(baseWorkshop, now);

    expect(timing.canAccess).toBe(false);
    expect(timing.isLiveNow).toBe(false);
    expect(timing.isPast).toBe(false);
    expect(timing.statusLabel).toBe('locked');
    expect(timing.startsInMinutes).toBe(30);
    expect(timing.diffSeconds).toBe(1800);
    expect(timing.timeRemaining.minutes).toBe(30);
    expect(timing.timeRemaining.seconds).toBe(0);
    expect(canAccessLiveWorkshop(baseWorkshop, now)).toBe(false);
  });

  it('bloquea el acceso si faltan 6 minutos para el inicio', () => {
    const now = new Date('2026-11-02T19:54:00.000Z'); // 6 minutos antes
    const timing = getWorkshopAccessTiming(baseWorkshop, now);

    expect(timing.canAccess).toBe(false);
    expect(timing.statusLabel).toBe('locked');
    expect(canAccessLiveWorkshop(baseWorkshop, now)).toBe(false);
  });

  it('activa el acceso exactamente a los 5 minutos antes del inicio', () => {
    const now = new Date('2026-11-02T19:55:00.000Z'); // 5 minutos antes
    const timing = getWorkshopAccessTiming(baseWorkshop, now);

    expect(timing.canAccess).toBe(true);
    expect(timing.statusLabel).toBe('accessible');
    expect(timing.diffSeconds).toBe(300);
    expect(timing.timeRemaining.minutes).toBe(5);
    expect(timing.timeRemaining.seconds).toBe(0);
    expect(canAccessLiveWorkshop(baseWorkshop, now)).toBe(true);
  });

  it('permite el acceso si faltan 2 minutos y desglosa segundos correctamente', () => {
    const now = new Date('2026-11-02T19:58:15.000Z'); // 1m 45s antes
    const timing = getWorkshopAccessTiming(baseWorkshop, now);

    expect(timing.canAccess).toBe(true);
    expect(timing.statusLabel).toBe('accessible');
    expect(timing.diffSeconds).toBe(105);
    expect(timing.timeRemaining.minutes).toBe(1);
    expect(timing.timeRemaining.seconds).toBe(45);
  });

  it('reconoce la clase en vivo durante la ventana de duración y permite el acceso', () => {
    const now = new Date('2026-11-02T20:15:00.000Z'); // 15 min después del inicio
    const timing = getWorkshopAccessTiming(baseWorkshop, now);

    expect(timing.canAccess).toBe(true);
    expect(timing.isLiveNow).toBe(true);
    expect(timing.isPast).toBe(false);
    expect(timing.statusLabel).toBe('live');
    expect(timing.timeRemaining.totalSeconds).toBe(0);
  });

  it('reconoce la clase como en vivo inmediatamente si tiene status="live"', () => {
    const liveWorkshop = {
      ...baseWorkshop,
      status: 'live' as const,
    };
    const now = new Date('2026-11-02T18:00:00.000Z'); // Horas antes de la fecha prevista
    const timing = getWorkshopAccessTiming(liveWorkshop, now);

    expect(timing.canAccess).toBe(true);
    expect(timing.isLiveNow).toBe(true);
    expect(timing.statusLabel).toBe('live');
  });

  it('marca la clase como finalizada y bloquea el acceso si transcurrió su duración', () => {
    const now = new Date('2026-11-02T21:40:00.000Z'); // 100 min después de inicio (duración 90 min)
    const timing = getWorkshopAccessTiming(baseWorkshop, now);

    expect(timing.isPast).toBe(true);
    expect(timing.canAccess).toBe(false);
    expect(timing.isLiveNow).toBe(false);
    expect(timing.statusLabel).toBe('past');
  });

  it('formatea el texto de cuenta regresiva adecuadamente', () => {
    expect(formatTimeRemainingText({ days: 3, hours: 4, minutes: 20, seconds: 10, totalSeconds: 274810 })).toBe('3d 4h 20m');
    expect(formatTimeRemainingText({ days: 0, hours: 2, minutes: 15, seconds: 30, totalSeconds: 8130 })).toBe('2h 15m 30s');
    expect(formatTimeRemainingText({ days: 0, hours: 0, minutes: 4, seconds: 5, totalSeconds: 245 })).toBe('4m 05s');
    expect(formatTimeRemainingText({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 })).toBe('0 min');
  });
});

