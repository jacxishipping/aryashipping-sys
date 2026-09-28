'use client';

import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface CardField {
  label: string;
  value: React.ReactNode;
  primary?: boolean;
}

interface MobileCardViewProps<T> {
  data: T[];
  renderCard: (item: T) => CardField[];
  onItemClick?: (item: T) => void;
  keyField: keyof T;
  emptyMessage?: string;
  className?: string;
}

export function MobileCardView<T extends Record<string, any>>({
  data,
  renderCard,
  onItemClick,
  keyField,
  emptyMessage = 'No items found',
  className,
}: MobileCardViewProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--panel)] flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-[var(--text-secondary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 lg:hidden', className)}>
      {data.map((item) => {
        const fields = renderCard(item);
        const primaryField = fields.find((f) => f.primary);
        const otherFields = fields.filter((f) => !f.primary);

        return (
          <div
            key={String(item[keyField])}
            onClick={() => onItemClick?.(item)}
            className={cn(
              'bg-[var(--panel)] border border-[var(--border)] rounded-lg overflow-hidden transition-all',
              onItemClick && 'cursor-pointer hover:border-[var(--accent-gold)] hover:shadow-md active:scale-[0.99]'
            )}
          >
            {/* Primary field (header) */}
            {primaryField && (
              <div className="px-4 py-3 bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
                    {primaryField.label}
                  </p>
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {primaryField.value}
                  </div>
                </div>
                {onItemClick && (
                  <ChevronRight className="w-5 h-5 text-[var(--text-secondary)] flex-shrink-0 ml-2" />
                )}
              </div>
            )}

            {/* Other fields */}
            <div className="px-4 py-3 space-y-3">
              {otherFields.map((field, index) => (
                <div key={index} className="flex items-start justify-between gap-4">
                  <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide flex-shrink-0">
                    {field.label}
                  </span>
                  <div className="text-sm text-[var(--text-primary)] text-right flex-1 min-w-0">
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Responsive wrapper that shows table on desktop and cards on mobile
interface ResponsiveDataViewProps<T> {
  data: T[];
  TableComponent: React.ComponentType<any>;
  tableProps: any;
  renderMobileCard: (item: T) => CardField[];
  keyField: keyof T;
  onItemClick?: (item: T) => void;
}

export function ResponsiveDataView<T extends Record<string, any>>({
  data,
  TableComponent,
  tableProps,
  renderMobileCard,
  keyField,
  onItemClick,
}: ResponsiveDataViewProps<T>) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <TableComponent {...tableProps} />
      </div>

      {/* Mobile Card View */}
      <MobileCardView
        data={data}
        renderCard={renderMobileCard}
        onItemClick={onItemClick}
        keyField={keyField}
      />
    </>
  );
}

export type { CardField };
