"use client";

import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { ReactNode } from 'react';

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
  sx?: any;
  style?: React.CSSProperties;
}

export default function Alert({
  severity = 'info',
  variant = 'subtle',
  title,
  message,
  icon,
  onClose,
  action,
  className = '',
  children,
  style,
}: AlertProps) {
  const getDefaultIcon = () => {
    switch (severity) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[var(--success)]" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[var(--warning)]" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 flex-shrink-0 text-[var(--error)]" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 flex-shrink-0 text-[var(--info)]" />;
    }
  };

  const getVariantClasses = () => {
    switch (severity) {
      case 'success':
        return variant === 'filled'
          ? 'bg-[var(--success)] text-white'
          : variant === 'outlined'
          ? 'bg-transparent border border-[var(--success)] text-[var(--success)]'
          : 'bg-[rgba(var(--success-rgb),0.12)] border border-[rgba(var(--success-rgb),0.25)] text-[var(--text-primary)]';
      case 'warning':
        return variant === 'filled'
          ? 'bg-[var(--warning)] text-white'
          : variant === 'outlined'
          ? 'bg-transparent border border-[var(--warning)] text-[var(--warning)]'
          : 'bg-[rgba(var(--warning-rgb),0.12)] border border-[rgba(var(--warning-rgb),0.25)] text-[var(--text-primary)]';
      case 'error':
        return variant === 'filled'
          ? 'bg-[var(--error)] text-white'
          : variant === 'outlined'
          ? 'bg-transparent border border-[var(--error)] text-[var(--error)]'
          : 'bg-[rgba(var(--error-rgb),0.12)] border border-[rgba(var(--error-rgb),0.25)] text-[var(--text-primary)]';
      case 'info':
      default:
        return variant === 'filled'
          ? 'bg-[var(--info)] text-white'
          : variant === 'outlined'
          ? 'bg-transparent border border-[var(--info)] text-[var(--info)]'
          : 'bg-[rgba(var(--info-rgb),0.12)] border border-[rgba(var(--info-rgb),0.25)] text-[var(--text-primary)]';
    }
  };

  const showIcon = icon !== false;
  const displayIcon = icon || getDefaultIcon();

  return (
    <div
      role="alert"
      className={`alert-root flex items-start gap-3 p-4 rounded-xl text-sm ${getVariantClasses()} ${className}`}
      style={style}
    >
      {showIcon && <div className="mt-0.5">{displayIcon}</div>}
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-semibold text-sm mb-0.5">{title}</h5>}
        {message && <div className="text-xs leading-relaxed opacity-95">{message}</div>}
        {children && <div className="text-xs leading-relaxed opacity-95">{children}</div>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-black/10 transition-colors flex-shrink-0"
          aria-label="Close alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
