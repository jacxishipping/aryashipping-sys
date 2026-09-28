"use client";

import { ChangeEvent, CSSProperties, InputHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

/**
 * FormField Component
 *
 * Labeled text input / textarea with icons, helper text, and error state.
 * Tailwind-native. Zero MUI.
 */

export interface FormFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'value' | 'onChange'> {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconClick?: () => void;
  multiline?: boolean;
  rows?: number;
  minRows?: number;
  maxRows?: number;
  size?: 'sm' | 'md' | 'small' | 'medium';
  fullWidth?: boolean;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  helperTextClassName?: string;
  value?: string | number | null;
  // Intersection (not union) so both input-only and textarea-only handlers stay assignable.
  onChange?: (event: ChangeEvent<HTMLInputElement> & ChangeEvent<HTMLTextAreaElement>) => void;
  // Ref passthrough for react-hook-form register() spreads.
  ref?: Ref<any>;
}

export default function FormField({
  label,
  helperText,
  error = false,
  leftIcon,
  rightIcon,
  onRightIconClick,
  multiline = false,
  rows,
  minRows,
  maxRows,
  size = 'md',
  fullWidth = true,
  inputClassName,
  inputStyle,
  helperTextClassName,
  className,
  style,
  id,
  required,
  disabled,
  value,
  onChange,
  ref,
  ...inputProps
}: FormFieldProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';
  const normalizedSize = size === 'small' ? 'sm' : size === 'medium' ? 'md' : size;
  const effectiveSize = isCompact && normalizedSize === 'md' ? 'sm' : normalizedSize;
  const helperTextId = id ? `${id}-helper-text` : undefined;
  const describedBy = [helperText ? helperTextId : undefined, inputProps['aria-describedby']]
    .filter(Boolean)
    .join(' ');

  const controlClass = cn(
    'w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-all duration-200',
    'placeholder:text-[var(--text-secondary)]',
    'disabled:cursor-not-allowed disabled:opacity-50',
    effectiveSize === 'sm' ? 'py-1.5 text-xs' : 'py-2.5 text-sm',
    leftIcon ? 'pl-9' : 'pl-3.5',
    rightIcon ? 'pr-9' : 'pr-3.5',
    multiline && 'leading-relaxed',
    error
      ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
      : 'border-[var(--border)] hover:border-[var(--accent-gold)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
    inputClassName
  );

  const controlStyle = {
    ...(multiline
      ? {
          minHeight: minRows ? `${minRows * 1.5}em` : undefined,
          maxHeight: maxRows ? `${maxRows * 1.5}em` : undefined,
        }
      : undefined),
    ...inputStyle,
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement> & ChangeEvent<HTMLTextAreaElement>
  ) => {
    onChange?.(event);
  };

  return (
    <div className={cn('ds-form-field', fullWidth && 'w-full', className)} style={style}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'mb-1 block font-medium',
            effectiveSize === 'sm' ? 'text-xs' : 'text-sm',
            error ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'
          )}
        >
          {label}
          {required && <span className="ml-0.5 text-[var(--error)]">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-[var(--text-secondary)] [&>svg]:h-4 [&>svg]:w-4">
            {leftIcon}
          </span>
        )}
        {multiline ? (
          <textarea
            ref={ref}
            id={id}
            rows={rows ?? minRows ?? 3}
            required={required}
            disabled={disabled}
            value={value ?? ''}
            onChange={handleChange}
            aria-describedby={describedBy || undefined}
            aria-invalid={error || undefined}
            className={controlClass}
            style={controlStyle}
            {...(inputProps as InputHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref}
            id={id}
            required={required}
            disabled={disabled}
            value={value ?? ''}
            onChange={handleChange}
            aria-describedby={describedBy || undefined}
            aria-invalid={error || undefined}
            className={controlClass}
            {...inputProps}
          />
        )}
        {rightIcon && (
          onRightIconClick ? (
            <button
              type="button"
              onClick={onRightIconClick}
              disabled={disabled}
              aria-label="Toggle input action"
              className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center rounded p-0.5 text-[var(--text-secondary)] outline-none transition-colors hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
            >
              <span className="flex items-center [&>svg]:h-4 [&>svg]:w-4">{rightIcon}</span>
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-[var(--text-secondary)] [&>svg]:h-4 [&>svg]:w-4">
              {rightIcon}
            </span>
          )
        )}
      </div>

      {helperText && (
        <p
          id={helperTextId}
          className={cn(
            'mt-1 text-xs',
            error ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]',
            helperTextClassName
          )}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
