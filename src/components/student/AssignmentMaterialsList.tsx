import { ExternalLink, Link2, Paperclip } from 'lucide-react';
import {
  formatAssignmentMaterialSize,
  normalizeAssignmentMaterials,
  type AssignmentMaterial,
} from '../../utils/assignmentMaterials';

export function AssignmentMaterialsList({
  materials,
  className = '',
}: {
  materials?: AssignmentMaterial[] | null;
  className?: string;
}) {
  const items = normalizeAssignmentMaterials(materials);
  if (items.length === 0) return null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Material del profesor</p>
      <ul className="space-y-1">
        {items.map((item, index) => {
          const name = item.label || item.file_name || item.url;
          const size = item.kind === 'file' && item.byte_size ? formatAssignmentMaterialSize(item.byte_size) : '';
          return (
            <li key={`${item.kind}-${index}-${item.url}`}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:border-amber-300 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-700 dark:hover:bg-amber-950/30"
              >
                {item.kind === 'link' ? (
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                )}
                <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
                {size ? <span className="shrink-0 text-[10px] text-slate-400">{size}</span> : null}
                <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
