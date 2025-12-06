import React, { useState, useEffect, useMemo } from 'react';
import { useData, NCRRecord, NCRItem } from '../DataContext';
import { FileText, AlertTriangle, ArrowRight, CheckCircle, Clock, MapPin, DollarSign, Package, User, Printer, X, Save, Eye, Edit, Lock, Trash2, CheckSquare, Search, Filter, Download, XCircle, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { ReturnRecord, ReturnStatus } from '../types';

interface NCRReportProps {
  onTransfer: (data: Partial<ReturnRecord>) => void;
}

const NCRReport: React.FC<NCRReportProps> = ({ onTransfer }) => {
  const { ncrReports, items, updateNCRReport, deleteNCRReport } = useData();
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printItem, setPrintItem] = useState<NCRRecord | null>(null);

  const [showNCRFormModal, setShowNCRFormModal] = useState(false);
  const [ncrFormItem, setNcrFormItem] = useState<NCRRecord | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingEditItem, setPendingEditItem] = useState<NCRRecord | null>(null);

  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false);
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null);

  // Auto-scroll to top when modal opens
  useEffect(() => {
    if (showNCRFormModal) {
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        const overlay = document.getElementById('ncr-modal-overlay');
        if (overlay) {
          overlay.scrollTop = 0;
        }
      }, 10);
    }
  }, [showNCRFormModal]);

  // New Filters State with Date Range
  const [filters, setFilters] = useState({
    query: '',
    action: 'All',
    returnStatus: 'All',
    hasCost: false,
    startDate: '',
    endDate: '',
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const filteredNcrReports = useMemo(() => {
    return ncrReports.filter(report => {
      const itemData = report.item || (report as any);
      const correspondingReturn = items.find(item => item.ncrNumber === report.ncrNo);

      // Date Range Filter
      if (filters.startDate && report.date < filters.startDate) return false;
      if (filters.endDate && report.date > filters.endDate) return false;

      // Text Query Filter including NCR Number
      const queryLower = filters.query.toLowerCase();
      if (queryLower &&
        !report.ncrNo?.toLowerCase().includes(queryLower) &&
        !itemData.customerName?.toLowerCase().includes(queryLower) &&
        !itemData.productName?.toLowerCase().includes(queryLower) &&
        !itemData.productCode?.toLowerCase().includes(queryLower) &&
        !itemData.branch?.toLowerCase().includes(queryLower) &&
        !itemData.destinationCustomer?.toLowerCase().includes(queryLower) &&
        !report.problemDetail?.toLowerCase().includes(queryLower) &&
        !itemData.problemSource?.toLowerCase().includes(queryLower)
      ) {
        return false;
      }

      // Action Filter
      if (filters.action !== 'All') {
        if (filters.action === 'Reject' && !report.actionReject && !report.actionRejectSort) return false;
        if (filters.action === 'Scrap' && !report.actionScrap) return false;
      }

      // Return Status Filter
      if (filters.returnStatus !== 'All') {
        if (filters.returnStatus === 'NotReturned' && correspondingReturn) return false;
        if (filters.returnStatus !== 'NotReturned' && (!correspondingReturn || correspondingReturn.status !== filters.returnStatus)) {
          return false;
        }
      }

      // Has Cost Filter
      if (filters.hasCost && !itemData.hasCost) {
        return false;
      }

      return true;
    });
  }, [ncrReports, items, filters]);

  const handleExportExcel = () => {
    const headers = [
      "NCR No", "Date", "Status", "Product Code", "Product Name", "Customer",
      "From Branch", "To Destination", "Quantity", "Unit",
      "Problem Detail", "Problem Source",
      "Has Cost", "Cost Amount", "Cost Responsible",
      "Action", "Return Status"
    ];

    const rows = filteredNcrReports.map(report => {
      const itemData = report.item || (report as any);
      const returnRecord = items.find(item => item.ncrNumber === report.ncrNo);

      const action = report.actionReject || report.actionRejectSort ? 'Reject' : report.actionScrap ? 'Scrap' : 'N/A';

      return [
        report.ncrNo,
        report.date,
        report.status,
        itemData.productCode,
        `"${itemData.productName?.replace(/"/g, '""')}"`,
        `"${itemData.customerName?.replace(/"/g, '""')}"`,
        itemData.branch,
        `"${itemData.destinationCustomer?.replace(/"/g, '""')}"`,
        itemData.quantity,
        itemData.unit,
        `"${report.problemDetail?.replace(/"/g, '""')}"`,
        `"${itemData.problemSource?.replace(/"/g, '""')}"`,
        itemData.hasCost ? 'Yes' : 'No',
        itemData.costAmount || 0,
        itemData.costResponsible || '',
        action,
        returnRecord?.status || 'Not Returned'
      ].join(',');
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ncr_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredNcrReports.length / itemsPerPage);
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredNcrReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNcrReports, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  const handleCreateReturn = (ncr: NCRRecord) => {
    const itemData = ncr.item || (ncr as any);

    const returnData: Partial<ReturnRecord> = {
      ncrNumber: ncr.ncrNo || ncr.id,
      branch: itemData.branch,
      date: ncr.date,
      productName: itemData.productName,
      productCode: itemData.productCode,
      customerName: itemData.customerName,
      quantity: itemData.quantity,
      unit: itemData.unit,
      refNo: itemData.refNo,
      neoRefNo: itemData.neoRefNo,
      destinationCustomer: itemData.destinationCustomer,
      reason: `จาก NCR: ${ncr.problemDetail} (${itemData.problemSource})`,
      problemType: ncr.problemDetail,
      rootCause: itemData.problemSource,
      actionReject: ncr.actionReject,
      actionRejectSort: ncr.actionRejectSort,
      actionScrap: ncr.actionScrap
    };
    onTransfer(returnData);
  };

  const handleOpenPrint = (item: NCRRecord) => {
    setPrintItem(item);
    setShowPrintModal(true);
  };

  const handleViewNCRForm = (item: NCRRecord) => {
    setNcrFormItem({ ...item });
    setIsEditMode(false);
    setShowNCRFormModal(true);
  };

  const handleEditClick = (item: NCRRecord) => {
    setPendingEditItem(item);
    setPasswordInput('');
    setShowPasswordModal(true);
  };

  const handleDeleteClick = (id: string) => {
    setPendingDeleteItemId(id);
    setPasswordInput('');
    setShowDeletePasswordModal(true);
  };

  const handleVerifyPasswordAndDelete = async () => {
    if (passwordInput === '1234') {
      if (pendingDeleteItemId) {
        // This now calls the "cancel" (soft delete) function
        const success = await deleteNCRReport(pendingDeleteItemId);
        if (success) {
          alert(`ยกเลิกรายการ NCR สำเร็จ`);
        } else {
          alert('การยกเลิกล้มเหลว กรุณาตรวจสอบสิทธิ์');
        }
      }
      setShowDeletePasswordModal(false);
      setPendingDeleteItemId(null);
    } else {
      alert('รหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleVerifyPassword = () => {
    if (passwordInput === '1234') {
      if (pendingEditItem) {
        setNcrFormItem({ ...pendingEditItem });
        setIsEditMode(true);
        setShowNCRFormModal(true);
      }
      setShowPasswordModal(false);
    } else {
      alert('รหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleSaveChanges = async () => {
    if (!ncrFormItem) return;

    const success = await updateNCRReport(ncrFormItem.id, ncrFormItem);
    if (success) {
      alert('บันทึกการแก้ไขเรียบร้อย');
      setShowNCRFormModal(false);
      setIsEditMode(false);
    } else {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleInputChange = (field: keyof NCRRecord, value: any) => {
    if (ncrFormItem) {
      setNcrFormItem({ ...ncrFormItem, [field]: value });
    }
  };

  const handleItemInputChange = (field: keyof NCRItem, value: any) => {
    if (ncrFormItem) {
      const updatedItemData = { ...(ncrFormItem.item || ncrFormItem), [field]: value };
      if (ncrFormItem.item) {
        setNcrFormItem({ ...ncrFormItem, item: updatedItemData as NCRItem });
      } else {
        setNcrFormItem({ ...ncrFormItem, ...updatedItemData });
      }
    }
  };

  const getProblemStrings = (record: NCRRecord | null) => {
    if (!record) return [];
    const problems = [];
    if (record.problemDamaged) problems.push("ชำรุด");
    if (record.problemLost) problems.push("สูญหาย");
    if (record.problemMixed) problems.push("สินค้าสลับ");
    if (record.problemWrongInv) problems.push("สินค้าไม่ตรง INV.");
    if (record.problemLate) problems.push("ส่งช้า");
    if (record.problemDuplicate) problems.push("ส่งซ้ำ");
    if (record.problemWrong) problems.push("ส่งผิด");
    if (record.problemIncomplete) problems.push("ส่งของไม่ครบ");
    if (record.problemOver) problems.push("ส่งของเกิน");
    if (record.problemWrongInfo) problems.push("ข้อมูลผิด");
    if (record.problemShortExpiry) problems.push("สินค้าอายุสั้น");
    if (record.problemTransportDamage) problems.push("สินค้าเสียหายบนรถขนส่ง");
    if (record.problemAccident) problems.push("อุบัติเหตุ");
    if (record.problemOther && record.problemOtherText) problems.push(`อื่นๆ: ${record.problemOtherText}`);
    return problems;
  }

  const getReturnStatusBadge = (status?: ReturnStatus) => {
    if (!status) {
      return <span className="text-slate-400 text-xs">-</span>;
    }
    const config = {
      'Requested': { text: 'รอรับเข้า', color: 'bg-slate-100 text-slate-600' },
      'Received': { text: 'รอ QC', color: 'bg-amber-100 text-amber-700' },
      'Graded': { text: 'รอเอกสาร', color: 'bg-blue-100 text-blue-700' },
      'Documented': { text: 'รอปิดงาน', color: 'bg-purple-100 text-purple-700' },
      'Completed': { text: 'จบงาน', color: 'bg-green-100 text-green-700' },
    }[status];

    if (!config) {
      return <span className={`px-2 py-1 text-[10px] font-bold rounded bg-slate-100 text-slate-600`}>{status}</span>;
    }
    return <span className={`px-2 py-1 text-[10px] font-bold rounded ${config.color}`}>{config.text}</span>;
  };


  return (
    <div className="p-6 h-full flex flex-col space-y-6 print:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">รายงาน NCR (NCR Report)</h2>
          <p className="text-slate-500 text-sm">ติดตามสถานะ NCR และส่งเรื่องคืนสินค้าอัตโนมัติ</p>
        </div>
        <div className="flex gap-2 text-sm font-medium">
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-slate-500">
            ทั้งหมด: {ncrReports.length}
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-green-600">
            ปกติ: {ncrReports.filter(n => n.status !== 'Canceled').length}
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-red-500">
            ยกเลิก: {ncrReports.filter(n => n.status === 'Canceled').length}
          </div>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 print:hidden">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหา เลขที่ NCR, ลูกค้า, สินค้า..."
            value={filters.query}
            onChange={e => setFilters({ ...filters, query: e.target.value })}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={e => setFilters({ ...filters, startDate: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500"
            title="Start Date"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={e => setFilters({ ...filters, endDate: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500"
            title="End Date"
          />
        </div>

        <select value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500">
          <option value="All">การดำเนินการทั้งหมด</option>
          <option value="Reject">ส่งคืน (Reject)</option>
          <option value="Scrap">ทำลาย (Scrap)</option>
        </select>
        <select value={filters.returnStatus} onChange={e => setFilters({ ...filters, returnStatus: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500">
          <option value="All">สถานะการคืนทั้งหมด</option>
          <option value="NotReturned">ยังไม่ส่งคืน</option>
          <option value="Requested">รอรับเข้า</option>
          <option value="Received">รอ QC</option>
          <option value="Graded">รอเอกสาร</option>
          <option value="Documented">รอปิดงาน</option>
          <option value="Completed">จบงานแล้ว</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
          <input type="checkbox" checked={filters.hasCost} onChange={e => setFilters({ ...filters, hasCost: e.target.checked })} />
          มีค่าใช้จ่าย
        </label>
        <button
          onClick={handleExportExcel}
          className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
        <button
          onClick={() => setFilters({ query: '', action: 'All', returnStatus: 'All', hasCost: false, startDate: '', endDate: '' })}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg border border-slate-200"
          title="ล้างตัวกรองทั้งหมด (Show All)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col print:hidden">
        <div className="overflow-auto flex-1 relative" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm text-xs uppercase text-slate-500 font-bold">
              <tr className="whitespace-nowrap">
                <th className="px-4 py-3 bg-slate-50 sticky left-0 z-10 border-r">วันที่ / เลขที่ NCR</th>
                <th className="px-4 py-3">สินค้า (Product)</th>
                <th className="px-4 py-3">ลูกค้า (Customer)</th>
                <th className="px-4 py-3">ต้นทาง / ปลายทาง</th>
                <th className="px-4 py-3">วิเคราะห์ปัญหา (Source)</th>
                <th className="px-4 py-3 text-right">ค่าใช้จ่าย (Cost)</th>
                <th className="px-4 py-3 text-center">การดำเนินการ</th>
                <th className="px-4 py-3 text-center">สถานะการคืน</th>
                <th className="px-4 py-3 text-center bg-slate-50 sticky right-0 z-10 border-l">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedReports.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400 italic">ไม่พบรายการ NCR ในช่วงเวลานี้</td></tr>
              ) : (
                paginatedReports.map((report) => {
                  const itemData = report.item || (report as any);
                  const correspondingReturn = items.find(item => item.ncrNumber === report.ncrNo);
                  const isCanceled = report.status === 'Canceled';

                  return (
                    <tr key={report.id} className={`hover:bg-slate-50 ${isCanceled ? 'line-through text-slate-400 bg-slate-50' : ''}`}>
                      <td className={`px-4 py-3 sticky left-0 border-r ${isCanceled ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'}`}>
                        <button
                          onClick={() => handleViewNCRForm(report)}
                          disabled={isCanceled}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-left flex items-center gap-1 disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                          title="ดูใบแจ้งปัญหาระบบ (View NCR Form)"
                        >
                          {report.ncrNo || report.id} <Eye className="w-3 h-3" />
                        </button>
                        <div className="text-xs">{report.date}</div>
                        <div className="mt-1">
                          {isCanceled ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300"><XCircle className="w-3 h-3" /> ยกเลิก</span>
                          ) : report.status === 'Closed' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100"><CheckCircle className="w-3 h-3" /> Closed</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100"><Clock className="w-3 h-3" /> {report.status || 'Open'}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`font-bold flex items-center gap-2 ${isCanceled ? '' : 'text-blue-600'}`}>
                          <Package className="w-4 h-4" /> {itemData.productCode}
                        </div>
                        <div className={isCanceled ? '' : 'text-slate-700'}>{itemData.productName}</div>
                        <div className="text-xs">Qty: {itemData.quantity} {itemData.unit}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-2 font-medium ${isCanceled ? '' : 'text-slate-700'}`}>
                          <User className="w-4 h-4" /> {itemData.customerName || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="font-bold w-8">From:</span> {itemData.branch}
                        </div>
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <span className="font-bold w-8">To:</span> <span className="truncate max-w-[150px]" title={itemData.destinationCustomer}>{itemData.destinationCustomer || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[250px] whitespace-normal">
                        <div className={`text-xs font-bold ${isCanceled ? '' : 'text-slate-700'} mb-0.5`}>{report.problemDetail}</div>
                        <div className={`text-[10px] p-1 rounded border ${isCanceled ? 'bg-slate-100' : 'bg-slate-100 border-slate-200'}`}>
                          Source: {itemData.problemSource}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {itemData.hasCost ? (
                          <div className="flex flex-col items-end">
                            <span className={`font-bold flex items-center gap-1 ${isCanceled ? '' : 'text-red-600'}`}>
                              <DollarSign className="w-3 h-3" /> {itemData.costAmount?.toLocaleString()}
                            </span>
                            <span className="text-[10px]">{itemData.costResponsible}</span>
                          </div>
                        ) : (
                          <span className="text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {report.actionReject || report.actionRejectSort ? (
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold border ${isCanceled ? 'bg-slate-200' : 'bg-red-100 text-red-700 border-red-200'}`}>Reject</span>
                        ) : report.actionScrap ? (
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold border ${isCanceled ? 'bg-slate-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>Scrap</span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {correspondingReturn ? (
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold border ${correspondingReturn.status === 'Received' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            correspondingReturn.status === 'Graded' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                              correspondingReturn.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' :
                                'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }`}>
                            {correspondingReturn.status}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-center sticky right-0 border-l ${isCanceled ? 'bg-slate-100' : 'bg-white'}`}>
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleOpenPrint(report)} disabled={isCanceled} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="พิมพ์ใบส่งคืน (Print Return Note)">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEditClick(report)} disabled={isCanceled} className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="แก้ไข (Edit)">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteClick(report.id)} disabled={isCanceled} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="ยกเลิก (Cancel)">
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {isCanceled ? (
                            <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-500 px-2 py-1.5 rounded text-[10px] font-bold border border-slate-300">
                              <XCircle className="w-3 h-3" /> ยกเลิกแล้ว
                            </span>
                          ) : correspondingReturn ? (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1.5 rounded text-[10px] font-bold border border-green-200">
                              <CheckCircle className="w-3 h-3" /> ส่งคืนแล้ว
                            </span>
                          ) : (
                            (report.actionReject || report.actionScrap || report.actionRejectSort) && (
                              <button onClick={() => handleCreateReturn(report)} className="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-2 py-1.5 rounded shadow-sm transition-all transform hover:scale-105 text-[10px] font-bold" title="สร้างคำขอคืนสินค้าอัตโนมัติ">
                                ส่งคืน <ArrowRight className="w-3 h-3" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm print:hidden">
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
            <span>รายการต่อหน้า (จากทั้งหมด {filteredNcrReports.length} รายการ)</span>
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
      {/* Modals */}
      {/* Print Modal */}
      {showPrintModal && printItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:p-0 print:bg-white print:fixed print:inset-0 print:z-[9999]" style={{ margin: 0 }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col print:shadow-none print:max-w-none print:w-full print:h-full print:max-h-none print:rounded-none">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 print:hidden">
              <h3 className="font-bold flex items-center gap-2">
                <Printer className="w-5 h-5" /> พิมพ์ NCR Report
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (confirm("คุณต้องการบันทึกการแก้ไขนี้ลงในระบบหรือไม่?")) {
                      await updateNCRReport(printItem.id, printItem);
                      alert("บันทึกข้อมูลเรียบร้อย");
                    }
                  }}
                  className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100 font-bold border border-blue-200"
                >
                  บันทึกการแก้ไข (Save)
                </button>
                <button onClick={() => setShowPrintModal(false)} className="text-slate-500 hover:text-slate-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-8 overflow-auto flex-1 bg-white print:p-0 print:overflow-visible">
              <div className="print-content text-black h-full" id="print-area">
                {/* HEADER */}
                <div className="flex border-2 border-black mb-6">
                  <div className="w-[30%] border-r-2 border-black p-4 flex items-center justify-center">
                    <img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Neo Logistics" className="w-full h-auto object-contain max-h-24" />
                  </div>
                  <div className="w-[70%] p-4 flex flex-col justify-center pl-6">
                    <h2 className="text-xl font-bold text-slate-900 leading-none mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h2>
                    <h3 className="text-sm font-bold text-slate-700 mb-3">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h3>
                    <p className="text-sm text-slate-600 mb-1">159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000</p>
                    <div className="text-sm text-slate-600 flex gap-4"><span>Tax ID: 0105552087673</span><span className="text-slate-400">|</span><span>Tel: 056-275-841</span></div>
                  </div>
                </div>

                <h1 className="text-xl font-bold text-center border-2 border-black py-2 mb-6 bg-white text-slate-900 print:bg-transparent">ใบแจ้งปัญหาระบบ (NCR) / ใบแจ้งปัญหารับสินค้าคืน</h1>

                {/* INFO GRID */}
                {/* INFO GRID */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-8">
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-24 text-slate-800">ถึงหน่วยงาน:</span>
                    <div className="flex-1 border-b border-dotted border-black px-1">
                      <input
                        type="text"
                        value={printItem.toDept || 'แผนกควบคุมคุณภาพ'}
                        onChange={(e) => setPrintItem({ ...printItem, toDept: e.target.value })}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm placeholder-slate-300"
                        placeholder="ระบุหน่วยงาน..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-24 text-slate-800">วันที่:</span>
                    <div className="flex-1 border-b border-dotted border-black px-1">
                      <input
                        type="text"
                        value={printItem.date}
                        onChange={(e) => setPrintItem({ ...printItem, date: e.target.value })}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-24 text-slate-800">สำเนา:</span>
                    <div className="flex-1 border-b border-dotted border-black px-1">
                      <input
                        type="text"
                        value={printItem.copyTo || ''}
                        onChange={(e) => setPrintItem({ ...printItem, copyTo: e.target.value })}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm placeholder-slate-300"
                        placeholder="-"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-24 text-slate-800">เลขที่ NCR:</span>
                    <div className="flex-1 border-b border-dotted border-black px-1 font-bold">
                      <input
                        type="text"
                        value={printItem.ncrNo}
                        onChange={(e) => setPrintItem({ ...printItem, ncrNo: e.target.value })}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-24 text-slate-800">ผู้พบปัญหา:</span>
                    <div className="flex-1 border-b border-dotted border-black px-1">
                      <input
                        type="text"
                        value={printItem.founder || ''}
                        onChange={(e) => setPrintItem({ ...printItem, founder: e.target.value })}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm placeholder-slate-300"
                        placeholder="-"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-32 text-slate-800">เลขที่ใบสั่งซื้อ/ผลิต:</span>
                    <div className="flex-1 border-b border-dotted border-black px-1">
                      <input
                        type="text"
                        value={printItem.poNo || ''}
                        onChange={(e) => setPrintItem({ ...printItem, poNo: e.target.value })}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm placeholder-slate-300"
                        placeholder="-"
                      />
                    </div>
                  </div>
                </div>

                {/* ITEM LIST */}
                <div className="mb-6">
                  <h3 className="font-bold text-slate-900 underline mb-2">รายการสินค้าที่พบปัญหา (Non-Conforming Items)</h3>
                  <div className="border-2 border-black bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 print:bg-transparent border-b border-black font-bold">
                        <tr>
                          <th className="p-2 border-r border-black">สาขาต้นทาง</th>
                          <th className="p-2 border-r border-black">Ref/Neo Ref</th>
                          <th className="p-2 border-r border-black">สินค้า/ลูกค้า</th>
                          <th className="p-2 border-r border-black text-center">จำนวน</th>
                          <th className="p-2 border-r border-black text-right">ราคา/วันหมดอายุ</th>
                          <th className="p-2 border-r border-black">วิเคราะห์ปัญหา/ค่าใช้จ่าย</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 border-r border-black align-top">{(printItem.item || (printItem as any)).branch}</td>
                          <td className="p-2 border-r border-black align-top">
                            <div>Ref: {(printItem.item || (printItem as any)).refNo || '-'}</div>
                            <div className="text-slate-500">Neo: {(printItem.item || (printItem as any)).neoRefNo || '-'}</div>
                          </td>
                          <td className="p-2 border-r border-black align-top">
                            <div className="font-bold">{(printItem.item || (printItem as any)).productCode}</div>
                            <div className="text-slate-600">{(printItem.item || (printItem as any)).productName}</div>
                            <div className="text-slate-500">{(printItem.item || (printItem as any)).customerName}</div>
                            {(printItem.item || (printItem as any)).destinationCustomer && <div className="text-xs text-blue-600 mt-1">ปลายทาง: {(printItem.item || (printItem as any)).destinationCustomer}</div>}
                          </td>
                          <td className="p-2 border-r border-black text-center align-top">{(printItem.item || (printItem as any)).quantity} {(printItem.item || (printItem as any)).unit}</td>
                          <td className="p-2 border-r border-black text-right align-top">
                            <div>{(printItem.item || (printItem as any)).priceBill?.toLocaleString()} บ.</div>
                            <div className="text-red-500">Exp: {(printItem.item || (printItem as any)).expiryDate || '-'}</div>
                          </td>
                          <td className="p-2 align-top">
                            <div className="font-medium">{(printItem.item || (printItem as any)).problemSource}</div>
                            {(printItem.item || (printItem as any)).hasCost && (
                              <div className="text-red-600 font-bold mt-1">
                                Cost: {(printItem.item || (printItem as any)).costAmount?.toLocaleString()} บ.
                                <div className="text-xs text-slate-500 font-normal">({(printItem.item || (printItem as any)).costResponsible})</div>
                              </div>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SECTION 1: PROBLEM */}
                <table className="w-full border-2 border-black mb-6">
                  <thead>
                    <tr className="border-b-2 border-black bg-slate-50 print:bg-transparent">
                      <th className="border-r-2 border-black w-1/3 py-2 text-slate-900">รูปภาพ / เอกสาร</th>
                      <th className="py-2 text-slate-900">รายละเอียดของปัญหาที่พบ (ผู้พบปัญหา)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-r-2 border-black p-4 text-center align-middle h-64 relative bg-slate-50 print:bg-white text-slate-400 font-bold text-lg">
                        [รูปภาพประกอบ]
                      </td>
                      <td className="p-4 align-top text-sm bg-white">
                        <div className="mb-2 font-bold underline text-slate-900">พบปัญหาที่กระบวนการ</div>
                        <div className="grid grid-cols-2 gap-2 mb-4 text-slate-700">
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemDamaged} /> ชำรุด</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemLost} /> สูญหาย</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemMixed} /> สินค้าสลับ</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemWrongInv} /> สินค้าไม่ตรง INV.</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemLate} /> ส่งช้า</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemDuplicate} /> ส่งซ้ำ</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemWrong} /> ส่งผิด</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemIncomplete} /> ส่งของไม่ครบ</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemOver} /> ส่งของเกิน</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemWrongInfo} /> ข้อมูลผิด</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemShortExpiry} /> สินค้าอายุสั้น</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemTransportDamage} /> สินค้าเสียหายบนรถขนส่ง</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.problemAccident} /> อุบัติเหตุ</div>
                          <div className="flex items-center gap-2 col-span-2">
                            <input type="checkbox" readOnly checked={printItem.problemOther} />
                            <span>อื่นๆ: {printItem.problemOtherText || '-'}</span>
                          </div>
                        </div>
                        <div className="font-bold underline mb-1 text-slate-900">รายละเอียด:</div>
                        <div className="w-full min-h-[50px] border border-dotted border-black p-2 text-sm">{printItem.problemDetail}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* SECTION 2: ACTION */}
                <table className="w-full border-2 border-black mb-6 text-sm bg-white">
                  <thead><tr className="bg-slate-50 print:bg-transparent border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">การดำเนินการ</th></tr></thead>
                  <tbody className="divide-y divide-black border-b-2 border-black">
                    <tr>
                      <td className="p-2 border-r border-black w-1/2">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" readOnly checked={printItem.actionReject} />
                          <span className="font-bold">ส่งคืน (Reject)</span>
                          <span className="ml-auto text-slate-600">จำนวน: {printItem.actionRejectQty || '-'}</span>
                        </div>
                      </td>
                      <td className="p-2 w-1/2">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" readOnly checked={printItem.actionRejectSort} />
                          <span className="font-bold">คัดแยกของเสียเพื่อส่งคืน</span>
                          <span className="ml-auto text-slate-600">จำนวน: {printItem.actionRejectSortQty || '-'}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-black">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" readOnly checked={printItem.actionRework} />
                          <span className="font-bold">แก้ไข (Rework)</span>
                          <span className="ml-auto text-slate-600">จำนวน: {printItem.actionReworkQty || '-'}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">วิธีการแก้ไข:</span>
                          <span className="flex-1 border-b border-dotted border-black">{printItem.actionReworkMethod || '-'}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-black">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" readOnly checked={printItem.actionSpecialAcceptance} />
                          <span className="font-bold">ยอมรับกรณีพิเศษ</span>
                          <span className="ml-auto text-slate-600">จำนวน: {printItem.actionSpecialAcceptanceQty || '-'}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">เหตุผล:</span>
                          <span className="flex-1 border-b border-dotted border-black">{printItem.actionSpecialAcceptanceReason || '-'}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-black">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" readOnly checked={printItem.actionScrap} />
                          <span className="font-bold">ทำลาย (Scrap)</span>
                          <span className="ml-auto text-slate-600">จำนวน: {printItem.actionScrapQty || '-'}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" readOnly checked={printItem.actionReplace} />
                          <span className="font-bold">เปลี่ยนสินค้าใหม่</span>
                          <span className="ml-auto text-slate-600">จำนวน: {printItem.actionReplaceQty || '-'}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="p-3 bg-white print:bg-transparent">
                        <div className="flex justify-between items-center gap-4 text-sm">
                          <div className="flex items-center gap-2"><span>กำหนดแล้วเสร็จ:</span> <span className="border-b border-dotted border-black px-2">{printItem.dueDate || '-'}</span></div>
                          <div className="flex items-center gap-2"><span>ผู้อนุมัติ:</span> <span className="border-b border-dotted border-black px-2 w-24 text-center">{printItem.approver || '-'}</span></div>
                          <div className="flex items-center gap-2"><span>ตำแหน่ง:</span> <span className="border-b border-dotted border-black px-2">{printItem.approverPosition || '-'}</span></div>
                          <div className="flex items-center gap-2"><span>วันที่:</span> <span className="border-b border-dotted border-black px-2">{printItem.approverDate || '-'}</span></div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* SECTION 3: ROOT CAUSE */}
                <table className="w-full border-2 border-black mb-6 text-sm bg-white">
                  <thead><tr className="bg-slate-50 print:bg-transparent border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">สาเหตุ-การป้องกัน (ผู้รับผิดชอบปัญหา)</th></tr></thead>
                  <tbody>
                    <tr>
                      <td className="w-1/4 border-r-2 border-black align-top p-0">
                        <div className="border-b border-black p-2 font-bold text-center bg-slate-50 print:bg-transparent">สาเหตุเกิดจาก</div>
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.causePackaging} /> บรรจุภัณฑ์</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.causeTransport} /> การขนส่ง</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.causeOperation} /> ปฏิบัติงาน</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.causeEnv} /> สิ่งแวดล้อม</div>
                        </div>
                      </td>
                      <td className="align-top p-0">
                        <div className="h-24 border-b border-black p-2 flex flex-col">
                          <div className="font-bold mb-1">รายละเอียดสาเหตุ :</div>
                          <div className="flex-1 w-full">{printItem.causeDetail || '-'}</div>
                        </div>
                        <div className="h-24 p-2 flex flex-col">
                          <div className="font-bold underline mb-1">แนวทางป้องกัน :</div>
                          <div className="flex-1 w-full">{printItem.preventionDetail || '-'}</div>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-t-2 border-black">
                      <td colSpan={2} className="p-3 bg-white print:bg-transparent">
                        <div className="flex justify-between items-center gap-4 text-sm">
                          <div className="flex items-center gap-2"><span>กำหนดการป้องกันแล้วเสร็จ:</span> <span className="border-b border-dotted border-black px-2">{printItem.preventionDueDate || '-'}</span></div>
                          <div className="flex items-center gap-2"><span>ผู้รับผิดชอบ:</span> <span className="border-b border-dotted border-black px-2 w-24 text-center">{printItem.responsiblePerson || '-'}</span></div>
                          <div className="flex items-center gap-2"><span>ตำแหน่ง:</span> <span className="border-b border-dotted border-black px-2">{printItem.responsiblePosition || '-'}</span></div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* FOOTER NOTE */}
                <div className="border-2 border-black p-2 mb-6 text-xs bg-white">
                  <span className="font-bold">หมายเหตุ :</span> เมื่อทาง Supplier/Out source หรือหน่วยงานผู้รับผิดชอบปัญหา ได้รับเอกสารใบ NCR กรุณาระบุสาเหตุ-การป้องกัน และตอบกลับมายังแผนกประกันคุณภาพ ภายใน 1 สัปดาห์
                </div>

                {/* CLOSING / SIGNATURES */}
                <table className="w-full border-2 border-black text-sm bg-white">
                  <thead><tr className="bg-slate-50 print:bg-transparent border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">การตรวจติดตามและการปิด NCR</th></tr></thead>
                  <tbody>
                    <tr className="border-b-2 border-black">
                      <td colSpan={2} className="p-4">
                        <div className="flex items-center gap-8">
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.qaAccept} /> ยอมรับแนวทางการป้องกัน</div>
                          <div className="flex items-center gap-2"><input type="checkbox" readOnly checked={printItem.qaReject} /> ไม่ยอมรับแนวทางการป้องกัน</div>
                          <span className="border-b border-dotted border-black px-2">เหตุผล: {printItem.qaReason || '-'}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="w-1/2 border-r-2 border-black p-4 text-center align-bottom h-32">
                        <div className="font-bold mb-8">ผู้ตรวจติดตาม</div>
                        <div className="border-b border-dotted border-black w-3/4 mx-auto mb-2"></div>
                        <div className="text-slate-500 text-xs">แผนกประกันคุณภาพ</div>
                      </td>
                      <td className="w-1/2 p-4 text-center align-bottom h-32">
                        <div className="font-bold mb-8">ผู้อนุมัติปิดการตรวจติดตาม</div>
                        <div className="border-b border-dotted border-black w-3/4 mx-auto mb-2"></div>
                        <div className="text-slate-500 text-xs">กรรมการผู้จัดการ</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="text-right text-xs mt-4 font-mono text-slate-400">FM-OP01-06 Rev.00</div>
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 print:hidden">
              <button onClick={() => setShowPrintModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded">ปิด</button>
              <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 font-bold shadow-sm">
                <Printer className="w-4 h-4" /> พิมพ์เอกสาร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NCR Form Modal (Edit Mode) */}
      {showNCRFormModal && ncrFormItem && (
        <div id="ncr-modal-overlay" className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 pt-10 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl my-8">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 rounded-t-lg z-10">
              <h3 className="font-bold flex items-center gap-2 text-lg">
                {isEditMode ? <Edit className="w-5 h-5 text-amber-500" /> : <Eye className="w-5 h-5 text-blue-500" />}
                {isEditMode ? 'แก้ไขข้อมูล NCR' : 'ดูรายละเอียด NCR'}
              </h3>
              <button onClick={() => setShowNCRFormModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Read Only Header Info - REPLACED WITH EDITABLE HEADER */}
              <div className="bg-white shadow-xl border border-slate-200 relative p-8 min-w-[800px]">
                {/* HEADER */}
                <div className="flex border-2 border-black mb-6">
                  <div className="w-[30%] border-r-2 border-black p-4 flex items-center justify-center"><img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Neo Logistics" className="w-full h-auto object-contain max-h-24" /></div>
                  <div className="w-[70%] p-4 flex flex-col justify-center pl-6"><h2 className="text-xl font-bold text-slate-900 leading-none mb-2">บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด</h2><h3 className="text-sm font-bold text-slate-700 mb-3">NEOSIAM LOGISTICS & TRANSPORT CO., LTD.</h3><p className="text-sm text-slate-600 mb-1">159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000</p><div className="text-sm text-slate-600 flex gap-4"><span>Tax ID: 0105552087673</span><span className="text-slate-400">|</span><span>Tel: 056-275-841</span></div></div>
                </div>
                <h1 className="text-xl font-bold text-center border-2 border-black py-2 mb-6 bg-white text-slate-900">ใบแจ้งปัญหาระบบ (NCR) / ใบแจ้งปัญหารับสินค้าคืน</h1>

                {/* INFO GRID */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-8">
                  <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">ถึงหน่วยงาน:</label><input type="text" disabled={!isEditMode} className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700" value={ncrFormItem.toDept || ''} onChange={e => handleInputChange('toDept', e.target.value)} /></div>
                  <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">วันที่:</label><input type="date" disabled={!isEditMode} className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700" value={ncrFormItem.date} onChange={e => handleInputChange('date', e.target.value)} /></div>
                  <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">สำเนา:</label><input type="text" disabled={!isEditMode} className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700" value={ncrFormItem.copyTo || ''} onChange={e => handleInputChange('copyTo', e.target.value)} /></div>
                  <div className="flex items-center gap-2">
                    <label className="font-bold w-24 text-slate-800">เลขที่ NCR: <span className="text-red-500">*</span></label>
                    <div className="flex-1 border-b border-dotted border-slate-400 bg-slate-100 outline-none px-2 py-1 font-mono text-slate-500 font-bold rounded-sm text-center">
                      {ncrFormItem.ncrNo}
                    </div>
                  </div>
                  <div className="flex items-center gap-2"><label className="font-bold w-24 text-slate-800">ผู้พบปัญหา: <span className="text-red-500">*</span></label><input type="text" disabled={!isEditMode} className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700" value={ncrFormItem.founder || ''} onChange={e => handleInputChange('founder', e.target.value)} /></div>
                  <div className="flex items-center gap-2"><label className="font-bold w-32 text-slate-800">เลขที่ใบสั่งซื้อ/ผลิต:</label><input type="text" disabled={!isEditMode} className="flex-1 border-b border-dotted border-slate-400 bg-transparent outline-none px-1 text-slate-700" value={ncrFormItem.poNo || ''} onChange={e => handleInputChange('poNo', e.target.value)} /></div>
                </div>

                {/* ITEM LIST */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-900 underline">รายการสินค้าที่พบปัญหา (Non-Conforming Items) <span className="text-red-500">*</span></h3></div>
                  <div className="border-2 border-black bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 border-b border-black font-bold"><tr><th className="p-2 border-r border-black">สาขาต้นทาง</th><th className="p-2 border-r border-black">Ref/Neo Ref</th><th className="p-2 border-r border-black">สินค้า/ลูกค้า</th><th className="p-2 border-r border-black text-center">จำนวน</th><th className="p-2 border-r border-black text-right">ราคา/วันหมดอายุ</th><th className="p-2 border-r border-black">วิเคราะห์ปัญหา/ค่าใช้จ่าย</th></tr></thead>
                      <tbody className="divide-y divide-black">
                        <tr>
                          <td className="p-2 border-r border-black align-top">
                            <input type="text" disabled={!isEditMode} className="w-full bg-transparent border-b border-dotted border-slate-300" value={(ncrFormItem.item || (ncrFormItem as any)).branch || ''} onChange={e => handleItemInputChange('branch', e.target.value)} />
                          </td>
                          <td className="p-2 border-r border-black align-top">
                            <div className="flex items-center gap-1"><span>Ref:</span><input type="text" disabled={!isEditMode} className="flex-1 bg-transparent border-b border-dotted border-slate-300 w-20" value={(ncrFormItem.item || (ncrFormItem as any)).refNo || ''} onChange={e => handleItemInputChange('refNo', e.target.value)} /></div>
                            <div className="flex items-center gap-1 mt-1 text-slate-500"><span>Neo:</span><input type="text" disabled={!isEditMode} className="flex-1 bg-transparent border-b border-dotted border-slate-300 w-20" value={(ncrFormItem.item || (ncrFormItem as any)).neoRefNo || ''} onChange={e => handleItemInputChange('neoRefNo', e.target.value)} /></div>
                          </td>
                          <td className="p-2 border-r border-black align-top">
                            <input type="text" disabled={!isEditMode} className="w-full font-bold bg-transparent border-b border-dotted border-slate-300 mb-1" value={(ncrFormItem.item || (ncrFormItem as any)).productCode || ''} onChange={e => handleItemInputChange('productCode', e.target.value)} />
                            <input type="text" disabled={!isEditMode} className="w-full text-slate-600 font-medium bg-transparent border-b border-dotted border-slate-300 mb-1" value={(ncrFormItem.item || (ncrFormItem as any)).productName || ''} onChange={e => handleItemInputChange('productName', e.target.value)} />
                            <input type="text" disabled={!isEditMode} className="w-full text-slate-500 bg-transparent border-b border-dotted border-slate-300" value={(ncrFormItem.item || (ncrFormItem as any)).customerName || ''} onChange={e => handleItemInputChange('customerName', e.target.value)} />
                            <div className="mt-1 flex items-center gap-1 text-xs text-blue-600"><span>ปลายทาง:</span><input type="text" disabled={!isEditMode} className="flex-1 bg-transparent border-b border-dotted border-blue-200" value={(ncrFormItem.item || (ncrFormItem as any)).destinationCustomer || ''} onChange={e => handleItemInputChange('destinationCustomer', e.target.value)} /></div>
                          </td>
                          <td className="p-2 border-r border-black text-center align-top">
                            <div className="flex items-center justify-center gap-1">
                              <input type="number" disabled={!isEditMode} className="w-12 text-center bg-transparent border-b border-dotted border-slate-300" value={(ncrFormItem.item || (ncrFormItem as any)).quantity || 0} onChange={e => handleItemInputChange('quantity', Number(e.target.value))} />
                              <input type="text" disabled={!isEditMode} className="w-8 text-center bg-transparent border-b border-dotted border-slate-300" value={(ncrFormItem.item || (ncrFormItem as any)).unit || ''} onChange={e => handleItemInputChange('unit', e.target.value)} />
                            </div>
                          </td>
                          <td className="p-2 border-r border-black text-right align-top">
                            <div><input type="number" disabled={!isEditMode} className="w-20 text-right bg-transparent border-b border-dotted border-slate-300" value={(ncrFormItem.item || (ncrFormItem as any)).priceBill || 0} onChange={e => handleItemInputChange('priceBill', Number(e.target.value))} /> บ.</div>
                            <div className="text-red-500 mt-1 flex items-center justify-end gap-1"><span>Exp:</span><input type="date" disabled={!isEditMode} className="w-24 bg-transparent border-none text-right text-xs" value={(ncrFormItem.item || (ncrFormItem as any)).expiryDate || ''} onChange={e => handleItemInputChange('expiryDate', e.target.value)} /></div>
                          </td>
                          <td className="p-2 border-r border-black align-top">
                            <textarea disabled={!isEditMode} className="w-full h-12 text-xs resize-none bg-transparent border-b border-dotted border-slate-300" value={(ncrFormItem.item || (ncrFormItem as any)).problemSource || ''} onChange={e => handleItemInputChange('problemSource', e.target.value)} placeholder="ระบุสาเหตุ..."></textarea>
                            <div className="mt-1">
                              <label className="flex items-center gap-1 text-red-600 font-bold cursor-pointer"><input type="checkbox" disabled={!isEditMode} checked={(ncrFormItem.item || (ncrFormItem as any)).hasCost} onChange={e => handleItemInputChange('hasCost', e.target.checked)} /> Has Cost</label>
                              {(ncrFormItem.item || (ncrFormItem as any)).hasCost && (
                                <div className="pl-4 mt-1">
                                  <div className="flex items-center gap-1"><span className="text-red-600 font-bold">Cost:</span><input type="number" disabled={!isEditMode} className="w-20 bg-transparent border-b border-dotted border-red-300 text-red-600 font-bold" value={(ncrFormItem.item || (ncrFormItem as any)).costAmount || 0} onChange={e => handleItemInputChange('costAmount', Number(e.target.value))} /> บ.</div>
                                  <div className="flex items-center gap-1 text-slate-500"><span className="text-xs">รับผิดชอบ:</span><input type="text" disabled={!isEditMode} className="w-20 bg-transparent border-b border-dotted border-slate-300 text-xs" value={(ncrFormItem.item || (ncrFormItem as any)).costResponsible || ''} onChange={e => handleItemInputChange('costResponsible', e.target.value)} /></div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SECTION 1: PROBLEM */}
                <table className="w-full border-2 border-black mb-6"><thead><tr className="border-b-2 border-black bg-slate-50"><th className="border-r-2 border-black w-1/3 py-2 text-slate-900">รูปภาพ / เอกสาร</th><th className="py-2 text-slate-900">รายละเอียดของปัญหาที่พบ (ผู้พบปัญหา)</th></tr></thead><tbody><tr><td className="border-r-2 border-black p-4 text-center align-middle h-64 relative bg-white"><div className="flex flex-col items-center justify-center text-red-500 opacity-50"><h2 className="text-3xl font-bold mb-2">รูปภาพ / เอกสาร</h2><h2 className="text-3xl font-bold">ตามแนบ</h2><ImageIcon className="w-16 h-16 mt-4" /></div></td><td className="p-4 align-top text-sm bg-white"><div className="mb-2 font-bold underline text-slate-900">พบปัญหาที่กระบวนการ <span className="text-red-500">*</span></div><div className="grid grid-cols-2 gap-2 mb-4 text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemDamaged} onChange={e => handleInputChange('problemDamaged', e.target.checked)} /> ชำรุด</label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemDamagedInBox} onChange={e => handleInputChange('problemDamagedInBox', e.target.checked)} /> ชำรุดในกล่อง</label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemLost} onChange={e => handleInputChange('problemLost', e.target.checked)} /> สูญหาย</label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemMixed} onChange={e => handleInputChange('problemMixed', e.target.checked)} /> สินค้าสลับ</label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemWrongInv} onChange={e => handleInputChange('problemWrongInv', e.target.checked)} /> สินค้าไม่ตรง INV.</label>

                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemLate} onChange={e => handleInputChange('problemLate', e.target.checked)} /> ส่งช้า</label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemDuplicate} onChange={e => handleInputChange('problemDuplicate', e.target.checked)} /> ส่งซ้ำ</label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemWrong} onChange={e => handleInputChange('problemWrong', e.target.checked)} /> ส่งผิด</label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemIncomplete} onChange={e => handleInputChange('problemIncomplete', e.target.checked)} /> ส่งของไม่ครบ</label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemOver} onChange={e => handleInputChange('problemOver', e.target.checked)} /> ส่งของเกิน</label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemWrongInfo} onChange={e => handleInputChange('problemWrongInfo', e.target.checked)} /> ข้อมูลผิด</label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemShortExpiry} onChange={e => handleInputChange('problemShortExpiry', e.target.checked)} /> สินค้าอายุสั้น</label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemTransportDamage} onChange={e => handleInputChange('problemTransportDamage', e.target.checked)} /> สินค้าเสียหายบนรถขนส่ง</label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemAccident} onChange={e => handleInputChange('problemAccident', e.target.checked)} /> อุบัติเหตุ</label>

                  <div className="flex items-center gap-2 p-1 col-span-2"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.problemOther} onChange={e => handleInputChange('problemOther', e.target.checked)} /> <span>อื่นๆ</span><input type="text" disabled={!isEditMode} className="border-b border-dotted border-slate-400 bg-transparent outline-none w-full text-slate-700" value={ncrFormItem.problemOtherText || ''} onChange={e => handleInputChange('problemOtherText', e.target.value)} /></div>
                </div><div className="font-bold underline mb-1 text-slate-900">รายละเอียด:</div><textarea disabled={!isEditMode} className="w-full h-32 border border-slate-200 bg-slate-50 p-2 text-sm resize-none focus:ring-1 focus:ring-blue-500 outline-none text-slate-700" value={ncrFormItem.problemDetail} onChange={e => handleInputChange('problemDetail', e.target.value)}></textarea></td></tr></tbody></table>

                {/* SECTION 2: ACTION (GRID LAYOUT) */}
                <table className="w-full border-2 border-black mb-6 text-sm bg-white">
                  <thead><tr className="bg-slate-50 border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">การดำเนินการ</th></tr></thead>
                  <tbody className="divide-y divide-black border-b-2 border-black">
                    <tr>
                      <td className="p-2 border-r border-black w-1/2"><div className="flex items-center gap-2"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.actionReject} onChange={e => handleInputChange('actionReject', e.target.checked)} /> <span className="font-bold">ส่งคืน (Reject)</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" disabled={!isEditMode} className="w-20 border-b border-dotted border-black text-center bg-transparent outline-none" value={ncrFormItem.actionRejectQty || ''} onChange={e => handleInputChange('actionRejectQty', parseInt(e.target.value) || 0)} /></div></td>
                      <td className="p-2 w-1/2"><div className="flex items-center gap-2"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.actionRejectSort} onChange={e => handleInputChange('actionRejectSort', e.target.checked)} /> <span className="font-bold">คัดแยกของเสียเพื่อส่งคืน</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" disabled={!isEditMode} className="w-20 border-b border-dotted border-black text-center bg-transparent outline-none" value={ncrFormItem.actionRejectSortQty || ''} onChange={e => handleInputChange('actionRejectSortQty', parseInt(e.target.value) || 0)} /></div></td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-black"><div className="flex items-center gap-2"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.actionRework} onChange={e => handleInputChange('actionRework', e.target.checked)} /> <span className="font-bold">แก้ไข (Rework)</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" disabled={!isEditMode} className="w-20 border-b border-dotted border-black text-center bg-transparent outline-none" value={ncrFormItem.actionReworkQty || ''} onChange={e => handleInputChange('actionReworkQty', parseInt(e.target.value) || 0)} /></div></td>
                      <td className="p-2"><div className="flex items-center gap-2"><span className="font-bold">วิธีการแก้ไข</span><input type="text" disabled={!isEditMode} className="flex-1 border-b border-dotted border-black bg-transparent outline-none" value={ncrFormItem.actionReworkMethod || ''} onChange={e => handleInputChange('actionReworkMethod', e.target.value)} /></div></td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-black"><div className="flex items-center gap-2"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.actionSpecialAcceptance} onChange={e => handleInputChange('actionSpecialAcceptance', e.target.checked)} /> <span className="font-bold">ยอมรับกรณีพิเศษ</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" disabled={!isEditMode} className="w-20 border-b border-dotted border-black text-center bg-transparent outline-none" value={ncrFormItem.actionSpecialAcceptanceQty || ''} onChange={e => handleInputChange('actionSpecialAcceptanceQty', parseInt(e.target.value) || 0)} /></div></td>
                      <td className="p-2"><div className="flex items-center gap-2"><span className="font-bold">เหตุผลในการยอมรับ</span><input type="text" disabled={!isEditMode} className="flex-1 border-b border-dotted border-black bg-transparent outline-none" value={ncrFormItem.actionSpecialAcceptanceReason || ''} onChange={e => handleInputChange('actionSpecialAcceptanceReason', e.target.value)} /></div></td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-black"><div className="flex items-center gap-2"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.actionScrap} onChange={e => handleInputChange('actionScrap', e.target.checked)} /> <span className="font-bold">ทำลาย (Scrap)</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" disabled={!isEditMode} className="w-20 border-b border-dotted border-black text-center bg-transparent outline-none" value={ncrFormItem.actionScrapQty || ''} onChange={e => handleInputChange('actionScrapQty', parseInt(e.target.value) || 0)} /></div></td>
                      <td className="p-2"><div className="flex items-center gap-2"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.actionReplace} onChange={e => handleInputChange('actionReplace', e.target.checked)} /> <span className="font-bold">เปลี่ยนสินค้าใหม่</span><span className="ml-auto text-slate-600">จำนวน:</span><input type="number" disabled={!isEditMode} className="w-20 border-b border-dotted border-black text-center bg-transparent outline-none" value={ncrFormItem.actionReplaceQty || ''} onChange={e => handleInputChange('actionReplaceQty', parseInt(e.target.value) || 0)} /></div></td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="p-3 bg-white">
                        <div className="flex justify-between items-center gap-4 text-sm">
                          <div className="flex items-center gap-2"><span>กำหนดแล้วเสร็จ</span><input type="date" disabled={!isEditMode} className="border-b border-dotted border-black bg-transparent text-slate-700 outline-none" value={ncrFormItem.dueDate || ''} onChange={e => handleInputChange('dueDate', e.target.value)} /></div>
                          <div className="flex items-center gap-2"><span>ผู้อนุมัติ</span><input type="text" disabled={!isEditMode} className="w-32 border-b border-dotted border-black bg-transparent text-slate-700 text-center outline-none" value={ncrFormItem.approver || ''} onChange={e => handleInputChange('approver', e.target.value)} /></div>
                          <div className="flex items-center gap-2"><span>ตำแหน่ง</span><input type="text" disabled={!isEditMode} className="w-24 border-b border-dotted border-black bg-transparent text-slate-700 text-center outline-none" value={ncrFormItem.approverPosition || ''} onChange={e => handleInputChange('approverPosition', e.target.value)} /></div>
                          <div className="flex items-center gap-2"><span>วันที่</span><input type="date" disabled={!isEditMode} className="border-b border-dotted border-black bg-transparent text-slate-700 outline-none" value={ncrFormItem.approverDate || ''} onChange={e => handleInputChange('approverDate', e.target.value)} /></div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* SECTION 3: ROOT CAUSE & PREVENTION */}
                <table className="w-full border-2 border-black mb-6 text-sm bg-white">
                  <thead><tr className="bg-slate-50 border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">สาเหตุ-การป้องกัน (ผู้รับผิดชอบปัญหา)</th></tr></thead>
                  <tbody>
                    <tr>
                      <td className="w-1/4 border-r-2 border-black align-top p-0">
                        <div className="border-b border-black p-2 font-bold text-center bg-slate-50">สาเหตุเกิดจาก</div>
                        <div className="p-4 space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.causePackaging} onChange={e => handleInputChange('causePackaging', e.target.checked)} /> บรรจุภัณฑ์</label>
                          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.causeTransport} onChange={e => handleInputChange('causeTransport', e.target.checked)} /> การขนส่ง</label>
                          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.causeOperation} onChange={e => handleInputChange('causeOperation', e.target.checked)} /> ปฏิบัติงาน</label>
                          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.causeEnv} onChange={e => handleInputChange('causeEnv', e.target.checked)} /> สิ่งแวดล้อม</label>
                        </div>
                      </td>
                      <td className="align-top p-0">
                        <div className="h-24 border-b border-black p-2 flex flex-col">
                          <div className="font-bold mb-1">รายละเอียดสาเหตุ :</div>
                          <textarea disabled={!isEditMode} className="flex-1 w-full bg-transparent outline-none resize-none text-slate-700" value={ncrFormItem.causeDetail || ''} onChange={e => handleInputChange('causeDetail', e.target.value)}></textarea>
                        </div>
                        <div className="h-24 p-2 flex flex-col">
                          <div className="font-bold underline mb-1">แนวทางป้องกัน :</div>
                          <textarea disabled={!isEditMode} className="flex-1 w-full bg-transparent outline-none resize-none text-slate-700" value={ncrFormItem.preventionDetail || ''} onChange={e => handleInputChange('preventionDetail', e.target.value)}></textarea>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-t-2 border-black">
                      <td colSpan={2} className="p-3 bg-white">
                        <div className="flex justify-between items-center gap-4 text-sm">
                          <div className="flex items-center gap-2"><span>กำหนดการป้องกันแล้วเสร็จ</span><input type="date" disabled={!isEditMode} className="border-b border-dotted border-black bg-transparent text-slate-700 outline-none" value={ncrFormItem.preventionDueDate || ''} onChange={e => handleInputChange('preventionDueDate', e.target.value)} /></div>
                          <div className="flex items-center gap-2"><span>ผู้รับผิดชอบ</span><input type="text" disabled={!isEditMode} className="w-32 border-b border-dotted border-black bg-transparent text-slate-700 text-center outline-none" value={ncrFormItem.responsiblePerson || ''} onChange={e => handleInputChange('responsiblePerson', e.target.value)} /></div>
                          <div className="flex items-center gap-2"><span>ตำแหน่ง</span><input type="text" disabled={!isEditMode} className="w-24 border-b border-dotted border-black bg-transparent text-slate-700 text-center outline-none" value={ncrFormItem.responsiblePosition || ''} onChange={e => handleInputChange('responsiblePosition', e.target.value)} /></div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* NOTE */}
                <div className="border-2 border-black p-2 mb-6 text-xs bg-white">
                  <span className="font-bold">หมายเหตุ :</span> เมื่อทาง Supplier/Out source หรือหน่วยงานผู้รับผิดชอบปัญหา ได้รับเอกสารใบ NCR กรุณาระบุสาเหตุ-การป้องกัน และตอบกลับมายังแผนกประกันคุณภาพ ภายใน 1 สัปดาห์
                </div>

                {/* SECTION 4: CLOSING */}
                <table className="w-full border-2 border-black text-sm bg-white">
                  <thead><tr className="bg-slate-50 border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold text-slate-900">การตรวจติดตามและการปิด NCR</th></tr></thead>
                  <tbody>
                    <tr className="border-b-2 border-black">
                      <td colSpan={2} className="p-4">
                        <div className="flex items-center gap-8">
                          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.qaAccept} onChange={e => handleInputChange('qaAccept', e.target.checked)} /> ยอมรับแนวทางการป้องกัน</label>
                          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" disabled={!isEditMode} checked={ncrFormItem.qaReject} onChange={e => handleInputChange('qaReject', e.target.checked)} /> ไม่ยอมรับแนวทางการป้องกัน</label>
                          <input type="text" disabled={!isEditMode} className="flex-1 border-b border-dotted border-black bg-transparent outline-none text-slate-700" placeholder="ระบุเหตุผล (ถ้ามี)" value={ncrFormItem.qaReason || ''} onChange={e => handleInputChange('qaReason', e.target.value)} />
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="w-1/2 border-r-2 border-black p-4 text-center align-bottom h-32">
                        <div className="font-bold mb-8">ผู้ตรวจติดตาม</div>
                        <div className="border-b border-dotted border-black w-3/4 mx-auto mb-2"></div>
                        <div className="text-slate-500 text-xs">แผนกประกันคุณภาพ</div>
                      </td>
                      <td className="w-1/2 p-4 text-center align-bottom h-32">
                        <div className="font-bold mb-8">ผู้อนุมัติปิดการตรวจติดตาม</div>
                        <div className="border-b border-dotted border-black w-3/4 mx-auto mb-2"></div>
                        <div className="text-slate-500 text-xs">กรรมการผู้จัดการ</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-right text-xs mt-4 font-mono text-slate-400">FM-OP01-06 Rev.00</div>
              </div>




            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 sticky bottom-0 rounded-b-lg">
              <button onClick={() => setShowNCRFormModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded">ปิด</button>
              {isEditMode && (
                <button onClick={handleSaveChanges} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 font-bold shadow-sm">
                  <Save className="w-4 h-4" /> บันทึกการแก้ไข
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Password Modal for Edit */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
            <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">ยืนยันสิทธิ์การแก้ไข</h3>
            <p className="text-slate-500 text-sm mb-4">กรุณากรอกรหัสผ่านเพื่อแก้ไขข้อมูล NCR</p>
            <input
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="รหัสผ่าน (1234)"
              className="w-full border rounded p-2 text-center text-lg tracking-widest mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">ยกเลิก</button>
              <button onClick={handleVerifyPassword} className="px-6 py-2 bg-amber-500 text-white rounded font-bold hover:bg-amber-600">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal for Delete */}
      {showDeletePasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2 text-red-600">ยืนยันการยกเลิก NCR</h3>
            <p className="text-slate-500 text-sm mb-4">การกระทำนี้ไม่สามารถเรียกคืนได้<br />กรุณากรอกรหัสผ่านเพื่อยืนยัน</p>
            <input
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="รหัสผ่าน (1234)"
              className="w-full border rounded p-2 text-center text-lg tracking-widest mb-4 border-red-200 focus:ring-red-500"
              autoFocus
            />
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowDeletePasswordModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">ยกเลิก</button>
              <button onClick={handleVerifyPasswordAndDelete} className="px-6 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NCRReport;