"use client";

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import { CheckCircle, Warning, Error as ErrorIcon, Info } from '@mui/icons-material';

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
      icon: <CheckCircle sx={{ fontSize: 20, color: 'var(--success)' }} />,
    });
  },

  error: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration || 5000,
      icon: <ErrorIcon sx={{ fontSize: 20, color: 'var(--error)' }} />,
    });
  },

  warning: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <Warning sx={{ fontSize: 20, color: 'var(--warning)' }} />,
    });
  },

  info: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <Info sx={{ fontSize: 20, color: 'var(--info)' }} />,
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

// Usage examples (for documentation)
/**
 * @example
 * // Success toast
 * toast.success('Container created successfully!');
 * 
 * @example
 * // Error toast with description
 * toast.error('Failed to create container', {
 *   description: 'Please check your network connection'
 * });
 * 
 * @example
 * // Loading toast with promise
 * toast.promise(
 *   fetch('/api/containers').then(res => res.json()),
 *   {
 *     loading: 'Creating container...',
 *     success: 'Container created!',
 *     error: 'Failed to create container',
 *   }
 * );
 * 
 * @example
 * // Toast with action button
 * toast.action('Shipment updated', {
 *   action: {
 *     label: 'View',
 *     onClick: () => router.push('/dashboard/shipments/123')
 *   }
 * });
 */
