import { create } from 'zustand';
import { 
  ActiveView, 
  Assignment, 
  ClassItem, 
  GenerationProgress, 
  NormalizedTimetableState, 
  ScheduleEntry, 
  SubjectItem, 
  Teacher 
} from '../types/state';
import { 
  generateMockAssignments, 
  generateMockClasses, 
  generateMockTeachers, 
  INITIAL_SUBJECTS 
} from '../utils/mockData';
import { WorkerInMessage, WorkerOutMessage } from '../types/worker';
import { SchedulerResult } from '../types/scheduler';

interface ScheduleStoreActions {
  // Navigation & Selection
  setSelectedTeacher: (id: string | null) => void;
  setSelectedClass: (id: string | null) => void;
  setActiveView: (view: ActiveView) => void;
  setSearchTeacherQuery: (query: string) => void;
  setSidebarFilter: (filter: 'ALL' | 'OVERLOADED' | 'UNDERLOADED' | 'NORMAL') => void;
  setStickyDefaultSubject: (subjectId: string | null) => void;
  
  // Assignment CRUD ($O(1)$ Hash Map operations)
  addAssignment: (assignment: Omit<Assignment, 'id'>) => string;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  batchAddAssignments: (assignments: Omit<Assignment, 'id'>[]) => void;
  clearTeacherAssignments: (teacherId: string) => void;

  // Master Data CRUD
  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (id: string, updates: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  
  addClass: (cls: ClassItem) => void;
  updateClass: (id: string, updates: Partial<ClassItem>) => void;
  deleteClass: (id: string) => void;

  addSubject: (subject: SubjectItem) => void;
  updateSubject: (id: string, updates: Partial<SubjectItem>) => void;
  deleteSubject: (id: string) => void;

  // Timetable Operations
  setSchedule: (schedule: Record<string, ScheduleEntry>) => void;
  updateScheduleCell: (classId: string, day: string, period: number, entry: ScheduleEntry | null) => void;
  assignSlot: (classId: string, day: string, period: number, subjectId: string, teacherId: string) => void;
  removeSlot: (classId: string, day: string, period: number) => void;
  clearSchedule: () => void;

  // Worker Auto-Generation
  startAutoGenerate: () => void;
  cancelAutoGenerate: () => void;
  setGenerationProgress: (progress: GenerationProgress) => void;

  // Data Management
  loadMockData: (teacherCount?: number) => void;
  resetAllData: () => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

export type ScheduleStore = NormalizedTimetableState & ScheduleStoreActions;

// Web worker reference outside store
let schedulerWorker: Worker | null = null;

// Initial state starts completely clean (Empty slate)
// Users can add their own teachers/classes or click "Nạp Dữ Liệu Mẫu" to test
export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  teachers: {},
  classes: {},
  subjects: INITIAL_SUBJECTS, // Keep standard Vietnamese subject catalog
  assignments: {},
  schedule: {},
  
  selectedTeacherId: null,
  selectedClassId: null,
  activeView: 'DATA_ENTRY',
  searchTeacherQuery: '',
  sidebarFilter: 'ALL',
  stickyDefaultSubjectId: 'SUB_TOAN',

  isGenerating: false,
  generationProgress: {
    status: 'idle',
    progress: 0,
    phase: '',
    iterations: 0,
    conflicts: 0,
    scheduledPeriods: 0,
    totalPeriodsToSchedule: 0,
    timeElapsedMs: 0,
  },

  history: {
    past: [],
    future: [],
  },

  // Actions
  setSelectedTeacher: (id) => set({ selectedTeacherId: id }),
  setSelectedClass: (id) => set({ selectedClassId: id }),
  setActiveView: (activeView) => set({ activeView }),
  setSearchTeacherQuery: (searchTeacherQuery) => set({ searchTeacherQuery }),
  setSidebarFilter: (sidebarFilter) => set({ sidebarFilter }),
  setStickyDefaultSubject: (stickyDefaultSubjectId) => set({ stickyDefaultSubjectId }),

  // Assignment CRUD
  addAssignment: (assignmentData) => {
    const id = `ASN_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAssignment: Assignment = { ...assignmentData, id };
    
    set((state) => ({
      assignments: {
        ...state.assignments,
        [id]: newAssignment,
      },
      stickyDefaultSubjectId: assignmentData.subjectId || state.stickyDefaultSubjectId,
    }));
    return id;
  },

  updateAssignment: (id, updates) => {
    set((state) => {
      const existing = state.assignments[id];
      if (!existing) return state;
      return {
        assignments: {
          ...state.assignments,
          [id]: { ...existing, ...updates },
        },
      };
    });
  },

  deleteAssignment: (id) => {
    set((state) => {
      const newAssignments = { ...state.assignments };
      delete newAssignments[id];
      return { assignments: newAssignments };
    });
  },

  batchAddAssignments: (newAssignList) => {
    set((state) => {
      const updated = { ...state.assignments };
      newAssignList.forEach((item) => {
        const id = `ASN_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        updated[id] = { ...item, id };
      });
      return { assignments: updated };
    });
  },

  clearTeacherAssignments: (teacherId) => {
    set((state) => {
      const updated = { ...state.assignments };
      Object.keys(updated).forEach((id) => {
        if (updated[id].teacherId === teacherId) {
          delete updated[id];
        }
      });
      return { assignments: updated };
    });
  },

  // Master Data CRUD
  addTeacher: (teacher) => set((state) => ({ teachers: { ...state.teachers, [teacher.id]: teacher } })),
  updateTeacher: (id, updates) => set((state) => ({
    teachers: { ...state.teachers, [id]: { ...state.teachers[id], ...updates } }
  })),
  deleteTeacher: (id) => set((state) => {
    const updatedTeachers = { ...state.teachers };
    delete updatedTeachers[id];
    return { teachers: updatedTeachers };
  }),

  addClass: (cls) => set((state) => ({ classes: { ...state.classes, [cls.id]: cls } })),
  updateClass: (id, updates) => set((state) => ({
    classes: { ...state.classes, [id]: { ...state.classes[id], ...updates } }
  })),
  deleteClass: (id) => set((state) => {
    const updated = { ...state.classes };
    delete updated[id];
    return { classes: updated };
  }),

  addSubject: (subject) => set((state) => ({ subjects: { ...state.subjects, [subject.id]: subject } })),
  updateSubject: (id, updates) => set((state) => ({
    subjects: { ...state.subjects, [id]: { ...state.subjects[id], ...updates } }
  })),
  deleteSubject: (id) => set((state) => {
    const updated = { ...state.subjects };
    delete updated[id];
    return { subjects: updated };
  }),

  // Timetable
  setSchedule: (schedule) => set({ schedule }),
  
  updateScheduleCell: (classId, day, period, entry) => {
    set((state) => {
      const key = `${classId}_${day}_${period}`;
      const updatedSchedule = { ...state.schedule };
      if (entry) {
        updatedSchedule[key] = entry;
      } else {
        delete updatedSchedule[key];
      }
      return { schedule: updatedSchedule };
    });
  },

  assignSlot: (classId, day, period, subjectId, teacherId) => {
    set((state) => {
      const key = `${classId}_${day}_${period}`;
      const newEntry: ScheduleEntry = {
        id: `SCH_${key}`,
        classId,
        teacherId,
        subjectId,
        day: day as any,
        period,
      };

      // Check if assignment exists for this (teacher, class, subject)
      const existingAssignment = Object.values(state.assignments).find(
        (a) => a.teacherId === teacherId && a.classId === classId && a.subjectId === subjectId
      );

      const updatedAssignments = { ...state.assignments };
      if (!existingAssignment) {
        // Auto-create assignment record
        const newAsnId = `ASN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        updatedAssignments[newAsnId] = {
          id: newAsnId,
          teacherId,
          classId,
          subjectId,
          periodsPerWeek: 1,
        };
      }

      return {
        schedule: {
          ...state.schedule,
          [key]: newEntry,
        },
        assignments: updatedAssignments,
      };
    });
  },

  removeSlot: (classId, day, period) => {
    set((state) => {
      const key = `${classId}_${day}_${period}`;
      const updatedSchedule = { ...state.schedule };
      delete updatedSchedule[key];
      return { schedule: updatedSchedule };
    });
  },

  clearSchedule: () => set({ schedule: {} }),

  // Web Worker Auto-Generation Trigger
  startAutoGenerate: () => {
    const state = get();
    if (state.isGenerating) return;

    // Reset progress
    set({
      isGenerating: true,
      generationProgress: {
        status: 'running',
        progress: 0,
        phase: 'Khởi động thuật toán Web Worker...',
        iterations: 0,
        conflicts: 0,
        scheduledPeriods: 0,
        totalPeriodsToSchedule: 0,
        timeElapsedMs: 0,
      },
    });

    try {
      // Terminate any previous worker instance
      if (schedulerWorker) {
        schedulerWorker.terminate();
      }

      schedulerWorker = new Worker(new URL('../workers/scheduler.worker.ts', import.meta.url), {
        type: 'module',
      });

      schedulerWorker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
        const { type, payload } = e.data;

        if (type === 'PROGRESS_UPDATE') {
          set({ generationProgress: payload });
        } else if (type === 'SCHEDULING_COMPLETE') {
          const result = payload as SchedulerResult;
          set({
            schedule: result.schedule,
            isGenerating: false,
            activeView: 'TIMETABLE_CLASS',
            generationProgress: {
              status: 'completed',
              progress: 100,
              phase: `Hoàn tất thành công! Xếp xong ${result.stats.totalPeriodsScheduled} tiết`,
              iterations: result.stats.iterations,
              conflicts: result.conflicts.length,
              scheduledPeriods: result.stats.totalPeriodsScheduled,
              totalPeriodsToSchedule: result.stats.totalPeriodsRequested,
              timeElapsedMs: result.stats.timeElapsedMs,
            },
          });
        } else if (type === 'SCHEDULING_ERROR') {
          set({
            isGenerating: false,
            generationProgress: {
              status: 'failed',
              progress: 0,
              phase: 'Lỗi',
              iterations: 0,
              conflicts: 0,
              scheduledPeriods: 0,
              totalPeriodsToSchedule: 0,
              timeElapsedMs: 0,
              error: payload.error,
            },
          });
        }
      };

      // Dispatch start payload
      const startMsg: WorkerInMessage = {
        type: 'START_SCHEDULING',
        payload: {
          teachers: state.teachers,
          classes: state.classes,
          subjects: state.subjects,
          assignments: state.assignments,
          existingSchedule: {},
        },
      };
      schedulerWorker.postMessage(startMsg);
    } catch (err: any) {
      console.error('Failed to start worker:', err);
      set({
        isGenerating: false,
        generationProgress: {
          status: 'failed',
          progress: 0,
          phase: 'Lỗi khởi tạo Worker',
          iterations: 0,
          conflicts: 0,
          scheduledPeriods: 0,
          totalPeriodsToSchedule: 0,
          timeElapsedMs: 0,
          error: err?.message || 'Không thể khởi động Web Worker',
        },
      });
    }
  },

  cancelAutoGenerate: () => {
    if (schedulerWorker) {
      schedulerWorker.postMessage({ type: 'CANCEL_SCHEDULING' } as WorkerInMessage);
      schedulerWorker.terminate();
      schedulerWorker = null;
    }
    set({
      isGenerating: false,
      generationProgress: {
        status: 'idle',
        progress: 0,
        phase: 'Đã hủy',
        iterations: 0,
        conflicts: 0,
        scheduledPeriods: 0,
        totalPeriodsToSchedule: 0,
        timeElapsedMs: 0,
      },
    });
  },

  setGenerationProgress: (generationProgress) => set({ generationProgress }),

  // Data Loading & Reset
  loadMockData: (count = 100) => {
    const teachers = generateMockTeachers(count);
    const classes = generateMockClasses();
    const assignments = generateMockAssignments(teachers, classes, INITIAL_SUBJECTS);
    set({
      teachers,
      classes,
      subjects: INITIAL_SUBJECTS,
      assignments,
      schedule: {},
      selectedTeacherId: Object.keys(teachers)[0] || null,
      selectedClassId: Object.keys(classes)[0] || null,
    });
  },

  resetAllData: () => {
    set({
      teachers: {},
      classes: {},
      subjects: INITIAL_SUBJECTS,
      assignments: {},
      schedule: {},
      selectedTeacherId: null,
      selectedClassId: null,
    });
  },

  saveToLocalStorage: () => {
    try {
      const state = get();
      const payload = {
        teachers: state.teachers,
        classes: state.classes,
        subjects: state.subjects,
        assignments: state.assignments,
        schedule: state.schedule,
      };
      localStorage.setItem('EDU_TIMETABLE_STORE', JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  loadFromLocalStorage: () => {
    try {
      const raw = localStorage.getItem('EDU_TIMETABLE_STORE');
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          teachers: parsed.teachers || {},
          classes: parsed.classes || {},
          subjects: parsed.subjects || INITIAL_SUBJECTS,
          assignments: parsed.assignments || {},
          schedule: parsed.schedule || {},
        });
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
  },
}));
