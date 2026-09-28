'use client';

import { useState } from 'react';
import { X, Plus, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'isEmpty'
  | 'isNotEmpty';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: { label: string; value: string }[];
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
}

interface FilterBuilderProps {
  fields: FilterField[];
  onApply: (filters: FilterCondition[]) => void;
  onClear: () => void;
  className?: string;
}

const operators: { value: FilterOperator; label: string; types: string[] }[] = [
  { value: 'equals', label: 'Equals', types: ['text', 'number', 'date', 'select'] },
  { value: 'notEquals', label: 'Not equals', types: ['text', 'number', 'date', 'select'] },
  { value: 'contains', label: 'Contains', types: ['text'] },
  { value: 'notContains', label: 'Does not contain', types: ['text'] },
  { value: 'startsWith', label: 'Starts with', types: ['text'] },
  { value: 'endsWith', label: 'Ends with', types: ['text'] },
  { value: 'greaterThan', label: 'Greater than', types: ['number', 'date'] },
  { value: 'lessThan', label: 'Less than', types: ['number', 'date'] },
  { value: 'greaterThanOrEqual', label: 'Greater than or equal', types: ['number', 'date'] },
  { value: 'lessThanOrEqual', label: 'Less than or equal', types: ['number', 'date'] },
  { value: 'isEmpty', label: 'Is empty', types: ['text', 'number', 'date', 'select'] },
  { value: 'isNotEmpty', label: 'Is not empty', types: ['text', 'number', 'date', 'select'] },
];

export function FilterBuilder({ fields, onApply, onClear, className }: FilterBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);

  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: `${Date.now()}-${Math.random()}`,
      field: fields[0]?.key || '',
      operator: 'equals',
      value: '',
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleApply = () => {
    onApply(conditions.filter((c) => c.field && c.operator && (c.value || c.operator.includes('Empty'))));
    setIsOpen(false);
  };

  const handleClear = () => {
    setConditions([]);
    onClear();
    setIsOpen(false);
  };

  const getAvailableOperators = (fieldKey: string) => {
    const field = fields.find((f) => f.key === fieldKey);
    if (!field) return [];
    return operators.filter((op) => op.types.includes(field.type));
  };

  const renderValueInput = (condition: FilterCondition) => {
    // No input needed for isEmpty/isNotEmpty
    if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
      return null;
    }

    const field = fields.find((f) => f.key === condition.field);
    if (!field) return null;

    switch (field.type) {
      case 'select':
        return (
          <select
            value={condition.value}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            className="flex-1 px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
          >
            <option value="">Select...</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={condition.value}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            placeholder="Enter number"
            className="flex-1 px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={condition.value}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            className="flex-1 px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
          />
        );

      default:
        return (
          <input
            type="text"
            value={condition.value}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            placeholder="Enter value"
            className="flex-1 px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
          />
        );
    }
  };

  const activeFiltersCount = conditions.filter((c) => c.field && c.operator && (c.value || c.operator.includes('Empty'))).length;

  return (
    <div className={cn('relative', className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all',
          activeFiltersCount > 0
            ? 'bg-[var(--accent-gold)] text-white border-[var(--accent-gold)]'
            : 'bg-[var(--panel)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--accent-gold)]'
        )}
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeFiltersCount > 0 && (
          <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-full max-w-2xl z-50 bg-[var(--panel)] border border-[var(--border)] rounded-lg shadow-xl">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Filter Data
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-[var(--background)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              {conditions.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                  No filters added. Click "Add Filter" to get started.
                </p>
              ) : (
                conditions.map((condition) => (
                  <div
                    key={condition.id}
                    className="flex items-start gap-2 p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg"
                  >
                    {/* Field */}
                    <select
                      value={condition.field}
                      onChange={(e) => {
                        const newField = e.target.value;
                        const field = fields.find((f) => f.key === newField);
                        const availableOps = operators.filter((op) =>
                          field ? op.types.includes(field.type) : true
                        );
                        updateCondition(condition.id, {
                          field: newField,
                          operator: availableOps[0]?.value || 'equals',
                          value: '',
                        });
                      }}
                      className="w-32 px-3 py-2 text-sm bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                    >
                      {fields.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </select>

                    {/* Operator */}
                    <select
                      value={condition.operator}
                      onChange={(e) =>
                        updateCondition(condition.id, {
                          operator: e.target.value as FilterOperator,
                        })
                      }
                      className="w-40 px-3 py-2 text-sm bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                    >
                      {getAvailableOperators(condition.field).map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    {/* Value */}
                    {renderValueInput(condition)}

                    {/* Remove Button */}
                    <button
                      onClick={() => removeCondition(condition.id)}
                      className="p-2 rounded hover:bg-[var(--panel)] transition-colors flex-shrink-0"
                      title="Remove filter"
                    >
                      <X className="w-4 h-4 text-[var(--error)]" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
              <button
                onClick={addCondition}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--background)] rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Filter
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleApply}
                  className="px-4 py-2 text-sm font-medium text-white bg-[var(--accent-gold)] hover:bg-[#C99B2F] rounded-lg transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to apply filters to data
export function applyFilters<T extends Record<string, any>>(
  data: T[],
  filters: FilterCondition[]
): T[] {
  return data.filter((item) => {
    return filters.every((filter) => {
      const value = item[filter.field];
      const filterValue = filter.value;

      switch (filter.operator) {
        case 'equals':
          return String(value).toLowerCase() === filterValue.toLowerCase();
        case 'notEquals':
          return String(value).toLowerCase() !== filterValue.toLowerCase();
        case 'contains':
          return String(value).toLowerCase().includes(filterValue.toLowerCase());
        case 'notContains':
          return !String(value).toLowerCase().includes(filterValue.toLowerCase());
        case 'startsWith':
          return String(value).toLowerCase().startsWith(filterValue.toLowerCase());
        case 'endsWith':
          return String(value).toLowerCase().endsWith(filterValue.toLowerCase());
        case 'greaterThan':
          return Number(value) > Number(filterValue);
        case 'lessThan':
          return Number(value) < Number(filterValue);
        case 'greaterThanOrEqual':
          return Number(value) >= Number(filterValue);
        case 'lessThanOrEqual':
          return Number(value) <= Number(filterValue);
        case 'isEmpty':
          return !value || String(value).trim() === '';
        case 'isNotEmpty':
          return !!value && String(value).trim() !== '';
        default:
          return true;
      }
    });
  });
}
