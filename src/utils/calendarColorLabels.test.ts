import { describe, expect, it } from 'vitest';
import {
  CALENDAR_COLOR_LABELS_STORAGE_KEY,
  calendarEventColor,
  calendarTypeLabel,
  DEFAULT_CALENDAR_COLOR_LABELS,
  mergeCalendarColorLabels,
  readCalendarColorLabels,
  writeCalendarColorLabels,
} from './calendarColorLabels';

describe('calendar color labels', () => {
  it('fills missing types and ignores invalid colors', () => {
    const merged = mergeCalendarColorLabels({
      session: { color: 'red', label: '  Talleres  ' },
      exam: { color: '#0EA5E9', label: '' },
    });
    expect(merged.session.label).toBe('Talleres');
    expect(merged.session.color).toBe(DEFAULT_CALENDAR_COLOR_LABELS.session.color);
    expect(merged.exam.color).toBe('#0ea5e9');
    expect(merged.exam.label).toBe('');
    expect(calendarTypeLabel('exam', merged)).toBe('Exámenes');
    expect(merged.milestone.label).toBe('Cortes');
    expect(calendarEventColor('reading', merged)).toBe(merged.practical_task.color);
    expect(calendarEventColor('emg_report', merged)).toBe(merged.practical_task.color);
  });

  it('round-trips through storage', () => {
    const store: Record<string, string> = {};
    writeCalendarColorLabels(
      {
        ...DEFAULT_CALENDAR_COLOR_LABELS,
        clinical_case: { color: '#f97316', label: 'Casos EMG' },
      },
      {
        setItem: (key, value) => {
          store[key] = value;
        },
      }
    );
    expect(store[CALENDAR_COLOR_LABELS_STORAGE_KEY]).toContain('Casos EMG');
    const read = readCalendarColorLabels({
      getItem: (key) => store[key] ?? null,
    });
    expect(read.clinical_case).toEqual({ color: '#f97316', label: 'Casos EMG' });
  });
});
