import { ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface TableColumn<T> {
  header: string;
  accessor?: keyof T | ((row: T) => ReactNode);
  render?: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyField: keyof T;
  emptyMessage?: string;
  emptyTitle?: string;
  stickyHeader?: boolean;
  density?: 'comfortable' | 'compact';
}

export function Table<T extends Record<string, any>>({ 
  data, 
  columns, 
  keyField, 
  emptyMessage = 'No data available',
  emptyTitle = 'Nothing to show yet',
  stickyHeader = true,
  density: propDensity,
}: TableProps<T>) {
  const { density: globalDensity } = useTheme();
  const density = propDensity ?? globalDensity;
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-[var(--text-secondary)] border border-dashed border-[var(--border)] rounded-xl bg-[var(--background)]">
        <p className="text-sm font-bold text-[var(--text-primary)]">{emptyTitle}</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{emptyMessage}</p>
      </div>
    );
  }

  const verticalPadding = density === 'compact' ? 'py-2 px-4' : 'py-3 px-4';

  return (
    <div className="overflow-x-auto border border-[var(--border)] rounded-xl bg-[var(--panel)]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[var(--background)]">
            {columns.map((column, index) => (
              <th
                key={index}
                className={`${verticalPadding} text-${column.align || 'left'} text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border)] ${
                  stickyHeader ? 'sticky top-0 z-[1] bg-[var(--background)]' : ''
                }`}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr 
              key={String(row[keyField])} 
              className="border-t border-[var(--border)] transition-colors hover:bg-[rgba(var(--text-primary-rgb),0.02)]"
            >
              {columns.map((column, colIndex) => {
                let cellContent: ReactNode = null;
                
                if (column.render) {
                  cellContent = column.render(row);
                } else if (typeof column.accessor === 'function') {
                  cellContent = column.accessor(row);
                } else if (column.accessor) {
                  cellContent = row[column.accessor] as ReactNode;
                }

                return (
                  <td
                    key={colIndex}
                    className={`${verticalPadding} text-sm text-[var(--text-primary)] text-${column.align || 'left'} border-b border-[var(--border)]`}
                  >
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
