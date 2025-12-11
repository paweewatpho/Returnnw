
import React, { useState, useMemo } from 'react';
import {
    Truck, CheckCircle2, Clock, MapPin, Package, FileText,
    ArrowRight, Plus, Search, User, Phone, X, Save,
    Camera, PenTool, Printer, Boxes, Ship, LayoutGrid, List
} from 'lucide-react';
import { CollectionOrder, ReturnRequest, ShipmentManifest, CollectionStatus } from '../types';
import { mockCollectionOrders, mockReturnRequests, mockDrivers, mockShipments } from '../data/mockCollectionData';

// --- SUB-COMPONENTS ---

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        'APPROVED_FOR_PICKUP': 'bg-green-100 text-green-800 border-green-200',
        'PICKUP_SCHEDULED': 'bg-blue-100 text-blue-800 border-blue-200',
        'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'ASSIGNED': 'bg-blue-100 text-blue-800 border-blue-200',
        'COLLECTED': 'bg-purple-100 text-purple-800 border-purple-200',
        'CONSOLIDATED': 'bg-slate-100 text-slate-800 border-slate-200',
        'IN_TRANSIT': 'bg-indigo-100 text-indigo-800 border-indigo-200',
        'ARRIVED_HQ': 'bg-green-100 text-green-800 border-green-200',
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles[status] || 'bg-gray-100'}`}>{status}</span>;
};

// --- MAIN COMPONENT ---

// Helper to map branch names to codes
const getBranchCode = (branchName: string) => {
    const map: { [key: string]: string } = {
        'เชียงใหม่': 'CNX',
        'พิษณุโลก': 'PLK',
        'กำแพงเพชร': 'KPP',
        'แม่สอด': 'MSD',
        'EKP ลำปาง': 'LPG',
        'นครสวรรค์': 'NSW',
        'สาย 3': 'SAI3',
        'คลอง 13': 'K13',
        'ซีโน่': 'CNO',
        'ประดู่': 'PRD'
    };
    return map[branchName] || 'GEN';
};

const CollectionSystem: React.FC = () => {
    // ... existing state ...
    // Note: Re-declaring component efficiently to target the function update location. 
    // Just targeting the handleCreateManualRequest function and ensuring getBranchCode is available.

    // (We will place getBranchCode outside or inside. Placing outside for cleanliness, but for this edit I need to be careful with context)
    // Actually, I'll put it inside handleCreateManualRequest or just above component if I can target the top. 
    // But replace_file_content works on lines. 
    // The previous view shows imports up to line 9, then sub-components. 
    // I can stick getBranchCode before CollectionSystem definition or inside handleCreateManualRequest. 
    // Putting it inside handleCreateManualRequest is safest for a localized edit.

    // ...

    const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>(mockReturnRequests);
    const [collectionOrders, setCollectionOrders] = useState<CollectionOrder[]>(mockCollectionOrders);
    const [shipments, setShipments] = useState<ShipmentManifest[]>(mockShipments);
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
    const [selectedRmas, setSelectedRmas] = useState<string[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showManifestModal, setShowManifestModal] = useState(false);
    const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
    const [manualReq, setManualReq] = useState<Partial<ReturnRequest>>({
        branch: '',
        invoiceNo: '',
        controlDate: new Date().toISOString().split('T')[0],
        documentNo: '',
        customerName: '',
        customerCode: '',
        customerAddress: '',
        province: '',
        tmNo: '',
        contactPerson: '',
        contactPhone: '',
        notes: ''
    });
    // ... other states ...
    const [formDriverId, setFormDriverId] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formBoxes, setFormBoxes] = useState(1);
    const [formDesc, setFormDesc] = useState('');
    const [formCarrier, setFormCarrier] = useState('');
    const [formTracking, setFormTracking] = useState('');

    // Fail Modal State
    const [showFailModal, setShowFailModal] = useState(false);
    const [failActionId, setFailActionId] = useState<string | null>(null);
    const [failReasonType, setFailReasonType] = useState<'RESCHEDULE' | 'REFUSED'>('RESCHEDULE');
    const [failRescheduleDate, setFailRescheduleDate] = useState(new Date().toISOString().split('T')[0]);

    // --- ACTIONS ---

    const handleCreateManualRequest = () => {
        if (!manualReq.customerName || !manualReq.branch) {
            alert('กรุณาระบุชื่อลูกค้าและสาขา (Please fill required fields)');
            return;
        }

        // Generate ID: COL-[BRANCH]-[YEAR]-[RUNNING]
        const branchCode = getBranchCode(manualReq.branch || '');
        const year = new Date().getFullYear();
        const prefix = `COL-${branchCode}-${year}`;

        // Count existing requests with this prefix to generate running number
        const existingCount = returnRequests.filter(r => r.id.startsWith(prefix)).length;
        const runningNo = String(existingCount + 1).padStart(4, '0');
        const generatedId = `${prefix}-${runningNo}`;

        // @ts-ignore
        const newReq: ReturnRequest = {
            id: generatedId,
            documentNo: manualReq.documentNo || generatedId, // Use generated ID if doc no is blank
            // @ts-ignore
            branch: manualReq.branch || '-',
            invoiceNo: manualReq.invoiceNo || '-',
            controlDate: manualReq.controlDate || '-',
            tmNo: manualReq.tmNo || '-',
            customerCode: manualReq.customerCode || '-',
            customerName: manualReq.customerName || '',
            customerAddress: manualReq.customerAddress || '',
            province: manualReq.province || '',
            contactPerson: manualReq.contactPerson || '-',
            contactPhone: manualReq.contactPhone || '-',
            itemsSummary: manualReq.notes || 'สินค้าทั่วไป',
            notes: manualReq.notes || '',
            status: 'APPROVED_FOR_PICKUP'
        };

        setReturnRequests([newReq, ...returnRequests]);
        setManualReq({
            branch: '', invoiceNo: '', controlDate: new Date().toISOString().split('T')[0],
            documentNo: '', customerName: '', customerCode: '', customerAddress: '',
            province: '', tmNo: '', contactPerson: '', contactPhone: '', notes: ''
        });
        setCurrentStep(2);
    };

    const handleCreateCollection = () => {
        if (!formDriverId || selectedRmas.length === 0) return;

        // Find first RMA to get location info
        const firstRma = returnRequests.find(r => r.id === selectedRmas[0]);
        if (!firstRma) return;

        const newOrder: CollectionOrder = {
            id: `COL-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(collectionOrders.length + 1).padStart(3, '0')}`,
            driverId: formDriverId,
            linkedRmaIds: selectedRmas,
            pickupLocation: {
                name: firstRma.customerName,
                address: firstRma.customerAddress,
                contactName: firstRma.contactPerson,
                contactPhone: firstRma.contactPhone
            },
            pickupDate: formDate,
            packageSummary: {
                totalBoxes: formBoxes,
                description: formDesc || 'สินค้าทั่วไป'
            },
            status: 'PENDING',
            vehiclePlate: mockDrivers.find(d => d.id === formDriverId)?.plate,
            createdDate: new Date().toISOString()
        };

        setCollectionOrders([newOrder, ...collectionOrders]);

        // Update RMAs status
        setReturnRequests(prev => prev.map(r => selectedRmas.includes(r.id) ? { ...r, status: 'PICKUP_SCHEDULED' } : r));

        // Reset
        setSelectedRmas([]);
        setShowCreateModal(false);
        setFormBoxes(1);
        setFormDesc('');
    };

    const handleCreateManifest = () => {
        if (!formCarrier || selectedCollectionIds.length === 0) return;

        const newManifest: ShipmentManifest = {
            id: `SHP-${new Date().getFullYear()}-${String(shipments.length + 1).padStart(3, '0')}`,
            collectionOrderIds: selectedCollectionIds,
            transportMethod: '3PL_COURIER', // Default
            carrierName: formCarrier,
            trackingNumber: formTracking || '-',
            status: 'IN_TRANSIT',
            createdDate: new Date().toISOString()
        };

        setShipments([newManifest, ...shipments]);

        // Update Collection Orders status to CONSOLIDATED
        setCollectionOrders(prev => prev.map(c => selectedCollectionIds.includes(c.id) ? { ...c, status: 'CONSOLIDATED' } : c));

        // Simulate sending to "Return Operations Hub"
        // In a real app, this would trigger an API call to sync data.

        setSelectedCollectionIds([]);
        setShowManifestModal(false);
        setFormCarrier('');
        setFormTracking('');
    };

    const handleDriverAction = (orderId: string, action: 'COLLECT' | 'FAIL', reason?: string) => {
        if (action === 'COLLECT') {
            if (confirm('สาขา: ยืนยันการรับสินค้า? (จำลองการถ่ายรูป/เซ็นชื่อ)')) {
                setCollectionOrders(prev => prev.map(o => o.id === orderId ? {
                    ...o,
                    status: 'COLLECTED',
                    proofOfCollection: {
                        timestamp: new Date().toISOString(),
                        signatureUrl: 'signed_mock',
                        photoUrls: ['mock_photo_url']
                    }
                } : o));
            }
        } else if (action === 'FAIL') {
            setFailActionId(orderId);
            setFailReasonType('RESCHEDULE'); // Default
            setShowFailModal(true);
        }
    };

    const handleFailSubmit = () => {
        if (!failActionId) return;

        setCollectionOrders(prev => prev.map(o => o.id === failActionId ? {
            ...o,
            status: failReasonType === 'REFUSED' ? 'FAILED' : 'ASSIGNED', // Refused = FAILED, Reschedule = ASSIGNED (Active)
            pickupDate: failReasonType === 'RESCHEDULE' ? failRescheduleDate : o.pickupDate,
            failureReason: failReasonType === 'REFUSED'
                ? 'ลูกค้าปฎิเสธการเก็บสินค้า'
                : `เลื่อนรับของเป็นวันที่ ${failRescheduleDate}`
        } : o));

        setShowFailModal(false);
        setFailActionId(null);
    };

    // --- RENDERERS ---
    const renderCreateRequestView = () => (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
                    <FileText className="w-6 h-6 text-blue-600" /> 1. ใบสั่งงานรับกลับ (Create Return Request)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Row 1 */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">สาขาที่รับสินค้ากลับ (Branch) <span className="text-red-500">*</span></label>
                        <select className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50"
                            value={manualReq.branch} onChange={e => setManualReq({ ...manualReq, branch: e.target.value })}>
                            <option value="">-- เลือกสาขา --</option>
                            {['พิษณุโลก', 'กำแพงเพชร', 'แม่สอด', 'เชียงใหม่', 'EKP ลำปาง', 'นครสวรรค์', 'สาย 3', 'คลอง 13', 'ซีโน่', 'ประดู่'].map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">เลข Invoice</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded-lg"
                            value={manualReq.invoiceNo} onChange={e => setManualReq({ ...manualReq, invoiceNo: e.target.value })} placeholder="INV-xxxx" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">วันที่ใบคุมรถ</label>
                        <input type="date" className="w-full p-2 border border-slate-300 rounded-lg"
                            value={manualReq.controlDate} onChange={e => setManualReq({ ...manualReq, controlDate: e.target.value })} />
                    </div>

                    {/* Row 2 */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">เลขที่เอกสาร (เลข R)</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded-lg"
                            value={manualReq.documentNo} onChange={e => setManualReq({ ...manualReq, documentNo: e.target.value })} placeholder="R-xxxx" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">เลขที่ใบคุม (TM NO)</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded-lg"
                            value={manualReq.tmNo} onChange={e => setManualReq({ ...manualReq, tmNo: e.target.value })} placeholder="TM-xxxx" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">รหัสลูกค้า</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded-lg"
                            value={manualReq.customerCode} onChange={e => setManualReq({ ...manualReq, customerCode: e.target.value })} placeholder="CUS-xxxx" />
                    </div>

                    {/* Row 3: Customer Info */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อลูกค้า (Customer Name) <span className="text-red-500">*</span></label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded-lg"
                            value={manualReq.customerName} onChange={e => setManualReq({ ...manualReq, customerName: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">จังหวัด (Province)</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded-lg"
                            value={manualReq.province} onChange={e => setManualReq({ ...manualReq, province: e.target.value })} />
                    </div>

                    {/* Row 4: Address */}
                    <div className="md:col-span-3">
                        <label className="block text-sm font-bold text-slate-700 mb-1">ที่อยู่ (Address)</label>
                        <textarea className="w-full p-2 border border-slate-300 rounded-lg h-20 resize-none"
                            value={manualReq.customerAddress} onChange={e => setManualReq({ ...manualReq, customerAddress: e.target.value })} />
                    </div>

                    {/* Row 5: Notes */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">หมายเหตุ (Notes)</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded-lg"
                            value={manualReq.notes} onChange={e => setManualReq({ ...manualReq, notes: e.target.value })} placeholder="ระบุรายะละเอียดสินค้า หรือหมายเหตุอื่นๆ..." />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ (ติดต่อ)</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded-lg"
                            value={manualReq.contactPhone} onChange={e => setManualReq({ ...manualReq, contactPhone: e.target.value })} placeholder="Optional for driver..." />
                    </div>
                </div>

                <div className="flex justify-end mt-8 border-t border-slate-100 pt-6">
                    <button onClick={handleCreateManualRequest} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 transition-all transform hover:scale-105">
                        <Plus className="w-5 h-5" /> บันทึกใบงาน (Save Request)
                    </button>
                </div>
            </div>
        </div>
    );

    // 2. DISPATCHER VIEW
    const renderDispatchView = () => {
        const pendingRmas = returnRequests.filter(r => r.status === 'APPROVED_FOR_PICKUP');

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">2. รับงาน (Receive Job)</h3>
                            <p className="text-sm text-slate-500">เลือกรายการเพื่อรับงานเข้าสาขา (Receive Orders)</p>
                        </div>
                        {selectedRmas.length > 0 && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 animate-bounce-short shadow-md hover:bg-blue-700 transition"
                            >
                                <Truck className="w-5 h-5" /> รับงาน ({selectedRmas.length})
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-3 w-10"><input type="checkbox" disabled /></th>
                                    <th className="p-3">เลขที่ใบงาน (COL ID)</th>
                                    <th className="p-3">เลข Invoice</th>
                                    <th className="p-3">วันที่ใบคุมรถ</th>
                                    <th className="p-3">เลขที่เอกสาร (R)</th>
                                    <th className="p-3">ชื่อลูกค้า</th>
                                    <th className="p-3">ที่อยู่</th>
                                    <th className="p-3">จังหวัด</th>
                                    <th className="p-3">เลขที่ใบคุม (TM)</th>
                                    <th className="p-3">รหัสลูกค้า</th>
                                    <th className="p-3">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pendingRmas.length === 0 ? (
                                    <tr><td colSpan={11} className="p-8 text-center text-slate-400 italic">ไม่มีรายการรอรับงาน</td></tr>
                                ) : pendingRmas.map(rma => (
                                    <tr key={rma.id} className="hover:bg-slate-50 transition-colors cursor-pointer text-sm" onClick={() => {
                                        setSelectedRmas(prev => prev.includes(rma.id) ? prev.filter(id => id !== rma.id) : [...prev, rma.id]);
                                    }}>
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedRmas.includes(rma.id)}
                                                onChange={() => { }}
                                                className="accent-blue-600 w-4 h-4 cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-3 font-mono text-blue-600 font-bold">{rma.id}</td>
                                        <td className="p-3 text-slate-700">{rma.invoiceNo || '-'}</td>
                                        <td className="p-3 text-slate-700">{rma.controlDate || '-'}</td>
                                        <td className="p-3 font-bold text-slate-700">{rma.documentNo || '-'}</td>
                                        <td className="p-3 font-bold text-slate-700">{rma.customerName}</td>
                                        <td className="p-3 text-slate-600 max-w-[200px] truncate" title={rma.customerAddress}>{rma.customerAddress}</td>
                                        <td className="p-3 text-slate-700">{rma.province || '-'}</td>
                                        <td className="p-3 text-slate-700">{rma.tmNo || '-'}</td>
                                        <td className="p-3 text-slate-700">{rma.customerCode || '-'}</td>
                                        <td className="p-3 text-slate-500 italic max-w-[150px] truncate">{rma.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // 3. BRANCH VIEW
    const renderDriverView = () => {
        // Show PENDING or ASSIGNED orders
        const myTasks = collectionOrders.filter(o => o.status === 'PENDING' || o.status === 'ASSIGNED');

        return (
            <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="w-5 h-5" /> 3. สาขา (Branch Tasks)
                    </h3>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">มุมมองสาขา</span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-amber-50 text-amber-900 text-xs uppercase font-bold border-b border-amber-100">
                                <tr>
                                    <th className="p-3">เลขที่ใบงาน (COL)</th>
                                    <th className="p-3">ชื่อลูกค้า</th>
                                    <th className="p-3">เลข Invoice</th>
                                    <th className="p-3">วันที่ใบคุมรถ</th>
                                    <th className="p-3">เลขที่เอกสาร (R)</th>
                                    <th className="p-3">เลขที่ใบคุม (TM)</th>
                                    <th className="p-3 text-center">การดำเนินการ (Actions)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {myTasks.length === 0 ? (
                                    <tr><td colSpan={7} className="p-12 text-center text-slate-400 border-dashed border-2 border-slate-100 rounded-xl m-4">ไม่มีงานค้างที่สาขา</td></tr>
                                ) : myTasks.map(order => {
                                    const relatedRmas = returnRequests.filter(r => order.linkedRmaIds.includes(r.id));
                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 font-mono font-bold text-blue-600 border-r border-slate-100 bg-slate-50/30 align-top">
                                                {order.id}
                                                <div className="mt-1"><StatusBadge status={order.status} /></div>
                                            </td>
                                            <td className="p-3 text-sm font-bold text-slate-700 align-top max-w-[200px] whitespace-normal">
                                                {order.pickupLocation.name}
                                                <div className="text-xs text-slate-500 font-normal mt-1">{order.pickupLocation.contactPhone}</div>
                                            </td>
                                            <td className="p-3 text-sm text-slate-600 align-top">
                                                {relatedRmas.map(r => <div key={r.id}>{r.invoiceNo || '-'}</div>)}
                                            </td>
                                            <td className="p-3 text-sm text-slate-600 align-top">
                                                {relatedRmas.map(r => <div key={r.id}>{r.controlDate || '-'}</div>)}
                                            </td>
                                            <td className="p-3 text-sm font-mono text-slate-600 align-top">
                                                {relatedRmas.map(r => <div key={r.id}>{r.documentNo || '-'}</div>)}
                                            </td>
                                            <td className="p-3 text-sm text-slate-600 align-top">
                                                {relatedRmas.map(r => <div key={r.id}>{r.tmNo || '-'}</div>)}
                                            </td>
                                            <td className="p-3 align-top">
                                                <div className="flex flex-col gap-2 w-32 mx-auto">
                                                    <button
                                                        onClick={() => handleDriverAction(order.id, 'COLLECT')}
                                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
                                                    >
                                                        <CheckCircle2 className="w-3 h-3" /> สำเร็จ
                                                    </button>
                                                    <button
                                                        onClick={() => handleDriverAction(order.id, 'FAIL')}
                                                        className="w-full bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 font-bold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
                                                    >
                                                        <X className="w-3 h-3" /> ไม่สำเร็จ
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // 4. CONSOLIDATION VIEW
    const renderConsolidationView = () => {
        const collectedOrders = collectionOrders.filter(o => o.status === 'COLLECTED');

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">4. Hub Consolidation (จุดพักสินค้า)</h3>
                            <p className="text-sm text-slate-500">รวมสินค้าส่ง Hub / ส่งตรง & ส่งข้อมูลเข้า Return Operations Hub</p>
                        </div>
                        {selectedCollectionIds.length > 0 && (
                            <button
                                onClick={() => setShowManifestModal(true)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 animate-bounce-short shadow-md hover:bg-purple-700 transition"
                            >
                                <Ship className="w-5 h-5" /> รวมสินค้า ({selectedCollectionIds.length})
                            </button>
                        )}
                    </div>

                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-3 w-10"><input type="checkbox" disabled /></th>
                                <th className="p-3">เลขที่ใบงาน</th>
                                <th className="p-3">จุดรับสินค้า</th>
                                <th className="p-3">ผู้ดำเนินการ</th>
                                <th className="p-3 text-center">กล่อง</th>
                                <th className="p-3 text-right">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {collectedOrders.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">ไม่มีสินค้ารอส่งที่ Hub</td></tr>
                            ) : collectedOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => {
                                    setSelectedCollectionIds(prev => prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id]);
                                }}>
                                    <td className="p-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedCollectionIds.includes(order.id)}
                                            onChange={() => { }}
                                            className="accent-purple-600 w-4 h-4 cursor-pointer"
                                        />
                                    </td>
                                    <td className="p-3 font-mono text-sm font-bold text-purple-600">{order.id}</td>
                                    <td className="p-3 text-sm">
                                        <div className="font-bold text-slate-700">{order.pickupLocation.name}</div>
                                    </td>
                                    <td className="p-3 text-sm">
                                        {mockDrivers.find(d => d.id === order.driverId)?.name.split('(')[0] || 'Branch Staff'}
                                    </td>
                                    <td className="p-3 text-center font-bold text-slate-800">{order.packageSummary.totalBoxes}</td>
                                    <td className="p-3 text-right"><StatusBadge status={order.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-slate-200 pt-6">
                    <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" /> ประวัติการส่งของ (Recent Shipments)
                    </h4>
                    <div className="grid gap-4">
                        {shipments.map(shipment => (
                            <div key={shipment.id} className="bg-white p-4 rounded border border-slate-200 flex justify-between items-center shadow-sm">
                                <div>
                                    <div className="font-bold text-slate-800 text-lg">{shipment.id}</div>
                                    <div className="text-xs text-slate-500 flex gap-4 mt-1">
                                        <span className="font-semibold">ขนส่ง: {shipment.carrierName}</span>
                                        <span>Tracking: {shipment.trackingNumber}</span>
                                        <span>จำนวน: {shipment.collectionOrderIds.length} ใบงาน</span>
                                    </div>
                                </div>
                                <div className="text-xs text-green-600 font-bold border border-green-200 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Sent to รวบรวมและระบุขนส่ง
                                </div>
                            </div>
                        ))}
                        {shipments.length === 0 && <div className="text-slate-400 italic text-sm">ยังไม่มีประวัติการส่ง</div>}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* STEP NAVIGATION */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-slate-800">ระบบงานรับสินค้า (Inbound Logistics)</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentStep(1)} className={`flex-1 py-3 px-4 rounded-lg border text-sm font-bold transition-all ${currentStep === 1 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        1. สร้างใบงาน (Create)
                    </button>
                    <button onClick={() => setCurrentStep(2)} className={`flex-1 py-3 px-4 rounded-lg border text-sm font-bold transition-all ${currentStep === 2 ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        2. รับงาน (Orders)
                    </button>
                    <button onClick={() => setCurrentStep(3)} className={`flex-1 py-3 px-4 rounded-lg border text-sm font-bold transition-all ${currentStep === 3 ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        3. สาขา (Branch)
                    </button>
                    <button onClick={() => setCurrentStep(4)} className={`flex-1 py-3 px-4 rounded-lg border text-sm font-bold transition-all ${currentStep === 4 ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        4. จุดพักสินค้า (Hub)
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-grow p-6 overflow-y-auto">
                {currentStep === 1 && renderCreateRequestView()}
                {currentStep === 2 && renderDispatchView()}
                {currentStep === 3 && renderDriverView()}
                {currentStep === 4 && renderConsolidationView()}
            </div>

            {/* MODALS */}

            {/* Create Collection Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-scale-in">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Truck className="w-6 h-6 text-blue-600" /> จ่ายงานให้สาขา (Dispatch to Branch)</h3>
                        <p className="text-sm text-slate-500 mb-6">รวม {selectedRmas.length} รายการ เพื่อจ่ายงาน</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ผู้รับผิดชอบ / สาขา (Assignee)</label>
                                <select className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formDriverId} onChange={e => setFormDriverId(e.target.value)}>
                                    <option value="">-- ระบุผู้ดำเนินการ (Optional) --</option>
                                    {mockDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">วันที่เข้ารับ (Pickup Date)</label>
                                <input type="date" className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formDate} onChange={e => setFormDate(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนกล่อง (ประมาณ)</label>
                                    <input type="number" min="1" className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formBoxes} onChange={e => setFormBoxes(parseInt(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียดสินค้า</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="เช่น อุปกรณ์คอมพิวเตอร์" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                            <button onClick={handleCreateCollection} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm">ยืนยันจ่ายงาน (Dispatch)</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Manifest Modal */}
            {showManifestModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-scale-in">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Ship className="w-6 h-6 text-purple-600" /> รวมสินค้าส่ง (Create Manifest)</h3>
                        <p className="text-sm text-slate-500 mb-6">รวม {selectedCollectionIds.length} ใบงาน เพื่อส่งข้อมูลเข้า Return Operations Hub</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">บริษัทขนส่ง / วิธีการส่ง</label>
                                <input type="text" className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="เช่น Kerry Express, รถบริษัท" value={formCarrier} onChange={e => setFormCarrier(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">เลข Tracking / ทะเบียนรถ</label>
                                <input type="text" className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="ระบุเลขพัสดุ (ถ้ามี)" value={formTracking} onChange={e => setFormTracking(e.target.value)} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setShowManifestModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                            <button onClick={handleCreateManifest} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-sm">สร้างเอกสาร (Create)</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fail Modal */}
            {showFailModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
                            <X className="w-6 h-6" /> ระบุเหตุผลที่ไม่สำเร็จ
                        </h3>

                        <div className="space-y-4 mb-6">
                            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                                <input
                                    type="radio"
                                    name="failReason"
                                    className="w-5 h-5 accent-red-600"
                                    checked={failReasonType === 'RESCHEDULE'}
                                    onChange={() => setFailReasonType('RESCHEDULE')}
                                />
                                <div>
                                    <div className="font-bold text-slate-700">ลูกค้าให้ไปเก็บสินค้าอีกครั้ง</div>
                                    <div className="text-xs text-slate-500">ระบุวันที่นัดหมายใหม่</div>
                                </div>
                            </label>

                            {failReasonType === 'RESCHEDULE' && (
                                <div className="ml-8 animate-fade-in">
                                    <input
                                        type="date"
                                        className="w-full p-2 border border-slate-300 rounded-lg"
                                        value={failRescheduleDate}
                                        onChange={e => setFailRescheduleDate(e.target.value)}
                                    />
                                </div>
                            )}

                            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                                <input
                                    type="radio"
                                    name="failReason"
                                    className="w-5 h-5 accent-red-600"
                                    checked={failReasonType === 'REFUSED'}
                                    onChange={() => setFailReasonType('REFUSED')}
                                />
                                <div>
                                    <div className="font-bold text-slate-700">ลูกค้าปฎิเสธการเก็บสินค้า</div>
                                    <div className="text-xs text-slate-500">ปิดงานทันที (Failed)</div>
                                </div>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowFailModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                            <button onClick={handleFailSubmit} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-sm">ยืนยัน (Confirm)</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CollectionSystem;
