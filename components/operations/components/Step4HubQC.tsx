

import React, { useState, useEffect } from 'react';
import { Activity, ClipboardList, GitFork, Save, Truck, Search, Undo } from 'lucide-react';
import { useData } from '../../../DataContext';
import Swal from 'sweetalert2';
import { ReturnRecord, ItemCondition, DispositionAction } from '../../../types';
import { conditionLabels, dispositionLabels } from '../utils';
import { RETURN_ROUTES } from '../../../constants';

export const Step4HubQC: React.FC = () => {
    const { items, updateReturnRecord, addReturnRecord } = useData();

    // Local State
    const [qcSelectedItem, setQcSelectedItem] = useState<ReturnRecord | null>(null);
    const [customInputType, setCustomInputType] = useState<'Good' | 'Bad' | null>(null);
    const [selectedDisposition, setSelectedDisposition] = useState<DispositionAction | null>(null);
    const [dispositionDetails, setDispositionDetails] = useState({
        route: '',
        sellerName: '',
        contactPhone: '',
        internalUseDetail: '',
        claimCompany: '',
        claimCoordinator: '',
        claimPhone: ''
    });
    const [isCustomRoute, setIsCustomRoute] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Split State
    const [showSplitMode, setShowSplitMode] = useState(false);
    const [isBreakdownUnit, setIsBreakdownUnit] = useState(false);
    const [conversionRate, setConversionRate] = useState(1);
    const [newUnitName, setNewUnitName] = useState('');
    const [splitQty, setSplitQty] = useState(0);
    const [splitCondition, setSplitCondition] = useState<ItemCondition>('New');
    const [splitDisposition, setSplitDisposition] = useState<DispositionAction | null>(null);

    // Filter Items: Status 'NCR_HubReceived' or 'ReceivedAtHub'
    // Filter Items: Show ONLY NCR items that are received at Hub
    // COL items skip this step and go directly to Docs.
    const receivedItems = React.useMemo(() => {
        return items.filter(item => {
            const isReceived = item.status === 'NCR_HubReceived' || item.status === 'ReceivedAtHub';
            // Explicitly verify it's an NCR related item
            const isNCR = item.documentType === 'NCR' || !!item.ncrNumber || item.status === 'NCR_HubReceived';
            return isReceived && isNCR;
        });
    }, [items]);

    // Handlers
    const selectQCItem = (item: ReturnRecord) => {
        setQcSelectedItem(item);
        // Reset form
        setSelectedDisposition(null);
        setCustomInputType(null);
        setShowSplitMode(false);
        setSplitQty(0);
        setDispositionDetails({
            route: '', sellerName: '', contactPhone: '', internalUseDetail: '',
            claimCompany: '', claimCoordinator: '', claimPhone: ''
        });
    };

    const handleConditionSelect = (condition: ItemCondition, type?: 'Good' | 'Bad') => {
        if (!qcSelectedItem) return;
        setQcSelectedItem({ ...qcSelectedItem, condition });
        if (type) setCustomInputType(type);
    };

    const handleDispositionDetailChange = (key: string, value: string) => {
        setDispositionDetails(prev => ({ ...prev, [key]: value }));
    };

    const toggleSplitMode = () => {
        setShowSplitMode(!showSplitMode);
    };

    const handleUndoQC = async () => {
        if (!qcSelectedItem) return;

        const { value: password } = await Swal.fire({
            title: 'ยืนยันการส่งกลับ (Undo)',
            text: 'กรุณาใส่รหัสผ่านเพื่อส่งรายการกลับไป Step 3 (Receive)',
            input: 'password',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ตกลง',
            cancelButtonText: 'ยกเลิก',
            inputPlaceholder: 'รหัสผ่าน'
        });

        if (password === '1234') {
            await updateReturnRecord(qcSelectedItem.id, {
                status: 'NCR_InTransit' // Back to Step 3 Input (Receive)
            });
            setQcSelectedItem(null);

            await Swal.fire({
                icon: 'success',
                title: 'ส่งกลับ Step 3 เรียบร้อย',
                timer: 1500,
                showConfirmButton: false
            });
        } else if (password) {
            Swal.fire('รหัสผ่านไม่ถูกต้อง', '', 'error');
        }
    };

    const handleQCSubmit = async () => {
        // ...
        if (!qcSelectedItem || !selectedDisposition) return;
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Construct update object
            const updates: Partial<ReturnRecord> = {
                status: 'NCR_QCCompleted',
                condition: qcSelectedItem.condition,
                disposition: selectedDisposition,
                // Flatten disposition details into relevant fields or notes
                // mapping similar to original logic
                destinationCustomer: selectedDisposition === 'RTV' ? dispositionDetails.route :
                    selectedDisposition === 'Restock' ? dispositionDetails.sellerName :
                        selectedDisposition === 'InternalUse' ? dispositionDetails.internalUseDetail : '',
                problemDetail: selectedDisposition === 'Claim' ? `Claim: ${dispositionDetails.claimCompany} / ${dispositionDetails.claimCoordinator}` : qcSelectedItem.problemDetail
            };

            await updateReturnRecord(qcSelectedItem.id, updates);
            setQcSelectedItem(null);

            await Swal.fire({
                icon: 'success',
                title: 'บันทึกผล QC เรียบร้อย',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('QC Submit Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSplitSubmit = async () => {
        if (!qcSelectedItem || splitQty <= 0) return;
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            // 1. Calculate quantities
            const originalQty = qcSelectedItem.quantity;
            const totalUnits = isBreakdownUnit ? originalQty * conversionRate : originalQty;

            // Validation
            if (splitQty >= totalUnits) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ไม่สามารถแยกรายการ',
                    text: 'Cannot split entire quantity via split function. Use normal Submit.'
                });
                return;
            }

            const remainingUnits = totalUnits - splitQty;

            // 2. Update Original Item (Remaining)
            const remainingUnitsFinal = (isBreakdownUnit && remainingUnits > 0) ? remainingUnits : remainingUnits;

            const updateMain: Partial<ReturnRecord> = {
                quantity: remainingUnitsFinal,
                unit: isBreakdownUnit ? newUnitName : qcSelectedItem.unit,
                status: 'NCR_QCCompleted',
                disposition: selectedDisposition || 'Pending',
                condition: qcSelectedItem.condition
            };

            await updateReturnRecord(qcSelectedItem.id, updateMain);


            // 3. Create New Item (Split Part)
            const newItem: ReturnRecord = {
                ...qcSelectedItem,
                id: `${qcSelectedItem.id}-SP${Date.now().toString().slice(-4)}`,
                quantity: splitQty,
                unit: isBreakdownUnit ? newUnitName : qcSelectedItem.unit,
                condition: splitCondition,
                disposition: splitDisposition || 'Pending', // If immediate disposition selected
                status: splitDisposition ? 'NCR_QCCompleted' : 'NCR_HubReceived', // Return to QC queue if pending
                refNo: `${qcSelectedItem.refNo}-SP`
            };

            await addReturnRecord(newItem);
            setQcSelectedItem(null);

            await Swal.fire({
                icon: 'success',
                title: 'แยกรายการเรียบร้อย',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Split Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาดในการแยกรายการ',
                text: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };



    return (
        <div className="h-full flex">
            {/* Sidebar List */}
            <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-700 flex justify-between items-center">
                    <span>คิวรอตรวจสอบ ({receivedItems.length})</span>
                    <Activity className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {receivedItems.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs italic">ไม่มีสินค้าที่ต้องตรวจสอบ</div>
                    ) : (
                        receivedItems.map(item => (
                            <div key={item.id} onClick={() => selectQCItem(item)} className={`p-3 rounded-lg border cursor-pointer transition-all ${qcSelectedItem?.id === item.id ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' : 'bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50'}`}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-xs font-bold text-slate-700">{item.productCode}</span>
                                    <span className="text-[10px] text-slate-400">{item.dateReceived}</span>
                                </div>
                                <div className="text-sm font-medium text-slate-800 truncate mb-1">{item.productName}</div>
                                <div className="text-xs text-slate-500">{item.branch}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                {qcSelectedItem ? (
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-1">{qcSelectedItem.productName}</h3>
                                    <div className="flex gap-4 text-sm text-slate-500">
                                        <span>R No: <b>{qcSelectedItem.documentNo || '-'}</b></span>
                                        <span>COL No: <b>{qcSelectedItem.colNumber || '-'}</b></span>
                                        <span>Qty: <b>{qcSelectedItem.quantity} {qcSelectedItem.unit}</b></span>
                                    </div>

                                    {/* Preliminary Decision - Enhanced Display */}
                                    {qcSelectedItem.preliminaryDecision && (
                                        <div className="mt-3 p-4 bg-white/50 rounded-lg border border-slate-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-bold text-slate-700">การตัดสินใจเบื้องต้น:</span>
                                                {qcSelectedItem.preliminaryRoute && (
                                                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold border border-indigo-100">
                                                        {qcSelectedItem.preliminaryRoute}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`px-4 py-2 rounded-lg text-white font-bold text-center text-sm shadow-md border ${qcSelectedItem.preliminaryDecision === 'Return' ? 'bg-blue-600 border-blue-700' :
                                                qcSelectedItem.preliminaryDecision === 'Sell' ? 'bg-green-600 border-green-700' :
                                                    qcSelectedItem.preliminaryDecision === 'Scrap' ? 'bg-red-600 border-red-700' :
                                                        qcSelectedItem.preliminaryDecision === 'Internal' ? 'bg-amber-500 border-amber-600' :
                                                            qcSelectedItem.preliminaryDecision === 'Claim' ? 'bg-orange-500 border-orange-600' :
                                                                'bg-slate-500 border-slate-600'
                                                }`}>
                                                {qcSelectedItem.preliminaryDecision === 'Return' ? '🚚 คืนสินค้า' :
                                                    qcSelectedItem.preliminaryDecision === 'Sell' ? '💵 ขาย' :
                                                        qcSelectedItem.preliminaryDecision === 'Scrap' ? '🗑️ ทำลาย' :
                                                            qcSelectedItem.preliminaryDecision === 'Internal' ? '🏠 ใช้ภายใน' :
                                                                qcSelectedItem.preliminaryDecision === 'Claim' ? '📄 เคลม' :
                                                                    qcSelectedItem.preliminaryDecision}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">In Progress</div>
                            </div>

                            {/* Grading Section */}
                            <div className="mb-8">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">1. ประเมินสภาพ (Grading)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="text-xs font-bold text-green-600 bg-green-50 p-1.5 rounded w-fit mb-2">Good (สภาพดี)</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['New', 'BoxDamage', 'WetBox', 'LabelDefect', 'Other'].map((cond) => (
                                                <button key={cond} onClick={() => handleConditionSelect(cond === 'Other' ? 'Other' : cond as ItemCondition, 'Good')} className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${qcSelectedItem.condition === cond || (cond === 'Other' && customInputType === 'Good') ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-green-300 hover:text-green-600'}`}>
                                                    {conditionLabels[cond] || 'อื่นๆ (ระบุ)'}
                                                </button>
                                            ))}
                                        </div>
                                        {customInputType === 'Good' && (
                                            <input type="text" aria-label="ระบุสภาพสินค้า" title="ระบุสภาพสินค้า" placeholder="ระบุสภาพสินค้า..." className="w-full mt-2 p-2 border rounded-lg text-sm focus:ring-1 focus:ring-green-500 outline-none" value={Object.keys(conditionLabels).includes(qcSelectedItem.condition || '') ? '' : qcSelectedItem.condition} onChange={e => setQcSelectedItem({ ...qcSelectedItem, condition: e.target.value })} autoFocus />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-xs font-bold text-red-600 bg-red-50 p-1.5 rounded w-fit mb-2">Bad (เสียหาย)</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Expired', 'Damaged', 'Defective', 'Other'].map((cond) => (
                                                <button key={cond} onClick={() => handleConditionSelect(cond === 'Other' ? 'Other' : cond as ItemCondition, 'Bad')} className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${qcSelectedItem.condition === cond || (cond === 'Other' && customInputType === 'Bad') ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600'}`}>
                                                    {conditionLabels[cond] || 'อื่นๆ (ระบุ)'}
                                                </button>
                                            ))}
                                        </div>
                                        {customInputType === 'Bad' && (
                                            <input type="text" aria-label="ระบุความเสียหาย" title="ระบุความเสียหาย" placeholder="ระบุความเสียหาย..." className="w-full mt-2 p-2 border rounded-lg text-sm focus:ring-1 focus:ring-red-500 outline-none" value={Object.keys(conditionLabels).includes(qcSelectedItem.condition || '') ? '' : qcSelectedItem.condition} onChange={e => setQcSelectedItem({ ...qcSelectedItem, condition: e.target.value })} autoFocus />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Disposition Section */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">2. ตัดสินใจ (Disposition)</h4>
                                <div className="grid grid-cols-5 gap-2 mb-4">
                                    {Object.keys(dispositionLabels).map(key => (
                                        <button key={key} onClick={() => { setSelectedDisposition(key as DispositionAction); setIsCustomRoute(false); }} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedDisposition === key ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                            <Truck className="w-5 h-5 mb-1" />
                                            <span className="text-xs font-bold">{dispositionLabels[key]}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Disposition Form Fields */}
                                {selectedDisposition === 'RTV' && (
                                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 animate-fade-in">
                                        <label className="block text-xs font-bold text-amber-800 mb-2">ระบุเส้นทางส่งคืน (Select Route)</label>
                                        <div className="flex flex-wrap gap-3">
                                            {RETURN_ROUTES.map(r => (
                                                <label key={r} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded border border-amber-200 text-sm text-slate-700 hover:border-amber-400">
                                                    <input type="radio" aria-label={r} title={r} name="route" value={r} checked={dispositionDetails.route === r} onChange={e => { handleDispositionDetailChange('route', e.target.value); setIsCustomRoute(false); }} className="text-amber-500 focus:ring-amber-500" />
                                                    {r}
                                                </label>
                                            ))}
                                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded border border-amber-200 text-sm text-slate-700 hover:border-amber-400">
                                                <input type="radio" aria-label="เส้นทางอื่นๆ" title="เส้นทางอื่นๆ" name="route" checked={isCustomRoute} onChange={() => { setIsCustomRoute(true); handleDispositionDetailChange('route', ''); }} className="text-amber-500 focus:ring-amber-500" />
                                                อื่นๆ
                                            </label>
                                        </div>
                                        {isCustomRoute && (
                                            <input type="text" aria-label="ระบุเส้นทาง" title="ระบุเส้นทาง" placeholder="ระบุเส้นทาง..." className="w-full mt-2 p-2 border rounded-lg text-sm focus:ring-1 focus:ring-amber-500 outline-none" value={dispositionDetails.route} onChange={e => handleDispositionDetailChange('route', e.target.value)} autoFocus />
                                        )}
                                    </div>
                                )}
                                {selectedDisposition === 'Restock' && (
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 animate-fade-in grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold text-green-800 mb-1">ชื่อผู้ซื้อ (Buyer Name)</label><input type="text" aria-label="ชื่อผู้ซื้อ" title="ชื่อผู้ซื้อ" className="w-full p-2 border border-green-200 rounded text-sm focus:ring-1 focus:ring-green-500 outline-none" value={dispositionDetails.sellerName} onChange={e => handleDispositionDetailChange('sellerName', e.target.value)} /></div>
                                        <div><label className="block text-xs font-bold text-green-800 mb-1">เบอร์โทรติดต่อ</label><input type="text" aria-label="เบอร์โทรติดต่อ" title="เบอร์โทรติดต่อ" className="w-full p-2 border border-green-200 rounded text-sm focus:ring-1 focus:ring-green-500 outline-none" value={dispositionDetails.contactPhone} onChange={e => handleDispositionDetailChange('contactPhone', e.target.value)} /></div>
                                    </div>
                                )}
                                {selectedDisposition === 'InternalUse' && (
                                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 animate-fade-in">
                                        <label className="block text-xs font-bold text-purple-800 mb-1">หน่วยงาน/ผู้นำไปใช้ (Department/User)</label>
                                        <input type="text" aria-label="ระบุหน่วยงาน/ผู้นำไปใช้" title="ระบุหน่วยงาน/ผู้นำไปใช้" className="w-full p-2 border border-purple-200 rounded text-sm focus:ring-1 focus:ring-purple-500 outline-none" placeholder="เช่น แผนกบัญชี, คุณสมชาย" value={dispositionDetails.internalUseDetail} onChange={e => handleDispositionDetailChange('internalUseDetail', e.target.value)} />
                                    </div>
                                )}
                                {selectedDisposition === 'Claim' && (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-fade-in space-y-3">
                                        <div><label className="block text-xs font-bold text-blue-800 mb-1">ชื่อบริษัทประกัน (Insurance Company)</label><input type="text" aria-label="ชื่อบริษัทประกัน" title="ชื่อบริษัทประกัน" className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={dispositionDetails.claimCompany} onChange={e => handleDispositionDetailChange('claimCompany', e.target.value)} /></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="block text-xs font-bold text-blue-800 mb-1">ผู้ประสานงาน</label><input type="text" aria-label="ผู้ประสานงาน" title="ผู้ประสานงาน" className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={dispositionDetails.claimCoordinator} onChange={e => handleDispositionDetailChange('claimCoordinator', e.target.value)} /></div>
                                            <div><label className="block text-xs font-bold text-blue-800 mb-1">เบอร์โทร</label><input type="text" aria-label="เบอร์โทร" title="เบอร์โทร" className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={dispositionDetails.claimPhone} onChange={e => handleDispositionDetailChange('claimPhone', e.target.value)} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SPLIT MODE TOGGLE */}
                            <div className="border-t border-slate-100 pt-4 mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <button onClick={toggleSplitMode} className="text-sm font-bold text-blue-600 flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                        <GitFork className="w-4 h-4" /> {showSplitMode ? 'ยกเลิกการแยกรายการ (Cancel Split)' : 'แยกรายการสินค้า (Split Item)'}
                                    </button>
                                </div>

                                {showSplitMode && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fade-in">
                                        <h5 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><GitFork className="w-4 h-4" /> ระบุรายละเอียดการแยก (Split Details)</h5>

                                        {/* Unit Breakdown Toggle */}
                                        <div className="mb-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                                <input type="checkbox" checked={isBreakdownUnit} onChange={e => {
                                                    setIsBreakdownUnit(e.target.checked);
                                                    if (!e.target.checked) { setConversionRate(1); setNewUnitName(''); }
                                                    else { setConversionRate(12); }
                                                }} className="w-4 h-4 text-blue-600 rounded" />
                                                <span className="text-sm font-bold text-slate-700">สินค้ามีการแตกหน่วยย่อย (Unit Breakdown)</span>
                                            </label>
                                            {isBreakdownUnit && (
                                                <div className="animate-fade-in pl-6 mt-2 space-y-3">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs text-slate-500 block mb-1">จำนวนชิ้นย่อยใน 1 แพ็ค/ลัง (Qty per Pack)</label>
                                                            <input
                                                                type="number"
                                                                aria-label="จำนวนชิ้นย่อยใน 1 แพ็ค"
                                                                title="จำนวนชิ้นย่อยใน 1 แพ็ค"
                                                                min="1"
                                                                value={conversionRate}
                                                                onChange={e => setConversionRate(parseInt(e.target.value) || 1)}
                                                                className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <div className="text-[10px] text-slate-400 mt-1">เช่น 1 ลัง มี 12 ชิ้น ให้กรอก 12</div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-slate-500 block mb-1">ชื่อหน่วยย่อย (New Unit Name)</label>
                                                            <input
                                                                type="text"
                                                                aria-label="ชื่อหน่วยย่อย"
                                                                title="ชื่อหน่วยย่อย"
                                                                placeholder="เช่น ขวด, ชิ้น, อัน"
                                                                value={newUnitName}
                                                                onChange={e => setNewUnitName(e.target.value)}
                                                                className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Price Preview */}
                                                    <div className="bg-white p-2 rounded border border-blue-100 flex justify-between items-center">
                                                        <span className="text-xs text-slate-500">ราคาเฉลี่ยต่อชิ้น (Price/Unit):</span>
                                                        <span className="font-bold text-blue-600">
                                                            {((qcSelectedItem.pricePerUnit || ((qcSelectedItem.priceBill || 0) / (qcSelectedItem.quantity || 1))) / conversionRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>


                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {(() => {
                                                const rawPrice = qcSelectedItem.pricePerUnit || ((qcSelectedItem.priceBill || 0) / (qcSelectedItem.quantity || 1));
                                                const unitPrice = (isBreakdownUnit && conversionRate > 1) ? rawPrice / conversionRate : rawPrice;
                                                const totalQ = isBreakdownUnit ? qcSelectedItem.quantity * conversionRate : qcSelectedItem.quantity;
                                                const remQ = totalQ - splitQty;

                                                return (
                                                    <>
                                                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-xs font-bold text-green-600">รายการหลัก (Main Item)</span>
                                                                <span className="text-xs font-bold text-slate-500">฿{(remQ * unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="text-sm text-slate-500 mb-1">จำนวนคงเหลือ ({isBreakdownUnit ? newUnitName || 'Unit' : qcSelectedItem.unit}s):</div>
                                                            <div className="text-2xl font-bold text-slate-800">
                                                                {remQ}
                                                                <span className="text-sm font-normal text-slate-400 ml-1">{isBreakdownUnit ? newUnitName || 'Unit' : qcSelectedItem.unit}</span>
                                                            </div>
                                                            <div className="space-y-3 mt-3 pt-3 border-t border-slate-100">
                                                                <div>
                                                                    <label className="text-xs text-slate-500 block mb-1">สภาพสินค้า (Condition)</label>
                                                                    <select aria-label="สภาพสินค้า" title="สภาพสินค้า" value={qcSelectedItem.condition || ''} onChange={e => handleConditionSelect(e.target.value as ItemCondition)} className="w-full p-2 border border-slate-300 rounded text-sm text-slate-700">
                                                                        <option value="">-- เลือกสภาพ --</option>
                                                                        {Object.entries(conditionLabels).map(([key, label]) => (
                                                                            <option key={key} value={key}>{label}</option>
                                                                        ))}
                                                                        <option value="Other">อื่นๆ</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-slate-500 block mb-1">ตัดสินใจ (Disposition)</label>
                                                                    <select aria-label="เลือกการตัดสินใจ" title="เลือกการตัดสินใจ" value={selectedDisposition || ''} onChange={e => setSelectedDisposition(e.target.value as DispositionAction)} className="w-full p-2 border border-slate-300 rounded text-sm text-slate-700">
                                                                        <option value="">-- เลือกการตัดสินใจ --</option>
                                                                        {Object.entries(dispositionLabels).map(([key, label]) => (
                                                                            <option key={key} value={key}>{label}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-xs font-bold text-red-600">รายการแยกออกมา (New Item)</span>
                                                                <span className="text-xs font-bold text-slate-500">฿{(splitQty * unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="text-xs text-slate-500 block mb-1">จำนวนที่แยกมา ({isBreakdownUnit ? newUnitName || 'Unit' : qcSelectedItem.unit})</label>
                                                                    <input type="number" aria-label="จำนวนที่แยกมา" title="จำนวนที่แยกมา" min="1" max={totalQ - 1} value={splitQty} onChange={e => setSplitQty(parseInt(e.target.value) || 0)} className="w-full p-2 border border-slate-300 rounded text-sm font-bold text-blue-600" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-slate-500 block mb-1">สภาพสินค้า (Condition)</label>
                                                                    <select aria-label="สภาพสินค้า" title="สภาพสินค้า" value={splitCondition} onChange={e => setSplitCondition(e.target.value as ItemCondition)} className="w-full p-2 border border-slate-300 rounded text-sm">
                                                                        {Object.entries(conditionLabels).map(([key, label]) => (
                                                                            <option key={key} value={key}>{label}</option>
                                                                        ))}
                                                                        <option value="Other">อื่นๆ</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <div className="text-[10px] text-orange-500 bg-orange-50 p-2 rounded mt-3">
                                                                * รายการนี้จะถูกส่งกลับไปที่ "คิวรอตรวจสอบ" เพื่อให้คุณตัดสินใจ (Disposition) อีกครั้ง
                                                            </div>

                                                            {/* Split Disposition Selector */}
                                                            <div className="pt-2 border-t border-blue-100 mt-2">
                                                                <label className="text-xs text-slate-500 block mb-1">ตัดสินใจทันที (Immediate Disposition)</label>
                                                                <select aria-label="ตัดสินใจทันที" title="ตัดสินใจทันที" value={splitDisposition || ''} onChange={e => setSplitDisposition(e.target.value ? e.target.value as DispositionAction : null)} className="w-full p-2 border border-slate-300 rounded text-sm text-slate-700 bg-white">
                                                                    <option value="">-- ส่งกลับเข้าคิว QC (Default) --</option>
                                                                    {Object.entries(dispositionLabels).map(([key, label]) => (
                                                                        <option key={key} value={key}>{label}</option>
                                                                    ))}
                                                                </select>
                                                                <div className="text-[10px] text-slate-400 mt-1">
                                                                    {splitDisposition ? <span className="text-green-600 font-bold">รายการนี้จะไปที่ Step 4 (Docs) ทันที</span> : "เลือกข้อนี้เพื่อจบงานรายการแยกทันที"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 flex justify-end pt-6 border-t border-slate-200">
                                {showSplitMode ? (
                                    <button onClick={handleSplitSubmit} aria-label="ยืนยันการแยกรายการ" title="ยืนยันการแยกรายการ" disabled={isSubmitting || splitQty <= 0 || splitQty >= (isBreakdownUnit ? (qcSelectedItem.quantity * conversionRate) : qcSelectedItem.quantity) || !selectedDisposition} className="px-8 py-3 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait">
                                        {isSubmitting ? (
                                            <>⏳ กำลังประมวลผล...</>
                                        ) : (
                                            <><GitFork className="w-5 h-5" /> ยืนยันการแยกรายการ (Confirm Split)</>
                                        )}
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={handleUndoQC} aria-label="ส่งกลับไปขั้นตอนรับสินค้า" title="ส่งกลับไปขั้นตอนรับสินค้า (Step 3)" disabled={isSubmitting} className="px-6 py-3 rounded-lg bg-white border border-slate-300 text-slate-600 font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-sm flex items-center gap-2 mr-auto disabled:opacity-50">
                                            <Undo className="w-5 h-5" /> ส่งกลับ Step 3
                                        </button>
                                        <button onClick={handleQCSubmit} aria-label="ยืนยันผลการตรวจสอบ" title="ยืนยันผลการตรวจสอบ (Confirm QC)" disabled={isSubmitting || !selectedDisposition || !qcSelectedItem?.condition || qcSelectedItem.condition === 'Unknown'} className="px-8 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait">
                                            {isSubmitting ? (
                                                <>⏳ กำลังบันทึก...</>
                                            ) : (
                                                <><Save className="w-5 h-5" /> ยืนยันผลการตรวจสอบ (Confirm QC)</>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <ClipboardList className="w-16 h-16 mb-4 opacity-50" />
                        <h3 className="text-lg font-bold">เลือกรายการจากคิว</h3>
                        <p className="text-sm">เลือกรายการสินค้าจากคิวด้านซ้ายเพื่อเริ่มตรวจสอบคุณภาพ</p>
                    </div>
                )}
            </div>
        </div>
    );
};
