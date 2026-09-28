import { Box, Typography } from '@mui/material';
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
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          color: 'var(--text-secondary)',
          border: '1px dashed var(--border)',
          borderRadius: 1.5,
          backgroundColor: 'var(--background)',
        }}
      >
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{emptyTitle}</Typography>
        <Typography sx={{ mt: 0.5, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{emptyMessage}</Typography>
      </Box>
    );
  }

  const verticalPadding = density === 'compact' ? '9px' : '12px';

  return (
    <Box
      sx={{
        overflowX: 'auto',
        border: '1px solid var(--border)',
        borderRadius: 1.5,
        backgroundColor: 'var(--panel)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--background)' }}>
            {columns.map((column, index) => (
              <th
                key={index}
                style={{
                  padding: `${verticalPadding} 16px`,
                  textAlign: column.align || 'left',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: column.width,
                  borderBottom: '1px solid var(--border)',
                  position: stickyHeader ? 'sticky' : 'static',
                  top: 0,
                  zIndex: 1,
                  backgroundColor: 'var(--background)',
                }}
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
              style={{ 
                borderTop: '1px solid var(--border)',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(var(--text-primary-rgb), 0.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
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
                    style={{
                      padding: `${verticalPadding} 16px`,
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      textAlign: column.align || 'left',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

