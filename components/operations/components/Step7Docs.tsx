
import React from 'react';
import { Truck, RotateCcw, ShieldCheck, Home, Trash2, FileText, AlertOctagon } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord, DispositionAction } from '../../../types';
import { KanbanColumn } from './KanbanColumn';

interface Step7DocsProps {
    onPrintDocs?: (status: DispositionAction, list: ReturnRecord[]) => void;
}

export const Step7Docs: React.FC<Step7DocsProps> = ({ onPrintDocs }) => {
    const { items } = useData();

    // Filter Items:
    // We want items that have passed QC or are ready for documentation.
    // In strict NCR flow: 'QCPassed' or 'NCR_QCPassed'
    // In legacy/Collection flow: 'HubReceived' (if QC skipped) or 'QCPassed'
    const processedItems = React.useMemo(() => {
        return items.filter(item =>
            item.status === 'QCPassed' ||
            item.status === 'NCR_QCPassed' ||
            item.status === 'HubReceived' ||
            item.status === 'COL_HubReceived' ||
            // Also include items that might be 'ReturnToSupplier' but haven't been finalized? No, those are next step.
            // Items ready for Docs are typically 'QCPassed'.
            item.status === 'QCCompleted' // Legacy alias
        );
    }, [items]);

    const handlePrintClick = async (status: DispositionAction, list: ReturnRecord[]) => {
        if (onPrintDocs) {
            onPrintDocs(status, list);
        } else {
            console.error("onPrintDocs prop missing");
        }
    };

    const handleSplitClick = (item: ReturnRecord) => {
        alert('Split functionality in Docs step is under construction.');
    };

    // Fallback for items with missing disposition
    const safeItems = processedItems.map(i => ({
        ...i,
        disposition: i.disposition || 'RTV' // Default to RTV if missing
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
    const rtvCollectionItems = safeItems.filter(i => (i.disposition === 'RTV' || !i.disposition) && isCollection(i));
    const rtvGeneralItems = safeItems.filter(i => (i.disposition === 'RTV' || !i.disposition) && !isCollection(i));

    // Other items (Restock, Claim, etc.)
    const otherItems = safeItems.filter(i => i.disposition !== 'RTV' && i.disposition); // Explicit disposition for others

    return (
        <div className="h-full overflow-x-auto p-4 flex gap-4">
            {/* 1. General RTV - Amber */}
            <KanbanColumn
                title="สินค้าสำหรับส่งคืน (RTV)"
                status="RTV"
                icon={Truck}
                color="bg-amber-500"
                items={rtvGeneralItems}
                onPrintClick={handlePrintClick}
                onSplitClick={handleSplitClick}
                overrideFilter={true}
            />

            <KanbanColumn title="สินค้าสำหรับขาย (Restock)" status="Restock" icon={RotateCcw} color="bg-green-500" items={otherItems} onPrintClick={handlePrintClick} onSplitClick={handleSplitClick} />
            <KanbanColumn title="สินค้าสำหรับเคลม (Claim)" status="Claim" icon={ShieldCheck} color="bg-blue-500" items={otherItems} onPrintClick={handlePrintClick} onSplitClick={handleSplitClick} />
            <KanbanColumn title="สินค้าใช้ภายใน (Internal)" status="InternalUse" icon={Home} color="bg-purple-500" items={otherItems} onPrintClick={handlePrintClick} onSplitClick={handleSplitClick} />
            <KanbanColumn title="สินค้าสำหรับทำลาย (Scrap)" status="Recycle" icon={Trash2} color="bg-red-500" items={otherItems} onPrintClick={handlePrintClick} onSplitClick={handleSplitClick} />

            {/* 6. Collection Return (COL ID) - Teal - Special Channel */}
            <KanbanColumn
                title="งานรับสินค้า Collection Return (COL ID)"
                status="RTV"
                icon={FileText}
                color="bg-teal-600"
                items={rtvCollectionItems}
                onPrintClick={handlePrintClick}
                onSplitClick={handleSplitClick}
                overrideFilter={true}
            />
        </div>
    );
};
