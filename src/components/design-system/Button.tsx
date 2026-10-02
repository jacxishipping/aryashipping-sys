"use client";

import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

/**
 * Button Component
 * 
 * Standardized design system button with consistent variants, sizes, and states.
 */

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  component?: any;
  sx?: any;
}

const variantClasses = {
  primary: 'bg-[var(--accent-gold)] text-[var(--text-primary)] hover:opacity-90 disabled:opacity-50 disabled:bg-[rgba(var(--accent-gold-rgb),0.5)] shadow-sm font-semibold',
  secondary: 'bg-[var(--panel)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--background)] hover:border-[var(--accent-gold)] disabled:opacity-50',
  outline: 'bg-transparent text-[var(--text-primary)] border border-[var(--border)] hover:bg-[rgba(var(--border-rgb),0.1)] hover:border-[var(--accent-gold)] disabled:opacity-50',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--border-rgb),0.1)] disabled:opacity-50',
  danger: 'bg-[var(--error)] text-white hover:opacity-90 disabled:opacity-50 shadow-sm font-semibold',
};

const sizeClasses = {
  normal: {
    sm: 'text-xs px-2.5 py-1.5 h-8 gap-1.5 rounded-lg',
    md: 'text-sm px-3.5 py-2 h-10 gap-2 rounded-lg',
    lg: 'text-base px-4 py-2.5 h-12 gap-2.5 rounded-xl',
  },
  compact: {
    sm: 'text-[11px] px-2 py-1 h-6.5 gap-1 rounded-md',
    md: 'text-xs px-2.5 py-1.5 h-7.5 gap-1.5 rounded-md',
    lg: 'text-sm px-3 py-2 h-9 gap-2 rounded-lg',
  }
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
  className = '',
  href,
  target,
  rel,
  component,
  sx, // Ignored or mapped for backwards compatibility
  ...buttonProps
}: ButtonProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';
  const densityMode = isCompact ? 'compact' : 'normal';

  const baseClasses = [
    'ds-button inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
    fullWidth ? 'w-full' : '',
    variantClasses[variant],
    sizeClasses[densityMode][size],
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {loading && (
        <Loader2
          className={`animate-spin ${size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`}
        />
      )}
      {!loading && icon && iconPosition === 'start' && (
        <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === 'end' && (
        <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        className={baseClasses}
        aria-disabled={disabled || loading}
        tabIndex={disabled || loading ? -1 : undefined}
      >
        {content}
      </Link>
    );
  }

  const CustomComponent = component || 'button';

  return (
    <CustomComponent
      {...buttonProps}
      disabled={disabled || loading}
      className={baseClasses}
    >
      {content}
    </CustomComponent>
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
  className = '',
  ...props
}: IconButtonProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';

  const sizeClassesIcon = isCompact
    ? {
        sm: 'w-6 h-6 p-0',
        md: 'w-7.5 h-7.5 p-0',
        lg: 'w-9 h-9 p-0',
      }
    : {
        sm: 'w-8 h-8 p-0',
        md: 'w-10 h-10 p-0',
        lg: 'w-12 h-12 p-0',
      };

  return (
    <Button
      {...props}
      className={["ds-icon-button", sizeClassesIcon[size], className].filter(Boolean).join(" ")}
      size={size}
      aria-label={ariaLabel}
    >
      {icon}
    </Button>
  );
}
