import React, { useState, useMemo } from 'react';
import { 
  DAYS_OF_WEEK, 
  DayOfWeek, 
  ScheduleEntry 
} from '../../types/state';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useClassSchedule, useTeacherSchedule } from '../../store/selectors';
import { exportTimetableToExcel } from '../../utils/excelParser';
import { 
  Printer, 
  FileSpreadsheet, 
  GraduationCap, 
  Users, 
  Sparkles, 
  Sun, 
  Moon, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Check, 
  X, 
  Info,
  Edit3
} from 'lucide-react';

interface ActiveSlotSelection {
  classId: string;
  day: DayOfWeek;
  period: number;
  existingEntry?: ScheduleEntry;
}

export const TimetableMatrix: React.FC = () => {
  const activeView = useScheduleStore((state) => state.activeView);
  const setActiveView = useScheduleStore((state) => state.setActiveView);
  const classes = useScheduleStore((state) => state.classes);
  const teachers = useScheduleStore((state) => state.teachers);
  const subjects = useScheduleStore((state) => state.subjects);
  const assignments = useScheduleStore((state) => state.assignments);
  const schedule = useScheduleStore((state) => state.schedule);
  const selectedClassId = useScheduleStore((state) => state.selectedClassId);
  const setSelectedClass = useScheduleStore((state) => state.setSelectedClass);
  const selectedTeacherId = useScheduleStore((state) => state.selectedTeacherId);
  const setSelectedTeacher = useScheduleStore((state) => state.setSelectedTeacher);
  const startAutoGenerate = useScheduleStore((state) => state.startAutoGenerate);
  const assignSlot = useScheduleStore((state) => state.assignSlot);
  const removeSlot = useScheduleStore((state) => state.removeSlot);

  // Active Slot Editor Modal state
  const [editingSlot, setEditingSlot] = useState<ActiveSlotSelection | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTeacherIdForSlot, setSelectedTeacherIdForSlot] = useState<string>('');

  // Sorted list of Classes
  const classList = useMemo(() => {
    return Object.values(classes).sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true })
    );
  }, [classes]);

  // Sorted list of Teachers
  const teacherList = useMemo(() => {
    return Object.values(teachers).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [teachers]);

  // Current entity
  const currentClass = selectedClassId ? classes[selectedClassId] : classList[0] || null;
  const currentTeacher = selectedTeacherId ? teachers[selectedTeacherId] : teacherList[0] || null;

  // Schedules
  const currentClassSchedule = useClassSchedule(currentClass?.id || null);
  const currentTeacherSchedule = useTeacherSchedule(currentTeacher?.id || null);

  const morningPeriods = [1, 2, 3, 4, 5];
  const afternoonPeriods = [6, 7, 8, 9, 10];

  const totalAssignedForCurrentClass = useMemo(() => {
    if (!currentClass) return 0;
    return Object.values(assignments)
      .filter((a) => a.classId === currentClass.id)
      .reduce((sum, a) => sum + (a.periodsPerWeek || 0), 0);
  }, [assignments, currentClass]);

  const totalScheduledForCurrentClass = Object.keys(currentClassSchedule).length;
  const totalScheduledForCurrentTeacher = Object.keys(currentTeacherSchedule).length;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    exportTimetableToExcel(schedule, classes, teachers, subjects);
  };

  // Open Quick Slot Editor
  const handleCellClick = (classId: string, day: DayOfWeek, period: number) => {
    const key = `${classId}_${day}_${period}`;
    const existing = schedule[key];
    
    setEditingSlot({
      classId,
      day,
      period,
      existingEntry: existing,
    });

    if (existing) {
      setSelectedSubjectId(existing.subjectId);
      setSelectedTeacherIdForSlot(existing.teacherId);
    } else {
      // Pick first subject or default
      const defaultSubId = Object.keys(subjects)[0] || '';
      setSelectedSubjectId(defaultSubId);
      // Pick first available teacher or existing
      const defaultTeacherId = Object.keys(teachers)[0] || '';
      setSelectedTeacherIdForSlot(defaultTeacherId);
    }
  };

  // Check which teacher is busy at the editing slot
  const teacherAvailability = useMemo(() => {
    if (!editingSlot) return {};
    const { day, period, classId } = editingSlot;
    const busyMap: Record<string, { isBusy: boolean; busyClassCode?: string }> = {};

    Object.values(schedule).forEach((entry) => {
      if (entry.day === day && entry.period === period && entry.classId !== classId) {
        busyMap[entry.teacherId] = {
          isBusy: true,
          busyClassCode: classes[entry.classId]?.code || 'Lớp khác',
        };
      }
    });

    return busyMap;
  }, [editingSlot, schedule, classes]);

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot || !selectedSubjectId || !selectedTeacherIdForSlot) return;

    assignSlot(
      editingSlot.classId,
      editingSlot.day,
      editingSlot.period,
      selectedSubjectId,
      selectedTeacherIdForSlot
    );

    setEditingSlot(null);
  };

  const handleDeleteSlot = () => {
    if (!editingSlot) return;
    removeSlot(editingSlot.classId, editingSlot.day, editingSlot.period);
    setEditingSlot(null);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Controls & Filter Bar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveView('TIMETABLE_CLASS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'TIMETABLE_CLASS'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Theo Lớp</span>
            </button>
            <button
              onClick={() => setActiveView('TIMETABLE_TEACHER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'TIMETABLE_TEACHER'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Theo Giáo Viên</span>
            </button>
            <button
              onClick={() => setActiveView('MASTER_MATRIX')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'MASTER_MATRIX'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Ma Trận Toàn Trường</span>
            </button>
          </div>

          {/* Selector Dropdown based on active view */}
          {activeView === 'TIMETABLE_CLASS' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Chọn Lớp:</span>
              <select
                value={currentClass?.id || ''}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:ring-1 focus:ring-brand-500 focus:outline-none"
              >
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.code} (Khối {c.grade} • {c.shift === 'MORNING' ? 'Buổi Sáng' : 'Buổi Chiều'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeView === 'TIMETABLE_TEACHER' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Chọn Giáo Viên:</span>
              <select
                value={currentTeacher?.id || ''}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                {teacherList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code}) - {t.maxPeriodsPerWeek}t/tuần
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {Object.keys(schedule).length === 0 && (
            <button
              onClick={startAutoGenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chạy Xếp Tự Động (AI)</span>
            </button>
          )}

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-medium border border-emerald-700/60 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>In TKB</span>
          </button>
        </div>
      </div>

      {/* Main Timetable Content */}
      <div className="flex-1 p-4 overflow-y-auto print:p-0">
        {activeView === 'TIMETABLE_CLASS' && currentClass && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 print:border-none print:shadow-none">
            {/* Vietnamese Standard Header */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  THỜI KHÓA BIỂU: <span className="text-brand-400">LỚP {currentClass.code}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Khối: <strong>Khối {currentClass.grade}</strong> • Buổi học: <strong>{currentClass.shift === 'MORNING' ? 'Buổi Sáng' : 'Buổi Chiều'}</strong> • Phòng học: <strong>{currentClass.room || 'P.Học'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-800/60">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Mẹo: Bấm trực tiếp vào từng ô để chọn môn & gán giáo viên dạy!</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-400">Đã xếp: </span>
                  <strong className="text-emerald-400 font-mono font-bold">
                    {totalScheduledForCurrentClass} tiết
                  </strong>
                </div>
              </div>
            </div>

            {/* Timetable Grid Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-center border-collapse text-xs">
                {/* Day Headers */}
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800">
                    <th className="p-3 font-bold text-slate-400 uppercase w-28 text-left pl-4">Tiết / Buổi</th>
                    {DAYS_OF_WEEK.map((d) => (
                      <th key={d.key} className="p-3 font-bold text-slate-200 border-l border-slate-800/80">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* SÁNG (Morning Periods 1-5) */}
                  <tr className="bg-slate-950/60 font-bold text-slate-400 text-left border-y border-slate-800">
                    <td colSpan={7} className="py-1.5 px-4 flex items-center gap-1.5 text-brand-300 text-[11px]">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>BUỔI SÁNG (Tiết 1 - 5)</span>
                    </td>
                  </tr>

                  {morningPeriods.map((period) => (
                    <tr key={period} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400 text-left pl-4 bg-slate-950/40">
                        Tiết {period}
                      </td>
                      {DAYS_OF_WEEK.map((d) => {
                        const cellKey = `${d.key}_${period}`;
                        const entry = currentClassSchedule[cellKey];
                        const subject = entry ? subjects[entry.subjectId] : null;
                        const teacher = entry ? teachers[entry.teacherId] : null;

                        return (
                          <td
                            key={d.key}
                            onClick={() => handleCellClick(currentClass.id, d.key, period)}
                            className="p-1.5 border-l border-slate-800/60 min-w-[125px] h-16 align-middle cursor-pointer hover:bg-slate-800/60 transition-all group"
                          >
                            {entry && subject && teacher ? (
                              <div
                                className="h-full rounded-xl p-2 flex flex-col justify-center items-center text-white shadow-sm transition-all group-hover:scale-[1.03] group-hover:shadow-md relative overflow-hidden"
                                style={{
                                  backgroundColor: `${subject.color}25`,
                                  borderLeft: `4px solid ${subject.color}`,
                                }}
                              >
                                <span className="font-bold text-xs truncate max-w-full" style={{ color: subject.color }}>
                                  {subject.name}
                                </span>
                                <span className="text-[11px] font-mono text-slate-300 truncate max-w-full mt-0.5">
                                  {teacher.name}
                                </span>
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Edit3 className="w-3 h-3 text-slate-400" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-full rounded-xl border border-dashed border-slate-800 group-hover:border-brand-500/60 flex items-center justify-center text-slate-700 group-hover:text-brand-400 transition-all font-mono text-[11px] gap-1">
                                <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                <span>-</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* CHIỀU (Afternoon Periods 6-10) */}
                  <tr className="bg-slate-950/60 font-bold text-slate-400 text-left border-y border-slate-800">
                    <td colSpan={7} className="py-1.5 px-4 flex items-center gap-1.5 text-indigo-300 text-[11px]">
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>BUỔI CHIỀU (Tiết 6 - 10)</span>
                    </td>
                  </tr>

                  {afternoonPeriods.map((period) => (
                    <tr key={period} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400 text-left pl-4 bg-slate-950/40">
                        Tiết {period}
                      </td>
                      {DAYS_OF_WEEK.map((d) => {
                        const cellKey = `${d.key}_${period}`;
                        const entry = currentClassSchedule[cellKey];
                        const subject = entry ? subjects[entry.subjectId] : null;
                        const teacher = entry ? teachers[entry.teacherId] : null;

                        return (
                          <td
                            key={d.key}
                            onClick={() => handleCellClick(currentClass.id, d.key, period)}
                            className="p-1.5 border-l border-slate-800/60 min-w-[125px] h-16 align-middle cursor-pointer hover:bg-slate-800/60 transition-all group"
                          >
                            {entry && subject && teacher ? (
                              <div
                                className="h-full rounded-xl p-2 flex flex-col justify-center items-center text-white shadow-sm transition-all group-hover:scale-[1.03] group-hover:shadow-md relative overflow-hidden"
                                style={{
                                  backgroundColor: `${subject.color}25`,
                                  borderLeft: `4px solid ${subject.color}`,
                                }}
                              >
                                <span className="font-bold text-xs truncate max-w-full" style={{ color: subject.color }}>
                                  {subject.name}
                                </span>
                                <span className="text-[11px] font-mono text-slate-300 truncate max-w-full mt-0.5">
                                  {teacher.name}
                                </span>
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Edit3 className="w-3 h-3 text-slate-400" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-full rounded-xl border border-dashed border-slate-800 group-hover:border-brand-500/60 flex items-center justify-center text-slate-700 group-hover:text-brand-400 transition-all font-mono text-[11px] gap-1">
                                <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                <span>-</span>
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
          </div>
        )}

        {/* View by Teacher */}
        {activeView === 'TIMETABLE_TEACHER' && currentTeacher && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 print:border-none print:shadow-none">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  LỊCH GIẢNG DẠY: <span className="text-indigo-400">{currentTeacher.name}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mã GV: <strong className="font-mono">{currentTeacher.code}</strong> • Email: <strong>{currentTeacher.email || 'N/A'}</strong> • Định mức: <strong>{currentTeacher.maxPeriodsPerWeek} tiết/tuần</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-400">Tổng tiết xếp được: </span>
                  <strong className="text-indigo-400 font-mono font-bold">
                    {totalScheduledForCurrentTeacher} tiết
                  </strong>
                </div>
              </div>
            </div>

            {/* Teacher Grid Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800">
                    <th className="p-3 font-bold text-slate-400 uppercase w-28 text-left pl-4">Tiết / Buổi</th>
                    {DAYS_OF_WEEK.map((d) => (
                      <th key={d.key} className="p-3 font-bold text-slate-200 border-l border-slate-800/80">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* SÁNG */}
                  <tr className="bg-slate-950/60 font-bold text-slate-400 text-left border-y border-slate-800">
                    <td colSpan={7} className="py-1.5 px-4 flex items-center gap-1.5 text-brand-300 text-[11px]">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>BUỔI SÁNG (Tiết 1 - 5)</span>
                    </td>
                  </tr>

                  {morningPeriods.map((period) => (
                    <tr key={period} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400 text-left pl-4 bg-slate-950/40">
                        Tiết {period}
                      </td>
                      {DAYS_OF_WEEK.map((d) => {
                        const cellKey = `${d.key}_${period}`;
                        const entry = currentTeacherSchedule[cellKey];
                        const cls = entry ? classes[entry.classId] : null;
                        const subject = entry ? subjects[entry.subjectId] : null;

                        return (
                          <td key={d.key} className="p-2 border-l border-slate-800/60 min-w-[120px] h-14 align-middle">
                            {entry && cls && subject ? (
                              <div
                                className="h-full rounded-lg p-1.5 flex flex-col justify-center items-center text-white shadow-sm transition-all hover:scale-[1.02]"
                                style={{
                                  backgroundColor: `${subject.color}25`,
                                  borderLeft: `4px solid ${subject.color}`,
                                }}
                              >
                                <span className="font-bold text-xs truncate max-w-full text-white">
                                  Lớp {cls.code}
                                </span>
                                <span className="text-[11px] font-semibold truncate max-w-full" style={{ color: subject.color }}>
                                  {subject.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-700 text-xs font-mono">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* CHIỀU */}
                  <tr className="bg-slate-950/60 font-bold text-slate-400 text-left border-y border-slate-800">
                    <td colSpan={7} className="py-1.5 px-4 flex items-center gap-1.5 text-indigo-300 text-[11px]">
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>BUỔI CHIỀU (Tiết 6 - 10)</span>
                    </td>
                  </tr>

                  {afternoonPeriods.map((period) => (
                    <tr key={period} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400 text-left pl-4 bg-slate-950/40">
                        Tiết {period}
                      </td>
                      {DAYS_OF_WEEK.map((d) => {
                        const cellKey = `${d.key}_${period}`;
                        const entry = currentTeacherSchedule[cellKey];
                        const cls = entry ? classes[entry.classId] : null;
                        const subject = entry ? subjects[entry.subjectId] : null;

                        return (
                          <td key={d.key} className="p-2 border-l border-slate-800/60 min-w-[120px] h-14 align-middle">
                            {entry && cls && subject ? (
                              <div
                                className="h-full rounded-lg p-1.5 flex flex-col justify-center items-center text-white shadow-sm transition-all hover:scale-[1.02]"
                                style={{
                                  backgroundColor: `${subject.color}25`,
                                  borderLeft: `4px solid ${subject.color}`,
                                }}
                              >
                                <span className="font-bold text-xs truncate max-w-full text-white">
                                  Lớp {cls.code}
                                </span>
                                <span className="text-[11px] font-semibold truncate max-w-full" style={{ color: subject.color }}>
                                  {subject.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-700 text-xs font-mono">-</span>
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
        )}

        {/* Master Matrix View */}
        {activeView === 'MASTER_MATRIX' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  MA TRẬN TOÀN TRƯỜNG ({classList.length} Lớp Học)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tổng quan thời khóa biểu toàn bộ các lớp tiểu học trong tuần
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[70vh]">
              <table className="w-full text-center border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800 shadow-md">
                  <tr>
                    <th className="p-2.5 font-bold text-slate-400 uppercase w-20 text-left pl-3">Lớp</th>
                    <th className="p-2.5 font-bold text-slate-400 uppercase w-20">Buổi</th>
                    {DAYS_OF_WEEK.map((d) => (
                      <th key={d.key} colSpan={5} className="p-2 font-bold text-slate-200 border-l border-slate-800">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {classList.map((cls) => {
                    const startP = cls.shift === 'AFTERNOON' ? 6 : 1;
                    return (
                      <tr key={cls.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-2 text-left pl-3 font-bold text-white bg-slate-950/50">
                          {cls.code}
                        </td>
                        <td className="p-2 text-slate-400 text-[10px]">
                          {cls.shift === 'MORNING' ? 'Sáng' : 'Chiều'}
                        </td>
                        {DAYS_OF_WEEK.map((d) => {
                          return [1, 2, 3, 4, 5].map((slotIdx) => {
                            const p = startP + slotIdx - 1;
                            const key = `${cls.id}_${d.key}_${p}`;
                            const entry = schedule[key];
                            const sub = entry ? subjects[entry.subjectId] : null;

                            return (
                              <td
                                key={`${d.key}_${p}`}
                                onClick={() => handleCellClick(cls.id, d.key, p)}
                                className="p-1 border-l border-slate-800/40 text-[10px] min-w-[42px] h-8 cursor-pointer hover:bg-slate-700/50"
                                title={entry && sub ? `${sub.name} (GV: ${teachers[entry.teacherId]?.name})` : 'Trống - Bấm để xếp'}
                              >
                                {entry && sub ? (
                                  <div
                                    className="w-full h-full rounded flex items-center justify-center font-bold text-white shadow-xs"
                                    style={{ backgroundColor: sub.color }}
                                  >
                                    {sub.code}
                                  </div>
                                ) : (
                                  <span className="text-slate-800">-</span>
                                )}
                              </td>
                            );
                          });
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* QUICK SLOT EDIT MODAL / POPOVER */}
      {editingSlot && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-5 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Xếp Tiết Học Trực Tiếp
                  </h3>
                  <p className="text-xs text-brand-300 font-medium">
                    Lớp {classes[editingSlot.classId]?.code} • {DAYS_OF_WEEK.find(d => d.key === editingSlot.day)?.label} • Tiết {editingSlot.period}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingSlot(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSlot} className="space-y-4">
              {/* Select Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>1. Chọn Môn Học:</span>
                  {selectedSubjectId && subjects[selectedSubjectId] && (
                    <span
                      className="px-2 py-0.2 rounded text-[10px] text-white font-bold"
                      style={{ backgroundColor: subjects[selectedSubjectId].color }}
                    >
                      {subjects[selectedSubjectId].name}
                    </span>
                  )}
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {Object.values(subjects).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Teacher with Real-time Conflict Indicators */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  2. Chọn Giáo Viên Giảng Dạy:
                </label>
                <select
                  value={selectedTeacherIdForSlot}
                  onChange={(e) => setSelectedTeacherIdForSlot(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {teacherList.map((t) => {
                    const status = teacherAvailability[t.id];
                    const isBusy = status?.isBusy;

                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code}) {isBusy ? `❌ [BẬN LỚP ${status.busyClassCode}]` : '✅ [TRỐNG TIẾT]'}
                      </option>
                    );
                  })}
                </select>

                {/* Conflict warning indicator */}
                {selectedTeacherIdForSlot && teacherAvailability[selectedTeacherIdForSlot]?.isBusy && (
                  <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-700/80 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      <strong>Trùng lịch:</strong> {teachers[selectedTeacherIdForSlot]?.name} đang dạy <strong>Lớp {teacherAvailability[selectedTeacherIdForSlot]?.busyClassCode}</strong> tại tiết này!
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                {editingSlot.existingEntry ? (
                  <button
                    type="button"
                    onClick={handleDeleteSlot}
                    className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-800/80 flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Tiết Này</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 flex items-center gap-1.5 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu Tiết Học</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
