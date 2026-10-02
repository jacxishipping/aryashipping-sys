'use client';

import React from 'react';
import { CheckSquare, X, ChevronDown, Download, QrCode, Trash2, Layers, RefreshCw } from 'lucide-react';
import { Button } from '@/components/design-system';

export interface BulkActionOption {
  label: string;
  value: string;
}

export interface BulkActionBarProps {
  selectedCount: number;
  totalCount?: number;
  onClearSelection: () => void;
  onBulkStatusChange?: (status: string) => void;
  statusOptions?: BulkActionOption[];
  onBulkExport?: () => void;
  onBulkPrintQR?: () => void;
  onBulkAssignContainer?: () => void;
  onBulkDelete?: () => void;
  customActions?: React.ReactNode;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStatusChange,
  statusOptions = [],
  onBulkExport,
  onBulkPrintQR,
  onBulkAssignContainer,
  onBulkDelete,
  customActions,
}: BulkActionBarProps) {
  const [showStatusMenu, setShowStatusMenu] = React.useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-[var(--panel)] border border-[var(--border)] border-t-2 border-t-[var(--accent-gold)] rounded-2xl shadow-2xl px-5 py-3.5 flex items-center gap-4 max-w-[92vw] animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Selection count */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[rgba(var(--accent-gold-rgb),0.15)] text-[var(--accent-gold)]">
          <CheckSquare size={16} />
        </div>
        <span className="text-[0.85rem] font-bold text-[var(--text-primary)] whitespace-nowrap">
          {selectedCount} selected
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-0 cursor-pointer"
        >
          <X size={12} />
          <span>Deselect</span>
        </button>
      </div>

      {/* Divider */}
      <div className="w-[1px] h-6 bg-[var(--border)]" />

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusOptions.length > 0 && onBulkStatusChange && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              icon={<RefreshCw size={14} />}
            >
              Update Status <ChevronDown size={14} className="ml-1" />
            </Button>
            {showStatusMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-xl min-w-[180px] py-1.5 z-[1001]">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onBulkStatusChange(opt.value);
                      setShowStatusMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold cursor-pointer text-[var(--text-primary)] hover:bg-[var(--background)] hover:text-[var(--accent-gold)] bg-transparent border-0 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {onBulkAssignContainer && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkAssignContainer}
            icon={<Layers size={14} />}
          >
            Assign Container
          </Button>
        )}

        {onBulkPrintQR && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkPrintQR}
            icon={<QrCode size={14} />}
          >
            Print Yard QR
          </Button>
        )}

        {onBulkExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkExport}
            icon={<Download size={14} />}
          >
            Export Selected
          </Button>
        )}

        {customActions}

        {onBulkDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkDelete}
            icon={<Trash2 size={14} />}
            className="text-[var(--error)] border-red-500/30 hover:border-red-500"
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
