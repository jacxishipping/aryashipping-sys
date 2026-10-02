'use client';

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
    <div className="grid gap-3 mb-4 grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-[var(--accent-gold)]" />
          <span className="font-bold text-sm text-[var(--text-primary)]">Company Scorecard</span>
        </div>
        <div className="grid gap-2">
          {scorecards.map((scorecard, index) => {
            const company = visibleCompanies.find((item) => item.id === scorecard.companyId);
            if (!company) return null;

            const isLeader = scorecard.companyId === insights.leader?.companyId;
            const winPercent = Math.round((scorecard.wins / maxWins) * 100);

            return (
              <div
                key={scorecard.companyId}
                className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-3 items-center p-3 rounded-lg border transition-all ${
                  isLeader
                    ? 'border-emerald-500/35 bg-emerald-500/5'
                    : 'border-[var(--border)] bg-[var(--background)]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isLeader
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                        {company.name}
                        {isLeader && (
                          <span className="ml-2 text-[10px] text-emerald-600 font-bold uppercase">
                            LEADER
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">{company.destinationLabel}</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-[rgba(var(--border-rgb),0.35)] overflow-hidden">
                    <div
                      style={{ width: `${winPercent}%` }}
                      className={`h-full rounded-full ${
                        isLeader
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                          : 'bg-gradient-to-r from-[rgba(var(--accent-gold-rgb),0.5)] to-[var(--accent-gold)]'
                      }`}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase">Wins</div>
                  <div className={`font-bold text-sm ${isLeader ? 'text-emerald-600' : 'text-[var(--text-primary)]'}`}>{scorecard.wins}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase">Coverage</div>
                  <div className="font-bold text-sm text-[var(--text-primary)]">{scorecard.coveragePercent}%</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase">Avg Rate</div>
                  <div className="font-bold text-sm text-[var(--text-primary)]">{scorecard.averageRate ? formatCurrency(scorecard.averageRate) : '—'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-red-600" />
          <span className="font-bold text-sm text-[var(--text-primary)]">Biggest Price Gaps</span>
        </div>
        {insights.topSpreads.length > 0 ? (
          <div className="grid gap-1">
            {insights.topSpreads.map((row, index) => {
              const spreadPercent = row.spread ? Math.round((row.spread / maxSpread) * 100) : 0;

              return (
                <div
                  key={row.key}
                  className={`py-2 ${
                    index < insights.topSpreads.length - 1 ? 'border-b border-[var(--border)]' : ''
                  }`}
                >
                  <div className="flex justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-[var(--text-primary)] truncate">
                        {row.label}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        {row.coverageCount}/{visibleCompanies.length} companies priced
                      </div>
                    </div>
                    <div className="font-bold text-xs text-red-600 whitespace-nowrap">
                      {row.spread ? formatCurrency(row.spread) : '—'}
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-[rgba(var(--border-rgb),0.35)] overflow-hidden">
                    <div
                      style={{ width: `${spreadPercent}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-red-500/50 to-red-600"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[var(--text-secondary)] text-xs py-6 text-center">
            No price differences in the current view.
          </div>
        )}
      </div>
    </div>
  );
}