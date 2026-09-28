import {
  adjustComparisonRows,
  buildLaneComparisonRows,
  buildStateComparisonRows,
  getRateDelta,
  sortComparisonRows,
  type CompanyPriceSnapshot,
  type ComparisonRateRow,
  type ComparisonSortKey,
} from '@/lib/company-price-comparison';
import type { SideBySideRateType } from '@/lib/company-price-comparison-presets';

export type SideBySideWinner = 'left' | 'right' | 'tie' | 'left-only' | 'right-only' | 'none';

export type SideBySideRow = {
  key: string;
  label: string;
  stateCode: string;
  leftRate: number | null;
  rightRate: number | null;
  delta: number | null;
  spread: number | null;
  winner: SideBySideWinner;
};

export type SideBySideSummary = {
  leftWins: number;
  rightWins: number;
  ties: number;
  leftOnly: number;
  rightOnly: number;
  comparedRows: number;
  averageLeft: number | null;
  averageRight: number | null;
  averageDelta: number | null;
  totalLeftSavings: number;
  totalRightSavings: number;
};

function resolveWinner(leftRate: number | null, rightRate: number | null): SideBySideWinner {
  if (leftRate === null && rightRate === null) return 'none';
  if (leftRate === null) return 'right-only';
  if (rightRate === null) return 'left-only';
  if (leftRate < rightRate) return 'left';
  if (rightRate < leftRate) return 'right';
  return 'tie';
}

export function buildSideBySideRows(
  leftCompany: CompanyPriceSnapshot,
  rightCompany: CompanyPriceSnapshot,
  rateType: SideBySideRateType,
  options?: {
    search?: string;
    differencesOnly?: boolean;
    stateCode?: string;
    minSpread?: number;
    completeCoverageOnly?: boolean;
    sortBy?: ComparisonSortKey;
    vehicleMultiplier?: number;
  },
): SideBySideRow[] {
  const companies = [leftCompany, rightCompany];
  const buildRows = rateType === 'state' ? buildStateComparisonRows : buildLaneComparisonRows;
  const baseRows = buildRows(companies, {
    search: options?.search,
    differencesOnly: options?.differencesOnly,
    stateCode: options?.stateCode,
    minSpread: options?.minSpread,
    completeCoverageOnly: options?.completeCoverageOnly,
  });

  const multiplier = options?.vehicleMultiplier ?? 1;
  const rows = sortComparisonRows(
    multiplier === 1 ? baseRows : adjustComparisonRows(baseRows, multiplier),
    options?.sortBy || 'spread-desc',
  );

  return rows.map((row) => mapComparisonRowToSideBySide(row, leftCompany.id, rightCompany.id));
}

export function mapComparisonRowToSideBySide(
  row: ComparisonRateRow,
  leftCompanyId: string,
  rightCompanyId: string,
): SideBySideRow {
  const leftRate = row.rates[leftCompanyId] ?? null;
  const rightRate = row.rates[rightCompanyId] ?? null;
  const delta = getRateDelta(rightRate, leftRate);

  return {
    key: row.key,
    label: row.label,
    stateCode: row.stateCode,
    leftRate,
    rightRate,
    delta,
    spread: row.spread,
    winner: resolveWinner(leftRate, rightRate),
  };
}

export function buildSideBySideSummary(rows: SideBySideRow[]): SideBySideSummary {
  let leftWins = 0;
  let rightWins = 0;
  let ties = 0;
  let leftOnly = 0;
  let rightOnly = 0;
  let leftSum = 0;
  let rightSum = 0;
  let leftCount = 0;
  let rightCount = 0;
  let deltaSum = 0;
  let deltaCount = 0;
  let totalLeftSavings = 0;
  let totalRightSavings = 0;

  for (const row of rows) {
    switch (row.winner) {
      case 'left':
        leftWins += 1;
        if (row.spread) totalLeftSavings += row.spread;
        break;
      case 'right':
        rightWins += 1;
        if (row.spread) totalRightSavings += row.spread;
        break;
      case 'tie':
        ties += 1;
        break;
      case 'left-only':
        leftOnly += 1;
        break;
      case 'right-only':
        rightOnly += 1;
        break;
      default:
        break;
    }

    if (row.leftRate !== null) {
      leftSum += row.leftRate;
      leftCount += 1;
    }

    if (row.rightRate !== null) {
      rightSum += row.rightRate;
      rightCount += 1;
    }

    if (row.delta !== null) {
      deltaSum += row.delta;
      deltaCount += 1;
    }
  }

  return {
    leftWins,
    rightWins,
    ties,
    leftOnly,
    rightOnly,
    comparedRows: rows.length,
    averageLeft: leftCount ? Math.round(leftSum / leftCount) : null,
    averageRight: rightCount ? Math.round(rightSum / rightCount) : null,
    averageDelta: deltaCount ? Math.round(deltaSum / deltaCount) : null,
    totalLeftSavings,
    totalRightSavings,
  };
}

export function exportSideBySideCsv(
  leftCompany: CompanyPriceSnapshot,
  rightCompany: CompanyPriceSnapshot,
  rows: SideBySideRow[],
  rateType: SideBySideRateType,
  options?: { vehicleLabel?: string },
) {
  const headers = [
    rateType === 'state' ? 'State' : 'Lane',
    'State Code',
    leftCompany.name,
    rightCompany.name,
    `${rightCompany.name} vs ${leftCompany.name}`,
    'Spread',
    'Winner',
  ];

  const csvRows = rows.map((row) => [
    row.label,
    row.stateCode,
    row.leftRate === null ? '' : String(row.leftRate),
    row.rightRate === null ? '' : String(row.rightRate),
    row.delta === null ? '' : String(row.delta),
    row.spread === null ? '' : String(row.spread),
    row.winner,
  ]);

  const meta = [
    ['Exported At', new Date().toISOString()],
    ['View', 'Side by Side'],
    ['Rate Type', rateType === 'state' ? 'State Rates' : 'Branch/City Lanes'],
    ['Left Company', leftCompany.name],
    ['Left Destination', leftCompany.destinationLabel],
    ['Right Company', rightCompany.name],
    ['Right Destination', rightCompany.destinationLabel],
    ...(options?.vehicleLabel ? [['Vehicle Type', options.vehicleLabel]] : []),
    [],
  ];

  return [...meta, headers, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}