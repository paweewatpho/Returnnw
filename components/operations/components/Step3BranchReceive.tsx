
import React from 'react';
import { Activity, Box, CheckSquare } from 'lucide-react';
import { useData } from '../../../DataContext';
import { ReturnRecord } from '../../../types';

export const Step3BranchReceive: React.FC = () => {
    const { items, updateReturnRecord } = useData();

    // Filter Items: Status 'JobAccepted'
    const acceptedItems = React.useMemo(() => {
        return items.filter(item => item.status === 'JobAccepted');
    }, [items]);

    const handleReceiveItem = async (id: string) => {
        if (window.confirm('ยืนยันว่าได้รับสินค้าจริง (Physical Receive)?')) {
            await updateReturnRecord(id, {
                status: 'BranchReceived',
                dateReceived: new Date().toISOString().split('T')[0]
            });
        }
    };

    const handleReceiveAll = async () => {
        if (acceptedItems.length === 0) return;
        if (window.confirm(`ยืนยันการรับสินค้าทั้งหมด ${acceptedItems.length} รายการ?`)) {
            for (const item of acceptedItems) {
                await updateReturnRecord(item.id, {
                    status: 'BranchReceived',
                    dateReceived: new Date().toISOString().split('T')[0]
                });
            }
        }
    };

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-indigo-600" /> 3. รับสินค้า (Branch Physical Receive)
                </h3>
                {acceptedItems.length > 0 && (
                    <button
                        onClick={handleReceiveAll}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all"
                    >
                        รับสินค้าทั้งหมด ({acceptedItems.length})
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-4 border-b">ID</th>
                                <th className="p-4 border-b">สินค้า (Product)</th>
                                <th className="p-4 border-b">ที่อยู่ลูกค้า</th>
                                <th className="p-4 border-b text-center">จำนวน</th>
                                <th className="p-4 border-b text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {acceptedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Box className="w-8 h-8 opacity-20" />
                                            <span>ไม่มีรายการที่ต้องรับสินค้า</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                acceptedItems.map(item => (
                                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="p-4 font-mono text-xs text-slate-500">{item.id}</td>
                                        <td className="p-4">
                                            <div className="font-medium text-slate-800">{item.productName}</div>
                                            <div className="text-xs text-slate-500">{item.productCode}</div>
                                        </td>
                                        <td className="p-4 text-slate-600 max-w-xs truncate" title={item.problemDetail}>
                                            {item.customerName}
                                            <div className="text-xs text-slate-400">{item.problemDetail}</div>
                                        </td>
                                        <td className="p-4 text-center font-bold text-slate-600">
                                            {item.quantity} {item.unit}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleReceiveItem(item.id)}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 mx-auto"
                                            >
                                                <CheckSquare className="w-4 h-4" /> ยืนยันรับของ
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
