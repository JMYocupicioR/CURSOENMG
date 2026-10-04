import { describe, expect, it } from 'vitest';
import type { Module } from '../types/content';
import {
  getNextPendingCurriculumLesson,
  isLessonRead,
  listPendingCurriculumLessons,
  resolveResumeLesson,
} from './studentResume';

const fakeModules: Module[] = [
  {
    id: 'fundamentals',
    number: 1,
    title: 'Fundamentos',
    titleEn: 'Fundamentals',
    emoji: '📘',
    description: '',
    descriptionEn: '',
    color: '',
    icon: 'BookOpen',
    topics: [
      {
        id: 'intro-neurodiagnostics',
        title: 'Introducción al Neurodiagnóstico',
        children: [
          { id: 'history', title: 'Historia de la electrofisiología clínica' },
          { id: 'clinical-role', title: 'Rol del electrodiagnóstico en medicina' },
          { id: 'laboratory', title: 'El laboratorio de neurofisiología' },
          { id: 'ethics', title: 'Ética y prevención cuaternaria' },
        ],
      },
      {
        id: 'electricity-basics',
        title: 'Bases de Electricidad y Electrónica',
        children: [
          { id: 'voltage-current', title: 'Principios de electricidad' },
          { id: 'filters', title: 'Filtros y amplificación' },
        ],
      },
    ],
  },
  {
    id: 'nerve-conduction',
    number: 2,
    title: 'Neuroconducción',
    titleEn: 'Nerve conduction',
    emoji: '⚡',
    description: '',
    descriptionEn: '',
    color: '',
    icon: 'Zap',
    topics: [{ id: 'ncs-intro', title: 'Introducción a NCS' }],
  },
];

describe('resolveResumeLesson', () => {
  it('starts at the first curriculum lesson when nothing is completed', () => {
    const resume = resolveResumeLesson(new Set(), null, fakeModules);
    expect(resume?.topicId).toBe('intro-neurodiagnostics');
    expect(resume?.url).toBe('/modulo/fundamentals/intro-neurodiagnostics#section-history');
    expect(resume?.pendingLessonCount).toBe(3);
  });

  it('skips a fully completed parent lesson even if it was the last visited page', () => {
    const completed = new Set([
      'intro-neurodiagnostics',
      'history',
      'clinical-role',
      'laboratory',
      'ethics',
    ]);
    const resume = resolveResumeLesson(
      completed,
      {
        moduleId: 'fundamentals',
        topicId: 'intro-neurodiagnostics',
        url: '/modulo/fundamentals/intro-neurodiagnostics',
      },
      fakeModules
    );

    expect(resume?.topicId).toBe('electricity-basics');
    expect(resume?.url).toBe('/modulo/fundamentals/electricity-basics#section-voltage-current');
    expect(resume?.firstIncompleteChildTitle).toBe('Principios de electricidad');
  });

  it('skips a parent when all of its children are completed, even without the parent id', () => {
    const completed = new Set(['history', 'clinical-role', 'laboratory', 'ethics']);
    const resume = resolveResumeLesson(completed, null, fakeModules);
    expect(resume?.topicId).toBe('electricity-basics');
  });

  it('resumes the in-progress lesson the student last visited instead of jumping backwards', () => {
    const resume = resolveResumeLesson(
      new Set(['voltage-current']),
      {
        moduleId: 'fundamentals',
        topicId: 'electricity-basics',
        url: '/modulo/fundamentals/electricity-basics',
      },
      fakeModules
    );

    expect(resume?.topicId).toBe('electricity-basics');
    expect(resume?.firstIncompleteChildId).toBe('filters');
    expect(resume?.url).toBe('/modulo/fundamentals/electricity-basics#section-filters');
  });

  it('returns null when every lesson is completed', () => {
    const completed = new Set([
      'intro-neurodiagnostics',
      'history',
      'clinical-role',
      'laboratory',
      'ethics',
      'electricity-basics',
      'voltage-current',
      'filters',
      'ncs-intro',
    ]);
    expect(resolveResumeLesson(completed, null, fakeModules)).toBeNull();
  });
});

describe('listPendingCurriculumLessons', () => {
  it('lists remaining lessons after a completed intro unit', () => {
    const completed = new Set(['history', 'clinical-role', 'laboratory', 'ethics']);
    const pending = listPendingCurriculumLessons(completed, { modules: fakeModules });
    expect(pending.map((item) => item.topicId)).toEqual(['electricity-basics', 'ncs-intro']);
  });
});

describe('getNextPendingCurriculumLesson', () => {
  it('advances to the next module after the current lesson is done', () => {
    const completed = new Set([
      'intro-neurodiagnostics',
      'history',
      'clinical-role',
      'laboratory',
      'ethics',
      'electricity-basics',
      'voltage-current',
      'filters',
    ]);
    const next = getNextPendingCurriculumLesson(
      completed,
      { moduleId: 'fundamentals', topicId: 'electricity-basics' },
      fakeModules
    );
    expect(next?.topicId).toBe('ncs-intro');
    expect(next?.moduleId).toBe('nerve-conduction');
  });

  it('does not ask the student to complete the bibliography appendix', () => {
    const withAppendix: Module[] = [
      ...fakeModules,
      {
        id: 'bibliography',
        number: 12,
        title: 'Referencias y Bibliografía',
        titleEn: 'References',
        emoji: '📖',
        description: '',
        descriptionEn: '',
        color: '',
        icon: 'BookMarked',
        topics: [{ id: 'textbooks', title: 'Libros de texto fundamentales' }],
      },
    ];
    const pending = listPendingCurriculumLessons(new Set(), { modules: withAppendix });
    expect(pending.some((lesson) => lesson.moduleId === 'bibliography')).toBe(false);
    expect(pending.some((lesson) => lesson.topicId === 'textbooks')).toBe(false);
  });
});

describe('isLessonRead', () => {
  const lesson = fakeModules[0].topics[0];

  it('keeps a read topic marked even when its quiz is still pending', () => {
    const read = new Set(['history', 'clinical-role', 'laboratory', 'ethics']);
    expect(isLessonRead(lesson, read)).toBe(true);
    expect(isLessonRead(lesson.children![0], read)).toBe(true);
    expect(isLessonRead(lesson.children![2], new Set(['clinical-role', 'ethics']))).toBe(false);
  });
});
