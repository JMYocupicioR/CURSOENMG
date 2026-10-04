import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAdminStats } from '../services/editorialService';
import { useAuth } from '../contexts/AuthProvider';

export function useAdminPendingCounts() {
  const { isAdmin, isEditor } = useAuth();
  const [pendingUsers, setPendingUsers] = useState(0);
  const [pendingEnrollments, setPendingEnrollments] = useState(0);
  const [pendingCourseEnrollments, setPendingCourseEnrollments] = useState(0);
  const [pendingRevisions, setPendingRevisions] = useState(0);
  const [pendingTeacherReviews, setPendingTeacherReviews] = useState(0);
  const [pendingQuizzes, setPendingQuizzes] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || (!isAdmin && !isEditor)) return;

    let isMounted = true;

    getAdminStats()
      .then((s) => {
        if (!isMounted) return;
        setPendingUsers(s.pending_users);
        setPendingEnrollments(s.pending_enrollments ?? 0);
        setPendingCourseEnrollments(s.pending_course_enrollments ?? 0);
        setPendingRevisions(s.pending_revisions);
      })
      .catch(() => {
        if (!isMounted) return;
        setPendingUsers(0);
        setPendingEnrollments(0);
        setPendingCourseEnrollments(0);
        setPendingRevisions(0);
      });

    Promise.resolve(
      supabase
        .from('student_assignments')
        .select('id, status, target_exam_config')
    )
      .then(({ data }) => {
        if (!isMounted || !data) return;
        const pendingCount = (data as any[]).reduce((sum, assignment) => {
          const submitted = assignment.status === 'submitted' ? 1 : 0;
          const retake = assignment.target_exam_config?.retakeStatus === 'requested' ? 1 : 0;
          return sum + submitted + retake;
        }, 0);
        setPendingTeacherReviews(pendingCount);
      })
      .catch(() => {
        if (!isMounted) return;
        setPendingTeacherReviews(0);
      });

    Promise.resolve(
      supabase
        .from('published_quizzes')
        .select('id', { count: 'exact', head: true })
        .eq('clinical_validation_status', 'pending_review')
    )
      .then(({ count }) => {
        if (!isMounted) return;
        setPendingQuizzes(count ?? 0);
      })
      .catch(() => {
        if (!isMounted) return;
        setPendingQuizzes(0);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, isEditor]);

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
