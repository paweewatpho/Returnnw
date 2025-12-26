import React, { useState } from 'react';
import { FileText, PlusCircle, Save, Package, AlertTriangle, User, Calculator, CheckCircle, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { ReturnRecord } from '../../../types';
import { ConfirmSubmitModal } from './ConfirmSubmitModal';
import { ItemAnalysisModal } from './ItemAnalysisModal';
import { PreliminaryDecisionModal } from './PreliminaryDecisionModal';
import Swal from 'sweetalert2';

// Sub-components for NCR Form
import { HeaderSection } from './sections/HeaderSection';
import { FounderInfoSection } from './sections/FounderInfoSection';
import { ProductFormSection } from './sections/ProductFormSection';
import { ProblemDetailsSection } from './sections/ProblemDetailsSection';
import { ActionSection } from './sections/ActionSection';
import { RootCauseSection } from './sections/RootCauseSection';
import { CostSection } from './sections/CostSection';
import { ItemsTable } from './sections/ItemsTable';

interface Step1RequestProps {
    formData: Partial<ReturnRecord>;
    requestItems: Partial<ReturnRecord>[];
    isCustomBranch: boolean;
    uniqueCustomers: string[];
    uniqueDestinations: string[];
    uniqueFounders: string[];
    uniqueProductCodes: string[];
    uniqueProductNames: string[];
    initialData?: Partial<ReturnRecord> | null;
    setFormData: React.Dispatch<React.SetStateAction<Partial<ReturnRecord>>>;
    setIsCustomBranch: (val: boolean) => void;
    setRequestItems: React.Dispatch<React.SetStateAction<Partial<ReturnRecord>[]>>;
    handleAddItem: (e: React.FormEvent | null, overrideData?: Partial<ReturnRecord>) => void;
    handleRemoveItem: (index: number) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveImage: (index: number) => void;
    handleRequestSubmit: () => void;
}



export const Step1Request: React.FC<Step1RequestProps> = ({
    formData, requestItems, isCustomBranch,
    uniqueCustomers, uniqueDestinations, uniqueFounders, uniqueProductCodes, uniqueProductNames,
    initialData,
    setFormData, setIsCustomBranch, setRequestItems,
    handleAddItem, handleRemoveItem, handleImageUpload, handleRemoveImage, handleRequestSubmit
}) => {
    // Fixed to 'NCR' mode

    // --- Restored Helper State & Functions ---
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showPreview, setShowPreview] = useState(false);


    // Preliminary Decision Modal State
    const [showDecisionModal, setShowDecisionModal] = useState(false);
    const [pendingItemData, setPendingItemData] = useState<Partial<ReturnRecord> | null>(null);

    // Analysis Modal State (NCR Only)
    const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [editingItemData, setEditingItemData] = useState<Partial<ReturnRecord> | null>(null);

    // Sync docType to formData CONSTANTLY
    React.useEffect(() => {
        setFormData(prev => ({ ...prev, documentType: 'NCR' }));
    }, [setFormData]);

    // --- Helper Functions ---

    const updateField = (field: keyof ReturnRecord, value: ReturnRecord[keyof ReturnRecord]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCheckboxToggle = (field: keyof ReturnRecord, resetFields: (keyof ReturnRecord)[] = []) => {
        setFormData(prev => {
            const isChecked = prev[field] as boolean;
            const newState: Partial<ReturnRecord> = { [field]: !isChecked };

            if (!isChecked && resetFields.length > 0) {
                resetFields.forEach(f => (newState as Record<string, unknown>)[f] = false);
            }
            return { ...prev, ...newState };
        });
    };

    const onAddItemClick = (e: React.FormEvent | React.MouseEvent) => {
        if (e) e.preventDefault();

        // NCR Validation
        if (!formData.quantity || formData.quantity <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ถูกต้อง',
                text: 'กรุณาระบุจำนวนสินค้าให้ถูกต้อง (> 0)'
            });
            return;
        }

        // เก็บข้อมูลชั่วคราวและเปิด Modal เลือกการตัดสินใจเบื้องต้น
        setPendingItemData(formData);
        setShowDecisionModal(true);
    };

    const onSaveClick = () => {
        if (requestItems.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่มีรายการสินค้า',
                text: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ'
            });
            return;
        }

        // Check if form data is lingering
        if (formData.productName || formData.productCode) {
            Swal.fire({
                icon: 'warning',
                title: 'มีข้อมูลค้างอยู่',
                text: "คุณมีข้อมูลที่กรอกค้างอยู่ กรุณากดปุ่ม 'เพิ่มรายการ' หรือลบข้อมูลออกก่อน"
            });
            return;
        }

        // Detailed Validation
        const incompleteItems = requestItems.filter(item => !item.problemAnalysis);
        if (incompleteItems.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: `ไม่สามารถยืนยันได้: มีรายการที่ยังไม่ได้ระบุสาเหตุปัญหา (Problem Source) จำนวน ${incompleteItems.length} รายการ`
            });
            return;
        }

        setShowConfirmModal(true);
    };

    // Modal Handlers (NCR)
    const handleAnalyzeClick = (index: number) => {
        setEditingItemIndex(index);
        setEditingItemData(requestItems[index]);
        setAnalysisModalOpen(true);
    };

    const handleSaveAnalysis = (updatedItem: Partial<ReturnRecord>) => {
        if (editingItemIndex !== null) {
            setRequestItems(prev => {
                const newList = [...prev];
                newList[editingItemIndex] = updatedItem;
                return newList;
            });
        }
        setAnalysisModalOpen(false);
        setEditingItemIndex(null);
        setEditingItemData(null);
    };

    // --- Wizard State ---
    const [currentStep, setCurrentStep] = useState(1);
    const TOTAL_STEPS = 5;

    // --- Steps Definition ---
    const STEPS = [
        { id: 1, title: 'การตั้งเรื่อง', sub: 'หน่วยงาน & วันที่', icon: FileText },
        { id: 2, title: 'ข้อมูลอ้างอิง', sub: 'ลูกค้า & ผู้แจ้ง', icon: User }, // Previously Header Info
        { id: 3, title: 'วิเคราะห์ปัญหา', sub: 'สินค้า & สาเหตุ', icon: AlertTriangle },
        { id: 4, title: 'การจัดการ', sub: 'แก้ไข & ค่าใช้จ่าย', icon: Calculator },
        { id: 5, title: 'สรุปรายการ', sub: 'ตรวจสอบ & ยืนยัน', icon: CheckCircle },
    ];

    // Helper to validate steps
    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                if (!formData.date || !formData.branch) {
                    Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'ระบุวันที่และสาขาให้ครบถ้วน' });
                    return false;
                }
                return true;
            case 2:
                if (!formData.customerName) {
                    Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'ระบุชื่อลูกค้า' });
                    return false;
                }
                return true;
            case 3: {
                if (!formData.quantity || formData.quantity <= 0) {
                    Swal.fire({ icon: 'error', title: 'ข้อมูลไม่ถูกต้อง', text: 'ระบุจำนวนสินค้า > 0' });
                    return false;
                }
                if (!formData.productName && !formData.productCode) {
                    Swal.fire({ icon: 'error', title: 'ข้อมูลไม่ถูกต้อง', text: 'ระบุสินค้า' });
                    return false;
                }
                // Check if problem selected
                const hasProblem = formData.problemDamaged || formData.problemDamagedInBox || formData.problemLost || formData.problemMixed ||
                    formData.problemWrongInv || formData.problemLate || formData.problemDuplicate || formData.problemWrong ||
                    formData.problemIncomplete || formData.problemOver || formData.problemWrongInfo || formData.problemShortExpiry ||
                    formData.problemTransportDamage || formData.problemAccident || formData.problemPOExpired || formData.problemNoBarcode ||
                    formData.problemNotOrdered || formData.problemOther;

                if (!hasProblem) {
                    Swal.fire({ icon: 'error', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณาเลือกปัญหาที่พบอย่างน้อย 1 รายการ' });
                    return false;
                }
                if (!formData.problemAnalysis) {
                    Swal.fire({ icon: 'error', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณาระบุแหล่งที่มาของปัญหา (Problem Source)' });
                    return false;
                }
                return true;
            }
            case 4:
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (currentStep === 4) {
            // Special case for Step 4 -> 5: This acts as "Add Item"
            onAddItemClick({ preventDefault: () => { } } as React.FormEvent);
        } else {
            if (validateStep(currentStep)) {
                setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
            }
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const jumpToStep = (step: number) => {
        if (step < currentStep) {
            setCurrentStep(step); // Allow going back freely
        } else {
            // To go forward, must validate current
            if (validateStep(currentStep)) setCurrentStep(step);
        }
    };

    // Override handleDecisionConfirm to advance step
    const handleDecisionConfirm = (decision: string, route?: string, settlementData?: { isFieldSettled?: boolean; amount?: number; evidence?: string; name?: string; position?: string; }) => {
        if (pendingItemData) {
            const itemWithDecision = {
                ...pendingItemData,
                preliminaryDecision: decision as 'Return' | 'Sell' | 'Scrap' | 'Internal' | 'Claim',
                preliminaryRoute: route || '',
                isFieldSettled: settlementData?.isFieldSettled || false,
                fieldSettlementAmount: settlementData?.amount || 0,
                fieldSettlementEvidence: settlementData?.evidence || '',
                fieldSettlementName: settlementData?.name || '',
                fieldSettlementPosition: settlementData?.position || ''
            };
            handleAddItem(null, itemWithDecision);
            setPendingItemData(null);

            // SUCCESS: Move to Step 5
            setCurrentStep(5);
        }
        setShowDecisionModal(false);
    };


    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-4">
                            <p className="font-bold text-indigo-700">Step 1: การตั้งเรื่อง (Initiation)</p>
                            <p className="text-sm text-indigo-600">ระบุหน่วยงานปลายทางและวันที่แจ้งเรื่อง</p>
                        </div>
                        <HeaderSection
                            formData={formData}
                            updateField={updateField}
                            isCustomBranch={isCustomBranch}
                            setIsCustomBranch={setIsCustomBranch}
                        />
                    </div>
                );
            case 2:
                return (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                            <p className="font-bold text-blue-700">Step 2: ข้อมูลเบื้องต้น (Header Info)</p>
                            <p className="text-sm text-blue-600">ระบุลูกค้า ผู้แจ้ง และสถานที่รับสินค้า</p>
                        </div>
                        <FounderInfoSection
                            formData={formData}
                            updateField={updateField}
                            uniqueCustomers={uniqueCustomers}
                            uniqueDestinations={uniqueDestinations}
                            uniqueFounders={uniqueFounders}
                        />
                    </div>
                );
            case 3:
                return (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-orange-700">Step 3: วิเคราะห์ปัญหา (Analysis)</p>
                                <p className="text-sm text-orange-600">ระบุสินค้าและปัญหาที่พบอย่างละเอียด</p>
                            </div>
                            <div className="text-xs bg-white px-2 py-1 rounded shadow-sm text-orange-500 border border-orange-200">
                                รายการที่ {requestItems.length + 1}
                            </div>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm p-6 bg-white space-y-6">
                            <ProductFormSection
                                formData={formData}
                                updateField={updateField}
                                uniqueProductCodes={uniqueProductCodes}
                                uniqueProductNames={uniqueProductNames}
                            />
                            <ProblemDetailsSection
                                formData={formData}
                                updateField={updateField}
                                handleCheckboxToggle={handleCheckboxToggle}
                                handleImageUpload={handleImageUpload}
                                handleRemoveImage={handleRemoveImage}
                            />
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                            <p className="font-bold text-red-700">Step 4: การจัดการ (Action & Cost)</p>
                            <p className="text-sm text-red-600">ระบุการดำเนินการแก้ไขและค่าใช้จ่าย (ถ้ามี)</p>
                        </div>
                        <ActionSection
                            formData={formData}
                            updateField={updateField}
                            handleCheckboxToggle={handleCheckboxToggle}
                        />
                        <RootCauseSection
                            formData={formData}
                            updateField={updateField}
                            handleCheckboxToggle={handleCheckboxToggle}
                        />
                        <CostSection
                            formData={formData}
                            updateField={updateField}
                        />
                    </div>
                );
            case 5:
                return (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-green-700">Step 5: สรุปรากการ (Review)</p>
                                <p className="text-sm text-green-600">ตรวจสอบรายการทั้งหมดก่อนบันทึก</p>
                            </div>
                            <button
                                onClick={() => setCurrentStep(3)} // Loop back to Add Item
                                className="text-xs flex items-center gap-1 bg-white border border-green-200 text-green-600 px-3 py-1 rounded-full shadow-sm hover:bg-green-50 font-bold"
                            >
                                <PlusCircle className="w-3 h-3" /> เพิ่มรายการอื่น (Add More)
                            </button>
                        </div>

                        {requestItems.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">ยังไม่มีรายการสินค้า</p>
                                <button onClick={() => setCurrentStep(3)} className="mt-2 text-indigo-600 font-bold hover:underline">คลิกเพื่อเพิ่มสินค้า</button>
                            </div>
                        ) : (
                            <ItemsTable
                                requestItems={requestItems}
                                handleRemoveItem={handleRemoveItem}
                                handleAnalyzeClick={handleAnalyzeClick}
                            />
                        )}

                        <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
                            <div className="text-right">
                                <p className="text-sm text-slate-500">จำนวนรายการทั้งหมด: <span className="font-bold text-slate-800">{requestItems.length}</span> รายการ</p>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <ItemAnalysisModal
                isOpen={analysisModalOpen}
                onClose={() => setAnalysisModalOpen(false)}
                item={editingItemData}
                onSave={handleSaveAnalysis}
            />

            <ConfirmSubmitModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={() => { setShowConfirmModal(false); handleRequestSubmit(); }}
                itemCount={requestItems.length}
            />

            <div className="h-full overflow-hidden flex flex-col">
                {/* Wizard Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">1. ใบแจ้งคืนสินค้า (NCR / Return Request)</h3>
                            <p className="text-sm text-slate-500">สร้างเอกสาร NCR แจ้งปัญหาคุณภาพ (Wizard Mode)</p>
                        </div>
                        {initialData?.ncrNumber && <div className="ml-auto bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">Ref: {initialData.ncrNumber}</div>}
                    </div>

                    {/* Stepper Progress */}
                    <div className="flex items-center justify-between relative max-w-4xl mx-auto">
                        {/* Connection Lines */}
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10 transform -translate-y-1/2"></div>
                        <div className={`absolute top-1/2 left-0 h-0.5 bg-indigo-100 -z-10 transform -translate-y-1/2 transition-all duration-300 ${currentStep === 1 ? 'w-0' :
                            currentStep === 2 ? 'w-1/4' :
                                currentStep === 3 ? 'w-2/4' :
                                    currentStep === 4 ? 'w-3/4' :
                                        'w-full'
                            }`}></div>

                        {STEPS.map((step) => {
                            const isActive = currentStep === step.id;
                            const isCompleted = currentStep > step.id;
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => jumpToStep(step.id)}
                                    disabled={!isCompleted && currentStep !== step.id} // Disable future steps unless linear, allow jumping back
                                    className={`relative flex flex-col items-center group focus:outline-none ${isCompleted || isActive ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white
                                         ${isActive ? 'border-indigo-600 text-indigo-600 shadow-lg scale-110' :
                                            isCompleted ? 'border-green-500 bg-green-50 text-green-500' : 'border-slate-200 text-slate-300'}
                                     `}>
                                        {isCompleted ? <CheckCircle className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
                                    </div>
                                    <div className={`mt-2 text-center transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                                        <p className={`text-xs font-bold ${isActive ? 'text-indigo-800' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>{step.title}</p>
                                        <p className="text-[10px] text-slate-400 hidden sm:block">{step.sub}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Wizard Content */}
                <div className="flex-1 overflow-auto bg-slate-50/50 p-4 sm:p-6 pb-24">
                    <div className="max-w-4xl mx-auto">
                        {renderStepContent()}
                    </div>
                </div>

                {/* Wizard Footer (Actions) */}
                <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="max-w-4xl mx-auto flex justify-between items-center">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 1}
                            className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all
                                ${currentStep === 1
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            <ChevronLeft className="w-4 h-4" /> ย้อนกลับ (Back)
                        </button>

                        <div className="flex items-center gap-3">
                            {/* Cancel / Reset Button maybe? */}
                        </div>

                        {currentStep < 5 ? (
                            <button
                                onClick={handleNext}
                                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200 flex items-center gap-2 transition-all transform active:scale-95"
                            >
                                {currentStep === 4 ? (
                                    <>
                                        <PlusCircle className="w-5 h-5" /> เพิ่มรายการ (Add Item)
                                    </>
                                ) : (
                                    <>
                                        ขั้นตอนถัดไป (Next) <ChevronRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowPreview(true)}
                                    disabled={requestItems.length === 0}
                                    title="ตัวอย่างเอกสารก่อนพิมพ์"
                                    className={`px-6 py-2.5 rounded-xl font-bold border flex items-center gap-2 transition-all
                                        ${requestItems.length === 0 ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                                >
                                    <Eye className="w-5 h-5" /> ตัวอย่างก่อนพิมพ์ (Preview)
                                </button>
                                <button
                                    onClick={onSaveClick}
                                    disabled={requestItems.length === 0}
                                    title="บันทึกข้อมูลเข้าระบบ"
                                    className={`px-8 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105
                                        ${requestItems.length === 0
                                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                            : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'}`}
                                >
                                    <Save className="w-5 h-5" /> บันทึก NCR (Save All)
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-200 w-full h-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Eye className="w-5 h-5 text-indigo-600" /> ตัวอย่างเอกสาร (Document Preview)
                            </h3>
                            <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600" title="ปิดหน้าต่าง">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-slate-500/10">
                            {/* A4 Paper Simulation */}
                            <div className="bg-white w-[210mm] min-h-[297mm] shadow-lg p-[10mm] text-slate-800 relative">
                                {/* Header */}
                                <div className="text-center mb-6">
                                    <h1 className="text-xl font-bold">ใบแจ้งคืนสินค้า (Return Request / NCR)</h1>
                                    <p className="text-sm text-slate-500">บริษัท นีโอ สยาม จำกัด</p>
                                </div>

                                {/* Header Info Grid */}
                                <div className="grid grid-cols-2 gap-4 text-sm mb-6 border border-slate-300">
                                    <div className="p-2 border-b border-r border-slate-300"><span className="font-bold">วันที่:</span> {formData.date}</div>
                                    <div className="p-2 border-b border-slate-300"><span className="font-bold">เลขที่เอกสาร:</span> {initialData?.ncrNumber || 'DRAFT'}</div>
                                    <div className="p-2 border-b border-r border-slate-300"><span className="font-bold">เรียน:</span> {formData.toDept}</div>
                                    <div className="p-2 border-b border-slate-300"><span className="font-bold">จากสาขา:</span> {formData.branch}</div>
                                    <div className="p-2 border-r border-slate-300"><span className="font-bold">ลูกค้า:</span> {formData.customerName}</div>
                                    <div className="p-2"><span className="font-bold">ผู้แจ้ง:</span> {formData.founder}</div>
                                </div>

                                {/* Items Table */}
                                <table className="w-full text-xs border-collapse border border-slate-300 mb-6">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="border border-slate-300 p-2 w-10">#</th>
                                            <th className="border border-slate-300 p-2">รหัสสินค้า</th>
                                            <th className="border border-slate-300 p-2">ชื่อสินค้า</th>
                                            <th className="border border-slate-300 p-2 w-20">จำนวน</th>
                                            <th className="border border-slate-300 p-2">ปัญหาที่พบ</th>
                                            <th className="border border-slate-300 p-2">การจัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requestItems.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                                                <td className="border border-slate-300 p-2">{item.productCode}</td>
                                                <td className="border border-slate-300 p-2">{item.productName}</td>
                                                <td className="border border-slate-300 p-2 text-center font-bold">{item.quantity} {item.unit}</td>
                                                <td className="border border-slate-300 p-2">
                                                    <div>{item.problemSource}</div>
                                                    <div className="text-[10px] text-slate-500">{item.problemDetail}</div>
                                                </td>
                                                <td className="border border-slate-300 p-2">
                                                    {item.actionReject && 'ส่งคืน '}
                                                    {item.actionRework && 'แก้ไข '}
                                                    {item.actionScrap && 'ทำลาย '}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Signatures */}
                                <div className="grid grid-cols-3 gap-8 mt-12 text-center text-sm">
                                    <div className="pt-8 border-t border-slate-300">
                                        <p>ผู้แจ้ง (Found By)</p>
                                    </div>
                                    <div className="pt-8 border-t border-slate-300">
                                        <p>ผู้จัดการสาขา (Branch Manager)</p>
                                    </div>
                                    <div className="pt-8 border-t border-slate-300">
                                        <p>ฝ่ายคุณภาพ (QA)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PreliminaryDecisionModal
                isOpen={showDecisionModal}
                onClose={() => {
                    setShowDecisionModal(false);
                    setPendingItemData(null);
                }}
                onConfirm={handleDecisionConfirm}
            />
        </>
    );
};
