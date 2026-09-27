import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Palette, RefreshCw } from 'lucide-react';
import type { CalendarBoardView, CalendarItem, CalendarItemType } from '../../../types/academicCalendar';
import {
  addDays,
  addMonths,
  formatMonthTitle,
  formatWeekTitle,
  getMonthGridDays,
  getWeekDays,
  calendarItemStartDate,
  itemsForDay,
  itemsInRange,
  startOfWeekMonday,
  toLocalDateKey,
} from '../../../utils/academicCalendar';
import {
  calendarChipStyle,
  calendarEventColor,
  calendarTypeColor,
  calendarTypeLabel,
  useCalendarColorLabels,
} from '../../../utils/calendarColorLabels';
import { CalendarColorLabelsEditor } from './CalendarColorLabelsEditor';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const FILTERS: { id: CalendarItemType | 'all' }[] = [
  { id: 'all' },
  { id: 'session' },
  { id: 'exam' },
  { id: 'practical_task' },
  { id: 'clinical_case' },
  { id: 'milestone' },
];

function eventTimeLabel(item: CalendarItem): string | null {
  if (item.allDay) return null;
  return new Date(item.startsAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function EventChip({
  item,
  compact,
  selected,
  color,
  typeLabel,
  onClick,
}: {
  item: CalendarItem;
  compact?: boolean;
  selected?: boolean;
  color: string;
  typeLabel: string;
  onClick: () => void;
}) {
  const time = eventTimeLabel(item);
  const title = `${typeLabel} · ${item.title}`;

  if (compact) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={`w-full flex items-center gap-1 px-1 py-0.5 rounded-md text-left text-[11px] font-semibold leading-tight ${
          selected
            ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-indigo-400'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
        }`}
        title={title}
      >
        <span className="w-[3px] h-3.5 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
        <span className="min-w-0 truncate text-slate-800 dark:text-slate-100">
          <span className="sr-only">{typeLabel} · </span>
          {time ? <span className="text-slate-500 dark:text-slate-400 font-bold mr-1">{time}</span> : null}
          {item.title}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`w-full text-left px-1.5 py-1 rounded-lg border text-[11px] font-bold leading-tight truncate ${
        selected ? 'ring-2 ring-indigo-400' : ''
      }`}
      style={calendarChipStyle(color)}
      title={title}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: color }} />
      {time ? `${time} · ${item.title}` : item.title}
    </button>
  );
}

export function CalendarBoard({
  view,
  onViewChange,
  anchor,
  onAnchorChange,
  items,
  typeFilter,
  onTypeFilterChange,
  selectedId,
  onSelectItem,
  onSelectDay,
  itemCount,
  loading,
  onRefresh,
}: {
  view: CalendarBoardView;
  onViewChange: (view: CalendarBoardView) => void;
  anchor: Date;
  onAnchorChange: (next: Date) => void;
  items: CalendarItem[];
  typeFilter: CalendarItemType | 'all';
  onTypeFilterChange: (filter: CalendarItemType | 'all') => void;
  selectedId?: string | null;
  onSelectItem: (item: CalendarItem) => void;
  onSelectDay: (day: Date) => void;
  itemCount?: number;
  loading?: boolean;
  onRefresh?: () => void;
}) {
  const todayKey = toLocalDateKey(new Date());
  const title = view === 'week' ? formatWeekTitle(anchor) : formatMonthTitle(anchor);
  const [overflowKey, setOverflowKey] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const { labels } = useCalendarColorLabels();

  useEffect(() => {
    if (!legendOpen) return;
    const close = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-color-legend]')) return;
      setLegendOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLegendOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [legendOpen]);

  useEffect(() => {
    if (!overflowKey) return;
    const close = (event: MouseEvent) => {
      const node = event.target;
      if (node instanceof Element && node.closest('[data-day-overflow]')) return;
      setOverflowKey(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOverflowKey(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [overflowKey]);

  const goPrev = () => {
    if (view === 'week') onAnchorChange(addDays(startOfWeekMonday(anchor), -7));
    else if (view === 'agenda') onAnchorChange(addDays(anchor, -14));
    else onAnchorChange(addMonths(anchor, -1));
  };

  const goNext = () => {
    if (view === 'week') onAnchorChange(addDays(startOfWeekMonday(anchor), 7));
    else if (view === 'agenda') onAnchorChange(addDays(anchor, 14));
    else onAnchorChange(addMonths(anchor, 1));
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <button type="button" onClick={goPrev} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" aria-label="Periodo anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => onAnchorChange(new Date())} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              Hoy
            </button>
            <button type="button" onClick={goNext} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" aria-label="Periodo siguiente">
              <ChevronRight className="w-4 h-4" />
            </button>
            <h2 className="ml-1 text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {typeof itemCount === 'number' ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                {loading ? 'Sincronizando…' : `${itemCount} eventos`}
              </p>
            ) : null}
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            ) : null}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              {(['month', 'week', 'agenda'] as CalendarBoardView[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onViewChange(option)}
                  aria-pressed={view === option}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                    view === option ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {option === 'month' ? 'Mes' : option === 'week' ? 'Semana' : 'Agenda'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-1.5" data-color-legend>
          {FILTERS.map((filter) => {
            const active = typeFilter === filter.id;
            const color = filter.id === 'all' ? '#94a3b8' : calendarTypeColor(filter.id, labels);
            const label = filter.id === 'all' ? 'Todo' : calendarTypeLabel(filter.id, labels);
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onTypeFilterChange(filter.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                  active
                    ? 'text-white border-transparent'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                }`}
                style={active ? { backgroundColor: color, borderColor: color } : undefined}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                {label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setLegendOpen((open) => !open)}
            aria-expanded={legendOpen}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 ml-auto"
          >
            <Palette className="w-3.5 h-3.5" />
            Colores
          </button>
          <CalendarColorLabelsEditor open={legendOpen} onClose={() => setLegendOpen(false)} />
        </div>
      </div>

      {view === 'month' ? (
        <div className="p-2 sm:p-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center py-1">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getMonthGridDays(anchor).map((day) => {
              const key = toLocalDateKey(day);
              const inMonth = day.getMonth() === anchor.getMonth();
              const dayItems = itemsForDay(items, day);
              const visible = dayItems.slice(0, 3);
              const extra = dayItems.length - visible.length;
              const planLabel = `Planear el ${day.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}`;
              return (
                <div
                  key={key}
                  className={`relative min-h-[104px] sm:min-h-[120px] xl:min-h-[132px] p-1.5 rounded-xl border text-left align-top transition cursor-pointer ${
                    key === todayKey
                      ? 'border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/30'
                      : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'
                  } ${inMonth ? '' : 'opacity-40'}`}
                  onClick={() => onSelectDay(day)}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectDay(day);
                    }}
                    className={`text-[11px] font-black rounded-md px-1 -ml-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      key === todayKey ? 'text-indigo-600' : 'text-slate-500'
                    }`}
                    aria-label={planLabel}
                  >
                    {day.getDate()}
                  </button>
                  <div className="mt-1 space-y-0.5">
                    {visible.map((item) => (
                      <EventChip
                        key={item.id}
                        item={item}
                        compact
                        selected={selectedId === item.id}
                        color={calendarEventColor(item.type, labels)}
                        typeLabel={calendarTypeLabel(item.type, labels)}
                        onClick={() => onSelectItem(item)}
                      />
                    ))}
                    {extra > 0 ? (
                      <button
                        type="button"
                        data-day-overflow
                        onClick={(event) => {
                          event.stopPropagation();
                          setOverflowKey((current) => (current === key ? null : key));
                        }}
                        className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 px-1 hover:underline"
                      >
                        +{extra} más
                      </button>
                    ) : null}
                  </div>
                  {overflowKey === key ? (
                    <div
                      data-day-overflow
                      className="absolute z-20 left-0 right-0 top-full mt-1 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl max-h-64 overflow-auto"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                        {day.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <div className="space-y-1">
                        {dayItems.map((item) => (
                          <EventChip
                            key={item.id}
                            item={item}
                            selected={selectedId === item.id}
                            color={calendarEventColor(item.type, labels)}
                            typeLabel={calendarTypeLabel(item.type, labels)}
                            onClick={() => {
                              setOverflowKey(null);
                              onSelectItem(item);
                            }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOverflowKey(null);
                          onSelectDay(day);
                        }}
                        className="mt-2 w-full text-[11px] font-bold text-indigo-600 dark:text-indigo-300 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        Planear este día
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === 'week' ? (
        <div className="p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-7 gap-2">
          {getWeekDays(anchor).map((day) => {
            const key = toLocalDateKey(day);
            const dayItems = itemsForDay(items, day);
            const planLabel = `Planear el ${day.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}`;
            return (
              <div
                key={key}
                className={`min-h-12 sm:min-h-[180px] p-2.5 rounded-2xl border text-left cursor-pointer ${
                  key === todayKey
                    ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30'
                    : 'border-slate-100 dark:border-slate-800'
                }`}
                onClick={() => onSelectDay(day)}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDay(day);
                  }}
                  className="text-left rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 px-1 -ml-1"
                  aria-label={planLabel}
                >
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    {day.toLocaleDateString('es-MX', { weekday: 'short' })}
                  </p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{day.getDate()}</p>
                </button>
                <div className="mt-2 space-y-1">
                  {dayItems.length === 0 ? (
                    <p className="text-[11px] text-slate-400">Clic para planear</p>
                  ) : (
                    dayItems.map((item) => (
                      <EventChip
                        key={item.id}
                        item={item}
                        selected={selectedId === item.id}
                        color={calendarEventColor(item.type, labels)}
                        typeLabel={calendarTypeLabel(item.type, labels)}
                        onClick={() => onSelectItem(item)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {view === 'agenda' ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {(() => {
            const start = startOfWeekMonday(anchor);
            const end = addDays(start, 20);
            const upcoming = itemsInRange(items, start, end);
            if (upcoming.length === 0) {
              return <p className="p-8 text-center text-xs text-slate-400">No hay eventos en las próximas tres semanas.</p>;
            }
            return upcoming.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item)}
                className={`w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  selectedId === item.id ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : ''
                }`}
              >
                <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: calendarEventColor(item.type, labels) }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-400">
                    {calendarItemStartDate(item.startsAt, item.allDay).toLocaleString('es-MX', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: item.allDay ? undefined : '2-digit',
                      minute: item.allDay ? undefined : '2-digit',
                    })}
                    {' · '}
                    {calendarTypeLabel(item.type, labels)}
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                </div>
              </button>
            ));
          })()}
        </div>
      ) : null}
    </div>
  );
}
