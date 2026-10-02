"use client";

import React, { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

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
  contentSx?: any;
  actionsSx?: any;
}

const sizeConfig = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[95vw]',
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
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={() => {
          if (!disableBackdropClick) onClose();
        }}
      />

      {/* Dialog Card */}
      <div
        ref={modalRef}
        className={`relative z-10 w-full ${sizeConfig[size]} my-auto overflow-hidden rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95 ${className}`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--panel)]">
            <div className="flex-1 min-w-0">
              {typeof title === 'string' ? (
                <h3 className="text-lg font-semibold text-[var(--text-primary)] leading-tight">
                  {title}
                </h3>
              ) : (
                title
              )}
              {description && (
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-normal">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--background)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-5 max-h-[calc(85vh-120px)] overflow-y-auto text-[var(--text-primary)]">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--panel)]">
            {actions}
          </div>
        )}
      </div>
    </div>
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
  const severityButtonClasses = {
    info: 'bg-[var(--info)] text-white hover:opacity-90',
    warning: 'bg-[var(--warning)] text-white hover:opacity-90',
    error: 'bg-[var(--error)] text-white hover:opacity-90',
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
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--background)] disabled:opacity-50 cursor-pointer transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg border-0 ${severityButtonClasses[severity]} disabled:opacity-50 cursor-pointer transition-opacity`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {message}
      </div>
    </Modal>
  );
}
