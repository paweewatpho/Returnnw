import React from 'react';
import { List, Trash2 } from 'lucide-react';
import { ReturnRecord } from '../../../../types';

interface ItemsTableProps {
    requestItems: Partial<ReturnRecord>[];
    handleRemoveItem: (index: number) => void;
    handleAnalyzeClick: (index: number) => void;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
    requestItems,
    handleRemoveItem,
    handleAnalyzeClick
}) => {
    return (
        <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <List className="w-5 h-5" /> รายการสินค้าที่รอการบันทึก ({requestItems.length})
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">สินค้า</th>
                            <th className="px-4 py-3">จำนวน</th>
                            <th className="px-4 py-3">วิเคราะห์ปัญหา (Source)</th>
                            <th className="px-4 py-3">รายละเอียดปัญหา</th>
                            <th className="px-4 py-3 w-10">ลบ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {requestItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleAnalyzeClick(idx)}>
                                <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                                <td className="px-4 py-3">
                                    <div className="font-bold text-slate-800">{item.productName}</div>
                                    <div className="text-xs text-slate-500">{item.productCode}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="font-mono font-bold bg-slate-100 px-2 py-1 rounded">{item.quantity} {item.unit}</span>
                                </td>
                                <td className="px-4 py-3">
                                    {item.problemAnalysis ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                                            {item.problemAnalysis}
                                        </span>
                                    ) : <span className="text-slate-400">-</span>}
                                </td>
                                <td className="px-4 py-3 max-w-[200px] truncate text-slate-600">
                                    {item.problemDetail || item.reason || '-'}
                                    {item.problemDamaged && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1 rounded">ชำรุด</span>}
                                    {item.problemWrong && <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-1 rounded">ส่งผิด</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleRemoveItem(idx); }}
                                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-700">
                        <tr>
                            <td colSpan={2} className="px-4 py-3 text-right">รวมทั้งหมด</td>
                            <td className="px-4 py-3 bg-yellow-50 text-yellow-800">{requestItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0)} หน่วย</td>
                            <td colSpan={3}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
