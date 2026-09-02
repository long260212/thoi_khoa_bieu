import React from 'react';
import { 
  CalendarDays, 
  Table, 
  Sparkles, 
  FileSpreadsheet, 
  Users, 
  Database, 
  GraduationCap, 
  Layers, 
  RotateCcw,
  Zap
} from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { ActiveView } from '../../types/state';
import { exportTimetableToExcel } from '../../utils/excelParser';

interface NavbarProps {
  onOpenMasterData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMasterData }) => {
  const activeView = useScheduleStore((state) => state.activeView);
  const setActiveView = useScheduleStore((state) => state.setActiveView);
  const teachers = useScheduleStore((state) => state.teachers);
  const classes = useScheduleStore((state) => state.classes);
  const subjects = useScheduleStore((state) => state.subjects);
  const assignments = useScheduleStore((state) => state.assignments);
  const schedule = useScheduleStore((state) => state.schedule);
  const isGenerating = useScheduleStore((state) => state.isGenerating);
  const startAutoGenerate = useScheduleStore((state) => state.startAutoGenerate);
  const loadMockData = useScheduleStore((state) => state.loadMockData);

  const teacherCount = Object.keys(teachers).length;
  const classCount = Object.keys(classes).length;
  const totalAssignedPeriods = Object.values(assignments).reduce((sum, a) => sum + (a.periodsPerWeek || 0), 0);
  const scheduledCount = Object.keys(schedule).length;

  const handleExport = () => {
    exportTimetableToExcel(schedule, classes, teachers, subjects);
  };

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'DATA_ENTRY',
      label: 'Nhập Liệu Phân Công (Excel Grid)',
      icon: <Table className="w-4 h-4" />,
      badge: `${Object.keys(assignments).length}`,
    },
    {
      id: 'TIMETABLE_CLASS',
      label: 'TKB Theo Lớp',
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      id: 'TIMETABLE_TEACHER',
      label: 'TKB Giáo Viên',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'MASTER_MATRIX',
      label: 'Ma Trận Tổng Thể',
      icon: <Layers className="w-4 h-4" />,
    },
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-brand-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                EduTimetable <span className="text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30 font-mono">PRO v2.0</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">Xếp Thời Khóa Biểu Tự Động & Phân Công Chuyên Môn</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions & Stats */}
        <div className="flex items-center gap-2.5">
          {/* Real-time stats pill */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Users className="w-3.5 h-3.5 text-brand-400" />
              <span>GV: <strong className="text-white">{teacherCount}</strong></span>
            </div>
            <div className="w-px h-3.5 bg-slate-800" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lớp: <strong className="text-white">{classCount}</strong></span>
            </div>
            <div className="w-px h-3.5 bg-slate-800" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
              <span>Tổng tiết: <strong className="text-white">{totalAssignedPeriods}t</strong></span>
            </div>
            {scheduledCount > 0 && (
              <>
                <div className="w-px h-3.5 bg-slate-800" />
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Đã xếp: {scheduledCount}t</span>
                </div>
              </>
            )}
          </div>

          {/* Master Data button */}
          <button
            onClick={onOpenMasterData}
            title="Quản lý Danh mục Giáo viên, Lớp, Môn học"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/80 transition-all hover:text-white"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Danh Mục</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExport}
            title="Xuất Thời khóa biểu toàn trường sang file Excel (.xlsx)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-medium border border-emerald-700/60 transition-all hover:text-emerald-200"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          {/* Load Sample Dataset */}
          <button
            onClick={() => loadMockData(100)}
            title="Nạp dữ liệu mẫu 100+ Giáo viên & 40+ Lớp chuẩn"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Primary Action: Auto Generate Timetable */}
          <button
            onClick={startAutoGenerate}
            disabled={isGenerating || totalAssignedPeriods === 0}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
              isGenerating
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-brand-500 via-indigo-600 to-purple-600 hover:from-brand-400 hover:to-purple-500 text-white shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : 'text-amber-300 animate-pulse'}`} />
            <span>{isGenerating ? 'Đang Xếp Lịch...' : 'Tự Động Xếp TKB (AI)'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
