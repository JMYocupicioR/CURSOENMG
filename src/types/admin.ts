import type { EnrollmentStatus } from './database';

export interface AdminProfileRow {
  id: string;
  email: string;
  display_name: string;
  credentials: string | null;
  institution: string | null;
  academic_institution?: string | null;
  specialty: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean;
  show_in_editorial_committee: boolean;
  cedula_profesional: string | null;
  residency_year?: string | null;
  comefyr_member_id?: string | null;
  verified_at: string | null;
  enrollment_status: EnrollmentStatus;
  enrollment_verified_at: string | null;
  enrollment_requested_at: string | null;
  created_at: string;
  roles: string[];
  has_premium: boolean;
  cedula_verified?: boolean | null;
  cedula_data?: Record<string, any> | null;
  subspecialty?: string | null;
  specialty_cedula?: string | null;
  cmmr_certified?: boolean | null;
  cmmr_number?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  orcid_id?: string | null;
  clinical_interests?: string[] | null;
  admin_notes?: string | null;
  agreements_signed?: boolean | null;
  agreement_bundle_version?: string | null;
}

export interface AdminStats {
  pending_users: number;
  verified_users: number;
  pending_enrollments: number;
  pending_course_enrollments?: number;
  enrolled_physicians: number;
  premium_users: number;
  pending_revisions: number;
  published_topics: number;
  published_quizzes: number;
  quiz_attempts_total: number;
  approved_revisions: number;
  upcoming_workshops: number;
  total_workshops: number;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminQuizAttemptRow {
  id: string;
  user_id?: string | null;
  user_email: string;
  display_name: string;
  module_id: string;
  topic_id: string;
  score: number;
  passed: boolean;
  duration_seconds: number | null;
  completed_at: string;
}
