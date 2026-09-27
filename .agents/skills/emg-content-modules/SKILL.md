---
name: emg-content-modules
description: Adds or edits educational modules, topics, and subtopics in src/content/modules. Use when adding módulos, temas, subtemas, lecciones, clinical pearls, or course content to the EMG educational platform (not ejercicios/clinical cases).
---

# EMG Content Modules — Topic & Module Authoring

This skill documents how to add or edit **modules**, **topics**, and **subtopics** in the main educational platform (`src/content/modules/`). For clinical case templates in Exercise Mode, use the `emg-exercise-templates` skill instead.

## Architecture Overview

```
src/
├── types/content.ts                    ← Module and Topic interfaces
├── content/
│   ├── modules/
│   │   ├── index.ts                    ← allModules registry (import every module here)
│   │   ├── module-01-fundamentals.ts   ← typical single-file module
│   │   ├── module-09-pathologies.ts    ← index file importing parts
│   │   └── module-09-pathologies-part*.ts
│   └── topicReferences.ts            ← optional bibliographic refs per module/topic
├── services/contentMerge.ts            ← merges Supabase published topics over static tree
├── utils/slugify.ts                    ← ID generation helper
├── utils/mediaValidation.ts            ← allowed video/image hosts
└── components/pages/
    ├── LandingPage.tsx                 ← iconMap for module icons
    ├── ModulePage.tsx                  ← /modulo/:moduleId
    └── TopicPage.tsx                   ← /modulo/:moduleId/* (renders content)
```

**URL pattern:** `/modulo/{moduleId}/{topicId}/...` — each segment is a `Topic.id` along the path.

**Existing modules (do not renumber without reason):**

| # | id | File |
|---|-----|------|
| 1 | `fundamentals` | module-01-fundamentals.ts |
| 2 | `nerve-conduction` | module-02-nerve-conduction.ts |
| 3 | `emg-needle` | module-03-emg-needle.ts |
| 4 | `late-responses` | module-04-late-responses.ts |
| 5 | `repetitive-stimulation` | module-05-repetitive-stimulation.ts |
| 6 | `evoked-potentials` | module-06-evoked-potentials.ts |
| 7 | `special-studies` | module-07-special-studies.ts |
| 8 | `topographic-anatomy` | module-08-topographic-anatomy.ts |
| 9 | `pathologies` | module-09-pathologies.ts (+ parts) |
| 10 | `diagnostic-criteria` | module-10-diagnostic-criteria.ts |
| 11 | `quick-reference` | module-11-quick-reference.ts |
| 12 | `bibliography` | module-12-bibliography.ts |
| 13 | `safety-qc` | module-13-safety-qc.ts |

## Decision Tree

```
What are you adding?

A) Subtopic under existing parent  → add to parent's children[] in module file
B) Top-level topic in a module     → add to module topics[] array
C) New module                      → new module-XX-*.ts + register in index.ts
D) Edit existing content           → find topic.id, update fields (avoid changing id)
```

**Container vs leaf:**
- **Container:** has `children`, usually `description`; content optional.
- **Leaf:** has `content` (and optional pearls, media); typically no `children`. Quizzes attach to leaf `topic.id`.

## ID Rules

- Generate with `slugify()` logic: lowercase, no accents, hyphens, max 64 chars (`src/utils/slugify.ts`).
- `topic.id` must be **unique within the module tree**.
- `module.id` must be **unique across `allModules`**.
- **Never change `topic.id`** if quizzes or published revisions may reference it.

## Workflow A: Add a Subtopic

1. Identify `moduleId` and `parentId` (grep `id: 'parentId'` in `src/content/modules/`).
2. Open the module file (or part file for split modules like pathologies).
3. Inside the parent's `children` array, append the new topic:

```typescript
{
  id: 'new-subtopic-id',
  title: 'Título en español',
  titleEn: 'English title',
  content: `Body text...`,
  clinicalPearls: ['Perla clínica 1.'],
  keyPoints: ['Punto clave 1.'],
}
```

4. (Optional) Add references in `topicReferences.ts` under `moduleId` → `parentId` or `new-subtopic-id`.
5. Verify URL: `/modulo/{moduleId}/{parentId}/new-subtopic-id`.

## Workflow B: Add a Top-Level Topic

Same as Workflow A, but add to the module's root `topics: [...]` array instead of `children`.

For a new section with many subtemas, export a `Topic` constant from a part file (see module-09 pattern) and import it into the module index.

## Workflow C: Add a New Module

1. Create `src/content/modules/module-14-short-name.ts`:

```typescript
import { Module } from '../../types/content';

export const module14: Module = {
  id: 'short-name',
  number: 14,
  title: 'Título del módulo',
  titleEn: 'Module title in English',
  emoji: '📚',
  description: 'Descripción corta en español',
  descriptionEn: 'Short English description',
  color: 'from-blue-500 to-blue-700',
  icon: 'BookOpen',
  topics: [],
};
```

2. Register in `src/content/modules/index.ts`:

```typescript
import { module14 } from './module-14-short-name';

export const allModules: Module[] = [
  // ...existing
  module14,
];
```

3. If `icon` is not already in `LandingPage.tsx` `iconMap`, import the Lucide icon and add it:

```typescript
const iconMap: Record<string, any> = {
  BookOpen, Zap, /* ...existing */,
  GraduationCap,  // new icon example
};
```

4. (Optional) Add `topicReferences.ts` block keyed by `short-name`.

**Valid module icons** (already in `iconMap`): `BookOpen`, `Zap`, `Crosshair`, `RefreshCw`, `Repeat`, `Brain`, `Wrench`, `Map`, `Stethoscope`, `ClipboardList`, `Table`, `BookMarked`, `ShieldAlert`.

**Common `color` gradients:** `from-blue-500 to-blue-700`, `from-red-500 to-red-800`, `from-emerald-500 to-teal-700`, `from-purple-500 to-violet-700`, `from-amber-500 to-orange-700`, `from-stone-500 to-stone-700`.

## Workflow D: Edit Existing Content

1. `grep` for `id: 'topic-id'` in `src/content/modules/`.
2. Update only the fields needed (`content`, pearls, media, titles).
3. Do not rename `id` unless no quizzes/revisions depend on it.

## Topic Field Reference

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Stable slug |
| `title` | yes | Spanish display title |
| `titleEn` | recommended | English title |
| `description` | containers | Short summary for module tree |
| `descriptionEn` | optional | English description |
| `content` | leaf topics | Main lesson body (see formatting below) |
| `contentEn` | optional | English body |
| `clinicalPearls` | optional | Tips shown in amber box |
| `clinicalPearlsEn` | optional | English pearls |
| `keyPoints` | optional | Bullet summaries shown in blue box |
| `keyPointsEn` | optional | English key points |
| `youtubeUrls` | optional | `{ title, videoId, startTime? }` |
| `vimeoUrls` | optional | `{ title, videoId }` |
| `videoUrls` | optional | Google Drive `{ title, driveId }` |
| `embedUrls` | optional | `{ title, embedUrl }` |
| `imageUrls` | optional | `{ src, alt, caption? }` |
| `tags` | optional | Search tags |
| `keyTerms` | optional | Search key terms |
| `children` | containers | Nested `Topic[]` |

Full copy-paste templates: [content-template.md](content-template.md), [module-template.md](module-template.md).

## Content Formatting (`TopicPage` renderer)

Not full Markdown — use these conventions in `content` strings:

| Element | Format |
|---------|--------|
| Paragraphs | Separate with `\n\n` inside template literal |
| Bold | `**texto**` |
| Lists | `• item` or `- item` |
| Tables | `\| Header \| Header \|` + `\|---|---\|` + data rows |
| Links | `[link text](https://url)` |
| Clinical values | Auto-highlighted: `5.2 ms`, `≥10%`, `49–65 m/s` |

**Allowed media hosts** (`mediaValidation.ts`): YouTube, Vimeo, Google Drive, Dailymotion, Loom; images from Drive, imgur, Wikimedia, Unsplash.

## Split Module Pattern (large modules)

When a module exceeds ~400 lines, split like module-09:

```typescript
// module-09-pathologies-part1.ts
export const peripheralNeuropathies: Topic = {
  id: 'peripheral-neuropathies',
  title: '...',
  children: [ /* ... */ ],
};

// module-09-pathologies.ts
import { peripheralNeuropathies } from './module-09-pathologies-part1';
export const module09: Module = {
  id: 'pathologies',
  topics: [peripheralNeuropathies, /* ... */],
};
```

## Bibliographic References (optional)

`src/content/topicReferences.ts` maps `moduleId` → `topicId` → `Reference[]`.

- Key by the topic the student reads (a leaf `id` is valid). `_default` is only the module-wide fallback.
- Resolution order: the topic's own published `references`, then its static key, then each ancestor, then `_default`.
- Do not add a bibliography child topic. The bibliography module is a consultation appendix and does not count as lessons.

```typescript
'my-module-id': {
  'parent-topic-id': [
    { authors: 'Kimura J', title: '...', journal: 'Oxford', year: 2013, url: 'https://...' },
  ],
  '_default': [ /* module-wide refs */ ],
},
```

## Static vs Editorial Content

- **Static (this skill):** TypeScript files in `src/content/modules/` — base tree, always present.
- **Editorial (Supabase):** Approved revisions overlay static topics via `mergeModuleTopics()` in `contentMerge.ts`. New topics can also be appended at root or under a parent if `parent_id` matches.
- Contributors use `/colaborador/nueva-revision` in the app; agents editing the repo work on static content.

**Do not confuse with:** Exercise Mode templates (`ejercicios/src/data/CaseTemplates*.ts`).

## Quizzes (separate skill)

Quizzes are **not** defined in module TypeScript files. Use the **`emg-quiz-topics`** skill for cuestionarios (`/colaborador/cuestionario`, `RevisionPayload`, scoring rules).

A new leaf topic will **not** show an evaluation until a quiz exists with `question_count > 0` for that `topic_id`. Mention this when adding leaf topics for enrolled physicians.

## Backlog of pending work

Track planned topics, modules, and quizzes in [BACKLOG.md](BACKLOG.md). When the user asks to "add pending topics" or work from a list, read and update that file (mark `[x]`, move to Completados).

## Verification Checklist

After any change:

- [ ] `topic.id` unique in module tree; `module.id` unique in `allModules`
- [ ] New module imported and listed in `index.ts`
- [ ] New module icon added to `LandingPage.tsx` `iconMap` if needed
- [ ] `npm run dev` compiles without errors
- [ ] Navigate to `/modulo/{moduleId}/...` — content renders correctly
- [ ] Sidebar (`CourseSidebar`) shows the new topic
- [ ] Pearls, key points, videos display if provided
- [ ] References added in `topicReferences.ts` if bibliographic section expected
- [ ] Quiz flagged separately if evaluation is required

## Related Skills

- Quizzes: [emg-quiz-topics](../emg-quiz-topics/SKILL.md)
- Backlog: [BACKLOG.md](BACKLOG.md)
- Exercise cases: [emg-exercise-templates](../emg-exercise-templates/SKILL.md)
