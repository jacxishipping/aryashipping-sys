'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface FormTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCharCount?: boolean;
}

export const FormTextArea = forwardRef<HTMLTextAreaElement, FormTextAreaProps>(
  (
    {
      label,
      error,
      helperText,
      showCharCount,
      className,
      id,
      maxLength,
      value,
      ...props
    },
    ref
  ) => {
    const inputId = id || `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const hasError = !!error;
    const currentLength = typeof value === 'string' ? value.length : 0;

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

        <textarea
          ref={ref}
          id={inputId}
          value={value}
          maxLength={maxLength}
          className={cn(
            'w-full px-3 py-2 rounded-lg border transition-all duration-200',
            'text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            'resize-vertical min-h-[100px]',
            hasError
              ? 'border-[var(--error)] bg-red-50/10 focus:ring-[var(--error)]'
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

        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
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

          {showCharCount && maxLength && (
            <span
              className={cn(
                'text-sm tabular-nums',
                currentLength > maxLength * 0.9
                  ? 'text-[var(--error)]'
                  : 'text-[var(--text-secondary)]'
              )}
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

FormTextArea.displayName = 'FormTextArea';
