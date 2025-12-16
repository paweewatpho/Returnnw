import React from 'react';
import { FileText, MapPin, CheckCircle, RotateCcw } from 'lucide-react';
import { useData } from '../../../DataContext';
import { DispositionBadge } from './DispositionBadge';
import Swal from 'sweetalert2';

export const Step8Closure: React.FC = () => {
    const { items, updateReturnRecord } = useData();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Filter Items: Status 'DocsCompleted', 'COL_Documented', 'NCR_Documented', 'DirectReturn', 'ReturnToSupplier'
    const documentedItems = React.useMemo(() => {
        return items.filter(item =>
            item.status === 'DocsCompleted' ||
            item.status === 'COL_Documented' ||
            item.status === 'NCR_Documented' ||
            item.status === 'DirectReturn' ||
            item.status === 'ReturnToSupplier'
        );
    }, [items]);

    // Completed Items
    const completedItems = React.useMemo(() => {
        return items.filter(item => item.status === 'Completed').sort((a, b) => {
            return (new Date(b.dateCompleted || '').getTime() - new Date(a.dateCompleted || '').getTime());
        });
    }, [items]);

    const handleCompleteJob = async (id: string) => {
        if (isSubmitting) return;

        const result = await Swal.fire({
            title: 'ยืนยันปิดงาน',
            text: 'ยืนยันปิดงานรายการนี้ (Complete Job)?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            setIsSubmitting(true);
            try {
                await updateReturnRecord(id, {
                    status: 'Completed',
                    dateCompleted: new Date().toISOString().split('T')[0]
                });

                await Swal.fire({
                    icon: 'success',
                    title: 'ปิดงานเรียบร้อย',
                    timer: 1500,
                    showConfirmButton: false
                });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleUndo = async (item: any) => {
        if (isSubmitting) return;

        // 1. Password Protection
        const { value: password } = await Swal.fire({
            title: 'ย้อนกลับสถานะ (Undo)',
            text: 'กรอกรหัสผ่านเพื่อย้อนกลับไปขั้นตอน "เอกสาร (Docs)"',
            input: 'password',
            inputPlaceholder: 'Enter password',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#f59e0b', // Amber for Warning/Undo
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off'
            }
        });

        if (!password) return;

        if (password !== '1234') {
            await Swal.fire('รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            // 2. Determine Previous Status
            // Logic: Send back to Step 5 (Docs)
            // If NCR -> 'QCPassed'
            // If Collection -> 'ReceivedAtHub' (or 'COL_HubReceived')

            let targetStatus = 'ReceivedAtHub'; // Default Safe
            const isNCR = item.documentType === 'NCR' || item.ncrNumber || (item.id && item.id.startsWith('NCR'));

            if (isNCR) {
                targetStatus = 'QCPassed';
            } else {
                // Collection flow
                targetStatus = 'ReceivedAtHub';
            }

            // 3. Execute Update
            await updateReturnRecord(item.id, {
                status: targetStatus as any,
                // Clear docs/completion info if needed, but keeping history is usually fine.
                // Maybe clear specific flags if logic requires, but simple status revert is usually enough for the UI.
            });

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });

            Toast.fire({
                icon: 'success',
                title: `ย้อนกลับรายการ ${item.id} เรียบร้อย`
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in overflow-hidden">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-green-600" /> 6. รายการรอปิดงาน (Pending Completion)
            </h3>

            {/* Pending Items Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mb-6" style={{ maxHeight: '60%' }}>
                <div className="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                    <span className="font-bold text-purple-800">รายการที่ต้องดำเนินการ ({documentedItems.length})</span>
                </div>

                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-3 border-b text-center w-32">Action</th>
                                <th className="p-3 border-b">ID</th>
                                <th className="p-3 border-b">สาขา</th>
                                <th className="p-3 border-b">สินค้า</th>
                                <th className="p-3 border-b text-center">จำนวน</th>
                                <th className="p-3 border-b">วันที่แจ้ง</th>
                                <th className="p-3 border-b">NCR No.</th>
                                <th className="p-3 border-b">Neo Doc</th>
                                <th className="p-3 border-b">ลูกค้า</th>
                                <th className="p-3 border-b">ผู้พบปัญหา</th>
                                <th className="p-3 border-b">ปลายทาง</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {documentedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="p-8 text-center text-slate-400">ไม่มีรายการที่รอปิดงาน</td>
                                </tr>
                            ) : (
                                documentedItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-2 text-center flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => handleCompleteJob(item.id)}
                                                disabled={isSubmitting}
                                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded text-xs font-bold shadow-sm flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                                                title="ปิดงาน (Complete)"
                                            >
                                                {isSubmitting ? '...' : <><CheckCircle className="w-3 h-3" /> ปิดงาน</>}
                                            </button>
                                            <button
                                                onClick={() => handleUndo(item)}
                                                disabled={isSubmitting}
                                                className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-1.5 rounded text-xs font-bold shadow-sm flex items-center gap-1 transition-all active:scale-95 border border-amber-300 disabled:opacity-50 disabled:cursor-wait"
                                                title="ย้อนกลับ (Undo to Docs)"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                            </button>
                                        </td>
                                        <td className="p-3 font-mono text-xs text-slate-500">{item.id}</td>
                                        <td className="p-3">
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {item.branch}</span>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold text-slate-700">{item.productName}</div>
                                            <div className="text-xs text-slate-500">{item.productCode}</div>
                                        </td>
                                        <td className="p-3 text-center font-bold text-slate-600">
                                            {item.quantity} {item.unit}
                                        </td>
                                        <td className="p-3 text-xs text-slate-500">{item.dateRequested}</td>
                                        <td className="p-3 text-xs">{item.ncrNumber || '-'}</td>
                                        <td className="p-3 text-xs">{item.neoRefNo || '-'}</td>
                                        <td className="p-3 text-xs">{item.customerName}</td>
                                        <td className="p-3 text-xs">{item.founder || '-'}</td>
                                        <td className="p-3 text-xs">
                                            <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                                                {item.destinationCustomer || item.dispositionRoute || '-'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Completed Items Section (Bottom) */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" /> รายการที่จบงานแล้ว (Completed)
                </h3>
                <div className="bg-white rounded-xl border border-slate-200 flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0">
                            <tr>
                                <th className="p-3 w-20">ID</th>
                                <th className="p-3">สินค้า</th>
                                <th className="p-3">สาขา</th>
                                <th className="p-3">วันที่ปิดงาน</th>
                                <th className="p-3">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {completedItems.slice(0, 20).map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 opacity-75">
                                    <td className="p-3 text-xs font-mono">{item.id}</td>
                                    <td className="p-3">
                                        <div className="font-medium text-slate-700">{item.productName}</div>
                                    </td>
                                    <td className="p-3 text-xs">{item.branch}</td>
                                    <td className="p-3 text-xs">{item.dateCompleted}</td>
                                    <td className="p-3 text-xs"><DispositionBadge disposition={item.disposition} /></td>
                                </tr>
                            ))}
                            {completedItems.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">ยังไม่มีรายการที่จบงาน</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
