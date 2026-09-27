import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Calendar } from 'lucide-react';
import type { CalendarItem } from '../../../types/academicCalendar';
import { calendarItemStartDate, endOfWeekMonday, itemsInRange, startOfWeekMonday } from '../../../utils/academicCalendar';
import { calendarEventColor, calendarTypeLabel, useCalendarColorLabels } from '../../../utils/calendarColorLabels';

export function CalendarThisWeekStrip({
  items,
  href = '/admin/calendario',
  warning,
}: {
  items: CalendarItem[];
  href?: string;
  warning?: string | null;
}) {
  const { labels } = useCalendarColorLabels();
  const now = new Date();
  const weekItems = itemsInRange(items, startOfWeekMonday(now), endOfWeekMonday(now)).slice(0, 5);

  return (
    <section className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            Esta semana
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Clases, exámenes, tareas, casos y cortes en el calendario académico.</p>
        </div>
        <Link
          to={href}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Abrir calendario
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {warning ? (
        <p className="mb-3 text-xs font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 inline-flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{warning}</span>
        </p>
      ) : null}

      {weekItems.length === 0 ? (
        <p className="text-xs text-slate-400 py-3">
          {warning
            ? 'No se muestran eventos hasta que el calendario pueda recargar los talleres.'
            : 'No hay eventos esta semana. Ábrelos desde el calendario para planear el jueves o el corte.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {weekItems.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: calendarEventColor(item.type, labels) }} />
              <span className="text-slate-400 font-semibold w-24 shrink-0">
                {calendarItemStartDate(item.startsAt, item.allDay).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.title}</span>
              <span className="text-slate-400 ml-auto shrink-0">{calendarTypeLabel(item.type, labels)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
