import type { AcademicMilestone, GradebookRubricConfig, RubricKey } from './academicGradebook';
import type { LiveWorkshop } from './database';
import type { AssignmentMaterial } from '../utils/assignmentMaterials';
import type { AssignmentType } from './studentPlan';

export type CalendarItemType =
  | 'session'
  | 'exam'
  | 'clinical_case'
  | 'reading'
  | 'emg_report'
  | 'practical_task'
  | 'milestone';

export type CalendarBoardView = 'month' | 'week' | 'agenda';

export interface CalendarItem {
  id: string;
  type: CalendarItemType;
  title: string;
  description?: string | null;
  materials?: AssignmentMaterial[] | null;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  rubricKey: RubricKey;
  countsForKardex: boolean;
  sourceIds: string[];
  assignmentIds: string[];
  studentIds: string[];
  studentCount: number;
  submittedCount: number;
  approvedCount: number;
  pendingCount: number;
  workshopId?: string | null;
  milestoneId?: string | null;
  moduleId?: string | null;
  topicId?: string | null;
  patternId?: string | null;
  workshopStatus?: string | null;
  assignmentType?: AssignmentType;
  passingGrade?: number;
  topicCount?: number;
  modality?: 'online' | 'in_person' | null;
}

export interface CalendarRubricBucket {
  key: RubricKey;
  name: string;
  weight: number;
  enabled: boolean;
  description: string;
  eventCount: number;
}

export interface CalendarRubricSnapshot {
  title: string;
  minPassingGrade: number;
  totalWeight: number;
  buckets: CalendarRubricBucket[];
  config: GradebookRubricConfig;
}

export interface AcademicCalendarFeed {
  items: CalendarItem[];
  rubric: CalendarRubricSnapshot;
  milestones: AcademicMilestone[];
  workshops: LiveWorkshop[];
  warnings: string[];
}
