'use client';

import { useMemo, type ReactNode } from 'react';
import {
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import { Check, Search, X } from 'lucide-react';
import { Button } from '@/components/design-system';
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
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      <Box
        sx={{
          fontSize: '0.68rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--text-secondary)',
        }}
      >
        {title}
      </Box>
      {children}
    </Box>
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
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Box
        sx={{
          borderRadius: 2,
          border: '1px solid var(--border)',
          background: 'var(--panel)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 1.5, display: 'grid', gap: 2 }}>
          {showFilterFields && (
            <>
            <FilterSection title="Search & Scope">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                <TextField
                  select
                  size="small"
                  label="Company Type"
                  value={filters.typeFilter}
                  onChange={(event) => onFilterChange('typeFilter', event.target.value as ComparisonFiltersState['typeFilter'])}
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  <MenuItem value="SHIPPING">Shipping</MenuItem>
                  <MenuItem value="DISPATCH">Dispatch</MenuItem>
                  <MenuItem value="TRANSIT">Transit</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  label="Search"
                  value={filters.search}
                  onChange={(event) => onFilterChange('search', event.target.value)}
                  placeholder="State, lane, branch, or city"
                  InputProps={{
                    startAdornment: <Search className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />,
                  }}
                />
                <TextField
                  select
                  size="small"
                  label="State Filter"
                  value={filters.stateFilter}
                  onChange={(event) => onFilterChange('stateFilter', event.target.value)}
                >
                  <MenuItem value="">All States</MenuItem>
                  {US_STATES.map((state) => (
                    <MenuItem key={state.code} value={state.code}>
                      {state.code} — {state.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Destination"
                  value={filters.destinationFilter}
                  onChange={(event) => onFilterChange('destinationFilter', event.target.value)}
                >
                  <MenuItem value="">All Destinations</MenuItem>
                  {destinationOptions.map((destination) => (
                    <MenuItem key={destination} value={destination}>
                      {destination}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </FilterSection>

            <FilterSection title="Analysis">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                <TextField
                  select
                  size="small"
                  label="Vehicle Type"
                  value={filters.vehicleTypeId}
                  onChange={(event) => onFilterChange('vehicleTypeId', event.target.value)}
                >
                  {vehicleTypes.map((type: VehicleRateMultiplier) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.label} ({type.multiplier}x)
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Reference Company"
                  value={filters.referenceCompanyId}
                  onChange={(event) => onFilterChange('referenceCompanyId', event.target.value)}
                >
                  <MenuItem value="">No reference</MenuItem>
                  {visibleCompanies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Display"
                  value={filters.displayMode}
                  onChange={(event) => onFilterChange('displayMode', event.target.value as ComparisonDisplayMode)}
                  disabled={!filters.referenceCompanyId}
                >
                  <MenuItem value="absolute">Absolute prices</MenuItem>
                  <MenuItem value="delta">Delta vs reference</MenuItem>
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Sort By"
                  value={filters.sortBy}
                  onChange={(event) => onFilterChange('sortBy', event.target.value as ComparisonSortKey)}
                >
                  <MenuItem value="spread-desc">Largest spread first</MenuItem>
                  <MenuItem value="spread-asc">Smallest spread first</MenuItem>
                  <MenuItem value="label-asc">Name A → Z</MenuItem>
                  <MenuItem value="label-desc">Name Z → A</MenuItem>
                  <MenuItem value="coverage-desc">Best coverage first</MenuItem>
                  <MenuItem value="coverage-asc">Lowest coverage first</MenuItem>
                </TextField>
              </Box>
            </FilterSection>

            <FilterSection title="Thresholds">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '180px 1fr' }, gap: 1.5, alignItems: 'center' }}>
                <TextField
                  size="small"
                  type="number"
                  label="Min Spread ($)"
                  value={filters.minSpread}
                  onChange={(event) => onFilterChange('minSpread', event.target.value)}
                  inputProps={{ min: 0, step: 50 }}
                />
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.differencesOnly}
                        onChange={(event) => onFilterChange('differencesOnly', event.target.checked)}
                        size="small"
                      />
                    }
                    label="Only rows with price differences"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.onlyWithPriceLists}
                        onChange={(event) => onFilterChange('onlyWithPriceLists', event.target.checked)}
                        size="small"
                      />
                    }
                    label="Only companies with uploaded price lists"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.completeCoverageOnly}
                        onChange={(event) => onFilterChange('completeCoverageOnly', event.target.checked)}
                        size="small"
                      />
                    }
                    label="Only rows priced by every selected company"
                  />
                </Box>
              </Box>
            </FilterSection>
            </>
          )}

          {showCompanySelection && (
            <FilterSection title={`Companies to Compare (${selectedCompanyIds.length} selected, ${visibleCompanyCount} visible)`}>
              {loading ? (
                <SkeletonGroup>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} variant="rounded" width={120} height={32} />
                    ))}
                  </Box>
                </SkeletonGroup>
              ) : companies.length === 0 ? (
                <Box sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No companies found for this filter.
                </Box>
              ) : (
                <>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
                    <Button variant="outline" size="sm" onClick={onSelectAllCompanies}>Select All</Button>
                    <Button variant="outline" size="sm" onClick={onClearCompanySelection}>Clear Selection</Button>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                          <Box
                            component="button"
                            type="button"
                            disabled={disabled}
                            onClick={() => onToggleCompany(company.id)}
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              border: selected ? '1px solid rgba(var(--accent-gold-rgb), 0.55)' : '1px solid var(--border)',
                              background: selected ? 'rgba(var(--accent-gold-rgb), 0.12)' : 'var(--background)',
                              color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
                              borderRadius: 9999,
                              px: 1.25,
                              py: 0.6,
                              fontSize: '0.8rem',
                              fontWeight: selected ? 700 : 500,
                              cursor: disabled ? 'not-allowed' : 'pointer',
                              opacity: disabled ? 0.55 : 1,
                              transition: 'all 0.15s ease',
                              '&:hover:not(:disabled)': {
                                borderColor: 'rgba(var(--accent-gold-rgb), 0.45)',
                                transform: 'translateY(-1px)',
                              },
                            }}
                          >
                            {selected && <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold)' }} />}
                            {company.name}
                            {!company.hasPriceList ? ' (no list)' : ''}
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </>
              )}
            </FilterSection>
          )}
        </Box>
      </Box>

      {showActiveChips && activeChips.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, mr: 0.25 }}>Active:</Box>
          {activeChips.map((chip) => (
            <Chip
              key={chip.key}
              size="small"
              label={chip.label}
              onDelete={chip.onDelete}
              deleteIcon={<X className="w-3 h-3" />}
              sx={{
                height: 26,
                fontSize: '0.72rem',
                bgcolor: 'var(--background)',
                border: '1px solid var(--border)',
                '& .MuiChip-deleteIcon': { color: 'var(--text-secondary)' },
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}