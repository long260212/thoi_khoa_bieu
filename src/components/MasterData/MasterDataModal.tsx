import React, { useState } from 'react';
import { 
  X, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Plus, 
  Trash2, 
  RotateCcw,
  Sparkles,
  Check
} from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { ClassItem, ShiftType, SubjectItem, Teacher } from '../../types/state';

interface MasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterDataModal: React.FC<MasterDataModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'TEACHERS' | 'CLASSES' | 'SUBJECTS'>('TEACHERS');

  const teachers = useScheduleStore((state) => state.teachers);
  const classes = useScheduleStore((state) => state.classes);
  const subjects = useScheduleStore((state) => state.subjects);
  
  const addTeacher = useScheduleStore((state) => state.addTeacher);
  const updateTeacher = useScheduleStore((state) => state.updateTeacher);
  const deleteTeacher = useScheduleStore((state) => state.deleteTeacher);

  const addClass = useScheduleStore((state) => state.addClass);
  const deleteClass = useScheduleStore((state) => state.deleteClass);

  const addSubject = useScheduleStore((state) => state.addSubject);
  const deleteSubject = useScheduleStore((state) => state.deleteSubject);

  const loadMockData = useScheduleStore((state) => state.loadMockData);

  // New item form state
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherCode, setNewTeacherCode] = useState('');
  const [newTeacherPeriods, setNewTeacherPeriods] = useState(23); // Chuẩn Tiểu học

  const [newClassCode, setNewClassCode] = useState('');
  const [newClassGrade, setNewClassGrade] = useState(1); // Khối 1 đến 5
  const [newClassShift, setNewClassShift] = useState<ShiftType>('MORNING');

  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubColor, setNewSubColor] = useState('#2563eb');
  const [newSubMaxDay, setNewSubMaxDay] = useState(2);

  if (!isOpen) return null;

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherCode.trim()) return;
    const id = `TEA_${Date.now()}`;
    addTeacher({
      id,
      name: newTeacherName.trim(),
      code: newTeacherCode.trim(),
      maxPeriodsPerWeek: Number(newTeacherPeriods) || 23,
      maxPeriodsPerDay: 4,
    });
    setNewTeacherName('');
    setNewTeacherCode('');
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassCode.trim()) return;
    const id = `CLS_${newClassCode.trim()}`;
    addClass({
      id,
      code: newClassCode.trim(),
      grade: Number(newClassGrade) || 1,
      shift: newClassShift,
    });
    setNewClassCode('');
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubCode.trim()) return;
    const id = `SUB_${Date.now()}`;
    addSubject({
      id,
      name: newSubName.trim(),
      code: newSubCode.trim(),
      color: newSubColor,
      maxPerDay: Number(newSubMaxDay) || 2,
    });
    setNewSubName('');
    setNewSubCode('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Quản Lý Danh Mục Dữ Liệu</h3>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('TEACHERS')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                activeTab === 'TEACHERS' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Giáo Viên ({Object.keys(teachers).length})</span>
            </button>
            <button
              onClick={() => setActiveTab('CLASSES')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                activeTab === 'CLASSES' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Lớp Học ({Object.keys(classes).length})</span>
            </button>
            <button
              onClick={() => setActiveTab('SUBJECTS')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                activeTab === 'SUBJECTS' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Môn Học ({Object.keys(subjects).length})</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Bulk Generator Bar */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Nạp tự động 100+ Giáo viên & 40+ Lớp chuẩn để thử nghiệm hiệu năng lớn:</span>
            </div>
            <button
              onClick={() => loadMockData(100)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nạp 100+ GV Mẫu</span>
            </button>
          </div>

          {/* TEACHERS TAB */}
          {activeTab === 'TEACHERS' && (
            <div className="space-y-4">
              <form onSubmit={handleCreateTeacher} className="flex gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <input
                  type="text"
                  placeholder="Mã GV (VD: CTLoan)..."
                  value={newTeacherCode}
                  onChange={(e) => setNewTeacherCode(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 flex-1 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Họ và tên GV (VD: Cô Trần Thị Loan)..."
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 flex-2 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Định mức (19t)..."
                  value={newTeacherPeriods}
                  onChange={(e) => setNewTeacherPeriods(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 text-center focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm GV
                </button>
              </form>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.values(teachers).map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-brand-400 bg-slate-900 px-1 rounded">
                          {t.code}
                        </span>
                        <strong className="text-xs text-white truncate max-w-[140px]">{t.name}</strong>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Định mức: {t.maxPeriodsPerWeek}t/tuần</p>
                    </div>
                    <button
                      onClick={() => deleteTeacher(t.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLASSES TAB */}
          {activeTab === 'CLASSES' && (
            <div className="space-y-4">
              <form onSubmit={handleCreateClass} className="flex gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <input
                  type="text"
                  placeholder="Tên lớp (VD: 1A1, 2A3, 3A5, 5A1)..."
                  value={newClassCode}
                  onChange={(e) => setNewClassCode(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 flex-1 focus:outline-none"
                />
                <select
                  value={newClassGrade}
                  onChange={(e) => setNewClassGrade(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-medium focus:outline-none"
                >
                  <option value={1}>Khối 1 (Lớp 1)</option>
                  <option value={2}>Khối 2 (Lớp 2)</option>
                  <option value={3}>Khối 3 (Lớp 3)</option>
                  <option value={4}>Khối 4 (Lớp 4)</option>
                  <option value={5}>Khối 5 (Lớp 5)</option>
                </select>
                <select
                  value={newClassShift}
                  onChange={(e) => setNewClassShift(e.target.value as ShiftType)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                >
                  <option value="MORNING">Buổi Sáng (Tiết 1-5)</option>
                  <option value="AFTERNOON">Buổi Chiều (Tiết 6-10)</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm Lớp
                </button>
              </form>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.values(classes).map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <strong className="text-xs font-bold text-white">Lớp {c.code}</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Khối {c.grade} • {c.shift === 'MORNING' ? 'Sáng' : 'Chiều'}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteClass(c.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBJECTS TAB */}
          {activeTab === 'SUBJECTS' && (
            <div className="space-y-4">
              <form onSubmit={handleCreateSubject} className="flex gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <input
                  type="text"
                  placeholder="Mã môn (VD: TOAN)..."
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 flex-1 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Tên môn (VD: Toán Học)..."
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 flex-2 focus:outline-none"
                />
                <input
                  type="color"
                  value={newSubColor}
                  onChange={(e) => setNewSubColor(e.target.value)}
                  className="w-10 h-8 bg-transparent cursor-pointer rounded border border-slate-700"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm Môn
                </button>
              </form>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.values(subjects).map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <div>
                        <strong className="text-xs text-white">{s.name}</strong>
                        <span className="font-mono text-[11px] text-slate-500 ml-1">({s.code})</span>
                        <p className="text-[10px] text-slate-500">Tối đa {s.maxPerDay}t/ngày</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSubject(s.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
