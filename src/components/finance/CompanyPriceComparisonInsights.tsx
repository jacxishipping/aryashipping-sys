'use client';

import { Box } from '@mui/material';
import { Trophy, TrendingUp } from 'lucide-react';
import type { CompanyPriceSnapshot, CompanyScorecard, ComparisonInsight } from '@/lib/company-price-comparison';

type CompanyPriceComparisonInsightsProps = {
  visibleCompanies: CompanyPriceSnapshot[];
  scorecards: CompanyScorecard[];
  insights: ComparisonInsight;
  formatCurrency: (amount: number) => string;
};

export default function CompanyPriceComparisonInsights({
  visibleCompanies,
  scorecards,
  insights,
  formatCurrency,
}: CompanyPriceComparisonInsightsProps) {
  const maxWins = Math.max(...scorecards.map((item) => item.wins), 1);
  const maxSpread = insights.maxSpread || 1;

  return (
    <Box sx={{ display: 'grid', gap: 1.5, mb: 2, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.4fr) minmax(0, 1fr)' } }}>
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          border: '1px solid var(--border)',
          background: 'var(--panel)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
          <Trophy className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
          <Box sx={{ fontWeight: 700 }}>Company Scorecard</Box>
        </Box>
        <Box sx={{ display: 'grid', gap: 1 }}>
          {scorecards.map((scorecard, index) => {
            const company = visibleCompanies.find((item) => item.id === scorecard.companyId);
            if (!company) return null;

            const isLeader = scorecard.companyId === insights.leader?.companyId;
            const winPercent = Math.round((scorecard.wins / maxWins) * 100);

            return (
              <Box
                key={scorecard.companyId}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto auto auto' },
                  gap: 1.5,
                  alignItems: 'center',
                  p: 1.25,
                  borderRadius: 1.5,
                  border: isLeader ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border)',
                  background: isLeader ? 'rgba(34, 197, 94, 0.06)' : 'var(--background)',
                  transition: 'transform 0.15s ease',
                  '&:hover': { transform: 'translateY(-1px)' },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        bgcolor: isLeader ? 'rgba(34, 197, 94, 0.15)' : 'rgba(var(--text-secondary-rgb), 0.1)',
                        color: isLeader ? 'rgb(22, 163, 74)' : 'var(--text-secondary)',
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {company.name}
                        {isLeader && (
                          <Box component="span" sx={{ ml: 0.75, fontSize: '0.65rem', color: 'rgb(22, 163, 74)', fontWeight: 700 }}>
                            LEADER
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{company.destinationLabel}</Box>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 0.75, height: 4, borderRadius: 999, bgcolor: 'rgba(var(--border-rgb), 0.35)', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        width: `${winPercent}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: isLeader
                          ? 'linear-gradient(90deg, rgb(22, 163, 74), rgb(34, 197, 94))'
                          : 'linear-gradient(90deg, rgba(var(--accent-gold-rgb), 0.5), var(--accent-gold))',
                      }}
                    />
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Box sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Wins</Box>
                  <Box sx={{ fontWeight: 700, color: isLeader ? 'rgb(22, 163, 74)' : 'var(--text-primary)' }}>{scorecard.wins}</Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Box sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Coverage</Box>
                  <Box sx={{ fontWeight: 700 }}>{scorecard.coveragePercent}%</Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Box sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Rate</Box>
                  <Box sx={{ fontWeight: 700 }}>{scorecard.averageRate ? formatCurrency(scorecard.averageRate) : '—'}</Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          border: '1px solid var(--border)',
          background: 'var(--panel)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
          <TrendingUp className="w-4 h-4" style={{ color: 'rgb(220, 38, 38)' }} />
          <Box sx={{ fontWeight: 700 }}>Biggest Price Gaps</Box>
        </Box>
        {insights.topSpreads.length > 0 ? (
          <Box sx={{ display: 'grid', gap: 0.5 }}>
            {insights.topSpreads.map((row, index) => {
              const spreadPercent = row.spread ? Math.round((row.spread / maxSpread) * 100) : 0;

              return (
                <Box
                  key={row.key}
                  sx={{
                    py: 0.85,
                    borderBottom: index < insights.topSpreads.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ fontWeight: 600, fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.label}
                      </Box>
                      <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {row.coverageCount}/{visibleCompanies.length} companies priced
                      </Box>
                    </Box>
                    <Box sx={{ fontWeight: 700, color: 'rgb(220, 38, 38)', whiteSpace: 'nowrap' }}>
                      {row.spread ? formatCurrency(row.spread) : '—'}
                    </Box>
                  </Box>
                  <Box sx={{ height: 4, borderRadius: 999, bgcolor: 'rgba(var(--border-rgb), 0.35)', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        width: `${spreadPercent}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, rgba(220, 38, 38, 0.45), rgb(220, 38, 38))',
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ color: 'var(--text-secondary)', fontSize: '0.84rem', py: 2, textAlign: 'center' }}>
            No price differences in the current view.
          </Box>
        )}
      </Box>
    </Box>
  );
}