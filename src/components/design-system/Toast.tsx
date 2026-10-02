"use client";

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

/**
 * Toast Notification System
 * 
 * Using Sonner for beautiful, accessible toast notifications.
 * Replaces browser alert() calls.
 */

// Toast wrapper component
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: 'var(--panel)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '16px',
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        className: 'toast-notification',
      }}
    />
  );
}

// Enhanced toast API with custom styling
export const toast = {
  success: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />,
    });
  },

  error: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration || 5000,
      icon: <AlertCircle className="w-5 h-5 text-[var(--error)]" />,
    });
  },

  warning: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />,
    });
  },

  info: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <Info className="w-5 h-5 text-[var(--info)]" />,
    });
  },

  // Loading toast with promise
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return sonnerToast.promise(promise, options);
  },

  // Custom toast with action button
  action: (
    message: string,
    options: {
      action: {
        label: string;
        onClick: () => void;
      };
      description?: string;
    }
  ) => {
    sonnerToast(message, {
      description: options.description,
      action: {
        label: options.action.label,
        onClick: options.action.onClick,
      },
    });
  },

  // Dismiss all toasts
  dismiss: () => {
    sonnerToast.dismiss();
  },
};
