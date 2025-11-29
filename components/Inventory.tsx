
import React, { useState, useMemo } from 'react';
import { useData } from '../DataContext';
import { DispositionAction, ReturnRecord } from '../types';
import { Box, RotateCcw, ShieldCheck, Home, Trash2, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';

interface StockAggregate {
  stats: {
    totalIn: number;
    totalOut: number;
    onHand: number;
  };
  list: StockItem[];
}

interface StockItem {
  productCode: string;
  productName: string;
  onHand: number;
  lastIntake?: string;
  lastDispatch?: string;
  totalValue: number;
  unit: string;
  // FIX: Add missing properties used in calculations
  totalIn: number;
  totalOut: number;
}

interface LedgerEntry extends ReturnRecord {
    movementType: 'IN' | 'OUT';
    movementDate?: string;
}

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Ledger' | DispositionAction>('Ledger');
  const { items, loading } = useData();

  const inventoryData = useMemo(() => {
    // Ledger for all movements, sorted by most recent first
    const fullLedger: LedgerEntry[] = items
      .filter(item => ['Graded', 'Documented', 'Completed'].includes(item.status))
      .map(item => ({
        ...item,
        movementType: item.status === 'Graded' ? 'IN' : 'OUT',
        movementDate: item.status === 'Graded' ? item.dateGraded : (item.dateDocumented || item.dateCompleted),
      }))
      .sort((a, b) => (b.movementDate || '0').localeCompare(a.movementDate || '0'));

    const aggregateStock = (disposition: DispositionAction): StockAggregate => {
      const stockMap: { [key: string]: {
        productCode: string;
        productName: string;
        unit: string;
        totalIn: number;
        totalOut: number;
        lastIntake?: string;
        lastDispatch?: string;
      } } = {};

      items
        .filter(item => item.disposition === disposition)
        .forEach(item => {
          if (!stockMap[item.productCode]) {
            stockMap[item.productCode] = {
              productCode: item.productCode,
              productName: item.productName,
              unit: item.unit,
              totalIn: 0,
              totalOut: 0,
              lastIntake: undefined,
              lastDispatch: undefined,
            };
          }

          const stockItem = stockMap[item.productCode];

          if (item.status === 'Graded') {
            stockItem.totalIn += item.quantity;
            const intakeDate = item.dateGraded;
            if (intakeDate && (!stockItem.lastIntake || intakeDate > stockItem.lastIntake)) {
              stockItem.lastIntake = intakeDate;
            }
          }

          if (item.status === 'Documented' || item.status === 'Completed') {
            stockItem.totalOut += item.quantity;
            const dispatchDate = item.dateDocumented || item.dateCompleted;
            if (dispatchDate && (!stockItem.lastDispatch || dispatchDate > stockItem.lastDispatch)) {
              stockItem.lastDispatch = dispatchDate;
            }
          }
        });

      const resultList: StockItem[] = Object.values(stockMap).map(stock => {
        const onHand = stock.totalIn - stock.totalOut;
        const latestItem = items
          .filter(i => i.productCode === stock.productCode)
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        const price = latestItem?.priceBill || 0;
        
        return {
          ...stock,
          onHand,
          totalValue: onHand * price,
        };
      });

      const totalIn = resultList.reduce((acc, item) => acc + item.totalIn, 0);
      const totalOut = resultList.reduce((acc, item) => acc + item.totalOut, 0);

      return {
        stats: { totalIn, totalOut, onHand: totalIn - totalOut },
        list: resultList.filter(item => item.onHand > 0)
                      .sort((a, b) => a.productName.localeCompare(b.productName)),
      };
    };

    return {
      fullLedger,
      sellableStock: aggregateStock('Restock'),
      claimStock: aggregateStock('Claim'),
      internalStock: aggregateStock('InternalUse'),
      scrapStock: aggregateStock('Recycle'),
    };
  }, [items]);

  const tabs = [
    { id: 'Ledger', label: '1. ประวัติทั้งหมด (Full Ledger)', icon: History, data: inventoryData.fullLedger },
    { id: 'Restock', label: '2. สินค้าสำหรับขาย (Sellable)', icon: RotateCcw, data: inventoryData.sellableStock },
    { id: 'Claim', label: '3. สินค้าสำหรับเคลม (Claim)', icon: ShieldCheck, data: inventoryData.claimStock },
    { id: 'InternalUse', label: '4. สินค้าใช้ภายใน (Internal)', icon: Home, data: inventoryData.internalStock },
    { id: 'Recycle', label: '5. สินค้าสำหรับทำลาย (Scrap)', icon: Trash2, data: inventoryData.scrapStock },
  ];

  const currentTab = tabs.find(t => t.id === activeTab);
  const currentTabData = currentTab?.data;

  return (
    <div className="p-6 h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">คลังสินค้า (Inventory)</h2>
        <p className="text-slate-500 text-sm">ตรวจสอบยอดคงเหลือในสต็อกและประวัติการเคลื่อนไหวของสินค้าคืน</p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
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

      {activeTab !== 'Ledger' && currentTabData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            <StatCard title="รับเข้าทั้งหมด (Total In)" value={(currentTabData as StockAggregate).stats.totalIn} color="text-blue-600" />
            <StatCard title="จ่ายออกแล้ว (Total Out)" value={(currentTabData as StockAggregate).stats.totalOut} color="text-amber-600" />
            <StatCard title="คงเหลือในสต็อก (On-Hand)" value={(currentTabData as StockAggregate).stats.onHand} color="text-green-600" isHighlight />
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                {activeTab === 'Ledger' ? (
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">วันที่เคลื่อนไหว</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">สินค้า (Product)</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">ประเภท</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">จำนวน</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">สถานะปลายทาง</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">สินค้า (Product)</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">คงเหลือ (On-Hand)</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">วันที่รับเข้าล่าสุด</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">วันที่จ่ายออกล่าสุด</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">มูลค่าคงเหลือ (Bill)</th>
                  </tr>
                )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading data...</td></tr>
              ) : !currentTabData || currentTabData.length === 0 || ('list' in currentTabData && currentTabData.list.length === 0) ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">ไม่มีข้อมูลในหมวดหมู่นี้</td></tr>
              ) : activeTab === 'Ledger' ? (
                (currentTabData as LedgerEntry[]).map(item => (
                  <tr key={item.id} className="text-sm">
                    <td className="px-4 py-3">{item.movementDate || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{item.productName}</div>
                      <div className="text-xs text-slate-500">{item.productCode}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.movementType === 'IN' ? (
                        <span className="inline-flex items-center gap-1 text-green-600 font-bold text-xs"><ArrowUpCircle className="w-4 h-4"/> รับเข้า</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold text-xs"><ArrowDownCircle className="w-4 h-4"/> จ่ายออก</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-slate-500">{item.disposition}</td>
                  </tr>
                ))
              ) : (
                (currentTabData as StockAggregate).list.map(item => (
                   <tr key={item.productCode} className="text-sm">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{item.productName}</div>
                      <div className="text-xs text-slate-500">{item.productCode}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600 text-base">{item.onHand} <span className="text-xs text-slate-500 font-normal">{item.unit}</span></td>
                    <td className="px-4 py-3">{item.lastIntake || '-'}</td>
                    <td className="px-4 py-3">{item.lastDispatch || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">฿{item.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
