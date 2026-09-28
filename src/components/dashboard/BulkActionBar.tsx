'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
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
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--border)',
        borderTop: '2px solid var(--accent-gold)',
        borderRadius: 3,
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.16)',
        px: 2.5,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        maxWidth: '92vw',
        animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        '@keyframes slideUp': {
          from: {
            opacity: 0,
            transform: 'translateX(-50%) translateY(20px)',
          },
          to: {
            opacity: 1,
            transform: 'translateX(-50%) translateY(0)',
          },
        },
      }}
    >
      {/* Selection count */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 1.5,
            backgroundColor: 'rgba(var(--accent-gold-rgb), 0.15)',
            color: 'var(--accent-gold)',
          }}
        >
          <CheckSquare size={16} />
        </Box>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          {selectedCount} selected
        </Typography>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSelection}
          icon={<X size={12} />}
          sx={{
            px: 0.75,
            py: 0.25,
            fontSize: '0.7rem',
            height: 'auto',
            border: 'none',
            color: 'var(--text-secondary)',
          }}
        >
          Deselect
        </Button>
      </Box>

      {/* Divider */}
      <Box sx={{ width: 1, height: 24, backgroundColor: 'var(--border)' }} />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {statusOptions.length > 0 && onBulkStatusChange && (
          <Box sx={{ position: 'relative' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              icon={<RefreshCw size={14} />}
            >
              Update Status <ChevronDown size={14} style={{ marginLeft: 4 }} />
            </Button>
            {showStatusMenu && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  mb: 1,
                  backgroundColor: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 2,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  minWidth: 180,
                  py: 0.75,
                  zIndex: 1001,
                }}
              >
                {statusOptions.map((opt) => (
                  <Box
                    key={opt.value}
                    onClick={() => {
                      onBulkStatusChange(opt.value);
                      setShowStatusMenu(false);
                    }}
                    sx={{
                      px: 2,
                      py: 1,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      '&:hover': {
                        backgroundColor: 'var(--background)',
                        color: 'var(--accent-gold)',
                      },
                    }}
                  >
                    {opt.label}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
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
            sx={{ color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            Delete
          </Button>
        )}
      </Box>
    </Box>
  );
}
