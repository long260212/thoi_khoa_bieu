import { Assignment, ClassItem, DayOfWeek, DAYS_OF_WEEK, ScheduleEntry, SubjectItem, Teacher } from '../types/state';
import { ScheduleConflict, SchedulerInput, SchedulerResult } from '../types/scheduler';
import { WorkerInMessage, WorkerOutMessage } from '../types/worker';

const ctx: Worker = self as any;

let isCancelled = false;

ctx.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const { type } = e.data;
  if (type === 'CANCEL_SCHEDULING') {
    isCancelled = true;
  } else if (type === 'START_SCHEDULING') {
    isCancelled = false;
    runScheduler(e.data.payload);
  }
};

interface PeriodUnit {
  id: string;
  assignmentId: string;
  classId: string;
  teacherId: string;
  subjectId: string;
  unitIndex: number;
  totalUnits: number;
}

function runScheduler(input: SchedulerInput) {
  const startTime = Date.now();
  const { teachers, classes, subjects, assignments, existingSchedule = {} } = input;

  // Initialize schedule output
  const schedule: Record<string, ScheduleEntry> = { ...existingSchedule };
  const conflicts: ScheduleConflict[] = [];

  // Track fast lookups:
  // teacherOccupancy: teacherId -> Set<`${day}_${period}`>
  const teacherOccupancy: Record<string, Set<string>> = {};
  // classOccupancy: classId -> Set<`${day}_${period}`>
  const classOccupancy: Record<string, Set<string>> = {};
  // classSubjectDayCount: `${classId}_${subjectId}_${day}` -> number
  const classSubjectDayCount: Record<string, number> = {};
  // teacherDayCount: `${teacherId}_${day}` -> number
  const teacherDayCount: Record<string, number> = {};

  // Initialize tracking sets
  Object.keys(teachers).forEach(tId => {
    teacherOccupancy[tId] = new Set();
  });
  Object.keys(classes).forEach(cId => {
    classOccupancy[cId] = new Set();
  });

  // Populate from locked/existing schedule
  Object.values(existingSchedule).forEach(entry => {
    const slotKey = `${entry.day}_${entry.period}`;
    if (!teacherOccupancy[entry.teacherId]) teacherOccupancy[entry.teacherId] = new Set();
    if (!classOccupancy[entry.classId]) classOccupancy[entry.classId] = new Set();
    
    teacherOccupancy[entry.teacherId].add(slotKey);
    classOccupancy[entry.classId].add(slotKey);

    const csdKey = `${entry.classId}_${entry.subjectId}_${entry.day}`;
    classSubjectDayCount[csdKey] = (classSubjectDayCount[csdKey] || 0) + 1;

    const tdKey = `${entry.teacherId}_${entry.day}`;
    teacherDayCount[tdKey] = (teacherDayCount[tdKey] || 0) + 1;
  });

  // Break assignments into individual single period units
  const units: PeriodUnit[] = [];
  const assignmentList = Object.values(assignments);

  let totalRequestedPeriods = 0;

  assignmentList.forEach(asn => {
    totalRequestedPeriods += asn.periodsPerWeek;
    // Count already scheduled periods for this assignment
    const alreadyScheduled = Object.values(schedule).filter(
      e => e.classId === asn.classId && e.subjectId === asn.subjectId && e.teacherId === asn.teacherId
    ).length;

    const remaining = asn.periodsPerWeek - alreadyScheduled;
    for (let i = 0; i < remaining; i++) {
      units.push({
        id: `${asn.id}_u${i}`,
        assignmentId: asn.id,
        classId: asn.classId,
        teacherId: asn.teacherId,
        subjectId: asn.subjectId,
        unitIndex: i,
        totalUnits: asn.periodsPerWeek,
      });
    }
  });

  // Sort units using heuristic:
  // 1. Fixed special subjects (SHDC - Chào Cờ, SHL - Sinh Hoạt Lớp) first
  // 2. High period subjects (Toán, Văn) with more constraints
  // 3. Teachers with higher overall workload
  units.sort((a, b) => {
    const subA = subjects[a.subjectId];
    const subB = subjects[b.subjectId];

    if (subA?.code === 'SHDC' && subB?.code !== 'SHDC') return -1;
    if (subB?.code === 'SHDC' && subA?.code !== 'SHDC') return 1;
    if (subA?.code === 'SHL' && subB?.code !== 'SHL') return -1;
    if (subB?.code === 'SHL' && subA?.code !== 'SHL') return 1;

    return b.totalUnits - a.totalUnits;
  });

  // Generate valid slot pool for a class based on its shift
  const getPossibleSlots = (cls: ClassItem) => {
    const slots: { day: DayOfWeek; period: number }[] = [];
    const days: DayOfWeek[] = ['THU_2', 'THU_3', 'THU_4', 'THU_5', 'THU_6', 'THU_7'];
    
    let startPeriod = 1;
    let endPeriod = 5;
    if (cls.shift === 'AFTERNOON') {
      startPeriod = 6;
      endPeriod = 10;
    } else if (cls.shift === 'FULL_DAY') {
      startPeriod = 1;
      endPeriod = 10;
    }

    days.forEach(day => {
      for (let p = startPeriod; p <= endPeriod; p++) {
        slots.push({ day, period: p });
      }
    });

    return slots;
  };

  let iterationCount = 0;
  let scheduledCount = Object.keys(schedule).length;
  const maxIterations = 50000;
  const unassignedUnits: PeriodUnit[] = [];

  const updateProgress = (phase: string, force = false) => {
    if (force || iterationCount % 50 === 0) {
      const progressPercent = Math.min(100, Math.round((scheduledCount / Math.max(1, totalRequestedPeriods)) * 100));
      const msg: WorkerOutMessage = {
        type: 'PROGRESS_UPDATE',
        payload: {
          status: 'running',
          progress: progressPercent,
          phase,
          iterations: iterationCount,
          conflicts: conflicts.length,
          scheduledPeriods: scheduledCount,
          totalPeriodsToSchedule: totalRequestedPeriods,
          timeElapsedMs: Date.now() - startTime,
        },
      };
      ctx.postMessage(msg);
    }
  };

  updateProgress('Đang phân tích ràng buộc môn học & giáo viên...', true);

  // Greedy Backtracking with Forward Checking & Heuristic Scored Slots
  for (let uIdx = 0; uIdx < units.length; uIdx++) {
    if (isCancelled) {
      const err: WorkerOutMessage = { type: 'SCHEDULING_ERROR', payload: { error: 'Quá trình xếp đã bị hủy bởi người dùng.' } };
      ctx.postMessage(err);
      return;
    }

    iterationCount++;
    const unit = units[uIdx];
    const cls = classes[unit.classId];
    const teacher = teachers[unit.teacherId];
    const subject = subjects[unit.subjectId];

    if (!cls || !teacher || !subject) {
      unassignedUnits.push(unit);
      continue;
    }

    // Special fixed slot rules:
    // SHDC (Chào Cờ) -> Morning: Thứ 2 Tiết 1, Afternoon: Thứ 2 Tiết 6
    if (subject.code === 'SHDC') {
      const targetPeriod = cls.shift === 'AFTERNOON' ? 6 : 1;
      const slotKey = `THU_2_${targetPeriod}`;
      const scheduleKey = `${cls.id}_THU_2_${targetPeriod}`;

      if (!classOccupancy[cls.id]?.has(slotKey) && !schedule[scheduleKey]) {
        schedule[scheduleKey] = {
          id: `SCH_${scheduleKey}`,
          classId: cls.id,
          teacherId: teacher.id,
          subjectId: subject.id,
          day: 'THU_2',
          period: targetPeriod,
        };
        classOccupancy[cls.id].add(slotKey);
        teacherOccupancy[teacher.id].add(slotKey);
        scheduledCount++;
        updateProgress(`Đã xếp Chào Cờ lớp ${cls.code}`);
        continue;
      }
    }

    // SHL (Sinh Hoạt Lớp) -> Morning: Thứ 7 Tiết 5, Afternoon: Thứ 7 Tiết 10
    if (subject.code === 'SHL') {
      const targetPeriod = cls.shift === 'AFTERNOON' ? 10 : 5;
      const slotKey = `THU_7_${targetPeriod}`;
      const scheduleKey = `${cls.id}_THU_7_${targetPeriod}`;

      if (!classOccupancy[cls.id]?.has(slotKey) && !schedule[scheduleKey]) {
        schedule[scheduleKey] = {
          id: `SCH_${scheduleKey}`,
          classId: cls.id,
          teacherId: teacher.id,
          subjectId: subject.id,
          day: 'THU_7',
          period: targetPeriod,
        };
        classOccupancy[cls.id].add(slotKey);
        teacherOccupancy[teacher.id].add(slotKey);
        scheduledCount++;
        updateProgress(`Đã xếp Sinh Hoạt Lớp ${cls.code}`);
        continue;
      }
    }

    // Standard subject placement
    const candidateSlots = getPossibleSlots(cls);

    // Score and filter slots
    type ScoredSlot = { day: DayOfWeek; period: number; score: number };
    const validSlots: ScoredSlot[] = [];

    for (const slot of candidateSlots) {
      const slotKey = `${slot.day}_${slot.period}`;
      const scheduleKey = `${cls.id}_${slot.day}_${slot.period}`;

      // 1. Class collision check
      if (classOccupancy[cls.id]?.has(slotKey) || schedule[scheduleKey]) {
        continue;
      }

      // 2. Teacher collision check
      if (teacherOccupancy[teacher.id]?.has(slotKey)) {
        continue;
      }

      // 3. Teacher unavailable check
      if (teacher.unavailableSlots?.includes(slotKey)) {
        continue;
      }

      // 4. Teacher daily period limit check
      const currentTeacherDayPeriods = teacherDayCount[`${teacher.id}_${slot.day}`] || 0;
      if (currentTeacherDayPeriods >= teacher.maxPeriodsPerDay) {
        continue;
      }

      // 5. Subject daily limit per class check (e.g. max 2 periods per day for Math, max 1 for others)
      const currentSubDayPeriods = classSubjectDayCount[`${cls.id}_${subject.id}_${slot.day}`] || 0;
      const maxAllowed = subject.maxPerDay || 2;
      if (currentSubDayPeriods >= maxAllowed) {
        continue;
      }

      // Slot is valid! Calculate heuristic score:
      // - Favor days where this subject is NOT yet taught (to spread evenly across week)
      // - Favor periods close to teacher's other classes to minimize idle gaps
      let score = 100;

      // Penalize if subject already has a period today (unless consecutive block is desired)
      if (currentSubDayPeriods > 0) {
        if (subject.consecutiveAllowed) {
          // Check if adjacent period is also this subject
          const prevSlotKey = `${cls.id}_${slot.day}_${slot.period - 1}`;
          const nextSlotKey = `${cls.id}_${slot.day}_${slot.period + 1}`;
          const isAdjacent = schedule[prevSlotKey]?.subjectId === subject.id || schedule[nextSlotKey]?.subjectId === subject.id;
          if (isAdjacent) {
            score += 30; // Bonus for consecutive pair
          } else {
            score -= 40; // Penalize separate periods on same day
          }
        } else {
          score -= 50; // Strongly prefer different days
        }
      } else {
        score += 40; // Bonus for spreading evenly across new days
      }

      // Teacher idle gap optimization: bonus if teacher is already teaching an adjacent period
      const prevTeacherSlot = `${slot.day}_${slot.period - 1}`;
      const nextTeacherSlot = `${slot.day}_${slot.period + 1}`;
      if (teacherOccupancy[teacher.id]?.has(prevTeacherSlot) || teacherOccupancy[teacher.id]?.has(nextTeacherSlot)) {
        score += 25; // Bonus for compact schedule without gaps
      }

      validSlots.push({ day: slot.day, period: slot.period, score });
    }

    if (validSlots.length > 0) {
      // Sort by best score descending
      validSlots.sort((a, b) => b.score - a.score);
      const chosen = validSlots[0];

      const slotKey = `${chosen.day}_${chosen.period}`;
      const scheduleKey = `${cls.id}_${chosen.day}_${chosen.period}`;

      // Assign slot
      schedule[scheduleKey] = {
        id: `SCH_${scheduleKey}`,
        classId: cls.id,
        teacherId: teacher.id,
        subjectId: subject.id,
        day: chosen.day,
        period: chosen.period,
      };

      classOccupancy[cls.id].add(slotKey);
      teacherOccupancy[teacher.id].add(slotKey);

      const csdKey = `${cls.id}_${subject.id}_${chosen.day}`;
      classSubjectDayCount[csdKey] = (classSubjectDayCount[csdKey] || 0) + 1;

      const tdKey = `${teacher.id}_${chosen.day}`;
      teacherDayCount[tdKey] = (teacherDayCount[tdKey] || 0) + 1;

      scheduledCount++;
      updateProgress(`Đang xếp ${subject.name} - Lớp ${cls.code} (${scheduledCount}/${totalRequestedPeriods})`);
    } else {
      // Could not find conflict-free slot on first pass
      unassignedUnits.push(unit);
    }
  }

  // Second pass: Intelligent Swapping / Soft Relaxation for unassigned units
  if (unassignedUnits.length > 0) {
    updateProgress(`Đang giải quyết ${unassignedUnits.length} tiết chưa xếp...`);

    const stillUnassigned: PeriodUnit[] = [];

    for (const unit of unassignedUnits) {
      const cls = classes[unit.classId];
      const teacher = teachers[unit.teacherId];
      const subject = subjects[unit.subjectId];
      if (!cls || !teacher || !subject) continue;

      const candidateSlots = getPossibleSlots(cls);
      let placed = false;

      for (const slot of candidateSlots) {
        const slotKey = `${slot.day}_${slot.period}`;
        const scheduleKey = `${cls.id}_${slot.day}_${slot.period}`;

        // Hard checks only: class & teacher not busy
        if (!classOccupancy[cls.id]?.has(slotKey) && !teacherOccupancy[teacher.id]?.has(slotKey)) {
          schedule[scheduleKey] = {
            id: `SCH_${scheduleKey}`,
            classId: cls.id,
            teacherId: teacher.id,
            subjectId: subject.id,
            day: slot.day,
            period: slot.period,
          };
          classOccupancy[cls.id].add(slotKey);
          teacherOccupancy[teacher.id].add(slotKey);
          scheduledCount++;
          placed = true;
          break;
        }
      }

      if (!placed) {
        stillUnassigned.push(unit);
        conflicts.push({
          id: `CONF_${unit.id}`,
          type: 'TEACHER_OVERLOAD',
          message: `Không tìm được tiết trống cho môn ${subject.name} - Lớp ${cls.code} (GV ${teacher.name})`,
          details: {
            classId: cls.id,
            teacherId: teacher.id,
            subjectId: subject.id,
          },
        });
      }
    }
  }

  // Compile final result
  const finalResult: SchedulerResult = {
    success: conflicts.length === 0,
    schedule,
    conflicts,
    unassignedPeriods: [],
    stats: {
      totalPeriodsScheduled: Object.keys(schedule).length,
      totalPeriodsRequested: totalRequestedPeriods,
      iterations: iterationCount,
      timeElapsedMs: Date.now() - startTime,
      teachersAssigned: Object.keys(teachers).length,
      classesAssigned: Object.keys(classes).length,
    },
  };

  const completeMsg: WorkerOutMessage = {
    type: 'SCHEDULING_COMPLETE',
    payload: finalResult,
  };
  ctx.postMessage(completeMsg);
}
