import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Clipboard, 
  FileText, 
  Download, 
  Check, 
  RotateCcw, 
  Layers, 
  AlertCircle,
  FileCode
} from 'lucide-react';
import { PhanBoiChauTeacherData, PHAN_BOI_CHAU_DATA } from '../../utils/phanBoiChauData';
import { parseExcelFile, parsePastedTextData, downloadSampleExcelTemplate } from '../../utils/multiSourceImporter';

interface MultiSourceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (teachers: PhanBoiChauTeacherData[]) => void;
}

export const MultiSourceImportModal: React.FC<MultiSourceImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [activeSourceTab, setActiveSourceTab] = useState<'EXCEL' | 'PASTE' | 'FILE' | 'PRESET'>('EXCEL');
  const [pastedContent, setPastedContent] = useState('');
  const [previewTeachers, setPreviewTeachers] = useState<PhanBoiChauTeacherData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Xử lý khi tải file Excel lên
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const parsed = await parseExcelFile(file);
      if (parsed.length === 0) {
        setErrorMessage('Không tìm thấy dữ liệu phân công hợp lệ trong file Excel. Vui lòng kiểm tra lại cấu trúc cột hoặc tải file mẫu.');
      } else {
        setPreviewTeachers(parsed);
      }
    } catch (err: any) {
      setErrorMessage(`Lỗi đọc file Excel: ${err.message || 'File không đúng định dạng'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý kéo thả file
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Xử lý phân tích văn bản dán vào
  const handleParsePasted = () => {
    setErrorMessage('');
    const parsed = parsePastedTextData(pastedContent);
    if (parsed.length === 0) {
      setErrorMessage('Không nhận diện được dữ liệu. Bạn có thể dán theo định dạng "Tên GV | Môn (Lớp 1, Lớp 2)" hoặc copy nguyên bảng từ Excel.');
    } else {
      setPreviewTeachers(parsed);
    }
  };

  // Nạp từ mẫu sẵn
  const handleLoadPreset = (type: 'PHAN_BOI_CHAU' | 'TIEU_HOC' | 'THPT') => {
    if (type === 'PHAN_BOI_CHAU') {
      setPreviewTeachers(PHAN_BOI_CHAU_DATA);
    } else if (type === 'TIEU_HOC') {
      // Mẫu Tiểu học Khối 1 - 5
      const tieuHocSample: PhanBoiChauTeacherData[] = [
        { stt: 1, name: 'Cô Trần Thị Loan', duty: 'GVCN', quota: 23, rawTeachingText: 'Tiếng Việt (1A1) + Toán (1A1) + Tự Nhiên & Xã Hội (1A1) + Đạo Đức (1A1) + HĐTN (1A1)' },
        { stt: 2, name: 'Cô Lê Thị Mai', duty: 'GVCN', quota: 23, rawTeachingText: 'Tiếng Việt (2A1) + Toán (2A1) + Tự Nhiên & Xã Hội (2A1) + Đạo Đức (2A1) + HĐTN (2A1)' },
        { stt: 3, name: 'Thầy Nguyễn Văn Hùng', duty: 'GVCN', quota: 23, rawTeachingText: 'Tiếng Việt (3A1) + Toán (3A1) + Tự Nhiên & Xã Hội (3A1) + Đạo Đức (3A1) + HĐTN (3A1)' },
        { stt: 4, name: 'Cô Đặng Thu Trang', duty: 'GVCN', quota: 23, rawTeachingText: 'Tiếng Việt (4A1) + Toán (4A1) + Khoa Học (4A1) + Lịch Sử & Địa Lí (4A1) + Đạo Đức (4A1)' },
        { stt: 5, name: 'Thầy Hoàng Văn Hải', duty: 'GVCN', quota: 23, rawTeachingText: 'Tiếng Việt (5A1) + Toán (5A1) + Khoa Học (5A1) + Lịch Sử & Địa Lí (5A1) + Đạo Đức (5A1)' },
        { stt: 6, name: 'Cô Hoàng Ngọc Anh', duty: 'GV', quota: 20, rawTeachingText: 'Tiếng Anh (1A1, 2A1, 3A1, 4A1, 5A1)' },
        { stt: 7, name: 'Thầy Phạm Minh Đức', duty: 'GV', quota: 20, rawTeachingText: 'Giáo Dục Thể Chất (1A1, 2A1, 3A1, 4A1, 5A1)' },
        { stt: 8, name: 'Cô Vũ Thùy Linh', duty: 'GV', quota: 15, rawTeachingText: 'Âm Nhạc (1A1, 2A1, 3A1, 4A1, 5A1)' },
        { stt: 9, name: 'Cô Bùi Mỹ Dung', duty: 'GV', quota: 15, rawTeachingText: 'Mĩ Thuật (1A1, 2A1, 3A1, 4A1, 5A1)' },
        { stt: 10, name: 'Thầy Bùi Hoàng Hải', duty: 'GV', quota: 15, rawTeachingText: 'Tin Học & Công Nghệ (3A1, 4A1, 5A1)' },
      ];
      setPreviewTeachers(tieuHocSample);
    } else if (type === 'THPT') {
      const thptSample: PhanBoiChauTeacherData[] = [
        { stt: 1, name: 'Thầy Đỗ Minh Hoàng', duty: 'Tổ Trưởng', quota: 16, rawTeachingText: 'Toán (10A1, 10A2, 11A1, 12A1)' },
        { stt: 2, name: 'Cô Nguyễn Thị Lan', duty: 'GV', quota: 19, rawTeachingText: 'Toán (10A3, 11A2, 11A3, 12A2)' },
        { stt: 3, name: 'Thầy Lê Văn Thành', duty: 'GV', quota: 19, rawTeachingText: 'Ngữ Văn (10A1, 10A2, 11A1, 12A1)' },
        { stt: 4, name: 'Cô Phạm Bích Ngọc', duty: 'GV', quota: 19, rawTeachingText: 'Tiếng Anh (10A1, 10A2, 10A3, 11A1, 12A1)' },
        { stt: 5, name: 'Thầy Vũ Quốc Dũng', duty: 'GV', quota: 19, rawTeachingText: 'Vật Lý (10A1, 10A2, 11A1, 11A2, 12A1, 12A2)' },
        { stt: 6, name: 'Cô Trần Kim Oanh', duty: 'GV', quota: 19, rawTeachingText: 'Hóa Học (10A1, 10A2, 11A1, 11A2, 12A1, 12A2)' },
        { stt: 7, name: 'Thầy Bùi Anh Tuấn', duty: 'GV', quota: 19, rawTeachingText: 'Sinh Học (10A1, 10A2, 11A1, 12A1, 12A2)' },
      ];
      setPreviewTeachers(thptSample);
    }
  };

  // Xác nhận nạp
  const handleConfirmImport = () => {
    if (previewTeachers.length > 0) {
      onImportSuccess(previewTeachers);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Trung Tâm Nhập Dữ Liệu Đa Nguồn</h3>
              <p className="text-xs text-slate-400">
                Hỗ trợ File Excel (.xlsx), Dán Clipboard từ Word/Excel, File CSV, và Thư viện mẫu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Nguồn Dữ Liệu */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveSourceTab('EXCEL')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSourceTab === 'EXCEL'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>1. Tải File Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => setActiveSourceTab('PASTE')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSourceTab === 'PASTE'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>2. Dán Bảng (Paste)</span>
            </button>

            <button
              onClick={() => setActiveSourceTab('PRESET')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSourceTab === 'PRESET'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Mẫu Chuẩn Có Sẵn</span>
            </button>
          </div>

          {/* Nút tải file Excel mẫu */}
          <button
            onClick={downloadSampleExcelTemplate}
            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded border border-emerald-800 bg-emerald-950/40"
            title="Tải file Excel mẫu để điền"
          >
            <Download className="w-3 h-3" />
            <span>Tải File Excel Mẫu</span>
          </button>
        </div>

        {/* Nội dung từng tab nguồn */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: UPLOAD FILE EXCEL */}
          {activeSourceTab === 'EXCEL' && (
            <div className="space-y-3">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-8 text-center bg-slate-950/60 hover:bg-emerald-950/10 cursor-pointer transition-all space-y-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-200">
                  Kéo thả file Excel (.xlsx, .xls) vào đây hoặc <span className="text-emerald-400 underline">Bấm để chọn file</span>
                </p>
                <p className="text-xs text-slate-400">
                  Tự động quét cột Họ tên, Định mức và cột Giảng dạy (VD: <code className="text-emerald-300 font-mono">Toán (6A1, 6A2) + Tin (6A1)</code>)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: COPY-PASTE TỪ CLIPBOARD */}
          {activeSourceTab === 'PASTE' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span>💡 Bạn có thể copy cả bảng từ Excel/Word hoặc dán từng dòng: <code className="text-brand-300 font-mono">Tên GV | Môn (Lớp1, Lớp2)</code></span>
              </div>
              <textarea
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder="Dán (Ctrl + V) dữ liệu bảng phân công vào đây...&#10;Ví dụ:&#10;Tạ Thanh Thủy	Tổ Trưởng	16	Toán (7A2, 8A6, 9A7) + Tin (7A1, 7A2, 7A3, 7A4)&#10;Trần Trung Kiên	T.Phó	18	Toán (6A4, 8A1, 8A8) + Tin (6A1, 6A2)&#10;Nguyễn Văn Hùng	GV	19	Văn (6A4, 6A7, 6A8) + HĐTN-HN (6A8)"
                rows={6}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleParsePasted}
                disabled={!pastedContent.trim()}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  pastedContent.trim()
                    ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-md'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Phân Tích Dữ Liệu Vừa Dán
              </button>
            </div>
          )}

          {/* TAB 3: THƯ VIỆN MẪU CÓ SẴN */}
          {activeSourceTab === 'PRESET' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                onClick={() => handleLoadPreset('PHAN_BOI_CHAU')}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-brand-500 cursor-pointer transition-all space-y-2 group"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-600/20 text-brand-400 flex items-center justify-center font-bold">
                  THCS
                </div>
                <strong className="text-xs font-bold text-white block group-hover:text-brand-300">
                  Trường THCS Phan Bội Châu
                </strong>
                <p className="text-[11px] text-slate-400">
                  Chuẩn mẫu văn bản chính thức (56 Giáo viên • 31 Lớp Khối 6 đến Khối 9).
                </p>
              </div>

              <div
                onClick={() => handleLoadPreset('TIEU_HOC')}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 cursor-pointer transition-all space-y-2 group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                  Cấp 1
                </div>
                <strong className="text-xs font-bold text-white block group-hover:text-emerald-300">
                  Trường Tiểu Học Chuẩn
                </strong>
                <p className="text-[11px] text-slate-400">
                  Chuẩn GVCN dạy môn chính & GV Bộ môn (Khối 1 đến Khối 5).
                </p>
              </div>

              <div
                onClick={() => handleLoadPreset('THPT')}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500 cursor-pointer transition-all space-y-2 group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">
                  THPT
                </div>
                <strong className="text-xs font-bold text-white block group-hover:text-purple-300">
                  Trường THPT Chu Văn An
                </strong>
                <p className="text-[11px] text-slate-400">
                  Mô hình phân công theo tổ bộ môn cấp 3 (Khối 10, 11, 12).
                </p>
              </div>
            </div>
          )}

          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-700 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* KHU VỰC XEM TRƯỚC KẾT QUẢ PHÂN TÍCH */}
          {previewTeachers.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Đã nhận diện thành công {previewTeachers.length} giáo viên:</span>
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 sticky top-0 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2 w-12 text-center">STT</th>
                      <th className="p-2 w-48">Họ và Tên</th>
                      <th className="p-2 w-24">Chức vụ</th>
                      <th className="p-2">Phân công giảng dạy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {previewTeachers.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-bold text-white">{t.name}</td>
                        <td className="p-2 text-slate-400">{t.duty}</td>
                        <td className="p-2 text-emerald-300">{t.rawTeachingText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
          >
            Đóng
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={previewTeachers.length === 0}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
              previewTeachers.length > 0
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Xác Nhận Nạp {previewTeachers.length} Giáo Viên Vào Hệ Thống
          </button>
        </div>
      </div>
    </div>
  );
};
