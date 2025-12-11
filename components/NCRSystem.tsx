import React, { useState, useEffect, useMemo } from 'react';
import { useData, NCRRecord, NCRItem } from '../DataContext';
import { ReturnRecord } from '../types';
import { Save, Printer, Image as ImageIcon, AlertTriangle, Plus, Trash2, X, Loader, CheckCircle, XCircle, HelpCircle, Download } from 'lucide-react';
import { RESPONSIBLE_MAPPING } from './operations/utils';
import { LineAutocomplete } from './LineAutocomplete';
import { exportNCRToExcel } from './NCRExcelExport';

const WAREHOUSE_BRANCHES = ['สาย 3', 'นครสวรรค์', 'กำแพงเพชร', 'แม่สอด', 'พิษณุโลก', 'เชียงใหม่', 'EKP ลำปาง', 'คลอง13', 'ประดู่'];
const WAREHOUSE_CAUSES = ['เช็คเกอร์', 'พนักงานลงสินค้า', 'อื่นๆ'];
const REPORTING_BRANCHES = ['สาย 3', 'นครสวรรค์', 'กำแพงเพชร', 'แม่สอด', 'พิษณุโลก', 'เชียงใหม่', 'EKP ลำปาง', 'คลอง13', 'ประดู่'];

const NCRSystem: React.FC = () => {
    const { addNCRReport, getNextNCRNumber, addReturnRecord, ncrReports } = useData();

    const initialFormData = {
        toDept: 'แผนกควบคุมคุณภาพ', date: new Date().toISOString().split('T')[0], copyTo: '',
        founder: '', poNo: '',
        problemDamaged: false, problemDamagedInBox: false, problemLost: false, problemMixed: false, problemWrongInv: false, problemLate: false, problemDuplicate: false, problemWrong: false, problemIncomplete: false, problemOver: false, problemWrongInfo: false, problemShortExpiry: false, problemTransportDamage: false, problemAccident: false, problemPOExpired: false, problemNoBarcode: false, problemNotOrdered: false, problemOther: false, problemOtherText: '', problemDetail: '',
        actionReject: false, actionRejectQty: 0, actionRejectSort: false, actionRejectSortQty: 0, actionRework: false, actionReworkQty: 0, actionReworkMethod: '', actionSpecialAccept: false, actionSpecialAcceptQty: 0, actionSpecialAcceptReason: '', actionScrap: false, actionScrapQty: 0, actionReplace: false, actionReplaceQty: 0,
        causePackaging: false, causeTransport: false, causeOperation: false, causeEnv: false, causeDetail: '', preventionDetail: '', preventionDueDate: '',
        dueDate: '', approver: '', approverPosition: '', approverDate: '', responsiblePerson: '', responsiblePosition: '',
        qaAccept: false, qaReject: false, qaReason: ''
    };

    const [formData, setFormData] = useState(initialFormData);

    const [ncrItems, setNcrItems] = useState<NCRItem[]>([]);
    const [showItemModal, setShowItemModal] = useState(false);
    const [newItem, setNewItem] = useState<Partial<NCRItem>>({ branch: '', refNo: '', neoRefNo: '', productCode: '', productName: '', customerName: '', destinationCustomer: '', quantity: 0, unit: '', priceBill: 0, expiryDate: '', hasCost: false, costAmount: 0, costResponsible: '', problemSource: '' });
    const [isCustomReportBranch, setIsCustomReportBranch] = useState(false);
    const [sourceSelection, setSourceSelection] = useState({ category: '', whBranch: '', whCause: '', whOtherText: '', transType: '', transName: '', transPlate: '', transVehicleType: '', transAffiliation: '', transCompany: '', otherText: '', problemScenario: '' });

    // States for Modals
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [saveResult, setSaveResult] = useState<{ success: boolean; message: string; ncrNo?: string } | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [generatedNCRNumber, setGeneratedNCRNumber] = useState('');

    const uniqueFounders = useMemo(() => {
        const founders = new Set(ncrReports.map(r => r.founder).filter(Boolean));
        return Array.from(founders).sort();
    }, [ncrReports]);


    useEffect(() => {
        if (showItemModal) {
            setSourceSelection({ category: '', whBranch: '', whCause: '', whOtherText: '', transType: '', transName: '', transPlate: '', transVehicleType: '', transAffiliation: '', transCompany: '', otherText: '' });
            setIsCustomReportBranch(false);
        }
    }, [showItemModal]);

    // Removal of old effect (newItem.hasCost && sourceSelection.problemScenario) as it is replaced by newItem.problemSource
    useEffect(() => {
        // Cleaning up old logic hook
    }, []);

    // Auto-map responsible person based on problem source dropdown
    useEffect(() => {
        if (newItem.hasCost && newItem.problemSource) {
            const responsible = RESPONSIBLE_MAPPING[newItem.problemSource];
            if (responsible) {
                setNewItem(prev => ({ ...prev, costResponsible: responsible }));
            }
        }
    }, [newItem.hasCost, newItem.problemSource]);

    const handleAddItem = (closeModal: boolean = true) => {
        if (!newItem.productCode || !newItem.branch) { alert("กรุณาระบุรหัสสินค้าและสาขา"); return; }
        let formattedSource = '';
        const s = sourceSelection;
        if (s.category === 'Customer') formattedSource = 'ลูกค้าต้นทาง';
        else if (s.category === 'DestinationCustomer') formattedSource = 'ลูกค้าปลายทาง';
        else if (s.category === 'Accounting') formattedSource = 'บัญชี';
        else if (s.category === 'Keying') formattedSource = 'พนักงานคีย์ข้อมูลผิด';
        else if (s.category === 'Warehouse') {
            formattedSource = `ภายในคลังสินค้า (${s.whBranch || '-'}) - สาเหตุ: ${s.whCause}${s.whCause === 'อื่นๆ' ? ' ' + s.whOtherText : ''}`;
        } else if (s.category === 'Transport') {
            const type = s.transType === 'Company' ? 'พนักงานขับรถบริษัท' : 'รถขนส่งร่วม';
            const details = [
                s.transName ? `ชื่อ: ${s.transName}` : '',
                s.transPlate ? `ทะเบียน: ${s.transPlate}` : '',
                s.transVehicleType ? `ประเภท: ${s.transVehicleType}` : '',
                s.transAffiliation ? `สังกัด: ${s.transAffiliation}` : '',
                s.transType === 'Joint' && s.transCompany ? `บ.: ${s.transCompany}` : ''
            ].filter(Boolean).join(', ');
            formattedSource = `ระหว่างขนส่ง (${type}) - ${details}`;
        } else if (s.category === 'Other') {
            formattedSource = `อื่นๆ: ${s.otherText}`;
        }

        // Combine Problem Analysis (formattedSource) and Cost Source (newItem.problemSource)
        const parts = [];
        if (formattedSource) parts.push(formattedSource);
        if (newItem.problemSource) parts.push(newItem.problemSource);
        const finalProblemSource = parts.join(' / ') || '-';

        // formattedSource is stored in rootCause for reference
        const finalRootCause = formattedSource || '-';

        const item: NCRItem = {
            ...newItem as NCRItem,
            id: Date.now().toString(),
            destinationCustomer: newItem.destinationCustomer || '',
            quantity: Number(newItem.quantity) || 0,
            priceBill: Number(newItem.priceBill) || 0,
            costAmount: Number(newItem.costAmount) || 0,
            problemSource: finalProblemSource,
            // We might need to ensure NCRItem type has rootCause or similar if we want to save formattedSource separately
            // For now, if cost tracking is used, problemSource takes precedence as the key classifier 
        };
        setNcrItems([...ncrItems, item]);

        // Keep Branch and other sticky fields if needed, but for now reset product info
        setNewItem(prev => ({
            ...prev,
            refNo: '', neoRefNo: '', productCode: '', productName: '', customerName: '', destinationCustomer: '', quantity: 0, unit: '', priceBill: 0, expiryDate: '', hasCost: false, costAmount: 0, costResponsible: '', problemSource: ''
        }));
        setSourceSelection({ category: '', whBranch: '', whCause: '', whOtherText: '', transType: '', transName: '', transPlate: '', transVehicleType: '', transAffiliation: '', transCompany: '', otherText: '' });

        if (closeModal) {
            setShowItemModal(false);
        } else {
            // Optional: Show toast or feedback
        }
    };

    const handleDeleteItem = (id: string) => { setNcrItems(ncrItems.filter(i => i.id !== id)); };
    const validateForm = () => {
        const errors = [];
        if (!formData.founder.trim()) errors.push("ผู้พบปัญหา");

        const isProblemChecked =
            formData.problemDamaged || formData.problemDamagedInBox || formData.problemLost || formData.problemMixed || formData.problemWrongInv ||
            formData.problemLate || formData.problemDuplicate || formData.problemWrong || formData.problemIncomplete ||
            formData.problemOver || formData.problemWrongInfo || formData.problemShortExpiry || formData.problemTransportDamage ||
            formData.problemAccident || (formData.problemOther && formData.problemOtherText.trim());

        if (!isProblemChecked && !formData.problemDetail.trim()) {
            errors.push("ระบุปัญหาที่พบ (ติ๊กเลือกหัวข้อ หรือ กรอกรายละเอียด)");
        }

        if (ncrItems.length === 0) {
            errors.push("รายการสินค้า (กรุณากดปุ่ม '+ เพิ่มรายการ' สีน้ำเงิน)");
        }

        const isCauseChecked = formData.causePackaging || formData.causeTransport || formData.causeOperation || formData.causeEnv;
        if (!isCauseChecked) {
            errors.push("สาเหตุเกิดจาก (กรุณาเลือกอย่างน้อย 1 หัวข้อ)");
        }

        return errors;
    };

    const handleProblemSelection = (field: keyof NCRRecord) => {
        setFormData(prev => {
            const isCurrentlyChecked = prev[field] as boolean;
            const newValue = !isCurrentlyChecked;
            if (newValue) {
                return {
                    ...prev,
                    problemDamaged: false,
                    problemDamagedInBox: false,
                    problemLost: false,
                    problemMixed: false,
                    problemWrongInv: false,
                    problemLate: false,
                    problemDuplicate: false,
                    problemWrong: false,
                    problemIncomplete: false,
                    problemOver: false,
                    problemWrongInfo: false,
                    problemShortExpiry: false,
                    problemTransportDamage: false,
                    problemAccident: false,
                    problemPOExpired: false,
                    problemNoBarcode: false,
                    problemNotOrdered: false,
                    problemOther: false,
                    [field]: true
                };
            } else {
                return { ...prev, [field]: false };
            }
        });
    };

    const handleActionSelection = (field: keyof NCRRecord) => {
        setFormData(prev => {
            const isCurrentlyChecked = prev[field] as boolean;
            const newValue = !isCurrentlyChecked;
            if (newValue) {
                return {
                    ...prev,
                    actionReject: false,
                    actionRejectSort: false,
                    actionRework: false,
                    actionSpecialAcceptance: false,
                    actionScrap: false,
                    actionReplace: false, // Ensure this matches the field name in JSX (actionReplace)
                    [field]: true
                };
            } else {
                return { ...prev, [field]: false };
            }
        });
    };

    // EXPORT EXCEL FUNCTION
    const handleExportExcel = () => {
        const errors = validateForm();
        if (errors.length > 0) {
            if (!confirm("ข้อมูลยังไม่ครบถ้วน คุณต้องการ Export ต่อไปหรือไม่?\n\n(ข้อมูลที่ขาด: " + errors.join(", ") + ")")) {
                return;
            }
        }

        const ncrNos = generatedNCRNumber || "Preview-Draft";
        exportNCRToExcel(formData, ncrItems, ncrNos);
    };








    const handlePrint = () => {
        const errors = validateForm();
        if (errors.length > 0) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วนก่อนพิมพ์ (ระบบจะทำการบันทึกข้อมูลก่อนพิมพ์):\n\n" + errors.map(e => "- " + e).join("\n"));
            return;
        }
        setIsPrinting(true);
        setShowConfirmModal(true);
    };

    const handleSaveRecord = () => {
        const errors = validateForm();
        if (errors.length > 0) {
            alert("กรุณากรอกข้อมูลต่อไปนี้ให้ครบถ้วนก่อนบันทึก:\n\n" + errors.map(e => "- " + e).join("\n"));
            return;
        }
        setIsPrinting(false);
        setShowConfirmModal(true);
    };

    const executeSave = async () => {
        setShowConfirmModal(false);
        // Do not set isSaving(true) immediately if we want to show print dialog, 
        // but basically we want to block interaction.
        setIsSaving(true);

        const newNcrNo = await getNextNCRNumber();
        if (newNcrNo.includes('ERR')) {
            setSaveResult({ success: false, message: "ไม่สามารถสร้างเลขที่ NCR อัตโนมัติได้ กรุณาลองใหม่อีกครั้ง" });
            setShowResultModal(true);
            setIsSaving(false);
            setIsPrinting(false);
            return;
        }

        let successCount = 0;

        for (const item of ncrItems) {
            const record: NCRRecord = {
                ...formData,
                id: `${newNcrNo}-${item.id}`,
                ncrNo: newNcrNo,
                item: item,
                status: formData.qaAccept ? 'Closed' : 'Open',
            };

            const success = await addNCRReport(record);
            if (success) {
                // BIDIRECTIONAL SYNC: Create Return Record for Operations Hub (Step 2: Intake)
                const returnRecord: ReturnRecord = { // STRICT TYPING
                    id: `RT-${new Date().getFullYear()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    refNo: item.refNo || '-',
                    date: formData.date || new Date().toISOString().split('T')[0],
                    dateRequested: formData.date || new Date().toISOString().split('T')[0],
                    productName: item.productName || 'Unknown Product',
                    productCode: item.productCode || 'N/A',
                    quantity: item.quantity,
                    unit: item.unit || 'Unit',
                    customerName: item.customerName || 'Unknown Customer',
                    destinationCustomer: item.destinationCustomer || '',
                    branch: item.branch || 'Head Office',
                    category: 'General', // Added required field
                    ncrNumber: newNcrNo,
                    status: 'Requested',
                    disposition: 'Pending',
                    reason: `Created via NCR System (${formData.problemDetail || 'No Detail'})`,
                    amount: (item.quantity || 0) * (item.priceBill || 0), // Calculated Amount
                    priceBill: item.priceBill || 0,
                    priceSell: 0, // Default
                    neoRefNo: item.neoRefNo || '-',
                    // Pass Problem Boolean Flags to ReturnRecord
                    problemDamaged: formData.problemDamaged,
                    problemDamagedInBox: formData.problemDamagedInBox,
                    problemLost: formData.problemLost,
                    problemMixed: formData.problemMixed,
                    problemWrongInv: formData.problemWrongInv,
                    problemLate: formData.problemLate,
                    problemDuplicate: formData.problemDuplicate,
                    problemWrong: formData.problemWrong,
                    problemIncomplete: formData.problemIncomplete,
                    problemOver: formData.problemOver,
                    problemWrongInfo: formData.problemWrongInfo,
                    problemShortExpiry: formData.problemShortExpiry,
                    problemTransportDamage: formData.problemTransportDamage,
                    problemAccident: formData.problemAccident,
                    problemPOExpired: formData.problemPOExpired,
                    problemNoBarcode: formData.problemNoBarcode,
                    problemNotOrdered: formData.problemNotOrdered,
                    problemOther: formData.problemOther,
                    problemOtherText: formData.problemOtherText,
                    problemDetail: formData.problemDetail,

                    // Root Cause Mapping
                    rootCause: item.problemSource || 'NCR',
                    problemSource: item.problemSource,
                    hasCost: item.hasCost,
                    costAmount: item.costAmount,
                    costResponsible: item.costResponsible,
                    founder: formData.founder // Sync Founder to Operations Hub
                };

                console.log("🔄 Syncing to Operations Hub:", returnRecord);

                const syncSuccess = await addReturnRecord(returnRecord);

                if (!syncSuccess) {
                    console.error("❌ Failed to sync record to Operations Hub", returnRecord);
                    alert(`แจ้งเตือน: บันทึก NCR สำเร็จ แต่ไม่สามารถส่งข้อมูลไปยัง Hub ได้ (Item: ${item.productCode})`);
                }

                successCount++;
            } else {
                break;
            }
        }

        setIsSaving(false);

        if (successCount === ncrItems.length) {
            setGeneratedNCRNumber(newNcrNo); // Show ID on form
            setSaveResult({ success: true, message: `บันทึกข้อมูลสำเร็จ`, ncrNo: newNcrNo });

            if (isPrinting) {
                // Wait a moment for the newNcrNo to be rendered in the DOM
                setTimeout(() => {
                    window.print();
                    // After print dialog closes (or standard timeout), show success modal
                    setShowResultModal(true);
                }, 500);
            } else {
                setShowResultModal(true);
            }

        } else {
            setSaveResult({ success: false, message: `บันทึกข้อมูลไม่สำเร็จ!\nกรุณาตรวจสอบสิทธิ์การใช้งาน (Permission Denied)` });
            setShowResultModal(true);
        }

    };

    const handleCloseResultModal = () => {
        setShowResultModal(false);
        if (saveResult?.success) {
            setNcrItems([]);
            setFormData(initialFormData);
            setGeneratedNCRNumber('');
            setIsPrinting(false);
        }
        setSaveResult(null);
    };


    return (
        <div className="p-8 h-full overflow-auto bg-slate-50 flex flex-col items-center print:p-0 print:m-0 print:bg-white print:h-auto print:overflow-visible print:block">
            <style>{`
                @media screen {
                    .a4-paper {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 40px auto;
                        background: white;
                        box-shadow: 0 0 20px rgba(0,0,0,0.15);
                        padding: 20mm;
                        position: relative;
                        /* Border for visual feedback of edges */
                        border: 1px solid #e2e8f0; 
                    }
                    /* Removed dark background override for consistency */
                }

                @media print {
                    @page {
                        size: A4;
                        margin: 15mm; /* Standard print margin */
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        background: white !important;
                    }
                    /* Reset container for print */
                    .a4-paper {
                        width: 100% !important;
                        height: auto !important;
                        min-height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                    }
                    
                    /* Typography & Layout */
                    .print-scale { transform-origin: top left; }
                    .print-text-readable { font-size: 12pt !important; line-height: 1.4; }
                    .print-text-sm { font-size: 10pt !important; }
                    
                    /* Tables */
                    table { width: 100% !important; border-collapse: collapse; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    tr { page-break-inside: avoid; }
                    
                    /* Utility */
                    .print-break-avoid { page-break-inside: avoid !important; break-inside: avoid !important; }
                    .no-print { display: none !important; }
                    .print-border { border: 1px solid #000 !important; }
                    .print-border-2 { border: 2px solid #000 !important; }
                    
                    /* Input clean up */
                    input[type="text"], input[type="date"], input[type="number"], textarea, select {
                        border: none !important;
                        background: transparent !important;
                        resize: none;
                        padding: 0 !important;
                        margin: 0 !important;
                        /* approximate print text look */
                        font-family: inherit; 
                    }
                    /* Checbkox sizing */
                    input[type="checkbox"] {
                        width: 12px; height: 12px;
                    }
                }
            `}</style>

            <div className="w-full max-w-5xl flex justify-end gap-2 mb-6 print:hidden">
                <button onClick={handleExportExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm hover:bg-green-700 transition-colors"><Download className="w-4 h-4" /> Export Excel</button>
                <button onClick={handlePrint} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm hover:bg-slate-700 transition-colors"><Printer className="w-4 h-4" /> Print Form / Save as PDF</button>
                <button onClick={handleSaveRecord} disabled={isSaving} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-wait"><Save className="w-4 h-4" /> Save Record</button>
            </div>
            <div className="a4-paper">
                {/* HEADER */}
                <div className="flex border-2 border-black mb-6 print-border-2">
                    <div className="w-[30%] border-r-2 border-black print-border p-4 flex items-center justify-center"><img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Neo Logistics" className="w-full h-auto object-contain max-h-24" /></div>
                    <div className="w-[70%] p-4 flex flex-col justify-center pl-6"><h2 className="text-xl font-bold text-slate-900 leading-none mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h2><h3 className="text-sm font-bold text-slate-700 mb-3">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h3><p className="text-sm text-slate-600 mb-1">159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000</p><div className="text-sm text-slate-600 flex gap-4"><span>Tax ID: 0105552087673</span><span className="text-slate-400">|</span><span>Tel: 056-275-841</span></div></div>
                </div>
                <h1 className="text-xl font-bold text-center border-2 border-black print-border-2 py-2 mb-6 bg-white text-slate-900 print:bg-transparent">ใบแจ้งปัญหาระบบ (NCR) / ใบแจ้งปัญหารับสินค้าคืน</h1>

                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-8 print-text-readable">
                    <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">ถึงหน่วยงาน:</label><input type="text" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700 print:border-none" value={formData.toDept} onChange={e => setFormData({ ...formData, toDept: e.target.value })} /></div>
                    <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">วันที่:</label><input type="date" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700 print:border-none" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                    <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">สำเนา:</label><input type="text" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700 print:border-none" value={formData.copyTo} onChange={e => setFormData({ ...formData, copyTo: e.target.value })} /></div>
                    <div className="flex items-center gap-2">
                        <label className="font-bold w-24 text-slate-800">เลขที่ NCR: <span className="text-red-500 no-print">*</span></label>
                        <div className="flex-1 border-b border-dotted border-slate-400 bg-slate-100 outline-none px-2 py-1 font-mono text-slate-500 font-bold rounded-sm text-center print:bg-transparent print:text-black">
                            {generatedNCRNumber || "จะถูกสร้างอัตโนมัติเมื่อบันทึก"}
                        </div>
                    </div>
                    <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">ผู้พบปัญหา: <span className="text-red-500 no-print">*</span></label><LineAutocomplete className="w-full border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700 print:border-none" value={formData.founder} onChange={val => setFormData({ ...formData, founder: val })} options={uniqueFounders} /></div>
                    <div className="flex items-center gap-2"><label className="font-bold w-32 text-slate-800">เลขที่ใบสั่งซื้อ/ผลิต:</label><input type="text" className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700 print:border-none" value={formData.poNo} onChange={e => setFormData({ ...formData, poNo: e.target.value })} /></div>
                </div>

                {/* ITEM LIST */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-900 underline print-text-readable">รายการสินค้าที่พบปัญหา (Non-Conforming Items) <span className="text-red-500 no-print">*</span></h3><button onClick={() => setShowItemModal(true)} className="print:hidden text-xs bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-700"><Plus className="w-3 h-3" /> เพิ่มรายการ</button></div>
                    <div className="border-2 border-black print-border-2 bg-white">
                        <table className="w-full text-xs text-left print-text-sm">
                            <thead className="bg-slate-100 print:bg-transparent border-b border-black font-bold"><tr><th className="p-2 border-r border-black print-border">สาขาต้นทาง</th><th className="p-2 border-r border-black print-border">Ref/Neo Ref</th><th className="p-2 border-r border-black print-border">สินค้า/ลูกค้า</th><th className="p-2 border-r border-black text-center print-border">จำนวน</th><th className="p-2 border-r border-black text-right print-border">ราคา/วันหมดอายุ</th><th className="p-2 border-r border-black print-border">วิเคราะห์ปัญหา/ค่าใช้จ่าย</th><th className="p-2 text-center print:hidden w-10">ลบ</th></tr></thead>
                            <tbody className="divide-y divide-black">
                                {ncrItems.length === 0 ? (<tr><td colSpan={7} className="p-4 text-center text-slate-400 italic">ยังไม่มีรายการสินค้า (กดปุ่ม '+ เพิ่มรายการ')</td></tr>) : (ncrItems.map(item => (<tr key={item.id}><td className="p-2 border-r border-black align-top print-border text-sm"><div>{item.branch}</div></td><td className="p-2 border-r border-black align-top print-border"><div>Ref: {item.refNo}</div><div className="text-slate-500">Neo: {item.neoRefNo}</div></td><td className="p-2 border-r border-black align-top print-border"><div className="font-bold">{item.productCode}</div><div className="text-slate-600 font-medium">{item.productName}</div><div className="text-slate-500">{item.customerName}</div>{item.destinationCustomer && (<div className="text-xs text-blue-600 mt-1">ปลายทาง: {item.destinationCustomer}</div>)}</td><td className="p-2 border-r border-black text-center align-top print-border">{item.quantity} {item.unit}</td><td className="p-2 border-r border-black text-right align-top print-border"><div>{item.priceBill.toLocaleString()} บ.</div><div className="text-red-500">Exp: {item.expiryDate}</div></td><td className="p-2 border-r border-black align-top print-border"><div className="font-medium">{item.problemSource}</div>{item.hasCost && (<div className="text-red-600 font-bold mt-1">Cost: {item.costAmount?.toLocaleString()} บ.<div className="text-xs text-slate-500 font-normal">({item.costResponsible})</div></div>)}</td><td className="p-2 text-center align-top print:hidden"><button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td></tr>)))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SECTION 1: PROBLEM */}
                <table className="w-full border-2 border-black print-border-2 mb-6"><thead><tr className="border-b-2 border-black print-border-2 bg-slate-200 print:bg-transparent"><th className="border-r-2 border-black print-border w-1/3 py-2 text-slate-900 print-text-readable">รูปภาพ / เอกสาร</th><th className="py-2 text-slate-900 print-text-readable">รายละเอียดของปัญหาที่พบ (ผู้พบปัญหา)</th></tr></thead><tbody><tr><td className="border-r-2 border-black print-border p-4 text-center align-middle h-64 relative bg-white"><div className="flex flex-col items-center justify-center text-red-500 opacity-50 print:opacity-100 print:text-black"><h2 className="text-3xl font-bold mb-2">รูปภาพ / เอกสาร</h2><h2 className="text-3xl font-bold">ตามแนบ</h2><ImageIcon className="w-16 h-16 mt-4 print:hidden" /></div><input type="file" className="absolute inset-0 opacity-0 cursor-pointer print:hidden" title="Upload Image" /></td><td className="p-4 align-top text-sm bg-white"><div className="mb-2 font-bold underline text-slate-900 print-text-readable">พบปัญหาที่กระบวนการ <span className="text-red-500 no-print">*</span></div><div className="grid grid-cols-2 gap-2 mb-4 text-slate-700 print-text-sm">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemDamaged} onChange={() => handleProblemSelection('problemDamaged')} /> ชำรุด</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemDamagedInBox} onChange={() => handleProblemSelection('problemDamagedInBox')} /> ชำรุดในกล่อง</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemLost} onChange={() => handleProblemSelection('problemLost')} /> สูญหาย</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemMixed} onChange={() => handleProblemSelection('problemMixed')} /> สินค้าสลับ</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemWrongInv} onChange={() => handleProblemSelection('problemWrongInv')} /> สินค้าไม่ตรง INV.</label>

                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemLate} onChange={() => handleProblemSelection('problemLate')} /> ส่งช้า</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemDuplicate} onChange={() => handleProblemSelection('problemDuplicate')} /> ส่งซ้ำ</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemWrong} onChange={() => handleProblemSelection('problemWrong')} /> ส่งผิด</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemIncomplete} onChange={() => handleProblemSelection('problemIncomplete')} /> ส่งของไม่ครบ</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemOver} onChange={() => handleProblemSelection('problemOver')} /> ส่งของเกิน</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemWrongInfo} onChange={() => handleProblemSelection('problemWrongInfo')} /> ข้อมูลผิด</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemShortExpiry} onChange={() => handleProblemSelection('problemShortExpiry')} /> สินค้าอายุสั้น</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemTransportDamage} onChange={() => handleProblemSelection('problemTransportDamage')} /> สินค้าเสียหายบนรถขนส่ง</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemAccident} onChange={() => handleProblemSelection('problemAccident')} /> อุบัติเหตุ</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemPOExpired} onChange={() => handleProblemSelection('problemPOExpired')} /> PO. หมดอายุ</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemNoBarcode} onChange={() => handleProblemSelection('problemNoBarcode')} /> บาร์โค๊ตไม่ขึ้น</label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={formData.problemNotOrdered} onChange={() => handleProblemSelection('problemNotOrdered')} /> ไม่ได้สั่งสินค้า</label>

                    <div className="flex items-center gap-2 p-1 col-span-2"><input type="checkbox" checked={formData.problemOther} onChange={() => handleProblemSelection('problemOther')} /> <span>อื่นๆ</span><input type="text" className="border-b border-dotted border-slate-400 bg-transparent outline-none w-full text-slate-700 print:border-none" value={formData.problemOtherText} onChange={e => setFormData({ ...formData, problemOtherText: e.target.value })} /></div>
                </div><div className="font-bold underline mb-1 text-slate-900">รายละเอียด:</div><textarea className="w-full h-32 border border-slate-200 bg-slate-50 p-2 text-sm resize-none focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 print:border-none" value={formData.problemDetail} onChange={e => setFormData({ ...formData, problemDetail: e.target.value })}></textarea></td></tr></tbody></table>

                {/* SECTION 2: ACTION (GRID LAYOUT) */}
                <table className="w-full border-2 border-black mb-6 text-sm bg-white print-border-2">
                    <thead><tr className="bg-slate-200 print:bg-transparent border-b-2 border-black print-border-2"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">การดำเนินการ</th></tr></thead>
                    <tbody className="divide-y divide-black border-b-2 border-black print-border-2">
                        <tr>
                            <td className="p-2 border-r border-black w-1/2 print-border"><div className="flex items-center gap-2"><input type="checkbox" checked={formData.actionReject} onChange={() => handleActionSelection('actionReject')} /> <span className="font-bold">ส่งคืน (Reject)</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" className="w-20 border-b border-dotted border-black text-center bg-transparent print:border-none outline-none" value={formData.actionRejectQty || ''} onChange={e => setFormData({ ...formData, actionRejectQty: parseInt(e.target.value) || 0 })} /></div></td>
                            <td className="p-2 w-1/2 print-border"><div className="flex items-center gap-2"><input type="checkbox" checked={formData.actionRejectSort} onChange={() => handleActionSelection('actionRejectSort')} /> <span className="font-bold">คัดแยกของเสียเพื่อส่งคืน</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" className="w-20 border-b border-dotted border-black text-center bg-transparent print:border-none outline-none" value={formData.actionRejectSortQty || ''} onChange={e => setFormData({ ...formData, actionRejectSortQty: parseInt(e.target.value) || 0 })} /></div></td>
                        </tr>
                        <tr>
                            <td className="p-2 border-r border-black print-border"><div className="flex items-center gap-2"><input type="checkbox" checked={formData.actionRework} onChange={() => handleActionSelection('actionRework')} /> <span className="font-bold">แก้ไข (Rework)</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" className="w-20 border-b border-dotted border-black text-center bg-transparent print:border-none outline-none" value={formData.actionReworkQty || ''} onChange={e => setFormData({ ...formData, actionReworkQty: parseInt(e.target.value) || 0 })} /></div></td>
                            <td className="p-2 print-border"><div className="flex items-center gap-2"><span className="font-bold">วิธีการแก้ไข</span><input type="text" className="flex-1 border-b border-dotted border-black bg-transparent print:border-none outline-none" value={formData.actionReworkMethod} onChange={e => setFormData({ ...formData, actionReworkMethod: e.target.value })} /></div></td>
                        </tr>
                        <tr>
                            <td className="p-2 border-r border-black print-border"><div className="flex items-center gap-2"><input type="checkbox" checked={formData.actionSpecialAcceptance} onChange={() => handleActionSelection('actionSpecialAcceptance')} /> <span className="font-bold">ยอมรับกรณีพิเศษ</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" className="w-20 border-b border-dotted border-black text-center bg-transparent print:border-none outline-none" value={formData.actionSpecialAcceptanceQty || ''} onChange={e => setFormData({ ...formData, actionSpecialAcceptanceQty: parseInt(e.target.value) || 0 })} /></div></td>
                            <td className="p-2 print-border"><div className="flex items-center gap-2"><span className="font-bold">เหตุผลในการยอมรับ</span><input type="text" className="flex-1 border-b border-dotted border-black bg-transparent print:border-none outline-none" value={formData.actionSpecialAcceptanceReason} onChange={e => setFormData({ ...formData, actionSpecialAcceptanceReason: e.target.value })} /></div></td>
                        </tr>
                        <tr>
                            <td className="p-2 border-r border-black print-border"><div className="flex items-center gap-2"><input type="checkbox" checked={formData.actionScrap} onChange={() => handleActionSelection('actionScrap')} /> <span className="font-bold">ทำลาย (Scrap)</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" className="w-20 border-b border-dotted border-black text-center bg-transparent print:border-none outline-none" value={formData.actionScrapQty || ''} onChange={e => setFormData({ ...formData, actionScrapQty: parseInt(e.target.value) || 0 })} /></div></td>
                            <td className="p-2 print-border"><div className="flex items-center gap-2"><input type="checkbox" checked={formData.actionReplace} onChange={() => handleActionSelection('actionReplace')} /> <span className="font-bold">เปลี่ยนสินค้าใหม่</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" className="w-20 border-b border-dotted border-black text-center bg-transparent print:border-none outline-none" value={formData.actionReplaceQty || ''} onChange={e => setFormData({ ...formData, actionReplaceQty: parseInt(e.target.value) || 0 })} /></div></td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={2} className="p-3 bg-white print:bg-transparent">
                                <div className="flex justify-between items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2"><span>กำหนดแล้วเสร็จ</span><input type="date" className="border-b border-dotted border-black bg-transparent print:border-none text-slate-700 outline-none" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} /></div>
                                    <div className="flex items-center gap-2"><span>ผู้อนุมัติ</span><input type="text" className="w-32 border-b border-dotted border-black bg-transparent print:border-none text-slate-700 text-center outline-none" value={formData.approver} onChange={e => setFormData({ ...formData, approver: e.target.value })} /></div>
                                    <div className="flex items-center gap-2"><span>ตำแหน่ง</span><input type="text" className="w-24 border-b border-dotted border-black bg-transparent print:border-none text-slate-700 text-center outline-none" value={formData.approverPosition} onChange={e => setFormData({ ...formData, approverPosition: e.target.value })} /></div>
                                    <div className="flex items-center gap-2"><span>วันที่</span><input type="date" className="border-b border-dotted border-black bg-transparent print:border-none text-slate-700 outline-none" value={formData.approverDate} onChange={e => setFormData({ ...formData, approverDate: e.target.value })} /></div>
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* SECTION 3: ROOT CAUSE & PREVENTION */}
                <table className="w-full border-2 border-black mb-6 text-sm bg-white print-border-2">
                    <thead><tr className="bg-slate-200 print:bg-transparent border-b-2 border-black print-border-2"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">สาเหตุ-การป้องกัน (ผู้รับผิดชอบปัญหา)</th></tr></thead>
                    <tbody>
                        <tr>
                            <td className="w-1/4 border-r-2 border-black align-top p-0 print-border">
                                <div className="border-b border-black p-2 font-bold text-center bg-slate-200 print:bg-transparent print-border">สาเหตุเกิดจาก</div>
                                <div className="p-4 space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.causePackaging} onChange={e => setFormData({ ...formData, causePackaging: e.target.checked, causeTransport: false, causeOperation: false, causeEnv: false })} /> บรรจุภัณฑ์</label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.causeTransport} onChange={e => setFormData({ ...formData, causeTransport: e.target.checked, causePackaging: false, causeOperation: false, causeEnv: false })} /> การขนส่ง</label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.causeOperation} onChange={e => setFormData({ ...formData, causeOperation: e.target.checked, causePackaging: false, causeTransport: false, causeEnv: false })} /> ปฏิบัติงาน</label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.causeEnv} onChange={e => setFormData({ ...formData, causeEnv: e.target.checked, causePackaging: false, causeTransport: false, causeOperation: false })} /> สิ่งแวดล้อม</label>
                                </div>
                            </td>
                            <td className="align-top p-0 print-border">
                                <div className="h-24 border-b border-black p-2 flex flex-col print-border">
                                    <div className="font-bold mb-1">รายละเอียดสาเหตุ :</div>
                                    <textarea className="flex-1 w-full bg-transparent outline-none resize-none text-slate-700" value={formData.causeDetail} onChange={e => setFormData({ ...formData, causeDetail: e.target.value })}></textarea>
                                </div>
                                <div className="h-24 p-2 flex flex-col">
                                    <div className="font-bold underline mb-1">แนวทางป้องกัน :</div>
                                    <textarea className="flex-1 w-full bg-transparent outline-none resize-none text-slate-700" value={formData.preventionDetail} onChange={e => setFormData({ ...formData, preventionDetail: e.target.value })}></textarea>
                                </div>
                            </td>
                        </tr>
                        <tr className="border-t-2 border-black print-border-2">
                            <td colSpan={2} className="p-3 bg-white print:bg-transparent">
                                <div className="flex justify-between items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2"><span>กำหนดการป้องกันแล้วเสร็จ</span><input type="date" className="border-b border-dotted border-black bg-transparent print:border-none text-slate-700 outline-none" value={formData.preventionDueDate} onChange={e => setFormData({ ...formData, preventionDueDate: e.target.value })} /></div>
                                    <div className="flex items-center gap-2"><span>ผู้รับผิดชอบ</span><input type="text" className="w-32 border-b border-dotted border-black bg-transparent print:border-none text-slate-700 text-center outline-none" value={formData.responsiblePerson} onChange={e => setFormData({ ...formData, responsiblePerson: e.target.value })} /></div>
                                    <div className="flex items-center gap-2"><span>ตำแหน่ง</span><input type="text" className="w-24 border-b border-dotted border-black bg-transparent print:border-none text-slate-700 text-center outline-none" value={formData.responsiblePosition} onChange={e => setFormData({ ...formData, responsiblePosition: e.target.value })} /></div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* NOTE */}
                <div className="border-2 border-black p-2 mb-6 text-xs bg-white">
                    <span className="font-bold">หมายเหตุ :</span> เมื่อทาง Supplier/Out source หรือหน่วยงานผู้รับผิดชอบปัญหา ได้รับเอกสารใบ NCR กรุณาระบุสาเหตุ-การป้องกัน และตอบกลับมายังแผนกประกันคุณภาพ ภายใน 1 สัปดาห์
                </div>

                {/* SECTION 4: CLOSING (Avoid Break Inside) */}
                <div className="print-break-avoid">
                    <table className="w-full border-2 border-black text-sm bg-white print-border-2">
                        <thead><tr className="bg-slate-200 print:bg-transparent border-b-2 border-black print-border-2"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">การตรวจติดตามและการปิด NCR</th></tr></thead>
                        <tbody>
                            <tr className="border-b-2 border-black print-border-2">
                                <td colSpan={2} className="p-4 print-border">
                                    <div className="flex items-center gap-8">
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.qaAccept} onChange={e => setFormData({ ...formData, qaAccept: e.target.checked, qaReject: false })} /> ยอมรับแนวทางการป้องกัน</label>
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.qaReject} onChange={e => setFormData({ ...formData, qaReject: e.target.checked, qaAccept: false })} /> ไม่ยอมรับแนวทางการป้องกัน</label>
                                        <input type="text" className="flex-1 border-b border-dotted border-black bg-transparent outline-none text-slate-700 print:border-none" placeholder="ระบุเหตุผล (ถ้ามี)" value={formData.qaReason} onChange={e => setFormData({ ...formData, qaReason: e.target.value })} />
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td className="w-1/2 border-r-2 border-black p-4 text-center align-bottom h-32 print-border">
                                    <div className="font-bold mb-8">ผู้ตรวจติดตาม</div>
                                    <div className="border-b border-dotted border-black w-3/4 mx-auto mb-2 print-border"></div>
                                    <div className="text-slate-500 text-xs">แผนกประกันคุณภาพ</div>
                                </td>
                                <td className="w-1/2 p-4 text-center align-bottom h-32 print-border">
                                    <div className="font-bold mb-8">ผู้อนุมัติปิดการตรวจติดตาม</div>
                                    <div className="border-b border-dotted border-black w-3/4 mx-auto mb-2 print-border"></div>
                                    <div className="text-slate-500 text-xs">กรรมการผู้จัดการ</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* FOOTER */}
                <div className="text-right text-xs mt-4 font-mono text-slate-400">FM-OP01-06 Rev.00</div>
            </div>

            {/* MODAL - Add Item */}
            {showItemModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 bg-slate-800 text-white flex justify-between items-center shrink-0"><h3 className="font-bold">เพิ่มรายการสินค้า (Add Item)</h3><button onClick={() => setShowItemModal(false)}><X className="w-5 h-5" /></button></div>
                        <div className="p-6 overflow-y-auto space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-2">สาขา (แจ้งปัญหา) *</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm bg-slate-50 p-3 rounded border border-slate-200">{REPORTING_BRANCHES.map(branch => (<label key={branch} className="flex items-center gap-1 cursor-pointer"><input type="radio" name="reportingBranch" checked={newItem.branch === branch} onChange={() => { setNewItem({ ...newItem, branch: branch }); setIsCustomReportBranch(false); }} />{branch}</label>))}<label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="reportingBranch" checked={isCustomReportBranch} onChange={() => { setNewItem({ ...newItem, branch: '' }); setIsCustomReportBranch(true); }} />อื่นๆ (พิมพ์ข้อความ)</label></div>
                                    {isCustomReportBranch && (<input type="text" className="w-full border border-slate-300 rounded p-2 text-sm mt-2 focus:ring-1 focus:ring-blue-500" placeholder="ระบุสาขา..." value={newItem.branch} onChange={e => setNewItem({ ...newItem, branch: e.target.value })} />)}
                                </div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">รหัสสินค้า *</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500" value={newItem.productCode} onChange={e => setNewItem({ ...newItem, productCode: e.target.value })} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">ชื่อสินค้า</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.productName} onChange={e => setNewItem({ ...newItem, productName: e.target.value })} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">ชื่อลูกค้า</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.customerName} onChange={e => setNewItem({ ...newItem, customerName: e.target.value })} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">สถานที่ส่ง (ลูกค้าปลายทาง)</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.destinationCustomer} onChange={e => setNewItem({ ...newItem, destinationCustomer: e.target.value })} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">เลขที่เอกสารอ้างอิง</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.refNo} onChange={e => setNewItem({ ...newItem, refNo: e.target.value })} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">เลขที่เอกสาร Neo Siam</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.neoRefNo} onChange={e => setNewItem({ ...newItem, neoRefNo: e.target.value })} /></div>
                                <div className="grid grid-cols-3 gap-2 col-span-2">
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">จำนวน</label><input type="number" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.quantity || ''} onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value, 10) || 0 })} /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">หน่วย</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">วันหมดอายุ</label><input type="date" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.expiryDate} onChange={e => setNewItem({ ...newItem, expiryDate: e.target.value })} /></div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">ราคาหน้าบิล</label>
                                        <input type="number" className="w-full border border-slate-300 rounded p-2 text-sm" value={newItem.priceBill || ''} onChange={e => setNewItem({ ...newItem, priceBill: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div className="flex items-end">
                                        <label className={`flex items-center gap-2 cursor-pointer font-bold text-sm px-4 py-2 rounded-lg border w-full h-[38px] transition-all ${newItem.hasCost ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                                            <input type="checkbox" checked={newItem.hasCost} onChange={e => setNewItem({ ...newItem, hasCost: e.target.checked })} className="w-4 h-4 text-red-600 rounded focus:ring-red-500" />
                                            <AlertTriangle className={`w-4 h-4 ${newItem.hasCost ? 'text-red-600' : 'text-slate-400'}`} />
                                            <span>มีค่าใช้จ่าย (Has Cost)</span>
                                        </label>
                                    </div>
                                </div>

                                {newItem.hasCost && (
                                    <div className="mt-4 p-4 bg-red-50/50 rounded-lg border border-red-100 animate-fade-in">
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="col-span-1">
                                                <label className="block text-xs font-bold text-slate-700 mb-1">สาเหตุความเสียหาย (Problem Source)</label>
                                                <select
                                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-red-500 bg-white"
                                                    value={newItem.problemSource || ''}
                                                    onChange={e => setNewItem({ ...newItem, problemSource: e.target.value })}
                                                >
                                                    <option value="">-- ระบุสาเหตุ --</option>
                                                    {Object.keys(RESPONSIBLE_MAPPING).map(key => (
                                                        <option key={key} value={key}>{key}</option>
                                                    ))}
                                                    <option value="Other">อื่นๆ (Other)</option>
                                                </select>
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-xs font-bold text-slate-700 mb-1">ค่าใช้จ่าย (บาท)</label>
                                                <input
                                                    type="number"
                                                    className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
                                                    value={newItem.costAmount || ''}
                                                    onChange={e => setNewItem({ ...newItem, costAmount: parseFloat(e.target.value) || 0 })}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">ผู้รับผิดชอบ (Responsible)</label>
                                            <input
                                                type="text"
                                                className="w-full border border-slate-200 bg-slate-100/50 rounded p-2 text-sm text-slate-600"
                                                value={newItem.costResponsible || ''}
                                                placeholder="ระบบจะระบุให้อัตโนมัติ หรือกรอกเอง"
                                                onChange={e => setNewItem({ ...newItem, costResponsible: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="block text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-1">วิเคราะห์ปัญหาเกิดจาก</label>
                                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'Customer'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'Customer', problemScenario: '' })} /> ลูกค้าต้นทาง (Source Customer)</label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'DestinationCustomer'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'DestinationCustomer', problemScenario: '' })} /> ลูกค้าปลายทาง (Destination Customer)</label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'Accounting'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'Accounting', problemScenario: '' })} /> บัญชี (Accounting)</label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'Keying'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'Keying', problemScenario: '' })} /> พนักงานคีย์ข้อมูลผิด (Keying)</label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'Warehouse'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'Warehouse', problemScenario: '' })} /> ภายในคลังสินค้า (Warehouse)</label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'Transport'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'Transport', problemScenario: '' })} /> ระหว่างขนส่ง (Transport)</label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="sourceCat" checked={sourceSelection.category === 'Other'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'Other', problemScenario: '' })} /> อื่นๆ (Other)</label>
                                </div>
                                <div className="pl-2 space-y-3">
                                    {sourceSelection.category === 'Warehouse' && (
                                        <div className="space-y-3 animate-fade-in">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 mb-1 block">เลือกสาขา/หน่วยงาน</label>
                                                    <select className="w-full border rounded p-1.5 text-sm" value={sourceSelection.whBranch} onChange={e => setSourceSelection({ ...sourceSelection, whBranch: e.target.value })}>
                                                        <option value="">-- เลือกสาขา --</option>
                                                        {WAREHOUSE_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 mb-1 block">ระบุสาเหตุ (Cause)</label>
                                                    <div className="flex flex-wrap gap-2 text-sm mt-1">
                                                        {WAREHOUSE_CAUSES.map(c => (
                                                            <label key={c} className="flex items-center gap-1 cursor-pointer"><input type="radio" name="whCause" checked={sourceSelection.whCause === c} onChange={() => setSourceSelection({ ...sourceSelection, whCause: c })} />{c}</label>
                                                        ))}
                                                    </div>
                                                    {sourceSelection.whCause === 'อื่นๆ' && <input type="text" className="border-b border-slate-400 outline-none text-sm w-full mt-1" placeholder="ระบุ..." value={sourceSelection.whOtherText} onChange={e => setSourceSelection({ ...sourceSelection, whOtherText: e.target.value })} />}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {sourceSelection.category === 'Transport' && (
                                        <div className="space-y-3 animate-fade-in bg-white p-3 rounded border border-slate-200">
                                            <div className="flex gap-4 mb-2 text-sm font-bold text-slate-700">
                                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="transType" checked={sourceSelection.transType === 'Company'} onChange={() => setSourceSelection({ ...sourceSelection, transType: 'Company' })} /> พนักงานขับรถบริษัท</label>
                                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="transType" checked={sourceSelection.transType === 'Joint'} onChange={() => setSourceSelection({ ...sourceSelection, transType: 'Joint' })} /> รถขนส่งร่วม</label>
                                            </div>
                                            {sourceSelection.transType && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <input type="text" placeholder="ชื่อพนักงาน/คนขับ" className="border p-1.5 rounded text-sm" value={sourceSelection.transName} onChange={e => setSourceSelection({ ...sourceSelection, transName: e.target.value })} />
                                                    <input type="text" placeholder="ทะเบียนรถ" className="border p-1.5 rounded text-sm" value={sourceSelection.transPlate} onChange={e => setSourceSelection({ ...sourceSelection, transPlate: e.target.value })} />
                                                    <input type="text" placeholder="ประเภทรถ" className="border p-1.5 rounded text-sm" value={sourceSelection.transVehicleType} onChange={e => setSourceSelection({ ...sourceSelection, transVehicleType: e.target.value })} />
                                                    <input type="text" placeholder="สังกัด (สาขา/หน่วยงาน)" className="border p-1.5 rounded text-sm" value={sourceSelection.transAffiliation} onChange={e => setSourceSelection({ ...sourceSelection, transAffiliation: e.target.value })} />
                                                    {sourceSelection.transType === 'Joint' && (
                                                        <input type="text" placeholder="บริษัท (Company)" className="border p-1.5 rounded text-sm md:col-span-2" value={sourceSelection.transCompany} onChange={e => setSourceSelection({ ...sourceSelection, transCompany: e.target.value })} />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {sourceSelection.category === 'Other' && (
                                        <div className="animate-fade-in">
                                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="ระบุรายละเอียดอื่นๆ..." value={sourceSelection.otherText} onChange={e => setSourceSelection({ ...sourceSelection, otherText: e.target.value })} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2 bg-slate-50 shrink-0">
                            <button onClick={() => setShowItemModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">ยกเลิก</button>
                            <button onClick={() => handleAddItem(false)} className="px-4 py-2 border border-blue-600 text-blue-600 font-bold rounded hover:bg-blue-50">บันทึก & เพิ่มต่อ</button>
                            <button onClick={() => handleAddItem(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">บันทึก & ปิด</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                <HelpCircle className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-slate-800">ยืนยันการบันทึกข้อมูล</h3>
                        <p className="text-sm text-slate-500 mb-6">คุณต้องการบันทึกข้อมูล NCR นี้เข้าระบบใช่หรือไม่?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">ยกเลิก</button>
                            <button onClick={executeSave} disabled={isSaving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2">
                                {isSaving && <Loader className="w-4 h-4 animate-spin" />}
                                ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Modal */}
            {showResultModal && saveResult && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <div className="flex justify-center mb-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${saveResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                                {saveResult.success ? <CheckCircle className="w-8 h-8 text-green-600" /> : <XCircle className="w-8 h-8 text-red-600" />}
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-slate-800">{saveResult.success ? 'บันทึกสำเร็จ!' : 'เกิดข้อผิดพลาด'}</h3>
                        <div className="text-sm text-slate-500 mb-6 whitespace-pre-wrap">
                            {saveResult.message}
                            {saveResult.success && saveResult.ncrNo && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                    <div className="text-xs text-blue-500 uppercase font-semibold">เลขที่เอกสาร (NCR No.)</div>
                                    <div className="text-xl font-bold text-blue-700">{saveResult.ncrNo}</div>
                                </div>
                            )}
                        </div>
                        <button onClick={handleCloseResultModal} className={`w-full py-2 text-white rounded-lg font-bold shadow-sm ${saveResult.success ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>ตกลง</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NCRSystem;

