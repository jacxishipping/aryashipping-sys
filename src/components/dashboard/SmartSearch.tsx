'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  FilterAlt, 
  Close, 
  CalendarMonth,
  AttachMoney,
  Person,
  Inventory2,
  LocalShipping,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { 
  TextField,
  InputAdornment,
  Button,
  Chip,
  Box,
  Typography,
  Collapse,
  CircularProgress,
  Fade
} from '@mui/material';
import {
  SHIPMENT_WORKFLOW_STAGE_OPTIONS,
  type ShipmentWorkflowStage,
} from '@/lib/shipment-workflow-stage';
import { Camera } from 'lucide-react';
import { BarcodeScannerModal } from '@/components/ui/BarcodeScannerModal';
import { Select } from '@/components/design-system';

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

  // Count active filters (derived state, no need for useEffect)
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Search Bar */}
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                    {isSearching ? (
                      <CircularProgress size={20} sx={{ color: 'var(--accent-gold)' }} />
                    ) : (
                      <Search sx={{ fontSize: 20, color: 'rgba(var(--text-secondary-rgb), 0.5)' }} />
                    )}
                </InputAdornment>
              ),
              sx: {
                  bgcolor: 'rgba(var(--panel-rgb), 0.6)',
                borderRadius: 3,
                '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(var(--text-primary-rgb), 0.08)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(var(--text-primary-rgb), 0.16)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(var(--accent-gold-rgb), 0.5)',
                  borderWidth: 2,
                },
                '& input': {
                  color: 'var(--text-primary)',
                  pr: { xs: '130px', sm: '190px' },
                  '&::placeholder': {
                    color: 'rgba(var(--text-secondary-rgb), 0.6)',
                    opacity: 1,
                  },
                },
              },
            }}
          />
          <Box sx={{ position: 'absolute', right: 8, display: 'flex', alignItems: 'center', gap: 1 }}>
            {showScanner && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setScannerOpen(true)}
                title="Scan QR Code or VIN Barcode"
                aria-label="Scan QR Code or VIN Barcode"
                sx={{
                  minWidth: 32,
                  px: 1.25,
                  py: 0.5,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderColor: 'rgba(var(--accent-gold-rgb), 0.35)',
                  bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)',
                  color: 'var(--accent-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  '&:hover': {
                    bgcolor: 'rgba(var(--accent-gold-rgb), 0.2)',
                    borderColor: 'rgba(var(--accent-gold-rgb), 0.6)',
                  },
                }}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Scan</span>
              </Button>
            )}
            {hasActiveFilters && (
              <Button
                size="small"
                startIcon={<Close sx={{ fontSize: 16 }} />}
                onClick={clearFilters}
                sx={{
                    color: 'var(--text-secondary)',
                  '&:hover': {
                      color: 'var(--text-primary)',
                      bgcolor: 'rgba(var(--text-secondary-rgb), 0.08)',
                  },
                }}
              >
                Clear
              </Button>
            )}
            <Button
              size="small"
              variant={showFilters ? 'contained' : 'outlined'}
              startIcon={<FilterAlt sx={{ fontSize: 16 }} />}
              endIcon={showFilters ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                  borderColor: showFilters ? 'rgba(var(--accent-gold-rgb), 0.4)' : 'var(--border)',
                  bgcolor: showFilters ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'transparent',
                  color: 'var(--text-primary)',
                '&:hover': {
                    bgcolor: showFilters ? 'rgba(var(--accent-gold-rgb), 0.25)' : 'rgba(var(--panel-rgb), 0.5)',
                    borderColor: showFilters ? 'rgba(var(--accent-gold-rgb), 0.6)' : 'var(--border)',
                },
              }}
            >
              Filters
              {activeFiltersCount > 0 && (
                <Chip
                  label={activeFiltersCount}
                  size="small"
                  sx={{
                    ml: 1,
                    height: 20,
                    fontSize: '0.75rem',
                    bgcolor: 'var(--accent-gold)',
                      color: 'var(--background)',
                  }}
                />
              )}
            </Button>
          </Box>
        </Box>

        {/* Quick Type Filter */}
        {showTypeFilter && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Search in:
            </Typography>
            {[
              { value: 'all', label: 'All', icon: Search },
              { value: 'shipments', label: 'Shipments', icon: LocalShipping },
              { value: 'items', label: 'Items', icon: Inventory2 },
              ...(showUserFilter ? [{ value: 'users', label: 'Users', icon: Person }] : []),
            ].map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                size="small"
                variant={filters.type === value ? 'contained' : 'outlined'}
                startIcon={<Icon sx={{ fontSize: 16 }} />}
                onClick={() => updateFilter('type', value as 'all' | 'shipments' | 'items' | 'users')}
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderColor: filters.type === value ? 'rgba(var(--accent-gold-rgb), 0.4)' : 'var(--border)',
                  bgcolor: filters.type === value ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'rgba(var(--panel-rgb), 0.5)',
                  color: filters.type === value ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  '&:hover': {
                    bgcolor: filters.type === value ? 'rgba(var(--accent-gold-rgb), 0.25)' : 'rgba(var(--panel-rgb), 0.7)',
                    color: 'var(--text-primary)',
                  },
                }}
              >
                {label}
              </Button>
            ))}
          </Box>
        )}

        {showWorkflowStageFilter && filters.type === 'shipments' && (
          <Fade in timeout={180}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 1.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Workflow stage:
              </Typography>
              <Button
                size="small"
                variant={filters.workflowStage ? 'outlined' : 'contained'}
                onClick={() => updateFilter('workflowStage', undefined)}
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderColor: filters.workflowStage ? 'var(--border)' : 'rgba(var(--accent-gold-rgb), 0.4)',
                  bgcolor: filters.workflowStage ? 'rgba(var(--panel-rgb), 0.5)' : 'rgba(var(--accent-gold-rgb), 0.15)',
                  color: filters.workflowStage ? 'var(--text-secondary)' : 'var(--accent-gold)',
                  '&:hover': {
                    bgcolor: filters.workflowStage ? 'rgba(var(--panel-rgb), 0.7)' : 'rgba(var(--accent-gold-rgb), 0.25)',
                    color: 'var(--text-primary)',
                  },
                }}
              >
                All stages
              </Button>
              {SHIPMENT_WORKFLOW_STAGE_OPTIONS.map((stageOption) => (
                <Button
                  key={stageOption.value}
                  size="small"
                  variant={filters.workflowStage === stageOption.value ? 'contained' : 'outlined'}
                  onClick={() => updateFilter('workflowStage', stageOption.value)}
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    borderColor:
                      filters.workflowStage === stageOption.value
                        ? 'rgba(var(--accent-gold-rgb), 0.4)'
                        : 'var(--border)',
                    bgcolor:
                      filters.workflowStage === stageOption.value
                        ? 'rgba(var(--accent-gold-rgb), 0.15)'
                        : 'rgba(var(--panel-rgb), 0.5)',
                    color:
                      filters.workflowStage === stageOption.value
                        ? 'var(--accent-gold)'
                        : 'var(--text-secondary)',
                    '&:hover': {
                      bgcolor:
                        filters.workflowStage === stageOption.value
                          ? 'rgba(var(--accent-gold-rgb), 0.25)'
                          : 'rgba(var(--panel-rgb), 0.7)',
                      color: 'var(--text-primary)',
                    },
                  }}
                >
                  {stageOption.label}
                </Button>
              ))}
            </Box>
          </Fade>
        )}
      </Box>

      {/* Advanced Filters */}
      <Collapse in={showFilters}>
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
              bgcolor: 'var(--panel)',
              border: '1px solid var(--border)',
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: '1rem', sm: '1.125rem' },
                fontWeight: 600,
                  color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <FilterAlt sx={{ fontSize: 20, color: 'var(--accent-gold)' }} />
              Advanced Filters
            </Typography>
            {activeFiltersCount > 0 && (
              <Button
                size="small"
                onClick={clearFilters}
                sx={{
                  fontSize: '0.875rem',
                  color: 'var(--accent-gold)',
                  '&:hover': {
                    color: 'var(--accent-gold)',
                  },
                }}
              >
                Clear all filters
              </Button>
            )}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
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
              <TextField
                type="date"
                label="Date From"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                  sx: {
                      color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    '&.Mui-focused': {
                      color: 'var(--accent-gold)',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonth sx={{ fontSize: 16, color: 'var(--accent-gold)' }} />
                    </InputAdornment>
                  ),
                  sx: {
                      bgcolor: 'var(--panel)',
                      color: 'var(--text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--border)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--border)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(var(--accent-gold-rgb), 0.5)',
                    },
                  },
                }}
              />
            )}

            {/* Date To */}
            {showDateFilter && (
              <TextField
                type="date"
                label="Date To"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                  sx: {
                    color: 'rgba(var(--text-secondary-rgb), 0.7)',
                    fontSize: '0.875rem',
                    '&.Mui-focused': {
                      color: 'var(--accent-gold)',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonth sx={{ fontSize: 16, color: 'var(--accent-gold)' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    bgcolor: 'rgba(var(--text-secondary-rgb), 0.05)',
                    color: 'var(--text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--border)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--border)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(var(--accent-gold-rgb), 0.5)',
                    },
                  },
                }}
              />
            )}

            {/* Min Price */}
            {showPriceFilter && filters.type !== 'users' && (
              <TextField
                type="number"
                label="Min Price"
                value={filters.minPrice || ''}
                onChange={(e) => updateFilter('minPrice', e.target.value)}
                placeholder="0"
                InputLabelProps={{
                  sx: {
                    color: 'rgba(var(--text-secondary-rgb), 0.7)',
                    fontSize: '0.875rem',
                    '&.Mui-focused': {
                      color: 'var(--accent-gold)',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney sx={{ fontSize: 16, color: 'var(--accent-gold)' }} />
                    </InputAdornment>
                  ),
                  inputProps: { min: 0 },
                  sx: {
                    bgcolor: 'rgba(var(--text-secondary-rgb), 0.05)',
                    color: 'var(--text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--border)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--border)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(var(--accent-gold-rgb), 0.5)',
                    },
                    '& input::placeholder': {
                      color: 'rgba(var(--text-secondary-rgb), 0.4)',
                      opacity: 1,
                    },
                  },
                }}
              />
            )}

            {/* Max Price */}
            {showPriceFilter && filters.type !== 'users' && (
              <TextField
                type="number"
                label="Max Price"
                value={filters.maxPrice || ''}
                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                placeholder="10000"
                InputLabelProps={{
                  sx: {
                    color: 'rgba(var(--text-secondary-rgb), 0.7)',
                    fontSize: '0.875rem',
                    '&.Mui-focused': {
                      color: 'var(--accent-gold)',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney sx={{ fontSize: 16, color: 'var(--accent-gold)' }} />
                    </InputAdornment>
                  ),
                  inputProps: { min: 0 },
                  sx: {
                    bgcolor: 'rgba(var(--text-secondary-rgb), 0.05)',
                    color: 'var(--text-primary)',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--border)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--border)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(var(--accent-gold-rgb), 0.5)',
                    },
                    '& input::placeholder': {
                      color: 'rgba(var(--text-secondary-rgb), 0.4)',
                      opacity: 1,
                    },
                  },
                }}
              />
            )}
          </Box>

          {/* Filter Summary */}
          <Fade in={hasActiveFilters} timeout={300}>
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
                  border: '1px solid rgba(var(--accent-gold-rgb), 0.3)',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                  <FilterAlt sx={{ fontSize: 16, color: 'var(--accent-gold)', mt: 0.25, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-gold)', mb: 1 }}>
                      Active Filters:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {query && (
                        <Chip
                          label={`Query: "${query}"`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(var(--accent-gold-rgb), 0.2)',
                            color: 'var(--accent-gold)',
                            fontSize: '0.75rem',
                          }}
                        />
                      )}
                      {filters.status && (
                        <Chip
                          label={`Status: ${filters.status}`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(var(--accent-gold-rgb), 0.2)',
                            color: 'var(--accent-gold)',
                            fontSize: '0.75rem',
                          }}
                        />
                      )}
                      {filters.delivery && (
                        <Chip
                          label={filters.delivery === 'delivered' ? 'Delivered' : 'Not Delivered'}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(var(--accent-gold-rgb), 0.2)',
                            color: 'var(--accent-gold)',
                            fontSize: '0.75rem',
                          }}
                        />
                      )}
                      {(filters.dateFrom || filters.dateTo) && (
                        <Chip
                          label="Date Range"
                          size="small"
                          sx={{
                            bgcolor: 'rgba(var(--accent-gold-rgb), 0.2)',
                            color: 'var(--accent-gold)',
                            fontSize: '0.75rem',
                          }}
                        />
                      )}
                      {(filters.minPrice || filters.maxPrice) && (
                        <Chip
                          label="Price Range"
                          size="small"
                          sx={{
                            bgcolor: 'rgba(var(--accent-gold-rgb), 0.2)',
                            color: 'var(--accent-gold)',
                            fontSize: '0.75rem',
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
          </Fade>
        </Box>
      </Collapse>

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
    </Box>
  );
}
