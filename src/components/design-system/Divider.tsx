import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Divider Component
 *
 * Horizontal or vertical content separator with optional label.
 * Replaces direct MUI Divider usage. Zero MUI.
 */

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg' | 'none';
  label?: ReactNode;
  className?: string;
}

export default function Divider({
  orientation = 'horizontal',
  spacing = 'md',
  label,
  className,
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        aria-hidden="true"
        role="separator"
        aria-orientation="vertical"
        className={cn(
          'ds-divider-vertical w-px shrink-0 self-stretch bg-[var(--border)]',
          spacing === 'sm' && 'mx-1',
          spacing === 'md' && 'mx-2',
          spacing === 'lg' && 'mx-4',
          className
        )}
      />
    );
  }

  if (!label) {
    return (
      <hr
        className={cn(
          'ds-divider border-0 border-t border-t-[var(--border)]',
          spacing === 'sm' && 'my-2',
          spacing === 'md' && 'my-4',
          spacing === 'lg' && 'my-6',
          className
        )}
      />
    );
  }

  return (
    <div
      role="separator"
      className={cn(
        'ds-divider-labeled flex items-center gap-3',
        spacing === 'sm' && 'my-2',
        spacing === 'md' && 'my-4',
        spacing === 'lg' && 'my-6',
        className
      )}
    >
      <div aria-hidden="true" className="h-px flex-1 bg-[var(--border)]" />
      <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </span>
      <div aria-hidden="true" className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}
