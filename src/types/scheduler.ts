import { Assignment, ClassItem, DayOfWeek, ScheduleEntry, SubjectItem, Teacher } from './state';

export interface SchedulerInput {
  teachers: Record<string, Teacher>;
  classes: Record<string, ClassItem>;
  subjects: Record<string, SubjectItem>;
  assignments: Record<string, Assignment>;
  existingSchedule?: Record<string, ScheduleEntry>;
  config?: SchedulerConfig;
}

export interface SchedulerConfig {
  maxIterations?: number;
  timeLimitMs?: number;
  avoidTeacherIdleGaps?: boolean;
  distributeEvenlyAcrossDays?: boolean;
  allowConsecutiveBlocks?: boolean;
  randomSeed?: number;
}

export interface ScheduleConflict {
  id: string;
  type: 'TEACHER_COLLISION' | 'CLASS_COLLISION' | 'TEACHER_OVERLOAD' | 'DAY_OVERLOAD' | 'SESSION_MISMATCH';
  message: string;
  details: {
    teacherId?: string;
    classId?: string;
    day?: DayOfWeek;
    period?: number;
    subjectId?: string;
  };
}

export interface SchedulerResult {
  success: boolean;
  schedule: Record<string, ScheduleEntry>;
  conflicts: ScheduleConflict[];
  unassignedPeriods: {
    assignmentId: string;
    teacherId: string;
    classId: string;
    subjectId: string;
    remainingPeriods: number;
  }[];
  stats: {
    totalPeriodsScheduled: number;
    totalPeriodsRequested: number;
    iterations: number;
    timeElapsedMs: number;
    teachersAssigned: number;
    classesAssigned: number;
  };
}
