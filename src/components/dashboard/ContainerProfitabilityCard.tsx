'use client';

import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Layers, Receipt, ShieldCheck, AlertTriangle } from 'lucide-react';
import { formatMoney as formatCurrency } from '@/lib/format';

export interface ContainerProfitabilityProps {
  oceanFreightCost?: number;
  drayageCost?: number;
  terminalHandlingCost?: number;
  customsCost?: number;
  otherExpenses?: number;
  itemRevenues?: Array<{
    id: string;
    description: string;
    amount: number;
    vin?: string | null;
  }>;
}

export function ContainerProfitabilityCard({
  oceanFreightCost = 0,
  drayageCost = 0,
  terminalHandlingCost = 0,
  customsCost = 0,
  otherExpenses = 0,
  itemRevenues = [],
}: ContainerProfitabilityProps) {
  // Total Revenue
  const totalRevenue = itemRevenues.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Total Expenses
  const totalExpenses =
    oceanFreightCost + drayageCost + terminalHandlingCost + customsCost + otherExpenses;

  // Net Profit & Margin
  const netProfit = totalRevenue - totalExpenses;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const isProfitable = netProfit > 0;
  const isHealthyMargin = marginPercent >= 20;

  return (
    <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <DollarSign size={18} className="text-[var(--accent-gold)]" />
          <span className="font-bold text-[0.95rem] text-[var(--text-primary)]">
            Container Unit Economics & Profitability
          </span>
        </div>
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
      </div>

      {/* KPI Headline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={15} className="text-[var(--text-secondary)]" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Total Cargo Revenue
            </span>
          </div>
          <div className="text-xl font-extrabold text-[var(--success-dark)]">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-[0.7rem] text-[var(--text-secondary)] mt-1">
            {itemRevenues.length > 0 ? `${itemRevenues.length} freight invoices` : 'Estimated manifest total'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1">
            <Layers size={15} className="text-[var(--text-secondary)]" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Total Container Costs
            </span>
          </div>
          <div className="text-xl font-extrabold text-[var(--error)]">
            {formatCurrency(totalExpenses)}
          </div>
          <div className="text-[0.7rem] text-[var(--text-secondary)] mt-1">
            Ocean + Drayage + Port fees
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            isProfitable
              ? 'bg-[rgba(var(--success-rgb),0.04)] border-[rgba(var(--success-rgb),0.2)]'
              : 'bg-[rgba(var(--error-rgb),0.04)] border-[rgba(var(--error-rgb),0.2)]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {isProfitable ? (
              <TrendingUp size={15} className="text-[var(--success-dark)]" />
            ) : (
              <TrendingDown size={15} className="text-[var(--error)]" />
            )}
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Net Operating Margin
            </span>
          </div>
          <div
            className={`text-xl font-extrabold ${
              isProfitable ? 'text-[var(--success-dark)]' : 'text-[var(--error)]'
            }`}
          >
            {formatCurrency(netProfit)}
          </div>
          <div
            className={`text-[0.7rem] font-bold mt-1 ${
              isProfitable ? 'text-[var(--success-dark)]' : 'text-[var(--error)]'
            }`}
          >
            {marginPercent.toFixed(1)}% gross margin
          </div>
        </div>
      </div>

      {/* Cost Breakdown Accordion / Grid */}
      <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
          Direct Cost Breakdown
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <span className="text-[0.72rem] text-[var(--text-secondary)] block">Ocean Freight</span>
            <span className="text-[0.85rem] font-bold text-[var(--text-primary)]">{formatCurrency(oceanFreightCost)}</span>
          </div>
          <div>
            <span className="text-[0.72rem] text-[var(--text-secondary)] block">Drayage / Hauling</span>
            <span className="text-[0.85rem] font-bold text-[var(--text-primary)]">{formatCurrency(drayageCost)}</span>
          </div>
          <div>
            <span className="text-[0.72rem] text-[var(--text-secondary)] block">Terminal Handling</span>
            <span className="text-[0.85rem] font-bold text-[var(--text-primary)]">{formatCurrency(terminalHandlingCost)}</span>
          </div>
          <div>
            <span className="text-[0.72rem] text-[var(--text-secondary)] block">Customs & Port Fees</span>
            <span className="text-[0.85rem] font-bold text-[var(--text-primary)]">{formatCurrency(customsCost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
