import type { ComparisonSortKey } from '@/lib/company-price-comparison';

export type ComparisonViewMode = 'state' | 'lane' | 'side-by-side';
export type ComparisonDisplayMode = 'absolute' | 'delta';
export type CompanyTypeFilter = 'ALL' | 'SHIPPING' | 'DISPATCH' | 'TRANSIT';
export type SideBySideRateType = 'state' | 'lane';

export type ComparisonPresetConfig = {
  typeFilter: CompanyTypeFilter;
  selectedCompanyIds: string[];
  viewMode: ComparisonViewMode;
  sideBySideLeftId: string;
  sideBySideRightId: string;
  sideBySideRateType: SideBySideRateType;
  search: string;
  stateFilter: string;
  destinationFilter: string;
  differencesOnly: boolean;
  onlyWithPriceLists: boolean;
  completeCoverageOnly: boolean;
  minSpread: string;
  sortBy: ComparisonSortKey;
  vehicleTypeId: string;
  referenceCompanyId: string;
  displayMode: ComparisonDisplayMode;
};

export type ComparisonPreset = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  config: ComparisonPresetConfig;
};

export const COMPARISON_PRESETS_STORAGE_KEY = 'jacxi:company-price-comparison-presets';
export const COMPARISON_PRESETS_MAX = 20;

export function createDefaultComparisonPresetConfig(): ComparisonPresetConfig {
  return {
    typeFilter: 'SHIPPING',
    selectedCompanyIds: [],
    viewMode: 'state',
    sideBySideLeftId: '',
    sideBySideRightId: '',
    sideBySideRateType: 'state',
    search: '',
    stateFilter: '',
    destinationFilter: '',
    differencesOnly: false,
    onlyWithPriceLists: true,
    completeCoverageOnly: false,
    minSpread: '',
    sortBy: 'spread-desc',
    vehicleTypeId: 'sedan',
    referenceCompanyId: '',
    displayMode: 'absolute',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePresetConfig(value: unknown): ComparisonPresetConfig {
  const defaults = createDefaultComparisonPresetConfig();
  if (!isRecord(value)) return defaults;

  const typeFilter = value.typeFilter;
  const viewMode = value.viewMode;
  const displayMode = value.displayMode;
  const sideBySideRateType = value.sideBySideRateType;
  const sortBy = value.sortBy;

  return {
    typeFilter: typeFilter === 'ALL' || typeFilter === 'SHIPPING' || typeFilter === 'DISPATCH' || typeFilter === 'TRANSIT'
      ? typeFilter
      : defaults.typeFilter,
    selectedCompanyIds: Array.isArray(value.selectedCompanyIds)
      ? value.selectedCompanyIds.map((id) => String(id)).filter(Boolean)
      : defaults.selectedCompanyIds,
    viewMode: viewMode === 'state' || viewMode === 'lane' || viewMode === 'side-by-side'
      ? viewMode
      : defaults.viewMode,
    sideBySideLeftId: typeof value.sideBySideLeftId === 'string' ? value.sideBySideLeftId : defaults.sideBySideLeftId,
    sideBySideRightId: typeof value.sideBySideRightId === 'string' ? value.sideBySideRightId : defaults.sideBySideRightId,
    sideBySideRateType: sideBySideRateType === 'lane' ? 'lane' : 'state',
    search: typeof value.search === 'string' ? value.search : defaults.search,
    stateFilter: typeof value.stateFilter === 'string' ? value.stateFilter : defaults.stateFilter,
    destinationFilter: typeof value.destinationFilter === 'string' ? value.destinationFilter : defaults.destinationFilter,
    differencesOnly: value.differencesOnly === true,
    onlyWithPriceLists: value.onlyWithPriceLists !== false,
    completeCoverageOnly: value.completeCoverageOnly === true,
    minSpread: typeof value.minSpread === 'string' ? value.minSpread : defaults.minSpread,
    sortBy: typeof sortBy === 'string' ? sortBy as ComparisonSortKey : defaults.sortBy,
    vehicleTypeId: typeof value.vehicleTypeId === 'string' ? value.vehicleTypeId : defaults.vehicleTypeId,
    referenceCompanyId: typeof value.referenceCompanyId === 'string' ? value.referenceCompanyId : defaults.referenceCompanyId,
    displayMode: displayMode === 'delta' ? 'delta' : 'absolute',
  };
}

function normalizePreset(value: unknown): ComparisonPreset | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null;
  }

  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString();
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : createdAt;

  return {
    id: value.id,
    name: value.name.trim() || 'Untitled preset',
    createdAt,
    updatedAt,
    config: normalizePresetConfig(value.config),
  };
}

export function loadComparisonPresets(storage?: Pick<Storage, 'getItem'>): ComparisonPreset[] {
  if (typeof window === 'undefined' && !storage) return [];

  try {
    const raw = storage?.getItem(COMPARISON_PRESETS_STORAGE_KEY)
      ?? (typeof window !== 'undefined' ? window.localStorage.getItem(COMPARISON_PRESETS_STORAGE_KEY) : null);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizePreset(item))
      .filter((item): item is ComparisonPreset => Boolean(item))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [];
  }
}

function writeComparisonPresets(presets: ComparisonPreset[], storage?: Pick<Storage, 'setItem'>) {
  const payload = JSON.stringify(presets);

  if (storage) {
    storage.setItem(COMPARISON_PRESETS_STORAGE_KEY, payload);
    return;
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(COMPARISON_PRESETS_STORAGE_KEY, payload);
  }
}

export function saveComparisonPreset(
  name: string,
  config: ComparisonPresetConfig,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): ComparisonPreset {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Preset name is required');
  }

  const presets = loadComparisonPresets(storage);
  const timestamp = new Date().toISOString();
  const preset: ComparisonPreset = {
    id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmedName,
    createdAt: timestamp,
    updatedAt: timestamp,
    config: normalizePresetConfig(config),
  };

  const nextPresets = [preset, ...presets].slice(0, COMPARISON_PRESETS_MAX);
  writeComparisonPresets(nextPresets, storage);
  return preset;
}

export function updateComparisonPreset(
  presetId: string,
  updates: { name?: string; config?: ComparisonPresetConfig },
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): ComparisonPreset {
  const presets = loadComparisonPresets(storage);
  const index = presets.findIndex((preset) => preset.id === presetId);

  if (index === -1) {
    throw new Error('Preset not found');
  }

  const current = presets[index];
  const nextPreset: ComparisonPreset = {
    ...current,
    name: updates.name?.trim() || current.name,
    updatedAt: new Date().toISOString(),
    config: updates.config ? normalizePresetConfig(updates.config) : current.config,
  };

  const nextPresets = [...presets];
  nextPresets[index] = nextPreset;
  writeComparisonPresets(nextPresets, storage);
  return nextPreset;
}

export function deleteComparisonPreset(
  presetId: string,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
) {
  const presets = loadComparisonPresets(storage);
  writeComparisonPresets(presets.filter((preset) => preset.id !== presetId), storage);
}

export function sanitizePresetConfigForCompanies(
  config: ComparisonPresetConfig,
  availableCompanyIds: string[],
): ComparisonPresetConfig {
  const available = new Set(availableCompanyIds);
  const selectedCompanyIds = config.selectedCompanyIds.filter((id) => available.has(id));
  const sideBySideLeftId = available.has(config.sideBySideLeftId) ? config.sideBySideLeftId : '';
  const sideBySideRightId = available.has(config.sideBySideRightId) ? config.sideBySideRightId : '';
  const referenceCompanyId = available.has(config.referenceCompanyId) ? config.referenceCompanyId : '';

  return {
    ...config,
    selectedCompanyIds,
    sideBySideLeftId,
    sideBySideRightId,
    referenceCompanyId,
  };
}