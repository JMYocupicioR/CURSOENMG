import { describe, expect, it } from 'vitest';
import { applyLessonExpansions } from '../services/contentMerge';
import { module08 } from '../content/modules/module-08-topographic-anatomy';
import type { Module } from '../types/content';
import {
  buildCourseDocuments,
  extractSearchSnippet,
  searchCourseModules,
  searchDocuments,
  splitHighlightedParts,
} from './courseSearch';

const sampleModule: Module = {
  id: 'mod-test',
  number: 99,
  title: 'Lesiones nerviosas',
  titleEn: 'Nerve injuries',
  emoji: '⚡',
  description: 'Módulo de prueba',
  descriptionEn: 'Test module',
  color: 'from-blue-600 to-indigo-600',
  icon: 'Zap',
  topics: [
    {
      id: 'lesiones',
      title: 'Clasificación de Sunderland',
      children: [
        {
          id: 'radial',
          title: 'Nervio radial',
          content: 'Saturday Night Palsy: la gran mayoría son neuropraxia con excelente pronóstico.',
        },
        {
          id: 'grado-1',
          title: 'Neuropraxia',
          content: 'Otro texto sin relación con el radial.',
        },
      ],
    },
  ],
};

describe('searchCourseModules', () => {
  it('finds a nested lesson by a word in the body and returns a snippet and deep path', () => {
    const hits = searchCourseModules([sampleModule], 'Neuropraxia');
    const bodyHit = hits.find((hit) => hit.id === 'lesson:mod-test:lesiones/radial');

    expect(bodyHit).toBeDefined();
    expect(bodyHit?.href).toBe('/modulo/mod-test/lesiones/radial');
    expect(bodyHit?.breadcrumb).toBe('Lesiones nerviosas › Clasificación de Sunderland');
    expect(bodyHit?.snippet?.toLowerCase()).toContain('neuropraxia');
    expect(bodyHit?.matchKind).toBe('body');
  });

  it('matches an accented query to the unaccented word in the lesson', () => {
    const hits = searchCourseModules([sampleModule], 'neuropraxía');
    expect(hits.some((hit) => hit.topicPath?.join('/') === 'lesiones/radial')).toBe(true);
  });

  it('finds Neuropraxia inside the published radial-nerve lesson', () => {
    const hits = searchCourseModules([applyLessonExpansions(module08)], 'Neuropraxia');
    expect(hits.some((hit) => hit.snippet?.toLowerCase().includes('neuropraxia'))).toBe(true);
    expect(hits.some((hit) => hit.href?.includes('/modulo/'))).toBe(true);
  });

  it('can restrict hits to eligible leaf topics, as the move-question picker does', () => {
    const docs = buildCourseDocuments([sampleModule]).filter(
      (doc) => doc.topicPath?.[doc.topicPath.length - 1] === 'radial',
    );
    const hits = searchDocuments(docs, 'Neuropraxia');
    expect(hits).toHaveLength(1);
    expect(hits[0].topicPath).toEqual(['lesiones', 'radial']);
  });

  it('ranks a title match above a mention in the body', () => {
    const hits = searchCourseModules([sampleModule], 'neuropraxia');
    const titleHit = hits.find((hit) => hit.id === 'lesson:mod-test:lesiones/grado-1');
    const bodyHit = hits.find((hit) => hit.id === 'lesson:mod-test:lesiones/radial');

    expect(titleHit).toBeDefined();
    expect(bodyHit).toBeDefined();
    expect(hits[0].id).toBe(titleHit?.id);
    expect(titleHit!.rank).toBeLessThan(bodyHit!.rank);
  });
});

describe('extractSearchSnippet', () => {
  it('keeps the match inside a short excerpt', () => {
    const snippet = extractSearchSnippet(
      'Saturday Night Palsy: la gran mayoría son neuropraxia con excelente pronóstico.',
      'neuropraxia',
    );
    expect(snippet.toLowerCase()).toContain('neuropraxia');
    expect(snippet.length).toBeLessThanOrEqual(140);
  });
});

describe('splitHighlightedParts', () => {
  it('marks the original accented span for an unaccented query', () => {
    const parts = splitHighlightedParts('La neuropraxía es reversible.', 'neuropraxia');
    expect(parts.some((part) => part.hit && part.text.toLowerCase() === 'neuropraxía')).toBe(true);
  });
});
