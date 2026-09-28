'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2, Download, Edit, Columns, Eye, Search, AlignJustify, ListFilter, X, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@mui/material';
import { EmptyState } from '@/components/design-system';
import { useTheme } from '@/hooks/useTheme';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  selectable?: boolean;
  enableColumnVisibility?: boolean;
  initialHiddenColumns?: string[];
  stickyHeader?: boolean;
  zebraStripes?: boolean;
  onRowClick?: (row: T) => void;
  onDelete?: (selectedIds: string[]) => void;
  onEdit?: (row: T) => void;
  renderRowActions?: (row: T) => React.ReactNode;
  onExport?: (selectedRows: T[]) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  bulkStatusOptions?: { value: string; label: string }[];
  onBulkStatusChange?: (selectedIds: string[], status: string) => void;
  currentPage?: number;
  totalPages?: number;
  getRowClassName?: (row: T, rowIndex: number) => string | undefined;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

type AriaSort = 'ascending' | 'descending' | 'none';

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  selectable = false,
  enableColumnVisibility = true,
  initialHiddenColumns = [],
  stickyHeader = true,
  zebraStripes = true,
  onRowClick,
  onDelete,
  onEdit,
  renderRowActions,
  onExport,
  onSelectionChange,
  bulkStatusOptions = [],
  onBulkStatusChange,
  currentPage,
  totalPages,
  getRowClassName,
  className,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    new Set(initialHiddenColumns)
  );
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const columnButtonRef = useRef<HTMLButtonElement | null>(null);
  const [bulkStatus, setBulkStatus] = useState('');
  const { density: globalDensity } = useTheme();
  const [localDensity, setLocalDensity] = useState<'compact' | 'comfortable' | null>(null);
  const density = localDensity ?? globalDensity;
  const setDensity = (d: 'compact' | 'comfortable') => setLocalDensity(d);
  const [mobileLayout, setMobileLayout] = useState<'cards' | 'table'>('cards');

  // Check if columns already declare an explicit actions column
  const hasExplicitActionsColumn = useMemo(() => {
    return columns.some(
      (col) =>
        col.key === 'actions' ||
        col.header?.toLowerCase() === 'actions' ||
        (col.key === 'id' && col.header?.toLowerCase() === 'actions')
    );
  }, [columns]);

  // Only render an auto-generated Actions column if NO explicit actions column is defined in columns,
  // AND the caller explicitly requested row actions via renderRowActions or onEdit
  const hasActionsColumn = !hasExplicitActionsColumn && Boolean(renderRowActions || onEdit);

  // Handle sorting
  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Sort data
  const visibleColumns = useMemo(() => {
    return columns.filter((column) => !hiddenColumns.has(column.key));
  }, [columns, hiddenColumns]);

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  const toggleColumnVisibility = (columnKey: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        if (columns.length - next.size <= 1) {
          return prev;
        }
        next.add(columnKey);
      }
      return next;
    });
  };

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(data.map((row) => String(row[keyField])));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    setSelectedIds(newSelectedIds);
    onSelectionChange?.(Array.from(newSelectedIds));
  };

  const isAllSelected = data.length > 0 && selectedIds.size === data.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  // Handle bulk actions
  const handleBulkDelete = () => {
    if (onDelete) {
      onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkExport = () => {
    if (onExport) {
      const selectedRows = data.filter((row) =>
        selectedIds.has(String(row[keyField]))
      );
      onExport(selectedRows);
    }
  };

  const handleBulkStatusUpdate = () => {
    if (!onBulkStatusChange || !bulkStatus) return;
    onBulkStatusChange(Array.from(selectedIds), bulkStatus);
    setBulkStatus('');
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-[var(--accent-gold)]" />
    ) : (
      <ArrowDown className="w-4 h-4 text-[var(--accent-gold)]" />
    );
  };

  const getAriaSort = (columnKey: string): AriaSort => {
    if (sortColumn !== columnKey || !sortDirection) {
      return 'none';
    }

    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  const getSortButtonLabel = (columnHeader: string, columnKey: string) => {
    if (sortColumn !== columnKey || !sortDirection) {
      return `Sort by ${columnHeader} ascending`;
    }

    if (sortDirection === 'asc') {
      return `Sort by ${columnHeader} descending`;
    }

    return `Clear sorting for ${columnHeader}`;
  };

  useEffect(() => {
    if (!isColumnMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        columnMenuRef.current &&
        !columnMenuRef.current.contains(target) &&
        columnButtonRef.current &&
        !columnButtonRef.current.contains(target)
      ) {
        setIsColumnMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnMenuOpen]);

  return (
    <div className={cn(density === 'compact' ? 'space-y-2' : 'space-y-4', className)}>
      {/* Table Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Mobile View Switcher (Cards vs Table) & Desktop Density Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Mobile View Switcher */}
          <div className="inline-flex sm:hidden items-center rounded-lg border border-[var(--border)] bg-[var(--panel)] p-0.5 text-xs text-[var(--text-secondary)] shadow-xs">
            <button
              type="button"
              onClick={() => setMobileLayout('cards')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all',
                mobileLayout === 'cards'
                  ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-xs'
                  : 'hover:text-[var(--text-primary)] hover:bg-[var(--background)]'
              )}
              title="Card view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileLayout('table')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all',
                mobileLayout === 'table'
                  ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-xs'
                  : 'hover:text-[var(--text-primary)] hover:bg-[var(--background)]'
              )}
              title="Table view"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          {/* Desktop Density Mode Switcher */}
          <div className="hidden sm:inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--panel)] p-0.5 text-xs text-[var(--text-secondary)] shadow-xs">
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all',
                density === 'compact'
                  ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-xs'
                  : 'hover:text-[var(--text-primary)] hover:bg-[var(--background)]'
              )}
              title="Compact row density"
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span>Compact</span>
            </button>
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all',
                density === 'comfortable'
                  ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-xs'
                  : 'hover:text-[var(--text-primary)] hover:bg-[var(--background)]'
              )}
              title="Comfortable row density"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Comfortable</span>
            </button>
          </div>
        </div>

        {/* Columns Customization */}
        {enableColumnVisibility && (
          <div className="relative">
            <button
              ref={columnButtonRef}
              onClick={() => setIsColumnMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--panel)] hover:bg-[var(--background)] transition-colors shadow-xs"
              type="button"
              aria-haspopup="menu"
              aria-expanded={isColumnMenuOpen}
            >
              <Columns className="h-3.5 w-3.5" />
              Columns
            </button>
            {isColumnMenuOpen && (
              <div
                ref={columnMenuRef}
                className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2 shadow-xl"
                role="menu"
              >
                {columns.map((column) => {
                  const isVisible = !hiddenColumns.has(column.key);
                  const isLastVisible = isVisible && visibleColumns.length === 1;
                  return (
                    <label
                      key={column.key}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--background)] cursor-pointer"
                    >
                      <Checkbox
                        checked={isVisible}
                        onChange={() => toggleColumnVisibility(column.key)}
                        size="small"
                        disabled={isLastVisible}
                        sx={{
                          p: 0.5,
                          color: 'var(--text-secondary)',
                          '&.Mui-checked': { color: 'var(--accent-gold)' },
                        }}
                      />
                      <span className="truncate">{column.header}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Dock */}
      {selectable && selectedIds.size > 0 && (
        <div className={cn(
          "fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center border border-[var(--border)] bg-[var(--panel)]/95 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 max-w-[calc(100vw-24px)] overflow-x-auto",
          density === 'compact' ? 'gap-2 rounded-xl px-3 py-1.5' : 'gap-3 rounded-2xl px-4 py-2.5'
        )}>
          <div className="flex items-center gap-2 pr-3 border-r border-[var(--border)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-gold)] text-[11px] font-bold text-black">
              {selectedIds.size}
            </span>
            <span className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            {onBulkStatusChange && bulkStatusOptions.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkStatus}
                  onChange={(event) => setBulkStatus(event.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
                >
                  <option value="">Status...</option>
                  {bulkStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkStatusUpdate}
                  disabled={!bulkStatus}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-black bg-[var(--accent-gold)] hover:brightness-105 rounded-lg transition-all disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            )}
            {onExport && (
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] bg-[var(--background)] hover:bg-[var(--border)] rounded-lg transition-colors border border-[var(--border)]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-[var(--error)] hover:bg-red-600 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={() => {
                setSelectedIds(new Set());
                onSelectionChange?.([]);
              }}
              className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors ml-1"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Card View (shown on mobile when mobileLayout === 'cards') */}
      {mobileLayout === 'cards' && (
        <div className="sm:hidden space-y-2.5">
          {selectable && sortedData.length > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--text-secondary)]">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isSomeSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  size="small"
                  sx={{
                    p: 0.2,
                    color: 'var(--text-secondary)',
                    '&.Mui-checked': { color: 'var(--accent-gold)' },
                    '&.MuiCheckbox-indeterminate': { color: 'var(--accent-gold)' },
                  }}
                />
                <span>Select All ({sortedData.length})</span>
              </label>
              {selectedIds.size > 0 && (
                <span className="text-[var(--accent-gold)] font-semibold">{selectedIds.size} selected</span>
              )}
            </div>
          )}

          {sortedData.length === 0 ? (
            <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--panel)]">
              <EmptyState
                icon={<Search />}
                title="No results found"
                description="Try adjusting your search or filters"
              />
            </div>
          ) : (
            sortedData.map((row, rowIndex) => {
              const rowId = String(row[keyField]);
              const isSelected = selectedIds.has(rowId);
              const customRowClassName = getRowClassName?.(row, rowIndex);

              // Find primary column (first non-action column), status column, and detail columns
              const nonActionColumns = visibleColumns.filter(
                (col) =>
                  col.key !== 'actions' &&
                  col.header?.toLowerCase() !== 'actions' &&
                  !(col.key === 'id' && col.header?.toLowerCase() === 'actions')
              );
              const primaryCol = nonActionColumns[0];
              const statusCol = nonActionColumns.find((col) => col.key.toLowerCase().includes('status'));
              const detailColumns = nonActionColumns.filter((col) => col !== primaryCol && col !== statusCol);

              return (
                <div
                  key={rowId}
                  data-row-id={rowId}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 shadow-xs transition-all",
                    onRowClick && "cursor-pointer active:scale-[0.99] active:bg-[var(--background)]",
                    isSelected
                      ? "border-[var(--accent-gold)] ring-1 ring-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5"
                      : "hover:border-[var(--border)]",
                    customRowClassName
                  )}
                >
                  {/* Card Header: Primary Identifier + Status / Selection */}
                  <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-[var(--border)]/60">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {selectable && (
                        <div onClick={(e) => e.stopPropagation()} className="-ml-1">
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                            size="small"
                            sx={{
                              p: 0.2,
                              color: 'var(--text-secondary)',
                              '&.Mui-checked': { color: 'var(--accent-gold)' },
                            }}
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-secondary)] block">
                          {primaryCol ? primaryCol.header : 'Item'}
                        </span>
                        <div className="font-semibold text-sm text-[var(--text-primary)] truncate">
                          {primaryCol
                            ? primaryCol.render
                              ? primaryCol.render(row[primaryCol.key], row)
                              : row[primaryCol.key] || '-'
                            : rowId}
                        </div>
                      </div>
                    </div>
                    {statusCol && (
                      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {statusCol.render ? (
                          statusCol.render(row[statusCol.key], row)
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--background)] border border-[var(--border)]">
                            {String(row[statusCol.key] || '')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Body: 2-Column Key-Value Grid */}
                  {detailColumns.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs py-1">
                      {detailColumns.map((col) => (
                        <div key={col.key} className="flex flex-col min-w-0">
                          <span className="text-[10px] font-medium text-[var(--text-secondary)] truncate">
                            {col.header}
                          </span>
                          <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                            {col.render
                              ? col.render(row[col.key], row)
                              : row[col.key] !== null && row[col.key] !== undefined
                              ? String(row[col.key])
                              : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  {hasActionsColumn && (
                    <div
                      className="mt-2.5 pt-2 border-t border-[var(--border)]/60 flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderRowActions ? (
                        renderRowActions(row)
                      ) : (
                        onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
                          >
                            <Edit className="w-3 h-3 text-[var(--accent-gold)]" />
                            <span>Edit</span>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Table */}
      <div className={cn(
        "overflow-x-auto border border-[var(--border)] rounded-lg",
        mobileLayout === 'cards' ? "hidden sm:block" : "block"
      )}>
        <table className="w-full">
          <thead
            className={cn(
              'bg-[var(--panel)] border-b border-[var(--border)]',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            <tr>
              {selectable && (
                <th className={cn("w-10 text-left", density === 'compact' ? 'px-2 py-1' : 'px-4 py-3')}>
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    size="small"
                    sx={{
                      p: density === 'compact' ? 0.1 : 0.5,
                      color: 'var(--text-secondary)',
                      '&.Mui-checked': {
                        color: 'var(--accent-gold)',
                      },
                      '&.MuiCheckbox-indeterminate': {
                        color: 'var(--accent-gold)',
                      },
                    }}
                  />
                </th>
              )}
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortable ? getAriaSort(column.key) : undefined}
                  className={cn(
                    'font-semibold text-[var(--text-primary)]',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    (!column.align || column.align === 'left') && 'text-left',
                    density === 'compact' ? 'px-2 py-1 text-xs' : 'px-4 py-3 text-sm',
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)]",
                        column.align === 'center' && 'justify-center',
                        column.align === 'right' && 'justify-end',
                        (!column.align || column.align === 'left') && 'justify-start'
                      )}
                      aria-label={getSortButtonLabel(column.header, column.key)}
                    >
                      <span>{column.header}</span>
                      {getSortIcon(column.key)}
                    </button>
                  ) : (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-1 py-0.5",
                        column.align === 'center' && 'justify-center',
                        column.align === 'right' && 'justify-end',
                        (!column.align || column.align === 'left') && 'justify-start'
                      )}
                    >
                      {column.header}
                    </div>
                  )}
                </th>
              ))}
              {hasActionsColumn && (
                <th
                  scope="col"
                  className={cn(
                    'w-28 text-right font-semibold text-[var(--text-primary)]',
                    density === 'compact' ? 'px-2 py-1 text-xs' : 'px-4 py-3 text-sm'
                  )}
                >
                  <span>Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-[var(--background)] divide-y divide-[var(--border)]">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + (hasActionsColumn ? 1 : 0)}
                  className="px-4 py-8"
                >
                  <EmptyState
                    icon={<Search />}
                    title="No results found"
                    description="Try adjusting your search or filters"
                  />
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => {
                const rowId = String(row[keyField]);
                const isSelected = selectedIds.has(rowId);
                const customRowClassName = getRowClassName?.(row, rowIndex);

                return (
                  <tr
                    key={rowId}
                    data-row-id={rowId}
                    className={cn(
                      'transition-colors',
                      zebraStripes && rowIndex % 2 === 1 && 'bg-[var(--panel)]/40',
                      onRowClick && 'cursor-pointer hover:bg-[var(--panel)]',
                      isSelected && 'bg-[var(--accent-gold)]/5',
                      customRowClassName
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className={cn(density === 'compact' ? 'px-2 py-0.5' : 'px-4 py-3')} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                          size="small"
                          sx={{
                            p: density === 'compact' ? 0.1 : 0.5,
                            color: 'var(--text-secondary)',
                            '&.Mui-checked': {
                              color: 'var(--accent-gold)',
                            },
                          }}
                        />
                      </td>
                    )}
                    {visibleColumns.map((column) => {
                      const isActionsCol =
                        column.key === 'actions' ||
                        column.header?.toLowerCase() === 'actions' ||
                        (column.key === 'id' && column.header?.toLowerCase() === 'actions');

                      return (
                        <td
                          key={column.key}
                          className={cn(
                            'text-[var(--text-primary)]',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right',
                            (!column.align || column.align === 'left') && 'text-left',
                            density === 'compact' ? 'px-2.5 py-1 text-xs' : 'px-4 py-3 text-sm',
                            column.className
                          )}
                          onClick={(e) => {
                            if (isActionsCol) {
                              e.stopPropagation();
                            }
                          }}
                        >
                          {column.render
                            ? column.render(row[column.key], row)
                            : row[column.key] || '-'}
                        </td>
                      );
                    })}
                    {hasActionsColumn && (
                      <td className={cn(density === 'compact' ? 'px-2 py-0.5' : 'px-4 py-3')} onClick={(e) => e.stopPropagation()}>
                        {renderRowActions ? (
                          renderRowActions(row)
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {onEdit && (
                              <button
                                type="button"
                                onClick={() => onEdit(row)}
                                className={cn(
                                  "rounded hover:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-colors inline-flex items-center justify-center",
                                  density === 'compact' ? 'p-1 min-h-[24px] min-w-[24px]' : 'p-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0'
                                )}
                                aria-label={`Edit row ${rowId}`}
                                title="Edit"
                              >
                                <Edit className={cn("text-[var(--text-secondary)]", density === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      {data.length > 0 && (
        <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <span>
            Showing {sortedData.length} results
            {typeof currentPage === 'number' && typeof totalPages === 'number' ? (
              <> | Page {currentPage} of {totalPages}</>
            ) : null}
          </span>
          {selectedIds.size > 0 && <span>{selectedIds.size} selected</span>}
        </div>
      )}
    </div>
  );
}
