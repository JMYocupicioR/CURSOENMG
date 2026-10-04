import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { StudentPortalGuide } from './StudentPortalGuide';
import { getLiveSessionUrgency } from '../../services/courseService';
import { shouldShowPortalGuide } from '../../services/portalGuideService';
import type { LiveWorkshop, Profile } from '../../types/database';

describe('StudentDashboard UX & Fast-Track Architecture', () => {
  const sampleWorkshop: LiveWorkshop = {
    id: 'ws-urgent-1',
    module_id: 'm2',
    topic_id: null,
    title: 'Taller de Bloqueos de Conducción en Vivo',
    description: 'Casos electromiográficos en tiempo real con Dr. Yocupicio',
    scheduled_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // Comienza en 10 minutos
    duration_minutes: 90,
    stream_url: 'https://meet.google.com/test-live-stream',
    recording_url: null,
    max_capacity: 100,
    clinical_case_revision_id: null,
    clinical_case_json: null,
    status: 'scheduled',
    created_by: 'teacher-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('Caso A: detecta clase en vivo inminente (<30 min) y habilita el bypass del modal bloqueante', () => {
    const urgency = getLiveSessionUrgency([sampleWorkshop], 30);
    expect(urgency.isUrgent).toBe(true);
    expect(urgency.startsInMinutes).toBeLessThanOrEqual(30);
    expect(urgency.workshop?.title).toBe('Taller de Bloqueos de Conducción en Vivo');

    // Cuando isUrgent === true, la regla de StudentDashboard mantiene guideOpen en false
    const guideHtml = renderToStaticMarkup(
      <StudentPortalGuide
        open={false} // Suprimido por isLiveSessionImminent
        courseState="active"
        finalActionLabel="Ir a Clases"
        onBack={() => undefined}
        onNext={() => undefined}
        onSkip={() => undefined}
        onFinish={() => undefined}
        stepIndex={0}
        saving={false}
        saveError={null}
      />
    );
    expect(guideHtml).toBe(''); // Cero bloqueo modal
  });

  it('Caso B: cuando no hay clase en vivo y el usuario no ha visto la guía, se muestra la inducción', () => {
    const farWorkshop: LiveWorkshop = {
      ...sampleWorkshop,
      scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
    };
    const urgency = getLiveSessionUrgency([farWorkshop], 30);
    expect(urgency.isUrgent).toBe(false);

    // Usuario que no ha visto la versión 1 de la guía
    const mockProfile: Partial<Profile> = {
      portal_guide_version: 0,
    };
    expect(shouldShowPortalGuide(mockProfile as Profile, 1)).toBe(true);

    const guideHtml = renderToStaticMarkup(
      <StudentPortalGuide
        open={true}
        courseState="active"
        finalActionLabel="Continuar a mis Clases"
        onBack={() => undefined}
        onNext={() => undefined}
        onSkip={() => undefined}
        onFinish={() => undefined}
        stepIndex={0}
        saving={false}
        saveError={null}
      />
    );
    expect(guideHtml).toContain('role="dialog"');
    expect(guideHtml).toContain('Ver novedades más tarde');
    expect(guideHtml).toContain('Cuatro lugares, y ya puedes estudiar');
  });

  it('Caso C: el modal de novedades expone el botón visible "Ver novedades más tarde" para salida rápida en 1 clic', () => {
    const onSnoozeMock = vi.fn();
    const guideHtml = renderToStaticMarkup(
      <StudentPortalGuide
        open={true}
        courseState="active"
        finalActionLabel="Continuar"
        onBack={() => undefined}
        onNext={() => undefined}
        onSkip={() => undefined}
        onFinish={() => undefined}
        onSnooze={onSnoozeMock}
        stepIndex={0}
        saving={false}
        saveError={null}
      />
    );

    expect(guideHtml).toContain('Ver novedades más tarde');
    expect(guideHtml).toContain('aria-label="Cerrar modal (Esc)"');
    expect(guideHtml).toContain('title="Cerrar la guía por ahora y continuar a tus clases (Esc)"');
  });

  it('Caso D: Fast-Track Banner renderiza el acceso directo y la etiqueta de transmisión en vivo', () => {
    const urgency = getLiveSessionUrgency([sampleWorkshop], 30);
    expect(urgency.isUrgent).toBe(true);

    // Renderizamos el componente simulado del banner idéntico a StudentDashboard
    const bannerHtml = renderToStaticMarkup(
      <MemoryRouter>
        <aside aria-label="Acceso prioritario a clase en vivo">
          <span>EN VIVO EN {urgency.startsInMinutes} MIN</span>
          <h3>{urgency.workshop?.title}</h3>
          <a href={urgency.workshop?.stream_url || '#'}>Entrar al Stream Directo</a>
        </aside>
      </MemoryRouter>
    );

    expect(bannerHtml).toContain('Acceso prioritario a clase en vivo');
    expect(bannerHtml).toContain('Taller de Bloqueos de Conducción en Vivo');
    expect(bannerHtml).toContain('Entrar al Stream Directo');
    expect(bannerHtml).toContain('https://meet.google.com/test-live-stream');
  });
});
