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
            inputPlaceholder: 'กรอกรหัสผ่าน...',
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
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm text-xs uppercase text-slate-500 font-bold">
                            <tr>
                                <th className="px-3 py-3 border-r text-center min-w-[100px]">Action</th>
                                <th className="px-3 py-3 border-r min-w-[120px]">สาขา</th>
                                <th className="px-3 py-3 border-r min-w-[200px]">สินค้า</th>
                                <th className="px-3 py-3 border-r text-center min-w-[80px]">จำนวน</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">วันที่แจ้ง</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">NCR No.</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">COL No.</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">Neo Doc</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">เลขที่เอกสาร (R)</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">เลขที่ใบคุม (TM)</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">เลข Invoice</th>
                                <th className="px-3 py-3 border-r min-w-[150px]">ลูกค้า</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">ผู้พบปัญหา</th>
                                <th className="px-3 py-3 min-w-[120px]">ปลายทาง</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {documentedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="p-8 text-center text-slate-400">ไม่มีรายการที่รอปิดงาน</td>
                                </tr>
                            ) : (
                                documentedItems.map(item => {
                                    const isNCR = item.documentType === 'NCR' || !!item.ncrNumber || (item.id && item.id.startsWith('NCR'));
                                    return (
                                        <tr key={item.id} className={`transition-colors border-b last:border-0 align-top text-xs text-slate-700 ${isNCR ? 'bg-amber-50/50 hover:bg-amber-100/50' : 'bg-teal-50/50 hover:bg-teal-100/50'}`}>
                                            <td className="px-3 py-2 border-r text-center align-top">
                                                <div className="flex items-center justify-center gap-1">
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
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 border-r align-top">
                                                <span className="font-bold flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {item.branch}</span>
                                            </td>
                                            <td className="px-3 py-2 border-r align-top">
                                                <div className="font-bold text-slate-800">{item.productCode}</div>
                                                <div className="line-clamp-2" title={item.productName}>{item.productName}</div>
                                            </td>
                                            <td className="px-3 py-2 border-r text-center font-bold text-slate-700">
                                                {item.quantity} {item.unit}
                                            </td>
                                            <td className="px-3 py-2 border-r text-slate-600">{item.dateRequested}</td>
                                            <td className="px-3 py-2 border-r text-slate-700">{item.ncrNumber || '-'}</td>
                                            <td className="px-3 py-2 border-r text-indigo-700 font-bold">{item.collectionOrderId || '-'}</td>
                                            <td className="px-3 py-2 border-r text-slate-700">{item.neoRefNo || '-'}</td>
                                            <td className="px-3 py-2 border-r font-mono text-blue-700 font-bold">{item.refNo || '-'}</td>
                                            <td className="px-3 py-2 border-r font-mono text-slate-700">{item.transportManifestNo || '-'}</td>
                                            <td className="px-3 py-2 border-r font-mono text-slate-700">{item.invoiceNo || '-'}</td>
                                            <td className="px-3 py-2 border-r text-slate-700">{item.customerName}</td>
                                            <td className="px-3 py-2 border-r text-slate-700">{item.founder || '-'}</td>
                                            <td className="px-3 py-2 align-top">
                                                <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 block text-center">
                                                    {item.destinationCustomer || item.dispositionRoute || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
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
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm text-xs uppercase text-slate-500 font-bold">
                            <tr>
                                <th className="px-3 py-3 border-r min-w-[120px]">สาขา</th>
                                <th className="px-3 py-3 border-r min-w-[200px]">สินค้า</th>
                                <th className="px-3 py-3 border-r text-center min-w-[80px]">จำนวน</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">วันที่ปิดงาน</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">NCR No.</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">COL No.</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">Neo Doc</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">เลขที่เอกสาร (R)</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">เลขที่ใบคุม (TM)</th>
                                <th className="px-3 py-3 border-r min-w-[100px]">เลข Invoice</th>
                                <th className="px-3 py-3 border-r min-w-[150px]">ลูกค้า</th>
                                <th className="px-3 py-3 min-w-[100px]">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {completedItems.slice(0, 20).map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors opacity-75 align-top text-xs text-slate-700">
                                    <td className="px-3 py-2 border-r">
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {item.branch}</span>
                                    </td>
                                    <td className="px-3 py-2 border-r">
                                        <div className="font-bold text-slate-700">{item.productCode}</div>
                                        <div className="text-slate-500" title={item.productName}>{item.productName}</div>
                                    </td>
                                    <td className="px-3 py-2 border-r text-center font-bold text-slate-600">
                                        {item.quantity} {item.unit}
                                    </td>
                                    <td className="px-3 py-2 border-r text-slate-600">{item.dateCompleted}</td>
                                    <td className="px-3 py-2 border-r text-slate-600">{item.ncrNumber || '-'}</td>
                                    <td className="px-3 py-2 border-r text-indigo-600 font-bold">{item.collectionOrderId || '-'}</td>
                                    <td className="px-3 py-2 border-r text-slate-600">{item.neoRefNo || '-'}</td>
                                    <td className="px-3 py-2 border-r font-mono text-blue-600 font-bold">{item.refNo || '-'}</td>
                                    <td className="px-3 py-2 border-r font-mono text-slate-600">{item.transportManifestNo || '-'}</td>
                                    <td className="px-3 py-2 border-r font-mono text-slate-600">{item.invoiceNo || '-'}</td>
                                    <td className="px-3 py-2 border-r text-slate-600">{item.customerName}</td>
                                    <td className="px-3 py-2"><DispositionBadge disposition={item.disposition} /></td>
                                </tr>
                            ))}
                            {completedItems.length === 0 && (
                                <tr><td colSpan={12} className="p-8 text-center text-slate-400 italic">ยังไม่มีรายการที่จบงาน</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};
