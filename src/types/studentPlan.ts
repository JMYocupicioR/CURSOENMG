import type { AssignmentMaterial } from '../utils/assignmentMaterials';
import type { Profile } from './database';
import type { QuizAttempt, ModuleQuizProgress } from './quiz';
import type { ExamSession } from './exam';
import type { StudentModuleStats } from '../services/studentService';

export type AssignmentType = 'exam' | 'clinical_case' | 'reading' | 'emg_report' | 'practical_task';
export type AssignmentStatus = 'pending' | 'submitted' | 'approved' | 'needs_revision' | 'overdue';
export type AssignmentPriority = 'normal' | 'high' | 'urgent';

export interface ClinicalCaseAttemptRecord {
  selectedPatternId?: string | null;
  selectedPatternName?: string | null;
  isCorrect: boolean;
  score: number;
  hintsUsed?: number;
  timeSpentSeconds?: number;
  patternName?: string;
  correctPatternId?: string;
  completedAt?: string;
}

export interface ClinicalCaseSnapshot {
  clinicalCase: Record<string, unknown>;
  options: Array<{
    patternId: string;
    patternName: string;
    category: string;
    description?: string;
  }>;
  hints?: string[];
  startedAt?: string;
  expiresAt?: string | null;
  clinicalMode?: 'study' | 'exam';
  patternId?: string;
  difficulty?: string;
  timeLimitMinutes?: number;
}

export interface StudentLearningPlan {
  id: string;
  student_id: string;
  title: string;
  description?: string | null;
  priority_modules: string[];
  priority_topics: string[];
  target_date?: string | null;
  status: 'active' | 'completed' | 'archived';
  weekly_goal_minutes?: number | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentAssignment {
  id: string;
  student_id: string;
  plan_id?: string | null;
  title: string;
  type: AssignmentType;
  description: string;
  /** Archivos y enlaces que el profesor adjunta al publicar la tarea. */
  materials?: AssignmentMaterial[] | null;
  target_module_id?: string | null;
  target_topic_id?: string | null;
  target_subtopic_id?: string | null;
  target_subtopic_title?: string | null;
  target_exam_config?: {
    topicNames?: string[];
    moduleId?: string;
    subtopicId?: string;
    subtopicTitle?: string;
    selectedQuestionIds?: string[];
    questionCount?: number;
    timeLimitMinutes?: number;
    mode?: 'FULL_SIMULATION' | 'TOPIC_SPECIFIC' | 'CUSTOM' | 'FAILED_REVIEW' | 'CRITICAL_ONLY';
    /** Caso clínico EMG asignado por el profesor */
    patternId?: string;
    category?: string;
    difficulty?: string;
    clinicalMode?: 'study' | 'exam';
    minPassingScore?: number;
    strictLock?: boolean;
    startedAt?: string;
    expiresAt?: string;
    maxAttempts?: number; // 1, 2, 3, etc. (undefined o 0 = ilimitados)
    attemptsCount?: number; // Intentos completados
    allowRetakeRequest?: boolean; // Si puede solicitar permiso al profesor
    retakeStatus?: 'none' | 'requested' | 'approved' | 'rejected';
    retakeReason?: string;
    retakeRequestedAt?: string;
    retakeReviewedAt?: string;
    retakeReviewedBy?: string;
    retakeReviewNotes?: string;
    clinicalSnapshot?: ClinicalCaseSnapshot;
    lastClinicalAttempt?: ClinicalCaseAttemptRecord;
  } | null;
  due_date: string; // ISO date string
  status: AssignmentStatus;
  priority: AssignmentPriority;
  min_score?: number | null;
  assigned_by?: string | null;
  // Entrega del alumno
  submitted_at?: string | null;
  student_notes?: string | null;
  submission_url?: string | null;
  // Evaluación del profesor
  grade?: number | null;
  feedback?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActiveExamLock {
  assignmentId: string;
  studentId: string;
  assignmentTitle: string;
  startedAt: string;
  expiresAt: string;
  timeLimitMinutes: number;
  selectedQuestionIds?: string[];
  config: any;
  moduleId?: string;
  topicTitle?: string;
  subtopicTitle?: string;
}

export interface StudentActivityLog {
  id: string;
  user_id: string;
  action: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface StudentStreakInfo {
  currentStreak: number; // días seguidos activos
  longestStreak: number; // récord histórico
  totalActiveDays: number;
  lastActiveDate: string | null;
  activeDatesLast30Days: string[]; // YYYY-MM-DD
  totalSessions: number;
}

export interface QuestionBreakdownItem {
  questionId: string;
  stem: string;
  imageUrl?: string | null;
  selectedOptionText: string;
  selectedOptionIndex?: number;
  correctOptionText: string;
  isCorrect: boolean;
  explanation?: string | null;
  pearl?: string | null;
  sourceReference?: string | null;
  difficulty?: number | string;
  isCritical?: boolean;
}

export interface StudentExamDetail {
  attemptId: string;
  quizId?: string;
  topicId?: string;
  moduleId: string;
  title: string;
  score: number;
  passed: boolean;
  completedAt: string;
  durationSeconds?: number | null;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  questions: QuestionBreakdownItem[];
}

export interface StudentDomainAssessment {
  masteredTopics: {
    topicName: string;
    moduleId: string;
    accuracyPct: number;
    totalAttempts: number;
  }[];
  opportunityTopics: {
    topicName: string;
    moduleId: string;
    accuracyPct: number;
    totalAttempts: number;
    criticalFailures: number;
    recommendedActions: string;
  }[];
}

export interface StudentFullDossier {
  profile: Profile;
  roles: string[];
  metrics: {
    overallProgressPct: number;
    totalCurriculumTopics: number;
    completedTopicsCount: number;
    cmeCreditsEarned: number;
    maxCmeCredits: number;
    academicHoursEarned: number;
    maxAcademicHours: number;
    averageScore: number;
    quizzesAttemptedCount: number;
    quizzesPassedCount: number;
    isCertificationEligible: boolean;
    certificateFolio?: string;
  };
  moduleProgress: ModuleQuizProgress[];
  moduleStats?: StudentModuleStats[];
  completedTopicIds?: string[];
  quizAttempts: QuizAttempt[];
  examSessions: ExamSession[];
  domainAssessment: StudentDomainAssessment;
  streakInfo: StudentStreakInfo;
  activityLogs: StudentActivityLog[];
  learningPlans: StudentLearningPlan[];
  assignments: StudentAssignment[];
}

export interface TeacherPendingReviewItem {
  assignment: StudentAssignment;
  studentProfile?: {
    id: string;
    display_name: string;
    email: string;
    institution?: string | null;
    specialty?: string | null;
    residency_year?: string | null;
    avatar_url?: string | null;
  };
}
