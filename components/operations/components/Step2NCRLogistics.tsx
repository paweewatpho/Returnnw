import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { Truck, Printer, Package, Info, Share2, PlusSquare, MinusSquare, X } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord, TransportInfo } from '../../../types';
import { RETURN_ROUTES } from '../../../constants';


interface Step2NCRLogisticsProps {
    onConfirm?: (selectedIds: string[], routeType: 'Hub' | 'Direct', transportInfo: TransportInfo) => void;
}

export const Step2NCRLogistics: React.FC<Step2NCRLogisticsProps> = ({ onConfirm }) => {
    const { items, updateReturnRecord, ncrReports } = useData();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);


    // Decision Modal State
    const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [tempRoute, setTempRoute] = useState<string>('');
    const [isFieldSettled, setIsFieldSettled] = useState(false);
    const [fieldAmount, setFieldAmount] = useState<number>(0);
    const [fieldEvidence, setFieldEvidence] = useState('');
    const [fieldName, setFieldName] = useState('');
    const [fieldPosition, setFieldPosition] = useState('');

    // Transport Info State
    const [transportMode, setTransportMode] = useState<'Company' | '3PL' | 'Other'>('Company');
    const [transportInfo, setTransportInfo] = useState<TransportInfo>({
        driverName: '',
        plateNumber: '',
        transportCompany: 'รถบริษัท'
    });

    // Route & Destination State
    const [routeType, setRouteType] = useState<'Hub' | 'Direct'>('Hub');
    const [directDestination, setDirectDestination] = useState<string>('');
    const [customDestination, setCustomDestination] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Filter Logic
    const pendingItems = useMemo(() => {
        return items.filter(item => {
            // Check for verification (If NCR Report is Canceled, hide it) -> Only for NCR
            if (item.ncrNumber) {
                const linkedReport = ncrReports.find(r => r.ncrNo === item.ncrNumber);
                if (linkedReport && linkedReport.status === 'Canceled') {
                    return false;
                }
            }

            // Check if item is NCR:
            // 1. Explicitly Document Type NCR
            // 2. OR Has NCR Number AND is NOT explicitly LOGISTICS (legacy data support)
            const isNCR = item.documentType === 'NCR' || (!!item.ncrNumber && item.documentType !== 'LOGISTICS');

            if (isNCR) {
                return item.status === 'Requested' || item.status === 'COL_JobAccepted';
            }
            return item.status === 'COL_Consolidated';
        });
    }, [items, ncrReports]);

    const uniqueBranches = useMemo(() => Array.from(new Set(pendingItems.map(i => i.branch))).filter(Boolean), [pendingItems]);

    const filteredItems = useMemo(() => {
        return pendingItems.filter(item => {
            const matchesBranch = selectedBranch === 'All' || item.branch === selectedBranch;
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q ||
                (item.refNo?.toLowerCase().includes(q)) ||
                (item.ncrNumber?.toLowerCase().includes(q)) ||
                (item.documentNo?.toLowerCase().includes(q)) ||
                (item.collectionOrderId?.toLowerCase().includes(q)) ||
                (item.productName?.toLowerCase().includes(q)) ||
                (item.productCode?.toLowerCase().includes(q));

            return matchesBranch && matchesSearch;
        });
    }, [pendingItems, selectedBranch, searchQuery]);

    // Grouping Logic
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const groupedItems = useMemo(() => {
        const groups: Record<string, ReturnRecord[]> = {};
        filteredItems.forEach(item => {
            // Logic must match displayId logic to be consistent visually
            const isCOLItem = !!item.collectionOrderId || item.status === 'COL_Consolidated' || (item.id && item.id.startsWith('COL'));
            // Use trimmed display ID as key
            const cleanRefNo = item.refNo && item.refNo !== '-' && !item.refNo.startsWith('RT-') ? item.refNo : '';
            const key = isCOLItem
                ? (item.collectionOrderId || `COL-${item.id}`)
                : (cleanRefNo || item.ncrNumber || item.id);

            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return Object.entries(groups).map(([key, gItems]) => ({
            key,
            items: gItems,
            rep: gItems[0]
        }));
    }, [filteredItems]);

    const handleToggleExpand = (groupKey: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupKey)) next.delete(groupKey);
            else next.add(groupKey);
            return next;
        });
    };

    const handleToggleGroup = (gItems: ReturnRecord[]) => {
        const ids = gItems.map(i => i.id);
        const allSelected = ids.every(id => selectedIds.has(id));
        const newSet = new Set(selectedIds);

        if (allSelected) {
            ids.forEach(id => newSet.delete(id));
        } else {
            ids.forEach(id => newSet.add(id));
        }
        setSelectedIds(newSet);
    };



    const handleSelectAll = () => {
        if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredItems.map(i => i.id)));
        }
    };

    const handleAddDecision = (itemId: string) => {
        setEditingItemId(itemId);
        setTempRoute('');
        setIsFieldSettled(false);
        setFieldAmount(0);
        setFieldEvidence('');
        setFieldName('');
        setFieldPosition('');
        setIsDecisionModalOpen(true);
    };

    const handleSaveDecision = async () => {
        if (!isFieldSettled && (!tempRoute || tempRoute === 'Other')) {
            await Swal.fire({
                icon: 'warning',
                title: 'กรุณาระบุเส้นทาง',
                text: 'สำหรับการคืนสินค้า กรุณาระบุเส้นทางส่งคืน',
                confirmButtonText: 'ตกลง'
            });
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            await updateReturnRecord(editingItemId!, {
                status: isFieldSettled ? 'Settled_OnField' : undefined, // Change status if settled
                preliminaryDecision: 'Return',
                preliminaryRoute: isFieldSettled ? '' : tempRoute,
                isFieldSettled,
                fieldSettlementAmount: fieldAmount,
                fieldSettlementEvidence: fieldEvidence,
                fieldSettlementName: fieldName,
                fieldSettlementPosition: fieldPosition,
                disposition: isFieldSettled ? 'RTV' : undefined
            });

            await Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ',
                text: 'เพิ่มการตัดสินใจเบื้องต้นเรียบร้อยแล้ว',
                timer: 1500,
                showConfirmButton: false
            });

            setIsDecisionModalOpen(false);
            setEditingItemId(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenModal = () => {
        if (selectedIds.size === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่มีรายการที่เลือก',
                text: 'กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ',
                confirmButtonText: 'ตกลง'
            });
            return;
        }
        setIsModalOpen(true);
    };

    const confirmSelection = async () => {
        if (transportMode === 'Company') {
            if (!transportInfo.driverName || !transportInfo.plateNumber) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุชื่อพนักงานขับรถและทะเบียนรถสำหรับรถบริษัท',
                    confirmButtonText: 'ตกลง'
                });
                return;
            }
        } else if (transportMode === '3PL') {
            if (!transportInfo.transportCompany) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุชื่อบริษัทขนส่ง (3PL)',
                    confirmButtonText: 'ตกลง'
                });
                return;
            }
            if (!transportInfo.driverName || !transportInfo.plateNumber) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุชื่อพนักงานขับรถและทะเบียนรถสำหรับ 3PL',
                    confirmButtonText: 'ตกลง'
                });
                return;
            }
        } else if (transportMode === 'Other') {
            if (!transportInfo.transportCompany) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุรายละเอียดการขนส่ง (อื่นๆ)',
                    confirmButtonText: 'ตกลง'
                });
                return;
            }
        }

        let finalDestination = '';
        if (routeType === 'Direct') {
            if (!directDestination) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุปลายทางสำหรับการส่งตรง (Direct Return)',
                    confirmButtonText: 'ตกลง'
                });
                return;
            }
            if (directDestination === 'Other' && !customDestination) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุชื่อปลายทาง (อื่นๆ)',
                    confirmButtonText: 'ตกลง'
                });
                return;
            }
            finalDestination = directDestination === 'Other' ? customDestination : directDestination;
        }

        if (onConfirm) {
            setIsSubmitting(true);
            try {
                const submissionTransportInfo = {
                    ...transportInfo,
                    destination: routeType === 'Direct' ? finalDestination : undefined
                };
                await onConfirm(Array.from(selectedIds), routeType, submissionTransportInfo);
                setIsModalOpen(false); // Close modal on success

                // Optional Success Message
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกสำเร็จ',
                    text: 'สร้างเอกสารและบันทึกข้อมูลเรียบร้อยแล้ว',
                    timer: 1500,
                    showConfirmButton: false
                });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const isAllFilteredSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id));

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in relative">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Truck className="w-6 h-6 text-indigo-600" /> 2. รวบรวมและระบุขนส่ง (Consolidation & Logistics)
            </h3>

            {/* Top Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-sm font-bold text-slate-600">สาขา:</span>
                        <select aria-label="กรองสาขา" title="กรองสาขา" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="bg-transparent text-sm font-medium outline-none text-slate-800">
                            <option value="All">ทุกสาขา</option>
                            {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 min-w-[200px]">
                        <span className="text-sm font-bold text-slate-600 truncate">ค้นหาบิล:</span>
                        <input
                            type="text"
                            placeholder="เลขที่บิล / NCR / สินค้า / R..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-transparent text-sm font-medium outline-none text-slate-800 w-full"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                aria-label="ล้างการค้นหา"
                                title="ล้างการค้นหา"
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="text-sm text-slate-500">
                        รายการรอดำเนินการ: <span className="font-bold text-indigo-600">{filteredItems.length}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button aria-label={isAllFilteredSelected ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"} title={isAllFilteredSelected ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"} onClick={handleSelectAll} className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 font-bold transition-colors">
                        {isAllFilteredSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                    </button>
                    <button
                        onClick={handleOpenModal}
                        aria-label={`ดำเนินการ ${selectedIds.size} รายการ`}
                        title={`ดำเนินการ ${selectedIds.size} รายการ`}
                        disabled={selectedIds.size === 0}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Truck className="w-4 h-4" /> ดำเนินการ ({selectedIds.size})
                    </button>
                </div>
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto pb-20">
                {groupedItems.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <Package className="w-16 h-16 mb-4 text-slate-300" />
                        <p className="font-medium text-lg">ไม่พบรายการสินค้าที่รอจัดส่ง</p>
                        <p className="text-sm mt-1">กรุณาตรวจสอบสถานะสินค้า หรือการกรองสาขา</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {groupedItems.map((group) => {
                            const { key: groupKey, items: gItems, rep: item } = group;
                            const isSelected = gItems.every(i => selectedIds.has(i.id));
                            const isExpanded = expandedGroups.has(groupKey);

                            // Explicit Logic for Display
                            // 1. COL Items: Have collectionOrderId OR are in COL_Consolidated status OR id starts with COL
                            const isCOLItem = !!item.collectionOrderId || item.status === 'COL_Consolidated' || (item.id && item.id.startsWith('COL'));

                            // 2. NCR Items: Are NOT COL items, and have NCR markers at this stage
                            const isNCRItem = !isCOLItem && (item.documentType === 'NCR' || !!item.ncrNumber);

                            // Determine Display ID - REFINED based on user feedback to prioritize manual refs
                            // For NCR: Show Manual Ref No if available (and not internal RT- ID), else NCR Number
                            // For COL: Show Document No (R) if available (and not internal RT- ID), else Collection Order ID
                            const isInternalId = (val: string | undefined) => !!val && val.startsWith('RT-');
                            const cleanRefNo = item.refNo && item.refNo !== '-' && !isInternalId(item.refNo) ? item.refNo : '';
                            const cleanDocNo = item.documentNo && !isInternalId(item.documentNo) ? item.documentNo : '';

                            const displayId = isCOLItem
                                ? (cleanDocNo || item.collectionOrderId || '-')
                                : (cleanRefNo || item.ncrNumber || '-');

                            return (
                                <div
                                    key={groupKey}
                                    onClick={() => handleToggleGroup(gItems)}
                                    className={`group relative p-4 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md 
                                        ${isSelected ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}
                                    `}
                                >
                                    {/* Header Row: Badge | ID | Checkbox */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            {isCOLItem && (
                                                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold border border-orange-200">
                                                    COL
                                                </span>
                                            )}

                                            {isNCRItem && (
                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-200">
                                                    NCR
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            {/* Primary Display ID (Ref for NCR, R No for COL) */}
                                            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                {displayId}
                                            </span>

                                            {/* Secondary ID (NCR No for NCR, COL No for COL) - Only if different from primary */}
                                            {isNCRItem && item.ncrNumber && item.ncrNumber !== displayId && (
                                                <span className="text-[10px] font-mono text-red-500 font-bold bg-red-50 px-1 rounded border border-red-100">
                                                    รายการ NCR: {item.ncrNumber}
                                                </span>
                                            )}
                                            {isNCRItem && item.refNo && item.refNo !== '-' && item.refNo !== displayId && (
                                                <span className="text-[10px] font-mono text-blue-600 font-bold bg-blue-50 px-1 rounded border border-blue-200">
                                                    เลขที่บิล (Ref No.): {item.refNo}
                                                </span>
                                            )}
                                            {isCOLItem && item.documentNo && item.documentNo !== displayId && (
                                                <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1 rounded border border-emerald-100">
                                                    เลขที่เอกสาร (R): {item.documentNo}
                                                </span>
                                            )}
                                            {isCOLItem && item.collectionOrderId && item.collectionOrderId !== displayId && (
                                                <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-1 rounded border border-indigo-100">
                                                    เลขที่ COL: {item.collectionOrderId}
                                                </span>
                                            )}
                                        </div>

                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors 
                                            ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-transparent border-slate-300 group-hover:border-indigo-400'}
                                        `}>
                                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-slate-800 text-sm mb-2 line-clamp-2 min-h-[1.25rem]" title={item.productName}>
                                        {item.productName || 'Unknown Product'}
                                    </h4>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">จำนวน:</span>
                                            <span className="font-bold text-slate-700">{item.quantity} {item.unit}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">สาขา:</span>
                                            <span className="text-slate-700">{item.branch}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">วันที่:</span>
                                            <span className="text-slate-700">{item.dateRequested || item.date}</span>
                                        </div>

                                        {/* Expand Toggle for Products */}
                                        {gItems.length > 1 && (
                                            <div onClick={(e) => e.stopPropagation()} className="mt-2">
                                                <button
                                                    onClick={() => handleToggleExpand(groupKey)}
                                                    className={`flex items-center justify-center gap-1 w-full py-1.5 rounded text-[11px] font-bold border transition-all
                                                        ${isExpanded ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-slate-100'}`}
                                                >
                                                    {isExpanded ? <MinusSquare className="w-3 h-3" /> : <PlusSquare className="w-3 h-3" />}
                                                    {isExpanded ? 'ย่อรายการ' : `ดูอีก ${gItems.length - 1} รายการ (+)`}
                                                </button>

                                                {isExpanded && (
                                                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 mt-1 animate-slide-down">
                                                        {gItems.slice(1).map((subItem) => (
                                                            <div key={subItem.id} className="pl-2 border-l-2 border-indigo-200 text-xs">
                                                                <div className="font-bold text-slate-700 truncate" title={subItem.productName}>{subItem.productName}</div>
                                                                <div className="text-slate-500 flex justify-between">
                                                                    <span>Qty: <b>{subItem.quantity} {subItem.unit}</b></span>
                                                                    <span>{subItem.branch}</span>
                                                                </div>

                                                                {/* Individual Actions if needed, but decision is group-wide usually? Or not? 
                                                                    If decision is per ITEM, we need buttons here. 
                                                                    Let's assume preliminary decision applies to item. 
                                                                    But grouping means we treat them as batch?
                                                                    Visuals show standard cards. 
                                                                */}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Additional Info for COL Items */}
                                        {isCOLItem && (
                                            <>
                                                <div className="flex items-center justify-between text-xs mt-1">
                                                    <span className="text-slate-500">เลข R:</span>
                                                    <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded border border-emerald-100">{item.documentNo || '-'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500">ปลายทาง:</span>
                                                    <span className="text-slate-700 truncate max-w-[120px]" title={item.destinationCustomer}>
                                                        {item.destinationCustomer || '-'}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Preliminary Decision Badge - Using Representative's decision if grouped? 
                                        Issues: If items in group have DIFFERENT decisions? 
                                        Usually grouped items share context. 
                                        Let's display decision of Representative. 
                                        Ideally, user processes them individually or batch.
                                        If batch processing via checkboxes, no issue.
                                        If 'Add Decision' button, it applies to Item ID.
                                        We should probably allow adding decision for EACH item if unmatched?
                                        For now, lets keep it simple to Rep. 
                                        Or maybe Apply to All in group?
                                    */}
                                    {item.preliminaryDecision && (
                                        <div className="mt-3 pt-2 border-t border-slate-100">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-slate-500 font-bold">การตัดสินใจเบื้องต้น:</span>
                                                    {item.preliminaryRoute && (
                                                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold border border-indigo-100">
                                                            {item.preliminaryRoute}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`px-3 py-1.5 rounded-lg text-center font-bold text-xs shadow-sm border ${item.preliminaryDecision === 'Return' ? 'bg-blue-600 text-white border-blue-700' :
                                                    item.preliminaryDecision === 'Sell' ? 'bg-green-600 text-white border-green-700' :
                                                        item.preliminaryDecision === 'Scrap' ? 'bg-red-600 text-white border-red-700' :
                                                            item.preliminaryDecision === 'Internal' ? 'bg-amber-500 text-white border-amber-600' :
                                                                item.preliminaryDecision === 'Claim' ? 'bg-orange-500 text-white border-orange-600' :
                                                                    'bg-slate-500 text-white border-slate-600'
                                                    }`}>
                                                    {item.preliminaryDecision === 'Return' ? '🚚 คืนสินค้า' :
                                                        item.preliminaryDecision === 'Sell' ? '💵 ขาย' :
                                                            item.preliminaryDecision === 'Scrap' ? '🗑️ ทำลาย' :
                                                                item.preliminaryDecision === 'Internal' ? '🏠 ใช้ภายใน' :
                                                                    item.preliminaryDecision === 'Claim' ? '📄 เคลม' :
                                                                        item.preliminaryDecision}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Add Decision Button for items without preliminary decision - Applies to REP item only currently? 
                                        If we want to apply to ALL, handleAddDecision needs to handle multiple IDs.
                                        The current handleAddDecision takes one ID.
                                        Let's keep it to Rep Item for now to avoid breaking logic, 
                                        but ideally it should be 'Batch Decision for Group'.
                                    */}
                                    {!item.preliminaryDecision && (
                                        <div className="mt-3 pt-2 border-t border-dashed border-amber-200 bg-amber-50/30">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Loop to update all? No, current func is single.
                                                    // Pass single ID. 
                                                    // Improving this might be needed later, but "Expand" was the request.
                                                    handleAddDecision(item.id);
                                                }}
                                                className="w-full py-2 px-3 text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <Share2 className="w-3.5 h-3.5" />
                                                เพิ่มการตัดสินใจเบื้องต้น
                                            </button>
                                        </div>
                                    )}

                                    {item.founder && (
                                        <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1">
                                            <Info className="w-3 h-3" /> ผู้พบ: {item.founder}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Dialog */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Truck className="w-6 h-6 text-indigo-600" /> ระบุรายละเอียดการขนส่ง
                                </h2>
                                <p className="text-sm text-slate-500 mt-0.5">กรุณาระบุข้อมูลยานพาหนะและปลายทางสำหรับ {selectedIds.size} รายการที่เลือก</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} aria-label="ปิด" title="ปิด" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Section 1: Transport Type */}
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-slate-800 mb-2">1. เลือกประเภทการขนส่ง</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <label className={`cursor-pointer rounded-xl border p-4 transition-all ${transportMode === 'Company' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <div className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                                            <input type="radio" aria-label="รถบริษัท" title="รถบริษัท" name="transportType" checked={transportMode === 'Company'} onChange={() => { setTransportMode('Company'); setTransportInfo({ driverName: '', plateNumber: '', transportCompany: 'รถบริษัท' }); }} className="text-indigo-600 focus:ring-indigo-500" />
                                            รถบริษัท
                                        </div>
                                        <div className="space-y-2 mt-2">
                                            <input
                                                type="text"
                                                aria-label="ชื่อพนักงานขับรถ"
                                                title="ชื่อพนักงานขับรถ"
                                                placeholder="ชื่อพนักงานขับรถ"
                                                value={transportMode === 'Company' ? transportInfo.driverName : ''}
                                                onChange={(e) => setTransportInfo({ ...transportInfo, driverName: e.target.value })}
                                                disabled={transportMode !== 'Company'}
                                                className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                            />
                                            <input
                                                type="text"
                                                aria-label="ทะเบียนรถ"
                                                title="ทะเบียนรถ"
                                                placeholder="ทะเบียนรถ"
                                                value={transportMode === 'Company' ? transportInfo.plateNumber : ''}
                                                onChange={(e) => setTransportInfo({ ...transportInfo, plateNumber: e.target.value })}
                                                disabled={transportMode !== 'Company'}
                                                className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                            />
                                        </div>
                                    </label>

                                    <label className={`cursor-pointer rounded-xl border p-4 transition-all ${transportMode === '3PL' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <div className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                                            <input type="radio" aria-label="รถขนส่งร่วม (3PL)" title="รถขนส่งร่วม (3PL)" name="transportType" checked={transportMode === '3PL'} onChange={() => { setTransportMode('3PL'); setTransportInfo({ driverName: '', plateNumber: '', transportCompany: '' }); }} className="text-indigo-600 focus:ring-indigo-500" />
                                            รถขนส่งร่วม (3PL)
                                        </div>
                                        <div className="space-y-2 mt-2">
                                            <input
                                                type="text"
                                                aria-label="ระบุบริษัทขนส่ง"
                                                title="ระบุบริษัทขนส่ง"
                                                placeholder="ระบุบริษัทขนส่ง..."
                                                value={transportMode === '3PL' ? transportInfo.transportCompany : ''}
                                                onChange={(e) => setTransportInfo({ ...transportInfo, transportCompany: e.target.value })}
                                                disabled={transportMode !== '3PL'}
                                                className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                            />
                                            <input
                                                type="text"
                                                aria-label="ชื่อพนักงานขับรถ"
                                                title="ชื่อพนักงานขับรถ"
                                                placeholder="ชื่อพนักงานขับรถ"
                                                value={transportMode === '3PL' ? transportInfo.driverName : ''}
                                                onChange={(e) => setTransportInfo({ ...transportInfo, driverName: e.target.value })}
                                                disabled={transportMode !== '3PL'}
                                                className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                            />
                                            <input
                                                type="text"
                                                aria-label="ทะเบียนรถ"
                                                title="ทะเบียนรถ"
                                                placeholder="ทะเบียนรถ"
                                                value={transportMode === '3PL' ? transportInfo.plateNumber : ''}
                                                onChange={(e) => setTransportInfo({ ...transportInfo, plateNumber: e.target.value })}
                                                disabled={transportMode !== '3PL'}
                                                className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                            />
                                        </div>
                                    </label>

                                    <label className={`cursor-pointer rounded-xl border p-4 transition-all ${transportMode === 'Other' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <div className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                                            <input type="radio" aria-label="อื่นๆ" title="อื่นๆ" name="transportType" checked={transportMode === 'Other'} onChange={() => { setTransportMode('Other'); setTransportInfo({ driverName: '', plateNumber: '', transportCompany: '' }); }} className="text-indigo-600 focus:ring-indigo-500" />
                                            อื่นๆ
                                        </div>
                                        <input
                                            type="text"
                                            aria-label="ระบุรายละเอียดการขนส่ง"
                                            title="ระบุรายละเอียดการขนส่ง"
                                            placeholder="ระบุรายละเอียด..."
                                            value={transportMode === 'Other' ? transportInfo.transportCompany : ''}
                                            onChange={(e) => setTransportInfo({ ...transportInfo, transportCompany: e.target.value })}
                                            disabled={transportMode !== 'Other'}
                                            className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none mt-2"
                                        />
                                    </label>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Section 2: Destination */}
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-slate-800 mb-2">2. ปลายทาง (Destination)</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${routeType === 'Hub' ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <div className="pt-1">
                                            <input type="radio" aria-label="ส่งเข้า Hub นครสวรรค์" title="ส่งเข้า Hub นครสวรรค์" name="route" checked={routeType === 'Hub'} onChange={() => setRouteType('Hub')} className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-base">Hub นครสวรรค์</div>
                                            <div className="text-sm text-slate-500 mt-1">ส่งสินค้าเข้า Hub เพื่อตรวจสอบคุณภาพ (QC) และคัดแยก</div>
                                        </div>
                                    </label>

                                    <div className="flex flex-col gap-3">
                                        <label className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${routeType === 'Direct' ? 'bg-green-50 border-green-500 shadow-sm ring-1 ring-green-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                                            <div className="pt-1">
                                                <input type="radio" aria-label="ส่งตรง (Direct Return)" title="ส่งตรง (Direct Return)" name="route" checked={routeType === 'Direct'} onChange={() => setRouteType('Direct')} className="w-4 h-4 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-base">ส่งตรง (Direct Return)</div>
                                                <div className="text-sm text-slate-500 mt-1">ส่งคืนผู้ผลิตหรือลูกค้าโดยตรง (ไม่ผ่าน Hub)</div>
                                            </div>
                                        </label>

                                        {routeType === 'Direct' && (
                                            <div className="p-4 bg-green-50/50 rounded-xl border border-green-100 animate-fade-in">
                                                <div className="text-sm font-bold text-green-800 mb-2">ระบุปลายทาง:</div>
                                                <div className="space-y-2">
                                                    {['สาย 3', 'ซีโน', 'นีโอคอเปอเรท'].map(dest => (
                                                        <label key={dest} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-green-100/50 p-1 rounded">
                                                            <input type="radio" aria-label={dest} title={dest} name="directDest" value={dest} checked={directDestination === dest} onChange={e => setDirectDestination(e.target.value)} className="text-green-600" /> {dest}
                                                        </label>
                                                    ))}
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm hover:bg-green-100/50 p-1 rounded">
                                                        <input type="radio" aria-label="ปลายทางอื่น" title="ปลายทางอื่น" name="directDest" value="Other" checked={directDestination === 'Other'} onChange={e => setDirectDestination(e.target.value)} className="text-green-600" /> อื่นๆ
                                                        {directDestination === 'Other' && (
                                                            <input type="text" aria-label="ระบุปลายทาง" title="ระบุปลายทาง" value={customDestination} onChange={e => setCustomDestination(e.target.value)} placeholder="ระบุปลายทาง..." className="flex-1 ml-2 p-1.5 text-xs border border-green-300 rounded focus:ring-1 focus:ring-green-500 outline-none bg-white" autoFocus />
                                                        )}
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors">
                                ยกเลิก
                            </button>
                            <button
                                onClick={confirmSelection}
                                disabled={isSubmitting}
                                className={`px-6 py-2.5 text-white font-bold rounded-lg shadow-md flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-wait ${routeType === 'Hub' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {isSubmitting ? (
                                    <>⏳ กำลังบันทึก...</>
                                ) : (
                                    routeType === 'Hub' ?
                                        <>ยืนยัน / ออกเอกสาร <Truck className="w-5 h-5" /></> :
                                        <>ยืนยัน / ออกเอกสาร <Printer className="w-5 h-5" /></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Decision Modal */}
            {isDecisionModalOpen && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Share2 className="w-6 h-6 text-indigo-600" />
                                    เพิ่มการตัดสินใจเบื้องต้น
                                </h3>
                                <button onClick={() => setIsDecisionModalOpen(false)} aria-label="ปิด" title="ปิด" className="text-slate-400 hover:text-slate-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <p className="text-sm text-slate-600 mt-2">กรุณาเลือกการจัดการเบื้องต้นสำหรับรายการนี้</p>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* FIELD SETTLEMENT OPTION */}
                            <div className={`p-4 rounded-xl border-2 transition-all ${isFieldSettled ? 'bg-amber-50 border-amber-500 shadow-md' : 'bg-slate-50 border-slate-200'}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isFieldSettled}
                                        onChange={(e) => setIsFieldSettled(e.target.checked)}
                                        className="w-5 h-5 accent-amber-600"
                                    />
                                    <span className={`text-lg font-bold ${isFieldSettled ? 'text-amber-800' : 'text-slate-600'}`}>
                                        💰 จบงานหน้างาน / ชดเชยเงิน (Field Settlement)
                                    </span>
                                </label>
                                <p className="text-xs text-slate-500 ml-8 mt-1">ติ๊กช่องนี้หากสินค้าถูกชดเชยเงินเรียบร้อยแล้ว และไม่ต้องส่งคืน Hub</p>

                                {isFieldSettled && (
                                    <div className="mt-4 ml-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-amber-900 leading-none">จำนวนเงินที่ชดเชย (บ.)</label>
                                            <input
                                                type="number"
                                                value={fieldAmount || ''}
                                                onChange={(e) => setFieldAmount(Number(e.target.value))}
                                                className="w-full p-3 border border-amber-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-amber-500 bg-white"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-amber-900 leading-none">หลักฐานการรับเงิน (Ref.)</label>
                                            <input
                                                type="text"
                                                value={fieldEvidence}
                                                onChange={(e) => setFieldEvidence(e.target.value)}
                                                className="w-full p-3 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                                                placeholder="เช่น ลายเซ็น / รูปถ่าย"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-amber-900 leading-none">ชื่อ-นามสกุล ผู้รับผิดชอบ</label>
                                            <input
                                                type="text"
                                                value={fieldName}
                                                onChange={(e) => setFieldName(e.target.value)}
                                                className="w-full p-3 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                                                placeholder="ชื่อ-นามสกุล"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-amber-900 leading-none">ตำแหน่ง</label>
                                            <input
                                                type="text"
                                                value={fieldPosition}
                                                onChange={(e) => setFieldPosition(e.target.value)}
                                                className="w-full p-3 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                                                placeholder="เช่น พนักงานขับรถ / พนักงานขาย"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!isFieldSettled && (
                                <div className="border rounded-xl overflow-hidden bg-indigo-50/30">
                                    <div className="bg-indigo-100 px-4 py-2 border-b border-indigo-200 font-bold text-indigo-800 flex items-center gap-2 text-sm">
                                        <Truck className="w-4 h-4" /> ระบุเส้นทางส่งคืน (Return Route)
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs text-slate-500 mb-3">กรุณาเลือกเส้นทางสำหรับการส่งคืนสินค้า</p>

                                        <div className="p-3 bg-white rounded border border-indigo-100 text-sm">
                                            <label className="block font-bold mb-2">เลือกเส้นทางส่งคืน <span className="text-red-500">*</span></label>
                                            <div className="flex flex-wrap gap-2">
                                                {RETURN_ROUTES.map(route => (
                                                    <label key={route} className={`px-3 py-1 rounded border cursor-pointer transition-all ${tempRoute === route ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-slate-50 hover:bg-indigo-50/50'}`}>
                                                        <input
                                                            type="radio"
                                                            aria-label={route}
                                                            title={route}
                                                            name="tempRoute"
                                                            value={route}
                                                            checked={tempRoute === route}
                                                            onChange={(e) => { setTempRoute(e.target.value); }}
                                                            className="hidden"
                                                        />
                                                        {route}
                                                    </label>
                                                ))}
                                                <label className={`px-3 py-1 rounded border cursor-pointer transition-all ${tempRoute === 'Other' || (tempRoute && !RETURN_ROUTES.includes(tempRoute)) ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-slate-50 hover:bg-indigo-50/50'}`}>
                                                    <input
                                                        type="radio"
                                                        aria-label="เส้นทางอื่นๆ"
                                                        title="เส้นทางอื่นๆ"
                                                        name="tempRoute"
                                                        value="Other"
                                                        checked={tempRoute === 'Other' || (tempRoute && !RETURN_ROUTES.includes(tempRoute))}
                                                        onChange={() => { setTempRoute('Other'); }}
                                                        className="hidden"
                                                    />
                                                    อื่นๆ (Other)
                                                </label>
                                            </div>
                                            {(tempRoute === 'Other' || (tempRoute && !RETURN_ROUTES.includes(tempRoute))) && (
                                                <input
                                                    type="text"
                                                    aria-label="ระบุเส้นทาง"
                                                    title="ระบุเส้นทาง"
                                                    value={tempRoute === 'Other' ? '' : tempRoute}
                                                    onChange={(e) => setTempRoute(e.target.value)}
                                                    className="w-full mt-2 p-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="ระบุเส้นทาง..."
                                                    autoFocus
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setIsDecisionModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors">
                                ยกเลิก
                            </button>
                            <button onClick={handleSaveDecision} disabled={isSubmitting} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-wait">
                                {isSubmitting ? '...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
