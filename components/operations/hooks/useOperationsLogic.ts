
import React, { useState, useEffect } from 'react';
import { useData } from '../../../DataContext';
import { ReturnRecord, ItemCondition, DispositionAction, ReturnStatus } from '../../../types';
import { getISODetails, RESPONSIBLE_MAPPING } from '../utils';

export const useOperationsLogic = (initialData?: Partial<ReturnRecord> | null, onClearInitialData?: () => void) => {
    const { items, addReturnRecord, updateReturnRecord, addNCRReport, getNextNCRNumber, getNextReturnNumber } = useData();

    // Workflow State
    const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);
    const [isCustomBranch, setIsCustomBranch] = useState(false);

    // QC State
    const [qcSelectedItem, setQcSelectedItem] = useState<ReturnRecord | null>(null);
    const [customInputType, setCustomInputType] = useState<'Good' | 'Bad' | null>(null);

    // Split Logic State
    const [showSplitMode, setShowSplitMode] = useState(false);
    const [splitQty, setSplitQty] = useState(0);
    const [splitCondition, setSplitCondition] = useState<ItemCondition>('Damaged');

    // Unit Breakdown State
    const [isBreakdownUnit, setIsBreakdownUnit] = useState(false);
    const [conversionRate, setConversionRate] = useState(1);
    const [newUnitName, setNewUnitName] = useState('');
    const [splitDisposition, setSplitDisposition] = useState<DispositionAction | null>(null);

    // Disposition Temp State
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

    // Document Generator State
    const [showDocModal, setShowDocModal] = useState(false);
    const [docData, setDocData] = useState<{ type: DispositionAction, items: ReturnRecord[] } | null>(null);
    const [includeVat, setIncludeVat] = useState(true);
    const [vatRate, setVatRate] = useState(7);
    const [discountRate, setDiscountRate] = useState(0);
    const [isDocEditable, setIsDocEditable] = useState(false);
    const [docConfig, setDocConfig] = useState({
        companyNameTH: 'บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด',
        companyNameEN: 'NEOSIAM LOGISTICS & TRANSPORT CO., LTD.',
        address: '159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000',
        contact: 'Tel: 056-275-841 Email: info_nw@neosiamlogistics.com',
        titleTH: '',
        titleEN: '',
        remarks: '1. กรุณาตรวจสอบความถูกต้องของสินค้าภายใน 7 วัน',
        signatory1: 'ผู้จัดทำ (Prepared By)',
        signatory2: 'ผู้ตรวจสอบ (Checked By)',
        signatory3: 'ผู้อนุมัติ (Approved By)'
    });

    // Document Selection State
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [selectionStatus, setSelectionStatus] = useState<DispositionAction | null>(null);
    const [selectionItems, setSelectionItems] = useState<ReturnRecord[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 4 Split State
    const [docSelectedItem, setDocSelectedItem] = useState<ReturnRecord | null>(null);
    const [showStep4SplitModal, setShowStep4SplitModal] = useState(false);

    // Pending State for Logistics (Step 2)
    const [pendingLogisticsTx, setPendingLogisticsTx] = useState<{
        ids: string[];
        updatePayload: Partial<ReturnRecord>;
    } | null>(null);

    // Manual Intake Form State
    const initialFormState: Partial<ReturnRecord> = {
        branch: 'พิษณุโลก',
        date: new Date().toISOString().split('T')[0],
        quantity: 1,
        unit: 'ชิ้น',
        pricePerUnit: 0,
        priceBill: 0,
        priceSell: 0,
        status: 'Draft',
        disposition: 'Pending',
        condition: 'Unknown',
        productCode: '',
        productName: '',
        expiryDate: '',
        notes: '',
        ncrNumber: '',
        refNo: '',
        neoRefNo: '',
        customerName: '',
        destinationCustomer: '',
        problemDamaged: false, problemDamagedInBox: false, problemLost: false, problemMixed: false,
        problemWrongInv: false, problemLate: false, problemDuplicate: false, problemWrong: false,
        problemIncomplete: false, problemOver: false, problemWrongInfo: false, problemShortExpiry: false,
        problemTransportDamage: false, problemAccident: false,
        problemPOExpired: false, problemNoBarcode: false, problemNotOrdered: false,
        problemOther: false,
        problemOtherText: '', problemDetail: '',
        actionReject: false, actionRejectQty: 0, actionRejectSort: false, actionRejectSortQty: 0,
        actionRework: false, actionReworkQty: 0, actionReworkMethod: '',
        actionSpecialAcceptance: false, actionSpecialAcceptanceQty: 0, actionSpecialAcceptanceReason: '',
        actionScrap: false, actionScrapQty: 0,
        actionScrapReplace: false, // Corrected name from actionScrapReplace
        actionScrapReplaceQty: 0,
        causePackaging: false, causeTransport: false, causeOperation: false, causeEnv: false,
        causeDetail: '', preventionDetail: '',

        images: [],
        hasCost: false, costAmount: 0, costResponsible: '', problemSource: '',
        problemAnalysis: undefined, problemAnalysisSub: '', problemAnalysisCause: '', problemAnalysisDetail: '',

        preliminaryDecision: undefined, preliminaryRoute: ''
    };
    const [formData, setFormData] = useState<Partial<ReturnRecord>>(initialFormState);
    const [requestItems, setRequestItems] = useState<Partial<ReturnRecord>[]>([]);
    const [customProblemType, setCustomProblemType] = useState('');
    const [customRootCause, setCustomRootCause] = useState('');

    // Derived Data (filtered items) - 8 Step Workflow

    // Step 2 Input: Requested (Exclude NCR)
    const step2Items = items.filter(i => i.status === 'Requested' && i.documentType !== 'NCR');
    const ncrStep2Items = items.filter(i => (i.status === 'Requested' || i.status === 'COL_JobAccepted') && (i.documentType === 'NCR' || i.documentType === 'LOGISTICS' || !!i.ncrNumber));

    // Step 3 Input: JobAccepted
    const step3Items = items.filter(i => i.status === 'JobAccepted');

    // Step 4 Input: BranchReceived
    const step4Items = items.filter(i => i.status === 'BranchReceived');

    // Step 5 Input: ReadyForLogistics
    const step5Items = items.filter(i => i.status === 'ReadyForLogistics');

    // Step 6 Input: InTransitToHub
    const step6Items = items.filter(i => i.status === 'InTransitToHub');

    // Step 7 Input: HubReceived
    const step7Items = items.filter(i => i.status === 'HubReceived');

    // Step 8 Input: DocsCompleted
    const step8Items = items.filter(i => i.status === 'DocsCompleted');

    // Completed History
    const completedItems = items.filter(i => i.status === 'Completed');

    // Aliases for Props Compatibility
    const logisticItems = step5Items;
    const hubReceiveItems = step6Items;
    const hubDocItems = step7Items;
    const closureItems = step8Items;

    // Legacy mapping
    const requestedItems = step2Items;
    const receivedItems = step6Items;
    const gradedItems = []; // QC Removed
    const docItems = step7Items;

    // Autocomplete Data
    const uniqueCustomers = React.useMemo(() => {
        const dbValues = items.map(i => i.customerName).filter(Boolean);
        const localValues = requestItems.map(i => i.customerName).filter(Boolean);
        return Array.from(new Set([...dbValues, ...localValues])).sort();
    }, [items, requestItems]);

    const uniqueDestinations = React.useMemo(() => {
        const dbValues = items.map(i => i.destinationCustomer).filter(Boolean);
        const localValues = requestItems.map(i => i.destinationCustomer).filter(Boolean);
        return Array.from(new Set([...dbValues, ...localValues])).sort();
    }, [items, requestItems]);

    const uniqueFounders = React.useMemo(() => {
        const dbValues = items.map(i => i.founder).filter(Boolean);
        const localValues = requestItems.map(i => i.founder).filter(Boolean);
        return Array.from(new Set([...dbValues, ...localValues])).sort();
    }, [items, requestItems]);

    const uniqueProductCodes = React.useMemo(() => {
        const dbValues = items.map(i => i.productCode).filter(Boolean);
        const localValues = requestItems.map(i => i.productCode).filter(Boolean);
        return Array.from(new Set([...dbValues, ...localValues])).sort();
    }, [items, requestItems]);

    const uniqueProductNames = React.useMemo(() => {
        const dbValues = items.map(i => i.productName).filter(Boolean);
        const localValues = requestItems.map(i => i.productName).filter(Boolean);
        return Array.from(new Set([...dbValues, ...localValues])).sort();
    }, [items, requestItems]);

    useEffect(() => {
        if (initialData) {
            setActiveStep(1);
            setFormData(prev => ({
                ...prev,
                ...initialData,
                date: initialData.date || prev.date,
                branch: initialData.branch || prev.branch,
            }));
            if (onClearInitialData) onClearInitialData();
        }
    }, [initialData, onClearInitialData]);

    const handleDispositionDetailChange = (key: keyof typeof dispositionDetails, value: string) => {
        setDispositionDetails(prev => ({ ...prev, [key]: value }));
    };

    // Auto-map responsible person based on problem source
    useEffect(() => {
        if (formData.hasCost && formData.problemSource) {
            const responsible = RESPONSIBLE_MAPPING[formData.problemSource];
            if (responsible) {
                setFormData(prev => ({ ...prev, costResponsible: responsible }));
            }
        }
    }, [formData.problemSource, formData.hasCost]);

    const selectQCItem = (item: ReturnRecord) => {
        setQcSelectedItem(item);
        setCustomInputType(null);
        setSelectedDisposition(null);
        setDispositionDetails({
            route: '', sellerName: '', contactPhone: '', internalUseDetail: '',
            claimCompany: '', claimCoordinator: '', claimPhone: ''
        });
        setIsCustomRoute(false);
    };

    const handleConditionSelect = (condition: ItemCondition, type?: 'Good' | 'Bad') => {
        if (!qcSelectedItem) return;
        if (condition === 'Other') {
            setCustomInputType(type || null);
            setQcSelectedItem({ ...qcSelectedItem, condition: '' });
        } else {
            setCustomInputType(null);
            setQcSelectedItem({ ...qcSelectedItem, condition });
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(prev => ({
                        ...prev,
                        images: [...(prev.images || []), reader.result as string]
                    }));
                };
                reader.readAsDataURL(file as Blob);
            });
        }
    };

    const handleRemoveImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: (prev.images || []).filter((_, i) => i !== index)
        }));
    };

    const handleAddItem = (e: React.FormEvent | null, overrideData?: Partial<ReturnRecord>) => {
        if (e) e.preventDefault();
        const dataToUse = overrideData || formData;
        if (!dataToUse.productName || !dataToUse.productCode || !dataToUse.founder || !dataToUse.problemAnalysis) {
            alert("กรุณาระบุชื่อสินค้า, รหัสสินค้า, ผู้พบปัญหา (Founder) และสาเหตุ (Problem Source)");
            return;
        }
        const newItem = { ...dataToUse };

        setRequestItems(prev => [...prev, newItem]);
        setFormData(prev => ({
            ...initialFormState,
            founder: prev.founder, // Preserve founder for next item
            branch: prev.branch,
            date: prev.date,
            customerName: prev.customerName,
            destinationCustomer: prev.destinationCustomer,
            neoRefNo: prev.neoRefNo,
            refNo: prev.refNo,
            problemAnalysis: prev.problemAnalysis // Keep Problem Source for batch entry
        }));
        setCustomProblemType('');
        setCustomRootCause('');
    };

    const handleRemoveItem = (index: number) => {
        setRequestItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleRequestSubmit = async () => {
        let itemsToProcess = [...requestItems];
        if (itemsToProcess.length === 0) {
            alert("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการก่อนยืนยัน");
            return;
        }
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            let successCount = 0;
            let savedNcrNumbers: string[] = [];

            for (const item of itemsToProcess) {
                let finalNcrNumber = item.ncrNumber;
                if (!finalNcrNumber) {
                    finalNcrNumber = await getNextNCRNumber();
                }

                const runningId = await getNextReturnNumber();
                const record: ReturnRecord = {
                    ...item as ReturnRecord,
                    id: runningId,
                    refNo: runningId,
                    amount: (item.quantity || 0) * (item.priceBill || 0),
                    reason: item.problemDetail || item.notes || 'แจ้งคืนสินค้า',
                    status: 'Requested',
                    dateRequested: item.date || new Date().toISOString().split('T')[0],
                    disposition: 'Pending',
                    condition: 'Unknown',
                    productName: item.productName || 'Unknown Product',
                    productCode: item.productCode || 'N/A',
                    customerName: item.customerName || 'Unknown Customer',
                    category: 'General',
                    ncrNumber: finalNcrNumber,
                };

                const success = await addReturnRecord(record);

                if (success) {
                    const ncrRecord: any = {
                        id: finalNcrNumber + '-' + record.id,
                        ncrNo: finalNcrNumber,
                        date: record.dateRequested,
                        toDept: 'แผนกควบคุมคุณภาพ',
                        founder: record.founder || 'Operations Hub',
                        poNo: '', copyTo: '',
                        problemDamaged: record.problemDamaged,
                        problemDamagedInBox: record.problemDamagedInBox,
                        problemLost: record.problemLost,
                        problemMixed: record.problemMixed,
                        problemWrongInv: record.problemWrongInv,
                        problemLate: record.problemLate,
                        problemDuplicate: record.problemDuplicate,
                        problemWrong: record.problemWrong,
                        problemIncomplete: record.problemIncomplete,
                        problemOver: record.problemOver,
                        problemWrongInfo: record.problemWrongInfo,
                        problemShortExpiry: record.problemShortExpiry,
                        problemTransportDamage: record.problemTransportDamage,
                        problemAccident: record.problemAccident,
                        problemPOExpired: record.problemPOExpired,
                        problemNoBarcode: record.problemNoBarcode,
                        problemNotOrdered: record.problemNotOrdered,
                        problemOther: record.problemOther,
                        problemOtherText: record.problemOtherText,
                        problemDetail: record.problemDetail || record.reason || '',
                        problemAnalysis: record.problemAnalysis,
                        problemAnalysisSub: record.problemAnalysisSub,
                        problemAnalysisCause: record.problemAnalysisCause,
                        problemAnalysisDetail: record.problemAnalysisDetail,
                        item: {
                            id: record.id,
                            branch: record.branch,
                            refNo: record.refNo,
                            neoRefNo: record.neoRefNo,
                            productCode: record.productCode,
                            productName: record.productName,
                            customerName: record.customerName,
                            destinationCustomer: record.destinationCustomer,
                            quantity: record.quantity,
                            unit: record.unit || 'PCS',
                            priceBill: record.priceBill,
                            pricePerUnit: record.pricePerUnit || 0,
                            expiryDate: record.expiryDate,
                            hasCost: record.hasCost,
                            costAmount: record.costAmount,
                            costResponsible: record.costResponsible,
                            problemSource: record.problemSource || record.problemAnalysis || '-'
                        },
                        actionReject: record.actionReject,
                        actionRejectQty: record.actionRejectQty,
                        actionRejectSort: record.actionRejectSort,
                        actionRejectSortQty: record.actionRejectSortQty,
                        actionRework: record.actionRework,
                        actionReworkQty: record.actionReworkQty,
                        actionReworkMethod: record.actionReworkMethod,
                        actionSpecialAccept: record.actionSpecialAcceptance,
                        actionSpecialAcceptQty: record.actionSpecialAcceptanceQty,
                        actionSpecialAcceptReason: record.actionSpecialAcceptanceReason,
                        actionScrap: record.actionScrap,
                        actionScrapQty: record.actionScrapQty,
                        actionReplace: record.actionScrapReplace,
                        actionReplaceQty: record.actionScrapReplaceQty,
                        causePackaging: record.causePackaging,
                        causeTransport: record.causeTransport,
                        causeOperation: record.causeOperation,
                        causeEnv: record.causeEnv,
                        causeDetail: record.causeDetail,
                        preventionDetail: record.preventionDetail,
                        preventionDueDate: '', responsiblePerson: '', responsiblePosition: '',
                        qaAccept: false, qaReject: false, qaReason: '',
                        dueDate: '', approver: '', approverPosition: '', approverDate: '',
                        status: 'Open'
                    };

                    const ncrSuccess = await addNCRReport(ncrRecord);
                    successCount++;
                }
            }

            if (successCount > 0) {
                alert(`บันทึกรายการเรียบร้อย! ระบบจะนำคุณไปยังขั้นตอนถัดไป`);
                setFormData(initialFormState);
                setRequestItems([]);
                setCustomProblemType('');
                setCustomRootCause('');
                setIsCustomBranch(false);
                setActiveStep(2);
            }
        } catch (error) {
            console.error("Submission error:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsSubmitting(false);
        }
    };

    // STEP 2: Handle Logistics Branching (DEBUGGED & ROBUST)
    const handleLogisticsSubmit = async (selectedIds: string[], routeType: 'Hub' | 'Direct', transportInfo: any) => {
        try {
            console.log(`[Logistics] HandleSubmit Called. IDs: ${selectedIds.length}, Route: ${routeType}`);

            if (!selectedIds || selectedIds.length === 0) {
                alert("ไม่พบรายการที่เลือก (No items selected)");
                return;
            }

            const destination = transportInfo.destination || (routeType === 'Hub' ? 'Hub (Nakhon Sawan)' : 'Unknown');

            // Clean transport info
            const cleanDriver = transportInfo.transportCompany === 'รถบริษัท' ? transportInfo.driverName : '-';
            const cleanPlate = transportInfo.transportCompany === 'รถบริษัท' ? transportInfo.plateNumber : '-';
            const cleanCompany = transportInfo.transportCompany === 'รถบริษัท' ? 'รถบริษัท' : transportInfo.transportCompany;

            const transportNote = `[Transport] Driver: ${cleanDriver}, Plate: ${cleanPlate}, Company: ${cleanCompany} | Dest: ${destination}`;

            // Construct Payload
            const updatePayload: Partial<ReturnRecord> = routeType === 'Hub'
                ? {
                    status: 'NCR_InTransit',
                    notes: transportNote,
                    dispositionRoute: destination,
                    dateInTransit: new Date().toISOString(),
                    transportPlate: cleanPlate,
                    transportDriver: cleanDriver,
                    transportCompany: cleanCompany,
                    disposition: null as any
                }
                : {
                    status: 'DirectReturn',
                    notes: transportNote,
                    dispositionRoute: destination,
                    disposition: 'RTV',
                    destinationCustomer: destination,
                    dateInTransit: new Date().toISOString(),
                    transportPlate: cleanPlate,
                    transportDriver: cleanDriver,
                    transportCompany: cleanCompany
                };

            // Force finding items from current state
            // Use rigorous string comparison
            const selectedItems = items.filter(i => selectedIds.includes(String(i.id)));

            if (!selectedItems || selectedItems.length === 0) {
                console.error("Critical Error: Items not found for IDs:", selectedIds);
                console.log("Current Items:", items.map(i => i.id));
                alert(`เกิดข้อผิดพลาด: ไม่พบข้อมูลสินค้าที่เลือกในระบบ (Items Not Found in Memory)\nSelected: ${selectedIds.join(', ')}`);
                return;
            }

            // Set Pending State & Open Doc Modal for Confirmation
            setPendingLogisticsTx({
                ids: selectedIds,
                updatePayload
            });

            // Setup Doc Generator (Return Note / RTV Template)
            setDocConfig(prev => ({ ...prev, titleTH: 'ใบส่งคืนสินค้า (Return Note)', titleEN: 'RETURN NOTE' }));

            // Critical: Ensure docData is set before Modal opens
            // 'RTV' is used as a generic template for Internal Transfer as well (using same layout)
            const docDataPayload = { type: 'RTV' as DispositionAction, items: selectedItems };
            setDocData(docDataPayload);

            setIncludeVat(true);
            setIsDocEditable(false);

            // Force Modal Open
            console.log("Opening Document Modal for Logistics...");
            setShowDocModal(true);

        } catch (error) {
            console.error("HandleLogisticsSubmit Error:", error);
            alert("เกิดข้อผิดพลาดในระบบ (System Error): " + error);
        }
    };

    const handleIntakeReceive = async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        const today = new Date().toISOString().split('T')[0];

        // Check for Collection Item (COL/RMA ID)
        const isCollectionItem = (
            item.refNo?.startsWith('R-') || item.refNo?.startsWith('COL-') || item.refNo?.startsWith('RT-') ||
            item.neoRefNo?.startsWith('R-') || item.neoRefNo?.startsWith('COL-')
        );

        if (isCollectionItem) {
            await updateReturnRecord(id, {
                status: 'Graded',
                dateReceived: today,
                dateGraded: today,
                disposition: 'RTV',
                condition: 'Good',
                notes: (item.notes || '') + ' [Auto-Pass QC: Collection Item]'
            });
            alert('รับสินค้าเรียบร้อย! (รายการ Collection ข้ามขั้นตอน QC ไปยังเอกสารส่งคืน)');
        } else {
            // Standard Flow -> Go to QC
            await updateReturnRecord(id, { status: 'ReceivedAtHub', dateReceived: today });
        }
    };

    const handleQCSubmit = async () => {
        if (!qcSelectedItem || !selectedDisposition) return;
        if (!qcSelectedItem.condition || qcSelectedItem.condition === 'Unknown') {
            alert("กรุณาระบุสภาพสินค้า");
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        const success = await updateReturnRecord(qcSelectedItem.id, {
            condition: qcSelectedItem.condition,
            disposition: selectedDisposition,
            status: 'QCPassed',
            dateGraded: today,
            dispositionRoute: dispositionDetails.route,
            sellerName: dispositionDetails.sellerName,
            contactPhone: dispositionDetails.contactPhone,
            internalUseDetail: dispositionDetails.internalUseDetail,
            claimCompany: dispositionDetails.claimCompany,
            claimCoordinator: dispositionDetails.claimCoordinator,
            claimPhone: dispositionDetails.claimPhone
        });

        if (success) {
            setQcSelectedItem(null);
            setSelectedDisposition(null);
            setCustomInputType(null);
            setIsCustomRoute(false);
            alert('บันทึกผล QC เรียบร้อย (Ready for Docs)');
        }
    };

    const handleSplitSubmit = async () => {
        const currentQty = qcSelectedItem?.quantity || 0;
        const totalAvailable = isBreakdownUnit ? (currentQty * conversionRate) : currentQty;

        if (!Number.isInteger(splitQty)) {
            alert("กรุณาระบุจำนวนเป็นจำนวนเต็ม");
            return;
        }

        if (!qcSelectedItem || splitQty <= 0 || splitQty >= totalAvailable) {
            alert(`จำนวนที่แยกต้องมากกว่า 0 และน้อยกว่าจำนวนทั้งหมด (${totalAvailable})`);
            return;
        }
        if (!qcSelectedItem.condition || qcSelectedItem.condition === 'Unknown') {
            alert("กรุณาระบุสภาพสินค้าหลัก");
            return;
        }
        if (!selectedDisposition) {
            alert("กรุณาเลือกการตัดสินใจ (Disposition)");
            return;
        }

        const currentPriceBill = qcSelectedItem.priceBill || 0;
        const pricePerUnit = qcSelectedItem.pricePerUnit || (currentPriceBill / (qcSelectedItem.quantity || 1));

        let unitPriceForCalc = pricePerUnit;
        if (isBreakdownUnit && conversionRate > 1) {
            unitPriceForCalc = pricePerUnit / conversionRate;
        }

        const finalUnit = isBreakdownUnit ? (newUnitName || 'Sub-unit') : qcSelectedItem.unit;

        const mainQty = totalAvailable - splitQty;
        const mainBill = mainQty * unitPriceForCalc;
        const splitBill = splitQty * unitPriceForCalc;

        const currentPriceSell = qcSelectedItem.priceSell || 0;
        const priceSellPerUnit = currentPriceSell / (qcSelectedItem.quantity || 1);
        const unitSellPriceForCalc = (isBreakdownUnit && conversionRate > 1) ? (priceSellPerUnit / conversionRate) : priceSellPerUnit;
        const mainSell = mainQty * unitSellPriceForCalc;
        const splitSell = splitQty * unitSellPriceForCalc;

        const today = new Date().toISOString().split('T')[0];

        const updateMainSuccess = await updateReturnRecord(qcSelectedItem.id, {
            quantity: mainQty,
            unit: finalUnit,
            priceBill: mainBill,
            pricePerUnit: unitPriceForCalc,
            priceSell: mainSell,
            condition: qcSelectedItem.condition,
            disposition: selectedDisposition,
            status: 'QCPassed',
            dateGraded: today,
            dispositionRoute: dispositionDetails.route,
            sellerName: dispositionDetails.sellerName,
            contactPhone: dispositionDetails.contactPhone,
            internalUseDetail: dispositionDetails.internalUseDetail,
            claimCompany: dispositionDetails.claimCompany,
            claimCoordinator: dispositionDetails.claimCoordinator,
            claimPhone: dispositionDetails.claimPhone
        });

        const splitId = `${qcSelectedItem.id}-S${Math.floor(Math.random() * 100)}`;
        const splitStatus = splitDisposition ? 'QCPassed' : 'ReceivedAtHub';

        const splitItem: ReturnRecord = {
            ...qcSelectedItem,
            id: splitId,
            quantity: splitQty,
            unit: finalUnit,
            priceBill: splitBill,
            pricePerUnit: unitPriceForCalc,
            priceSell: splitSell,
            condition: splitCondition,
            status: splitStatus,
            refNo: `${qcSelectedItem.refNo} (Split)`,
            dateReceived: today,
        };

        if (splitDisposition) {
            (splitItem as any).disposition = splitDisposition;
            (splitItem as any).dateGraded = today;
        } else {
            delete (splitItem as any).disposition;
            delete (splitItem as any).dateGraded;
        }

        const createSplitSuccess = await addReturnRecord(splitItem);

        if (updateMainSuccess && createSplitSuccess) {
            setQcSelectedItem(null);
            setSelectedDisposition(null);
            setCustomInputType(null);
            setIsCustomRoute(false);
            setShowSplitMode(false);
            setSplitQty(0);
            setIsBreakdownUnit(false);
            setConversionRate(1);
            setNewUnitName('');
            setSplitDisposition(null);
            alert(`ดำเนินการแยกรายการเรียบร้อย`);
        } else {
            alert("เกิดข้อผิดพลาดในการแยกรายการ");
        }
    };

    const toggleSplitMode = () => {
        if (!showSplitMode) {
            setSplitQty(0);
            setSplitDisposition(null);
            setSplitCondition('New');
            setIsBreakdownUnit(false);
            setConversionRate(1);
            setNewUnitName('');
        }
        setShowSplitMode(!showSplitMode);
    };

    const handlePrintClick = (status: DispositionAction, list: ReturnRecord[]) => {
        if (!list || list.length === 0) {
            alert('ไม่พบรายการสินค้าในสถานะนี้');
            return;
        }
        setSelectionStatus(status);
        setSelectionItems(list);
        setSelectedItemIds(new Set(list.map(i => i.id)));
        setShowSelectionModal(true);
    };

    const handleGenerateDoc = () => {
        if (!selectionStatus) return;
        const selectedList = selectionItems.filter(item => selectedItemIds.has(item.id));
        if (selectedList.length === 0) {
            alert("กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการก่อนสร้างเอกสาร");
            return;
        }
        const details = getISODetails(selectionStatus);
        setDocConfig(prev => ({ ...prev, titleTH: details.th, titleEN: details.en }));
        setDocData({ type: selectionStatus, items: selectedList });
        setIncludeVat(true);
        setShowSelectionModal(false);
        setShowDocModal(true);
        setIsDocEditable(false);
    };

    const handleConfirmDocGeneration = async () => {
        if (!docData) return;
        const today = new Date().toISOString().split('T')[0];

        // Logistics Pending Check
        if (pendingLogisticsTx) {
            let successCount = 0;
            // No need to redeclare today

            for (const id of pendingLogisticsTx.ids) {
                const success = await updateReturnRecord(id, {
                    ...pendingLogisticsTx.updatePayload
                });
                if (success) successCount++;
            }
            if (successCount > 0) {
                alert(`สร้างเอกสารและบันทึกรายการเรียบร้อย! (${successCount} รายการ)`);
                setShowDocModal(false);
                setPendingLogisticsTx(null);
            } else {
                alert("ไม่สามารถบันทึกรายการได้ (Update Failed). กรุณาลองใหม่อีกครั้ง หรือตรวจสอบ Console");
            }
            return;
        }

        // Standard Hub Doc Generation
        let successCount = 0;
        for (const item of docData.items) {
            const success = await updateReturnRecord(item.id, { status: 'ReturnToSupplier', dateDocumented: today });
            if (success) successCount++;
        }

        if (successCount > 0) {
            alert(`สร้างเอกสารเรียบร้อย ${successCount} รายการ -> ไปที่ขั้นตอน "ปิดงาน"`);
            setShowDocModal(false);
        }
    };

    const handleUpdateDocItem = async (id: string, updates: Partial<ReturnRecord>) => {
        await updateReturnRecord(id, updates);
        setDocData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                items: prev.items.map(item => item.id === id ? { ...item, ...updates } : item)
            };
        });
    };

    const handleCompleteJob = async (id: string) => {
        const today = new Date().toISOString().split('T')[0];
        await updateReturnRecord(id, { status: 'Completed', dateCompleted: today }); // Assuming Completed is valid
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedItemIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedItemIds(newSet);
    };

    return {
        state: {
            activeStep, isCustomBranch, qcSelectedItem, customInputType,
            showSplitMode, splitQty, splitCondition, isBreakdownUnit, conversionRate, newUnitName, splitDisposition,
            selectedDisposition, dispositionDetails, isCustomRoute,
            showDocModal, docData, includeVat, vatRate, discountRate, isDocEditable, docConfig,
            showSelectionModal, selectionStatus, selectionItems, selectedItemIds,
            formData, requestItems, customProblemType, customRootCause,
            docSelectedItem, showStep4SplitModal
        },
        derived: {
            uniqueCustomers, uniqueDestinations, uniqueFounders, uniqueProductCodes, uniqueProductNames,
            step2Items, step3Items, step4Items, step5Items, step6Items, step7Items, step8Items,
            ncrStep2Items,
            completedItems,
            logisticItems, hubReceiveItems, hubDocItems, closureItems,
            requestedItems, receivedItems, gradedItems, docItems, processedItems: step7Items
        },
        actions: {
            setActiveStep, setIsCustomBranch, setFormData, setRequestItems,
            handleImageUpload, handleRemoveImage, handleAddItem, handleRemoveItem, handleRequestSubmit,

            handleLogisticsSubmit,

            handleIntakeReceive, selectQCItem, handleConditionSelect, setQcSelectedItem, setCustomInputType,
            setSelectedDisposition, setIsCustomRoute, handleDispositionDetailChange, handleQCSubmit,
            setShowSplitMode, setIsBreakdownUnit, setConversionRate, setNewUnitName, setSplitQty, setSplitCondition, setSplitDisposition, handleSplitSubmit,
            toggleSplitMode,
            handlePrintClick, toggleSelection, setShowSelectionModal,
            handleGenerateDoc, setIncludeVat, setVatRate, setDiscountRate, setIsDocEditable, setDocConfig, setShowDocModal,
            handleConfirmDocGeneration, handleUpdateDocItem,

            // Step 4 Split Actions
            setDocSelectedItem, setShowStep4SplitModal,
            handleDocItemClick: (item: ReturnRecord) => {
                setDocSelectedItem(item);
                setShowStep4SplitModal(true);
            },
            handleStep4SplitSubmit: async (splitQty: number, newDisposition: DispositionAction, isBreakdown: boolean = false, rate: number = 1, newUnit: string = '', mainDisposition?: DispositionAction) => {
                if (!docSelectedItem) return;
                const currentQty = docSelectedItem.quantity || 1;
                const totalAvailable = isBreakdown ? (currentQty * rate) : currentQty;

                // Add split logic logic if needed, previously was empty in some contexts but let's keep it safe
                alert("Split functionality pending implementation for Step 4 direct usage.");
            }
        }
    };
};
