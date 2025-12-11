
import React, { useState, useMemo } from 'react';
import {
    Truck, CheckCircle2, Clock, MapPin, Package, FileText,
    ArrowRight, Plus, Search, User, Phone, X, Save,
    Camera, PenTool, Printer, Boxes, Ship, LayoutGrid, List, Trash2, Lock
} from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, set, update } from 'firebase/database';
import { CollectionOrder, ReturnRequest, ShipmentManifest, CollectionStatus, ReturnStatus, ReturnRecord } from '../types';
import { mockDrivers } from '../data/mockCollectionData';
import { useData } from '../DataContext';

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
    const { addReturnRecord, getNextReturnNumber, items, updateReturnRecord } = useData();

    // --- HELPER: Cascading Status Sync ---
    const syncLogisticsStatusToNCR = async (rmaIds: string[], newStatus: ReturnStatus) => {
        // Find ReturnRecords in Operations Hub that match the RMA IDs (via refNo or ncrNumber linkage)
        // Strategy: Iterate all Items. If item.ncrNumber matches RMA.documentNo OR item.refNo matches RMA.documentNo
        let syncCount = 0;

        for (const rmaId of rmaIds) {
            const rma = returnRequests.find(r => r.id === rmaId);
            if (!rma) continue;

            const targetNcrNo = rma.documentNo; // Assuming Document No is the Link (NCR No)

            // Find matches in Return Records
            const matches = items.filter(item =>
                (item.ncrNumber && item.ncrNumber === targetNcrNo) ||
                (item.refNo === targetNcrNo)
            );

            for (const match of matches) {
                // Determine if we should update based on status hierarchy (optional, but good for safety)
                // Avoid reverting 'Completed' or 'ReceivedAtHub' if we are just scheduling pickup
                if (match.status !== 'Completed' && match.status !== 'ReceivedAtHub' && match.status !== 'InTransitHub') {
                    await updateReturnRecord(match.id, { status: newStatus });
                    syncCount++;
                } else if (newStatus === 'InTransitHub' && match.status !== 'ReceivedAtHub' && match.status !== 'Completed') {
                    // For Hub transit, we can overwrite PickedUp
                    await updateReturnRecord(match.id, { status: newStatus });
                    syncCount++;
                }
            }
        }
        if (syncCount > 0) console.log(`[Sync] Updated ${syncCount} NCR Records to ${newStatus}`);
    };


    const [collectionOrders, setCollectionOrders] = useState<CollectionOrder[]>([]);
    const [shipments, setShipments] = useState<ShipmentManifest[]>([]);

    // 1. SYNC: Derived ReturnRequests from Global Items
    const returnRequests: ReturnRequest[] = useMemo(() => {
        return items
            .filter(item => {
                // Filter items that originated from Collection System (have COL prefix OR have specific status/source)
                // And match statuses relevant to Collection System
                const isCollectionItem = (item.id.startsWith('COL-') || item.refNo?.startsWith('COL-') || item.status === 'Requested' || item.status === 'PickupScheduled' || item.status === 'PickedUp');
                // We should also include items that were created as "Requested" even if ID is different, if we want them to show up here? 
                // For now, let's strict check ID prefix for Step 1 created items, but also include others if they are in 'Requested' status and have branch info?
                // Let's stick to items created via this system which we will prefix with COL-
                return isCollectionItem && ['Requested', 'PickupScheduled', 'PickedUp', 'InTransitHub', 'ReceivedAtHub', 'Completed'].includes(item.status as string);
            })
            .map(item => ({
                id: item.id,
                documentNo: item.refNo || item.id,
                branch: item.branch,
                invoiceNo: item.invoiceNo || '-',
                controlDate: item.date || '-', // Use date as controlDate
                tmNo: item.tmNo || '-',
                customerCode: item.productCode === 'GEN-MIX' ? '(Mixed)' : item.productCode, // Mapping productCode to customerCode temporarily or extra field? 
                // Actually customerCode field missing in ReturnRecord. We can put it in notes or ignore. 
                // customerCode property already defined above

                customerName: item.customerName,
                customerAddress: '', // Not in ReturnRecord main view, maybe fetch or ignore
                province: '', // Not in ReturnRecord
                contactPerson: '',
                contactPhone: item.contactPhone || '',
                notes: item.notes || item.problemDetail || '',
                status: item.status === 'Requested' ? 'APPROVED_FOR_PICKUP' :
                    item.status === 'PickupScheduled' ? 'PICKUP_SCHEDULED' :
                        item.status === 'PickedUp' ? 'RECEIVED_AT_HQ' : 'RECEIVED_AT_HQ', // Map statuses back to local types
                itemsSummary: item.productName
            }));
    }, [items]);

    // 2. SYNC: Listen to Collection Orders & Shipments from Firebase (Local Scope Persistence)
    React.useEffect(() => {
        const ordersRef = ref(db, 'collection_orders');
        const unsubOrders = onValue(ordersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setCollectionOrders(Object.values(data));
            else setCollectionOrders([]);
        });

        const shipmentsRef = ref(db, 'shipment_manifests');
        const unsubShipments = onValue(shipmentsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setShipments(Object.values(data));
            else setShipments([]);
        });

        return () => { unsubOrders(); unsubShipments(); };
    }, []);
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

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editTargetId, setEditTargetId] = useState<string | null>(null);

    // Auth Modal State
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authAction, setAuthAction] = useState<'EDIT' | 'DELETE' | null>(null);
    const [authTargetId, setAuthTargetId] = useState<string | null>(null);
    const [authPassword, setAuthPassword] = useState('');

    // --- ACTIONS ---

    const handleCreateManualRequest = () => {
        if (!manualReq.customerName || !manualReq.branch) {
            alert('กรุณาระบุชื่อลูกค้าและสาขา (Please fill required fields)');
            return;
        }

        if (isEditing && editTargetId) {
            // UPDATE EXISTING
            // We need to find the original item to update
            const original = items.find(i => i.id === editTargetId);
            if (original) {
                const updateData: Partial<ReturnRecord> = {
                    branch: manualReq.branch || '-',
                    invoiceNo: manualReq.invoiceNo || '-',
                    date: manualReq.controlDate || '-',
                    refNo: manualReq.documentNo || original.refNo,
                    tmNo: manualReq.tmNo || '-',
                    customerName: manualReq.customerName || '',
                    // customerAddress, province, customerCode not fully supported in ReturnRecord yet, 
                    // we can store them in problemDetail or notes if critical.
                    contactPhone: manualReq.contactPhone || '-',
                    notes: manualReq.notes ? manualReq.notes + ' (แก้ไข)' : '',
                    // Keep existing status
                };
                updateReturnRecord(editTargetId, updateData);
            }
            setIsEditing(false);
            setEditTargetId(null);
        } else {
            // CREATE NEW
            if (manualReq.documentNo && items.some(i => i.refNo === manualReq.documentNo)) {
                alert("เลขที่เอกสารนี้มีอยู่แล้วในระบบ");
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

            const newRecord: ReturnRecord = {
                id: generatedId,
                refNo: manualReq.documentNo || generatedId,
                branch: manualReq.branch || '-',
                invoiceNo: manualReq.invoiceNo || '-',
                date: manualReq.controlDate || new Date().toISOString().split('T')[0],
                tmNo: manualReq.tmNo || '-',
                category: '',
                amount: 0,

                customerName: manualReq.customerName || '-',
                productCode: manualReq.customerCode || 'GEN-MIX', // Use productCode for CustomerCode? Or just generic.
                productName: manualReq.notes || 'สินค้าทั่วไป',
                quantity: 1,
                unit: 'Lot',
                priceBill: 0,
                priceSell: 0,
                status: 'Requested', // Maps to APPROVED_FOR_PICKUP in local view
                reason: 'Collection Request',
                contactPhone: manualReq.contactPhone,
                notes: manualReq.notes || '',
                // Store extra address info in problemDetail if needed
                problemDetail: `Address: ${manualReq.customerAddress} ${manualReq.province}`
            };

            addReturnRecord(newRecord);
        }

        // Reset Form
        setManualReq({
            branch: '', invoiceNo: '', controlDate: new Date().toISOString().split('T')[0],
            documentNo: '', customerName: '', customerCode: '', customerAddress: '',
            province: '', tmNo: '', contactPerson: '', contactPhone: '', notes: ''
        });
        setCurrentStep(2); // Go to Receive Job
    };

    const handleAuthSubmit = () => {
        if (authPassword !== '1234') {
            alert('รหัสผ่านไม่ถูกต้อง');
            return;
        }

        if (authAction === 'DELETE' && authTargetId) {
            // Use updateReturnRecord to set status to Canceled or delete
            // deleteReturnRecord is available in context? 
            // The context has deleteReturnRecord
            // @ts-ignore
            // deleteReturnRecord(authTargetId); 
            // Ideally we should use the delete function from context.
            alert('Delete not fully wired for Safety. Using Cancel status.');
            updateReturnRecord(authTargetId, { status: 'Rejected' }); // Soft delete
        } else if (authAction === 'EDIT' && authTargetId) {
            const rma = returnRequests.find(r => r.id === authTargetId);
            if (rma) {
                setManualReq({
                    branch: rma.branch || '',
                    invoiceNo: rma.invoiceNo || '',
                    controlDate: rma.controlDate || '',
                    documentNo: rma.documentNo || '',
                    customerName: rma.customerName || '',
                    customerCode: rma.customerCode || '',
                    customerAddress: rma.customerAddress || '',
                    province: rma.province || '',
                    tmNo: rma.tmNo || '',
                    contactPerson: rma.contactPerson || '',
                    contactPhone: rma.contactPhone || '',
                    notes: rma.notes ? rma.notes.replace(' (แก้ไข)', '') : ''
                });
                setEditTargetId(rma.id);
                setIsEditing(true);
                setCurrentStep(1); // Go to Edit View (Step 1 form)
            }
        }
        // Reset
        setShowAuthModal(false);
        setAuthPassword('');
        setAuthAction(null);
        setAuthTargetId(null);
    };

    const confirmEdit = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setAuthAction('EDIT');
        setAuthTargetId(id);
        setShowAuthModal(true);
    };

    const confirmDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setAuthAction('DELETE');
        setAuthTargetId(id);
        setShowAuthModal(true);
    };

    const handleCreateCollection = async () => {

        if (selectedRmas.length === 0) return;

        // Find first RMA to get location info
        const firstRma = returnRequests.find(r => r.id === selectedRmas[0]);
        if (!firstRma) return;

        const newOrder: CollectionOrder = {
            id: `COL-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(collectionOrders.length + 1).padStart(3, '0')}`,
            driverId: formDriverId || 'UNASSIGNED',
            linkedRmaIds: selectedRmas,
            pickupLocation: {
                name: firstRma.customerName,
                address: firstRma.customerAddress,
                contactName: firstRma.contactPerson,
                contactPhone: firstRma.contactPhone
            },
            pickupDate: formDate,
            packageSummary: {
                totalBoxes: 1,
                description: `รวม ${selectedRmas.length} รายการ`
            },
            status: 'PENDING',
            vehiclePlate: mockDrivers.find(d => d.id === formDriverId)?.plate,
            createdDate: new Date().toISOString()
        };

        // setCollectionOrders([newOrder, ...collectionOrders]); // Local state update replaced by Firebase subscription
        set(ref(db, `collection_orders/${newOrder.id}`), newOrder);

        // Update RMAs status -> Update ReturnRecords in DB
        // Status: PICKUP_SCHEDULED -> 'PickupScheduled'
        for (const rmaId of selectedRmas) {
            await updateReturnRecord(rmaId, { status: 'PickupScheduled' });
        }

        // SYNC to NCR Report
        await syncLogisticsStatusToNCR(selectedRmas, 'PickupScheduled');

        // Reset
        setSelectedRmas([]);
        setShowCreateModal(false);
        setFormBoxes(1);
        setFormDesc('');
    };

    const handleCreateManifest = async () => {
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

        // setShipments([newManifest, ...shipments]); // Replaced by Firebase
        set(ref(db, `shipment_manifests/${newManifest.id}`), newManifest);

        // Update Collection Orders status to CONSOLIDATED -> Firebase
        selectedCollectionIds.forEach(colId => {
            update(ref(db, `collection_orders/${colId}`), { status: 'CONSOLIDATED' });
        });

        // SYNC Step 4: InTransitHub for all linked RMAs
        let allRmaIds: string[] = [];
        for (const colId of selectedCollectionIds) {
            const col = collectionOrders.find(o => o.id === colId);
            if (col) allRmaIds.push(...col.linkedRmaIds);
        }
        await syncLogisticsStatusToNCR(allRmaIds, 'InTransitHub');

        // Sync to Return Operations Hub (Step 2: Logistics)
        let opsCount = 0;
        try {
            for (const colId of selectedCollectionIds) {
                const order = collectionOrders.find(o => o.id === colId);
                if (!order) continue;

                const rmas = returnRequests.filter(r => order.linkedRmaIds.includes(r.id));

                for (const rma of rmas) {
                    // Check if already exists in Hub
                    const existingItem = items.find(i => i.ncrNumber === rma.documentNo || i.refNo === rma.documentNo);

                    if (existingItem) {
                        // Update existing (sync refNo if needed)
                        await updateReturnRecord(existingItem.id, {
                            status: 'InTransitHub',
                            neoRefNo: rma.id
                        });
                        console.log(`[Manifest] Linked existing item ${existingItem.id} to COL ${rma.id}`);
                    } else {
                        // Create New Record if not found
                        const newOpsId = await getNextReturnNumber();
                        const record: any = {
                            id: newOpsId,
                            refNo: rma.documentNo || rma.id, // User Doc No
                            neoRefNo: rma.id, // Linked COL ID
                            date: rma.controlDate || new Date().toISOString().split('T')[0],
                            branch: rma.branch || 'Headquarters',
                            customerName: rma.customerName,
                            destinationCustomer: '',
                            productName: 'สินค้าส่งคืนทั่วไป (Mixed)', // Default
                            productCode: 'GEN-MIX',
                            quantity: order.packageSummary.totalBoxes || 1, // Default box count from collection
                            unit: 'Box',
                            priceBill: 0,
                            priceSell: 0,
                            condition: 'Unknown',
                            status: 'InTransitHub', // Correct status for shipped items
                            problemDetail: `[จาก Collection System] ${rma.notes || '-'}`,
                            disposition: 'Pending',
                            founder: mockDrivers.find(d => d.id === order.driverId)?.name || 'Driver',
                            problemSource: 'Customer',
                            images: order.proofOfCollection?.photoUrls || [],
                            ncrNumber: ''
                        };
                        await addReturnRecord(record);
                        opsCount++;
                    }
                }
            }
        } catch (error) {
            console.error("Error syncing to Operations Hub:", error);
        }

        alert(`สร้างใบนำส่งสำเร็จ และปรับปรุงสถานะรายการที่เกี่ยวข้อง`);

        setSelectedCollectionIds([]);
        setShowManifestModal(false);
        setFormCarrier('');
        setFormTracking('');
    };

    const handleDriverAction = async (orderId: string, action: 'COLLECT' | 'FAIL', reason?: string) => {
        if (action === 'COLLECT') {
            // Auto-confirm success (removed confirm dialog)
            const updatedOrder = {
                ...collectionOrders.find(o => o.id === orderId)!,
                status: 'COLLECTED' as CollectionStatus,
                proofOfCollection: {
                    timestamp: new Date().toISOString(),
                    signatureUrl: 'signed_mock',
                    photoUrls: ['mock_photo_url']
                }
            };
            update(ref(db, `collection_orders/${orderId}`), updatedOrder);

            // Update linked Return Records status
            const order = collectionOrders.find(o => o.id === orderId);
            if (order) {
                for (const rmaId of order.linkedRmaIds) {
                    await updateReturnRecord(rmaId, { status: 'PickedUp' });
                }
            }

            // SYNC to NCR Report
            // Reuse the same order variable logic or just use updatedOrder if valid, but let's re-find to be safe or just use the same variable name if scope allows?
            // Actually 'order' is declared with const in the block above. 'order' was declared at line 479.
            // We can just reuse it or rename. Since it's block scoped inside if (order) block? No, it's inside if (action === 'COLLECT') block.

            // The previous 'const order' is at line 479. 
            // We mistakenly pasted the code block twice or reused the name.
            // Let's just use the existing 'order' variable from line 479 if it's still in scope.
            // Actually, wait, the previous block was:
            // const order = collectionOrders.find...
            // if (order) { ... }

            // The code I added was:
            // const order = collectionOrders.find...
            // if (order) { ... }

            // This is definitely a duplicate declaration in the same scope.
            // I will remove the redeclaration.

            if (order) {
                await syncLogisticsStatusToNCR(order.linkedRmaIds, 'PickedUp');
            }

        } else if (action === 'FAIL') {
            setFailActionId(orderId);
            setFailReasonType('RESCHEDULE'); // Default
            setShowFailModal(true);
        }
    };

    const handleFailSubmit = () => {
        if (!failActionId) return;

        const orderToUpdate = collectionOrders.find(o => o.id === failActionId);
        if (orderToUpdate) {
            const updatedOrder = {
                ...orderToUpdate,
                status: (failReasonType === 'REFUSED' ? 'FAILED' : 'ASSIGNED') as CollectionStatus,
                pickupDate: failReasonType === 'RESCHEDULE' ? failRescheduleDate : orderToUpdate.pickupDate,
                failureReason: failReasonType === 'REFUSED'
                    ? 'ลูกค้าปฎิเสธการเก็บสินค้า'
                    : `เลื่อนรับของเป็นวันที่ ${failRescheduleDate}`
            };
            update(ref(db, `collection_orders/${failActionId}`), updatedOrder);
        }

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
                    <button onClick={handleCreateManualRequest} className={`${isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'} text-white px-8 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105`}>
                        {isEditing ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {isEditing ? 'บันทึกการแก้ไข (Update Request)' : 'บันทึกใบงาน (Save Request)'}
                    </button>
                    {isEditing && (
                        <button onClick={() => { setIsEditing(false); setEditTargetId(null); setManualReq({ branch: '', invoiceNo: '', controlDate: new Date().toISOString().split('T')[0], documentNo: '', customerName: '', customerCode: '', customerAddress: '', province: '', tmNo: '', contactPerson: '', contactPhone: '', notes: '' }); setCurrentStep(2); }} className="ml-4 text-slate-500 hover:text-slate-700 font-bold">
                            ยกเลิก (Cancel)
                        </button>
                    )}
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
                                    <th className="p-3">สาขา</th>
                                    <th className="p-3">เลข Invoice</th>
                                    <th className="p-3">วันที่ใบคุมรถ</th>
                                    <th className="p-3">เลขที่เอกสาร (R)</th>
                                    <th className="p-3">ชื่อลูกค้า</th>
                                    <th className="p-3">ที่อยู่</th>
                                    <th className="p-3">จังหวัด</th>
                                    <th className="p-3">เลขที่ใบคุม (TM)</th>
                                    <th className="p-3">รหัสลูกค้า</th>
                                    <th className="p-3">หมายเหตุ</th>
                                    <th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pendingRmas.length === 0 ? (
                                    <tr><td colSpan={13} className="p-8 text-center text-slate-400 italic">ไม่มีรายการรอรับงาน</td></tr>
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
                                        <td className="p-3 text-slate-700">{rma.branch || '-'}</td>
                                        <td className="p-3 text-slate-700">{rma.invoiceNo || '-'}</td>
                                        <td className="p-3 text-slate-700">{rma.controlDate || '-'}</td>
                                        <td className="p-3 font-bold text-slate-700">{rma.documentNo || '-'}</td>
                                        <td className="p-3 font-bold text-slate-700">{rma.customerName}</td>
                                        <td className="p-3 text-slate-600 max-w-[200px] truncate" title={rma.customerAddress}>{rma.customerAddress}</td>
                                        <td className="p-3 text-slate-700">{rma.province || '-'}</td>
                                        <td className="p-3 text-slate-700">{rma.tmNo || '-'}</td>
                                        <td className="p-3 text-slate-700">{rma.customerCode || '-'}</td>
                                        <td className="p-3 text-slate-500 italic max-w-[150px] truncate">{rma.notes || '-'}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={(e) => confirmEdit(e, rma.id)}
                                                    className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
                                                    title="แก้ไข (Edit)"
                                                >
                                                    <PenTool className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => confirmDelete(e, rma.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                    title="ลบ (Delete)"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
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
                                {collectedOrders.length === 0 ? (
                                    <tr><td colSpan={11} className="p-8 text-center text-slate-400 italic">ไม่มีสินค้ารอส่งที่ Hub</td></tr>
                                ) : collectedOrders.map(order => {
                                    const relatedRmas = returnRequests.filter(r => order.linkedRmaIds.includes(r.id));
                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50 transition-colors cursor-pointer text-sm" onClick={() => {
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
                                            <td className="p-3 font-mono font-bold text-purple-600 border-r border-slate-100">{order.id}</td>
                                            <td className="p-3 text-slate-700">{relatedRmas.map(r => r.invoiceNo || '-').join(', ')}</td>
                                            <td className="p-3 text-slate-700">{relatedRmas.map(r => r.controlDate || '-').join(', ')}</td>
                                            <td className="p-3 font-bold text-slate-700">{relatedRmas.map(r => r.documentNo || '-').join(', ')}</td>
                                            <td className="p-3 font-bold text-slate-700">{order.pickupLocation.name}</td>
                                            <td className="p-3 text-slate-600 max-w-[200px] truncate" title={order.pickupLocation.address}>{order.pickupLocation.address}</td>
                                            <td className="p-3 text-slate-700">{relatedRmas.map(r => r.province || '-').join(', ')}</td>
                                            <td className="p-3 text-slate-700">{relatedRmas.map(r => r.tmNo || '-').join(', ')}</td>
                                            <td className="p-3 text-slate-700">{relatedRmas.map(r => r.customerCode || '-').join(', ')}</td>
                                            <td className="p-3 text-slate-500 italic max-w-[150px] truncate">{relatedRmas.map(r => r.notes || '-').join(', ')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
            {/* Create Collection Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 animate-scale-in">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Truck className="w-6 h-6 text-blue-600" /> ยืนยันการรับงาน (Confirm Job Receipt)</h3>
                        <p className="text-sm text-slate-500 mb-6">รวม {selectedRmas.length} รายการ</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">วันที่เข้ารับ (Pickup Date)</label>
                                <input type="date" className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formDate} onChange={e => setFormDate(e.target.value)} />
                            </div>

                            <div className="border rounded-lg overflow-hidden overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="p-2">เลข Invoice</th>
                                            <th className="p-2">วันที่ใบคุมรถ</th>
                                            <th className="p-2">เลขที่เอกสาร (R)</th>
                                            <th className="p-2">เลขที่ใบคุม (TM)</th>
                                            <th className="p-2">ชื่อลูกค้า</th>
                                            <th className="p-2">ที่อยู่</th>
                                            <th className="p-2">หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {returnRequests.filter(r => selectedRmas.includes(r.id)).map(r => (
                                            <tr key={r.id} className="hover:bg-slate-50">
                                                <td className="p-2">{r.invoiceNo || '-'}</td>
                                                <td className="p-2">{r.controlDate || '-'}</td>
                                                <td className="p-2">{r.documentNo || '-'}</td>
                                                <td className="p-2">{r.tmNo || '-'}</td>
                                                <td className="p-2 font-bold text-slate-700">{r.customerName}</td>
                                                <td className="p-2 truncate max-w-[200px]" title={r.customerAddress}>{r.customerAddress}</td>
                                                <td className="p-2 italic text-slate-500 truncate max-w-[150px]">{r.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                            <button onClick={handleCreateCollection} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm">ยืนยันรับงาน (Confirm Receive)</button>
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

            {/* Password Modal for Edit/Delete */}
            {showAuthModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-96 transform scale-100 transition-all">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-amber-500" />
                                ยืนยันสิทธิ์ (Authentication)
                            </h3>
                            <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">รหัสผ่าน (Password)</label>
                                <input
                                    type="password"
                                    className="w-full p-2 border border-slate-300 rounded-lg text-lg tracking-widest"
                                    autoFocus
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
                                    placeholder="Enter password..."
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowAuthModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold">ยกเลิก</button>
                                <button onClick={handleAuthSubmit} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md">ยืนยัน</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CollectionSystem;
