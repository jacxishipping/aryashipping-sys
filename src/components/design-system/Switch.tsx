"use client";

import { ReactNode } from 'react';
import { Switch as HeadlessSwitch } from '@headlessui/react';
import { cn } from '@/lib/utils';

/**
 * Switch Component
 *
 * Toggle switch with label and description support.
 * Replaces direct MUI Switch usage. Zero MUI.
 */

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  id?: string;
  className?: string;
}

export default function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  id,
  className,
}: SwitchProps) {
  return (
    <div className={cn('ds-switch flex items-start gap-3', className)}>
      <HeadlessSwitch
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'group relative inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 outline-none',
          'focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
          checked
            ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]'
            : 'border-[var(--border)] bg-[rgba(var(--border-rgb),0.5)]'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block transform rounded-full bg-white shadow transition-transform duration-200',
            size === 'sm' ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]',
            checked
              ? size === 'sm'
                ? 'translate-x-[18px]'
                : 'translate-x-[24px]'
              : 'translate-x-[2px]'
          )}
        />
      </HeadlessSwitch>
      {(label || description) && (
        <span className="flex min-w-0 flex-col">
          {label && (
            <label
              htmlFor={id}
              className={cn(
                'cursor-pointer font-medium text-[var(--text-primary)]',
                size === 'sm' ? 'text-xs' : 'text-sm',
                disabled && 'cursor-not-allowed'
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <span className="text-xs text-[var(--text-secondary)]">{description}</span>
          )}
        </span>
      )}
    </div>
  );
}
