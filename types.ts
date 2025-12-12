
export interface ProcessStep {
  id: number;
  title: string;
  description: string;
  role: string;
  duties: string;
  branches?: string[]; // For step 2 (regions) and step 6 (routes)
  isBranchParent?: boolean;
}

export interface ReturnStat {
  name: string;
  value: number;
  color: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  OPERATIONS = 'OPERATIONS',
  NCR = 'NCR',
  NCR_REPORT = 'NCR_REPORT',
  INVENTORY = 'INVENTORY',
  COLLECTION = 'COLLECTION'
}

export type CollectionStatus = 'PENDING' | 'ASSIGNED' | 'COLLECTED' | 'CONSOLIDATED' | 'FAILED';

// --- REFRACTORED PER USER REQUEST (STEP 271) ---

// 1. Commercial Document (RMA)
export interface ReturnRequest {
  id: string; // e.g., "RMA-001" - matches documentNo (R No.) ideally

  // User Requested Fields
  branch: string; // Dropdown
  invoiceNo: string;
  controlDate: string; // วันที่ใบคุมรถ
  documentNo: string; // เลขที่เอกสาร (เลข R)
  customerName: string;
  customerCode: string; // รหัสลูกค้า
  customerAddress: string;
  province: string;
  tmNo: string; // เลขที่ใบคุม (TM NO)
  notes?: string; // หมายเหตุ

  // Essential Logistics Info (retained/adapted)
  contactPerson: string;
  contactPhone: string;
  itemsSummary: string; // e.g., "Mouse x10, Keyboard x5" - kept as it's useful context

  status: 'APPROVED_FOR_PICKUP' | 'PICKUP_SCHEDULED' | 'RECEIVED_AT_HQ';
}

// 2. Logistics Document (Collection Order)
export interface CollectionOrder {
  id: string; // e.g., "COL-202512-001"
  driverId: string;

  // Linkage: Reference to RMAs
  linkedRmaIds: string[];

  // Driver Attributes
  pickupLocation: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    contactName: string;
    contactPhone: string;
  };
  pickupDate: string;

  // Logistics Manifest
  packageSummary: {
    totalBoxes: number;
    description: string;
  };

  status: CollectionStatus;
  vehiclePlate?: string;
  failureReason?: string;

  // Proof
  proofOfCollection?: {
    signatureUrl?: string;
    photoUrls?: string[];
    timestamp?: string;
  };

  createdDate: string;
}

// 3. Consolidation Document
export interface ShipmentManifest {
  id: string; // "SHP-2025-99"
  collectionOrderIds: string[];
  transportMethod: 'INTERNAL_FLEET' | '3PL_COURIER';
  carrierName: string;
  trackingNumber: string;
  status: 'IN_TRANSIT' | 'ARRIVED_HQ';
  createdDate: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Updated Status Flow for 6-Step Workflow
export type ReturnStatus =
  | 'Draft'             // Step 1: Created
  | 'Requested'         // Step 1: Output

  // NCR Flow (New Unified)
  | 'NCR_InTransit'      // NCR Step 2 Output (was PickupScheduled)
  | 'NCR_HubReceived'    // NCR Step 3 Output (was ReceivedAtHub)
  | 'NCR_QCCompleted'    // NCR Step 4 Output (was QCCompleted)
  | 'NCR_Documented'     // NCR Step 5 Output (was Documented)

  // Collection Flow (New Unified)
  | 'COL_JobAccepted'    // Col Step 2 Output (was JobAccepted)
  | 'COL_BranchReceived' // Col Step 3 Output (was BranchReceived)
  | 'COL_Consolidated'   // Col Step 4 Output (was ReadyForLogistics)
  | 'COL_InTransit'      // Col Step 5 Output (was InTransitToHub)
  | 'COL_HubReceived'    // Col Step 6 Output (was HubReceived)
  | 'COL_Documented'     // Col Step 7 Output (was DocsCompleted)

  // Common Final States
  | 'Completed'         // Step 8: Closed
  | 'ReturnToSupplier'
  | 'DirectReturn'

  // Legacy / Mapped
  | 'JobAccepted'
  | 'BranchReceived'
  | 'ReadyForLogistics'
  | 'InTransitToHub'
  | 'HubReceived'
  | 'DocsCompleted'
  | 'PickupScheduled'
  | 'PickedUp'
  | 'InTransitHub'
  | 'ReceivedAtHub'
  | 'QCPassed'
  | 'QCFailed'
  | 'QCCompleted'
  | 'Documented'
  | 'Received'
  | 'Graded'
  | 'Approved'
  | 'Rejected'
  | 'Pending';


// Operational Types
// Expanded to include specific imperfections under 'Good' category
export type ItemCondition =
  | 'New'
  | 'OpenBox'
  | 'Damaged'
  | 'Defective'
  | 'Expired'     // หมดอายุ
  | 'Unknown'
  | 'BoxDamage'   // มีตำหนิ/บุบ
  | 'WetBox'      // ลังเปียก
  | 'LabelDefect' // ฉลากลอก
  | string;       // Custom/Other

export type DispositionAction = 'Restock' | 'RTV' | 'InternalUse' | 'Recycle' | 'Claim' | 'Pending';
export type BranchName = 'พิษณุโลก' | 'กำแพงเพชร' | 'แม่สอด' | 'เชียงใหม่' | 'EKP ลำปาง' | 'นครสวรรค์' | 'สาย 3' | 'คลอง 13' | 'ซีโน่' | 'ประดู่';

export interface ReturnRecord {
  id: string; // Used as Return ID or Barcode
  refNo: string; // เลขที่อ้างอิง
  branch: BranchName | string; // สาขาต้นทาง
  customerName: string; // Or Dealer Name
  productCode: string; // รหัสสินค้า
  productName: string; // รายการสินค้า
  category: string;
  date: string; // ISO Date string YYYY-MM-DD (General/Initial Date)
  amount: number; // Qty * Price (Total Value)
  images?: string[]; // Array of image URLs or Base64 strings
  parentId?: string; // ID of the parent item if this was split

  // New: Preliminary Decision (Step 1)
  preliminaryDecision?: 'Return' | 'Sell' | 'Scrap' | 'Internal' | 'Claim' | null;
  preliminaryRoute?: string; // e.g., "สาย 3", "Sino", "NEO", "อื่นๆ"

  // NEW: Fields for detailed tracking
  neoRefNo?: string; // เลขที่เอกสาร Neo Siam
  founder?: string; // ผู้พบปัญหา (New validation)
  destinationCustomer?: string; // สถานที่ส่ง (ลูกค้าปลายทาง)

  // NCR Specific Header Fields
  toDept?: string; // ถึงหน่วยงาน
  copyTo?: string; // สำเนา
  poNo?: string;   // เลขที่ใบสั่งซื้อ/ผลิต
  ncrNumber?: string; // เลขที่ NCR
  documentType?: 'NCR' | 'LOGISTICS'; // แยกประเภทเอกสาร


  // Cost Tracking
  hasCost?: boolean;
  costAmount?: number;
  costResponsible?: string;
  problemSource?: string; // Source of problem for automated responsibility mapping

  // Problem Analysis
  problemAnalysis?: 'Customer' | 'DestinationCustomer' | 'Accounting' | 'Keying' | 'Warehouse' | 'Transport' | 'Other';
  problemAnalysisSub?: string;
  problemAnalysisCause?: string;
  problemAnalysisDetail?: string;

  // Status Timestamps (Timeline)
  dateRequested?: string;   // 1. แจ้งคืนสินค้า (Request)
  dateInTransit?: string;   // 2. ขนส่ง (Logistics)
  dateReceived?: string;    // 3. รับสินค้าเข้า (Receive)
  dateGraded?: string;      // 4. ตรวจสอบคุณภาพ (QC)
  dateDocumented?: string;  // 5. ออกเอกสาร (Warehouse/Docs)
  dateCompleted?: string;   // 6. ปิดงาน (Done)

  // New Intake Fields (NCR Specific)
  quantity: number; // จำนวน
  unit: string; // หน่วย
  pricePerUnit?: number; // ราคา/หน่วย
  priceBill?: number; // ราคาหน้าบิลรวม
  priceSell?: number; // ราคาขาย
  expiryDate?: string; // วันหมดอายุ (mm/dd/yyyy)

  status: ReturnStatus;
  reason: string;
  condition?: ItemCondition;
  disposition?: DispositionAction;
  notes?: string;

  // Problem Analysis (Source)
  // problemSource is already defined above as string


  // Problem Process (Checkboxes)
  problemDamaged?: boolean; // ชำรุด
  problemDamagedInBox?: boolean; // ชำรุดในกล่อง
  problemLost?: boolean; // สูญหาย
  problemMixed?: boolean; // สินค้าสลับ
  problemWrongInv?: boolean; // สินค้าไม่ตรง INV
  problemLate?: boolean; // ส่งช้า
  problemDuplicate?: boolean; // ส่งซ้ำ
  problemWrong?: boolean; // ส่งผิด
  problemIncomplete?: boolean; // ส่งของไม่ครบ
  problemOver?: boolean; // ส่งของเกิน
  problemWrongInfo?: boolean; // ข้อมูลผิด
  problemShortExpiry?: boolean; // สินค้าอายุสั้น
  problemTransportDamage?: boolean; // สินค้าเสียหายบนรถขนส่ง
  problemAccident?: boolean; // อุบัติเหตุ
  problemPOExpired?: boolean; // PO. หมดอายุ
  problemNoBarcode?: boolean; // บาร์โค๊ตไม่ขึ้น
  problemNotOrdered?: boolean; // ไม่ได้สั่งสินค้า
  problemOther?: boolean; // อื่นๆ
  problemOtherText?: string;

  problemDetail?: string; // รายละเอียดเพิ่มเติม

  // Actions
  actionReject?: boolean;         // ส่งคืน (Reject)
  actionRejectQty?: number;
  actionRejectSort?: boolean;     // คัดแยกของเสียเพื่อส่งคืน
  actionRejectSortQty?: number;

  actionRework?: boolean;         // แก้ไข (Rework)
  actionReworkQty?: number;
  actionReworkMethod?: string;    // วิธีการแก้ไข

  actionSpecialAcceptance?: boolean;      // ยอมรับกรณีพิเศษ
  actionSpecialAcceptanceQty?: number;
  actionSpecialAcceptanceReason?: string; // เหตุผลในการยอมรับ

  actionScrap?: boolean;          // ทำลาย (Scrap)
  actionScrapQty?: number;
  actionScrapReplace?: boolean;   // เปลี่ยนสินค้าใหม่
  actionScrapReplaceQty?: number;

  // Root Cause
  causePackaging?: boolean;
  causeTransport?: boolean;
  causeOperation?: boolean;
  causeEnv?: boolean;
  causeDetail?: string;
  preventionDetail?: string;

  // Logistics
  collectionOrderId?: string; // Links to CollectionOrder

  // User requested fields for Step 1 Form
  invoiceNo?: string;       // เลข Invoice
  tmNo?: string;            // เลขที่ใบคุม (TM NO)
  controlDate?: string;     // วันที่ใบคุมรถ
  customerCode?: string;    // รหัสลูกค้า
  province?: string;        // จังหวัด
  customerAddress?: string; // ที่อยู่
  documentNo?: string;      // เลขที่เอกสาร (เลข R)
  contactPhone?: string;    // เบอร์โทรศัพท์ (ติดต่อ)
  sellerName?: string;      // ชื่อผู้ขาย (ร้านค้า/ตัวแทน)

  // Transport Info (Step 2 NCR)
  transportPlate?: string;
  transportDriver?: string;
  transportCompany?: string;

  // Re-applying to ensure update
  rootCause?: string;
  dispositionRoute?: string;
}

export interface SearchFilters {
  startDate: string;
  endDate: string;
  status: ReturnStatus | 'All';
  category: string;
  query: string;
}