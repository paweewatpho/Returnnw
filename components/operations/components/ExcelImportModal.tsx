import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import ExcelJS from 'exceljs';
import { ReturnRecord } from '../../../types';
import { BRANCH_LIST } from '../../../constants';
import { useData } from '../../../DataContext';

interface ExcelImportModalProps {
    onClose: () => void;
    onConfirm: (items: Partial<ReturnRecord>[]) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ onClose, onConfirm }) => {
    const { items: existingItems } = useData();
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [fileStats, setFileStats] = useState({ name: '', size: '' });
    const [parsedItems, setParsedItems] = useState<Partial<ReturnRecord>[]>([]);
    const [targetBranch, setTargetBranch] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [duplicateErrors, setDuplicateErrors] = useState<Set<string>>(new Set());

    // Key mapping: Excel Header -> ReturnRecord Field
    // Based on user provided image and request
    const COLUMN_MAP: Record<string, keyof ReturnRecord | 'ignore'> = {
        'Doc_No': 'documentNo',               // เลขที่เอกสาร (เลข R)
        'Doc_Date': 'date',                   // วันที่สร้างเอกสาร (อาจไม่ใช่ Control Date)
        'SoldTo_ID': 'customerCode',          // รหัสลูกค้า
        'SoldTo_Name': 'customerName',        // ชื่อลูกค้า
        'ShipTo_Name': 'destinationCustomer', // ลูกค้าปลายทาง
        'ShipTo_Address': 'customerAddress',  // ที่อยู่ -> จะใช้ดึง Province ด้วย

        // Items
        'Sku_Id': 'productCode',
        'SKU_Name': 'productName',
        'Total_Qty': 'quantity',
        'Unit': 'unit',

        // Transport Info
        'TransportManifest_No': 'tmNo',       // เลขที่ใบคุม (TM NO)
        'TransportManifest_Date': 'controlDate', // วันที่ใบคุมรถ (Control Date)

        'Comment': 'notes',
        'TMNotes': 'notes'
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileStats({
            name: file.name,
            size: (file.size / 1024).toFixed(2) + ' KB'
        });

        setIsProcessing(true);
        setDuplicateErrors(new Set());

        try {
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.worksheets[0]; // Assume first sheet
            if (!worksheet) throw new Error('No worksheet found');

            // Find Header Row
            let headerRowIndex = 1;
            worksheet.eachRow((row, rowNumber) => {
                const values = (row.values as any[]).slice(1); // exceljs 1-based, values has empty at 0
                // Check if this row looks like header
                if (values.some(v => String(v).trim() === 'Doc_No' || String(v).trim() === 'SoldTo_Name')) {
                    headerRowIndex = rowNumber;
                }
            });

            // Map Headers
            const headers: Record<number, string> = {};
            const headerRow = worksheet.getRow(headerRowIndex);
            headerRow.eachCell((cell, colNumber) => {
                headers[colNumber] = String(cell.value).trim();
            });

            const newItems: Partial<ReturnRecord>[] = [];
            const existingDocNos = new Set(existingItems.map(i => i.documentNo?.trim()));
            const foundDuplicates = new Set<string>();

            // Parse Data Rows
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber <= headerRowIndex) return; // Skip headers

                const newItem: any = {
                    documentType: 'LOGISTICS',
                    status: 'Draft' as const
                };

                let hasData = false;

                row.eachCell((cell, colNumber) => {
                    const header = headers[colNumber];
                    const mappedField = COLUMN_MAP[header];

                    if (mappedField && mappedField !== 'ignore') {
                        let value = cell.value;

                        // Date Parsing
                        if (mappedField === 'date' || mappedField === 'controlDate') {
                            if (value instanceof Date) {
                                // Add timezone offset correct or just slice ISO? 
                                // Excel dates are usually local, so ISO split is safe enough for date only
                                value = value.toISOString().split('T')[0];
                            } else if (typeof value === 'object' && (value as any).text) {
                                value = (value as any).text;
                            } else if (typeof value === 'string') {
                                // Handle DD/MM/YYYY text format
                                const parts = value.trim().split('/');
                                if (parts.length === 3) {
                                    // Careful about 2-digit years or order
                                    // Assume DD/MM/YYYY based on Thai locale context
                                    value = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
                                }
                            }
                        }

                        // Text Handling
                        if (typeof value === 'object' && value !== null && (value as any).text) {
                            value = (value as any).text;
                        }

                        if (value) {
                            // Trim string values
                            if (typeof value === 'string') value = value.trim();

                            newItem[mappedField] = value;
                            hasData = true;
                        }
                    }
                });

                // Logic: Extract Province from Address if available
                if (newItem.customerAddress) {
                    const addr = newItem.customerAddress as string;

                    // 1. Extract Province
                    let province = '';
                    const provMatch = addr.match(/(?:จ\.|จังหวัด)\s*([^\s0-9]+)/);
                    if (provMatch && provMatch[1]) {
                        newItem.province = provMatch[1].trim();
                        province = newItem.province;
                    }

                    // 2. Extract Amphoe (District) for specfic logic
                    let amphoe = '';
                    const amphoeMatch = addr.match(/(?:อ\.|อำเภอ)\s*([^\s0-9]+)/);
                    if (amphoeMatch && amphoeMatch[1]) {
                        amphoe = amphoeMatch[1].trim();
                    }

                    // 3. Auto-Determine Branch based on Rules
                    // Helper to check text inclusion
                    const has = (text: string, keyword: string) => text.includes(keyword);
                    const hasAny = (text: string, keywords: string[]) => keywords.some(k => text.includes(k));

                    if (province) {
                        // Rule: Chiang Mai (เชียงใหม่, ลำพูน, พะเยา, แม่ฮ่องสอน)
                        if (hasAny(province, ['เชียงใหม่', 'ลำพูน', 'พะเยา', 'แม่ฮ่องสอน'])) {
                            newItem.branch = 'เชียงใหม่';
                        }
                        // Rule: Mae Sot (ตาก + อ.แม่สอด)
                        else if (has(province, 'ตาก') && has(amphoe, 'แม่สอด')) {
                            newItem.branch = 'แม่สอด'; // Ensure this matches constant
                        }
                        // Rule: Kamphaeng Phet (กำแพงเพชร OR ตาก excluding Mae Sot)
                        else if (has(province, 'กำแพงเพชร') || (has(province, 'ตาก') && !has(amphoe, 'แม่สอด'))) {
                            newItem.branch = 'กำแพงเพชร';
                        }
                        // Rule: Phitsanulok (พิษณุโลก, สุโขทัย, อุตรดิตถ์ OR เพชรบูรณ์ specific Amphoes)
                        else if (
                            hasAny(province, ['พิษณุโลก', 'สุโขทัย', 'อุตรดิตถ์']) ||
                            (has(province, 'เพชรบูรณ์') && hasAny(amphoe, ['หล่มสัก', 'หล่มเก่า']))
                        ) {
                            newItem.branch = 'พิษณุโลก';
                        }
                        // Rule: Nakhon Sawan (นครสวรรค์, ชัยนาท, อุทัยธานี, พิจิตร OR เพชรบูรณ์ excluding specific Amphoes)
                        else if (
                            hasAny(province, ['นครสวรรค์', 'ชัยนาท', 'อุทัยธานี', 'พิจิตร']) ||
                            (has(province, 'เพชรบูรณ์') && !hasAny(amphoe, ['หล่มสัก', 'หล่มเก่า']))
                        ) {
                            newItem.branch = 'นครสวรรค์';
                        }
                    }
                }

                if (hasData) {
                    // Check Duplicate immediately
                    if (newItem.documentNo && existingDocNos.has(newItem.documentNo.trim())) {
                        foundDuplicates.add(newItem.documentNo.trim());
                    }
                    newItems.push(newItem);
                }
            });

            setParsedItems(newItems);
            setDuplicateErrors(foundDuplicates);
            setStep('preview');

            if (foundDuplicates.size > 0) {
                Swal.fire({
                    title: 'พบข้อมูลซ้ำ!',
                    text: `ตรวจพบเอกสารซ้ำ ${foundDuplicates.size} รายการ (Doc No) ที่มีอยู่ในระบบแล้ว`,
                    icon: 'warning'
                });
            }

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Helper to update branch for a specific row
    const handleRowBranchChange = (index: number, newBranch: string) => {
        const updated = [...parsedItems];
        updated[index] = { ...updated[index], branch: newBranch };
        setParsedItems(updated);
    };

    // Helper to batch update all rows
    const handleBatchBranchChange = (newBranch: string) => {
        setTargetBranch(newBranch); // Keep UI sync
        const updated = parsedItems.map(item => ({
            ...item,
            branch: newBranch
        }));
        setParsedItems(updated);
    };

    const handleConfirm = () => {
        // Validate that EVERY item has a branch
        const missingBranchCount = parsedItems.filter(i => !i.branch).length;

        if (duplicateErrors.size > 0) {
            Swal.fire('ข้อมูลซ้ำ', 'ไม่สามารถนำเข้าข้อมูลได้เนื่องจากมีเลขที่เอกสาร (Doc No) ซ้ำในระบบ', 'error');
            return;
        }

        if (missingBranchCount > 0) {
            Swal.fire('ข้อมูลไม่ครบถ้วน', `มี ${missingBranchCount} รายการที่ยังไม่ได้ระบุสาขา`, 'warning');
            return;
        }

        onConfirm(parsedItems);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-up">

                {/* Header */}
                <div className="bg-emerald-600 p-4 flex justify-between items-center text-white rounded-t-xl">
                    <h3 className="font-bold flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" /> Import Excel (Beta)
                    </h3>
                    <button onClick={onClose} aria-label="Close" className="hover:bg-emerald-700 p-1 rounded-full text-white"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 flex-1 overflow-auto">

                    {step === 'upload' ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition-all">
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="excel-upload"
                                disabled={isProcessing}
                            />
                            <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center p-8">
                                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                    <Upload className={`w-8 h-8 text-emerald-600 ${isProcessing ? 'animate-bounce' : ''}`} />
                                </div>
                                <span className="text-lg font-bold text-slate-700">
                                    {isProcessing ? 'กำลังประมวลผล...' : 'คลิกเพื่อเลือกไฟล์ Excel'}
                                </span>
                                <p className="text-sm text-slate-400 mt-2">รองรับไฟล์ .xlsx (Standard Template)</p>
                            </label>

                            <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg max-w-md text-center border border-blue-200">
                                <strong className="block mb-1">กฎการนำเข้า:</strong>
                                1. ห้ามมี Doc No (R No) ซ้ำในระบบ <br />
                                2. สามารถเลือกสาขาแยกรายบรรทัดได้ในขั้นตอนถัดไป
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 h-full flex flex-col">
                            {/* Toolbar */}
                            <div className="flex flex-wrap items-center gap-4 bg-slate-100 p-4 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-700">เหมาจ่ายเลือกสาขา (ทั้งหมด):</span>
                                    <select
                                        value={targetBranch}
                                        aria-label="เลือกสาขาสำหรับทุกรายการ"
                                        onChange={(e) => handleBatchBranchChange(e.target.value)}
                                        className="p-2 border border-slate-300 rounded text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="">-- เลือกสาขา (Apply All) --</option>
                                        {BRANCH_LIST.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="text-xs text-slate-500 ml-auto flex items-center gap-2">
                                    {duplicateErrors.size > 0 && (
                                        <span className="text-red-600 font-bold bg-white px-2 py-1 rounded border border-red-200 flex items-center gap-1">
                                            <AlertCircle className="w-4 h-4" /> พบซ้ำ {duplicateErrors.size} Docs
                                        </span>
                                    )}
                                    <span>พบ {parsedItems.length} รายการ | จากไฟล์: {fileStats.name}</span>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                                        <tr>
                                            <th className="p-2 border-r bg-yellow-50 text-yellow-800 w-[120px]">สาขา (Branch)</th>
                                            <th className="p-2 border-r">R No (Doc No)</th>
                                            <th className="p-2 border-r">วันที่ (Date)</th>
                                            <th className="p-2 border-r">ลูกค้า (Customer)</th>
                                            <th className="p-2 border-r">สินค้า (Product)</th>
                                            <th className="p-2 border-r">จำนวน (Qty)</th>
                                            <th className="p-2">Note</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {parsedItems.map((item, idx) => {
                                            const isDup = item.documentNo && duplicateErrors.has(item.documentNo);
                                            return (
                                                <tr key={idx} className={`hover:bg-slate-50 ${isDup ? 'bg-red-50' : ''}`}>
                                                    <td className="p-2 border-r bg-slate-50">
                                                        <select
                                                            value={item.branch || ''}
                                                            aria-label="เลือกสาขา"
                                                            onChange={(e) => handleRowBranchChange(idx, e.target.value)}
                                                            className={`w-full p-1 rounded border text-xs ${!item.branch ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
                                                        >
                                                            <option value="">- เลือก -</option>
                                                            {BRANCH_LIST.map(b => (
                                                                <option key={b} value={b}>{b}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-2 border-r font-mono">
                                                        {item.documentNo || '-'}
                                                        {isDup && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded border border-red-200">Duplicate</span>}
                                                    </td>
                                                    <td className="p-2 border-r">{item.controlDate || item.date ? String(item.controlDate || item.date) : '-'}</td>
                                                    <td className="p-2 border-r">{item.customerName || '-'}</td>
                                                    <td className="p-2 border-r">{item.productName || '-'}</td>
                                                    <td className="p-2 border-r font-bold">{item.quantity} {item.unit}</td>
                                                    <td className="p-2 text-slate-500 truncate max-w-[150px]">{item.notes}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>

                {step === 'preview' && (
                    <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 rounded-b-xl">
                        <button
                            onClick={() => { setStep('upload'); setParsedItems([]); setDuplicateErrors(new Set()); }}
                            className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            ยกเลิก / เลือกไฟล์ใหม่
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={duplicateErrors.size > 0}
                            className={`px-6 py-2 text-white font-bold rounded-lg shadow transition-all flex items-center gap-2 ${duplicateErrors.size > 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        >
                            <Save className="w-4 h-4" /> ยืนยันการนำเข้า ({parsedItems.length})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
