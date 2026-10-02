'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
function sxToStyle(sx?: any): React.CSSProperties {
  if (!sx) return {};
  const style: any = {};
  for (const [key, val] of Object.entries(sx)) {
    if (key.startsWith('&') || key.startsWith('@')) continue;
    if (typeof val === 'object' && val !== null) {
      const resolved = (val as any).xs ?? (val as any).md ?? (val as any).lg;
      if (resolved !== undefined) style[key] = resolved;
      continue;
    }
    if (key === 'bgcolor') style.backgroundColor = val;
    else if (key === 'p') style.padding = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'px') { style.paddingLeft = typeof val === 'number' ? `${val * 8}px` : val; style.paddingRight = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'py') { style.paddingTop = typeof val === 'number' ? `${val * 8}px` : val; style.paddingBottom = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'pt') style.paddingTop = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pb') style.paddingBottom = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pl') style.paddingLeft = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pr') style.paddingRight = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'm') style.margin = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mx') { style.marginLeft = typeof val === 'number' ? `${val * 8}px` : val; style.marginRight = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'my') { style.marginTop = typeof val === 'number' ? `${val * 8}px` : val; style.marginBottom = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'mt') style.marginTop = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mb') style.marginBottom = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'gap') style.gap = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'borderRadius') style.borderRadius = typeof val === 'number' ? `${val * 8}px` : val;
    else style[key] = val;
  }
  return style;
}

function Box({ children, className = '', component: Component = 'div', sx, style, ...props }: React.HTMLAttributes<HTMLElement> & { component?: any; sx?: any; [key: string]: any }) {
  return (
    <Component className={className} style={{ ...sxToStyle(sx), ...style }} {...props}>
      {children}
    </Component>
  );
}

function Tabs({ value, onChange, children, className = '', sx, style }: any) {
  return (
    <div className={`flex items-center gap-2 overflow-x-auto border-b border-[var(--border)] pb-2 ${className}`} style={{ ...sxToStyle(sx), ...style }}>
      {React.Children.map(children, (child, idx) => {
        if (!React.isValidElement(child)) return child;
        const childVal = (child.props as any).value ?? idx;
        return React.cloneElement(child as React.ReactElement<any>, {
          isSelected: childVal === value,
          onSelectTab: () => onChange?.(null, childVal),
        });
      })}
    </div>
  );
}

function Tab({ value, label, icon, isSelected, onSelectTab, className = '', sx, style, ...props }: any) {
  return (
    <button
      type="button"
      onClick={onSelectTab}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
        isSelected
          ? 'bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)] border border-[rgba(var(--accent-gold-rgb),0.25)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-secondary,rgba(255,255,255,0.03))]'
      } ${className}`}
      style={{ ...sxToStyle(sx), ...style }}
      {...props}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
import {
  ArrowLeft,
  ArrowLeftRight,
  Bookmark,
  Building2,
  Download,
  Filter,
  GitCompareArrows,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  Trophy,
} from 'lucide-react';
import PermissionRoute from '@/components/auth/PermissionRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import {
  Button,
  EmptyState,
  PageHeader,
  SkeletonStatsCard,
  SkeletonTable,
  StatsCard,
  toast,
} from '@/components/design-system';
import CompanyPriceComparisonFilters, {
  countActiveFilters,
  type ComparisonFiltersState,
} from '@/components/finance/CompanyPriceComparisonFilters';
import CompanyPriceComparisonInsights from '@/components/finance/CompanyPriceComparisonInsights';
import { DEFAULT_SHIPPING_RATE_CONFIG, type VehicleRateMultiplier } from '@/lib/shipping-rate-calculator';
import CompanyPriceComparisonPresets from '@/components/finance/CompanyPriceComparisonPresets';
import CompanyPriceComparisonSideBySide from '@/components/finance/CompanyPriceComparisonSideBySide';
import {
  adjustComparisonRows,
  buildCompanyScorecards,
  buildComparisonInsights,
  buildLaneComparisonRows,
  buildStateComparisonRows,
  exportComparisonCsv,
  getRateDelta,
  sortComparisonRows,
  type CompanyPriceSnapshot,
  type ComparisonSortKey,
} from '@/lib/company-price-comparison';
import {
  createDefaultComparisonPresetConfig,
  sanitizePresetConfigForCompanies,
  type ComparisonDisplayMode,
  type ComparisonPresetConfig,
  type ComparisonViewMode,
  type SideBySideRateType,
} from '@/lib/company-price-comparison-presets';
import {
  buildSideBySideRows,
  exportSideBySideCsv,
} from '@/lib/company-price-comparison-side-by-side';

type CompanyPriceRecord = CompanyPriceSnapshot & {
  isActive: boolean;
  fallbackRate: number;
  currency: string;
  vehicleTypes: VehicleRateMultiplier[];
  updatedAt?: string | null;
  activePriceList?: {
    id: string;
    name: string;
    destinationLabel: string;
    sourceFileName: string;
    importedAuctionRateCount: number;
    importedStateRateCount: number;
    createdAt: string;
  } | null;
};

type DisplayMode = ComparisonDisplayMode;

function TabPanel({ children, value, index }: { children: ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`comparison-tabpanel-${index}`} aria-labelledby={`comparison-tab-${index}`}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const TAB_OVERVIEW = 0;
const TAB_STATE = 1;
const TAB_LANE = 2;
const TAB_SIDE_BY_SIDE = 3;
const TAB_PRESETS = 4;

const viewModeToTab = (mode: ComparisonViewMode) => {
  if (mode === 'state') return TAB_STATE;
  if (mode === 'lane') return TAB_LANE;
  return TAB_SIDE_BY_SIDE;
};

const formatSignedCurrency = (amount: number) => {
  const prefix = amount > 0 ? '+' : amount < 0 ? '−' : '';
  return `${prefix}${formatCurrency(Math.abs(amount))}`;
};

function RateCell({
  value,
  minRate,
  maxRate,
  hasMultipleRates,
  referenceRate,
  displayMode,
}: {
  value: number | null;
  minRate: number | null;
  maxRate: number | null;
  hasMultipleRates: boolean;
  referenceRate?: number | null;
  displayMode: DisplayMode;
}) {
  if (value === null) {
    return <Box sx={{ color: 'var(--text-secondary)' }}>—</Box>;
  }

  const delta = referenceRate !== undefined ? getRateDelta(value, referenceRate ?? null) : null;
  const isLowest = hasMultipleRates && minRate !== null && value === minRate && minRate !== maxRate;
  const isHighest = hasMultipleRates && maxRate !== null && value === maxRate && minRate !== maxRate;

  const cellShell = (content: ReactNode) => (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        px: 0.75,
        py: 0.5,
        borderRadius: 1,
        minWidth: 72,
        background: isLowest
          ? 'rgba(var(--success-rgb), 0.08)'
          : isHighest
          ? 'rgba(var(--error-rgb), 0.06)'
          : 'transparent',
        border: isLowest
          ? '1px solid rgba(var(--success-rgb), 0.2)'
          : isHighest
          ? '1px solid rgba(var(--error-rgb), 0.15)'
          : '1px solid transparent',
      }}
    >
      {content}
    </Box>
  );

  if (displayMode === 'delta' && referenceRate !== undefined) {
    if (delta === null) {
      return <Box sx={{ color: 'var(--text-secondary)' }}>—</Box>;
    }

    if (delta === 0) {
      return cellShell(<Box sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Same</Box>);
    }

    return cellShell(
      <Box sx={{ fontWeight: 700, color: delta < 0 ? 'var(--success-dark)' : 'var(--error-dark)' }}>
        {formatSignedCurrency(delta)}
      </Box>,
    );
  }

  return cellShell(
    <>
      <Box
        sx={{
          fontWeight: isLowest || isHighest ? 700 : 500,
          color: isLowest
            ? 'var(--success-dark)'
            : isHighest
            ? 'var(--error-dark)'
            : 'var(--text-primary)',
        }}
      >
        {formatCurrency(value)}
      </Box>
      {delta !== null && delta !== 0 && referenceRate !== undefined && referenceRate !== null && (
        <Box
          sx={{
            mt: 0.25,
            fontSize: '0.7rem',
            color: delta < 0 ? 'var(--success-dark)' : 'var(--error-dark)',
          }}
        >
          {formatSignedCurrency(delta)}
        </Box>
      )}
    </>,
  );
}

function SpreadBar({ spread, maxSpread }: { spread: number | null; maxSpread: number }) {
  if (!spread || spread <= 0) {
    return <Box sx={{ color: 'var(--text-secondary)' }}>—</Box>;
  }

  const width = Math.max(8, Math.round((spread / maxSpread) * 100));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.4 }}>
      <Box sx={{ fontWeight: 700 }}>{formatCurrency(spread)}</Box>
      <Box sx={{ width: 72, height: 4, borderRadius: 999, bgcolor: 'rgba(var(--border-rgb), 0.35)', overflow: 'hidden' }}>
        <Box
          sx={{
            width: `${width}%`,
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, rgba(var(--accent-gold-rgb), 0.45), var(--accent-gold))',
          }}
        />
      </Box>
    </Box>
  );
}

export default function CompanyPriceComparisonPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyPriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SHIPPING' | 'DISPATCH' | 'TRANSIT'>('SHIPPING');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ComparisonViewMode>('state');
  const [sideBySideLeftId, setSideBySideLeftId] = useState('');
  const [sideBySideRightId, setSideBySideRightId] = useState('');
  const [sideBySideRateType, setSideBySideRateType] = useState<SideBySideRateType>('state');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [onlyWithPriceLists, setOnlyWithPriceLists] = useState(true);
  const [completeCoverageOnly, setCompleteCoverageOnly] = useState(false);
  const [minSpread, setMinSpread] = useState('');
  const [sortBy, setSortBy] = useState<ComparisonSortKey>('spread-desc');
  const [vehicleTypeId, setVehicleTypeId] = useState(DEFAULT_SHIPPING_RATE_CONFIG.vehicleTypes[0].id);
  const [referenceCompanyId, setReferenceCompanyId] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');
  const [activeTab, setActiveTab] = useState(TAB_OVERVIEW);
  const [showFilters, setShowFilters] = useState(false);
  const [showCompanies, setShowCompanies] = useState(false);

  const vehicleTypes = DEFAULT_SHIPPING_RATE_CONFIG.vehicleTypes;
  const vehicleMultiplier = vehicleTypes.find((type) => type.id === vehicleTypeId)?.multiplier || 1;

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ active: 'true' });
      if (typeFilter !== 'ALL') params.append('companyType', typeFilter);

      const response = await fetch(`/api/finance/companies/price-comparison?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch company price lists');
      }

      const nextCompanies = (data.companies || []) as CompanyPriceRecord[];
      setCompanies(nextCompanies);
      setSelectedCompanyIds((current) => {
        const validIds = new Set(nextCompanies.map((company) => company.id));
        const preserved = current.filter((id) => validIds.has(id));
        if (preserved.length > 0) return preserved;

        const withLists = nextCompanies.filter((company) => company.hasPriceList).map((company) => company.id);
        return withLists.length > 0 ? withLists : nextCompanies.map((company) => company.id);
      });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load company price lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCompanies();
  }, [typeFilter]);

  const destinationOptions = useMemo(() => (
    [...new Set(companies.map((company) => company.destinationLabel).filter(Boolean))].sort()
  ), [companies]);

  const visibleCompanies = useMemo(() => {
    const selected = new Set(selectedCompanyIds);
    return companies
      .filter((company) => selected.has(company.id))
      .filter((company) => !onlyWithPriceLists || company.hasPriceList)
      .filter((company) => !destinationFilter || company.destinationLabel === destinationFilter);
  }, [companies, destinationFilter, onlyWithPriceLists, selectedCompanyIds]);

  useEffect(() => {
    if (referenceCompanyId && !visibleCompanies.some((company) => company.id === referenceCompanyId)) {
      setReferenceCompanyId('');
      setDisplayMode('absolute');
    }
  }, [referenceCompanyId, visibleCompanies]);

  const sideBySideCandidates = useMemo(() => (
    companies.filter((company) => !onlyWithPriceLists || company.hasPriceList)
  ), [companies, onlyWithPriceLists]);

  useEffect(() => {
    if (viewMode !== 'side-by-side' || sideBySideCandidates.length < 2) return;

    const nextLeft = sideBySideLeftId && sideBySideCandidates.some((company) => company.id === sideBySideLeftId)
      ? sideBySideLeftId
      : sideBySideCandidates[0].id;
    const nextRight = sideBySideRightId
      && sideBySideCandidates.some((company) => company.id === sideBySideRightId)
      && sideBySideRightId !== nextLeft
      ? sideBySideRightId
      : sideBySideCandidates.find((company) => company.id !== nextLeft)?.id || '';

    if (nextLeft !== sideBySideLeftId) setSideBySideLeftId(nextLeft);
    if (nextRight !== sideBySideRightId) setSideBySideRightId(nextRight);
  }, [sideBySideCandidates, sideBySideLeftId, sideBySideRightId, viewMode]);

  const comparisonFilterOptions = useMemo(() => ({
    search,
    differencesOnly,
    stateCode: stateFilter,
    completeCoverageOnly,
    minSpread: Number(minSpread) > 0 ? Number(minSpread) : undefined,
  }), [completeCoverageOnly, differencesOnly, minSpread, search, stateFilter]);

  const comparisonRows = useMemo(() => {
    if (viewMode === 'side-by-side') return [];

    const baseRows = viewMode === 'state'
      ? buildStateComparisonRows(visibleCompanies, comparisonFilterOptions)
      : buildLaneComparisonRows(visibleCompanies, comparisonFilterOptions);

    return sortComparisonRows(adjustComparisonRows(baseRows, vehicleMultiplier), sortBy);
  }, [comparisonFilterOptions, sortBy, vehicleMultiplier, viewMode, visibleCompanies]);

  const overviewComparisonRows = useMemo(() => {
    const baseRows = buildStateComparisonRows(visibleCompanies, comparisonFilterOptions);
    return sortComparisonRows(adjustComparisonRows(baseRows, vehicleMultiplier), sortBy);
  }, [comparisonFilterOptions, sortBy, vehicleMultiplier, visibleCompanies]);

  const overviewScorecards = useMemo(
    () => buildCompanyScorecards(visibleCompanies, overviewComparisonRows),
    [overviewComparisonRows, visibleCompanies],
  );

  const overviewInsights = useMemo(
    () => buildComparisonInsights(visibleCompanies, overviewComparisonRows),
    [overviewComparisonRows, visibleCompanies],
  );

  const currentPresetConfig = useMemo<ComparisonPresetConfig>(() => ({
    typeFilter,
    selectedCompanyIds,
    viewMode,
    sideBySideLeftId,
    sideBySideRightId,
    sideBySideRateType,
    search,
    stateFilter,
    destinationFilter,
    differencesOnly,
    onlyWithPriceLists,
    completeCoverageOnly,
    minSpread,
    sortBy,
    vehicleTypeId,
    referenceCompanyId,
    displayMode,
  }), [
    completeCoverageOnly,
    destinationFilter,
    differencesOnly,
    displayMode,
    minSpread,
    onlyWithPriceLists,
    referenceCompanyId,
    search,
    selectedCompanyIds,
    sideBySideLeftId,
    sideBySideRightId,
    sideBySideRateType,
    sortBy,
    stateFilter,
    typeFilter,
    vehicleTypeId,
    viewMode,
  ]);

  const applyPresetConfig = (config: ComparisonPresetConfig) => {
    const sanitized = sanitizePresetConfigForCompanies(config, companies.map((company) => company.id));
    const defaults = createDefaultComparisonPresetConfig();

    setTypeFilter(sanitized.typeFilter || defaults.typeFilter);
    setSelectedCompanyIds(sanitized.selectedCompanyIds);
    setViewMode(sanitized.viewMode || defaults.viewMode);
    setSideBySideLeftId(sanitized.sideBySideLeftId);
    setSideBySideRightId(sanitized.sideBySideRightId);
    setSideBySideRateType(sanitized.sideBySideRateType);
    setSearch(sanitized.search);
    setStateFilter(sanitized.stateFilter);
    setDestinationFilter(sanitized.destinationFilter);
    setDifferencesOnly(sanitized.differencesOnly);
    setOnlyWithPriceLists(sanitized.onlyWithPriceLists);
    setCompleteCoverageOnly(sanitized.completeCoverageOnly);
    setMinSpread(sanitized.minSpread);
    setSortBy(sanitized.sortBy);
    setVehicleTypeId(sanitized.vehicleTypeId);
    setReferenceCompanyId(sanitized.referenceCompanyId);
    setDisplayMode(sanitized.displayMode);
    setActiveTab(viewModeToTab(sanitized.viewMode || defaults.viewMode));
  };

  const handleTabChange = (_: unknown, newTab: number) => {
    setActiveTab(newTab);
    if (newTab === TAB_STATE) setViewMode('state');
    else if (newTab === TAB_LANE) setViewMode('lane');
    else if (newTab === TAB_SIDE_BY_SIDE) setViewMode('side-by-side');
  };

  const comparisonTabs = useMemo(() => [
    { label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'State Rates', icon: <MapPin className="h-4 w-4" /> },
    { label: 'Branch / City', icon: <LayoutGrid className="h-4 w-4" /> },
    { label: 'Side by Side', icon: <ArrowLeftRight className="h-4 w-4" /> },
    { label: 'Presets', icon: <Bookmark className="h-4 w-4" /> },
  ], []);

  const insights = useMemo(
    () => buildComparisonInsights(visibleCompanies, comparisonRows),
    [comparisonRows, visibleCompanies],
  );

  const displayInsights = activeTab === TAB_OVERVIEW || activeTab === TAB_PRESETS || viewMode === 'side-by-side'
    ? overviewInsights
    : insights;

  const displayRows = activeTab === TAB_OVERVIEW || activeTab === TAB_PRESETS || viewMode === 'side-by-side'
    ? overviewComparisonRows
    : comparisonRows;

  const stats = useMemo(() => {
    const withLists = companies.filter((company) => company.hasPriceList).length;
    const spreads = displayRows.map((row) => row.spread ?? 0).filter((spread) => spread > 0);

    return {
      totalCompanies: companies.length,
      withPriceLists: withLists,
      comparedCompanies: visibleCompanies.length,
      comparedRows: displayRows.length,
      differentRows: displayInsights.totalDifferentRows,
      averageSpread: spreads.length
        ? Math.round(spreads.reduce((sum, spread) => sum + spread, 0) / spreads.length)
        : 0,
      maxSpread: displayInsights.maxSpread,
    };
  }, [companies, displayInsights.maxSpread, displayInsights.totalDifferentRows, displayRows, visibleCompanies.length]);

  const leaderCompany = displayInsights.leader
    ? visibleCompanies.find((company) => company.id === displayInsights.leader?.companyId)
    : null;

  const toggleCompany = (companyId: string) => {
    setSelectedCompanyIds((current) => (
      current.includes(companyId)
        ? current.filter((id) => id !== companyId)
        : [...current, companyId]
    ));
  };

  const selectAllCompanies = () => {
    const ids = companies
      .filter((company) => !onlyWithPriceLists || company.hasPriceList)
      .filter((company) => !destinationFilter || company.destinationLabel === destinationFilter)
      .map((company) => company.id);
    setSelectedCompanyIds(ids);
  };

  const clearCompanySelection = () => {
    setSelectedCompanyIds([]);
  };

  const handleExportCsv = () => {
    const vehicleLabel = vehicleTypes.find((type) => type.id === vehicleTypeId)?.label;

    if (viewMode === 'side-by-side') {
      const leftCompany = sideBySideCandidates.find((company) => company.id === sideBySideLeftId);
      const rightCompany = sideBySideCandidates.find((company) => company.id === sideBySideRightId);

      if (!leftCompany || !rightCompany || leftCompany.id === rightCompany.id) {
        toast.error('Select two different companies before exporting');
        return;
      }

      const rows = buildSideBySideRows(leftCompany, rightCompany, sideBySideRateType, {
        search,
        differencesOnly,
        stateCode: stateFilter,
        completeCoverageOnly,
        minSpread: Number(minSpread) > 0 ? Number(minSpread) : undefined,
        sortBy,
        vehicleMultiplier,
      });

      if (!rows.length) {
        toast.error('Nothing to export for the current comparison');
        return;
      }

      const csv = exportSideBySideCsv(leftCompany, rightCompany, rows, sideBySideRateType, { vehicleLabel });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `company-price-side-by-side-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Side-by-side comparison exported');
      return;
    }

    if (visibleCompanies.length < 2 || comparisonRows.length === 0) {
      toast.error('Nothing to export for the current comparison');
      return;
    }

    const matrixViewMode = viewMode === 'lane' ? 'lane' : 'state';
    const csv = exportComparisonCsv(visibleCompanies, comparisonRows, matrixViewMode, {
      referenceCompanyId: referenceCompanyId || undefined,
      vehicleLabel,
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `company-price-comparison-${viewMode}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Comparison exported');
  };

  const handleSwapSideBySideCompanies = () => {
    setSideBySideLeftId(sideBySideRightId);
    setSideBySideRightId(sideBySideLeftId);
  };

  const handleFilterChange = <K extends keyof ComparisonFiltersState>(
    key: K,
    value: ComparisonFiltersState[K],
  ) => {
    switch (key) {
      case 'typeFilter': setTypeFilter(value as typeof typeFilter); break;
      case 'search': setSearch(value as string); break;
      case 'stateFilter': setStateFilter(value as string); break;
      case 'destinationFilter': setDestinationFilter(value as string); break;
      case 'vehicleTypeId': setVehicleTypeId(value as string); break;
      case 'referenceCompanyId': setReferenceCompanyId(value as string); break;
      case 'displayMode': setDisplayMode(value as DisplayMode); break;
      case 'sortBy': setSortBy(value as ComparisonSortKey); break;
      case 'minSpread': setMinSpread(value as string); break;
      case 'differencesOnly': setDifferencesOnly(value as boolean); break;
      case 'onlyWithPriceLists': setOnlyWithPriceLists(value as boolean); break;
      case 'completeCoverageOnly': setCompleteCoverageOnly(value as boolean); break;
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStateFilter('');
    setDestinationFilter('');
    setReferenceCompanyId('');
    setDisplayMode('absolute');
    setSortBy('spread-desc');
    setMinSpread('');
    setDifferencesOnly(false);
    setOnlyWithPriceLists(true);
    setCompleteCoverageOnly(false);
  };

  const filterState = {
    typeFilter,
    search,
    stateFilter,
    destinationFilter,
    vehicleTypeId,
    referenceCompanyId,
    displayMode,
    sortBy,
    minSpread,
    differencesOnly,
    onlyWithPriceLists,
    completeCoverageOnly,
  };

  const viewModeLabels: Record<ComparisonViewMode, string> = {
    state: 'Matrix: State Rates',
    lane: 'Matrix: Branch / City',
    'side-by-side': 'Side by Side',
  };

  const activeFilterCount = countActiveFilters(filterState);

  const tableMaxSpread = useMemo(
    () => Math.max(...comparisonRows.map((row) => row.spread ?? 0), 1),
    [comparisonRows],
  );

  const renderComparisonToolbar = (options?: { showSwap?: boolean }) => (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
      <Button
        variant={showFilters ? 'primary' : 'outline'}
        size="sm"
        icon={<Filter className="w-4 h-4" />}
        onClick={() => setShowFilters((current) => !current)}
      >
        {`Filters${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`}
      </Button>
      <Button
        variant={showCompanies ? 'primary' : 'outline'}
        size="sm"
        icon={<Building2 className="w-4 h-4" />}
        onClick={() => setShowCompanies((current) => !current)}
      >
        {`Companies (${selectedCompanyIds.length})`}
      </Button>
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={handleResetFilters}>
          Reset filters
        </Button>
      )}
      {options?.showSwap && (
        <Button variant="outline" size="sm" icon={<ArrowLeftRight className="w-4 h-4" />} onClick={handleSwapSideBySideCompanies}>
          Swap companies
        </Button>
      )}
      <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCsv}>
        Export CSV
      </Button>
    </Box>
  );

  const renderFilterPanels = () => {
    if (!showFilters && !showCompanies) return null;

    const sharedFilterProps = {
      companies,
      selectedCompanyIds,
      visibleCompanyCount: visibleCompanies.length,
      loading,
      destinationOptions,
      visibleCompanies,
      filters: filterState,
      onFilterChange: handleFilterChange,
      onToggleCompany: toggleCompany,
      onSelectAllCompanies: selectAllCompanies,
      onClearCompanySelection: clearCompanySelection,
    };

    return (
      <Box sx={{ display: 'grid', gap: 1.5, mb: 2 }}>
        {showFilters && (
          <CompanyPriceComparisonFilters {...sharedFilterProps} panel="filters" showActiveChips />
        )}
        {showCompanies && (
          <CompanyPriceComparisonFilters {...sharedFilterProps} panel="companies" showActiveChips={!showFilters} />
        )}
      </Box>
    );
  };

  const renderLegendBar = () => (
    <Box
      sx={{
        mb: 1.5,
        px: 1.25,
        py: 1,
        borderRadius: 1.5,
        border: '1px solid var(--border)',
        background: 'var(--background)',
        fontSize: '0.82rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.75,
        alignItems: 'center',
      }}
    >
      <Box component="span" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
        {viewMode === 'side-by-side'
          ? `Duel view · ${sideBySideCandidates.length} available compan${sideBySideCandidates.length === 1 ? 'y' : 'ies'}`
          : `${comparisonRows.length} ${viewMode === 'state' ? 'state' : 'lane'} row${comparisonRows.length === 1 ? '' : 's'} · ${visibleCompanies.length} compan${visibleCompanies.length === 1 ? 'y' : 'ies'}`}
      </Box>
      {vehicleMultiplier !== 1 && (
        <Box
          component="span"
          sx={{
            px: 0.75,
            py: 0.25,
            borderRadius: 999,
            fontSize: '0.72rem',
            fontWeight: 600,
            bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
            color: 'var(--accent-gold)',
            border: '1px solid rgba(var(--accent-gold-rgb), 0.25)',
          }}
        >
          {vehicleMultiplier}x vehicle adjustment
        </Box>
      )}
      <Box component="span" sx={{ ml: 'auto', display: 'inline-flex', gap: 0.75, alignItems: 'center' }}>
        <Box component="span" sx={{ px: 0.75, py: 0.25, borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, color: 'var(--success-dark)', bgcolor: 'rgba(var(--success-rgb), 0.08)', border: '1px solid rgba(var(--success-rgb), 0.2)' }}>
          Lowest
        </Box>
        <Box component="span" sx={{ px: 0.75, py: 0.25, borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, color: 'var(--error-dark)', bgcolor: 'rgba(var(--error-rgb), 0.06)', border: '1px solid rgba(var(--error-rgb), 0.15)' }}>
          Highest
        </Box>
      </Box>
    </Box>
  );

  const renderMatrixTable = (matrixViewMode: 'state' | 'lane') => {
    if (loading) {
      return <SkeletonTable rows={8} columns={Math.max(visibleCompanies.length + 2, 4)} />;
    }

    if (visibleCompanies.length < 2) {
      return (
        <EmptyState
          icon={<GitCompareArrows />}
          title="Select at least two companies"
          description="Choose two or more carriers with uploaded price lists to start comparing rates."
          action={
            <Button variant="outline" size="sm" onClick={() => { setShowCompanies(true); selectAllCompanies(); }}>
              Select companies
            </Button>
          }
        />
      );
    }

    return (
      <Box sx={{ border: '1px solid var(--border)', borderRadius: 2, overflow: 'hidden', boxShadow: '0 1px 3px rgba(var(--text-primary-rgb),0.06)' }}>
        <Box sx={{ maxHeight: 620, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '12px 14px', minWidth: 220, position: 'sticky', top: 0, left: 0, background: 'var(--panel)', zIndex: 3, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                  {matrixViewMode === 'state' ? 'State' : 'Lane'}
                </th>
                {visibleCompanies.map((company) => (
                  <th key={company.id} style={{ textAlign: 'right', padding: '12px 14px', minWidth: 150, position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 2 }}>
                    <Link href={`/dashboard/finance/companies/${company.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      <Box sx={{ fontWeight: 700 }}>{company.name}</Box>
                      <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{company.destinationLabel}</Box>
                    </Link>
                  </th>
                ))}
                <th style={{ textAlign: 'right', padding: '12px 14px', minWidth: 100, position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 2, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Spread</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', minWidth: 90, position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 2, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Coverage</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.length > 0 ? comparisonRows.map((row, rowIndex) => {
                const comparableRates = Object.values(row.rates).filter((value): value is number => value !== null);
                const hasMultipleRates = comparableRates.length > 1;
                const referenceRate = referenceCompanyId ? row.rates[referenceCompanyId] ?? null : undefined;
                const rowBg = rowIndex % 2 === 0 ? 'var(--background)' : 'rgba(var(--text-primary-rgb), 0.015)';

                return (
                  <tr
                    key={row.key}
                    style={{ borderBottom: '1px solid var(--border)', background: rowBg, transition: 'background 0.15s ease' }}
                    onMouseEnter={(event) => { event.currentTarget.style.background = 'rgba(var(--accent-gold-rgb), 0.05)'; }}
                    onMouseLeave={(event) => { event.currentTarget.style.background = rowBg; }}
                  >
                    <td style={{ padding: '10px 14px', position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>
                      <Box sx={{ fontWeight: 700 }}>{row.label}</Box>
                      {matrixViewMode === 'lane' && (
                        <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{row.stateCode}</Box>
                      )}
                    </td>
                    {visibleCompanies.map((company) => (
                      <td key={`${row.key}-${company.id}`} style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <RateCell
                          value={row.rates[company.id] ?? null}
                          minRate={row.minRate}
                          maxRate={row.maxRate}
                          hasMultipleRates={hasMultipleRates}
                          referenceRate={referenceRate}
                          displayMode={displayMode}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <SpreadBar spread={row.spread} maxSpread={tableMaxSpread} />
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <Box component="span" sx={{ display: 'inline-flex', px: 0.75, py: 0.25, borderRadius: 999, fontSize: '0.78rem', fontWeight: row.coverageCount < visibleCompanies.length ? 700 : 500, color: row.coverageCount < visibleCompanies.length ? 'var(--status-yellow-dark)' : 'var(--text-secondary)', bgcolor: row.coverageCount < visibleCompanies.length ? 'rgba(var(--status-yellow-rgb), 0.12)' : 'transparent', border: row.coverageCount < visibleCompanies.length ? '1px solid rgba(var(--status-yellow-rgb), 0.25)' : '1px solid transparent' }}>
                        {row.coverageCount}/{visibleCompanies.length}
                      </Box>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={visibleCompanies.length + 3}>
                    <EmptyState
                      icon={<GitCompareArrows />}
                      title="No matching rows"
                      description="Try loosening filters, selecting more companies, or uploading price lists on company ledger pages."
                      action={
                        <Button variant="outline" size="sm" onClick={() => { handleResetFilters(); setShowFilters(true); }}>
                          Adjust filters
                        </Button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      </Box>
    );
  };

  const renderStatsGrid = () => (
    loading ? (
      <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-5 mb-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonStatsCard key={index} />
        ))}
      </DashboardGrid>
    ) : (
      <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-5 mb-4">
        <StatsCard icon={<GitCompareArrows className="w-5 h-5" />} title="Compared" value={stats.comparedCompanies} subtitle={`${stats.withPriceLists} with price lists`} variant="default" delay={0} />
        <StatsCard icon={<Building2 className="w-5 h-5" />} title="Rows Shown" value={stats.comparedRows} subtitle={comparisonTabs[activeTab]?.label ?? viewModeLabels[viewMode]} variant="info" delay={0.05} />
        <StatsCard icon={<GitCompareArrows className="w-5 h-5" />} title="Different Rows" value={stats.differentRows} subtitle="Rows with price gaps" variant="warning" delay={0.1} />
        <StatsCard icon={<GitCompareArrows className="w-5 h-5" />} title="Avg Spread" value={stats.averageSpread ? formatCurrency(stats.averageSpread) : '—'} subtitle={stats.maxSpread ? `Max ${formatCurrency(stats.maxSpread)}` : 'No spreads yet'} variant="success" delay={0.15} />
        <StatsCard icon={<Trophy className="w-5 h-5" />} title="Best Value Leader" value={leaderCompany?.name || '—'} subtitle={displayInsights.leader ? `${displayInsights.leader.wins} row wins` : 'Needs 2+ companies'} variant="default" delay={0.2} />
      </DashboardGrid>
    )
  );

  return (
    <PermissionRoute permission="finance:view">
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Company Price Comparison"
          description="Compare imported shipping rate sheets, spot the cheapest carrier, and export results"
          actions={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.push('/dashboard/finance')}>
                Finance
              </Button>
              <Button variant="outline" icon={<Building2 className="w-4 h-4" />} onClick={() => router.push('/dashboard/finance/companies')}>
                Company Ledgers
              </Button>
            </Box>
          }
        />

        {renderStatsGrid()}

        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 15,
            border: '1px solid var(--border)',
            borderRadius: '12px',
            backgroundColor: 'var(--panel)',
            boxShadow: '0 12px 28px rgba(var(--text-primary-rgb),0.08)',
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 52,
              '& .MuiTabs-flexContainer': { gap: 0.25, px: 1 },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 650,
                color: 'var(--text-secondary)',
                minHeight: 52,
                borderRadius: '10px',
                my: 0.75,
                px: 1.5,
                '&:hover': {
                  color: 'var(--accent-gold)',
                  backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)',
                },
              },
              '& .Mui-selected': {
                color: 'var(--accent-gold) !important',
                backgroundColor: 'rgba(var(--accent-gold-rgb), 0.1)',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'var(--accent-gold)',
                height: 3,
              },
            }}
          >
            {comparisonTabs.map((tab, index) => (
              <Tab
                key={tab.label}
                id={`comparison-tab-${index}`}
                aria-controls={`comparison-tabpanel-${index}`}
                icon={tab.icon}
                iconPosition="start"
                label={tab.label}
              />
            ))}
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={TAB_OVERVIEW}>
          <DashboardPanel
            title="Comparison Overview"
            description="High-level stats, leader rankings, and the biggest price gaps across selected carriers"
            actions={
              <Button variant="outline" size="sm" onClick={() => setActiveTab(TAB_STATE)}>
                Open state matrix
              </Button>
            }
          >
            {visibleCompanies.length >= 2 && overviewComparisonRows.length > 0 ? (
              <CompanyPriceComparisonInsights
                visibleCompanies={visibleCompanies}
                scorecards={overviewScorecards}
                insights={overviewInsights}
                formatCurrency={formatCurrency}
              />
            ) : (
              <EmptyState
                icon={<LayoutDashboard />}
                title="No comparison data yet"
                description="Select at least two companies and open a comparison tab to populate the overview."
                action={
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Button variant="outline" size="sm" onClick={() => { setActiveTab(TAB_PRESETS); setShowCompanies(true); }}>
                      Configure companies
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setActiveTab(TAB_STATE)}>
                      Start comparing
                    </Button>
                  </Box>
                }
              />
            )}
          </DashboardPanel>
        </TabPanel>

        <TabPanel value={activeTab} index={TAB_STATE}>
          <DashboardPanel
            title="State Rate Matrix"
            description="Compare per-state shipping rates across all selected companies"
          >
            {renderComparisonToolbar()}
            {renderFilterPanels()}
            {renderLegendBar()}
            {renderMatrixTable('state')}
          </DashboardPanel>
        </TabPanel>

        <TabPanel value={activeTab} index={TAB_LANE}>
          <DashboardPanel
            title="Branch / City Matrix"
            description="Compare lane-level auction rates by branch, city, and loading point"
          >
            {renderComparisonToolbar()}
            {renderFilterPanels()}
            {renderLegendBar()}
            {renderMatrixTable('lane')}
          </DashboardPanel>
        </TabPanel>

        <TabPanel value={activeTab} index={TAB_SIDE_BY_SIDE}>
          <DashboardPanel
            title="Side by Side Comparison"
            description="Head-to-head duel between two carriers across overlapping rate rows"
          >
            {renderComparisonToolbar({ showSwap: true })}
            {renderFilterPanels()}
            {renderLegendBar()}
            {loading ? (
              <SkeletonTable rows={6} columns={3} />
            ) : (
              <CompanyPriceComparisonSideBySide
                companies={sideBySideCandidates}
                leftCompanyId={sideBySideLeftId}
                rightCompanyId={sideBySideRightId}
                rateType={sideBySideRateType}
                onLeftCompanyChange={setSideBySideLeftId}
                onRightCompanyChange={setSideBySideRightId}
                onRateTypeChange={setSideBySideRateType}
                search={search}
                stateFilter={stateFilter}
                differencesOnly={differencesOnly}
                completeCoverageOnly={completeCoverageOnly}
                minSpread={minSpread}
                sortBy={sortBy}
                vehicleMultiplier={vehicleMultiplier}
                formatCurrency={formatCurrency}
                formatSignedCurrency={formatSignedCurrency}
              />
            )}
          </DashboardPanel>
        </TabPanel>

        <TabPanel value={activeTab} index={TAB_PRESETS}>
          <DashboardPanel
            title="Presets & Setup"
            description="Save comparison configurations and manage company selection and filters"
          >
            <CompanyPriceComparisonPresets
              currentConfig={currentPresetConfig}
              onApply={applyPresetConfig}
            />
            <Box sx={{ mt: 2 }}>
              <CompanyPriceComparisonFilters
                companies={companies}
                selectedCompanyIds={selectedCompanyIds}
                visibleCompanyCount={visibleCompanies.length}
                loading={loading}
                destinationOptions={destinationOptions}
                visibleCompanies={visibleCompanies}
                filters={filterState}
                panel="all"
                onFilterChange={handleFilterChange}
                onToggleCompany={toggleCompany}
                onSelectAllCompanies={selectAllCompanies}
                onClearCompanySelection={clearCompanySelection}
              />
            </Box>
            {activeFilterCount > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  Reset all filters
                </Button>
              </Box>
            )}
          </DashboardPanel>
        </TabPanel>
      </DashboardSurface>
    </PermissionRoute>
  );
}