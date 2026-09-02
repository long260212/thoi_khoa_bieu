import { ParsedTeachingUnit } from './assignmentParser';

export const DAYS_LIST = ['THU_2', 'THU_3', 'THU_4', 'THU_5', 'THU_6', 'THU_7'];
export const PERIODS_LIST = [1, 2, 3, 4, 5]; // 5 tiết mỗi buổi

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
  const teacherOccupancy: Record<string, Set<string>> = {};
  const classOccupancy: Record<string, Set<string>> = {};
  const classSubjectDayCount: Record<string, number> = {};

  const getSlotKey = (day: string, p: number) => `${day}_${p}`;
  const getScheduleKey = (cls: string, day: string, p: number) => `${cls}_${day}_${p}`;

  // 1. Cố định Chào Cờ (Thứ 2 Tiết 1) và Sinh Hoạt Lớp (Thứ 7 Tiết 5) cho tất cả các lớp
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

  // 2. Chuyển đổi các phân công thành các tiết học đơn lẻ
  interface IndividualPeriod {
    teacherName: string;
    subjectName: string;
    className: string;
    unitIndex: number;
    totalPeriods: number;
  }

  const units: IndividualPeriod[] = [];
  let totalRequested = classList.length * 2; // Gồm Chào cờ & SHL

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

  // Sắp xếp ưu tiên môn nhiều tiết trước (Toán, Văn, KHTN, Anh)
  units.sort((a, b) => b.totalPeriods - a.totalPeriods);

  // Danh sách tất cả 30 ô trong tuần (6 ngày x 5 tiết)
  const allSlots: { day: string; period: number }[] = [];
  DAYS_LIST.forEach((day) => {
    PERIODS_LIST.forEach((p) => {
      allSlots.push({ day, period: p });
    });
  });

  const unplacedUnits: IndividualPeriod[] = [];

  // Pass 1: Xếp với ràng buộc phân bổ đều môn trong tuần
  units.forEach((unit) => {
    const { teacherName, subjectName, className } = unit;

    if (!classOccupancy[className]) classOccupancy[className] = new Set();
    if (!teacherOccupancy[teacherName]) teacherOccupancy[teacherName] = new Set();

    type ScoredSlot = { day: string; period: number; score: number };
    const candidates: ScoredSlot[] = [];

    allSlots.forEach(({ day, period }) => {
      const slotKey = getSlotKey(day, period);
      const schedKey = getScheduleKey(className, day, period);

      // 1. Lớp phải trống
      if (classOccupancy[className].has(slotKey) || schedule[schedKey]) return;

      // 2. Giáo viên phải trống
      if (teacherOccupancy[teacherName].has(slotKey)) return;

      // 3. Giới hạn số tiết của môn trong ngày
      const csdKey = `${className}_${subjectName}_${day}`;
      const countToday = classSubjectDayCount[csdKey] || 0;
      const isMain = ['toán', 'văn', 'ngữ văn', 'khtn', 'tiếng anh'].includes(subjectName.toLowerCase());
      const maxPerDay = isMain ? 2 : 1;

      if (countToday >= maxPerDay) return;

      let score = 100;
      if (countToday === 0) score += 30; // Ưu tiên ngày chưa có môn này

      candidates.push({ day, period, score });
    });

    if (candidates.length > 0) {
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
    } else {
      unplacedUnits.push(unit);
    }
  });

  // Pass 2: Xếp vét các tiết còn lại (nới lỏng giới hạn số tiết/ngày nhưng TUYỆT ĐỐI không trùng GV và trùng Lớp)
  unplacedUnits.forEach((unit) => {
    const { teacherName, subjectName, className } = unit;

    for (const { day, period } of allSlots) {
      const slotKey = getSlotKey(day, period);
      const schedKey = getScheduleKey(className, day, period);

      if (!classOccupancy[className].has(slotKey) && !teacherOccupancy[teacherName].has(slotKey) && !schedule[schedKey]) {
        schedule[schedKey] = {
          subject: subjectName,
          teacher: teacherName,
        };

        classOccupancy[className].add(slotKey);
        teacherOccupancy[teacherName].add(slotKey);
        break;
      }
    }
  });

  return {
    schedule,
    totalScheduled: Object.keys(schedule).length,
    totalRequested,
    timeElapsedMs: Date.now() - startTime,
  };
}
