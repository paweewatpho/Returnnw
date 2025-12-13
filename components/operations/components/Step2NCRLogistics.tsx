import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { Truck, MapPin, Printer, ArrowRight, Package, Box, Calendar, Layers, X, Info } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord } from '../../../types';

interface Step2NCRLogisticsProps {
    onConfirm?: (selectedIds: string[], routeType: 'Hub' | 'Direct', transportInfo: any) => void;
}

export const Step2NCRLogistics: React.FC<Step2NCRLogisticsProps> = ({ onConfirm }) => {
    const { items } = useData();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Transport Info State
    const [transportMode, setTransportMode] = useState<'Company' | '3PL' | 'Other'>('Company');
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

    // Filter Logic
    const pendingItems = useMemo(() => {
        return items.filter(item => {
            const isNCR = item.documentType === 'NCR' || !!item.ncrNumber;
            if (isNCR) {
                return item.status === 'Requested' || item.status === 'COL_JobAccepted';
            }
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
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredItems.map(i => i.id)));
        }
    };

    const handleOpenModal = () => {
        if (selectedIds.size === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่มีรายการที่เลือก',
                text: 'กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#f39c12'
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
                    confirmButtonText: 'ตกลง',
                    confirmButtonColor: '#f39c12'
                });
                return;
            }
        } else if (transportMode === '3PL') {
            if (!transportInfo.transportCompany) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุชื่อบริษัทขนส่ง (3PL)',
                    confirmButtonText: 'ตกลง',
                    confirmButtonColor: '#f39c12'
                });
                return;
            }
            if (!transportInfo.driverName || !transportInfo.plateNumber) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุชื่อพนักงานขับรถและทะเบียนรถสำหรับ 3PL',
                    confirmButtonText: 'ตกลง',
                    confirmButtonColor: '#f39c12'
                });
                return;
            }
        } else if (transportMode === 'Other') {
            if (!transportInfo.transportCompany) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุรายละเอียดการขนส่ง (อื่นๆ)',
                    confirmButtonText: 'ตกลง',
                    confirmButtonColor: '#f39c12'
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
                    confirmButtonText: 'ตกลง',
                    confirmButtonColor: '#f39c12'
                });
                return;
            }
            if (directDestination === 'Other' && !customDestination) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: 'กรุณาระบุชื่อปลายทาง (อื่นๆ)',
                    confirmButtonText: 'ตกลง',
                    confirmButtonColor: '#f39c12'
                });
                return;
            }
            finalDestination = directDestination === 'Other' ? customDestination : directDestination;
        }

        if (onConfirm) {
            const submissionTransportInfo = {
                ...transportInfo,
                destination: routeType === 'Direct' ? finalDestination : undefined
            };
            onConfirm(Array.from(selectedIds), routeType, submissionTransportInfo);
            setIsModalOpen(false); // Close modal on success

            // Optional Success Message
            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ',
                text: 'สร้างเอกสารและบันทึกข้อมูลเรียบร้อยแล้ว',
                timer: 1500,
                showConfirmButton: false
            });
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
                        <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="bg-transparent text-sm font-medium outline-none text-slate-800">
                            <option value="All">ทุกสาขา</option>
                            {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div className="text-sm text-slate-500">
                        รายการรอดำเนินการ: <span className="font-bold text-indigo-600">{filteredItems.length}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={handleSelectAll} className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 font-bold transition-colors">
                        {isAllFilteredSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                    </button>
                    <button
                        onClick={handleOpenModal}
                        disabled={selectedIds.size === 0}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Truck className="w-4 h-4" /> ดำเนินการ ({selectedIds.size})
                    </button>
                </div>
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto pb-20">
                {filteredItems.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <Package className="w-16 h-16 mb-4 text-slate-300" />
                        <p className="font-medium text-lg">ไม่พบรายการสินค้าที่รอจัดส่ง</p>
                        <p className="text-sm mt-1">กรุณาตรวจสอบสถานะสินค้า หรือการกรองสาขา</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredItems.map(item => {
                            const isSelected = selectedIds.has(item.id);
                            const isNCR = item.documentType === 'NCR';
                            return (
                                <div key={item.id} onClick={() => handleToggle(item.id)} className={`group relative p-5 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${isSelected ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            {isNCR ?
                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">NCR</span> :
                                                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">COL</span>
                                            }
                                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 rounded">{item.ncrNumber || item.id}</span>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-transparent border-slate-300 group-hover:border-indigo-400'}`}>
                                            {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-slate-800 text-base mb-2 line-clamp-2" title={item.productName}>{item.productName}</h4>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">จำนวน:</span>
                                            <span className="font-bold text-slate-700">{item.quantity} {item.unit}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">สาขา:</span>
                                            <span className="text-slate-700">{item.branch}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">วันที่:</span>
                                            <span className="text-slate-700">{item.dateRequested || item.date}</span>
                                        </div>
                                    </div>

                                    {item.founder && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1">
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
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
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
                                            <input type="radio" name="transportType" checked={transportMode === 'Company'} onChange={() => { setTransportMode('Company'); setTransportInfo({ driverName: '', plateNumber: '', transportCompany: 'รถบริษัท' }); }} className="text-indigo-600 focus:ring-indigo-500" />
                                            รถบริษัท
                                        </div>
                                        <div className="space-y-2 mt-2">
                                            <input
                                                type="text"
                                                placeholder="ชื่อพนักงานขับรถ"
                                                value={transportMode === 'Company' ? transportInfo.driverName : ''}
                                                onChange={(e) => setTransportInfo({ ...transportInfo, driverName: e.target.value })}
                                                disabled={transportMode !== 'Company'}
                                                className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                            />
                                            <input
                                                type="text"
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
                                            <input type="radio" name="transportType" checked={transportMode === '3PL'} onChange={() => { setTransportMode('3PL'); setTransportInfo({ driverName: '', plateNumber: '', transportCompany: '' }); }} className="text-indigo-600 focus:ring-indigo-500" />
                                            รถขนส่งร่วม (3PL)
                                        </div>
                                        <div className="space-y-2 mt-2">
                                            <input
                                                type="text"
                                                placeholder="ระบุบริษัทขนส่ง..."
                                                value={transportMode === '3PL' ? transportInfo.transportCompany : ''}
                                                onChange={(e) => setTransportInfo({ ...transportInfo, transportCompany: e.target.value })}
                                                disabled={transportMode !== '3PL'}
                                                className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                            />
                                            <input
                                                type="text"
                                                placeholder="ชื่อพนักงานขับรถ"
                                                value={transportMode === '3PL' ? transportInfo.driverName : ''}
                                                onChange={(e) => setTransportInfo({ ...transportInfo, driverName: e.target.value })}
                                                disabled={transportMode !== '3PL'}
                                                className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                            />
                                            <input
                                                type="text"
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
                                            <input type="radio" name="transportType" checked={transportMode === 'Other'} onChange={() => { setTransportMode('Other'); setTransportInfo({ driverName: '', plateNumber: '', transportCompany: '' }); }} className="text-indigo-600 focus:ring-indigo-500" />
                                            อื่นๆ
                                        </div>
                                        <input
                                            type="text"
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
                                            <input type="radio" name="route" checked={routeType === 'Hub'} onChange={() => setRouteType('Hub')} className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-base">Hub นครสวรรค์</div>
                                            <div className="text-sm text-slate-500 mt-1">ส่งสินค้าเข้า Hub เพื่อตรวจสอบคุณภาพ (QC) และคัดแยก</div>
                                        </div>
                                    </label>

                                    <div className="flex flex-col gap-3">
                                        <label className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${routeType === 'Direct' ? 'bg-green-50 border-green-500 shadow-sm ring-1 ring-green-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                                            <div className="pt-1">
                                                <input type="radio" name="route" checked={routeType === 'Direct'} onChange={() => setRouteType('Direct')} className="w-4 h-4 text-green-600" />
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
                                                            <input type="radio" name="directDest" value={dest} checked={directDestination === dest} onChange={e => setDirectDestination(e.target.value)} className="text-green-600" /> {dest}
                                                        </label>
                                                    ))}
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm hover:bg-green-100/50 p-1 rounded">
                                                        <input type="radio" name="directDest" value="Other" checked={directDestination === 'Other'} onChange={e => setDirectDestination(e.target.value)} className="text-green-600" /> อื่นๆ
                                                        {directDestination === 'Other' && (
                                                            <input type="text" value={customDestination} onChange={e => setCustomDestination(e.target.value)} placeholder="ระบุปลายทาง..." className="flex-1 ml-2 p-1.5 text-xs border border-green-300 rounded focus:ring-1 focus:ring-green-500 outline-none bg-white" autoFocus />
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
                                className={`px-6 py-2.5 text-white font-bold rounded-lg shadow-md flex items-center gap-2 transition-all ${routeType === 'Hub' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {routeType === 'Hub' ?
                                    <>ยืนยัน / ออกเอกสาร <Truck className="w-5 h-5" /></> :
                                    <>ยืนยัน / ออกเอกสาร <Printer className="w-5 h-5" /></>
                                }
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
