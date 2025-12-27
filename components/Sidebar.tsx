import React, { useEffect, useRef } from 'react';
import { LayoutDashboard, LogOut, ScanBarcode, AlertOctagon, FileBarChart, Wifi, LayoutGrid, BarChart, Truck, X, Settings } from 'lucide-react';
import { AppView } from '../types';
import { ref, set } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { getRoleDisplayName, getRoleColor, canAccessView } from '../utils/permissions';
import Swal from 'sweetalert2';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen = false, onClose }) => {
  const { user, logout } = useAuth();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && window.innerWidth < 1024) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const menuItems = [
    { id: AppView.DASHBOARD, label: 'ภาพรวม (Dashboard)', icon: LayoutDashboard },
    { id: AppView.OPERATIONS, label: 'ปฏิบัติการ (Operations)', icon: ScanBarcode },
    { id: AppView.NCR, label: 'NCR (สินค้าตีกลับ)', icon: AlertOctagon },
    { id: AppView.NCR_REPORT, label: 'รายงาน NCR', icon: FileBarChart },
    { id: AppView.INVENTORY, label: 'คลังสินค้า (Inventory)', icon: LayoutGrid },
    { id: AppView.COLLECTION, label: 'งานรับสินค้า (Collection Tasks)', icon: Truck },
    { id: AppView.COL_REPORT, label: 'รายงาน COL', icon: BarChart },
    { id: AppView.SETTINGS, label: 'ตั้งค่าระบบ', icon: Settings },
  ];

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
    } catch (error: unknown) {
      alert(`❌ เชื่อมต่อล้มเหลว (Failed): ${(error as Error).message}\nกรุณาตรวจสอบ Config หรือ Security Rules`);
    }
  };



  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'ต้องการออกจากระบบ?',
      text: "คุณต้องทำการเข้าสู่ระบบใหม่เพื่อใช้งาน",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      background: '#fff',
      customClass: {
        popup: 'rounded-2xl shadow-xl border border-slate-100'
      }
    });

    if (result.isConfirmed) {
      await logout();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        aria-hidden="true"
      />

      {/* Sidebar Container */}
      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-64 bg-slate-900/80 backdrop-blur-md text-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 lg:static lg:shadow-none flex flex-col h-full print:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
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
          {/* Close Button Mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
            aria-label="ปิดเมนู"
            title="ปิดเมนู"
          >
            <X className="w-6 h-6" />
          </button>
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

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChangeView(item.id);
                  onClose?.(); // Close sidebar on selection (mobile)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-500
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2 mt-auto">
          <button
            onClick={handleTestConnection}
            className="flex items-center gap-3 text-green-400 hover:text-green-300 hover:bg-slate-800 px-4 py-3 w-full text-sm rounded-lg transition-colors border border-transparent hover:border-slate-700"
          >
            <Wifi className="w-5 h-5" />
            <span className="truncate">ทดสอบเชื่อมต่อ DB</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-slate-800 px-4 py-3 w-full text-sm transition-colors rounded-lg border border-transparent hover:border-slate-700"
          >
            <LogOut className="w-5 h-5" />
            <span className="truncate">ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;