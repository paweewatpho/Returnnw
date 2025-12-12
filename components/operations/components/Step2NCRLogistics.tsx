import React, { useState, useMemo } from 'react';
import { Truck, MapPin, Printer, ArrowRight, Package, Box, Calendar, Layers } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord } from '../../../types';

interface Step2NCRLogisticsProps {
    onConfirm?: (selectedIds: string[], routeType: 'Hub' | 'Direct', transportInfo: any) => void;
}

export const Step2NCRLogistics: React.FC<Step2NCRLogisticsProps> = ({ onConfirm }) => {
    const { items } = useData(); // Removed updateReturnRecord since it's handled by onConfirm (parent)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Transport Info State matched to Step 5
    const [transportInfo, setTransportInfo] = useState({
        driverName: '',
        plateNumber: '',
        transportCompany: 'รถบริษัท'
    });

    // Route & Destination State
    const [routeType, setRouteType] = useState<'Hub' | 'Direct'>('Hub');
    const [directDestination, setDirectDestination] = useState<string>('');
    const [customDestination, setCustomDestination] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<string>('All');

    // Filter Logic: Separte NCR (Direct Entry) and Logistics (From Collection System Step 4)
    const pendingItems = useMemo(() => {
        return items.filter(item => {
            const isNCR = item.documentType === 'NCR' || !!item.ncrNumber;
            // NCR enters at 'Requested' or 'COL_JobAccepted'
            if (isNCR) {
                return item.status === 'Requested' || item.status === 'COL_JobAccepted';
            }
            // Logistics (Collection System) must complete Step 4 (Consolidation) first
            return item.status === 'COL_Consolidated';
        });
    }, [items]);

    const uniqueBranches = useMemo(() => Array.from(new Set(pendingItems.map(i => i.branch))).filter(Boolean), [pendingItems]);

    const filteredItems = useMemo(() => pendingItems.filter(item =>
        selectedBranch === 'All' || item.branch === selectedBranch
    ), [pendingItems, selectedBranch]);

    const handleToggle = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
            const newSet = new Set(selectedIds);
            filteredItems.forEach(i => newSet.delete(i.id));
            setSelectedIds(newSet);
        } else {
            const newSet = new Set(selectedIds);
            filteredItems.forEach(i => newSet.add(i.id));
            setSelectedIds(newSet);
        }
    };

    const confirmSelection = async () => {
        if (selectedIds.size === 0) {
            alert('กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ');
            return;
        }

        // Validation based on Type
        const isCompanyCar = transportInfo.transportCompany === 'รถบริษัท';
        const is3PL = !isCompanyCar && transportInfo.driverName === '3PL';
        const isOther = !isCompanyCar && transportInfo.driverName === 'Other';

        if (isCompanyCar) {
            if (!transportInfo.driverName || !transportInfo.plateNumber) {
                alert('กรุณาระบุชื่อพนักงานขับรถและทะเบียนรถสำหรับรถบริษัท');
                return;
            }
        } else if (is3PL) {
            if (!transportInfo.transportCompany) {
                alert('กรุณาระบุชื่อบริษัทขนส่ง (3PL)');
                return;
            }
        } else if (isOther) {
            if (!transportInfo.transportCompany) {
                alert('กรุณาระบุรายละเอียดการขนส่ง (อื่นๆ)');
                return;
            }
        }

        let finalDestination = '';
        if (routeType === 'Direct') {
            if (!directDestination) {
                alert('กรุณาระบุปลายทางสำหรับการส่งตรง (Direct Return)');
                return;
            }
            if (directDestination === 'Other' && !customDestination) {
                alert('กรุณาระบุชื่อปลายทาง (อื่นๆ)');
                return;
            }
            finalDestination = directDestination === 'Other' ? customDestination : directDestination;
        }

        // Delegate to Parent (Operations Logic) to handle PDF generation and Saving
        if (onConfirm) {
            // Pass transport info and specific destination for Direct
            const submissionTransportInfo = {
                ...transportInfo,
                destination: routeType === 'Direct' ? finalDestination : undefined
            };
            onConfirm(Array.from(selectedIds), routeType, submissionTransportInfo);

            // Note: We don't clear selection immediately here because the parent needs to open Modal first.
            // Ideally parent should clear it, but for now we keep selection until success alert implies refresh.
            // Or we can clear it.
            // setSelectedIds(new Set()); // Commented out to prevent state flash before Modal opens
        } else {
            console.error("No onConfirm handler provided to Step2NCRLogistics");
        }
    };

    const isAllFilteredSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id));

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Truck className="w-6 h-6 text-indigo-600" /> 2. รวบรวมและระบุขนส่ง (Consolidation & Logistics)
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Transport Info Form (Left Panel) */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
                    <h4 className="font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">ข้อมูลการขนส่ง</h4>
                    {/* ... (Middle content omitted for brevity) ... */}
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-slate-600 mb-1">เลือกประเภทการขนส่ง</label>
                        {/* Option 1: Company Car */}
                        <div className={`border rounded-lg p-3 transition-colors ${transportInfo.transportCompany === 'รถบริษัท' ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200'}`}>
                            {/* ... Inputs ... */}
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input
                                    type="radio"
                                    name="transportType"
                                    checked={transportInfo.transportCompany === 'รถบริษัท'}
                                    onChange={() => setTransportInfo({ ...transportInfo, transportCompany: 'รถบริษัท', driverName: '', plateNumber: '' })}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="font-bold text-slate-700">รถบริษัท</span>
                            </label>
                            {/* ... */}
                        </div>

                        {/* Option 2: 3PL */}
                        <div className={`border rounded-lg p-3 transition-colors ${transportInfo.transportCompany !== 'รถบริษัท' && transportInfo.driverName === '3PL' ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200'}`}>
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input
                                    type="radio"
                                    name="transportType"
                                    checked={transportInfo.transportCompany !== 'รถบริษัท' && transportInfo.driverName === '3PL'}
                                    onChange={() => setTransportInfo({ ...transportInfo, transportCompany: '', driverName: '3PL', plateNumber: '-' })}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="font-bold text-slate-700">รถขนส่งร่วม (3PL)</span>
                            </label>
                            {/* ... */}
                        </div>

                        {/* Option 3: Other */}
                        <div className={`border rounded-lg p-3 transition-colors ${transportInfo.transportCompany !== 'รถบริษัท' && transportInfo.driverName === 'Other' ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200'}`}>
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input
                                    type="radio"
                                    name="transportType"
                                    checked={transportInfo.transportCompany !== 'รถบริษัท' && transportInfo.driverName === 'Other'}
                                    onChange={() => setTransportInfo({ ...transportInfo, transportCompany: '', driverName: 'Other', plateNumber: '-' })}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="font-bold text-slate-700">อื่นๆ (ระบุ)</span>
                            </label>
                            {/* ... */}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <h4 className="font-bold text-slate-700 mb-3 block">ปลายทาง (Destination)</h4>
                        <div className="space-y-3">
                            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${routeType === 'Hub' ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" name="route" checked={routeType === 'Hub'} onChange={() => setRouteType('Hub')} className="mt-1" />
                                <div>
                                    <div className="font-bold text-slate-800">Hub นครสวรรค์</div>
                                    <div className="text-xs text-slate-500">ส่งเข้า Hub เพื่อตรวจสอบคุณภาพ (QC)</div>
                                </div>
                            </label>
                            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${routeType === 'Direct' ? 'bg-green-50 border-green-500 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" name="route" checked={routeType === 'Direct'} onChange={() => setRouteType('Direct')} className="mt-1" />
                                <div>
                                    <div className="font-bold text-slate-800">ส่งตรง (Direct Return)</div>
                                    <div className="text-xs text-slate-500">ไม่ผ่าน QC, ส่งคืนผู้ผลิต/ลูกค้าทันที</div>
                                </div>
                            </label>

                            {routeType === 'Direct' && (
                                <div className="ml-8 p-3 bg-green-50/50 rounded-lg border border-green-100 space-y-2">
                                    <div className="text-xs font-bold text-green-800 mb-1">ระบุปลายทาง:</div>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" name="directDest" value="สาย 3" checked={directDestination === 'สาย 3'} onChange={e => setDirectDestination(e.target.value)} /> สาย 3
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" name="directDest" value="ซีโน" checked={directDestination === 'ซีโน'} onChange={e => setDirectDestination(e.target.value)} /> ซีโน
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" name="directDest" value="นีโอคอเปอเรท" checked={directDestination === 'นีโอคอเปอเรท'} onChange={e => setDirectDestination(e.target.value)} /> นีโอคอเปอเรท
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input type="radio" name="directDest" value="Other" checked={directDestination === 'Other'} onChange={e => setDirectDestination(e.target.value)} /> อื่นๆ
                                    </label>
                                    {directDestination === 'Other' && (
                                        <input type="text" value={customDestination} onChange={e => setCustomDestination(e.target.value)} placeholder="ระบุปลายทาง..." className="w-full mt-1 p-1.5 text-xs border border-green-300 rounded" />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={confirmSelection}
                        disabled={selectedIds.size === 0}
                        className={`w-full mt-6 py-3 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${routeType === 'Hub' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {routeType === 'Hub' ?
                            <>ตรวจสอบ & บันทึก (Preview & Save) <Printer className="w-4 h-4" /></> :
                            <>ตรวจสอบ & บันทึก (Preview & Save) <Printer className="w-4 h-4" /></>
                        }
                    </button>
                </div>

                {/* List (Right Panel - Spanning 2 cols) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col overflow-hidden max-h-[700px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-2">
                        <div>
                            <h4 className="font-bold text-slate-700">รายการสินค้ารอจัดส่ง ({filteredItems.length})</h4>
                            <div className="text-sm text-slate-500">เลือก {selectedIds.size} รายการ</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleSelectAll} className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600 font-medium">
                                {isAllFilteredSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                            </button>
                            <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="text-xs p-1.5 border rounded-lg bg-white outline-none">
                                <option value="All">ทุกสาขา</option>
                                {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                        {filteredItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                <p>ไม่พบรายการสินค้าที่รอจัดส่ง</p>
                                <p className="text-xs mt-1">หรือลองเปลี่ยนตัวกรองสาขา</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredItems.map(item => {
                                    const isSelected = selectedIds.has(item.id);
                                    const isNCR = item.documentType === 'NCR';
                                    return (
                                        <div key={item.id} onClick={() => handleToggle(item.id)} className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                                            <div className="pt-1">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">{item.productName}</h4>
                                                        <div className="flex gap-2 mt-1">
                                                            {isNCR ?
                                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">NCR</span> :
                                                                <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">COL</span>
                                                            }
                                                            <span className="text-xs font-mono text-slate-500">{item.ncrNumber || item.id}</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-400">{item.dateRequested || item.date}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-2 flex gap-4 flex-wrap">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">สาขา: {item.branch}</span>
                                                    <span>จำนวน: <b>{item.quantity} {item.unit}</b></span>
                                                    {item.founder && <span>ผู้พบ: {item.founder}</span>}
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
