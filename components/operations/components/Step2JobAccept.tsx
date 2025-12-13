import React from 'react';
import { ClipboardList, CheckCircle, Truck, X, Calendar, User } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord, CollectionOrder } from '../../../types';
import { db } from '../../../firebase';
import { ref, set } from 'firebase/database';
import { mockDrivers } from '../../../data/mockCollectionData';

export const Step2JobAccept: React.FC = () => {
    const { items, updateReturnRecord } = useData();

    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [showModal, setShowModal] = React.useState(false);
    const [driverId, setDriverId] = React.useState('');
    const [pickupDate, setPickupDate] = React.useState(new Date().toISOString().split('T')[0]);

    // Filter Items: Status 'Requested' BUT exclude NCR (which go to NCR Hub Step 2)
    const requestedItems = React.useMemo(() => {
        return items.filter(item => item.status === 'Requested' && item.documentType !== 'NCR' && !item.ncrNumber);
    }, [items]);

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleCreateJob = async () => {
        if (selectedIds.length === 0) return;
        if (!driverId) {
            alert('กรุณาเลือกคนขับรถ (Select Driver)');
            return;
        }

        const newColId = `COL-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

        const newOrder: CollectionOrder = {
            id: newColId,
            driverId: driverId,
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
        try {
            await set(ref(db, `collection_orders/${newColId}`), newOrder);

            // 2. Update Items
            for (const id of selectedIds) {
                await updateReturnRecord(id, {
                    status: 'COL_JobAccepted',
                    collectionOrderId: newColId
                });
            }

            alert(`สร้างงานรับสินค้าเรียบร้อยแล้ว: ${newColId}`);
            setShowModal(false);
            setSelectedIds([]);
            setDriverId('');
        } catch (error) {
            console.error('Error creating job:', error);
            alert('เกิดข้อผิดพลาดในการสร้างงาน');
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
                                <th className="p-4 border-b">ใบกำกับ/วันที่ (Inv/Date)</th>
                                <th className="p-4 border-b">เลขที่เอกสาร (Doc Info)</th>
                                <th className="p-4 border-b">ลูกค้าปลายทาง</th>
                                <th className="p-4 border-b">หมายเหตุ</th>
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
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {item.controlDate || item.date || '-'}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1 rounded w-fit">R: {item.refNo || '-'}</span>
                                                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1 rounded w-fit">TM: {item.tmNo || '-'}</span>
                                                <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1 rounded w-fit">COL: {item.id}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top text-slate-600">
                                            {item.destinationCustomer || '-'}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="text-sm text-slate-600 max-w-xs">{item.notes || '-'}</div>
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
            {showModal && (
                <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold flex items-center gap-2"><Truck className="w-5 h-5" /> สร้างงานรับสินค้า</h3>
                            <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">เลือกคนขับรถ (Driver)</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                                    {mockDrivers.map(d => (
                                        <label key={d.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer border ${driverId === d.id ? 'bg-blue-50 border-blue-500' : 'border-transparent hover:bg-slate-50'}`}>
                                            <input type="radio" name="driver" className="accent-blue-600" checked={driverId === d.id} onChange={() => setDriverId(d.id)} />
                                            <div>
                                                <div className="font-bold text-slate-800">{d.name}</div>
                                                <div className="text-xs text-slate-500">{d.plate}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">วันที่รับสินค้า (Date)</label>
                                <input type="date" className="w-full p-2 border border-slate-300 rounded-lg" value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
                            </div>
                            <button onClick={handleCreateJob} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg">ยืนยัน (Confirm)</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
