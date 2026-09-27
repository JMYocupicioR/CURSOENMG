import { describe, expect, it } from 'vitest';
import type { AcademicMilestone, GradebookRubricConfig } from '../types/academicGradebook';
import type { LiveWorkshop } from '../types/database';
import type { StudentAssignment } from '../types/studentPlan';
import {
  assignmentGroupKey,
  buildRubricSnapshot,
  CALENDAR_BOARD_VIEW_STORAGE_KEY,
  calendarItemStartDate,
  calendarTypesForFilter,
  defaultCalendarBoardView,
  filterItemsByTypes,
  getMonthGridDays,
  getWeekDays,
  groupAssignmentsIntoEvents,
  HOMEWORK_CALENDAR_TYPES,
  itemOverlapsDay,
  itemsForDay,
  itemsInRange,
  localDateTimeInputValue,
  milestoneToCalendarItem,
  parseLocalDateKey,
  readCalendarBoardView,
  startOfWeekMonday,
  toLocalDateKey,
  workshopToCalendarItem,
  writeCalendarBoardView,
} from './academicCalendar';

function assignment(partial: Partial<StudentAssignment> & Pick<StudentAssignment, 'id' | 'student_id' | 'title' | 'type'>): StudentAssignment {
  return {
    description: '',
    due_date: '2026-09-24T23:59:00.000Z',
    status: 'pending',
    priority: 'normal',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...partial,
  };
}

describe('academicCalendar date helpers', () => {
  it('uses Monday as the first day of the week', () => {
    const sunday = new Date(2026, 8, 20); // Sunday
    const start = startOfWeekMonday(sunday);
    expect(start.getDay()).toBe(1);
    expect(toLocalDateKey(start)).toBe('2026-09-14');
    expect(getWeekDays(sunday)).toHaveLength(7);
    expect(toLocalDateKey(getWeekDays(sunday)[0])).toBe('2026-09-14');
    expect(toLocalDateKey(getWeekDays(sunday)[6])).toBe('2026-09-20');
  });

  it('builds a 6-week month grid starting on Monday', () => {
    const days = getMonthGridDays(new Date(2026, 8, 1));
    expect(days).toHaveLength(42);
    expect(days[0].getDay()).toBe(1);
  });

  it('formats a local datetime input for a clicked day', () => {
    const value = localDateTimeInputValue(new Date(2026, 8, 24), 19, 0);
    expect(value.startsWith('2026-09-24T19:00')).toBe(true);
  });
});

describe('assignment grouping', () => {
  it('collapses the same exam on the same day into one event', () => {
    const rows = [
      assignment({
        id: 'a1',
        student_id: 's1',
        title: 'Examen Corte 1',
        type: 'exam',
        target_module_id: 'nerve-conduction',
        status: 'submitted',
      }),
      assignment({
        id: 'a2',
        student_id: 's2',
        title: 'Examen Corte 1',
        type: 'exam',
        target_module_id: 'nerve-conduction',
        status: 'pending',
      }),
      assignment({
        id: 'a3',
        student_id: 's3',
        title: 'Caso STC',
        type: 'clinical_case',
        target_exam_config: { patternId: 'stc_leve' },
      }),
    ];

    expect(assignmentGroupKey(rows[0])).toBe(assignmentGroupKey(rows[1]));
    const events = groupAssignmentsIntoEvents(rows);
    expect(events).toHaveLength(2);

    const exam = events.find((item) => item.type === 'exam');
    expect(exam?.studentCount).toBe(2);
    expect(exam?.submittedCount).toBe(1);
    expect(exam?.pendingCount).toBe(1);
    expect(exam?.rubricKey).toBe('exams');
    expect(exam?.assignmentIds).toEqual(['a1', 'a2']);

    const clinical = events.find((item) => item.type === 'clinical_case');
    expect(clinical?.rubricKey).toBe('assignments');
    expect(clinical?.patternId).toBe('stc_leve');
  });

  it('pins a task to the local due day and keeps readings in the Tareas filter', () => {
    const due = '2026-10-01T05:59:00.000Z';
    const events = groupAssignmentsIntoEvents([
      assignment({
        id: 't1',
        student_id: 's1',
        title: 'Entrega de protocolo',
        type: 'practical_task',
        due_date: due,
      }),
      assignment({
        id: 'r1',
        student_id: 's2',
        title: 'Lectura de Preston',
        type: 'reading',
        due_date: due,
      }),
    ]);

    const task = events.find((item) => item.type === 'practical_task');
    const localDay = toLocalDateKey(due);
    expect(task?.startsAt).toBe(localDay);
    expect(task?.endsAt).toBe(localDay);
    expect(task?.allDay).toBe(true);
    expect(calendarItemStartDate(task!.startsAt, true).toDateString()).toBe(
      parseLocalDateKey(localDay).toDateString()
    );
    expect(itemsForDay(events, parseLocalDateKey(localDay))).toHaveLength(2);
    expect(calendarTypesForFilter('practical_task')).toEqual(HOMEWORK_CALENDAR_TYPES);
    expect(filterItemsByTypes(events, calendarTypesForFilter('practical_task'))).toHaveLength(2);
    expect(filterItemsByTypes(events, calendarTypesForFilter('exam'))).toHaveLength(0);
  });
});

describe('workshop and milestone mapping', () => {
  it('maps a live class to the attendance bucket', () => {
    const item = workshopToCalendarItem({
      id: 'w1',
      module_id: 'emg-needle',
      topic_id: null,
      title: 'Protocolo de mediano',
      description: null,
      scheduled_at: '2026-09-24T19:00:00.000Z',
      duration_minutes: 90,
      stream_url: null,
      recording_url: null,
      max_capacity: 30,
      clinical_case_revision_id: null,
      clinical_case_json: null,
      status: 'scheduled',
      counts_for_kardex: true,
      session_modality: 'online',
      created_by: 'admin',
      updated_at: '2026-09-01T00:00:00.000Z',
      created_at: '2026-09-01T00:00:00.000Z',
    } as LiveWorkshop);

    expect(item.type).toBe('session');
    expect(item.rubricKey).toBe('attendance');
    expect(item.countsForKardex).toBe(true);
    expect(item.workshopId).toBe('w1');
  });

  it('maps a milestone as an all-day curriculum span', () => {
    const milestone: AcademicMilestone = {
      id: 'm1',
      cohort_id: '2026-general',
      title: 'Corte 1',
      description: 'Fundamentos',
      start_date: '2026-09-01T00:00:00.000Z',
      due_date: '2026-09-15T23:59:00.000Z',
      target_topic_ids: ['history', 'motor-conduction'],
      passing_grade: 80,
      order_index: 1,
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    };
    const item = milestoneToCalendarItem(milestone);
    expect(item.rubricKey).toBe('curriculum');
    expect(item.allDay).toBe(true);
    expect(item.topicCount).toBe(2);
    expect(itemOverlapsDay(item, new Date(2026, 8, 10))).toBe(true);
    expect(itemOverlapsDay(item, new Date(2026, 8, 20))).toBe(false);
  });
});

describe('range filters and rubric snapshot', () => {
  const config: GradebookRubricConfig = {
    id: 'default',
    title: 'Oficial',
    minPassingGrade: 80,
    rubrics: [
      { id: 'exams', name: 'Exámenes', weight: 30, description: '', enabled: true },
      { id: 'assignments', name: 'Tareas', weight: 30, description: '', enabled: true },
      { id: 'attendance', name: 'Asistencia', weight: 20, description: '', enabled: true },
      { id: 'curriculum', name: 'Currículum', weight: 20, description: '', enabled: true },
    ],
    updated_at: '2026-09-01T00:00:00.000Z',
  };

  it('counts events per Capa A bucket and ignores sessions that do not count', () => {
    const items = [
      ...groupAssignmentsIntoEvents([
        assignment({ id: 'e1', student_id: 's1', title: 'Examen', type: 'exam' }),
      ]),
      workshopToCalendarItem({
        id: 'w-count',
        module_id: 'fundamentals',
        topic_id: null,
        title: 'Clase que cuenta',
        description: null,
        scheduled_at: '2026-09-24T19:00:00.000Z',
        duration_minutes: 90,
        stream_url: null,
        recording_url: null,
        max_capacity: null,
        clinical_case_revision_id: null,
        clinical_case_json: null,
        status: 'scheduled',
        counts_for_kardex: true,
        created_by: 'a',
        updated_at: '2026-09-01T00:00:00.000Z',
        created_at: '2026-09-01T00:00:00.000Z',
      } as LiveWorkshop),
      workshopToCalendarItem({
        id: 'w-skip',
        module_id: 'fundamentals',
        topic_id: null,
        title: 'Tutoría extra',
        description: null,
        scheduled_at: '2026-09-25T19:00:00.000Z',
        duration_minutes: 60,
        stream_url: null,
        recording_url: null,
        max_capacity: null,
        clinical_case_revision_id: null,
        clinical_case_json: null,
        status: 'scheduled',
        counts_for_kardex: false,
        created_by: 'a',
        updated_at: '2026-09-01T00:00:00.000Z',
        created_at: '2026-09-01T00:00:00.000Z',
      } as LiveWorkshop),
    ];

    const snapshot = buildRubricSnapshot(config, items);
    expect(snapshot.totalWeight).toBe(100);
    expect(snapshot.buckets.find((b) => b.key === 'exams')?.eventCount).toBe(1);
    expect(snapshot.buckets.find((b) => b.key === 'attendance')?.eventCount).toBe(1);
  });

  it('filters day, range and types', () => {
    const due = '2026-09-24T23:00:00.000Z';
    const exam = groupAssignmentsIntoEvents([
      assignment({
        id: 'e1',
        student_id: 's1',
        title: 'Examen',
        type: 'exam',
        due_date: due,
      }),
    ])[0];
    const day = parseLocalDateKey(toLocalDateKey(due));
    expect(itemsForDay([exam], day)).toHaveLength(1);
    expect(itemsInRange([exam], new Date(day.getFullYear(), day.getMonth(), day.getDate() - 2), new Date(day.getFullYear(), day.getMonth(), day.getDate() + 2))).toHaveLength(1);
    expect(filterItemsByTypes([exam], ['session'])).toHaveLength(0);
    expect(filterItemsByTypes([exam], ['exam'])).toHaveLength(1);
  });
});

describe('calendar board view persistence', () => {
  it('reads a stored view and ignores invalid values', () => {
    const storage = {
      getItem: (key: string) => (key.endsWith('view') ? 'week' : null),
    };
    expect(readCalendarBoardView(storage)).toBe('week');
    expect(readCalendarBoardView({ getItem: () => 'quarter' })).toBeNull();
    expect(readCalendarBoardView(null)).toBeNull();
  });

  it('writes the selected view', () => {
    const store: Record<string, string> = {};
    writeCalendarBoardView('agenda', {
      setItem: (key, value) => {
        store[key] = value;
      },
    });
    expect(store[CALENDAR_BOARD_VIEW_STORAGE_KEY]).toBe('agenda');
  });

  it('prefers the stored view over a narrow viewport default', () => {
    expect(
      defaultCalendarBoardView({
        storage: { getItem: () => 'month' },
        narrowViewport: true,
      })
    ).toBe('month');
    expect(defaultCalendarBoardView({ storage: null, narrowViewport: true })).toBe('week');
    expect(defaultCalendarBoardView({ storage: null, narrowViewport: false })).toBe('month');
  });
});
