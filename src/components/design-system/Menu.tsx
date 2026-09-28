"use client";

import { Fragment, ReactNode } from 'react';
import Link from 'next/link';
import { Menu as HeadlessMenu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

/**
 * Menu Component
 *
 * Dropdown action menu with items, icons, danger state, and dividers.
 * Replaces direct MUI Menu/MenuItem usage. Zero MUI.
 */

export interface MenuItemData {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  dividerBefore?: boolean;
  onClick?: () => void;
  href?: string;
}

export interface MenuProps {
  /** Content rendered inside the trigger button (not an interactive element itself). */
  trigger: ReactNode;
  items: MenuItemData[];
  align?: 'left' | 'right';
  triggerClassName?: string;
  triggerAriaLabel?: string;
  menuClassName?: string;
  className?: string;
}

export default function Menu({
  trigger,
  items,
  align = 'right',
  triggerClassName,
  triggerAriaLabel = 'Open menu',
  menuClassName,
  className,
}: MenuProps) {
  const { density } = useTheme();
  const isCompact = density === 'compact';

  return (
    <HeadlessMenu as="div" className={cn('ds-menu relative inline-block text-left', className)}>
      <MenuButton
        aria-label={triggerAriaLabel}
        className={cn(
          'inline-flex items-center justify-center rounded-lg outline-none transition-colors duration-200',
          'hover:bg-[rgba(var(--border-rgb),0.35)]',
          'focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2',
          triggerClassName
        )}
      >
        {trigger}
      </MenuButton>

      <MenuItems
        transition
        anchor={align === 'right' ? 'bottom end' : 'bottom start'}
        className={cn(
          'ds-menu-items z-[var(--z-dropdown,1100)] min-w-44 origin-top rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_12px_28px_rgba(var(--text-primary-rgb),0.12),0_4px_8px_rgba(var(--text-primary-rgb),0.08)] outline-none transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0',
          isCompact ? 'p-0.5' : 'p-1',
          menuClassName
        )}
      >
        {items.map((item) => (
          <Fragment key={item.key}>
            {item.dividerBefore && (
              <div aria-hidden="true" className="mx-2 my-1 h-px bg-[var(--border)]" />
            )}
            <MenuItem disabled={item.disabled}>
              {({ focus }) => {
                const itemClass = cn(
                  'group flex w-full items-center gap-2.5 rounded-lg font-medium outline-none transition-colors duration-150',
                  isCompact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm',
                  item.danger
                    ? 'text-[var(--error)]'
                    : 'text-[var(--text-primary)]',
                  focus && !item.disabled &&
                    (item.danger
                      ? 'bg-[rgba(var(--error-rgb),0.08)]'
                      : 'bg-[rgba(var(--accent-gold-rgb),0.1)]'),
                  item.disabled && 'cursor-not-allowed opacity-40'
                );
                const content = (
                  <>
                    {item.icon && (
                      <span
                        className={cn(
                          'flex shrink-0 items-center',
                          item.danger
                            ? 'text-[var(--error)]'
                            : 'text-[var(--text-secondary)]',
                          '[&>svg]:h-4 [&>svg]:w-4'
                        )}
                      >
                        {item.icon}
                      </span>
                    )}
                    <span className="truncate">{item.label}</span>
                  </>
                );
                return item.href && !item.disabled ? (
                  <Link href={item.href} className={itemClass} onClick={item.onClick}>
                    {content}
                  </Link>
                ) : (
                  <button type="button" className={itemClass} onClick={item.onClick}>
                    {content}
                  </button>
                );
              }}
            </MenuItem>
          </Fragment>
        ))}
      </MenuItems>
    </HeadlessMenu>
  );
}
