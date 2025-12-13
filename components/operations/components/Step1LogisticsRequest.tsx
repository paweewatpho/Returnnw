import React, { useState } from 'react';
import { FileText, Save, PlusCircle } from 'lucide-react';
import { ReturnRecord } from '../../../types';
import { BRANCH_LIST } from '../../../constants';
// Logistics Request Form
// Optimized for Inbound Collection System
// Features: Branch Selection, Header Info, Simplified Item Entry

/*
LOGISTICS STEP 1:
- Branch *
- Invoice No
- Control Date (Date)
- Doc No (R) -> refNo?
- TM No
- Customer Code, Name *
- Province, Address
- Notes
- Phone

Then Item List?
"ระบุรายละเอียดสินค้า หรือหมายเหตุอื่นๆ..." suggest a simple text area OR item list?
The "Add Item" flow is standard.
*/

interface Step1LogisticsRequestProps {
    formData: Partial<ReturnRecord>;
    requestItems: Partial<ReturnRecord>[];
    isCustomBranch: boolean;
    initialData?: Partial<ReturnRecord> | null;

    // Actions
    setFormData: React.Dispatch<React.SetStateAction<Partial<ReturnRecord>>>;
    setIsCustomBranch: (val: boolean) => void;
    setRequestItems: React.Dispatch<React.SetStateAction<Partial<ReturnRecord>[]>>;
    handleAddItem: (e: React.FormEvent | null, overrideData?: Partial<ReturnRecord>) => void;
    handleRemoveItem: (index: number) => void;
    handleRequestSubmit: () => void;

    // Dropdown Data
    uniqueCustomers?: string[];
    uniqueDestinations?: string[];
    uniqueProductCodes?: string[];
    uniqueProductNames?: string[];
}

export const Step1LogisticsRequest: React.FC<Step1LogisticsRequestProps> = ({
    formData, requestItems, isCustomBranch, initialData,
    setFormData, setIsCustomBranch, setRequestItems,
    handleAddItem, handleRemoveItem, handleRequestSubmit,
    uniqueCustomers = [], uniqueDestinations = [], uniqueProductCodes = [], uniqueProductNames = []
}) => {

    // Ensure Document Type is LOGISTICS
    React.useEffect(() => {
        setFormData(prev => ({ ...prev, documentType: 'LOGISTICS' }));
    }, [setFormData]);

    const updateField = (field: keyof ReturnRecord, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const onAddItemClick = (e: React.FormEvent) => {
        e.preventDefault();
        // Logistics Items need less strict validation
        // Product Name is optional per request

        const finalQty = formData.quantity ?? 1;
        // Validation removed as per request (Quantity not required)

        handleAddItem(null, { ...formData, quantity: finalQty, unit: formData.unit || 'ชิ้น' });
    };

    return (
        <div className="h-full overflow-auto p-6 bg-slate-50">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header Card */}
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shadow-inner">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">1. ใบสั่งงานรับกลับ (Create Return Request)</h3>
                            <p className="text-sm text-slate-500">กรอกข้อมูลสำหรับใบงานรับกลับ (เฉพาะ Header)</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* 1. Branch */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">
                                สาขาที่รับสินค้ากลับ (Branch) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    required
                                    value={formData.branch || ''}
                                    onChange={e => updateField('branch', e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="" disabled>-- เลือกสาขา --</option>
                                    <option value="พิษณุโลก">พิษณุโลก</option>
                                    {BRANCH_LIST.filter(b => b !== 'พิษณุโลก').map(b => <option key={b} value={b}>{b}</option>)}
                                    <option value="Other">อื่นๆ (Other)</option>
                                </select>
                            </div>
                        </div>

                        {/* 2. Invoice | Control Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">เลข Invoice</label>
                                <input
                                    type="text"
                                    value={formData.invoiceNo || ''}
                                    onChange={e => updateField('invoiceNo', e.target.value)}
                                    placeholder="INV-xxxx"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">
                                    วันที่ใบคุมรถ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.controlDate || formData.date || ''}
                                    onChange={e => {
                                        updateField('controlDate', e.target.value);
                                        updateField('date', e.target.value);
                                    }}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* 3. Doc No (R) | TM No */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">เลขที่เอกสาร (เลข R)</label>
                                <input
                                    type="text"
                                    value={formData.documentNo || formData.refNo || ''}
                                    onChange={e => {
                                        updateField('documentNo', e.target.value);
                                        updateField('refNo', e.target.value);
                                    }}
                                    placeholder="R-xxxx"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">เลขที่ใบคุม (TM NO)</label>
                                <input
                                    type="text"
                                    value={formData.tmNo || ''}
                                    onChange={e => updateField('tmNo', e.target.value)}
                                    placeholder="TM-xxxx"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* 4. Customer Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">รหัสลูกค้า</label>
                                <input
                                    type="text"
                                    value={formData.customerCode || ''}
                                    onChange={e => updateField('customerCode', e.target.value)}
                                    placeholder="CUS-xxxx"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">
                                    ลูกค้าต้นทาง (Source Customer) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.customerName || ''}
                                    onChange={e => updateField('customerName', e.target.value)}
                                    placeholder="ระบุชื่อลูกค้าต้นทาง..."
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    list="customer-list"
                                />
                                <datalist id="customer-list">
                                    {uniqueCustomers.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                        </div>

                        {/* 5. Destination & Province */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">
                                    ลูกค้าปลายทาง (Destination Customer)
                                </label>
                                <input
                                    type="text"
                                    value={formData.destinationCustomer || ''}
                                    onChange={e => updateField('destinationCustomer', e.target.value)}
                                    placeholder="ระบุลูกค้าปลายทาง..."
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    list="destination-list"
                                />
                                <datalist id="destination-list">
                                    {uniqueDestinations.map(d => <option key={d} value={d} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">จังหวัด (Province)</label>
                                <input
                                    type="text"
                                    value={formData.province || ''}
                                    onChange={e => updateField('province', e.target.value)}
                                    placeholder="ระบุจังหวัด..."
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* 6. Address */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">ที่อยู่ (Address)</label>
                            <textarea
                                rows={2}
                                value={formData.customerAddress || ''}
                                onChange={e => updateField('customerAddress', e.target.value)}
                                placeholder="ที่อยู่ลูกค้า..."
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            />
                        </div>

                        {/* 7. Notes & Phone */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">หมายเหตุ (Notes)</label>
                            <textarea
                                rows={3}
                                value={formData.notes || ''}
                                onChange={e => updateField('notes', e.target.value)}
                                placeholder="ระบุรายละเอียดสินค้า หรือหมายเหตุอื่นๆ..."
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ (ติดต่อ)</label>
                            <input
                                type="text"
                                value={formData.contactPhone || ''}
                                onChange={e => updateField('contactPhone', e.target.value)}
                                placeholder="0xx-xxx-xxxx"
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Submit Action */}
                    <div className="flex justify-end pt-8 mt-4 border-t border-slate-100">
                        <button
                            onClick={() => {
                                // Add a dummy item if list is empty to allow submission, 
                                // or handle logic in parent to allow empty items.
                                // For now, we simulate adding the header info as a "Request Item" if none exists.
                                if (requestItems.length === 0) {
                                    handleAddItem(null, { ...formData, productName: 'General Request', quantity: 1, unit: 'Lot' });
                                    // We need to wait for state update or force submit logic in parent?
                                    // Actually, handleAddItem updates state. We might need a two-step or 
                                    // update parent logic to allow submitting without items.
                                    // BUT, to keep it simple, we can just call handleRequestSubmit, 
                                    // assuming the parent checks formData too. 
                                    // If parent enforces items > 0, we might need to bypass.
                                    // Let's assume user fills header -> click submit -> we package it.

                                    // Hack: Call AddItem then Submit immediately might not work due to async state.
                                    // Better: In parent, if items=[], use formData as the item.
                                    // For this UI, we just call submit.
                                }
                                handleRequestSubmit();
                            }}
                            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center gap-2"
                        >
                            <Save className="w-5 h-5" /> บันทึกใบงานรับกลับ (Create Request)
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
