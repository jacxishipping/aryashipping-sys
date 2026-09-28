'use client';

import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { DollarSign, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, Truck, Ship, Receipt, Coins } from 'lucide-react';
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
  const isWarningMargin = isProfitable && marginPercent < 10;

  // Percentage shares of revenue for stacked breakdown
  const dispatchShare = billedRevenue > 0 ? Math.min(100, Math.max(0, (dispatchCost / billedRevenue) * 100)) : 0;
  const oceanShare = billedRevenue > 0 ? Math.min(100, Math.max(0, (oceanFreightCost / billedRevenue) * 100)) : 0;
  const otherShare = billedRevenue > 0 ? Math.min(100, Math.max(0, ((terminalStorageCost + otherExpensesCost) / billedRevenue) * 100)) : 0;
  const profitShare = billedRevenue > 0 && isProfitable ? Math.min(100, Math.max(0, (netProfit / billedRevenue) * 100)) : 0;

  return (
    <Box
      sx={{
        p: compact ? 2 : 2.5,
        borderRadius: 2.5,
        border: '1px solid var(--border)',
        bgcolor: 'var(--panel)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 1.5,
              bgcolor: 'rgba(var(--accent-gold-rgb), 0.12)',
              color: 'var(--accent-gold)',
            }}
          >
            <DollarSign size={16} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: compact ? '0.875rem' : '0.95rem', color: 'var(--text-primary)' }}>
            Shipment Unit Economics & Profitability
          </Typography>
        </Box>

        {billedRevenue > 0 && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 0.35,
              borderRadius: 999,
              fontSize: '0.75rem',
              fontWeight: 700,
              bgcolor: isHealthyMargin
                ? 'rgba(34, 197, 94, 0.12)'
                : isProfitable
                ? 'rgba(234, 179, 8, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
              color: isHealthyMargin ? '#16a34a' : isProfitable ? '#b45309' : '#dc2626',
              border: `1px solid ${
                isHealthyMargin
                  ? 'rgba(34, 197, 94, 0.3)'
                  : isProfitable
                  ? 'rgba(234, 179, 8, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)'
              }`,
            }}
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
          </Box>
        )}
      </Box>

      {/* Primary KPI Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2.5 }}>
        {/* Customer Invoiced Revenue */}
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'var(--background)', border: '1px solid var(--border)' }}>
          <Typography sx={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', tracking: 0.5, mb: 0.25 }}>
            Customer Revenue
          </Typography>
          <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {formatCurrency(billedRevenue)}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            Total invoiced & billed charges
          </Typography>
        </Box>

        {/* Total Cost / Expenses */}
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'var(--background)', border: '1px solid var(--border)' }}>
          <Typography sx={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', tracking: 0.5, mb: 0.25 }}>
            Direct Expenses
          </Typography>
          <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626' }}>
            {formatCurrency(totalExpenses)}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            Towing, freight & port fees
          </Typography>
        </Box>

        {/* Net Profit & Margin */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: isProfitable ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
            border: `1px solid ${isProfitable ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
          }}
        >
          <Typography sx={{ fontSize: '0.725rem', fontWeight: 600, color: isProfitable ? '#16a34a' : '#dc2626', textTransform: 'uppercase', tracking: 0.5, mb: 0.25 }}>
            Net Margin
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: isProfitable ? '#16a34a' : '#dc2626' }}>
              {isProfitable ? '+' : ''}{formatCurrency(netProfit)}
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: isProfitable ? '#16a34a' : '#dc2626' }}>
              ({marginPercent.toFixed(1)}%)
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            {isProfitable ? 'Net profit captured' : 'Operating at an expense loss'}
          </Typography>
        </Box>
      </Box>

      {/* Visual Cost & Revenue Distribution Bar */}
      {billedRevenue > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Cost Distribution Share
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              100% of Revenue
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', bgcolor: 'var(--border)', gap: '1px' }}>
            {dispatchShare > 0 && (
              <Tooltip title={`Dispatch / Towing: ${formatCurrency(dispatchCost)} (${dispatchShare.toFixed(1)}%)`}>
                <Box sx={{ width: `${dispatchShare}%`, bgcolor: '#3b82f6', transition: 'width 0.3s ease' }} />
              </Tooltip>
            )}
            {oceanShare > 0 && (
              <Tooltip title={`Ocean Freight Share: ${formatCurrency(oceanFreightCost)} (${oceanShare.toFixed(1)}%)`}>
                <Box sx={{ width: `${oceanShare}%`, bgcolor: '#8b5cf6', transition: 'width 0.3s ease' }} />
              </Tooltip>
            )}
            {otherShare > 0 && (
              <Tooltip title={`Port/Storage/Other: ${formatCurrency(terminalStorageCost + otherExpensesCost)} (${otherShare.toFixed(1)}%)`}>
                <Box sx={{ width: `${otherShare}%`, bgcolor: '#f59e0b', transition: 'width 0.3s ease' }} />
              </Tooltip>
            )}
            {profitShare > 0 && (
              <Tooltip title={`Net Profit: ${formatCurrency(netProfit)} (${profitShare.toFixed(1)}%)`}>
                <Box sx={{ width: `${profitShare}%`, bgcolor: '#22c55e', transition: 'width 0.3s ease' }} />
              </Tooltip>
            )}
          </Box>
        </Box>
      )}

      {/* Cost Breakdown Details */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5, pt: 1.5, borderTop: '1px solid var(--border)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3b82f6', shrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }} noWrap>
              Towing / Dispatch
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatCurrency(dispatchCost)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#8b5cf6', shrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }} noWrap>
              Ocean Freight
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatCurrency(oceanFreightCost)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b', shrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }} noWrap>
              Storage & Customs
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatCurrency(terminalStorageCost)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'var(--text-secondary)', shrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }} noWrap>
              Other Expenses
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatCurrency(otherExpensesCost)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
