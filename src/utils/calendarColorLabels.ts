import { useEffect, useState } from 'react';
import type { CalendarItemType } from '../types/academicCalendar';

export const CALENDAR_COLOR_LABELS_STORAGE_KEY = 'neurosafe_admin_calendar_color_labels';

export type CalendarColorLabel = {
  color: string;
  label: string;
};

export type CalendarColorLabelMap = Record<CalendarItemType, CalendarColorLabel>;

export const CALENDAR_COLOR_PALETTE = [
  { id: 'rose', hex: '#f43f5e', name: 'Rosa' },
  { id: 'orange', hex: '#f97316', name: 'Naranja' },
  { id: 'amber', hex: '#f59e0b', name: 'Ámbar' },
  { id: 'emerald', hex: '#10b981', name: 'Esmeralda' },
  { id: 'teal', hex: '#14b8a6', name: 'Verde' },
  { id: 'sky', hex: '#0ea5e9', name: 'Cielo' },
  { id: 'indigo', hex: '#6366f1', name: 'Índigo' },
  { id: 'violet', hex: '#8b5cf6', name: 'Violeta' },
  { id: 'pink', hex: '#ec4899', name: 'Magenta' },
  { id: 'slate', hex: '#64748b', name: 'Gris' },
] as const;

export const DEFAULT_CALENDAR_COLOR_LABELS: CalendarColorLabelMap = {
  session: { color: '#f43f5e', label: 'Clases' },
  exam: { color: '#6366f1', label: 'Exámenes' },
  clinical_case: { color: '#14b8a6', label: 'Casos' },
  milestone: { color: '#8b5cf6', label: 'Cortes' },
  reading: { color: '#f59e0b', label: 'Lecturas' },
  emg_report: { color: '#f59e0b', label: 'Informes EMG' },
  practical_task: { color: '#f59e0b', label: 'Tareas' },
};

export const CALENDAR_LEGEND_TYPES: CalendarItemType[] = [
  'session',
  'exam',
  'practical_task',
  'clinical_case',
  'milestone',
];

const HEX = /^#([0-9a-fA-F]{6})$/;
const listeners = new Set<() => void>();

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

export function mergeCalendarColorLabels(partial?: unknown): CalendarColorLabelMap {
  const next: CalendarColorLabelMap = { ...DEFAULT_CALENDAR_COLOR_LABELS };
  if (!partial || typeof partial !== 'object') return next;
  const source = partial as Record<string, Partial<CalendarColorLabel>>;
  (Object.keys(DEFAULT_CALENDAR_COLOR_LABELS) as CalendarItemType[]).forEach((type) => {
    const row = source[type];
    if (!row || typeof row !== 'object') return;
    next[type] = {
      color: isHexColor(row.color) ? row.color.toLowerCase() : DEFAULT_CALENDAR_COLOR_LABELS[type].color,
      label: typeof row.label === 'string' ? row.label.trim().slice(0, 24) : DEFAULT_CALENDAR_COLOR_LABELS[type].label,
    };
  });
  return next;
}

export function readCalendarColorLabels(storage?: Pick<Storage, 'getItem'> | null): CalendarColorLabelMap {
  try {
    const raw = storage?.getItem(CALENDAR_COLOR_LABELS_STORAGE_KEY);
    return mergeCalendarColorLabels(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_CALENDAR_COLOR_LABELS };
  }
}

export function writeCalendarColorLabels(
  labels: CalendarColorLabelMap,
  storage?: Pick<Storage, 'setItem'> | null
): CalendarColorLabelMap {
  const merged = mergeCalendarColorLabels(labels);
  try {
    storage?.setItem(CALENDAR_COLOR_LABELS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Private mode / quota.
  }
  listeners.forEach((notify) => notify());
  return merged;
}

export function calendarTypeLabel(type: CalendarItemType, labels: CalendarColorLabelMap): string {
  const label = labels[type]?.label?.trim();
  return label || DEFAULT_CALENDAR_COLOR_LABELS[type].label;
}

export function calendarTypeColor(type: CalendarItemType, labels: CalendarColorLabelMap): string {
  return labels[type]?.color || DEFAULT_CALENDAR_COLOR_LABELS[type].color;
}

/** Lecturas e informes se pintan con el color de Tareas. */
export function calendarEventColor(type: CalendarItemType, labels: CalendarColorLabelMap): string {
  const family = type === 'reading' || type === 'emg_report' ? 'practical_task' : type;
  return calendarTypeColor(family, labels);
}

export function calendarChipStyle(color: string): { backgroundColor: string; borderColor: string; color: string } {
  return {
    backgroundColor: `${color}26`,
    borderColor: `${color}73`,
    color,
  };
}

export function useCalendarColorLabels(): {
  labels: CalendarColorLabelMap;
  setTypeLabel: (type: CalendarItemType, patch: Partial<CalendarColorLabel>) => void;
  reset: () => void;
} {
  const storage = typeof localStorage === 'undefined' ? null : localStorage;
  const [labels, setLabels] = useState<CalendarColorLabelMap>(() => readCalendarColorLabels(storage));

  useEffect(() => {
    const refresh = () => setLabels(readCalendarColorLabels(typeof localStorage === 'undefined' ? null : localStorage));
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, []);

  return {
    labels,
    setTypeLabel: (type, patch) => {
      const current = readCalendarColorLabels(storage);
      writeCalendarColorLabels(
        {
          ...current,
          [type]: { ...current[type], ...patch },
        },
        storage
      );
    },
    reset: () => {
      writeCalendarColorLabels(DEFAULT_CALENDAR_COLOR_LABELS, storage);
    },
  };
}
