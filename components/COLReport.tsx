import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../DataContext';
import {
  Search, Download, RotateCcw, Calendar, Truck,
  Printer, Edit, Trash2, X, Save, PlusSquare, MinusSquare, Layers
} from 'lucide-react';
import { ReturnRecord, ReturnStatus } from '../types';
import { formatDate } from '../utils/dateUtils';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';
import COLTimelineModal from './COLTimelineModal';
import { COLPrintPreview } from './COLPrintPreview';

interface COLReportProps {
  onTransfer?: (data: Partial<ReturnRecord>) => void;
}

const COLReport: React.FC<COLReportProps> = () => {
  const { items, updateReturnRecord, deleteReturnRecord, getNextCollectionNumber } = useData();

  // Filters State
  const [filters, setFilters] = useState({
    query: '',
    status: 'All',
    startDate: '',
    endDate: ''
  });

  // State for Modals
  const [editItem, setEditItem] = useState<ReturnRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Timeline Modal State
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineItem, setTimelineItem] = useState<ReturnRecord | null>(null);

  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printItem, setPrintItem] = useState<ReturnRecord | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Grouping State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // --- SMART TRACKER: R68121552 ---
  // Tracks and reports the exact location of the user's specific document
  useEffect(() => {
    const targetDoc = 'R68121552';
    const foundItems = items.filter(i =>
      (i.documentNo && i.documentNo.includes(targetDoc)) ||
      (i.refNo && i.refNo.includes(targetDoc))
    );

    if (foundItems.length > 0) {
      const item = foundItems[0];
      const locationMap: Record<string, string> = {
        'Draft': 'Step 1: สร้างใบงาน (Draft) - ยังไม่ถูกส่งเข้าระบบ',
        'Requested': 'Step 1: รอรับงาน (Requested) - อยู่ในหน้ารายงานนี้',
        'JobAccepted': 'Step 2: รับงานแล้ว (Job Accepted)',
        'COL_JobAccepted': 'Step 2: รับงานแล้ว (Job Accepted)',
        'BranchReceived': 'Step 3: รับเข้าสาขา (Rx)',
        'COL_BranchReceived': 'Step 3: รับเข้าสาขา (Rx)',
        'Consolidated': 'Step 4: รวมสินค้า (Consol)',
        'COL_Consolidated': 'Step 4: รวมสินค้า (Consol)',
        'InTransit': 'Step 5: ระหว่างขนส่ง',
        'COL_InTransit': 'Step 5: ระหว่างขนส่ง',
        'HubReceived': 'Step 6: ถึง Hub',
        'COL_HubReceived': 'Step 6: ถึง Hub',
        'Completed': 'Step 7: จบงาน',
        'Canceled': 'ถูกยกเลิก (Canceled)'
      };

      const location = locationMap[item.status || ''] || `สถานะ: ${item.status}`;

      // Notify user clearly where it is
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: '#eff6ff', // Blue tint
        color: '#1e3a8a'
      });

      Toast.fire({
        icon: 'info',
        title: `🔎 พบเอกสาร ${targetDoc}`,
        html: `<div class="text-xs text-left mt-1"><b>อยู่ที่:</b> ${location}<br/><b>(มี ${foundItems.length} รายการ)</b></div>`
      });
    }
  }, [items]);
  // -----------------------------

  // Filter Logic: Select only Collection items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. MUST be a Collection Item
      if (item.documentType === 'NCR' || (item.ncrNumber && item.documentType !== 'LOGISTICS')) {
        return false;
      }

      // 2. Apply Date Filters
      if (filters.startDate && item.date < filters.startDate) return false;
      if (filters.endDate && item.date > filters.endDate) return false;

      // 3. Apply Status Filter
      if (filters.status !== 'All' && item.status !== filters.status) return false;

      // 4. Apply Text Search
      const queryLower = filters.query.toLowerCase();
      if (queryLower) {
        const searchableText = `
          ${item.id}
          ${item.branch}
          ${item.invoiceNo || ''}
          ${item.documentNo || ''}
          ${item.tmNo || ''}
          ${item.customerName || ''}
          ${item.productCode || ''}
          ${item.productName || ''}
          ${item.destinationCustomer || ''}
          ${item.notes || ''}
          ${item.collectionOrderId || ''}
        `.toLowerCase();

        if (!searchableText.includes(queryLower)) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, filters]);

  // Grouping Logic: Group by Document No (R Number)
  const groupedItems = useMemo(() => {
    const groups: Record<string, ReturnRecord[]> = {};

    filteredItems.forEach(item => {
      // Key: Use Document No if available, else ID (Single Item Treat)
      const rawKey = item.documentNo ? item.documentNo.trim() : `_NO_DOC_${item.id}`;
      const key = rawKey.toLowerCase();

      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    // Convert to array and use the first item as representative for sorting/display
    return Object.entries(groups).map(([key, groupItems]) => ({
      key,
      items: groupItems,
      rep: groupItems[0]
    })).sort((a, b) => new Date(b.rep.date).getTime() - new Date(a.rep.date).getTime());
  }, [filteredItems]);

  // Pagination Logic (Based on GROUPS now)
  const totalPages = Math.ceil(groupedItems.length / itemsPerPage);
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return groupedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [groupedItems, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  const handleToggleExpand = (groupKey: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupKey)) newSet.delete(groupKey);
    else newSet.add(groupKey);
    setExpandedGroups(newSet);
  };

  // Actions
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('COL Report');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Branch', key: 'branch', width: 15 },
      { header: 'Invoice No', key: 'invoiceNo', width: 15 },
      { header: 'Control Date', key: 'controlDate', width: 15 },
      { header: 'Doc No (R)', key: 'documentNo', width: 15 },
      { header: 'TM No', key: 'tmNo', width: 15 },
      { header: 'COL No', key: 'collectionOrderId', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Product Code', key: 'productCode', width: 15 },
      { header: 'Product Name', key: 'productName', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Destination', key: 'destination', width: 20 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    filteredItems.forEach(item => {
      worksheet.addRow({
        date: formatDate(item.date),
        branch: item.branch,
        invoiceNo: item.invoiceNo || '-',
        controlDate: item.controlDate || '-',
        documentNo: item.documentNo || '-',
        tmNo: item.tmNo || '-',
        collectionOrderId: item.collectionOrderId || '-',
        status: item.status,
        productCode: item.productCode === 'N/A' ? '' : item.productCode,
        productName: item.productName === 'N/A' ? '' : item.productName,
        quantity: item.quantity,
        unit: item.unit || '',
        destination: item.destinationCustomer || '-',
        notes: item.notes || '-'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `COL_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleRowExportExcel = async (item: ReturnRecord) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('COL Item');

    // Add Header Info
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'ใบรับคืนสินค้า / Collection Receipt';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.getCell('A3').value = 'วันที่ / Date:';
    worksheet.getCell('B3').value = formatDate(item.date);
    worksheet.getCell('D3').value = 'เลขที่ / Doc No:';
    worksheet.getCell('E3').value = item.documentNo || item.id;

    worksheet.getCell('A4').value = 'สาขา / Branch:';
    worksheet.getCell('B4').value = item.branch;

    // Table Header
    worksheet.getRow(6).values = ['รหัสสินค้า', 'รายการสินค้า', 'จำนวน', 'หน่วย', 'หมายเหตุ'];
    worksheet.getRow(6).font = { bold: true };

    // Data
    worksheet.getRow(7).values = [
      item.productCode === 'N/A' ? '' : item.productCode,
      item.productName === 'N/A' ? '' : item.productName,
      item.quantity,
      item.unit,
      item.notes || '-'
    ];

    // Adjust column widths
    worksheet.getColumn(1).width = 15;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 10;
    worksheet.getColumn(4).width = 10;
    worksheet.getColumn(5).width = 20;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `COL_Item_${item.id}.xlsx`);
  };

  const handlePrint = (item: ReturnRecord) => {
    setPrintItem(item);
    setShowPrintModal(true);
  };

  const handleEdit = async (item: ReturnRecord) => {
    // Password protection for Edit
    const { value: password } = await Swal.fire({
      title: 'ยืนยันรหัสผ่านแก้ไข',
      input: 'password',
      inputLabel: 'กรุณากรอกรหัสผ่านเพื่อแก้ไขข้อมูล',
      inputPlaceholder: 'Enter password',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      showCancelButton: true,
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      }
    });

    if (password === '1234') {
      setEditItem({ ...item });
      setIsEditModalOpen(true);
    } else if (password) {
      Swal.fire('รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง', 'error');
    }
  };

  const handleDelete = async (targetItem: ReturnRecord) => {
    // Robust Search: Find ALL items related to this Document
    // 1. Match by DocumentNo
    // 2. Match by RefNo (sometimes used interchangeably)
    // 3. Normalized comparison (trim, lower)
    const targetDoc = (targetItem.documentNo || '').trim().toLowerCase();
    const targetRef = (targetItem.refNo || '').trim().toLowerCase();

    // Safety: Don't bulk delete if no identifier
    if (!targetDoc && !targetRef) {
      await performSingleDelete(targetItem.id);
      return;
    }

    const relatedItems = items.filter(i => {
      const iDoc = (i.documentNo || '').trim().toLowerCase();
      const iRef = (i.refNo || '').trim().toLowerCase();
      // Match Logic: Any match on Doc or Ref
      const matchDoc = targetDoc && (iDoc === targetDoc || iRef === targetDoc);
      const matchRef = targetRef && (iDoc === targetRef || iRef === targetRef);
      return matchDoc || matchRef;
    });

    const isGroup = relatedItems.length > 1;

    if (isGroup) {
      // Generate Summary of what will be deleted
      const statusCounts: Record<string, number> = {};
      relatedItems.forEach(i => { statusCounts[i.status || 'Unknown'] = (statusCounts[i.status || 'Unknown'] || 0) + 1; });
      const statusSummary = Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ');

      const result = await Swal.fire({
        title: 'ลบข้อมูลทั้งระบบ (System Clean)',
        html: `
                พบข้อมูลที่เกี่ยวข้องกับเอกสาร <b>${targetItem.documentNo || targetItem.refNo}</b> จำนวน <b>${relatedItems.length}</b> รายการ
                <br/><div class="text-xs text-slate-500 mt-2 mb-2 bg-slate-100 p-2 rounded text-left">
                   <b>Status Breakdown:</b><br/>
                   ${statusSummary}
                </div>
                <br/>
                <span class="text-red-500 font-bold">⚠️ การลบนี้จะกำจัดข้อมูลทั้งหมด (รวมถึงรายการที่ซ่อนอยู่)</span>
                <br/><span class="text-xs">เพื่อให้คุณสามารถนำเข้าไฟล์ใหม่ได้โดยไม่ติดปัญหาตกค้าง</span>
            `,
        icon: 'warning',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: `ยืนยันลบทั้งหมด (${relatedItems.length})`,
        denyButtonText: `ลบเฉพาะรายการนี้ (1)`,
        confirmButtonColor: '#d33',
        denyButtonColor: '#f59e0b',
      });

      if (result.isConfirmed) {
        // Delete All
        const { value: password } = await Swal.fire({
          title: 'ยืนยันรหัสผ่าน (Admin)',
          input: 'password',
          inputPlaceholder: 'Password',
          showCancelButton: true,
          inputAttributes: {
            autocapitalize: 'off',
            autocorrect: 'off'
          }
        });

        if (password === '888') {
          let successCount = 0;
          await Promise.all(relatedItems.map(async (i) => {
            const success = await deleteReturnRecord(i.id);
            if (success) successCount++;
          }));
          Swal.fire('ล้างข้อมูลสำเร็จ', `ลบรายการจำนวน ${successCount} รายการเรียบร้อยแล้ว`, 'success');
        } else if (password) {
          Swal.fire('รหัสผ่านผิด', '', 'error');
        }
      } else if (result.isDenied) {
        await performSingleDelete(targetItem.id);
      }
    } else {
      // Standard Single Delete
      await performSingleDelete(targetItem.id);
    }
  };

  const performSingleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'ลบรายการ?',
      text: "คุณต้องการลบรายการนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ลบรายการ',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      const { value: password } = await Swal.fire({
        title: 'ยืนยันรหัสผ่าน',
        input: 'password',
        inputLabel: 'Password',
        inputPlaceholder: 'Enter password',
        inputAttributes: {
          autocapitalize: 'off',
          autocorrect: 'off'
        }
      });

      if (password === '1234') {
        const success = await deleteReturnRecord(id);
        if (success) {
          Swal.fire('ลบสำเร็จ', 'รายการถูกลบออกจากระบบแล้ว', 'success');
        } else {
          Swal.fire('ลบไม่สำเร็จ', 'เกิดข้อผิดพลาดในการลบรายการ', 'error');
        }
      } else if (password) {
        Swal.fire('รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง', 'error');
      }
    }
  };

  const saveEdit = async () => {
    if (editItem) {
      await updateReturnRecord(editItem.id, editItem);
      setIsEditModalOpen(false);
      setEditItem(null);
      Swal.fire('บันทึกสำเร็จ', 'แก้ไขข้อมูลเรียบร้อยแล้ว', 'success');
    }
  };

  const handleOpenTimeline = (item: ReturnRecord) => {
    setTimelineItem(item);
    setShowTimelineModal(true);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 font-inter text-slate-800 bg-slate-50/50">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            รายงาน COL (Collection Report)
          </h2>
          <p className="text-xs text-slate-500 mt-1">รายงานการรับสินค้า (Collection Report)</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-2 top-1.5 w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="ค้นหา (Inv, Doc, COL)..."
              value={filters.query}
              onChange={e => setFilters({ ...filters, query: e.target.value })}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64 transition-all"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              className="bg-transparent text-xs p-1 outline-none w-28 text-slate-600 cursor-pointer"
              aria-label="วันที่เริ่มต้น"
              title="วันที่เริ่มต้น"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              className="bg-transparent text-xs p-1 outline-none w-28 text-slate-600 cursor-pointer"
              aria-label="วันที่สิ้นสุด"
              title="วันที่สิ้นสุด"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg text-xs p-1.5 outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px]"
            aria-label="กรองสถานะ"
            title="กรองสถานะ"
          >
            <option value="All">ทุกสถานะ (All Status)</option>
            <option value="Requested">Requested (รอรับงาน)</option>
            <option value="COL_JobAccepted">Job Accepted (รับงานแล้ว)</option>
            <option value="COL_BranchReceived">Branch Received (รับสินค้าเข้าสาขา)</option>
            <option value="COL_Consolidated">Consolidated (รวมสินค้า)</option>
            <option value="COL_InTransit">In Transit (ระหว่างขนส่ง)</option>
            <option value="COL_HubReceived">Hub Received (ถึง Hub)</option>
            <option value="Completed">Completed (จบงาน)</option>
          </select>

          {/* Actions */}
          <div className="flex gap-1 ml-auto">
            <button
              onClick={handleExportExcel}
              className="bg-green-600 text-white font-bold px-3 py-1 rounded-lg flex items-center gap-1 hover:bg-green-700 transition-colors shadow-sm text-xs whitespace-nowrap"
            >
              <Download className="w-3 h-3" />
              Excel (All)
            </button>
            <button
              onClick={() => setFilters({ query: '', status: 'All', startDate: '', endDate: '' })}
              className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-medium rounded-lg border border-slate-200"
              title="ล้างตัวกรอง (Clear)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col print:hidden">
        <div className="overflow-auto flex-1 relative table-scroll-container">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm text-xs uppercase text-slate-500 font-bold">
              <tr>
                <th className="px-3 py-3 border-r max-w-[50px] text-center">#</th>
                <th className="px-3 py-3 border-r min-w-[100px]">วันที่ (Date)</th>
                <th className="px-3 py-3 border-r min-w-[100px]">สาขา (Branch)</th>
                <th className="px-3 py-3 border-r min-w-[120px]">เลข Invoice</th>
                <th className="px-3 py-3 border-r min-w-[120px]">เลขที่เอกสาร (R)</th>
                <th className="px-3 py-3 border-r min-w-[120px]">วันที่ใบคุมรถ</th>
                <th className="px-3 py-3 border-r min-w-[120px]">เลขที่ใบคุม (TM)</th>
                <th className="px-3 py-3 border-r min-w-[150px]">เลขที่ COL (COL No)</th>
                <th className="px-3 py-3 border-r min-w-[200px]">สินค้า (Product) - EXPAND (+)</th>
                <th className="px-3 py-3 text-center min-w-[100px]">สถานะ</th>
                <th className="px-3 py-3 text-center min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 italic">
                    ไม่พบรายการ Collection ในช่วงเวลานี้
                    <div className="text-xs mt-2">ลองปรับตัวกรองหรือค้นหาด้วยคำอื่น</div>
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group, index) => {
                  const { rep, items: groupItems, key: groupKey } = group;
                  const expanded = expandedGroups.has(groupKey);

                  return (
                    <tr key={groupKey} className="hover:bg-slate-50 transition-colors text-xs text-slate-700 align-top">
                      {/* Index */}
                      <td className="px-3 py-2 border-r text-center text-slate-400 relative">
                        <button
                          onClick={() => handleOpenTimeline(rep)}
                          className="absolute left-1 top-2 p-0.5 rounded-full hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors"
                          title="ดู Timeline (View Infographic)"
                        >
                          <div className="bg-blue-50 border border-blue-200 rounded-full p-0.5">
                            <Search className="w-2.5 h-2.5" />
                          </div>
                        </button>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-2 border-r align-top">
                        {formatDate(rep.date)}
                      </td>

                      {/* Branch */}
                      <td className="px-3 py-2 border-r align-top">
                        <div className="font-bold">{rep.branch}</div>
                      </td>

                      {/* Invoice */}
                      <td className="px-3 py-2 border-r align-top">
                        {rep.invoiceNo ? <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">{rep.invoiceNo}</span> : '-'}
                      </td>

                      {/* Doc No (R) */}
                      <td className="px-3 py-2 border-r align-top">
                        {rep.documentNo ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-blue-600 font-mono">{rep.documentNo}</span>
                            {groupItems.length > 1 && (
                              <span className="inline-flex items-center gap-1 w-fit bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                <Layers className="w-3 h-3" /> {groupItems.length} items
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>

                      {/* Control Date */}
                      <td className="px-3 py-2 border-r align-top">
                        {rep.controlDate ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatDate(rep.controlDate)}</span>
                          </div>
                        ) : '-'}
                      </td>

                      {/* TM No */}
                      <td className="px-3 py-2 border-r align-top">
                        {rep.tmNo ? <span className="text-slate-700 font-medium">{rep.tmNo}</span> : '-'}
                      </td>

                      {/* COL No */}
                      <td className="px-3 py-2 border-r align-top">
                        {rep.collectionOrderId ? <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">{rep.collectionOrderId}</span> : '-'}
                      </td>

                      {/* Product (Collapsible) */}
                      <td className="px-3 py-2 border-r align-top">
                        <div className="flex flex-col gap-2">
                          {/* First Item */}
                          <div className="group">
                            <div className="font-bold text-slate-800">{groupItems[0].productCode === 'N/A' ? '' : groupItems[0].productCode}</div>
                            <div className="line-clamp-2" title={groupItems[0].productName}>{groupItems[0].productName === 'N/A' ? '' : groupItems[0].productName}</div>
                            <div className="mt-1 text-slate-500 text-[10px] flex gap-2">
                              <span>Qty: <span className="font-semibold text-slate-700">{groupItems[0].quantity}</span> {groupItems[0].unit}</span>
                            </div>
                          </div>

                          {/* Expand Button */}
                          {groupItems.length > 1 && (
                            <button
                              onClick={() => handleToggleExpand(groupKey)}
                              className={`flex items-center justify-center gap-1 w-full py-1.5 rounded text-[10px] font-bold border transition-all mt-1
                                        ${expanded
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`}
                              aria-label={expanded ? "ย่อรายการ" : "ขยายดูรายการเพิ่มเติม"}
                              title={expanded ? "ย่อรายการ" : "ขยายดูรายการเพิ่มเติม"}
                            >
                              {expanded ? <MinusSquare className="w-3 h-3" /> : <PlusSquare className="w-3 h-3" />}
                              {expanded ? 'ย่อรายการ (Collapse)' : `ดูอีก ${groupItems.length - 1} รายการ (+)`}
                            </button>
                          )}

                          {/* Expanded List */}
                          {expanded && groupItems.length > 1 && (
                            <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 mt-1 animate-slide-down">
                              {groupItems.slice(1).map((subItem) => (
                                <div key={subItem.id} className="pl-2 border-l-2 border-indigo-200 group relative">
                                  <div className="font-bold text-slate-700 text-[11px]">{subItem.productCode === 'N/A' ? '' : subItem.productCode}</div>
                                  <div className="text-slate-600 text-[11px] leading-tight mb-0.5">{subItem.productName === 'N/A' ? '' : subItem.productName}</div>
                                  <div className="text-[10px] text-slate-500">Qty: <b>{subItem.quantity} {subItem.unit}</b></div>

                                  {/* Mini Actions for Sub-Items */}
                                  <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(subItem)} className="p-0.5 bg-amber-50 text-amber-600 rounded border border-amber-200 hover:bg-amber-100" title="แก้ไข">
                                      <Edit className="w-2.5 h-2.5" />
                                    </button>
                                    <button onClick={() => handleDelete(subItem)} className="p-0.5 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100" title="ลบ">
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 text-center align-top">
                        <span className={`
                          inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border
                          ${rep.status === 'Requested' ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
                          ${rep.status === 'COL_JobAccepted' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}
                          ${rep.status === 'COL_BranchReceived' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : ''}
                          ${rep.status === 'COL_Consolidated' ? 'bg-orange-50 text-orange-600 border-orange-200' : ''}
                          ${rep.status === 'COL_InTransit' || rep.status === 'COL_HubReceived' ? 'bg-purple-50 text-purple-600 border-purple-200' : ''}
                          ${rep.status === 'Completed' ? 'bg-green-50 text-green-600 border-green-200' : ''}
                        `}>
                          {rep.status}
                        </span>
                      </td>

                      {/* Actions (Main Row - First Item) */}
                      <td className="px-3 py-2 align-top text-center border-l">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handlePrint(rep)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors"
                            title="พิมพ์ (Print)"
                          >
                            <Printer className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleEdit(rep)}
                            className="p-1 hover:bg-slate-100 rounded text-amber-500 hover:text-amber-600 transition-colors"
                            title="แก้ไข (Edit)"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRowExportExcel(rep)}
                            className="p-1 hover:bg-slate-100 rounded text-green-600 hover:text-green-700 transition-colors"
                            title="Export Excel"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(rep)}
                            className="p-1 hover:bg-slate-100 rounded text-red-400 hover:text-red-600 transition-colors"
                            title="ลบ (Delete)"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm print:hidden">
          {/* Same as before */}
          <div className="flex items-center gap-2 text-slate-600">
            <span>แสดง</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 font-bold"
              aria-label="จำนวนรายการต่อหน้า"
              title="จำนวนรายการต่อหน้า"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>รายการต่อหน้า (จากทั้งหมด {groupedItems.length} รายการ - {filteredItems.length} Products)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ก่อนหน้า
            </button>
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-800">หน้า {currentPage}</span>
              <span className="text-slate-500">จาก {totalPages || 1}</span>
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ถัดไป
            </button>
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-800">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-500" /> แก้ไขข้อมูล (Edit Return Record)
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="ปิด"
                title="ปิด"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label htmlFor="edit-date" className="block text-sm font-bold text-slate-700 mb-1">วันที่ (Date)</label>
                  <input
                    id="edit-date"
                    type="date"
                    value={editItem.date}
                    onChange={e => setEditItem({ ...editItem, date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="edit-branch" className="block text-sm font-bold text-slate-700 mb-1">สาขา (Branch)</label>
                  <input
                    id="edit-branch"
                    type="text"
                    value={editItem.branch}
                    onChange={e => setEditItem({ ...editItem, branch: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label htmlFor="edit-invoice" className="block text-sm font-bold text-slate-700 mb-1">Invoice No</label>
                  <input
                    id="edit-invoice"
                    type="text"
                    value={editItem.invoiceNo || ''}
                    onChange={e => setEditItem({ ...editItem, invoiceNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="edit-docno" className="block text-sm font-bold text-slate-700 mb-1">Doc No (R)</label>
                  <input
                    id="edit-docno"
                    type="text"
                    value={editItem.documentNo || ''}
                    onChange={e => setEditItem({ ...editItem, documentNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="edit-colno" className="block text-sm font-bold text-slate-700 mb-1">COL No</label>
                  <div className="flex gap-2">
                    <input
                      id="edit-colno"
                      type="text"
                      value={editItem.collectionOrderId || ''}
                      onChange={e => setEditItem({ ...editItem, collectionOrderId: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="COL-xxxx-xxx"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const newColNo = await getNextCollectionNumber();
                        setEditItem({ ...editItem, collectionOrderId: newColNo });
                      }}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-xs font-bold whitespace-nowrap transition-colors"
                      title="Run Auto (สร้างเลขอัตโนมัติ)"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                <div className="col-span-1">
                  <label htmlFor="edit-tmno" className="block text-sm font-bold text-slate-700 mb-1">TM No</label>
                  <input
                    id="edit-tmno"
                    type="text"
                    value={editItem.tmNo || ''}
                    onChange={e => setEditItem({ ...editItem, tmNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="edit-controldate" className="block text-sm font-bold text-slate-700 mb-1">Control Date</label>
                  <input
                    id="edit-controldate"
                    type="date"
                    value={editItem.controlDate || ''}
                    onChange={e => setEditItem({ ...editItem, controlDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <hr className="my-2 border-slate-200" />
                  <h4 className="font-bold text-slate-900 mb-2">ข้อมูลสินค้า (Product Info)</h4>
                </div>

                <div className="col-span-1">
                  <label htmlFor="edit-productcode" className="block text-sm font-bold text-slate-700 mb-1">รหัสสินค้า (Product Code)</label>
                  <input
                    id="edit-productcode"
                    type="text"
                    value={editItem.productCode}
                    onChange={e => setEditItem({ ...editItem, productCode: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="edit-productname" className="block text-sm font-bold text-slate-700 mb-1">ชื่อสินค้า (Product Name)</label>
                  <input
                    id="edit-productname"
                    type="text"
                    value={editItem.productName}
                    onChange={e => setEditItem({ ...editItem, productName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label htmlFor="edit-quantity" className="block text-sm font-bold text-slate-700 mb-1">จำนวน (Qty)</label>
                  <input
                    id="edit-quantity"
                    type="number"
                    value={editItem.quantity}
                    onChange={e => setEditItem({ ...editItem, quantity: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="edit-unit" className="block text-sm font-bold text-slate-700 mb-1">หน่วย (Unit)</label>
                  <input
                    id="edit-unit"
                    type="text"
                    value={editItem.unit}
                    onChange={e => setEditItem({ ...editItem, unit: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="edit-notes" className="block text-sm font-bold text-slate-700 mb-1">หมายเหตุ (Notes)</label>
                  <textarea
                    id="edit-notes"
                    rows={2}
                    value={editItem.notes || ''}
                    onChange={e => setEditItem({ ...editItem, notes: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="edit-status" className="block text-sm font-bold text-slate-700 mb-1">สถานะ (Status)</label>
                  <select
                    id="edit-status"
                    value={editItem.status}
                    onChange={(e) => setEditItem({ ...editItem, status: e.target.value as ReturnStatus })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Requested">Requested (รอรับงาน)</option>
                    <option value="COL_JobAccepted">Job Accepted (รับงานแล้ว)</option>
                    <option value="COL_BranchReceived">Branch Received (รับสินค้าเข้าสาขา)</option>
                    <option value="COL_Consolidated">Consolidated (รวมสินค้า)</option>
                    <option value="COL_InTransit">In Transit (ระหว่างขนส่ง)</option>
                    <option value="COL_HubReceived">Hub Received (ถึง Hub)</option>
                    <option value="Completed">Completed (จบงาน)</option>
                  </select>
                </div>

              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                onClick={saveEdit}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
              >
                <Save className="w-5 h-5" /> บันทึก (Save)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {showTimelineModal && (
        <COLTimelineModal
          isOpen={showTimelineModal}
          onClose={() => setShowTimelineModal(false)}
          item={timelineItem}
        />
      )}

      {/* Print Preview Modal */}
      {showPrintModal && printItem && (
        <COLPrintPreview
          item={printItem}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* CSS Styles */}
      <style>{`
        .table-scroll-container {
          max-height: calc(100vh - 220px);
        }
      `}</style>
    </div>
  );
};

export default COLReport;