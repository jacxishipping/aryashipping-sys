'use client';

import { useMemo, type ReactNode } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Button, FormField, Select, Tooltip, Skeleton, SkeletonGroup } from '@/components/design-system';
import {
  DEFAULT_SHIPPING_RATE_CONFIG,
  US_STATES,
  type VehicleRateMultiplier,
} from '@/lib/shipping-rate-calculator';
import type { ComparisonSortKey } from '@/lib/company-price-comparison';
import type { ComparisonDisplayMode } from '@/lib/company-price-comparison-presets';
import { Skeleton, SkeletonGroup } from '@/components/design-system';

type CompanyOption = {
  id: string;
  name: string;
  hasPriceList: boolean;
  destinationLabel: string;
  activePriceList?: {
    name?: string;
    createdAt?: string;
  } | null;
};

export type ComparisonFiltersState = {
  typeFilter: 'ALL' | 'SHIPPING' | 'DISPATCH' | 'TRANSIT';
  search: string;
  stateFilter: string;
  destinationFilter: string;
  vehicleTypeId: string;
  referenceCompanyId: string;
  displayMode: ComparisonDisplayMode;
  sortBy: ComparisonSortKey;
  minSpread: string;
  differencesOnly: boolean;
  onlyWithPriceLists: boolean;
  completeCoverageOnly: boolean;
};

export type ComparisonFilterPanel = 'filters' | 'companies' | 'all';

type CompanyPriceComparisonFiltersProps = {
  companies: CompanyOption[];
  selectedCompanyIds: string[];
  visibleCompanyCount: number;
  loading: boolean;
  destinationOptions: string[];
  visibleCompanies: { id: string; name: string }[];
  filters: ComparisonFiltersState;
  panel?: ComparisonFilterPanel;
  showActiveChips?: boolean;
  onFilterChange: <K extends keyof ComparisonFiltersState>(key: K, value: ComparisonFiltersState[K]) => void;
  onToggleCompany: (companyId: string) => void;
  onSelectAllCompanies: () => void;
  onClearCompanySelection: () => void;
};

export function countActiveFilters(filters: ComparisonFiltersState) {
  let count = 0;
  if (filters.typeFilter !== 'ALL') count += 1;
  if (filters.search.trim()) count += 1;
  if (filters.stateFilter) count += 1;
  if (filters.destinationFilter) count += 1;
  if (filters.referenceCompanyId) count += 1;
  if (filters.displayMode !== 'absolute' && filters.referenceCompanyId) count += 1;
  if (filters.sortBy !== 'spread-desc') count += 1;
  if (filters.minSpread.trim()) count += 1;
  if (filters.differencesOnly) count += 1;
  if (!filters.onlyWithPriceLists) count += 1;
  if (filters.completeCoverageOnly) count += 1;
  return count;
}

const vehicleTypes = DEFAULT_SHIPPING_RATE_CONFIG.vehicleTypes;

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
        {title}
      </div>
      {children}
    </div>
  );
}

export default function CompanyPriceComparisonFilters({
  companies,
  selectedCompanyIds,
  visibleCompanyCount,
  loading,
  destinationOptions,
  visibleCompanies,
  filters,
  panel = 'all',
  showActiveChips = true,
  onFilterChange,
  onToggleCompany,
  onSelectAllCompanies,
  onClearCompanySelection,
}: CompanyPriceComparisonFiltersProps) {
  const showFilterFields = panel === 'filters' || panel === 'all';
  const showCompanySelection = panel === 'companies' || panel === 'all';

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onDelete: () => void }[] = [];

    if (filters.typeFilter !== 'ALL') {
      chips.push({
        key: 'type',
        label: `Type: ${filters.typeFilter}`,
        onDelete: () => onFilterChange('typeFilter', 'ALL'),
      });
    }
    if (filters.search.trim()) {
      chips.push({
        key: 'search',
        label: `Search: "${filters.search.trim()}"`,
        onDelete: () => onFilterChange('search', ''),
      });
    }
    if (filters.stateFilter) {
      chips.push({
        key: 'state',
        label: `State: ${filters.stateFilter}`,
        onDelete: () => onFilterChange('stateFilter', ''),
      });
    }
    if (filters.destinationFilter) {
      chips.push({
        key: 'destination',
        label: `Destination: ${filters.destinationFilter}`,
        onDelete: () => onFilterChange('destinationFilter', ''),
      });
    }
    if (filters.referenceCompanyId) {
      const company = visibleCompanies.find((item) => item.id === filters.referenceCompanyId);
      chips.push({
        key: 'reference',
        label: `Reference: ${company?.name || 'Selected'}`,
        onDelete: () => {
          onFilterChange('referenceCompanyId', '');
          onFilterChange('displayMode', 'absolute');
        },
      });
    }
    if (filters.displayMode === 'delta' && filters.referenceCompanyId) {
      chips.push({
        key: 'display',
        label: 'Delta view',
        onDelete: () => onFilterChange('displayMode', 'absolute'),
      });
    }
    if (filters.sortBy !== 'spread-desc') {
      const sortLabels: Record<ComparisonSortKey, string> = {
        'spread-desc': 'Largest spread',
        'spread-asc': 'Smallest spread',
        'label-asc': 'Name A → Z',
        'label-desc': 'Name Z → A',
        'coverage-desc': 'Best coverage',
        'coverage-asc': 'Lowest coverage',
      };
      chips.push({
        key: 'sort',
        label: `Sort: ${sortLabels[filters.sortBy]}`,
        onDelete: () => onFilterChange('sortBy', 'spread-desc'),
      });
    }
    if (filters.minSpread.trim()) {
      chips.push({
        key: 'minSpread',
        label: `Min spread: $${filters.minSpread}`,
        onDelete: () => onFilterChange('minSpread', ''),
      });
    }
    if (filters.differencesOnly) {
      chips.push({
        key: 'differences',
        label: 'Differences only',
        onDelete: () => onFilterChange('differencesOnly', false),
      });
    }
    if (!filters.onlyWithPriceLists) {
      chips.push({
        key: 'priceLists',
        label: 'Including companies without lists',
        onDelete: () => onFilterChange('onlyWithPriceLists', true),
      });
    }
    if (filters.completeCoverageOnly) {
      chips.push({
        key: 'coverage',
        label: 'Full coverage only',
        onDelete: () => onFilterChange('completeCoverageOnly', false),
      });
    }

    return chips;
  }, [filters, onFilterChange, visibleCompanies]);

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden">
        <div className="p-4 grid gap-4">
          {showFilterFields && (
            <>
            <FilterSection title="Search & Scope">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select
                  size="small"
                  label="Company Type"
                  value={filters.typeFilter}
                  onChange={(value) => onFilterChange('typeFilter', String(value) as ComparisonFiltersState['typeFilter'])}
                  options={[
                    { value: 'ALL', label: 'All Types' },
                    { value: 'SHIPPING', label: 'Shipping' },
                    { value: 'DISPATCH', label: 'Dispatch' },
                    { value: 'TRANSIT', label: 'Transit' },
                  ]}
                />
                <FormField
                  label="Search"
                  value={filters.search}
                  onChange={(event) => onFilterChange('search', event.target.value)}
                  placeholder="State, lane, branch, or city"
                  startAdornment={<Search className="w-4 h-4 text-[var(--text-secondary)]" />}
                />
                <Select
                  size="small"
                  label="State Filter"
                  value={filters.stateFilter}
                  onChange={(value) => onFilterChange('stateFilter', String(value))}
                  options={[
                    { value: '', label: 'All States' },
                    ...US_STATES.map((state) => ({ value: state.code, label: `${state.code} — ${state.name}` })),
                  ]}
                />
                <Select
                  size="small"
                  label="Destination"
                  value={filters.destinationFilter}
                  onChange={(value) => onFilterChange('destinationFilter', String(value))}
                  options={[
                    { value: '', label: 'All Destinations' },
                    ...destinationOptions.map((destination) => ({ value: destination, label: destination })),
                  ]}
                />
              </div>
            </FilterSection>

            <FilterSection title="Analysis">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select
                  size="small"
                  label="Vehicle Type"
                  value={filters.vehicleTypeId}
                  onChange={(value) => onFilterChange('vehicleTypeId', String(value))}
                  options={vehicleTypes.map((type: VehicleRateMultiplier) => ({ value: type.id, label: `${type.label} (${type.multiplier}x)` }))}
                />
                <Select
                  size="small"
                  label="Reference Company"
                  value={filters.referenceCompanyId}
                  onChange={(value) => onFilterChange('referenceCompanyId', String(value))}
                  options={[
                    { value: '', label: 'No reference' },
                    ...visibleCompanies.map((company) => ({ value: company.id, label: company.name })),
                  ]}
                />
                <Select
                  size="small"
                  label="Display"
                  value={filters.displayMode}
                  onChange={(value) => onFilterChange('displayMode', String(value) as ComparisonDisplayMode)}
                  disabled={!filters.referenceCompanyId}
                  options={[
                    { value: 'absolute', label: 'Absolute prices' },
                    { value: 'delta', label: 'Delta vs reference' },
                  ]}
                />
                <Select
                  size="small"
                  label="Sort By"
                  value={filters.sortBy}
                  onChange={(value) => onFilterChange('sortBy', String(value) as ComparisonSortKey)}
                  options={[
                    { value: 'spread-desc', label: 'Largest spread first' },
                    { value: 'spread-asc', label: 'Smallest spread first' },
                    { value: 'label-asc', label: 'Name A → Z' },
                    { value: 'label-desc', label: 'Name Z → A' },
                    { value: 'coverage-desc', label: 'Best coverage first' },
                    { value: 'coverage-asc', label: 'Lowest coverage first' },
                  ]}
                />
              </div>
            </FilterSection>

            <FilterSection title="Thresholds">
              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-center">
                <FormField
                  type="number"
                  label="Min Spread ($)"
                  value={filters.minSpread}
                  onChange={(event) => onFilterChange('minSpread', event.target.value)}
                  min={0}
                  step={50}
                />
                <div className="flex gap-4 flex-wrap items-center">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={filters.differencesOnly}
                      onChange={(event) => onFilterChange('differencesOnly', event.target.checked)}
                      className="rounded border-[var(--border)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                    />
                    <span>Only rows with price differences</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={filters.onlyWithPriceLists}
                      onChange={(event) => onFilterChange('onlyWithPriceLists', event.target.checked)}
                      className="rounded border-[var(--border)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                    />
                    <span>Only companies with uploaded price lists</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={filters.completeCoverageOnly}
                      onChange={(event) => onFilterChange('completeCoverageOnly', event.target.checked)}
                      className="rounded border-[var(--border)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                    />
                    <span>Only rows priced by every selected company</span>
                  </label>
                </div>
              </div>
            </FilterSection>
            </>
          )}

          {showCompanySelection && (
            <FilterSection title={`Companies to Compare (${selectedCompanyIds.length} selected, ${visibleCompanyCount} visible)`}>
              {loading ? (
                <SkeletonGroup>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} variant="rounded" width={120} height={32} />
                    ))}
                  </div>
                </SkeletonGroup>
              ) : companies.length === 0 ? (
                <div className="text-sm text-[var(--text-secondary)]">
                  No companies found for this filter.
                </div>
              ) : (
                <>
                  <div className="flex gap-2 flex-wrap mb-2">
                    <Button variant="outline" size="sm" onClick={onSelectAllCompanies}>Select All</Button>
                    <Button variant="outline" size="sm" onClick={onClearCompanySelection}>Clear Selection</Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {companies.map((company) => {
                      const selected = selectedCompanyIds.includes(company.id);
                      const disabled = filters.onlyWithPriceLists && !company.hasPriceList;

                      return (
                        <Tooltip
                          key={company.id}
                          title={company.hasPriceList
                            ? `${company.destinationLabel}${company.activePriceList?.name ? ` • ${company.activePriceList.name}` : ''}${company.activePriceList?.createdAt ? ` • ${new Date(company.activePriceList.createdAt).toLocaleDateString()}` : ''}`
                            : 'No uploaded price list yet'}
                        >
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onToggleCompany(company.id)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                              selected
                                ? 'border border-[rgba(var(--accent-gold-rgb),0.55)] bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--text-primary)]'
                                : 'border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--accent-gold)]'}`}
                          >
                            {selected && <Check className="w-3.5 h-3.5 text-[var(--accent-gold)]" />}
                            <span>{company.name}</span>
                            {!company.hasPriceList ? <span className="opacity-70 text-[10px]">(no list)</span> : null}
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                </>
              )}
            </FilterSection>
          )}
        </div>
      </div>

      {showActiveChips && activeChips.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-[var(--text-secondary)] font-semibold">Active:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onDelete}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}