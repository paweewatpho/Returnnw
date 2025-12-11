import React from 'react';
import { Truck, Inbox, MapPin, CheckCircle } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord } from '../../../types';

export const Step3HubReceive: React.FC = () => {
    const { items, updateReturnRecord } = useData();
    const [filterBranch, setFilterBranch] = React.useState<string>('');
    const [filterCustomer, setFilterCustomer] = React.useState<string>('');
    const [filterDestination, setFilterDestination] = React.useState<string>('');

    // Filter Items: Status 'PickupScheduled' (In Transit from Logistics)
    const requestedItems = React.useMemo(() => {
        return items.filter(item => item.status === 'PickupScheduled');
    }, [items]);

    const handleIntakeReceive = async (id: string) => {
        if (window.confirm('ยืนยันรับเข้าสินค้านี้เข้าสู่ Hub?')) {
            await updateReturnRecord(id, {
                status: 'ReceivedAtHub'
            });
        }
    };

    // Unique values for dropdowns
    const branches = React.useMemo(() => {
        const unique = new Set(requestedItems.map(item => item.branch).filter(Boolean));
        return Array.from(unique).sort();
    }, [requestedItems]);

    const customers = React.useMemo(() => {
        const unique = new Set(requestedItems.map(item => item.customerName).filter(Boolean));
        return Array.from(unique).sort();
    }, [requestedItems]);

    const destinations = React.useMemo(() => {
        const unique = new Set(requestedItems.map(item => item.destinationCustomer).filter(Boolean));
        return Array.from(unique).sort();
    }, [requestedItems]);

    // Filtered items
    const filteredItems = React.useMemo(() => {
        return requestedItems.filter(item => {
            const matchBranch = !filterBranch || item.branch === filterBranch;
            const matchCustomer = !filterCustomer || (item.customerName && item.customerName.toLowerCase().includes(filterCustomer.toLowerCase()));
            const matchDestination = !filterDestination || (item.destinationCustomer && item.destinationCustomer.toLowerCase().includes(filterDestination.toLowerCase()));
            return matchBranch && matchCustomer && matchDestination;
        });
    }, [requestedItems, filterBranch, filterCustomer, filterDestination]);

    return (
        <div className="h-full overflow-auto p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" /> รับสินค้าเข้า Hub (Received at Hub)
            </h3>

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
                    <p>ไม่พบรายการที่ตรงกับเงื่อนไข</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {[...filteredItems].sort((a, b) => {
                        const idA = a.ncrNumber || a.id || '';
                        const idB = b.ncrNumber || b.id || '';
                        return idB.localeCompare(idA);
                    }).map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-sm">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-4 border-b border-slate-100 pb-3">
                                <div><span className="text-slate-500 text-xs block mb-1">สาขาต้นทาง</span><span className="font-bold text-slate-800 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {item.branch}</span></div>
                                <div><span className="text-slate-500 text-xs block mb-1">วันที่แจ้ง</span><span className="font-bold text-slate-800">{item.dateRequested || item.date}</span></div>
                                <div><span className="text-slate-500 text-xs block mb-1">เลขที่ NCR</span><span className="font-mono font-bold text-slate-800">{item.ncrNumber || '-'}</span></div>
                                <div><span className="text-slate-500 text-xs block mb-1">เลขที่เอกสาร Neo</span><span className="font-mono font-bold text-slate-800">{item.neoRefNo || '-'}</span></div>
                                <div><span className="text-slate-500 text-xs block mb-1">ชื่อลูกค้า</span><span className="font-bold text-slate-800 line-clamp-1" title={item.customerName}>{item.customerName || '-'}</span></div>
                                <div><span className="text-slate-500 text-xs block mb-1">ผู้พบปัญหา</span><span className="font-bold text-slate-800 line-clamp-1" title={item.founder}>{item.founder || '-'}</span></div>
                                <div><span className="text-slate-500 text-xs block mb-1">สถานที่ส่ง (ปลายทาง)</span><span className="font-bold text-slate-800 line-clamp-1" title={item.destinationCustomer}>{item.destinationCustomer || '-'}</span></div>
                            </div>

                            {/* Product Info */}
                            <div className="bg-slate-50 p-3 rounded-lg flex flex-col md:flex-row gap-4 items-start md:items-center">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap gap-2 mb-1">
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-mono font-bold">{item.refNo}</span>
                                        <span className="text-slate-600 font-mono font-bold">{item.productCode}</span>
                                    </div>
                                    <div className="font-bold text-slate-900 text-base mb-1 truncate" title={item.productName}>{item.productName}</div>

                                    <div className="flex flex-col gap-1 mt-2">
                                        <div className="flex gap-2 items-center flex-wrap">
                                            {item.preliminaryDecision && (
                                                <div className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1
                                                    ${item.preliminaryDecision === 'Return' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                        item.preliminaryDecision === 'Sell' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            item.preliminaryDecision === 'Scrap' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                item.preliminaryDecision === 'Internal' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                    'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                    <span className="font-bold">{item.preliminaryDecision}</span>
                                                    {item.preliminaryRoute && <span>({item.preliminaryRoute})</span>}
                                                </div>
                                            )}
                                            {item.expiryDate && <div className="text-red-500 text-xs font-bold bg-white px-2 py-0.5 rounded border border-red-100">Exp: {item.expiryDate}</div>}
                                        </div>
                                        {item.reason && <div className="text-slate-500 text-xs italic">เหตุผล: {item.reason}</div>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 px-4 md:border-l border-slate-200">
                                    <div className="text-right">
                                        <span className="text-slate-400 text-[10px] block">ราคาหน้าบิล</span>
                                        <span className="font-bold text-slate-700">{item.priceBill?.toLocaleString()}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-400 text-[10px] block">ราคาขาย</span>
                                        <span className="font-bold text-slate-700">{item.priceSell?.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="text-center min-w-[80px] bg-white px-3 py-1 rounded border border-slate-200">
                                    <span className="text-slate-400 text-[10px] block">จำนวน</span>
                                    <span className="font-bold text-lg text-blue-600">{item.quantity}</span> <span className="text-xs text-slate-500">{item.unit}</span>
                                </div>

                                <button onClick={() => handleIntakeReceive(item.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap ml-auto self-stretch md:self-auto justify-center">
                                    <CheckCircle className="w-4 h-4" /> รับของ
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
