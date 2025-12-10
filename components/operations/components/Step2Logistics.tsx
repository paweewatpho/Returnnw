import React, { useState } from 'react';
import { Truck, MapPin, Printer, ArrowRight } from 'lucide-react';
import { ReturnRecord } from '../../../types';

interface Step2LogisticsProps {
    items: ReturnRecord[];
    onConfirm: (selectedIds: string[], routeType: 'Hub' | 'Direct', transportInfo: any) => void;
}

export const Step2Logistics: React.FC<Step2LogisticsProps> = ({ items, onConfirm }) => {
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

    // Filter Logic
    const uniqueBranches = Array.from(new Set(items.map(i => i.branch))).filter(Boolean);
    const filteredItems = items.filter(item =>
        selectedBranch === 'All' || item.branch === selectedBranch
    );

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

    const confirmSelection = () => {
        if (selectedIds.size === 0) {
            alert('กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ');
            return;
        }
        if (!transportInfo.driverName || !transportInfo.plateNumber) {
            if (!window.confirm('คุณยังไม่ได้ระบุชื่อพนักงานขับรถหรือทะเบียนรถ ต้องการดำเนินการต่อหรือไม่?')) {
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

        const confirmMsg = routeType === 'Hub'
            ? 'ยืนยันการส่งสินค้าเข้าศูนย์กระจายสินค้า (Hub นครสวรรค์)?'
            : `ยืนยันการส่งคืนตรงผู้ผลิต (Direct Return) ไปยัง "${finalDestination}"?`;

        if (window.confirm(confirmMsg)) {
            onConfirm(Array.from(selectedIds), routeType, { ...transportInfo, destination: finalDestination });
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

                {/* Items Selection Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col overflow-hidden max-h-[600px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-2">
                        <div>
                            <h4 className="font-bold text-slate-700">รายการสินค้ารอจัดส่ง ({filteredItems.length}/{items.length})</h4>
                            <div className="text-sm text-slate-500">เลือก {selectedIds.size} รายการ</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-bold">กรองสาขา:</span>
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
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="p-3 w-10 text-center bg-slate-100">
                                        <input type="checkbox" checked={isAllFilteredSelected} onChange={handleSelectAll} />
                                    </th>
                                    <th className="p-3 bg-slate-100">สินค้า</th>
                                    <th className="p-3 bg-slate-100">จำนวน</th>
                                    <th className="p-3 bg-slate-100">สาขา/วันที่</th>
                                    <th className="p-3 bg-slate-100">ปลายทาง</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                            {selectedBranch !== 'All' ? 'ไม่พบรายการในสาขานี้' : 'ไม่มีรายการสินค้าที่รอจัดส่ง'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map(item => (
                                        <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50/50' : ''}`}>
                                            <td className="p-3 text-center">
                                                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => handleToggle(item.id)} />
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-800">{item.productName}</div>
                                                <div className="text-xs text-slate-500">{item.productCode}</div>
                                            </td>
                                            <td className="p-3 font-mono">
                                                <span className="font-bold text-blue-600">{item.quantity}</span> {item.unit}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {item.branch}</div>
                                                <div className="text-xs text-slate-400">{item.dateRequested}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="px-2 py-1 rounded bg-slate-100 inline-block text-xs font-bold text-slate-600">
                                                    {item.destinationCustomer || '-'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
