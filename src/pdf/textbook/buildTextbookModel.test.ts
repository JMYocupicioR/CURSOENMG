import { describe, expect, it } from 'vitest';
import type { Module } from '../../types/content';
import {
  buildTextbookModel,
  dedupeReferences,
  formatReference,
  parseTextbookAuthors,
  referenceKey,
} from './buildTextbookModel';

const sample: Module = {
  id: 'fundamentals',
  number: 1,
  title: 'Fundamentos',
  titleEn: 'Fundamentals',
  emoji: '📘',
  description: 'Bases clínicas',
  descriptionEn: 'Clinical bases',
  color: 'from-blue-500 to-blue-700',
  icon: 'BookOpen',
  topics: [
    {
      id: 'intro-neurodiagnostics',
      title: 'Introducción',
      titleEn: 'Introduction',
      description: 'Historia y rol',
      children: [
        {
          id: 'history',
          title: 'Historia',
          titleEn: 'History',
          content: 'El electrodo concéntrico nació en 1929.',
          contentEn: 'The concentric electrode appeared in 1929.',
          clinicalPearls: ['Perla en español.'],
          clinicalPearlsEn: ['English pearl.'],
          keyPoints: ['Punto clave.'],
          keyPointsEn: ['Key point.'],
          youtubeUrls: [{ title: 'Video que no debe imprimirse', videoId: 'dQw4w9wgGcQ' }],
          vimeoUrls: [{ title: 'Vimeo omitido', videoId: '123456' }],
          videoUrls: [{ title: 'Drive omitido', driveId: 'abc' }],
          embedUrls: [{ title: 'Embed omitido', embedUrl: 'https://example.com/embed' }],
          imageUrls: [{ src: 'https://example.com/fig1.png', alt: 'Figura 1', caption: 'Electrodo' }],
          pdfUrls: [
            {
              title: 'Guía AANEM',
              url: 'https://example.com/guide.pdf',
              author: 'AANEM',
              description: 'Parámetro de práctica',
            },
          ],
        },
        {
          id: 'ethics',
          title: 'Ética del laboratorio',
          content: 'Solo existe en español.',
        },
      ],
    },
    {
      id: 'hidden-draft',
      title: 'Borrador oculto',
      content: 'No sale al alumnado.',
    },
  ],
};

describe('buildTextbookModel', () => {
  it('omits every video field and keeps printable lesson data', () => {
    const model = buildTextbookModel({
      modules: [sample],
      generatedAt: new Date('2026-09-25T12:00:00.000Z'),
    });
    const serialized = JSON.stringify(model);
    expect(serialized).not.toContain('dQw4w9wgGcQ');
    expect(serialized).not.toContain('youtube');
    expect(serialized).not.toContain('vimeo');
    expect(serialized).not.toContain('abc');
    expect(serialized).not.toContain('https://example.com/embed');

    const history = model.chapters[0].lessons.find((lesson) => lesson.id === 'history');
    expect(history?.content).toContain('1929');
    expect(history?.clinicalPearls).toEqual(['Perla en español.']);
    expect(history?.keyPoints).toEqual(['Punto clave.']);
    expect(history?.images).toEqual([
      { src: 'https://example.com/fig1.png', alt: 'Figura 1', caption: 'Electrodo' },
    ]);
    expect(history?.teachingPdfs[0]).toMatchObject({
      title: 'Guía AANEM',
      author: 'AANEM',
      url: 'https://example.com/guide.pdf',
    });
  });

  it('attaches bibliography once to the first-level section, not to every child', () => {
    const model = buildTextbookModel({ modules: [sample] });
    const chapter = model.chapters[0];
    const withRefs = chapter.lessons.filter((lesson) => lesson.sectionBibliography.length > 0);
    const intro = withRefs.find((lesson) => lesson.firstLevelId === 'intro-neurodiagnostics');
    const draft = withRefs.find((lesson) => lesson.id === 'hidden-draft');
    expect(withRefs).toHaveLength(2);
    expect(intro?.id).toBe('ethics');
    expect(intro?.sectionBibliography[0].authors).toContain('Kimura');
    expect(intro?.sectionBibliography.some((ref) => ref.authors.includes('Dumitru'))).toBe(false);
    expect(draft?.sectionBibliography.some((ref) => ref.authors.includes('Dumitru'))).toBe(true);
    expect(chapter.lessons.find((lesson) => lesson.id === 'history')?.sectionBibliography).toEqual([]);
    expect(chapter.references.length).toBeGreaterThan(0);
    expect(model.appendix.length).toBe(chapter.references.length);
  });

  it('falls back to Spanish and counts missing English copy', () => {
    const model = buildTextbookModel({ modules: [sample], lang: 'en' });
    const ethics = model.chapters[0].lessons.find((lesson) => lesson.id === 'ethics');
    expect(ethics?.title).toBe('Ética del laboratorio');
    expect(ethics?.content).toBe('Solo existe en español.');
    expect(ethics?.usedSpanishFallback).toBe(true);
    expect(model.stats.missingTranslations).toBeGreaterThan(0);

    const history = model.chapters[0].lessons.find((lesson) => lesson.id === 'history');
    expect(history?.title).toBe('History');
    expect(history?.content).toContain('concentric electrode');
    expect(history?.usedSpanishFallback).toBe(false);
  });

  it('marks hidden topics without dropping them when includeHidden is on', () => {
    const model = buildTextbookModel({
      modules: [sample],
      includeHidden: true,
      hiddenTopicIds: ['hidden-draft'],
    });
    const hidden = model.chapters[0].lessons.find((lesson) => lesson.id === 'hidden-draft');
    expect(hidden?.hiddenFromStudents).toBe(true);
    expect(model.stats.hiddenLessons).toBe(1);
    expect(model.includeHidden).toBe(true);
  });

  it('skips empty containers when requested and filters modules', () => {
    const model = buildTextbookModel({
      modules: [sample],
      selectedModuleIds: ['fundamentals'],
      skipEmptyContainers: true,
    });
    expect(model.chapters[0].lessons.some((lesson) => lesson.id === 'intro-neurodiagnostics')).toBe(false);
    expect(model.chapters[0].lessons.some((lesson) => lesson.id === 'history')).toBe(true);
    expect(model.stats.modules).toBe(1);
  });

  it('honors inclusion flags', () => {
    const model = buildTextbookModel({
      modules: [sample],
      inclusion: {
        description: false,
        body: false,
        pearls: false,
        keyPoints: false,
        images: false,
        bibliography: false,
        teachingPdfs: false,
      },
    });
    const history = model.chapters[0].lessons.find((lesson) => lesson.id === 'history');
    expect(history?.content).toBeUndefined();
    expect(history?.clinicalPearls).toEqual([]);
    expect(history?.images).toEqual([]);
    expect(history?.teachingPdfs).toEqual([]);
    expect(model.appendix).toEqual([]);
    expect(model.chapters[0].description).toBeUndefined();
  });

  it('excludes a topic subtree and attaches chapter editors unless disabled', () => {
    const contributors = [
      {
        id: 'u1',
        name: 'Ana López',
        credentials: 'M.N.',
        label: 'Ana López, M.N.',
        role: 'editor' as const,
        topicIds: ['history'],
        moduleIds: ['fundamentals'],
        lastAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'u2',
        name: 'Luis Pérez',
        credentials: null,
        label: 'Luis Pérez',
        role: 'contributor' as const,
        topicIds: ['ethics'],
        moduleIds: ['fundamentals'],
      },
    ];
    const model = buildTextbookModel({
      modules: [sample],
      contributors,
      topicOverrides: { history: { included: false }, ethics: { outlineOnly: true } },
      creditOptions: { showChapterCredits: true, showLessonCredits: true, showCoverCredits: true, disabledAuthorIds: ['u2'] },
      topicEditedAt: { ethics: '2026-09-10T00:00:00.000Z' },
    });
    const ids = model.chapters[0].lessons.map((lesson) => lesson.id);
    expect(ids).not.toContain('history');
    expect(model.chapters[0].contributors.map((person) => person.id)).toEqual(['u1']);
    expect(model.editorialAuthors.map((person) => person.id)).toEqual(['u1']);
    const ethics = model.chapters[0].lessons.find((lesson) => lesson.id === 'ethics');
    expect(ethics?.content).toBeUndefined();
    expect(ethics?.clinicalPearls).toEqual([]);
    expect(ethics?.contributors).toEqual([]);
    expect(ethics?.editedAtLabel).toBeTruthy();
  });
});

describe('textbook bibliography helpers', () => {
  it('dedupes by authors, title and year', () => {
    const refs = dedupeReferences([
      { authors: 'Kimura J', title: 'Electrodiagnosis', journal: 'OUP', year: 2013 },
      { authors: 'Kimura J', title: 'Electrodiagnosis', journal: 'Oxford', year: 2013 },
      { authors: 'Preston DC', title: 'EMG', journal: 'Elsevier', year: 2021 },
    ]);
    expect(refs).toHaveLength(2);
    expect(referenceKey(refs[0])).toContain('kimura');
    expect(formatReference(refs[1])).toContain('2021');
  });

  it('parses authors as one person per line', () => {
    expect(parseTextbookAuthors('Dra. Ana\nDr. Luis\n')).toEqual(['Dra. Ana', 'Dr. Luis']);
  });
});
