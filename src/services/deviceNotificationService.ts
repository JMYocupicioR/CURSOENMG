import { supabase } from '../lib/supabase';
import type { StudentAssignment } from '../types/studentPlan';

const KEY_DEVICE_NOTIFS_ENABLED = 'neurosafe_device_notifs_enabled_';
const KEY_NOTIFIED_ASSIGNMENTS = 'neurosafe_notified_asgs_';
const KEY_URGENT_NOTIFIED_DATE = 'neurosafe_urgent_asgs_date_';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Checks if the Web Notifications API is supported in the current environment
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Returns the current permission status for device notifications
 */
export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Detects if the current device is running iOS (iPhone, iPad, iPod)
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Detects if the web app is running in Standalone (installed PWA) mode
 */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    ('standalone' in window.navigator && (window.navigator as any).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/**
 * Returns comprehensive diagnostic state of notification and PWA readiness
 */
export function getNotificationDiagnostics(): {
  supported: boolean;
  permission: NotificationPermissionStatus;
  isIOS: boolean;
  isStandalone: boolean;
  needsIOSInstall: boolean;
} {
  const supported = isNotificationSupported();
  const ios = isIOSDevice();
  const standalone = isStandaloneApp();
  // On iOS, Web Push & Notification API requires adding to Home Screen (iOS 16.4+)
  const needsIOSInstall = ios && !standalone;

  return {
    supported,
    permission: getNotificationPermission(),
    isIOS: ios,
    isStandalone: standalone,
    needsIOSInstall,
  };
}

/**
 * Checks whether device notifications are enabled for the current user
 */
export function isDeviceNotificationsEnabled(userId?: string): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  if (!userId) return true;
  const pref = localStorage.getItem(`${KEY_DEVICE_NOTIFS_ENABLED}${userId}`);
  return pref !== 'false';
}

/**
 * Requests device notification permissions from the user
 */
export async function requestNotificationPermission(
  userId?: string,
  role?: 'admin' | 'student'
): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (userId) {
      localStorage.setItem(`${KEY_DEVICE_NOTIFS_ENABLED}${userId}`, permission === 'granted' ? 'true' : 'false');
    }

    if (permission === 'granted') {
      await sendTestNotification(role);
    }

    return permission as NotificationPermissionStatus;
  } catch (error) {
    console.warn('[DeviceNotification] Error requesting permission:', error);
    return getNotificationPermission();
  }
}

/**
 * Sends a native device notification via Service Worker or fallback Notification constructor
 */
export async function sendDeviceNotification({
  title,
  body,
  url = '/dashboard?tab=assignments',
  tag,
  icon = '/icons/icon-192x192.png',
  badge = '/icons/icon-72x72.png',
  requireInteraction = false,
}: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
}): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const notifOptions: NotificationOptions = {
    body,
    icon,
    badge,
    tag: tag || `asg_${Date.now()}`,
    data: { url },
    requireInteraction,
    // vibration pattern: beep-pause-beep for Android/PWA
    ...(typeof navigator !== 'undefined' && 'vibrate' in navigator ? { vibrate: [200, 100, 200] } : {}),
  };

  // 1. Try Service Worker showNotification first (ideal for PWA / mobile background)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, notifOptions);
        return true;
      }
    } catch (e) {
      console.warn('[DeviceNotification] SW showNotification fallback to window Notification:', e);
    }
  }

  // 2. Direct Window Notification fallback
  try {
    const notification = new Notification(title, notifOptions);
    notification.onclick = () => {
      window.focus();
      if (url) {
        window.location.href = url;
      }
      notification.close();
    };
    return true;
  } catch (error) {
    console.warn('[DeviceNotification] Failed to create Notification:', error);
    return false;
  }
}

/**
 * Sends an instant verification test alert to the device
 */
export async function sendTestNotification(role?: 'admin' | 'student'): Promise<boolean> {
  const isAdmin = role === 'admin';
  return sendDeviceNotification({
    title: isAdmin ? 'ElectroDx Docente 🩺' : 'ElectroDx Diplomado 🎓',
    body: isAdmin
      ? '¡Alertas activadas! Recibirás notificaciones de entregas de alumnos, exámenes y admisiones en este dispositivo.'
      : '¡Alertas activadas! Recibirás notificaciones de tus tareas, exámenes y avisos de tus profesores en este dispositivo.',
    url: isAdmin ? '/admin' : '/portal',
    tag: 'test-welcome-alert',
  });
}

/**
 * Sends a notification for a newly assigned task or exam
 */
export async function sendAssignmentDeviceNotification(assignment: StudentAssignment): Promise<boolean> {
  const isExam = assignment.type === 'exam';
  const typeLabel = isExam
    ? 'Examen Asignado'
    : assignment.type === 'clinical_case'
    ? 'Caso Clínico'
    : 'Tarea Asignada';

  const formattedDueDate = new Date(assignment.due_date).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isCase = assignment.type === 'clinical_case';
  const bodyText = isCase
    ? `Caso clínico sin detalles asignado por tu profesor. Fecha de entrega: ${formattedDueDate}. Toca para abrir.`
    : `${assignment.title}. Fecha de entrega: ${formattedDueDate}. Toca para abrir.`;

  return sendDeviceNotification({
    title: `📋 ${typeLabel} de tu Profesor`,
    body: bodyText,
    url: `/dashboard?tab=assignments&asgId=${assignment.id}`,
    tag: `asg-created-${assignment.id}`,
    requireInteraction: true,
  });
}

/**
 * Checks pending assignments and notifies the student if there are unnotified tasks or imminent deadlines
 */
export async function checkAndNotifyPendingAssignments(
  studentId: string,
  assignments: StudentAssignment[]
): Promise<void> {
  if (!isDeviceNotificationsEnabled(studentId)) return;

  const pendingAssignments = assignments.filter((a) => a.status === 'pending');
  if (pendingAssignments.length === 0) return;

  // Track already notified assignment IDs
  let notifiedMap: Record<string, boolean> = {};
  try {
    const raw = localStorage.getItem(`${KEY_NOTIFIED_ASSIGNMENTS}${studentId}`);
    if (raw) notifiedMap = JSON.parse(raw);
  } catch {}

  let updatedMap = false;
  const now = Date.now();

  for (const asg of pendingAssignments) {
    // 1. Notify newly received assignments
    if (!notifiedMap[asg.id]) {
      await sendAssignmentDeviceNotification(asg);
      notifiedMap[asg.id] = true;
      updatedMap = true;
    } else {
      // 2. Deadline warning (due in less than 24h)
      const dueTime = new Date(asg.due_date).getTime();
      const hoursLeft = (dueTime - now) / (1000 * 60 * 60);

      if (hoursLeft > 0 && hoursLeft <= 24) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const urgentKey = `${asg.id}_${todayStr}`;

        try {
          const lastUrgent = localStorage.getItem(`${KEY_URGENT_NOTIFIED_DATE}${studentId}`);
          const urgentMap: Record<string, boolean> = lastUrgent ? JSON.parse(lastUrgent) : {};

          const isCase = asg.type === 'clinical_case';
          const notifTitle = isCase ? 'Caso Clínico' : asg.title;
          const notifBody = isCase
            ? `Tu caso clínico asignado vence en ${Math.round(hoursLeft)} horas (${new Date(asg.due_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}). Toca para resolverlo.`
            : `Vence en ${Math.round(hoursLeft)} horas (${new Date(asg.due_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}). Toca para resolverla.`;

          if (!urgentMap[urgentKey]) {
            await sendDeviceNotification({
              title: `⏳ Entrega Próxima: ${notifTitle}`,
              body: notifBody,
              url: `/dashboard?tab=assignments&asgId=${asg.id}`,
              tag: `asg-urgent-${asg.id}`,
            });
            urgentMap[urgentKey] = true;
            localStorage.setItem(`${KEY_URGENT_NOTIFIED_DATE}${studentId}`, JSON.stringify(urgentMap));
          }
        } catch {}
      }
    }
  }

  if (updatedMap) {
    try {
      localStorage.setItem(`${KEY_NOTIFIED_ASSIGNMENTS}${studentId}`, JSON.stringify(notifiedMap));
    } catch {}
  }
}

/**
 * Subscribes to Realtime database events on student_assignments for the given student
 * Alerts the device instantly when a teacher inserts a new assignment or updates feedback/grade
 */
export function subscribeToRealtimeAssignments(
  studentId: string,
  onAssignmentChange: (assignment: StudentAssignment, eventType: 'INSERT' | 'UPDATE') => void
): () => void {
  if (!studentId || !supabase) {
    return () => {};
  }

  try {
    const channelTopic = `student-asgs-${studentId}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelTopic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_assignments',
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          try {
            const eventType = payload.eventType as 'INSERT' | 'UPDATE';
            const asg = payload.new as StudentAssignment;
            if (!asg) return;

            onAssignmentChange(asg, eventType);

            // If newly inserted by professor, trigger device notification
            if (eventType === 'INSERT' && asg.status === 'pending') {
              void sendAssignmentDeviceNotification(asg);
            }

            // If updated with a grade or review feedback from professor
            if (eventType === 'UPDATE' && asg.grade != null && payload.old && (payload.old as any).grade == null) {
              const displayTitle = asg.type === 'clinical_case' ? 'Caso Clínico' : asg.title;
              void sendDeviceNotification({
                title: `⭐ Calificación Recibida: ${displayTitle}`,
                body: `Tu profesor ha evaluado tu entrega con ${asg.grade}/100 pts. ${asg.feedback ? `Retroalimentación: "${asg.feedback}"` : ''}`,
                url: `/dashboard?tab=assignments`,
                tag: `asg-graded-${asg.id}`,
              });
            }
          } catch (e) {
            console.warn('[DeviceNotification] Error handling realtime payload:', e);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[DeviceNotification] Realtime status ${status}:`, err || 'reconnecting in background');
        }
      });

    return () => {
      try {
        void supabase.removeChannel(channel);
      } catch {}
    };
  } catch (error) {
    console.warn('[DeviceNotification] Failed to create realtime channel:', error);
    return () => {};
  }
}

/**
 * Subscribes teachers/admins to Realtime submissions from all students
 * Sends a native device notification when any student submits an assignment or exam
 */
export function subscribeToAdminRealtimeSubmissions(
  onSubmissionChange: (assignment: StudentAssignment) => void
): () => void {
  if (!supabase) return () => {};

  try {
    const channelTopic = `admin-asgs-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelTopic)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'student_assignments',
        },
        (payload) => {
          try {
            const asg = payload.new as StudentAssignment;
            const oldAsg = payload.old as Partial<StudentAssignment>;
            if (!asg) return;

            // Trigger when a student status transitions to 'submitted'
            if (asg.status === 'submitted' && oldAsg?.status !== 'submitted') {
              onSubmissionChange(asg);

              const displayTitle = asg.type === 'clinical_case' ? 'Caso Clínico' : asg.title;
              void sendDeviceNotification({
                title: `📝 Nueva Entrega de Alumno: ${displayTitle}`,
                body: `Un alumno ha entregado una tarea o caso clínico para su revisión. Toca para calificar.`,
                url: `/admin/alumnos/tareas`,
                tag: `admin-asg-${asg.id}`,
              });
            }
          } catch (e) {
            console.warn('[DeviceNotification] Error handling admin realtime payload:', e);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[DeviceNotification] Admin Realtime status ${status}:`, err || 'reconnecting in background');
        }
      });

    return () => {
      try {
        void supabase.removeChannel(channel);
      } catch {}
    };
  } catch (error) {
    console.warn('[DeviceNotification] Failed to create admin realtime channel:', error);
    return () => {};
  }
}
