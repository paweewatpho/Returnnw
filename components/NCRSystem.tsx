import React, { useState, useEffect, useMemo } from 'react';
import { useData, NCRRecord, NCRItem } from '../DataContext';
import { ReturnRecord } from '../types';
import { Save, Printer, Image as ImageIcon, AlertTriangle, Plus, Trash2, X, Loader, CheckCircle, XCircle, HelpCircle, Download, Lock, PenTool, Truck } from 'lucide-react';
import Swal from 'sweetalert2';
import { RESPONSIBLE_MAPPING } from './operations/utils';
import { LineAutocomplete } from './LineAutocomplete';
import { exportNCRToExcel } from './NCRExcelExport';

const WAREHOUSE_BRANCHES = ['สาย 3', 'นครสวรรค์', 'กำแพงเพชร', 'แม่สอด', 'พิษณุโลก', 'เชียงใหม่', 'EKP ลำปาง', 'คลอง13', 'ประดู่'];
const WAREHOUSE_CAUSES = ['เช็คเกอร์', 'พนักงานลงสินค้า', 'อื่นๆ'];
const REPORTING_BRANCHES = ['สาย 3', 'นครสวรรค์', 'กำแพงเพชร', 'แม่สอด', 'พิษณุโลก', 'เชียงใหม่', 'EKP ลำปาง', 'คลอง13', 'ประดู่'];
const RETURN_ROUTES = ['นครสวรรค์', 'สาย 3', 'Sino Pacific Trading', 'NEO CORPORATE'];

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
    const [newItem, setNewItem] = useState<Partial<NCRItem>>({ branch: '', refNo: '', neoRefNo: '', productCode: '', productName: '', customerName: '', destinationCustomer: '', quantity: 0, unit: '', pricePerUnit: 0, priceBill: 0, expiryDate: '', hasCost: false, costAmount: 0, costResponsible: '', problemSource: '', preliminaryDecision: null, preliminaryRoute: '' });
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

    // Auth Modal State
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authAction, setAuthAction] = useState<'EDIT' | 'DELETE' | null>(null);
    const [authTargetId, setAuthTargetId] = useState<string | null>(null);
    const [authPassword, setAuthPassword] = useState('');

    const handleAuthSubmit = () => {
        if (authPassword !== '1234') {
            Swal.fire({
                icon: 'error',
                title: 'รหัสผ่านไม่ถูกต้อง',
                text: 'กรุณาลองใหม่อีกครั้ง',
                timer: 1500,
                showConfirmButton: false
            });
            return;
        }

        if (authAction === 'DELETE' && authTargetId) {
            setNcrItems(ncrItems.filter(i => i.id !== authTargetId));
        } else if (authAction === 'EDIT' && authTargetId) {
            const item = ncrItems.find(i => i.id === authTargetId);
            if (item) {
                setNewItem(item);
                const remaining = ncrItems.filter(i => i.id !== authTargetId);
                setNcrItems(remaining);
                setShowItemModal(true);
            }
        }

        setShowAuthModal(false);
        setAuthPassword('');
        setAuthAction(null);
        setAuthTargetId(null);
    };

    const confirmDelete = (id: string) => {
        setAuthAction('DELETE');
        setAuthTargetId(id);
        setShowAuthModal(true);
    };

    const confirmEdit = (id: string) => {
        setAuthAction('EDIT');
        setAuthTargetId(id);
        setShowAuthModal(true);
    };

    useEffect(() => {
        if (showItemModal) {
            setSourceSelection({ category: '', whBranch: '', whCause: '', whOtherText: '', transType: '', transName: '', transPlate: '', transVehicleType: '', transAffiliation: '', transCompany: '', otherText: '', problemScenario: '' });
            setIsCustomReportBranch(false);
        }
    }, [showItemModal]);

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
        if (!newItem.productCode || !newItem.branch) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณาระบุรหัสสินค้าและสาขา'
            });
            return;
        }

        // ตรวจสอบเส้นทางส่งคืน (บังคับกรอก)
        if (!newItem.preliminaryRoute) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาระบุเส้นทาง',
                text: 'กรุณาเลือกเส้นทางส่งคืนสินค้า',
                confirmButtonText: 'ตกลง'
            });
            return;
        }


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

        const item: NCRItem = {
            ...newItem as NCRItem,
            id: Date.now().toString(),
            destinationCustomer: newItem.destinationCustomer || '',
            quantity: Number(newItem.quantity) || 0,
            pricePerUnit: Number(newItem.pricePerUnit) || 0,
            priceBill: Number(newItem.priceBill) || 0,
            costAmount: Number(newItem.costAmount) || 0,
            problemSource: finalProblemSource,
            preliminaryDecision: 'Return', // Auto-set to Return
        };
        setNcrItems([...ncrItems, item]);

        // Reset inputs
        setNewItem(prev => ({
            ...prev,
            refNo: '', neoRefNo: '', productCode: '', productName: '', customerName: '', destinationCustomer: '', quantity: 0, unit: '', pricePerUnit: 0, priceBill: 0, expiryDate: '', hasCost: false, costAmount: 0, costResponsible: '', problemSource: '', preliminaryDecision: null, preliminaryRoute: ''
        }));
        setSourceSelection({ category: '', whBranch: '', whCause: '', whOtherText: '', transType: '', transName: '', transPlate: '', transVehicleType: '', transAffiliation: '', transCompany: '', otherText: '', problemScenario: '' });

        if (closeModal) {
            setShowItemModal(false);
        } else {
            Swal.fire({
                icon: 'success',
                title: 'เพิ่มรายการสำเร็จ',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
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
            formData.problemAccident || formData.problemPOExpired || formData.problemNoBarcode || formData.problemNotOrdered || (formData.problemOther && formData.problemOtherText.trim());

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
                    problemDamaged: false, itemDamagedInBox: false, problemLost: false, problemMixed: false, problemWrongInv: false,
                    problemLate: false, problemDuplicate: false, problemWrong: false, problemIncomplete: false,
                    problemOver: false, problemWrongInfo: false, problemShortExpiry: false, problemTransportDamage: false,
                    problemAccident: false, problemPOExpired: false, problemNoBarcode: false, problemNotOrdered: false,
                    problemOther: false,
                    // Note: Manual expansion for 'problemDamagedInBox' check below as I might have missed it in short list above
                    problemDamagedInBox: false,
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

    const handleExportExcel = async () => {
        const errors = validateForm();
        if (errors.length > 0) {
            const result = await Swal.fire({
                title: 'ข้อมูลยังไม่ครบถ้วน',
                html: `คุณต้องการ Export ต่อไปหรือไม่?<br/><br/><ul style="text-align: left; font-size: 0.9em; color: red;">${errors.map(e => `<li>- ${e}</li>`).join('')}</ul>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Export ทั้งที่ข้อมูลไม่ครบ',
                cancelButtonText: 'ยกเลิก'
            });

            if (!result.isConfirmed) {
                return;
            }
        }

        const ncrNos = generatedNCRNumber || "Preview-Draft";
        exportNCRToExcel(formData, ncrItems, ncrNos);
    };

    const handlePrint = () => {
        const errors = validateForm();
        if (errors.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
                html: `<ul style="text-align: left; font-size: 0.9em;">${errors.map(e => `<li>- ${e}</li>`).join('')}</ul>`
            });
            return;
        }
        setIsPrinting(true);
        setShowConfirmModal(true);
    };

    const handleSaveRecord = () => {
        const errors = validateForm();
        if (errors.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
                html: `<ul style="text-align: left; font-size: 0.9em;">${errors.map(e => `<li>- ${e}</li>`).join('')}</ul>`
            });
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
                // BIDIRECTIONAL SYNC: Create Return Record for Operations Hub (Step 2: Consolidation & Logistics)
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
                    documentType: 'NCR', // Required for Step 2 Visibility
                    founder: formData.founder, // Sync Founder to Operations Hub
                    status: 'COL_JobAccepted', // Auto-move to Step 2: Logistics (Was 'Requested')
                    disposition: 'Pending',
                    reason: `Created via NCR System (${formData.problemDetail || 'No Detail'})`,
                    amount: item.priceBill || 0, // Calculated Amount (Total)
                    priceBill: item.priceBill || 0,
                    pricePerUnit: item.pricePerUnit || 0,
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
                    costResponsible: item.costResponsible
                };

                console.log("🔄 Syncing to Operations Hub:", returnRecord);

                const syncSuccess = await addReturnRecord(returnRecord);

                if (!syncSuccess) {
                    console.error("❌ Failed to sync record to Operations Hub", returnRecord);
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Sync Failed',
                        text: `แจ้งเตือน: บันทึก NCR สำเร็จ แต่ไม่สามารถส่งข้อมูลไปยัง Hub ได้ (Item: ${item.productCode})`
                    });
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
            setShowResultModal(true); // Show success immediately

            if (isPrinting) {
                // Wait a moment for the newNcrNo to be rendered in the DOM before printing
                setTimeout(() => {
                    window.print();
                }, 500);
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
                                {ncrItems.length === 0 ? (<tr><td colSpan={7} className="p-4 text-center text-slate-400 italic">ยังไม่มีรายการสินค้า (กดปุ่ม '+ เพิ่มรายการ')</td></tr>) : (ncrItems.map(item => (<tr key={item.id}><td className="p-2 border-r border-black align-top print-border text-sm"><div>{item.branch}</div></td><td className="p-2 border-r border-black align-top print-border"><div>Ref: {item.refNo}</div><div className="text-slate-500">Neo: {item.neoRefNo}</div></td><td className="p-2 border-r border-black align-top print-border"><div className="font-bold">{item.productCode}</div><div className="text-slate-600 font-medium">{item.productName}</div><div className="text-slate-500">{item.customerName}</div>{item.destinationCustomer && (<div className="text-xs text-blue-600 mt-1">ปลายทาง: {item.destinationCustomer}</div>)}</td><td className="p-2 border-r border-black text-center align-top print-border">{item.quantity} {item.unit}</td><td className="p-2 border-r border-black text-right align-top print-border"><div>{item.priceBill.toLocaleString()} บ.</div><div className="text-red-500">Exp: {item.expiryDate}</div></td><td className="p-2 border-r border-black align-top print-border"><div className="font-medium">{item.problemSource}</div>{item.hasCost && (<div className="text-red-600 font-bold mt-1">Cost: {item.costAmount?.toLocaleString()} บ.<div className="text-xs text-slate-500 font-normal">({item.costResponsible})</div></div>)}</td><td className="p-2 text-center align-top print:hidden">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => confirmEdit(item.id)}
                                            className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
                                            title="แก้ไข (Edit)"
                                        >
                                            <PenTool className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(item.id)}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                            title="ลบ (Delete)"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td></tr>)))}
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

            {/* Item Modal */}
            {showItemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600" /> เพิ่มรายการสินค้า (Add Item)</h3>
                            <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                            {/* Branch & Product Code */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">สาขาต้นทาง <span className="text-red-500">*</span></label>
                                    <select className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-slate-50" value={newItem.branch} onChange={e => setNewItem({ ...newItem, branch: e.target.value })}>
                                        <option value="">-- เลือกสาขา --</option>
                                        {WAREHOUSE_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">รหัสสินค้า <span className="text-red-500">*</span></label>
                                        <input type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" value={newItem.productCode} onChange={e => setNewItem({ ...newItem, productCode: e.target.value })} placeholder="Code" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Ref No.</label>
                                        <input type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" value={newItem.refNo} onChange={e => setNewItem({ ...newItem, refNo: e.target.value })} placeholder="Reference" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Neo Ref.</label>
                                        <input type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" value={newItem.neoRefNo} onChange={e => setNewItem({ ...newItem, neoRefNo: e.target.value })} placeholder="Neo Ref" />
                                    </div>
                                </div>
                            </div>

                            {/* Product Name & Customer */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อสินค้า</label>
                                    <input type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" value={newItem.productName} onChange={e => setNewItem({ ...newItem, productName: e.target.value })} placeholder="Product Name" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">ลูกค้า</label>
                                    <input type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" value={newItem.customerName} onChange={e => setNewItem({ ...newItem, customerName: e.target.value })} placeholder="Customer Name" />
                                </div>
                            </div>

                            {/* PRICE LOGIC SECTION */}
                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">จำนวน (Qty)</label>
                                    <div className="flex">
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded-l focus:ring-2 focus:ring-blue-500"
                                            value={newItem.quantity}
                                            onChange={e => {
                                                const qty = parseFloat(e.target.value) || 0;
                                                const price = newItem.pricePerUnit || 0;
                                                setNewItem({ ...newItem, quantity: qty, priceBill: qty * price });
                                            }}
                                        />
                                        <input type="text" className="w-20 p-2 border border-l-0 rounded-r bg-slate-100 text-center text-sm" placeholder="หน่วย" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-blue-700 mb-1">ราคา/หน่วย (Price/Unit)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder="0.00"
                                        value={newItem.pricePerUnit || ''}
                                        onChange={e => {
                                            const price = parseFloat(e.target.value) || 0;
                                            const qty = newItem.quantity || 0;
                                            setNewItem({ ...newItem, pricePerUnit: price, priceBill: qty * price });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">ราคาหน้าบิล (Total Bill)</label>
                                    <input type="number" className="w-full p-2 border bg-slate-100 font-bold text-slate-700 rounded" readOnly value={newItem.priceBill} />
                                </div>
                            </div>

                            {/* Expiry & Destination */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">วันหมดอายุ (Expiry)</label>
                                    <input type="date" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" value={newItem.expiryDate} onChange={e => setNewItem({ ...newItem, expiryDate: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">ลูกค้าปลายทาง (Destination)</label>
                                    <input type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" value={newItem.destinationCustomer} onChange={e => setNewItem({ ...newItem, destinationCustomer: e.target.value })} placeholder="Optional" />
                                </div>
                            </div>

                            {/* Preliminary Decision Section - Return Only */}
                            <div className="space-y-3 pt-4 border-t">
                                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-indigo-600" />
                                    ระบุเส้นทางส่งคืน (Return Route)
                                </h4>
                                <p className="text-xs text-slate-500 mb-3">กรุณาเลือกเส้นทางสำหรับการส่งคืนสินค้า</p>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <label className="block text-sm font-bold text-slate-700 mb-3">เลือกเส้นทางส่งคืน (Select Route) <span className="text-red-500">*</span></label>
                                    <div className="space-y-2">
                                        {RETURN_ROUTES.map(route => (
                                            <label key={route} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 cursor-pointer transition-all">
                                                <input
                                                    type="radio"
                                                    name="ncrRoute"
                                                    value={route}
                                                    checked={newItem.preliminaryRoute === route}
                                                    onChange={(e) => setNewItem({ ...newItem, preliminaryDecision: 'Return', preliminaryRoute: e.target.value })}
                                                    className="w-4 h-4 text-indigo-600"
                                                />
                                                <span className="text-sm font-medium">{route}</span>
                                            </label>
                                        ))}
                                        <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 cursor-pointer transition-all">
                                            <input
                                                type="radio"
                                                name="ncrRoute"
                                                value="Other"
                                                checked={newItem.preliminaryRoute && !RETURN_ROUTES.includes(newItem.preliminaryRoute)}
                                                onChange={() => setNewItem({ ...newItem, preliminaryDecision: 'Return', preliminaryRoute: 'Other' })}
                                                className="w-4 h-4 text-indigo-600"
                                            />
                                            <span className="text-sm font-medium">อื่นๆ (Other)</span>
                                        </label>
                                        {newItem.preliminaryRoute && !RETURN_ROUTES.includes(newItem.preliminaryRoute) && (
                                            <input
                                                type="text"
                                                value={newItem.preliminaryRoute === 'Other' ? '' : newItem.preliminaryRoute}
                                                onChange={(e) => setNewItem({ ...newItem, preliminaryRoute: e.target.value })}
                                                className="w-full p-3 mt-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="ระบุเส้นทาง..."
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t">
                                <h4 className="font-bold text-slate-900 underline">ระบุแหล่งที่มาของปัญหา (Problem Source)</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <label className="flex items-center gap-2 border p-2 rounded hover:bg-slate-50 cursor-pointer">
                                        <input type="radio" name="sourceCat" checked={sourceSelection.category === 'Customer'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'Customer', problemScenario: 'Customer' })} />
                                        ลูกค้าต้นทาง (Source Customer)
                                    </label>
                                    <label className="flex items-center gap-2 border p-2 rounded hover:bg-slate-50 cursor-pointer">
                                        <input type="radio" name="sourceCat" checked={sourceSelection.category === 'DestinationCustomer'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'DestinationCustomer', problemScenario: 'DestinationCustomer' })} />
                                        ลูกค้าปลายทาง (Destination Customer)
                                    </label>
                                    {/* Simplified for now, could be expanded */}
                                    <label className="flex items-center gap-2 border p-2 rounded hover:bg-slate-50 cursor-pointer">
                                        <input type="radio" name="sourceCat" checked={sourceSelection.category === 'Accounting'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'Accounting' })} />
                                        บัญชี (Accounting)
                                    </label>
                                    <label className="flex items-center gap-2 border p-2 rounded hover:bg-slate-50 cursor-pointer">
                                        <input type="radio" name="sourceCat" checked={sourceSelection.category === 'Warehouse'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'Warehouse' })} />
                                        คลังสินค้า (Warehouse)
                                    </label>
                                    <label className="flex items-center gap-2 border p-2 rounded hover:bg-slate-50 cursor-pointer">
                                        <input type="radio" name="sourceCat" checked={sourceSelection.category === 'Transport'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'Transport' })} />
                                        ขนส่ง (Transport)
                                    </label>
                                    <label className="flex items-center gap-2 border p-2 rounded hover:bg-slate-50 cursor-pointer">
                                        <input type="radio" name="sourceCat" checked={sourceSelection.category === 'Other'} onChange={() => setSourceSelection({ ...sourceSelection, category: 'Other' })} />
                                        อื่นๆ (Other)
                                    </label>
                                </div>

                                <div className="p-3 bg-red-50 rounded border border-red-100 flex items-center gap-4">
                                    <label className="flex items-center gap-2 font-bold text-red-700 cursor-pointer">
                                        <input type="checkbox" checked={newItem.hasCost} onChange={e => setNewItem({ ...newItem, hasCost: e.target.checked })} />
                                        มีค่าใช้จ่าย (Cost Charge)
                                    </label>
                                    {newItem.hasCost && (
                                        <div className="flex items-center gap-2">
                                            <input type="number" className="p-1 border text-sm w-32 rounded" placeholder="จำนวนเงิน" value={newItem.costAmount || ''} onChange={e => setNewItem({ ...newItem, costAmount: parseFloat(e.target.value) })} />
                                            <span className="text-sm text-red-600">บาท</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t flex justify-end gap-3 sticky bottom-0 bg-slate-50 z-10">
                            <button onClick={() => setShowItemModal(false)} className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">ยกเลิก</button>
                            <button onClick={() => handleAddItem(true)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transform active:scale-95 transition-all">บันทึกรายการ</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Password Modal */}
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
                                    className="w-full p-2 border border-slate-300 rounded-lg text-lg tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
                                    autoFocus
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
                                    placeholder="Enter password..."
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowAuthModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"> ยกเลิก</button>
                                <button onClick={handleAuthSubmit} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md">ยืนยัน</button>
                            </div>
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
                        <div className="flex gap-2">
                            {saveResult.success && (
                                <button
                                    onClick={() => {
                                        window.print();
                                    }}
                                    className="flex-1 py-2 bg-slate-800 text-white rounded-lg font-bold shadow-sm hover:bg-slate-700 flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-4 h-4" /> พิมพ์เอกสาร
                                </button>
                            )}
                            <button onClick={handleCloseResultModal} className={`flex-1 py-2 text-white rounded-lg font-bold shadow-sm ${saveResult.success ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                {saveResult.success ? 'ปิดหน้าต่าง' : 'ตกลง'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NCRSystem;

