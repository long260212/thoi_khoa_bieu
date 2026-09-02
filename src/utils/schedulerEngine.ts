import { ParsedTeachingUnit } from './assignmentParser';

export const DAYS_LIST = ['THU_2', 'THU_3', 'THU_4', 'THU_5', 'THU_6', 'THU_7'];
export const PERIODS_LIST = [1, 2, 3, 4, 5]; // 5 tiết buổi sáng / buổi chiều

export interface ScheduleResultEntry {
  subject: string;
  teacher: string;
}

export function autoScheduleAllClasses(
  assignments: ParsedTeachingUnit[],
  classList: string[]
): {
  schedule: Record<string, ScheduleResultEntry>;
  totalScheduled: number;
  totalRequested: number;
  timeElapsedMs: number;
} {
  const startTime = Date.now();
  const schedule: Record<string, ScheduleResultEntry> = {};

  // Occupancy trackers for O(1) collision detection
  // teacherOccupancy[teacherName][day_period] = true
  const teacherOccupancy: Record<string, Set<string>> = {};
  // classOccupancy[className][day_period] = true
  const classOccupancy: Record<string, Set<string>> = {};
  // classSubjectDayCount[className_subjectName_day] = number
  const classSubjectDayCount: Record<string, number> = {};

  const getSlotKey = (day: string, p: number) => `${day}_${p}`;
  const getScheduleKey = (cls: string, day: string, p: number) => `${cls}_${day}_${p}`;

  // 1. Auto-assign Fixed Slots for every class:
  // - Chào Cờ: Thứ 2, Tiết 1
  // - Sinh Hoạt Lớp: Thứ 7, Tiết 5
  classList.forEach((cls) => {
    // Chào cờ
    const ccKey = getScheduleKey(cls, 'THU_2', 1);
    schedule[ccKey] = { subject: 'Chào Cờ', teacher: 'GVCN' };
    if (!classOccupancy[cls]) classOccupancy[cls] = new Set();
    classOccupancy[cls].add(getSlotKey('THU_2', 1));

    // Sinh hoạt lớp
    const shlKey = getScheduleKey(cls, 'THU_7', 5);
    schedule[shlKey] = { subject: 'Sinh Hoạt Lớp', teacher: 'GVCN' };
    classOccupancy[cls].add(getSlotKey('THU_7', 5));
  });

  // 2. Break teaching assignments into individual 1-period teaching units
  interface IndividualPeriod {
    teacherName: string;
    subjectName: string;
    className: string;
    unitIndex: number;
    totalPeriods: number;
  }

  const units: IndividualPeriod[] = [];
  let totalRequested = classList.length * 2; // Including Chào cờ & SHL

  assignments.forEach((asn) => {
    totalRequested += asn.periodsPerWeek;
    for (let i = 0; i < asn.periodsPerWeek; i++) {
      units.push({
        teacherName: asn.teacherName,
        subjectName: asn.subjectName,
        className: asn.className,
        unitIndex: i,
        totalPeriods: asn.periodsPerWeek,
      });
    }
  });

  // Sort units: Prioritize high-demand subjects (Toán, Văn, KHTN, Anh) first
  units.sort((a, b) => b.totalPeriods - a.totalPeriods);

  // Available slots pool (Mon-Sat, Periods 1-5)
  const allSlots: { day: string; period: number }[] = [];
  DAYS_LIST.forEach((day) => {
    PERIODS_LIST.forEach((p) => {
      allSlots.push({ day, period: p });
    });
  });

  // Backtracking / Greedy Heuristic Placement
  units.forEach((unit) => {
    const { teacherName, subjectName, className } = unit;

    if (!classOccupancy[className]) classOccupancy[className] = new Set();
    if (!teacherOccupancy[teacherName]) teacherOccupancy[teacherName] = new Set();

    // Find best conflict-free slot
    // Score slots based on even spread across days
    type ScoredSlot = { day: string; period: number; score: number };
    const candidates: ScoredSlot[] = [];

    allSlots.forEach(({ day, period }) => {
      const slotKey = getSlotKey(day, period);
      const schedKey = getScheduleKey(className, day, period);

      // 1. Class must be free
      if (classOccupancy[className].has(slotKey) || schedule[schedKey]) return;

      // 2. Teacher must be free
      if (teacherOccupancy[teacherName].has(slotKey)) return;

      // 3. Check subject count on this day for this class (max 2 periods per day for Math/Literature, max 1 for others)
      const csdKey = `${className}_${subjectName}_${day}`;
      const countToday = classSubjectDayCount[csdKey] || 0;
      const isMain = ['toán', 'văn', 'ngữ văn', 'khtn', 'tiếng anh'].includes(subjectName.toLowerCase());
      const maxPerDay = isMain ? 2 : 1;

      if (countToday >= maxPerDay) return;

      // Calculate score
      let score = 100;
      if (countToday === 0) score += 30; // Prefer new days to spread evenly

      candidates.push({ day, period, score });
    });

    if (candidates.length > 0) {
      // Pick best candidate slot
      candidates.sort((a, b) => b.score - a.score);
      const chosen = candidates[0];

      const slotKey = getSlotKey(chosen.day, chosen.period);
      const schedKey = getScheduleKey(className, chosen.day, chosen.period);

      schedule[schedKey] = {
        subject: subjectName,
        teacher: teacherName,
      };

      classOccupancy[className].add(slotKey);
      teacherOccupancy[teacherName].add(slotKey);

      const csdKey = `${className}_${subjectName}_${chosen.day}`;
      classSubjectDayCount[csdKey] = (classSubjectDayCount[csdKey] || 0) + 1;
    }
  });

  return {
    schedule,
    totalScheduled: Object.keys(schedule).length,
    totalRequested,
    timeElapsedMs: Date.now() - startTime,
  };
}
