import React from 'react';
import { Sparkles, X, CheckCircle, AlertCircle, Clock, Hash, Zap } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';

export const GenerationProgressModal: React.FC = () => {
  const isGenerating = useScheduleStore((state) => state.isGenerating);
  const progress = useScheduleStore((state) => state.generationProgress);
  const cancelAutoGenerate = useScheduleStore((state) => state.cancelAutoGenerate);

  if (!isGenerating && progress.status === 'idle') return null;

  const isCompleted = progress.status === 'completed';
  const isFailed = progress.status === 'failed';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-brand-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                {isCompleted ? (
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                ) : isFailed ? (
                  <AlertCircle className="w-6 h-6 text-rose-400" />
                ) : (
                  <Sparkles className="w-6 h-6 text-brand-400 animate-spin" />
                )}
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isCompleted ? 'Xếp Lịch Thành Công!' : isFailed ? 'Đã Xảy Ra Lỗi' : 'Thuật Toán Web Worker Đang Chạy'}
              </h3>
              <p className="text-xs text-slate-400">
                {isCompleted
                  ? 'Thời khóa biểu đã sẵn sàng và được tối ưu hóa'
                  : 'Xử lý đa luồng độc lập, giao diện không bị giật lag'}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium truncate max-w-[280px]">
              {progress.phase || 'Đang phân tích các ràng buộc...'}
            </span>
            <span className="font-mono font-bold text-brand-400 text-sm">
              {progress.progress}%
            </span>
          </div>

          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : isFailed
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500 animate-pulse'
              }`}
              style={{ width: `${Math.max(5, progress.progress)}%` }}
            />
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
            <Hash className="w-4 h-4 text-brand-400 mb-1" />
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Số Vòng Lặp</span>
            <strong className="text-sm font-mono text-white mt-0.5">
              {progress.iterations.toLocaleString()}
            </strong>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
            <Zap className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Đã Xếp</span>
            <strong className="text-sm font-mono text-emerald-400 mt-0.5">
              {progress.scheduledPeriods} / {progress.totalPeriodsToSchedule}t
            </strong>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
            <Clock className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Thời Gian</span>
            <strong className="text-sm font-mono text-white mt-0.5">
              {(progress.timeElapsedMs / 1000).toFixed(1)}s
            </strong>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2 flex justify-end">
          {isGenerating ? (
            <button
              onClick={cancelAutoGenerate}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all border border-slate-700"
            >
              Hủy Quá Trình
            </button>
          ) : (
            <button
              onClick={cancelAutoGenerate}
              className="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all"
            >
              Đóng & Xem Thời Khóa Biểu
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
