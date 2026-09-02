import React, { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  FileSpreadsheet, 
  Trash2, 
  Plus, 
  Sparkles, 
  Calendar, 
  GraduationCap,
  Users,
  Sun,
  RotateCcw,
  Check,
  Zap,
  Layers,
  FileText,
  Upload,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PHAN_BOI_CHAU_DATA, PhanBoiChauTeacherData } from './utils/phanBoiChauData';
import { getPhanBoiChauAssignments, parseTeachingExpression, ParsedTeachingUnit, SUBJECT_NAME_MAP } from './utils/assignmentParser';
import { autoScheduleAllClasses, ScheduleResultEntry } from './utils/schedulerEngine';

// Ngày trong tuần
const DAYS = [
  { key: 'THU_2', label: 'Thứ Hai', short: 'T2' },
  { key: 'THU_3', label: 'Thứ Ba', short: 'T3' },
  { key: 'THU_4', label: 'Thứ Tư', short: 'T4' },
  { key: 'THU_5', label: 'Thứ Năm', short: 'T5' },
  { key: 'THU_6', label: 'Thứ Sáu', short: 'T6' },
  { key: 'THU_7', label: 'Thứ Bảy', short: 'T7' },
];

export const App: React.FC = () => {
  // Chế độ xem:
  // 'ASSIGNMENTS' (Bảng phân công chuyên môn)
  // 'TIMETABLE_CLASS' (TKB Theo Lớp)
  // 'TIMETABLE_TEACHER' (Lịch Giáo Viên)
  // 'MASTER_MATRIX' (Ma trận toàn trường)
  const [activeTab, setActiveTab] = useState<'ASSIGNMENTS' | 'TIMETABLE_CLASS' | 'TIMETABLE_TEACHER' | 'MASTER_MATRIX'>('ASSIGNMENTS');

  // Thông tin trường học
  const [schoolName, setSchoolName] = useState('TRƯỜNG THCS PHAN BỘI CHÂU');
  const [schoolYear, setSchoolYear] = useState('NĂM HỌC 2026 - 2027 • HỌC KỲ I (ÁP DỤNG TỪ 07/9/2026)');

  // Danh sách phân công chuyên môn
  const [teacherAssignmentsList, setTeacherAssignmentsList] = useState<PhanBoiChauTeacherData[]>(PHAN_BOI_CHAU_DATA);
  const [pastedText, setPastedText] = useState('');

  // Danh sách Lớp học và Giáo viên
  const [classList, setClassList] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('6A1');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('Tạ Thanh Thủy');

  // Dữ liệu Thời Khóa Biểu: key dạng `${className}_${day}_${period}` -> { subject, teacher }
  const [scheduleData, setScheduleData] = useState<Record<string, ScheduleResultEntry>>({});
  const [isScheduled, setIsScheduled] = useState(false);
  const [schedulingStats, setSchedulingStats] = useState<{ total: number; time: number } | null>(null);

  // Form nhập thêm phân công nhanh
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newDuty, setNewDuty] = useState('GV');
  const [newQuota, setNewQuota] = useState(19);
  const [newTeachingText, setNewTeachingText] = useState('');

  // Parse toàn bộ danh sách phân công
  const parsedUnits = useMemo(() => {
    const units: ParsedTeachingUnit[] = [];
    const classesSet = new Set<string>();

    teacherAssignmentsList.forEach((t) => {
      const parsed = parseTeachingExpression(t.name, t.rawTeachingText);
      parsed.forEach((u) => {
        units.push(u);
        classesSet.add(u.className);
      });
    });

    const sortedClasses = Array.from(classesSet).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    return { units, sortedClasses };
  }, [teacherAssignmentsList]);

  // Đồng bộ classList khi parsedUnits thay đổi
  useEffect(() => {
    if (parsedUnits.sortedClasses.length > 0) {
      setClassList(parsedUnits.sortedClasses);
      if (!parsedUnits.sortedClasses.includes(selectedClass)) {
        setSelectedClass(parsedUnits.sortedClasses[0]);
      }
    }
  }, [parsedUnits.sortedClasses]);

  // 1. HÀM TỰ ĐỘNG SẮP XẾP THỜI KHÓA BIỂU
  const handleRunAutoScheduler = () => {
    if (parsedUnits.units.length === 0) {
      alert('Chưa có phân công chuyên môn nào để xếp lịch!');
      return;
    }

    const { schedule, totalScheduled, timeElapsedMs } = autoScheduleAllClasses(
      parsedUnits.units,
      parsedUnits.sortedClasses
    );

    setScheduleData(schedule);
    setIsScheduled(true);
    setSchedulingStats({ total: totalScheduled, time: timeElapsedMs });
    setActiveTab('TIMETABLE_CLASS'); // Tự động mở xem Tờ Thời Khóa Biểu
  };

  // Nạp lại dữ liệu chuẩn mẫu từ ảnh THCS Phan Bội Châu
  const handleReloadPhanBoiChauData = () => {
    setTeacherAssignmentsList(PHAN_BOI_CHAU_DATA);
    setSchoolName('TRƯỜNG THCS PHAN BỘI CHÂU');
    setSchoolYear('NĂM HỌC 2026 - 2027 • HỌC KỲ I (ÁP DỤNG TỪ 07/9/2026)');
  };

  // Thêm một giáo viên & phân công mới
  const handleAddTeacherAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeachingText.trim()) return;

    const newEntry: PhanBoiChauTeacherData = {
      stt: teacherAssignmentsList.length + 1,
      name: newTeacherName.trim(),
      duty: newDuty.trim(),
      quota: Number(newQuota) || 19,
      rawTeachingText: newTeachingText.trim(),
    };

    setTeacherAssignmentsList((prev) => [...prev, newEntry]);
    setNewTeacherName('');
    setNewTeachingText('');
  };

  // Xóa một giáo viên khỏi danh sách
  const handleDeleteTeacherAssignment = (stt: number) => {
    setTeacherAssignmentsList((prev) => prev.filter((t) => t.stt !== stt));
  };

  // Nhập / Dán nhanh từ clipboard văn bản
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    const lines = pastedText.trim().split(/\r?\n/);
    const newItems: PhanBoiChauTeacherData[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        newItems.push({
          stt: teacherAssignmentsList.length + idx + 1,
          name: parts[0]?.trim(),
          duty: parts[1]?.trim() || 'GV',
          quota: parseInt(parts[2], 10) || 19,
          rawTeachingText: parts[3]?.trim() || parts[1]?.trim(),
        });
      } else if (line.includes('|')) {
        const p = line.split('|');
        newItems.push({
          stt: teacherAssignmentsList.length + idx + 1,
          name: p[0]?.trim(),
          duty: 'GV',
          quota: 19,
          rawTeachingText: p[1]?.trim() || '',
        });
      }
    });

    if (newItems.length > 0) {
      setTeacherAssignmentsList((prev) => [...prev, ...newItems]);
      setPastedText('');
      alert(`Đã nạp thành công ${newItems.length} giáo viên vào danh sách!`);
    }
  };

  // Cập nhật thủ công một ô
  const handleUpdateCell = (day: string, period: number, subject: string, teacher: string) => {
    const key = `${selectedClass}_${day}_${period}`;
    setScheduleData((prev) => ({
      ...prev,
      [key]: { subject, teacher },
    }));
  };

  // In Tờ Thời Khóa Biểu
  const handlePrint = () => {
    window.print();
  };

  // Xuất Toàn Bộ Thời Khóa Biểu sang Excel (.xlsx)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Bảng phân công
    const assignRows = [
      ['BẢNG PHÂN CÔNG CHUYÊN MÔN', schoolName.toUpperCase()],
      ['STT', 'Họ và tên Giáo viên', 'Chức vụ', 'Định mức', 'Phân công giảng dạy'],
      ...teacherAssignmentsList.map((t, i) => [i + 1, t.name, t.duty || '', t.quota, t.rawTeachingText]),
    ];
    const wsAssign = XLSX.utils.aoa_to_sheet(assignRows);
    XLSX.utils.book_append_sheet(wb, wsAssign, 'Phân Công Chuyên Môn');

    // Sheet 2: Thời khóa biểu từng lớp
    const classRows: any[] = [];
    classRows.push([schoolName.toUpperCase()]);
    classRows.push(['THỜI KHÓA BIỂU TOÀN TRƯỜNG - THEO TỪNG LỚP']);
    classRows.push([]);

    classList.forEach((cls) => {
      classRows.push([`=== LỚP: ${cls} ===`]);
      classRows.push(['Tiết / Buổi', ...DAYS.map((d) => d.label)]);

      for (let p = 1; p <= 5; p++) {
        const row = [`Tiết ${p}`];
        DAYS.forEach((d) => {
          const entry = scheduleData[`${cls}_${d.key}_${p}`];
          row.push(entry ? `${entry.subject} (${entry.teacher})` : '-');
        });
        classRows.push(row);
      }
      classRows.push([]);
    });

    const wsClasses = XLSX.utils.aoa_to_sheet(classRows);
    XLSX.utils.book_append_sheet(wb, wsClasses, 'TKB Toàn Trường');

    XLSX.writeFile(wb, `ThoiKhoaBieu_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* 1. HEADER CHÍNH */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-xl no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Hệ Thống Phân Công & Sắp Xếp Thời Khóa Biểu Tự Động
              </h1>
              <p className="text-xs text-slate-400">
                Nhập bảng phân công $\rightarrow$ Bấm Tự Động Sắp Xếp $\rightarrow$ Xuất Tờ TKB Chuẩn Đẹp
              </p>
            </div>
          </div>

          {/* Cụm nút hành động chính */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAutoScheduler}
              className="px-4 py-2 bg-gradient-to-r from-brand-500 via-indigo-600 to-purple-600 hover:from-brand-400 hover:to-purple-500 text-white text-xs font-black rounded-xl shadow-lg shadow-brand-500/30 hover:scale-[1.02] flex items-center gap-2 transition-all animate-pulse"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>⚡ TỰ ĐỘNG SẮP XẾP TKB</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>In TKB</span>
            </button>
          </div>
        </div>

        {/* CÁC TAB CHỨC NĂNG */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <nav className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('ASSIGNMENTS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'ASSIGNMENTS'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1. Bảng Phân Công Chuyên Môn ({teacherAssignmentsList.length} GV)</span>
            </button>

            <button
              onClick={() => setActiveTab('TIMETABLE_CLASS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'TIMETABLE_CLASS'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>2. Tờ Thời Khóa Biểu Theo Lớp</span>
            </button>

            <button
              onClick={() => setActiveTab('TIMETABLE_TEACHER')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'TIMETABLE_TEACHER'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>3. Lịch Giảng Dạy Giáo Viên</span>
            </button>

            <button
              onClick={() => setActiveTab('MASTER_MATRIX')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'MASTER_MATRIX'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>4. Ma Trận Toàn Trường ({classList.length} Lớp)</span>
            </button>
          </nav>

          {/* Thông báo xếp lịch */}
          {isScheduled && schedulingStats && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-700/60 font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>Đã xếp xong <strong>{schedulingStats.total} tiết</strong> ({schedulingStats.time}ms) không trùng lịch!</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. THÂN ỨNG DỤNG */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
        
        {/* ========================================================================= */}
        {/* TAB 1: BẢNG PHÂN CÔNG CHUYÊN MÔN (CHUẨN MẪU ẢNH THCS PHAN BỘI CHÂU)      */}
        {/* ========================================================================= */}
        {activeTab === 'ASSIGNMENTS' && (
          <div className="space-y-6">
            {/* Thanh công cụ nạp dữ liệu */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-400" />
                    <span>Bảng Phân Công Chuyên Môn Giảng Dạy</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Đã nạp sẵn chuẩn mẫu văn bản trường THCS Phan Bội Châu (56 giáo viên, 31 lớp). Bạn có thể chỉnh sửa, thêm mới hoặc bấm Sắp Xếp TKB ngay!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReloadPhanBoiChauData}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nạp Lại Mẫu Chuẩn Phan Bội Châu</span>
                  </button>

                  <button
                    onClick={handleRunAutoScheduler}
                    className="px-5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 flex items-center gap-1.5 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Bắt Đầu Xếp TKB Tự Động</span>
                  </button>
                </div>
              </div>

              {/* Form thêm GV & phân công mới */}
              <form onSubmit={handleAddTeacherAssignment} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Tên Giáo Viên:</label>
                  <input
                    type="text"
                    placeholder="VD: Cô Lê Thị Mai..."
                    value={newTeacherName}
                    onChange={(e) => setNewTeacherName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Chức vụ / Định mức:</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="GV"
                      value={newDuty}
                      onChange={(e) => setNewDuty(e.target.value)}
                      className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="19t"
                      value={newQuota}
                      onChange={(e) => setNewQuota(Number(e.target.value))}
                      className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white text-center focus:outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-5 space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">
                    Phân công giảng dạy (Cú pháp: <span className="text-brand-400 font-mono">Môn (Lớp1, Lớp2)</span>):
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Toán (6A1, 6A2, 8A1) + Tin (6A1, 6A2)..."
                    value={newTeachingText}
                    onChange={(e) => setNewTeachingText(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm GV
                  </button>
                </div>
              </form>
            </div>

            {/* BẢNG DANH SÁCH GIÁO VIÊN & PHÂN CÔNG */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Danh sách phân công giảng dạy ({teacherAssignmentsList.length} giáo viên • {parsedUnits.sortedClasses.length} lớp học):
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Tổng {parsedUnits.units.length} phân đoạn môn-lớp
                </span>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 sticky top-0 z-10 border-b border-slate-800 font-bold text-slate-400">
                    <tr>
                      <th className="p-3 w-12 text-center">STT</th>
                      <th className="p-3 w-48">Họ và Tên Giáo Viên</th>
                      <th className="p-3 w-28">Chức Vụ</th>
                      <th className="p-3 w-24 text-center">Định Mức</th>
                      <th className="p-3">Phân Công Giảng Dạy (Môn & Các Lớp)</th>
                      <th className="p-3 w-16 text-right">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {teacherAssignmentsList.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-white">{t.name}</td>
                        <td className="p-3 text-slate-400 font-medium">
                          {t.duty && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-brand-300 border border-slate-700 text-[11px]">
                              {t.duty}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-300">{t.quota}t</td>
                        <td className="p-3 font-mono text-xs text-emerald-300">
                          {t.rawTeachingText}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteTeacherAssignment(t.stt)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                            title="Xóa giáo viên này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TỜ THỜI KHÓA BIỂU THEO LỚP (IN & XUẤT)                             */}
        {/* ========================================================================= */}
        {activeTab === 'TIMETABLE_CLASS' && (
          <div className="space-y-6">
            {/* Thanh chọn lớp */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <GraduationCap className="w-4 h-4 text-brand-400" />
                  <span>Chọn Lớp Để Xem & In:</span>
                </span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-brand-500"
                >
                  {classList.map((cls) => (
                    <option key={cls} value={cls}>
                      Lớp {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunAutoScheduler}
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Xếp Lại TKB</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>In Tờ TKB Lớp {selectedClass}</span>
                </button>
              </div>
            </div>

            {/* TỜ THỜI KHÓA BIỂU CHÍNH */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
              {/* Tiêu đề văn bản */}
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
              </div>

              {/* BẢNG TKB */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-2 print:border-black">
                <table className="w-full text-center border-collapse text-xs print:text-black">
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
                        <span>Buổi Sáng (Tiết 1 - 5)</span>
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
                          const matchedSub = cell ? Object.values(SUBJECT_NAME_MAP).find((s) => s.standardName.toLowerCase() === cell.subject.toLowerCase()) : null;

                          return (
                            <td
                              key={d.key}
                              className="p-2 border-l border-slate-800 print:border-black min-w-[130px] h-16 align-middle relative"
                            >
                              {cell && cell.subject ? (
                                <div
                                  className="h-full rounded-xl p-2 flex flex-col justify-center items-center text-white print:text-black shadow-sm"
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
                                </div>
                              ) : (
                                <span className="text-slate-700 print:text-transparent">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Chữ ký duyệt khi in ra giấy */}
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LỊCH GIẢNG DẠY CỦA GIÁO VIÊN                                        */}
        {/* ========================================================================= */}
        {activeTab === 'TIMETABLE_TEACHER' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Chọn Giáo Viên Để Xem Lịch:</span>
                </span>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                >
                  {teacherAssignmentsList.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.duty || 'GV'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePrint}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>In Lịch Giảng Dạy</span>
              </button>
            </div>

            {/* BẢNG LỊCH DẠY CỦA GIÁO VIÊN */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 print:border-b-2 print:border-black">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase">{schoolName}</h3>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 print:text-black mt-1">
                    LỊCH GIẢNG DẠY: <span className="text-indigo-400 print:text-black">{selectedTeacher}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{schoolYear}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-2 print:border-black">
                <table className="w-full text-center border-collapse text-xs print:text-black">
                  <thead>
                    <tr className="bg-slate-950 print:bg-slate-100 border-b border-slate-800 print:border-b-2 print:border-black">
                      <th className="p-3 font-bold text-slate-400 print:text-black uppercase w-28 text-left pl-4">Tiết / Buổi</th>
                      {DAYS.map((d) => (
                        <th key={d.key} className="p-3 font-bold text-slate-200 print:text-black border-l border-slate-800 print:border-black text-sm">
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((period) => (
                      <tr key={period} className="border-b border-slate-800 print:border-black hover:bg-slate-800/20 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-400 print:text-black text-left pl-4 bg-slate-950/40 print:bg-transparent">
                          Tiết {period}
                        </td>
                        {DAYS.map((d) => {
                          let matchedClass = '';
                          let matchedSubject = '';

                          for (const key of Object.keys(scheduleData)) {
                            if (key.endsWith(`_${d.key}_${period}`)) {
                              const entry = scheduleData[key];
                              if (entry && entry.teacher.toLowerCase() === selectedTeacher.toLowerCase()) {
                                matchedClass = key.replace(`_${d.key}_${period}`, '');
                                matchedSubject = entry.subject;
                                break;
                              }
                            }
                          }

                          return (
                            <td key={d.key} className="p-2 border-l border-slate-800 print:border-black min-w-[130px] h-16 align-middle">
                              {matchedClass ? (
                                <div className="h-full rounded-xl p-2 bg-indigo-950/60 border-l-4 border-indigo-500 text-white print:text-black flex flex-col justify-center items-center">
                                  <strong className="font-bold text-xs text-indigo-300 print:text-black">
                                    Lớp {matchedClass}
                                  </strong>
                                  <span className="text-[11px] text-slate-300 print:text-gray-700">
                                    {matchedSubject}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-700 print:text-transparent">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MA TRẬN TOÀN TRƯỜNG                                                */}
        {/* ========================================================================= */}
        {activeTab === 'MASTER_MATRIX' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  MA TRẬN THỜI KHÓA BIỂU TOÀN TRƯỜNG ({classList.length} LỚP HỌC)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{schoolName} • {schoolYear}</p>
              </div>

              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xuất Bảng Ma Trận Excel</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-[70vh]">
              <table className="w-full text-center border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800 shadow-md">
                  <tr>
                    <th className="p-3 font-bold text-slate-400 uppercase w-20 text-left pl-4">Lớp</th>
                    {DAYS.map((d) => (
                      <th key={d.key} colSpan={5} className="p-2.5 font-bold text-slate-200 border-l border-slate-800">
                        {d.label} (Tiết 1-5)
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {classList.map((cls) => (
                    <tr key={cls} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-2.5 text-left pl-4 font-bold text-white bg-slate-950/50">
                        {cls}
                      </td>
                      {DAYS.map((d) => {
                        return [1, 2, 3, 4, 5].map((p) => {
                          const key = `${cls}_${d.key}_${p}`;
                          const entry = scheduleData[key];
                          const matchedSub = entry ? Object.values(SUBJECT_NAME_MAP).find((s) => s.standardName.toLowerCase() === entry.subject.toLowerCase()) : null;

                          return (
                            <td
                              key={`${d.key}_${p}`}
                              className="p-1 border-l border-slate-800/40 text-[10px] min-w-[46px] h-8"
                              title={entry ? `${entry.subject} (GV: ${entry.teacher})` : 'Trống'}
                            >
                              {entry ? (
                                <div
                                  className="w-full h-full rounded flex items-center justify-center font-bold text-white text-[10px] truncate px-0.5"
                                  style={{ backgroundColor: matchedSub ? matchedSub.color : '#4f46e5' }}
                                >
                                  {entry.subject.slice(0, 4)}
                                </div>
                              ) : (
                                <span className="text-slate-800">-</span>
                              )}
                            </td>
                          );
                        });
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
