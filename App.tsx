import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Operations from './components/Operations';
import NCRSystem from './components/NCRSystem';
import NCRReport from './components/NCRReport';
import COLReport from './components/COLReport';
import Inventory from './components/Inventory';
import CollectionSystem from './components/CollectionSystem';
import LoginPage from './components/LoginPage';

import { AppView, ReturnRecord } from './types';
import { Bell, Menu } from 'lucide-react';
import { DataProvider } from './DataContext';
import { AuthProvider, useAuth } from './AuthContext';
import { getRoleDisplayName } from './utils/permissions';

const MainApp: React.FC = () => {
  const { user, login } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [transferData, setTransferData] = useState<Partial<ReturnRecord> | null>(null);
  const [operationsInitialStep, setOperationsInitialStep] = useState<number | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // แสดง LoginPage ถ้ายังไม่ได้ Login
  if (!user) {
    return <LoginPage onLoginSuccess={login} />;
  }

  const handleNCRTransfer = (data: Partial<ReturnRecord>) => {
    setTransferData(data);
    setCurrentView(AppView.OPERATIONS);
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard />;
      case AppView.OPERATIONS:
        return (
          <Operations
            initialData={transferData}
            onClearInitialData={() => setTransferData(null)}
            initialStep={operationsInitialStep}
          />
        );
      case AppView.NCR:
        return <NCRSystem />;
      case AppView.NCR_REPORT:
        return <NCRReport onTransfer={handleNCRTransfer} />;
      case AppView.COL_REPORT:
        return <COLReport />;
      case AppView.INVENTORY:
        return <Inventory />;
      case AppView.COLLECTION:
        return <CollectionSystem onNavigate={(view, step) => {
          setCurrentView(view);
          if (step) setOperationsInitialStep(step);
        }} />;

      default:
        return <Dashboard />;
    }
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return 'ภาพรวม (Dashboard)';
      case AppView.OPERATIONS: return 'ศูนย์ปฏิบัติการ (Operations Hub)';
      case AppView.NCR: return 'ระบบแจ้งปัญหา (NCR System)';
      case AppView.NCR_REPORT: return 'รายงาน NCR';
      case AppView.COL_REPORT: return 'รายงาน COL';
      case AppView.INVENTORY: return 'คลังสินค้า (Inventory)';
      case AppView.COLLECTION: return 'งานรับสินค้า (Collection)';
      default: return 'Neosiam Return';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 print:h-auto print:overflow-visible print:block relative">
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 print:h-auto print:overflow-visible w-full">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8 shadow-sm z-10 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="เมนู"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg md:text-xl font-semibold text-slate-800 truncate max-w-[200px] md:max-w-none">
              {getHeaderTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="การแจ้งเตือน"
              title="การแจ้งเตือน"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-3 md:pl-4 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-800">{user.displayName}</p>
                <p className="text-xs text-slate-500">{getRoleDisplayName(user.role)}</p>
              </div>
              <img
                src={user.photoURL || 'https://img2.pic.in.th/pic/logo-neo.png'}
                alt="User Avatar"
                className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover bg-white p-1 border border-slate-200"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto print:overflow-visible print:h-auto w-full relative">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </DataProvider>
  );
}

export default App;