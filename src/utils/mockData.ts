import { Assignment, ClassItem, SubjectItem, Teacher } from '../types/state';

export const INITIAL_SUBJECTS: Record<string, SubjectItem> = {
  SUB_TOAN: { id: 'SUB_TOAN', code: 'TOAN', name: 'Toán Học', color: '#2563eb', textColor: '#ffffff', category: 'MAIN', maxPerDay: 2, consecutiveAllowed: true },
  SUB_VAN: { id: 'SUB_VAN', code: 'VAN', name: 'Ngữ Văn', color: '#e11d48', textColor: '#ffffff', category: 'MAIN', maxPerDay: 2, consecutiveAllowed: true },
  SUB_ENG: { id: 'SUB_ENG', code: 'ENG', name: 'Tiếng Anh', color: '#059669', textColor: '#ffffff', category: 'MAIN', maxPerDay: 2, consecutiveAllowed: false },
  SUB_LY: { id: 'SUB_LY', code: 'LY', name: 'Vật Lý', color: '#4f46e5', textColor: '#ffffff', category: 'MAIN', maxPerDay: 2, consecutiveAllowed: true },
  SUB_HOA: { id: 'SUB_HOA', code: 'HOA', name: 'Hóa Học', color: '#ea580c', textColor: '#ffffff', category: 'MAIN', maxPerDay: 2, consecutiveAllowed: true },
  SUB_SINH: { id: 'SUB_SINH', code: 'SINH', name: 'Sinh Học', color: '#65a30d', textColor: '#ffffff', category: 'MAIN', maxPerDay: 2, consecutiveAllowed: false },
  SUB_SU: { id: 'SUB_SU', code: 'SU', name: 'Lịch Sử', color: '#d97706', textColor: '#ffffff', category: 'SUB', maxPerDay: 1, consecutiveAllowed: false },
  SUB_DIA: { id: 'SUB_DIA', code: 'DIA', name: 'Địa Lý', color: '#ca8a04', textColor: '#ffffff', category: 'SUB', maxPerDay: 1, consecutiveAllowed: false },
  SUB_TIN: { id: 'SUB_TIN', code: 'TIN', name: 'Tin Học', color: '#9333ea', textColor: '#ffffff', category: 'SUB', maxPerDay: 2, consecutiveAllowed: true },
  SUB_GDTC: { id: 'SUB_GDTC', code: 'GDTC', name: 'GD Thể Chất', color: '#0d9488', textColor: '#ffffff', category: 'SUB', maxPerDay: 2, consecutiveAllowed: true },
  SUB_GDCD: { id: 'SUB_GDCD', code: 'GDCD', name: 'GD Công Dân', color: '#db2777', textColor: '#ffffff', category: 'SUB', maxPerDay: 1, consecutiveAllowed: false },
  SUB_CONGNGHE: { id: 'SUB_CN', code: 'CN', name: 'Công Nghệ', color: '#0284c7', textColor: '#ffffff', category: 'SUB', maxPerDay: 1, consecutiveAllowed: false },
  SUB_AMNHAC: { id: 'SUB_AN', code: 'AN', name: 'Âm Nhạc', color: '#7c3aed', textColor: '#ffffff', category: 'ACTIVITY', maxPerDay: 1, consecutiveAllowed: false },
  SUB_MYTHUAT: { id: 'SUB_MT', code: 'MT', name: 'Mỹ Thuật', color: '#c026d3', textColor: '#ffffff', category: 'ACTIVITY', maxPerDay: 1, consecutiveAllowed: false },
  SUB_SHDC: { id: 'SUB_SHDC', code: 'SHDC', name: 'Chào Cờ / SHDC', color: '#475569', textColor: '#ffffff', category: 'ACTIVITY', maxPerDay: 1, consecutiveAllowed: false },
  SUB_SHL: { id: 'SUB_SHL', code: 'SHL', name: 'Sinh Hoạt Lớp', color: '#334155', textColor: '#ffffff', category: 'ACTIVITY', maxPerDay: 1, consecutiveAllowed: false },
};

// Generate 50 classes (e.g. 6A1-6A10, 7A1-7A10, 8A1-8A10, 9A1-9A10, 10A1-10A10)
export function generateMockClasses(): Record<string, ClassItem> {
  const classes: Record<string, ClassItem> = {};
  const grades = [6, 7, 8, 9, 10];
  
  grades.forEach((grade) => {
    // 8 classes per grade = 40 classes
    for (let i = 1; i <= 8; i++) {
      const code = `${grade}A${i}`;
      const id = `CLS_${code}`;
      const isMorning = grade === 9 || grade === 10 || (grade === 8 && i <= 4);
      classes[id] = {
        id,
        code,
        grade,
        shift: isMorning ? 'MORNING' : 'AFTERNOON',
        room: `P.${grade}0${i}`,
      };
    }
  });

  return classes;
}

// Generate 100+ Teachers with realistic Vietnamese names
const VIET_LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const VIET_MIDDLE_NAMES = ['Văn', 'Thị', 'Đức', 'Hữu', 'Minh', 'Ngọc', 'Quốc', 'Thanh', 'Hải', 'Xuân', 'Kim', 'Bảo', 'Gia', 'Anh'];
const VIET_FIRST_NAMES = ['Hùng', 'Loan', 'Mai', 'Đức', 'Anh', 'Trang', 'Hà', 'Nam', 'Tuấn', 'Linh', 'Dũng', 'Phương', 'Hương', 'Cường', 'Yến', 'Lan', 'Bình', 'Thảo', 'Hiếu', 'Khoa', 'Tâm', 'Vy', 'Châu', 'Phong'];

export function generateMockTeachers(count: number = 105): Record<string, Teacher> {
  const teachers: Record<string, Teacher> = {};
  
  // Base core known teachers
  const sampleTeachers: Partial<Teacher>[] = [
    { code: 'CTLoan', name: 'Cô Trần Thị Loan', maxPeriodsPerWeek: 18 },
    { code: 'NVHung', name: 'Thầy Nguyễn Văn Hùng', maxPeriodsPerWeek: 19 },
    { code: 'LTMai', name: 'Cô Lê Thị Mai', maxPeriodsPerWeek: 16 },
    { code: 'PMDuc', name: 'Thầy Phạm Minh Đức', maxPeriodsPerWeek: 21 }, // intentional overload for test demo
    { code: 'HNAnh', name: 'Cô Hoàng Ngọc Anh', maxPeriodsPerWeek: 17 },
    { code: 'VQDung', name: 'Thầy Vũ Quốc Dũng', maxPeriodsPerWeek: 19 },
    { code: 'DTTTrang', name: 'Cô Đặng Thu Trang', maxPeriodsPerWeek: 18 },
    { code: 'BHHai', name: 'Thầy Bùi Hoàng Hải', maxPeriodsPerWeek: 19 },
  ];

  sampleTeachers.forEach((t, idx) => {
    const id = `TEA_${t.code}`;
    teachers[id] = {
      id,
      code: t.code!,
      name: t.name!,
      email: `${t.code?.toLowerCase()}@truonghoc.edu.vn`,
      phone: `098${Math.floor(1000000 + Math.random() * 9000000)}`,
      maxPeriodsPerWeek: 19,
      maxPeriodsPerDay: 4,
      unavailableSlots: idx === 0 ? ['THU_7_4', 'THU_7_5'] : [],
    };
  });

  // Generate remaining teachers up to count
  for (let i = sampleTeachers.length + 1; i <= count; i++) {
    const lastName = VIET_LAST_NAMES[i % VIET_LAST_NAMES.length];
    const midName = VIET_MIDDLE_NAMES[(i * 3) % VIET_MIDDLE_NAMES.length];
    const firstName = VIET_FIRST_NAMES[(i * 7) % VIET_FIRST_NAMES.length];
    const isFemale = midName === 'Thị' || ['Loan', 'Mai', 'Trang', 'Hà', 'Linh', 'Phương', 'Hương', 'Yến', 'Lan', 'Thảo', 'Vy'].includes(firstName);
    const title = isFemale ? 'Cô' : 'Thầy';
    const fullName = `${title} ${lastName} ${midName} ${firstName}`;
    
    // Code like "GV09", "NTLan09"
    const initials = `${lastName[0]}${midName[0]}${firstName}`;
    const code = `${initials}${i < 10 ? '0' + i : i}`;
    const id = `TEA_${code}`;

    teachers[id] = {
      id,
      code,
      name: fullName,
      email: `${code.toLowerCase()}@truonghoc.edu.vn`,
      phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      maxPeriodsPerWeek: 19,
      maxPeriodsPerDay: 4,
    };
  }

  return teachers;
}

// Generate realistic teaching assignments matching teachers to classes and subjects
export function generateMockAssignments(
  teachers: Record<string, Teacher>,
  classes: Record<string, ClassItem>,
  subjects: Record<string, SubjectItem>
): Record<string, Assignment> {
  const assignments: Record<string, Assignment> = {};
  const teacherList = Object.values(teachers);
  const classList = Object.values(classes);

  if (teacherList.length === 0 || classList.length === 0) return assignments;

  // Distribute core assignments for sample teachers first
  const firstTeacher = teacherList.find(t => t.code === 'CTLoan') || teacherList[0];
  const secondTeacher = teacherList.find(t => t.code === 'NVHung') || teacherList[1];
  const thirdTeacher = teacherList.find(t => t.code === 'LTMai') || teacherList[2];
  const fourthTeacher = teacherList.find(t => t.code === 'PMDuc') || teacherList[3]; // Overloaded demo

  let assignCounter = 1;

  // CTLoan (Toán): 3A5 (4t), 8A1 (4t), 8A2 (4t), 9A1 (4t) = 16 periods
  if (firstTeacher) {
    const targetClasses = classList.slice(0, 4);
    targetClasses.forEach((cls) => {
      const id = `ASN_${assignCounter++}`;
      assignments[id] = {
        id,
        teacherId: firstTeacher.id,
        classId: cls.id,
        subjectId: 'SUB_TOAN',
        periodsPerWeek: 4,
      };
    });
  }

  // NVHung (Văn): 6A1 (4t), 6A2 (4t), 7A1 (4t), 7A2 (4t), 8A1 (3t) = 19 periods (Standard capacity)
  if (secondTeacher) {
    const targetClasses = classList.slice(2, 7);
    targetClasses.forEach((cls, idx) => {
      const id = `ASN_${assignCounter++}`;
      assignments[id] = {
        id,
        teacherId: secondTeacher.id,
        classId: cls.id,
        subjectId: 'SUB_VAN',
        periodsPerWeek: idx === 4 ? 3 : 4,
      };
    });
  }

  // LTMai (Tiếng Anh): 6A1 (3t), 6A2 (3t), 8A1 (3t), 8A2 (3t), 9A1 (3t) = 15 periods
  if (thirdTeacher) {
    const targetClasses = [classList[0], classList[1], classList[4], classList[5], classList[8]].filter(Boolean);
    targetClasses.forEach((cls) => {
      const id = `ASN_${assignCounter++}`;
      assignments[id] = {
        id,
        teacherId: thirdTeacher.id,
        classId: cls.id,
        subjectId: 'SUB_ENG',
        periodsPerWeek: 3,
      };
    });
  }

  // PMDuc (Overloaded > 19 periods: 22 periods to demo capacity warning alert)
  if (fourthTeacher) {
    const targetClasses = classList.slice(6, 12);
    targetClasses.forEach((cls, idx) => {
      const id = `ASN_${assignCounter++}`;
      assignments[id] = {
        id,
        teacherId: fourthTeacher.id,
        classId: cls.id,
        subjectId: 'SUB_LY',
        periodsPerWeek: idx < 4 ? 4 : 3, // 4*4 + 3*2 = 22 periods (>19 WARNING!)
      };
    });
  }

  // Generate assignments for other teachers to cover all classes
  const subjectKeys = Object.keys(subjects).filter(k => !['SUB_SHDC', 'SUB_SHL'].includes(k));
  let teacherIndex = 4;

  classList.forEach((cls) => {
    // Each class has ~28-30 periods a week
    // Fixed Flag salute / Homeroom (Chào cờ & Sinh hoạt lớp)
    const homeroomTeacher = teacherList[teacherIndex % teacherList.length];
    
    // Assign Chào cờ
    const shdcId = `ASN_${assignCounter++}`;
    assignments[shdcId] = {
      id: shdcId,
      teacherId: homeroomTeacher.id,
      classId: cls.id,
      subjectId: 'SUB_SHDC',
      periodsPerWeek: 1,
    };

    // Assign Sinh hoạt lớp
    const shlId = `ASN_${assignCounter++}`;
    assignments[shlId] = {
      id: shlId,
      teacherId: homeroomTeacher.id,
      classId: cls.id,
      subjectId: 'SUB_SHL',
      periodsPerWeek: 1,
    };

    // Assign subjects
    const classSubjectPicks = [
      { sub: 'SUB_TOAN', periods: 4 },
      { sub: 'SUB_VAN', periods: 4 },
      { sub: 'SUB_ENG', periods: 3 },
      { sub: 'SUB_LY', periods: 2 },
      { sub: 'SUB_HOA', periods: 2 },
      { sub: 'SUB_SINH', periods: 2 },
      { sub: 'SUB_SU', periods: 2 },
      { sub: 'SUB_DIA', periods: 2 },
      { sub: 'SUB_TIN', periods: 2 },
      { sub: 'SUB_GDTC', periods: 2 },
      { sub: 'SUB_GDCD', periods: 1 },
      { sub: 'SUB_CN', periods: 1 },
      { sub: 'SUB_AN', periods: 1 },
      { sub: 'SUB_MT', periods: 1 },
    ];

    classSubjectPicks.forEach(({ sub, periods }) => {
      // Check if already assigned to this class
      const alreadyAssigned = Object.values(assignments).some(
        a => a.classId === cls.id && a.subjectId === sub
      );

      if (!alreadyAssigned) {
        const assignedTeacher = teacherList[(teacherIndex++) % teacherList.length];
        const id = `ASN_${assignCounter++}`;
        assignments[id] = {
          id,
          teacherId: assignedTeacher.id,
          classId: cls.id,
          subjectId: sub,
          periodsPerWeek: periods,
        };
      }
    });
  });

  return assignments;
}
