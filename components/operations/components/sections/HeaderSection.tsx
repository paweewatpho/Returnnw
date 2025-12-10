import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { BRANCH_LIST } from '../../../../constants';
import { ReturnRecord } from '../../../../types';

interface HeaderSectionProps {
    formData: Partial<ReturnRecord>;
    updateField: (field: keyof ReturnRecord, value: any) => void;
    isCustomBranch: boolean;
    setIsCustomBranch: (val: boolean) => void;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({
    formData,
    updateField,
    isCustomBranch,
    setIsCustomBranch
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">วันที่แจ้งคืน <span className="text-red-500">*</span></label>
                <div className="relative">
                    <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={e => updateField('date', e.target.value)}
                        className="w-full p-2.5 pl-10 bg-white border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 shadow-sm"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">สาขาที่ส่งคืน <span className="text-red-500">*</span></label>
                {isCustomBranch ? (
                    <div className="flex gap-2 animate-fade-in relative">
                        <input
                            type="text"
                            required
                            value={formData.branch}
                            onChange={e => updateField('branch', e.target.value)}
                            className="w-full p-2.5 pl-10 bg-white border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            placeholder="ระบุชื่อสาขา..."
                            autoFocus
                        />
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <button type="button" onClick={() => setIsCustomBranch(false)} className="text-xs text-blue-600 hover:underline absolute right-3 top-3 bg-white px-2">เลือกจากรายการ</button>
                    </div>
                ) : (
                    <div className="relative">
                        <select
                            required
                            value={formData.branch}
                            onChange={e => {
                                if (e.target.value === 'Other') setIsCustomBranch(true);
                                else updateField('branch', e.target.value);
                            }}
                            className="w-full p-2.5 pl-10 bg-white border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 shadow-sm appearance-none"
                        >
                            <option value="" disabled>-- เลือกสาขา --</option>
                            {BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                            <option value="Other">+ ระบุเอง...</option>
                        </select>
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                )}
            </div>
        </div>
    );
};
