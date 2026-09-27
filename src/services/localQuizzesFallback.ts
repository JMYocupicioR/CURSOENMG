// Metadatos de evaluaciones locales (SIN respuestas). El banco completo vive en supabase/seeds y se califica en el servidor.
import type { QuizTopicFlag, QuizWithQuestions } from '../types/quiz';

export const LOCAL_QUIZ_FLAGS: QuizTopicFlag[] = [
  {
    "topic_id": "voltage-current",
    "module_id": "fundamentals",
    "title": "Evaluación: Principios Básicos y Electricidad",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 13
  },
  {
    "topic_id": "muscle-contraction-physiology",
    "module_id": "fundamentals",
    "title": "Evaluación: Fisiología de la Contracción Muscular",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 2
  },
  {
    "topic_id": "nerve-fiber-classification",
    "module_id": "fundamentals",
    "title": "Evaluación: Clasificación de Lesiones Nerviosas",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 2
  },
  {
    "topic_id": "general-principles",
    "module_id": "nerve-conduction",
    "title": "Evaluación: Principios Generales de Neuroconducción",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 4
  },
  {
    "topic_id": "f-vs-h",
    "module_id": "nerve-conduction",
    "title": "Evaluación: Onda F vs. Reflejo H",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 2
  },
  {
    "topic_id": "h-reflex",
    "module_id": "late-responses",
    "title": "Evaluación: Reflejo H (Hoffmann)",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 6
  },
  {
    "topic_id": "f-wave",
    "module_id": "late-responses",
    "title": "Evaluación: Onda F",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 6
  },
  {
    "topic_id": "emg-principles",
    "module_id": "emg-needle",
    "title": "Evaluación: Principios de la EMG de Aguja",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 5
  },
  {
    "topic_id": "spontaneous-activity",
    "module_id": "emg-needle",
    "title": "Evaluación: Actividad Espontánea Anormal",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 6
  },
  {
    "topic_id": "nmj-physiology",
    "module_id": "repetitive-stimulation",
    "title": "Evaluación: Fisiología de la Unión Neuromuscular",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 4
  },
  {
    "topic_id": "ep-fundamentals",
    "module_id": "evoked-potentials",
    "title": "Evaluación: Fundamentos de Potenciales Evocados",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 7
  },
  {
    "topic_id": "pediatric-emg",
    "module_id": "special-studies",
    "title": "Evaluación: Neuroconducción y EMG Pediátrica",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 1
  },
  {
    "topic_id": "carpal-tunnel",
    "module_id": "topographic-anatomy",
    "title": "Evaluación: Síndrome del Túnel Carpiano",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 1
  },
  {
    "topic_id": "cubital-tunnel",
    "module_id": "topographic-anatomy",
    "title": "Evaluación: Neuropatía Cubital / Túnel Cubital",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 1
  },
  {
    "topic_id": "cervical-radic",
    "module_id": "radiculopathies",
    "title": "Evaluación: Radiculopatías",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 2
  },
  {
    "topic_id": "sensorimotor-poly",
    "module_id": "diagnostic-criteria",
    "title": "Evaluación: Polineuropatías y Algoritmo Diagnóstico",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 1
  },
  {
    "topic_id": "gbs-subtypes",
    "module_id": "diagnostic-criteria",
    "title": "Evaluación: Síndrome de Guillain-Barré (SGB)",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 3
  },
  {
    "topic_id": "cidp-criteria",
    "module_id": "diagnostic-criteria",
    "title": "Evaluación: Criterios Diagnósticos de CIDP",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 4
  },
  {
    "topic_id": "autoimmune-nodopathies-detail",
    "module_id": "diagnostic-criteria",
    "title": "Evaluación: Nodopatías Autoinmunes y Autoanticuerpos",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 1
  },
  {
    "topic_id": "mmn-criteria",
    "module_id": "diagnostic-criteria",
    "title": "Evaluación: Neuropatía Motora Multifocal (NMM)",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 4
  },
  {
    "topic_id": "als",
    "module_id": "motor-neuron-diseases",
    "title": "Evaluación: Esclerosis Lateral Amiotrófica (ELA)",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 3
  },
  {
    "topic_id": "inflammatory-myopathies",
    "module_id": "motor-neuron-diseases",
    "title": "Evaluación: Miopatías Inflamatorias",
    "pass_score": 70,
    "max_attempts": null,
    "version": 1,
    "question_count": 7
  }
];

/** @deprecated No se exportan preguntas ni isCorrect al bundle del alumno. */
export const LOCAL_PUBLISHED_QUIZZES: Record<string, QuizWithQuestions> = {};

export function getLocalQuizForTopic(_topicId: string): QuizWithQuestions | null {
  return null;
}

export function getLocalQuizFlagForTopic(topicId: string): QuizTopicFlag | null {
  const flag = LOCAL_QUIZ_FLAGS.find((f) => f.topic_id === topicId);
  if (!flag) return null;
  return { ...flag, clinical_validation_status: flag.clinical_validation_status ?? 'approved' };
}

export function getAllLocalQuizFlags(): QuizTopicFlag[] {
  return LOCAL_QUIZ_FLAGS.filter((f) => f.question_count > 0).map((flag) => ({
    ...flag,
    clinical_validation_status: flag.clinical_validation_status ?? 'approved',
  }));
}
