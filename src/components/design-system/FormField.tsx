"use client";

import React, { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

export interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  label?: string;
  helperText?: ReactNode;
  error?: boolean | string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg';
  multiline?: boolean;
  rows?: number;
  minRows?: number;
  fullWidth?: boolean;
  onChange?: (e: any) => void;
  InputProps?: {
    startAdornment?: ReactNode;
    endAdornment?: ReactNode;
    [key: string]: any;
  };
  inputProps?: any;
  InputLabelProps?: any;
  FormHelperTextProps?: any;
  sx?: any;
}

export default function FormField({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  size = 'medium',
  multiline = false,
  rows = 3,
  minRows,
  fullWidth = true,
  className = '',
  id,
  required,
  disabled,
  onChange,
  InputProps,
  inputProps,
  InputLabelProps,
  FormHelperTextProps,
  sx, // Backwards compatibility
  ...restProps
}: FormFieldProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';
  const hasError = typeof error === 'string' ? Boolean(error) : Boolean(error);
  const displayedHelperText = typeof error === 'string' && error ? error : helperText;
  const inputId = id || (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const helperTextId = inputId ? `${inputId}-helper-text` : undefined;

  const startAdornment = leftIcon || InputProps?.startAdornment;
  const endAdornment = rightIcon || InputProps?.endAdornment;

  const isSmall = size === 'small' || size === 'sm' || isCompact;
  const effectiveRows = rows || minRows || 3;

  const baseInputClasses = [
    'w-full transition-all duration-200 rounded-lg border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed',
    startAdornment ? 'pl-9' : 'pl-3',
    endAdornment ? 'pr-9' : 'pr-3',
    isSmall ? 'py-1.5 text-xs' : 'py-2 text-sm',
    hasError
      ? 'border-[var(--error)] bg-red-50/10 focus:ring-[var(--error)]'
      : 'border-[var(--border)] bg-[var(--background)] focus:ring-[var(--accent-gold)] focus:border-[var(--accent-gold)]',
    className,
  ].filter(Boolean).join(' ');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className={`ds-form-field ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`block font-medium text-[var(--text-primary)] ${
            isCompact ? 'text-xs mb-1' : 'text-sm mb-1.5'
          }`}
        >
          {label}
          {required && <span className="text-[var(--error)] ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {startAdornment && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] flex items-center pointer-events-none">
            {startAdornment}
          </div>
        )}

        {multiline ? (
          <textarea
            id={inputId}
            rows={effectiveRows}
            disabled={disabled}
            required={required}
            onChange={handleChange}
            aria-invalid={hasError}
            aria-describedby={displayedHelperText ? helperTextId : undefined}
            className={baseInputClasses}
            {...(restProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            {...inputProps}
          />
        ) : (
          <input
            id={inputId}
            disabled={disabled}
            required={required}
            onChange={handleChange}
            aria-invalid={hasError}
            aria-describedby={displayedHelperText ? helperTextId : undefined}
            className={baseInputClasses}
            {...restProps}
            {...inputProps}
          />
        )}

        {endAdornment && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] flex items-center pointer-events-none">
            {endAdornment}
          </div>
        )}
      </div>

      {displayedHelperText && (
        <p
          id={helperTextId}
          className={`mt-1 text-xs ${hasError ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'}`}
        >
          {displayedHelperText}
        </p>
      )}
    </div>
  );
}
