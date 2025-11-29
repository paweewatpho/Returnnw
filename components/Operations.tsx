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
        setQcSelectedItem({...qcSelectedItem, condition: ''});
    } else {
        setCustomInputType(null);
        setQcSelectedItem({...qcSelectedItem, condition});
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalProblemType = formData.problemType === 'Other' ? customProblemType : formData.problemType;
    const finalRootCause = formData.rootCause === 'Other' ? customRootCause : formData.rootCause;

    const newItem: ReturnRecord = {
      ...formData as ReturnRecord,
      id: `RT-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`,
      amount: (formData.quantity || 0) * (formData.priceBill || 0),
      reason: formData.notes || 'แจ้งคืนสินค้า',
      status: 'Requested',
      dateRequested: formData.date,
      disposition: 'Pending',
      condition: 'Unknown',
      productName: formData.productName || 'Unknown Product',
      productCode: formData.productCode || 'N/A',
      customerName: formData.customerName || 'Unknown Customer',
      category: 'General',
      problemType: finalProblemType,
      rootCause: finalRootCause,
      ncrNumber: formData.ncrNumber,
      neoRefNo: formData.neoRefNo,
      destinationCustomer: formData.destinationCustomer,
    };
    
    const success = await addReturnRecord(newItem);
    
    if (success) {
        alert(`บันทึกคำขอคืนเรียบร้อย! รหัส: ${newItem.id} \nรายการจะไปรอที่ขั้นตอน "รับสินค้าเข้า"`);
        setFormData(initialFormState); 
        setCustomProblemType('');
        setCustomRootCause('');
        setIsCustomBranch(false);
    } else {
        // Error alert is handled in DataContext
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
    } else {
        alert('บันทึกผล QC ไม่สำเร็จ (Permission Denied)');
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
          alert("กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ");
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
      // Update all items
      for (const item of docData.items) {
          const success = await updateReturnRecord(item.id, { status: 'Documented', dateDocumented: today });
          if (success) successCount++;
      }

      if (successCount > 0) {
          alert(`สร้างเอกสารและบันทึกสถานะเรียบร้อย ${successCount} รายการ\nรายการถูกส่งไปยังขั้นตอน "ปิดงาน/ตรวจสอบผล"`);
          setShowDocModal(false);
      } else {
          alert('บันทึกสถานะไม่สำเร็จ (Permission Denied)');
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

  // Same Helper Functions
  const getISODetails = (type: DispositionAction) => {
      switch(type) {
          case 'RTV': return { code: 'FM-LOG-05', rev: '00', th: 'ใบส่งคืนสินค้า', en: 'GOODS RETURN NOTE' };
          case 'Restock': return { code: 'FM-SAL-02', rev: '00', th: 'แบบขออนุมัติจำหน่ายสินค้าสภาพดี', en: 'SALES DISPOSAL APPROVAL FORM' };
          case 'Claim': return { code: 'FM-CLM-01', rev: '00', th: 'ใบนำส่งสินค้าเคลมประกัน', en: 'INSURANCE CLAIM DELIVERY NOTE' };
          case 'InternalUse': return { code: 'FM-ADM-09', rev: '00', th: 'ใบเบิกสินค้าใช้ภายใน', en: 'INTERNAL REQUISITION FORM' };
          case 'Recycle': return { code: 'FM-AST-04', rev: '00', th: 'แบบขออนุมัติตัดจำหน่าย/ทำลายทรัพย์สิน', en: 'ASSET WRITE-OFF / SCRAP AUTHORIZATION FORM' };
          default: return { code: 'FM-GEN-00', rev: '00', th: 'เอกสารจัดการสินค้าคืน', en: 'RETURN MANAGEMENT DOCUMENT' };
      }
  };

  const getDispositionBadge = (disp?: DispositionAction) => {
      if (!disp || disp === 'Pending') return <span className="text-slate-400">-</span>;
      const config: any = {
          'RTV': { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Truck, label: 'ส่งคืน (Return)' },
          'Restock': { color: 'bg-green-50 text-green-700 border-green-200', icon: RotateCcw, label: 'ขาย (Sell)' },
          'Recycle': { color: 'bg-red-50 text-red-700 border-red-200', icon: Trash2, label: 'ทิ้ง (Scrap)' },
          'InternalUse': { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Home, label: 'ใช้ภายใน' },
          'Claim': { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: ShieldCheck, label: 'เคลมประกัน' }
      }[disp];
      if (!config) return <span>{disp}</span>;
      const Icon = config.icon;
      return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${config.color}`}><Icon className="w-3 h-3" /> {config.label}</span>;
  };

  const calculateTotal = (items: ReturnRecord[], hasVat: boolean) => {
      const subtotal = items.reduce((acc, item) => acc + ((item.priceBill || 0) * item.quantity), 0);
      const vat = hasVat ? subtotal * 0.07 : 0;
      const net = subtotal + vat;
      return { subtotal, vat, net };
  };

  const ThaiBahtText = (amount: number): string => {
    const units = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
    
    if (amount === 0) return "ศูนย์บาทถ้วน";
    
    let amountStr = amount.toFixed(2);
    let parts = amountStr.split(".");
    let integerPart = parts[0];
    let decimalPart = parts[1];
    
    let result = "";
    
    // Process integer part
    for (let i = 0; i < integerPart.length; i++) {
        let digit = parseInt(integerPart.charAt(i));
        let pos = integerPart.length - i - 1;
        
        if (digit !== 0) {
            if (pos % 6 === 1 && digit === 1 && integerPart.length > 1) { // 1 in ten position
                // Do nothing for 'sip'
            } else if (pos % 6 === 1 && digit === 2) { // 2 in ten position
                result += "ยี่";
            } else if (pos % 6 === 0 && digit === 1 && integerPart.length > 1) { // 1 in unit position
                result += "เอ็ด";
            } else {
                result += units[digit];
            }
            
            result += positions[pos % 6];
        }
        
        if (pos % 6 === 0 && pos > 0) { // Million position
            result += "ล้าน";
        }
    }
    
    result += "บาท";
    
    // Process decimal part
    if (parseInt(decimalPart) === 0) {
        result += "ถ้วน";
    } else {
        for (let i = 0; i < decimalPart.length; i++) {
            let digit = parseInt(decimalPart.charAt(i));
            let pos = decimalPart.length - i - 1;
            
            if (digit !== 0) {
                if (pos === 1 && digit === 1) {
                    // Do nothing for 'sip'
                } else if (pos === 1 && digit === 2) {
                    result += "ยี่";
                } else if (pos === 0 && digit === 1 && decimalPart.length > 1) {
                    result += "เอ็ด";
                } else {
                    result += units[digit];
                }
                
                if (pos === 1) result += "สิบ";
            }
        }
        result += "สตางค์";
    }
    
    return result;
  };

  // Filter Items from Context
  const requestedItems = items.filter(i => i.status === 'Requested');
  const receivedItems = items.filter(i => i.status === 'Received');
  const gradedItems = items.filter(i => i.status === 'Graded'); 
  const documentedItems = items.filter(i => i.status === 'Documented');
  const completedItems = items.filter(i => i.status === 'Completed');

  const conditionLabels: Record<string, string> = {
    'New': 'สภาพดี (Good)',
    'BoxDamage': 'กล่องบุบ (Box Dmg)',
    'WetBox': 'ลังเปียก (Wet Box)',
    'LabelDefect': 'ฉลากลอก (Label)',
    'Expired': 'หมดอายุ (Expired)',
    'Damaged': 'ชำรุด/ซาก (Damaged)',
    'Defective': 'เสีย (Defective)'
  };

  const dispositionLabels: Record<string, string> = {
    'RTV': 'ส่งคืน (Return)',
    'Restock': 'ขาย (Sell)',
    'Recycle': 'ทิ้ง (Scrap)',
    'InternalUse': 'ใช้ภายใน (Internal)',
    'Claim': 'เคลมประกัน (Claim)'
  };

  const KanbanColumn = ({ title, status, icon: Icon, color }: { title: string, status: DispositionAction, icon: any, color: string }) => {
    const list = items.filter(i => i.disposition === status && i.status === 'Graded');
    return (
      <div className="flex-1 min-w-[280px] bg-slate-50 rounded-xl flex flex-col h-full border border-slate-200">
        <div className={`p-3 border-b border-slate-200 ${color} bg-opacity-10 rounded-t-xl flex items-center justify-between`}>
          <div className="flex items-center gap-2 font-bold text-slate-700">
             <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
             {title}
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => handlePrintClick(status, list)}
                className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-slate-800"
                title="ออกเอกสาร (Generate Doc)"
            >
                <Printer className="w-4 h-4" />
            </button>
            <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">{list.length}</span>
          </div>
        </div>
        <div className="p-2 space-y-2 overflow-y-auto flex-1">
           {list.map(item => (
             <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-1">
                   <span className="text-xs font-mono text-slate-400">{item.id}</span>
                   <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">รอเอกสาร</span>
                </div>
                <div className="text-xs text-blue-600 mb-0.5">{item.branch}</div>
                <h4 className="text-sm font-semibold text-slate-800 truncate">{item.productName}</h4>
                <div className="flex justify-between items-center mt-2">
                   <p className="text-xs text-slate-500 truncate max-w-[120px]">{item.condition}</p>
                   <span className="text-xs font-mono text-slate-400">{item.quantity} {item.unit}</span>
                </div>
                <div className="mt-1 pt-1 border-t border-slate-50 flex justify-end">
                    <span className="text-[10px] text-slate-400">QC: {item.dateGraded}</span>
                </div>
             </div>
           ))}
           {list.length === 0 && (
               <div className="text-center p-4 text-slate-400 text-xs italic">ไม่มีรายการรอออกเอกสาร</div>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      <div className="border-b border-slate-200 px-6 pt-4 bg-white shadow-sm z-10">
        <div className="flex gap-2 overflow-x-auto pb-0">
           <button onClick={() => setActiveStep(1)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 1 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span> แจ้งคืน (Key-in)
          </button>
          <button onClick={() => setActiveStep(2)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 2 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span> รับสินค้าเข้า (Intake) {requestedItems.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{requestedItems.length}</span>}
          </button>
          <button onClick={() => setActiveStep(3)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 3 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span> ตรวจสอบคุณภาพ (QC) {receivedItems.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{receivedItems.length}</span>}
          </button>
          <button onClick={() => setActiveStep(4)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 4 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 4 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>4</span> ออกเอกสาร (Docs) {gradedItems.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{gradedItems.length}</span>}
          </button>
          <button onClick={() => setActiveStep(5)} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap px-4 ${activeStep === 5 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeStep === 5 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>5</span> ปิดงาน/รับคืนเรียบร้อย {documentedItems.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{documentedItems.length}</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-slate-50/50">
        {/* STEP 1 */}
        {activeStep === 1 && (
          <div className="h-full overflow-auto p-6">
             <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                 <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileInput className="w-6 h-6" /></div>
                    <div><h3 className="text-xl font-bold text-slate-800">1. แจ้งคืนสินค้า (Return Request)</h3><p className="text-sm text-slate-500">สำหรับสาขา: กรอกข้อมูลสินค้าที่ต้องการส่งคืนเพื่อสร้างคำขอเข้าระบบ</p></div>
                    {initialData?.ncrNumber && <div className="ml-auto bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">Auto-filled from NCR: {initialData.ncrNumber}</div>}
                 </div>
                 <form onSubmit={handleRequestSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">สาขาต้นทาง</label>
                            <select required value={isCustomBranch ? 'Other' : formData.branch} onChange={e => { const val = e.target.value; if (val === 'Other') { setIsCustomBranch(true); setFormData({...formData, branch: ''}); } else { setIsCustomBranch(false); setFormData({...formData, branch: val}); } }} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                                {BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                                <option value="Other">อื่นๆ</option>
                            </select>
                            {isCustomBranch && <input type="text" placeholder="ระบุชื่อสาขา..." value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} className="w-full mt-2 p-2 border rounded-lg text-sm" />}
                        </div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">วันที่แจ้ง</label><input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">เลขที่เอกสารอ้างอิง</label><input type="text" required value={formData.refNo} onChange={e => setFormData({...formData,refNo: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">เลขที่เอกสาร Neo Siam</label><input type="text" value={formData.neoRefNo} onChange={e => setFormData({...formData, neoRefNo: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div>
                        <div className=""><label className="block text-sm font-medium text-slate-700 mb-1">ชื่อลูกค้า</label><input type="text" required value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium text-slate-700 mb-1">สถานที่ส่ง (ลูกค้าปลายทาง)</label><input type="text" value={formData.destinationCustomer} onChange={e => setFormData({...formData, destinationCustomer: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                        <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2"><Box className="w-4 h-4" /> ข้อมูลสินค้า</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div><label className="text-xs text-slate-500 block mb-1">รหัสสินค้า</label><input type="text" required value={formData.productCode} onChange={e => setFormData({...formData, productCode: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                            <div className="md:col-span-3"><label className="text-xs text-slate-500 block mb-1">ชื่อสินค้า</label><input type="text" required value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                             <div><label className="text-xs text-slate-500 block mb-1">จำนวน</label><input type="number" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm" /></div>
                             <div><label className="text-xs text-slate-500 block mb-1">หน่วย</label><input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                             <div><label className="text-xs text-slate-500 block mb-1">วันหมดอายุ</label><input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs text-slate-500 block mb-1">ราคาหน้าบิล</label><input type="number" value={formData.priceBill} onChange={e => setFormData({...formData, priceBill: parseFloat(e.target.value)})} className="w-full p-2 border rounded text-sm" /></div>
                             <div><label className="text-xs text-slate-500 block mb-1">ราคาขาย</label><input type="number" value={formData.priceSell} onChange={e => setFormData({...formData, priceSell: parseFloat(e.target.value)})} className="w-full p-2 border rounded text-sm" /></div>
                        </div>
                    </div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ/สาเหตุการคืน</label><textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" placeholder="ระบุสาเหตุ..."></textarea></div>
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="submit" className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md flex items-center gap-2"><Save className="w-4 h-4" /> ยืนยันคำขอคืน (Submit Request)</button>
                    </div>
                 </form>
             </div>
          </div>
        )}
        
        {/* STEP 2: INTAKE */}
        {activeStep === 2 && (
          <div className="h-full overflow-auto p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-amber-500" /> สินค้าขาเข้า (Incoming Shipments)</h3>
            {requestedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-xl border border-slate-200">
                    <Inbox className="w-12 h-12 mb-2 opacity-50" />
                    <p>ไม่มีรายการที่แจ้งเข้ามาใหม่</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {requestedItems.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-50 p-3 rounded-lg text-blue-600 font-bold font-mono text-xs">{item.id}</div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{item.productName}</h4>
                                    <div className="text-sm text-slate-500 flex gap-3 mt-1">
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.branch}</span>
                                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.customerName}</span>
                                        <span className="font-mono bg-slate-100 px-1.5 rounded text-xs">Qty: {item.quantity} {item.unit}</span>
                                    </div>
                                    <div className="text-xs text-red-500 mt-1 italic">"{item.reason}"</div>
                                </div>
                            </div>
                            <button onClick={() => handleIntakeReceive(item.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
                                <CheckCircle className="w-4 h-4" /> รับของเข้าระบบ
                            </button>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {/* STEP 3: QC */}
        {activeStep === 3 && (
          <div className="h-full flex">
             {/* Left: Queue */}
             <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
                 <div className="p-4 border-b border-slate-100 font-bold text-slate-700 flex justify-between items-center">
                     <span>คิวรอตรวจสอบ ({receivedItems.length})</span>
                     <Activity className="w-4 h-4 text-blue-500" />
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-2">
                     {receivedItems.map(item => (
                         <div key={item.id} onClick={() => selectQCItem(item)} className={`p-3 rounded-lg border cursor-pointer transition-all ${qcSelectedItem?.id === item.id ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' : 'bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50'}`}>
                             <div className="flex justify-between mb-1"><span className="text-xs font-bold text-slate-700">{item.productCode}</span><span className="text-[10px] text-slate-400">{item.dateReceived}</span></div>
                             <div className="text-sm font-medium text-slate-800 truncate mb-1">{item.productName}</div>
                             <div className="text-xs text-slate-500">{item.branch}</div>
                         </div>
                     ))}
                     {receivedItems.length === 0 && <div className="p-4 text-center text-slate-400 text-xs italic">ไม่มีสินค้าที่ต้องตรวจสอบ</div>}
                 </div>
             </div>
             
             {/* Right: Workstation */}
             <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                 {qcSelectedItem ? (
                     <div className="max-w-3xl mx-auto space-y-6">
                         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                             <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                                 <div>
                                     <h3 className="text-2xl font-bold text-slate-800 mb-1">{qcSelectedItem.productName}</h3>
                                     <div className="flex gap-4 text-sm text-slate-500">
                                         <span>ID: {qcSelectedItem.id}</span>
                                         <span>Ref: {qcSelectedItem.refNo}</span>
                                         <span>Qty: <b>{qcSelectedItem.quantity} {qcSelectedItem.unit}</b></span>
                                     </div>
                                 </div>
                                 <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">In Progress</div>
                             </div>
                             
                             {/* Grading */}
                             <div className="mb-8">
                                 <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">1. ประเมินสภาพ (Grading)</h4>
                                 <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                         <div className="text-xs font-bold text-green-600 bg-green-50 p-1.5 rounded w-fit mb-2">Good (สภาพดี)</div>
                                         <div className="grid grid-cols-2 gap-2">
                                             {['New', 'BoxDamage', 'WetBox', 'LabelDefect', 'Other'].map((cond) => (
                                                 <button 
                                                     key={cond}
                                                     onClick={() => handleConditionSelect(cond === 'Other' ? 'Other' : cond as ItemCondition, 'Good')}
                                                     className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${qcSelectedItem.condition === cond || (cond === 'Other' && customInputType === 'Good') ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-green-300 hover:text-green-600'}`}
                                                 >
                                                     {cond === 'New' ? 'สภาพดี (Good)' : cond === 'BoxDamage' ? 'กล่องบุบ' : cond === 'WetBox' ? 'ลังเปียก' : cond === 'LabelDefect' ? 'ฉลากลอก' : 'อื่นๆ (ระบุ)'}
                                                 </button>
                                             ))}
                                         </div>
                                         {customInputType === 'Good' && (
                                             <input type="text" placeholder="ระบุสภาพสินค้า..." className="w-full mt-2 p-2 border rounded-lg text-sm focus:ring-1 focus:ring-green-500 outline-none" value={qcSelectedItem.condition === 'New' || qcSelectedItem.condition === 'BoxDamage' || qcSelectedItem.condition === 'WetBox' || qcSelectedItem.condition === 'LabelDefect' ? '' : qcSelectedItem.condition} onChange={e => setQcSelectedItem({...qcSelectedItem, condition: e.target.value})} autoFocus />
                                         )}
                                     </div>
                                     <div className="space-y-2">
                                         <div className="text-xs font-bold text-red-600 bg-red-50 p-1.5 rounded w-fit mb-2">Bad (เสียหาย)</div>
                                         <div className="grid grid-cols-2 gap-2">
                                             {['Expired', 'Damaged', 'Defective', 'Other'].map((cond) => (
                                                 <button 
                                                     key={cond}
                                                     onClick={() => handleConditionSelect(cond === 'Other' ? 'Other' : cond as ItemCondition, 'Bad')}
                                                     className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${qcSelectedItem.condition === cond || (cond === 'Other' && customInputType === 'Bad') ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600'}`}
                                                 >
                                                     {cond === 'Expired' ? 'หมดอายุ' : cond === 'Damaged' ? 'ซาก (Scrap)' : cond === 'Defective' ? 'เสีย (Defective)' : 'อื่นๆ (ระบุ)'}
                                                 </button>
                                             ))}
                                         </div>
                                         {customInputType === 'Bad' && (
                                             <input type="text" placeholder="ระบุความเสียหาย..." className="w-full mt-2 p-2 border rounded-lg text-sm focus:ring-1 focus:ring-red-500 outline-none" value={qcSelectedItem.condition === 'Expired' || qcSelectedItem.condition === 'Damaged' || qcSelectedItem.condition === 'Defective' ? '' : qcSelectedItem.condition} onChange={e => setQcSelectedItem({...qcSelectedItem, condition: e.target.value})} autoFocus />
                                         )}
                                     </div>
                                 </div>
                             </div>

                             {/* Disposition */}
                             <div>
                                 <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">2. ตัดสินใจ (Disposition)</h4>
                                 <div className="grid grid-cols-5 gap-2 mb-4">
                                     <button onClick={() => { setSelectedDisposition('RTV'); setIsCustomRoute(false); }} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedDisposition === 'RTV' ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Truck className="w-5 h-5 mb-1" /><span className="text-xs font-bold">ส่งคืน (Return)</span></button>
                                     <button onClick={() => setSelectedDisposition('Restock')} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedDisposition === 'Restock' ? 'bg-green-600 text-white border-green-700 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><RotateCcw className="w-5 h-5 mb-1" /><span className="text-xs font-bold">ขาย (Sell)</span></button>
                                     <button onClick={() => setSelectedDisposition('Recycle')} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedDisposition === 'Recycle' ? 'bg-red-500 text-white border-red-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Trash2 className="w-5 h-5 mb-1" /><span className="text-xs font-bold">ทิ้ง (Scrap)</span></button>
                                     <button onClick={() => setSelectedDisposition('InternalUse')} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedDisposition === 'InternalUse' ? 'bg-purple-500 text-white border-purple-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Home className="w-5 h-5 mb-1" /><span className="text-xs font-bold">ใช้ภายใน (Int)</span></button>
                                     <button onClick={() => setSelectedDisposition('Claim')} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedDisposition === 'Claim' ? 'bg-blue-500 text-white border-blue-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><ShieldCheck className="w-5 h-5 mb-1" /><span className="text-xs font-bold">เคลม (Claim)</span></button>
                                 </div>
                                 
                                 {/* Dynamic Forms based on Disposition */}
                                 {selectedDisposition === 'RTV' && (
                                     <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 animate-fade-in">
                                         <label className="block text-xs font-bold text-amber-800 mb-2">ระบุเส้นทางส่งคืน (Select Route)</label>
                                         <div className="flex flex-wrap gap-3">
                                             {RETURN_ROUTES.map(r => (
                                                 <label key={r} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded border border-amber-200 text-sm text-slate-700 hover:border-amber-400">
                                                     <input type="radio" name="route" value={r} checked={dispositionDetails.route === r} onChange={e => { setDispositionDetails({...dispositionDetails, route: e.target.value}); setIsCustomRoute(false); }} className="text-amber-500 focus:ring-amber-500" /> {r}
                                                 </label>
                                             ))}
                                             <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded border border-amber-200 text-sm text-slate-700 hover:border-amber-400">
                                                 <input type="radio" name="route" checked={isCustomRoute} onChange={() => { setIsCustomRoute(true); setDispositionDetails({...dispositionDetails, route: ''}); }} className="text-amber-500 focus:ring-amber-500" /> อื่นๆ
                                             </label>
                                         </div>
                                         {isCustomRoute && (
                                             <input type="text" placeholder="ระบุเส้นทาง..." className="w-full mt-2 p-2 border rounded-lg text-sm focus:ring-1 focus:ring-amber-500 outline-none" value={dispositionDetails.route} onChange={e => setDispositionDetails({...dispositionDetails, route: e.target.value})} autoFocus />
                                         )}
                                     </div>
                                 )}
                                 
                                 {selectedDisposition === 'Restock' && (
                                     <div className="bg-green-50 p-4 rounded-lg border border-green-100 animate-fade-in grid grid-cols-2 gap-4">
                                         <div><label className="block text-xs font-bold text-green-800 mb-1">ชื่อผู้ซื้อ (Buyer Name)</label><input type="text" className="w-full p-2 border border-green-200 rounded text-sm focus:ring-1 focus:ring-green-500 outline-none" value={dispositionDetails.sellerName} onChange={e => setDispositionDetails({...dispositionDetails, sellerName: e.target.value})} /></div>
                                         <div><label className="block text-xs font-bold text-green-800 mb-1">เบอร์โทรติดต่อ</label><input type="text" className="w-full p-2 border border-green-200 rounded text-sm focus:ring-1 focus:ring-green-500 outline-none" value={dispositionDetails.contactPhone} onChange={e => setDispositionDetails({...dispositionDetails, contactPhone: e.target.value})} /></div>
                                     </div>
                                 )}

                                 {selectedDisposition === 'InternalUse' && (
                                     <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 animate-fade-in">
                                         <label className="block text-xs font-bold text-purple-800 mb-1">หน่วยงาน/ผู้นำไปใช้ (Department/User)</label>
                                         <input type="text" className="w-full p-2 border border-purple-200 rounded text-sm focus:ring-1 focus:ring-purple-500 outline-none" placeholder="เช่น แผนกบัญชี, คุณสมชาย" value={dispositionDetails.internalUseDetail} onChange={e => setDispositionDetails({...dispositionDetails, internalUseDetail: e.target.value})} />
                                     </div>
                                 )}

                                 {selectedDisposition === 'Claim' && (
                                     <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-fade-in space-y-3">
                                         <div><label className="block text-xs font-bold text-blue-800 mb-1">ชื่อบริษัทประกัน (Insurance Company)</label><input type="text" className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={dispositionDetails.claimCompany} onChange={e => setDispositionDetails({...dispositionDetails, claimCompany: e.target.value})} /></div>
                                         <div className="grid grid-cols-2 gap-3">
                                             <div><label className="block text-xs font-bold text-blue-800 mb-1">ผู้ประสานงาน</label><input type="text" className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={dispositionDetails.claimCoordinator} onChange={e => setDispositionDetails({...dispositionDetails, claimCoordinator: e.target.value})} /></div>
                                             <div><label className="block text-xs font-bold text-blue-800 mb-1">เบอร์โทร</label><input type="text" className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={dispositionDetails.claimPhone} onChange={e => setDispositionDetails({...dispositionDetails, claimPhone: e.target.value})} /></div>
                                         </div>
                                     </div>
                                 )}
                             </div>
                         </div>
                         <div className="flex justify-end">
                             <button onClick={handleQCSubmit} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transform transition hover:-translate-y-1">ยืนยันผลการตรวจสอบ</button>
                         </div>
                     </div>
                 ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400">
                         <Search className="w-16 h-16 mb-4 opacity-20" />
                         <p className="text-lg font-medium">เลือกรายการทางซ้ายเพื่อเริ่มตรวจสอบ</p>
                     </div>
                 )}
             </div>
          </div>
        )}

        {/* STEP 4: DOCS (KANBAN) */}
        {activeStep === 4 && (
          <div className="h-full overflow-x-auto p-6">
             <div className="flex gap-4 h-full min-w-max pb-4">
                <KanbanColumn title="ขาย (Restock)" status="Restock" icon={RotateCcw} color="bg-green-100 text-green-700" />
                <KanbanColumn title="ส่งคืน (Return)" status="RTV" icon={Truck} color="bg-amber-100 text-amber-700" />
                <KanbanColumn title="เคลม (Claim)" status="Claim" icon={ShieldCheck} color="bg-blue-100 text-blue-700" />
                <KanbanColumn title="ใช้ภายใน (Internal)" status="InternalUse" icon={Home} color="bg-purple-100 text-purple-700" />
                <KanbanColumn title="ทิ้ง (Scrap)" status="Recycle" icon={Trash2} color="bg-red-100 text-red-700" />
             </div>
          </div>
        )}

        {/* STEP 5: DONE */}
        {activeStep === 5 && (
          <div className="h-full overflow-auto p-6">
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                     <h3 className="font-bold text-slate-700 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" /> รายการที่ออกเอกสารแล้ว (Documented)</h3>
                     <span className="text-xs text-slate-500">รอการยืนยันปิดงานขั้นสุดท้าย</span>
                 </div>
                 <table className="w-full text-left">
                     <thead className="bg-white border-b border-slate-100 text-xs uppercase text-slate-500">
                         <tr><th className="px-6 py-3">รหัสสินค้า</th><th className="px-6 py-3">สินค้า</th><th className="px-6 py-3">การจัดการ</th><th className="px-6 py-3 text-center">สถานะ</th><th className="px-6 py-3 text-center">ดำเนินการ</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                         {documentedItems.map(item => (
                             <tr key={item.id} className="hover:bg-slate-50">
                                 <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.id}</td>
                                 <td className="px-6 py-4"><div className="font-bold text-slate-800">{item.productName}</div><div className="text-xs text-slate-500">{item.customerName}</div></td>
                                 <td className="px-6 py-4">{getDispositionBadge(item.disposition)}</td>
                                 <td className="px-6 py-4 text-center"><span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">รอปิดงาน</span></td>
                                 <td className="px-6 py-4 text-center">
                                     <button onClick={() => handleCompleteJob(item.id)} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm transition-colors">ยืนยันปิดงาน</button>
                                 </td>
                             </tr>
                         ))}
                         {documentedItems.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">ไม่มีรายการที่ต้องปิดงาน</td></tr>}
                     </tbody>
                 </table>
             </div>
          </div>
        )}
      </div>

      {/* SELECTION MODAL */}
      {showSelectionModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-fade-in">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-slate-800">เลือกรายการสินค้าเพื่อออกเอกสาร</h3>
                      <button onClick={() => setShowSelectionModal(false)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                      {selectionItems.map(item => (
                          <div key={item.id} onClick={() => toggleSelection(item.id)} className={`flex items-center gap-4 p-4 m-2 rounded-xl border cursor-pointer transition-all ${selectedItemIds.has(item.id) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedItemIds.has(item.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'}`}>
                                  {selectedItemIds.has(item.id) && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <div className="flex-1">
                                  <div className="font-bold text-slate-800">{item.productName}</div>
                                  <div className="text-xs text-slate-500 flex gap-2 mt-1"><span>{item.id}</span><span>•</span><span>{item.branch}</span><span>•</span><span>{item.quantity} {item.unit}</span></div>
                              </div>
                              <div className="text-right text-xs">
                                  <div className="font-bold text-slate-700">Ref: {item.refNo}</div>
                                  <div className="text-slate-400">{item.date}</div>
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-2xl">
                      <div className="text-sm text-slate-600">เลือกแล้ว <b>{selectedItemIds.size}</b> รายการ</div>
                      <button onClick={handleGenerateDoc} disabled={selectedItemIds.size === 0} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors">สร้างเอกสาร</button>
                  </div>
              </div>
          </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {showDocModal && docData && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-[210mm] min-h-[297mm] h-auto shadow-2xl relative flex flex-col my-8">
             {/* Toolbar */}
             <div className="absolute -top-12 left-0 right-0 flex justify-between items-center text-white print:hidden">
                 <div className="flex items-center gap-4">
                     <h3 className="font-bold text-lg">ตัวอย่างเอกสาร (Preview)</h3>
                     <label className="flex items-center gap-2 cursor-pointer bg-white/20 px-3 py-1 rounded hover:bg-white/30 transition">
                         <input type="checkbox" checked={includeVat} onChange={(e) => setIncludeVat(e.target.checked)} className="rounded text-blue-500 focus:ring-0" />
                         <span className="text-sm">คิดภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                     </label>
                     <button onClick={() => setIsDocEditable(!isDocEditable)} className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition ${isDocEditable ? 'bg-yellow-500 text-black' : 'bg-white/20 hover:bg-white/30'}`}>
                         <Edit3 className="w-4 h-4" /> {isDocEditable ? 'Finish Editing' : 'Edit Mode'}
                     </button>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={() => window.print()} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold hover:bg-slate-100 flex items-center gap-2"><Printer className="w-4 h-4" /> พิมพ์ (Print)</button>
                     <button onClick={handleConfirmDocGeneration} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 shadow-lg"><CheckCircle className="w-4 h-4" /> ยืนยันการออกเอกสาร</button>
                     <button onClick={() => setShowDocModal(false)} className="bg-red-500/80 text-white p-2 rounded-lg hover:bg-red-600"><X className="w-5 h-5" /></button>
                 </div>
             </div>

             {/* DOCUMENT CONTENT (A4) */}
             <div className="p-12 flex-1 flex flex-col text-slate-900 font-serif relative">
                 {/* Header Table */}
                 <table className="w-full border border-black mb-6">
                     <tbody>
                         <tr>
                             <td className="w-[20%] border-r border-black p-4 text-center align-middle">
                                 <img src="https://img2.pic.in.th/pic/logo-neo.png" alt="Company Logo" className="w-full h-auto object-contain max-h-20" />
                             </td>
                             <td className="w-[50%] border-r border-black p-4">
                                 {isDocEditable ? (
                                     <div className="space-y-2">
                                         <input className="w-full border p-1 text-sm font-bold" value={docConfig.companyNameTH} onChange={(e) => setDocConfig({...docConfig, companyNameTH: e.target.value})} />
                                         <input className="w-full border p-1 text-sm font-bold" value={docConfig.companyNameEN} onChange={(e) => setDocConfig({...docConfig, companyNameEN: e.target.value})} />
                                         <textarea className="w-full border p-1 text-xs resize-none" rows={2} value={docConfig.address} onChange={(e) => setDocConfig({...docConfig, address: e.target.value})} />
                                         <input className="w-full border p-1 text-xs" value={docConfig.contact} onChange={(e) => setDocConfig({...docConfig, contact: e.target.value})} />
                                     </div>
                                 ) : (
                                     <>
                                         <h1 className="text-lg font-bold leading-tight">{docConfig.companyNameTH}</h1>
                                         <h2 className="text-sm font-bold mb-2">{docConfig.companyNameEN}</h2>
                                         <p className="text-xs leading-relaxed">{docConfig.address}</p>
                                         <p className="text-xs mt-1">{docConfig.contact}</p>
                                     </>
                                 )}
                             </td>
                             <td className="w-[30%] p-2 align-top text-xs">
                                 <div className="grid grid-cols-2 gap-y-2">
                                     <span className="font-bold">Document No:</span>
                                     <span className="font-mono text-right">{docData.items[0]?.id.replace('RT-', getISODetails(docData.type).code + '-')}</span>
                                     <span className="font-bold">Date:</span>
                                     <span className="text-right">{new Date().toLocaleDateString('th-TH')}</span>
                                     <span className="font-bold">Form Code:</span>
                                     <span className="text-right">{getISODetails(docData.type).code}</span>
                                     <span className="font-bold">Rev No:</span>
                                     <span className="text-right">{getISODetails(docData.type).rev}</span>
                                 </div>
                             </td>
                         </tr>
                     </tbody>
                 </table>

                 {/* Title */}
                 <div className="text-center mb-6 border border-black py-3 bg-slate-50 print:bg-transparent">
                     <h2 className="text-xl font-bold uppercase">{docConfig.titleTH || getISODetails(docData.type).th}</h2>
                     <h3 className="text-sm font-bold text-slate-500 uppercase">{docConfig.titleEN || getISODetails(docData.type).en}</h3>
                 </div>

                 {/* Info Block */}
                 <div className="flex border border-black mb-6">
                     <div className="w-1/2 p-4 border-r border-black space-y-2 text-sm">
                         <h4 className="font-bold border-b border-black pb-1 mb-2">ผู้ส่ง / ผู้ขออนุมัติ (Sender / Requestor)</h4>
                         <p><span className="font-bold w-20 inline-block">หน่วยงาน:</span> แผนกคืนสินค้า (Return Department)</p>
                         <p><span className="font-bold w-20 inline-block">วันที่บันทึก:</span> {docData.items[0]?.date}</p>
                     </div>
                     <div className="w-1/2 p-4 space-y-2 text-sm">
                         <h4 className="font-bold border-b border-black pb-1 mb-2">ผู้รับ / ปลายทาง (Receiver / Destination)</h4>
                         {docData.type === 'RTV' && (
                             <p><span className="font-bold w-20 inline-block">ปลายทาง:</span> {docData.items[0]?.dispositionRoute}</p>
                         )}
                         {docData.type === 'Restock' && (
                             <>
                                 <p><span className="font-bold w-20 inline-block">ชื่อผู้ซื้อ:</span> {docData.items[0]?.sellerName}</p>
                                 <p><span className="font-bold w-20 inline-block">เบอร์โทร:</span> {docData.items[0]?.contactPhone}</p>
                             </>
                         )}
                         {docData.type === 'Claim' && (
                             <>
                                 <p><span className="font-bold w-20 inline-block">บริษัทประกัน:</span> {docData.items[0]?.claimCompany}</p>
                                 <p><span className="font-bold w-20 inline-block">ผู้ติดต่อ:</span> {docData.items[0]?.claimCoordinator}</p>
                                 <p><span className="font-bold w-20 inline-block">เบอร์โทร:</span> {docData.items[0]?.claimPhone}</p>
                             </>
                         )}
                         {docData.type === 'InternalUse' && (
                             <p><span className="font-bold w-20 inline-block">หน่วยงาน:</span> {docData.items[0]?.internalUseDetail}</p>
                         )}
                     </div>
                 </div>

                 {/* Table */}
                 <table className="w-full border-collapse border border-black mb-6 text-sm">
                     <thead className="bg-slate-100 print:bg-transparent text-center font-bold">
                         <tr>
                             <th className="border border-black py-2 w-12">No.</th>
                             <th className="border border-black py-2">รหัสสินค้า (Code)</th>
                             <th className="border border-black py-2">รายการ (Description)</th>
                             <th className="border border-black py-2 w-20">จำนวน</th>
                             <th className="border border-black py-2 w-16">หน่วย</th>
                             <th className="border border-black py-2 w-24">ราคา/หน่วย</th>
                             <th className="border border-black py-2 w-24">จำนวนเงิน</th>
                         </tr>
                     </thead>
                     <tbody>
                         {docData.items.map((item, index) => (
                             <tr key={index}>
                                 <td className="border border-black py-2 text-center">{index + 1}</td>
                                 <td className="border border-black py-2 px-2 font-mono">{item.productCode}</td>
                                 <td className="border border-black py-2 px-2">
                                     <div className="font-bold">{item.productName}</div>
                                     <div className="text-xs text-slate-500">
                                         สาขา: {item.branch} | Ref: {item.refNo} {item.customerName ? `| ลูกค้า: ${item.customerName}` : ''}
                                     </div>
                                 </td>
                                 <td className="border border-black py-2 text-center">{item.quantity}</td>
                                 <td className="border border-black py-2 text-center">{item.unit}</td>
                                 <td className="border border-black py-2 text-right px-2">{(item.priceBill || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                 <td className="border border-black py-2 text-right px-2">{((item.priceBill || 0) * item.quantity).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                             </tr>
                         ))}
                         {/* Fill empty rows to maintain A4 look */}
                         {Array.from({ length: Math.max(0, 10 - docData.items.length) }).map((_, i) => (
                             <tr key={`empty-${i}`}>
                                 <td className="border border-black py-2">&nbsp;</td>
                                 <td className="border border-black py-2">&nbsp;</td>
                                 <td className="border border-black py-2">&nbsp;</td>
                                 <td className="border border-black py-2">&nbsp;</td>
                                 <td className="border border-black py-2">&nbsp;</td>
                                 <td className="border border-black py-2">&nbsp;</td>
                                 <td className="border border-black py-2">&nbsp;</td>
                             </tr>
                         ))}
                     </tbody>
                     <tfoot>
                         <tr>
                             <td colSpan={4} rowSpan={3} className="border border-black p-2 align-top text-xs">
                                 <span className="font-bold underline mb-1 block">หมายเหตุ (Remarks):</span>
                                 {isDocEditable ? (
                                     <textarea className="w-full h-full resize-none border-none outline-none bg-transparent" value={docConfig.remarks} onChange={(e) => setDocConfig({...docConfig, remarks: e.target.value})} />
                                 ) : (
                                     <p className="whitespace-pre-wrap">{docConfig.remarks}</p>
                                 )}
                                 <div className="mt-4 text-center font-bold">
                                     ( {ThaiBahtText(calculateTotal(docData.items, includeVat).net)} )
                                 </div>
                             </td>
                             <td colSpan={2} className="border border-black p-1 text-right font-bold bg-slate-50 print:bg-transparent">รวมเป็นเงิน</td>
                             <td className="border border-black p-1 text-right">{calculateTotal(docData.items, includeVat).subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                         </tr>
                         <tr>
                             <td colSpan={2} className="border border-black p-1 text-right font-bold bg-slate-50 print:bg-transparent">ภาษีมูลค่าเพิ่ม (7%)</td>
                             <td className="border border-black p-1 text-right">{calculateTotal(docData.items, includeVat).vat.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                         </tr>
                         <tr>
                             <td colSpan={2} className="border border-black p-1 text-right font-bold bg-slate-50 print:bg-transparent text-base">ยอดเงินสุทธิ</td>
                             <td className="border border-black p-1 text-right font-bold text-base">{calculateTotal(docData.items, includeVat).net.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                         </tr>
                     </tfoot>
                 </table>

                 {/* Signatures */}
                 <div className="mt-auto grid grid-cols-3 gap-4 text-center">
                     <div className="border border-black p-4 pt-12 relative">
                         <div className="border-b border-black w-3/4 mx-auto mb-2"></div>
                         {isDocEditable ? <input className="text-center w-full text-xs font-bold" value={docConfig.signatory1} onChange={e => setDocConfig({...docConfig, signatory1: e.target.value})} /> : <p className="text-xs font-bold">{docConfig.signatory1}</p>}
                         <p className="text-xs mt-4">วันที่ ......../......../............</p>
                     </div>
                     <div className="border border-black p-4 pt-12 relative">
                         <div className="border-b border-black w-3/4 mx-auto mb-2"></div>
                         {isDocEditable ? <input className="text-center w-full text-xs font-bold" value={docConfig.signatory2} onChange={e => setDocConfig({...docConfig, signatory2: e.target.value})} /> : <p className="text-xs font-bold">{docConfig.signatory2}</p>}
                         <p className="text-xs mt-4">วันที่ ......../......../............</p>
                     </div>
                     <div className="border border-black p-4 pt-12 relative">
                         <div className="border-b border-black w-3/4 mx-auto mb-2"></div>
                         {isDocEditable ? <input className="text-center w-full text-xs font-bold" value={docConfig.signatory3} onChange={e => setDocConfig({...docConfig, signatory3: e.target.value})} /> : <p className="text-xs font-bold">{docConfig.signatory3}</p>}
                         <p className="text-xs mt-4">วันที่ ......../......../............</p>
                     </div>
                 </div>

                 {/* Footer Dist */}
                 <div className="mt-4 text-[10px] text-slate-500 flex justify-between">
                     <span>Distribution: Original (Customer), Copy 1 (Accounting), Copy 2 (Warehouse)</span>
                     <span>System Generated by ReturnNeosiam Pro</span>
                 </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for icon colors
import { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

export default Operations;