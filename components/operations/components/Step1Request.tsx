import React, { useState } from 'react';
import { FileText, PlusCircle, Save, Trash2, Package, Truck } from 'lucide-react';
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

type DocumentType = 'NCR';

export const Step1Request: React.FC<Step1RequestProps> = ({
    formData, requestItems, isCustomBranch,
    uniqueCustomers, uniqueDestinations, uniqueFounders, uniqueProductCodes, uniqueProductNames,
    initialData,
    setFormData, setIsCustomBranch, setRequestItems,
    handleAddItem, handleRemoveItem, handleImageUpload, handleRemoveImage, handleRequestSubmit
}) => {
    // Fixed to 'NCR' mode
    const [docType] = useState<DocumentType>('NCR');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Preliminary Decision Modal State
    const [showDecisionModal, setShowDecisionModal] = useState(false);
    const [pendingItemData, setPendingItemData] = useState<Partial<ReturnRecord> | null>(null);

    // Sync docType to formData CONSTANTLY to be safe, though initial logic might handle it.
    React.useEffect(() => {
        setFormData(prev => ({ ...prev, documentType: 'NCR' }));
    }, [setFormData]);


    // Analysis Modal State (NCR Only)
    const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [editingItemData, setEditingItemData] = useState<Partial<ReturnRecord> | null>(null);

    // --- Helper Functions ---

    const updateField = (field: keyof ReturnRecord, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCheckboxToggle = (field: keyof ReturnRecord, resetFields: (keyof ReturnRecord)[] = []) => {
        setFormData(prev => {
            const isChecked = prev[field] as boolean;
            const newState: Partial<ReturnRecord> = { [field]: !isChecked };

            if (!isChecked && resetFields.length > 0) {
                resetFields.forEach(f => (newState as any)[f] = false);
            }
            return { ...prev, ...newState };
        });
    };

    const onAddItemClick = (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();

        // NCR Validation
        // Founder validation removed as requested. Only Quantity is required.
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

    // Handle Preliminary Decision Confirmation
    const handleDecisionConfirm = (decision: string, route?: string) => {
        if (pendingItemData) {
            const itemWithDecision = {
                ...pendingItemData,
                preliminaryDecision: decision as 'Return' | 'Sell' | 'Scrap' | 'Internal' | 'Claim',
                preliminaryRoute: route || ''
            };
            handleAddItem(null, itemWithDecision);
            setPendingItemData(null);
        }
        setShowDecisionModal(false);
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

            <div className="h-full overflow-auto p-6">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

                    {/* Header Info - Simplified for NCR Only */}
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">
                                1. ใบแจ้งคืนสินค้า (NCR / Return Request)
                            </h3>
                            <p className="text-sm text-slate-500">
                                สร้างเอกสาร NCR เพื่อแจ้งปัญหาคุณภาพและวิเคราะห์สาเหตุ
                            </p>
                        </div>
                        {initialData?.ncrNumber && <div className="ml-auto bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">Ref NCR: {initialData.ncrNumber}</div>}
                    </div>

                    <form onSubmit={onAddItemClick} className="space-y-6">

                        {/* --- NCR FORM FIELDS --- */}
                        <HeaderSection
                            formData={formData}
                            updateField={updateField}
                            isCustomBranch={isCustomBranch}
                            setIsCustomBranch={setIsCustomBranch}
                        />
                        <FounderInfoSection
                            formData={formData}
                            updateField={updateField}
                            uniqueCustomers={uniqueCustomers}
                            uniqueDestinations={uniqueDestinations}
                            uniqueFounders={uniqueFounders}
                        />
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h4 className="flex items-center gap-2 font-bold text-slate-800">
                                    <Package className="w-5 h-5 text-indigo-500" /> ข้อมูลสินค้า (Item Details - NCR)
                                </h4>
                                <div className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                                    รายการที่ {requestItems.length + 1}
                                </div>
                            </div>

                            <div className="p-6 bg-white space-y-6">
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
                                <ActionSection
                                    formData={formData}
                                    updateField={updateField}
                                    handleCheckboxToggle={handleCheckboxToggle}
                                />
                            </div>
                        </div>
                        <RootCauseSection
                            formData={formData}
                            updateField={updateField}
                            handleCheckboxToggle={handleCheckboxToggle}
                        />
                        <CostSection
                            formData={formData}
                            updateField={updateField}
                        />

                        {/* Add Button for NCR */}
                        <div className="flex justify-center mt-8 mb-4 py-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            <button type="submit" className="w-full md:w-2/3 px-6 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95">
                                <PlusCircle className="w-6 h-6" /> เพิ่มรายการสินค้าลงตาราง (Add Item)
                            </button>
                        </div>

                        {/* Items List */}
                        {requestItems.length > 0 && (
                            <ItemsTable
                                requestItems={requestItems}
                                handleRemoveItem={handleRemoveItem}
                                handleAnalyzeClick={handleAnalyzeClick}
                            />
                        )}

                        {/* Submit Button */}
                        <div className="flex justify-end items-center pt-4 border-t border-slate-100 mt-6">
                            <button type="button" onClick={onSaveClick} className="px-8 py-3 rounded-xl text-white font-bold shadow-lg flex items-center gap-2 transform hover:scale-105 transition-all bg-indigo-600 hover:bg-indigo-700">
                                <Save className="w-5 h-5" /> บันทึกเอกสาร NCR (Save)
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Preliminary Decision Modal */}
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
