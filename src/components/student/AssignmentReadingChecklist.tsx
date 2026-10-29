import { Link } from 'react-router-dom';
import { Check, Circle } from 'lucide-react';
import { findModuleIdByTopicId } from '../../services/studentService';
import { getTopicLabel, getTopicPublicUrl } from '../../utils/adminUtils';

interface AssignmentReadingChecklistProps {
  topicIds: string[];
  doneIds: string[];
}

export function AssignmentReadingChecklist({ topicIds, doneIds }: AssignmentReadingChecklistProps) {
  if (topicIds.length === 0) return null;
  const done = new Set(doneIds);

  return (
    <ul className="space-y-1 rounded-2xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/50">
      {topicIds.map((topicId) => {
        const moduleId = findModuleIdByTopicId(topicId) ?? '';
        const title = getTopicLabel(moduleId, topicId);
        const href = moduleId ? getTopicPublicUrl(moduleId, topicId) : null;
        const read = done.has(topicId);
        const label = (
          <span className={read ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-200'}>
            {title}
          </span>
        );
        return (
          <li key={topicId} className="flex items-start gap-2 text-xs">
            {read ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            )}
            {href ? (
              <Link to={href} className="font-semibold hover:underline">
                {label}
              </Link>
            ) : (
              <span className="font-semibold">{label}</span>
            )}
            <span className="sr-only">{read ? 'leído' : 'pendiente'}</span>
          </li>
        );
      })}
    </ul>
  );
}
