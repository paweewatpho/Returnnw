import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { NCRItem } from '../DataContext';

// Define Interface for FormData (Partial based on usage)
interface NCRFormData {
    toDept: string;
    date: string;
    copyTo: string;
    founder: string;
    poNo: string;

    // Problem Checkboxes
    problemDamaged: boolean;
    problemDamagedInBox: boolean;
    problemLost: boolean;
    problemMixed: boolean;
    problemWrongInv: boolean;
    problemLate: boolean;
    problemDuplicate: boolean;
    problemWrong: boolean;
    problemIncomplete: boolean;
    problemOver: boolean;
    problemWrongInfo: boolean;
    problemShortExpiry: boolean;
    problemTransportDamage: boolean;
    problemAccident: boolean;
    problemPOExpired: boolean;
    problemNoBarcode: boolean;
    problemNotOrdered: boolean;
    problemOther: boolean;
    problemOtherText: string;

    problemDetail: string;

    // Action Checkboxes & Values
    actionReject: boolean; actionRejectQty: number;
    actionRejectSort: boolean; actionRejectSortQty: number;
    actionRework: boolean; actionReworkQty: number; actionReworkMethod: string;
    actionSpecialAcceptance: boolean; actionSpecialAcceptanceQty: number; actionSpecialAcceptanceReason: string;
    actionScrap: boolean; actionScrapQty: number;
    actionReplace: boolean; actionReplaceQty: number;

    dueDate: string;
    approver: string;
    approverPosition: string;
    approverDate: string;

    // Root Cause
    causePackaging: boolean;
    causeTransport: boolean;
    causeOperation: boolean;
    causeEnv: boolean;
    causeDetail: string;
    preventionDetail: string;
    preventionDueDate: string;
    responsiblePerson: string;
    responsiblePosition: string;

    // Closing
    qaAccept: boolean;
    qaReject: boolean;
    qaReason: string;
}

export const exportNCRToExcel = async (formData: NCRFormData, ncrItems: NCRItem[], ncrNos: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NCR Report');

    // STEP 1: Page Setup (A4 Portrait)
    worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0, // Auto height
        margins: {
            left: 0.4, right: 0.4, top: 0.4, bottom: 0.4,
            header: 0.3, footer: 0.3
        }
    };

    // STEP 2: Grid System (20 Columns)
    // We use small width columns to allow flexible merging
    worksheet.columns = Array(20).fill({ width: 4.5 });

    // Styles Helpers
    const borderAll: Partial<ExcelJS.Borders> = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    const borderBox: Partial<ExcelJS.Borders> = {
        top: { style: 'medium' },
        left: { style: 'medium' },
        bottom: { style: 'medium' },
        right: { style: 'medium' }
    };

    const fontTitle: Partial<ExcelJS.Font> = { name: 'TH Sarabun New', size: 16, bold: true };
    const fontHeader: Partial<ExcelJS.Font> = { name: 'TH Sarabun New', size: 14, bold: true };
    const fontNormal: Partial<ExcelJS.Font> = { name: 'TH Sarabun New', size: 12 };
    const fontBold: Partial<ExcelJS.Font> = { name: 'TH Sarabun New', size: 12, bold: true };
    const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center' };
    const alignLeft: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'left', wrapText: true };
    const alignRight: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'right' };

    // Checked/Unchecked Symbols
    const chk = (v: boolean) => v ? '☑' : '☐';

    // --- HEADER SECTION ---
    // Company Logo & Name
    try {
        // Use local file in public folder to avoid CORS issues
        const logoUrl = '/logo.png';
        const response = await fetch(logoUrl);
        const arrayBuffer = await response.arrayBuffer();
        const logoImageId = workbook.addImage({
            buffer: arrayBuffer,
            extension: 'png',
        });

        worksheet.addImage(logoImageId, {
            tl: { col: 0, row: 0 } as any,
            br: { col: 4, row: 5 } as any,
            editAs: 'oneCell'
        });
    } catch (error) {
        console.warn('Failed to load logo for Excel', error);
        // Fallback to text if image fails
        const logoCell = worksheet.getCell('A1');
        logoCell.value = 'NEO';
        logoCell.font = { name: 'Arial', size: 24, bold: true, color: { argb: 'FF1E3A8A' } };
        logoCell.alignment = alignCenter;
    }

    // Merge cells for logo area (even if image is placed over it, merging keeps layout clean)
    worksheet.mergeCells('A1:D5');
    const logoPlaceholder = worksheet.getCell('A1');
    logoPlaceholder.border = borderBox;

    worksheet.mergeCells('E1:T1');
    const compName = worksheet.getCell('E1');
    compName.value = 'บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด';
    compName.font = { name: 'TH Sarabun New', size: 18, bold: true };
    compName.alignment = { vertical: 'bottom', horizontal: 'left' };

    worksheet.mergeCells('E2:T2');
    const compNameEn = worksheet.getCell('E2');
    compNameEn.value = 'NEOSIAM LOGISTICS & TRANSPORT CO., LTD.';
    compNameEn.font = { name: 'TH Sarabun New', size: 12, bold: true };
    compNameEn.alignment = { vertical: 'top', horizontal: 'left' };

    worksheet.mergeCells('E3:T3');
    worksheet.getCell('E3').value = '159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000';
    worksheet.getCell('E3').font = fontNormal;

    worksheet.mergeCells('E4:T4');
    worksheet.getCell('E4').value = 'Tax ID: 0105552087673 | Tel: 056-275-841';
    worksheet.getCell('E4').font = fontNormal;

    // Document Title
    worksheet.mergeCells('A6:T7');
    const titleCell = worksheet.getCell('A6');
    titleCell.value = 'ใบแจ้งปัญหาระบบ (NCR) / ใบแจ้งปัญหารับสินค้าคืน';
    titleCell.font = { name: 'TH Sarabun New', size: 18, bold: true };
    titleCell.alignment = alignCenter;
    titleCell.border = { top: { style: 'medium' }, bottom: { style: 'medium' } };

    // --- INFO GRID ---
    let r = 9; // Start Row

    // Row 1: To Dept, Date, Copy To
    worksheet.mergeCells(`A${r}:C${r}`); worksheet.getCell(`A${r}`).value = 'ถึงหน่วยงาน:'; worksheet.getCell(`A${r}`).font = fontBold;
    worksheet.mergeCells(`D${r}:G${r}`); worksheet.getCell(`D${r}`).value = formData.toDept; worksheet.getCell(`D${r}`).font = fontNormal; worksheet.getCell(`D${r}`).border = { bottom: { style: 'dotted' } };

    worksheet.mergeCells(`I${r}:J${r}`); worksheet.getCell(`I${r}`).value = 'วันที่:'; worksheet.getCell(`I${r}`).font = fontBold;
    worksheet.mergeCells(`K${r}:M${r}`); worksheet.getCell(`K${r}`).value = formData.date; worksheet.getCell(`K${r}`).font = fontNormal; worksheet.getCell(`K${r}`).border = { bottom: { style: 'dotted' } };

    worksheet.mergeCells(`O${r}:P${r}`); worksheet.getCell(`O${r}`).value = 'สำเนา:'; worksheet.getCell(`O${r}`).font = fontBold;
    worksheet.mergeCells(`Q${r}:T${r}`); worksheet.getCell(`Q${r}`).value = formData.copyTo; worksheet.getCell(`Q${r}`).font = fontNormal; worksheet.getCell(`Q${r}`).border = { bottom: { style: 'dotted' } };

    r += 2; // Next Row

    // Row 2: NCR No, Founder, PO No
    worksheet.mergeCells(`A${r}:C${r}`); worksheet.getCell(`A${r}`).value = 'เลขที่ NCR:'; worksheet.getCell(`A${r}`).font = fontBold;
    worksheet.mergeCells(`D${r}:G${r}`); worksheet.getCell(`D${r}`).value = ncrNos; worksheet.getCell(`D${r}`).font = fontBold; worksheet.getCell(`D${r}`).border = { bottom: { style: 'dotted' } };

    worksheet.mergeCells(`I${r}:J${r}`); worksheet.getCell(`I${r}`).value = 'ผู้พบปัญหา:'; worksheet.getCell(`I${r}`).font = fontBold;
    worksheet.mergeCells(`K${r}:M${r}`); worksheet.getCell(`K${r}`).value = formData.founder; worksheet.getCell(`K${r}`).font = fontNormal; worksheet.getCell(`K${r}`).border = { bottom: { style: 'dotted' } };

    worksheet.mergeCells(`O${r}:P${r}`); worksheet.getCell(`O${r}`).value = 'Ref/PO:'; worksheet.getCell(`O${r}`).font = fontBold;
    worksheet.mergeCells(`Q${r}:T${r}`); worksheet.getCell(`Q${r}`).value = formData.poNo; worksheet.getCell(`Q${r}`).font = fontNormal; worksheet.getCell(`Q${r}`).border = { bottom: { style: 'dotted' } };

    r += 2;

    // --- ITEM TABLE ---
    worksheet.mergeCells(`A${r}:T${r}`);
    worksheet.getCell(`A${r}`).value = 'รายการสินค้าที่พบปัญหา (Non-Conforming Items)';
    worksheet.getCell(`A${r}`).font = { name: 'TH Sarabun New', size: 12, bold: true, underline: true };
    r += 1;

    // Table Header
    const headerRowIdx = r;
    const headers = [
        { label: 'สาขาต้นทาง', range: 'A:C' },
        { label: 'Ref/Neo Ref', range: 'D:F' },
        { label: 'สินค้า/ลูกค้า', range: 'G:K' },
        { label: 'จำนวน', range: 'L:L' }, // Narrow
        { label: 'หน่วย', range: 'M:M' }, // Narrow
        { label: 'ราคา/วันหมดอายุ', range: 'N:P' },
        { label: 'วิเคราะห์/ค่าใช้จ่าย', range: 'Q:T' }
    ];

    headers.forEach(h => {
        const [start, end] = h.range.split(':');
        worksheet.mergeCells(`${start}${headerRowIdx}:${end}${headerRowIdx}`);
        const cell = worksheet.getCell(`${start}${headerRowIdx}`);
        cell.value = h.label;
        cell.font = fontBold;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderAll;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    });

    r += 1;

    // Items Loop
    if (ncrItems.length > 0) {
        ncrItems.forEach(item => {
            const rowIdx = r;
            const currentRow = worksheet.getRow(rowIdx);

            // 1. Calculate Row Height based on content length
            // Estimate max chars per line for the 'Product/Customer' column (merged G:K, approx 5 cols * 4.5 width = ~22 width unit)
            // A roughly accurate calc for Thai Sarabun font ~ 1.5-2 width unit per char? It varies.
            // Let's assume roughly 35-40 chars per line for our merged column G:K.
            const productText = `[${item.productCode}] ${item.productName}\n${item.customerName || ''} ${item.destinationCustomer ? '(ปลายทาง: ' + item.destinationCustomer + ')' : ''}`;
            const refParts = [];
            if (item.refNo) refParts.push(`Ref: ${item.refNo}`);
            if (item.neoRefNo) refParts.push(`Neo: ${item.neoRefNo}`);
            const refText = refParts.join('\n');
            const analysisText = `${item.problemSource}\n${item.hasCost ? `Cost: ${item.costAmount?.toLocaleString()}` : ''}`;

            const checkLines = (text: string, charsPerLine: number) => {
                if (!text) return 1;
                // Split by newline first to respect manual line breaks
                const lines = text.toString().split(/\r\n|\r|\n/);

                // For each physical line, calculate how many wrapped lines it consumes
                const totalWrappedLines = lines.reduce((acc, line) => {
                    // Even an empty line from a double \n counts as 1 line
                    const length = line.length;
                    if (length === 0) return acc + 1;
                    return acc + Math.ceil(length / charsPerLine);
                }, 0);

                return Math.max(1, totalWrappedLines);
            };

            const linesProduct = checkLines(productText, 35);
            const linesRef = checkLines(refText, 18); // D:F ~ 3 cols
            const linesAnalysis = checkLines(analysisText, 22); // Q:T ~ 4 cols

            const maxLines = Math.max(linesProduct, linesRef, linesAnalysis, 1);

            // Set row height: ~20 points per line + padding
            // Increased to 20 per line to better support Thai vowels (sara-loy)
            currentRow.height = (maxLines * 20) + 12;

            // Branch
            worksheet.mergeCells(`A${rowIdx}:C${rowIdx}`);
            const c1 = worksheet.getCell(`A${rowIdx}`);
            c1.value = item.branch;
            c1.font = fontNormal;
            c1.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
            c1.border = borderAll;

            // Refs
            worksheet.mergeCells(`D${rowIdx}:F${rowIdx}`);
            const c2 = worksheet.getCell(`D${rowIdx}`);
            c2.value = refText;
            c2.font = fontNormal;
            c2.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
            c2.border = borderAll;

            // Product
            worksheet.mergeCells(`G${rowIdx}:K${rowIdx}`);
            const c3 = worksheet.getCell(`G${rowIdx}`);
            c3.value = productText;
            c3.font = fontNormal;
            c3.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
            c3.border = borderAll;

            // Qty
            worksheet.mergeCells(`L${rowIdx}:L${rowIdx}`);
            const c4 = worksheet.getCell(`L${rowIdx}`);
            c4.value = item.quantity;
            c4.font = fontNormal; c4.alignment = { vertical: 'top', horizontal: 'center' }; c4.border = borderAll;

            // Unit
            worksheet.mergeCells(`M${rowIdx}:M${rowIdx}`);
            const c5 = worksheet.getCell(`M${rowIdx}`);
            c5.value = item.unit;
            c5.font = fontNormal; c5.alignment = { vertical: 'top', horizontal: 'center' }; c5.border = borderAll;

            // Price/Exp
            worksheet.mergeCells(`N${rowIdx}:P${rowIdx}`);
            const c6 = worksheet.getCell(`N${rowIdx}`);
            c6.value = `${item.priceBill?.toLocaleString()} บ.\nExp: ${item.expiryDate}`;
            c6.font = fontNormal; c6.alignment = { vertical: 'top', horizontal: 'right', wrapText: true }; c6.border = borderAll;

            // Analysis
            worksheet.mergeCells(`Q${rowIdx}:T${rowIdx}`);
            const c7 = worksheet.getCell(`Q${rowIdx}`);
            c7.value = analysisText;
            c7.font = fontNormal;
            c7.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
            c7.border = borderAll;

            r += 1;
        });
    } else {
        worksheet.mergeCells(`A${r}:T${r}`);
        const cell = worksheet.getCell(`A${r}`);
        cell.value = 'ไม่มีรายการสินค้า';
        cell.border = borderAll;
        cell.alignment = alignCenter;
        r += 1;
    }

    r += 1;

    // --- PROBLEM SECTION ---
    // Header
    worksheet.mergeCells(`A${r}:T${r}`);
    const problemHead = worksheet.getCell(`A${r}`);
    problemHead.value = 'รายละเอียดของปัญหาที่พบ (ผู้พบปัญหา)';
    problemHead.font = fontBold; problemHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    problemHead.border = borderAll;
    r += 1;

    // Problem Checkboxes Grid
    const probStartR = r;

    // Checkbox Helper Rows
    const addChkRow = (label1: string, val1: boolean, label2: string, val2: boolean, label3: string, val3: boolean, label4: string, val4: boolean) => {
        worksheet.mergeCells(`A${r}:E${r}`); worksheet.getCell(`A${r}`).value = `${chk(val1)} ${label1}`;
        worksheet.mergeCells(`F${r}:J${r}`); worksheet.getCell(`F${r}`).value = `${chk(val2)} ${label2}`;
        worksheet.mergeCells(`K${r}:O${r}`); worksheet.getCell(`K${r}`).value = `${chk(val3)} ${label3}`;
        worksheet.mergeCells(`P${r}:T${r}`); worksheet.getCell(`P${r}`).value = `${chk(val4)} ${label4}`;
        // Set Styles
        ['A', 'F', 'K', 'P'].forEach(c => { worksheet.getCell(`${c}${r}`).font = fontNormal; });
        r++;
    };

    addChkRow('ชำรุด', formData.problemDamaged, 'ชำรุดในกล่อง', formData.problemDamagedInBox, 'สูญหาย', formData.problemLost, 'สินค้าสลับ', formData.problemMixed);
    addChkRow('สินค้าไม่ตรง INV', formData.problemWrongInv, 'ส่งช้า', formData.problemLate, 'ส่งซ้ำ', formData.problemDuplicate, 'ส่งผิด', formData.problemWrong);
    addChkRow('ส่งของไม่ครบ', formData.problemIncomplete, 'ส่งของเกิน', formData.problemOver, 'ข้อมูลผิด', formData.problemWrongInfo, 'สินค้าอายุสั้น', formData.problemShortExpiry);
    addChkRow('เสียหายบนรถ', formData.problemTransportDamage, 'อุบัติเหตุ', formData.problemAccident, 'PO หมดอายุ', formData.problemPOExpired, 'BarCode ไม่ขึ้น', formData.problemNoBarcode);

    // Other
    worksheet.mergeCells(`A${r}:E${r}`);
    worksheet.getCell(`A${r}`).value = `${chk(formData.problemOther)} อื่นๆ: ${formData.problemOtherText || ''}`;
    worksheet.getCell(`A${r}`).font = fontNormal;
    r++;

    // Outer Border for Checkboxes area
    // (Simplification: We just ensure content is readable, borders are optional for inside, but outer box is nice)

    // Detail Text Area
    worksheet.mergeCells(`A${r}:T${r}`);
    worksheet.getCell(`A${r}`).value = 'รายละเอียดเพิ่มเติม:'; worksheet.getCell(`A${r}`).font = fontBold;
    r++;
    worksheet.mergeCells(`A${r}:T${r + 2}`);
    const detailCell = worksheet.getCell(`A${r}`);
    detailCell.value = formData.problemDetail || '-';
    detailCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    detailCell.border = borderAll;
    r += 3;

    // --- ACTION SECTION ---
    worksheet.mergeCells(`A${r}:T${r}`);
    const actionHead = worksheet.getCell(`A${r}`);
    actionHead.value = 'การดำเนินการ';
    actionHead.font = fontBold; actionHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    actionHead.border = borderAll;
    r++;

    // Action Rows (Grid 2 columns: Action | Details)
    const addActionRow = (chkVal: boolean, label: string, qty: number, detailLabel: string, detailVal: string) => {
        worksheet.mergeCells(`A${r}:H${r}`);
        worksheet.getCell(`A${r}`).value = `${chk(chkVal)} ${label} (จำนวน: ${qty})`;
        worksheet.getCell(`A${r}`).font = fontNormal; worksheet.getCell(`A${r}`).border = borderAll;

        worksheet.mergeCells(`I${r}:T${r}`);
        worksheet.getCell(`I${r}`).value = detailLabel ? `${detailLabel}: ${detailVal}` : '';
        worksheet.getCell(`I${r}`).font = fontNormal; worksheet.getCell(`I${r}`).border = borderAll;
        r++;
    };

    addActionRow(formData.actionReject, 'ส่งคืน (Reject)', formData.actionRejectQty, '', '');
    addActionRow(formData.actionRejectSort, 'คัดแยกของเสียเพื่อส่งคืน', formData.actionRejectSortQty, '', '');
    addActionRow(formData.actionRework, 'แก้ไข (Rework)', formData.actionReworkQty, 'วิธีการ', formData.actionReworkMethod);
    addActionRow(formData.actionSpecialAcceptance, 'ยอมรับพิเศษ', formData.actionSpecialAcceptanceQty, 'เหตุผล', formData.actionSpecialAcceptanceReason);
    addActionRow(formData.actionScrap, 'ทำลาย (Scrap)', formData.actionScrapQty, '', '');
    addActionRow(formData.actionReplace, 'เปลี่ยนสินค้าใหม่', formData.actionReplaceQty, '', '');

    // Due Date / Approver
    worksheet.mergeCells(`A${r}:D${r}`); worksheet.getCell(`A${r}`).value = `กำหนดเสร็จ: ${formData.dueDate || ''}`;
    worksheet.mergeCells(`E${r}:J${r}`); worksheet.getCell(`E${r}`).value = `ผู้อนุมัติ: ${formData.approver || ''}`;
    worksheet.mergeCells(`K${r}:O${r}`); worksheet.getCell(`K${r}`).value = `ตำแหน่ง: ${formData.approverPosition || ''}`;
    worksheet.mergeCells(`P${r}:T${r}`); worksheet.getCell(`P${r}`).value = `วันที่: ${formData.approverDate || ''}`;
    ['A', 'E', 'K', 'P'].forEach(c => {
        const cell = worksheet.getCell(`${c}${r}`);
        cell.font = fontNormal; cell.border = borderAll;
    });
    r++;
    r++; // space

    // --- ROOT CAUSE ---
    worksheet.mergeCells(`A${r}:T${r}`);
    const rootHead = worksheet.getCell(`A${r}`);
    rootHead.value = 'สาเหตุและการป้องกัน (Root Cause & Prevention)';
    rootHead.font = fontBold; rootHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    rootHead.border = borderAll;
    r++;

    // Causes
    worksheet.mergeCells(`A${r}:E${r}`);
    worksheet.getCell(`A${r}`).value = `สาเหตุ: ${[
        formData.causePackaging ? 'บรรจุภัณฑ์' : '',
        formData.causeTransport ? 'การขนส่ง' : '',
        formData.causeOperation ? 'ปฏิบัติงาน' : '',
        formData.causeEnv ? 'สิ่งแวดล้อม' : ''
    ].filter(Boolean).join(', ')}`;
    worksheet.getCell(`A${r}`).font = fontNormal; worksheet.getCell(`A${r}`).border = borderAll;

    worksheet.mergeCells(`F${r}:T${r}`);
    worksheet.getCell(`F${r}`).value = `รายละเอียด: ${formData.causeDetail}`;
    worksheet.getCell(`F${r}`).font = fontNormal; worksheet.getCell(`F${r}`).border = borderAll;
    r++;

    // Prevention
    worksheet.mergeCells(`F${r}:T${r}`);
    worksheet.getCell(`F${r}`).value = `แนวทางป้องกัน: ${formData.preventionDetail}`;
    worksheet.getCell(`F${r}`).font = fontNormal; worksheet.getCell(`F${r}`).border = borderAll;

    // Left side merge (visual improvement to span 2 rows if needed, but linear is fine)
    worksheet.mergeCells(`A${r}:E${r}`);
    worksheet.getCell(`A${r}`).value = `รับผิดชอบ: ${formData.responsiblePerson} (${formData.responsiblePosition})`;
    worksheet.getCell(`A${r}`).font = fontNormal; worksheet.getCell(`A${r}`).border = borderAll;
    r++;
    r++;

    // --- CLOSING & SIGNATURE ---
    // Box for Signatures
    const signStart = r;
    worksheet.mergeCells(`A${r}:T${r}`);
    worksheet.getCell(`A${r}`).value = 'การตรวจติดตามและการปิด NCR';
    worksheet.getCell(`A${r}`).font = fontBold; worksheet.getCell(`A${r}`).border = borderAll;
    r++;

    // QA Check
    worksheet.mergeCells(`A${r}:T${r}`);
    worksheet.getCell(`A${r}`).value = `${chk(formData.qaAccept)} ยอมรับแนวทาง  ${chk(formData.qaReject)} ไม่ยอมรับ (เหตุผล: ${formData.qaReason || '-'})`;
    worksheet.getCell(`A${r}`).font = fontNormal; worksheet.getCell(`A${r}`).border = borderAll;
    r++;
    r++;

    // Signatures
    worksheet.mergeCells(`B${r}:H${r}`);
    const sign1 = worksheet.getCell(`B${r}`); sign1.value = '__________________________'; sign1.alignment = alignCenter;

    worksheet.mergeCells(`L${r}:R${r}`);
    const sign2 = worksheet.getCell(`L${r}`); sign2.value = '__________________________'; sign2.alignment = alignCenter;
    r++;

    worksheet.mergeCells(`B${r}:H${r}`);
    const label1 = worksheet.getCell(`B${r}`); label1.value = 'ผู้ตรวจติดตาม (QA)'; label1.alignment = alignCenter; label1.font = fontNormal;

    worksheet.mergeCells(`L${r}:R${r}`);
    const label2 = worksheet.getCell(`L${r}`); label2.value = 'ผู้อนุมัติปิด (MD)'; label2.alignment = alignCenter; label2.font = fontNormal;


    // Output File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `NCR_${ncrNos}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
