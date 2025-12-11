
import React from 'react';
import { Truck, RotateCcw, ShieldCheck, Home, Trash2, FileText } from 'lucide-react';
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

    // Split Collection Items vs Normal Items
    const isCollection = (i: ReturnRecord) => (
        i.refNo?.startsWith('R-') || i.refNo?.startsWith('COL-') || i.refNo?.startsWith('RT-') ||
        i.neoRefNo?.startsWith('R-') || i.neoRefNo?.startsWith('COL-')
    );

    const collectionItems = safeItems.filter(i => isCollection(i));
    const normalItems = safeItems.filter(i => !isCollection(i));

    return (
        <div className="h-full overflow-x-auto p-4 flex gap-4">
            {/* Specific Channel for COL ID */}
            <KanbanColumn
                title="Collection Return (COL ID)"
                status="RTV"
                icon={FileText}
                color="bg-teal-600"
                items={collectionItems}
                onPrintClick={onPrintClick}
                onSplitClick={onSplitClick}
                overrideFilter={true}
            />

            <KanbanColumn title="สินค้าสำหรับส่งคืน (RTV)" status="RTV" icon={Truck} color="bg-amber-500" items={normalItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
            <KanbanColumn title="สินค้าสำหรับขาย (Restock)" status="Restock" icon={RotateCcw} color="bg-green-500" items={normalItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
            <KanbanColumn title="สินค้าสำหรับเคลม (Claim)" status="Claim" icon={ShieldCheck} color="bg-blue-500" items={normalItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
            <KanbanColumn title="สินค้าใช้ภายใน (Internal)" status="InternalUse" icon={Home} color="bg-purple-500" items={normalItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
            <KanbanColumn title="สินค้าสำหรับทำลาย (Scrap)" status="Recycle" icon={Trash2} color="bg-red-500" items={normalItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
        </div>
    );
};
