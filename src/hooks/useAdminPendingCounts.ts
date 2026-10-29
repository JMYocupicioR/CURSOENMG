import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAdminStats } from '../services/editorialService';
import { useAuth } from '../contexts/AuthProvider';

export interface AdminPendingCountsData {
  pendingUsers: number;
  pendingEnrollments: number;
  pendingCourseEnrollments: number;
  pendingRevisions: number;
  pendingTeacherReviews: number;
  pendingQuizzes: number;
  totalPending: number;
}

const EMPTY_COUNTS: AdminPendingCountsData = {
  pendingUsers: 0,
  pendingEnrollments: 0,
  pendingCourseEnrollments: 0,
  pendingRevisions: 0,
  pendingTeacherReviews: 0,
  pendingQuizzes: 0,
  totalPending: 0,
};

let cachedCounts: AdminPendingCountsData | null = null;
let lastFetchedAt = 0;
let inFlightPromise: Promise<AdminPendingCountsData> | null = null;
const CACHE_TTL_MS = 30_000; // 30 segundos de caché para deduplicar Header, UserMenu y AdminLayout

/** Invalida la caché local para forzar actualización en la próxima consulta */
export function invalidateAdminPendingCounts() {
  cachedCounts = null;
  lastFetchedAt = 0;
}

async function fetchCounts(): Promise<AdminPendingCountsData> {
  const [statsRes, asgRes, quizzesRes] = await Promise.allSettled([
    getAdminStats(),
    supabase
      .from('student_assignments')
      .select('id, status, target_exam_config')
      .or('status.eq.submitted,target_exam_config->>retakeStatus.eq.requested'),
    supabase.from('published_quizzes').select('id', { count: 'exact', head: true }).eq('clinical_validation_status', 'pending_review'),
  ]);

  let pendingUsers = 0;
  let pendingEnrollments = 0;
  let pendingCourseEnrollments = 0;
  let pendingRevisions = 0;
  if (statsRes.status === 'fulfilled') {
    const s = statsRes.value;
    pendingUsers = s.pending_users ?? 0;
    pendingEnrollments = s.pending_enrollments ?? 0;
    pendingCourseEnrollments = s.pending_course_enrollments ?? 0;
    pendingRevisions = s.pending_revisions ?? 0;
  }

  let pendingTeacherReviews = 0;
  if (asgRes.status === 'fulfilled' && asgRes.value.data) {
    pendingTeacherReviews = (asgRes.value.data as any[]).reduce((sum, assignment) => {
      const submitted = assignment.status === 'submitted' ? 1 : 0;
      const retake = assignment.target_exam_config?.retakeStatus === 'requested' ? 1 : 0;
      return sum + submitted + retake;
    }, 0);
  }

  let pendingQuizzes = 0;
  if (quizzesRes.status === 'fulfilled' && quizzesRes.value.count != null) {
    pendingQuizzes = quizzesRes.value.count;
  }

  const totalPending = pendingEnrollments + pendingCourseEnrollments + pendingRevisions + pendingTeacherReviews + pendingQuizzes;

  return {
    pendingUsers,
    pendingEnrollments,
    pendingCourseEnrollments,
    pendingRevisions,
    pendingTeacherReviews,
    pendingQuizzes,
    totalPending,
  };
}

export function useAdminPendingCounts() {
  const { isAdmin, isEditor } = useAuth();
  const [counts, setCounts] = useState<AdminPendingCountsData>(() => cachedCounts ?? EMPTY_COUNTS);

  useEffect(() => {
    if (!isSupabaseConfigured || (!isAdmin && !isEditor)) return;

    let isMounted = true;
    const now = Date.now();

    // Si ya tenemos datos frescos en caché, asignamos y salimos
    if (cachedCounts && now - lastFetchedAt < CACHE_TTL_MS) {
      setCounts(cachedCounts);
      return;
    }

    // Deduplicar llamadas en vuelo cuando Header, UserMenu y AdminLayout montan juntos
    if (!inFlightPromise) {
      inFlightPromise = fetchCounts()
        .then((data) => {
          cachedCounts = data;
          lastFetchedAt = Date.now();
          return data;
        })
        .finally(() => {
          inFlightPromise = null;
        });
    }

    inFlightPromise
      .then((data) => {
        if (isMounted) setCounts(data);
      })
      .catch(() => {
        if (isMounted && !cachedCounts) setCounts(EMPTY_COUNTS);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, isEditor]);

  return counts;
}
