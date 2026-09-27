import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BadgeCheck, PenLine, Plus, ClipboardList } from 'lucide-react';
import { getProfileById } from '../../services/editorialService';
import { useAuth } from '../../contexts/AuthProvider';
import {
  quizCatalogReturnFromLocation,
  quizEditorPath,
} from '../../utils/quizCatalogNavigation';

export function ContributionBanner({
  meta,
}: {
  meta: { version: number; publishedAt: string; lastEditedBy?: string | null };
}) {
  const [authorName, setAuthorName] = useState<string | null>(null);

  useEffect(() => {
    if (!meta.lastEditedBy) return;
    getProfileById(meta.lastEditedBy)
      .then((p) => setAuthorName(p?.display_name ?? null))
      .catch(() => setAuthorName(null));
  }, [meta.lastEditedBy]);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-sm">
      <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <span className="text-slate-600 dark:text-slate-300">
        Actualizado por la comunidad
        {authorName && <> · <strong>{authorName}</strong></>}
        {' · '}v{meta.version}
        {' · '}{new Date(meta.publishedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
      </span>
      <Link to="/comite-editorial" className="text-blue-600 hover:underline text-xs ml-auto">
        Proceso editorial
      </Link>
    </div>
  );
}

const linkClass =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition';

export function ProposeEditLink({
  moduleId,
  topicId,
  parentPath,
}: {
  moduleId: string;
  topicId: string;
  parentPath: string[];
}) {
  const location = useLocation();
  const parentId = parentPath.length > 1 ? parentPath[parentPath.length - 2] : null;
  const params = new URLSearchParams({
    moduleId,
    topicId,
    action: 'update',
  });
  if (parentId) params.set('parentId', parentId);

  return (
    <Link
      to={`/colaborador/nueva-revision?${params.toString()}`}
      state={{ from: location.pathname + location.search }}
      className={`${linkClass} text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/30`}
    >
      <PenLine className="w-3.5 h-3.5" />
      Proponer edición
    </Link>
  );
}

export function ProposeSubtopicLink({
  moduleId,
  parentId,
  label = 'Agregar subtema',
}: {
  moduleId: string;
  parentId?: string | null;
  label?: string;
}) {
  const location = useLocation();
  const params = new URLSearchParams({
    moduleId,
    action: 'create',
  });
  if (parentId) params.set('parentId', parentId);

  return (
    <Link
      to={`/colaborador/nueva-revision?${params.toString()}`}
      state={{ from: location.pathname + location.search }}
      className={`${linkClass} text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30`}
    >
      <Plus className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

export function ProposeModuleLink({ label = 'Proponer nuevo módulo' }: { label?: string }) {
  const location = useLocation();
  return (
    <Link
      to="/colaborador/nuevo-modulo"
      state={{ from: location.pathname + location.search }}
      className={`${linkClass} text-violet-700 bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/40 hover:bg-violet-100 dark:hover:bg-violet-900/30`}
    >
      <Plus className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

export function ProposeQuizLink({
  moduleId,
  topicId,
  hasQuiz = false,
  prominent = false,
}: {
  moduleId: string;
  topicId: string;
  hasQuiz?: boolean;
  prominent?: boolean;
}) {
  const location = useLocation();
  const { isAdmin, isEditor } = useAuth();
  const staffEditor = isAdmin || isEditor;
  const params = new URLSearchParams({ moduleId, topicId });
  const label = hasQuiz ? 'Modificar cuestionario' : 'Agregar cuestionario';
  const catalogReturn = quizCatalogReturnFromLocation(location.state, location.search);
  const to = staffEditor
    ? quizEditorPath(topicId, moduleId, catalogReturn)
    : `/colaborador/cuestionario?${params.toString()}`;

  return (
    <Link
      to={to}
      state={{ from: catalogReturn ?? location.pathname + location.search }}
      className={
        prominent
          ? 'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-purple-800 dark:text-purple-100 bg-purple-50 dark:bg-purple-950/40 border border-purple-300/70 dark:border-purple-700/50 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition'
          : `${linkClass} text-purple-700 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 hover:bg-purple-100 dark:hover:bg-purple-900/30`
      }
    >
      <ClipboardList className={prominent ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {label}
    </Link>
  );
}

export function ContributorContentActions({
  moduleId,
  topicId,
  parentPath,
  parentId,
  showSubtopic = true,
  isLeafTopic = false,
  compact = false,
  showQuiz = true,
  hasQuiz = false,
}: {
  moduleId: string;
  topicId?: string;
  parentPath?: string[];
  parentId?: string | null;
  showSubtopic?: boolean;
  isLeafTopic?: boolean;
  compact?: boolean;
  showQuiz?: boolean;
  hasQuiz?: boolean;
}) {
  const wrapperClass = compact
    ? 'flex flex-wrap items-center gap-2'
    : 'flex flex-wrap items-center gap-2 p-3 rounded-xl bg-violet-50/80 dark:bg-violet-950/25 border border-violet-200/60 dark:border-violet-800/40';

  return (
    <div className={wrapperClass}>
      {!compact && (
        <span className="text-xs font-medium text-violet-700 dark:text-violet-300 w-full sm:w-auto">
          Acciones editoriales
        </span>
      )}
      {topicId && parentPath && (
        <ProposeEditLink moduleId={moduleId} topicId={topicId} parentPath={parentPath} />
      )}
      {showQuiz && isLeafTopic && topicId && (
        <ProposeQuizLink moduleId={moduleId} topicId={topicId} hasQuiz={hasQuiz} />
      )}
      {showSubtopic && (
        <ProposeSubtopicLink
          moduleId={moduleId}
          parentId={parentId ?? topicId ?? null}
          label={topicId ? 'Agregar subtema' : 'Agregar tema'}
        />
      )}
    </div>
  );
}
