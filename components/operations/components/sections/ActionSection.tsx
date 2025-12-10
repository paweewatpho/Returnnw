import React from 'react';
import { Wrench } from 'lucide-react';
import { ReturnRecord } from '../../../../types';

interface ActionSectionProps {
    formData: Partial<ReturnRecord>;
    updateField: (field: keyof ReturnRecord, value: any) => void;
    handleCheckboxToggle: (field: keyof ReturnRecord, resetFields?: (keyof ReturnRecord)[]) => void;
}

export const ActionSection: React.FC<ActionSectionProps> = ({
    formData,
    updateField,
    handleCheckboxToggle
}) => {

    // รายชื่อฟิลด์ Action ทั้งหมด (เพื่อเอาไว้ reset ตัวอื่นเวลาเลือกตัวหนึ่ง)
    const ALL_ACTIONS: (keyof ReturnRecord)[] = [
        'actionReject', 'actionRejectSort', 'actionRework',
        'actionSpecialAcceptance', 'actionScrap', 'actionScrapReplace'
    ];

    const onToggle = (field: keyof ReturnRecord) => {
        // กรองเอาเฉพาะ field อื่นๆ ที่ไม่ใช่ตัวเอง เพื่อสั่ง reset
        const others = ALL_ACTIONS.filter(f => f !== field);
        handleCheckboxToggle(field, others);
    };

    return (
        <div className="border-2 border-slate-300 rounded-xl overflow-hidden mt-6">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold text-slate-700 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-500" /> การดำเนินการ
            </div>
            <div className="p-4 bg-white space-y-3 text-sm">

                {/* กลุ่ม Reject */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                        <input type="checkbox" checked={formData.actionReject} onChange={() => onToggle('actionReject')} className="w-4 h-4" />
                        <span className="font-bold w-32">ส่งคืน (Reject)</span>
                        <div className="flex items-center gap-2"><span className="text-xs text-slate-500">จำนวน:</span><input type="number" value={formData.actionRejectQty} onChange={e => updateField('actionRejectQty', Number(e.target.value))} className="w-20 border rounded px-2 py-1" /></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="checkbox" checked={formData.actionRejectSort} onChange={() => onToggle('actionRejectSort')} className="w-4 h-4" />
                        <span className="font-bold w-40">คัดแยกของเสียเพื่อส่งคืน</span>
                        <div className="flex items-center gap-2"><span className="text-xs text-slate-500">จำนวน:</span><input type="number" value={formData.actionRejectSortQty} onChange={e => updateField('actionRejectSortQty', Number(e.target.value))} className="w-20 border rounded px-2 py-1" /></div>
                    </div>
                </div>

                {/* กลุ่ม Rework */}
                <div className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-3">
                    <div className="flex items-start gap-3">
                        <input type="checkbox" checked={formData.actionRework} onChange={() => onToggle('actionRework')} className="w-4 h-4 mt-1" />
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                                <span className="font-bold w-32">แก้ไข (Rework)</span>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-500">จำนวน:</span><input type="number" value={formData.actionReworkQty} onChange={e => updateField('actionReworkQty', Number(e.target.value))} className="w-20 border rounded px-2 py-1" /></div>
                            </div>
                            <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-600">วิธีการแก้ไข:</span><input type="text" value={formData.actionReworkMethod} onChange={e => updateField('actionReworkMethod', e.target.value)} className="flex-1 border-b border-dotted border-slate-400 outline-none px-1" /></div>
                        </div>
                    </div>
                </div>

                {/* Accept Special */}
                <div className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-3">
                    <div className="flex items-start gap-3">
                        <input type="checkbox" checked={formData.actionSpecialAcceptance} onChange={() => onToggle('actionSpecialAcceptance')} className="w-4 h-4 mt-1" />
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                                <span className="font-bold w-32">ยอมรับกรณีพิเศษ</span>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-500">จำนวน:</span><input type="number" value={formData.actionSpecialAcceptanceQty} onChange={e => updateField('actionSpecialAcceptanceQty', Number(e.target.value))} className="w-20 border rounded px-2 py-1" /></div>
                            </div>
                            <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-600">เหตุผลในการยอมรับ:</span><input type="text" value={formData.actionSpecialAcceptanceReason} onChange={e => updateField('actionSpecialAcceptanceReason', e.target.value)} className="flex-1 border-b border-dotted border-slate-400 outline-none px-1" /></div>
                        </div>
                    </div>
                </div>

                {/* Scrap & ScrapReplace */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <input type="checkbox" checked={formData.actionScrap} onChange={() => onToggle('actionScrap')} className="w-4 h-4" />
                        <span className="font-bold w-32">ทำลาย (Scrap)</span>
                        <div className="flex items-center gap-2"><span className="text-xs text-slate-500">จำนวน:</span><input type="number" value={formData.actionScrapQty} onChange={e => updateField('actionScrapQty', Number(e.target.value))} className="w-20 border rounded px-2 py-1" /></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="checkbox" checked={formData.actionScrapReplace} onChange={() => onToggle('actionScrapReplace')} className="w-4 h-4" />
                        <span className="font-bold w-32">เปลี่ยนสินค้าใหม่</span>
                        <div className="flex items-center gap-2"><span className="text-xs text-slate-500">จำนวน:</span><input type="number" value={formData.actionScrapReplaceQty} onChange={e => updateField('actionScrapReplaceQty', Number(e.target.value))} className="w-20 border rounded px-2 py-1" /></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
