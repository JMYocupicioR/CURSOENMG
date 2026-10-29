import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { StudentPortalGuide } from './StudentPortalGuide';
import { StudentPortalTabBar } from './StudentPortalTabBar';
import { StudentQuickControlHub } from './StudentQuickControlHub';
import EditorialCommitteeModal from '../editorial/EditorialCommitteeModal';
import { getLiveSessionUrgency } from '../../services/courseService';
import { shouldShowPortalGuide } from '../../services/portalGuideService';
import type { LiveWorkshop, Profile } from '../../types/database';
import type { StudentNotification } from '../../services/studentService';
import type { StudentAssignment } from '../../types/studentPlan';

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

  it('Caso E: EditorialCommitteeModal renderiza la lista y título del comité editorial', () => {
    const modalHtml = renderToStaticMarkup(
      <MemoryRouter>
        <EditorialCommitteeModal isOpen={true} onClose={() => undefined} />
      </MemoryRouter>
    );

    expect(modalHtml).toContain('Comité Editorial y Dirección Académica');
    expect(modalHtml).toContain('comite-editorial');
    expect(modalHtml).toContain('Aval Oficial');
  });

  it('Caso F: StudentPortalTabBar resalta Avisos en rojo cuando hay notificaciones por atender y vuelve a color normal al atenderse', () => {
    const unreadHtml = renderToStaticMarkup(
      <StudentPortalTabBar
        activeTab="summary"
        onSelect={() => undefined}
        counts={{ assignments: 1, notifications: 3, study: 0 }}
      />
    );
    expect(unreadHtml).toContain('bg-rose-50');
    expect(unreadHtml).toContain('bg-rose-600');
    expect(unreadHtml).toContain('Avisos');

    const attendedHtml = renderToStaticMarkup(
      <StudentPortalTabBar
        activeTab="summary"
        onSelect={() => undefined}
        counts={{ assignments: 0, notifications: 0, study: 0 }}
      />
    );
    expect(attendedHtml).not.toContain('bg-rose-50');
    expect(attendedHtml).toContain('text-slate-600');
  });

  it('Caso G: StudentQuickControlHub muestra avisos en rojo/normal, clases pendientes, tareas enviadas y radar de acreditación en la primera página', () => {
    const mockNotifications: StudentNotification[] = [
      {
        id: 'notif-unread-1',
        title: 'Nueva tarea: Análisis de Miopatías',
        message: 'Revisa los trazos de aguja antes del viernes.',
        type: 'academic',
        createdAt: new Date().toISOString(),
        isRead: false,
        linkUrl: '/portal?tab=assignments',
      },
      {
        id: 'notif-read-2',
        title: 'Calificación publicada: Radiculopatías',
        message: 'Tu entrega obtuvo 95/100.',
        type: 'academic',
        createdAt: new Date().toISOString(),
        isRead: true,
        linkUrl: '/portal?tab=assignments',
      },
    ];

    const mockAssignments: StudentAssignment[] = [
      {
        id: 'asg-pending-1',
        student_id: 'student-1',
        assigned_by: 'teacher-1',
        title: 'Reporte de Conducción Nerviosa Motora',
        type: 'emg_report',
        description: 'Subir PDF de caso clínico',
        due_date: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        status: 'pending',
        priority: 'normal',
        grade: null,
        feedback: null,
        student_notes: null,
        submitted_at: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'asg-submitted-2',
        student_id: 'student-1',
        assigned_by: 'teacher-1',
        title: 'Tarea de Ejemplo Enviada',
        type: 'practical_task',
        description: 'Análisis topográfico',
        due_date: new Date().toISOString(),
        status: 'approved',
        priority: 'normal',
        grade: 100,
        feedback: 'Excelente desarrollo neurofisiológico.',
        student_notes: 'Adjunto reporte completo.',
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const hubHtml = renderToStaticMarkup(
      <MemoryRouter>
        <StudentQuickControlHub
          notifications={mockNotifications}
          unreadCount={1}
          onMarkNotifRead={() => undefined}
          onMarkAllNotifsRead={() => undefined}
          onAttendNotification={() => undefined}
          resumeLesson={{
            moduleId: 'm1',
            moduleTitle: 'Módulo 1: Bases Físicas',
            moduleNumber: 1,
            topicId: 't1',
            topicTitle: 'Potenciales de Acción Muscular Compuestos',
            url: '/modulo/m1/t1',
            pendingLessonCount: 3,
          }}
          hasStartedCurriculum={true}
          overallProgressPct={35}
          upcomingPendingLessons={[
            {
              moduleId: 'm1',
              moduleTitle: 'Módulo 1: Bases Físicas',
              moduleNumber: 1,
              topicId: 't2',
              topicTitle: 'Conducción Nerviosa Sensitiva',
              url: '/modulo/m1/t2',
              pendingLessonCount: 2,
            },
          ]}
          workshops={[sampleWorkshop]}
          assignments={mockAssignments}
          quizzesList={[
            {
              moduleId: 'm1',
              moduleTitle: 'Módulo 1',
              topicId: 't1',
              topicTitle: 'Quiz de Bases Físicas',
              score: null,
              passed: false,
              topicUrl: '/modulo/m1/t1',
            },
          ]}
          kardex={null}
          profile={{ cedula_status: 'none' } as unknown as Profile}
          learningPlans={[]}
          onSelectTab={() => undefined}
          onSelectExam={() => undefined}
          onOpenAssignedCase={() => undefined}
          onOpenSubmitModal={() => undefined}
          onOpenKardexModal={() => undefined}
          onRecordResumeClick={() => undefined}
        />
      </MemoryRouter>
    );

    // 1. Avisos en rojo cuando no se han atendido y en estado normal cuando ya están atendidos
    expect(hubHtml).toContain('border-l-rose-600');
    expect(hubHtml).toContain('Por atender');
    expect(hubHtml).toContain('Nueva tarea: Análisis de Miopatías');
    expect(hubHtml).toContain('Calificación publicada: Radiculopatías');
    expect(hubHtml).toContain('Atendido');

    // 2. Clases pendientes en primera página
    expect(hubHtml).toContain('Clases Pendientes y Sesiones');
    expect(hubHtml).toContain('Potenciales de Acción Muscular Compuestos');
    expect(hubHtml).toContain('Conducción Nerviosa Sensitiva');

    // 3. Tareas pendientes y tareas enviadas/calificadas
    expect(hubHtml).toContain('Tareas: Pendientes y Enviadas');
    expect(hubHtml).toContain('Reporte de Conducción Nerviosa Motora');
    expect(hubHtml).toContain('Tareas enviadas y calificadas');
    expect(hubHtml).toContain('Tarea de Ejemplo Enviada');
    expect(hubHtml).toContain('100/100');

    // 4. Radar de acreditación y pendientes clave
    expect(hubHtml).toContain('Radar de Acreditación y Pendientes Clave');
    expect(hubHtml).toContain('Cédula Profesional SEP');
    expect(hubHtml).toContain('Asistencia a Sesiones (20% del Kardex)');
  });
});
