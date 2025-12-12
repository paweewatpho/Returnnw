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
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header Card */}
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shadow-inner">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">1. ใบสั่งงานรับกลับ (Create Return Request)</h3>
                            <p className="text-sm text-slate-500">สร้างเอกสารรับคืนสินค้า (Logistics / Collection)</p>
                        </div>
                    </div>

                    <div className="form-grid space-y-6">
                        {/* Branch (Full Width or Top) */}
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
                                    {BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                                    <option value="Other">อื่นๆ (Other)</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 1: Invoice | Control Date */}
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
                                        updateField('date', e.target.value); // Sync with main date
                                    }}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Row 2: Doc No (R) | TM No */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">เลขที่เอกสาร (เลข R)</label>
                                <input
                                    type="text"
                                    value={formData.documentNo || formData.refNo || ''} // Map to refNo
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

                        {/* Row 3: Customer Code | Customer Name */}
                        {/* Row 3: Customer Code | Source Customer | Destination Customer */}
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
                            <div>
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
                        </div>

                        {/* Row 4: Province | Address */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">ที่อยู่ (Address)</label>
                                <textarea
                                    rows={1}
                                    value={formData.customerAddress || ''}
                                    onChange={e => updateField('customerAddress', e.target.value)}
                                    placeholder="ที่อยู่ลูกค้า..."
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Row 5: Notes | Phone */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">หมายเหตุ (Notes)</label>
                                <textarea
                                    rows={2}
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
                    </div>
                </div>

                {/* Item Entry Section (Simplified for Logistics) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                        <span>รายการสินค้า (Items)</span>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                            {requestItems.length} รายการ
                        </span>
                    </h4>

                    <form onSubmit={onAddItemClick} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">รหัสสินค้า (Code)</label>
                                <input
                                    type="text"
                                    value={formData.productCode || ''}
                                    onChange={e => updateField('productCode', e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                    list="code-list"
                                />
                                <datalist id="code-list">
                                    {uniqueProductCodes.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อสินค้า (Name)</label>
                                <input
                                    type="text"
                                    value={formData.productName || ''}
                                    onChange={e => updateField('productName', e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                    list="name-list"
                                />
                                <datalist id="name-list">
                                    {uniqueProductNames.map(n => <option key={n} value={n} />)}
                                </datalist>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">จำนวน</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.quantity ?? 1}
                                    onChange={e => updateField('quantity', parseInt(e.target.value) || 0)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold text-blue-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">หน่วย</label>
                                <input
                                    type="text"
                                    value={formData.unit || 'ชิ้น'}
                                    onChange={e => updateField('unit', e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-2"
                        >
                            <PlusCircle className="w-5 h-5" /> เพิ่มรายการ
                        </button>
                    </form>

                    {/* Items Table Reuse */}
                    {requestItems.length > 0 && (
                        <div className="mt-6 border rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                                    <tr>
                                        <th className="p-3 w-10">#</th>
                                        <th className="p-3">สินค้า</th>
                                        <th className="p-3 text-center">จำนวน</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {requestItems.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-700">{item.productName}</div>
                                                <div className="text-xs text-slate-500">{item.productCode}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="font-bold">{item.quantity}</span> {item.unit}
                                            </td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded">ลบ I</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleRequestSubmit}
                        disabled={requestItems.length === 0}
                        className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-5 h-5" /> บันทึกใบงานรับกลับ (Create Request)
                    </button>
                </div>

            </div>
        </div>
    );
};
