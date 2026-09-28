"use client";

import { ReactNode, useMemo, useState } from 'react';
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

/**
 * Autocomplete Component
 *
 * Searchable select with local filtering or server-side search mode.
 * Replaces direct MUI Autocomplete usage. Zero MUI.
 */

export interface AutocompleteOption {
  value: string | number;
  label: string;
  hint?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface AutocompleteProps {
  id?: string;
  label?: ReactNode;
  value: AutocompleteOption | null;
  onChange: (value: AutocompleteOption | null) => void;
  options: AutocompleteOption[];
  onInputChange?: (query: string) => void;
  /** When true, options are provided by the caller (server search); disables local filtering. */
  serverSide?: boolean;
  loading?: boolean;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  clearable?: boolean;
  emptyText?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

export default function Autocomplete({
  id,
  label,
  value,
  onChange,
  options,
  onInputChange,
  serverSide = false,
  loading = false,
  placeholder = 'Search...',
  helperText,
  error = false,
  required = false,
  disabled = false,
  leftIcon,
  clearable = true,
  emptyText = 'No results found',
  size = 'md',
  fullWidth = true,
  className,
}: AutocompleteProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';
  const effectiveSize = isCompact && size === 'md' ? 'sm' : size;
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (serverSide || query.trim() === '') return options;
    const q = query.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        (option.hint && option.hint.toLowerCase().includes(q))
    );
  }, [options, query, serverSide]);

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    onInputChange?.(event.target.value);
  };

  return (
    <div className={cn('ds-autocomplete', fullWidth && 'w-full', className)}>
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

      <Combobox
        value={value}
        onChange={(option) => {
          onChange(option);
          setQuery('');
        }}
        disabled={disabled}
      >
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 z-10 flex -translate-y-1/2 items-center text-[var(--text-secondary)] [&>svg]:h-4 [&>svg]:w-4">
              {leftIcon}
            </span>
          )}
          <ComboboxInput
            id={id}
            displayValue={(option: AutocompleteOption | null) => option?.label ?? ''}
            onChange={handleQueryChange}
            placeholder={placeholder}
            autoComplete="off"
            className={cn(
              'w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-all duration-200',
              'placeholder:text-[var(--text-secondary)]',
              effectiveSize === 'sm' ? 'py-1.5 text-xs' : 'py-2.5 text-sm',
              leftIcon ? 'pl-9' : 'pl-3.5',
              'pr-16',
              error
                ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
                : 'border-[var(--border)] hover:border-[var(--accent-gold)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          />
          <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text-secondary)]" />
            ) : (
              clearable &&
              (value || query) &&
              !disabled && (
                <button
                  type="button"
                  aria-label="Clear selection"
                  onClick={() => {
                    onChange(null);
                    setQuery('');
                    onInputChange?.('');
                  }}
                  className="rounded p-1 text-[var(--text-secondary)] outline-none transition-colors hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )
            )}
            <ComboboxButton
              aria-label="Toggle options"
              className="rounded p-1 text-[var(--text-secondary)] outline-none transition-colors hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
            >
              <ChevronDown className="h-4 w-4" />
            </ComboboxButton>
          </span>

          <ComboboxOptions
            anchor="bottom start"
            className={cn(
              'ds-autocomplete-options z-[var(--z-dropdown,1100)] w-[var(--input-width)] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_12px_28px_rgba(var(--text-primary-rgb),0.12),0_4px_8px_rgba(var(--text-primary-rgb),0.08)] outline-none [--anchor-gap:4px]',
              'max-h-60 p-1',
              'empty:invisible'
            )}
          >
            {filtered.length === 0 && !loading ? (
              <p className="px-3 py-2.5 text-sm text-[var(--text-secondary)]">{emptyText}</p>
            ) : (
              filtered.map((option) => (
                <ComboboxOption
                  key={option.value}
                  value={option}
                  disabled={option.disabled}
                  className={cn(
                    'group flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none transition-colors',
                    'text-[var(--text-primary)]',
                    'data-[focus]:bg-[rgba(var(--accent-gold-rgb),0.12)]',
                    'data-[selected]:bg-[rgba(var(--accent-gold-rgb),0.15)]',
                    'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40'
                  )}
                >
                  {option.icon && (
                    <span className="flex shrink-0 items-center text-[var(--text-secondary)] [&>svg]:h-4 [&>svg]:w-4">
                      {option.icon}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{option.label}</span>
                    {option.hint && (
                      <span className="truncate text-xs text-[var(--text-secondary)]">
                        {option.hint}
                      </span>
                    )}
                  </span>
                  <Check className="hidden h-4 w-4 shrink-0 text-[var(--accent-gold)] group-data-[selected]:block" />
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </div>
      </Combobox>

      {helperText && (
        <p
          className={cn(
            'mt-1 text-xs',
            error ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'
          )}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
