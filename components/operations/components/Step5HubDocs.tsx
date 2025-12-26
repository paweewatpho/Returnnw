import React from 'react';
import { Truck, RotateCcw, ShieldCheck, Home, Trash2, FileText, AlertOctagon, Search, X } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord, DispositionAction } from '../../../types';
import { KanbanColumn } from './KanbanColumn';
import Swal from 'sweetalert2';

// This component now delegates the document logic to the parent via props or context if available.
// However, since useOperationsLogic is the main controller, we should emit an event or used a shared context.
// For this Refactor, since Step5 is a child of Operations.tsx which USES useOperationsLogic, 
// we need to pass the handler down or expose it.
// Assuming Operations passes 'onPrintDocs' prop or similar.
// BUT, based on the file structure, Step5HubDocs is used in Operations.tsx.
// Let's check Operations.tsx to see if we can pass the handleDocModal.

// Wait, the user wants "Preview PDF & Save" status.
// Currently handlePrintClick does a simple window.confirm and update.
// We need to open the DocumentPreviewModal.

interface Step5HubDocsProps {
    onPrintDocs: (status: DispositionAction, list: ReturnRecord[]) => void;
}

export const Step5HubDocs: React.FC<Step5HubDocsProps> = ({ onPrintDocs }) => {
    const { items, updateReturnRecord } = useData();
    const [searchQuery, setSearchQuery] = React.useState('');

    // Filter Items: Status 'NCR_QCCompleted' or 'QCCompleted' (Legacy)
    const processedItems = React.useMemo(() => {
        return items.filter(item => item.status === 'NCR_QCCompleted' || item.status === 'QCCompleted');
    }, [items]);

    // Fallback for items with missing disposition (Ghost Items repair)
    const safeItems = React.useMemo(() => {
        return processedItems.map(i => ({
            ...i,
            disposition: i.disposition || 'InternalUse' as DispositionAction
        })).filter(i => {
            const q = searchQuery.toLowerCase().trim();
            if (!q) return true;
            return (
                (i.refNo?.toLowerCase().includes(q)) ||
                (i.ncrNumber?.toLowerCase().includes(q)) ||
                (i.documentNo?.toLowerCase().includes(q)) ||
                (i.collectionOrderId?.toLowerCase().includes(q)) ||
                (i.productName?.toLowerCase().includes(q)) ||
                (i.productCode?.toLowerCase().includes(q))
            );
        });
    }, [processedItems, searchQuery]);

    const handleSplitClick = (item: ReturnRecord) => {
        // Placeholder for split logic
        Swal.fire({
            icon: 'info',
            title: 'ฟีเจอร์ยังไม่เปิดใช้งาน (Under Construction)',
            text: 'การแยกรายการ (Split) ในขั้นตอนนี้กำลังพัฒนา',
            confirmButtonText: 'รับทราบ'
        });
    };

    // Helper: Identify NCR items
    const isNCR = (i: ReturnRecord) => i.ncrNumber || i.id.startsWith('NCR');

    // Helper: Identify Collection items (strictly not NCR)
    const isCollection = (i: ReturnRecord) => (
        !isNCR(i) && (
            i.refNo?.startsWith('R-') || i.refNo?.startsWith('COL-') || i.refNo?.startsWith('RT-') ||
            i.neoRefNo?.startsWith('R-') || i.neoRefNo?.startsWith('COL-')
        )
    );

    // Filter RTV categories
    const rtvCollectionItems = safeItems.filter(i => i.disposition === 'RTV' && isCollection(i));
    // NCR items now fall into General RTV
    const rtvGeneralItems = safeItems.filter(i => i.disposition === 'RTV' && !isCollection(i));

    // Other items (Restock, Claim, etc.) can use the standard processing
    const otherItems = safeItems.filter(i => i.disposition !== 'RTV');

    return (
        <div className="h-full flex flex-col p-4 bg-slate-50/50">
            {/* Filter Bar */}
            <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold min-w-max">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    <span>จัดการเอกสารจบงาน</span>
                </div>

                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาเลขบิล / NCR / สินค้า / R..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            aria-label="ล้างการค้นหา"
                            title="ล้างการค้นหา"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="text-xs text-slate-500">
                    รายการทั้งหมด: <span className="font-bold text-slate-700">{safeItems.length}</span>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto flex gap-4 pb-4">
                {/* 1. General RTV - Amber */}
                <KanbanColumn
                    title="สินค้าสำหรับส่งคืน (RTV)"
                    status="RTV"
                    icon={Truck}
                    color="bg-amber-500"
                    items={rtvGeneralItems}
                    onPrintClick={onPrintDocs}
                    onSplitClick={handleSplitClick}
                    overrideFilter={true}
                />

                <KanbanColumn title="สินค้าสำหรับขาย (Restock)" status="Restock" icon={RotateCcw} color="bg-green-500" items={otherItems} onPrintClick={onPrintDocs} onSplitClick={handleSplitClick} />
                <KanbanColumn title="สินค้าสำหรับเคลม (Claim)" status="Claim" icon={ShieldCheck} color="bg-blue-500" items={otherItems} onPrintClick={onPrintDocs} onSplitClick={handleSplitClick} />
                <KanbanColumn title="สินค้าใช้ภายใน (Internal)" status="InternalUse" icon={Home} color="bg-purple-500" items={otherItems} onPrintClick={onPrintDocs} onSplitClick={handleSplitClick} />
                <KanbanColumn title="สินค้าสำหรับทำลาย (Scrap)" status="Recycle" icon={Trash2} color="bg-red-500" items={otherItems} onPrintClick={onPrintDocs} onSplitClick={handleSplitClick} />

                {/* 6. Collection Return (COL ID) - Teal - Special Channel */}
                <KanbanColumn
                    title="งานรับสินค้า Collection Return (COL ID)"
                    status="RTV"
                    icon={FileText}
                    color="bg-teal-600"
                    items={rtvCollectionItems}
                    onPrintClick={onPrintDocs}
                    onSplitClick={handleSplitClick}
                    overrideFilter={true}
                />
            </div>
        </div>
    );
};

