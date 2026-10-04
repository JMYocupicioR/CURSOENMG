import { isAppendixModule } from '../content/appendixModules';
import { allModules } from '../content/modules';
import type { Module, Topic } from '../types/content';
import {
  areRequiredQuizzesPassed,
  type QuizCompletionGate,
} from './quizCompletionGate';

export interface ResumeVisitedHint {
  moduleId: string;
  topicId: string;
  url?: string;
}

export interface ResumeLesson {
  moduleId: string;
  moduleTitle: string;
  moduleNumber: number;
  topicId: string;
  topicTitle: string;
  url: string;
  firstIncompleteChildId?: string;
  firstIncompleteChildTitle?: string;
  pendingLessonCount: number;
}

export interface CurriculumLesson {
  moduleId: string;
  moduleTitle: string;
  moduleNumber: number;
  topic: Topic;
  path: string[];
}

export function getLeafTopicIds(topic: Topic): string[] {
  if (!topic.children || topic.children.length === 0) {
    return [topic.id];
  }
  return topic.children.flatMap(getLeafTopicIds);
}

export function getAllLeafTopicIds(topics: Topic[]): string[] {
  return topics.flatMap(getLeafTopicIds);
}

/** The student finished the lesson text. A pending quiz does not erase that mark. */
export function isLessonRead(topic: Topic, completed: Set<string>): boolean {
  if (!topic.children?.length) return completed.has(topic.id);
  const leaves = getLeafTopicIds(topic);
  return leaves.length > 0 && leaves.every((id) => completed.has(id));
}

export function isCurriculumNodeCompleted(
  topic: Topic,
  completed: Set<string>,
  quizGate?: QuizCompletionGate | null
): boolean {
  if (quizGate && !areRequiredQuizzesPassed(topic, quizGate)) return false;
  if (completed.has(topic.id)) return true;
  const leaves = getLeafTopicIds(topic);
  return (
    leaves.length > 0 &&
    leaves.every((id) => {
      if (quizGate?.quizTopicIds.has(id) && !quizGate.passedQuizTopicIds.has(id)) return false;
      return completed.has(id);
    })
  );
}

export function getCurriculumLessons(modules: Module[] = allModules): CurriculumLesson[] {
  return modules.filter((mod) => !isAppendixModule(mod.id)).flatMap((mod) =>
    mod.topics.map((topic) => ({
      moduleId: mod.id,
      moduleTitle: mod.title,
      moduleNumber: mod.number,
      topic,
      path: [topic.id],
    }))
  );
}

function lessonMatchesVisited(lesson: CurriculumLesson, visited: ResumeVisitedHint): boolean {
  if (lesson.topic.id === visited.topicId) return true;
  if (getLeafTopicIds(lesson.topic).includes(visited.topicId)) return true;
  if (
    visited.url &&
    visited.moduleId === lesson.moduleId &&
    (visited.url.includes(`/${lesson.topic.id}/`) || visited.url.endsWith(`/${lesson.topic.id}`))
  ) {
    return true;
  }
  return false;
}

export function buildLessonResumeUrl(
  moduleId: string,
  path: string[],
  topic: Topic,
  completed: Set<string>,
  quizGate?: QuizCompletionGate | null
): string {
  const base = `/modulo/${moduleId}/${path.join('/')}`;
  const firstIncompleteChild = topic.children?.find(
    (child) => !isCurriculumNodeCompleted(child, completed, quizGate)
  );
  if (firstIncompleteChild) return `${base}#section-${firstIncompleteChild.id}`;
  return base;
}

function toResumeLesson(
  lesson: CurriculumLesson,
  completed: Set<string>,
  pendingLessonCount: number,
  quizGate?: QuizCompletionGate | null
): ResumeLesson {
  const firstIncompleteChild = lesson.topic.children?.find(
    (child) => !isCurriculumNodeCompleted(child, completed, quizGate)
  );

  return {
    moduleId: lesson.moduleId,
    moduleTitle: lesson.moduleTitle,
    moduleNumber: lesson.moduleNumber,
    topicId: lesson.topic.id,
    topicTitle: lesson.topic.title,
    url: buildLessonResumeUrl(lesson.moduleId, lesson.path, lesson.topic, completed, quizGate),
    firstIncompleteChildId: firstIncompleteChild?.id,
    firstIncompleteChildTitle: firstIncompleteChild?.title,
    pendingLessonCount,
  };
}

export function resolveResumeLesson(
  completed: Set<string>,
  lastVisited?: ResumeVisitedHint | null,
  modules: Module[] = allModules,
  quizGate?: QuizCompletionGate | null
): ResumeLesson | null {
  const lessons = getCurriculumLessons(modules);
  const pending = lessons.filter(
    (lesson) => !isCurriculumNodeCompleted(lesson.topic, completed, quizGate)
  );
  if (pending.length === 0) return null;

  const fromLastVisited = lastVisited
    ? pending.find((lesson) => lessonMatchesVisited(lesson, lastVisited))
    : undefined;

  const target = fromLastVisited ?? pending[0];
  return toResumeLesson(target, completed, pending.length, quizGate);
}

export function listPendingCurriculumLessons(
  completed: Set<string>,
  options?: {
    lastVisited?: ResumeVisitedHint | null;
    limit?: number;
    moduleId?: string;
    modules?: Module[];
    quizGate?: QuizCompletionGate | null;
  }
): ResumeLesson[] {
  const modules = options?.modules ?? allModules;
  const quizGate = options?.quizGate;
  const lessons = getCurriculumLessons(modules).filter((lesson) =>
    options?.moduleId ? lesson.moduleId === options.moduleId : true
  );
  const pending = lessons.filter(
    (lesson) => !isCurriculumNodeCompleted(lesson.topic, completed, quizGate)
  );
  if (pending.length === 0) return [];

  const resume = resolveResumeLesson(completed, options?.lastVisited, modules, quizGate);
  const ordered = [...pending];
  if (resume && !options?.moduleId) {
    const resumeIndex = ordered.findIndex(
      (lesson) => lesson.moduleId === resume.moduleId && lesson.topic.id === resume.topicId
    );
    if (resumeIndex > 0) {
      const [current] = ordered.splice(resumeIndex, 1);
      ordered.unshift(current);
    }
  }

  const limit = options?.limit ?? ordered.length;
  return ordered
    .slice(0, limit)
    .map((lesson) => toResumeLesson(lesson, completed, pending.length, quizGate));
}

export function getNextPendingCurriculumLesson(
  completed: Set<string>,
  current?: { moduleId: string; topicId: string } | null,
  modules: Module[] = allModules,
  quizGate?: QuizCompletionGate | null
): ResumeLesson | null {
  const lessons = getCurriculumLessons(modules);
  const pending = lessons.filter(
    (lesson) => !isCurriculumNodeCompleted(lesson.topic, completed, quizGate)
  );
  if (pending.length === 0) return null;

  if (!current) {
    return toResumeLesson(pending[0], completed, pending.length, quizGate);
  }

  const currentIndex = lessons.findIndex(
    (lesson) =>
      lesson.moduleId === current.moduleId &&
      (lesson.topic.id === current.topicId || getLeafTopicIds(lesson.topic).includes(current.topicId))
  );

  const afterCurrent = pending.find((lesson) => {
    const idx = lessons.findIndex((item) => item.moduleId === lesson.moduleId && item.topic.id === lesson.topic.id);
    return currentIndex < 0 ? true : idx > currentIndex;
  });

  if (afterCurrent) return toResumeLesson(afterCurrent, completed, pending.length, quizGate);

  const other = pending.find(
    (lesson) => !(lesson.moduleId === current.moduleId && lesson.topic.id === current.topicId)
  );
  return other ? toResumeLesson(other, completed, pending.length, quizGate) : null;
}

export function findNextIncompleteFlatTopic(
  flat: { topic: Topic; path: string[] }[],
  currentIndex: number,
  completed: Set<string>,
  quizGate?: QuizCompletionGate | null
): { topic: Topic; path: string[] } | null {
  for (let i = currentIndex + 1; i < flat.length; i++) {
    if (!isCurriculumNodeCompleted(flat[i].topic, completed, quizGate)) {
      return flat[i];
    }
  }
  return null;
}
