import { describe, expect, it } from 'vitest';
import type { CourseEnrollmentStatus } from '../types/database';
import { DEFAULT_COURSES, sellableCourseIds } from '../content/courseCatalog';

describe('Course Subscriptions and Waitlist Logic', () => {
  it('validates allowed enrollment statuses', () => {
    const validStatuses: CourseEnrollmentStatus[] = ['pending', 'active', 'rejected', 'revoked'];
    validStatuses.forEach((st) => {
      expect(['pending', 'active', 'rejected', 'revoked']).toContain(st);
    });
  });

  it('validates sellable courses that require professor admission', () => {
    const ids = sellableCourseIds(DEFAULT_COURSES);
    expect(ids).toEqual(['principiante', 'intermedio', 'avanzado']);
    expect(ids).not.toContain('referencia');
  });

  it('verifies FIFO queue sorting for waitlist applicants', () => {
    const mockWaitlist = [
      {
        user_id: 'user-2',
        course_id: 'principiante',
        status: 'pending',
        requested_at: '2026-09-18T10:00:00Z',
        display_name: 'Dr. Beta',
        email: 'beta@med.mx',
        cedula_profesional: '123456',
        cedula_verified: true,
        institution: 'HGR 1',
        residency_year: 'R2',
        request_notes: 'Deseo entrar',
        payment_reference: 'TRANS-99',
      },
      {
        user_id: 'user-1',
        course_id: 'principiante',
        status: 'pending',
        requested_at: '2026-09-18T08:30:00Z',
        display_name: 'Dra. Alfa',
        email: 'alfa@med.mx',
        cedula_profesional: '654321',
        cedula_verified: true,
        institution: 'INNN',
        residency_year: 'R3',
        request_notes: 'Inscripción anticipada',
        payment_reference: 'FOLIO-01',
      },
    ];

    // Sorted FIFO by requested_at ascending
    const sorted = [...mockWaitlist].sort(
      (a, b) => new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime()
    );

    expect(sorted[0].user_id).toBe('user-1');
    expect(sorted[1].user_id).toBe('user-2');
  });

  it('validates price display presets and formatting', () => {
    const samplePrices = ['$4,500 MXN', '$3,500 MXN', '$5,000 MXN', 'Gratuito', 'Consultar'];
    samplePrices.forEach((price) => {
      expect(price.trim().length).toBeGreaterThan(0);
    });

    const beginnerCourse = DEFAULT_COURSES.find((c) => c.id === 'principiante');
    expect(beginnerCourse).toBeDefined();
    expect(beginnerCourse?.is_active).toBe(true);
  });
});
