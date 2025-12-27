import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../DataContext';
import { NCRRecord, NCRItem, ReturnRecord } from '../types';
import {
    FileText, Search, Download, RotateCcw,
    Printer, Edit, Trash2, X, Save,
    CheckCircle,
    Eye,
    Info,
    ChevronDown,
    ChevronUp,
    Package,
    Image as ImageIcon,
    ArrowRight,
    CircleX,
    CircleCheck,
    Clock,
    DollarSign
} from 'lucide-react';
import { LineAutocomplete } from './LineAutocomplete';
import { exportNCRToExcel } from './NCRExcelExport';
import { NCRPrintPreview } from './NCRPrintPreview';
import { formatDate } from '../utils/dateUtils';
import NCRTimelineModal from './NCRTimelineModal';

interface NCRReportProps {
    onTransfer: (data: Partial<ReturnRecord>) => void;
}

const NCRReport: React.FC<NCRReportProps> = ({ onTransfer }) => {
    const { ncrReports, updateNCRReport, deleteNCRReport, items } = useData();

    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printItem, setPrintItem] = useState<NCRRecord | null>(null);

    const [showNCRFormModal, setShowNCRFormModal] = useState(false);
