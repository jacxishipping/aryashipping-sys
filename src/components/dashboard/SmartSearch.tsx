'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  DollarSign,
  User,
  Package,
  Truck,
  ChevronDown,
  ChevronUp,
  Camera,
  Loader2
} from 'lucide-react';
import {
  SHIPMENT_WORKFLOW_STAGE_OPTIONS,
  type ShipmentWorkflowStage,
} from '@/lib/shipment-workflow-stage';
import { BarcodeScannerModal } from '@/components/ui/BarcodeScannerModal';
import { Select, Button } from '@/components/design-system';

interface SmartSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onScan?: (scanned: string) => void;
  placeholder?: string;
  showTypeFilter?: boolean;
  showStatusFilter?: boolean;
  showWorkflowStageFilter?: boolean;
  showYardFilter?: boolean;
  showDateFilter?: boolean;
  showPriceFilter?: boolean;
  showUserFilter?: boolean;
  showDeliveryFilter?: boolean;
  defaultType?: 'all' | 'shipments' | 'items' | 'users';
  showScanner?: boolean;
}

export interface SearchFilters {
  query: string;
  type: 'all' | 'shipments' | 'items' | 'users';
  status?: string;
  workflowStage?: ShipmentWorkflowStage;
  yardReceived?: string;
  dateFrom?: string;
  dateTo?: string;
  minPrice?: string;
  maxPrice?: string;
  userId?: string;
  delivery?: 'delivered' | 'undelivered';
}

const SHIPMENT_STATUSES = [
  { value: 'ON_HAND', label: 'On Hand' },
  { value: 'DISPATCHING', label: 'Dispatching' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'IN_TRANSIT_TO_DESTINATION', label: 'In Transit To Destination' },
  { value: 'DELIVERED', label: 'Delivered' },
];

const ITEM_STATUSES = [
  { value: 'ON_HAND', label: 'On Hand' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
];

export default function SmartSearch({
  onSearch,
  onScan,
  placeholder = 'Search shipments, tracking numbers, VIN...',
  showTypeFilter = true,
  showStatusFilter = true,
  showWorkflowStageFilter = false,
  showYardFilter = false,
  showDateFilter = true,
  showPriceFilter = true,
  showUserFilter = false,
  showDeliveryFilter = false,
  defaultType = 'all',
  showScanner = true,
}: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: defaultType,
  });
  const [isSearching, setIsSearching] = useState(false);

  // Count active filters
  const activeFiltersCount = (() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.workflowStage) count++;
    if (filters.yardReceived) count++;
    if (filters.delivery) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.userId) count++;
    return count;
  })();

  const handleSearch = useCallback((newFilters: SearchFilters) => {
    setIsSearching(true);
    setFilters(newFilters);
    onSearch(newFilters);
    setTimeout(() => setIsSearching(false), 300);
  }, [onSearch]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== filters.query) {
        handleSearch({ ...filters, query });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, filters, handleSearch]);

  const updateFilter = (key: keyof SearchFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };
    handleSearch(newFilters);
  };

  const clearFilters = () => {
    setQuery('');
    const clearedFilters: SearchFilters = {
      query: '',
      type: defaultType,
    };
    setFilters(clearedFilters);
    handleSearch(clearedFilters);
  };

  const hasActiveFilters = Boolean(query) || activeFiltersCount > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex items-center relative">
          <div className="relative w-full">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
              {isSearching ? (
                <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-gold)]" />
              ) : (
                <Search className="w-5 h-5 text-zinc-400" />
              )}
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-11 pr-32 sm:pr-48 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-2xl text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] transition-colors shadow-sm"
            />
          </div>

          <div className="absolute right-2 flex items-center gap-1.5">
            {showScanner && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setScannerOpen(true)}
                title="Scan QR Code or VIN Barcode"
                aria-label="Scan QR Code or VIN Barcode"
                icon={<Camera className="w-3.5 h-3.5" />}
              >
                <span className="hidden sm:inline">Scan</span>
              </Button>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <Button
              size="sm"
              variant={showFilters ? 'primary' : 'outline'}
              icon={<Filter className="w-3.5 h-3.5" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--accent-gold)] text-black">
                  {activeFiltersCount}
                </span>
              )}
              {showFilters ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Quick Type Filter */}
        {showTypeFilter && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-[var(--text-secondary)]">
              Search in:
            </span>
            {[
              { value: 'all', label: 'All', icon: Search },
              { value: 'shipments', label: 'Shipments', icon: Truck },
              { value: 'items', label: 'Items', icon: Package },
              ...(showUserFilter ? [{ value: 'users', label: 'Users', icon: User }] : []),
            ].map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                size="sm"
                variant={filters.type === value ? 'primary' : 'outline'}
                icon={<Icon className="w-3.5 h-3.5" />}
                onClick={() => updateFilter('type', value as 'all' | 'shipments' | 'items' | 'users')}
              >
                {label}
              </Button>
            ))}
          </div>
        )}

        {showWorkflowStageFilter && filters.type === 'shipments' && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 animate-in fade-in duration-200">
            <span className="text-xs text-[var(--text-secondary)] mr-1">
              Workflow stage:
            </span>
            <Button
              size="sm"
              variant={filters.workflowStage ? 'outline' : 'primary'}
              onClick={() => updateFilter('workflowStage', undefined)}
            >
              All stages
            </Button>
            {SHIPMENT_WORKFLOW_STAGE_OPTIONS.map((stageOption) => (
              <Button
                key={stageOption.value}
                size="sm"
                variant={filters.workflowStage === stageOption.value ? 'primary' : 'outline'}
                onClick={() => updateFilter('workflowStage', stageOption.value)}
              >
                {stageOption.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="p-4 sm:p-5 bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--accent-gold)]" />
              <span>Advanced Filters</span>
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-[var(--accent-gold)] hover:underline bg-transparent border-0 cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Status Filter */}
            {showStatusFilter && (
              <Select
                label="Status"
                value={filters.status || ''}
                onChange={(value) => updateFilter('status', String(value))}
                options={[
                  { value: '', label: 'All Statuses' },
                  ...(filters.type === 'items' ? ITEM_STATUSES : SHIPMENT_STATUSES),
                ]}
              />
            )}

            {showDeliveryFilter && filters.type === 'shipments' && (
              <Select
                label="Delivery Status"
                value={filters.delivery || ''}
                onChange={(value) => updateFilter('delivery', String(value))}
                options={[
                  { value: '', label: 'All Shipments' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'undelivered', label: 'Not Delivered' },
                ]}
              />
            )}

            {showYardFilter && filters.type === 'shipments' && (
              <Select
                label="Yard Intake"
                value={filters.yardReceived || ''}
                onChange={(value) => updateFilter('yardReceived', String(value))}
                options={[
                  { value: '', label: 'All Shipments' },
                  { value: 'true', label: 'Yard Received Only' },
                ]}
              />
            )}

            {/* Date From */}
            {showDateFilter && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Date From
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[var(--accent-gold)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                  />
                </div>
              </div>
            )}

            {/* Date To */}
            {showDateFilter && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Date To
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[var(--accent-gold)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                  />
                </div>
              </div>
            )}

            {/* Min Price */}
            {showPriceFilter && filters.type !== 'users' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Min Price
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-[var(--accent-gold)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={filters.minPrice || ''}
                    onChange={(e) => updateFilter('minPrice', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                  />
                </div>
              </div>
            )}

            {/* Max Price */}
            {showPriceFilter && filters.type !== 'users' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Max Price
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-[var(--accent-gold)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    min="0"
                    placeholder="10000"
                    value={filters.maxPrice || ''}
                    onChange={(e) => updateFilter('maxPrice', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Filter Summary */}
          {hasActiveFilters && (
            <div className="mt-4 p-3 bg-[rgba(var(--accent-gold-rgb),0.1)] border border-[rgba(var(--accent-gold-rgb),0.3)] rounded-xl flex items-start gap-2">
              <Filter className="w-4 h-4 text-[var(--accent-gold)] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs font-semibold text-[var(--accent-gold)] block mb-1.5">
                  Active Filters:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {query && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[rgba(var(--accent-gold-rgb),0.2)] text-[var(--accent-gold)]">
                      Query: &quot;{query}&quot;
                    </span>
                  )}
                  {filters.status && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[rgba(var(--accent-gold-rgb),0.2)] text-[var(--accent-gold)]">
                      Status: {filters.status}
                    </span>
                  )}
                  {filters.delivery && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[rgba(var(--accent-gold-rgb),0.2)] text-[var(--accent-gold)]">
                      {filters.delivery === 'delivered' ? 'Delivered' : 'Not Delivered'}
                    </span>
                  )}
                  {(filters.dateFrom || filters.dateTo) && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[rgba(var(--accent-gold-rgb),0.2)] text-[var(--accent-gold)]">
                      Date Range
                    </span>
                  )}
                  {(filters.minPrice || filters.maxPrice) && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[rgba(var(--accent-gold-rgb),0.2)] text-[var(--accent-gold)]">
                      Price Range
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showScanner && (
        <BarcodeScannerModal
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(scanned) => {
            setScannerOpen(false);
            setQuery(scanned);
            const updated = { ...filters, query: scanned };
            setFilters(updated);
            if (onScan) {
              onScan(scanned);
            } else {
              handleSearch(updated);
            }
          }}
          title="Scan VIN or Yard QR Code"
          description="Align the vehicle VIN barcode, tracking QR code, or gate pass within the camera frame"
        />
      )}
    </div>
  );
}
