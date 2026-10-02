"use client";

import React, { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  anchor?: 'right' | 'left';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  className?: string;
  contentSx?: any;
}

const sizeConfig = {
  sm: 'max-w-md',
  md: 'max-w-lg sm:max-w-xl',
  lg: 'max-w-2xl sm:max-w-3xl',
  xl: 'max-w-4xl sm:max-w-5xl',
  full: 'max-w-[95vw]',
};

export default function Drawer({
  open,
  onClose,
  title,
  description,
  badge,
  children,
  actions,
  anchor = 'right',
  size = 'md',
  showCloseButton = true,
  className = '',
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
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
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-over Container */}
      <div
        className={`fixed inset-y-0 ${
          anchor === 'left' ? 'left-0' : 'right-0'
        } flex max-w-full`}
      >
        <div
          ref={drawerRef}
          className={`relative w-screen ${
            sizeConfig[size]
          } bg-[var(--panel)] border-${anchor === 'left' ? 'r' : 'l'} border-[var(--border)] shadow-2xl flex flex-col h-full overflow-hidden transition-all duration-200 animate-in ${
            anchor === 'left' ? 'slide-in-from-left' : 'slide-in-from-right'
          } ${className}`}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--panel)]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {typeof title === 'string' ? (
                    <h3 className="text-lg font-bold text-[var(--text-primary)] truncate">
                      {title}
                    </h3>
                  ) : (
                    title
                  )}
                  {badge}
                </div>
                {description && (
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {description}
                  </p>
                )}
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close drawer"
                  className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--background)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-[var(--text-primary)]">
            {children}
          </div>

          {/* Footer Actions */}
          {actions && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--panel)]">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
