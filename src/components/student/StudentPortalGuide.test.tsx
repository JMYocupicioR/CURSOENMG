import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentPortalGuide } from './StudentPortalGuide';

describe('StudentPortalGuide', () => {
  it('returns null when open is false', () => {
    const html = renderToStaticMarkup(
      <StudentPortalGuide
        open={false}
        courseState="active"
        finalActionLabel="Empezar: Módulo 1"
        onBack={() => undefined}
        onNext={() => undefined}
        onSkip={() => undefined}
        onFinish={() => undefined}
        stepIndex={0}
        saving={false}
        saveError={null}
      />
    );
    expect(html).toBe('');
  });

  it('renders modal dialog with step 1 content, disabled back button, and skip button', () => {
    const html = renderToStaticMarkup(
      <StudentPortalGuide
        open={true}
        courseState="active"
        finalActionLabel="Empezar: Módulo 1"
        onBack={() => undefined}
        onNext={() => undefined}
        onSkip={() => undefined}
        onFinish={() => undefined}
        stepIndex={0}
        saving={false}
        saveError={null}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('id="portal-guide-title"');
    expect(html).toContain('Cuatro lugares, y ya puedes estudiar');
    expect(html).toContain('Paso 1 de 5');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('Saltar');
    expect(html).toContain('Siguiente');

    // Atrás button must be disabled on step 1
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-disabled="true"[^>]*>Atrás<\/button>/);
  });

  it('renders final action label on step 5 instead of Siguiente', () => {
    const html = renderToStaticMarkup(
      <StudentPortalGuide
        open={true}
        courseState="active"
        finalActionLabel="Continuar: Conducción Nerviosa"
        onBack={() => undefined}
        onNext={() => undefined}
        onSkip={() => undefined}
        onFinish={() => undefined}
        stepIndex={4}
        saving={false}
        saveError={null}
      />
    );

    expect(html).toContain('Continuar: Conducción Nerviosa');
    expect(html).not.toContain('>Siguiente<');
    expect(html).toContain('Paso 5 de 5');
  });

  it('displays role="alert" when saveError is provided', () => {
    const html = renderToStaticMarkup(
      <StudentPortalGuide
        open={true}
        courseState="active"
        finalActionLabel="Empezar: Módulo 1"
        onBack={() => undefined}
        onNext={() => undefined}
        onSkip={() => undefined}
        onFinish={() => undefined}
        stepIndex={0}
        saving={false}
        saveError="Network timeout error"
      />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('No se pudo guardar. La guía volverá a aparecer la próxima vez.');
    expect(html).toContain('Network timeout error');
  });

  it('renders an image when the step includes one', () => {
    const html = renderToStaticMarkup(
      <StudentPortalGuide
        open={true}
        courseState="active"
        finalActionLabel="Empezar"
        onBack={() => undefined}
        onNext={() => undefined}
        onSkip={() => undefined}
        onFinish={() => undefined}
        stepIndex={0}
        saving={false}
        saveError={null}
        steps={[
          {
            id: 'foto',
            kicker: 'Bienvenida',
            title: 'Así se ve el portal',
            body: 'Esta es la primera pantalla.',
            media: [
              {
                kind: 'image',
                src: 'https://images.unsplash.com/photo-1.jpg',
                alt: 'Portada del curso',
              },
            ],
          },
        ]}
      />
    );

    expect(html).toContain('Así se ve el portal');
    expect(html).toContain('alt="Portada del curso"');
    expect(html).toContain('Paso 1 de 1');
  });

  it('shows the first photo of a carousel and keeps videos and links beside it', () => {
    const html = renderToStaticMarkup(
      <StudentPortalGuide
        open={true}
        courseState="active"
        finalActionLabel="Empezar"
        onBack={() => undefined}
        onNext={() => undefined}
        onSkip={() => undefined}
        onFinish={() => undefined}
        stepIndex={0}
        saving={false}
        saveError={null}
        steps={[
          {
            id: 'mix',
            kicker: 'Bienvenida',
            title: 'Recorrido',
            body: 'Fotos, un video y un enlace.',
            media: [
              { kind: 'image', src: 'https://images.unsplash.com/photo-1.jpg', alt: 'Primera pantalla' },
              { kind: 'image', src: 'https://images.unsplash.com/photo-2.jpg', alt: 'Segunda pantalla' },
              { kind: 'video', src: 'https://www.youtube.com/embed/dQw4w9WgXcQ', alt: 'Clase en video' },
              { kind: 'link', href: 'https://example.com/guia', label: 'Guía externa' },
            ],
          },
        ]}
      />
    );

    expect(html).toContain('alt="Primera pantalla"');
    expect(html).not.toContain('alt="Segunda pantalla"');
    expect(html).toContain('1 de 2');
    expect(html).toContain('Foto siguiente');
    expect(html).toContain('Clase en video');
    expect(html).toContain('Guía externa');
  });
});
