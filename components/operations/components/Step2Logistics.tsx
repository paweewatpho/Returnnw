import React, { useState, useMemo } from 'react';
import { Truck, MapPin, Printer, ArrowRight, Package, Box, Calendar, Layers } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord } from '../../../types';
import Swal from 'sweetalert2';

interface Step2LogisticsProps {
    // items: ReturnRecord[]; // Removed as we use global state
    onConfirm: (selectedIds: string[], routeType: 'Hub' | 'Direct', transportInfo: any) => void;
}

export const Step2Logistics: React.FC<Step2LogisticsProps> = ({ onConfirm }) => {
    const { items, updateReturnRecord } = useData();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [transportInfo, setTransportInfo] = useState({
        driverName: '',
        plateNumber: '',
        transportCompany: 'รถบริษัท'
    });
    const [routeType, setRouteType] = useState<'Hub' | 'Direct'>('Hub');

    const [directDestination, setDirectDestination] = useState<string>('');
    const [customDestination, setCustomDestination] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<string>('All');

    // Filter Logic: Global Items -> Status 'Requested'
    const logisticsItems = useMemo(() => {
        return items.filter(i => i.status === 'Requested');
    }, [items]);

    const uniqueBranches = useMemo(() => Array.from(new Set(logisticsItems.map(i => i.branch))).filter(Boolean), [logisticsItems]);

    const filteredItems = useMemo(() => logisticsItems.filter(item =>
        selectedBranch === 'All' || item.branch === selectedBranch
    ), [logisticsItems, selectedBranch]);

    const handleToggle = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
            // If all filtered items are selected, deselect them
            const newSet = new Set(selectedIds);
            filteredItems.forEach(i => newSet.delete(i.id));
            setSelectedIds(newSet);
        } else {
            // Select all filtered items
            const newSet = new Set(selectedIds);
            filteredItems.forEach(i => newSet.add(i.id));
            setSelectedIds(newSet);
        }
    };

    const confirmSelection = async () => {
        if (selectedIds.size === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่ได้เลือกรายการ',
                text: 'กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ'
            });
            return;
        }
        if (!transportInfo.driverName || !transportInfo.plateNumber) {
            const confirmResult = await Swal.fire({
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'คุณยังไม่ได้ระบุชื่อพนักงานขับรถหรือทะเบียนรถ ต้องการดำเนินการต่อหรือไม่?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'ดำเนินการต่อ',
                cancelButtonText: 'ยกเลิก'
            });

            if (!confirmResult.isConfirmed) {
                return;
            }
        }

        let finalDestination = '';
        if (routeType === 'Direct') {
            if (!directDestination) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุปลายทางสำหรับการส่งตรง (Direct Return)'
                });
                return;
            }
            if (directDestination === 'Other' && !customDestination) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุชื่อปลายทาง (อื่นๆ)'
                });
                return;
            }
            finalDestination = directDestination === 'Other' ? customDestination : directDestination;
        }

        const confirmMsg = routeType === 'Hub'
            ? 'ยืนยันการเปลี่ยนสถานะเป็น "รอรถรับ" (PickupScheduled) และบันทึกข้อมูลรถ?'
            : `ยืนยันการส่งคืนตรงผู้ผลิต (Direct Return) ไปยัง "${finalDestination}"?`;

        const finalConfirm = await Swal.fire({
            title: 'ยืนยันการบันทึก',
            text: confirmMsg,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });

        if (finalConfirm.isConfirmed) {
            // Update Records Directly
            const driverDetails = `Driver: ${transportInfo.driverName}, Plate: ${transportInfo.plateNumber}, Transport: ${transportInfo.transportCompany}`;

            try {
                for (const id of Array.from(selectedIds)) {
                    if (routeType === 'Hub') {
                        await updateReturnRecord(id, {
                            status: 'PickupScheduled',
                            // Store driver info in notes or relevant field
                            notes: `[Logistics] ${driverDetails}`,
                            // problemDetail: `${driverDetails}` 
                        });
                    } else {
                        // Direct Return Logic (Might default to Completed or Documented?)
                        // User asked for "DriverAssigned", usually leading to Hub. Direct might just skip?
                        // For Direct, let's assume it goes to 'Documented' or remains 'Requested' but with notes?
                        // Adhering to User Request: "Update... to 'DriverAssigned' (or 'CollectionScheduled')"
                        // Assuming this is for Hub route mainly. for Direct, maybe 'ReturnToSupplier'?
                        // Let's stick to user request for status update.
                        await updateReturnRecord(id, {
                            status: 'ReturnToSupplier', // Direct return usually skips Hub logic
                            disposition: 'RTV',
                            destinationCustomer: finalDestination,
                            notes: `[Direct Logistics] ${driverDetails}`
                        });
                    }
                }

                // Call onConfirm to notify parent (maybe to clear selection or show success msg)
                onConfirm(Array.from(selectedIds), routeType, { ...transportInfo, destination: finalDestination });

                await Swal.fire({
                    icon: 'success',
                    title: 'เรียบร้อย',
                    text: 'บันทึกข้อมูลการขนส่งเรียบร้อย',
                    timer: 1500,
                    showConfirmButton: false
                });

                // Clear selection
                setSelectedIds(new Set());
            } catch (error) {
                console.error('Logistics Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
                });
            }
        }
    };

    // Helper to check if all filtered items are selected
    const isAllFilteredSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id));

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Truck className="w-6 h-6 text-blue-600" /> รวบรวมและระบุขนส่ง (Consolidation & Logistics)
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Transport Info Form */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
                    <h4 className="font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">ข้อมูลการขนส่ง</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">ทะเบียนรถ</label>
                            <input
                                type="text"
                                value={transportInfo.plateNumber}
                                onChange={e => setTransportInfo({ ...transportInfo, plateNumber: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                placeholder="เช่น 1กข-1234"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">พนักงานขับรถ</label>
                            <input
                                type="text"
                                value={transportInfo.driverName}
                                onChange={e => setTransportInfo({ ...transportInfo, driverName: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                placeholder="ชื่อ-นามสกุล"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">บริษัทขนส่ง</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="transportType"
                                        checked={transportInfo.transportCompany === 'รถบริษัท'}
                                        onChange={() => setTransportInfo({ ...transportInfo, transportCompany: 'รถบริษัท' })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm">รถบริษัท</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="transportType"
                                        checked={transportInfo.transportCompany !== 'รถบริษัท'}
                                        onChange={() => setTransportInfo({ ...transportInfo, transportCompany: '' })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm">รถขนส่งร่วม</span>
                                </label>
                            </div>
                            {transportInfo.transportCompany !== 'รถบริษัท' && (
                                <input
                                    type="text"
                                    value={transportInfo.transportCompany === 'รถบริษัท' ? '' : transportInfo.transportCompany}
                                    onChange={e => setTransportInfo({ ...transportInfo, transportCompany: e.target.value })}
                                    className="w-full mt-2 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 bg-slate-50 animate-fade-in"
                                    placeholder="ระบุชื่อบริษัทขนส่ง..."
                                    autoFocus
                                />
                            )}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <h4 className="font-bold text-slate-700 mb-3 block">ปลายทาง (Destination) - จุดตัดสินใจ</h4>
                        <div className="space-y-3">
                            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${routeType === 'Hub' ? 'bg-blue-50 border-blue-500 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" name="route" checked={routeType === 'Hub'} onChange={() => setRouteType('Hub')} className="mt-1" />
                                <div>
                                    <div className="font-bold text-slate-800">ศูนย์กระจายสินค้า (Hub) (นครสวรรค์)</div>
                                    <div className="text-xs text-slate-500">ส่งเข้า Hub นครสวรรค์เพื่อตรวจสอบคุณภาพ (QC) และรวมของ</div>
                                </div>
                            </label>
                            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${routeType === 'Direct' ? 'bg-green-50 border-green-500 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" name="route" checked={routeType === 'Direct'} onChange={() => setRouteType('Direct')} className="mt-1" />
                                <div>
                                    <div className="font-bold text-slate-800">ส่งตรง (Direct Return)</div>
                                    <div className="text-xs text-slate-500">ไม่ผ่าน QC, ออกใบส่งของทันที</div>
                                </div>
                            </label>

                            {/* Direct Route Options */}
                            {routeType === 'Direct' && (
                                <div className="ml-8 p-3 bg-green-50/50 rounded-lg border border-green-100 space-y-2 animate-fade-in">
                                    <div className="text-xs font-bold text-green-800 mb-1">ระบุปลายทาง (Direct Destination):</div>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" name="directDest" value="สาย 3" checked={directDestination === 'สาย 3'} onChange={e => setDirectDestination(e.target.value)} />
                                        สาย 3
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" name="directDest" value="ซีโน" checked={directDestination === 'ซีโน'} onChange={e => setDirectDestination(e.target.value)} />
                                        ซีโน
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" name="directDest" value="นีโอคอเปอเรท" checked={directDestination === 'นีโอคอเปอเรท'} onChange={e => setDirectDestination(e.target.value)} />
                                        นีโอคอเปอเรท
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" name="directDest" value="Other" checked={directDestination === 'Other'} onChange={e => setDirectDestination(e.target.value)} />
                                        อื่นๆ (ระบุ)
                                    </label>
                                    {directDestination === 'Other' && (
                                        <input
                                            type="text"
                                            value={customDestination}
                                            onChange={e => setCustomDestination(e.target.value)}
                                            placeholder="ระบุปลายทาง..."
                                            className="w-full mt-1 p-1.5 text-xs border border-green-300 rounded focus:outline-none focus:border-green-500"
                                            autoFocus
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={confirmSelection}
                        className={`w-full mt-6 py-3 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 ${routeType === 'Hub' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {routeType === 'Hub' ? (
                            <>บันทึกและส่งเข้า Hub <ArrowRight className="w-4 h-4" /></>
                        ) : (
                            <>สร้างใบส่งของ (Direct) <Printer className="w-4 h-4" /></>
                        )}
                    </button>
                </div>

                {/* Items Selection Table replaced with Card List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col overflow-hidden max-h-[600px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-2">
                        <div>
                            <h4 className="font-bold text-slate-700">รายการสินค้ารอจัดส่ง ({filteredItems.length}/{items.length})</h4>
                            <div className="text-sm text-slate-500">เลือก {selectedIds.size} รายการ</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSelectAll}
                                className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600 font-medium transition-colors"
                            >
                                {isAllFilteredSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                            </button>
                            <span className="text-xs text-slate-500 font-bold ml-2">กรองสาขา:</span>
                            <select
                                value={selectedBranch}
                                onChange={e => setSelectedBranch(e.target.value)}
                                className="text-xs p-1.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="All">ทั้งหมด (All Branches)</option>
                                {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                        {filteredItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                <p>{selectedBranch !== 'All' ? 'ไม่พบรายการในสาขานี้' : 'ไม่มีรายการสินค้าที่รอจัดส่ง'}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredItems.map(item => {
                                    const isSelected = selectedIds.has(item.id);
                                    const isNCR = item.id.startsWith('NCR') || item.ncrNumber;
                                    const displayID = isNCR ? (item.ncrNumber || item.id) : (item.refNo || item.id);

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleToggle(item.id)}
                                            className={`
                                                group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none
                                                ${isSelected
                                                    ? 'bg-blue-50/80 border-blue-400 shadow-sm ring-1 ring-blue-100'
                                                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                                                }
                                            `}
                                        >
                                            {/* Checkbox */}
                                            <div className="pt-1">
                                                <div className={`
                                                    w-5 h-5 rounded border flex items-center justify-center transition-colors
                                                    ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300 group-hover:border-blue-400'}
                                                `}>
                                                    {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                            </div>

                                            {/* Content Area */}
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">

                                                {/* Product Info (Span 7) */}
                                                <div className="md:col-span-7">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {/* Badge */}
                                                        {isNCR ? (
                                                            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-200 shadow-sm">
                                                                <Package size={12} /> NCR: {displayID}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-purple-200 shadow-sm">
                                                                <Layers size={12} /> COL: {displayID}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-slate-400 font-mono border-l pl-2 border-slate-200">
                                                            Code: {item.productCode || '-'}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-800 text-sm mb-1">{item.productName}</h4>
                                                    {item.problemDetail && (
                                                        <p className="text-xs text-slate-500 line-clamp-1 flex items-center gap-1">
                                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                            {item.problemDetail}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Meta Info (Span 5) */}
                                                <div className="md:col-span-5 flex flex-col justify-center gap-2 md:border-l md:pl-4 border-slate-100 text-xs text-slate-600">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex items-center gap-2" title="จำนวน">
                                                            <Box size={14} className="text-slate-400" />
                                                            <span className="font-bold text-slate-800">{item.quantity} {item.unit}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2" title="สาขาต้นทาง">
                                                            <MapPin size={14} className="text-slate-400" />
                                                            <span className="truncate">{item.branch}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2" title="วันที่แจ้ง">
                                                            <Calendar size={14} className="text-slate-400" />
                                                            <span>{item.dateRequested || '-'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2" title="ปลายทาง">
                                                            <ArrowRight size={14} className="text-slate-400" />
                                                            <span className="truncate text-blue-600 font-medium">{item.destinationCustomer || '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
