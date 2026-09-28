'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
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
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2.5,
        border: '1px solid var(--border)',
        backgroundColor: 'var(--panel)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DollarSign size={18} style={{ color: 'var(--accent-gold)' }} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            Container Unit Economics & Profitability
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.25,
            py: 0.4,
            borderRadius: 999,
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: isHealthyMargin
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
      </Box>

      {/* KPI Headline Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box
          sx={{
            p: 1.75,
            borderRadius: 2,
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <Receipt size={15} style={{ color: 'var(--text-secondary)' }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Total Cargo Revenue
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>
            {formatCurrency(totalRevenue)}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)', mt: 0.25 }}>
            {itemRevenues.length > 0 ? `${itemRevenues.length} freight invoices` : 'Estimated manifest total'}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 1.75,
            borderRadius: 2,
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <Layers size={15} style={{ color: 'var(--text-secondary)' }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Total Container Costs
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--error)' }}>
            {formatCurrency(totalExpenses)}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)', mt: 0.25 }}>
            Ocean + Drayage + Port fees
          </Typography>
        </Box>

        <Box
          sx={{
            p: 1.75,
            borderRadius: 2,
            backgroundColor: isProfitable ? 'rgba(34, 197, 94, 0.04)' : 'rgba(239, 68, 68, 0.04)',
            border: `1px solid ${isProfitable ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            {isProfitable ? (
              <TrendingUp size={15} style={{ color: '#16a34a' }} />
            ) : (
              <TrendingDown size={15} style={{ color: '#ef4444' }} />
            )}
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Net Operating Margin
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: isProfitable ? '#16a34a' : 'var(--error)',
            }}
          >
            {formatCurrency(netProfit)}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: isProfitable ? '#16a34a' : 'var(--error)', mt: 0.25 }}>
            {marginPercent.toFixed(1)}% gross margin
          </Typography>
        </Box>
      </Box>

      {/* Cost Breakdown Accordion / Grid */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 1 }}>
          Direct Cost Breakdown
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Ocean Freight</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatCurrency(oceanFreightCost)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Drayage / Hauling</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatCurrency(drayageCost)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Terminal Handling</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatCurrency(terminalHandlingCost)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Customs & Port Fees</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatCurrency(customsCost)}</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
