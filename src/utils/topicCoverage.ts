import type { Module, Topic } from '../types/content';
import type { SyllabusTopicOverride, TopicTeachingCommitment } from '../types/database';
import { findTopicInList, isTopicVisible } from './syllabusTree';

export type TopicCoverageKind = 'unassigned' | 'proposed_only' | 'assigned' | 'shared';

export interface TopicCoverageNode<T extends TopicCommitmentLike = TopicCommitmentLike> {
  moduleId: string;
  moduleTitle: string;
  topicId: string;
  topicTitle: string;
  parentId: string | null;
  depth: number;
  pathTitles: string[];
  confirmed: T[];
  proposed: T[];
  coverage: TopicCoverageKind;
}

export type TopicCommitmentLike = Pick<TopicTeachingCommitment, 'topic_id' | 'status'>;

function coverageKind(confirmedCount: number, proposedCount: number): TopicCoverageKind {
  if (confirmedCount >= 2) return 'shared';
  if (confirmedCount === 1) return 'assigned';
  if (proposedCount > 0) return 'proposed_only';
  return 'unassigned';
}

function walkVisibleTopics<T extends TopicCommitmentLike>(
  topics: Topic[],
  moduleId: string,
  moduleTitle: string,
  overrides: SyllabusTopicOverride[],
  parentId: string | null,
  depth: number,
  pathTitles: string[],
  byTopic: Map<string, T[]>,
  out: TopicCoverageNode<T>[]
): void {
  for (const topic of topics) {
    if (!isTopicVisible(overrides, moduleId, topic.id)) continue;
    const rows = byTopic.get(topic.id) ?? [];
    const confirmed = rows.filter((row) => row.status === 'confirmed');
    const proposed = rows.filter((row) => row.status === 'proposed');
    const nextPath = [...pathTitles, topic.title];
    out.push({
      moduleId,
      moduleTitle,
      topicId: topic.id,
      topicTitle: topic.title,
      parentId,
      depth,
      pathTitles: nextPath,
      confirmed,
      proposed,
      coverage: coverageKind(confirmed.length, proposed.length),
    });
    if (topic.children?.length) {
      walkVisibleTopics(
        topic.children,
        moduleId,
        moduleTitle,
        overrides,
        topic.id,
        depth + 1,
        nextPath,
        byTopic,
        out
      );
    }
  }
}

export function buildTopicCoverage<T extends TopicCommitmentLike>(
  modules: Module[],
  overrides: SyllabusTopicOverride[],
  commitments: T[]
): TopicCoverageNode<T>[] {
  const byTopic = new Map<string, T[]>();
  for (const row of commitments) {
    if (row.status === 'withdrawn') continue;
    const list = byTopic.get(row.topic_id) ?? [];
    list.push(row);
    byTopic.set(row.topic_id, list);
  }

  const out: TopicCoverageNode<T>[] = [];
  for (const mod of modules) {
    walkVisibleTopics(mod.topics, mod.id, mod.title, overrides, null, 0, [mod.title], byTopic, out);
  }
  return out;
}

export function nodesWithoutTeacher<T extends TopicCommitmentLike>(
  nodes: TopicCoverageNode<T>[]
): TopicCoverageNode<T>[] {
  return nodes.filter((node) => node.coverage === 'unassigned' || node.coverage === 'proposed_only');
}

export function assignedCoverageNodes<T extends TopicCommitmentLike>(
  nodes: TopicCoverageNode<T>[]
): TopicCoverageNode<T>[] {
  return nodes.filter((node) => node.coverage === 'assigned' || node.coverage === 'shared');
}

function collectVisibleDescendantIds(
  topic: Topic,
  moduleId: string,
  overrides: SyllabusTopicOverride[]
): string[] {
  const ids: string[] = [];
  for (const child of topic.children ?? []) {
    if (!isTopicVisible(overrides, moduleId, child.id)) continue;
    ids.push(child.id, ...collectVisibleDescendantIds(child, moduleId, overrides));
  }
  return ids;
}

/** Nodo elegido, o ese nodo más los descendientes visibles si includeSubtree. */
export function collectAdoptTopicIds(
  topics: Topic[],
  topicId: string,
  moduleId: string,
  overrides: SyllabusTopicOverride[],
  includeSubtree: boolean
): string[] {
  const topic = findTopicInList(topics, topicId);
  if (!topic || !isTopicVisible(overrides, moduleId, topic.id)) return [];
  if (!includeSubtree) return [topic.id];
  return [topic.id, ...collectVisibleDescendantIds(topic, moduleId, overrides)];
}

