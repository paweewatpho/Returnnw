import React, { useState, useEffect, useMemo } from 'react';
import { useData, NCRRecord, NCRItem } from '../DataContext';
import { FileText, AlertTriangle, ArrowRight, CheckCircle, Clock, MapPin, DollarSign, Package, User, Printer, X, Save, Eye, Edit, Lock, Trash2, CheckSquare, Search, Filter, Download, XCircle, RotateCcw } from 'lucide-react';
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

  // New Filters State with Date Range
  const [filters, setFilters] = useState({
    query: '',
    action: 'All',
    returnStatus: 'All',
    hasCost: false,
    startDate: '',
    endDate: '',
  });

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
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
              <tr>
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
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredNcrReports.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">ไม่พบรายการ NCR ที่ตรงกับเงื่อนไข</td></tr>
              ) : (
                filteredNcrReports.map((report) => {
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
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold border ${isCanceled ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-200 text-slate-700 border-slate-300'}`}>Scrap</span>
                        ) : (
                          <span className="text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getReturnStatusBadge(correspondingReturn?.status)}
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
      </div>
      {/* ... Modals ... */}
    </div>
  );
};

export default NCRReport;