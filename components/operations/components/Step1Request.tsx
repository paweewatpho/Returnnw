import React, { useState } from 'react';
import { FileInput, Package, PlusCircle, Save } from 'lucide-react';
import { ReturnRecord } from '../../../types';
import { ConfirmSubmitModal } from './ConfirmSubmitModal';
import { ItemAnalysisModal } from './ItemAnalysisModal';

// Sub-components
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
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Analysis Modal State
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
        if (!formData.productName || !formData.productCode || !formData.founder) {
            alert("กรุณาระบุชื่อสินค้า, รหัสสินค้า และผู้พบปัญหา (Founder)");
            return;
        }
        if (!formData.quantity || formData.quantity <= 0) {
            alert("กรุณาระบุจำนวนสินค้า");
            return;
        }
        handleAddItem(null, formData);
    };

    const onSaveClick = () => {
        if (requestItems.length === 0) {
            alert("ไม่สามารถยืนยันได้: กรุณาเพิ่มรายการสินค้าเข้าสู่ตารางอย่างน้อย 1 รายการ");
            return;
        }
        if (formData.productName || formData.productCode) {
            alert("ไม่สามารถยืนยันได้: คุณมีข้อมูลที่กรอกค้างอยู่ กรุณากดปุ่ม 'เพิ่มรายการ (Add)' เพื่อนำข้อมูลลงตาราง หรือลบข้อมูลออกก่อน");
            return;
        }

        const incompleteItems = requestItems.filter(item => !item.preliminaryDecision);
        if (incompleteItems.length > 0) {
            alert(`ไม่สามารถยืนยันได้: มีรายการที่ยังไม่ได้วิเคราะห์ ${incompleteItems.length} รายการ กรุณากดปุ่ม 'วิเคราะห์/แก้ไข' และระบุข้อมูลให้ครบถ้วน`);
            return;
        }

        setShowConfirmModal(true);
    };

    // Modal Handlers
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
                    {/* Page Header */}
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileInput className="w-6 h-6" /></div>
                        <div><h3 className="text-xl font-bold text-slate-800">1. แจ้งคืนสินค้า (Return Request)</h3><p className="text-sm text-slate-500">สำหรับสาขา: กรอกข้อมูลสินค้าที่ต้องการส่งคืนเพื่อสร้างคำขอเข้าระบบ</p></div>
                        {initialData?.ncrNumber && <div className="ml-auto bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">Auto-filled from NCR: {initialData.ncrNumber}</div>}
                    </div>

                    <form onSubmit={onAddItemClick} className="space-y-6">

                        {/* 1. Header Section */}
                        <HeaderSection
                            formData={formData}
                            updateField={updateField}
                            isCustomBranch={isCustomBranch}
                            setIsCustomBranch={setIsCustomBranch}
                        />

                        {/* 2. Founder / Header Info */}
                        <FounderInfoSection
                            formData={formData}
                            updateField={updateField}
                            uniqueCustomers={uniqueCustomers}
                            uniqueDestinations={uniqueDestinations}
                            uniqueFounders={uniqueFounders}
                        />

                        {/* 3. Product Entry Form */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h4 className="flex items-center gap-2 font-bold text-slate-800">
                                    <Package className="w-5 h-5 text-indigo-500" /> ข้อมูลสินค้า (Item Details)
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

                        {/* 4. Root Cause */}
                        <RootCauseSection
                            formData={formData}
                            updateField={updateField}
                            handleCheckboxToggle={handleCheckboxToggle}
                        />

                        {/* 5. Cost Tracking */}
                        <CostSection
                            formData={formData}
                            updateField={updateField}
                        />

                        {/* Add Button */}
                        <div className="flex justify-center mt-8 mb-4 py-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            <button
                                type="submit"
                                className="w-full md:w-2/3 px-6 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <PlusCircle className="w-6 h-6" />
                                เพิ่มรายการสินค้าลงตาราง (Add Item to List)
                            </button>
                        </div>

                        {/* 6. Items List */}
                        {requestItems.length > 0 && (
                            <ItemsTable
                                requestItems={requestItems}
                                handleRemoveItem={handleRemoveItem}
                                handleAnalyzeClick={handleAnalyzeClick}
                            />
                        )}

                        {/* Submit All Button */}
                        <div className="flex justify-end items-center pt-4 border-t border-slate-100 mt-6">
                            <button type="button" onClick={onSaveClick} className="px-6 py-2.5 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 shadow-md flex items-center gap-2">
                                <Save className="w-4 h-4" /> ยืนยันข้อมูลทั้งหมด ({requestItems.length}) รายการ
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};
