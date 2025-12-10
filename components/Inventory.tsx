
import React, { useState, useMemo } from 'react';
import { useData } from '../DataContext';
import { DispositionAction, ReturnRecord } from '../types';
import { Box, RotateCcw, ShieldCheck, Home, Trash2, CircleArrowUp, CircleArrowDown, History, Search, Download, Truck } from 'lucide-react';

interface StockAggregate {
  stats: {
    totalIn: number;
    totalOut: number;
    onHand: number;
  };
}

interface LedgerEntry extends ReturnRecord {
  movementType: 'IN' | 'OUT';
  movementDate?: string;
}

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Ledger' | DispositionAction>('Ledger');
  const { items, loading } = useData();

  const [filters, setFilters] = useState({
    query: '',
    startDate: '',
    endDate: '',
    movementType: 'All',
  });

  const inventoryData = useMemo(() => {
    const fullLedger: LedgerEntry[] = [];

    items.forEach(item => {
      // Determine effective IN Date
      // Priority: 1. Grading Date (Standard Flow)
      // 2. If no grading date but has disposition (Direct/Skip), use Receipt Date
      // 3. Fallback to Documented Date if checked out but no IN date found (Safety)
      let effectiveInDate = item.dateGraded;
      if (!effectiveInDate && item.disposition) {
        effectiveInDate = item.date;
      }
      if (!effectiveInDate && (item.dateDocumented || item.dateCompleted)) {
        effectiveInDate = item.dateDocumented || item.dateCompleted;
      }

      // Add IN Entry
      if (effectiveInDate) {
        fullLedger.push({
          ...item,
          movementType: 'IN',
          movementDate: effectiveInDate,
        });

        // Add OUT Entry (Only if IN exists to prevent negative balance)
        if (item.dateDocumented || item.dateCompleted) {
          fullLedger.push({
            ...item,
            movementType: 'OUT',
            movementDate: item.dateDocumented || item.dateCompleted,
          });
        }
      }
    });

    // Multi-level sort: 1. By date (desc), 2. By type ('IN' before 'OUT')
    fullLedger.sort((a, b) => {
      const dateA = a.movementDate || '0';
      const dateB = b.movementDate || '0';

      // Primary sort: Date descending
      const dateComparison = dateB.localeCompare(dateA);
      if (dateComparison !== 0) {
        return dateComparison;
      }

      // Secondary sort: If dates are the same, 'IN' comes before 'OUT'
      if (a.movementType === 'IN' && b.movementType === 'OUT') {
        return -1; // a (IN) comes first
      }
      if (a.movementType === 'OUT' && b.movementType === 'IN') {
        return 1; // b (IN) comes first
      }

      return 0; // Same date and type
    });

    const calculateStats = (disposition: DispositionAction): StockAggregate['stats'] => {
      const relevantEntries = fullLedger.filter(entry => entry.disposition === disposition);

      const totalIn = relevantEntries
        .filter(e => e.movementType === 'IN')
        .reduce((sum, e) => sum + e.quantity, 0);

      const totalOut = relevantEntries
        .filter(e => e.movementType === 'OUT')
        .reduce((sum, e) => sum + e.quantity, 0);

      return {
        totalIn,
        totalOut,
        onHand: totalIn - totalOut,
      };
    };

    return {
      fullLedger,
      sellableStock: { stats: calculateStats('Restock') },
      rtvStock: { stats: calculateStats('RTV') },
      claimStock: { stats: calculateStats('Claim') },
      internalStock: { stats: calculateStats('InternalUse') },
      scrapStock: { stats: calculateStats('Recycle') },
    };
  }, [items]);

  const filteredLedgerList = useMemo(() => {
    let baseList = activeTab === 'Ledger'
      ? inventoryData.fullLedger
      : inventoryData.fullLedger.filter(item => item.disposition === activeTab);

    return baseList.filter(item => {
      const queryLower = filters.query.toLowerCase();
      if (queryLower &&
        !item.productName?.toLowerCase().includes(queryLower) &&
        !item.productCode?.toLowerCase().includes(queryLower) &&
        !item.customerName?.toLowerCase().includes(queryLower) &&
        !String(item.branch)?.toLowerCase().includes(queryLower)
      ) {
        return false;
      }

      if (filters.startDate && (item.movementDate || '0') < filters.startDate) {
        return false;
      }

      if (filters.endDate && (item.movementDate || '0') > filters.endDate) {
        return false;
      }

      if (filters.movementType !== 'All' && item.movementType !== filters.movementType) {
        return false;
      }

      return true;
    });
  }, [activeTab, inventoryData.fullLedger, filters]);

  const handleExportExcel = () => {
    const headers = [
      "MovementDate", "MovementType", "Branch", "Customer",
      "ProductCode", "ProductName", "RefNo", "NeoRefNo",
      "Quantity", "Unit", "PriceBill", "ExpiryDate", "Disposition"
    ];

    const rows = filteredLedgerList.map(item => [
      item.movementDate || '',
      item.movementType,
      `"${String(item.branch).replace(/"/g, '""')}"`,
      `"${item.customerName.replace(/"/g, '""')}"`,
      item.productCode,
      `"${item.productName.replace(/"/g, '""')}"`,
      item.refNo,
      item.neoRefNo || '',
      item.quantity,
      item.unit,
      item.priceBill,
      item.expiryDate || '',
      item.disposition || ''
    ].join(','));

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: 'Ledger', label: '1. ประวัติทั้งหมด (Full Ledger)', icon: History, stats: null },
    { id: 'Restock', label: '2. สินค้าสำหรับขาย (Sellable)', icon: RotateCcw, stats: inventoryData.sellableStock.stats },
    { id: 'RTV', label: '3. สินค้าสำหรับคืน (RTV)', icon: Truck, stats: inventoryData.rtvStock.stats },
    { id: 'Claim', label: '4. สินค้าสำหรับเคลม (Claim)', icon: ShieldCheck, stats: inventoryData.claimStock.stats },
    { id: 'InternalUse', label: '5. สินค้าใช้ภายใน (Internal)', icon: Home, stats: inventoryData.internalStock.stats },
    { id: 'Recycle', label: '6. สินค้าสำหรับทำลาย (Scrap)', icon: Trash2, stats: inventoryData.scrapStock.stats },
  ];

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeTab]);

  const totalPages = Math.ceil(filteredLedgerList.length / itemsPerPage);
  const paginatedLedgerList = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLedgerList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLedgerList, currentPage, itemsPerPage]);

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="p-6 h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">คลังสินค้า (Inventory)</h2>
        <p className="text-slate-500 text-sm">ตรวจสอบยอดคงเหลือในสต็อกและประวัติการเคลื่อนไหวของสินค้าคืน</p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'Ledger' | DispositionAction)}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab !== 'Ledger' && currentTab?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          <StatCard title="รับเข้าทั้งหมด (Total In)" value={currentTab.stats.totalIn} color="text-blue-600" />
          <StatCard title="จ่ายออกแล้ว (Total Out)" value={currentTab.stats.totalOut} color="text-amber-600" />
          <StatCard title="คงเหลือในสต็อก (On-Hand)" value={currentTab.stats.onHand} color="text-green-600" isHighlight />
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหา สินค้า, ลูกค้า, สาขา..."
            value={filters.query}
            onChange={e => setFilters({ ...filters, query: e.target.value })}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <input
            type="date"
            value={filters.startDate}
            onChange={e => setFilters({ ...filters, startDate: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={e => setFilters({ ...filters, endDate: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filters.movementType}
            onChange={e => setFilters({ ...filters, movementType: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">IN/OUT ทั้งหมด</option>
            <option value="IN">เฉพาะรับเข้า (IN)</option>
            <option value="OUT">เฉพาะจ่ายออก (OUT)</option>
          </select>
        </div>
        <button
          onClick={handleExportExcel}
          className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm text-xs uppercase text-slate-500 font-bold">
              <tr className="whitespace-nowrap">
                <th className="px-4 py-3">วันที่/ประเภท</th>
                <th className="px-4 py-3">สาขา/ลูกค้า</th>
                <th className="px-4 py-3">สินค้า</th>
                <th className="px-4 py-3">NCR No.</th>
                <th className="px-4 py-3">อ้างอิง (Ref)</th>
                <th className="px-4 py-3 text-right">จำนวน/หน่วย</th>
                <th className="px-4 py-3 text-right">ราคา/บิล</th>
                <th className="px-4 py-3">วันหมดอายุ</th>
                <th className="px-4 py-3">ปลายทาง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400">Loading data...</td></tr>
              ) : paginatedLedgerList.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400 italic">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการกรอง</td></tr>
              ) : (
                paginatedLedgerList.map(item => (
                  <tr key={item.id + '-' + item.movementType + '-' + item.movementDate} className="text-sm">
                    <td className="px-4 py-3">
                      <div>{item.movementDate || '-'}</div>
                      {item.movementType === 'IN' ? (
                        <span className="inline-flex items-center gap-1 text-green-600 font-bold text-xs"><CircleArrowUp className="w-4 h-4" /> รับเข้า</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold text-xs"><CircleArrowDown className="w-4 h-4" /> จ่ายออก</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{item.customerName}</div>
                      <div className="text-xs text-slate-500">สาขา: {item.branch}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{item.productName}</div>
                      <div className="text-xs text-slate-500">{item.productCode}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-600">
                      {item.ncrNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>Ref: {item.refNo}</div>
                      <div className="text-slate-500">Neo: {item.neoRefNo || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-right font-mono">฿{(item.priceBill || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-red-600 font-medium">{item.expiryDate || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div>{item.disposition}</div>
                      {item.destinationCustomer && <div className="text-blue-600 truncate max-w-[150px]" title={item.destinationCustomer}>ปลายทาง: {item.destinationCustomer}</div>}
                    </td>
                  </tr>
                ))
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
            <span>รายการต่อหน้า (จากทั้งหมด {filteredLedgerList.length} รายการ)</span>
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
    </div>
  );
};

const StatCard = ({ title, value, color, isHighlight = false }: { title: string; value: number; color: string; isHighlight?: boolean }) => (
  <div className={`bg-white p-4 rounded-lg border shadow-sm ${isHighlight ? 'border-blue-200 bg-blue-50' : 'border-slate-200'}`}>
    <p className="text-xs font-bold text-slate-500 uppercase">{title}</p>
    <p className={`text-3xl font-bold ${color} ${isHighlight ? 'text-blue-600' : ''}`}>{value.toLocaleString()}</p>
  </div>
);

export default Inventory;
