import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LiveClassCountdown } from './LiveClassCountdown';
import type { LiveWorkshop } from '../../types/database';

describe('LiveClassCountdown Component', () => {
  const futureWorkshop: LiveWorkshop = {
    id: 'ws-future',
    module_id: 'm1',
    topic_id: null,
    title: 'Clase: Introducción al Neurodiagnóstico',
    description: 'Historia y rol clínico',
    scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana (+24 horas)
    duration_minutes: 90,
    stream_url: 'https://meet.google.com/test-stream-url',
    recording_url: null,
    max_capacity: 50,
    clinical_case_revision_id: null,
    clinical_case_json: null,
    status: 'scheduled',
    created_by: 'teacher-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const imminentWorkshop: LiveWorkshop = {
    ...futureWorkshop,
    id: 'ws-imminent',
    scheduled_at: new Date(Date.now() + 3 * 60 * 1000).toISOString(), // Comienza en 3 minutos
  };

  const pastWorkshop: LiveWorkshop = {
    ...futureWorkshop,
    id: 'ws-past',
    scheduled_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(), // Pasó hace 2 horas
    recording_url: 'https://vimeo.com/test-recording',
  };

  it('muestra el contador regresivo y bloquea el botón si faltan más de 5 minutos', () => {
    const html = renderToStaticMarkup(
      <LiveClassCountdown workshop={futureWorkshop} isRegistered={true} />
    );

    expect(html).toContain('Tiempo restante para el inicio de la clase');
    expect(html).toContain('Días');
    expect(html).toContain('Horas');
    expect(html).toContain('Min');
    expect(html).toContain('Seg');
    expect(html).toContain('Entrar al Stream en Vivo (Disponible 5 min antes)');
    expect(html).toContain('disabled=""');
    // NO debe contener enlace directo al stream cuando está bloqueado
    expect(html).not.toContain('href="https://meet.google.com/test-stream-url"');
    expect(html).toContain('5 minutos antes');
  });

  it('activa el botón y muestra la alerta de ingreso cuando faltan 5 minutos o menos', () => {
    const html = renderToStaticMarkup(
      <LiveClassCountdown workshop={imminentWorkshop} isRegistered={true} />
    );

    // Debe contener el botón activo con enlace al stream
    expect(html).toContain('href="https://meet.google.com/test-stream-url"');
    expect(html).toContain('Entrar al Stream en Vivo');
    expect(html).toContain('🔴 Alerta de Clase en Vivo');
    expect(html).toContain('¡La sala ya está abierta!');
  });

  it('muestra la sección de taller finalizado y el enlace de grabación si ya concluyó', () => {
    const html = renderToStaticMarkup(
      <LiveClassCountdown workshop={pastWorkshop} isRegistered={true} />
    );

    expect(html).toContain('Este taller ya finalizó');
    expect(html).toContain('Ver grabación de la clase');
    expect(html).toContain('href="https://vimeo.com/test-recording"');
    expect(html).not.toContain('Entrar al Stream en Vivo');
  });
});

