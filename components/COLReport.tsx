import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../DataContext';
import {
  FileText, Search, Download, RotateCcw, Calendar, Truck, User,
  Printer, Edit, Trash2, X, Save
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
  const { items, updateReturnRecord, deleteReturnRecord } = useData();

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

  // Pagination Logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

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

  const handleDelete = async (id: string) => {
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
      // Password protection for delete (optional, but good practice)
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
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              className="bg-transparent text-xs p-1 outline-none w-28 text-slate-600 cursor-pointer"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg text-xs p-1.5 outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px]"
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
        <div className="overflow-auto flex-1 relative" style={{ maxHeight: 'calc(100vh - 220px)' }}>
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
                <th className="px-3 py-3 border-r min-w-[200px]">สินค้า (Product)</th>
                <th className="px-3 py-3 text-center min-w-[100px]">สถานะ</th>
                <th className="px-3 py-3 text-center min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                    ไม่พบรายการ Collection ในช่วงเวลานี้
                    <div className="text-xs mt-2">ลองปรับตัวกรองหรือค้นหาด้วยคำอื่น</div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors text-xs text-slate-700">
                    {/* Index */}
                    <td className="px-3 py-2 border-r text-center text-slate-400 relative">
                      <button
                        onClick={() => handleOpenTimeline(item)}
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
                      {formatDate(item.date)}
                    </td>

                    {/* Branch */}
                    <td className="px-3 py-2 border-r align-top">
                      <div className="font-bold">{item.branch}</div>
                    </td>

                    {/* Invoice */}
                    <td className="px-3 py-2 border-r align-top">
                      {item.invoiceNo ? <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">{item.invoiceNo}</span> : '-'}
                    </td>

                    {/* Doc No (R) */}
                    <td className="px-3 py-2 border-r align-top">
                      {item.documentNo ? <span className="font-bold text-blue-600 font-mono">{item.documentNo}</span> : '-'}
                    </td>

                    {/* Control Date */}
                    <td className="px-3 py-2 border-r align-top">
                      {item.controlDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(item.controlDate)}</span>
                        </div>
                      ) : '-'}
                    </td>

                    {/* TM No */}
                    <td className="px-3 py-2 border-r align-top">
                      {item.tmNo ? <span className="text-slate-700 font-medium">{item.tmNo}</span> : '-'}
                    </td>

                    {/* Product */}
                    <td className="px-3 py-2 border-r align-top">
                      <div className="font-bold text-slate-800">{item.productCode === 'N/A' ? '' : item.productCode}</div>
                      <div className="line-clamp-2" title={item.productName}>{item.productName === 'N/A' ? '' : item.productName}</div>
                      <div className="mt-1 text-slate-500 text-[10px] flex gap-2">
                        <span>Qty: <span className="font-semibold text-slate-700">{item.quantity}</span> {item.unit}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 text-center align-top">
                      <span className={`
                          inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border
                          ${item.status === 'Requested' ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
                          ${item.status === 'COL_JobAccepted' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}
                          ${item.status === 'COL_BranchReceived' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : ''}
                          ${item.status === 'COL_Consolidated' ? 'bg-orange-50 text-orange-600 border-orange-200' : ''}
                          ${item.status === 'COL_InTransit' || item.status === 'COL_HubReceived' ? 'bg-purple-50 text-purple-600 border-purple-200' : ''}
                          ${item.status === 'Completed' ? 'bg-green-50 text-green-600 border-green-200' : ''}
                        `}>
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 align-top text-center border-l">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handlePrint(item)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors"
                          title="พิมพ์ (Print)"
                        >
                          <Printer className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 hover:bg-slate-100 rounded text-amber-500 hover:text-amber-600 transition-colors"
                          title="แก้ไข (Edit)"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRowExportExcel(item)}
                          className="p-1 hover:bg-slate-100 rounded text-green-600 hover:text-green-700 transition-colors"
                          title="Export Excel"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 hover:bg-slate-100 rounded text-red-400 hover:text-red-600 transition-colors"
                          title="ลบ (Delete)"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>รายการต่อหน้า (จากทั้งหมด {filteredItems.length} รายการ)</span>
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
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">วันที่ (Date)</label>
                  <input
                    type="date"
                    value={editItem.date}
                    onChange={e => setEditItem({ ...editItem, date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">สาขา (Branch)</label>
                  <input
                    type="text"
                    value={editItem.branch}
                    onChange={e => setEditItem({ ...editItem, branch: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Invoice No</label>
                  <input
                    type="text"
                    value={editItem.invoiceNo || ''}
                    onChange={e => setEditItem({ ...editItem, invoiceNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Doc No (R)</label>
                  <input
                    type="text"
                    value={editItem.documentNo || ''}
                    onChange={e => setEditItem({ ...editItem, documentNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">TM No</label>
                  <input
                    type="text"
                    value={editItem.tmNo || ''}
                    onChange={e => setEditItem({ ...editItem, tmNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Control Date</label>
                  <input
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
                  <label className="block text-sm font-bold text-slate-700 mb-1">รหัสสินค้า (Product Code)</label>
                  <input
                    type="text"
                    value={editItem.productCode}
                    onChange={e => setEditItem({ ...editItem, productCode: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อสินค้า (Product Name)</label>
                  <input
                    type="text"
                    value={editItem.productName}
                    onChange={e => setEditItem({ ...editItem, productName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">จำนวน (Qty)</label>
                  <input
                    type="number"
                    value={editItem.quantity}
                    onChange={e => setEditItem({ ...editItem, quantity: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">หน่วย (Unit)</label>
                  <input
                    type="text"
                    value={editItem.unit}
                    onChange={e => setEditItem({ ...editItem, unit: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">หมายเหตุ (Notes)</label>
                  <textarea
                    rows={2}
                    value={editItem.notes || ''}
                    onChange={e => setEditItem({ ...editItem, notes: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">สถานะ (Status)</label>
                  <select
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
    </div>
  );
};

export default COLReport;