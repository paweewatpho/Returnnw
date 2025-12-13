
import React from 'react';
import { LayoutGrid, PackageCheck } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord } from '../../../types';

export const Step4Consolidation: React.FC = () => {
    const { items, updateReturnRecord } = useData();

    // Filter Items: Status 'BranchReceived' or 'COL_BranchReceived'
    const receivedItems = React.useMemo(() => {
        return items.filter(item => item.status === 'BranchReceived' || item.status === 'COL_BranchReceived');
    }, [items]);

    const handleConsolidate = async (id: string) => {
        // Prepare for Logistics
        if (window.confirm('ยืนยันการรวมสินค้าเพื่อเตรียมขนส่ง (Ready for Logistics)?')) {
            await updateReturnRecord(id, { status: 'COL_Consolidated' });
        }
    };

    const handleConsolidateAll = async () => {
        if (receivedItems.length === 0) return;
        if (window.confirm(`ยืนยันการรวมสินค้าทั้งหมด ${receivedItems.length} รายการ?`)) {
            for (const item of receivedItems) {
                await updateReturnRecord(item.id, { status: 'COL_Consolidated' });
            }
        }
    };

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <LayoutGrid className="w-6 h-6 text-slate-600" /> 4. รวมสินค้า (Branch Consolidation)
                </h3>
                {receivedItems.length > 0 && (
                    <button
                        onClick={handleConsolidateAll}
                        className="bg-slate-800 hover:bg-black text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all"
                    >
                        รวมสินค้าทั้งหมด ({receivedItems.length})
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-4 border-b">สาขา (Branch)</th>
                                <th className="p-4 border-b">ใบกำกับ/วันที่ (Inv/Date)</th>
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
                                            <div className="text-xs text-slate-500">{item.controlDate || item.date || '-'}</div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1 rounded w-fit">R: {item.refNo || '-'}</span>
                                                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1 rounded w-fit">TM: {item.tmNo || '-'}</span>
                                                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1 rounded w-fit">COL: {item.id}</span>
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
                                                className="bg-slate-800 hover:bg-black text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 mx-auto whitespace-nowrap"
                                            >
                                                <PackageCheck className="w-4 h-4" /> รวมของ (Pack)
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
