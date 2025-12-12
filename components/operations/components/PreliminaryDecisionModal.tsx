import React, { useState } from 'react';
import { Share2, Truck, DollarSign, Trash2, Home, FileText } from 'lucide-react';

interface PreliminaryDecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (decision: string, route?: string) => void;
}

export const PreliminaryDecisionModal: React.FC<PreliminaryDecisionModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [selectedDecision, setSelectedDecision] = useState<string>('');
    const [selectedRoute, setSelectedRoute] = useState<string>('');
    const [otherRoute, setOtherRoute] = useState<string>('');
    const [validationError, setValidationError] = useState<string>('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!selectedDecision) {
            setValidationError('กรุณาเลือกการตัดสินใจเบื้องต้น');
            return;
        }

        let finalRoute = '';
        if (selectedDecision === 'Return') {
            if (!selectedRoute) {
                setValidationError('กรุณาระบุเส้นทางส่งคืน');
                return;
            }
            if (selectedRoute === 'Other' && !otherRoute) {
                setValidationError('กรุณาระบุเส้นทางอื่นๆ');
                return;
            }
            finalRoute = selectedRoute === 'Other' ? otherRoute : selectedRoute;
        }

        onConfirm(selectedDecision, finalRoute);
        // Reset state
        setSelectedDecision('');
        setSelectedRoute('');
        setOtherRoute('');
        setValidationError('');
    };

    const handleOptionSelect = (role: string) => {
        setSelectedDecision(role);
        setValidationError('');
        if (role !== 'Return') {
            setSelectedRoute('');
            setOtherRoute('');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white shadow-xl w-full h-full overflow-hidden animate-scale-in flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Share2 className="w-6 h-6 text-indigo-600" /> ตัดสินใจเบื้องต้น (Preliminary Decision)
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">กรุณาเลือกการจัดการเบื้องต้นสำหรับรายการนี้</p>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {validationError && (
                        <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-bold border border-red-100 mb-2">
                            ⚠ {validationError}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleOptionSelect('Return')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedDecision === 'Return' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}
                        >
                            <Truck className={`w-8 h-8 ${selectedDecision === 'Return' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className="font-bold">ส่งคืน (Return)</span>
                        </button>

                        <button
                            onClick={() => handleOptionSelect('Sell')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedDecision === 'Sell' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 hover:border-green-200 hover:bg-slate-50'}`}
                        >
                            <DollarSign className={`w-8 h-8 ${selectedDecision === 'Sell' ? 'text-green-600' : 'text-slate-400'}`} />
                            <span className="font-bold">ขาย (Sell)</span>
                        </button>

                        <button
                            onClick={() => handleOptionSelect('Scrap')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedDecision === 'Scrap' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}
                        >
                            <Trash2 className={`w-8 h-8 ${selectedDecision === 'Scrap' ? 'text-red-600' : 'text-slate-400'}`} />
                            <span className="font-bold">ทิ้ง (Scrap)</span>
                        </button>

                        <button
                            onClick={() => handleOptionSelect('Internal')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedDecision === 'Internal' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-amber-200 hover:bg-slate-50'}`}
                        >
                            <Home className={`w-8 h-8 ${selectedDecision === 'Internal' ? 'text-amber-600' : 'text-slate-400'}`} />
                            <span className="font-bold">ใช้ภายใน (Internal)</span>
                        </button>

                        <button
                            onClick={() => handleOptionSelect('Claim')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedDecision === 'Claim' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}
                        >
                            <FileText className={`w-8 h-8 ${selectedDecision === 'Claim' ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="font-bold">เคลมประกัน (Claim)</span>
                        </button>
                    </div>

                    {selectedDecision === 'Return' && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in">
                            <label className="block text-sm font-bold text-slate-700 mb-2">ระบุเส้นทางส่งคืน (Select Route)</label>
                            <div className="space-y-2">
                                {['สาย 3', 'Sino Pacific Trading', 'NEO CORPORATE'].map(route => (
                                    <label key={route} className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200 hover:border-indigo-300 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="route"
                                            value={route}
                                            checked={selectedRoute === route}
                                            onChange={(e) => setSelectedRoute(e.target.value)}
                                            className="w-4 h-4 text-indigo-600"
                                        />
                                        <span>{route}</span>
                                    </label>
                                ))}
                                <label className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200 hover:border-indigo-300 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="route"
                                        value="Other"
                                        checked={selectedRoute === 'Other'}
                                        onChange={(e) => setSelectedRoute(e.target.value)}
                                        className="w-4 h-4 text-indigo-600"
                                    />
                                    <span>อื่นๆ (Other)</span>
                                </label>
                                {selectedRoute === 'Other' && (
                                    <input
                                        type="text"
                                        value={otherRoute}
                                        onChange={(e) => setOtherRoute(e.target.value)}
                                        className="w-full p-2 mt-2 border border-slate-300 rounded text-sm"
                                        placeholder="ระบุเส้นทาง..."
                                    />
                                )}
                            </div>
                        </div>
                    )}

                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 transition-colors">ยกเลิก (Cancel)</button>
                    <button onClick={handleConfirm} className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2">
                        ยืนยัน (Confirm)
                    </button>
                </div>
            </div>
        </div>
    );
};
