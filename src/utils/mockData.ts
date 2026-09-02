import { Assignment, ClassItem, SubjectItem, Teacher } from '../types/state';

// Danh mục môn học chuẩn Chương trình Giáo dục Phổ thông 2018 cấp Tiểu học (Khối 1 - 5)
export const INITIAL_SUBJECTS: Record<string, SubjectItem> = {
  SUB_TV: { id: 'SUB_TV', code: 'TV', name: 'Tiếng Việt', color: '#e11d48', textColor: '#ffffff', category: 'MAIN', maxPerDay: 2, consecutiveAllowed: true },
  SUB_TOAN: { id: 'SUB_TOAN', code: 'TOAN', name: 'Toán', color: '#2563eb', textColor: '#ffffff', category: 'MAIN', maxPerDay: 2, consecutiveAllowed: false },
  SUB_ENG: { id: 'SUB_ENG', code: 'ENG', name: 'Tiếng Anh', color: '#059669', textColor: '#ffffff', category: 'MAIN', maxPerDay: 2, consecutiveAllowed: false },
  SUB_TNXH: { id: 'SUB_TNXH', code: 'TNXH', name: 'Tự Nhiên & Xã Hội', color: '#0891b2', textColor: '#ffffff', category: 'MAIN', maxPerDay: 1, consecutiveAllowed: false },
  SUB_KH: { id: 'SUB_KH', code: 'KH', name: 'Khoa Học', color: '#65a30d', textColor: '#ffffff', category: 'MAIN', maxPerDay: 1, consecutiveAllowed: false },
  SUB_LSDL: { id: 'SUB_LSDL', code: 'LSDL', name: 'Lịch Sử & Địa Lí', color: '#d97706', textColor: '#ffffff', category: 'MAIN', maxPerDay: 1, consecutiveAllowed: false },
  SUB_TINCN: { id: 'SUB_TINCN', code: 'TINCN', name: 'Tin Học & Công Nghệ', color: '#9333ea', textColor: '#ffffff', category: 'SUB', maxPerDay: 1, consecutiveAllowed: false },
  SUB_DAODUC: { id: 'SUB_DD', code: 'DD', name: 'Đạo Đức', color: '#db2777', textColor: '#ffffff', category: 'SUB', maxPerDay: 1, consecutiveAllowed: false },
  SUB_GDTC: { id: 'SUB_GDTC', code: 'GDTC', name: 'Giáo Dục Thể Chất', color: '#0d9488', textColor: '#ffffff', category: 'SUB', maxPerDay: 1, consecutiveAllowed: false },
  SUB_AMNHAC: { id: 'SUB_AN', code: 'AN', name: 'Âm Nhạc', color: '#7c3aed', textColor: '#ffffff', category: 'ACTIVITY', maxPerDay: 1, consecutiveAllowed: false },
  SUB_MYTHUAT: { id: 'SUB_MT', code: 'MT', name: 'Mĩ Thuật', color: '#c026d3', textColor: '#ffffff', category: 'ACTIVITY', maxPerDay: 1, consecutiveAllowed: false },
  SUB_HDTN: { id: 'SUB_HDTN', code: 'HDTN', name: 'Hoạt Động Trải Nghiệm', color: '#0284c7', textColor: '#ffffff', category: 'ACTIVITY', maxPerDay: 1, consecutiveAllowed: false },
  SUB_SHDC: { id: 'SUB_SHDC', code: 'SHDC', name: 'Chào Cờ / SHDC', color: '#475569', textColor: '#ffffff', category: 'ACTIVITY', maxPerDay: 1, consecutiveAllowed: false },
  SUB_SHL: { id: 'SUB_SHL', code: 'SHL', name: 'Sinh Hoạt Lớp', color: '#334155', textColor: '#ffffff', category: 'ACTIVITY', maxPerDay: 1, consecutiveAllowed: false },
};

// Tạo danh sách lớp học Tiểu học (Chỉ từ Khối 1 đến Khối 5)
export function generateMockClasses(): Record<string, ClassItem> {
  const classes: Record<string, ClassItem> = {};
  const grades = [1, 2, 3, 4, 5]; // Chỉ cấp 1: Lớp 1 - 5
  
  grades.forEach((grade) => {
    // 6 lớp mỗi khối = 30 lớp tiểu học
    for (let i = 1; i <= 6; i++) {
      const code = `${grade}A${i}`;
      const id = `CLS_${code}`;
      // Khối 1, 2, 5 học sáng, khối 3, 4 học chiều (hoặc cả ngày)
      const isMorning = grade === 1 || grade === 2 || grade === 5;
      classes[id] = {
        id,
        code,
        grade,
        shift: isMorning ? 'MORNING' : 'AFTERNOON',
        room: `P.T${grade}0${i}`,
      };
    }
  });

  return classes;
}

// Danh sách họ và tên giáo viên Việt Nam
const VIET_LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const VIET_MIDDLE_NAMES = ['Thị', 'Văn', 'Ngọc', 'Thanh', 'Mai', 'Thu', 'Hải', 'Xuân', 'Kim', 'Bảo', 'Gia', 'Minh', 'Hồng', 'Hương'];
const VIET_FIRST_NAMES = ['Loan', 'Mai', 'Hà', 'Hương', 'Trang', 'Linh', 'Phương', 'Yến', 'Lan', 'Thảo', 'Vy', 'Huyền', 'Tuyết', 'Nga', 'Hạnh', 'Dung', 'Oanh', 'Bình', 'Hùng', 'Đức', 'Cường', 'Dũng', 'Tuấn'];

export function generateMockTeachers(count: number = 50): Record<string, Teacher> {
  const teachers: Record<string, Teacher> = {};
  
  // Giáo viên tiểu học mẫu
  const sampleTeachers: Partial<Teacher>[] = [
    { code: 'GV01_Loan', name: 'Cô Trần Thị Loan (GVCN 1A1)', maxPeriodsPerWeek: 23 },
    { code: 'GV02_Mai', name: 'Cô Lê Thị Mai (GVCN 2A1)', maxPeriodsPerWeek: 23 },
    { code: 'GV03_Hung', name: 'Thầy Nguyễn Văn Hùng (GVCN 3A1)', maxPeriodsPerWeek: 23 },
    { code: 'GV04_Trang', name: 'Cô Đặng Thu Trang (GVCN 4A1)', maxPeriodsPerWeek: 23 },
    { code: 'GV05_Duc', name: 'Thầy Phạm Minh Đức (GV Thể Dục)', maxPeriodsPerWeek: 23 },
    { code: 'GV06_Anh', name: 'Cô Hoàng Ngọc Anh (GV Tiếng Anh)', maxPeriodsPerWeek: 22 },
    { code: 'GV07_Linh', name: 'Cô Vũ Thùy Linh (GV Âm Nhạc)', maxPeriodsPerWeek: 20 },
    { code: 'GV08_Dung', name: 'Cô Bùi Mỹ Dung (GV Mĩ Thuật)', maxPeriodsPerWeek: 20 },
    { code: 'GV09_Hai', name: 'Thầy Bùi Hoàng Hải (GV Tin Học)', maxPeriodsPerWeek: 22 },
  ];

  sampleTeachers.forEach((t, idx) => {
    const id = `TEA_${t.code}`;
    teachers[id] = {
      id,
      code: t.code!,
      name: t.name!,
      email: `${t.code?.toLowerCase()}@tieuhoc.edu.vn`,
      phone: `098${Math.floor(1000000 + Math.random() * 9000000)}`,
      maxPeriodsPerWeek: t.maxPeriodsPerWeek || 23, // Chuẩn Tiểu học: 23 tiết/tuần
      maxPeriodsPerDay: 4,
      unavailableSlots: idx === 0 ? ['THU_7_4', 'THU_7_5'] : [],
    };
  });

  // Tạo các giáo viên tiếp theo
  for (let i = sampleTeachers.length + 1; i <= count; i++) {
    const lastName = VIET_LAST_NAMES[i % VIET_LAST_NAMES.length];
    const midName = VIET_MIDDLE_NAMES[(i * 3) % VIET_MIDDLE_NAMES.length];
    const firstName = VIET_FIRST_NAMES[(i * 7) % VIET_FIRST_NAMES.length];
    const isFemale = midName === 'Thị' || !['Hùng', 'Đức', 'Cường', 'Dũng', 'Tuấn'].includes(firstName);
    const title = isFemale ? 'Cô' : 'Thầy';
    const fullName = `${title} ${lastName} ${midName} ${firstName}`;
    
    const initials = `${lastName[0]}${midName[0]}${firstName}`;
    const code = `GV${i < 10 ? '0' + i : i}_${initials}`;
    const id = `TEA_${code}`;

    teachers[id] = {
      id,
      code,
      name: fullName,
      email: `${code.toLowerCase()}@tieuhoc.edu.vn`,
      phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      maxPeriodsPerWeek: 23, // Chuẩn Tiểu học
      maxPeriodsPerDay: 4,
    };
  }

  return teachers;
}

// Phân công giảng dạy chuẩn Tiểu học
export function generateMockAssignments(
  teachers: Record<string, Teacher>,
  classes: Record<string, ClassItem>,
  subjects: Record<string, SubjectItem>
): Record<string, Assignment> {
  const assignments: Record<string, Assignment> = {};
  const teacherList = Object.values(teachers);
  const classList = Object.values(classes);

  if (teacherList.length === 0 || classList.length === 0) return assignments;

  let assignCounter = 1;
  let gvIndex = 0;

  // Với cấp Tiểu học: Mỗi lớp có 1 Giáo viên Chủ nhiệm dạy các môn cơ bản (Tiếng Việt, Toán, Đạo Đức, TNXH/KH/LSDL, HĐTN, SHDC, SHL)
  // Các giáo viên bộ môn dạy: Tiếng Anh, Tin học, Âm nhạc, Mĩ thuật, Thể dục.
  classList.forEach((cls) => {
    const gvcn = teacherList[gvIndex % teacherList.length];
    gvIndex++;

    // 1. Tiếng Việt (8-10 tiết / tuần)
    const tvPeriods = cls.grade <= 2 ? 10 : 8;
    const tvId = `ASN_${assignCounter++}`;
    assignments[tvId] = {
      id: tvId,
      teacherId: gvcn.id,
      classId: cls.id,
      subjectId: 'SUB_TV',
      periodsPerWeek: tvPeriods,
    };

    // 2. Toán (4-5 tiết / tuần)
    const toanId = `ASN_${assignCounter++}`;
    assignments[toanId] = {
      id: toanId,
      teacherId: gvcn.id,
      classId: cls.id,
      subjectId: 'SUB_TOAN',
      periodsPerWeek: 5,
    };

    // 3. Đạo Đức (1 tiết)
    const ddId = `ASN_${assignCounter++}`;
    assignments[ddId] = {
      id: ddId,
      teacherId: gvcn.id,
      classId: cls.id,
      subjectId: 'SUB_DAODUC',
      periodsPerWeek: 1,
    };

    // 4. Môn Khoa học xã hội theo khối
    if (cls.grade <= 3) {
      // Tự nhiên và Xã hội (2 tiết)
      const tnxhId = `ASN_${assignCounter++}`;
      assignments[tnxhId] = {
        id: tnxhId,
        teacherId: gvcn.id,
        classId: cls.id,
        subjectId: 'SUB_TNXH',
        periodsPerWeek: 2,
      };
    } else {
      // Khoa Học (2 tiết) & Lịch Sử - Địa Lí (2 tiết)
      const khId = `ASN_${assignCounter++}`;
      assignments[khId] = {
        id: khId,
        teacherId: gvcn.id,
        classId: cls.id,
        subjectId: 'SUB_KH',
        periodsPerWeek: 2,
      };

      const lsdlId = `ASN_${assignCounter++}`;
      assignments[lsdlId] = {
        id: lsdlId,
        teacherId: gvcn.id,
        classId: cls.id,
        subjectId: 'SUB_LSDL',
        periodsPerWeek: 2,
      };
    }

    // 5. Chào Cờ (1 tiết) & Sinh Hoạt Lớp (1 tiết)
    const shdcId = `ASN_${assignCounter++}`;
    assignments[shdcId] = {
      id: shdcId,
      teacherId: gvcn.id,
      classId: cls.id,
      subjectId: 'SUB_SHDC',
      periodsPerWeek: 1,
    };

    const shlId = `ASN_${assignCounter++}`;
    assignments[shlId] = {
      id: shlId,
      teacherId: gvcn.id,
      classId: cls.id,
      subjectId: 'SUB_SHL',
      periodsPerWeek: 1,
    };

    // 6. Hoạt Động Trải Nghiệm (1 tiết)
    const hdtnId = `ASN_${assignCounter++}`;
    assignments[hdtnId] = {
      id: hdtnId,
      teacherId: gvcn.id,
      classId: cls.id,
      subjectId: 'SUB_HDTN',
      periodsPerWeek: 1,
    };

    // 7. Các môn Bộ Môn Chuyên Biệt:
    // Tiếng Anh (2-4 tiết)
    const gvEng = teacherList.find(t => t.code.includes('Anh')) || teacherList[(gvIndex + 1) % teacherList.length];
    const engId = `ASN_${assignCounter++}`;
    assignments[engId] = {
      id: engId,
      teacherId: gvEng.id,
      classId: cls.id,
      subjectId: 'SUB_ENG',
      periodsPerWeek: cls.grade >= 3 ? 4 : 2,
    };

    // Giáo Dục Thể Chất (2 tiết)
    const gvGdtc = teacherList.find(t => t.code.includes('Duc')) || teacherList[(gvIndex + 2) % teacherList.length];
    const gdtcId = `ASN_${assignCounter++}`;
    assignments[gdtcId] = {
      id: gdtcId,
      teacherId: gvGdtc.id,
      classId: cls.id,
      subjectId: 'SUB_GDTC',
      periodsPerWeek: 2,
    };

    // Âm Nhạc (1 tiết)
    const gvAn = teacherList.find(t => t.code.includes('Linh')) || teacherList[(gvIndex + 3) % teacherList.length];
    const anId = `ASN_${assignCounter++}`;
    assignments[anId] = {
      id: anId,
      teacherId: gvAn.id,
      classId: cls.id,
      subjectId: 'SUB_AMNHAC',
      periodsPerWeek: 1,
    };

    // Mĩ Thuật (1 tiết)
    const gvMt = teacherList.find(t => t.code.includes('Dung')) || teacherList[(gvIndex + 4) % teacherList.length];
    const mtId = `ASN_${assignCounter++}`;
    assignments[mtId] = {
      id: mtId,
      teacherId: gvMt.id,
      classId: cls.id,
      subjectId: 'SUB_MYTHUAT',
      periodsPerWeek: 1,
    };

    // Tin Học & Công Nghệ (Lớp 3, 4, 5: 2 tiết)
    if (cls.grade >= 3) {
      const gvTin = teacherList.find(t => t.code.includes('Hai')) || teacherList[(gvIndex + 5) % teacherList.length];
      const tinId = `ASN_${assignCounter++}`;
      assignments[tinId] = {
        id: tinId,
        teacherId: gvTin.id,
        classId: cls.id,
        subjectId: 'SUB_TINCN',
        periodsPerWeek: 2,
      };
    }
  });

  return assignments;
}
