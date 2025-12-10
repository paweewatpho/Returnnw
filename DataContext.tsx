
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from './firebase';
import { ref, onValue, set, update, remove, runTransaction } from 'firebase/database';
import { ReturnRecord } from './types';

// Interface for NCR Item (the product list inside an NCR)
export interface NCRItem {
  id: string;
  branch: string;
  refNo: string;
  neoRefNo: string;
  productCode: string;
  productName: string;
  customerName: string;
  destinationCustomer: string;
  quantity: number;
  unit: string;
  priceBill: number;
  expiryDate: string;
  hasCost: boolean;
  costAmount?: number;
  costResponsible: string;
  problemSource: string;
}

// EXPANDED Interface for the main NCR Record
// This now includes all fields from the NCRSystem form state
export interface NCRRecord {
  id: string; // Composite key: ncrNo-itemId
  ncrNo: string;

  // Header fields
  toDept: string;
  date: string;
  copyTo: string;
  founder: string;
  poNo: string;

  // Item details (denormalized for reporting)
  item: NCRItem;

  // Problem details
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

  // Action details
  actionReject: boolean;
  actionRejectQty: number;
  actionRejectSort: boolean;
  actionRejectSortQty: number;
  actionRework: boolean;
  actionReworkQty: number;
  actionReworkMethod: string;
  actionSpecialAcceptance: boolean;
  actionSpecialAcceptanceQty: number;
  actionSpecialAcceptanceReason: string;
  actionScrap: boolean;
  actionScrapQty: number;
  actionReplace: boolean;
  actionReplaceQty: number;
  dueDate: string;
  approver: string;
  approverPosition: string;
  approverDate: string;

  // Cause & Prevention
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

  status: 'Open' | 'Closed' | 'Canceled'; // Add 'Canceled' for soft delete
}


interface DataContextType {
  items: ReturnRecord[];
  ncrReports: NCRRecord[];
  loading: boolean;
  addReturnRecord: (item: ReturnRecord) => Promise<boolean>;
  updateReturnRecord: (id: string, data: Partial<ReturnRecord>) => Promise<boolean>;
  deleteReturnRecord: (id: string) => Promise<boolean>;
  addNCRReport: (item: NCRRecord) => Promise<boolean>;
  updateNCRReport: (id: string, data: Partial<NCRRecord>) => Promise<boolean>;
  deleteNCRReport: (id: string) => Promise<boolean>; // This will now be a "cancel" operation
  getNextNCRNumber: () => Promise<string>;
  getNextReturnNumber: () => Promise<string>;
}

const DataContext = createContext<DataContextType>({
  items: [],
  ncrReports: [],
  loading: true,
  addReturnRecord: async () => false,
  updateReturnRecord: async () => false,
  deleteReturnRecord: async () => false,
  addNCRReport: async () => false,
  updateNCRReport: async () => false,
  deleteNCRReport: async () => false,
  getNextNCRNumber: async () => 'NCR-ERROR-0000',
  getNextReturnNumber: async () => 'RT-ERROR-0000',
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ReturnRecord[]>([]);
  const [ncrReports, setNcrReports] = useState<NCRRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔄 Connecting to Realtime Database...");

    // Subscribe to Return Records
    const returnRef = ref(db, 'return_records');
    const unsubReturn = onValue(returnRef, (snapshot) => {
      const data = snapshot.val();
      // FIX: Add robust filtering to prevent crashes from malformed data
      const loadedItems = data
        ? (Object.values(data) as any[])
          .map((item: any) => ({
            ...item,
            // Fix for Missing Date: Fallback to today if missing
            date: item.date || new Date().toISOString().split('T')[0],
            // Fix for Missing Product Name: Default value
            productName: item.productName || "ไม่พบข้อมูลสินค้า"
          }))
          .filter((item): item is ReturnRecord => {
            // 1. Basic Object Check
            if (!item || typeof item !== 'object') return false;

            // 2. Strict Type Checking for crucial fields required by Operations UI
            // removed 'productName' from strict check as we defaulted it above
            const requiredStrings = ['id', 'date', 'status', 'branch', 'customerName', 'productCode'];
            for (const field of requiredStrings) {
              if (typeof (item as any)[field] !== 'string') {
                console.warn(`🛡️ Data Hardening: Filtering out invalid ReturnRecord (missing/bad ${field})`, item);
                return false;
              }
            }

            // 3. Numeric Fields Check & Auto-fix
            if (typeof item.quantity !== 'number') {
              // Attempt to parse string to number
              if (typeof item.quantity === 'string' && !isNaN(parseFloat(item.quantity))) {
                (item as any).quantity = parseFloat(item.quantity);
              } else {
                console.warn(`🛡️ Data Hardening: Filtering out invalid ReturnRecord (bad quantity)`, item);
                return false;
              }
            }

            return true; // All checks passed
          })
        : [];

      setItems(loadedItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
      console.log(`✅ RTDB Connected: Loaded ${loadedItems.length} valid Return Records`);
    }, (error) => {
      console.warn("⚠️ RTDB Permission/Connection Error (Returns).", error.message);
      setItems([]);
      setLoading(false);
    });

    // Subscribe to NCR Reports
    const ncrRef = ref(db, 'ncr_reports');
    const unsubNCR = onValue(ncrRef, (snapshot) => {
      const data = snapshot.val();
      // FIX: Add robust filtering for NCR reports as well
      const loadedReports = data
        ? (Object.values(data) as any[])
          .filter((report): report is NCRRecord => {
            if (!report || typeof report !== 'object') return false;

            // Header checks
            if (typeof report.id !== 'string' || typeof report.date !== 'string' || typeof report.status !== 'string') {
              console.warn("🛡️ Data Hardening: Filtering out invalid NCR (missing header fields).", report);
              return false;
            }

            // Item checks (handle both nested and potential flat structures for backward compat)
            const itemData = report.item || report;
            if (!itemData || typeof itemData !== 'object') {
              console.warn("🛡️ Data Hardening: Invalid NCR Item structure.", report);
              return false;
            }

            // Relaxed check: Log warning but allow if product name is missing/invalid type
            if (typeof itemData.productName !== 'string') {
              console.warn("⚠️ Data Warning: NCR report missing valid productName.", report);
              // Do not return false; attempt to display it anyway
            }

            return true;
          })
        : [];

      setNcrReports(loadedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      console.log(`✅ RTDB Connected: Loaded ${loadedReports.length} valid NCR Reports`);
    }, (error) => {
      console.warn("⚠️ RTDB Permission/Connection Error (NCR).", error.message);
      setNcrReports([]);
    });

    return () => {
      unsubReturn();
      unsubNCR();
    };
  }, []);

  const addReturnRecord = async (item: ReturnRecord): Promise<boolean> => {
    try {
      await set(ref(db, 'return_records/' + item.id), item);
      return true;
    } catch (error: any) {
      if (error.code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Write Permission Denied: Cannot save return record.");
        alert("Access Denied: Check Firebase Realtime Database Rules. Developer tip: Set rules to 'allow read, write: if true;' for testing.");
      } else {
        console.error("Error adding return record:", error);
        alert("Failed to save record.");
      }
      return false;
    }
  };

  const updateReturnRecord = async (id: string, data: Partial<ReturnRecord>): Promise<boolean> => {
    try {
      await update(ref(db, 'return_records/' + id), data);
      return true;
    } catch (error: any) {
      if (error.code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Update Permission Denied.");
        alert("Access Denied: Cannot update record.");
      } else {
        console.error("Error updating return record:", error);
        alert("Failed to update record.");
      }
      return false;
    }
  };

  const deleteReturnRecord = async (id: string): Promise<boolean> => {
    try {
      await remove(ref(db, 'return_records/' + id));
      return true;
    } catch (error: any) {
      if (error.code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Delete Permission Denied.");
        alert("Access Denied: Cannot delete this return record.");
      } else {
        console.error("Error deleting return record:", error);
        alert("Failed to delete this return record.");
      }
      return false;
    }
  };

  const addNCRReport = async (item: NCRRecord): Promise<boolean> => {
    try {
      await set(ref(db, 'ncr_reports/' + item.id), item);
      return true;
    } catch (error: any) {
      if (error.code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Write Permission Denied: Cannot save NCR report.");
        alert("Access Denied: Check Firebase Realtime Database Rules. Developer tip: Set rules to 'allow read, write: if true;' for testing.");
      } else {
        console.error("Error adding NCR report:", error);
        alert("Failed to save NCR report.");
      }
      return false;
    }
  };

  const updateNCRReport = async (id: string, data: Partial<NCRRecord>): Promise<boolean> => {
    try {
      await update(ref(db, 'ncr_reports/' + id), data);
      return true;
    } catch (error: any) {
      if (error.code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Update Permission Denied.");
        alert("Access Denied: Cannot update NCR report.");
      } else {
        console.error("Error updating NCR report:", error);
        alert("Failed to update NCR report.");
      }
      return false;
    }
  };

  const deleteNCRReport = async (id: string): Promise<boolean> => {
    try {
      // This is now a "soft delete" or "cancel" operation.
      await update(ref(db, 'ncr_reports/' + id), { status: 'Canceled' });
      return true;
    } catch (error: any) {
      if (error.code === 'PERMISSION_DENIED') {
        console.warn("⚠️ Cancel Permission Denied.");
        alert("Access Denied: Cannot cancel NCR report.");
      } else {
        console.error("Error canceling NCR report:", error);
        alert("Failed to cancel NCR report.");
      }
      return false;
    }
  };

  const getNextNCRNumber = async (): Promise<string> => {
    const counterRef = ref(db, 'counters/ncr_counter');
    const currentYear = new Date().getFullYear();

    try {
      const { committed, snapshot } = await runTransaction(counterRef, (currentData) => {
        if (currentData === null) {
          return { year: currentYear, lastNumber: 1 };
        }
        if (currentData.year === currentYear) {
          currentData.lastNumber++;
        } else {
          currentData.year = currentYear;
          currentData.lastNumber = 1;
        }
        return currentData;
      });

      if (committed) {
        const data = snapshot.val();
        const paddedNumber = String(data.lastNumber).padStart(4, '0');
        return `NCR-${data.year}-${paddedNumber}`;
      } else {
        throw new Error("Failed to get next NCR number, transaction aborted.");
      }
    } catch (error) {
      console.error("Error getting next NCR number:", error);
      return `NCR-${currentYear}-ERR${Math.floor(Math.random() * 100)}`;
    }
  };

  const getNextReturnNumber = async (): Promise<string> => {
    const counterRef = ref(db, 'counters/return_counter');
    const currentYear = new Date().getFullYear();

    try {
      const { committed, snapshot } = await runTransaction(counterRef, (currentData) => {
        if (currentData === null) {
          return { year: currentYear, lastNumber: 1 };
        }
        if (currentData.year === currentYear) {
          currentData.lastNumber++;
        } else {
          currentData.year = currentYear;
          currentData.lastNumber = 1;
        }
        return currentData;
      });

      if (committed) {
        const data = snapshot.val();
        const paddedNumber = String(data.lastNumber).padStart(4, '0'); // 4 digits to match user request (0001)
        return `RT-${data.year}-${paddedNumber}`;
      } else {
        throw new Error("Failed to get next Return number, transaction aborted.");
      }
    } catch (error) {
      console.error("Error getting next Return number:", error);
      return `RT-${currentYear}-ERR${Math.floor(Math.random() * 100)}`;
    }
  };

  return (
    <DataContext.Provider value={{ items, ncrReports, loading, addReturnRecord, updateReturnRecord, deleteReturnRecord, addNCRReport, updateNCRReport, deleteNCRReport, getNextNCRNumber, getNextReturnNumber }}>
      {children}
    </DataContext.Provider>
  );
};
