import React from 'react';
import { Activity, Box, CheckSquare, Calendar, RotateCcw, X, Truck } from 'lucide-react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { useData } from '../../../DataContext';
// import { ReturnRecord } from '../../../types';

interface Step3BranchReceiveProps {
    onComplete?: () => void;
}

export const Step3BranchReceive: React.FC<Step3BranchReceiveProps> = ({ onComplete }) => {
    const { items, updateReturnRecord } = useData();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Modal State
    const [showModal, setShowModal] = React.useState(false);
    const [targetIds, setTargetIds] = React.useState<string[]>([]);

    // Form State
    const [receivedDate, setReceivedDate] = React.useState(new Date().toISOString().split('T')[0]);
    const [driverName, setDriverName] = React.useState('');
    const [plateNumber, setPlateNumber] = React.useState('');

    // Filter Items: Status 'JobAccepted' or 'COL_JobAccepted' ensuring NO NCR items (unless explicitly LOGISTICS)
    const acceptedItems = React.useMemo(() => {
        return items.filter(item => {
            // 1. Check Status
            const isStatusMatch = item.status === 'COL_JobAccepted' || item.status === 'JobAccepted';
            if (!isStatusMatch) return false;

            // 2. Explicitly INCLUDE 'LOGISTICS' type (even if it has an NCR number due to legacy data)
            if (item.documentType === 'LOGISTICS') return true;

            // 3. Exclude actual NCR items (Document Type 'NCR' OR has NCR Number)
            // If it's not explicitly LOGISTICS, we assume presence of NCR Number means it belongs to NCR flow
            if (item.documentType === 'NCR' || !!item.ncrNumber) return false;

            return true;
        });
    }, [items]);

    const handleReceiveItem = (id: string) => {
        if (isSubmitting) return;
        setTargetIds([id]);
        setDriverName('');
        setPlateNumber('');
        setShowModal(true);
    };

    const handleReceiveAll = () => {
        if (acceptedItems.length === 0) return;
        if (isSubmitting) return;
        setTargetIds(acceptedItems.map(i => i.id));
        setDriverName('');
        setPlateNumber('');
        setShowModal(true);
    };

    const confirmReceive = async () => {
        // Validation
        if (!receivedDate) {
            Swal.fire({ icon: 'warning', title: 'กรุณาระบุวันที่รับสินค้า' });
            return;
        }
        if (!driverName.trim()) {
            Swal.fire({ icon: 'warning', title: 'กรุณาระบุชื่อพนักงานขับรถ' });
            return;
        }
        if (!plateNumber.trim()) {
            Swal.fire({ icon: 'warning', title: 'กรุณาระบุทะเบียนรถ' });
            return;
        }

        setIsSubmitting(true);
        try {
            for (const id of targetIds) {
                await updateReturnRecord(id, {
                    status: 'COL_BranchReceived',
                    dateReceived: receivedDate,
                    dateBranchReceived: receivedDate,
                    transportInfo: {
                        driverName: driverName,
                        plateNumber: plateNumber,
                        transportCompany: 'Company' // Defaulting to internal/company as per context
                    }
                });
            }

            await Swal.fire({
                icon: 'success',
                title: 'รับสินค้าเรียบร้อย',
                text: `บันทึกข้อมูลรับสินค้า ${targetIds.length} รายการ`,
                timer: 1500,
                showConfirmButton: false
            });

            setShowModal(false);
            setTargetIds([]);

            // Auto-navigate if done
            if (acceptedItems.length === targetIds.length && onComplete) {
                onComplete();
            }
        } catch (error) {
            console.error("Error receiving items:", error);
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกข้อมูลได้' });
        } finally {
            setIsSubmitting(false);
        }
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
                    status: 'COL_JobAccepted'
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
        <div className="h-full flex flex-col p-6 animate-fade-in relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-indigo-600" /> 3. รับสินค้า (Branch Physical Receive)
                </h3>
                {acceptedItems.length > 0 && (
                    <button
                        onClick={handleReceiveAll}
                        disabled={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isSubmitting ? 'กำลังทำงาน...' : `รับสินค้าทั้งหมด (${acceptedItems.length})`}
                    </button>
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
                                <th className="p-4 border-b text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {acceptedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Box className="w-8 h-8 opacity-20" />
                                            <span>ไม่มีรายการที่ต้องรับสินค้า</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                acceptedItems.map(item => (
                                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
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
                                                    <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{item.collectionOrderId || item.id}</span>
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
                                            <button
                                                onClick={() => handleReceiveItem(item.id)}
                                                disabled={isSubmitting}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 mx-auto whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
                                            >
                                                {isSubmitting ? '...' : <><CheckSquare className="w-4 h-4" /> ยืนยันรับของ</>}
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

            {/* Receive Modal */}
            {showModal && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold flex items-center gap-2 text-lg">
                                <Truck className="w-5 h-5" /> ยืนยันข้อมูลรับสินค้า
                            </h3>
                            <button onClick={() => setShowModal(false)} className="hover:bg-indigo-700 p-1 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                <p className="text-sm text-indigo-800 font-bold mb-1">
                                    รายการที่เลือกรบ: <span className="text-indigo-600">{targetIds.length} รายการ</span>
                                </p>
                                <p className="text-xs text-indigo-600">กรุณาระบุข้อมูลคนขับและรถที่นำสินค้าเข้ามาส่ง</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">วันที่รับจริง (Received Date) <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                                    value={receivedDate}
                                    onChange={(e) => setReceivedDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อพนักงานขับรถ (Driver Name) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="ระบุชื่อพนักงานขับรถ..."
                                    value={driverName}
                                    onChange={(e) => setDriverName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">ทะเบียนรถ (License Plate) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="ระบุเลขทะเบียนรถ..."
                                    value={plateNumber}
                                    onChange={(e) => setPlateNumber(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={confirmReceive}
                                disabled={isSubmitting}
                                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-lg transition-all mt-4 disabled:opacity-50 disabled:cursor-wait flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? 'กำลังบันทึก...' : <>ยืนยันการรับสินค้า (Confirm)</>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
