import {
  type AuctionRateEntry,
  US_STATES,
} from '@/lib/shipping-rate-calculator';

export type CompanyPriceSnapshot = {
  id: string;
  name: string;
  code: string | null;
  companyType: string;
  destinationLabel: string;
  hasPriceList: boolean;
  stateRates: Record<string, number>;
  auctionRates: AuctionRateEntry[];
  activePriceListName?: string | null;
};

export type ComparisonRateRow = {
  key: string;
  label: string;
  stateCode: string;
  branch?: string;
  city?: string;
  loadingPoint?: string | null;
  rates: Record<string, number | null>;
  minRate: number | null;
  maxRate: number | null;
  spread: number | null;
  coverageCount: number;
};

export type ComparisonSortKey = 'label-asc' | 'label-desc' | 'spread-asc' | 'spread-desc' | 'coverage-asc' | 'coverage-desc';

export type CompanyScorecard = {
  companyId: string;
  wins: number;
  ties: number;
  coverageCount: number;
  coveragePercent: number;
  averageRate: number | null;
};

export type ComparisonInsight = {
  topSpreads: ComparisonRateRow[];
  leader: {
    companyId: string;
    wins: number;
  } | null;
  totalDifferentRows: number;
  maxSpread: number | null;
};

const stateNameByCode = new Map(US_STATES.map((state) => [state.code, state.name]));

function normalizeLanePart(value: string) {
  return value.trim().toLowerCase();
}

export function buildLaneKey(rate: Pick<AuctionRateEntry, 'stateCode' | 'branch' | 'city' | 'loadingPoint'>) {
  return [
    rate.stateCode,
    normalizeLanePart(rate.branch),
    normalizeLanePart(rate.city),
    normalizeLanePart(rate.loadingPoint || ''),
  ].join('|');
}

function summarizeRates(rates: Record<string, number | null>) {
  const values = Object.values(rates).filter((value): value is number => value !== null);

  if (!values.length) {
    return { minRate: null, maxRate: null, spread: null, coverageCount: 0 };
  }

  const minRate = Math.min(...values);
  const maxRate = Math.max(...values);

  return {
    minRate,
    maxRate,
    spread: maxRate - minRate,
    coverageCount: values.length,
  };
}

function matchesSearch(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

function finalizeRow(row: Omit<ComparisonRateRow, 'coverageCount'> & Partial<Pick<ComparisonRateRow, 'coverageCount'>>) {
  const summary = summarizeRates(row.rates);
  return {
    ...row,
    ...summary,
  };
}

export function applyRateMultiplier(rate: number | null, multiplier: number) {
  if (rate === null || !Number.isFinite(multiplier) || multiplier <= 0) return rate;
  return Math.round(rate * multiplier);
}

export function adjustComparisonRows(rows: ComparisonRateRow[], multiplier: number) {
  if (multiplier === 1) return rows;

  return rows.map((row) => {
    const rates = Object.fromEntries(
      Object.entries(row.rates).map(([companyId, rate]) => [companyId, applyRateMultiplier(rate, multiplier)]),
    );

    return finalizeRow({
      ...row,
      rates,
    });
  });
}

export function sortComparisonRows(rows: ComparisonRateRow[], sortBy: ComparisonSortKey) {
  const sorted = [...rows];

  sorted.sort((left, right) => {
    switch (sortBy) {
      case 'label-desc':
        return right.label.localeCompare(left.label);
      case 'spread-asc':
        return (left.spread ?? -1) - (right.spread ?? -1);
      case 'spread-desc':
        return (right.spread ?? -1) - (left.spread ?? -1);
      case 'coverage-asc':
        return left.coverageCount - right.coverageCount;
      case 'coverage-desc':
        return right.coverageCount - left.coverageCount;
      case 'label-asc':
      default:
        return left.label.localeCompare(right.label);
    }
  });

  return sorted;
}

export function buildStateComparisonRows(
  companies: CompanyPriceSnapshot[],
  options?: {
    search?: string;
    differencesOnly?: boolean;
    stateCode?: string;
    minSpread?: number;
    completeCoverageOnly?: boolean;
  },
) {
  const selectedCompanies = companies.filter(Boolean);
  const search = options?.search?.trim() || '';
  const stateCodeFilter = options?.stateCode?.trim().toUpperCase() || '';
  const minSpread = options?.minSpread ?? 0;

  const stateCodes = new Set<string>();

  for (const company of selectedCompanies) {
    for (const code of Object.keys(company.stateRates)) {
      stateCodes.add(code);
    }
  }

  const rows: ComparisonRateRow[] = [];

  for (const stateCode of [...stateCodes].sort()) {
    if (stateCodeFilter && stateCode !== stateCodeFilter) continue;

    const stateName = stateNameByCode.get(stateCode) || stateCode;
    const label = `${stateCode} — ${stateName}`;

    if (search && !matchesSearch(label, search) && !matchesSearch(stateCode, search)) {
      continue;
    }

    const rates: Record<string, number | null> = {};

    for (const company of selectedCompanies) {
      rates[company.id] = company.stateRates[stateCode] ?? null;
    }

    const row = finalizeRow({
      key: stateCode,
      label,
      stateCode,
      rates,
      minRate: null,
      maxRate: null,
      spread: null,
    });

    if (options?.completeCoverageOnly && row.coverageCount < selectedCompanies.length) continue;
    if (options?.differencesOnly && (row.spread ?? 0) <= 0) continue;
    if ((row.spread ?? 0) < minSpread) continue;

    rows.push(row);
  }

  return rows;
}

export function buildLaneComparisonRows(
  companies: CompanyPriceSnapshot[],
  options?: {
    search?: string;
    differencesOnly?: boolean;
    stateCode?: string;
    minSpread?: number;
    completeCoverageOnly?: boolean;
  },
) {
  const selectedCompanies = companies.filter(Boolean);
  const search = options?.search?.trim() || '';
  const stateCodeFilter = options?.stateCode?.trim().toUpperCase() || '';
  const minSpread = options?.minSpread ?? 0;
  const laneMap = new Map<string, ComparisonRateRow>();

  for (const company of selectedCompanies) {
    for (const rate of company.auctionRates) {
      if (stateCodeFilter && rate.stateCode !== stateCodeFilter) continue;

      const key = buildLaneKey(rate);
      const location = [rate.branch, rate.city].filter(Boolean).join(' — ') || rate.stateCode;
      const label = rate.loadingPoint ? `${location} (${rate.loadingPoint})` : location;

      if (!laneMap.has(key)) {
        laneMap.set(key, finalizeRow({
          key,
          label,
          stateCode: rate.stateCode,
          branch: rate.branch,
          city: rate.city,
          loadingPoint: rate.loadingPoint || null,
          rates: Object.fromEntries(selectedCompanies.map((item) => [item.id, null])),
          minRate: null,
          maxRate: null,
          spread: null,
        }));
      }

      laneMap.get(key)!.rates[company.id] = rate.total;
    }
  }

  let rows = [...laneMap.values()]
    .map((row) => finalizeRow(row))
    .sort((left, right) => {
      const stateCompare = left.stateCode.localeCompare(right.stateCode);
      if (stateCompare !== 0) return stateCompare;
      return left.label.localeCompare(right.label);
    });

  if (search) {
    rows = rows.filter((row) => (
      matchesSearch(row.label, search)
      || matchesSearch(row.stateCode, search)
      || matchesSearch(row.branch || '', search)
      || matchesSearch(row.city || '', search)
      || matchesSearch(row.loadingPoint || '', search)
    ));
  }

  if (options?.completeCoverageOnly) {
    rows = rows.filter((row) => row.coverageCount >= selectedCompanies.length);
  }

  if (options?.differencesOnly) {
    rows = rows.filter((row) => (row.spread ?? 0) > 0);
  }

  if (minSpread > 0) {
    rows = rows.filter((row) => (row.spread ?? 0) >= minSpread);
  }

  return rows;
}

export function buildCompanyScorecards(
  companies: CompanyPriceSnapshot[],
  rows: ComparisonRateRow[],
): CompanyScorecard[] {
  const totals = new Map<string, { wins: number; ties: number; covered: number; rateSum: number; rateCount: number }>();

  for (const company of companies) {
    totals.set(company.id, { wins: 0, ties: 0, covered: 0, rateSum: 0, rateCount: 0 });
  }

  for (const row of rows) {
    const values = Object.entries(row.rates).filter((entry): entry is [string, number] => entry[1] !== null);
    if (values.length === 0) continue;

    const minRate = Math.min(...values.map(([, rate]) => rate));
    const winners = values.filter(([, rate]) => rate === minRate).map(([companyId]) => companyId);

    for (const [companyId, rate] of values) {
      const bucket = totals.get(companyId);
      if (!bucket) continue;
      bucket.covered += 1;
      bucket.rateSum += rate;
      bucket.rateCount += 1;
    }

    if (winners.length === 1) {
      totals.get(winners[0])!.wins += 1;
    } else if (winners.length > 1) {
      for (const winnerId of winners) {
        totals.get(winnerId)!.ties += 1;
      }
    }
  }

  return companies.map((company) => {
    const bucket = totals.get(company.id) || { wins: 0, ties: 0, covered: 0, rateSum: 0, rateCount: 0 };
    return {
      companyId: company.id,
      wins: bucket.wins,
      ties: bucket.ties,
      coverageCount: bucket.covered,
      coveragePercent: rows.length ? Math.round((bucket.covered / rows.length) * 100) : 0,
      averageRate: bucket.rateCount ? Math.round(bucket.rateSum / bucket.rateCount) : null,
    };
  }).sort((left, right) => right.wins - left.wins || (left.averageRate ?? Number.MAX_SAFE_INTEGER) - (right.averageRate ?? Number.MAX_SAFE_INTEGER));
}

export function buildComparisonInsights(
  companies: CompanyPriceSnapshot[],
  rows: ComparisonRateRow[],
): ComparisonInsight {
  const scorecards = buildCompanyScorecards(companies, rows);
  const differentRows = rows.filter((row) => (row.spread ?? 0) > 0);
  const topSpreads = [...differentRows].sort((left, right) => (right.spread ?? 0) - (left.spread ?? 0)).slice(0, 5);
  const leader = scorecards[0]?.wins ? { companyId: scorecards[0].companyId, wins: scorecards[0].wins } : null;

  return {
    topSpreads,
    leader,
    totalDifferentRows: differentRows.length,
    maxSpread: topSpreads[0]?.spread ?? null,
  };
}

export function getRateDelta(rate: number | null, referenceRate: number | null) {
  if (rate === null || referenceRate === null) return null;
  return rate - referenceRate;
}

export function exportComparisonCsv(
  companies: CompanyPriceSnapshot[],
  rows: ComparisonRateRow[],
  viewMode: 'state' | 'lane',
  options?: {
    referenceCompanyId?: string;
    vehicleLabel?: string;
  },
) {
  const headers = [
    viewMode === 'state' ? 'State' : 'Lane',
    'State Code',
    ...companies.map((company) => company.name),
    ...(options?.referenceCompanyId ? companies.filter((company) => company.id !== options.referenceCompanyId).map((company) => `${company.name} vs reference`) : []),
    'Spread',
    'Coverage',
  ];

  const csvRows = rows.map((row) => {
    const referenceRate = options?.referenceCompanyId ? row.rates[options.referenceCompanyId] ?? null : null;
    const values = [
      row.label,
      row.stateCode,
      ...companies.map((company) => {
        const rate = row.rates[company.id];
        return rate === null ? '' : String(rate);
      }),
      ...(options?.referenceCompanyId
        ? companies
          .filter((company) => company.id !== options.referenceCompanyId)
          .map((company) => {
            const delta = getRateDelta(row.rates[company.id] ?? null, referenceRate);
            return delta === null ? '' : String(delta);
          })
        : []),
      row.spread === null ? '' : String(row.spread),
      `${row.coverageCount}/${companies.length}`,
    ];

    return values;
  });

  const meta = [
    ['Exported At', new Date().toISOString()],
    ['View', viewMode === 'state' ? 'State Rates' : 'Branch/City Lanes'],
    ...(options?.vehicleLabel ? [['Vehicle Type', options.vehicleLabel]] : []),
    ...(options?.referenceCompanyId
      ? [['Reference Company', companies.find((company) => company.id === options.referenceCompanyId)?.name || options.referenceCompanyId]]
      : []),
    [],
  ];

  const lines = [...meta, headers, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return lines;
}