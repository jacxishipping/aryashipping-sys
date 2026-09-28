'use client';

import { useState } from 'react';
import { 
  CheckSquare, 
  X, 
  Printer, 
  Package, 
  FileText, 
  MessageSquare, 
  SlidersHorizontal, 
  Download, 
  Trash2,
  Send,
  QrCode,
  Sparkles
} from 'lucide-react';
import { toast } from '@/components/design-system';

export interface BatchItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  consignee?: string;
  phone?: string;
  vin?: string;
}

interface BatchActionsHUDProps {
  selectedItems: BatchItem[];
  entityName?: string; // 'Shipments' | 'Containers' | 'Invoices'
  onClearSelection: () => void;
  onBulkStatusUpdate?: (status: string) => void;
  onBulkAssignContainer?: () => void;
  onBulkThermalPrint?: () => void;
  onBulkMessage?: () => void;
}

export function BatchActionsHUD({
  selectedItems,
  entityName = 'Shipments',
  onClearSelection,
  onBulkStatusUpdate,
  onBulkAssignContainer,
  onBulkThermalPrint,
  onBulkMessage,
}: BatchActionsHUDProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [printing, setPrinting] = useState(false);

  if (selectedItems.length === 0) return null;

  const handlePrintLabels = () => {
    setPrinting(true);
    if (onBulkThermalPrint) {
      onBulkThermalPrint();
    } else {
      toast.success(`Generated batch thermal labels for ${selectedItems.length} items`);
    }
    setPrinting(false);
  };

  const handleExportManifest = () => {
    const csvHeader = 'ID,Title,Subtitle,Status,VIN,Consignee\n';
    const csvRows = selectedItems.map(
      (item) => `"${item.id}","${item.title}","${item.subtitle || ''}","${item.status || ''}","${item.vin || ''}","${item.consignee || ''}"`
    ).join('\n');
    
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Consolidated_Manifest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported manifest for ${selectedItems.length} items`);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 rounded-2xl bg-[var(--panel)] border-2 border-[var(--accent-gold)] shadow-2xl backdrop-blur-lg">
        {/* Selection Count Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-[var(--accent-gold)] text-white font-bold text-xs shadow-sm">
            {selectedItems.length}
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              {selectedItems.length} {entityName} Selected
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] leading-tight">
              Execute batch operations across active pool
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Batch Thermal QR Button */}
          <button
            onClick={handlePrintLabels}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)] text-xs font-semibold text-[var(--text-primary)] transition-all shadow-sm"
            title="Batch Print 4x6 Thermal Yard QR Stickers"
          >
            <QrCode className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Thermal Badges</span>
          </button>

          {/* Bulk Assign Container */}
          {onBulkAssignContainer && (
            <button
              onClick={onBulkAssignContainer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)] text-xs font-semibold text-[var(--text-primary)] transition-all shadow-sm"
            >
              <Package className="w-3.5 h-3.5 text-amber-500" />
              <span>Assign Container</span>
            </button>
          )}

          {/* Consolidated Manifest Export */}
          <button
            onClick={handleExportManifest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)] text-xs font-semibold text-[var(--text-primary)] transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Export Manifest</span>
          </button>

          {/* Bulk Notification */}
          {onBulkMessage && (
            <button
              onClick={onBulkMessage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)] text-xs font-semibold text-[var(--text-primary)] transition-all shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>Notify</span>
            </button>
          )}

          {/* Clear Selection X Button */}
          <button
            onClick={onClearSelection}
            className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors ml-1"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
