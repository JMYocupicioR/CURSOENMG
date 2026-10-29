import { sb as supabase } from '../lib/supabase';
import { reviewSm2, type Sm2Quality } from '../utils/sm2';

export interface LessonNote {
  id: string;
  topic_id: string;
  module_id: string;
  body: string;
  updated_at: string;
}

export interface LessonBookmark {
  id: string;
  topic_id: string;
  module_id: string;
  url: string;
  title: string | null;
  created_at: string;
}

export interface Flashcard {
  id: string;
  topic_id: string;
  front: string;
  back: string;
  due_at: string;
  interval_days: number;
  ease: number;
  repetitions?: number;
  source?: string;
}

export interface QaThread {
  id: string;
  student_id: string;
  module_id: string | null;
  topic_id: string | null;
  title: string;
  body: string;
  status: 'open' | 'answered' | 'closed';
  visibility?: 'private' | 'cohort';
  page_url?: string | null;
  created_at: string;
}

export interface TopicDiscussionAuthor {
  user_id: string;
  display_name: string;
  is_staff: boolean;
}

export interface TopicCommentNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: 'info' | 'success' | 'warning';
  link_url: string | null;
  source_key: string;
  is_read: boolean;
  created_at: string;
}

export interface QaReply {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface EmgReportSubmission {
  id: string;
  student_id: string;
  assignment_id: string | null;
  title: string;
  file_url: string | null;
  interpretation: Record<string, unknown> | string | null;
  rubric?: Record<string, unknown> | null;
  rubric_score?: number | null;
  feedback: string | null;
  status: string;
  created_at: string;
}

export interface AcademicCertificate {
  id: string;
  user_id: string;
  folio: string;
  issued_at: string;
  overall_progress_pct: number;
  average_score: number;
  verification_code: string;
  revoked_at: string | null;
  course_id?: string | null;
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function getLessonNote(topicId: string): Promise<LessonNote | null> {
  const { data, error } = await supabase
    .from('student_lesson_notes')
    .select('*')
    .eq('topic_id', topicId)
    .maybeSingle();
  throwIfError(error);
  return (data as LessonNote | null) ?? null;
}

export async function listMyLessonNotes(): Promise<LessonNote[]> {
  const { data, error } = await supabase
    .from('student_lesson_notes')
    .select('*')
    .order('updated_at', { ascending: false });
  throwIfError(error);
  return (data ?? []) as LessonNote[];
}

export async function upsertLessonNote(input: {
  topicId: string;
  moduleId: string;
  body: string;
}): Promise<LessonNote> {
  const { data: sessionData } = await supabase.auth.getUser();
  const userId = sessionData.user?.id;
  if (!userId) throw new Error('Debe iniciar sesión para guardar apuntes.');
  const { data, error } = await supabase
    .from('student_lesson_notes')
    .upsert(
      {
        user_id: userId,
        topic_id: input.topicId,
        module_id: input.moduleId,
        body: input.body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,topic_id' }
    )
    .select()
    .single();
  throwIfError(error);
  return data as LessonNote;
}

export async function listBookmarks(): Promise<LessonBookmark[]> {
  const { data, error } = await supabase
    .from('student_bookmarks')
    .select('*')
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []) as LessonBookmark[];
}

export async function toggleBookmark(input: {
  topicId: string;
  moduleId: string;
  url: string;
  title?: string;
}): Promise<boolean> {
  const { data: existing } = await supabase
    .from('student_bookmarks')
    .select('id')
    .eq('topic_id', input.topicId)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supabase.from('student_bookmarks').delete().eq('id', existing.id);
    throwIfError(error);
    return false;
  }
  const { data: sessionData } = await supabase.auth.getUser();
  const userId = sessionData.user?.id;
  if (!userId) throw new Error('Debe iniciar sesión para guardar marcadores.');
  const { error } = await supabase.from('student_bookmarks').insert({
    user_id: userId,
    topic_id: input.topicId,
    module_id: input.moduleId,
    url: input.url,
    title: input.title ?? null,
  });
  throwIfError(error);
  return true;
}

export async function listDueFlashcards(limit = 20): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from('student_flashcards')
    .select('*')
    .lte('due_at', new Date().toISOString())
    .order('due_at', { ascending: true })
    .limit(limit);
  throwIfError(error);
  return (data ?? []) as Flashcard[];
}

export async function createFlashcard(input: {
  topicId: string;
  front: string;
  back: string;
  source?: string;
}): Promise<Flashcard> {
  const { data: sessionData } = await supabase.auth.getUser();
  const userId = sessionData.user?.id;
  if (!userId) throw new Error('Debe iniciar sesión.');
  const { data, error } = await supabase
    .from('student_flashcards')
    .insert({
      user_id: userId,
      topic_id: input.topicId,
      front: input.front,
      back: input.back,
      source: input.source ?? 'manual',
    })
    .select()
    .single();
  throwIfError(error);
  return data as Flashcard;
}

export async function createFlashcardsFromLesson(input: {
  topicId: string;
  pearls?: string[];
  keyPoints?: string[];
}): Promise<number> {
  const existing = await supabase
    .from('student_flashcards')
    .select('front')
    .eq('topic_id', input.topicId);
  throwIfError(existing.error);
  const known = new Set(((existing.data ?? []) as { front: string }[]).map((row) => row.front.trim()));
  const pairs: { front: string; back: string }[] = [];
  for (const pearl of input.pearls ?? []) {
    const text = pearl.trim();
    if (!text || known.has(text)) continue;
    pairs.push({ front: text, back: 'Perla clínica — explique el correlato EDX y la consecuencia práctica.' });
    known.add(text);
  }
  for (const point of input.keyPoints ?? []) {
    const text = point.trim();
    if (!text || known.has(text)) continue;
    pairs.push({ front: text, back: 'Punto clave — recuerde el criterio técnico o diagnóstico asociado.' });
    known.add(text);
  }
  let created = 0;
  for (const pair of pairs) {
    await createFlashcard({ topicId: input.topicId, front: pair.front, back: pair.back, source: 'lesson' });
    created += 1;
  }
  return created;
}

export async function reviewFlashcard(id: string, quality: Sm2Quality | boolean): Promise<void> {
  const { data } = await supabase.from('student_flashcards').select('*').eq('id', id).maybeSingle();
  if (!data) return;
  const card = data as Flashcard;
  const grade: Sm2Quality = typeof quality === 'boolean' ? (quality ? 4 : 1) : quality;
  const next = reviewSm2(
    {
      intervalDays: card.interval_days || 1,
      ease: Number(card.ease || 2.5),
      repetitions: card.repetitions || 0,
    },
    grade
  );
  const { error } = await supabase
    .from('student_flashcards')
    .update({
      interval_days: next.intervalDays,
      ease: next.ease,
      repetitions: next.repetitions,
      due_at: next.dueAt,
    })
    .eq('id', id);
  throwIfError(error);
}

export async function listQaThreads(): Promise<QaThread[]> {
  const { data, error } = await supabase
    .from('student_qa_threads')
    .select('*')
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []) as QaThread[];
}

export async function createQaThread(input: {
  title: string;
  body: string;
  moduleId?: string;
  topicId?: string;
  visibility?: 'private' | 'cohort';
}): Promise<QaThread> {
  const { data: sessionData } = await supabase.auth.getUser();
  const userId = sessionData.user?.id;
  if (!userId) throw new Error('Debe iniciar sesión.');
  const { data, error } = await supabase
    .from('student_qa_threads')
    .insert({
      student_id: userId,
      title: input.title,
      body: input.body,
      module_id: input.moduleId ?? null,
      topic_id: input.topicId ?? null,
      visibility: input.visibility ?? 'private',
    })
    .select()
    .single();
  throwIfError(error);
  return data as QaThread;
}

export async function listQaReplies(threadId: string): Promise<QaReply[]> {
  const { data, error } = await supabase
    .from('student_qa_replies')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  throwIfError(error);
  return (data ?? []) as QaReply[];
}

export async function replyQaThread(threadId: string, body: string): Promise<QaReply> {
  const { data: sessionData } = await supabase.auth.getUser();
  const userId = sessionData.user?.id;
  if (!userId) throw new Error('Debe iniciar sesión.');
  const { data, error } = await supabase
    .from('student_qa_replies')
    .insert({ thread_id: threadId, author_id: userId, body })
    .select()
    .single();
  throwIfError(error);
  return data as QaReply;
}

function threadTitleFromBody(body: string): string {
  const compact = body.replace(/\s+/g, ' ').trim();
  return compact.length <= 80 ? compact : `${compact.slice(0, 79).trimEnd()}…`;
}

export async function listTopicThreads(topicId: string): Promise<QaThread[]> {
  const { data, error } = await supabase
    .from('student_qa_threads')
    .select('*')
    .eq('topic_id', topicId)
    .eq('visibility', 'cohort')
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []) as QaThread[];
}

export async function listQaRepliesForThreads(threadIds: string[]): Promise<QaReply[]> {
  if (threadIds.length === 0) return [];
  const { data, error } = await supabase
    .from('student_qa_replies')
    .select('*')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: true });
  throwIfError(error);
  return (data ?? []) as QaReply[];
}

export async function createTopicThread(input: {
  body: string;
  moduleId: string;
  topicId: string;
  pageUrl: string;
}): Promise<QaThread> {
  const { data: sessionData } = await supabase.auth.getUser();
  const userId = sessionData.user?.id;
  if (!userId) throw new Error('Debe iniciar sesión.');
  const body = input.body.trim();
  if (!body) throw new Error('Escribe un comentario.');
  const row = {
    student_id: userId,
    title: threadTitleFromBody(body),
    body,
    module_id: input.moduleId,
    topic_id: input.topicId,
    visibility: 'cohort' as const,
    page_url: input.pageUrl.slice(0, 500),
  };
  let { data, error } = await supabase.from('student_qa_threads').insert(row).select().single();
  if (error && /page_url/i.test(error.message)) {
    const { page_url: _pageUrl, ...withoutUrl } = row;
    ({ data, error } = await supabase.from('student_qa_threads').insert(withoutUrl).select().single());
  }
  throwIfError(error);
  return data as QaThread;
}

export async function listTopicDiscussionDirectory(topicId: string): Promise<TopicDiscussionAuthor[]> {
  const { data, error } = await supabase.rpc('topic_discussion_directory', { p_topic_id: topicId });
  throwIfError(error);
  return (data ?? []) as TopicDiscussionAuthor[];
}

export async function deleteQaThread(threadId: string): Promise<void> {
  const { error } = await supabase.from('student_qa_threads').delete().eq('id', threadId);
  throwIfError(error);
}

export async function deleteQaReply(replyId: string): Promise<void> {
  const { error } = await supabase.from('student_qa_replies').delete().eq('id', replyId);
  throwIfError(error);
}

export async function updateQaThreadStatus(
  threadId: string,
  status: QaThread['status']
): Promise<QaThread> {
  const { data, error } = await supabase
    .from('student_qa_threads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', threadId)
    .select()
    .single();
  throwIfError(error);
  return data as QaThread;
}

export async function listOpenCohortThreads(): Promise<QaThread[]> {
  const { data, error } = await supabase
    .from('student_qa_threads')
    .select('*')
    .eq('visibility', 'cohort')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(80);
  throwIfError(error);
  return (data ?? []) as QaThread[];
}

export async function listMyCommentNotifications(): Promise<TopicCommentNotification[]> {
  const { data: sessionData } = await supabase.auth.getUser();
  const userId = sessionData.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('student_notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'topic_comment')
    .order('created_at', { ascending: false })
    .limit(40);
  throwIfError(error);
  return (data ?? []) as TopicCommentNotification[];
}

export async function markCommentNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('student_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  throwIfError(error);
}

export function subscribeToMyCommentNotifications(
  userId: string,
  onChange: (row: TopicCommentNotification) => void
): () => void {
  if (!userId) return () => undefined;
  const channel = supabase
    .channel(`topic-comments-${userId}-${Math.random().toString(36).slice(2, 7)}`)
    .on(
      'postgres_changes' as never,
      {
        event: '*',
        schema: 'public',
        table: 'student_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload: { new: TopicCommentNotification }) => {
        const row = payload.new;
        if (!row?.id || row.type !== 'topic_comment') return;
        onChange(row);
      }
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function submitEmgReport(input: {
  title: string;
  fileUrl?: string;
  interpretation: string;
  assignmentId?: string;
}): Promise<EmgReportSubmission> {
  const { data: sessionData } = await supabase.auth.getUser();
  const userId = sessionData.user?.id;
  if (!userId) throw new Error('Debe iniciar sesión.');
  const { data, error } = await supabase
    .from('emg_report_submissions')
    .insert({
      student_id: userId,
      title: input.title,
      file_url: input.fileUrl ?? null,
      interpretation: { narrative: input.interpretation },
      assignment_id: input.assignmentId ?? null,
      status: 'submitted',
    })
    .select()
    .single();
  throwIfError(error);
  return data as EmgReportSubmission;
}

export async function listEmgReports(): Promise<EmgReportSubmission[]> {
  const { data, error } = await supabase
    .from('emg_report_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []) as EmgReportSubmission[];
}

export async function issueMyCertificate(courseId?: string | null): Promise<AcademicCertificate> {
  const { data, error } = courseId
    ? await supabase.rpc('issue_my_certificate', { p_course_id: courseId })
    : await supabase.rpc('issue_my_certificate');
  throwIfError(error);
  return data as AcademicCertificate;
}

export async function getMyCertificates(): Promise<AcademicCertificate[]> {
  const { data, error } = await supabase
    .from('academic_certificates')
    .select('*')
    .is('revoked_at', null)
    .order('issued_at', { ascending: false });
  throwIfError(error);
  return (data ?? []) as AcademicCertificate[];
}

export async function getMyCertificate(courseId?: string | null): Promise<AcademicCertificate | null> {
  const rows = await getMyCertificates();
  if (courseId) return rows.find((row) => row.course_id === courseId) ?? null;
  return rows[0] ?? null;
}

export async function downloadCertificateDocument(
  cert: AcademicCertificate,
  _displayName: string
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !token) throw new Error('Debe iniciar sesión para descargar la constancia.');

  const res = await fetch(`${url}/functions/v1/issue-certificate-pdf`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ folio: cert.folio }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: 'No se pudo generar el PDF' }));
    throw new Error(payload.error || 'No se pudo generar el PDF');
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `constancia-${cert.folio}.pdf`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export async function verifyCertificate(folio: string): Promise<{
  valid: boolean;
  folio?: string;
  issued_at?: string;
  display_name?: string;
  revoked?: boolean;
  course_id?: string | null;
  course_title?: string | null;
}> {
  const { data, error } = await supabase.rpc('verify_certificate', { p_folio: folio });
  throwIfError(error);
  return (data ?? { valid: false }) as { valid: boolean };
}

export async function savePushSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  const { data: sessionData } = await supabase.auth.getUser();
  const userId = sessionData.user?.id;
  if (!userId) throw new Error('Debe iniciar sesión.');
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint ?? '',
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
    { onConflict: 'endpoint' }
  );
  throwIfError(error);
}

export function buildCalendarUrls(event: {
  title: string;
  details?: string;
  startIso: string;
  endIso: string;
}): { google: string; outlook: string; ics: string } {
  const start = event.startIso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = event.endIso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const text = encodeURIComponent(event.title);
  const details = encodeURIComponent(event.details ?? '');
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${text}&startdt=${encodeURIComponent(event.startIso)}&enddt=${encodeURIComponent(event.endIso)}&body=${details}`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.details ?? ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return { google, outlook, ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` };
}

export async function sendAcademicPush(input: {
  title: string;
  body: string;
  userId?: string;
  url?: string;
}): Promise<{ sent: number; failed: number; queued: number }> {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: input,
  });
  throwIfError(error);
  return (data ?? { sent: 0, failed: 0, queued: 0 }) as {
    sent: number;
    failed: number;
    queued: number;
  };
}

export async function getEmgReportForAssignment(assignmentId: string): Promise<EmgReportSubmission | null> {
  const { data, error } = await supabase
    .from('emg_report_submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  return (data as EmgReportSubmission | null) ?? null;
}

export async function gradeEmgReport(input: {
  reportId: string;
  rubric: Record<string, number>;
  score: number;
  feedback?: string;
}): Promise<EmgReportSubmission> {
  const { data, error } = await supabase.rpc('grade_emg_report', {
    p_report_id: input.reportId,
    p_rubric: input.rubric,
    p_score: input.score,
    p_feedback: input.feedback ?? null,
  });
  throwIfError(error);
  return data as EmgReportSubmission;
}
