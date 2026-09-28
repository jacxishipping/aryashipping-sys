import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
} from './company-price-comparison.ts';
import {
  buildSideBySideRows,
  buildSideBySideSummary,
  exportSideBySideCsv,
} from './company-price-comparison-side-by-side.ts';

const companies: CompanyPriceSnapshot[] = [
  {
    id: 'company-a',
    name: 'Alpha Shipping',
    code: 'ALPHA',
    companyType: 'SHIPPING',
    destinationLabel: 'Islam Qala, Afghanistan',
    hasPriceList: true,
    stateRates: { CA: 1300, TX: 1200 },
    auctionRates: [
      { stateCode: 'CA', branch: 'Los Angeles', city: 'Los Angeles', total: 1300 },
    ],
    activePriceListName: 'Alpha 2026',
  },
  {
    id: 'company-b',
    name: 'Beta Shipping',
    code: 'BETA',
    companyType: 'SHIPPING',
    destinationLabel: 'Jebel Ali, UAE',
    hasPriceList: true,
    stateRates: { CA: 1250, TX: 1200 },
    auctionRates: [
      { stateCode: 'CA', branch: 'Los Angeles', city: 'Los Angeles', total: 1250 },
    ],
    activePriceListName: 'Beta 2026',
  },
];

describe('company price comparison', () => {
  it('builds state comparison rows with spread', () => {
    const rows = buildStateComparisonRows(companies);

    assert.equal(rows.length, 2);

    const california = rows.find((row) => row.stateCode === 'CA');
    assert.ok(california);
    assert.equal(california.rates['company-a'], 1300);
    assert.equal(california.rates['company-b'], 1250);
    assert.equal(california.spread, 50);
    assert.equal(california.coverageCount, 2);
  });

  it('filters to rows with differences only', () => {
    const rows = buildStateComparisonRows(companies, { differencesOnly: true });

    assert.equal(rows.length, 1);
    assert.equal(rows[0].stateCode, 'CA');
  });

  it('builds lane comparison rows across companies', () => {
    const rows = buildLaneComparisonRows(companies);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].rates['company-a'], 1300);
    assert.equal(rows[0].rates['company-b'], 1250);
    assert.equal(rows[0].spread, 50);
  });

  it('sorts rows by spread descending', () => {
    const rows = sortComparisonRows(buildStateComparisonRows(companies), 'spread-desc');
    assert.equal(rows[0].stateCode, 'CA');
    assert.equal(rows[1].stateCode, 'TX');
  });

  it('applies vehicle multipliers to comparison rows', () => {
    const rows = adjustComparisonRows(buildStateComparisonRows(companies), 1.25);
    const california = rows.find((row) => row.stateCode === 'CA');

    assert.ok(california);
    assert.equal(california.rates['company-b'], 1563);
  });

  it('builds company scorecards and insights', () => {
    const rows = buildStateComparisonRows(companies);
    const scorecards = buildCompanyScorecards(companies, rows);
    const insights = buildComparisonInsights(companies, rows);

    assert.equal(scorecards[0].companyId, 'company-b');
    assert.equal(scorecards[0].wins, 1);
    assert.equal(insights.totalDifferentRows, 1);
    assert.equal(insights.maxSpread, 50);
  });

  it('calculates reference deltas and exports csv', () => {
    assert.equal(getRateDelta(1300, 1250), 50);

    const csv = exportComparisonCsv(companies, buildStateComparisonRows(companies), 'state', {
      referenceCompanyId: 'company-b',
      vehicleLabel: 'Sedan',
    });

    assert.match(csv, /Alpha Shipping/);
    assert.match(csv, /Vehicle Type/);
    assert.match(csv, /50/);
  });

  it('builds side-by-side rows and summary', () => {
    const rows = buildSideBySideRows(companies[0], companies[1], 'state');
    const summary = buildSideBySideSummary(rows);

    assert.equal(rows.length, 2);
    assert.equal(summary.leftWins + summary.rightWins + summary.ties, 2);
    assert.equal(summary.rightWins, 1);

    const csv = exportSideBySideCsv(companies[0], companies[1], rows, 'state');
    assert.match(csv, /Side by Side/);
    assert.match(csv, /Islam Qala, Afghanistan/);
  });
});