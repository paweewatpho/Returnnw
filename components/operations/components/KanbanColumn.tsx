import React, { useMemo } from 'react';
import { Printer, GitFork, Link } from 'lucide-react';
import { ReturnRecord, DispositionAction } from '../../../types';

interface KanbanColumnProps {
    title: string;
    status: DispositionAction;
    icon: any;
    color: string;
    items: ReturnRecord[];
    onPrintClick: (status: DispositionAction, list: ReturnRecord[]) => void;
    onItemClick?: (item: ReturnRecord) => void;
    onSplitClick?: (item: ReturnRecord) => void;
    overrideFilter?: boolean;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, status, icon: Icon, color, items, onPrintClick, onItemClick, onSplitClick, overrideFilter }) => {
    // Filter items for this column - Memoized for performance
    const columnItems = useMemo(() => {
        if (overrideFilter) return items;
        return items.filter(i => i.disposition === status && (status === 'RTV' ? !i.documentNo : true));
    }, [items, status, overrideFilter]);

    return (
        <div className="min-w-[300px] bg-slate-100 rounded-xl p-4 flex flex-col h-full border border-slate-200">
            <div className={`font-bold text-slate-700 mb-4 flex justify-between items-center pb-2 border-b-2`} style={{ borderColor: color.replace('bg-', 'text-').replace('500', '200') }}>
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${color} text-white`}><Icon className="w-4 h-4" /></div>
                    <span>{title}</span>
                </div>
                <span className="bg-white px-2 py-0.5 rounded-full text-xs border shadow-sm">{columnItems.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
                {columnItems.map(item => (
                    <div
                        key={item.id}
                        onClick={() => onItemClick && onItemClick(item)}
                        draggable
                        className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:ring-2 hover:ring-blue-400 transition-all group relative"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 mr-2">
                                <span className="font-bold text-slate-700 text-sm line-clamp-1">
                                    {item.productName}
                                </span>
                                {item.parentId && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                            <Link className="w-3 h-3 mr-1" />
                                            แยกมา
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {onSplitClick && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSplitClick(item);
                                        }}
                                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                                        title={`แยกรายการ (Split Item) - ${item.quantity} ${item.unit}`}
                                    >
                                        <GitFork className="w-3 h-3" />
                                    </button>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${item.condition === 'New' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                                    }`}>{item.condition}</span>
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1 mt-2 border-t pt-2 border-slate-100">
                            <div className="grid grid-cols-2 gap-1">
                                <div className="flex flex-col"><span className="text-[10px] text-slate-400">สาขาต้นทาง</span><span className="font-bold text-slate-700 truncate">{item.branch}</span></div>
                                <div className="flex flex-col"><span className="text-[10px] text-slate-400">วันที่แจ้ง</span><span className="font-bold text-slate-700 truncate">{item.date}</span></div>
                            </div>

                            {(item.neoRefNo || item.ncrNumber || item.collectionOrderId) && (
                                <div className="grid grid-cols-2 gap-1">
                                    {item.neoRefNo && <div className="flex flex-col"><span className="text-[10px] text-slate-400">เลขที่เอกสาร Neo</span><span className="font-medium text-slate-700 truncate" title={item.neoRefNo}>{item.neoRefNo}</span></div>}
                                    {item.ncrNumber && <div className="flex flex-col"><span className="text-[10px] text-slate-400 text-red-500">เลขที่ NCR</span><span className="font-bold text-red-600 truncate" title={item.ncrNumber}>{item.ncrNumber}</span></div>}
                                    {item.collectionOrderId && <div className="flex flex-col col-span-2"><span className="text-[10px] text-indigo-400 font-bold">COL No.</span><span className="font-mono text-xs text-indigo-600 truncate bg-indigo-50 px-1 rounded w-fit" title={item.collectionOrderId}>{item.collectionOrderId}</span></div>}
                                </div>
                            )}

                            <div className="flex flex-col"><span className="text-[10px] text-slate-400">ชื่อลูกค้า</span><span className="font-medium text-slate-700 truncate" title={item.customerName}>{item.customerName || '-'}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] text-slate-400">ผู้พบปัญหา</span><span className="font-medium text-slate-700 truncate" title={item.founder}>{item.founder || '-'}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] text-slate-400">สถานที่ส่ง (ปลายทาง)</span><span className="font-medium text-slate-700 truncate" title={item.destinationCustomer}>{item.destinationCustomer || '-'}</span></div>

                            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded mt-1">
                                <span className="text-slate-500">จำนวน:</span>
                                <span className="font-bold text-slate-800 text-sm">{item.quantity} {item.unit}</span>
                            </div>

                            {status === 'RTV' && item.dispositionDetails?.route && (
                                <div className="text-[10px] text-amber-600 bg-amber-50 p-1 rounded mt-1">Route: {item.dispositionDetails.route}</div>
                            )}

                            {/* Preliminary Decision Badge */}
                            {item.preliminaryDecision && (
                                <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-slate-400 font-bold">ตัดสินใจ:</span>
                                        {item.preliminaryRoute && (
                                            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-bold">
                                                {item.preliminaryRoute}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`px-2 py-1 rounded text-center font-bold text-[10px] text-white shadow-sm border ${item.preliminaryDecision === 'Return' ? 'bg-blue-600 border-blue-700' :
                                        item.preliminaryDecision === 'Sell' ? 'bg-green-600 border-green-700' :
                                            item.preliminaryDecision === 'Scrap' ? 'bg-red-600 border-red-700' :
                                                item.preliminaryDecision === 'Internal' ? 'bg-amber-500 border-amber-600' :
                                                    item.preliminaryDecision === 'Claim' ? 'bg-orange-500 border-orange-600' :
                                                        'bg-slate-500 border-slate-600'
                                        }`}>
                                        {item.preliminaryDecision === 'Return' ? '🚚 คืนสินค้า' :
                                            item.preliminaryDecision === 'Sell' ? '💵 ขาย' :
                                                item.preliminaryDecision === 'Scrap' ? '🗑️ ทำลาย' :
                                                    item.preliminaryDecision === 'Internal' ? '🏠 ใช้ภายใน' :
                                                        item.preliminaryDecision === 'Claim' ? '📄 เคลม' :
                                                            item.preliminaryDecision}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {columnItems.length > 0 && (
                <button onClick={() => (onPrintClick as any)(status, columnItems)} className="mt-4 w-full py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors">
                    <Printer className="w-4 h-4" /> ออกเอกสาร ({columnItems.length})
                </button>
            )}
        </div>
    );
};
