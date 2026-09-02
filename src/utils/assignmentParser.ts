import { PhanBoiChauTeacherData, PHAN_BOI_CHAU_DATA } from './phanBoiChauData';

export interface ParsedTeachingUnit {
  teacherName: string;
  subjectName: string;
  className: string;
  periodsPerWeek: number;
}

// Map short/standard subject names to normalized names
export const SUBJECT_NAME_MAP: Record<string, { standardName: string; defaultPeriods: number; color: string }> = {
  'toán': { standardName: 'Toán', defaultPeriods: 4, color: '#2563eb' },
  'văn': { standardName: 'Ngữ Văn', defaultPeriods: 4, color: '#e11d48' },
  'ngữ văn': { standardName: 'Ngữ Văn', defaultPeriods: 4, color: '#e11d48' },
  'anh': { standardName: 'Tiếng Anh', defaultPeriods: 3, color: '#059669' },
  'tiếng anh': { standardName: 'Tiếng Anh', defaultPeriods: 3, color: '#059669' },
  'khtn': { standardName: 'KHTN', defaultPeriods: 4, color: '#0891b2' },
  'tin': { standardName: 'Tin Học', defaultPeriods: 1, color: '#9333ea' },
  'tin học': { standardName: 'Tin Học', defaultPeriods: 1, color: '#9333ea' },
  'sử': { standardName: 'Lịch Sử', defaultPeriods: 2, color: '#d97706' },
  'lịch sử': { standardName: 'Lịch Sử', defaultPeriods: 2, color: '#d97706' },
  'địa': { standardName: 'Địa Lí', defaultPeriods: 1, color: '#ca8a04' },
  'địa lí': { standardName: 'Địa Lí', defaultPeriods: 1, color: '#ca8a04' },
  'gdcd': { standardName: 'GDCD', defaultPeriods: 1, color: '#db2777' },
  'gdtc': { standardName: 'GD Thể Chất', defaultPeriods: 2, color: '#0d9488' },
  'thể dục': { standardName: 'GD Thể Chất', defaultPeriods: 2, color: '#0d9488' },
  'mt': { standardName: 'Mĩ Thuật', defaultPeriods: 1, color: '#c026d3' },
  'mĩ thuật': { standardName: 'Mĩ Thuật', defaultPeriods: 1, color: '#c026d3' },
  'an': { standardName: 'Âm Nhạc', defaultPeriods: 1, color: '#7c3aed' },
  'âm nhạc': { standardName: 'Âm Nhạc', defaultPeriods: 1, color: '#7c3aed' },
  'hđtn': { standardName: 'HĐTN-HN', defaultPeriods: 1, color: '#0284c7' },
  'hđtn-hn': { standardName: 'HĐTN-HN', defaultPeriods: 1, color: '#0284c7' },
  'gdđp': { standardName: 'GD Địa Phương', defaultPeriods: 1, color: '#475569' },
  'chào cờ': { standardName: 'Chào Cờ', defaultPeriods: 1, color: '#334155' },
  'sinh hoạt lớp': { standardName: 'Sinh Hoạt Lớp', defaultPeriods: 1, color: '#1e293b' },
};

/**
 * Parses raw teaching text like:
 * "Toán (7A2, 8A6, 9A7) + Tin (7A1, 7A2, 7A3, 7A4)"
 * into list of assignments:
 * [ { teacher: 'Tạ Thanh Thủy', subject: 'Toán', class: '7A2', periods: 4 }, ... ]
 */
export function parseTeachingExpression(teacherName: string, rawText: string): ParsedTeachingUnit[] {
  const units: ParsedTeachingUnit[] = [];
  if (!rawText || !rawText.trim()) return units;

  // Split by '+'
  const chunks = rawText.split('+');

  chunks.forEach((chunk) => {
    const trimmed = chunk.trim();
    if (!trimmed) return;

    // Pattern: SubjectName (Class1, Class2, Class3) or SubjectName(9)(Class1, Class2)
    const match = trimmed.match(/^([^(]+)(?:\(\d+\))?\s*\(([^)]+)\)/i);
    if (match) {
      const rawSubject = match[1].trim();
      const rawClasses = match[2].trim();

      const normalizedKey = rawSubject.toLowerCase().trim();
      const subjectInfo = SUBJECT_NAME_MAP[normalizedKey] || {
        standardName: rawSubject,
        defaultPeriods: 2,
        color: '#3b82f6',
      };

      // Split classes by comma or space
      const classTokens = rawClasses.split(/[,;\s]+/).map(c => c.trim()).filter(Boolean);

      classTokens.forEach((cls) => {
        // Expand ranges if any (e.g. 6A1..6A4 or simple class 6A1)
        units.push({
          teacherName,
          subjectName: subjectInfo.standardName,
          className: cls.toUpperCase(),
          periodsPerWeek: subjectInfo.defaultPeriods,
        });
      });
    } else {
      // Direct simple format e.g. "Văn (6A2)"
      const parts = trimmed.split(/[\s(]/);
      if (parts.length >= 2) {
        const rawSub = parts[0];
        const rawCls = parts[1].replace(/[)]/g, '');
        if (rawSub && rawCls) {
          units.push({
            teacherName,
            subjectName: rawSub,
            className: rawCls.toUpperCase(),
            periodsPerWeek: 3,
          });
        }
      }
    }
  });

  return units;
}

/**
 * Convert full Phan Boi Chau dataset into complete parsed assignments and unique class list
 */
export function getPhanBoiChauAssignments() {
  const allAssignments: ParsedTeachingUnit[] = [];
  const classSet = new Set<string>();

  PHAN_BOI_CHAU_DATA.forEach((item) => {
    const units = parseTeachingExpression(item.name, item.rawTeachingText);
    units.forEach((u) => {
      allAssignments.push(u);
      classSet.add(u.className);
    });
  });

  // Sort classes logically: 6A1..6A8, 7A1..7A7, 8A1..8A8, 9A1..9A8
  const sortedClasses = Array.from(classSet).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  return {
    assignments: allAssignments,
    classes: sortedClasses,
    teachers: PHAN_BOI_CHAU_DATA.map(t => t.name),
  };
}
