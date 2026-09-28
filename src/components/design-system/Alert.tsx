"use client";

import { Box, Typography, IconButton } from '@mui/material';
import { ReactNode } from 'react';
import { 
  CheckCircle, 
  Warning, 
  Error as ErrorIcon, 
  Info, 
  Close 
} from '@mui/icons-material';

/**
 * Alert Component
 * 
 * Display contextual feedback messages with appropriate styling.
 */

export type AlertSeverity = 'success' | 'warning' | 'error' | 'info';
export type AlertVariant = 'filled' | 'outlined' | 'subtle';

export interface AlertProps {
  severity?: AlertSeverity;
  variant?: AlertVariant;
  title?: string;
  message?: ReactNode;
  icon?: ReactNode | false;
  onClose?: () => void;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

// Severity configurations
const severityConfig = {
  success: {
    icon: <CheckCircle sx={{ fontSize: 20 }} />,
    color: 'var(--success)',
    bgColor: 'rgba(var(--success-rgb), 0.15)',
    borderColor: 'var(--success)',
    lightBg: 'var(--success-light)',
  },
  warning: {
    icon: <Warning sx={{ fontSize: 20 }} />,
    color: 'var(--warning)',
    bgColor: 'rgba(var(--warning-rgb), 0.15)',
    borderColor: 'var(--warning)',
    lightBg: 'var(--warning-light)',
  },
  error: {
    icon: <ErrorIcon sx={{ fontSize: 20 }} />,
    color: 'var(--error)',
    bgColor: 'rgba(var(--error-rgb), 0.15)',
    borderColor: 'var(--error)',
    lightBg: 'var(--error-light)',
  },
  info: {
    icon: <Info sx={{ fontSize: 20 }} />,
    color: 'var(--info)',
    bgColor: 'rgba(var(--info-rgb), 0.15)',
    borderColor: 'var(--info)',
    lightBg: 'var(--info-light)',
  },
};

export default function Alert({
  severity = 'info',
  variant = 'subtle',
  title,
  message,
  icon,
  onClose,
  action,
  className,
  children,
}: AlertProps) {
  const config = severityConfig[severity];
  const showIcon = icon !== false;
  const displayIcon = icon || config.icon;

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          bgcolor: config.color,
          color: '#FFFFFF',
          border: 'none',
        };
      case 'outlined':
        return {
          bgcolor: 'transparent',
          color: config.color,
          border: `1px solid ${config.borderColor}`,
        };
      case 'subtle':
      default:
        return {
          bgcolor: config.bgColor,
          color: config.color,
          border: `1px solid ${config.borderColor}`,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Box
      role="alert"
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: 2,
        borderRadius: 2,
        ...variantStyles,
      }}
    >
      {/* Icon */}
      {showIcon && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            color: variant === 'filled' ? '#FFFFFF' : config.color,
          }}
        >
          {displayIcon}
        </Box>
      )}

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {title && (
          <Typography
            sx={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              mb: message || children ? 0.5 : 0,
              color: variant === 'filled' ? '#FFFFFF' : 'var(--text-primary)',
            }}
          >
            {title}
          </Typography>
        )}
        {message && (
          <Typography
            sx={{
              fontSize: '0.875rem',
              lineHeight: 1.5,
              color: variant === 'filled' ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-secondary)',
            }}
          >
            {message}
          </Typography>
        )}
        {children && (
          <Box
            sx={{
              fontSize: '0.875rem',
              lineHeight: 1.5,
              color: variant === 'filled' ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-secondary)',
            }}
          >
            {children}
          </Box>
        )}
      </Box>

      {/* Action */}
      {action && (
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {action}
        </Box>
      )}

      {/* Close Button */}
      {onClose && (
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: variant === 'filled' ? 'rgba(255, 255, 255, 0.7)' : config.color,
            flexShrink: 0,
            mt: -0.5,
            mr: -0.5,
            '&:hover': {
              bgcolor: variant === 'filled' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      )}
    </Box>
  );
}
