import React, { useState, useEffect } from 'react';
import { useData } from '../DataContext';
import { BRANCH_LIST, RETURN_ROUTES } from '../constants';
import { ReturnRecord, ItemCondition, DispositionAction } from '../types';
import { Scan, Box, Truck, RotateCcw, Trash2, Home, CheckCircle, ArrowRight, ClipboardList, PlusCircle, Save, Clock, Search, AlertCircle, XCircle, Edit3, ShieldCheck, User, Phone, Briefcase, Building2, Printer, FileText, X, PenTool, CheckSquare, Square, AlertTriangle, HelpCircle, Settings, Wrench, Package, Filter, LayoutGrid, FileInput, Check, MapPin, Activity, Inbox } from 'lucide-react';

const PROBLEM_TYPES = ['ชำรุด', 'สูญหาย', 'สินค้าสลับ', 'สินค้าไม่ตรง INV.'];
const ROOT_CAUSES = ['บรรจุภัณฑ์', 'การขนส่ง', 'ปฏิบัติงาน', 'สิ่งแวดล้อม'];

interface OperationsProps {
  initialData?: Partial<ReturnRecord> | null;
  onClearInitialData?: () => void;
}

const Operations: React.FC<OperationsProps> = ({ initialData, onClearInitialData }) => {
  const { items, addReturnRecord, updateReturnRecord } = useData();

  // New 5-Step Workflow
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isCustomBranch, setIsCustomBranch] = useState(false);

  // QC State
  const [qcSelectedItem, setQcSelectedItem] = useState<ReturnRecord | null>(null);
  const [customInputType, setCustomInputType] = useState<'Good' | 'Bad' | null>(null);

  // Disposition Temp State
  const [selectedDisposition, setSelectedDisposition] = useState<DispositionAction | null>(null);
  const [dispositionDetails, setDispositionDetails] = useState({
    route: '',
    sellerName: '',
    contactPhone: '',
    internalUseDetail: '',
    claimCompany: '',
    claimCoordinator: '',
    claimPhone: ''
  });
  const [isCustomRoute, setIsCustomRoute] = useState(false);

  // Document Generator State
  const [showDocModal, setShowDocModal] = useState(false);
  const [docData, setDocData] = useState<{ type: DispositionAction, items: ReturnRecord[] } | null>(null);
  const [includeVat, setIncludeVat] = useState(true);
  const [vatRate, setVatRate] = useState(7);

  // Document Selection State (New)
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectionStatus, setSelectionStatus] = useState<DispositionAction | null>(null);
  const [selectionItems, setSelectionItems] = useState<ReturnRecord[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Document Editable Configuration
  const [isDocEditable, setIsDocEditable] = useState(false);
  const [docConfig, setDocConfig] = useState({
    companyNameTH: 'บริษัท นีโอสยาม โลจิสติกส์ แอนด์ ทรานสปอร์ต จำกัด',
    companyNameEN: 'NEOSIAM LOGISTICS & TRANSPORT CO., LTD.',
    address: '159/9-10 หมู่ 7 ต.บางม่วง อ.เมืองนครสวรรค์ จ.นครสวรรค์ 60000',
    contact: 'Tel: 056-275-841 Email: info_nw@neosiamlogistics.com',
    titleTH: '',
    titleEN: '',
    remarks: '1. กรุณาตรวจสอบความถูกต้องของสินค้าภายใน 7 วัน',
    signatory1: 'ผู้จัดทำ (Prepared By)',
    signatory2: 'ผู้ตรวจสอบ (Checked By)',
    signatory3: 'ผู้อนุมัติ (Approved By)'
  });

  // Manual Intake Form State
  const initialFormState: Partial<ReturnRecord> = {
    branch: 'พิษณุโลก',
    date: new Date().toISOString().split('T')[0],
    quantity: 1,
    unit: 'ชิ้น',
    priceBill: 0,
    priceSell: 0,
    status: 'Requested',
    disposition: 'Pending',
    condition: 'Unknown',
    productCode: '',
    expiryDate: '',
    notes: '',
    problemType: '',
    rootCause: '',
    ncrNumber: '',
    refNo: '',
    neoRefNo: '',
    customerName: '',
    destinationCustomer: '',
    actionReject: false,
    actionRejectQty: 0,
    actionRejectSort: false,
    actionRejectSortQty: 0,
    actionRework: false,
    actionReworkQty: 0,
    actionReworkMethod: '',
    actionSpecialAcceptance: false,
    actionSpecialAcceptanceQty: 0,
    actionSpecialAcceptanceReason: '',
    actionScrap: false,
    actionScrapQty: 0,
    actionScrapReplace: false,
    actionScrapReplaceQty: 0
  };
  const [formData, setFormData] = useState<Partial<ReturnRecord>>(initialFormState);
  const [requestItems, setRequestItems] = useState<Partial<ReturnRecord>[]>([]); // NEW: List of items to be added
  const [customProblemType, setCustomProblemType] = useState('');
  const [customRootCause, setCustomRootCause] = useState('');

  useEffect(() => {
    if (initialData) {
      setActiveStep(1);
      setFormData(prev => ({
        ...prev,
        ...initialData,
        date: initialData.date || prev.date,
        branch: initialData.branch || prev.branch,
      }));
      if (onClearInitialData) onClearInitialData();
    }
  }, [initialData, onClearInitialData]);

  const selectQCItem = (item: ReturnRecord) => {
    setQcSelectedItem(item);
    setCustomInputType(null);
    setSelectedDisposition(null);
    setDispositionDetails({
      route: '', sellerName: '', contactPhone: '', internalUseDetail: '',
      claimCompany: '', claimCoordinator: '', claimPhone: ''
    });
    setIsCustomRoute(false);
  };

  const handleConditionSelect = (condition: ItemCondition, type?: 'Good' | 'Bad') => {
    if (!qcSelectedItem) return;

    if (condition === 'Other') {
      setCustomInputType(type || null);
      setQcSelectedItem({ ...qcSelectedItem, condition: '' });
    } else {
      setCustomInputType(null);
      setQcSelectedItem({ ...qcSelectedItem, condition });
    }
  };

  // NEW: Add current form data to local list
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName || !formData.productCode) {
      alert("กรุณาระบุชื่อสินค้าและรหัสสินค้า");
      return;
    }

    const newItem = { ...formData };
    setRequestItems(prev => [...prev, newItem]);

    // Reset only product-specific fields, keep header info (Branch, Customer, Date, RefNo)
    setFormData(prev => ({
      ...prev,
      productCode: '',
      productName: '',
      quantity: 1,
      unit: 'ชิ้น',
      priceBill: 0,
      priceSell: 0,
      expiryDate: '',
      problemType: '',
      rootCause: '',
      notes: ''
    }));
    setCustomProblemType('');
    setCustomRootCause('');
  };

  // NEW: Remove item from local list
  const handleRemoveItem = (index: number) => {
    setRequestItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleRequestSubmit = async () => {
    // If there are items in the list, process them. If strictly empty, check if form has data (optional logic, but let's encourage list usage)
    const itemsToProcess = [...requestItems];

    // If user filled the form but didn't click "Add", include it if valid
    if (formData.productName && formData.productCode) {
      itemsToProcess.push(formData);
    }

    if (itemsToProcess.length === 0) {
      alert("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    let successCount = 0;

    for (const item of itemsToProcess) {
      const finalProblemType = item.problemType === 'Other' ? customProblemType : item.problemType;
      const finalRootCause = item.rootCause === 'Other' ? customRootCause : item.rootCause;

      const record: ReturnRecord = {
        ...item as ReturnRecord,
        id: `RT-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`,
        amount: (item.quantity || 0) * (item.priceBill || 0),
        reason: item.notes || 'แจ้งคืนสินค้า',
        status: 'Requested',
        dateRequested: item.date || new Date().toISOString().split('T')[0],
        disposition: 'Pending',
        condition: 'Unknown',
        productName: item.productName || 'Unknown Product',
        productCode: item.productCode || 'N/A',
        customerName: item.customerName || 'Unknown Customer',
        category: 'General',
        problemType: finalProblemType,
        rootCause: finalRootCause,
        ncrNumber: item.ncrNumber,
        neoRefNo: item.neoRefNo,
        destinationCustomer: item.destinationCustomer,
      };

      const success = await addReturnRecord(record);
      if (success) successCount++;
    }

    if (successCount > 0) {
      alert(`บันทึกคำขอคืนเรียบร้อย ${successCount} รายการ! \nรายการจะไปรอที่ขั้นตอน "รับสินค้าเข้า"`);
      setFormData(initialFormState);
      setRequestItems([]);
      setCustomProblemType('');
      setCustomRootCause('');
      setIsCustomBranch(false);
    }
  };

  const handleIntakeReceive = async (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    await updateReturnRecord(id, { status: 'Received', dateReceived: today });
  };

  const handleQCSubmit = async () => {
    if (!qcSelectedItem || !selectedDisposition) return;
    if (!qcSelectedItem.condition || qcSelectedItem.condition === 'Unknown') {
      alert("กรุณาระบุสภาพสินค้า");
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const success = await updateReturnRecord(qcSelectedItem.id, {
      condition: qcSelectedItem.condition,
      disposition: selectedDisposition,
      status: 'Graded',
      dateGraded: today,
      dispositionRoute: dispositionDetails.route,
      sellerName: dispositionDetails.sellerName,
      contactPhone: dispositionDetails.contactPhone,
      internalUseDetail: dispositionDetails.internalUseDetail,
      claimCompany: dispositionDetails.claimCompany,
      claimCoordinator: dispositionDetails.claimCoordinator,
      claimPhone: dispositionDetails.claimPhone
    });

    if (success) {
      setQcSelectedItem(null);
      setSelectedDisposition(null);
      setCustomInputType(null);
      setIsCustomRoute(false);
      alert('บันทึกผลการตรวจสอบคุณภาพเรียบร้อย (Ready for Documentation)');
    }
  };

  const handlePrintClick = (status: DispositionAction, list: ReturnRecord[]) => {
    if (list.length === 0) {
      alert('ไม่พบรายการสินค้าในสถานะนี้');
      return;
    }
    setSelectionStatus(status);
    setSelectionItems(list);
    setSelectedItemIds(new Set(list.map(i => i.id)));
    setShowSelectionModal(true);
  };

  const handleGenerateDoc = () => {
    if (!selectionStatus) return;
    const selectedList = selectionItems.filter(item => selectedItemIds.has(item.id));
    if (selectedList.length === 0) {
      alert("กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการก่อนสร้างเอกสาร");
      return;
    }
    const details = getISODetails(selectionStatus);
    setDocConfig(prev => ({ ...prev, titleTH: details.th, titleEN: details.en }));
    setDocData({ type: selectionStatus, items: selectedList });
    setIncludeVat(true);
    setShowSelectionModal(false);
    setShowDocModal(true);
    setIsDocEditable(false);
  };

  const handleConfirmDocGeneration = async () => {
    if (!docData) return;
    const today = new Date().toISOString().split('T')[0];

    let successCount = 0;
    for (const item of docData.items) {
      const success = await updateReturnRecord(item.id, { status: 'Documented', dateDocumented: today });
      if (success) successCount++;
    }

    if (successCount > 0) {
      alert(`สร้างเอกสารและบันทึกสถานะเรียบร้อย ${successCount} รายการ\nรายการถูกส่งไปยังขั้นตอน "ปิดงาน/ตรวจสอบผล"`);
      setShowDocModal(false);
    }
  };

  const handleCompleteJob = async (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    await updateReturnRecord(id, { status: 'Completed', dateCompleted: today });
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedItemIds(newSet);
  };

  const getISODetails = (type: DispositionAction) => {
    switch (type) {
      case 'RTV': return { code: 'FM-LOG-05', rev: '00', th: 'ใบส่งคืนสินค้า', en: 'GOODS RETURN NOTE' };
      case 'Restock': return { code: 'FM-SAL-02', rev: '00', th: 'แบบขออนุมัติจำหน่ายสินค้าสภาพดี', en: 'SALES DISPOSAL APPROVAL FORM' };
      case 'Claim': return { code: 'FM-CLM-01', rev: '00', th: 'ใบนำส่งสินค้าเคลมประกัน', en: 'INSURANCE CLAIM DELIVERY NOTE' };
      case 'InternalUse': return { code: 'FM-ADM-09', rev: '00', th: 'ใบเบิกสินค้าใช้ภายใน', en: 'INTERNAL REQUISITION FORM' };
      case 'Recycle': return { code: 'FM-AST-04', rev: '00', th: 'แบบขออนุมัติตัดจำหน่าย/ทำลายทรัพย์สิน', en: 'ASSET WRITE-OFF / SCRAP AUTHORIZATION FORM' };
      default: return { code: 'FM-GEN-00', rev: '00', th: 'เอกสารจัดการสินค้าคืน', en: 'RETURN MANAGEMENT DOCUMENT' };
    }
  };

  const getDispositionBadge = (disp?: DispositionAction) => {
    if (!disp || typeof disp !== 'string' || disp === 'Pending') return <span className="text-slate-400">-</span>;
    const config: any = {
      'RTV': { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Truck, label: 'ส่งคืน (Return)' },
      'Restock': { color: 'bg-green-50 text-green-700 border-green-200', icon: RotateCcw, label: 'ขาย (Sell)' },
      'Recycle': { color: 'bg-red-50 text-red-700 border-red-200', icon: Trash2, label: 'ทิ้ง (Scrap)' },
      'InternalUse': { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Home, label: 'ใช้ภายใน' },
      'Claim': { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: ShieldCheck, label: 'เคลมประกัน' }
    }[disp];
    if (!config) return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] border border-slate-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> ไม่ทราบค่า</span>;
    const Icon = config.icon;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${config.color}`}><Icon className="w-3 h-3" /> {config.label}</span>;
  };

  const calculateTotal = (items: ReturnRecord[], hasVat: boolean) => {
    const subtotal = items.reduce((acc, item) => acc + ((item.priceBill || 0) * item.quantity), 0);
    const vat = hasVat ? subtotal * (vatRate / 100) : 0;
    const net = subtotal + vat;
    return { subtotal, vat, net };
  };

  const ThaiBahtText = (amount: number): string => {
    if (isNaN(amount)) return '';
    const units = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

    let amountStr = amount.toFixed(2);
    let parts = amountStr.split(".");
    let integerPart = parts[0];
    let decimalPart = parts[1];

    let result = "";

    if (parseInt(integerPart) === 0) {
      result = "ศูนย์";
    } else {
      for (let i = 0; i < integerPart.length; i++) {
        let digit = parseInt(integerPart.charAt(i));
        let pos = integerPart.length - i - 1;

        if (digit !== 0) {
          if (pos === 1 && digit === 2) result += "ยี่";
          else if (pos === 1 && digit === 1) { }
          else if (pos === 0 && digit === 1 && integerPart.length > 1) result += "เอ็ด";
          else result += units[digit];

          result += positions[pos];
        }
      }
    }

    result += "บาท";

    if (parseInt(decimalPart) === 0) {
      result += "ถ้วน";
    } else {
      const decimalInteger = parseInt(decimalPart);
      if (decimalInteger > 0) {
        for (let i = 0; i < decimalPart.length; i++) {
          let digit = parseInt(decimalPart.charAt(i));
          let pos = decimalPart.length - i - 1;

          if (digit !== 0) {
            if (pos === 1 && digit === 2) result += "ยี่";
            else if (pos === 1 && digit === 1) { }
            else if (pos === 0 && digit === 1 && decimalPart.length > 1) result += "เอ็ด";
            else result += units[digit];

            if (pos === 1) result += "สิบ";
          }
        }
        result += "สตางค์";
      }
    }

    return result;
  };

  const requestedItems = items.filter(i => i.status === 'Requested');
  const receivedItems = items.filter(i => i.status === 'Received');
  const gradedItems = items.filter(i => i.status === 'Graded');
  const documentedItems = items.filter(i => i.status === 'Documented');
  const completedItems = items.filter(i => i.status === 'Completed');

  const conditionLabels: Record<string, string> = { 'New': 'สภาพดี (Good)', 'BoxDamage': 'กล่องบุบ (Box Dmg)', 'WetBox': 'ลังเปียก (Wet Box)', 'LabelDefect': 'ฉลากลอก (Label)', 'Expired': 'หมดอายุ (Expired)', 'Damaged': 'ชำรุด/ซาก (Damaged)', 'Defective': 'เสีย (Defective)' };
  const dispositionLabels: Record<string, string> = { 'RTV': 'ส่งคืน (Return)', 'Restock': 'ขาย (Sell)', 'Recycle': 'ทิ้ง (Scrap)', 'InternalUse': 'ใช้ภายใน (Internal)', 'Claim': 'เคลมประกัน (Claim)' };

  const KanbanColumn = ({ title, status, icon: Icon, color }: { title: string, status: DispositionAction, icon: any, color: string }) => {
    const list = items.filter(i => i.disposition === status && i.status === 'Graded');
    return (
      <div className="flex-1 min-w-[280px] bg-slate-50 rounded-xl flex flex-col h-full border border-slate-200">
        <div className={`p-3 border-b border-slate-200 ${color} bg-opacity-10 rounded-t-xl flex items-center justify-between`}>
          <div className="flex items-center gap-2 font-bold text-slate-700"> <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} /> {title} </div>
          <div className="flex items-center gap-2"> <button onClick={() => handlePrintClick(status, list)} className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-slate-800" title="ออกเอกสาร (Generate Doc)"> <Printer className="w-4 h-4" /> </button> <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">{list.length}</span> </div>
        </div>
        <div className="p-2 space-y-2 overflow-y-auto flex-1">
          {list.map(item => (
            <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-1"> <span className="text-xs font-mono text-slate-400">{item.id}</span> <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">รอเอกสาร</span> </div>
              <div className="text-xs text-blue-600 mb-0.5">{item.branch}</div>
              <h4 className="text-sm font-semibold text-slate-800 truncate">{item.productName}</h4>
              <div className="flex justify-between items-center mt-2"> <p className="text-xs text-slate-500 truncate max-w-[120px]">{item.condition}</p> <span className="text-xs font-mono text-slate-400">{item.quantity} {item.unit}</span> </div>
              <div className="mt-1 pt-1 border-t border-slate-50 flex justify-end"> <span className="text-[10px] text-slate-400">QC: {item.dateGraded}</span> </div>
            </div>
          ))}
          {list.length === 0 && (<div className="text-center p-4 text-slate-400 text-xs italic">ไม่มีรายการรอออกเอกสาร</div>)}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      <div className="border-b border-slate-200 px-6 pt-4 bg-white shadow-sm z-10">
        <div className="flex gap-2 overflow-x-auto pb-0">
          <button onClick={() => setActiveStep(1)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 1 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}> <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span> แจ้งคืน (Key-in) </button>
          <button onClick={() => setActiveStep(2)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 2 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}> <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span> รับสินค้าเข้า (Intake) {requestedItems.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{requestedItems.length}</span>} </button>
          <button onClick={() => setActiveStep(3)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 3 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}> <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span> ตรวจสอบคุณภาพ (QC) {receivedItems.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{receivedItems.length}</span>} </button>
          <button onClick={() => setActiveStep(4)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 4 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}> <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 4 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>4</span> ออกเอกสาร (Docs) {gradedItems.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{gradedItems.length}</span>} </button>
          <button onClick={() => setActiveStep(5)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 5 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}> <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 5 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>5</span> ปิดงาน/รับคืนเรียบร้อย {documentedItems.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{documentedItems.length}</span>} </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-slate-50/50">
        {activeStep === 1 && (<div className="h-full overflow-auto p-6"> <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8"> <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4"> <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileInput className="w-6 h-6" /></div> <div><h3 className="text-xl font-bold text-slate-800">1. แจ้งคืนสินค้า (Return Request)</h3><p className="text-sm text-slate-500">สำหรับสาขา: กรอกข้อมูลสินค้าที่ต้องการส่งคืนเพื่อสร้างคำขอเข้าระบบ</p></div> {initialData?.ncrNumber && <div className="ml-auto bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">Auto-filled from NCR: {initialData.ncrNumber}</div>} </div>

          {/* NEW: Item List Summary */}
          {requestItems.length > 0 && (
            <div className="mb-6 border rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b font-bold text-sm text-slate-700 flex justify-between items-center">
                <span>รายการที่รอส่ง ({requestItems.length})</span>
                <button onClick={() => setRequestItems([])} className="text-xs text-red-500 hover:underline">ล้างทั้งหมด</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="px-4 py-2 text-left">รหัส</th>
                    <th className="px-4 py-2 text-left">ชื่อสินค้า</th>
                    <th className="px-4 py-2 text-center">จำนวน</th>
                    <th className="px-4 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requestItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-xs">{item.productCode}</td>
                      <td className="px-4 py-2">{item.productName}</td>
                      <td className="px-4 py-2 text-center">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={handleAddItem} className="space-y-6"> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div> <label className="block text-sm font-medium text-slate-700 mb-1">สาขาต้นทาง</label> <select required value={isCustomBranch ? 'Other' : formData.branch} onChange={e => { const val = e.target.value; if (val === 'Other') { setIsCustomBranch(true); setFormData({ ...formData, branch: '' }); } else { setIsCustomBranch(false); setFormData({ ...formData, branch: val }); } }} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"> {BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)} <option value="Other">อื่นๆ</option> </select> {isCustomBranch && <input type="text" placeholder="ระบุชื่อสาขา..." value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} className="w-full mt-2 p-2 border rounded-lg text-sm" />} </div> <div><label className="block text-sm font-medium text-slate-700 mb-1">วันที่แจ้ง</label><input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div> </div> <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> <div><label className="block text-sm font-medium text-slate-700 mb-1">เลขที่เอกสารอ้างอิง</label><input type="text" required value={formData.refNo} onChange={e => setFormData({ ...formData, refNo: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div> <div><label className="block text-sm font-medium text-slate-700 mb-1">เลขที่เอกสาร Neo Siam</label><input type="text" value={formData.neoRefNo} onChange={e => setFormData({ ...formData, neoRefNo: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div> <div className=""><label className="block text-sm font-medium text-slate-700 mb-1">ชื่อลูกค้า</label><input type="text" required value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div> <div className="md:col-span-3"><label className="block text-sm font-medium text-slate-700 mb-1">สถานที่ส่ง (ลูกค้าปลายทาง)</label><input type="text" value={formData.destinationCustomer} onChange={e => setFormData({ ...formData, destinationCustomer: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div> </div> <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4"> <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2"><Box className="w-4 h-4" /> ข้อมูลสินค้า</h4> <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> <div><label className="text-xs text-slate-500 block mb-1">รหัสสินค้า</label><input type="text" required value={formData.productCode} onChange={e => setFormData({ ...formData, productCode: e.target.value })} className="w-full p-2 border rounded text-sm" /></div> <div className="md:col-span-3"><label className="text-xs text-slate-500 block mb-1">ชื่อสินค้า</label><input type="text" required value={formData.productName} onChange={e => setFormData({ ...formData, productName: e.target.value })} className="w-full p-2 border rounded text-sm" /></div> </div> <div className="grid grid-cols-3 gap-4"> <div><label className="text-xs text-slate-500 block mb-1">จำนวน</label><input type="number" required value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })} className="w-full p-2 border rounded text-sm" /></div> <div><label className="text-xs text-slate-500 block mb-1">หน่วย</label><input type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full p-2 border rounded text-sm" /></div> <div><label className="text-xs text-slate-500 block mb-1">วันหมดอายุ</label><input type="date" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} className="w-full p-2 border rounded text-sm" /></div> </div> <div className="grid grid-cols-2 gap-4"> <div><label className="text-xs text-slate-500 block mb-1">ราคาหน้าบิล</label><input type="number" value={formData.priceBill} onChange={e => setFormData({ ...formData, priceBill: parseFloat(e.target.value) })} className="w-full p-2 border rounded text-sm" /></div> <div><label className="text-xs text-slate-500 block mb-1">ราคาขาย</label><input type="number" value={formData.priceSell} onChange={e => setFormData({ ...formData, priceSell: parseFloat(e.target.value) })} className="w-full p-2 border rounded text-sm" /></div> </div> </div> <div><label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ/สาเหตุการคืน</label><textarea rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" placeholder="ระบุสาเหตุ..."></textarea></div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button type="submit" className="px-4 py-2 rounded-lg border border-blue-600 text-blue-600 font-bold hover:bg-blue-50 flex items-center gap-2"> <PlusCircle className="w-4 h-4" /> เพิ่มรายการ (Add to List) </button>
              <button type="button" onClick={handleRequestSubmit} className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md flex items-center gap-2"> <Save className="w-4 h-4" /> ยืนยัน ({requestItems.length + (formData.productName ? 1 : 0)}) รายการ </button>
            </div> </form> </div> </div>)}
        {activeStep === 2 && (<div className="h-full overflow-auto p-6"> <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-amber-500" /> สินค้าขาเข้า (Incoming Shipments)</h3> {requestedItems.length === 0 ? (<div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-xl border border-slate-200"><Inbox className="w-12 h-12 mb-2 opacity-50" /><p>ไม่มีรายการที่แจ้งเข้ามาใหม่</p></div>) : (<div className="grid gap-4">{requestedItems.map(item => (<div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all"><div className="flex items-center gap-4"><div className="bg-blue-50 p-3 rounded-lg text-blue-600 font-bold font-mono text-xs">{item.id}</div><div><h4 className="font-bold text-slate-800">{item.productName}</h4><div className="text-sm text-slate-500 flex gap-3 mt-1"><span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.branch}</span><span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.customerName}</span><span className="font-mono bg-slate-100 px-1.5 rounded text-xs">Qty: {item.quantity} {item.unit}</span></div><div className="text-xs text-red-500 mt-1 italic">"{item.reason}"</div></div></div><button onClick={() => handleIntakeReceive(item.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"><CheckCircle className="w-4 h-4" /> รับของเข้าระบบ</button></div>))}</div>)} </div>)}
        {activeStep === 3 && (<div className="h-full flex"> <div className="w-80 border-r border-slate-200 bg-white flex flex-col"><div className="p-4 border-b border-slate-100 font-bold text-slate-700 flex justify-between items-center"><span>คิวรอตรวจสอบ ({receivedItems.length})</span><Activity className="w-4 h-4 text-blue-500" /></div><div className="flex-1 overflow-y-auto p-2 space-y-2">{receivedItems.length === 0 ? <div className="p-4 text-center text-slate-400 text-xs italic">ไม่มีสินค้าที่ต้องตรวจสอบ</div> : receivedItems.map(item => (<div key={item.id} onClick={() => selectQCItem(item)} className={`p-3 rounded-lg border cursor-pointer transition-all ${qcSelectedItem?.id === item.id ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' : 'bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50'}`}><div className="flex justify-between mb-1"><span className="text-xs font-bold text-slate-700">{item.productCode}</span><span className="text-[10px] text-slate-400">{item.dateReceived}</span></div><div className="text-sm font-medium text-slate-800 truncate mb-1">{item.productName}</div><div className="text-xs text-slate-500">{item.branch}</div></div>))}</div></div> <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">{qcSelectedItem ? (<div className="max-w-3xl mx-auto space-y-6"><div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4"><div><h3 className="text-2xl font-bold text-slate-800 mb-1">{qcSelectedItem.productName}</h3><div className="flex gap-4 text-sm text-slate-500"><span>ID: {qcSelectedItem.id}</span><span>Ref: {qcSelectedItem.refNo}</span><span>Qty: <b>{qcSelectedItem.quantity} {qcSelectedItem.unit}</b></span></div></div><div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">In Progress</div></div><div className="mb-8"><h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">1. ประเมินสภาพ (Grading)</h4><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><div className="text-xs font-bold text-green-600 bg-green-50 p-1.5 rounded w-fit mb-2">Good (สภาพดี)</div><div className="grid grid-cols-2 gap-2">{['New', 'BoxDamage', 'WetBox', 'LabelDefect', 'Other'].map((cond) => (<button key={cond} onClick={() => handleConditionSelect(cond === 'Other' ? 'Other' : cond as ItemCondition, 'Good')} className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${qcSelectedItem.condition === cond || (cond === 'Other' && customInputType === 'Good') ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-green-300 hover:text-green-600'}`}>{conditionLabels[cond] || 'อื่นๆ (ระบุ)'}</button>))}</div>{customInputType === 'Good' && (<input type="text" placeholder="ระบุสภาพสินค้า..." className="w-full mt-2 p-2 border rounded-lg text-sm focus:ring-1 focus:ring-green-500 outline-none" value={Object.keys(conditionLabels).includes(qcSelectedItem.condition || '') ? '' : qcSelectedItem.condition} onChange={e => setQcSelectedItem({ ...qcSelectedItem, condition: e.target.value })} autoFocus />)}</div><div className="space-y-2"><div className="text-xs font-bold text-red-600 bg-red-50 p-1.5 rounded w-fit mb-2">Bad (เสียหาย)</div><div className="grid grid-cols-2 gap-2">{['Expired', 'Damaged', 'Defective', 'Other'].map((cond) => (<button key={cond} onClick={() => handleConditionSelect(cond === 'Other' ? 'Other' : cond as ItemCondition, 'Bad')} className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${qcSelectedItem.condition === cond || (cond === 'Other' && customInputType === 'Bad') ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600'}`}>{conditionLabels[cond] || 'อื่นๆ (ระบุ)'}</button>))}</div>{customInputType === 'Bad' && (<input type="text" placeholder="ระบุความเสียหาย..." className="w-full mt-2 p-2 border rounded-lg text-sm focus:ring-1 focus:ring-red-500 outline-none" value={Object.keys(conditionLabels).includes(qcSelectedItem.condition || '') ? '' : qcSelectedItem.condition} onChange={e => setQcSelectedItem({ ...qcSelectedItem, condition: e.target.value })} autoFocus />)}</div></div></div><div><h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">2. ตัดสินใจ (Disposition)</h4><div className="grid grid-cols-5 gap-2 mb-4">{Object.keys(dispositionLabels).map(key => (<button key={key} onClick={() => { setSelectedDisposition(key as DispositionAction); setIsCustomRoute(false); }} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedDisposition === key ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Truck className="w-5 h-5 mb-1" /><span className="text-xs font-bold">{dispositionLabels[key]}</span></button>))}</div>{selectedDisposition === 'RTV' && (<div className="bg-amber-50 p-4 rounded-lg border border-amber-100 animate-fade-in"> <label className="block text-xs font-bold text-amber-800 mb-2">ระบุเส้นทางส่งคืน (Select Route)</label> <div className="flex flex-wrap gap-3"> {RETURN_ROUTES.map(r => (<label key={r} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded border border-amber-200 text-sm text-slate-700 hover:border-amber-400"> <input type="radio" name="route" value={r} checked={dispositionDetails.route === r} onChange={e => { setDispositionDetails({ ...dispositionDetails, route: e.target.value }); setIsCustomRoute(false); }} className="text-amber-500 focus:ring-amber-500" /> {r} </label>))} <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded border border-amber-200 text-sm text-slate-700 hover:border-amber-400"> <input type="radio" name="route" checked={isCustomRoute} onChange={() => { setIsCustomRoute(true); setDispositionDetails({ ...dispositionDetails, route: '' }); }} className="text-amber-500 focus:ring-amber-500" /> อื่นๆ </label> </div> {isCustomRoute && (<input type="text" placeholder="ระบุเส้นทาง..." className="w-full mt-2 p-2 border rounded-lg text-sm focus:ring-1 focus:ring-amber-500 outline-none" value={dispositionDetails.route} onChange={e => setDispositionDetails({ ...dispositionDetails, route: e.target.value })} autoFocus />)} </div>)}{selectedDisposition === 'Restock' && (<div className="bg-green-50 p-4 rounded-lg border border-green-100 animate-fade-in grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-green-800 mb-1">ชื่อผู้ซื้อ (Buyer Name)</label><input type="text" className="w-full p-2 border border-green-200 rounded text-sm focus:ring-1 focus:ring-green-500 outline-none" value={dispositionDetails.sellerName} onChange={e => setDispositionDetails({ ...dispositionDetails, sellerName: e.target.value })} /></div><div><label className="block text-xs font-bold text-green-800 mb-1">เบอร์โทรติดต่อ</label><input type="text" className="w-full p-2 border border-green-200 rounded text-sm focus:ring-1 focus:ring-green-500 outline-none" value={dispositionDetails.contactPhone} onChange={e => setDispositionDetails({ ...dispositionDetails, contactPhone: e.target.value })} /></div></div>)}{selectedDisposition === 'InternalUse' && (<div className="bg-purple-50 p-4 rounded-lg border border-purple-100 animate-fade-in"><label className="block text-xs font-bold text-purple-800 mb-1">หน่วยงาน/ผู้นำไปใช้ (Department/User)</label><input type="text" className="w-full p-2 border border-purple-200 rounded text-sm focus:ring-1 focus:ring-purple-500 outline-none" placeholder="เช่น แผนกบัญชี, คุณสมชาย" value={dispositionDetails.internalUseDetail} onChange={e => setDispositionDetails({ ...dispositionDetails, internalUseDetail: e.target.value })} /></div>)}{selectedDisposition === 'Claim' && (<div className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-fade-in space-y-3"><div><label className="block text-xs font-bold text-blue-800 mb-1">ชื่อบริษัทประกัน (Insurance Company)</label><input type="text" className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={dispositionDetails.claimCompany} onChange={e => setDispositionDetails({ ...dispositionDetails, claimCompany: e.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-blue-800 mb-1">ผู้ประสานงาน</label><input type="text" className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={dispositionDetails.claimCoordinator} onChange={e => setDispositionDetails({ ...dispositionDetails, claimCoordinator: e.target.value })} /></div><div><label className="block text-xs font-bold text-blue-800 mb-1">เบอร์โทร</label><input type="text" className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={dispositionDetails.claimPhone} onChange={e => setDispositionDetails({ ...dispositionDetails, claimPhone: e.target.value })} /></div></div></div>)}</div><div className="mt-8 flex justify-end pt-6 border-t border-slate-200"><button onClick={handleQCSubmit} disabled={!selectedDisposition || !qcSelectedItem?.condition || qcSelectedItem.condition === 'Unknown'} className="px-8 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Save className="w-5 h-5" /> ยืนยันผลการตรวจสอบ (Confirm QC)</button></div></div></div>) : (<div className="flex flex-col items-center justify-center h-full text-slate-400"><ClipboardList className="w-16 h-16 mb-4 opacity-50" /><h3 className="text-lg font-bold">เลือกรายการจากคิว</h3><p className="text-sm">เลือกรายการสินค้าจากคิวด้านซ้ายเพื่อเริ่มตรวจสอบคุณภาพ</p></div>)}</div> </div>)}
        {activeStep === 4 && (<div className="h-full overflow-x-auto p-4 flex gap-4"> <KanbanColumn title="สินค้าสำหรับส่งคืน (RTV)" status="RTV" icon={Truck} color="bg-amber-500" /> <KanbanColumn title="สินค้าสำหรับขาย (Restock)" status="Restock" icon={RotateCcw} color="bg-green-500" /> <KanbanColumn title="สินค้าสำหรับเคลม (Claim)" status="Claim" icon={ShieldCheck} color="bg-blue-500" /> <KanbanColumn title="สินค้าใช้ภายใน (Internal)" status="InternalUse" icon={Home} color="bg-purple-500" /> <KanbanColumn title="สินค้าสำหรับทำลาย (Scrap)" status="Recycle" icon={Trash2} color="bg-red-500" /> </div>)}
        {activeStep === 5 && (<div className="h-full overflow-auto p-6"> <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-purple-500" /> รายการรอปิดงาน (Pending Completion)</h3> {documentedItems.length === 0 ? (<div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-xl border border-slate-200"><Inbox className="w-12 h-12 mb-2 opacity-50" /><p>ไม่มีรายการที่รอปิดงาน</p></div>) : (<div className="grid gap-4">{documentedItems.map(item => (<div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all"><div className="flex items-center gap-4"><div className="bg-purple-50 p-3 rounded-lg text-purple-600 font-bold font-mono text-xs">{item.id}</div><div><h4 className="font-bold text-slate-800">{item.productName}</h4><div className="text-sm text-slate-500 flex gap-3 mt-1"><span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.branch}</span><span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.customerName}</span>{getDispositionBadge(item.disposition)}</div></div></div><button onClick={() => handleCompleteJob(item.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"><CheckCircle className="w-4 h-4" /> ปิดงาน</button></div>))}</div>)} <h3 className="text-lg font-bold text-slate-800 mb-4 mt-8 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> รายการที่จบงานแล้ว (Completed)</h3> <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100"> {completedItems.slice(0, 10).map(item => (<div key={item.id} className="p-3 flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-xs font-mono text-slate-400">{item.id}</span><div><span className="font-medium text-slate-700">{item.productName}</span><span className="text-xs text-slate-500 ml-2">({item.branch})</span></div></div><div className="text-xs flex items-center gap-2 text-slate-500"><span>ปิดงาน: {item.dateCompleted}</span>{getDispositionBadge(item.disposition)}</div></div>))} {completedItems.length === 0 && <div className="p-4 text-center text-slate-400 text-sm italic">ยังไม่มีรายการที่จบงาน</div>} </div> </div>)}
      </div>

      {/* PRINT SELECTION MODAL */}
      {showSelectionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" /> เลือกรายการสินค้าเพื่อออกเอกสาร
              </h3>
              <button onClick={() => setShowSelectionModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="mb-4 flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                <span className="text-sm font-bold text-blue-700">{getDispositionBadge(selectionStatus || undefined)}</span>
                <span className="text-xs text-blue-600">เลือก {selectedItemIds.size} รายการ</span>
              </div>
              <div className="space-y-2">
                {selectionItems.map(item => (
                  <label key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-all ${selectedItemIds.has(item.id) ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200'}`}>
                    <input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-800 text-sm">{item.productName}</span>
                        <span className="text-xs font-mono text-slate-400">{item.id}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex gap-2">
                        <span>{item.branch}</span>
                        <span>•</span>
                        <span>{item.customerName}</span>
                        <span>•</span>
                        <span className="font-bold">{item.quantity} {item.unit}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button onClick={() => setShowSelectionModal(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-sm">ยกเลิก</button>
              <button onClick={handleGenerateDoc} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm flex items-center gap-2">
                <FileText className="w-4 h-4" /> สร้างเอกสาร (Generate)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {showDocModal && docData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col animate-fade-in text-slate-900 overflow-hidden">
          {/* Toolbar */}
          <div className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md print:hidden w-full z-10">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" /> ตัวอย่างเอกสาร (Print Preview)
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-2 py-1 border border-slate-600">
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input type="checkbox" checked={includeVat} onChange={e => setIncludeVat(e.target.checked)} className="rounded text-blue-500 focus:ring-blue-500 bg-slate-600 border-slate-500" />
                  <span className={includeVat ? 'text-white' : 'text-slate-400'}>คิด VAT</span>
                </label>
                {includeVat && (
                  <div className="flex items-center gap-1 border-l border-slate-600 pl-2">
                    <input
                      type="number"
                      value={vatRate}
                      onChange={e => setVatRate(Number(e.target.value))}
                      className="w-12 bg-slate-800 border border-slate-500 rounded px-1 text-center text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                      min="0" max="100"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                )}
              </div>
              <button onClick={() => setIsDocEditable(!isDocEditable)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1 transition-all ${isDocEditable ? 'bg-amber-500 border-amber-500 text-white' : 'bg-transparent border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                <Edit3 className="w-3 h-3" /> {isDocEditable ? 'Editing Mode' : 'Edit Header'}
              </button>
              <div className="h-6 w-px bg-slate-600 mx-2"></div>
              <button onClick={() => window.print()} className="px-4 py-2 bg-white text-slate-900 rounded-lg hover:bg-slate-100 font-bold text-sm flex items-center gap-2">
                <Printer className="w-4 h-4" /> พิมพ์ (Print)
              </button>
              <button onClick={handleConfirmDocGeneration} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> บันทึกและไประดับถัดไป
              </button>
              <button onClick={() => setShowDocModal(false)} className="ml-2 p-2 hover:bg-slate-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Document Content */}
          <div className="flex-1 overflow-auto bg-slate-100 p-8 print:p-0 print:bg-white print:overflow-visible">
            <div className="bg-white shadow-lg mx-auto max-w-[210mm] min-h-[297mm] p-[15mm] print:shadow-none print:w-full print:max-w-none print:p-0 relative">

              {/* Header */}
              <div className="flex border-b-2 border-slate-800 pb-4 mb-6">
                <div className="w-[100px] h-[100px] flex items-center justify-center mr-6">
                  <img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Neo Siam Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1">
                  {isDocEditable ? (
                    <div className="space-y-1">
                      <input value={docConfig.companyNameTH} onChange={e => setDocConfig({ ...docConfig, companyNameTH: e.target.value })} className="w-full text-lg font-bold border rounded px-1" />
                      <input value={docConfig.companyNameEN} onChange={e => setDocConfig({ ...docConfig, companyNameEN: e.target.value })} className="w-full text-sm border rounded px-1" />
                      <input value={docConfig.address} onChange={e => setDocConfig({ ...docConfig, address: e.target.value })} className="w-full text-xs text-slate-600 border rounded px-1" />
                      <input value={docConfig.contact} onChange={e => setDocConfig({ ...docConfig, contact: e.target.value })} className="w-full text-xs text-slate-600 border rounded px-1" />
                    </div>
                  ) : (
                    <>
                      <h1 className="text-xl font-bold text-slate-800">{docConfig.companyNameTH}</h1>
                      <h2 className="text-sm font-bold text-slate-600">{docConfig.companyNameEN}</h2>
                      <p className="text-xs text-slate-500 mt-1">{docConfig.address}</p>
                      <p className="text-xs text-slate-500">{docConfig.contact}</p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <div className="border inline-block px-4 py-2 rounded text-center mb-2">
                    <div className="text-[10px] text-slate-500">Document No.</div>
                    <div className="font-bold font-mono text-lg">{getISODetails(docData.type).code}</div>
                  </div>
                  <div className="text-xs text-slate-500">Date: {new Date().toLocaleDateString('th-TH')}</div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-8">
                {isDocEditable ? (
                  <input value={docConfig.titleTH} onChange={e => setDocConfig({ ...docConfig, titleTH: e.target.value })} className="text-CENTER text-2xl font-bold border rounded px-2 w-full mb-1" />
                ) : (
                  <h2 className="text-2xl font-bold uppercase border-b border-black inline-block px-8 pb-1">{docConfig.titleTH || getISODetails(docData.type).th}</h2>
                )}
                <p className="text-sm text-slate-500 mt-1 uppercase tracking-wide">{docConfig.titleEN || getISODetails(docData.type).en}</p>
              </div>

              {/* Info Block */}
              <div className="mb-6 text-sm">
                {/* To / Via Section - Standard Document Format */}
                <div className="p-4 border rounded-lg print:border-none print:p-0">
                  <div className="grid grid-cols-1 gap-4 leading-loose">
                    <div className="flex items-end border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold w-[60px]">เรียน:</span>
                      <span className="flex-1 px-2 text-slate-800"></span>
                    </div>
                    <div className="flex items-end border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold w-[60px]">ผ่าน:</span>
                      <span className="flex-1 px-2 text-slate-800"></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-slate-800 text-sm mb-6">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-200 text-center">
                    <th className="border border-slate-800 p-2 w-10">#</th>
                    <th className="border border-slate-800 p-2 w-[120px]">รหัสสินค้า</th>
                    <th className="border border-slate-800 p-2">รายการสินค้า</th>
                    <th className="border border-slate-800 p-2 w-[80px]">จำนวน</th>
                    <th className="border border-slate-800 p-2 w-[60px]">หน่วย</th>
                    <th className="border border-slate-800 p-2 w-[100px]">สภาพ</th>
                    <th className="border border-slate-800 p-2 w-[100px]">ราคา/หน่วย</th>
                    <th className="border border-slate-800 p-2 w-[100px]">รวมเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {docData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-800 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-800 p-2">{item.productCode}</td>
                      <td className="border border-slate-800 p-2">
                        <div>{item.productName}</div>
                        <div className="text-[10px] text-slate-500">Ref: {item.refNo}</div>
                      </td>
                      <td className="border border-slate-800 p-2 text-center font-bold">{item.quantity}</td>
                      <td className="border border-slate-800 p-2 text-center">{item.unit}</td>
                      <td className="border border-slate-800 p-2 text-center text-xs">{item.condition}</td>
                      <td className="border border-slate-800 p-2 text-right">{item.priceBill?.toLocaleString()}</td>
                      <td className="border border-slate-800 p-2 text-right">{((item.priceBill || 0) * item.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* Summary Rows */}
                  <tr className="font-bold bg-slate-50 print:bg-transparent">
                    <td colSpan={6} rowSpan={3} className="border border-slate-800 p-4 text-center align-middle text-lg italic bg-slate-50 text-slate-600 print:hidden">
                      ({ThaiBahtText(calculateTotal(docData.items, includeVat).net)})
                    </td>
                    <td colSpan={6} rowSpan={includeVat ? 1 : 3} className="border border-slate-800 p-4 text-center align-middle text-lg italic bg-slate-50 text-slate-600 hidden print:table-cell">
                      ({ThaiBahtText(calculateTotal(docData.items, includeVat).net)})
                    </td>
                    <td className="border border-slate-800 p-2 text-right">รวมเป็นเงิน</td>
                    <td className="border border-slate-800 p-2 text-right">{calculateTotal(docData.items, includeVat).subtotal.toLocaleString()}</td>
                  </tr>
                  {includeVat && (
                    <>
                      <tr className="font-bold bg-slate-50 print:bg-transparent">
                        <td className="border border-slate-800 p-2 text-right">VAT 7%</td>
                        <td className="border border-slate-800 p-2 text-right">{calculateTotal(docData.items, includeVat).vat.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="font-bold bg-slate-100 print:bg-slate-200">
                        <td className="border border-slate-800 p-2 text-right text-black">ยอดสุทธิ</td>
                        <td className="border border-slate-800 p-2 text-right text-black">{calculateTotal(docData.items, includeVat).net.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              {/* Remarks */}
              <div className="mb-8 p-4 border border-slate-300 rounded print:border-black">
                <span className="font-bold underline text-sm">หมายเหตุ:</span>
                {isDocEditable ? (
                  <textarea value={docConfig.remarks} onChange={e => setDocConfig({ ...docConfig, remarks: e.target.value })} className="w-full mt-1 p-1 border rounded" rows={2} />
                ) : (
                  <p className="text-sm mt-1 indent-4">{docConfig.remarks}</p>
                )}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-8 mt-12 print:break-inside-avoid">
                <div className="text-center">
                  <div className="border-b border-black border-dotted h-8 w-3/4 mx-auto mb-2"></div>
                  <div className="text-sm font-bold">{docConfig.signatory1}</div>
                  <div className="text-xs text-slate-500">วันที่ ...../...../..........</div>
                </div>
                <div className="text-center">
                  <div className="border-b border-black border-dotted h-8 w-3/4 mx-auto mb-2"></div>
                  <div className="text-sm font-bold">{docConfig.signatory2}</div>
                  <div className="text-xs text-slate-500">วันที่ ...../...../..........</div>
                </div>
                <div className="text-center">
                  <div className="border-b border-black border-dotted h-8 w-3/4 mx-auto mb-2"></div>
                  <div className="text-sm font-bold">{docConfig.signatory3}</div>
                  <div className="text-xs text-slate-500">วันที่ ...../...../..........</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Operations;