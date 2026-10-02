"use client";

import { Anchor, AlertTriangle, CheckCircle2, Clock, Truck, XCircle } from 'lucide-react';
import { ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

/**
 * StatusBadge Component
 * 
 * Displays status with appropriate colors and styling.
 * Used for shipment status, payment status, etc.
 * Uses high-contrast color combinations for better readability.
 */

// Shipment Status Types
export type ShipmentStatus = 
  | 'ON_HAND' 
  | 'DISPATCHING'
  | 'IN_TRANSIT' 
  | 'IN_TRANSIT_TO_DESTINATION'
  | 'AT_PORT' 
  | 'CUSTOMS' 
  | 'RELEASED' 
  | 'DELIVERED' 
  | 'CANCELLED' 
  | 'DELAYED'
  // Container Statuses
  | 'CREATED'
  | 'WAITING_FOR_LOADING'
  | 'LOADED'
  | 'ARRIVED_PORT'
  | 'CUSTOMS_CLEARANCE'
  | 'CLOSED';

// Payment Status Types
export type PaymentStatus = 
  | 'PAID' 
  | 'PENDING' 
  | 'OVERDUE' 
  | 'PARTIAL' 
  | 'REFUNDED';

// Generic Status Types
export type GenericStatus = 
  | 'SUCCESS' 
  | 'WARNING' 
  | 'ERROR' 
  | 'INFO' 
  | 'DEFAULT';

export type StatusType = ShipmentStatus | PaymentStatus | GenericStatus | string;

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  variant?: 'default' | 'dot' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  showIcon?: boolean;
  className?: string;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'DELIVERED':
    case 'PAID':
    case 'ON_HAND':
      return <CheckCircle2 width={12} height={12} />;
    case 'PENDING':
    case 'DISPATCHING':
      return <Clock width={12} height={12} />;
    case 'OVERDUE':
    case 'DELAYED':
      return <AlertTriangle width={12} height={12} />;
    case 'IN_TRANSIT':
    case 'IN_TRANSIT_TO_DESTINATION':
      return <Truck width={12} height={12} />;
    case 'AT_PORT':
    case 'ARRIVED_PORT':
      return <Anchor width={12} height={12} />;
    case 'CANCELLED':
      return <XCircle width={12} height={12} />;
    default:
      return null;
  }
}

// Status color mappings with enhanced contrast
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  // Shipment Statuses
  ON_HAND: {
    bg: 'rgba(16, 185, 129, 0.12)',
    text: 'var(--success-dark)',
    border: 'var(--success)',
  },
  DISPATCHING: {
    bg: 'rgba(var(--status-yellow-rgb), 0.12)',
    text: 'var(--status-yellow-dark)',
    border: 'var(--status-yellow)',
  },
  IN_TRANSIT: {
    bg: 'rgba(var(--info-rgb), 0.12)',
    text: 'var(--info-dark)',
    border: 'var(--info)',
  },
  IN_TRANSIT_TO_DESTINATION: {
    bg: 'rgba(var(--status-violet-rgb), 0.12)',
    text: 'var(--status-violet-dark)',
    border: 'var(--status-violet)',
  },
  AT_PORT: {
    bg: 'rgba(var(--warning-rgb), 0.12)',
    text: 'var(--warning-dark)',
    border: 'var(--warning)',
  },
  CUSTOMS: {
    bg: 'rgba(var(--status-violet-rgb), 0.12)',
    text: 'var(--status-violet-dark)',
    border: 'var(--status-violet)',
  },
  RELEASED: {
    bg: 'rgba(var(--success-rgb), 0.12)',
    text: 'var(--success-dark)',
    border: 'var(--success)',
  },
  DELIVERED: {
    bg: 'rgba(var(--status-emerald-rgb), 0.12)',
    text: 'var(--status-emerald-dark)',
    border: 'var(--status-emerald)',
  },
  CANCELLED: {
    bg: 'rgba(var(--status-slate-rgb), 0.12)',
    text: 'var(--status-slate-dark)',
    border: 'var(--text-secondary)',
  },
  DELAYED: {
    bg: 'rgba(239, 68, 68, 0.12)',
    text: 'var(--error-dark)',
    border: 'var(--error)',
  },

  // Container Statuses
  CREATED: {
    bg: 'rgba(var(--status-slate-rgb), 0.12)',
    text: 'var(--status-slate-dark)',
    border: 'var(--text-secondary)',
  },
  WAITING_FOR_LOADING: {
    bg: 'rgba(var(--warning-rgb), 0.12)',
    text: 'var(--warning-dark)',
    border: 'var(--warning)',
  },
  LOADED: {
    bg: 'rgba(var(--info-rgb), 0.12)',
    text: 'var(--info-dark)',
    border: 'var(--info)',
  },
  ARRIVED_PORT: {
    bg: 'rgba(var(--success-rgb), 0.12)',
    text: 'var(--success-dark)',
    border: 'var(--success)',
  },
  CUSTOMS_CLEARANCE: {
    bg: 'rgba(var(--status-orange-rgb), 0.12)',
    text: 'var(--status-orange-dark)',
    border: 'var(--status-orange)',
  },
  CLOSED: {
    bg: 'rgba(var(--status-slate-rgb), 0.12)',
    text: 'var(--status-slate-dark)',
    border: 'var(--status-slate)',
  },

  // Payment Statuses
  PAID: {
    bg: 'rgba(16, 185, 129, 0.12)',
    text: 'var(--success-dark)',
    border: 'var(--success)',
  },
  PENDING: {
    bg: 'rgba(245, 158, 11, 0.12)',
    text: 'var(--warning-dark)',
    border: 'var(--warning)',
  },
  OVERDUE: {
    bg: 'rgba(239, 68, 68, 0.12)',
    text: 'var(--error-dark)',
    border: 'var(--error)',
  },
  PARTIAL: {
    bg: 'rgba(59, 130, 246, 0.12)',
    text: 'var(--info-dark)',
    border: 'var(--info)',
  },
  REFUNDED: {
    bg: 'rgba(var(--status-slate-rgb), 0.12)',
    text: 'var(--status-slate-dark)',
    border: 'var(--text-secondary)',
  },

  // Generic Statuses
  SUCCESS: {
    bg: 'rgba(16, 185, 129, 0.12)',
    text: 'var(--success-dark)',
    border: 'var(--success)',
  },
  WARNING: {
    bg: 'rgba(245, 158, 11, 0.12)',
    text: 'var(--warning-dark)',
    border: 'var(--warning)',
  },
  ERROR: {
    bg: 'rgba(239, 68, 68, 0.12)',
    text: 'var(--error-dark)',
    border: 'var(--error)',
  },
  INFO: {
    bg: 'rgba(59, 130, 246, 0.12)',
    text: 'var(--info-dark)',
    border: 'var(--info)',
  },
  ADMIN: {
    bg: 'rgba(var(--accent-gold-rgb), 0.15)',
    text: 'var(--accent-gold)',
    border: 'rgba(var(--accent-gold-rgb), 0.3)',
  },
  MANAGER: {
    bg: 'rgba(59, 130, 246, 0.12)',
    text: 'var(--info-dark)',
    border: 'var(--info)',
  },
  USER: {
    bg: 'var(--panel)',
    text: 'var(--text-secondary)',
    border: 'var(--border)',
  },
  CUSTOMER: {
    bg: 'var(--panel)',
    text: 'var(--text-secondary)',
    border: 'var(--border)',
  },
  DEFAULT: {
    bg: 'var(--panel)',
    text: 'var(--text-primary)',
    border: 'var(--border)',
  },
};

function formatStatusText(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

const sizeConfig = {
  sm: {
    fontSize: 'text-[0.6875rem]',
    padding: 'px-2 py-0.5',
    height: 'h-[22px]',
    dotSize: 'w-1.5 h-1.5',
    gap: 'gap-1',
  },
  md: {
    fontSize: 'text-xs',
    padding: 'px-2.5 py-1',
    height: 'h-6',
    dotSize: 'w-2 h-2',
    gap: 'gap-1.5',
  },
  lg: {
    fontSize: 'text-sm',
    padding: 'px-3.5 py-1.5',
    height: 'h-7',
    dotSize: 'w-2.5 h-2.5',
    gap: 'gap-2',
  },
};

export default function StatusBadge({
  status,
  label,
  variant = 'default',
  size = 'md',
  icon,
  showIcon = false,
  className = '',
}: StatusBadgeProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';
  const normalizedStatus = (status || 'DEFAULT').toUpperCase().replace(/\s+/g, '_');
  const colors = statusColors[normalizedStatus] || statusColors.DEFAULT;
  const config = isCompact ? sizeConfig.sm : (sizeConfig[size] || sizeConfig.md);
  const resolvedIcon = showIcon ? getStatusIcon(normalizedStatus) : icon;
  const displayText = label || formatStatusText(status || '');

  if (variant === 'default') {
    return (
      <span
        className={`status-badge inline-flex items-center justify-center ${config.gap} ${config.height} ${config.padding} rounded-md font-semibold ${config.fontSize} whitespace-nowrap transition-all shadow-sm ${className}`}
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
        }}
      >
        {resolvedIcon && <span className="inline-flex items-center">{resolvedIcon}</span>}
        <span className={label ? '' : 'capitalize'}>{displayText}</span>
      </span>
    );
  }

  if (variant === 'dot') {
    return (
      <span className={`status-badge inline-flex items-center ${config.gap} ${config.fontSize} font-medium text-[var(--text-primary)] ${className}`}>
        <span
          className={`${config.dotSize} rounded-full flex-shrink-0`}
          style={{ backgroundColor: colors.text }}
        />
        {resolvedIcon && <span className="inline-flex items-center">{resolvedIcon}</span>}
        <span className={label ? '' : 'capitalize'}>{displayText}</span>
      </span>
    );
  }

  if (variant === 'outline') {
    return (
      <span
        className={`status-badge inline-flex items-center justify-center ${config.gap} ${config.height} ${config.padding} rounded-md font-semibold ${config.fontSize} whitespace-nowrap transition-all bg-transparent ${className}`}
        style={{
          color: colors.text,
          border: `1.5px solid ${colors.border}`,
        }}
      >
        {resolvedIcon && <span className="inline-flex items-center">{resolvedIcon}</span>}
        <span className={label ? '' : 'capitalize'}>{displayText}</span>
      </span>
    );
  }

  return null;
}

export function ShipmentStatusBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'status'> & { status: ShipmentStatus }) {
  return <StatusBadge status={status} {...props} />;
}

export function PaymentStatusBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'status'> & { status: PaymentStatus }) {
  return <StatusBadge status={status} {...props} />;
}