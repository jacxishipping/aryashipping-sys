"use client";

import { ReactNode } from 'react';
import { Tab, TabGroup, TabList } from '@headlessui/react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

/**
 * Tabs Component
 *
 * Controlled tab navigation with underline, pill, and segmented variants.
 * Replaces direct MUI Tabs/Tab usage. Zero MUI.
 */

export interface TabItem {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  count?: number | string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'underline' | 'pill' | 'segmented';
  size?: 'sm' | 'md';
  className?: string;
}

export default function Tabs({
  items,
  value,
  onChange,
  variant = 'underline',
  size = 'md',
  className,
}: TabsProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';
  const effectiveSize = isCompact && size === 'md' ? 'sm' : size;
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value)
  );

  return (
    <TabGroup
      selectedIndex={selectedIndex}
      onChange={(index) => {
        const item = items[index];
        if (item && !item.disabled) onChange(item.value);
      }}
    >
      <TabList
        className={cn(
          'ds-tabs flex gap-1',
          variant === 'underline' && 'border-b border-[var(--border)]',
          variant === 'segmented' &&
            'w-fit rounded-xl border border-[var(--border)] bg-[var(--background)] p-1',
          className
        )}
      >
        {items.map((item) => (
          <Tab
            key={item.value}
            disabled={item.disabled}
            className={cn(
              'ds-tab group relative flex items-center gap-2 font-semibold outline-none transition-all duration-200',
              'focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-40',
              effectiveSize === 'sm'
                ? 'px-2.5 py-1.5 text-xs'
                : 'px-4 py-3 text-sm',
              variant === 'underline' &&
                '-mb-px border-b-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] data-[selected]:border-[var(--accent-gold)] data-[selected]:text-[var(--text-primary)]',
              variant === 'pill' &&
                'rounded-lg text-[var(--text-secondary)] hover:bg-[rgba(var(--border-rgb),0.35)] hover:text-[var(--text-primary)] data-[selected]:bg-[rgba(var(--accent-gold-rgb),0.15)] data-[selected]:text-[var(--text-primary)]',
              variant === 'segmented' &&
                'rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] data-[selected]:bg-[var(--panel)] data-[selected]:text-[var(--text-primary)] data-[selected]:shadow-sm'
            )}
          >
            {item.icon && (
              <span className="flex shrink-0 items-center [&>svg]:h-4 [&>svg]:w-4">
                {item.icon}
              </span>
            )}
            <span className="whitespace-nowrap">{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none',
                  'bg-[rgba(var(--border-rgb),0.5)] text-[var(--text-secondary)]',
                  'group-data-[selected]:bg-[rgba(var(--accent-gold-rgb),0.25)] group-data-[selected]:text-[var(--text-primary)]'
                )}
              >
                {item.count}
              </span>
            )}
          </Tab>
        ))}
      </TabList>
    </TabGroup>
  );
}
