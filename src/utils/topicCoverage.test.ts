import { describe, expect, it } from 'vitest';
import type { Module } from '../types/content';
import type { SyllabusTopicOverride } from '../types/database';
import {
  assignedCoverageNodes,
  buildTopicCoverage,
  collectAdoptTopicIds,
  nodesWithoutTeacher,
} from './topicCoverage';

const modules: Module[] = [
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
        id: 'history',
        title: 'Historia',
        children: [
          { id: 'history-early', title: 'Orígenes' },
          { id: 'history-hidden', title: 'Oculto' },
        ],
      },
      { id: 'safety', title: 'Seguridad' },
    ],
  },
];

const overrides: SyllabusTopicOverride[] = [
  { module_id: 'fundamentals', topic_id: 'history-hidden', sort_order: 1, is_visible: false },
];

describe('topicCoverage', () => {
  it('lists visible nodes as unassigned when nobody confirmed', () => {
    const nodes = buildTopicCoverage(modules, overrides, [
      { topic_id: 'history', status: 'proposed' },
      { topic_id: 'history-hidden', status: 'confirmed' },
    ]);
    expect(nodes.map((n) => n.topicId)).toEqual(['history', 'history-early', 'safety']);
    expect(nodes.find((n) => n.topicId === 'history')?.coverage).toBe('proposed_only');
    expect(nodes.find((n) => n.topicId === 'safety')?.coverage).toBe('unassigned');
    expect(nodesWithoutTeacher(nodes).map((n) => n.topicId)).toEqual([
      'history',
      'history-early',
      'safety',
    ]);
  });

  it('treats one confirmed row as assigned and two as shared', () => {
    const nodes = buildTopicCoverage(modules, overrides, [
      { topic_id: 'safety', status: 'confirmed' },
      { topic_id: 'history', status: 'confirmed' },
      { topic_id: 'history', status: 'confirmed' },
      { topic_id: 'history-early', status: 'withdrawn' },
    ]);
    expect(nodes.find((n) => n.topicId === 'safety')?.coverage).toBe('assigned');
    expect(nodes.find((n) => n.topicId === 'history')?.coverage).toBe('shared');
    expect(nodes.find((n) => n.topicId === 'history-early')?.coverage).toBe('unassigned');
    expect(assignedCoverageNodes(nodes).map((n) => n.topicId)).toEqual(['history', 'safety']);
  });

  it('adopts only the node, or the node plus visible children', () => {
    const topics = modules[0].topics;
    expect(collectAdoptTopicIds(topics, 'history', 'fundamentals', overrides, false)).toEqual([
      'history',
    ]);
    expect(collectAdoptTopicIds(topics, 'history', 'fundamentals', overrides, true)).toEqual([
      'history',
      'history-early',
    ]);
    expect(collectAdoptTopicIds(topics, 'history-hidden', 'fundamentals', overrides, true)).toEqual(
      []
    );
  });
});
