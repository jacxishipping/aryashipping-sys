"use client";

import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material';
import { ReactNode } from 'react';
import Link from 'next/link';
import { useTheme } from '@/hooks/useTheme';

/**
 * Button Component
 * 
 * Standardized button with consistent variants, sizes, and states.
 * Replaces ActionButton with more complete API.
 */

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  href?: string;
  target?: string;
  rel?: string;
}

// Variant configurations
const variantStyles = {
  primary: {
    bgcolor: 'var(--accent-gold)',
    // Dark text on gold for WCAG AA contrast (light text on #D4AF37 is only ~2.1:1)
    color: 'var(--text-primary)',
    border: 'none',
    '&:hover': {
      bgcolor: 'var(--accent-gold)',
      opacity: 0.9,
    },
    '&:disabled': {
      bgcolor: 'rgba(var(--accent-gold-rgb), 0.5)',
      color: 'rgba(var(--text-primary-rgb), 0.7)',
    },
  },
  secondary: {
    bgcolor: 'var(--panel)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    '&:hover': {
      bgcolor: 'var(--background)',
      borderColor: 'var(--accent-gold)',
    },
    '&:disabled': {
      bgcolor: 'var(--panel)',
      opacity: 0.5,
    },
  },
  outline: {
    bgcolor: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    '&:hover': {
      bgcolor: 'rgba(var(--border-rgb), 0.1)',
      borderColor: 'var(--accent-gold)',
    },
    '&:disabled': {
      opacity: 0.5,
    },
  },
  ghost: {
    bgcolor: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    '&:hover': {
      bgcolor: 'rgba(var(--border-rgb), 0.1)',
      color: 'var(--text-primary)',
    },
    '&:disabled': {
      opacity: 0.5,
    },
  },
  danger: {
    bgcolor: 'var(--error)',
    color: '#FFFFFF',
    border: 'none',
    '&:hover': {
      bgcolor: 'var(--error)',
      opacity: 0.9,
    },
    '&:disabled': {
      bgcolor: 'rgba(var(--error-rgb), 0.5)',
      color: 'rgba(255, 255, 255, 0.7)',
    },
  },
};

// Size configurations
const sizeStyles = {
  sm: {
    fontSize: '0.75rem',
    px: 2,
    py: 0.75,
    height: '32px',
  },
  md: {
    fontSize: '0.875rem',
    px: 2.5,
    py: 1,
    height: '40px',
  },
  lg: {
    fontSize: '1rem',
    px: 3,
    py: 1.25,
    height: '48px',
  },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'start',
  fullWidth = false,
  children,
  disabled,
  ...buttonProps
}: ButtonProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';

  const sizeStyles = isCompact
    ? {
        sm: {
          fontSize: '0.7rem',
          px: 1.25,
          py: 0.25,
          height: '26px',
        },
        md: {
          fontSize: '0.75rem',
          px: 1.5,
          py: 0.5,
          height: '30px',
        },
        lg: {
          fontSize: '0.85rem',
          px: 2,
          py: 0.75,
          height: '36px',
        },
      }
    : {
        sm: {
          fontSize: '0.75rem',
          px: 2,
          py: 0.75,
          height: '32px',
        },
        md: {
          fontSize: '0.875rem',
          px: 2.5,
          py: 1,
          height: '40px',
        },
        lg: {
          fontSize: '1rem',
          px: 3,
          py: 1.25,
          height: '48px',
        },
      };

  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isLink = Boolean(buttonProps.href);
  const Component = (buttonProps.component || (isLink ? Link : 'button')) as React.ElementType;

  return (
    <MuiButton
      {...buttonProps}
      component={Component}
      className={["ds-button", buttonProps.className].filter(Boolean).join(" ")}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      startIcon={!loading && icon && iconPosition === 'start' ? icon : undefined}
      endIcon={!loading && icon && iconPosition === 'end' ? icon : undefined}
      sx={{
        textTransform: 'none',
        textDecoration: isLink ? 'none' : undefined,
        fontWeight: 600,
        borderRadius: isCompact ? 1.5 : 2,
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        ...variantStyle,
        ...sizeStyle,
        // Micro-interactions
        '&:active:not(:disabled)': {
          transform: 'scale(0.98)',
        },
        '&:hover:not(:disabled)': {
          transform: 'translateY(-1px)',
        },
        ...buttonProps.sx,
      }}
    >
      {loading && (
        <CircularProgress
          size={size === 'sm' ? 12 : size === 'md' ? 14 : 16}
          sx={{
            color: 'inherit',
            mr: 1,
          }}
        />
      )}
      {children}
    </MuiButton>
  );
}

// Icon-only button variant
export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: ReactNode;
  ariaLabel: string;
}

export function IconButton({
  icon,
  ariaLabel,
  size = 'md',
  ...props
}: IconButtonProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';

  const sizeConfig = isCompact
    ? {
        sm: { width: '24px', height: '24px', p: 0 },
        md: { width: '28px', height: '28px', p: 0 },
        lg: { width: '34px', height: '34px', p: 0 },
      }
    : {
        sm: { width: '32px', height: '32px', p: 0 },
        md: { width: '40px', height: '40px', p: 0 },
        lg: { width: '48px', height: '48px', p: 0 },
      };

  return (
    <Button
      {...props}
      className={["ds-icon-button", props.className].filter(Boolean).join(" ")}
      size={size}
      aria-label={ariaLabel}
      sx={{
        minWidth: 'unset',
        ...sizeConfig[size],
        ...props.sx,
      }}
    >
      {icon}
    </Button>
  );
}
