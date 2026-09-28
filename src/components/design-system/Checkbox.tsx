"use client";

import { ReactNode, useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Checkbox Component
 *
 * Labeled checkbox with error, indeterminate, and disabled states.
 * Replaces direct MUI Checkbox usage. Zero MUI.
 */

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  size?: 'sm' | 'md';
  id?: string;
  className?: string;
}

export default function Checkbox({
  checked,
  onChange,
  label,
  description,
  indeterminate = false,
  disabled = false,
  error = false,
  required = false,
  size = 'md',
  id,
  className,
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isChecked = indeterminate ? false : checked;
  const isActive = checked || indeterminate;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      htmlFor={id}
      className={cn(
        'ds-checkbox group flex cursor-pointer items-start gap-2.5',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="checkbox"
        checked={isChecked}
        disabled={disabled}
        required={required}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex shrink-0 items-center justify-center rounded-md border transition-all duration-200',
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
          'border-[var(--border)] bg-[var(--panel)]',
          'group-hover:border-[var(--accent-gold)]',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-gold)] peer-focus-visible:ring-offset-2',
          isActive && 'border-[var(--accent-gold)] bg-[var(--accent-gold)]',
          error && !isActive && 'border-[var(--error)]'
        )}
      >
        {indeterminate ? (
          <Minus
            className={cn(
              'text-[var(--text-primary)]',
              size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
            )}
            strokeWidth={3}
          />
        ) : (
          checked && (
            <Check
              className={cn(
                'text-[var(--text-primary)]',
                size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
              )}
              strokeWidth={3}
            />
          )
        )}
      </span>
      {(label || description) && (
        <span className="flex min-w-0 flex-col">
          {label && (
            <span
              className={cn(
                'font-medium text-[var(--text-primary)]',
                size === 'sm' ? 'text-xs' : 'text-sm'
              )}
            >
              {label}
              {required && <span className="ml-0.5 text-[var(--error)]">*</span>}
            </span>
          )}
          {description && (
            <span className="text-xs text-[var(--text-secondary)]">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}
