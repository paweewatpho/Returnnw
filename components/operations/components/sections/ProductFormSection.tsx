import React from 'react';
import { DollarSign } from 'lucide-react';
import { AutocompleteInput } from '../AutocompleteInput';
import { ReturnRecord } from '../../../../types';

interface ProductFormSectionProps {
    formData: Partial<ReturnRecord>;
    updateField: (field: keyof ReturnRecord, value: any) => void;
    uniqueProductCodes: string[];
    uniqueProductNames: string[];
}

export const ProductFormSection: React.FC<ProductFormSectionProps> = ({
    formData,
    updateField,
    uniqueProductCodes,
    uniqueProductNames
}) => {
    return (
        <>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">เลขที่อ้างอิง (Ref No.) <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        required
                        value={formData.refNo || ''}
                        onChange={e => updateField('refNo', e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                        placeholder="ระบุเลขที่บิล..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Neo Ref No. (Optional)</label>
                    <input
                        type="text"
                        value={formData.neoRefNo || ''}
                        onChange={e => updateField('neoRefNo', e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                        placeholder="เลขที่ Neo..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">รหัสสินค้า (Product Code)</label>
                    <AutocompleteInput
                        label=""
                        value={formData.productCode || ''}
                        onChange={(val) => updateField('productCode', val)}
                        options={uniqueProductCodes}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อสินค้า (Product Name)</label>
                <AutocompleteInput
                    label=""
                    value={formData.productName || ''}
                    onChange={(val) => updateField('productName', val)}
                    options={uniqueProductNames}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">จำนวน <span className="text-red-500">*</span></label>
                    <input
                        type="number"
                        required
                        min="1"
                        value={formData.quantity || ''}
                        onChange={e => {
                            const qty = parseFloat(e.target.value) || 0;
                            updateField('quantity', qty);
                            const price = formData.pricePerUnit || 0;
                            updateField('priceBill', qty * price);
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-blue-600 text-center"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">หน่วย</label>
                    <input
                        type="text"
                        value={formData.unit || 'ชิ้น'}
                        onChange={e => updateField('unit', e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-blue-700 mb-1">ราคา/หน่วย (Price/Unit)</label>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.01"
                            value={formData.pricePerUnit || ''}
                            onChange={e => {
                                const price = parseFloat(e.target.value) || 0;
                                updateField('pricePerUnit', price);
                                const qty = formData.quantity || 0;
                                updateField('priceBill', qty * price);
                            }}
                            className="w-full p-2.5 pl-9 bg-white border border-blue-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-blue-700"
                            placeholder="0.00"
                        />
                        <DollarSign className="w-4 h-4 text-blue-500 absolute left-3 top-3" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">วันหมดอายุ</label>
                    <input
                        type="date"
                        value={formData.expiryDate || ''}
                        onChange={e => updateField('expiryDate', e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">ราคาหน้าบิลรวม (Total Price Bill)</label>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.01"
                            value={formData.priceBill || 0}
                            readOnly
                            className="w-full p-2.5 pl-9 bg-slate-100 border border-slate-300 rounded text-sm outline-none font-bold text-slate-700"
                            placeholder="Auto-calculated"
                        />
                        <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">ราคาขาย (Price Sell)</label>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.01"
                            value={formData.priceSell || ''}
                            onChange={e => updateField('priceSell', parseFloat(e.target.value))}
                            onBlur={e => updateField('priceSell', parseFloat(parseFloat(e.target.value as any).toFixed(2)))}
                            className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="0.00"
                        />
                        <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                </div>
            </div>
        </>
    );
};
