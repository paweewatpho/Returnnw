import React from 'react';
import { LayoutGrid, PackageCheck, Calendar, RotateCcw, Share2, Truck, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { useData } from '../../../DataContext';
import { ReturnRecord, TransportInfo } from '../../../types';

import { RETURN_ROUTES } from '../../../constants';

interface Step4ConsolidationProps {
    onComplete?: () => void;
}

export const Step4Consolidation: React.FC<Step4ConsolidationProps> = ({ onComplete }) => {
    const { items, updateReturnRecord } = useData();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [consolidationDate, setConsolidationDate] = React.useState(new Date().toISOString().split('T')[0]);

    // Preliminary Decision State
    const [isDecisionModalOpen, setIsDecisionModalOpen] = React.useState(false);
    const [targetConsolidateIds, setTargetConsolidateIds] = React.useState<string[]>([]);
    const [tempRoute, setTempRoute] = React.useState<string>('');

    // Transport Info State
    const [transportMode, setTransportMode] = React.useState<'Company' | '3PL' | 'Other'>('Company');
    const [transportInfo, setTransportInfo] = React.useState<TransportInfo>({
        driverName: '',
        plateNumber: '',
        transportCompany: 'รถบริษัท'
    });

    // Filter Items: Status 'BranchReceived' or 'COL_BranchReceived'
    const receivedItems = React.useMemo(() => {
        return items.filter(item => item.status === 'BranchReceived' || item.status === 'COL_BranchReceived');
    }, [items]);

    const handleConsolidate = async (id: string) => {
        if (isSubmitting) return;

        // Open Decision Modal instead of Direct Confirmation
        setTargetConsolidateIds([id]);
        setTempRoute('');
        setIsDecisionModalOpen(true);
    };

    const confirmConsolidation = async () => {
        if (!tempRoute || tempRoute === 'Other') {
            await Swal.fire({
                icon: 'warning',
                title: 'กรุณาระบุเส้นทาง',
                text: 'สำหรับการคืนสินค้า กรุณาระบุเส้นทางส่งคืน',
                confirmButtonText: 'ตกลง'
            });

            return;
        }

        // Validation for Transport Info removed as UI is removed.
        // We will proceed with default/empty transport info.

        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            for (const id of targetConsolidateIds) {
                await updateReturnRecord(id, {
                    status: 'COL_Consolidated',
                    dateConsolidated: consolidationDate,
                    preliminaryDecision: 'Return',
                    preliminaryRoute: tempRoute,
                    transportInfo: transportInfo
                });
            }

            await Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: 'รวมสินค้าและบันทึกข้อมูลเรียบร้อยแล้ว',
                timer: 1500,
                showConfirmButton: false
            });

            setIsDecisionModalOpen(false);
            setTargetConsolidateIds([]);
            setTempRoute('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConsolidateAll = async () => {
        if (receivedItems.length === 0) return;
        if (isSubmitting) return;

        // Open Decision Modal for ALL items
        setTargetConsolidateIds(receivedItems.map(i => i.id));
        setTempRoute('');
        setIsDecisionModalOpen(true);
    };

    const handleUndo = async (id: string) => {
        if (isSubmitting) return;

        const { value: password } = await Swal.fire({
            title: 'ใส่รหัสผ่านเพื่อแก้ไข (Undo)',
            input: 'password',
            inputLabel: 'รหัสผ่าน (Password)',
            inputPlaceholder: 'ใส่รหัสผ่าน...',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });

        if (password === '1234') {
            setIsSubmitting(true);
            try {
                await updateReturnRecord(id, {
                    status: 'COL_BranchReceived'
                });
                Swal.fire('ย้อนกลับเรียบร้อย', '', 'success');
            } finally {
                setIsSubmitting(false);
            }
        } else if (password) {
            Swal.fire('รหัสผ่านไม่ถูกต้อง', '', 'error');
        }
    };

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <LayoutGrid className="w-6 h-6 text-slate-600" /> 4. รวมสินค้า (Branch Consolidation)
                </h3>
                {receivedItems.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                            <span className="text-sm font-bold text-slate-600">วันที่รวม:</span>
                            <input
                                type="date"
                                value={consolidationDate}
                                onChange={(e) => setConsolidationDate(e.target.value)}
                                className="outline-none text-slate-700 font-medium text-sm"
                            />
                        </div>
                        <button
                            onClick={handleConsolidateAll}
                            disabled={isSubmitting}
                            className="bg-slate-800 hover:bg-black text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isSubmitting ? 'กำลังทำงาน...' : `รวมสินค้าทั้งหมด (${receivedItems.length})`}
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-4 border-b">สาขา (Branch)</th>
                                <th className="p-4 border-b">ใบกำกับ / วันที่ (Inv / Date)</th>
                                <th className="p-4 border-b">จำนวน (Qty)</th>
                                <th className="p-4 border-b">เลขที่เอกสาร (Doc Info)</th>
                                <th className="p-4 border-b">ลูกค้าปลายทาง</th>
                                <th className="p-4 border-b">หมายเหตุ</th>
                                <th className="p-4 border-b text-center">สถานะ</th>
                                <th className="p-4 border-b text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {receivedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <PackageCheck className="w-8 h-8 opacity-20" />
                                            <span>ไม่มีรายการรอรวมสินค้า</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                receivedItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 align-top">
                                            <div className="font-bold text-slate-700">{item.branch}</div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="text-sm font-semibold text-slate-700">{item.invoiceNo || '-'}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                <span title="วันที่ใบคุมรถ">{item.controlDate || item.date || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="font-bold text-slate-700">{item.quantity} {item.unit}</div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1 text-xs">
                                                    <span className="font-bold text-slate-500 w-8">R:</span>
                                                    <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{item.documentNo || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs">
                                                    <span className="font-bold text-slate-500 w-8">TM:</span>
                                                    <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{item.tmNo || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs">
                                                    <span className="font-bold text-indigo-500 w-8">COL:</span>
                                                    <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{item.collectionOrderId || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top text-slate-600">
                                            {item.destinationCustomer || '-'}
                                        </td>
                                        <td className="p-4 align-top h-full">
                                            <div className="text-sm text-slate-600 max-w-xs">{item.notes || '-'}</div>
                                        </td>
                                        <td className="p-4 align-top text-center">
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                                Received
                                            </span>
                                        </td>
                                        <td className="p-4 align-top text-center">
                                            <button
                                                onClick={() => handleConsolidate(item.id)}
                                                disabled={isSubmitting}
                                                className="bg-slate-800 hover:bg-black text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 mx-auto whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
                                            >
                                                {isSubmitting ? '...' : <><PackageCheck className="w-4 h-4" /> รวมของ (Pack)</>}
                                            </button>
                                            <button
                                                onClick={() => handleUndo(item.id)}
                                                disabled={isSubmitting}
                                                className="mt-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors flex items-center gap-1 mx-auto text-xs disabled:opacity-50 disabled:cursor-wait"
                                                title="ย้อนกลับ (Undo)"
                                            >
                                                <RotateCcw className="w-3 h-3" /> แก้ไข/ย้อนกลับ
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Decision Modal */}
            {isDecisionModalOpen && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
                        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Share2 className="w-6 h-6 text-indigo-600" />
                                    เพิ่มการตัดสินใจเบื้องต้น (รวมสินค้า {targetConsolidateIds.length} รายการ)
                                </h3>
                                <button onClick={() => setIsDecisionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <p className="text-sm text-slate-600 mt-2">กรุณาเลือกการจัดการเบื้องต้นสำหรับรายการนี้ ก่อนบันทึก</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-slate-800 mb-2">ระบุเส้นทางส่งคืน (Return Route)</label>
                                <div className="border rounded-xl overflow-hidden bg-indigo-50/30">
                                    <div className="bg-indigo-100 px-4 py-2 border-b border-indigo-200 font-bold text-indigo-800 flex items-center gap-2 text-sm">
                                        <Truck className="w-4 h-4" /> เลือกเส้นทาง
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs text-slate-500 mb-3">กรุณาเลือกเส้นทางสำหรับการส่งคืนสินค้า</p>

                                        <div className="p-3 bg-white rounded border border-indigo-100 text-sm">
                                            <label className="block font-bold mb-2">เลือกเส้นทางส่งคืน <span className="text-red-500">*</span></label>
                                            <div className="flex flex-wrap gap-2">
                                                {RETURN_ROUTES.map(route => (
                                                    <label key={route} className={`px-3 py-1 rounded border cursor-pointer transition-all ${tempRoute === route ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-slate-50 hover:bg-indigo-50/50'}`}>
                                                        <input
                                                            type="radio"
                                                            name="tempRoute"
                                                            value={route}
                                                            checked={tempRoute === route}
                                                            onChange={(e) => setTempRoute(e.target.value)}
                                                            className="hidden"
                                                        />
                                                        {route}
                                                    </label>
                                                ))}
                                                <label className={`px-3 py-1 rounded border cursor-pointer transition-all ${tempRoute === 'Other' || (tempRoute && !RETURN_ROUTES.includes(tempRoute)) ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-slate-50 hover:bg-indigo-50/50'}`}>
                                                    <input
                                                        type="radio"
                                                        name="tempRoute"
                                                        value="Other"
                                                        checked={tempRoute === 'Other' || (tempRoute && !RETURN_ROUTES.includes(tempRoute))}
                                                        onChange={() => setTempRoute('Other')}
                                                        className="hidden"
                                                    />
                                                    อื่นๆ (Other)
                                                </label>
                                            </div>
                                            {(tempRoute === 'Other' || (tempRoute && !RETURN_ROUTES.includes(tempRoute))) && (
                                                <input
                                                    type="text"
                                                    value={tempRoute === 'Other' ? '' : tempRoute}
                                                    onChange={(e) => setTempRoute(e.target.value)}
                                                    className="w-full mt-2 p-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="ระบุเส้นทาง..."
                                                    autoFocus
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setIsDecisionModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors">
                                ยกเลิก
                            </button>
                            <button onClick={confirmConsolidation} disabled={isSubmitting} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-wait">
                                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก (Save)'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
