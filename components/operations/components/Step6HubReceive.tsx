
import React from 'react';
import { Truck, Inbox, MapPin, CheckCircle } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord } from '../../../types';
import Swal from 'sweetalert2';

export const Step6HubReceive: React.FC = () => {
    const { items, updateReturnRecord } = useData();
    const [filterBranch, setFilterBranch] = React.useState<string>('');
    const [filterCustomer, setFilterCustomer] = React.useState<string>('');
    const [filterDestination, setFilterDestination] = React.useState<string>('');

    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Filter Items: Status 'InTransitToHub', 'COL_InTransit', or 'NCR_InTransit'
    const incomingItems = React.useMemo(() => {
        return items.filter(item => item.status === 'InTransitToHub' || item.status === 'COL_InTransit' || item.status === 'NCR_InTransit');
    }, [items]);

    const handleHubReceive = async (id: string, currentItem?: ReturnRecord) => {
        const item = currentItem || items.find(i => i.id === id);
        if (!item) return;
        if (isSubmitting) return;

        // Logic: NCR -> QC (Step 4), Collection -> Docs (Step 7 - Skip QC)
        const isNCR = item.documentType === 'NCR' || !!item.ncrNumber || item.status === 'NCR_InTransit';
        const newStatus = isNCR ? 'NCR_HubReceived' : 'COL_HubReceived';

        const confirmMsg = isNCR
            ? 'ยืนยันรับสินค้า NCR เข้าสู่ Hub เพื่อตรวจสอบคุณภาพ (QC)?'
            : 'ยืนยันรับสินค้า Collection เข้าสู่ Hub (ข้าม QC ไปยังเอกสาร)?';

        const result = await Swal.fire({
            title: 'ยืนยันการรับเข้า',
            text: confirmMsg,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน (Confirm)',
            cancelButtonText: 'ยกเลิก (Cancel)'
        });

        if (result.isConfirmed) {
            setIsSubmitting(true);
            try {
                await updateReturnRecord(id, {
                    status: newStatus,
                    dateReceived: new Date().toISOString().split('T')[0]
                });

                await Swal.fire({
                    icon: 'success',
                    title: 'รับเข้า Hub สำเร็จ',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error("Receive Error:", error);
                Swal.fire('Error', 'Failed to receive item', 'error');
            } finally {
                setIsSubmitting(false);
            }
        }
    };



    const handleHubReceiveAll = async () => {
        if (filteredItems.length === 0) return;

        const result = await Swal.fire({
            title: 'ยืนยันรับทั้งหมด?',
            text: `ยืนยันการรับสินค้าเข้า Hub ทั้งหมด ${filteredItems.length} รายการ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'รับทั้งหมด (Receive All)',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            Swal.fire({
                title: 'กำลังดำเนินการ...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            for (const item of filteredItems) {
                const isNCR = item.documentType === 'NCR' || !!item.ncrNumber || item.status === 'NCR_InTransit';
                const newStatus = isNCR ? 'NCR_HubReceived' : 'COL_HubReceived';

                await updateReturnRecord(item.id, {
                    status: newStatus,
                    dateReceived: new Date().toISOString().split('T')[0]
                });
            }

            await Swal.fire({
                icon: 'success',
                title: 'รับเข้า Hub ทั้งหมดเรียบร้อย',
                timer: 1500,
                showConfirmButton: false
            });
        }
    };

    // Unique values for dropdowns
    const branches = React.useMemo(() => {
        const unique = new Set(incomingItems.map(item => item.branch).filter(Boolean));
        return Array.from(unique).sort();
    }, [incomingItems]);

    // Filtered items
    const filteredItems = React.useMemo(() => {
        return incomingItems.filter(item => {
            const matchBranch = !filterBranch || item.branch === filterBranch;
            const matchCustomer = !filterCustomer || (item.customerName && item.customerName.toLowerCase().includes(filterCustomer.toLowerCase()));
            const matchDestination = !filterDestination || (item.destinationCustomer && item.destinationCustomer.toLowerCase().includes(filterDestination.toLowerCase()));
            return matchBranch && matchCustomer && matchDestination;
        });
    }, [incomingItems, filterBranch, filterCustomer, filterDestination]);

    return (
        <div className="h-full overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-amber-500" /> 6. รับสินค้าเข้า Hub (Received at Hub)
                </h3>
                {filteredItems.length > 0 && (
                    <button
                        onClick={handleHubReceiveAll}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
                    >
                        รับทั้งหมด ({filteredItems.length})
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 space-y-3 sticky top-0 z-10">
                <div className="text-sm font-bold text-slate-700 mb-2">ตัวกรอง (Filters)</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">สาขาต้นทาง</label>
                        <select
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={filterBranch}
                            onChange={(e) => setFilterBranch(e.target.value)}
                        >
                            <option value="">ทั้งหมด</option>
                            {branches.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">ชื่อลูกค้า</label>
                        <input
                            type="text"
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="ค้นหาชื่อลูกค้า..."
                            value={filterCustomer}
                            onChange={(e) => setFilterCustomer(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">สถานที่ส่ง (ปลายทาง)</label>
                        <input
                            type="text"
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="ค้นหาสถานที่ส่ง..."
                            value={filterDestination}
                            onChange={(e) => setFilterDestination(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-xl border border-slate-200">
                    <Inbox className="w-12 h-12 mb-2 opacity-50" />
                    <p>ไม่พบรายการที่ส่งมายัง Hub</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {[...filteredItems].sort((a, b) => (b.ncrNumber || b.id).localeCompare(a.ncrNumber || a.id)).map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-sm">
                            <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-4 border-b border-slate-100 pb-3">
                                <div><span className="text-slate-500 text-xs block mb-1">สาขาต้นทาง</span><span className="font-bold text-slate-800 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {item.branch}</span></div>
                                <div><span className="text-slate-500 text-xs block mb-1">วันที่แจ้ง</span><span className="font-bold text-slate-800">{item.dateRequested || item.date}</span></div>
                                <div><span className="text-slate-500 text-xs block mb-1">NCR No.</span><span className="font-mono font-bold text-slate-800">{item.ncrNumber || '-'}</span></div>
                                <div><span className="text-slate-500 text-xs block mb-1">Neo Ref</span><span className="font-mono font-bold text-slate-800">{item.neoRefNo || '-'}</span></div>
                                <div><span className="text-slate-500 text-xs block mb-1">ลูกค้า</span><span className="font-bold text-slate-800 line-clamp-1" title={item.customerName}>{item.customerName || '-'}</span></div>
                                <div><span className="text-slate-500 text-xs block mb-1">ผู้พบปัญหา</span><span className="font-bold text-slate-800 line-clamp-1" title={item.founder}>{item.founder || '-'}</span></div>
                                <div><span className="text-slate-500 text-xs block mb-1">ปลายทาง</span><span className="font-bold text-slate-800 line-clamp-1" title={item.destinationCustomer}>{item.destinationCustomer || '-'}</span></div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg flex flex-col md:flex-row gap-4 items-center">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap gap-2 mb-1">
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-mono font-bold">{item.refNo}</span>
                                        <span className="text-slate-600 font-mono font-bold">{item.productCode}</span>
                                    </div>
                                    <div className="font-bold text-slate-900 text-base mb-1 truncate" title={item.productName}>{item.productName}</div>
                                    {item.problemDetail && <p className="text-xs text-slate-500 truncate">{item.problemDetail}</p>}
                                </div>

                                <div className="text-center min-w-[80px] bg-white px-3 py-1 rounded border border-slate-200">
                                    <span className="text-slate-400 text-[10px] block">จำนวน</span>
                                    <span className="font-bold text-lg text-blue-600">{item.quantity}</span> <span className="text-xs text-slate-500">{item.unit}</span>
                                </div>

                                <button onClick={() => handleHubReceive(item.id)} disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-wait">
                                    {isSubmitting ? (
                                        <>⏳ กำลังรับ...</>
                                    ) : (
                                        <><CheckCircle className="w-4 h-4" /> รับเข้า Hub</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
