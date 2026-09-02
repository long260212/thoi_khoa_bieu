import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  FileSpreadsheet, 
  CheckCircle2, 
  Zap, 
  ArrowRight,
  Info,
  Layers
} from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTeacherAssignments, useTeacherCapacityStatus } from '../../store/selectors';
import { AutocompleteCell, AutocompleteOption } from './AutocompleteCell';
import { Badge } from '../common/Badge';
import { ExcelPasteModal } from './ExcelPasteModal';
import { parseExcelClipboard } from '../../utils/excelParser';

interface VirtualizedDataGridProps {
  onOpenMasterData?: () => void;
}

export const VirtualizedDataGrid: React.FC<VirtualizedDataGridProps> = ({ onOpenMasterData }) => {
  const selectedTeacherId = useScheduleStore((state) => state.selectedTeacherId);
  const setSelectedTeacher = useScheduleStore((state) => state.setSelectedTeacher);
  const teachers = useScheduleStore((state) => state.teachers);
  const classes = useScheduleStore((state) => state.classes);
  const subjects = useScheduleStore((state) => state.subjects);
  const addAssignment = useScheduleStore((state) => state.addAssignment);
  const updateAssignment = useScheduleStore((state) => state.updateAssignment);
  const deleteAssignment = useScheduleStore((state) => state.deleteAssignment);
  const batchAddAssignments = useScheduleStore((state) => state.batchAddAssignments);
  const clearTeacherAssignments = useScheduleStore((state) => state.clearTeacherAssignments);
  const stickyDefaultSubjectId = useScheduleStore((state) => state.stickyDefaultSubjectId);
  const setStickyDefaultSubject = useScheduleStore((state) => state.setStickyDefaultSubject);
  const loadMockData = useScheduleStore((state) => state.loadMockData);

  const [isExcelPasteModalOpen, setIsExcelPasteModalOpen] = useState(false);
  const [newRowFocusKey, setNewRowFocusKey] = useState<number>(0);

  // Active teacher data
  const currentTeacher = selectedTeacherId ? teachers[selectedTeacherId] : null;
  const teacherAssignments = useTeacherAssignments(selectedTeacherId);
  const capacityStatus = useTeacherCapacityStatus(selectedTeacherId);

  // Prepare Autocomplete Options
  const classOptions: AutocompleteOption[] = useMemo(() => {
    return Object.values(classes).map((c) => ({
      id: c.id,
      code: c.code,
      label: `Lớp ${c.code}`,
      subtitle: `Khối ${c.grade} • Buổi ${c.shift === 'MORNING' ? 'Sáng' : 'Chiều'}`,
      badge: c.room,
    }));
  }, [classes]);

  const subjectOptions: AutocompleteOption[] = useMemo(() => {
    return Object.values(subjects).map((s) => ({
      id: s.id,
      code: s.code,
      label: s.name,
      subtitle: `Tối đa ${s.maxPerDay}t/ngày`,
      color: s.color,
    }));
  }, [subjects]);

  // Next teacher in list for Ctrl+Enter quick jump
  const teacherList = useMemo(() => Object.values(teachers), [teachers]);
  const currentTeacherIndex = teacherList.findIndex((t) => t.id === selectedTeacherId);
  const nextTeacher = currentTeacherIndex >= 0 && currentTeacherIndex < teacherList.length - 1
    ? teacherList[currentTeacherIndex + 1]
    : teacherList[0];

  const handleNextTeacherJump = () => {
    if (nextTeacher) {
      setSelectedTeacher(nextTeacher.id);
    }
  };

  // Add a new row with sticky default subject
  const handleAddNewRow = () => {
    if (!selectedTeacherId) return;
    
    // Choose sticky subject or fallback to first subject
    const defaultSubId = stickyDefaultSubjectId || Object.keys(subjects)[0] || '';
    // First available class
    const defaultClassId = Object.keys(classes)[0] || '';

    const newId = addAssignment({
      teacherId: selectedTeacherId,
      classId: defaultClassId,
      subjectId: defaultSubId,
      periodsPerWeek: 4,
    });

    setNewRowFocusKey((prev) => prev + 1);
    return newId;
  };

  // Global Keyboard Listener for Grid
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Enter or Cmd + Enter: Jump to next teacher
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleNextTeacherJump();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [nextTeacher]);

  // Handle direct clipboard paste on container
  const handleContainerPaste = (e: React.ClipboardEvent) => {
    const pasteData = e.clipboardData.getData('text');
    if (pasteData && pasteData.includes('\t') && selectedTeacherId) {
      e.preventDefault();
      const parsed = parseExcelClipboard(pasteData, classes, subjects);
      const validItems = parsed
        .filter((r) => r.isValid && r.classId && r.subjectId)
        .map((r) => ({
          teacherId: selectedTeacherId,
          classId: r.classId!,
          subjectId: r.subjectId!,
          periodsPerWeek: r.periods,
        }));

      if (validItems.length > 0) {
        batchAddAssignments(validItems);
      }
    }
  };

  // Virtualizer for Data Rows
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: teacherAssignments.length,
    getScrollElement: () => gridContainerRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

  if (!currentTeacher) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-brand-400 shadow-xl">
          <Layers className="w-8 h-8 opacity-60" />
        </div>
        <div className="text-center space-y-1 max-w-sm">
          <h3 className="text-sm font-bold text-white">Chưa chọn giáo viên để nhập phân công</h3>
          <p className="text-xs text-slate-400">
            Hãy bắt đầu bằng cách thêm danh sách giáo viên & lớp học của trường, hoặc nạp bộ dữ liệu mẫu thử nghiệm.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onOpenMasterData && (
            <button
              onClick={onOpenMasterData}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quản Lý Danh Mục (Thêm GV/Lớp)</span>
            </button>
          )}
          <button
            onClick={() => loadMockData(100)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <span>✨ Nạp Dữ Liệu Mẫu (100+ GV)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onPaste={handleContainerPaste}
      className="flex-1 h-full flex flex-col bg-slate-950 overflow-hidden outline-none"
    >
      {/* Teacher Profile & Capacity Banner */}
      <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Teacher Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-sm font-mono shadow-inner">
              {currentTeacher.code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {currentTeacher.name}
                </h2>
                <Badge
                  variant={
                    capacityStatus.isOverloaded
                      ? 'danger'
                      : capacityStatus.isAtCapacity
                        ? 'success'
                        : 'info'
                  }
                  pulse={capacityStatus.isOverloaded}
                  size="sm"
                >
                  {capacityStatus.totalPeriods}/{capacityStatus.maxAllowed} tiết/tuần
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 font-mono">
                <span>Mã: {currentTeacher.code}</span>
                <span>•</span>
                <span>{currentTeacher.email || 'gv@truonghoc.edu.vn'}</span>
                <span>•</span>
                <span>Tối đa {currentTeacher.maxPeriodsPerDay} tiết/ngày</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExcelPasteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold border border-emerald-700/60 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dán từ Excel (Ctrl+V)</span>
            </button>

            <button
              onClick={handleAddNewRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Dòng (Enter)</span>
            </button>

            <button
              onClick={handleNextTeacherJump}
              title="Ctrl + Enter: Lưu & chuyển sang giáo viên tiếp theo"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            >
              <span>GV Tiếp</span>
              <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
            </button>
          </div>
        </div>

        {/* Capacity Warning Alert Banner */}
        {capacityStatus.isOverloaded && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/60 border border-rose-600/80 text-rose-200 text-xs shadow-lg animate-pulse-glow">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold">
                CẢNH BÁO QUÁ TẢI: Giáo viên đang được phân công {capacityStatus.totalPeriods} tiết (Vượt định mức chuẩn {capacityStatus.difference} tiết/tuần)!
              </span>
            </div>
            <span className="text-[11px] font-mono bg-rose-900 px-2 py-0.5 rounded text-rose-200 border border-rose-700 font-bold">
              Định mức quy định: 19 tiết
            </span>
          </div>
        )}

        {/* Sticky Subject Default Tip Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Mẹo phím tắt: Nhấn <kbd className="px-1 py-0.2 rounded bg-slate-800 text-slate-200 font-mono font-bold">Tab</kbd> di chuyển ô, <kbd className="px-1 py-0.2 rounded bg-slate-800 text-slate-200 font-mono font-bold">Enter</kbd> tại cột Số tiết để tự thêm dòng mới.
            </span>
          </div>
          {stickyDefaultSubjectId && subjects[stickyDefaultSubjectId] && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Môn mặc định dòng tiếp theo:</span>
              <span
                className="px-2 py-0.5 rounded text-white font-bold text-[10px]"
                style={{ backgroundColor: subjects[stickyDefaultSubjectId]?.color }}
              >
                {subjects[stickyDefaultSubjectId]?.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Excel-like Data Grid Table */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider select-none shrink-0">
          <div className="col-span-1 text-center">STT</div>
          <div className="col-span-4">Lớp Học (Class)</div>
          <div className="col-span-4">Môn Học (Subject)</div>
          <div className="col-span-2 text-center">Số Tiết / Tuần</div>
          <div className="col-span-1 text-right">Thao Tác</div>
        </div>

        {/* Table Body Container */}
        <div
          ref={gridContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden relative divide-y divide-slate-800/50"
        >
          {teacherAssignments.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
              <Info className="w-8 h-8 opacity-40" />
              <p>Chưa có phân công giảng dạy nào cho {currentTeacher.name}.</p>
              <button
                onClick={handleAddNewRow}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg transition-all"
              >
                + Bắt đầu nhập dòng đầu tiên
              </button>
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = teacherAssignments[virtualRow.index];
                const selectedClass = classes[item.classId];
                const selectedSub = subjects[item.subjectId];
                const isInvalidClass = !selectedClass;
                const isInvalidSub = !selectedSub;

                return (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="grid grid-cols-12 gap-2 px-4 py-1.5 items-center hover:bg-slate-900/60 transition-colors border-b border-slate-800/40"
                  >
                    {/* STT */}
                    <div className="col-span-1 text-center font-mono text-xs text-slate-500 font-bold">
                      {virtualRow.index + 1}
                    </div>

                    {/* Class Column Autocomplete */}
                    <div className="col-span-4 h-9 bg-slate-950 rounded-lg border border-slate-800 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all flex items-center">
                      <AutocompleteCell
                        value={selectedClass ? `Lớp ${selectedClass.code}` : ''}
                        selectedId={item.classId}
                        options={classOptions}
                        placeholder="Chọn hoặc gõ lớp (VD: 8A1)..."
                        hasError={isInvalidClass}
                        errorMessage="Lớp không tồn tại"
                        onChange={(opt) => {
                          if (opt) {
                            updateAssignment(item.id, { classId: opt.id });
                          }
                        }}
                      />
                    </div>

                    {/* Subject Column Autocomplete */}
                    <div className="col-span-4 h-9 bg-slate-950 rounded-lg border border-slate-800 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all flex items-center">
                      <AutocompleteCell
                        value={selectedSub ? selectedSub.name : ''}
                        selectedId={item.subjectId}
                        options={subjectOptions}
                        placeholder="Chọn môn học..."
                        hasError={isInvalidSub}
                        errorMessage="Môn không tồn tại"
                        onChange={(opt) => {
                          if (opt) {
                            updateAssignment(item.id, { subjectId: opt.id });
                            setStickyDefaultSubject(opt.id);
                          }
                        }}
                      />
                    </div>

                    {/* Total Periods Column */}
                    <div className="col-span-2 h-9 bg-slate-950 rounded-lg border border-slate-800 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all flex items-center justify-center">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={item.periodsPerWeek}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          updateAssignment(item.id, { periodsPerWeek: val });
                        }}
                        onKeyDown={(e) => {
                          // Pressing Enter on the last column creates a new row & focuses next class
                          if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNewRow();
                          }
                        }}
                        className="w-full text-center bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                      />
                    </div>

                    {/* Action Column */}
                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        onClick={() => deleteAssignment(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-all"
                        title="Xóa phân công này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Table Footer Summary */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span>
              Số lớp giảng dạy: <strong className="text-white">{teacherAssignments.length}</strong>
            </span>
            <span>•</span>
            <span>
              Tổng số tiết/tuần: <strong className="text-white">{capacityStatus.totalPeriods} tiết</strong>
            </span>
          </div>
          {teacherAssignments.length > 0 && (
            <button
              onClick={() => {
                if (confirm(`Bạn có chắc muốn xóa toàn bộ phân công của ${currentTeacher.name}?`)) {
                  clearTeacherAssignments(currentTeacher.id);
                }
              }}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
            >
              Xóa hết phân công GV này
            </button>
          )}
        </div>
      </div>

      {/* Excel Paste Modal */}
      <ExcelPasteModal
        isOpen={isExcelPasteModalOpen}
        onClose={() => setIsExcelPasteModalOpen(false)}
        targetTeacherId={currentTeacher.id}
      />
    </div>
  );
};
