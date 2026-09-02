import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Filter,
  Eye,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PHAN_BOI_CHAU_DATA, PhanBoiChauTeacherData } from './utils/phanBoiChauData';
import { getPhanBoiChauAssignments, parseTeachingExpression, ParsedTeachingUnit, SUBJECT_NAME_MAP } from './utils/assignmentParser';
import { autoScheduleAllClasses, ScheduleResultEntry } from './utils/schedulerEngine';
import { MultiSourceImportModal } from './components/ImportCenter/MultiSourceImportModal';
import { downloadSampleExcelTemplate } from './utils/multiSourceImporter';

// Ngày trong tuần
const DAYS = [
  { key: 'THU_2', label: 'Thứ Hai', short: 'Thứ 2' },
  { key: 'THU_3', label: 'Thứ Ba', short: 'Thứ 3' },
  { key: 'THU_4', label: 'Thứ Tư', short: 'Thứ 4' },
  { key: 'THU_5', label: 'Thứ Năm', short: 'Thứ 5' },
  { key: 'THU_6', label: 'Thứ Sáu', short: 'Thứ 6' },
  { key: 'THU_7', label: 'Thứ Bảy', short: 'Thứ 7' },
];

export const App: React.FC = () => {
  // Chế độ xem:
  // 'MASTER_ALL_CLASSES': Tờ Thời Khóa Biểu Toàn Trường (Tất cả các lớp - Mặc định)
  // 'TIMETABLE_CLASS': Xem chi tiết từng lớp
  // 'TIMETABLE_TEACHER': Lịch giảng dạy từng giáo viên
  // 'BATCH_PRINT': Chế độ in đồng loạt 32 lớp
  // 'ASSIGNMENTS': Bảng phân công chuyên môn
  const [activeTab, setActiveTab] = useState<'MASTER_ALL_CLASSES' | 'TIMETABLE_CLASS' | 'TIMETABLE_TEACHER' | 'BATCH_PRINT' | 'ASSIGNMENTS'>('MASTER_ALL_CLASSES');

  // Bộ lọc khối lớp trong bảng toàn trường
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'ALL' | '6' | '7' | '8' | '9'>('ALL');

  // Thông tin trường học
  const [schoolName, setSchoolName] = useState('TRƯỜNG THCS PHAN BỘI CHÂU');
  const [schoolYear, setSchoolYear] = useState('NĂM HỌC 2026 - 2027 • HỌC KỲ I (ÁP DỤNG TỪ 07/9/2026)');

  // Danh sách phân công chuyên môn
  const [teacherAssignmentsList, setTeacherAssignmentsList] = useState<PhanBoiChauTeacherData[]>(PHAN_BOI_CHAU_DATA);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Danh sách Lớp học và Giáo viên
  const [classList, setClassList] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('6A1');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('Tạ Thanh Thủy');

  // Dữ liệu Thời Khóa Biểu: key dạng `${className}_${day}_${period}` -> { subject, teacher }
  const [scheduleData, setScheduleData] = useState<Record<string, ScheduleResultEntry>>({});
  const [isScheduled, setIsScheduled] = useState(false);
  const [schedulingStats, setSchedulingStats] = useState<{ total: number; time: number } | null>(null);

  // Tham chiếu và state cho chức năng Kéo chuột cuộn 2 chiều (Mouse 2D Drag-to-Scroll)
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [scrollTopState, setScrollTopState] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tableContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - tableContainerRef.current.offsetLeft);
    setStartY(e.pageY - tableContainerRef.current.offsetTop);
    setScrollLeftState(tableContainerRef.current.scrollLeft);
    setScrollTopState(tableContainerRef.current.scrollTop);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tableContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const y = e.pageY - tableContainerRef.current.offsetTop;
    const walkX = (x - startX) * 1.8;
    const walkY = (y - startY) * 1.8;
    tableContainerRef.current.scrollLeft = scrollLeftState - walkX;
    tableContainerRef.current.scrollTop = scrollTopState - walkY;
  };

  // Cuộn dọc trực tiếp đến Thứ được chọn (Đặc biệt là Thứ 7)
  const scrollToDayVertical = (dayKey: string) => {
    const el = document.getElementById(`day_row_${dayKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const scrollStep = (direction: 'LEFT' | 'RIGHT') => {
    if (!tableContainerRef.current) return;
    const amount = direction === 'LEFT' ? -380 : 380;
    tableContainerRef.current.scrollBy({
      left: amount,
      behavior: 'smooth',
    });
  };

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

  // ⚡ TỰ ĐỘNG SẮP XẾP THỜI KHÓA BIỂU TOÀN TRƯỜNG
  const runAutoSchedulerInternal = (unitsToSchedule: ParsedTeachingUnit[], classesToSchedule: string[]) => {
    if (unitsToSchedule.length === 0) return;

    const { schedule, totalScheduled, timeElapsedMs } = autoScheduleAllClasses(
      unitsToSchedule,
      classesToSchedule
    );

    setScheduleData(schedule);
    setIsScheduled(true);
    setSchedulingStats({ total: totalScheduled, time: timeElapsedMs });
  };

  // Tự động chạy sắp xếp ngay khi mở ứng dụng
  useEffect(() => {
    if (parsedUnits.units.length > 0 && parsedUnits.sortedClasses.length > 0) {
      runAutoSchedulerInternal(parsedUnits.units, parsedUnits.sortedClasses);
    }
  }, [parsedUnits]);

  const handleRunAutoScheduler = () => {
    runAutoSchedulerInternal(parsedUnits.units, parsedUnits.sortedClasses);
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

  // Lọc danh sách lớp hiển thị
  const filteredClassList = useMemo(() => {
    if (selectedGradeFilter === 'ALL') return classList;
    return classList.filter((cls) => cls.startsWith(selectedGradeFilter));
  }, [classList, selectedGradeFilter]);

  // In ấn
  const handlePrint = () => {
    window.print();
  };

  // Xuất Toàn Bộ Thời Khóa Biểu sang Excel (.xlsx)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Ma Trận TKB Toàn Trường (Thứ & Tiết Theo Hàng Dọc, Các Lớp Theo Cột Ngang)
    const masterRows: any[] = [];
    masterRows.push([schoolName.toUpperCase()]);
    masterRows.push(['THỜI KHÓA BIỂU TOÀN TRƯỜNG - NĂM HỌC 2026 - 2027']);
    masterRows.push([schoolYear]);
    masterRows.push([]);

    // Header: Thứ, Tiết, Danh sách lớp
    const headerRow = ['Thứ', 'Tiết', ...classList.map(c => `Lớp ${c}`)];
    masterRows.push(headerRow);

    // Từng dòng: Thứ 2 Tiết 1-5 đến Thứ 7 Tiết 1-5
    DAYS.forEach((d) => {
      [1, 2, 3, 4, 5].forEach((p) => {
        const row = [d.label, `Tiết ${p}`];
        classList.forEach((cls) => {
          const entry = scheduleData[`${cls}_${d.key}_${p}`];
          row.push(entry ? `${entry.subject} (${entry.teacher})` : '');
        });
        masterRows.push(row);
      });
    });

    const wsMaster = XLSX.utils.aoa_to_sheet(masterRows);
    XLSX.utils.book_append_sheet(wb, wsMaster, 'TKB_Toan_Truong');

    // Sheet 2: Bảng phân công chuyên môn
    const assignRows = [
      ['BẢNG PHÂN CÔNG CHUYÊN MÔN', schoolName.toUpperCase()],
      ['STT', 'Họ và tên Giáo viên', 'Chức vụ', 'Định mức', 'Phân công giảng dạy'],
      ...teacherAssignmentsList.map((t, i) => [i + 1, t.name, t.duty || '', t.quota, t.rawTeachingText]),
    ];
    const wsAssign = XLSX.utils.aoa_to_sheet(assignRows);
    XLSX.utils.book_append_sheet(wb, wsAssign, 'Phan_Cong_Chuyen_Mon');

    XLSX.writeFile(wb, `ThoiKhoaBieu_ToanTruong_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* 1. HEADER THANH ĐIỀU HƯỚNG CHÍNH */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-xl no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Hệ Thống Tự Động Xếp Thời Khóa Biểu Toàn Trường
              </h1>
              <p className="text-xs text-slate-400">
                Tự động xếp và xuất tờ Thời Khóa Biểu cho tất cả {classList.length} lớp học không trùng lịch
              </p>
            </div>
          </div>

          {/* Cụm nút hành động */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-brand-300 hover:text-white text-xs font-bold rounded-xl border border-brand-500/40 flex items-center gap-1.5 shadow transition-all"
            >
              <Upload className="w-4 h-4 text-brand-400" />
              <span>📥 Nhập Đa Nguồn (Excel, Dán...)</span>
            </button>

            <button
              onClick={handleRunAutoScheduler}
              className="px-4 py-2 bg-gradient-to-r from-brand-500 via-indigo-600 to-purple-600 hover:from-brand-400 hover:to-purple-500 text-white text-xs font-black rounded-xl shadow-lg shadow-brand-500/30 hover:scale-[1.02] flex items-center gap-2 transition-all animate-pulse"
              title="Xếp lại toàn bộ thời khóa biểu tự động"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>⚡ XẾP LẠI TKB TỰ ĐỘNG</span>
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
              className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/30 flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>In Tờ TKB</span>
            </button>
          </div>
        </div>

        {/* THANH TAB CHỨC NĂNG */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <nav className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('MASTER_ALL_CLASSES')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'MASTER_ALL_CLASSES'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1. Tờ TKB Toàn Trường (Tất Cả Các Lớp)</span>
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
              <span>2. Xem & In Từng Lớp Lẻ</span>
            </button>

            <button
              onClick={() => setActiveTab('BATCH_PRINT')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'BATCH_PRINT'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>3. In Đồng Loạt {classList.length} Tờ TKB Lớp (A4)</span>
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
              <span>4. Lịch Giảng Dạy Giáo Viên</span>
            </button>

            <button
              onClick={() => setActiveTab('ASSIGNMENTS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'ASSIGNMENTS'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>5. Bảng Phân Công ({teacherAssignmentsList.length} GV)</span>
            </button>
          </nav>

          {/* Badge trạng thái hoàn thành */}
          {isScheduled && schedulingStats && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-700/60 font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>Đã tự động xếp xong <strong>{schedulingStats.total} tiết</strong> cho <strong>{classList.length} lớp học</strong>!</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. THÂN ỨNG DỤNG */}
      <main className="flex-1 max-w-[96rem] w-full mx-auto p-4 md:p-6 overflow-y-auto">

        {/* ========================================================================================= */}
        {/* TAB 1: TỜ THỜI KHÓA BIỂU TOÀN TRƯỜNG (CHỨA TẤT CẢ CÁC LỚP) - HIỂN THỊ CHÍNH               */}
        {/* ========================================================================================= */}
        {activeTab === 'MASTER_ALL_CLASSES' && (
          <div className="space-y-6">
            {/* Thanh lọc khối lớp và công cụ */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1 mr-1">
                  <Filter className="w-4 h-4 text-brand-400" />
                  <span>Xem Khối Lớp:</span>
                </span>
                
                <button
                  onClick={() => setSelectedGradeFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedGradeFilter === 'ALL'
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Tất Cả ({classList.length} Lớp)
                </button>

                {['6', '7', '8', '9'].map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setSelectedGradeFilter(grade as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedGradeFilter === grade
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Khối {grade} ({classList.filter(c => c.startsWith(grade)).length} Lớp)
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('BATCH_PRINT')}
                  className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Tách Từng Tờ TKB Lớp</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/30 flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>In Tờ Tổng Hợp Toàn Trường</span>
                </button>
              </div>
            </div>

            {/* BẢNG TỜ THỜI KHÓA BIỂU TOÀN TRƯỜNG TỔNG HỢP */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
              {/* Header Tiêu Đề Văn Bản Trường Học */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 print:border-b-2 print:border-black">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-400 print:text-black">UBND PHƯỜNG BẢO LỘC</span>
                    <span className="text-xs text-slate-500 print:text-black">•</span>
                    <span className="text-xs font-bold uppercase text-brand-400 print:text-black">{schoolName}</span>
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 print:text-black mt-1">
                    THỜI KHÓA BIỂU TOÀN TRƯỜNG ({filteredClassList.length} LỚP HỌC)
                  </h2>
                  <p className="text-xs text-slate-400 print:text-black mt-0.5">{schoolYear}</p>
                </div>

                <div className="text-right no-print">
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                    Trạng thái: <strong className="text-emerald-400 font-bold font-mono">100% Không Trùng Lịch</strong>
                  </div>
                </div>
              </div>

              {/* THANH ĐIỀU HƯỚNG: LỌC KHỐI LỚP & NHẢY NHANH ĐẾN THỨ (ĐẶC BIỆT THỨ 7) */}
              <div className="bg-slate-950/90 p-3 rounded-2xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 no-print">
                {/* 1. Lọc theo Khối lớp */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-brand-400" />
                    <span>Xem Khối Lớp:</span>
                  </span>

                  <button
                    onClick={() => setSelectedGradeFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedGradeFilter === 'ALL'
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    Tất Cả 32 Lớp
                  </button>

                  {['6', '7', '8', '9'].map((grade) => (
                    <button
                      key={grade}
                      onClick={() => setSelectedGradeFilter(grade as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedGradeFilter === grade
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Khối {grade} ({classList.filter(c => c.startsWith(grade)).length} Lớp)
                    </button>
                  ))}
                </div>

                {/* 2. Nhảy nhanh đến từng Ngày (Thứ 2 đến Thứ 7) */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-700">
                  <span className="text-xs font-bold text-brand-400 pl-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Nhảy Đến Ngày:</span>
                  </span>

                  {DAYS.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => scrollToDayVertical(d.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        d.key === 'THU_7'
                          ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-md font-black animate-pulse'
                          : 'bg-slate-800 text-slate-300 hover:bg-brand-600 hover:text-white'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* BẢNG THỜI KHÓA BIỂU TOÀN TRƯỜNG (CHO PHÉP CUỘN CẢ 2 CHIỀU ĐỂ XEM ĐẦY ĐỦ TỪ THỨ 2 ĐẾN THỨ 7) */}
              <div 
                ref={tableContainerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={`overflow-auto rounded-2xl border-2 border-slate-800 print:border-2 print:border-black max-h-[82vh] select-none ${
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                title="Cuộn chuột hoặc click giữ chuột để kéo ngang/dọc xem toàn bộ 32 lớp và từ Thứ 2 đến Thứ 7"
              >
                <table className="w-full text-center border-collapse text-xs print:text-black">
                  <thead className="sticky top-0 z-30 bg-slate-950 print:bg-slate-100 border-b-2 border-slate-800 print:border-b-2 print:border-black shadow-md">
                    <tr>
                      {/* Cột Thứ cố định góc trái */}
                      <th 
                        className="p-3 font-bold text-slate-100 print:text-black uppercase w-24 min-w-[85px] text-center sticky left-0 z-40 bg-slate-950 print:bg-slate-100 border-r border-slate-800 shadow-xl"
                      >
                        Thứ
                      </th>
                      {/* Cột Tiết cố định */}
                      <th 
                        className="p-3 font-bold text-slate-100 print:text-black uppercase w-20 min-w-[70px] text-center sticky left-[85px] z-40 bg-slate-950 print:bg-slate-100 border-r-2 border-brand-500 shadow-xl"
                      >
                        Tiết
                      </th>
                      {/* CÁC CỘT LỚP HỌC XẾP NẰM NGANG */}
                      {filteredClassList.map((cls) => (
                        <th 
                          key={cls}
                          className="p-2.5 font-black text-sm text-brand-300 print:text-black border-l border-slate-800 print:border-black min-w-[125px] w-32 bg-slate-950 print:bg-slate-100"
                        >
                          Lớp {cls}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/60 print:divide-black font-sans">
                    {DAYS.map((d) => (
                      <React.Fragment key={d.key}>
                        {[1, 2, 3, 4, 5].map((period, pIdx) => (
                          <tr 
                            key={`${d.key}_${period}`} 
                            id={pIdx === 0 ? `day_row_${d.key}` : undefined}
                            className={`hover:bg-slate-800/40 transition-colors h-14 ${
                              d.key === 'THU_7' ? 'bg-amber-950/10' : ''
                            }`}
                          >
                            {/* CỘT THỨ (Gộp 5 dòng cho mỗi Thứ) */}
                            {pIdx === 0 && (
                              <td 
                                rowSpan={5}
                                className={`p-2 text-center font-black text-xs print:text-black border-r border-slate-800 print:border-black sticky left-0 z-20 min-w-[85px] shadow-xl align-middle ${
                                  d.key === 'THU_7'
                                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                                    : 'bg-slate-950 text-brand-300 print:bg-slate-100'
                                }`}
                              >
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className="text-sm font-black uppercase tracking-wider">{d.label}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">(5 Tiết)</span>
                                </div>
                              </td>
                            )}

                            {/* CỘT TIẾT (Tiết 1 đến 5) */}
                            <td 
                              className="p-2 text-center font-mono font-bold text-slate-300 print:text-black bg-slate-900/95 print:bg-transparent border-r-2 border-brand-500 print:border-black sticky left-[85px] z-20 min-w-[70px] shadow-xl"
                            >
                              Tiết {period}
                            </td>

                            {/* CÁC Ô MÔN HỌC & GIÁO VIÊN CỦA TỪNG LỚP */}
                            {filteredClassList.map((cls) => {
                              const key = `${cls}_${d.key}_${period}`;
                              const entry = scheduleData[key];
                              const matchedSub = entry ? Object.values(SUBJECT_NAME_MAP).find((s) => s.standardName.toLowerCase() === entry.subject.toLowerCase()) : null;

                              return (
                                <td 
                                  key={cls}
                                  className="p-1 border-l border-slate-800 print:border-black min-w-[125px] h-14 align-middle"
                                >
                                  {entry ? (
                                    <div
                                      className="w-full h-full rounded-xl p-1.5 flex flex-col justify-center items-center text-white print:text-black shadow-xs transition-all hover:scale-105"
                                      style={{
                                        backgroundColor: matchedSub ? `${matchedSub.color}25` : '#3b82f625',
                                        borderLeft: `4px solid ${matchedSub ? matchedSub.color : '#3b82f6'}`,
                                      }}
                                    >
                                      <strong
                                        className="text-xs font-bold truncate max-w-full print:text-black leading-tight"
                                        style={{ color: matchedSub ? matchedSub.color : '#60a5fa' }}
                                      >
                                        {entry.subject}
                                      </strong>
                                      <span className="text-[11px] text-slate-300 print:text-gray-700 truncate max-w-full leading-tight mt-0.5 font-medium">
                                        {entry.teacher.replace(/^Cô |^Thầy /i, '')}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-800 print:text-transparent">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Chân trang in ấn */}
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

        {/* ========================================================================================= */}
        {/* TAB 2: XEM & IN TỪNG LỚP LẺ                                                               */}
        {/* ========================================================================================= */}
        {activeTab === 'TIMETABLE_CLASS' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <GraduationCap className="w-4 h-4 text-brand-400" />
                  <span>Chọn Lớp Để Xem:</span>
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
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>In Tờ TKB Lớp {selectedClass}</span>
                </button>
              </div>
            </div>

            {/* Tờ TKB của 1 lớp */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 print:border-b-2 print:border-black">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase">{schoolName}</h3>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 print:text-black mt-1">
                    THỜI KHÓA BIỂU: <span className="text-brand-400 print:text-black underline underline-offset-4">LỚP {selectedClass}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{schoolYear}</p>
                </div>
              </div>

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
                          const matchedSub = cell ? Object.values(SUBJECT_NAME_MAP).find((s) => s.standardName.toLowerCase() === cell.subject.toLowerCase()) : null;

                          return (
                            <td key={d.key} className="p-2 border-l border-slate-800 print:border-black min-w-[130px] h-16 align-middle relative">
                              {cell && cell.subject ? (
                                <div
                                  className="h-full rounded-xl p-2 flex flex-col justify-center items-center text-white print:text-black shadow-sm"
                                  style={{
                                    backgroundColor: matchedSub ? `${matchedSub.color}25` : '#3b82f625',
                                    borderLeft: `4px solid ${matchedSub ? matchedSub.color : '#3b82f6'}`,
                                  }}
                                >
                                  <strong className="font-bold text-xs truncate max-w-full print:text-black" style={{ color: matchedSub ? matchedSub.color : '#60a5fa' }}>
                                    {cell.subject}
                                  </strong>
                                  <span className="text-[11px] font-medium text-slate-300 print:text-gray-700 truncate max-w-full mt-0.5">
                                    GV: {cell.teacher}
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

        {/* ========================================================================================= */}
        {/* TAB 3: IN ĐỒNG LOẠT TOÀN BỘ 32 LỚP (MỖI LỚP 1 TRANG A4 LIÊN TỤC)                         */}
        {/* ========================================================================================= */}
        {activeTab === 'BATCH_PRINT' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
              <div>
                <h3 className="text-sm font-bold text-white">Chế Độ In Đồng Loạt {classList.length} Lớp Học</h3>
                <p className="text-xs text-slate-400">
                  Hệ thống tự động tách trang A4 riêng biệt cho từng lớp để in ra phát cho các lớp dán bảng tin.
                </p>
              </div>

              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ BẤM VÀO ĐÂY ĐỂ IN TẤT CẢ {classList.length} LỚP</span>
              </button>
            </div>

            {/* Danh sách 32 tờ TKB xếp nối tiếp nhau với ngắt trang print */}
            <div className="space-y-8">
              {classList.map((cls) => (
                <div key={cls} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 print:bg-white print:text-black print:border-none print:shadow-none print:p-0 page-break">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800 print:border-b-2 print:border-black">
                    <div>
                      <p className="text-xs uppercase font-bold text-slate-400 print:text-black">{schoolName}</p>
                      <h3 className="text-xl font-black text-white print:text-black">THỜI KHÓA BIỂU: LỚP {cls}</h3>
                      <p className="text-xs text-slate-400 print:text-black">{schoolYear}</p>
                    </div>
                  </div>

                  <table className="w-full text-center border-collapse text-xs print:text-black border border-slate-800 print:border-2 print:border-black">
                    <thead>
                      <tr className="bg-slate-950 print:bg-slate-100 border-b border-slate-800 print:border-black">
                        <th className="p-2 font-bold uppercase w-24 text-left pl-3">Tiết</th>
                        {DAYS.map((d) => (
                          <th key={d.key} className="p-2 font-bold border-l border-slate-800 print:border-black">{d.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5].map((period) => (
                        <tr key={period} className="border-b border-slate-800 print:border-black h-12">
                          <td className="p-2 font-mono font-bold text-left pl-3 bg-slate-950/40 print:bg-transparent">Tiết {period}</td>
                          {DAYS.map((d) => {
                            const entry = scheduleData[`${cls}_${d.key}_${period}`];
                            return (
                              <td key={d.key} className="p-1 border-l border-slate-800 print:border-black">
                                {entry ? (
                                  <div className="text-center">
                                    <strong className="block font-bold text-xs text-brand-300 print:text-black">{entry.subject}</strong>
                                    <span className="text-[10px] text-slate-400 print:text-gray-700">({entry.teacher})</span>
                                  </div>
                                ) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="hidden print:grid grid-cols-2 pt-6 text-center text-xs">
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
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================================= */}
        {/* TAB 4: LỊCH GIẢNG DẠY CỦA GIÁO VIÊN                                                       */}
        {/* ========================================================================================= */}
        {activeTab === 'TIMETABLE_TEACHER' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Chọn Giáo Viên:</span>
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

        {/* ========================================================================================= */}
        {/* TAB 5: BẢNG PHÂN CÔNG CHUYÊN MÔN                                                          */}
        {/* ========================================================================================= */}
        {activeTab === 'ASSIGNMENTS' && (
          <div className="space-y-6">
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

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow flex items-center gap-1.5 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải File Excel / Dán Bảng</span>
                  </button>

                  <button
                    onClick={downloadSampleExcelTemplate}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
                    title="Tải file Excel mẫu để điền"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tải File Mẫu Excel</span>
                  </button>

                  <button
                    onClick={handleReloadPhanBoiChauData}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nạp Mẫu THCS Phan Bội Châu</span>
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

      </main>

      {/* MODAL TRUNG TÂM NHẬP ĐA NGUỒN (EXCEL, CLIPBOARD, MẪU) */}
      <MultiSourceImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={(newTeachers) => {
          setTeacherAssignmentsList(newTeachers);
          alert(`✅ Đã nạp thành công ${newTeachers.length} giáo viên vào hệ thống! Bạn có thể bấm "⚡ XẾP LẠI TKB TỰ ĐỘNG" để tạo thời khóa biểu ngay.`);
        }}
      />
    </div>
  );
};

export default App;
