import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ReturnRecord } from '../../../../types';
import { RESPONSIBLE_MAPPING } from '../../utils';

interface CostSectionProps {
    formData: Partial<ReturnRecord>;
    updateField: (field: keyof ReturnRecord, value: any) => void;
}

export const CostSection: React.FC<CostSectionProps> = ({ formData, updateField }) => {
    return (
        <div className="border-2 border-slate-300 rounded-xl overflow-hidden mt-6">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold text-slate-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> การติดตามค่าใช้จ่าย (Cost Tracking)
            </div>
            <div className="p-4 bg-white">
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.hasCost || false}
                        onChange={e => updateField('hasCost', e.target.checked)}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-slate-300"
                    />
                    <span className="font-bold text-red-600">⚠ มีค่าใช้จ่าย (Has Cost)</span>
                </label>

                {formData.hasCost && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in bg-red-50 p-4 rounded-lg border border-red-100">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">สาเหตุความเสียหาย (Problem Source)</label>
                            <select
                                value={formData.problemSource || ''}
                                onChange={e => updateField('problemSource', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">-- ระบุสาเหตุ --</option>
                                {Object.keys(RESPONSIBLE_MAPPING).map(source => (
                                    <option key={source} value={source}>{source}</option>
                                ))}
                                <option value="Other">อื่นๆ (Other)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">ค่าใช้จ่าย (บาท)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.costAmount || ''}
                                onChange={e => updateField('costAmount', Number(e.target.value))}
                                onBlur={e => updateField('costAmount', parseFloat(parseFloat(e.target.value).toFixed(2)))}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-1">ผู้รับผิดชอบ (Responsible)</label>
                            <input
                                type="text"
                                value={formData.costResponsible || ''}
                                onChange={e => updateField('costResponsible', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-bold"
                                placeholder="ระบบจะระบุให้อัตโนมัติ หรือกรอกเอง"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
