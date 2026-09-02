import { ParsedTeachingUnit } from './assignmentParser';

// 5 ngày trong tuần (Thứ Hai đến Thứ Sáu - KHÔNG HỌC THỨ BẢY THEO QUY ĐỊNH)
export const DAYS_LIST = ['THU_2', 'THU_3', 'THU_4', 'THU_5', 'THU_6'];

// Buổi Sáng: Tiết 1, 2, 3, 4, 5 | Buổi Chiều: Tiết 6, 7 (tương ứng Chiều Tiết 1, Tiết 2)
export const PERIODS_LIST = [1, 2, 3, 4, 5, 6, 7];

export interface ScheduleResultEntry {
  subject: string;
  teacher: string;
}

// Danh mục môn học và trọng số sư phạm chuẩn Bộ GD&ĐT
const SUBJECT_PEDAGOGY_RULES: Record<string, {
  preferredPeriods: number[]; // Tiết ưu tiên (1-indexed)
  penaltyPeriods: number[];   // Tiết cần tránh
  allowDouble: boolean;       // Cho phép / ưu tiên tiết đôi (2 tiết liền nhau)
  maxPerDay: number;          // Số tiết tối đa trong 1 ngày của 1 lớp
  isHeavy: boolean;           // Môn tư duy nặng
  isActivity: boolean;        // Môn vận động / nghệ thuật
}> = {
  'toán': { preferredPeriods: [1, 2, 3, 4], penaltyPeriods: [6, 7], allowDouble: true, maxPerDay: 2, isHeavy: true, isActivity: false },
  'ngữ văn': { preferredPeriods: [1, 2, 3, 4], penaltyPeriods: [], allowDouble: true, maxPerDay: 2, isHeavy: true, isActivity: false },
  'văn': { preferredPeriods: [1, 2, 3, 4], penaltyPeriods: [], allowDouble: true, maxPerDay: 2, isHeavy: true, isActivity: false },
  'khtn': { preferredPeriods: [1, 2, 3, 4], penaltyPeriods: [7], allowDouble: true, maxPerDay: 2, isHeavy: true, isActivity: false },
  'tiếng anh': { preferredPeriods: [1, 2, 3, 4], penaltyPeriods: [7], allowDouble: false, maxPerDay: 1, isHeavy: true, isActivity: false },
  'lịch sử': { preferredPeriods: [2, 3, 4, 5], penaltyPeriods: [], allowDouble: false, maxPerDay: 1, isHeavy: false, isActivity: false },
  'địa lí': { preferredPeriods: [2, 3, 4, 5], penaltyPeriods: [], allowDouble: false, maxPerDay: 1, isHeavy: false, isActivity: false },
  'gdcd': { preferredPeriods: [3, 4, 5, 6], penaltyPeriods: [1], allowDouble: false, maxPerDay: 1, isHeavy: false, isActivity: false },
  'tin học': { preferredPeriods: [4, 5, 6, 7], penaltyPeriods: [1], allowDouble: false, maxPerDay: 1, isHeavy: false, isActivity: false },
  'gd thể chất': { preferredPeriods: [3, 4, 5, 6], penaltyPeriods: [1], allowDouble: false, maxPerDay: 1, isHeavy: false, isActivity: true },
  'mĩ thuật': { preferredPeriods: [4, 5, 6, 7], penaltyPeriods: [1], allowDouble: false, maxPerDay: 1, isHeavy: false, isActivity: true },
  'âm nhạc': { preferredPeriods: [4, 5, 6, 7], penaltyPeriods: [1], allowDouble: false, maxPerDay: 1, isHeavy: false, isActivity: true },
  'hđtn-hn': { preferredPeriods: [4, 5, 6, 7], penaltyPeriods: [1], allowDouble: true, maxPerDay: 2, isHeavy: false, isActivity: true },
  'gd địa phương': { preferredPeriods: [3, 4, 5, 6], penaltyPeriods: [1], allowDouble: false, maxPerDay: 1, isHeavy: false, isActivity: false },
};

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
  
  // classDaySubjectCount[class_day_subject] = number
  const classDaySubjectCount: Record<string, number> = {};
  // classDayHeavyCount[class_day] = number (số môn nặng trong ngày)
  const classDayHeavyCount: Record<string, number> = {};
  // teacherDayPeriods[teacher_day] = Set<period>
  const teacherDayPeriods: Record<string, Set<number>> = {};

  const getSlotKey = (day: string, p: number) => `${day}_${p}`;
  const getScheduleKey = (cls: string, day: string, p: number) => `${cls}_${day}_${p}`;

  // 1. CỐ ĐỊNH CHUẨN SƯ PHẠM (ÁP DỤNG LỊCH 5 NGÀY THỨ 2 - THỨ 6):
  // - Chào Cờ (SHDC): Thứ 2 Tiết 1 (Sáng)
  // - Sinh Hoạt Lớp (SHL): Thứ 6 Tiết 5 (Sáng)
  classList.forEach((cls) => {
    // Chào cờ
    const ccKey = getScheduleKey(cls, 'THU_2', 1);
    schedule[ccKey] = { subject: 'Chào Cờ', teacher: 'GVCN' };
    if (!classOccupancy[cls]) classOccupancy[cls] = new Set();
    classOccupancy[cls].add(getSlotKey('THU_2', 1));

    // Sinh hoạt lớp
    const shlKey = getScheduleKey(cls, 'THU_6', 5);
    schedule[shlKey] = { subject: 'Sinh Hoạt Lớp', teacher: 'GVCN' };
    classOccupancy[cls].add(getSlotKey('THU_6', 5));
  });

  // 2. NHÓM PHÂN CÔNG THÀNH CÁC BLOCK SƯ PHẠM:
  // - Gom thành Tiết Đôi (2 tiết) cho Ngữ văn / Toán / KHTN khi phù hợp
  // - Tiết Đơn (1 tiết) cho các môn còn lại
  interface SchedulingBlock {
    teacherName: string;
    subjectName: string;
    className: string;
    blockSize: number; // 1 hoặc 2 tiết
    priority: number;  // Độ ưu tiên xếp trước
  }

  const blocks: SchedulingBlock[] = [];
  let totalRequested = classList.length * 2; // Gồm Chào cờ & SHL

  assignments.forEach((asn) => {
    totalRequested += asn.periodsPerWeek;
    let remaining = asn.periodsPerWeek;
    const subKey = asn.subjectName.toLowerCase();
    const rule = SUBJECT_PEDAGOGY_RULES[subKey] || {
      preferredPeriods: [1, 2, 3, 4],
      penaltyPeriods: [],
      allowDouble: false,
      maxPerDay: 1,
      isHeavy: false,
      isActivity: false,
    };

    // Tạo block đôi cho Ngữ Văn (hoặc Toán/KHTN nếu 4 tiết/tuần -> 2 block đôi)
    while (remaining >= 2 && rule.allowDouble && (subKey.includes('văn') || subKey.includes('khtn'))) {
      blocks.push({
        teacherName: asn.teacherName,
        subjectName: asn.subjectName,
        className: asn.className,
        blockSize: 2,
        priority: 100, // Ưu tiên cao nhất
      });
      remaining -= 2;
    }

    // Các tiết đơn lẻ còn lại
    while (remaining > 0) {
      blocks.push({
        teacherName: asn.teacherName,
        subjectName: asn.subjectName,
        className: asn.className,
        blockSize: 1,
        priority: rule.isHeavy ? 80 : (rule.isActivity ? 40 : 60),
      });
      remaining -= 1;
    }
  });

  // Sắp xếp block: Block đôi và môn nặng xếp trước
  blocks.sort((a, b) => {
    if (b.blockSize !== a.blockSize) return b.blockSize - a.blockSize;
    return b.priority - a.priority;
  });

  // Danh sách các ngày trong tuần
  const daysPool = [...DAYS_LIST];

  // Helper tính điểm sư phạm cho vị trí (day, period)
  const calculatePedagogicalScore = (
    block: SchedulingBlock,
    day: string,
    startPeriod: number
  ): number => {
    const { subjectName, teacherName, className, blockSize } = block;
    const subKey = subjectName.toLowerCase();
    const rule = SUBJECT_PEDAGOGY_RULES[subKey] || {
      preferredPeriods: [1, 2, 3, 4],
      penaltyPeriods: [5],
      allowDouble: false,
      maxPerDay: 2,
      isHeavy: false,
      isActivity: false,
    };

    let score = 100;

    // 1. Phù hợp nhịp sinh học buổi sáng:
    for (let i = 0; i < blockSize; i++) {
      const p = startPeriod + i;
      if (rule.preferredPeriods.includes(p)) {
        score += 35; // Thưởng tiết lý tưởng (Tiết 1-3 cho Toán/Văn/Anh)
      }
      if (rule.penaltyPeriods.includes(p)) {
        score -= 40; // Phạt nếu xếp môn nặng vào tiết 5 đói mệt
      }
    }

    // 2. Cân bằng tải môn nặng trong ngày của lớp:
    const heavyKey = `${className}_${day}`;
    const heavyCount = classDayHeavyCount[heavyKey] || 0;
    if (rule.isHeavy) {
      if (heavyCount >= 3) score -= 60; // Tránh ngày có quá 3 môn nặng
      else score += 10;
    }

    // 3. Phân bổ đều các ngày trong tuần (tránh dồn vào 1 ngày):
    const csdKey = `${className}_${day}_${subjectName}`;
    const currentSubjectCount = classDaySubjectCount[csdKey] || 0;
    if (currentSubjectCount === 0) {
      score += 40; // Rất tốt: môn được trải sang ngày mới
    } else {
      score -= 20;
    }

    // 4. Tiện lợi cho Giáo Viên (Chống tiết trống / "nhảy cóc"):
    const tdKey = `${teacherName}_${day}`;
    const teacherPeriods = teacherDayPeriods[tdKey];
    if (teacherPeriods && teacherPeriods.size > 0) {
      // Nếu GV đã có tiết trong ngày, thưởng lớn nếu xếp LIỀN KỀ
      const hasAdjacent = Array.from(teacherPeriods).some(
        (tp) => tp === startPeriod - 1 || tp === startPeriod + blockSize
      );
      if (hasAdjacent) {
        score += 50; // Gom ca dạy liền nhau cho GV!
      } else {
        score -= 25; // Tránh tạo lỗ hổng trống tiết
      }
    }

    return score;
  };

  // VÒNG 1: XẾP THEO CHUẨN SƯ PHẠM VÀ RÀNG BUỘC CHẶT
  const unplacedBlocks: SchedulingBlock[] = [];

  blocks.forEach((block) => {
    const { teacherName, subjectName, className, blockSize } = block;

    if (!classOccupancy[className]) classOccupancy[className] = new Set();
    if (!teacherOccupancy[teacherName]) teacherOccupancy[teacherName] = new Set();

    type Candidate = { day: string; startPeriod: number; score: number };
    const candidates: Candidate[] = [];

    daysPool.forEach((day) => {
      // Kiểm tra giới hạn môn trong ngày
      const csdKey = `${className}_${day}_${subjectName}`;
      const subKey = subjectName.toLowerCase();
      const rule = SUBJECT_PEDAGOGY_RULES[subKey] || { maxPerDay: 1 };
      const currentCount = classDaySubjectCount[csdKey] || 0;

      if (currentCount + blockSize > rule.maxPerDay && currentCount > 0) {
        return; // Đã quá số tiết tối đa cho phép của môn trong ngày
      }

      // Các vị trí bắt đầu hợp lệ (Không vắt qua giờ nghỉ trưa giữa Tiết 5 Sáng và Tiết 1 Chiều)
      const validStartPeriods = blockSize === 2 ? [1, 2, 3, 4, 6] : [1, 2, 3, 4, 5, 6, 7];

      for (const p of validStartPeriods) {
        let isFree = true;

        for (let offset = 0; offset < blockSize; offset++) {
          const currentP = p + offset;
          const slotKey = getSlotKey(day, currentP);
          const schedKey = getScheduleKey(className, day, currentP);

          // Lớp phải trống & GV phải trống
          if (classOccupancy[className].has(slotKey) || teacherOccupancy[teacherName].has(slotKey) || schedule[schedKey]) {
            isFree = false;
            break;
          }
        }

        if (isFree) {
          const score = calculatePedagogicalScore(block, day, p);
          candidates.push({ day, startPeriod: p, score });
        }
      }
    });

    if (candidates.length > 0) {
      // Chọn vị trí có điểm sư phạm cao nhất
      candidates.sort((a, b) => b.score - a.score);
      const chosen = candidates[0];

      for (let offset = 0; offset < blockSize; offset++) {
        const p = chosen.startPeriod + offset;
        const slotKey = getSlotKey(chosen.day, p);
        const schedKey = getScheduleKey(className, chosen.day, p);

        schedule[schedKey] = {
          subject: subjectName,
          teacher: teacherName,
        };

        classOccupancy[className].add(slotKey);
        teacherOccupancy[teacherName].add(slotKey);

        // Cập nhật thống kê ngày
        const tdKey = `${teacherName}_${chosen.day}`;
        if (!teacherDayPeriods[tdKey]) teacherDayPeriods[tdKey] = new Set();
        teacherDayPeriods[tdKey].add(p);
      }

      const csdKey = `${className}_${chosen.day}_${subjectName}`;
      classDaySubjectCount[csdKey] = (classDaySubjectCount[csdKey] || 0) + blockSize;

      const subKey = subjectName.toLowerCase();
      if (SUBJECT_PEDAGOGY_RULES[subKey]?.isHeavy) {
        const heavyKey = `${className}_${chosen.day}`;
        classDayHeavyCount[heavyKey] = (classDayHeavyCount[heavyKey] || 0) + blockSize;
      }
    } else {
      unplacedBlocks.push(block);
    }
  });

  // VÒNG 2: XẾP VÉT CÁC TIẾT CÒN LẠI (Tách nhỏ block nếu cần, đảm bảo 100% không trùng)
  unplacedBlocks.forEach((block) => {
    const { teacherName, subjectName, className, blockSize } = block;

    // Tách thành từng tiết đơn lẻ
    for (let b = 0; b < blockSize; b++) {
      let placed = false;

      for (const day of daysPool) {
        if (placed) break;

        for (const p of [1, 2, 3, 4, 5, 6, 7]) {
          const slotKey = getSlotKey(day, p);
          const schedKey = getScheduleKey(className, day, p);

          if (!classOccupancy[className].has(slotKey) && !teacherOccupancy[teacherName].has(slotKey) && !schedule[schedKey]) {
            schedule[schedKey] = {
              subject: subjectName,
              teacher: teacherName,
            };

            classOccupancy[className].add(slotKey);
            teacherOccupancy[teacherName].add(slotKey);
            placed = true;
            break;
          }
        }
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
