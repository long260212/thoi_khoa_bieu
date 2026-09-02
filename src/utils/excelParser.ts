import * as XLSX from 'xlsx';
import { Assignment, ClassItem, DAYS_OF_WEEK, ScheduleEntry, SubjectItem, Teacher } from '../types/state';

export interface ParsedAssignmentRow {
  classCode: string;
  subjectName: string;
  periods: number;
  classId?: string;
  subjectId?: string;
  isValid: boolean;
  error?: string;
}

/**
 * Parses tab-separated text pasted from Excel clipboard
 * Expected columns: [Lớp / Class] \t [Môn / Subject] \t [Số tiết / Periods]
 */
export function parseExcelClipboard(
  clipboardText: string,
  classes: Record<string, ClassItem>,
  subjects: Record<string, SubjectItem>
): ParsedAssignmentRow[] {
  if (!clipboardText || !clipboardText.trim()) return [];

  const lines = clipboardText.trim().split(/\r?\n/);
  const classList = Object.values(classes);
  const subjectList = Object.values(subjects);

  const results: ParsedAssignmentRow[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Split by tab (Excel format) or comma or semicolon
    let parts = line.split('\t');
    if (parts.length < 2) {
      parts = line.split(/[,;]/);
    }

    const rawClass = parts[0]?.trim() || '';
    const rawSubject = parts[1]?.trim() || '';
    const rawPeriods = parts[2]?.trim() || '2';

    if (!rawClass && !rawSubject) continue;

    // Match class
    const matchedClass = classList.find(
      c => c.code.toLowerCase() === rawClass.toLowerCase() ||
           `lớp ${c.code}`.toLowerCase() === rawClass.toLowerCase()
    );

    // Match subject
    const matchedSubject = subjectList.find(
      s => s.name.toLowerCase() === rawSubject.toLowerCase() ||
           s.code.toLowerCase() === rawSubject.toLowerCase() ||
           s.name.toLowerCase().includes(rawSubject.toLowerCase())
    );

    const periods = parseInt(rawPeriods, 10) || 2;
    const isValid = !!(matchedClass && matchedSubject && periods > 0 && periods <= 30);

    results.push({
      classCode: rawClass,
      subjectName: rawSubject,
      periods,
      classId: matchedClass?.id,
      subjectId: matchedSubject?.id,
      isValid,
      error: !matchedClass ? 'Lớp không tồn tại' : (!matchedSubject ? 'Môn học không tồn tại' : undefined),
    });
  }

  return results;
}

/**
 * Export full generated timetable to Excel (.xlsx) file
 */
export function exportTimetableToExcel(
  schedule: Record<string, ScheduleEntry>,
  classes: Record<string, ClassItem>,
  teachers: Record<string, Teacher>,
  subjects: Record<string, SubjectItem>,
  schoolName: string = 'Trường THCS/THPT Chu Văn An'
) {
  const wb = XLSX.utils.book_new();

  // 1. Export by Class Sheet
  const classRows: any[] = [];
  classRows.push([schoolName.toUpperCase()]);
  classRows.push(['THỜI KHÓA BIỂU TOÀN TRƯỜNG - THEO TỪNG LỚP']);
  classRows.push(['Ngày xuất:', new Date().toLocaleDateString('vi-VN')]);
  classRows.push([]);

  const classList = Object.values(classes).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  classList.forEach((cls) => {
    classRows.push([`=== LỚP: ${cls.code} (Buổi: ${cls.shift === 'MORNING' ? 'Sáng' : 'Chiều'}) ===`]);
    
    // Header
    const header = ['Tiết / Buổi', ...DAYS_OF_WEEK.map(d => d.label)];
    classRows.push(header);

    // Morning periods 1-5
    for (let period = 1; period <= 5; period++) {
      const row = [`Tiết ${period} (Sáng)`];
      DAYS_OF_WEEK.forEach((d) => {
        const key = `${cls.id}_${d.key}_${period}`;
        const entry = schedule[key];
        if (entry) {
          const sub = subjects[entry.subjectId]?.name || '';
          const tea = teachers[entry.teacherId]?.code || '';
          row.push(`${sub} (${tea})`);
        } else {
          row.push('-');
        }
      });
      classRows.push(row);
    }

    // Afternoon periods 6-10
    for (let period = 6; period <= 10; period++) {
      const row = [`Tiết ${period} (Chiều)`];
      DAYS_OF_WEEK.forEach((d) => {
        const key = `${cls.id}_${d.key}_${period}`;
        const entry = schedule[key];
        if (entry) {
          const sub = subjects[entry.subjectId]?.name || '';
          const tea = teachers[entry.teacherId]?.code || '';
          row.push(`${sub} (${tea})`);
        } else {
          row.push('-');
        }
      });
      classRows.push(row);
    }

    classRows.push([]); // blank line between classes
  });

  const wsClass = XLSX.utils.aoa_to_sheet(classRows);
  XLSX.utils.book_append_sheet(wb, wsClass, 'TKB Theo Lớp');

  // 2. Export by Teacher Sheet
  const teacherRows: any[] = [];
  teacherRows.push([schoolName.toUpperCase()]);
  teacherRows.push(['LỊCH GIẢNG DẠY GIÁO VIÊN']);
  teacherRows.push([]);

  const teacherList = Object.values(teachers).sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  teacherList.forEach((tea) => {
    // Calculate total periods scheduled
    const teacherEntries = Object.values(schedule).filter(e => e.teacherId === tea.id);
    teacherRows.push([`=== GIÁO VIÊN: ${tea.name} (${tea.code}) - Tổng tiết: ${teacherEntries.length}t/tuần ===`]);

    const header = ['Tiết / Buổi', ...DAYS_OF_WEEK.map(d => d.label)];
    teacherRows.push(header);

    for (let period = 1; period <= 10; period++) {
      const sessionName = period <= 5 ? `Tiết ${period} (Sáng)` : `Tiết ${period} (Chiều)`;
      const row = [sessionName];
      DAYS_OF_WEEK.forEach((d) => {
        const entry = teacherEntries.find(e => e.day === d.key && e.period === period);
        if (entry) {
          const cls = classes[entry.classId]?.code || '';
          const sub = subjects[entry.subjectId]?.name || '';
          row.push(`${cls} - ${sub}`);
        } else {
          row.push('-');
        }
      });
      teacherRows.push(row);
    }
    teacherRows.push([]);
  });

  const wsTeacher = XLSX.utils.aoa_to_sheet(teacherRows);
  XLSX.utils.book_append_sheet(wb, wsTeacher, 'TKB Giáo Viên');

  // Save workbook
  XLSX.writeFile(wb, `ThoiKhoaBieu_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
