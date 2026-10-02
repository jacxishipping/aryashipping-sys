"use client";

import React, { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SelectProps {
  id?: string;
  label?: string;
  value: string | number;
  onChange: (value: any) => void;
  options: readonly SelectOption[] | readonly { readonly value: string | number; readonly label: string; readonly disabled?: boolean; readonly icon?: ReactNode; }[] | SelectOption[];
  placeholder?: string;
  helperText?: ReactNode;
  error?: boolean | string;
  required?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'sm' | 'md';
  className?: string;
}

export default function Select({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  helperText,
  error = false,
  required = false,
  disabled = false,
  leftIcon,
  fullWidth = true,
  size = 'medium',
  className = '',
}: SelectProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';
  const hasError = Boolean(error);
  const displayedHelperText = typeof error === 'string' && error ? error : helperText;
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const isSmall = size === 'small' || size === 'sm' || isCompact;

  return (
    <div className={`ds-select ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={selectId}
          className={`block font-medium text-[var(--text-primary)] ${
            isCompact ? 'text-xs mb-1' : 'text-sm mb-1.5'
          }`}
        >
          {label}
          {required && <span className="text-[var(--error)] ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}

        <select
          id={selectId}
          value={value}
          disabled={disabled}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-lg border text-sm text-[var(--text-primary)] bg-[var(--background)] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            leftIcon ? 'pl-9' : 'pl-3'
          } pr-9 ${isSmall ? 'py-1.5 text-xs' : 'py-2 text-sm'} ${
            hasError
              ? 'border-[var(--error)] bg-red-50/10 focus:ring-[var(--error)]'
              : 'border-[var(--border)] focus:ring-[var(--accent-gold)] focus:border-[var(--accent-gold)]'
          } ${className}`}
        >
          {placeholder && (
            <option value="" disabled className="text-[var(--text-secondary)] bg-[var(--panel)]">
              {placeholder}
            </option>
          )}
          {options.map((option: any) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="bg-[var(--panel)] text-[var(--text-primary)] py-1"
            >
              {option.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {displayedHelperText && (
        <p
          className={`mt-1 text-xs ${hasError ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'}`}
        >
          {displayedHelperText}
        </p>
      )}
    </div>
  );
}
