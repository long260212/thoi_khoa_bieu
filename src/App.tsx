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
import { autoScheduleAllClasses, ScheduleResultEntry, AFTERNOON_DAYS } from './utils/schedulerEngine';
import { MultiSourceImportModal } from './components/ImportCenter/MultiSourceImportModal';
import { downloadSampleExcelTemplate } from './utils/multiSourceImporter';

// 5 ngày trong tuần (Thứ Hai đến Thứ Sáu - HOÀN TOÀN KHÔNG HỌC THỨ BẢY)
const DAYS = [
  { key: 'THU_2', label: 'Thứ Hai', short: 'Thứ 2' },
  { key: 'THU_3', label: 'Thứ Ba', short: 'Thứ 3' },
  { key: 'THU_4', label: 'Thứ Tư', short: 'Thứ 4' },
  { key: 'THU_5', label: 'Thứ Năm', short: 'Thứ 5' },
  { key: 'THU_6', label: 'Thứ Sáu', short: 'Thứ 6' },
];

// Cấu hình các buổi và tiết học: Buổi Sáng (1..5) & Buổi Chiều (1..2)
const SESSIONS_CONFIG = [
  {
    sessionKey: 'SANG',
    sessionLabel: 'SÁNG',
    periods: [
      { p: 1, sessionP: 1, label: 'Tiết 1' },
      { p: 2, sessionP: 2, label: 'Tiết 2' },
      { p: 3, sessionP: 3, label: 'Tiết 3' },
      { p: 4, sessionP: 4, label: 'Tiết 4' },
      { p: 5, sessionP: 5, label: 'Tiết 5' },
    ],
  },
  {
    sessionKey: 'CHIEU',
    sessionLabel: 'CHIỀU',
    periods: [
      { p: 6, sessionP: 1, label: 'Tiết 1' },
      { p: 7, sessionP: 2, label: 'Tiết 2' },
    ],
  },
];

// Danh sách phẳng tất cả các tiết trong tuần
const ALL_PERIOD_ITEMS = [
  { p: 1, session: 'SÁNG', label: 'Tiết 1', display: 'Sáng Tiết 1' },
  { p: 2, session: 'SÁNG', label: 'Tiết 2', display: 'Sáng Tiết 2' },
  { p: 3, session: 'SÁNG', label: 'Tiết 3', display: 'Sáng Tiết 3' },
  { p: 4, session: 'SÁNG', label: 'Tiết 4', display: 'Sáng Tiết 4' },
  { p: 5, session: 'SÁNG', label: 'Tiết 5', display: 'Sáng Tiết 5' },
  { p: 6, session: 'CHIỀU', label: 'Chiều T1', display: 'Chiều Tiết 1' },
  { p: 7, session: 'CHIỀU', label: 'Chiều T2', display: 'Chiều Tiết 2' },
];

// Các tiết học theo từng ngày: Chỉ Thứ 2, 3, 4 có học Buổi Chiều; Thứ 5 & Thứ 6 chiều nghỉ hoàn toàn
const getPeriodsForDay = (dayKey: string) => {
  if (AFTERNOON_DAYS.includes(dayKey)) {
    return ALL_PERIOD_ITEMS;
  }
  return ALL_PERIOD_ITEMS.filter((item) => item.session === 'SÁNG');
};

export const App: React.FC = () => {
  // Chế độ xem:
  // 'MASTER_ALL_CLASSES': Tờ Thời Khóa Biểu Toàn Trường (Tất cả các lớp - Mặc định)
  // 'TIMETABLE_TEACHER': Tờ Thời Khóa Biểu Riêng Của Từng Giáo Viên (Tách biệt hoàn toàn)
  // 'BATCH_PRINT_TEACHER': In đồng loạt toàn bộ tờ TKB của 56 Giáo viên
  // 'TIMETABLE_CLASS': Xem chi tiết từng lớp lẻ
  // 'BATCH_PRINT': Chế độ in đồng loạt 32 lớp
  // 'ASSIGNMENTS': Bảng phân công chuyên môn
  const [activeTab, setActiveTab] = useState<'MASTER_ALL_CLASSES' | 'TIMETABLE_TEACHER' | 'BATCH_PRINT_TEACHER' | 'TIMETABLE_CLASS' | 'BATCH_PRINT' | 'ASSIGNMENTS'>('MASTER_ALL_CLASSES');

  // Bộ lọc khối lớp trong bảng toàn trường
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'ALL' | '6' | '7' | '8' | '9'>('ALL');

  // Thông tin trường học
  const [schoolName, setSchoolName] = useState('TRƯỜNG THCS PHAN BỘI CHÂU');
  const [schoolYear, setSchoolYear] = useState('NĂM HỌC 2026 - 2027 • HỌC KỲ I (ÁP DỤNG TỪ 07/9/2026)');

  // Chế độ giao diện bảng tính (Mặc định là Bảng tính Excel chuẩn giống như hình chụp của người dùng)
  const [tableTheme, setTableTheme] = useState<'EXCEL_LIGHT' | 'EXCEL_DARK' | 'MODERN_CARDS'>('EXCEL_LIGHT');

  // Danh sách phân công chuyên môn
  const [teacherAssignmentsList, setTeacherAssignmentsList] = useState<PhanBoiChauTeacherData[]>(PHAN_BOI_CHAU_DATA);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Danh sách Lớp học và Giáo viên
  const [classList, setClassList] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('6A1');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('Tạ Thanh Thủy');
  const [teacherSearchKeyword, setTeacherSearchKeyword] = useState('');

  // Dữ liệu Thời Khóa Biểu: key dạng `${className}_${day}_${period}` -> { subject, teacher }
  const [scheduleData, setScheduleData] = useState<Record<string, ScheduleResultEntry>>({});
  const [isScheduled, setIsScheduled] = useState(false);
  const [schedulingStats, setSchedulingStats] = useState<{ total: number; time: number } | null>(null);

  // Map tra cứu lịch giảng dạy của từng giáo viên O(1): teacherName -> Record<`${day}_${period}`, { className, subject }>
  // Fix chính xác lỗi regex bóc tách className, dayKey, period (tránh bị nuốt thành "6A2_THU")
  const teacherScheduleMap = useMemo(() => {
    const map: Record<string, Record<string, { className: string; subject: string }>> = {};
    Object.entries(scheduleData).forEach(([key, entry]) => {
      if (!entry || !entry.teacher) return;
      const match = key.match(/^(.+)_(THU_\d+)_(\d+)$/);
      if (match) {
        const [, cls, dayKey, p] = match;
        const tName = entry.teacher.trim().toLowerCase();
        if (!map[tName]) map[tName] = {};
        map[tName][`${dayKey}_${p}`] = { className: cls, subject: entry.subject };
      }
    });
    return map;
  }, [scheduleData]);

  // Tham chiếu và state cho chức năng Kéo chuột cuộn 2 chiều trên toàn bộ màn hình (Global window-level Drag-to-Scroll)
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [scrollTopState, setScrollTopState] = useState(0);

  // Lắng nghe sự kiện chuột toàn cục (window) giúp người dùng giữ chuột kéo ở bất kỳ ô nào, kéo ra cả màn hình vẫn cuộn mượt mà
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!tableContainerRef.current) return;
      e.preventDefault();
      const x = e.pageX - tableContainerRef.current.offsetLeft;
      const y = e.pageY - tableContainerRef.current.offsetTop;
      const walkX = (x - startX) * 1.5;
      const walkY = (y - startY) * 1.5;
      tableContainerRef.current.scrollLeft = scrollLeftState - walkX;
      tableContainerRef.current.scrollTop = scrollTopState - walkY;
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, startX, startY, scrollLeftState, scrollTopState]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !tableContainerRef.current) return; // Chỉ nhận chuột trái
    setIsDragging(true);
    setStartX(e.pageX - tableContainerRef.current.offsetLeft);
    setStartY(e.pageY - tableContainerRef.current.offsetTop);
    setScrollLeftState(tableContainerRef.current.scrollLeft);
    setScrollTopState(tableContainerRef.current.scrollTop);
  };

  // Cuộn dọc trực tiếp đến Thứ được chọn
  const scrollToDayVertical = (dayKey: string) => {
    const el = document.getElementById(`day_row_${dayKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTopTable = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottomTable = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        top: tableContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
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

    // Từng dòng: Thứ 2 đến Thứ 4 (Sáng + Chiều); Thứ 5 & 6 (Chỉ Sáng)
    DAYS.forEach((d) => {
      getPeriodsForDay(d.key).forEach((item) => {
        const row = [d.label, item.display];
        classList.forEach((cls) => {
          const entry = scheduleData[`${cls}_${d.key}_${item.p}`];
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

  // Xuất Tờ Thời Khóa Biểu Riêng Của Giáo Viên Sang File Excel (.xlsx)
  const handleExportSingleTeacherExcel = (teacherName: string) => {
    const wb = XLSX.utils.book_new();
    const rows: any[] = [];
    rows.push([schoolName.toUpperCase()]);
    rows.push([`THỜI KHÓA BIỂU CÁ NHÂN GIÁO VIÊN: ${teacherName.toUpperCase()}`]);
    rows.push([schoolYear]);
    rows.push(['(Áp dụng lịch học 5 ngày: Thứ Hai đến Thứ Sáu • Thứ Bảy Nghỉ)']);
    rows.push([]);

    // Header: Buổi, Tiết, Thứ Hai -> Thứ Sáu
    rows.push(['Buổi', 'Tiết', ...DAYS.map((d) => d.label)]);

    SESSIONS_CONFIG.forEach((s) => {
      s.periods.forEach((item) => {
        const row = [s.sessionLabel, item.label];
        DAYS.forEach((d) => {
          const sched = teacherScheduleMap[teacherName.toLowerCase()]?.[`${d.key}_${item.p}`];
          if (sched) {
            row.push(`${sched.subject} (Lớp ${sched.className})`);
          } else {
            row.push('-');
          }
        });
        rows.push(row);
      });
    });

    const info = teacherAssignmentsList.find(t => t.name.toLowerCase() === teacherName.toLowerCase());
    rows.push([]);
    rows.push(['Thông tin chuyên môn:', `Chức vụ: ${info?.duty || 'Giáo viên'}`, `Định mức: ${info?.quota || 19} tiết/tuần`]);
    rows.push(['Tổng số tiết dạy trong tuần:', Object.keys(teacherScheduleMap[teacherName.toLowerCase()] || {}).length]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `TKB_${teacherName.replace(/\s+/g, '_').slice(0, 25)}`);
    XLSX.writeFile(wb, `TKB_GiaoVien_${teacherName.replace(/\s+/g, '_')}.xlsx`);
  };

  // Xuất Toàn Bộ Thời Khóa Biểu 56 Giáo Viên Ra 1 File Excel (Tổng hợp từng giáo viên)
  const handleExportAllTeachersExcel = () => {
    const wb = XLSX.utils.book_new();
    const masterTeacherRows: any[] = [];
    masterTeacherRows.push([schoolName.toUpperCase()]);
    masterTeacherRows.push(['THỜI KHÓA BIỂU TỔNG HỢP TOÀN BỘ GIÁO VIÊN (LỊCH 5 NGÀY THỨ 2 - THỨ 6)']);
    masterTeacherRows.push([schoolYear]);
    masterTeacherRows.push([]);

    const header = ['STT', 'Họ và tên Giáo viên', 'Chức vụ', 'Định mức', 'Số tiết dạy'];
    DAYS.forEach(d => {
      ALL_PERIOD_ITEMS.forEach(p => header.push(`${d.short} ${p.label}`));
    });
    masterTeacherRows.push(header);

    teacherAssignmentsList.forEach((t, idx) => {
      const tSched = teacherScheduleMap[t.name.toLowerCase()] || {};
      const row = [idx + 1, t.name, t.duty || 'GV', t.quota, Object.keys(tSched).length];
      DAYS.forEach(d => {
        ALL_PERIOD_ITEMS.forEach(p => {
          const item = tSched[`${d.key}_${p.p}`];
          row.push(item ? `${item.subject} (${item.className})` : '');
        });
      });
      masterTeacherRows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(masterTeacherRows);
    XLSX.utils.book_append_sheet(wb, ws, 'TKB_Tat_Ca_Giao_Vien');
    XLSX.writeFile(wb, `TKB_ToanBo_GiaoVien_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

        {/* THANH TAB CHỨC NĂNG CHÍNH */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <nav className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
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

            {/* TAB 2: TỜ TKB RIÊNG TỪNG GIÁO VIÊN (TÁCH BIỆT HOÀN TOÀN) */}
            <button
              onClick={() => setActiveTab('TIMETABLE_TEACHER')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'TIMETABLE_TEACHER'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. ⭐ TKB Riêng Cho Giáo Viên (Tách Biệt)</span>
            </button>

            {/* TAB 3: IN ĐỒNG LOẠT TOÀN BỘ 56 GIÁO VIÊN */}
            <button
              onClick={() => setActiveTab('BATCH_PRINT_TEACHER')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'BATCH_PRINT_TEACHER'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>3. In TKB 56 Giáo Viên (A4 Rời)</span>
            </button>

            {/* TAB 4: XEM & IN TỪNG LỚP LẺ */}
            <button
              onClick={() => setActiveTab('TIMETABLE_CLASS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'TIMETABLE_CLASS'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>4. Xem TKB Từng Lớp Lẻ</span>
            </button>

            {/* TAB 5: IN ĐỒNG LOẠT 32 LỚP */}
            <button
              onClick={() => setActiveTab('BATCH_PRINT')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'BATCH_PRINT'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>5. In Đồng Loạt {classList.length} Lớp (A4)</span>
            </button>

            {/* TAB 6: PHÂN CÔNG CHUYÊN MÔN */}
            <button
              onClick={() => setActiveTab('ASSIGNMENTS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'ASSIGNMENTS'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>6. Phân Công ({teacherAssignmentsList.length} GV)</span>
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

              {/* THANH ĐIỀU HƯỚNG & TÙY CHỈNH CHẾ ĐỘ XEM */}
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

                {/* 2. Chọn Giao Diện Bảng Tính (Chuẩn Excel Như Hình) */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
                    <button
                      onClick={() => setTableTheme('EXCEL_LIGHT')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        tableTheme === 'EXCEL_LIGHT'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Bảng Excel Chuẩn (Như Hình)</span>
                    </button>

                    <button
                      onClick={() => setTableTheme('EXCEL_DARK')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        tableTheme === 'EXCEL_DARK'
                          ? 'bg-slate-800 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Excel Dark Mode</span>
                    </button>

                    <button
                      onClick={() => setTableTheme('MODERN_CARDS')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        tableTheme === 'MODERN_CARDS'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Thẻ Màu Sắc</span>
                    </button>
                  </div>

                  {/* Thanh điều hướng cuộn nhanh trên toàn màn hình */}
                  <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 mr-1">Cuộn nhanh:</span>
                    <button
                      onClick={scrollToTopTable}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                      title="Cuộn lên đầu bảng"
                    >
                      🔼 Đầu Bảng
                    </button>
                    {DAYS.map((d) => (
                      <button
                        key={d.key}
                        onClick={() => scrollToDayVertical(d.key)}
                        className="px-2 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition-all"
                      >
                        {d.short}
                      </button>
                    ))}
                    <button
                      onClick={scrollToBottomTable}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                      title="Cuộn xuống cuối bảng"
                    >
                      🔽 Dưới Cùng
                    </button>
                  </div>

                  {/* Nút tải File Excel chuẩn */}
                  <button
                    onClick={handleExportExcel}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-105"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Tải File Excel Y Hệt Hình (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* BẢNG THỜI KHÓA BIỂU TOÀN TRƯỜNG CHUẨN MA TRẬN EXCEL (Y HỆT HÌNH ẢNH) */}
              <div 
                ref={tableContainerRef}
                onMouseDown={handleMouseDown}
                className={`overflow-auto rounded-xl border-2 select-none max-h-[82vh] transition-colors ${
                  tableTheme === 'EXCEL_LIGHT'
                    ? 'bg-white text-slate-900 border-slate-300 shadow-xl'
                    : tableTheme === 'EXCEL_DARK'
                    ? 'bg-slate-950 text-slate-200 border-slate-700 shadow-xl'
                    : 'bg-slate-900 text-slate-100 border-slate-800 shadow-2xl'
                } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                title="Giữ chuột trái ở bất kỳ ô nào rồi kéo chuột trên toàn màn hình để cuộn bảng nhanh"
              >
                <table className={`w-full text-left border-collapse select-none ${tableTheme === 'EXCEL_LIGHT' ? 'text-slate-900' : 'text-slate-200'} text-[12px] font-sans`}>
                  {/* HÀNG TIÊU ĐỀ: Thứ | Tiết | Lớp 6A1 | Lớp 6A2 ... */}
                  <thead className={`sticky top-0 z-30 font-bold border-b-2 shadow-sm ${
                    tableTheme === 'EXCEL_LIGHT'
                      ? 'bg-[#f8fafc] text-slate-800 border-slate-300'
                      : 'bg-slate-950 text-white border-slate-700'
                  }`}>
                    <tr>
                      {/* Cột Thứ cố định */}
                      <th className={`p-2.5 uppercase w-24 min-w-[90px] text-center sticky left-0 z-40 border-r border-b ${
                        tableTheme === 'EXCEL_LIGHT'
                          ? 'bg-[#f1f5f9] text-slate-800 border-slate-300'
                          : 'bg-slate-900 text-white border-slate-700'
                      }`}>
                        Thứ
                      </th>
                      {/* Cột Tiết cố định */}
                      <th className={`p-2.5 uppercase w-20 min-w-[75px] text-center sticky left-[90px] z-40 border-r-2 border-b ${
                        tableTheme === 'EXCEL_LIGHT'
                          ? 'bg-[#f1f5f9] text-slate-800 border-slate-300 border-r-emerald-600'
                          : 'bg-slate-950 text-white border-slate-700 border-r-emerald-500'
                      }`}>
                        Tiết
                      </th>
                      {/* Các cột Lớp học */}
                      {filteredClassList.map((cls) => (
                        <th 
                          key={cls}
                          className={`p-2.5 text-center font-bold border-l border-b min-w-[140px] w-40 whitespace-nowrap ${
                            tableTheme === 'EXCEL_LIGHT'
                              ? 'bg-[#f8fafc] text-slate-900 border-slate-300'
                              : 'bg-slate-950 text-brand-300 border-slate-700'
                          }`}
                        >
                          Lớp {cls}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* THÂN BẢNG: Thứ 2, 3, 4 (Sáng + Chiều); Thứ 5 & 6 (Chỉ học Sáng, không có Chiều) */}
                  <tbody>
                    {DAYS.map((d) => (
                      <React.Fragment key={d.key}>
                        {getPeriodsForDay(d.key).map((item) => (
                          <tr 
                            key={`${d.key}_${item.p}`} 
                            id={item.p === 1 ? `day_row_${d.key}` : undefined}
                            className={`transition-colors h-10 ${
                              tableTheme === 'EXCEL_LIGHT'
                                ? item.session === 'CHIỀU' ? 'bg-amber-50/20 hover:bg-emerald-50/60' : 'hover:bg-emerald-50/60'
                                : item.session === 'CHIỀU' ? 'bg-slate-950/80 hover:bg-slate-800/60' : 'hover:bg-slate-800/60'
                            }`}
                          >
                            {/* CỘT 1: THỨ (Hiển thị đầy đủ tên thứ trên từng dòng như trong Excel) */}
                            <td className={`p-2 text-center font-semibold border-r border-b min-w-[90px] sticky left-0 z-20 whitespace-nowrap ${
                              tableTheme === 'EXCEL_LIGHT'
                                ? 'bg-white text-slate-800 border-slate-300'
                                : 'bg-slate-950 text-slate-200 border-slate-700'
                            }`}>
                              {d.label}
                            </td>

                            {/* CỘT 2: TIẾT (Tiết 1..5 Sáng, Chiều T1..T2) */}
                            <td className={`p-2 text-center font-medium border-r-2 border-b min-w-[85px] sticky left-[90px] z-20 whitespace-nowrap ${
                              tableTheme === 'EXCEL_LIGHT'
                                ? 'bg-white text-slate-800 border-slate-300 border-r-emerald-600'
                                : 'bg-slate-950 text-slate-200 border-slate-700 border-r-emerald-500'
                            }`}>
                              <span className={item.session === 'CHIỀU' ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                                {item.label} {item.session === 'CHIỀU' ? '(Chiều)' : ''}
                              </span>
                            </td>

                            {/* CỘT CÁC LỚP HỌC: Môn Học (Giáo Viên) */}
                            {filteredClassList.map((cls) => {
                              const key = `${cls}_${d.key}_${item.p}`;
                              const entry = scheduleData[key];
                              const matchedSub = entry ? Object.values(SUBJECT_NAME_MAP).find((s) => s.standardName.toLowerCase() === entry.subject.toLowerCase()) : null;

                              return (
                                <td 
                                  key={cls}
                                  className={`p-2 border-l border-b min-w-[140px] align-middle whitespace-nowrap ${
                                    tableTheme === 'EXCEL_LIGHT'
                                      ? 'border-slate-300 text-slate-800 hover:outline hover:outline-2 hover:outline-emerald-500 hover:bg-emerald-50/70'
                                      : 'border-slate-800 text-slate-200 hover:bg-slate-800/80'
                                  }`}
                                >
                                  {entry ? (
                                    tableTheme === 'MODERN_CARDS' ? (
                                      <div
                                        className="w-full h-full rounded-lg p-1 flex flex-col justify-center items-center text-white shadow-xs"
                                        style={{
                                          backgroundColor: matchedSub ? `${matchedSub.color}25` : '#3b82f625',
                                          borderLeft: `3px solid ${matchedSub ? matchedSub.color : '#3b82f6'}`,
                                        }}
                                      >
                                        <strong className="text-xs font-bold leading-tight" style={{ color: matchedSub ? matchedSub.color : '#60a5fa' }}>
                                          {entry.subject}
                                        </strong>
                                        <span className="text-[11px] text-slate-300 leading-tight mt-0.5">
                                          {entry.teacher}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="font-medium">
                                        {entry.subject} ({entry.teacher})
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-transparent">-</span>
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
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{schoolName}</h3>
                  <h2 className="text-2xl font-black text-orange-400 print:text-black tracking-tight flex items-center gap-2 mt-1">
                    THỜI KHOÁ BIỂU {selectedClass} <span className="text-sm font-normal text-slate-400 print:text-gray-600">(Áp dụng từ ngày 07/09/2026)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Lịch học 5 ngày (Thứ 2 đến Thứ 6) • Thứ 7 Nghỉ</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border-2 border-orange-500/50 print:border-2 print:border-black shadow-xl">
                <table className="w-full text-center border-collapse text-xs print:text-black border border-slate-700 print:border-2 print:border-black">
                  <thead>
                    <tr className="bg-[#ea580c] text-white print:bg-[#ea580c] print:text-white font-black text-sm">
                      <th className="p-3 uppercase w-24 text-center border border-orange-600">
                        Buổi
                      </th>
                      <th className="p-3 uppercase w-20 text-center border border-orange-600">
                        Tiết
                      </th>
                      {DAYS.map((d) => (
                        <th key={d.key} className="p-3 border border-orange-600 font-bold">
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SESSIONS_CONFIG.map((s) => (
                      <React.Fragment key={s.sessionKey}>
                        {s.periods.map((item, pIdx) => (
                          <tr key={item.p} className="border-b border-slate-800 print:border-black hover:bg-slate-800/20 transition-colors h-16">
                            {pIdx === 0 && (
                              <td
                                rowSpan={s.periods.length}
                                className="p-3 font-black text-sm text-center bg-slate-950/70 print:bg-transparent border-r-2 border-slate-700 print:border-black align-middle uppercase text-orange-400 print:text-black"
                              >
                                {s.sessionLabel}
                              </td>
                            )}
                            <td className="p-3 font-mono font-bold text-center bg-slate-950/40 print:bg-transparent border-r border-slate-700 print:border-black w-20">
                              {item.sessionP}
                            </td>
                            {DAYS.map((d) => {
                              const cellKey = `${selectedClass}_${d.key}_${item.p}`;
                              const cell = scheduleData[cellKey];
                              const matchedSub = cell ? Object.values(SUBJECT_NAME_MAP).find((sm) => sm.standardName.toLowerCase() === cell.subject.toLowerCase()) : null;

                              return (
                                <td key={d.key} className="p-2 border-l border-slate-800 print:border-black min-w-[130px] h-16 align-middle relative">
                                  {s.sessionKey === 'CHIEU' && !AFTERNOON_DAYS.includes(d.key) ? (
                                    <span className="text-slate-600 print:text-slate-400 text-[11px] italic font-medium">Nghỉ chiều</span>
                                  ) : cell && cell.subject ? (
                                    <div
                                      className="h-full rounded-xl p-2 flex flex-col justify-center items-center text-white print:text-black shadow-sm"
                                      style={{
                                        backgroundColor: matchedSub ? `${matchedSub.color}25` : '#ea580c25',
                                        borderLeft: `4px solid ${matchedSub ? matchedSub.color : '#ea580c'}`,
                                      }}
                                    >
                                      <strong className="font-bold text-xs truncate max-w-full print:text-black" style={{ color: matchedSub ? matchedSub.color : '#fb923c' }}>
                                        {cell.subject}
                                      </strong>
                                      <span className="text-[11px] font-medium text-slate-300 print:text-gray-700 truncate max-w-full mt-0.5">
                                        {cell.teacher}
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
                      </React.Fragment>
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
                      {ALL_PERIOD_ITEMS.map((item) => (
                        <tr key={item.p} className="border-b border-slate-800 print:border-black h-12">
                          <td className="p-2 font-mono font-bold text-left pl-3 bg-slate-950/40 print:bg-transparent w-28">
                            {item.display}
                          </td>
                          {DAYS.map((d) => {
                            const entry = scheduleData[`${cls}_${d.key}_${item.p}`];
                            return (
                              <td key={d.key} className="p-1 border-l border-slate-800 print:border-black">
                                {item.session === 'CHIỀU' && !AFTERNOON_DAYS.includes(d.key) ? (
                                  <span className="text-slate-600 print:text-slate-400 text-[10px] italic">Nghỉ chiều</span>
                                ) : entry ? (
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
        {/* TAB 2: TỜ THỜI KHÓA BIỂU RIÊNG TỪNG GIÁO VIÊN (TÁCH BIỆT HOÀN TOÀN)                       */}
        {/* ========================================================================================= */}
        {activeTab === 'TIMETABLE_TEACHER' && (() => {
          const currentTeacherInfo = teacherAssignmentsList.find(t => t.name.toLowerCase() === selectedTeacher.toLowerCase()) || {
            name: selectedTeacher,
            duty: 'Giáo viên',
            quota: 19,
            rawTeachingText: '',
            stt: 0,
          };

          const tSched = teacherScheduleMap[selectedTeacher.toLowerCase()] || {};
          const totalPeriods = Object.keys(tSched).length;

          // Lấy danh sách các lớp dạy của giáo viên này
          const distinctClasses = Array.from(new Set(Object.values(tSched).map(v => v.className))).sort();

          // Lọc danh sách giáo viên theo từ khóa tìm kiếm
          const filteredTeachers = teacherAssignmentsList.filter(t => 
            t.name.toLowerCase().includes(teacherSearchKeyword.toLowerCase()) ||
            (t.duty && t.duty.toLowerCase().includes(teacherSearchKeyword.toLowerCase())) ||
            t.rawTeachingText.toLowerCase().includes(teacherSearchKeyword.toLowerCase())
          );

          return (
            <div className="space-y-6">
              {/* THANH ĐIỀU HƯỚNG VÀ CHỌN GIÁO VIÊN */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Chọn Giáo Viên:</span>
                  </div>

                  {/* Ô tìm kiếm nhanh tên giáo viên */}
                  <input
                    type="text"
                    placeholder="🔍 Gõ tên GV để tìm..."
                    value={teacherSearchKeyword}
                    onChange={(e) => setTeacherSearchKeyword(e.target.value)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
                  />

                  {/* Dropdown danh sách 56 giáo viên */}
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 max-w-xs"
                  >
                    {filteredTeachers.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.stt}. {t.name} ({t.duty || 'GV'} - {t.quota} tiết)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Các nút hành động riêng cho giáo viên */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleExportSingleTeacherExcel(selectedTeacher)}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all"
                    title="Tải riêng file Excel thời khóa biểu của thầy cô này"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Tải Excel TKB Thầy/Cô</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('BATCH_PRINT_TEACHER')}
                    className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In TKB 56 GV (A4 Rời)</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In Tờ TKB Cá Nhân (A4)</span>
                  </button>
                </div>
              </div>

              {/* THẺ THÔNG TIN HỒ SƠ GIẢNG DẠY CỦA GIÁO VIÊN */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/50 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/30">
                    {selectedTeacher.split(' ').slice(-1)[0][0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-white">{selectedTeacher}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        {currentTeacherInfo.duty || 'Giáo viên'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Phân công: <strong className="text-slate-200">{currentTeacherInfo.rawTeachingText}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Định mức quy định</span>
                    <span className="text-lg font-black text-indigo-400">{currentTeacherInfo.quota} tiết/tuần</span>
                  </div>

                  <div className="bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Đã xếp trong TKB</span>
                    <span className="text-lg font-black text-emerald-400">{totalPeriods} tiết ({Math.round((totalPeriods / (currentTeacherInfo.quota || 1)) * 100)}%)</span>
                  </div>

                  <div className="bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Số lớp giảng dạy</span>
                    <span className="text-lg font-black text-purple-400">{distinctClasses.length} lớp ({distinctClasses.join(', ')})</span>
                  </div>
                </div>
              </div>

              {/* TỜ THỜI KHÓA BIỂU CÁ NHÂN GIÁO VIÊN (CHUẨN KHỔ A4 BỘ GIÁO DỤC & ĐÀO TẠO) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
                {/* Header Văn Bản Chuẩn Quốc Hiệu & Tiêu Ngữ */}
                <div className="border-b-2 border-slate-800 print:border-black pb-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400 print:text-black">UBND PHƯỜNG BẢO LỘC</p>
                      <p className="text-xs font-black uppercase text-brand-400 print:text-black">{schoolName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-300 print:text-black">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                      <p className="text-xs italic text-slate-400 print:text-black">Độc lập - Tự do - Hạnh phúc</p>
                    </div>
                  </div>

                  <div className="text-center mt-4">
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase print:text-black">
                      THỜI KHÓA BIỂU CÁ NHÂN GIÁO VIÊN
                    </h2>
                    <p className="text-sm font-bold text-indigo-400 print:text-black mt-1">
                      Giáo viên: <span className="underline underline-offset-4 uppercase">{selectedTeacher}</span> • Chức vụ: {currentTeacherInfo.duty || 'Giáo viên'} • Định mức: {currentTeacherInfo.quota} tiết/tuần
                    </p>
                    <p className="text-xs text-slate-400 print:text-black mt-0.5">{schoolYear}</p>
                  </div>
                </div>

                {/* MA TRẬN LỊCH GIẢNG DẠY CỦA GIÁO VIÊN */}
                <div className="overflow-x-auto rounded-2xl border-2 border-slate-800 print:border-2 print:border-black">
                  <table className="w-full text-center border-collapse text-xs print:text-black">
                    <thead>
                      <tr className="bg-slate-950 print:bg-slate-100 border-b-2 border-slate-800 print:border-b-2 print:border-black">
                        <th className="p-3 font-black text-slate-200 print:text-black uppercase w-20 text-center bg-slate-950 print:bg-slate-200">
                          Buổi
                        </th>
                        <th className="p-3 font-black text-slate-200 print:text-black uppercase w-24 text-center bg-slate-950 print:bg-slate-200">
                          Tiết
                        </th>
                        {DAYS.map((d) => (
                          <th key={d.key} className="p-3 font-black text-slate-200 print:text-black border-l border-slate-800 print:border-black text-sm uppercase">
                            {d.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 print:divide-black">
                      {SESSIONS_CONFIG.map((s) => (
                        <React.Fragment key={s.sessionKey}>
                          <tr className="bg-slate-950/80 font-bold text-slate-300 print:text-black text-left border-y border-slate-800 print:border-black">
                            <td colSpan={2 + DAYS.length} className="py-2 px-4 text-indigo-300 print:text-black text-xs font-bold uppercase tracking-wider">
                              {s.sessionKey === 'SANG' ? '🌅 Buổi Sáng (Tiết 1 đến Tiết 5)' : '🌇 Buổi Chiều (Tiết 1 đến Tiết 2)'}
                            </td>
                          </tr>
                          {s.periods.map((item, pIdx) => (
                            <tr key={item.p} className="hover:bg-slate-800/30 transition-colors h-14">
                              {pIdx === 0 && (
                                <td
                                  rowSpan={s.periods.length}
                                  className="p-2 font-bold text-slate-400 print:text-black text-center bg-slate-950/60 print:bg-transparent border-r border-slate-800 print:border-black align-middle uppercase"
                                >
                                  {s.sessionLabel}
                                </td>
                              )}
                              <td className="p-2 font-mono font-bold text-slate-300 print:text-black text-center bg-slate-950/80 print:bg-transparent border-r border-slate-800 print:border-black">
                                {item.label}
                              </td>
                              {DAYS.map((d) => {
                                const schedItem = tSched[`${d.key}_${item.p}`];
                                const matchedSub = schedItem ? Object.values(SUBJECT_NAME_MAP).find((sm) => sm.standardName.toLowerCase() === schedItem.subject.toLowerCase()) : null;

                                return (
                                  <td key={d.key} className="p-2 border-l border-slate-800 print:border-black min-w-[130px] align-middle">
                                    {s.sessionKey === 'CHIEU' && !AFTERNOON_DAYS.includes(d.key) ? (
                                      <span className="text-slate-600 print:text-slate-400 text-[11px] italic font-medium">Nghỉ chiều</span>
                                    ) : schedItem ? (
                                      <div
                                        className="w-full h-full rounded-xl p-2 text-white print:text-black flex flex-col justify-center items-center shadow-md transition-all hover:scale-105"
                                        style={{
                                          backgroundColor: matchedSub ? `${matchedSub.color}25` : '#6366f125',
                                          borderLeft: `4px solid ${matchedSub ? matchedSub.color : '#6366f1'}`,
                                          borderRight: `1px solid ${matchedSub ? `${matchedSub.color}40` : '#6366f140'}`,
                                        }}
                                      >
                                        <strong className="text-xs font-black truncate max-w-full leading-tight" style={{ color: matchedSub ? matchedSub.color : '#818cf8' }}>
                                          {schedItem.subject}
                                        </strong>
                                        <span className="text-xs font-bold text-white print:text-black bg-slate-900/80 print:bg-slate-200 px-2 py-0.5 rounded-md mt-1">
                                          Lớp {schedItem.className}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-700 print:text-gray-300 italic text-[11px]">-</span>
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

                {/* THỐNG KÊ TIẾT DẠY & CHỮ KÝ 3 BÊN */}
                <div className="pt-4 flex flex-wrap items-center justify-between text-xs text-slate-400 print:text-black border-t border-slate-800 print:border-black">
                  <div>
                    <p>• Tổng số tiết đã bố trí: <strong className="text-white print:text-black font-bold">{totalPeriods} tiết</strong> (Định mức: {currentTeacherInfo.quota} tiết/tuần)</p>
                    <p>• Các lớp đảm nhận: <strong className="text-white print:text-black font-bold">{distinctClasses.join(', ')}</strong></p>
                  </div>
                  <div className="italic text-slate-500 print:text-black">
                    Thời khóa biểu áp dụng từ ngày 07 tháng 09 năm 2026
                  </div>
                </div>

                {/* KHUNG KÝ TÊN DUYỆT 3 BÊN CHUẨN A4 */}
                <div className="grid grid-cols-3 pt-6 text-center text-xs print:text-black">
                  <div>
                    <p className="font-bold uppercase text-slate-300 print:text-black">NGƯỜI LẬP BIỂU</p>
                    <p className="italic text-slate-500 print:text-gray-600 mt-0.5">(Ký và ghi rõ họ tên)</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-300 print:text-black">GIÁO VIÊN KÝ NHẬN</p>
                    <p className="italic text-slate-500 print:text-gray-600 mt-0.5">(Ký và ghi rõ họ tên)</p>
                    <p className="font-bold text-white print:text-black mt-12">{selectedTeacher}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-300 print:text-black">HIỆU TRƯỞNG DUYỆT</p>
                    <p className="italic text-slate-500 print:text-gray-600 mt-0.5">(Ký tên và đóng dấu)</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================================= */}
        {/* TAB 3: IN ĐỒNG LOẠT TOÀN BỘ 56 TỜ TKB GIÁO VIÊN (MỖI GV 1 TRANG A4 RỜI LIÊN TỤC)          */}
        {/* ========================================================================================= */}
        {activeTab === 'BATCH_PRINT_TEACHER' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
              <div>
                <h3 className="text-sm font-bold text-white">Chế Độ In Đồng Loạt {teacherAssignmentsList.length} Tờ TKB Giáo Viên</h3>
                <p className="text-xs text-slate-400">
                  Hệ thống tự động tách trang A4 riêng biệt cho từng thầy cô để in phát trước năm học mới.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportAllTeachersExcel}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất Excel Tất Cả GV</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-5 py-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>BẤM VÀO ĐÂY ĐỂ IN 56 TRANG A4</span>
                </button>
              </div>
            </div>

            {/* Danh sách 56 tờ TKB cá nhân với ngắt trang print */}
            <div className="space-y-8 print:space-y-0">
              {teacherAssignmentsList.map((t, idx) => {
                const tSched = teacherScheduleMap[t.name.toLowerCase()] || {};
                const total = Object.keys(tSched).length;

                return (
                  <div
                    key={t.name}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:p-0 page-break"
                  >
                    {/* Header Văn Bản */}
                    <div className="border-b-2 border-slate-800 print:border-black pb-3">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-400 print:text-black">UBND PHƯỜNG BẢO LỘC</p>
                          <p className="text-xs font-black uppercase text-brand-400 print:text-black">{schoolName}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-300 print:text-black">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                          <p className="text-xs italic text-slate-400 print:text-black">Độc lập - Tự do - Hạnh phúc</p>
                        </div>
                      </div>

                      <div className="text-center mt-3">
                        <h2 className="text-xl font-black text-white tracking-tight uppercase print:text-black">
                          THỜI KHÓA BIỂU CÁ NHÂN GIÁO VIÊN ({idx + 1}/{teacherAssignmentsList.length})
                        </h2>
                        <p className="text-sm font-bold text-teal-400 print:text-black mt-0.5">
                          Thầy / Cô: <span className="underline uppercase">{t.name}</span> • Chức vụ: {t.duty || 'GV'} • Định mức: {t.quota} tiết/tuần
                        </p>
                      </div>
                    </div>

                    {/* Ma trận bảng */}
                    <table className="w-full text-center border-collapse text-xs print:text-black border border-slate-800 print:border-black">
                      <thead>
                        <tr className="bg-slate-950 print:bg-slate-100 border-b border-slate-800 print:border-black">
                          <th className="p-2 font-black text-slate-300 print:text-black w-24">Tiết / Buổi</th>
                          {DAYS.map((d) => (
                            <th key={d.key} className="p-2 font-bold text-slate-200 print:text-black border-l border-slate-800 print:border-black">
                              {d.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 print:divide-black">
                        {ALL_PERIOD_ITEMS.map((item) => (
                          <tr key={item.p} className="h-12">
                            <td className="p-2 font-mono font-bold text-slate-400 print:text-black text-center bg-slate-950/40 print:bg-transparent border-r border-slate-800 print:border-black w-24">
                              {item.display}
                            </td>
                            {DAYS.map((d) => {
                              const schedItem = tSched[`${d.key}_${item.p}`];
                              return (
                                <td key={d.key} className="p-1 border-l border-slate-800 print:border-black">
                                  {item.session === 'CHIỀU' && !AFTERNOON_DAYS.includes(d.key) ? (
                                    <span className="text-slate-600 print:text-slate-400 text-[10px] italic">Nghỉ chiều</span>
                                  ) : schedItem ? (
                                    <div className="text-center">
                                      <strong className="block font-bold text-xs text-indigo-300 print:text-black">{schedItem.subject}</strong>
                                      <span className="text-[11px] text-slate-300 print:text-gray-700 font-bold">Lớp {schedItem.className}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-700 print:text-gray-300">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="pt-2 flex justify-between text-xs text-slate-400 print:text-black">
                      <p>Tổng số tiết: <strong>{total} tiết</strong> ({t.rawTeachingText})</p>
                      <p className="italic">Năm học 2026 - 2027</p>
                    </div>

                    <div className="grid grid-cols-3 pt-6 text-center text-xs print:text-black">
                      <div>
                        <p className="font-bold uppercase">NGƯỜI LẬP BIỂU</p>
                        <p className="italic text-gray-500">(Ký, họ tên)</p>
                      </div>
                      <div>
                        <p className="font-bold uppercase">GIÁO VIÊN KÝ NHẬN</p>
                        <p className="italic text-gray-500">(Ký, họ tên)</p>
                        <p className="font-bold mt-10">{t.name}</p>
                      </div>
                      <div>
                        <p className="font-bold uppercase">HIỆU TRƯỞNG DUYỆT</p>
                        <p className="italic text-gray-500">(Ký, đóng dấu)</p>
                      </div>
                    </div>
                  </div>
                );
              })}
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
