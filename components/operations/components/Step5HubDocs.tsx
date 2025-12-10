
import React from 'react';
import { Truck, RotateCcw, ShieldCheck, Home, Trash2 } from 'lucide-react';
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

    return (
        <div className="h-full overflow-x-auto p-4 flex gap-4">
            <KanbanColumn title="สินค้าสำหรับส่งคืน (RTV)" status="RTV" icon={Truck} color="bg-amber-500" items={safeItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
            <KanbanColumn title="สินค้าสำหรับขาย (Restock)" status="Restock" icon={RotateCcw} color="bg-green-500" items={safeItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
            <KanbanColumn title="สินค้าสำหรับเคลม (Claim)" status="Claim" icon={ShieldCheck} color="bg-blue-500" items={safeItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
            <KanbanColumn title="สินค้าใช้ภายใน (Internal)" status="InternalUse" icon={Home} color="bg-purple-500" items={safeItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
            <KanbanColumn title="สินค้าสำหรับทำลาย (Scrap)" status="Recycle" icon={Trash2} color="bg-red-500" items={safeItems} onPrintClick={onPrintClick} onSplitClick={onSplitClick} />
        </div>
    );
};
