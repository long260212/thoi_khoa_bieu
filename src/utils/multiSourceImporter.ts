import * as XLSX from 'xlsx';
import { PhanBoiChauTeacherData } from './phanBoiChauData';

/**
 * Đọc file Excel (.xlsx, .xls) và tự động nhận diện các cột phân công chuyên môn
 */
export async function parseExcelFile(file: File): Promise<PhanBoiChauTeacherData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Lấy sheet đầu tiên
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Chuyển sheet sang mảng 2 chiều
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const teachers: PhanBoiChauTeacherData[] = [];
        let nameColIdx = -1;
        let dutyColIdx = -1;
        let quotaColIdx = -1;
        let teachColIdx = -1;

        // Quét các dòng đầu để tìm dòng tiêu đề
        let headerRowIdx = -1;
        for (let r = 0; r < Math.min(15, jsonData.length); r++) {
          const row = jsonData[r];
          if (!row || !Array.isArray(row)) continue;

          for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || '').toLowerCase().trim();
            if (val.includes('họ tên') || val.includes('họ và tên') || val.includes('giáo viên') || val.includes('tên gv')) {
              nameColIdx = c;
              headerRowIdx = r;
            }
            if (val.includes('chức vụ') || val.includes('chuyên môn') || val.includes('nhiệm vụ')) {
              dutyColIdx = c;
            }
            if (val.includes('định mức') || val.includes('tiết qđ') || val.includes('tiết quy định') || val.includes('số tiết')) {
              quotaColIdx = c;
            }
            if (val.includes('giảng dạy') || val.includes('phân công') || val.includes('dạy lớp') || val.includes('môn dạy')) {
              teachColIdx = c;
            }
          }

          if (nameColIdx !== -1 && (teachColIdx !== -1 || row.length >= 4)) {
            break;
          }
        }

        // Nếu không tìm thấy tiêu đề chuẩn, dự đoán theo thứ tự cột mặc định
        if (nameColIdx === -1) {
          nameColIdx = 1; // Thường STT ở cột 0, Tên ở cột 1
          dutyColIdx = 2;
          quotaColIdx = 3;
          teachColIdx = 4;
        }
        if (teachColIdx === -1) {
          teachColIdx = Math.min(nameColIdx + 3, 5);
        }

        const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 1;

        for (let r = startRow; r < jsonData.length; r++) {
          const row = jsonData[r];
          if (!row || row.length === 0) continue;

          const rawName = String(row[nameColIdx] || '').trim();
          const rawTeaching = String(row[teachColIdx] || row[teachColIdx - 1] || '').trim();

          // Bỏ qua dòng trống hoặc dòng tổng cộng/chữ ký
          if (!rawName || rawName.toLowerCase().includes('tổng') || rawName.toLowerCase().includes('hiệu trưởng') || rawName.toLowerCase().includes('người lập')) {
            continue;
          }

          const rawDuty = dutyColIdx !== -1 ? String(row[dutyColIdx] || 'GV').trim() : 'GV';
          const rawQuota = quotaColIdx !== -1 ? parseInt(String(row[quotaColIdx]), 10) || 19 : 19;

          if (rawTeaching) {
            teachers.push({
              stt: teachers.length + 1,
              name: rawName,
              duty: rawDuty,
              quota: rawQuota,
              rawTeachingText: rawTeaching,
            });
          }
        }

        resolve(teachers);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Đọc văn bản dạng CSV / TSV / Copy-Paste từ Word hoặc Excel
 */
export function parsePastedTextData(text: string): PhanBoiChauTeacherData[] {
  if (!text || !text.trim()) return [];

  const lines = text.trim().split(/\r?\n/);
  const teachers: PhanBoiChauTeacherData[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Bỏ qua dòng tiêu đề nếu người dùng copy cả header
    const lower = trimmed.toLowerCase();
    if (lower.includes('họ và tên') || lower.includes('giảng dạy') || lower.includes('phân công chuyên môn')) {
      return;
    }

    // 1. Phân tách theo Tab (Excel / Google Sheets)
    if (trimmed.includes('\t')) {
      const parts = trimmed.split('\t').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        let name = parts[0];
        let duty = 'GV';
        let quota = 19;
        let teaching = parts[parts.length - 1];

        // Nếu có số thứ tự ở đầu
        if (!isNaN(Number(parts[0])) && parts.length >= 3) {
          name = parts[1];
          duty = parts.length >= 4 ? parts[2] : 'GV';
          teaching = parts[parts.length - 1];
        }

        teachers.push({
          stt: teachers.length + 1,
          name,
          duty,
          quota,
          rawTeachingText: teaching,
        });
        return;
      }
    }

    // 2. Phân tách theo dấu gạch đứng |
    if (trimmed.includes('|')) {
      const parts = trimmed.split('|').map(p => p.trim());
      if (parts.length >= 2) {
        teachers.push({
          stt: teachers.length + 1,
          name: parts[0],
          duty: parts[1] || 'GV',
          quota: parseInt(parts[2], 10) || 19,
          rawTeachingText: parts[parts.length - 1],
        });
        return;
      }
    }

    // 3. Phân tách theo dấu hai chấm : (VD: "Cô Mai: Văn (6A1, 6A2) + Tiếng Anh (6A1)")
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      teachers.push({
        stt: teachers.length + 1,
        name: parts[0].trim(),
        duty: 'GV',
        quota: 19,
        rawTeachingText: parts[1].trim(),
      });
      return;
    }

    // 4. Phân tách theo dấu phẩy (CSV)
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        teachers.push({
          stt: teachers.length + 1,
          name: parts[0],
          duty: 'GV',
          quota: 19,
          rawTeachingText: parts.slice(1).join(', '),
        });
      }
    }
  });

  return teachers;
}

/**
 * Tạo và tải về File Excel Mẫu để người dùng điền phân công chuyên môn
 */
export function downloadSampleExcelTemplate() {
  const wb = XLSX.utils.book_new();

  const sampleRows = [
    ['TRƯỜNG THCS / TIỂU HỌC ...'],
    ['BẢNG PHÂN CÔNG CHUYÊN MÔN GIẢNG DẠY NĂM HỌC 2026 - 2027'],
    [],
    ['STT', 'Họ và tên Giáo viên', 'Chức vụ', 'Định mức (tiết/tuần)', 'Giảng dạy (Môn và Lớp)'],
    [1, 'Tạ Thanh Thủy', 'Tổ Trưởng', 16, 'Toán (7A2, 8A6, 9A7) + Tin (7A1, 7A2, 7A3, 7A4)'],
    [2, 'Trần Trung Kiên', 'T.Phó', 18, 'Toán (6A4, 8A1, 8A8) + Tin (6A1, 6A2, 6A3, 6A4, 6A5)'],
    [3, 'Nguyễn Thị Huyền Ngọc', 'GV', 19, 'Toán (7A1, 7A3, 7A5) + HĐTN-HN (8A7)'],
    [4, 'Nguyễn Văn Hùng', 'GV', 19, 'Văn (6A4, 6A7, 6A8) + HĐTN-HN (6A8)'],
    [5, 'Trần Thị Thanh Nhàn', 'GV', 19, 'Tiếng Anh (7A1, 7A2, 7A3, 7A4) + HĐTN-HN (6A2)'],
    [6, 'Nguyễn Viết Cương', 'Tổ Trưởng', 16, 'GDTC (6A1, 6A2, 6A3, 6A4, 6A5, 6A6, 6A7, 6A8, 7A1, 7A2, 7A3, 7A4)'],
    [7, 'Chu Văn Huê', 'GV', 19, 'Mĩ Thuật (6A1, 6A2, 6A3, 6A4, 7A1, 7A2, 8A1, 8A2, 9A1, 9A2)'],
    [8, 'Nguyễn Thị Thủy', 'GV', 19, 'Âm Nhạc (6A1, 6A2, 6A3, 6A4, 7A1, 7A2, 8A1, 8A2, 9A1, 9A2)'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Phan_Cong_Chuyen_Mon');
  XLSX.writeFile(wb, 'Mau_Phan_Cong_Chuyen_Mon_EduSchedule.xlsx');
}
