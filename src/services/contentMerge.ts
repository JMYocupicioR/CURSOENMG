import type { Module, Topic } from '../types/content';
import type { PublishedTopic, RevisionPayload } from '../types/database';
import { getLessonExpansion } from '../content/lessonExpansions';

function extractLegacyPdfs(content?: string | null): { title: string; url: string; description?: string; author?: string }[] {
  if (!content) return [];
  const list: { title: string; url: string; description?: string; author?: string }[] = [];
  const regex = />\s*📄\s*\*\*Recurso Clínico Docente:\*\*\s*\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)(?:\s*>\s*\*Aportado por ([^*]+)\*)?(?:\s*>\s*([^\n\r]+))?/gi;
  let m;
  while ((m = regex.exec(content)) !== null) {
    list.push({
      title: m[1].trim(),
      url: m[2].trim(),
      author: m[3]?.trim(),
      description: m[4]?.trim(),
    });
  }
  return list;
}

export function publishedTopicToTopic(pt: PublishedTopic): Topic {
  const media = pt.media ?? {};
  const legacyPdfs = extractLegacyPdfs(pt.content);
  const combinedPdfs = [...(media.pdfUrls ?? [])];
  for (const leg of legacyPdfs) {
    if (!combinedPdfs.some((p) => p.url === leg.url)) {
      combinedPdfs.push(leg);
    }
  }

  return {
    id: pt.id,
    title: pt.title,
    titleEn: pt.title_en ?? undefined,
    description: pt.description ?? undefined,
    descriptionEn: pt.description_en ?? undefined,
    content: pt.content ?? undefined,
    contentEn: pt.content_en ?? undefined,
    videoUrls: media.videoUrls?.length ? media.videoUrls : undefined,
    youtubeUrls: media.youtubeUrls?.length ? media.youtubeUrls : undefined,
    vimeoUrls: media.vimeoUrls?.length ? media.vimeoUrls : undefined,
    embedUrls: media.embedUrls?.length ? media.embedUrls : undefined,
    imageUrls: media.imageUrls?.length ? media.imageUrls : undefined,
    pdfUrls: combinedPdfs.length ? combinedPdfs : undefined,
    clinicalPearls: pt.clinical_pearls?.length ? pt.clinical_pearls : undefined,
    clinicalPearlsEn: pt.clinical_pearls_en?.length ? pt.clinical_pearls_en : undefined,
    keyPoints: pt.key_points?.length ? pt.key_points : undefined,
    keyPointsEn: pt.key_points_en?.length ? pt.key_points_en : undefined,
    references: media.references?.length ? media.references : undefined,
    tags: pt.tags?.length ? pt.tags : undefined,
    keyTerms: pt.key_terms?.length ? pt.key_terms : undefined,
    contributionMeta: {
      version: pt.version,
      publishedAt: pt.published_at,
      lastEditedBy: pt.last_edited_by,
    },
  };
}

export function topicToRevisionPayload(topic: Topic): RevisionPayload {
  return {
    id: topic.id,
    title: topic.title,
    titleEn: topic.titleEn,
    description: topic.description,
    descriptionEn: topic.descriptionEn,
    content: topic.content,
    contentEn: topic.contentEn,
    videoUrls: topic.videoUrls ?? [],
    youtubeUrls: topic.youtubeUrls ?? [],
    vimeoUrls: topic.vimeoUrls ?? [],
    embedUrls: topic.embedUrls ?? [],
    imageUrls: topic.imageUrls ?? [],
    pdfUrls: topic.pdfUrls ?? [],
    media: {
      videoUrls: topic.videoUrls ?? [],
      youtubeUrls: topic.youtubeUrls ?? [],
      vimeoUrls: topic.vimeoUrls ?? [],
      embedUrls: topic.embedUrls ?? [],
      imageUrls: topic.imageUrls ?? [],
      pdfUrls: topic.pdfUrls ?? [],
      references: topic.references ?? [],
    },
    clinicalPearls: topic.clinicalPearls ?? [],
    clinicalPearlsEn: topic.clinicalPearlsEn ?? [],
    keyPoints: topic.keyPoints ?? [],
    keyPointsEn: topic.keyPointsEn ?? [],
    references: topic.references ?? [],
    tags: topic.tags ?? [],
    keyTerms: topic.keyTerms ?? [],
  };
}

function overlayTopic(base: Topic, overlay: Topic): Topic {
  return {
    ...base,
    title: overlay.title || base.title,
    titleEn: overlay.titleEn ?? base.titleEn,
    description: overlay.description ?? base.description,
    descriptionEn: overlay.descriptionEn ?? base.descriptionEn,
    content: overlay.content ?? base.content,
    contentEn: overlay.contentEn ?? base.contentEn,
    videoUrls: overlay.videoUrls ?? base.videoUrls,
    youtubeUrls: overlay.youtubeUrls ?? base.youtubeUrls,
    vimeoUrls: overlay.vimeoUrls ?? base.vimeoUrls,
    embedUrls: overlay.embedUrls ?? base.embedUrls,
    imageUrls: overlay.imageUrls ?? base.imageUrls,
    pdfUrls: overlay.pdfUrls ?? base.pdfUrls,
    clinicalPearls: overlay.clinicalPearls ?? base.clinicalPearls,
    clinicalPearlsEn: overlay.clinicalPearlsEn ?? base.clinicalPearlsEn,
    keyPoints: overlay.keyPoints ?? base.keyPoints,
    keyPointsEn: overlay.keyPointsEn ?? base.keyPointsEn,
    references: overlay.references?.length ? overlay.references : base.references,
    tags: overlay.tags ?? base.tags,
    keyTerms: overlay.keyTerms ?? base.keyTerms,
    children: base.children,
    contributionMeta: overlay.contributionMeta ?? base.contributionMeta,
  };
}

export function findTopicInTree(topics: Topic[], topicId: string): Topic | null {
  for (const t of topics) {
    if (t.id === topicId) return t;
    if (t.children) {
      const found = findTopicInTree(t.children, topicId);
      if (found) return found;
    }
  }
  return null;
}

export function findTopicPathInTree(
  topics: Topic[],
  topicId: string,
  parentPath: string[] = []
): string[] | null {
  for (const t of topics) {
    const path = [...parentPath, t.id];
    if (t.id === topicId) return path;
    if (t.children) {
      const found = findTopicPathInTree(t.children, topicId, path);
      if (found) return found;
    }
  }
  return null;
}

function replaceTopicInTree(
  topics: Topic[],
  topicId: string,
  updater: (topic: Topic) => Topic
): Topic[] {
  return topics.map((t) => {
    if (t.id === topicId) return updater(t);
    if (t.children) {
      return { ...t, children: replaceTopicInTree(t.children, topicId, updater) };
    }
    return t;
  });
}

function appendChildToTree(topics: Topic[], parentId: string, child: Topic): Topic[] {
  return topics.map((t) => {
    if (t.id === parentId) {
      const children = [...(t.children ?? []), child];
      return { ...t, children };
    }
    if (t.children) {
      return { ...t, children: appendChildToTree(t.children, parentId, child) };
    }
    return t;
  });
}

function overlayExpansion(topic: Topic): Topic {
  const expansion = getLessonExpansion(topic.id, topic.title);
  if (!expansion) {
    return {
      ...topic,
      children: topic.children?.map(overlayExpansion),
    };
  }
  return {
    ...topic,
    content: [topic.content, expansion.content].filter(Boolean).join('\n\n'),
    contentEn: [topic.contentEn, expansion.contentEn].filter(Boolean).join('\n\n') || topic.contentEn,
    clinicalPearls: [...(topic.clinicalPearls ?? []), ...(expansion.clinicalPearls ?? [])],
    clinicalPearlsEn: [...(topic.clinicalPearlsEn ?? []), ...(expansion.clinicalPearlsEn ?? [])],
    keyPoints: [...(topic.keyPoints ?? []), ...(expansion.keyPoints ?? [])],
    keyPointsEn: [...(topic.keyPointsEn ?? []), ...(expansion.keyPointsEn ?? [])],
    imageUrls: [...(topic.imageUrls ?? []), ...(expansion.imageUrls ?? [])],
    pdfUrls: topic.pdfUrls,
    children: topic.children?.map(overlayExpansion),
  };
}

export function applyLessonExpansions(mod: Module): Module {
  return { ...mod, topics: mod.topics.map(overlayExpansion) };
}

export function mergeModuleTopics(mod: Module, publishedList: PublishedTopic[]): Module {
  let topics: Topic[] = structuredClone(mod.topics);

  const sorted = [...publishedList].sort((a, b) => a.sort_order - b.sort_order);

  for (const pt of sorted) {
    const overlay = publishedTopicToTopic(pt);
    if (findTopicInTree(topics, pt.id)) {
      topics = replaceTopicInTree(topics, pt.id, (existing) => overlayTopic(existing, overlay));
    } else if (pt.parent_id && findTopicInTree(topics, pt.parent_id)) {
      topics = appendChildToTree(topics, pt.parent_id, overlay);
    } else {
      topics = [...topics, overlay];
    }
  }

  return applyLessonExpansions({ ...mod, topics });
}

export function findTopicByPath(
  topics: Topic[],
  pathParts: string[]
): { topic: Topic | null; breadcrumbs: Topic[] } {
  const breadcrumbs: Topic[] = [];
  let current: Topic[] = topics;
  let found: Topic | null = null;
  for (const part of pathParts) {
    const topic = current.find((t) => t.id === part);
    if (!topic) break;
    breadcrumbs.push(topic);
    found = topic;
    current = topic.children || [];
  }
  return { topic: found, breadcrumbs };
}

/** Stable list key when the same topic slug appears more than once. */
export function topicListKey(moduleId: string, path: string[], occurrence = 0): string {
  const base = `${moduleId}:${path.join('/')}`;
  return occurrence === 0 ? base : `${base}#${occurrence}`;
}

export function getAllFlatTopics(
  topics: Topic[],
  parentPath: string[] = []
): { topic: Topic; path: string[] }[] {
  const result: { topic: Topic; path: string[] }[] = [];
  for (const t of topics) {
    const path = [...parentPath, t.id];
    result.push({ topic: t, path });
    if (t.children) result.push(...getAllFlatTopics(t.children, path));
  }
  return result;
}
