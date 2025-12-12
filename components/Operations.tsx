import React, { useState } from 'react';
import {
  Menu, FileInput, Truck, Activity, ClipboardList,
  FileText, LayoutGrid, CheckCircle, Search, ShieldCheck
} from 'lucide-react';
import { useOperationsLogic } from './operations/hooks/useOperationsLogic';
import { Step1Request } from './operations/components/Step1Request';
import { Step2JobAccept } from './operations/components/Step2JobAccept';
import { Step3BranchReceive } from './operations/components/Step3BranchReceive';
import { Step4Consolidation } from './operations/components/Step4Consolidation';
import { Step4HubQC } from './operations/components/Step4HubQC';
import { Step2NCRLogistics } from './operations/components/Step2NCRLogistics';
import { Step6HubReceive } from './operations/components/Step6HubReceive';
import { Step7Docs } from './operations/components/Step7Docs';
import { Step8Closure } from './operations/components/Step8Closure';
import { StepCompleted } from './operations/components/StepCompleted';
import { ReturnRecord } from '../types';
import { SelectionModal } from './operations/components/SelectionModal';
import { DocumentPreviewModal } from './operations/components/DocumentPreviewModal';
import { Step4SplitModal } from './operations/components/Step4SplitModal';

interface OperationsProps {
  initialData?: Partial<ReturnRecord> | null;
  onClearInitialData?: () => void;
}

export const Operations: React.FC<OperationsProps> = ({ initialData, onClearInitialData }) => {
  const { state, actions, derived } = useOperationsLogic(initialData, onClearInitialData);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // New Menu Structure mapping to the Flowchart
  const MENU_ITEMS = [
    // --- SHARED ---
    { id: 1, label: '1. แจ้งคืนสินค้า (Return Request)', icon: FileInput, count: undefined, color: 'text-blue-600', group: 'Return Request' },

    // --- ORANGE FLOW (Inbound Logistics) ---
    // --- ORANGE FLOW (Inbound Logistics) - Removed per user request
    // { id: 12, label: '2. รับงาน (Receive Job)', icon: ClipboardList, count: derived.step2Items.length || undefined, color: 'text-orange-500', group: 'Inbound Logistics (COL ID)' },
    // { id: 13, label: '3. รับสินค้า (Physical Receive)', icon: Activity, count: derived.step3Items.length || undefined, color: 'text-orange-500', group: 'Inbound Logistics (COL ID)' },
    // { id: 14, label: '4. รวมสินค้า (Branch Consolidation)', icon: LayoutGrid, count: derived.step4Items.length || undefined, color: 'text-orange-500', group: 'Inbound Logistics (COL ID)' },


    // --- BLUE FLOW (NCR System) ---
    { id: 2, label: '2. รวบรวมและระบุขนส่ง (Consolidation & Logistics)', icon: Truck, count: derived.ncrStep2Items?.length || undefined, color: 'text-indigo-600', group: 'NCR Hub' },
    { id: 3, label: '3. รับสินค้าเข้า Hub (Received at Hub)', icon: LayoutGrid, count: derived.step6Items.length || undefined, color: 'text-indigo-600', group: 'NCR Hub' },
    { id: 4, label: '4. ตรวจสอบคุณภาพ (QC)', icon: ShieldCheck, count: undefined, color: 'text-indigo-600', group: 'NCR Hub' },
    { id: 5, label: '5. ส่งเอกสารคืน (Docs)', icon: FileText, count: derived.step7Items.length || undefined, color: 'text-indigo-600', group: 'NCR Hub' },
    { id: 6, label: '6. รายการรอปิดงาน (Pending Completion)', icon: Activity, count: derived.step8Items.length || undefined, color: 'text-indigo-600', group: 'NCR Hub' },
    { id: 7, label: '7. รายการที่จบงานแล้ว (Completed)', icon: CheckCircle, count: undefined, color: 'text-green-600', group: 'NCR Hub' },
  ];

  const renderContent = () => {
    switch (state.activeStep) {
      // --- Shared Step 1 ---
      case 1:
        return (
          <Step1Request
            formData={state.formData}
            requestItems={state.requestItems}
            isCustomBranch={state.isCustomBranch}
            uniqueCustomers={derived.uniqueCustomers}
            uniqueDestinations={derived.uniqueDestinations}
            uniqueFounders={derived.uniqueFounders}
            uniqueProductCodes={derived.uniqueProductCodes}
            uniqueProductNames={derived.uniqueProductNames}
            setFormData={actions.setFormData}
            setRequestItems={actions.setRequestItems}
            setIsCustomBranch={actions.setIsCustomBranch}
            handleImageUpload={actions.handleImageUpload}
            handleRemoveImage={actions.handleRemoveImage}
            handleAddItem={actions.handleAddItem}
            handleRemoveItem={actions.handleRemoveItem}
            handleRequestSubmit={actions.handleRequestSubmit}
          />
        );

      // --- Orange Flow Steps ---
      case 12: return <Step2JobAccept />;
      case 13: return <Step3BranchReceive />;
      case 14: return <Step4Consolidation />;

      // --- Blue Operations (Hub) Steps ---
      case 2:
        // Logic: NCR Items Consolidation & Decision (Direct Return vs Hub)
        return <Step2NCRLogistics onConfirm={actions.handleLogisticsSubmit} />;

      case 3:
        // Hub Receive (Old Step 6)
        return <Step6HubReceive />;

      case 4:
        return <Step4HubQC />;

      case 5:
        // Docs (Old Step 7, now Step 5 in UI flow)
        return <Step7Docs onPrintDocs={actions.handlePrintClick} />;

      case 6:
        // Closure (Old Step 8)
        return <Step8Closure />;

      case 7:
        // Completed View
        return <StepCompleted />;

      default:
        return <div className="p-8 text-center text-slate-400">อยู่ระหว่างปรับปรุง (Step Coming Soon)</div>;
    }
  };

  return (
    <div className="flex bg-slate-100 h-screen overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside
        className={`${sidebarOpen ? 'w-72' : 'w-20'} 
        bg-white border-r border-slate-200 flex flex-col transition-all duration-300 shadow-xl z-20`}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          {sidebarOpen && (
            <div className="font-extrabold text-xl text-slate-800 tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent transform scale-90 origin-left flex flex-col">
                <span className="text-sm">ศูนย์ปฏิบัติการคืนสินค้า</span>
                <span className="text-[10px] text-slate-500">Return Operations Hub</span>
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-blue-600 hover:shadow-sm"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {['Return Request', 'NCR Hub'].map((group) => {
            const items = MENU_ITEMS.filter(i => i.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-4">
                {sidebarOpen && <div className="px-3 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">{group}</div>}
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => actions.setActiveStep(item.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative mb-1
                        ${state.activeStep === item.id
                        ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-all duration-200 ${state.activeStep === item.id ? 'bg-white shadow-sm' : 'bg-slate-100 group-hover:bg-white'}`}>
                      <item.icon className={`w-4 h-4 ${state.activeStep === item.id ? item.color : 'text-slate-400'}`} />
                    </div>
                    {sidebarOpen && (
                      <div className="flex-1 text-left flex items-center justify-between">
                        <span className="text-xs font-medium">{item.label}</span>
                        {item.count && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                              ${state.activeStep === item.id ? 'bg-white text-blue-600 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                            {item.count}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          {sidebarOpen ? (
            <div className="text-xs text-slate-400 text-center font-medium">
              Neo Siam Logistics<br />
              NCR Operations System v3.0
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white/50 relative">
        <div className="absolute top-0 left-0 w-full h-64 bg-slate-50 -z-10 skew-y-1 transform origin-top-left opacity-50"></div>
        <div className="flex-1 overflow-hidden p-2 sm:p-4">
          {renderContent()}
        </div>
      </main>

      {/* Modals */}
      {state.showSelectionModal && (
        <SelectionModal
          isOpen={state.showSelectionModal}
          onClose={() => actions.setShowSelectionModal(false)}
          selectionItems={state.selectionItems}
          selectedItemIds={state.selectedItemIds}
          toggleSelection={actions.toggleSelection}
          handleGenerateDoc={actions.handleGenerateDoc}
          selectionStatus={state.selectionStatus}
          onSplit={actions.handleDocItemClick}
        />
      )}

      {state.showDocModal && state.docData && (
        <DocumentPreviewModal
          isOpen={state.showDocModal}
          onClose={() => actions.setShowDocModal(false)}
          docData={state.docData}
          docConfig={state.docConfig}
          setDocConfig={actions.setDocConfig}
          includeVat={state.includeVat}
          vatRate={state.vatRate}
          discountRate={state.discountRate}
          isDocEditable={state.isDocEditable}
          setIncludeVat={actions.setIncludeVat}
          setVatRate={actions.setVatRate}
          setDiscountRate={actions.setDiscountRate}
          setIsDocEditable={actions.setIsDocEditable}
          handleConfirmDocGeneration={actions.handleConfirmDocGeneration}
          onUpdateItem={actions.handleUpdateDocItem}
        />
      )}

      {state.showStep4SplitModal && state.docSelectedItem && (
        <Step4SplitModal
          isOpen={state.showStep4SplitModal}
          onClose={() => actions.setShowStep4SplitModal(false)}
          item={state.docSelectedItem}
          onConfirm={actions.handleStep4SplitSubmit}
        />
      )}
    </div>
  );
};

export default Operations;