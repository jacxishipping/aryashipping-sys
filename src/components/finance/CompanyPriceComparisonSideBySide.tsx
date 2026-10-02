'use client';

import Link from 'next/link';
import { ArrowLeftRight, GitCompareArrows, Trophy } from 'lucide-react';
import { EmptyState, Select } from '@/components/design-system';
import type { CompanyPriceSnapshot, ComparisonSortKey } from '@/lib/company-price-comparison';
import {
  buildSideBySideRows,
  buildSideBySideSummary,
  type SideBySideRow,
} from '@/lib/company-price-comparison-side-by-side';
import type { SideBySideRateType } from '@/lib/company-price-comparison-presets';

type SideBySideCompany = CompanyPriceSnapshot & {
  activePriceList?: {
    sourceFileName?: string;
    name?: string;
  } | null;
};

type CompanyPriceComparisonSideBySideProps = {
  companies: SideBySideCompany[];
  leftCompanyId: string;
  rightCompanyId: string;
  rateType: SideBySideRateType;
  onLeftCompanyChange: (companyId: string) => void;
  onRightCompanyChange: (companyId: string) => void;
  onRateTypeChange: (rateType: SideBySideRateType) => void;
  search: string;
  stateFilter: string;
  differencesOnly: boolean;
  completeCoverageOnly: boolean;
  minSpread: string;
  sortBy: ComparisonSortKey;
  vehicleMultiplier: number;
  formatCurrency: (amount: number) => string;
  formatSignedCurrency: (amount: number) => string;
};

function CompanyHeader({
  company,
  align,
  highlight,
}: {
  company: SideBySideCompany;
  align: 'left' | 'right';
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        highlight ? 'border-emerald-500/35 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--panel)]'
      } ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <Link href={`/dashboard/finance/companies/${company.id}`} className="hover:underline">
        <div className="font-bold text-base text-[var(--text-primary)]">{company.name}</div>
        <div className="text-xs text-[var(--text-secondary)] mt-0.5">{company.destinationLabel}</div>
        {company.activePriceList?.sourceFileName && (
          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            {company.activePriceList.sourceFileName}
          </div>
        )}
      </Link>
    </div>
  );
}

function SideBySideCard({
  row,
  leftCompany,
  rightCompany,
  formatCurrency,
  formatSignedCurrency,
}: {
  row: SideBySideRow;
  leftCompany: SideBySideCompany;
  rightCompany: SideBySideCompany;
  formatCurrency: (amount: number) => string;
  formatSignedCurrency: (amount: number) => string;
}) {
  const leftWins = row.winner === 'left' || row.winner === 'right-only';
  const rightWins = row.winner === 'right' || row.winner === 'left-only';

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] items-center">
      <div
        className={`p-3 rounded-lg border ${
          leftWins ? 'border-emerald-500/35 bg-emerald-500/5' : 'border-transparent'
        }`}
      >
        <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold">
          {leftCompany.name}
        </div>
        <div className="font-bold text-lg mt-0.5 text-[var(--text-primary)]">
          {row.leftRate === null ? '—' : formatCurrency(row.leftRate)}
        </div>
      </div>

      <div className="text-center px-1">
        <div className="font-bold text-xs text-[var(--text-primary)]">{row.label}</div>
        {row.delta !== null && row.leftRate !== null && row.rightRate !== null ? (
          <div
            className={`mt-1 font-bold text-xs ${
              row.delta < 0 ? 'text-emerald-600' : row.delta > 0 ? 'text-red-600' : 'text-[var(--text-secondary)]'
            }`}
          >
            {formatSignedCurrency(row.delta)}
          </div>
        ) : (
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            {row.winner === 'left-only' ? 'Left only' : row.winner === 'right-only' ? 'Right only' : 'No overlap'}
          </div>
        )}
        {row.spread ? (
          <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
            Spread {formatCurrency(row.spread)}
          </div>
        ) : null}
      </div>

      <div
        className={`p-3 rounded-lg border text-left md:text-right ${
          rightWins ? 'border-emerald-500/35 bg-emerald-500/5' : 'border-transparent'
        }`}
      >
        <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold">
          {rightCompany.name}
        </div>
        <div className="font-bold text-lg mt-0.5 text-[var(--text-primary)]">
          {row.rightRate === null ? '—' : formatCurrency(row.rightRate)}
        </div>
      </div>
    </div>
  );
}

export default function CompanyPriceComparisonSideBySide({
  companies,
  leftCompanyId,
  rightCompanyId,
  rateType,
  onLeftCompanyChange,
  onRightCompanyChange,
  onRateTypeChange,
  search,
  stateFilter,
  differencesOnly,
  completeCoverageOnly,
  minSpread,
  sortBy,
  vehicleMultiplier,
  formatCurrency,
  formatSignedCurrency,
}: CompanyPriceComparisonSideBySideProps) {
  const leftCompany = companies.find((company) => company.id === leftCompanyId);
  const rightCompany = companies.find((company) => company.id === rightCompanyId);

  if (!leftCompany || !rightCompany) {
    return (
      <EmptyState
        icon={<GitCompareArrows className="w-10 h-10" />}
        title="Choose two companies"
        description="Select a left and right carrier to run a head-to-head price comparison."
      />
    );
  }

  if (leftCompanyId === rightCompanyId) {
    return (
      <EmptyState
        icon={<ArrowLeftRight className="w-10 h-10" />}
        title="Pick different companies"
        description="Side-by-side comparison needs two distinct carriers to compare rates."
      />
    );
  }

  const rows = buildSideBySideRows(leftCompany, rightCompany, rateType, {
    search,
    differencesOnly,
    stateCode: stateFilter,
    completeCoverageOnly,
    minSpread: Number(minSpread) > 0 ? Number(minSpread) : undefined,
    sortBy,
    vehicleMultiplier,
  });

  const summary = buildSideBySideSummary(rows);
  const leftLeads = summary.leftWins > summary.rightWins;
  const rightLeads = summary.rightWins > summary.leftWins;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select
          size="small"
          label="Left company"
          value={leftCompanyId}
          onChange={(value) => onLeftCompanyChange(String(value))}
          options={companies.map((company) => ({ value: company.id, label: company.name, disabled: company.id === rightCompanyId }))}
        />
        <Select
          size="small"
          label="Compare"
          value={rateType}
          onChange={(value) => onRateTypeChange(String(value) as SideBySideRateType)}
          options={[
            { value: 'state', label: 'State rates' },
            { value: 'lane', label: 'Branch / city lanes' },
          ]}
        />
        <Select
          size="small"
          label="Right company"
          value={rightCompanyId}
          onChange={(value) => onRightCompanyChange(String(value))}
          options={companies.map((company) => ({ value: company.id, label: company.name, disabled: company.id === leftCompanyId }))}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_1fr] gap-3 items-stretch">
        <CompanyHeader company={leftCompany} align="left" highlight={leftLeads} />
        <div className="flex items-center justify-center text-[var(--text-secondary)]">
          <ArrowLeftRight className="w-5 h-5" />
        </div>
        <CompanyHeader company={rightCompany} align="right" highlight={rightLeads} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Left wins', value: summary.leftWins, highlight: leftLeads, color: 'rgb(22, 163, 74)' },
          { label: 'Right wins', value: summary.rightWins, highlight: rightLeads, color: 'rgb(22, 163, 74)' },
          { label: 'Ties', value: summary.ties, highlight: false, color: 'var(--text-primary)' },
          {
            label: 'Avg delta',
            value: summary.averageDelta === null ? '—' : formatSignedCurrency(summary.averageDelta),
            highlight: false,
            color: summary.averageDelta && summary.averageDelta < 0 ? 'rgb(22, 163, 74)' : summary.averageDelta && summary.averageDelta > 0 ? 'rgb(220, 38, 38)' : 'var(--text-primary)',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{ color: stat.color }}
            className={`p-3 rounded-xl border ${
              stat.highlight ? 'border-emerald-500/35 bg-emerald-500/5' : 'border-[var(--border)] bg-[var(--panel)]'
            }`}
          >
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">{stat.label}</div>
            <div className="font-bold text-lg mt-0.5">{stat.value}</div>
          </div>
        ))}
        <div
          className="p-3 rounded-xl border border-[rgba(var(--accent-gold-rgb),0.35)] bg-[rgba(var(--accent-gold-rgb),0.08)] col-span-2 md:col-span-1"
        >
          <div className="text-[10px] text-[var(--text-secondary)] uppercase flex items-center gap-1 font-semibold">
            <Trophy className="w-3.5 h-3.5 text-[var(--accent-gold)]" /> Leader
          </div>
          <div className="font-bold text-sm text-[var(--text-primary)] mt-0.5 truncate">
            {leftLeads ? leftCompany.name : rightLeads ? rightCompany.name : 'Even'}
          </div>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="grid gap-2 max-h-[620px] overflow-y-auto pr-1">
          {rows.map((row) => (
            <SideBySideCard
              key={row.key}
              row={row}
              leftCompany={leftCompany}
              rightCompany={rightCompany}
              formatCurrency={formatCurrency}
              formatSignedCurrency={formatSignedCurrency}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<GitCompareArrows className="w-10 h-10" />}
          title="No matching rows"
          description="Try another rate type, select different companies, or loosen your filters to find overlapping prices."
        />
      )}
    </div>
  );
}