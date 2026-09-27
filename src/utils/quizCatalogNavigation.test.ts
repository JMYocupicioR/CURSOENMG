import { describe, expect, it } from 'vitest';
import {
  buildQuizCatalogPath,
  catalogPathFromEditorSearch,
  isQuizCatalogPath,
  isQuizRowDomId,
  parseQuizCatalogStatus,
  quizCatalogReturnFromLocation,
  quizEditorPath,
  quizRowDomId,
} from './quizCatalogNavigation';

describe('quiz catalog navigation', () => {
  it('omits default filters and anchors the topic row', () => {
    const path = buildQuizCatalogPath(
      { q: '  voltaje ', modulo: 'all', estado: 'all' },
      { moduleId: 'fundamentals', topicId: 'voltage-current' },
    );

    expect(path).toBe(
      '/admin/quizzes?q=voltaje#quiz-row-fundamentals--voltage-current',
    );
  });

  it('keeps module and status filters', () => {
    expect(
      buildQuizCatalogPath({ modulo: 'fundamentals', estado: 'no_quiz' }),
    ).toBe('/admin/quizzes?modulo=fundamentals&estado=no_quiz');
  });

  it('accepts only the catalog list, not the editor route', () => {
    expect(isQuizCatalogPath('/admin/quizzes?estado=no_quiz#quiz-row-a--b')).toBe(true);
    expect(isQuizCatalogPath('/admin/quizzes/history')).toBe(false);
    expect(isQuizCatalogPath('https://evil.example/admin/quizzes')).toBe(false);
  });

  it('round-trips the highlighted row through the editor', () => {
    const list = buildQuizCatalogPath(
      { q: 'ética', modulo: 'fundamentals', estado: 'no_quiz' },
      { moduleId: 'fundamentals', topicId: 'ethics' },
    );
    const editor = quizEditorPath('ethics', 'fundamentals', list);

    expect(editor).toContain('/admin/quizzes/ethics?');
    expect(editor).toContain('moduleId=fundamentals');
    expect(editor).toContain('estado=no_quiz');
    expect(editor).toContain(`foco=${quizRowDomId('fundamentals', 'ethics')}`);
    expect(catalogPathFromEditorSearch(editor.split('?')[1] ?? '')).toBe(list);
  });

  it('drops an unsafe foco value', () => {
    expect(catalogPathFromEditorSearch('moduleId=fundamentals&foco=javascript:alert(1)')).toBe(
      '/admin/quizzes',
    );
    expect(isQuizRowDomId('quiz-row-fundamentals--ethics')).toBe(true);
    expect(isQuizRowDomId('../admin')).toBe(false);
  });

  it('prefers location state over a stored return path', () => {
    const target = quizCatalogReturnFromLocation(
      { from: '/admin/quizzes?estado=no_quiz' },
      '?from=/admin/quizzes?q=otro',
    );
    expect(target).toBe('/admin/quizzes?estado=no_quiz');
  });

  it('reads the from query when there is no state', () => {
    expect(quizCatalogReturnFromLocation(null, '?from=/admin/quizzes%3Festado%3Dno_quiz')).toBe(
      '/admin/quizzes?estado=no_quiz',
    );
  });

  it('rejects a from path that points at the editor', () => {
    expect(quizCatalogReturnFromLocation({ from: '/admin/quizzes/ethics' }, '')).toBeNull();
    expect(parseQuizCatalogStatus('no_quiz')).toBe('no_quiz');
    expect(parseQuizCatalogStatus('otro')).toBe('all');
  });
});
