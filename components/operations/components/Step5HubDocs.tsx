
import React from 'react';
import { Truck, RotateCcw, ShieldCheck, Home, Trash2, FileText, AlertOctagon } from 'lucide-react';
import { ReturnRecord, DispositionAction } from '../../../types';
import { KanbanColumn } from './KanbanColumn';

interface Step4DocsProps {
    processedItems: ReturnRecord[];
    onPrintClick: (status: DispositionAction, list: ReturnRecord[]) => void;
    onSplitClick: (item: ReturnRecord) => void; // New prop
}

export const Step5HubDocs: React.FC<Step4DocsProps> = ({ processedItems, onPrintClick, onSplitClick }) => {
    // Fallback for items with missing disposition (Ghost Items repair)
    const safeItems = processedItems.map(i => ({
        ...i,
        disposition: i.disposition || 'InternalUse'
    }));

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
        <div className="h-full overflow-x-auto p-4 flex gap-4">
            {/* 1. General RTV - Amber */}
            <KanbanColumn
                title="สินค้าสำหรับส่งคืน (RTV)"
                status="RTV"
                icon={Truck}
                color="bg-amber-500"
                items={rtvGeneralItems}
                onPrintClick={onPrintClick}
                onSplitClick={onSplitClick}
                overrideFilter={true}
            />

            <KanbanColumn title="สินค้าสำหรับขาย (Restock)" status="Restock" icon={RotateCcw} color="bg-green-500" items={otherItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
            <KanbanColumn title="สินค้าสำหรับเคลม (Claim)" status="Claim" icon={ShieldCheck} color="bg-blue-500" items={otherItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
            <KanbanColumn title="สินค้าใช้ภายใน (Internal)" status="InternalUse" icon={Home} color="bg-purple-500" items={otherItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
            <KanbanColumn title="สินค้าสำหรับทำลาย (Scrap)" status="Recycle" icon={Trash2} color="bg-red-500" items={otherItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />

            {/* 6. Collection Return (COL ID) - Teal - Special Channel */}
            <KanbanColumn
                title="งานรับสินค้า Collection Return (COL ID)"
                status="RTV"
                icon={FileText}
                color="bg-teal-600"
                items={rtvCollectionItems}
                onPrintClick={onPrintClick}
                onSplitClick={onSplitClick}
                overrideFilter={true}
            />
        </div>
    );
};
