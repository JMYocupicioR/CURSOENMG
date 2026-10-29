import { supabase, sb } from '../lib/supabase';
import type { StudentNotification, NotificationColorTone } from './studentService';
import {
  submissionFileError,
  submissionFileExtension,
  submissionFileMime,
  submissionLinkError,
  SUBMISSION_MAX_ITEMS,
} from '../utils/submissionLinks';

export const STUDENT_SUBMISSIONS_BUCKET = 'student-submissions';

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  kind: 'file' | 'link';
  storage_path?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  byte_size?: number | null;
  link_url?: string | null;
  link_label?: string | null;
  created_at: string;
}

export interface ServerStudentNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  severity: NotificationColorTone;
  link_url?: string | null;
  source_key: string;
  is_read: boolean;
  created_at: string;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function listAssignmentSubmissions(assignmentId: string): Promise<AssignmentSubmission[]> {
  if (!isUuid(assignmentId)) return [];
  const { data, error } = await supabase
    .from('assignment_submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AssignmentSubmission[];
}

export async function uploadAssignmentFile(
  assignmentId: string,
  studentId: string,
  file: File
): Promise<AssignmentSubmission> {
  const validation = submissionFileError(file);
  if (validation) throw new Error(validation);
  if (!isUuid(assignmentId)) throw new Error('La tarea todavía no está en el servidor.');

  const existing = await listAssignmentSubmissions(assignmentId);
  if (existing.length >= SUBMISSION_MAX_ITEMS) {
    throw new Error('Máximo 8 archivos o enlaces por tarea.');
  }

  const mime = submissionFileMime(file);
  const ext = submissionFileExtension(mime);
  const path = `${studentId}/${assignmentId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from(STUDENT_SUBMISSIONS_BUCKET).upload(path, file, {
    contentType: mime,
    upsert: false,
  });
  if (uploadError) {
    const msg = (uploadError.message || '').toLowerCase();
    if (msg.includes('bucket not found') || msg.includes('not found')) {
      throw new Error('El almacenamiento de entregas aún no está activo. Aplica la migración de tareas.');
    }
    if (msg.includes('row-level security') || msg.includes('not authorized') || msg.includes('403')) {
      throw new Error('Esta tarea no admite archivos ahora. Si ya la entregaste, espera una corrección del profesor.');
    }
    throw new Error(uploadError.message);
  }

  const { data, error } = await sb.rpc('register_my_submission_file', {
    p_assignment_id: assignmentId,
    p_storage_path: path,
    p_file_name: file.name,
    p_mime_type: mime,
    p_byte_size: file.size,
  });
  if (error) {
    await supabase.storage.from(STUDENT_SUBMISSIONS_BUCKET).remove([path]);
    throw error;
  }
  return data as AssignmentSubmission;
}

export async function addAssignmentLink(
  assignmentId: string,
  url: string,
  label?: string
): Promise<AssignmentSubmission> {
  const validation = submissionLinkError(url);
  if (validation) throw new Error(validation);
  const { data, error } = await sb.rpc('add_my_submission_link', {
    p_assignment_id: assignmentId,
    p_url: url.trim(),
    p_label: label?.trim() || null,
  });
  if (error) throw error;
  return data as AssignmentSubmission;
}

export async function removeAssignmentSubmission(submission: AssignmentSubmission): Promise<void> {
  const { error } = await sb.rpc('delete_my_submission', { p_submission_id: submission.id });
  if (error) throw error;
  if (submission.kind === 'file' && submission.storage_path) {
    await supabase.storage.from(STUDENT_SUBMISSIONS_BUCKET).remove([submission.storage_path]);
  }
}

export async function signedSubmissionUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STUDENT_SUBMISSIONS_BUCKET)
    .createSignedUrl(storagePath, 60 * 10);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function fetchServerNotifications(userId: string): Promise<ServerStudentNotification[]> {
  const { data, error } = await supabase
    .from('student_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) return [];
  return (data ?? []) as ServerStudentNotification[];
}

export function mergeServerNotifications(
  local: StudentNotification[],
  server: ServerStudentNotification[]
): StudentNotification[] {
  if (server.length === 0) return local;
  const keys = new Set(server.map((row) => row.source_key));
  const localBySourceKey = new Map<string, StudentNotification>();
  for (const item of local) {
    if (item.id.startsWith('notif_asg_reviewed_')) {
      const assignmentId = item.id.slice('notif_asg_reviewed_'.length);
      localBySourceKey.set(`assignment_grade:${assignmentId}`, item);
    } else if (item.id.startsWith('notif_asg_')) {
      const assignmentId = item.id.slice('notif_asg_'.length);
      localBySourceKey.set(`assignment:${assignmentId}`, item);
    }
  }
  const kept = local.filter((item) => {
    if (item.id.startsWith('notif_asg_reviewed_')) {
      const assignmentId = item.id.slice('notif_asg_reviewed_'.length);
      return ![...keys].some((key) => key.startsWith(`assignment_grade:${assignmentId}`));
    }
    if (item.id.startsWith('notif_asg_')) {
      const assignmentId = item.id.slice('notif_asg_'.length);
      return !keys.has(`assignment:${assignmentId}`);
    }
    return true;
  });
  const mapped: StudentNotification[] = server.map((row) => {
    const matchedLocal =
      localBySourceKey.get(row.source_key) ??
      (row.source_key.startsWith('assignment_grade:')
        ? localBySourceKey.get(row.source_key.split(':').slice(0, 2).join(':'))
        : undefined);
    const nextNotification: StudentNotification = {
      id: row.id,
      title: row.title,
      message: row.message,
      type: 'academic',
      severity: matchedLocal?.severity ?? row.severity,
      createdAt: row.created_at,
      linkUrl: row.link_url || '/portal?tab=assignments',
      isRead: row.is_read,
    };
    if (matchedLocal?.dueDate) {
      nextNotification.dueDate = matchedLocal.dueDate;
    }
    return nextNotification;
  });
  return [...mapped, ...kept].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function markServerNotificationRead(notificationId: string): Promise<void> {
  if (!isUuid(notificationId)) return;
  await supabase.from('student_notifications').update({ is_read: true }).eq('id', notificationId);
}

export async function markAllServerNotificationsRead(userId: string): Promise<void> {
  await supabase.from('student_notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
}
