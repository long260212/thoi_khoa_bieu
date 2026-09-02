export type ShiftType = 'MORNING' | 'AFTERNOON' | 'FULL_DAY';

export interface Teacher {
  id: string;
  code: string;               // e.g. "GV01", "CTLoan", "THDung"
  name: string;               // e.g. "Cô Trần Thị Loan"
  email?: string;
  phone?: string;
  color?: string;
  maxPeriodsPerWeek: number;  // Standard: 19 periods/week in Vietnam
  maxPeriodsPerDay: number;   // Standard: 4-5 periods/day
  unavailableSlots?: string[]; // Array of `${day}_${period}`, e.g. "THU_2_1"
}

export interface ClassItem {
  id: string;
  code: string;               // e.g. "3A5", "8A1", "10A1", "12A3"
  grade: number;              // 1 to 12
  shift: ShiftType;           // MORNING (tiết 1-5), AFTERNOON (tiết 6-10), FULL_DAY
  room?: string;              // e.g. "P.201"
}

export interface SubjectItem {
  id: string;
  code: string;               // e.g. "TOAN", "VAN", "ENG", "KHTN"
  name: string;               // e.g. "Toán", "Ngữ Văn", "Tiếng Anh"
  color: string;              // e.g. "#3b82f6", "#ef4444", "#10b981"
  textColor?: string;
  category?: 'MAIN' | 'SUB' | 'ACTIVITY';
  consecutiveAllowed?: boolean; // e.g. 2 periods in a row allowed
  maxPerDay: number;          // Default: 2 periods max per day for this subject
}

export interface Assignment {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  periodsPerWeek: number;     // e.g. 4 periods of Math for class 8A1
}

export type DayOfWeek = 'THU_2' | 'THU_3' | 'THU_4' | 'THU_5' | 'THU_6' | 'THU_7';

export const DAYS_OF_WEEK: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'THU_2', label: 'Thứ Hai', short: 'T2' },
  { key: 'THU_3', label: 'Thứ Ba', short: 'T3' },
  { key: 'THU_4', label: 'Thứ Tư', short: 'T4' },
  { key: 'THU_5', label: 'Thứ Năm', short: 'T5' },
  { key: 'THU_6', label: 'Thứ Sáu', short: 'T6' },
  { key: 'THU_7', label: 'Thứ Bảy', short: 'T7' },
];

export interface ScheduleEntry {
  id: string;
  classId: string;
  teacherId: string;
  subjectId: string;
  day: DayOfWeek;
  period: number;             // 1-5: Sáng, 6-10: Chiều
  isLocked?: boolean;
}

export type ActiveView = 'DATA_ENTRY' | 'TIMETABLE_CLASS' | 'TIMETABLE_TEACHER' | 'MASTER_MATRIX' | 'MASTER_DATA';

export interface GenerationProgress {
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;           // 0 to 100
  phase: string;
  iterations: number;
  conflicts: number;
  scheduledPeriods: number;
  totalPeriodsToSchedule: number;
  timeElapsedMs: number;
  error?: string;
}

export interface NormalizedTimetableState {
  // Normalized Hash Maps ($O(1)$ lookups and updates)
  teachers: Record<string, Teacher>;
  classes: Record<string, ClassItem>;
  subjects: Record<string, SubjectItem>;
  assignments: Record<string, Assignment>;
  
  // Schedule lookup: `${classId}_${day}_${period}` -> ScheduleEntry
  schedule: Record<string, ScheduleEntry>;

  // Selection & UI State
  selectedTeacherId: string | null;
  selectedClassId: string | null;
  activeView: ActiveView;
  searchTeacherQuery: string;
  sidebarFilter: 'ALL' | 'OVERLOADED' | 'UNDERLOADED' | 'NORMAL';
  
  // Sticky Defaults for ultra-fast data entry
  stickyDefaultSubjectId: string | null;

  // Web Worker generation progress
  isGenerating: boolean;
  generationProgress: GenerationProgress;

  // History / Undo stack for emergency rollback
  history: {
    past: Array<{ assignments: Record<string, Assignment>; schedule: Record<string, ScheduleEntry> }>;
    future: Array<{ assignments: Record<string, Assignment>; schedule: Record<string, ScheduleEntry> }>;
  };
}
