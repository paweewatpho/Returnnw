import React, { useState } from 'react';
import {
  Menu, FileInput, Truck, Activity, ClipboardList,
  FileText, LayoutGrid, BarChart2, CheckCircle
} from 'lucide-react';
import { useOperationsLogic } from './operations/hooks/useOperationsLogic';
import { Step1Request } from './operations/components/Step1Request';
import { Step2Logistics } from './operations/components/Step2Logistics';
import { Step3HubReceive } from './operations/components/Step3HubReceive';
import { Step4HubQC } from './operations/components/Step4HubQC';
import { Step5HubDocs } from './operations/components/Step5HubDocs';
import { Step6Closure } from './operations/components/Step6Closure';
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

  // Updated Menu for 6-Step Workflow
  const MENU_ITEMS = [
    { id: 1, label: 'แจ้งคืนสินค้า', icon: FileInput, count: derived.requestedItems.length || undefined, color: 'text-blue-600' },
    { id: 2, label: 'รวบรวม & ขนส่ง', icon: Truck, count: derived.logisticItems.length || undefined, color: 'text-orange-500' }, // New Step
    { id: 3, label: 'รับสินค้าเข้า Hub', icon: LayoutGrid, count: derived.hubReceiveItems.length || undefined, color: 'text-amber-500' },
    { id: 4, label: 'ตรวจสอบคุณภาพ', icon: Activity, count: derived.hubQCItems.length || undefined, color: 'text-blue-500' },
    { id: 5, label: 'เอกสารส่งคืน', icon: ClipboardList, count: derived.hubDocItems.length || undefined, color: 'text-slate-600' },
    { id: 6, label: 'ติดตาม & ปิดงาน', icon: CheckCircle, count: derived.closureItems.length || undefined, color: 'text-green-600' }
  ];

  const renderContent = () => {
    switch (state.activeStep) {
      case 1:
        return (
          <Step1Request
            formData={state.formData}
            requestItems={state.requestItems}
            customProblemType={state.customProblemType}
            customRootCause={state.customRootCause}
            isCustomBranch={state.isCustomBranch}
            uniqueCustomers={derived.uniqueCustomers}
            uniqueDestinations={derived.uniqueDestinations}
            uniqueFounders={derived.uniqueFounders}
            uniqueProductCodes={derived.uniqueProductCodes}
            uniqueProductNames={derived.uniqueProductNames}
            setFormData={actions.setFormData}
            setRequestItems={actions.setRequestItems}
            setIsCustomBranch={actions.setIsCustomBranch}
            setCustomProblemType={actions.setCustomProblemType}
            setCustomRootCause={actions.setCustomRootCause}
            handleImageUpload={actions.handleImageUpload}
            handleRemoveImage={actions.handleRemoveImage}
            handleAddItem={actions.handleAddItem}
            handleRemoveItem={actions.handleRemoveItem}
            handleRequestSubmit={actions.handleRequestSubmit}
          />
        );
      case 2:
        return (
          <Step2Logistics
            onConfirm={actions.handleLogisticsSubmit}
          />
        );
      case 3:
        return (
          <Step3HubReceive />
        );
      case 4:
        return (
          <Step4HubQC
            receivedItems={derived.hubQCItems}
            qcSelectedItem={state.qcSelectedItem}
            customInputType={state.customInputType}
            selectedDisposition={state.selectedDisposition}
            dispositionDetails={state.dispositionDetails}
            isCustomRoute={state.isCustomRoute}
            showSplitMode={state.showSplitMode}
            isBreakdownUnit={state.isBreakdownUnit}
            conversionRate={state.conversionRate}
            newUnitName={state.newUnitName}
            splitQty={state.splitQty}
            splitCondition={state.splitCondition}
            splitDisposition={state.splitDisposition}
            selectQCItem={actions.selectQCItem}
            setQcSelectedItem={actions.setQcSelectedItem}
            handleConditionSelect={actions.handleConditionSelect}
            setSelectedDisposition={actions.setSelectedDisposition}
            setIsCustomRoute={actions.setIsCustomRoute}
            handleDispositionDetailChange={actions.handleDispositionDetailChange}
            setShowSplitMode={actions.setShowSplitMode}
            setIsBreakdownUnit={actions.setIsBreakdownUnit}
            setConversionRate={actions.setConversionRate}
            setNewUnitName={actions.setNewUnitName}
            setSplitQty={actions.setSplitQty}
            setSplitCondition={actions.setSplitCondition}
            setSplitDisposition={actions.setSplitDisposition}
            handleSplitSubmit={actions.handleSplitSubmit}
            handleQCSubmit={actions.handleQCSubmit}
            toggleSplitMode={actions.toggleSplitMode}
          />
        );
      case 5:
        return (
          <Step5HubDocs
            processedItems={derived.hubDocItems}
            onPrintClick={actions.handlePrintClick}
            onSplitClick={actions.handleDocItemClick}
          />
        );
      case 6:
        return (
          <Step6Closure
            documentedItems={derived.closureItems}
            completedItems={derived.completedItems}
            handleCompleteJob={actions.handleCompleteJob}
          />
        );
      default:
        return <div className="p-8 text-center text-slate-400">อยู่ระหว่างปรับปรุง (Step Coming Soon)</div>;
    }
  };

  return (
    <div className="flex bg-slate-100 h-screen overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} 
        bg-white border-r border-slate-200 flex flex-col transition-all duration-300 shadow-xl z-20`}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          {sidebarOpen && (
            <div className="font-extrabold text-xl text-slate-800 tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                Return Hub
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
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => actions.setActiveStep(item.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
                ${state.activeStep === item.id
                  ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100 font-bold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              <div className={`
                p-2 rounded-lg transition-all duration-200
                ${state.activeStep === item.id ? 'bg-white shadow-sm scale-110' : 'bg-slate-100 group-hover:bg-white group-hover:shadow-sm'}
              `}>
                <item.icon className={`w-5 h-5 ${state.activeStep === item.id ? item.color : 'text-slate-400 group-hover:text-slate-600'}`} />
              </div>

              {sidebarOpen && (
                <div className="flex-1 text-left flex items-center justify-between">
                  <span className="text-sm">{item.label}</span>
                  {item.count && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                      ${state.activeStep === item.id ? 'bg-white text-blue-600 shadow-sm' : 'bg-slate-100 text-slate-500'}
                    `}>
                      {item.count}
                    </span>
                  )}
                </div>
              )}

              {!sidebarOpen && item.count && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          {sidebarOpen ? (
            <div className="text-xs text-slate-400 text-center font-medium">
              Neo Siam Logistics<br />
              Operations System v2.0
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
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-64 bg-slate-50 -z-10 skew-y-1 transform origin-top-left opacity-50"></div>

        {/* Content Container */}
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