export type AppRole = 'contributor' | 'editor' | 'admin' | 'student';
export type RevisionStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested';
export type RevisionAction = 'create' | 'update' | 'delete';
export type EnrollmentStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type AccessTier = 'free' | 'premium';
export type WorkshopStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';
/** Stable slug stored in `courses.id`. Built-in values: principiante, intermedio, avanzado, referencia. */
export type CourseId = string;
export type CourseEnrollmentStatus = 'active' | 'pending' | 'rejected' | 'revoked';

export interface Course {
  id: CourseId;
  title: string;
  description: string;
  sort_order: number;
  price_display: string | null;
  is_active: boolean;
  is_sellable: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface CourseModuleRow {
  module_id: string;
  course_id: CourseId;
  sort_order: number;
  is_visible: boolean;
  updated_at?: string;
  updated_by?: string | null;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: CourseId;
  status: CourseEnrollmentStatus;
  granted_by: string | null;
  granted_at: string | null;
  expires_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  requested_at?: string;
  request_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseWaitlistRow {
  enrollment_id: string;
  user_id: string;
  course_id: CourseId;
  course_title: string;
  status: CourseEnrollmentStatus;
  requested_at: string;
  request_notes: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  granted_at: string | null;
  granted_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  display_name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  residency_year: string | null;
  institution: string | null;
  cedula_profesional: string | null;
  cedula_verified: boolean;
  avatar_url: string | null;
  waitlist_position: number;
}

export interface SyllabusTopicOverride {
  module_id: string;
  topic_id: string;
  sort_order: number;
  is_visible: boolean;
  updated_at?: string;
  updated_by?: string | null;
}

export interface Profile {
  id: string;
  display_name: string;
  credentials: string | null;
  institution: string | null;
  academic_institution?: string | null;
  specialty: string | null;
  residency_year: string | null;
  cedula_profesional: string | null;
  comefyr_member_id: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
  show_in_editorial_committee?: boolean | null;
  verified_at: string | null;
  enrollment_status: EnrollmentStatus;
  enrollment_verified_at: string | null;
  enrollment_requested_at: string | null;
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
  completed_topics?: string[] | null;
  portal_guide_completed_at?: string | null;
  portal_guide_version?: number;
  created_at: string;
  updated_at: string;
}

export type PortalWelcomeAudience = 'all' | 'enrolled' | 'waitlist' | 'no_course';
export type PortalWelcomeMediaKind = 'none' | 'image' | 'video';
export type PortalWelcomeMediaItemKind = 'image' | 'video' | 'link';

export interface PortalWelcomeMediaItem {
  id: string;
  kind: PortalWelcomeMediaItemKind;
  url: string;
  label: string;
}

export interface PortalWelcomeSettings {
  id: number;
  published_version: number;
  published_at: string | null;
  updated_at: string;
}

export interface PortalWelcomeSlide {
  id: string;
  sort_order: number;
  enabled: boolean;
  audience: PortalWelcomeAudience;
  kicker: string;
  title: string;
  body: string;
  detail: string[];
  media_items: PortalWelcomeMediaItem[];
  media_kind: PortalWelcomeMediaKind;
  media_url: string | null;
  media_alt: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  granted_at: string;
}

export interface TopicMedia {
  videoUrls?: { title: string; driveId: string }[];
  youtubeUrls?: { title: string; videoId: string; startTime?: number }[];
  vimeoUrls?: { title: string; videoId: string }[];
  embedUrls?: { title: string; embedUrl: string }[];
  imageUrls?: { src: string; alt: string; caption?: string }[];
  pdfUrls?: { title: string; url: string; description?: string; author?: string }[];
  references?: { authors: string; title: string; journal: string; year: number | string; url?: string }[];
}

import type { QuizQuestionDraft } from './quiz';

export interface RevisionPayload {
  revisionType?: 'topic' | 'module' | 'quiz' | 'clinical_case';
  id?: string;
  slug?: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  content?: string;
  contentEn?: string;
  /** Module-only fields */
  emoji?: string;
  color?: string;
  icon?: string;
  number?: number;
  sortOrder?: number;
  videoUrls?: { title: string; driveId: string }[];
  youtubeUrls?: { title: string; videoId: string; startTime?: number }[];
  vimeoUrls?: { title: string; videoId: string }[];
  embedUrls?: { title: string; embedUrl: string }[];
  imageUrls?: { src: string; alt: string; caption?: string }[];
  pdfUrls?: { title: string; url: string; description?: string; author?: string }[];
  media?: TopicMedia;
  clinicalPearls?: string[];
  clinicalPearlsEn?: string[];
  keyPoints?: string[];
  keyPointsEn?: string[];
  references?: { authors: string; title: string; journal: string; year: number | string; url?: string }[];
  tags?: string[];
  keyTerms?: string[];
  /** Raw video list for editing; normalized to typed arrays on save */
  externalVideos?: { title: string; url: string }[];
  /** Quiz-only fields */
  quizTopicId?: string;
  passScore?: number;
  maxAttempts?: number | null;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  questions?: QuizQuestionDraft[];
  /** Clinical Case only fields */
  clinicalCaseJson?: any;
  clinicalDiagnosis?: string;
  clinicalQuestions?: string[];
}

export interface ContentRevision {
  id: string;
  target_topic_id: string | null;
  module_id: string;
  parent_id: string | null;
  action: RevisionAction;
  payload: RevisionPayload;
  status: RevisionStatus;
  author_id: string;
  reviewer_id: string | null;
  review_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublishedModule {
  id: string;
  number: number;
  title: string;
  title_en: string | null;
  emoji: string;
  description: string | null;
  description_en: string | null;
  color: string;
  icon: string;
  sort_order: number;
  version: number;
  published_at: string;
  published_by: string | null;
  last_edited_by: string | null;
  source_revision_id: string | null;
}

export interface PublishedTopic {
  id: string;
  module_id: string;
  parent_id: string | null;
  slug: string;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  content: string | null;
  content_en: string | null;
  media: TopicMedia;
  clinical_pearls: string[];
  clinical_pearls_en: string[];
  key_points: string[];
  key_points_en: string[];
  tags: string[];
  key_terms: string[];
  sort_order: number;
  version: number;
  published_at: string;
  published_by: string | null;
  last_edited_by: string | null;
  source_revision_id: string | null;
  video_url: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: AccessTier;
  starts_at: string;
  expires_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  granted_by: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ModuleAccess {
  module_id: string;
  required_tier: AccessTier;
  preview_topic_ids: string[];
  updated_at: string;
  updated_by: string | null;
}

export interface LiveWorkshop {
  id: string;
  module_id: string;
  topic_id: string | null;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  stream_url: string | null;
  recording_url: string | null;
  max_capacity: number | null;
  clinical_case_revision_id: string | null;
  clinical_case_json: Record<string, unknown> | null;
  status: WorkshopStatus;
  session_type?: 'workshop_online' | 'hands_on_presencial' | 'masterclass' | 'clinical_round' | string;
  session_modality?: 'online' | 'in_person';
  counts_for_kardex?: boolean;
  attendance_closed?: boolean;
  created_by: string;
  updated_at: string;
  created_at: string;
}

export interface WorkshopRegistration {
  id: string;
  workshop_id: string;
  user_id: string;
  registered_at: string;
  attended: boolean;
}

export type TopicTeachingStatus = 'proposed' | 'confirmed' | 'withdrawn';

export interface TopicTeachingCommitment {
  id: string;
  cohort_id: string;
  module_id: string;
  topic_id: string;
  teacher_id: string;
  status: TopicTeachingStatus;
  milestone_id: string | null;
  workshop_id: string | null;
  proposed_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  teacher_name?: string | null;
}

export interface WorkshopInstructor {
  workshop_id: string;
  teacher_id: string;
  commitment_id: string | null;
  teacher_name?: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; display_name: string };
        Update: Partial<Profile>;
      };
      user_roles: {
        Row: UserRole;
        Insert: { user_id: string; role: AppRole; granted_by?: string };
        Update: Partial<UserRole>;
      };
      portal_welcome_settings: {
        Row: PortalWelcomeSettings;
        Insert: Partial<PortalWelcomeSettings> & { id?: number };
        Update: Partial<PortalWelcomeSettings>;
      };
      portal_welcome_slides: {
        Row: PortalWelcomeSlide;
        Insert: Partial<PortalWelcomeSlide> & { title: string };
        Update: Partial<PortalWelcomeSlide>;
      };
      content_revisions: {
        Row: ContentRevision;
        Insert: Omit<ContentRevision, 'id' | 'created_at' | 'updated_at' | 'reviewer_id' | 'review_notes' | 'submitted_at' | 'reviewed_at'> & {
          id?: string;
        };
        Update: Partial<ContentRevision>;
      };
      published_topics: {
        Row: PublishedTopic;
        Insert: Partial<PublishedTopic> & { id: string; module_id: string; slug: string; title: string };
        Update: Partial<PublishedTopic>;
      };
      published_modules: {
        Row: PublishedModule;
        Insert: Partial<PublishedModule> & { id: string; title: string };
        Update: Partial<PublishedModule>;
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
      };
      published_quizzes: {
        Row: import('./quiz').PublishedQuiz;
        Insert: Partial<import('./quiz').PublishedQuiz> & { topic_id: string; module_id: string };
        Update: Partial<import('./quiz').PublishedQuiz>;
      };
      quiz_questions: {
        Row: import('./quiz').QuizQuestion;
        Insert: Partial<import('./quiz').QuizQuestion> & { quiz_id: string; stem: string; type: import('./quiz').QuizQuestionType };
        Update: Partial<import('./quiz').QuizQuestion>;
      };
      quiz_attempts: {
        Row: import('./quiz').QuizAttempt;
        Insert: Partial<import('./quiz').QuizAttempt> & {
          quiz_id: string;
          quiz_version: number;
          topic_id: string;
          module_id: string;
          user_id: string;
          score: number;
          passed: boolean;
        };
        Update: Partial<import('./quiz').QuizAttempt>;
      };
      quiz_topic_flags: {
        Row: import('./quiz').QuizTopicFlag;
        Insert: never;
        Update: never;
      };
      student_lesson_notes: {
        Row: {
          id: string;
          user_id: string;
          module_id: string;
          topic_id: string;
          body: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          module_id: string;
          topic_id: string;
          body?: string;
          updated_at?: string;
        };
        Update: { body?: string; updated_at?: string };
      };
      student_bookmarks: {
        Row: {
          id: string;
          user_id: string;
          module_id: string;
          topic_id: string;
          url: string;
          title: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          module_id: string;
          topic_id: string;
          url: string;
          title?: string | null;
        };
        Update: { title?: string | null };
      };
      student_flashcards: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          front: string;
          back: string;
          due_at: string;
          interval_days: number;
          ease: number;
          repetitions?: number;
          source?: string;
        };
        Insert: {
          user_id: string;
          topic_id: string;
          front: string;
          back: string;
          due_at?: string;
          interval_days?: number;
          ease?: number;
          repetitions?: number;
          source?: string;
        };
        Update: { due_at?: string; interval_days?: number; ease?: number; repetitions?: number };
      };
      student_qa_threads: {
        Row: {
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
        };
        Insert: {
          student_id: string;
          title: string;
          body: string;
          module_id?: string | null;
          topic_id?: string | null;
          visibility?: 'private' | 'cohort';
          page_url?: string | null;
        };
        Update: {
          status?: 'open' | 'answered' | 'closed';
          visibility?: 'private' | 'cohort';
          page_url?: string | null;
          updated_at?: string;
        };
      };
      student_qa_replies: {
        Row: { id: string; thread_id: string; author_id: string; body: string; created_at: string };
        Insert: { thread_id: string; author_id: string; body: string };
        Update: { body?: string };
      };
      academic_certificates: {
        Row: {
          id: string;
          user_id: string;
          folio: string;
          issued_at: string;
          overall_progress_pct: number;
          average_score: number;
          verification_code: string;
          revoked_at: string | null;
          course_id: CourseId | null;
        };
        Insert: never;
        Update: never;
      };
      courses: {
        Row: Course;
        Insert: Partial<Course> & { id: CourseId; title: string };
        Update: Partial<Course>;
      };
      course_modules: {
        Row: CourseModuleRow;
        Insert: Partial<CourseModuleRow> & { module_id: string; course_id: CourseId };
        Update: Partial<CourseModuleRow>;
      };
      course_enrollments: {
        Row: CourseEnrollment;
        Insert: Partial<CourseEnrollment> & { user_id: string; course_id: CourseId };
        Update: Partial<CourseEnrollment>;
      };
      syllabus_topic_overrides: {
        Row: SyllabusTopicOverride;
        Insert: Partial<SyllabusTopicOverride> & { module_id: string; topic_id: string };
        Update: Partial<SyllabusTopicOverride>;
      };
      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
        Insert: { user_id: string; endpoint: string; p256dh?: string; auth?: string };
        Update: never;
      };
      assignment_submissions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          kind: 'file' | 'link';
          storage_path: string | null;
          file_name: string | null;
          mime_type: string | null;
          byte_size: number | null;
          link_url: string | null;
          link_label: string | null;
          created_at: string;
        };
        Insert: {
          assignment_id: string;
          student_id: string;
          kind: 'file' | 'link';
          storage_path?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          byte_size?: number | null;
          link_url?: string | null;
          link_label?: string | null;
        };
        Update: never;
      };
      student_notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          severity: 'info' | 'success' | 'warning';
          link_url: string | null;
          source_key: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          message: string;
          source_key: string;
          type?: string;
          severity?: 'info' | 'success' | 'warning';
          link_url?: string | null;
        };
        Update: { is_read?: boolean };
      };
      emg_report_submissions: {
        Row: {
          id: string;
          student_id: string;
          assignment_id: string | null;
          title: string;
          file_url: string | null;
          interpretation: Record<string, unknown>;
          feedback: string | null;
          status: string;
          rubric?: Record<string, unknown>;
          rubric_score?: number | null;
          created_at: string;
        };
        Insert: {
          student_id: string;
          title: string;
          file_url?: string | null;
          interpretation?: Record<string, unknown>;
          assignment_id?: string | null;
          status?: string;
        };
        Update: { feedback?: string | null; status?: string };
      };
      topic_teaching_commitments: {
        Row: TopicTeachingCommitment;
        Insert: Partial<TopicTeachingCommitment> & {
          module_id: string;
          topic_id: string;
          teacher_id: string;
        };
        Update: Partial<TopicTeachingCommitment>;
      };
      workshop_instructors: {
        Row: WorkshopInstructor;
        Insert: { workshop_id: string; teacher_id: string; commitment_id?: string | null };
        Update: { commitment_id?: string | null };
      };
    };
    Functions: {
      is_admin: { Args: { check_user_id?: string }; Returns: boolean };
      is_editor: { Args: { check_user_id?: string }; Returns: boolean };
      is_student: { Args: { check_user_id?: string }; Returns: boolean };
      has_role: { Args: { required_role: AppRole; check_user_id?: string }; Returns: boolean };
      is_verified_contributor: { Args: { check_user_id?: string }; Returns: boolean };
      grant_user_role: { Args: { target_user_id: string; target_role: AppRole }; Returns: void };
      revoke_user_role: { Args: { target_user_id: string; target_role: AppRole }; Returns: void };
      verify_contributor: { Args: { target_user_id: string }; Returns: void };
      submit_revision: { Args: { revision_id: string }; Returns: void };
      review_revision: {
        Args: { revision_id: string; new_status: RevisionStatus; notes?: string };
        Returns: void;
      };
      is_enrolled_physician: { Args: { check_user_id?: string }; Returns: boolean };
      verify_physician_enrollment: { Args: { target_user_id: string }; Returns: void };
      reject_physician_enrollment: { Args: { target_user_id: string; notes?: string }; Returns: void };
      revoke_physician_enrollment: { Args: { target_user_id: string }; Returns: void };
      admin_list_profiles: {
        Args: { pending_only?: boolean; enrollment_filter?: string | null };
        Returns: import('./admin').AdminProfileRow[];
      };
      admin_get_stats: { Args: Record<string, never>; Returns: import('./admin').AdminStats };
      admin_list_quiz_attempts: {
        Args: { p_limit?: number };
        Returns: import('./admin').AdminQuizAttemptRow[];
      };
      submit_quiz_attempt: {
        Args: {
          p_topic_id: string;
          p_answers: { questionId: string; selectedIds: string[] }[];
          p_duration_seconds?: number | null;
        };
        Returns: import('./quiz').QuizAttempt;
      };
      revoke_contributor: { Args: { target_user_id: string }; Returns: void };
      bootstrap_admin_available: { Args: Record<string, never>; Returns: boolean };
      claim_bootstrap_admin: { Args: Record<string, never>; Returns: { success: boolean; user_id: string } };
      get_my_auth_context: {
        Args: Record<string, never>;
        Returns: {
          profile: Profile | null;
          roles: AppRole[];
          bootstrap_available: boolean;
          has_premium: boolean;
          subscription: Subscription | null;
          course_ids: CourseId[];
        } | null;
      };
      has_premium_access: { Args: { check_user_id?: string }; Returns: boolean };
      has_course_access: { Args: { p_course_id: string; check_user_id?: string }; Returns: boolean };
      can_access_module: { Args: { p_module_id: string; check_user_id?: string }; Returns: boolean };
      grant_course_access: {
        Args: {
          target_user_id: string;
          p_course_id: string;
          p_method?: string;
          p_reference?: string | null;
          p_notes?: string | null;
          p_expires_at?: string | null;
        };
        Returns: void;
      };
      revoke_course_access: { Args: { target_user_id: string; p_course_id: string }; Returns: void };
      request_course_enrollment: {
        Args: {
          p_course_id: string;
          p_notes?: string | null;
          p_payment_reference?: string | null;
        };
        Returns: CourseEnrollment;
      };
      cancel_course_enrollment_request: {
        Args: { p_course_id: string };
        Returns: boolean;
      };
      admin_admit_student_to_course: {
        Args: {
          p_user_id: string;
          p_course_id: string;
          p_notes?: string | null;
          p_payment_method?: string;
          p_payment_reference?: string | null;
          p_expires_at?: string | null;
        };
        Returns: CourseEnrollment;
      };
      admin_reject_course_request: {
        Args: {
          p_user_id: string;
          p_course_id: string;
          p_reason?: string | null;
        };
        Returns: boolean;
      };
      admin_get_course_waitlist: {
        Args: {
          p_course_id?: string | null;
          p_status?: string | null;
        };
        Returns: CourseWaitlistRow[];
      };
      admin_update_course_price: {
        Args: {
          p_course_id: string;
          p_price_display: string;
        };
        Returns: boolean;
      };
      grant_premium_access: {
        Args: {
          target_user_id: string;
          p_method?: string;
          p_reference?: string | null;
          p_notes?: string | null;
          p_expires_at?: string | null;
        };
        Returns: void;
      };
      revoke_premium_access: { Args: { target_user_id: string }; Returns: void };
      get_quiz_for_attempt: { Args: { p_topic_id: string }; Returns: unknown };
      admin_list_quizzes_for_validation: {
        Args: { p_status?: string | null; p_module_id?: string | null };
        Returns: unknown;
      };
      admin_set_quiz_validation_status: {
        Args: { p_quiz_ids: string[]; p_status: string; p_notes?: string | null };
        Returns: unknown;
      };
      admin_import_pending_quizzes: { Args: { p_payload: Record<string, unknown> }; Returns: unknown };
      admin_question_stats: { Args: { p_module_id?: string | null }; Returns: unknown };
      grade_emg_report: {
        Args: { p_report_id: string; p_rubric: Record<string, unknown>; p_score: number; p_feedback?: string | null };
        Returns: unknown;
      };
      update_my_profile: { Args: { p_updates: Record<string, unknown> }; Returns: Profile };
      mark_portal_guide_seen: {
        Args: { p_version: number };
        Returns: Profile;
      };
      publish_portal_welcome: {
        Args: Record<string, never>;
        Returns: number;
      };
      submit_my_assignment: {
        Args: { p_assignment_id: string; p_notes?: string | null; p_submission_url?: string | null };
        Returns: unknown;
      };
      add_my_submission_link: {
        Args: { p_assignment_id: string; p_url: string; p_label?: string | null };
        Returns: unknown;
      };
      register_my_submission_file: {
        Args: {
          p_assignment_id: string;
          p_storage_path: string;
          p_file_name: string;
          p_mime_type: string;
          p_byte_size: number;
        };
        Returns: unknown;
      };
      delete_my_submission: {
        Args: { p_submission_id: string };
        Returns: unknown;
      };
      complete_my_assigned_exam: {
        Args: {
          p_assignment_id: string;
          p_exam_session_id?: string | null;
          p_score?: number | null;
          p_duration_seconds?: number | null;
        };
        Returns: unknown;
      };
      start_my_clinical_case: {
        Args: { p_assignment_id: string; p_snapshot: Record<string, unknown> };
        Returns: unknown;
      };
      complete_my_clinical_case: {
        Args: {
          p_assignment_id: string;
          p_selected_pattern_id?: string | null;
          p_hints_used?: number;
        };
        Returns: unknown;
      };
      get_exam_questions_for_attempt: {
        Args: {
          p_topic_names?: string[] | null;
          p_module_id?: string | null;
          p_question_ids?: string[] | null;
          p_critical_only?: boolean;
          p_failed_only?: boolean;
        };
        Returns: unknown;
      };
      get_exam_topic_stats: { Args: Record<string, never>; Returns: unknown };
      grade_exam_answer: {
        Args: { p_attempt_id: string; p_question_id: string; p_selected_index: number };
        Returns: unknown;
      };
      get_exam_attempt_reveals: { Args: { p_attempt_id: string }; Returns: unknown };
      submit_exam_session: {
        Args: { p_attempt_id: string; p_answers?: Record<string, number>; p_duration_seconds?: number | null };
        Returns: unknown;
      };
      get_exam_session_review: { Args: { p_session_id: string }; Returns: unknown };
      get_exam_gap_analysis: { Args: { p_user_id?: string | null }; Returns: unknown };
      issue_my_certificate: { Args: { p_course_id?: string | null }; Returns: unknown };
      verify_certificate: { Args: { p_folio: string }; Returns: unknown };
      topic_discussion_directory: {
        Args: { p_topic_id: string };
        Returns: { user_id: string; display_name: string; is_staff: boolean }[];
      };
      propose_topic_commitments: {
        Args: { p_topic_ids: string[]; p_module_id: string; p_cohort_id?: string };
        Returns: TopicTeachingCommitment[];
      };
      confirm_topic_commitment: {
        Args: {
          p_commitment_id: string;
          p_milestone_id: string;
          p_scheduled_at?: string | null;
          p_duration_minutes?: number;
          p_title?: string | null;
        };
        Returns: TopicTeachingCommitment;
      };
      withdraw_topic_commitment: {
        Args: { p_commitment_id: string };
        Returns: TopicTeachingCommitment;
      };
    };
    Views: {
      public_specialist_profiles: {
        Row: Pick<
          Profile,
          | 'id'
          | 'display_name'
          | 'credentials'
          | 'institution'
          | 'academic_institution'
          | 'specialty'
          | 'residency_year'
          | 'avatar_url'
          | 'bio'
          | 'is_public'
          | 'show_in_editorial_committee'
          | 'cedula_verified'
          | 'created_at'
        >;
      };
    };
  };
}
