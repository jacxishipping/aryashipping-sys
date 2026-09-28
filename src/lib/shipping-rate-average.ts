import {
  type AuctionRateEntry,
  type ShippingRateCalculatorConfig,
  normalizeShippingRateConfig,
} from '@/lib/shipping-rate-calculator';

export type CompanyRateEstimateSource = {
  companyId: string;
  companyName: string;
  priceListId?: string | null;
  priceListName?: string | null;
  sourceFileName?: string | null;
  config: unknown;
};

export type CompanyRateEstimate = {
  companyId: string;
  companyName: string;
  priceListId: string | null;
  priceListName: string | null;
  sourceFileName: string | null;
  baseRate: number;
  rateType: 'lane_average' | 'auction_average' | 'state_rate';
  matchedAuctionRows: number;
};

export type AverageCompanyRateEstimate = {
  originState: string;
  matchLevel: 'lane' | 'state' | 'none';
  averageBaseRate: number | null;
  companyCount: number;
  matchedAuctionRows: number;
  sources: CompanyRateEstimate[];
};

export type AverageCompanyRateOptions = {
  city?: string | null;
  branch?: string | null;
  loadingPoint?: string | null;
};

function normalizeSearchText(value?: string | null) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getRawStateRates(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const stateRates = (value as { stateRates?: unknown }).stateRates;
  return stateRates && typeof stateRates === 'object' && !Array.isArray(stateRates)
    ? stateRates as Record<string, unknown>
    : {};
}

function getStateAuctionRates(config: ShippingRateCalculatorConfig, originState: string) {
  return config.auctionRates.filter((rate) => rate.stateCode === originState && Number.isFinite(rate.total) && rate.total > 0);
}

function getLaneAuctionRates(rates: AuctionRateEntry[], options: AverageCompanyRateOptions) {
  const city = normalizeSearchText(options.city);
  const branch = normalizeSearchText(options.branch);
  const loadingPoint = normalizeSearchText(options.loadingPoint);

  if (!city && !branch && !loadingPoint) return [];

  return rates.filter((rate) => {
    if (city && normalizeSearchText(rate.city) !== city) return false;
    if (branch && normalizeSearchText(rate.branch) !== branch) return false;
    if (loadingPoint && normalizeSearchText(rate.loadingPoint) !== loadingPoint) return false;
    return true;
  });
}

function average(numbers: number[]) {
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export function buildAverageCompanyRateEstimate(
  sources: CompanyRateEstimateSource[],
  originState: string,
  options: AverageCompanyRateOptions = {},
): AverageCompanyRateEstimate {
  const normalizedState = originState.trim().toUpperCase();
  const laneEstimates: CompanyRateEstimate[] = [];
  const stateEstimates: CompanyRateEstimate[] = [];

  for (const source of sources) {
    const config = normalizeShippingRateConfig(source.config);
    const auctionRates = getStateAuctionRates(config, normalizedState);
    const laneAuctionRates = getLaneAuctionRates(auctionRates, options);
    const laneAverage = average(laneAuctionRates.map((rate: AuctionRateEntry) => rate.total));
    const stateAuctionAverage = average(auctionRates.map((rate: AuctionRateEntry) => rate.total));
    const rawStateRates = getRawStateRates(source.config);
    const rawStateRate = rawStateRates[normalizedState];
    const parsedStateRate = typeof rawStateRate === 'number'
      ? rawStateRate
      : Number(String(rawStateRate ?? '').replace(/[$,\s]/g, ''));
    const hasStateRate = Number.isFinite(parsedStateRate) && parsedStateRate > 0;
    const stateBaseRate = stateAuctionAverage ?? (hasStateRate ? parsedStateRate : null);
    const common = {
      companyId: source.companyId,
      companyName: source.companyName,
      priceListId: source.priceListId || null,
      priceListName: source.priceListName || null,
      sourceFileName: source.sourceFileName || null,
    };

    if (laneAverage) {
      laneEstimates.push({
        ...common,
        baseRate: Math.round(laneAverage),
        rateType: 'lane_average',
        matchedAuctionRows: laneAuctionRates.length,
      });
    }

    if (stateBaseRate) {
      stateEstimates.push({
        ...common,
        baseRate: Math.round(stateBaseRate),
        rateType: stateAuctionAverage ? 'auction_average' : 'state_rate',
        matchedAuctionRows: auctionRates.length,
      });
    }
  }

  const estimates = laneEstimates.length ? laneEstimates : stateEstimates;
  const averageBaseRate = average(estimates.map((estimate) => estimate.baseRate));

  return {
    originState: normalizedState,
    matchLevel: laneEstimates.length ? 'lane' : estimates.length ? 'state' : 'none',
    averageBaseRate: averageBaseRate === null ? null : Math.round(averageBaseRate),
    companyCount: estimates.length,
    matchedAuctionRows: estimates.reduce((sum, estimate) => sum + estimate.matchedAuctionRows, 0),
    sources: estimates,
  };
}
