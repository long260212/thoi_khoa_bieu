import React, { useState } from 'react';
import { useScheduleStore } from './store/useScheduleStore';
import { Navbar } from './components/common/Navbar';
import { TeacherSidebar } from './components/DataEntry/TeacherSidebar';
import { VirtualizedDataGrid } from './components/DataEntry/VirtualizedDataGrid';
import { TimetableMatrix } from './components/Timetable/TimetableMatrix';
import { GenerationProgressModal } from './components/Timetable/GenerationProgressModal';
import { MasterDataModal } from './components/MasterData/MasterDataModal';

export const App: React.FC = () => {
  const activeView = useScheduleStore((state) => state.activeView);
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Top Navbar */}
      <Navbar onOpenMasterData={() => setIsMasterDataOpen(true)} />

      {/* Main Workspace Body */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeView === 'DATA_ENTRY' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Virtualized Teacher List Sidebar */}
            <TeacherSidebar onAddNewTeacher={() => setIsMasterDataOpen(true)} />

            {/* Right Excel-like Data Grid with Keyboard navigation */}
            <VirtualizedDataGrid />
          </div>
        ) : (
          /* Timetable Views: Class, Teacher, or Master Matrix */
          <TimetableMatrix />
        )}
      </main>

      {/* Background Web Worker Generation Progress Modal */}
      <GenerationProgressModal />

      {/* Master Data Management Modal */}
      <MasterDataModal
        isOpen={isMasterDataOpen}
        onClose={() => setIsMasterDataOpen(false)}
      />
    </div>
  );
};

export default App;
