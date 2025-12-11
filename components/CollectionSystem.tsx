
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

const CollectionSystem: React.FC = () => {
    // Data State
    const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>(mockReturnRequests);
    const [collectionOrders, setCollectionOrders] = useState<CollectionOrder[]>(mockCollectionOrders);
    const [shipments, setShipments] = useState<ShipmentManifest[]>(mockShipments);

    // View State
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
    // 1: Create Request, 2: Dispatch, 3: Driver, 4: Consolidation

    const [selectedRmas, setSelectedRmas] = useState<string[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false); // Modal for Dispatch (Step 2)
    const [showManifestModal, setShowManifestModal] = useState(false); // Modal for Manifest (Step 4)
    const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

    // Form State (Step 1: Manual Request)
    const [manualReq, setManualReq] = useState<Partial<ReturnRequest>>({
        branch: '',
        invoiceNo: '',
        controlDate: new Date().toISOString().split('T')[0],
        documentNo: '', // R No.
        customerName: '',
        customerCode: '',
        customerAddress: '',
        province: '',
        tmNo: '', // TM NO
        contactPerson: '',
        contactPhone: '',
        notes: ''
    });

    // Form State (Step 2: Dispatch/Collection)
    const [formDriverId, setFormDriverId] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formBoxes, setFormBoxes] = useState(1);
    const [formDesc, setFormDesc] = useState('');

    // Form State (Step 4: Manifest)
    const [formCarrier, setFormCarrier] = useState('');
    const [formTracking, setFormTracking] = useState('');

    // --- ACTIONS ---

    const handleCreateManualRequest = () => {
        if (!manualReq.customerName || !manualReq.branch) {
            alert('กรุณาระบุชื่อลูกค้าและสาขา (Please fill required fields)');
            return;
        }

        // @ts-ignore
        const newReq: ReturnRequest = {
            id: manualReq.documentNo || `RMA-${new Date().getFullYear()}-${String(returnRequests.length + 100).padStart(3, '0')}`,
            documentNo: manualReq.documentNo || '-',
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
            itemsSummary: manualReq.notes || 'สินค้าทั่วไป', // Mapping Notes to ItemsSummary
            notes: manualReq.notes || '',
            status: 'APPROVED_FOR_PICKUP'
        };

        setReturnRequests([newReq, ...returnRequests]);
        setManualReq({
            branch: '', invoiceNo: '', controlDate: new Date().toISOString().split('T')[0],
            documentNo: '', customerName: '', customerCode: '', customerAddress: '',
            province: '', tmNo: '', contactPerson: '', contactPhone: '', notes: ''
        });
        setCurrentStep(2); // Move to Dispatch view to see it
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

    const handleDriverAction = (orderId: string, action: 'COLLECT') => {
        if (action === 'COLLECT') {
            if (confirm('คนขับรถ: ยืนยันการรับสินค้า? (จำลองการถ่ายรูป/เซ็นชื่อ)')) {
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
        }
    };

    // --- RENDERERS ---

    // 1. CREATE REQUEST VIEW (New Step)
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
                            <h3 className="text-lg font-bold text-slate-800">2. งานรอจ่าย (Pending Pickups)</h3>
                            <p className="text-sm text-slate-500">เลือกรายการเพื่อจ่ายงานให้คนขับ (Assign Driver)</p>
                        </div>
                        {selectedRmas.length > 0 && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 animate-bounce-short shadow-md hover:bg-blue-700 transition"
                            >
                                <Truck className="w-5 h-5" /> สร้างใบสั่งงาน ({selectedRmas.length})
                            </button>
                        )}
                    </div>

                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-3 w-10"><input type="checkbox" disabled /></th>
                                <th className="p-3">เลขที่ RMA</th>
                                <th className="p-3">ลูกค้า / สถานที่</th>
                                <th className="p-3">รายการสินค้า</th>
                                <th className="p-3 text-right">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pendingRmas.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">ไม่มีรายการรอจ่ายงาน</td></tr>
                            ) : pendingRmas.map(rma => (
                                <tr key={rma.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => {
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
                                    <td className="p-3 font-mono text-sm font-bold text-blue-600">{rma.id}</td>
                                    <td className="p-3 text-sm">
                                        <div className="font-bold text-slate-700">{rma.customerName}</div>
                                        <div className="text-xs text-slate-500">{rma.customerAddress}</div>
                                    </td>
                                    <td className="p-3 text-sm text-slate-600">{rma.itemsSummary}</td>
                                    <td className="p-3 text-right"><StatusBadge status={rma.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // 3. DRIVER VIEW
    const renderDriverView = () => {
        // Show PENDING or ASSIGNED orders
        const myTasks = collectionOrders.filter(o => o.status === 'PENDING' || o.status === 'ASSIGNED');

        return (
            <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="w-5 h-5" /> 3. รายการงานคนขับ (Driver Tasks)
                    </h3>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">มุมมองคนขับ</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myTasks.map(order => (
                        <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <span className="font-mono font-bold text-slate-700">{order.id}</span>
                                <StatusBadge status={order.status} />
                            </div>
                            <div className="p-4 flex-grow space-y-4">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-red-500 mt-1 shrink-0" />
                                    <div>
                                        <div className="font-bold text-slate-800">{order.pickupLocation.name}</div>
                                        <div className="text-sm text-slate-500">{order.pickupLocation.address}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="w-5 h-5 text-blue-500 shrink-0" />
                                    <div className="text-sm">
                                        <span className="font-bold">{order.pickupLocation.contactName}</span>
                                        <span className="text-slate-400 mx-1">|</span>
                                        <a href={`tel:${order.pickupLocation.contactPhone}`} className="text-blue-600 underline font-bold">{order.pickupLocation.contactPhone}</a>
                                    </div>
                                </div>
                                <div className="bg-amber-50 p-3 rounded border border-amber-100 flex items-center gap-3">
                                    <Package className="w-8 h-8 text-amber-600" />
                                    <div>
                                        <div className="font-bold text-slate-800">จำนวน {order.packageSummary.totalBoxes} กล่อง</div>
                                        <div className="text-xs text-slate-500">{order.packageSummary.description}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50">
                                <button
                                    onClick={() => handleDriverAction(order.id, 'COLLECT')}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                                >
                                    <Camera className="w-4 h-4" /> ยืนยันรับสินค้า (Confirm)
                                </button>
                            </div>
                        </div>
                    ))}
                    {myTasks.length === 0 && <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">ไม่มีงานค้าง</div>}
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
                                <th className="p-3">คนขับ</th>
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
                                        {mockDrivers.find(d => d.id === order.driverId)?.name.split('(')[0]}
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
                                <div className="text-xs text-green-600 font-bold border border-green-200 bg-green-50 px-2 py-1 rounded">
                                    Sent to HQ
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
                        2. จ่ายงาน (Dispatch)
                    </button>
                    <button onClick={() => setCurrentStep(3)} className={`flex-1 py-3 px-4 rounded-lg border text-sm font-bold transition-all ${currentStep === 3 ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        3. คนขับ (Driver)
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
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Truck className="w-6 h-6 text-blue-600" /> สร้างใบสั่งงาน (Create Order)</h3>
                        <p className="text-sm text-slate-500 mb-6">รวม {selectedRmas.length} รายการ เพื่อจ่ายงานให้คนขับ</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">เลือกคนขับ (Driver)</label>
                                <select className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formDriverId} onChange={e => setFormDriverId(e.target.value)}>
                                    <option value="">-- เลือกรายการ --</option>
                                    {mockDrivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.plate})</option>)}
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
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Ship className="w-6 h-6 text-purple-600" /> สร้าง Shipment Manifest</h3>
                        <p className="text-sm text-slate-500 mb-6">รวม {selectedCollectionIds.length} ใบงาน เพื่อส่งกลับสำนักงานใหญ่</p>

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

        </div>
    );
};

export default CollectionSystem;
