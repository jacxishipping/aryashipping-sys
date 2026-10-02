'use client';

import React from 'react';
import { Tooltip } from '@/components/design-system';
import { DollarSign, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle } from 'lucide-react';
import { formatMoney as formatCurrency } from '@/lib/format';

export interface ShipmentProfitabilityProps {
  billedRevenue?: number;
  dispatchCost?: number;
  oceanFreightCost?: number;
  terminalStorageCost?: number;
  otherExpensesCost?: number;
  compact?: boolean;
}

export function ShipmentProfitabilityCard({
  billedRevenue = 0,
  dispatchCost = 0,
  oceanFreightCost = 0,
  terminalStorageCost = 0,
  otherExpensesCost = 0,
  compact = false,
}: ShipmentProfitabilityProps) {
  const totalExpenses = dispatchCost + oceanFreightCost + terminalStorageCost + otherExpensesCost;
  const netProfit = billedRevenue - totalExpenses;
  const marginPercent = billedRevenue > 0 ? (netProfit / billedRevenue) * 100 : 0;

  const isProfitable = netProfit > 0;
  const isHealthyMargin = marginPercent >= 20;

  // Percentage shares of revenue for stacked breakdown
  const dispatchShare = billedRevenue > 0 ? Math.min(100, Math.max(0, (dispatchCost / billedRevenue) * 100)) : 0;
  const oceanShare = billedRevenue > 0 ? Math.min(100, Math.max(0, (oceanFreightCost / billedRevenue) * 100)) : 0;
  const otherShare = billedRevenue > 0 ? Math.min(100, Math.max(0, ((terminalStorageCost + otherExpensesCost) / billedRevenue) * 100)) : 0;
  const profitShare = billedRevenue > 0 && isProfitable ? Math.min(100, Math.max(0, (netProfit / billedRevenue) * 100)) : 0;

  return (
    <div className={`${compact ? 'p-4' : 'p-5'} rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-sm`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
            <DollarSign size={16} />
          </div>
          <span className={`font-bold ${compact ? 'text-sm' : 'text-[0.95rem]'} text-[var(--text-primary)]`}>
            Shipment Unit Economics & Profitability
          </span>
        </div>

        {billedRevenue > 0 && (
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isHealthyMargin
                ? 'bg-[rgba(var(--success-rgb),0.12)] text-[var(--success-dark)] border-[rgba(var(--success-rgb),0.3)]'
                : isProfitable
                ? 'bg-[rgba(var(--status-yellow-rgb),0.12)] text-[var(--warning-dark)] border-[rgba(var(--status-yellow-rgb),0.3)]'
                : 'bg-[rgba(var(--error-rgb),0.12)] text-[var(--error-dark)] border-[rgba(var(--error-rgb),0.3)]'
            }`}
          >
            {isHealthyMargin ? (
              <>
                <ShieldCheck size={14} /> High Margin ({marginPercent.toFixed(1)}%)
              </>
            ) : isProfitable ? (
              <>
                <TrendingUp size={14} /> Moderate Margin ({marginPercent.toFixed(1)}%)
              </>
            ) : (
              <>
                <AlertTriangle size={14} /> Negative Spread ({marginPercent.toFixed(1)}%)
              </>
            )}
          </div>
        )}
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* Customer Invoiced Revenue */}
        <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
            Customer Revenue
          </span>
          <div className="text-lg font-extrabold text-[var(--text-primary)]">
            {formatCurrency(billedRevenue)}
          </div>
          <span className="text-[11px] text-[var(--text-secondary)]">
            Total invoiced & billed charges
          </span>
        </div>

        {/* Total Cost / Expenses */}
        <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
            Direct Expenses
          </span>
          <div className="text-lg font-extrabold text-[var(--error-dark)]">
            {formatCurrency(totalExpenses)}
          </div>
          <span className="text-[11px] text-[var(--text-secondary)]">
            Towing, freight & port fees
          </span>
        </div>

        {/* Net Profit & Margin */}
        <div
          className={`p-3.5 rounded-xl border ${
            isProfitable
              ? 'bg-[rgba(var(--success-rgb),0.05)] border-[rgba(var(--success-rgb),0.25)]'
              : 'bg-[rgba(var(--error-rgb),0.05)] border-[rgba(var(--error-rgb),0.25)]'
          }`}
        >
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
              isProfitable ? 'text-[var(--success-dark)]' : 'text-[var(--error-dark)]'
            }`}
          >
            Net Margin
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-lg font-extrabold ${
                isProfitable ? 'text-[var(--success-dark)]' : 'text-[var(--error-dark)]'
              }`}
            >
              {isProfitable ? '+' : ''}{formatCurrency(netProfit)}
            </span>
            <span
              className={`text-sm font-bold ${
                isProfitable ? 'text-[var(--success-dark)]' : 'text-[var(--error-dark)]'
              }`}
            >
              ({marginPercent.toFixed(1)}%)
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)]">
            {isProfitable ? 'Net profit captured' : 'Operating at an expense loss'}
          </span>
        </div>
      </div>

      {/* Visual Cost & Revenue Distribution Bar */}
      {billedRevenue > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5 text-xs">
            <span className="font-semibold text-[var(--text-secondary)]">
              Cost Distribution Share
            </span>
            <span className="text-[var(--text-secondary)]">
              100% of Revenue
            </span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-[var(--border)] gap-[1px]">
            {dispatchShare > 0 && (
              <Tooltip title={`Dispatch / Towing: ${formatCurrency(dispatchCost)} (${dispatchShare.toFixed(1)}%)`}>
                <div
                  style={{ width: `${dispatchShare}%` }}
                  className="bg-[var(--info)] transition-all duration-300"
                />
              </Tooltip>
            )}
            {oceanShare > 0 && (
              <Tooltip title={`Ocean Freight Share: ${formatCurrency(oceanFreightCost)} (${oceanShare.toFixed(1)}%)`}>
                <div
                  style={{ width: `${oceanShare}%` }}
                  className="bg-[var(--status-violet)] transition-all duration-300"
                />
              </Tooltip>
            )}
            {otherShare > 0 && (
              <Tooltip title={`Port/Storage/Other: ${formatCurrency(terminalStorageCost + otherExpensesCost)} (${otherShare.toFixed(1)}%)`}>
                <div
                  style={{ width: `${otherShare}%` }}
                  className="bg-[var(--warning)] transition-all duration-300"
                />
              </Tooltip>
            )}
            {profitShare > 0 && (
              <Tooltip title={`Net Profit: ${formatCurrency(netProfit)} (${profitShare.toFixed(1)}%)`}>
                <div
                  style={{ width: `${profitShare}%` }}
                  className="bg-[#22c55e] transition-all duration-300"
                />
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Cost Breakdown Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--info)] shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-[var(--text-secondary)] block truncate">
              Towing / Dispatch
            </span>
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {formatCurrency(dispatchCost)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--status-violet)] shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-[var(--text-secondary)] block truncate">
              Ocean Freight
            </span>
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {formatCurrency(oceanFreightCost)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--warning)] shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-[var(--text-secondary)] block truncate">
              Storage & Customs
            </span>
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {formatCurrency(terminalStorageCost)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)] shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-[var(--text-secondary)] block truncate">
              Other Expenses
            </span>
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {formatCurrency(otherExpensesCost)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
