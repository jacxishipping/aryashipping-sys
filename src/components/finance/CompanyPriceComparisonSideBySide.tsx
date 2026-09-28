'use client';

import Link from 'next/link';
import { Box, MenuItem, TextField } from '@mui/material';
import { ArrowLeftRight, GitCompareArrows, Trophy } from 'lucide-react';
import { EmptyState } from '@/components/design-system';
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
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: highlight ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border)',
        background: highlight ? 'rgba(34, 197, 94, 0.08)' : 'var(--panel)',
        textAlign: align,
      }}
    >
      <Link href={`/dashboard/finance/companies/${company.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
        <Box sx={{ fontWeight: 700, fontSize: '1rem' }}>{company.name}</Box>
        <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)', mt: 0.25 }}>{company.destinationLabel}</Box>
        {company.activePriceList?.sourceFileName && (
          <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', mt: 0.25 }}>
            {company.activePriceList.sourceFileName}
          </Box>
        )}
      </Link>
    </Box>
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
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 120px minmax(0, 1fr)' },
        gap: 1,
        p: 1.25,
        borderRadius: 2,
        border: '1px solid var(--border)',
        background: 'var(--background)',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          p: 1.25,
          borderRadius: 1.5,
          border: leftWins ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid transparent',
          background: leftWins ? 'rgba(34, 197, 94, 0.06)' : 'transparent',
        }}
      >
        <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
          {leftCompany.name}
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: '1.1rem', mt: 0.25 }}>
          {row.leftRate === null ? '—' : formatCurrency(row.leftRate)}
        </Box>
      </Box>

      <Box sx={{ textAlign: 'center', px: 0.5 }}>
        <Box sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{row.label}</Box>
        {row.delta !== null && row.leftRate !== null && row.rightRate !== null ? (
          <Box
            sx={{
              mt: 0.5,
              fontWeight: 700,
              fontSize: '0.84rem',
              color: row.delta < 0 ? 'rgb(22, 163, 74)' : row.delta > 0 ? 'rgb(220, 38, 38)' : 'var(--text-secondary)',
            }}
          >
            {formatSignedCurrency(row.delta)}
          </Box>
        ) : (
          <Box sx={{ mt: 0.5, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {row.winner === 'left-only' ? 'Left only' : row.winner === 'right-only' ? 'Right only' : 'No overlap'}
          </Box>
        )}
        {row.spread ? (
          <Box sx={{ mt: 0.25, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Spread {formatCurrency(row.spread)}
          </Box>
        ) : null}
      </Box>

      <Box
        sx={{
          p: 1.25,
          borderRadius: 1.5,
          border: rightWins ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid transparent',
          background: rightWins ? 'rgba(34, 197, 94, 0.06)' : 'transparent',
          textAlign: { xs: 'left', md: 'right' },
        }}
      >
        <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
          {rightCompany.name}
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: '1.1rem', mt: 0.25 }}>
          {row.rightRate === null ? '—' : formatCurrency(row.rightRate)}
        </Box>
      </Box>
    </Box>
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
        icon={<GitCompareArrows />}
        title="Choose two companies"
        description="Select a left and right carrier to run a head-to-head price comparison."
      />
    );
  }

  if (leftCompanyId === rightCompanyId) {
    return (
      <EmptyState
        icon={<ArrowLeftRight />}
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
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
        <TextField
          select
          size="small"
          label="Left company"
          value={leftCompanyId}
          onChange={(event) => onLeftCompanyChange(event.target.value)}
        >
          {companies.map((company) => (
            <MenuItem key={company.id} value={company.id} disabled={company.id === rightCompanyId}>
              {company.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Compare"
          value={rateType}
          onChange={(event) => onRateTypeChange(event.target.value as SideBySideRateType)}
        >
          <MenuItem value="state">State rates</MenuItem>
          <MenuItem value="lane">Branch / city lanes</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Right company"
          value={rightCompanyId}
          onChange={(event) => onRightCompanyChange(event.target.value)}
        >
          {companies.map((company) => (
            <MenuItem key={company.id} value={company.id} disabled={company.id === leftCompanyId}>
              {company.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 80px 1fr' }, gap: 1.5, alignItems: 'stretch' }}>
        <CompanyHeader company={leftCompany} align="left" highlight={leftLeads} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <ArrowLeftRight className="w-5 h-5" />
        </Box>
        <CompanyHeader company={rightCompany} align="right" highlight={rightLeads} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1 }}>
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
          <Box
            key={stat.label}
            sx={{
              p: 1.25,
              borderRadius: 2,
              border: stat.highlight ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border)',
              background: stat.highlight ? 'rgba(34, 197, 94, 0.06)' : 'var(--panel)',
              transition: 'transform 0.15s ease',
              '&:hover': { transform: 'translateY(-1px)' },
            }}
          >
            <Box sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{stat.label}</Box>
            <Box sx={{ fontWeight: 700, fontSize: '1.1rem', color: stat.color }}>{stat.value}</Box>
          </Box>
        ))}
        <Box
          sx={{
            p: 1.25,
            borderRadius: 2,
            border: '1px solid rgba(var(--accent-gold-rgb), 0.35)',
            background: 'rgba(var(--accent-gold-rgb), 0.08)',
            gridColumn: { xs: 'span 2', md: 'auto' },
          }}
        >
          <Box sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Trophy className="w-3.5 h-3.5" /> Leader
          </Box>
          <Box sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
            {leftLeads ? leftCompany.name : rightLeads ? rightCompany.name : 'Even'}
          </Box>
        </Box>
      </Box>

      {rows.length > 0 ? (
        <Box sx={{ display: 'grid', gap: 1, maxHeight: 620, overflow: 'auto', pr: 0.5 }}>
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
        </Box>
      ) : (
        <EmptyState
          icon={<GitCompareArrows />}
          title="No matching rows"
          description="Try another rate type, select different companies, or loosen your filters to find overlapping prices."
        />
      )}
    </Box>
  );
}