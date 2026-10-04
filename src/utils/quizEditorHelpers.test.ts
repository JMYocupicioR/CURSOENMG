import { describe, it, expect } from 'vitest';
import {
  defaultOptionsForType,
  publishedQuestionsToDraft,
  isQuestionCorrect,
} from './quizScoring';
import type { QuizQuestion } from '../types/quiz';

describe('Quiz Editor Scoring & Draft Utilities', () => {
  it('generates correct default options for true_false and single choice', () => {
    const tfOptions = defaultOptionsForType('true_false');
    expect(tfOptions).toHaveLength(2);
    expect(tfOptions[0].text).toBe('Verdadero');
    expect(tfOptions[0].isCorrect).toBe(true);
    expect(tfOptions[1].text).toBe('Falso');
    expect(tfOptions[1].isCorrect).toBe(false);

    const singleOptions = defaultOptionsForType('single');
    expect(singleOptions).toHaveLength(2);
    expect(singleOptions[0].isCorrect).toBe(true);
  });

  it('converts published questions to drafts accurately preserving all metadata', () => {
    const published: QuizQuestion[] = [
      {
        id: 'q1',
        quiz_id: 'quiz-1',
        sort_order: 1,
        type: 'single',
        stem: '¿Cuál es el valor normal de VCN motora en mediano?',
        stem_en: null,
        image_url: 'https://example.com/trace.png',
        image_alt: 'Registro de CMAP',
        options: [
          { id: 'opt1', text: '>49 m/s', isCorrect: true },
          { id: 'opt2', text: '<30 m/s', isCorrect: false },
        ],
        explanation: 'La VCN motora normal del nervio mediano en antebrazo supera 49 m/s.',
        explanation_en: null,
        difficulty: 'intermediate',
      },
    ];

    const drafts = publishedQuestionsToDraft(published);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe('q1');
    expect(drafts[0].stem).toBe('¿Cuál es el valor normal de VCN motora en mediano?');
    expect(drafts[0].imageUrl).toBe('https://example.com/trace.png');
    expect(drafts[0].imageAlt).toBe('Registro de CMAP');
    expect(drafts[0].difficulty).toBe('intermediate');
    expect(drafts[0].options[0].isCorrect).toBe(true);
  });

  it('evaluates multiple choice correctly only when exact subset is matched', () => {
    const multiQuestion: QuizQuestion = {
      id: 'q2',
      quiz_id: 'quiz-1',
      sort_order: 2,
      type: 'multiple',
      stem: 'Selecciona las respuestas tardías en neurofisiología:',
      stem_en: null,
      image_url: null,
      image_alt: null,
      options: [
        { id: 'opt_a', text: 'Reflejo H', isCorrect: true },
        { id: 'opt_b', text: 'Onda F', isCorrect: true },
        { id: 'opt_c', text: 'CMAP distal', isCorrect: false },
      ],
      explanation: 'Reflejo H y Onda F son respuestas tardías.',
      explanation_en: null,
      difficulty: 'basic',
    };

    // Correct when both are selected
    expect(isQuestionCorrect(multiQuestion, ['opt_a', 'opt_b'])).toBe(true);
    expect(isQuestionCorrect(multiQuestion, ['opt_b', 'opt_a'])).toBe(true);

    // Incorrect if incomplete
    expect(isQuestionCorrect(multiQuestion, ['opt_a'])).toBe(false);

    // Incorrect if distractor selected
    expect(isQuestionCorrect(multiQuestion, ['opt_a', 'opt_b', 'opt_c'])).toBe(false);
  });

  it('evaluates image choice questions just like single choice', () => {
    const imgQuestion: QuizQuestion = {
      id: 'q3',
      quiz_id: 'quiz-1',
      sort_order: 3,
      type: 'image_choice',
      stem: '¿Qué patrón se observa en el trazo EMG adjunto?',
      stem_en: null,
      image_url: 'https://example.com/fibrillations.png',
      image_alt: 'Potenciales de fibrilación y ondas agudas positivas',
      options: [
        { id: 'opt_fib', text: 'Actividad espontánea de denervación activa', isCorrect: true },
        { id: 'opt_norm', text: 'Silencio eléctrico normal', isCorrect: false },
      ],
      explanation: 'Las fibrilaciones y PSW reflejan hiperexcitabilidad de fibras musculares denervadas.',
      explanation_en: null,
      difficulty: 'advanced',
    };

    expect(isQuestionCorrect(imgQuestion, ['opt_fib'])).toBe(true);
    expect(isQuestionCorrect(imgQuestion, ['opt_norm'])).toBe(false);
    expect(isQuestionCorrect(imgQuestion, [])).toBe(false);
  });
});
