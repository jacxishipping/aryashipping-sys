'use client';

import { useMemo, useState } from 'react';
import { Box, Chip, TextField, Typography } from '@mui/material';
import { ArrowRight, BadgeDollarSign, MapPin, Search, ShipWheel, Truck, Warehouse } from 'lucide-react';
import type { UnifiedShipmentTimelineItem } from '@/lib/shipment-timeline';

type TimelineFilter = 'ALL' | UnifiedShipmentTimelineItem['category'];

type UnifiedShipmentTimelineProps = {
  items: UnifiedShipmentTimelineItem[];
  onOpenCompanyLedgerEntry?: (companyId: string, entryId: string) => void;
};

const filterLabels: Record<TimelineFilter, string> = {
  ALL: 'All',
  STATUS_CHANGE: 'Status',
  WORKFLOW_EVENT: 'Workflow',
  TRACKING_EVENT: 'Tracking',
  EXPENSE: 'Expenses',
  FINANCIAL: 'Financial',
  DAMAGE: 'Damage',
};

const sourceStyles: Record<UnifiedShipmentTimelineItem['source'], { bg: string; color: string; border: string }> = {
  SHIPMENT: { bg: 'rgba(59, 130, 246, 0.12)', color: 'rgb(29, 78, 216)', border: 'rgba(59, 130, 246, 0.24)' },
  DISPATCH: { bg: 'rgba(234, 179, 8, 0.14)', color: 'rgb(161, 98, 7)', border: 'rgba(234, 179, 8, 0.28)' },
  CONTAINER: { bg: 'rgba(99, 102, 241, 0.14)', color: 'rgb(67, 56, 202)', border: 'rgba(99, 102, 241, 0.26)' },
  TRANSIT: { bg: 'rgba(20, 184, 166, 0.14)', color: 'rgb(13, 148, 136)', border: 'rgba(20, 184, 166, 0.28)' },
  CUSTOMER_LEDGER: { bg: 'rgba(239, 68, 68, 0.12)', color: 'rgb(185, 28, 28)', border: 'rgba(239, 68, 68, 0.24)' },
  COMPANY_LEDGER: { bg: 'rgba(34, 197, 94, 0.12)', color: 'rgb(21, 128, 61)', border: 'rgba(34, 197, 94, 0.24)' },
};

function getItemIcon(item: UnifiedShipmentTimelineItem) {
  if (item.source === 'DISPATCH' || item.source === 'TRANSIT') {
    return <Truck className="h-4 w-4" />;
  }

  if (item.source === 'CONTAINER') {
    return item.category === 'TRACKING_EVENT' ? <ShipWheel className="h-4 w-4" /> : <Warehouse className="h-4 w-4" />;
  }

  if (item.category === 'EXPENSE' || item.category === 'FINANCIAL') {
    return <BadgeDollarSign className="h-4 w-4" />;
  }

  return <ArrowRight className="h-4 w-4" />;
}

export default function UnifiedShipmentTimeline({ items, onOpenCompanyLedgerEntry }: UnifiedShipmentTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilter>('ALL');
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      if (filter !== 'ALL' && item.category !== filter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [
        item.title,
        item.description,
        item.actorLabel || '',
        item.location || '',
        item.referenceLabel || '',
        item.status || '',
        item.oldValue || '',
        item.newValue || '',
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [filter, items, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
        <TextField
          fullWidth
          size="small"
          placeholder="Search timeline by stage, note, location, or ledger description"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{
            startAdornment: <Search className="mr-2 h-4 w-4 text-[var(--text-secondary)]" />,
          }}
        />
        <div className="flex flex-wrap gap-2">
          {(Object.keys(filterLabels) as TimelineFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: filter === value ? 'rgba(var(--accent-gold-rgb), 0.16)' : 'var(--panel)',
                color: filter === value ? 'var(--accent-gold)' : 'var(--text-secondary)',
                border: filter === value ? '1px solid rgba(var(--accent-gold-rgb), 0.32)' : '1px solid var(--border)',
              }}
            >
              {filterLabels[value]}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
          No timeline entries match the current filter.
        </div>
      ) : (
        <div className="relative pl-6">
          <span className="absolute left-2 top-0 h-full w-0.5 bg-gradient-to-b from-[var(--accent-gold)] via-[var(--border)] to-transparent" />
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const sourceStyle = sourceStyles[item.source];

              return (
                <div key={item.id} className="relative">
                  <div className="absolute -left-6 top-4 flex h-8 w-8 items-center justify-center">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full border bg-[var(--panel)]"
                      style={{ borderColor: sourceStyle.border, color: sourceStyle.color }}
                    >
                      {getItemIcon(item)}
                    </span>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Typography sx={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            {item.title}
                          </Typography>
                          <Chip
                            label={item.source.replace(/_/g, ' ')}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              bgcolor: sourceStyle.bg,
                              color: sourceStyle.color,
                              border: `1px solid ${sourceStyle.border}`,
                            }}
                          />
                          <Chip
                            label={filterLabels[item.category]}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 22,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                            }}
                          />
                        </div>
                        <Typography sx={{ mt: 1, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {item.description}
                        </Typography>
                      </div>
                      <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(item.occurredAt).toLocaleString()}
                      </Typography>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                      {item.referenceLabel && <span>Reference: <strong className="text-[var(--text-primary)]">{item.referenceLabel}</strong></span>}
                      {item.actorLabel && <span>By <strong className="text-[var(--text-primary)]">{item.actorLabel}</strong></span>}
                      {item.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <strong className="text-[var(--text-primary)]">{item.location}</strong>
                        </span>
                      )}
                      {typeof item.amount === 'number' && (
                        <span>
                          Amount: <strong className={item.amount >= 0 ? 'text-[var(--error)]' : 'text-[var(--success)]'}>${Math.abs(item.amount).toFixed(2)}</strong>
                        </span>
                      )}
                    </div>

                    {(item.oldValue || item.newValue) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Change</span>
                        {item.oldValue && <span className="rounded-full border border-[var(--error)]/25 bg-[var(--error)]/10 px-2 py-0.5 text-[var(--error)]">{item.oldValue}</span>}
                        <ArrowRight className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                        {item.newValue && <span className="rounded-full border border-[var(--success)]/25 bg-[var(--success)]/10 px-2 py-0.5 text-[var(--success)]">{item.newValue}</span>}
                      </div>
                    )}

                    {item.companyId && item.companyLedgerEntryId && onOpenCompanyLedgerEntry && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => onOpenCompanyLedgerEntry(item.companyId!, item.companyLedgerEntryId!)}
                          className="rounded border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
                        >
                          Open Company Ledger Entry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
