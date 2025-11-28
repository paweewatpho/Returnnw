

import React, { useState, useEffect } from 'react';
import { useData, NCRRecord, NCRItem } from '../DataContext';
// FIX: Import CheckSquare icon from lucide-react to resolve 'Cannot find name' errors.
import { FileText, AlertTriangle, ArrowRight, CheckCircle, Clock, MapPin, DollarSign, Package, User, Printer, X, Save, Eye, Edit, Lock, Trash2, CheckSquare } from 'lucide-react';
import { ReturnRecord } from '../types';

interface NCRReportProps {
  onTransfer: (data: Partial<ReturnRecord>) => void;
}

const NCRReport: React.FC<NCRReportProps> = ({ onTransfer }) => {
  const { ncrReports, updateNCRReport, deleteNCRReport } = useData();
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printItem, setPrintItem] = useState<NCRRecord | null>(null);
  
  // State for Viewing/Editing Original NCR Form
  const [showNCRFormModal, setShowNCRFormModal] = useState(false);
  const [ncrFormItem, setNcrFormItem] = useState<NCRRecord | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Password Modal State for Edit
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingEditItem, setPendingEditItem] = useState<NCRRecord | null>(null);
  
  // Password Modal State for Delete
  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false);
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null);

  const handleCreateReturn = (ncr: NCRRecord) => {
    // FIX: Make backward-compatible
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
      setNcrFormItem({ ...item }); // Clone object to avoid direct mutation
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
            const success = await deleteNCRReport(pendingDeleteItemId);
            if (success) {
                alert(`ลบรายการ NCR สำเร็จ`);
            } else {
                alert('การลบล้มเหลว กรุณาตรวจสอบสิทธิ์');
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
      if(success){
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

  // Helper to handle input changes in the modal
  const handleInputChange = (field: keyof NCRRecord, value: any) => {
      if (ncrFormItem) {
          setNcrFormItem({ ...ncrFormItem, [field]: value });
      }
  };

  // FIX: Handle updates for both nested and flat structures.
  const handleItemInputChange = (field: keyof NCRItem, value: any) => {
    if (ncrFormItem) {
        if (ncrFormItem.item) {
             setNcrFormItem({ 
                ...ncrFormItem, 
                item: { ...ncrFormItem.item, [field]: value }
            });
        } else {
            // Fallback for old flat structure
            setNcrFormItem({ ...ncrFormItem, [field]: value });
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

  return (
    <div className="p-6 h-full flex flex-col space-y-6 print:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">รายงาน NCR (NCR Report)</h2>
           <p className="text-slate-500 text-sm">ติดตามสถานะ NCR และส่งเรื่องคืนสินค้าอัตโนมัติ</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col print:hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                <tr>
                <th className="px-4 py-3 bg-slate-50 sticky left-0 z-10 border-r">วันที่ / เลขที่ NCR</th>
                <th className="px-4 py-3">สินค้า (Product)</th>
                <th className="px-4 py-3">ชื่อลูกค้า (Customer)</th>
                <th className="px-4 py-3">ข้อมูลอ้างอิง (Refs)</th>
                <th className="px-4 py-3">ต้นทาง / ปลายทาง</th>
                <th className="px-4 py-3">วิเคราะห์ปัญหา (Source)</th>
                <th className="px-4 py-3 text-right">ค่าใช้จ่าย (Cost)</th>
                <th className="px-4 py-3 text-center">การดำเนินการ</th>
                <th className="px-4 py-3 text-center bg-slate-50 sticky right-0 z-10 border-l">จัดการ</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
                {ncrReports.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">ไม่พบรายการ NCR</td></tr>
                ) : (
                    ncrReports.map((report) => {
                    const itemData = report.item || (report as any);

                    return (
                    <tr key={report.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 sticky left-0 bg-white hover:bg-slate-50 border-r">
                            <button 
                                onClick={() => handleViewNCRForm(report)}
                                className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-left flex items-center gap-1"
                                title="ดูใบแจ้งปัญหาระบบ (View NCR Form)"
                            >
                                {report.ncrNo || report.id} <Eye className="w-3 h-3" />
                            </button>
                            <div className="text-xs text-slate-500">{report.date}</div>
                            <div className="mt-1">
                                {report.status === 'Closed' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100"><CheckCircle className="w-3 h-3" /> Closed</span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100"><Clock className="w-3 h-3" /> {report.status || 'Open'}</span>
                                )}
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <div className="font-bold text-blue-600 flex items-center gap-2">
                                <Package className="w-4 h-4" /> {itemData.productCode}
                            </div>
                            <div className="text-slate-700">{itemData.productName}</div>
                            <div className="text-xs text-slate-500">Qty: {itemData.quantity} {itemData.unit}</div>
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2 font-medium text-slate-700">
                                <User className="w-4 h-4 text-slate-400" /> {itemData.customerName || '-'}
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <div className="text-xs text-slate-500">Ref: <span className="font-mono text-slate-700">{itemData.refNo}</span></div>
                            <div className="text-xs text-slate-500">Neo: <span className="font-mono text-slate-700">{itemData.neoRefNo}</span></div>
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                                <span className="font-bold w-8">From:</span> {itemData.branch}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                                <span className="font-bold w-8">To:</span> <span className="truncate max-w-[150px]" title={itemData.destinationCustomer}>{itemData.destinationCustomer || '-'}</span>
                            </div>
                        </td>
                        <td className="px-4 py-3 max-w-[250px] whitespace-normal">
                            <div className="text-xs font-bold text-slate-700 mb-0.5">{report.problemDetail}</div>
                            <div className="text-[10px] text-slate-500 bg-slate-100 p-1 rounded border border-slate-200">
                                Source: {itemData.problemSource}
                            </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                            {itemData.hasCost ? (
                                <div className="flex flex-col items-end">
                                    <span className="text-red-600 font-bold flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" /> {itemData.costAmount?.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{itemData.costResponsible}</span>
                                </div>
                            ) : (
                                <span className="text-slate-300 text-xs">-</span>
                            )}
                        </td>
                        <td className="px-4 py-3 text-center">
                        {report.actionReject ? (
                            <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">Reject</span>
                        ) : report.actionRejectSort ? (
                            <span className="inline-block px-2 py-1 rounded bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">Sort/Return</span>
                        ) : report.actionScrap ? (
                            <span className="inline-block px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-300">Scrap</span>
                        ) : (
                            <span className="text-slate-400 text-xs">-</span>
                        )}
                        </td>
                        <td className="px-4 py-3 text-center bg-white sticky right-0 border-l">
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => handleOpenPrint(report)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="พิมพ์ใบส่งคืน (Print Return Note)">
                                    <Printer className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleEditClick(report)} className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors" title="แก้ไข (Edit)">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteClick(report.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors" title="ลบ (Delete)">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                {(report.actionReject || report.actionScrap || report.actionRejectSort) && (
                                    <button onClick={() => handleCreateReturn(report)} className="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-2 py-1.5 rounded shadow-sm transition-all transform hover:scale-105 text-[10px] font-bold" title="สร้างคำขอคืนสินค้าอัตโนมัติ">
                                    ส่งคืน <ArrowRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                    )}
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* PASSWORD MODAL FOR EDIT */}
      {showPasswordModal && (
          <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
                  <div className="flex items-center gap-3 mb-4 text-slate-800">
                      <div className="bg-amber-100 p-2 rounded-full"><Lock className="w-6 h-6 text-amber-600" /></div>
                      <h3 className="text-lg font-bold">ยืนยันสิทธิ์การแก้ไข</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">กรุณาระบุรหัสผ่านเพื่อแก้ไขข้อมูล NCR</p>
                  <input 
                    type="password" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-center tracking-widest text-lg font-bold mb-6 focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="Enter Password" 
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">ยกเลิก</button>
                      <button onClick={handleVerifyPassword} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm">ยืนยัน</button>
                  </div>
              </div>
          </div>
      )}

      {/* DELETE PASSWORD MODAL */}
      {showDeletePasswordModal && (
          <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
                  <div className="flex items-center gap-3 mb-4 text-slate-800">
                      <div className="bg-red-100 p-2 rounded-full"><Lock className="w-6 h-6 text-red-600" /></div>
                      <h3 className="text-lg font-bold">ยืนยันการลบข้อมูล</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">กรุณาระบุรหัสผ่านเพื่อยืนยันการลบ NCR <span className="font-bold text-red-600 break-all">{pendingDeleteItemId}</span></p>
                  <input 
                    type="password" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-center tracking-widest text-lg font-bold mb-6 focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="Enter Password" 
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPasswordAndDelete()}
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setShowDeletePasswordModal(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">ยกเลิก</button>
                      <button onClick={handleVerifyPasswordAndDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-sm">ยืนยันการลบ</button>
                  </div>
              </div>
          </div>
      )}


      {/* PRINT MODAL (Return Note) */}
      {showPrintModal && printItem && (() => {
        const itemData = printItem.item || (printItem as any);
        return (
            <div className="fixed inset-0 z-[100] bg-black/70 overflow-y-auto flex items-start justify-center p-4 backdrop-blur-sm print:bg-white print:p-0 print:overflow-visible print:fixed print:inset-0 print:z-[9999]">
                <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl flex flex-col my-8 shrink-0 print:m-0 print:w-full print:h-full print:shadow-none relative">
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center print:hidden rounded-t-lg">
                        <h3 className="font-bold flex items-center gap-2"><Printer className="w-5 h-5" /> สร้างใบส่งคืนสินค้า (Return Note)</h3>
                        <div className="flex gap-2">
                            <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm"><Printer className="w-4 h-4" /> Print / Save PDF</button>
                            <button onClick={() => setShowPrintModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                     <div className="p-10 flex-1">
                        <div className="text-center mb-6">
                            <h1 className="text-xl font-bold uppercase">ใบส่งคืนสินค้า (Return Note)</h1>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4 border-y border-black py-2">
                            <div className="space-y-1">
                                <p><span className="font-bold w-24 inline-block">วันที่ (Date):</span> {printItem.date}</p>
                                <p><span className="font-bold w-24 inline-block">อ้างอิง (Ref):</span> {itemData.refNo}</p>
                                <p><span className="font-bold w-24 inline-block">NCR No:</span> {printItem.ncrNo}</p>
                            </div>
                            <div className="space-y-1">
                                <p><span className="font-bold w-28 inline-block">ต้นทาง (From):</span> {itemData.branch}</p>
                                <p><span className="font-bold w-28 inline-block">ลูกค้า (Customer):</span> {itemData.customerName}</p>
                                <p><span className="font-bold w-28 inline-block">ปลายทาง (To):</span> {itemData.destinationCustomer}</p>
                            </div>
                        </div>

                        <table className="w-full border-collapse border border-black text-sm mb-6">
                           <thead>
                             <tr className="bg-slate-100 font-bold text-center">
                                <th className="border border-black p-1 w-10">ลำดับ</th>
                                <th className="border border-black p-1 w-32">รหัสสินค้า</th>
                                <th className="border border-black p-1">รายการสินค้า</th>
                                <th className="border border-black p-1 w-20">จำนวน</th>
                                <th className="border border-black p-1 w-20">หน่วย</th>
                                <th className="border border-black p-1">หมายเหตุ / ปัญหาที่พบ</th>
                             </tr>
                           </thead>
                           <tbody>
                              {[...Array(10)].map((_, idx) => {
                                  const currentItem = idx === 0 ? itemData : null;
                                  return (
                                    <tr key={idx} className={idx > 0 ? 'h-10' : ''}>
                                      <td className="border border-black p-1 text-center">{idx === 0 ? '1' : ''}</td>
                                      <td className="border border-black p-1">{currentItem?.productCode}</td>
                                      <td className="border border-black p-1">{currentItem?.productName}</td>
                                      <td className="border border-black p-1 text-center">{currentItem?.quantity}</td>
                                      <td className="border border-black p-1 text-center">{currentItem?.unit}</td>
                                      <td className="border border-black p-1 text-xs">{idx === 0 ? (
                                        <>
                                            <div>{printItem.problemDetail}</div>
                                            <div className="text-slate-500">Source: {itemData.problemSource}</div>
                                            <div className="text-red-600 font-bold">[{printItem.actionScrap ? 'Scrap' : printItem.actionReject ? 'Reject' : 'Sort'}]</div>
                                        </>
                                      ) : ''}</td>
                                    </tr>
                                  )
                              })}
                           </tbody>
                        </table>
                        
                        <div>
                           <p className="font-bold text-sm mb-1">หมายเหตุ (Remarks):</p>
                           <div className="border-b border-dotted border-black h-6"></div>
                           <div className="border-b border-dotted border-black h-6"></div>
                        </div>

                        <div className="flex justify-between items-end gap-4 text-center mt-16 text-sm">
                          <div className="flex-1">
                              <div className="border-b border-black w-3/4 mx-auto mb-2 h-10"></div>
                              <p>(............................................)</p>
                              <p className="font-bold">ผู้ส่งคืน (Sender)</p>
                              <p className="text-xs">วันที่ ......../......../............</p>
                          </div>
                          <div className="flex-1">
                              <div className="border-b border-black w-3/4 mx-auto mb-2 h-10"></div>
                              <p>(............................................)</p>
                              <p className="font-bold">ผู้ขนส่ง (Transporter)</p>
                              <p className="text-xs">วันที่ ......../......../............</p>
                          </div>
                           <div className="flex-1">
                              <div className="border-b border-black w-3/4 mx-auto mb-2 h-10"></div>
                              <p>(............................................)</p>
                              <p className="font-bold">ผู้รับสินค้า (Receiver)</p>
                              <p className="text-xs">วันที่ ......../......../............</p>
                          </div>
                        </div>
                     </div>
                     <div className="p-4 text-right text-xs font-mono text-slate-400 print:block">FM-LOG-00 Rev.00</div>
                </div>
            </div>
        )
      })()}

      {showNCRFormModal && ncrFormItem && (() => {
        // FIX: Make backward-compatible
        const itemData = ncrFormItem.item || (ncrFormItem as any);
        return (
            <div className="fixed inset-0 z-[100] bg-black/70 overflow-y-auto flex items-start justify-center p-4 backdrop-blur-sm print:bg-white print:p-0">
                <div className="bg-white w-full max-w-5xl shadow-2xl flex flex-col my-8 shrink-0 print:shadow-none relative">
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center print:hidden rounded-t-lg">
                        <h3 className="font-bold flex items-center gap-2">
                           {isEditMode ? <Edit className="w-5 h-5 text-amber-300" /> : <Eye className="w-5 h-5" />}
                           {isEditMode ? `แก้ไข` : `ดู`} ใบแจ้งปัญหา NCR: {ncrFormItem.ncrNo}
                        </h3>
                        <div className="flex gap-2">
                            {isEditMode ? (
                                <button onClick={handleSaveChanges} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm"><Save className="w-4 h-4" /> บันทึกการแก้ไข</button>
                            ) : (
                                <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 font-bold text-sm"><Printer className="w-4 h-4" /> Print Form</button>
                            )}
                            <button onClick={() => setShowNCRFormModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded"><X className="w-5 h-5" /></button>
                        </div>
                    </div>
                    {/* NCR FORM CONTENT - Readonly/Edit mode */}
                    <div className="p-10 text-sm">
                        <h1 className="text-xl font-bold text-center border-2 border-black py-2 mb-6">ใบแจ้งปัญหาระบบ (NCR) / ใบแจ้งปัญหารับสินค้าคืน</h1>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-8">
                            <div><span className="font-bold w-24 inline-block">ถึงหน่วยงาน:</span> {isEditMode ? <input className="border-b" value={ncrFormItem.toDept} onChange={e => handleInputChange('toDept', e.target.value)} /> : ncrFormItem.toDept}</div>
                            <div><span className="font-bold w-24 inline-block">วันที่:</span> {isEditMode ? <input type="date" className="border-b" value={ncrFormItem.date} onChange={e => handleInputChange('date', e.target.value)} /> : ncrFormItem.date}</div>
                            <div><span className="font-bold w-24 inline-block">สำเนา:</span> {isEditMode ? <input className="border-b" value={ncrFormItem.copyTo} onChange={e => handleInputChange('copyTo', e.target.value)} /> : ncrFormItem.copyTo}</div>
                            <div><span className="font-bold w-24 inline-block">เลขที่ NCR:</span> <span className="font-mono font-bold text-red-600">{ncrFormItem.ncrNo}</span></div>
                            <div><span className="font-bold w-24 inline-block">ผู้พบปัญหา:</span> {isEditMode ? <input className="border-b" value={ncrFormItem.founder} onChange={e => handleInputChange('founder', e.target.value)} /> : ncrFormItem.founder}</div>
                            <div><span className="font-bold w-32 inline-block">เลขที่ใบสั่งซื้อ/ผลิต:</span> {isEditMode ? <input className="border-b" value={ncrFormItem.poNo} onChange={e => handleInputChange('poNo', e.target.value)} /> : ncrFormItem.poNo}</div>
                        </div>
                        {/* ITEM DETAILS */}
                        <div className="mb-6 border-2 border-black p-4 bg-slate-50 rounded-lg">
                           <h3 className="font-bold text-slate-900 underline mb-2">รายการสินค้า</h3>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                             <div><span className="font-bold block text-slate-500">รหัสสินค้า</span>{isEditMode ? <input className="w-full border-b" value={itemData.productCode} onChange={e => handleItemInputChange('productCode', e.target.value)} /> : itemData.productCode}</div>
                             <div><span className="font-bold block text-slate-500">ชื่อสินค้า</span>{isEditMode ? <input className="w-full border-b" value={itemData.productName} onChange={e => handleItemInputChange('productName', e.target.value)} /> : itemData.productName}</div>
                             <div><span className="font-bold block text-slate-500">จำนวน</span>{isEditMode ? <input type="number" className="w-full border-b" value={itemData.quantity} onChange={e => handleItemInputChange('quantity', parseInt(e.target.value))} /> : `${itemData.quantity} ${itemData.unit}`}</div>
                             <div><span className="font-bold block text-slate-500">ราคา/หน่วย</span>{isEditMode ? <input type="number" className="w-full border-b" value={itemData.priceBill} onChange={e => handleItemInputChange('priceBill', parseFloat(e.target.value))} /> : `฿${itemData.priceBill}`}</div>
                           </div>
                        </div>

                        {/* PROBLEM DETAILS */}
                        <table className="w-full border-2 border-black mb-6"><tbody>
                           <tr>
                              <td className="w-1/3 border-r-2 border-black p-4 text-center align-middle">
                                 <h2 className="text-2xl font-bold">รูปภาพ / เอกสาร</h2>
                                 <h2 className="text-2xl font-bold">ตามแนบ</h2>
                              </td>
                              <td className="p-4 align-top">
                                 <div className="font-bold underline mb-2">พบปัญหาที่กระบวนการ</div>
                                 {isEditMode ? (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <label><input type="checkbox" checked={ncrFormItem.problemDamaged} onChange={e => handleInputChange('problemDamaged', e.target.checked)} /> ชำรุด</label>
                                        <label><input type="checkbox" checked={ncrFormItem.problemLost} onChange={e => handleInputChange('problemLost', e.target.checked)} /> สูญหาย</label>
                                        <label><input type="checkbox" checked={ncrFormItem.problemMixed} onChange={e => handleInputChange('problemMixed', e.target.checked)} /> สินค้าสลับ</label>
                                        <label><input type="checkbox" checked={ncrFormItem.problemWrongInv} onChange={e => handleInputChange('problemWrongInv', e.target.checked)} /> สินค้าไม่ตรง INV.</label>
                                        <label><input type="checkbox" checked={ncrFormItem.problemLate} onChange={e => handleInputChange('problemLate', e.target.checked)} /> ส่งช้า</label>
                                        <label><input type="checkbox" checked={ncrFormItem.problemDuplicate} onChange={e => handleInputChange('problemDuplicate', e.target.checked)} /> ส่งซ้ำ</label>
                                        <label><input type="checkbox" checked={ncrFormItem.problemWrong} onChange={e => handleInputChange('problemWrong', e.target.checked)} /> ส่งผิด</label>
                                        <label><input type="checkbox" checked={ncrFormItem.problemIncomplete} onChange={e => handleInputChange('problemIncomplete', e.target.checked)} /> ส่งของไม่ครบ</label>
                                        <label><input type="checkbox" checked={ncrFormItem.problemOver} onChange={e => handleInputChange('problemOver', e.target.checked)} /> ส่งของเกิน</label>
                                        <label><input type="checkbox" checked={ncrFormItem.problemWrongInfo} onChange={e => handleInputChange('problemWrongInfo', e.target.checked)} /> ข้อมูลผิด</label>
                                        <label><input type="checkbox" checked={ncrFormItem.problemShortExpiry} onChange={e => handleInputChange('problemShortExpiry', e.target.checked)} /> สินค้าอายุสั้น</label>
                                        <label><input type="checkbox" checked={ncrFormItem.problemTransportDamage} onChange={e => handleInputChange('problemTransportDamage', e.target.checked)} /> สินค้าเสียหายบนรถขนส่ง</label>
                                        <label><input type="checkbox" checked={ncrFormItem.problemAccident} onChange={e => handleInputChange('problemAccident', e.target.checked)} /> อุบัติเหตุ</label>
                                        <div className="col-span-2 flex items-center gap-2"><label><input type="checkbox" checked={ncrFormItem.problemOther} onChange={e => handleInputChange('problemOther', e.target.checked)} /> อื่นๆ</label><input type="text" className="border-b flex-1" value={ncrFormItem.problemOtherText} onChange={e => handleInputChange('problemOtherText', e.target.value)} /></div>
                                    </div>
                                 ) : (
                                    <ul className="list-disc list-inside text-sm text-slate-700">
                                      {getProblemStrings(ncrFormItem).map((p, i) => <li key={i}>{p}</li>)}
                                    </ul>
                                 )}
                                 <div className="font-bold underline mt-4 mb-1">รายละเอียด:</div>
                                 {isEditMode ? <textarea className="w-full h-20 border p-1" value={ncrFormItem.problemDetail} onChange={e => handleInputChange('problemDetail', e.target.value)} /> : <p className="text-sm bg-slate-50 p-2 rounded">{ncrFormItem.problemDetail}</p>}
                              </td>
                           </tr>
                        </tbody></table>

                        {/* ACTION DETAILS */}
                        <table className="w-full border-2 border-black mb-6 text-sm">
                          <thead><tr className="bg-slate-50 border-b-2 border-black"><th colSpan={2} className="py-2 text-center font-bold">การดำเนินการ</th></tr></thead>
                          <tbody>
                            {/* OVERHAULED ACTION SECTION */}
                            <tr>
                                <td className="p-2 border-r border-black w-1/2">
                                    <label className="flex items-center gap-2">
                                        {isEditMode ? <input type="checkbox" checked={ncrFormItem.actionReject} onChange={e => handleInputChange('actionReject', e.target.checked)} /> : ncrFormItem.actionReject && <CheckSquare className="w-4 h-4 text-blue-600"/>}
                                        <span className="font-bold">ส่งคืน (Reject)</span>
                                        <span className="ml-auto">จำนวน:</span>
                                        {isEditMode ? <input type="number" className="w-20 border-b text-center" value={ncrFormItem.actionRejectQty} onChange={e => handleInputChange('actionRejectQty', parseInt(e.target.value))} /> : ncrFormItem.actionRejectQty || '-'}
                                    </label>
                                </td>
                                <td className="p-2 w-1/2">
                                     <label className="flex items-center gap-2">
                                        {isEditMode ? <input type="checkbox" checked={ncrFormItem.actionRejectSort} onChange={e => handleInputChange('actionRejectSort', e.target.checked)} /> : ncrFormItem.actionRejectSort && <CheckSquare className="w-4 h-4 text-blue-600"/>}
                                        <span className="font-bold">คัดแยกของเสียเพื่อส่งคืน</span>
                                        <span className="ml-auto">จำนวน:</span>
                                        {isEditMode ? <input type="number" className="w-20 border-b text-center" value={ncrFormItem.actionRejectSortQty} onChange={e => handleInputChange('actionRejectSortQty', parseInt(e.target.value))} /> : ncrFormItem.actionRejectSortQty || '-'}
                                    </label>
                                </td>
                            </tr>
                            {/* ... (Repeat for other actions) ... */}
                             <tr>
                                <td className="p-2 border-r border-black w-1/2">
                                    <label className="flex items-center gap-2">
                                        {isEditMode ? <input type="checkbox" checked={ncrFormItem.actionScrap} onChange={e => handleInputChange('actionScrap', e.target.checked)} /> : ncrFormItem.actionScrap && <CheckSquare className="w-4 h-4 text-blue-600"/>}
                                        <span className="font-bold">ทำลาย (Scrap)</span>
                                        <span className="ml-auto">จำนวน:</span>
                                        {isEditMode ? <input type="number" className="w-20 border-b text-center" value={ncrFormItem.actionScrapQty} onChange={e => handleInputChange('actionScrapQty', parseInt(e.target.value))} /> : ncrFormItem.actionScrapQty || '-'}
                                    </label>
                                </td>
                                <td className="p-2 w-1/2">
                                     <label className="flex items-center gap-2">
                                        {isEditMode ? <input type="checkbox" checked={ncrFormItem.actionReplace} onChange={e => handleInputChange('actionReplace', e.target.checked)} /> : ncrFormItem.actionReplace && <CheckSquare className="w-4 h-4 text-blue-600"/>}
                                        <span className="font-bold">เปลี่ยนสินค้าใหม่</span>
                                        <span className="ml-auto">จำนวน:</span>
                                        {isEditMode ? <input type="number" className="w-20 border-b text-center" value={ncrFormItem.actionReplaceQty} onChange={e => handleInputChange('actionReplaceQty', parseInt(e.target.value))} /> : ncrFormItem.actionReplaceQty || '-'}
                                    </label>
                                </td>
                            </tr>
                          </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
      })()}
    </div>
  );
};

export default NCRReport;