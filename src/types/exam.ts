/**
 * Tipos para el motor de exámenes personalizados de NeuroSAFEMX.
 * Banco de preguntas EMG con soporte de sesiones, intentos en curso
 * y analítica de brechas de conocimiento.
 */

// ─── Pregunta del Banco de Exámenes ──────────────────────────────────────────

export interface ExamQuestionOption {
  text: string;
  is_correct: boolean;
  feedback: string; // Explicación de por qué es correcta/incorrecta
}

export interface ExamQuestionFinding {
  type: string;  // 'LAT' | 'AMPL' | 'VCN' | 'EMG' | 'SIGN' etc.
  label: string; // Ej: "Latencia distal mediano"
  value: string; // Ej: "<3.7 ms"
}

export interface ExamQuestion {
  id: string;
  island_name: string;         // "EMG"
  module_id: string;           // "nerve-conduction", "emg-needle", etc.
  topic_name: string;          // "Reflejo H", "Actividad espontánea", etc.
  topic_id?: string;
  stem: string;                // Viñeta clínica / enunciado
  findings: ExamQuestionFinding[];
  image_url?: string;
  image_alt?: string;
  options: ExamQuestionOption[];
  difficulty: 1 | 2 | 3;      // 1=Básico, 2=Intermedio, 3=Avanzado
  is_critical: boolean;        // Preguntas de alta rentabilidad del Consejo
  pearl?: string;              // Perla clínica oficial
  source_reference?: string;   // Referencia bibliográfica
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
}

/** Revelación de una respuesta calificada en servidor (modo tutor o resultados). */
export interface ExamAnswerReveal {
  questionId: string;
  isCorrect: boolean;
  selectedIndex: number;
  correctIndex: number | null;
  selectedFeedback: string;
  correctFeedback: string;
  pearl?: string | null;
}

// ─── Configuración del Examen ─────────────────────────────────────────────────

export type ExamMode =
  | 'FULL_SIMULATION'  // Todas las preguntas disponibles
  | 'TOPIC_SPECIFIC'   // Por tema(s) seleccionados
  | 'CUSTOM'           // Personalizado (temas + cantidad)
  | 'FAILED_REVIEW'    // Solo preguntas falladas previamente
  | 'CRITICAL_ONLY';   // Solo preguntas críticas

export type FeedbackMode =
  | 'immediate'  // Modo Tutor: retroalimentación tras cada respuesta
  | 'end';       // Modo Examen Real: revisión al concluir

export interface ExamConfig {
  mode: ExamMode;
  moduleId?: string;           // Módulo de origen
  topicNames?: string[];       // Temas seleccionados
  questionCount?: number | null; // null = todas las disponibles
  timeLimitSeconds?: number | null; // null = sin límite
  feedbackMode: FeedbackMode;
  criticalOnly?: boolean;
  failedReview?: boolean;      // Solo preguntas falladas
}

// ─── Estado en Tiempo Real del Examen (auto-guardado) ─────────────────────────

export interface ExamAttemptState {
  currentQuestionIndex: number;
  answers: Record<string, number>; // questionId → selectedOptionIndex
  flagged: Record<string, boolean>;
  timeRemainingSeconds: number | null;
}

export interface ExamAttemptRecord {
  id: string;
  user_id: string;
  mode: ExamMode;
  config: ExamConfig;
  question_ids: string[];
  current_question_index: number;
  answers: Record<string, number>;
  flagged: Record<string, boolean>;
  time_remaining_seconds: number | null;
  /** Permutación de opciones mostrada: questionId → índices originales */
  option_order?: Record<string, number[]> | null;
  /** Marca absoluta de fin para exámenes cronometrados */
  expires_at?: string | null;
  /** Presente si el intento corresponde a una evaluación asignada */
  assignment_id?: string | null;
  /** Sesión calificada vinculada a este intento (idempotencia del envío) */
  exam_session_id?: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  created_at: string;
  updated_at: string;
}

// ─── Sesión de Examen Completada ──────────────────────────────────────────────

export interface ExamSession {
  id: string;
  user_id: string;
  mode: ExamMode;
  module_id?: string | null;
  selected_topics: string[];
  question_count_config?: number | null;
  feedback_mode: FeedbackMode;
  time_limit_seconds?: number | null;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  duration_seconds: number;
  passed: boolean;             // score_percentage >= 70
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  started_at: string;
  completed_at?: string | null;
}

export interface ExamAnswerRecord {
  id?: string;
  session_id: string;
  question_id: string;
  topic_name?: string;
  module_id?: string;
  is_critical: boolean;
  difficulty: number;
  selected_option_index: number;
  is_correct: boolean;
  time_spent_seconds: number;
}

// ─── Progreso por Pregunta ────────────────────────────────────────────────────

export interface UserQuestionProgress {
  id: string;
  user_id: string;
  question_id: string;
  attempts: number;
  successes: number;
  consecutive_correct: number;
  is_mastered: boolean;
  last_attempt: string;
  next_review_at?: string;
}

// ─── Resultados del Examen (para UI) ─────────────────────────────────────────

export interface ExamTopicBreakdown {
  topic_name: string;
  module_id?: string;
  total: number;
  correct: number;
  accuracy_pct: number;
  critical_failures: number;
}

export interface ExamResultsSummary {
  session: ExamSession;
  answers: ExamAnswerRecord[];
  questions: ExamQuestion[];   // Las preguntas del examen (para revisión)
  topicBreakdown: ExamTopicBreakdown[];
}

export interface SubmitExamResult {
  sessionId: string;
  scorePercentage: number;
  correctAnswers: number;
  totalQuestions: number;
  passed: boolean;
  durationSeconds: number;
  assignmentId?: string | null;
  questions: ExamQuestion[];
  answers: Array<{
    question_id: string;
    selected_option_index: number;
    is_correct: boolean;
    topic_name?: string;
    module_id?: string;
    is_critical?: boolean;
  }>;
}

// ─── Analítica de Brechas ─────────────────────────────────────────────────────

export interface ExamGapAnalysis {
  topic_name: string;
  module_id: string;
  total_attempts: number;
  correct_attempts: number;
  accuracy_pct: number;
  critical_failures: number;
}

// ─── Estado de Carga de Preguntas ─────────────────────────────────────────────

export interface ExamQuestionsLoadState {
  questions: ExamQuestion[];
  loading: boolean;
  error: string | null;
  source: 'supabase' | 'fallback' | null;
  totalByTopic: Record<string, number>;
  availableTopics: string[];
}
