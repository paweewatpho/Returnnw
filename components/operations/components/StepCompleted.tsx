import React, { useMemo, useState } from 'react';
import { CheckCircle, Search, Calendar, MapPin, FileCheck, XCircle } from 'lucide-react';
import { useData } from '../../../DataContext';
import { DispositionBadge } from './DispositionBadge';

export const StepCompleted: React.FC = () => {
    const { items, ncrReports } = useData();
    const [searchTerm, setSearchTerm] = useState('');

    // Filter Completed Items (Completed or DirectReturn)
    const completedItems = useMemo(() => {
        return items.filter(item => {
            // Check for verification (If NCR Report is Canceled, hide it) -> Only for NCR
            if (item.ncrNumber) {
                const linkedReport = ncrReports.find(r => r.ncrNo === item.ncrNumber);
                if (linkedReport && linkedReport.status === 'Canceled') {
                    return false;
                }
            }

            return (item.status === 'Completed' || item.status === 'DirectReturn') &&
                (item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.productCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.refNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.documentNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.collectionOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.ncrNumber?.toLowerCase().includes(searchTerm.toLowerCase()));
        }).sort((a, b) => {
            // Sort by dateCompleted descending, then fallback to date
            const dateA = a.dateCompleted || a.dateInTransit || a.date;
            const dateB = b.dateCompleted || b.dateInTransit || b.date;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    }, [items, searchTerm, ncrReports]);

    const stats = useMemo(() => {
        return {
            total: completedItems.length,
            direct: completedItems.filter(i => i.status === 'DirectReturn').length,
            processed: completedItems.filter(i => i.status === 'Completed').length
        };
    }, [completedItems]);

    return (
        <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden bg-slate-50/50">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    7. รายการที่จบงานแล้ว (Completed Items)
                </h2>
                <p className="text-slate-500 mt-1 ml-10">
                    รายการสินค้าที่ปิดงานสมบูรณ์ หรือ ส่งคืนร้านค้าโดยตรง
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">ทั้งหมด (Total)</p>
                        <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
                    </div>
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><FileCheck className="w-6 h-6" /></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-green-600 uppercase">ผ่าน Hub (Processed)</p>
                        <p className="text-2xl font-bold text-green-700">{stats.processed}</p>
                    </div>
                    <div className="bg-green-100 p-2 rounded-lg text-green-600"><CheckCircle className="w-6 h-6" /></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-orange-600 uppercase">ส่งตรง (Direct Return)</p>
                        <p className="text-2xl font-bold text-orange-700">{stats.direct}</p>
                    </div>
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><MapPin className="w-6 h-6" /></div>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="เลขบิล / NCR / R / COL / สินค้า..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 pr-8 py-2 w-full border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            aria-label="ล้างการค้นหา"
                            title="ล้างการค้นหา"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="text-sm text-slate-500">
                    รายการทั้งหมด: <span className="font-bold text-slate-800">{completedItems.length}</span> รายการ
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200 shadow-sm relative">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 shadow-sm z-10">
                        <tr>
                            <th className="p-4">Status</th>
                            <th className="p-4">IDs (NCR / R / Ref)</th>
                            <th className="p-4">สินค้า (Product)</th>
                            <th className="p-4 text-center">จำนวน</th>
                            <th className="p-4">สาขา (Branch)</th>
                            <th className="p-4">จบงานเมื่อ (Closed Date)</th>
                            <th className="p-4">การตัดสินใจ (Disposition)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {completedItems.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <XCircle className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p>ไม่พบรายการที่จบงานแล้ว</p>
                                </td>
                            </tr>
                        ) : (
                            completedItems.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        {item.status === 'Completed' ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200 inline-flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Completed
                                            </span>
                                        ) : (
                                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold border border-orange-200 inline-flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> Direct
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 space-y-1">
                                        {item.documentNo && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1 rounded">R No.</span>
                                                <span className="font-mono text-xs font-bold text-emerald-700">{item.documentNo}</span>
                                            </div>
                                        )}
                                        {item.refNo && item.refNo !== '-' && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1 rounded">Ref (บิล)</span>
                                                <span className="font-mono text-xs font-bold text-blue-600">{item.refNo}</span>
                                            </div>
                                        )}
                                        {item.ncrNumber && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold bg-red-100 text-red-800 px-1 rounded">รายการ NCR</span>
                                                <span className="font-mono text-xs font-bold text-red-600">{item.ncrNumber}</span>
                                            </div>
                                        )}
                                        {!item.documentNo && (!item.refNo || item.refNo === '-') && !item.ncrNumber && (
                                            <div className="text-xs text-slate-400 font-mono">{item.id}</div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-slate-800">{item.productName}</div>
                                        <div className="text-xs text-slate-500">{item.productCode}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="font-bold text-slate-700">{item.quantity}</span> <span className="text-xs text-slate-500">{item.unit}</span>
                                    </td>
                                    <td className="p-4 text-slate-600">{item.branch}</td>
                                    <td className="p-4 text-slate-600 text-xs">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {item.dateCompleted ? new Date(item.dateCompleted).toLocaleDateString() : (item.dateInTransit ? new Date(item.dateInTransit).toLocaleDateString() : '-')}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {item.status === 'Completed' ? (
                                            <DispositionBadge disposition={item.disposition} />
                                        ) : (
                                            <span className="text-xs text-slate-500">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
