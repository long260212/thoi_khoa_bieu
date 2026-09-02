import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  FileSpreadsheet, 
  Trash2, 
  Plus, 
  Sparkles, 
  Calendar, 
  BookOpen, 
  User, 
  GraduationCap,
  Sun,
  Moon,
  RotateCcw,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Danh sách các ngày trong tuần
const DAYS = [
  { key: 'THU_2', label: 'Thứ Hai', short: 'T2' },
  { key: 'THU_3', label: 'Thứ Ba', short: 'T3' },
  { key: 'THU_4', label: 'Thứ Tư', short: 'T4' },
  { key: 'THU_5', label: 'Thứ Năm', short: 'T5' },
  { key: 'THU_6', label: 'Thứ Sáu', short: 'T6' },
  { key: 'THU_7', label: 'Thứ Bảy', short: 'T7' },
];

// Môn học chuẩn cấp 1 Tiểu học
const DEFAULT_SUBJECTS = [
  { name: 'Tiếng Việt', color: '#e11d48' },
  { name: 'Toán', color: '#2563eb' },
  { name: 'Tiếng Anh', color: '#059669' },
  { name: 'Tự Nhiên & Xã Hội', color: '#0891b2' },
  { name: 'Khoa Học', color: '#65a30d' },
  { name: 'Lịch Sử & Địa Lí', color: '#d97706' },
  { name: 'Tin Học & Công Nghệ', color: '#9333ea' },
  { name: 'Đạo Đức', color: '#db2777' },
  { name: 'Giáo Dục Thể Chất', color: '#0d9488' },
  { name: 'Âm Nhạc', color: '#7c3aed' },
  { name: 'Mĩ Thuật', color: '#c026d3' },
  { name: 'Hoạt Động Trải Nghiệm', color: '#0284c7' },
  { name: 'Chào Cờ', color: '#475569' },
  { name: 'Sinh Hoạt Lớp', color: '#334155' },
];

interface TimetableCellData {
  subject: string;
  teacher: string;
}

export const App: React.FC = () => {
  // Danh sách các lớp học
  const [classList, setClassList] = useState<string[]>(['1A1', '1A2', '2A1', '3A1', '4A1', '5A1']);
  const [selectedClass, setSelectedClass] = useState<string>('1A1');
  const [newClassName, setNewClassName] = useState<string>('');

  // Tên trường & Năm học
  const [schoolName, setSchoolName] = useState('TRƯỜNG TIỂU HỌC');
  const [schoolYear, setSchoolYear] = useState('Năm học: 2025 - 2026');

  // Dữ liệu thời khóa biểu: key dạng `${className}_${day}_${period}` -> { subject, teacher }
  const [scheduleData, setScheduleData] = useState<Record<string, TimetableCellData>>({});

  // Form nhập liệu nhanh
  const [inputDay, setInputDay] = useState<string>('THU_2');
  const [inputPeriod, setInputPeriod] = useState<number>(1);
  const [inputSubject, setInputSubject] = useState<string>('Toán');
  const [inputTeacher, setInputTeacher] = useState<string>('Cô Loan');

  // Thêm tiết vào thời khóa biểu
  const handleAddSlot = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputSubject.trim()) return;

    const key = `${selectedClass}_${inputDay}_${inputPeriod}`;
    setScheduleData((prev) => ({
      ...prev,
      [key]: {
        subject: inputSubject.trim(),
        teacher: inputTeacher.trim(),
      },
    }));

    // Tự động tăng tiết tiếp theo cho tiện nhập (VD: nhập tiết 1 xong thì gợi ý tiết 2)
    if (inputPeriod < 10) {
      setInputPeriod((prev) => prev + 1);
    }
  };

  // Cập nhật trực tiếp từng ô trên bảng
  const handleUpdateCell = (day: string, period: number, subject: string, teacher: string) => {
    const key = `${selectedClass}_${day}_${period}`;
    if (!subject.trim() && !teacher.trim()) {
      // Xóa ô nếu cả 2 trống
      setScheduleData((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    } else {
      setScheduleData((prev) => ({
        ...prev,
        [key]: { subject, teacher },
      }));
    }
  };

  // Xóa một ô
  const handleClearCell = (day: string, period: number) => {
    const key = `${selectedClass}_${day}_${period}`;
    setScheduleData((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Thêm lớp mới
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newClassName.trim().toUpperCase();
    if (!name) return;
    if (!classList.includes(name)) {
      setClassList((prev) => [...prev, name]);
      setSelectedClass(name);
    }
    setNewClassName('');
  };

  // Xóa toàn bộ TKB của lớp hiện tại
  const handleClearCurrentClass = () => {
    if (confirm(`Bạn có chắc muốn xóa toàn bộ thời khóa biểu của lớp ${selectedClass}?`)) {
      setScheduleData((prev) => {
        const copy = { ...prev };
        Object.keys(copy).forEach((k) => {
          if (k.startsWith(`${selectedClass}_`)) {
            delete copy[k];
          }
        });
        return copy;
      });
    }
  };

  // Nạp dữ liệu mẫu nhanh cho lớp hiện tại
  const handleLoadSample = () => {
    const sample: Record<string, TimetableCellData> = {
      [`${selectedClass}_THU_2_1`]: { subject: 'Chào Cờ', teacher: 'GVCN' },
      [`${selectedClass}_THU_2_2`]: { subject: 'Toán', teacher: 'Cô Loan' },
      [`${selectedClass}_THU_2_3`]: { subject: 'Tiếng Việt', teacher: 'Cô Mai' },
      [`${selectedClass}_THU_2_4`]: { subject: 'Tiếng Anh', teacher: 'Thầy Hùng' },
      
      [`${selectedClass}_THU_3_1`]: { subject: 'Tiếng Việt', teacher: 'Cô Mai' },
      [`${selectedClass}_THU_3_2`]: { subject: 'Tiếng Việt', teacher: 'Cô Mai' },
      [`${selectedClass}_THU_3_3`]: { subject: 'Toán', teacher: 'Cô Loan' },
      [`${selectedClass}_THU_3_4`]: { subject: 'Đạo Đức', teacher: 'Cô Mai' },

      [`${selectedClass}_THU_4_1`]: { subject: 'Toán', teacher: 'Cô Loan' },
      [`${selectedClass}_THU_4_2`]: { subject: 'Tiếng Việt', teacher: 'Cô Mai' },
      [`${selectedClass}_THU_4_3`]: { subject: 'Tự Nhiên & Xã Hội', teacher: 'Cô Mai' },
      [`${selectedClass}_THU_4_4`]: { subject: 'Giáo Dục Thể Chất', teacher: 'Thầy Đức' },

      [`${selectedClass}_THU_5_1`]: { subject: 'Tiếng Việt', teacher: 'Cô Mai' },
      [`${selectedClass}_THU_5_2`]: { subject: 'Tiếng Anh', teacher: 'Thầy Hùng' },
      [`${selectedClass}_THU_5_3`]: { subject: 'Toán', teacher: 'Cô Loan' },
      [`${selectedClass}_THU_5_4`]: { subject: 'Âm Nhạc', teacher: 'Cô Linh' },

      [`${selectedClass}_THU_6_1`]: { subject: 'Tiếng Việt', teacher: 'Cô Mai' },
      [`${selectedClass}_THU_6_2`]: { subject: 'Toán', teacher: 'Cô Loan' },
      [`${selectedClass}_THU_6_3`]: { subject: 'Mĩ Thuật', teacher: 'Cô Dung' },
      [`${selectedClass}_THU_6_4`]: { subject: 'Sinh Hoạt Lớp', teacher: 'GVCN' },
    };

    setScheduleData((prev) => ({ ...prev, ...sample }));
  };

  // In tờ thời khóa biểu
  const handlePrint = () => {
    window.print();
  };

  // Xuất file Excel (.xlsx)
  const handleExportExcel = () => {
    const rows: any[] = [];
    rows.push([schoolName.toUpperCase()]);
    rows.push([`THỜI KHÓA BIỂU - LỚP ${selectedClass}`]);
    rows.push([schoolYear]);
    rows.push([]);

    // Tiêu đề cột
    const headers = ['Buổi / Tiết', ...DAYS.map((d) => d.label)];
    rows.push(headers);

    // Sáng (Tiết 1 - 5)
    rows.push(['--- BUỔI SÁNG ---']);
    for (let p = 1; p <= 5; p++) {
      const row = [`Tiết ${p}`];
      DAYS.forEach((d) => {
        const cell = scheduleData[`${selectedClass}_${d.key}_${p}`];
        if (cell && cell.subject) {
          row.push(`${cell.subject} (${cell.teacher || ''})`);
        } else {
          row.push('');
        }
      });
      rows.push(row);
    }

    // Chiều (Tiết 6 - 10)
    rows.push(['--- BUỔI CHIỀU ---']);
    for (let p = 6; p <= 10; p++) {
      const row = [`Tiết ${p}`];
      DAYS.forEach((d) => {
        const cell = scheduleData[`${selectedClass}_${d.key}_${p}`];
        if (cell && cell.subject) {
          row.push(`${cell.subject} (${cell.teacher || ''})`);
        } else {
          row.push('');
        }
      });
      rows.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `TKB_${selectedClass}`);
    XLSX.writeFile(wb, `ThoiKhoaBieu_Lop_${selectedClass}.xlsx`);
  };

  // Đếm tổng số tiết đã xếp cho lớp hiện tại
  const currentClassTotalPeriods = useMemo(() => {
    let count = 0;
    Object.keys(scheduleData).forEach((key) => {
      if (key.startsWith(`${selectedClass}_`) && scheduleData[key]?.subject) {
        count++;
      }
    });
    return count;
  }, [scheduleData, selectedClass]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. THANH TIÊU ĐỀ TRÊN CÙNG (Không in ra giấy) */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30 shadow-lg no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Hệ Thống Xếp & Xuất Thời Khóa Biểu Tiểu Học
              </h1>
              <p className="text-xs text-slate-400">
                Nhập Thứ $\rightarrow$ Nhập Tiết $\rightarrow$ Nhập Môn & Giáo Viên $\rightarrow$ Xuất Tờ TKB
              </p>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all"
              title="Nạp mẫu nhanh để xem thử"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Nạp Mẫu</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-brand-600/30 flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>In Tờ Thời Khóa Biểu</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. THANH NHẬP LIỆU SIÊU TỐC (Không in ra giấy) */}
      <section className="bg-slate-900/80 border-b border-slate-800/80 p-4 no-print">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Hàng chọn lớp học */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <GraduationCap className="w-4 h-4 text-brand-400" />
                <span>Chọn Lớp Học:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {classList.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedClass === cls
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 scale-105'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Lớp {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Thêm lớp mới */}
            <form onSubmit={handleAddClass} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Thêm lớp (VD: 2A2, 5A3)..."
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="px-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 w-44"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm
              </button>
            </form>
          </div>

          {/* FORM NHẬP NHANH: [Thứ] -> [Tiết] -> [Môn] -> [Giáo viên] -> [Thêm Vào TKB] */}
          <form onSubmit={handleAddSlot} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-400">
              <Plus className="w-4 h-4" />
              <span>Gán Tiết Nhanh Vào Lớp {selectedClass}:</span>
            </div>

            {/* 1. Chọn Thứ */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">1. Thứ:</span>
              <select
                value={inputDay}
                onChange={(e) => setInputDay(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-brand-500"
              >
                {DAYS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Chọn Tiết */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">2. Tiết:</span>
              <select
                value={inputPeriod}
                onChange={(e) => setInputPeriod(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-brand-500"
              >
                <optgroup label="Buổi Sáng">
                  <option value={1}>Tiết 1 (Sáng)</option>
                  <option value={2}>Tiết 2 (Sáng)</option>
                  <option value={3}>Tiết 3 (Sáng)</option>
                  <option value={4}>Tiết 4 (Sáng)</option>
                  <option value={5}>Tiết 5 (Sáng)</option>
                </optgroup>
                <optgroup label="Buổi Chiều">
                  <option value={6}>Tiết 6 (Chiều)</option>
                  <option value={7}>Tiết 7 (Chiều)</option>
                  <option value={8}>Tiết 8 (Chiều)</option>
                  <option value={9}>Tiết 9 (Chiều)</option>
                  <option value={10}>Tiết 10 (Chiều)</option>
                </optgroup>
              </select>
            </div>

            {/* 3. Nhập/Chọn Môn Học */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
              <span className="text-xs text-slate-400 font-medium">3. Môn:</span>
              <div className="relative flex-1">
                <input
                  type="text"
                  list="subjects-list"
                  placeholder="Gõ hoặc chọn môn..."
                  value={inputSubject}
                  onChange={(e) => setInputSubject(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-brand-500"
                />
                <datalist id="subjects-list">
                  {DEFAULT_SUBJECTS.map((s) => (
                    <option key={s.name} value={s.name} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* 4. Nhập Tên Giáo Viên */}
            <div className="flex items-center gap-1.5 min-w-[160px]">
              <span className="text-xs text-slate-400 font-medium">4. Giáo Viên:</span>
              <input
                type="text"
                placeholder="Tên giáo viên (VD: Cô Loan)..."
                value={inputTeacher}
                onChange={(e) => setInputTeacher(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Nút Thêm */}
            <button
              type="submit"
              className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Thêm Tiết Này</span>
            </button>
          </form>
        </div>
      </section>

      {/* 3. TỜ THỜI KHÓA BIỂU CHÍNH (Hiển thị & In ấn) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
          
          {/* Header tờ Thời khóa biểu (Tiêu đề trường lớp) */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 print:border-b-2 print:border-black">
            <div>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="text-sm font-bold tracking-wider text-slate-400 uppercase bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-brand-500 rounded px-1 print:text-black print:p-0"
              />
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 print:text-black mt-1">
                THỜI KHÓA BIỂU: <span className="text-brand-400 print:text-black underline underline-offset-4">LỚP {selectedClass}</span>
              </h2>
              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="text-xs text-slate-400 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-brand-500 rounded px-1 print:text-black print:p-0 mt-0.5"
              />
            </div>

            <div className="flex items-center gap-3 no-print">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                Tổng số tiết đã xếp: <strong className="text-emerald-400 font-bold font-mono">{currentClassTotalPeriods} tiết</strong>
              </div>
              <button
                onClick={handleClearCurrentClass}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-all text-xs flex items-center gap-1 border border-transparent hover:border-rose-800"
                title="Xóa trắng bảng TKB của lớp này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Bảng Lớp Này</span>
              </button>
            </div>
          </div>

          {/* BẢNG THỜI KHÓA BIỂU CHÍNH */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-2 print:border-black">
            <table className="w-full text-center border-collapse text-xs print:text-black">
              {/* Tiêu đề Thứ */}
              <thead>
                <tr className="bg-slate-950 print:bg-slate-100 border-b border-slate-800 print:border-b-2 print:border-black">
                  <th className="p-3 font-bold text-slate-400 print:text-black uppercase w-28 text-left pl-4">
                    Tiết / Buổi
                  </th>
                  {DAYS.map((d) => (
                    <th key={d.key} className="p-3 font-bold text-slate-200 print:text-black border-l border-slate-800 print:border-black text-sm">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* BUỔI SÁNG (Tiết 1 - 5) */}
                <tr className="bg-slate-950/60 print:bg-slate-200 font-bold text-slate-300 print:text-black text-left border-y border-slate-800 print:border-black">
                  <td colSpan={7} className="py-2 px-4 flex items-center gap-2 text-brand-300 print:text-black text-xs font-bold uppercase">
                    <Sun className="w-4 h-4 text-amber-400 no-print" />
                    <span>Buổi Sáng (Tiết 1 đến Tiết 5)</span>
                  </td>
                </tr>

                {[1, 2, 3, 4, 5].map((period) => (
                  <tr key={period} className="border-b border-slate-800 print:border-black hover:bg-slate-800/20 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-400 print:text-black text-left pl-4 bg-slate-950/40 print:bg-transparent">
                      Tiết {period}
                    </td>
                    {DAYS.map((d) => {
                      const cellKey = `${selectedClass}_${d.key}_${period}`;
                      const cell = scheduleData[cellKey];
                      const matchedSub = cell ? DEFAULT_SUBJECTS.find((s) => s.name.toLowerCase() === cell.subject.toLowerCase()) : null;

                      return (
                        <td
                          key={d.key}
                          className="p-2 border-l border-slate-800 print:border-black min-w-[130px] h-16 align-middle relative group"
                        >
                          {cell && cell.subject ? (
                            <div
                              className="h-full rounded-xl p-2 flex flex-col justify-center items-center text-white print:text-black shadow-sm relative overflow-hidden transition-all group-hover:scale-[1.02]"
                              style={{
                                backgroundColor: matchedSub ? `${matchedSub.color}25` : '#3b82f625',
                                borderLeft: `4px solid ${matchedSub ? matchedSub.color : '#3b82f6'}`,
                              }}
                            >
                              <strong
                                className="font-bold text-xs truncate max-w-full print:text-black"
                                style={{ color: matchedSub ? matchedSub.color : '#60a5fa' }}
                              >
                                {cell.subject}
                              </strong>
                              {cell.teacher && (
                                <span className="text-[11px] font-medium text-slate-300 print:text-gray-700 truncate max-w-full mt-0.5">
                                  GV: {cell.teacher}
                                </span>
                              )}

                              {/* Nút xóa nhanh khi rê chuột (không in) */}
                              <button
                                onClick={() => handleClearCell(d.key, period)}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 no-print transition-opacity"
                                title="Xóa tiết này"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            /* Ô Trống: Cho phép gõ trực tiếp vào ô */
                            <div className="h-full flex flex-col justify-center items-center">
                              <input
                                type="text"
                                placeholder="Gõ môn..."
                                onBlur={(e) => {
                                  if (e.target.value.trim()) {
                                    handleUpdateCell(d.key, period, e.target.value, '');
                                    e.target.value = '';
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val) {
                                      handleUpdateCell(d.key, period, val, '');
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }
                                }}
                                className="w-full text-center bg-transparent text-xs text-slate-500 hover:text-white focus:text-white placeholder-slate-700 hover:placeholder-slate-500 focus:placeholder-transparent focus:outline-none rounded py-1 no-print transition-colors font-medium"
                              />
                              <span className="text-slate-800 print:text-transparent hidden print:inline">-</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* BUỔI CHIỀU (Tiết 6 - 10) */}
                <tr className="bg-slate-950/60 print:bg-slate-200 font-bold text-slate-300 print:text-black text-left border-y border-slate-800 print:border-black">
                  <td colSpan={7} className="py-2 px-4 flex items-center gap-2 text-indigo-300 print:text-black text-xs font-bold uppercase">
                    <Moon className="w-4 h-4 text-indigo-400 no-print" />
                    <span>Buổi Chiều (Tiết 6 đến Tiết 10)</span>
                  </td>
                </tr>

                {[6, 7, 8, 9, 10].map((period) => (
                  <tr key={period} className="border-b border-slate-800 print:border-black hover:bg-slate-800/20 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-400 print:text-black text-left pl-4 bg-slate-950/40 print:bg-transparent">
                      Tiết {period}
                    </td>
                    {DAYS.map((d) => {
                      const cellKey = `${selectedClass}_${d.key}_${period}`;
                      const cell = scheduleData[cellKey];
                      const matchedSub = cell ? DEFAULT_SUBJECTS.find((s) => s.name.toLowerCase() === cell.subject.toLowerCase()) : null;

                      return (
                        <td
                          key={d.key}
                          className="p-2 border-l border-slate-800 print:border-black min-w-[130px] h-16 align-middle relative group"
                        >
                          {cell && cell.subject ? (
                            <div
                              className="h-full rounded-xl p-2 flex flex-col justify-center items-center text-white print:text-black shadow-sm relative overflow-hidden transition-all group-hover:scale-[1.02]"
                              style={{
                                backgroundColor: matchedSub ? `${matchedSub.color}25` : '#3b82f625',
                                borderLeft: `4px solid ${matchedSub ? matchedSub.color : '#3b82f6'}`,
                              }}
                            >
                              <strong
                                className="font-bold text-xs truncate max-w-full print:text-black"
                                style={{ color: matchedSub ? matchedSub.color : '#60a5fa' }}
                              >
                                {cell.subject}
                              </strong>
                              {cell.teacher && (
                                <span className="text-[11px] font-medium text-slate-300 print:text-gray-700 truncate max-w-full mt-0.5">
                                  GV: {cell.teacher}
                                </span>
                              )}

                              <button
                                onClick={() => handleClearCell(d.key, period)}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 no-print transition-opacity"
                                title="Xóa tiết này"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col justify-center items-center">
                              <input
                                type="text"
                                placeholder="Gõ môn..."
                                onBlur={(e) => {
                                  if (e.target.value.trim()) {
                                    handleUpdateCell(d.key, period, e.target.value, '');
                                    e.target.value = '';
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val) {
                                      handleUpdateCell(d.key, period, val, '');
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }
                                }}
                                className="w-full text-center bg-transparent text-xs text-slate-500 hover:text-white focus:text-white placeholder-slate-700 hover:placeholder-slate-500 focus:placeholder-transparent focus:outline-none rounded py-1 no-print transition-colors font-medium"
                              />
                              <span className="text-slate-800 print:text-transparent hidden print:inline">-</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chữ ký chân trang khi in ra giấy */}
          <div className="hidden print:grid grid-cols-2 pt-8 text-center text-xs">
            <div>
              <p className="font-bold uppercase">NGƯỜI LẬP BIỂU</p>
              <p className="italic text-gray-500">(Ký và ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-bold uppercase">HIỆU TRƯỞNG DUYỆT</p>
              <p className="italic text-gray-500">(Ký, đóng dấu)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
