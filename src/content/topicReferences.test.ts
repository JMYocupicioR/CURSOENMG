import { describe, expect, it } from 'vitest';
import { getReferencesForTopic, normalizeReferences, resolveTopicReferences } from './topicReferences';

describe('getReferencesForTopic', () => {
  it('uses the topic list before the module default', () => {
    const refs = getReferencesForTopic('diagnostic-criteria', 'als-criteria');
    expect(refs.some((ref) => ref.title.includes('Gold Coast'))).toBe(true);
    expect(refs.some((ref) => ref.title.includes('Normative Data Task Force'))).toBe(false);
  });

  it('inherits the nearest ancestor before the module default', () => {
    const refs = getReferencesForTopic('fundamentals', 'history', ['intro-neurodiagnostics']);
    expect(refs[0]?.authors).toContain('Kimura');
    expect(refs.some((ref) => ref.authors.includes('Dumitru'))).toBe(false);
  });

  it('uses the module default when neither the topic nor its ancestors have a list', () => {
    const fallback = getReferencesForTopic('nerve-conduction', 'ulnar-motor', ['motor']);
    expect(fallback.some((ref) => ref.authors.includes('Chen'))).toBe(true);

    const fundamentalsDefault = getReferencesForTopic('fundamentals', 'tema-sin-lista');
    expect(fundamentalsDefault.some((ref) => ref.authors.includes('Dumitru'))).toBe(true);
  });
});

describe('resolveTopicReferences', () => {
  it('prefers citations saved on the topic over the static map', () => {
    const custom = [{ authors: 'Docente', title: 'Nota del curso', journal: 'ElectroDX', year: 2026 }];
    const refs = resolveTopicReferences(
      'fundamentals',
      { id: 'history', references: custom },
      [{ id: 'intro-neurodiagnostics' }]
    );
    expect(refs).toEqual(custom);
  });
});

describe('normalizeReferences', () => {
  it('drops blank rows and keeps a link only when present', () => {
    expect(normalizeReferences([
      { authors: '  ', title: 'Sin autor', journal: 'X', year: '2020' },
      { authors: 'Kimura J', title: ' Electrodiagnosis ', journal: ' Oxford ', year: '2013', url: ' https://example.com ' },
    ])).toEqual([
      { authors: 'Kimura J', title: 'Electrodiagnosis', journal: 'Oxford', year: 2013, url: 'https://example.com' },
    ]);
  });
});
