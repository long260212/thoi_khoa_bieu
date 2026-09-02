import React, { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, UserCheck, AlertTriangle, UserX, Plus } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { Badge } from '../common/Badge';

interface TeacherSidebarProps {
  onAddNewTeacher?: () => void;
}

export const TeacherSidebar: React.FC<TeacherSidebarProps> = ({ onAddNewTeacher }) => {
  const teachers = useScheduleStore((state) => state.teachers);
  const assignments = useScheduleStore((state) => state.assignments);
  const selectedTeacherId = useScheduleStore((state) => state.selectedTeacherId);
  const setSelectedTeacher = useScheduleStore((state) => state.setSelectedTeacher);
  const searchQuery = useScheduleStore((state) => state.searchTeacherQuery);
  const setSearchQuery = useScheduleStore((state) => state.setSearchTeacherQuery);
  const filter = useScheduleStore((state) => state.sidebarFilter);
  const setFilter = useScheduleStore((state) => state.setSidebarFilter);

  const parentRef = useRef<HTMLDivElement>(null);

  // Compute teacher periods load hash map for $O(1)$ lookup in sidebar items
  const teacherPeriodsMap = useMemo(() => {
    const map: Record<string, number> = {};
    Object.values(assignments).forEach((a) => {
      map[a.teacherId] = (map[a.teacherId] || 0) + (a.periodsPerWeek || 0);
    });
    return map;
  }, [assignments]);

  // Filtered & Searched teacher list
  const filteredTeachers = useMemo(() => {
    const list = Object.values(teachers);
    const q = searchQuery.trim().toLowerCase();

    return list.filter((teacher) => {
      // Search match
      const matchesSearch =
        !q ||
        teacher.name.toLowerCase().includes(q) ||
        teacher.code.toLowerCase().includes(q) ||
        (teacher.email && teacher.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Status filter
      const periods = teacherPeriodsMap[teacher.id] || 0;
      const max = teacher.maxPeriodsPerWeek || 19;

      if (filter === 'OVERLOADED') return periods > max;
      if (filter === 'UNDERLOADED') return periods < max - 4;
      if (filter === 'NORMAL') return periods <= max && periods >= max - 4;
      return true;
    });
  }, [teachers, searchQuery, filter, teacherPeriodsMap]);

  // TanStack Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredTeachers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Height of each teacher row item in px
    overscan: 10,
  });

  // Count stats
  const totalCount = Object.keys(teachers).length;
  const overloadedCount = Object.values(teachers).filter(
    (t) => (teacherPeriodsMap[t.id] || 0) > (t.maxPeriodsPerWeek || 19)
  ).length;

  return (
    <aside className="w-80 h-full flex flex-col bg-slate-900 border-r border-slate-800 shrink-0">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-brand-400" />
            <span>Giáo Viên ({filteredTeachers.length}/{totalCount})</span>
          </h2>
          {onAddNewTeacher && (
            <button
              onClick={onAddNewTeacher}
              className="p-1 rounded bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
              title="Thêm Giáo Viên Mới"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc mã GV..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-[11px] font-medium overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
              filter === 'ALL'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => setFilter('OVERLOADED')}
            className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap flex items-center gap-1 ${
              filter === 'OVERLOADED'
                ? 'bg-rose-900/80 text-rose-200 font-bold border border-rose-700'
                : 'text-rose-400 hover:text-rose-200 hover:bg-rose-950/40'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Quá tải ({overloadedCount})</span>
          </button>
          <button
            onClick={() => setFilter('NORMAL')}
            className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
              filter === 'NORMAL'
                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800'
                : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            Đủ tải
          </button>
          <button
            onClick={() => setFilter('UNDERLOADED')}
            className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
              filter === 'UNDERLOADED'
                ? 'bg-amber-950 text-amber-300 font-bold border border-amber-800'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Thiếu tiết
          </button>
        </div>
      </div>

      {/* Virtualized Teacher List Container */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative divide-y divide-slate-800/40 select-none"
      >
        {filteredTeachers.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center h-64 gap-2">
            <UserX className="w-10 h-10 opacity-30 text-slate-400" />
            <p className="font-semibold text-slate-300">Chưa có giáo viên nào</p>
            <p className="text-[11px] text-slate-500 max-w-[200px]">
              Bạn có thể tự thêm giáo viên mới hoặc nạp dữ liệu mẫu để thử nghiệm.
            </p>
            {onAddNewTeacher && (
              <button
                onClick={onAddNewTeacher}
                className="mt-2 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Giáo Viên</span>
              </button>
            )}
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
              const teacher = filteredTeachers[virtualRow.index];
              const isSelected = selectedTeacherId === teacher.id;
              const periods = teacherPeriodsMap[teacher.id] || 0;
              const max = teacher.maxPeriodsPerWeek || 19;
              const isOverloaded = periods > max;
              const isFull = periods === max;

              return (
                <div
                  key={teacher.id}
                  onClick={() => setSelectedTeacher(teacher.id)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={`px-3 py-2 cursor-pointer transition-all flex items-center justify-between border-l-4 ${
                    isSelected
                      ? 'bg-brand-950/50 border-l-brand-500 bg-gradient-to-r from-brand-900/30 to-transparent'
                      : 'border-l-transparent hover:bg-slate-800/50'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-brand-300 border border-slate-700">
                        {teacher.code}
                      </span>
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {teacher.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span>Định mức: {max}t</span>
                      {teacher.unavailableSlots && teacher.unavailableSlots.length > 0 && (
                        <span className="text-amber-400 text-[10px]">
                          • Bận {teacher.unavailableSlots.length}t
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Load Badge Indicator */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <Badge
                      variant={isOverloaded ? 'danger' : isFull ? 'success' : periods === 0 ? 'default' : 'info'}
                      pulse={isOverloaded}
                      size="sm"
                    >
                      {periods}/{max}t
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
