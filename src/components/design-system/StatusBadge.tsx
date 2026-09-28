"use client";

import { Anchor, AlertTriangle, CheckCircle2, Clock, Truck, XCircle } from 'lucide-react';
import { Box, Typography } from '@mui/material';
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
      return <CheckCircle2 width={10} height={10} />;
    case 'PENDING':
    case 'DISPATCHING':
      return <Clock width={10} height={10} />;
    case 'OVERDUE':
    case 'DELAYED':
      return <AlertTriangle width={10} height={10} />;
    case 'IN_TRANSIT':
    case 'IN_TRANSIT_TO_DESTINATION':
      return <Truck width={10} height={10} />;
    case 'AT_PORT':
    case 'ARRIVED_PORT':
      return <Anchor width={10} height={10} />;
    case 'CANCELLED':
      return <XCircle width={10} height={10} />;
    default:
      return null;
  }
}

// Status color mappings with enhanced contrast
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  // Shipment Statuses
  ON_HAND: {
    bg: 'rgba(16, 185, 129, 0.12)',
    text: 'var(--success-dark)', // Darker green for text
    border: 'var(--success)',
  },
  DISPATCHING: {
    bg: 'rgba(var(--status-yellow-rgb), 0.12)',
    text: 'var(--status-yellow-dark)',
    border: 'var(--status-yellow)',
  },
  IN_TRANSIT: {
    bg: 'rgba(var(--info-rgb), 0.12)',
    text: 'var(--info-dark)', // Darker blue for text
    border: 'var(--info)',
  },
  IN_TRANSIT_TO_DESTINATION: {
    bg: 'rgba(var(--status-violet-rgb), 0.12)',
    text: 'var(--status-violet-dark)',
    border: 'var(--status-violet)',
  },
  AT_PORT: {
    bg: 'rgba(var(--warning-rgb), 0.12)',
    text: 'var(--warning-dark)', // Darker amber for text
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
    text: 'var(--error-dark)', // Darker red
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
  // User Roles
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

// Format status text for display
function formatStatusText(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

// Size configurations
const sizeConfig = {
  sm: {
    fontSize: '0.6875rem',
    padding: '3px 10px',
    height: '22px',
    dotSize: '6px',
    gap: '4px',
  },
  md: {
    fontSize: '0.75rem',
    padding: '4px 12px',
    height: '24px',
    dotSize: '8px',
    gap: '6px',
  },
  lg: {
    fontSize: '0.8125rem',
    padding: '6px 16px',
    height: '28px',
    dotSize: '10px',
    gap: '8px',
  },
};

export default function StatusBadge({
  status,
  label,
  variant = 'default',
  size = 'md',
  icon,
  showIcon = false,
  className,
}: StatusBadgeProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';
  const badgeClassName = ["status-badge", className].filter(Boolean).join(" ");
  const normalizedStatus = status.toUpperCase().replace(/\s+/g, '_');
  const colors = statusColors[normalizedStatus] || statusColors.DEFAULT;
  const baseConfig = sizeConfig[size];
  const config = isCompact
    ? {
        ...baseConfig,
        fontSize: '0.6875rem',
        padding: '2px 8px',
        height: '20px',
        gap: '4px',
        dotSize: '6px',
      }
    : baseConfig;
  const resolvedIcon = showIcon ? getStatusIcon(normalizedStatus) : icon;
  const displayText = label || formatStatusText(status);

  // Default variant (filled background)
  if (variant === 'default') {
    return (
      <Box
        component="span"
        className={badgeClassName}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: config.gap,
          height: config.height,
          px: config.padding,
          borderRadius: isCompact ? '6px' : '12px',
          backgroundColor: colors.bg,
          border: '1px solid',
          borderColor: colors.border,
          fontSize: config.fontSize,
          fontWeight: 600,
          color: colors.text,
          whiteSpace: 'nowrap',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        {resolvedIcon && (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: `${parseFloat(config.fontSize) * 0.9}rem`,
              lineHeight: 1,
            }}
          >
            {resolvedIcon}
          </Box>
        )}
        <Typography
          component="span"
          sx={{
            fontSize: 'inherit',
            fontWeight: 'inherit',
            letterSpacing: '0.025em',
            lineHeight: 1,
            textTransform: label ? 'none' : 'capitalize',
          }}
        >
          {displayText}
        </Typography>
      </Box>
    );
  }

  // Dot variant (with colored dot)
  if (variant === 'dot') {
    return (
      <Box
        component="span"
        className={badgeClassName}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: config.gap,
          fontSize: config.fontSize,
          fontWeight: 500,
          color: 'var(--text-primary)',
        }}
      >
        <Box
          sx={{
            width: config.dotSize,
            height: config.dotSize,
            borderRadius: '50%',
            backgroundColor: colors.text,
            flexShrink: 0,
            boxShadow: `0 0 0 2px ${colors.bg}`,
          }}
        />
        {resolvedIcon && (
          <Box 
            sx={{ 
              display: 'flex', 
              fontSize: `${parseFloat(config.fontSize) * 0.9}rem`,
              color: colors.text,
              lineHeight: 1,
            }}
          >
            {resolvedIcon}
          </Box>
        )}
        <Typography
          component="span"
          sx={{
            fontSize: 'inherit',
            fontWeight: 'inherit',
            textTransform: label ? 'none' : 'capitalize',
            lineHeight: 1,
          }}
        >
          {displayText}
        </Typography>
      </Box>
    );
  }

  // Outline variant (bordered, no background)
  if (variant === 'outline') {
    return (
      <Box
        component="span"
        className={badgeClassName}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: config.gap,
          height: config.height,
          px: config.padding,
          borderRadius: isCompact ? '6px' : '12px',
          backgroundColor: 'transparent',
          border: '1.5px solid',
          borderColor: colors.border,
          fontSize: config.fontSize,
          fontWeight: 600,
          color: colors.text,
          whiteSpace: 'nowrap',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: colors.bg,
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        {resolvedIcon && (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontSize: `${parseFloat(config.fontSize) * 0.9}rem`,
              lineHeight: 1,
            }}
          >
            {resolvedIcon}
          </Box>
        )}
        <Typography
          component="span"
          sx={{
            fontSize: 'inherit',
            fontWeight: 'inherit',
            letterSpacing: '0.025em',
            textTransform: label ? 'none' : 'capitalize',
            lineHeight: 1,
          }}
        >
          {displayText}
        </Typography>
      </Box>
    );
  }

  return null;
}

// Convenience components for specific status types
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