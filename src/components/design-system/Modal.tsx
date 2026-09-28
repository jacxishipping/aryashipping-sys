"use client";

import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  IconButton, 
  Box,
  Typography,
  SxProps,
  Theme,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { ReactNode } from 'react';

/**
 * Modal Component
 * 
 * Accessible modal dialog with animations and consistent styling.
 */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  disableBackdropClick?: boolean;
  className?: string;
  contentSx?: SxProps<Theme>;
  actionsSx?: SxProps<Theme>;
}

// Size configurations
const sizeConfig = {
  sm: '400px',
  md: '600px',
  lg: '800px',
  xl: '1000px',
  full: '95vw',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  size = 'md',
  showCloseButton = true,
  disableBackdropClick = false,
  className,
  contentSx,
  actionsSx,
}: ModalProps) {
  const handleClose = (_event: object, reason: 'backdropClick' | 'escapeKeyDown') => {
    if (disableBackdropClick && reason === 'backdropClick') {
      return;
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      scroll="paper"
      className={className}
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: sizeConfig[size],
          borderRadius: { xs: 2.5, sm: 3 },
          bgcolor: 'var(--panel)',
          backgroundImage: 'none',
          boxShadow: '0 24px 60px rgba(var(--text-primary-rgb), 0.15), 0 8px 16px rgba(var(--text-primary-rgb), 0.1)',
          m: { xs: 1, sm: 2.5 },
          maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 40px)' },
          overflow: 'hidden',
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          },
        },
      }}
    >
      {/* Header */}
      {(title || showCloseButton) && (
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: { xs: 2, sm: 3 },
            py: { xs: 1.75, sm: 2.5 },
            borderBottom: '1px solid var(--border)',
            bgcolor: 'var(--panel)',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {typeof title === 'string' ? (
              <Typography
                sx={{
                  fontSize: { xs: '1rem', sm: '1.125rem' },
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {title}
              </Typography>
            ) : (
              title
            )}
            {description ? (
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                }}
              >
                {description}
              </Typography>
            ) : null}
          </Box>
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              sx={{
                color: 'var(--text-secondary)',
                border: '1px solid rgba(var(--border-rgb), 0.6)',
                p: 0.75,
                '&:hover': {
                  bgcolor: 'rgba(var(--border-rgb), 0.2)',
                },
              }}
            >
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </DialogTitle>
      )}

      {/* Content */}
      <DialogContent
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          color: 'var(--text-primary)',
          overflowY: 'auto',
          bgcolor: 'var(--panel)',
          ...contentSx,
        }}
      >
        {children}
      </DialogContent>

      {/* Actions */}
      {actions && (
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 1.75, sm: 2.5 },
            gap: 1.5,
            borderTop: '1px solid var(--border)',
            bgcolor: 'var(--panel)',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            '& > *': {
              width: { xs: '100% !important', sm: 'auto !important' },
              m: '0 !important',
            },
            ...actionsSx,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}

// Confirmation Dialog Variant
export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  severity?: 'info' | 'warning' | 'error';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  severity = 'info',
  loading = false,
}: ConfirmDialogProps) {
  const severityColors = {
    info: 'var(--info)',
    warning: 'var(--warning)',
    error: 'var(--error)',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      actions={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: severityColors[severity],
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <Typography sx={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {message}
      </Typography>
    </Modal>
  );
}
