
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
  | 'JobAccepted'       // Step 2: Output
  | 'BranchReceived'    // Step 3: Output
  | 'ReadyForLogistics' // Step 4: Output
  | 'InTransitToHub'    // Step 5: Output
  | 'HubReceived'       // Step 6: Output
  | 'DocsCompleted'     // Step 7: Output
  | 'Completed'         // Step 8: Closed
  | 'PickupScheduled'   // Legacy
  | 'PickedUp'          // Legacy
  | 'InTransitHub'      // Legacy
  | 'ReturnToSupplier'  // Legacy
  | 'ReceivedAtHub'     // Legacy
  | 'QCPassed'          // Legacy
  | 'QCFailed'          // Legacy
  | 'QCCompleted'       // Legacy
  | 'Documented'        // Legacy
  | 'Received'          // Legacy
  | 'Graded'            // Legacy
  | 'Approved'          // Legacy
  | 'Rejected'          // Legacy
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

  // New Intake Fields
  quantity: number; // จำนวน
  unit: string; // หน่วย
  pricePerUnit?: number; // ราคาต่อหน่วย
  priceBill: number; // ราคาหน้าบิล
  priceSell: number; // ราคาขาย
  expiryDate?: string; // วันหมดอายุ

  status: ReturnStatus;
  reason: string;
  // Extended fields for Operations
  condition?: ItemCondition;
  disposition?: DispositionAction;
  notes?: string; // หมายเหตุ

  // Problem Details (Intake)
  // problemType: string; // DEPRECATED in favor of booleans below, but kept for legacy? (Maybe keep as summary)
  problemDetail?: string; // รายละเอียด (สำหรับพิมพ์ข้อความ)

  // Problem Boolean Flags
  problemDamaged?: boolean;
  problemDamagedInBox?: boolean;
  problemLost?: boolean;
  problemMixed?: boolean;
  problemWrongInv?: boolean;
  problemLate?: boolean;
  problemDuplicate?: boolean;
  problemWrong?: boolean;
  problemIncomplete?: boolean;
  problemOver?: boolean;
  problemWrongInfo?: boolean;
  problemShortExpiry?: boolean;
  problemTransportDamage?: boolean;
  problemAccident?: boolean;
  problemPOExpired?: boolean;
  problemNoBarcode?: boolean;
  problemNotOrdered?: boolean;
  problemOther?: boolean;
  problemOtherText?: string;

  rootCause?: string;   // สาเหตุเกิดจาก (legacy/summary)
  ncrNumber?: string;   // เลขที่ NCR

  invoiceNo?: string;
  tmNo?: string;

  // Initial Actions (Intake) - การดำเนินการ
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

  // Root Cause & Prevention Details
  causePackaging?: boolean;
  causeTransport?: boolean;
  causeOperation?: boolean;
  causeEnv?: boolean;
  causeDetail?: string;
  preventionDetail?: string;

  // Disposition Details
  dispositionRoute?: string; // For RTV: สาย 3, Sino, Neo
  sellerName?: string;       // For Sell/Restock
  contactPhone?: string;     // For Sell/Restock
  internalUseDetail?: string; // For InternalUse: Department/Person

  // Claim Details
  claimCompany?: string;      // ชื่อบริษัทประกัน
  claimCoordinator?: string;  // ผู้ประสานงาน
  claimPhone?: string;        // เบอร์โทรศัพท์ (เคลม)

  // Logistics
  collectionOrderId?: string; // Links to CollectionOrder
}

export interface SearchFilters {
  startDate: string;
  endDate: string;
  status: ReturnStatus | 'All';
  category: string;
  query: string;
}