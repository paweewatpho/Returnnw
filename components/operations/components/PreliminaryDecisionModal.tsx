import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import { RETURN_ROUTES } from '../../../constants';

interface PreliminaryDecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (decision: string, route?: string) => void;
}

export const PreliminaryDecisionModal: React.FC<PreliminaryDecisionModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [selectedRoute, setSelectedRoute] = useState<string>('');
    const [otherRoute, setOtherRoute] = useState<string>('');
    const [validationError, setValidationError] = useState<string>('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!selectedRoute) {
            setValidationError('กรุณาระบุเส้นทางส่งคืน');
            return;
        }
        if (selectedRoute === 'Other' && !otherRoute) {
            setValidationError('กรุณาระบุเส้นทางอื่นๆ');
            return;
        }

        const finalRoute = selectedRoute === 'Other' ? otherRoute : selectedRoute;
        onConfirm('Return', finalRoute);

        // Reset state
        setSelectedRoute('');
        setOtherRoute('');
        setValidationError('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white shadow-xl w-full max-w-2xl rounded-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="w-6 h-6 text-indigo-600" /> ระบุเส้นทางส่งคืน (Return Route)
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">กรุณาเลือกเส้นทางสำหรับการส่งคืนสินค้า</p>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {validationError && (
                        <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-bold border border-red-100 mb-2">
                            ⚠ {validationError}
                        </div>
                    )}

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="block text-sm font-bold text-slate-700 mb-3">เลือกเส้นทางส่งคืน (Select Route) <span className="text-red-500">*</span></label>
                        <div className="space-y-2">
                            {RETURN_ROUTES.map(route => (
                                <label key={route} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 cursor-pointer transition-all hover:shadow-sm">
                                    <input
                                        type="radio"
                                        name="route"
                                        value={route}
                                        checked={selectedRoute === route}
                                        onChange={(e) => { setSelectedRoute(e.target.value); setValidationError(''); }}
                                        className="w-4 h-4 text-indigo-600"
                                    />
                                    <span className="font-medium">{route}</span>
                                </label>
                            ))}
                            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 cursor-pointer transition-all hover:shadow-sm">
                                <input
                                    type="radio"
                                    name="route"
                                    value="Other"
                                    checked={selectedRoute === 'Other'}
                                    onChange={(e) => { setSelectedRoute(e.target.value); setValidationError(''); }}
                                    className="w-4 h-4 text-indigo-600"
                                />
                                <span className="font-medium">อื่นๆ (Other)</span>
                            </label>
                            {selectedRoute === 'Other' && (
                                <input
                                    type="text"
                                    value={otherRoute}
                                    onChange={(e) => setOtherRoute(e.target.value)}
                                    className="w-full p-3 mt-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="ระบุเส้นทาง..."
                                    autoFocus
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 transition-colors">ยกเลิก (Cancel)</button>
                    <button onClick={handleConfirm} className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2">
                        ยืนยัน (Confirm)
                    </button>
                </div>
            </div>
        </div>
    );
};
