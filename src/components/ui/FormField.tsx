'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, AlertCircle } from 'lucide-react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isValid?: boolean;
  showValidation?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      helperText,
      isValid,
      showValidation = true,
      leftIcon,
      rightIcon,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `field-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const hasError = !!error;
    const showSuccess = isValid && showValidation && !hasError;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--text-primary)]"
          >
            {label}
            {props.required && <span className="text-[var(--error)] ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200',
              'text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]',
              'focus:outline-none focus:ring-2 focus:ring-offset-1',
              leftIcon && 'pl-10',
              (rightIcon || showValidation) && 'pr-10',
              hasError
                ? 'border-[var(--error)] bg-red-50/10 focus:ring-[var(--error)]'
                : showSuccess
                ? 'border-green-500 bg-green-50/10 focus:ring-green-500'
                : 'border-[var(--border)] bg-[var(--background)] focus:ring-[var(--accent-gold)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {showValidation && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {hasError ? (
                <X className="w-4 h-4 text-[var(--error)]" />
              ) : showSuccess ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : rightIcon ? (
                rightIcon
              ) : null}
            </div>
          )}
        </div>

        {error && (
          <div
            id={`${inputId}-error`}
            className="flex items-start gap-1.5 text-sm text-[var(--error)] animate-shake"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="text-sm text-[var(--text-secondary)]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
