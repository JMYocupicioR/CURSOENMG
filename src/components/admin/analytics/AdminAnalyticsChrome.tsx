import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { AdminProfileRow } from '../../../types/admin';
import { BackButton } from '../../common/BackButton';

const fieldClass =
  'w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200';

export function AdminAnalyticsScopeBar({
  student,
  cohortHref,
  studentLabel = 'Análisis del alumno',
  actions,
}: {
  student: AdminProfileRow | null;
  cohortHref: string;
  studentLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackButton
          fallback="/admin/alumnos"
          iconClassName="w-3.5 h-3.5"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
        />
        {actions}
      </div>

      {student ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">
              {studentLabel}
            </p>
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">
              {student.display_name}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {student.email}
              {student.institution ? ` · ${student.institution}` : ''}
            </p>
          </div>
          <Link
            to={cohortHref}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition shrink-0"
          >
            <Users className="w-3.5 h-3.5" />
            Ver resumen de todos los alumnos
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          Vista de cohorte: filtra por alumno, tema, fecha o modalidad según el panel.
        </div>
      )}
    </div>
  );
}

export function AnalyticsKpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-1">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
        {label}
      </span>
      <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function AnalyticsFilterGrid({ children }: { children: ReactNode }) {
  return (
    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {children}
    </div>
  );
}

export function AnalyticsField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1 min-w-0">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export function analyticsControlClass(extra = '') {
  return `${fieldClass} ${extra}`.trim();
}
