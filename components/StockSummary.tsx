
import React, { useState, useMemo } from 'react';
import { useData } from '../DataContext';
import { DispositionAction } from '../types';
import { Box, RotateCcw, ShieldCheck, Home, Trash2, Search, Download } from 'lucide-react';

interface StockSummaryItem {
  productCode: string;
  productName: string;
  onHandQuantity: number;
  totalValue: number;
  lastIntakeDate: string;
  disposition: DispositionAction;
}

const StockSummary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'All' | DispositionAction>('All');
  const [query, setQuery] = useState('');
  const { items, loading } = useData();

  const summarizedData = useMemo(() => {
    const productMap = new Map<string, {
      productName: string;
      totalIn: number;
      totalOut: number;
      lastIntakeDate: string;
      priceBill: number;
      disposition: DispositionAction;
    }>();

    // First pass to aggregate IN/OUT and find latest dates/prices
    items.forEach(item => {
      if (!item.productCode) return;

      const existing = productMap.get(item.productCode) || {
        productName: item.productName,
        totalIn: 0,
        totalOut: 0,
        lastIntakeDate: '1970-01-01',
        priceBill: item.priceBill,
        disposition: item.disposition || 'Pending',
      };

      if (item.dateGraded) { // IN movement
        existing.totalIn += item.quantity;
        if (item.dateGraded > existing.lastIntakeDate) {
          existing.lastIntakeDate = item.dateGraded;
        }
      }
      if (item.dateDocumented || item.dateCompleted) { // OUT movement
        existing.totalOut += item.quantity;
      }
      
      // Keep the latest info if it's more relevant
      if (item.date > (productMap.get(item.productCode) ? items.find(i => i.productCode === item.productCode)?.date || '1970-01-01' : '1970-01-01')) {
        existing.productName = item.productName;
        existing.priceBill = item.priceBill;
        existing.disposition = item.disposition || 'Pending';
      }

      productMap.set(item.productCode, existing);
    });
    
    // Second pass to calculate on-hand and create final list
    const summaryList: StockSummaryItem[] = [];
    productMap.forEach((data, productCode) => {
      const onHandQuantity = data.totalIn - data.totalOut;
      if (onHandQuantity > 0) {
        summaryList.push({
          productCode,
          productName: data.productName,
          onHandQuantity,
          totalValue: onHandQuantity * data.priceBill,
          lastIntakeDate: data.lastIntakeDate,
          disposition: data.disposition,
        });
      }
    });

    return summaryList.sort((a,b) => a.productName.localeCompare(b.productName));

  }, [items]);

  const filteredData = useMemo(() => {
    let data = summarizedData;
    
    if (activeTab !== 'All') {
      data = data.filter(item => item.disposition === activeTab);
    }
    
    const queryLower = query.toLowerCase();
    if (queryLower) {
      data = data.filter(item => 
        item.productName.toLowerCase().includes(queryLower) ||
        item.productCode.toLowerCase().includes(queryLower)
      );
    }

    return data;
  }, [summarizedData, activeTab, query]);

  const handleExportExcel = () => {
    const headers = [
      "Product Code", "Product Name", "On-Hand Quantity", "Total On-Hand Value", "Last Intake Date", "Disposition"
    ];

    const rows = filteredData.map(item => [
      item.productCode,
      `"${item.productName.replace(/"/g, '""')}"`,
      item.onHandQuantity,
      item.totalValue,
      item.lastIntakeDate === '1970-01-01' ? '' : item.lastIntakeDate,
      item.disposition
    ].join(','));

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stock_summary_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const tabs = [
    { id: 'All', label: 'ทั้งหมด (All On-Hand)', icon: Box },
    { id: 'Restock', label: 'สินค้าสำหรับขาย (Sellable)', icon: RotateCcw },
    { id: 'Claim', label: 'สินค้าสำหรับเคลม (Claim)', icon: ShieldCheck },
    { id: 'InternalUse', label: 'สินค้าใช้ภายใน (Internal)', icon: Home },
    { id: 'Recycle', label: 'สินค้าสำหรับทำลาย (Scrap)', icon: Trash2 },
  ];

  return (
    <div className="p-6 h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">สรุปสต็อกคงคลัง (Stock Summary)</h2>
        <p className="text-slate-500 text-sm">ตรวจสอบยอดสินค้าคงเหลือในสต็อกปัจจุบันที่พร้อมสำหรับการจัดการ</p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'All' | DispositionAction)}
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
      
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหา รหัส/ชื่อสินค้า..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
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
                  <th className="px-4 py-3">สินค้า (Product)</th>
                  <th className="px-4 py-3 text-right">ยอดคงเหลือ (On-Hand Qty)</th>
                  <th className="px-4 py-3 text-right">มูลค่ารวม (Total Value)</th>
                  <th className="px-4 py-3">วันที่รับเข้าล่าสุด</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">ไม่พบข้อมูลสต็อกคงเหลือที่ตรงกับเงื่อนไข</td></tr>
              ) : (
                filteredData.map(item => (
                  <tr key={item.productCode} className="text-sm">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{item.productName}</div>
                      <div className="text-xs text-slate-500">{item.productCode}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-lg text-blue-600">{item.onHandQuantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">฿{item.totalValue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">{item.lastIntakeDate === '1970-01-01' ? '-' : item.lastIntakeDate}</td>
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

export default StockSummary;
