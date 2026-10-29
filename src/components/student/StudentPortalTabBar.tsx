import {
  Activity,
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
} from 'lucide-react';
import type { NotificationColorTone } from '../../services/studentService';

export type StudentPortalTab =
  | 'summary'
  | 'performance'
  | 'modules'
  | 'quizzes'
  | 'assignments'
  | 'notifications'
  | 'certificate'
  | 'study';

interface TabSpec {
  id: StudentPortalTab;
  label: string;
  icon: typeof Activity;
}

const TABS: TabSpec[] = [
  { id: 'summary', label: 'Resumen', icon: Activity },
  { id: 'performance', label: 'Desempeño', icon: GraduationCap },
  { id: 'modules', label: 'Clases', icon: BookOpen },
  { id: 'quizzes', label: 'Quizzes', icon: CheckCircle2 },
  { id: 'assignments', label: 'Tareas', icon: ClipboardList },
  { id: 'notifications', label: 'Avisos', icon: Bell },
  { id: 'certificate', label: 'Constancia', icon: Award },
  { id: 'study', label: 'Estudio', icon: FileText },
];

export function StudentPortalTabBar({
  activeTab,
  onSelect,
  counts,
  notificationTone = 'urgent',
}: {
  activeTab: StudentPortalTab;
  onSelect: (tab: StudentPortalTab) => void;
  counts: Partial<Record<StudentPortalTab, number>>;
  notificationTone?: NotificationColorTone;
}) {
  return (
    <div
      role="tablist"
      aria-label="Portal del alumno"
      className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2.5 mb-6"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const count = counts[tab.id];
        const hasCount = typeof count === 'number' && count > 0;
        const selected = activeTab === tab.id;
        const isUnreadNotifications = tab.id === 'notifications' && hasCount;
        const isPendingAssignments = tab.id === 'assignments' && hasCount;

        let buttonClasses = '';
        let badgeClasses = '';
        let pingDotClasses = '';

        if (isUnreadNotifications) {
          if (notificationTone === 'warning') {
            buttonClasses = selected
              ? 'bg-amber-500 text-white border border-amber-500 shadow-xs'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/70';
            badgeClasses = selected ? 'bg-white text-amber-700' : 'bg-amber-500 text-white';
            pingDotClasses = 'bg-amber-500 dark:bg-amber-400';
          } else if (notificationTone === 'info') {
            buttonClasses = selected
              ? 'bg-sky-600 text-white border border-sky-600 shadow-xs'
              : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-200 border border-sky-300 dark:border-sky-700 hover:bg-sky-100 dark:hover:bg-sky-900/70';
            badgeClasses = selected ? 'bg-white text-sky-700' : 'bg-sky-600 text-white';
            pingDotClasses = 'bg-sky-500 dark:bg-sky-400';
          } else if (notificationTone === 'success') {
            buttonClasses = selected
              ? 'bg-emerald-600 text-white border border-emerald-600 shadow-xs'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/70';
            badgeClasses = selected ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white';
            pingDotClasses = 'bg-emerald-500 dark:bg-emerald-400';
          } else {
            buttonClasses = selected
              ? 'bg-rose-600 text-white border border-rose-600 shadow-xs'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 border border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/70';
            badgeClasses = selected ? 'bg-white text-rose-700' : 'bg-rose-600 text-white';
            pingDotClasses = 'bg-rose-600 dark:bg-rose-400 animate-ping';
          }
        } else if (selected) {
          buttonClasses = 'bg-blue-600 text-white border border-blue-600 shadow-xs';
          badgeClasses = 'bg-white/20 text-white';
        } else if (isPendingAssignments) {
          buttonClasses =
            'bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800/80 hover:bg-amber-100/80 dark:hover:bg-amber-900/50';
          badgeClasses = 'bg-amber-500 text-white';
        } else {
          buttonClasses =
            'text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800';
          badgeClasses = 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200';
        }

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onSelect(tab.id)}
            className={`relative flex items-center gap-2 px-3.5 py-2 min-h-[42px] rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${buttonClasses}`}
          >
            {isUnreadNotifications && !selected && (
              <span className={`w-2 h-2 rounded-full shrink-0 ${pingDotClasses}`} />
            )}
            <Icon className="w-4 h-4 shrink-0" />
            <span>{tab.label}</span>
            {hasCount && (
              <span
                className={`px-1.5 py-0.5 rounded-md text-xs font-semibold font-mono tabular-nums leading-none ${badgeClasses}`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
