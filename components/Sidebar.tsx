
import React from 'react';
import { LayoutDashboard, Settings, LogOut, PackageOpen, ScanBarcode, AlertOctagon, FileBarChart, Wifi, LayoutGrid, BarChart, Truck, User as UserIcon } from 'lucide-react';
import { AppView } from '../types';
import { ref, set } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { getRoleDisplayName, getRoleColor, canAccessView } from '../utils/permissions';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: AppView.DASHBOARD, label: 'ภาพรวม (Dashboard)', icon: LayoutDashboard },
    { id: AppView.OPERATIONS, label: 'ปฏิบัติการ (Operations)', icon: ScanBarcode },
    { id: AppView.NCR, label: 'NCR (สินค้าตีกลับ)', icon: AlertOctagon },
    { id: AppView.NCR_REPORT, label: 'รายงาน NCR', icon: FileBarChart },
    { id: AppView.INVENTORY, label: 'คลังสินค้า (Inventory)', icon: LayoutGrid },
    { id: AppView.COLLECTION, label: 'งานรับสินค้า (Collection Tasks)', icon: Truck },
    { id: AppView.COL_REPORT, label: 'รายงาน COL', icon: BarChart },
  ];

  // กรอง menu items ตามสิทธิ์ของ user
  const visibleMenuItems = menuItems.filter(item => canAccessView(user?.role, item.id));

  const handleTestConnection = async () => {
    try {
      const testRef = ref(db, 'connection_test');
      await set(testRef, {
        status: 'online',
        timestamp: new Date().toISOString(),
        message: 'System is connected to Realtime Database'
      });
      alert("✅ เชื่อมต่อ Realtime Database สำเร็จ! (Connection Successful)\nข้อมูลถูกบันทึกไปยัง path: /connection_test");
    } catch (error: any) {
      alert(`❌ เชื่อมต่อล้มเหลว (Failed): ${error.message}\nกรุณาตรวจสอบ Config หรือ Security Rules`);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('ต้องการออกจากระบบหรือไม่?')) {
      await logout();
    }
  };

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col shadow-xl print:hidden">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <img
          src="https://img2.pic.in.th/pic/logo-neo.png"
          alt="Neo Logistics"
          className="w-10 h-10 object-contain bg-white rounded-lg p-1"
        />
        <div>
          <h1 className="text-lg font-bold tracking-tight">Neosiam Return</h1>
          <p className="text-xs text-slate-400">Management System</p>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <img
              src={user.photoURL || 'https://ui-avatars.com/api/?name=User'}
              alt={user.displayName}
              className="w-10 h-10 rounded-full border-2 border-slate-600"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
              <p className={`text-xs px-2 py-0.5 rounded-full inline-block ${getRoleColor(user.role)}`}>
                {getRoleDisplayName(user.role)}
              </p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-1">
        <button
          onClick={handleTestConnection}
          className="flex items-center gap-3 text-green-400 hover:text-green-300 hover:bg-slate-800 px-4 py-2 w-full text-sm rounded transition-colors"
        >
          <Wifi className="w-4 h-4" />
          ทดสอบเชื่อมต่อ DB
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-slate-800 px-4 py-2 w-full text-sm transition-colors rounded"
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
};

export default Sidebar;