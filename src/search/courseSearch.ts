import { allModules } from '../content/modules';
import { applyLessonExpansions } from '../services/contentMerge';
import type { Module, Topic } from '../types/content';
import {
  extractSearchSnippet,
  normalizeSearchText,
} from './searchText';

export {
  extractSearchSnippet,
  findSearchMatchRanges,
  normalizeSearchText,
  splitHighlightedParts,
} from './searchText';
export type { HighlightedPart } from './searchText';

export type CourseSearchMatchKind = 'titleStart' | 'title' | 'pearl' | 'body';
export type CourseSearchDocKind = 'lesson' | 'command';

export interface CourseSearchDocument {
  id: string;
  kind: CourseSearchDocKind;
  title: string;
  breadcrumb: string;
  href?: string;
  titleText: string;
  pearlText: string;
  bodyText: string;
  moduleId?: string;
  topicPath?: string[];
}

export interface CourseSearchHit {
  id: string;
  kind: CourseSearchDocKind;
  title: string;
  breadcrumb: string;
  href?: string;
  snippet?: string;
  matchKind: CourseSearchMatchKind;
  rank: number;
  moduleId?: string;
  topicPath?: string[];
}

export interface CommandSearchInput {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  href?: string;
}

const DEFAULT_LIMIT = 20;

const MATCH_RANK: Record<CourseSearchMatchKind, number> = {
  titleStart: 0,
  title: 1,
  pearl: 2,
  body: 3,
};

let staticDocuments: CourseSearchDocument[] | null = null;

export function stripMarkdownForSearch(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/^[•\-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function lessonHrefWithQuery(href: string, query: string): string {
  const q = query.trim();
  if (!q) return href;
  const join = href.includes('?') ? '&' : '?';
  return `${href}${join}q=${encodeURIComponent(q)}`;
}

export function commandItemToDocument(item: CommandSearchInput): CourseSearchDocument {
  return {
    id: item.id,
    kind: 'command',
    title: item.title,
    breadcrumb: item.subtitle ?? item.category,
    href: item.href,
    titleText: item.title,
    pearlText: '',
    bodyText: [item.subtitle, item.category].filter(Boolean).join(' '),
  };
}

export function buildCourseDocuments(modules: Module[]): CourseSearchDocument[] {
  const docs: CourseSearchDocument[] = [];
  for (const mod of modules) {
    collectTopicDocuments(mod.topics ?? [], mod, [], [], docs);
  }
  return docs;
}

export function getStaticCourseDocuments(): CourseSearchDocument[] {
  if (!staticDocuments) {
    staticDocuments = buildCourseDocuments(allModules.map((mod) => applyLessonExpansions(mod)));
  }
  return staticDocuments;
}

export function searchDocuments(
  docs: CourseSearchDocument[],
  query: string,
  limit = DEFAULT_LIMIT,
): CourseSearchHit[] {
  if (normalizeSearchText(query.trim()).length < 2) return [];

  const hits: CourseSearchHit[] = [];
  for (const doc of docs) {
    const hit = matchDocument(doc, query);
    if (hit) hits.push(hit);
  }
  return sortSearchHits(hits).slice(0, limit);
}

export function searchCourseModules(
  modules: Module[],
  query: string,
  limit = DEFAULT_LIMIT,
): CourseSearchHit[] {
  return searchDocuments(buildCourseDocuments(modules), query, limit);
}

export function searchStaticCourse(query: string, limit = DEFAULT_LIMIT): CourseSearchHit[] {
  return searchDocuments(getStaticCourseDocuments(), query, limit);
}

export function searchCommandItems(
  items: CommandSearchInput[],
  query: string,
  limit = DEFAULT_LIMIT,
): CourseSearchHit[] {
  return searchDocuments(items.map(commandItemToDocument), query, limit);
}

export function mergeSearchHits(groups: CourseSearchHit[], limit = DEFAULT_LIMIT): CourseSearchHit[] {
  return sortSearchHits(groups).slice(0, limit);
}

export function searchLabel(matchKind: CourseSearchMatchKind): 'Tema' | 'En el texto' {
  return matchKind === 'titleStart' || matchKind === 'title' ? 'Tema' : 'En el texto';
}

function sortSearchHits(hits: CourseSearchHit[]): CourseSearchHit[] {
  return [...hits].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.title.localeCompare(b.title, 'es');
  });
}

function matchDocument(doc: CourseSearchDocument, query: string): CourseSearchHit | null {
  const qNorm = normalizeSearchText(query.trim());
  const titleNorm = normalizeSearchText(doc.titleText);
  let matchKind: CourseSearchMatchKind | null = null;
  let snippetSource = '';

  if (titleStartsWithQuery(doc.titleText, qNorm)) {
    matchKind = 'titleStart';
  } else if (titleNorm.replace(/\n/g, ' ').includes(qNorm)) {
    matchKind = 'title';
  } else if (normalizeSearchText(doc.pearlText).includes(qNorm)) {
    matchKind = 'pearl';
    snippetSource = doc.pearlText;
  } else if (normalizeSearchText(doc.bodyText).includes(qNorm)) {
    matchKind = 'body';
    snippetSource = doc.bodyText;
  }

  if (!matchKind) return null;

  return {
    id: doc.id,
    kind: doc.kind,
    title: doc.title,
    breadcrumb: doc.breadcrumb,
    href: doc.href,
    snippet: snippetSource ? extractSearchSnippet(snippetSource, query) : undefined,
    matchKind,
    rank: MATCH_RANK[matchKind],
    moduleId: doc.moduleId,
    topicPath: doc.topicPath,
  };
}

function titleStartsWithQuery(titleText: string, qNorm: string): boolean {
  return titleText
    .split('\n')
    .some((part) => normalizeSearchText(part).startsWith(qNorm));
}

function collectTopicDocuments(
  topics: Topic[],
  mod: Module,
  parentPath: string[],
  parentTitles: string[],
  docs: CourseSearchDocument[],
) {
  for (const topic of topics) {
    const topicPath = [...parentPath, topic.id];
    const titlePath = [...parentTitles, topic.title];
    docs.push(topicToDocument(mod, topic, topicPath, titlePath));
    if (topic.children?.length) {
      collectTopicDocuments(topic.children, mod, topicPath, titlePath, docs);
    }
  }
}

function topicToDocument(
  mod: Module,
  topic: Topic,
  topicPath: string[],
  titlePath: string[],
): CourseSearchDocument {
  const pearls = [
    ...(topic.clinicalPearls ?? []),
    ...(topic.clinicalPearlsEn ?? []),
    ...(topic.keyPoints ?? []),
    ...(topic.keyPointsEn ?? []),
    ...(topic.tags ?? []),
    ...(topic.keyTerms ?? []),
  ].join(' ');

  const body = [
    topic.description,
    topic.descriptionEn,
    stripMarkdownForSearch(topic.content ?? ''),
    stripMarkdownForSearch(topic.contentEn ?? ''),
    collectMediaTitles(topic),
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: `lesson:${mod.id}:${topicPath.join('/')}`,
    kind: 'lesson',
    title: topic.title,
    breadcrumb: [mod.title, ...titlePath.slice(0, -1)].join(' › '),
    href: `/modulo/${mod.id}/${topicPath.join('/')}`,
    titleText: [topic.title, topic.titleEn].filter(Boolean).join('\n'),
    pearlText: pearls,
    bodyText: body,
    moduleId: mod.id,
    topicPath,
  };
}

function collectMediaTitles(topic: Topic): string {
  const titles: string[] = [];
  for (const item of topic.videoUrls ?? []) titles.push(item.title);
  for (const item of topic.youtubeUrls ?? []) titles.push(item.title);
  for (const item of topic.vimeoUrls ?? []) titles.push(item.title);
  for (const item of topic.embedUrls ?? []) titles.push(item.title);
  for (const item of topic.imageUrls ?? []) {
    if (item.alt) titles.push(item.alt);
    if (item.caption) titles.push(item.caption);
  }
  for (const item of topic.pdfUrls ?? []) {
    titles.push(item.title);
    if (item.description) titles.push(item.description);
  }
  return titles.join(' ');
}

