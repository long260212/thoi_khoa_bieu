import React, { useState } from 'react';
import { FileSpreadsheet, X, Check, AlertCircle } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { parseExcelClipboard, ParsedAssignmentRow } from '../../utils/excelParser';

interface ExcelPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTeacherId: string;
}

export const ExcelPasteModal: React.FC<ExcelPasteModalProps> = ({
  isOpen,
  onClose,
  targetTeacherId,
}) => {
  const [pasteText, setPasteText] = useState('');
  const [previewRows, setPreviewRows] = useState<ParsedAssignmentRow[]>([]);
  const classes = useScheduleStore((state) => state.classes);
  const subjects = useScheduleStore((state) => state.subjects);
  const teacher = useScheduleStore((state) => state.teachers[targetTeacherId]);
  const batchAddAssignments = useScheduleStore((state) => state.batchAddAssignments);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setPasteText(text);
    const parsed = parseExcelClipboard(text, classes, subjects);
    setPreviewRows(parsed);
  };

  const handleImport = () => {
    const validItems = previewRows
      .filter((r) => r.isValid && r.classId && r.subjectId)
      .map((r) => ({
        teacherId: targetTeacherId,
        classId: r.classId!,
        subjectId: r.subjectId!,
        periodsPerWeek: r.periods,
      }));

    if (validItems.length > 0) {
      batchAddAssignments(validItems);
      onClose();
      setPasteText('');
      setPreviewRows([]);
    }
  };

  const validCount = previewRows.filter((r) => r.isValid).length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Dán Dữ Liệu Excel / Google Sheets</h3>
              <p className="text-xs text-slate-400">
                Nhập nhanh phân công cho: <strong className="text-brand-300">{teacher?.name} ({teacher?.code})</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-slate-200">💡 Hướng dẫn cấu trúc cột Excel (Copy & Paste vào ô dưới):</p>
            <p className="text-slate-400 font-mono text-[11px]">
              Cột 1: [Lớp (ví dụ 6A1, 8A2)] | Cột 2: [Môn học (ví dụ Toán, Tiếng Anh)] | Cột 3: [Số tiết (ví dụ 4)]
            </p>
          </div>

          <textarea
            value={pasteText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Dán (Ctrl + V) dữ liệu từ Excel vào đây...&#10;Ví dụ:&#10;6A1	Toán	4&#10;6A2	Toán	4&#10;7A1	Ngữ Văn	4"
            rows={5}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Xem trước kết quả ({validCount}/{previewRows.length} hợp lệ):</span>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium">
                      <th className="p-2">Lớp</th>
                      <th className="p-2">Môn Học</th>
                      <th className="p-2">Số Tiết</th>
                      <th className="p-2 text-right">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {previewRows.map((r, i) => (
                      <tr key={i} className={r.isValid ? 'hover:bg-slate-900/50' : 'bg-rose-950/20 text-rose-300'}>
                        <td className="p-2 font-bold">{r.classCode}</td>
                        <td className="p-2">{r.subjectName}</td>
                        <td className="p-2">{r.periods}t/tuần</td>
                        <td className="p-2 text-right">
                          {r.isValid ? (
                            <span className="text-emerald-400 inline-flex items-center gap-1 text-[11px]">
                              <Check className="w-3 h-3" /> Hợp lệ
                            </span>
                          ) : (
                            <span className="text-rose-400 inline-flex items-center gap-1 text-[11px]">
                              <AlertCircle className="w-3 h-3" /> {r.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            onClick={handleImport}
            disabled={validCount === 0}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              validCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Nạp {validCount} Bản Ghi Vào Lưới
          </button>
        </div>
      </div>
    </div>
  );
};
