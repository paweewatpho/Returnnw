
import React, { useState } from 'react';
import {
    Truck, CheckCircle2, Clock, MapPin, Package, FileText,
    ArrowRight, User, X,
    Boxes, Lock
} from 'lucide-react';
import { useData } from '../DataContext';
import { useOperationsLogic } from './operations/hooks/useOperationsLogic';
import { Step1LogisticsRequest } from './operations/components/Step1LogisticsRequest';
import { Step2JobAccept } from './operations/components/Step2JobAccept';
import { Step3BranchReceive } from './operations/components/Step3BranchReceive';
import { Step4Consolidation } from './operations/components/Step4Consolidation';

// --- SUB-COMPONENTS ---

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        'Requested': 'bg-green-100 text-green-800 border-green-200',
        'JobAccepted': 'bg-blue-100 text-blue-800 border-blue-200',
        'BranchReceived': 'bg-indigo-100 text-indigo-800 border-indigo-200',
        'ReadyForLogistics': 'bg-slate-100 text-slate-800 border-slate-200',
        'InTransitToHub': 'bg-orange-100 text-orange-800 border-orange-200',
        'HubReceived': 'bg-amber-100 text-amber-800 border-amber-200',
        'DocsCompleted': 'bg-purple-100 text-purple-800 border-purple-200',
        'Completed': 'bg-green-100 text-green-800 border-green-200',

        // Legacy/Fallback
        'APPROVED_FOR_PICKUP': 'bg-green-100 text-green-800 border-green-200',
        'PICKUP_SCHEDULED': 'bg-blue-100 text-blue-800 border-blue-200',
        'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'ASSIGNED': 'bg-blue-100 text-blue-800 border-blue-200',
        'COLLECTED': 'bg-purple-100 text-purple-800 border-purple-200',
        'CONSOLIDATED': 'bg-slate-100 text-slate-800 border-slate-200',
        'IN_TRANSIT': 'bg-indigo-100 text-indigo-800 border-indigo-200',
        'ARRIVED_HQ': 'bg-green-100 text-green-800 border-green-200',
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles[status] || 'bg-gray-100'}`}>{status}</span>;
};

// --- MAIN COMPONENT ---

const CollectionSystem: React.FC = () => {
    // Hooks
    const { addReturnRecord, getNextReturnNumber, items, updateReturnRecord } = useData();
    const { state, derived, actions } = useOperationsLogic();

    // Local state for Navigation
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

    // Auth Modal State (Local)
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authPassword, setAuthPassword] = useState('');
    const [authAction, setAuthAction] = useState<'EDIT' | 'DELETE' | null>(null);

    const handleAuthSubmit = () => {
        if (authPassword !== '1234') {
            alert('รหัสผ่านไม่ถูกต้อง');
            return;
        }
        setShowAuthModal(false);
        setAuthPassword('');
        // Auth success logic if needed for specific actions
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        ระบบรับสินค้า
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">Inbound Collection System</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {[
                        { id: 1, label: '1. สร้างใบงาน (Create)', icon: FileText },
                        { id: 2, label: '2. รับงาน (Job Accept)', icon: CheckCircle2 },
                        { id: 3, label: '3. รับสินค้า (Branch Rx)', icon: Truck },
                        { id: 4, label: '4. รวมสินค้า (Consolidate)', icon: Boxes },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentStep(item.id as any)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all duration-200
                                ${currentStep === item.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 translate-x-1'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={`w-5 h-5 ${currentStep === item.id ? 'text-white' : 'text-slate-500'}`} />
                                <span>{item.label}</span>
                            </div>
                            {currentStep === item.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="bg-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">สถานะระบบ</div>
                        <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            Online
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 justify-between shadow-sm z-10">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {currentStep === 1 && <><FileText className="w-5 h-5 text-blue-600" /> สร้างใบสั่งงานรับกลับ (Create Return Request)</>}
                        {currentStep === 2 && <><CheckCircle2 className="w-5 h-5 text-blue-600" /> รับงานเข้าสาขา (Job Acceptance)</>}
                        {currentStep === 3 && <><Truck className="w-5 h-5 text-blue-600" /> รับสินค้าจริง (Physical Receive)</>}
                        {currentStep === 4 && <><Boxes className="w-5 h-5 text-blue-600" /> รวมสินค้า (Consolidation)</>}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm font-bold text-slate-800">Branch User</div>
                            <div className="text-xs text-slate-500">สาขา: พิษณุโลก</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto bg-slate-50 p-6 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />

                    {currentStep === 1 && (
                        <Step1LogisticsRequest
                            formData={state.formData}
                            requestItems={state.requestItems}
                            isCustomBranch={state.isCustomBranch}
                            uniqueCustomers={derived.uniqueCustomers}
                            uniqueDestinations={derived.uniqueDestinations}
                            uniqueProductCodes={derived.uniqueProductCodes}
                            uniqueProductNames={derived.uniqueProductNames}
                            setFormData={actions.setFormData}
                            setIsCustomBranch={actions.setIsCustomBranch}
                            setRequestItems={actions.setRequestItems}
                            handleAddItem={actions.handleAddItem}
                            handleRemoveItem={actions.handleRemoveItem}
                            handleRequestSubmit={actions.handleRequestSubmit}
                        />
                    )}
                    {currentStep === 2 && (
                        <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <Step2JobAccept />
                        </div>
                    )}
                    {currentStep === 3 && (
                        <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <Step3BranchReceive />
                        </div>
                    )}
                    {currentStep === 4 && (
                        <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <Step4Consolidation />
                        </div>
                    )}

                </main>
            </div>

            {showAuthModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="bg-slate-900 p-4 flex items-center justify-between">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Lock className="w-4 h-4 text-amber-400" /> ยืนยันสิทธิ์ (Authentication)
                            </h3>
                            <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-white transition"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <input
                                type="password"
                                autoFocus
                                className="w-full p-3 border border-slate-300 rounded-lg text-center text-2xl tracking-widest font-mono mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="PASSCODE"
                                value={authPassword}
                                onChange={e => setAuthPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAuthSubmit()}
                            />
                            <button onClick={handleAuthSubmit} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">
                                ยืนยัน (Confirm)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CollectionSystem;
