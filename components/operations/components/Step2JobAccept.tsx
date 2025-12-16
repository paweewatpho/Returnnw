import React from 'react';
import { ClipboardList, Truck, X, Calendar, RotateCcw } from 'lucide-react';
import Swal from 'sweetalert2';
import { useData } from '../../../DataContext';
import { ReturnRecord, CollectionOrder } from '../../../types';
import { db } from '../../../firebase';
import { ref, set } from 'firebase/database';

interface Step2JobAcceptProps {
    onComplete?: () => void;
}

export const Step2JobAccept: React.FC<Step2JobAcceptProps> = ({ onComplete }) => {
    const { items, updateReturnRecord, deleteReturnRecord } = useData();

    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [showModal, setShowModal] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [pickupDate, setPickupDate] = React.useState(new Date().toISOString().split('T')[0]);

    // Handle Undo (Step 2 -> Step 1) implies deleting the request so it can be re-created or just removed
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
            const confirmResult = await Swal.fire({
                title: 'ยืนยันการลบใบงาน?',
                text: "การกระทำนี้จะลบใบงานนี้ถาวร คุณต้องสร้างใหม่ในขั้นตอนที่ 1",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ลบใบงาน (Delete)'
            });

            if (confirmResult.isConfirmed) {
                setIsSubmitting(true);
                try {
                    // Actual delete call
                    await deleteReturnRecord(id);
                    Swal.fire('ลบเรียบร้อย', '', 'success');
                } finally {
                    setIsSubmitting(false);
                }
            }
        } else if (password) {
            Swal.fire('รหัสผ่านไม่ถูกต้อง', '', 'error');
        }
    };

    // Filter Items: Status 'Requested' BUT exclude NCR (which go to NCR Hub Step 2)
    // Fix: Allow items with NCR Number IF they are explicitly marked as LOGISTICS (Legacy Fix)
    const requestedItems = React.useMemo(() => {
        return items.filter(item => {
            if (item.status !== 'Requested') return false;
            // Explicitly include LOGISTICS documents
            if (item.documentType === 'LOGISTICS') return true;
            // Exclude if it looks like an NCR (has NCR number or NCR type)
            if (item.documentType === 'NCR' || !!item.ncrNumber) return false;

            return true;
        });
    }, [items]);

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleCreateJob = async () => {
        if (selectedIds.length === 0) return;
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const newColId = `COL-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

            const newOrder: CollectionOrder = {
                id: newColId,
                driverId: 'Unspecified',
                vehiclePlate: 'Unspecified',
                linkedRmaIds: selectedIds,
                pickupLocation: {
                    name: 'Multiple Customers',
                    address: 'Multiple Addresses',
                    contactName: '-',
                    contactPhone: '-'
                },
                pickupDate: pickupDate,
                packageSummary: { totalBoxes: 1, description: 'Batch Collection' },
                status: 'ASSIGNED',
                createdDate: new Date().toISOString()
            };

            // 1. Create Order in Firebase
            await set(ref(db, `collection_orders/${newColId}`), newOrder);

            // 2. Update Items
            for (const id of selectedIds) {
                await updateReturnRecord(id, {
                    status: 'COL_JobAccepted',
                    collectionOrderId: newColId,
                    dateJobAccepted: new Date().toISOString()
                });
            }

            await Swal.fire({
                icon: 'success',
                title: 'สร้างงานสำเร็จ',
                text: `สร้างงานรับสินค้าเรียบร้อยแล้ว: ${newColId}`,
                timer: 2000,
                showConfirmButton: false
            });

            setShowModal(false);
            setSelectedIds([]);

            // Navigate to next step if callback provided
            if (onComplete) {
                onComplete();
            }
        } catch (error) {
            console.error('Error creating job:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถสร้างงานได้ กรุณาลองใหม่',
                confirmButtonColor: '#d33'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-blue-600" /> 2. รับงาน (Receive Job)
                </h3>
                {selectedIds.length > 0 && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                    >
                        <Truck className="w-5 h-5" /> สร้างงานรับสินค้า ({selectedIds.length})
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-4 border-b w-10">
                                    <input type="checkbox"
                                        onChange={(e) => setSelectedIds(e.target.checked ? requestedItems.map(i => i.id) : [])}
                                        checked={requestedItems.length > 0 && selectedIds.length === requestedItems.length}
                                    />
                                </th>
                                <th className="p-4 border-b">สาขา (Branch)</th>
                                <th className="p-4 border-b">ใบกำกับ / วันที่ (Inv / Date)</th>
                                <th className="p-4 border-b">จำนวน (Qty)</th>
                                <th className="p-4 border-b">เลขที่เอกสาร (Doc Info)</th>
                                <th className="p-4 border-b">ลูกค้าปลายทาง</th>
                                <th className="p-4 border-b">หมายเหตุ</th>
                                <th className="p-4 border-b text-center">Action</th>
                                <th className="p-4 border-b text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {requestedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <ClipboardList className="w-8 h-8 opacity-20" />
                                            <span>ไม่มีรายการใหม่ที่ต้องการการรับงาน</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                requestedItems.map(item => (
                                    <tr key={item.id} className="hover:bg-blue-50/50 transition-colors cursor-pointer" onClick={() => handleToggleSelect(item.id)}>
                                        <td className="p-4 align-top">
                                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => { }} className="accent-blue-600 w-4 h-4" />
                                        </td>
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
                                                    <span className="font-bold text-slate-500 w-6">R:</span>
                                                    <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{item.documentNo || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs">
                                                    <span className="font-bold text-slate-500 w-6">TM:</span>
                                                    <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{item.tmNo || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs">
                                                    <span className="font-bold text-indigo-500 w-6">COL:</span>
                                                    <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{item.collectionOrderId || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs">
                                                    <span className="font-bold text-blue-500 w-6">ID:</span>
                                                    <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{item.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top text-slate-600">
                                            {item.destinationCustomer || '-'}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="text-sm text-slate-600 max-w-xs">{item.notes || '-'}</div>
                                        </td>
                                        <td className="p-4 align-top text-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUndo(item.id);
                                                }}
                                                disabled={isSubmitting}
                                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-wait"
                                                title="ยกเลิก/ลบ (Undo)"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        </td>
                                        <td className="p-4 align-top text-center">
                                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">{item.status}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {
                showModal && (
                    <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                                <h3 className="font-bold flex items-center gap-2"><Truck className="w-5 h-5" /> สร้างงานรับสินค้า</h3>
                                <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">วันที่รับสินค้า (Date)</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={pickupDate}
                                        onChange={e => setPickupDate(e.target.value)}
                                    />
                                </div>
                                <button onClick={handleCreateJob} disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg transition-all mt-2 disabled:opacity-50 disabled:cursor-wait">
                                    {isSubmitting ? 'กำลังสร้างใบงาน...' : 'ยืนยัน (Confirm)'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
