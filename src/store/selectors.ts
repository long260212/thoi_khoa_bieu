import { useMemo } from 'react';
import { useScheduleStore } from './useScheduleStore';
import { Assignment, ScheduleEntry } from '../types/state';

/**
 * Returns all assignments for a specific teacher ($O(N)$ filter where N is total assignments, memoized)
 */
export function useTeacherAssignments(teacherId: string | null): Assignment[] {
  const assignments = useScheduleStore((state) => state.assignments);
  
  return useMemo(() => {
    if (!teacherId) return [];
    return Object.values(assignments).filter((a) => a.teacherId === teacherId);
  }, [assignments, teacherId]);
}

/**
 * Real-time calculation of total periods per week for a teacher
 */
export function useTeacherTotalPeriods(teacherId: string | null): number {
  const teacherAssignments = useTeacherAssignments(teacherId);
  
  return useMemo(() => {
    return teacherAssignments.reduce((sum, a) => sum + (a.periodsPerWeek || 0), 0);
  }, [teacherAssignments]);
}

/**
 * Check capacity warning status for teacher (Standard: 19 periods/week in Vietnam)
 */
export function useTeacherCapacityStatus(teacherId: string | null) {
  const teacher = useScheduleStore((state) => teacherId ? state.teachers[teacherId] : null);
  const totalPeriods = useTeacherTotalPeriods(teacherId);

  const maxAllowed = teacher?.maxPeriodsPerWeek || 19;
  const isOverloaded = totalPeriods > maxAllowed;
  const isAtCapacity = totalPeriods === maxAllowed;
  const isUnderloaded = totalPeriods < maxAllowed - 4;

  return {
    totalPeriods,
    maxAllowed,
    isOverloaded,
    isAtCapacity,
    isUnderloaded,
    difference: totalPeriods - maxAllowed,
    statusText: isOverloaded 
      ? `CẢNH BÁO: Vượt định mức (+${totalPeriods - maxAllowed} tiết/tuần)` 
      : isAtCapacity 
        ? 'Đạt định mức chuẩn (19 tiết/tuần)' 
        : `Còn trống ${maxAllowed - totalPeriods} tiết`,
  };
}

/**
 * Get schedule for a specific class
 */
export function useClassSchedule(classId: string | null): Record<string, ScheduleEntry> {
  const schedule = useScheduleStore((state) => state.schedule);

  return useMemo(() => {
    if (!classId) return {};
    const result: Record<string, ScheduleEntry> = {};
    Object.values(schedule).forEach((entry) => {
      if (entry.classId === classId) {
        result[`${entry.day}_${entry.period}`] = entry;
      }
    });
    return result;
  }, [schedule, classId]);
}

/**
 * Get schedule for a specific teacher
 */
export function useTeacherSchedule(teacherId: string | null): Record<string, ScheduleEntry> {
  const schedule = useScheduleStore((state) => state.schedule);

  return useMemo(() => {
    if (!teacherId) return {};
    const result: Record<string, ScheduleEntry> = {};
    Object.values(schedule).forEach((entry) => {
      if (entry.teacherId === teacherId) {
        result[`${entry.day}_${entry.period}`] = entry;
      }
    });
    return result;
  }, [schedule, teacherId]);
}
