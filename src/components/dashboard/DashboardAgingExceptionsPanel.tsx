import Link from 'next/link';
import { Anchor, AlertTriangle, Clock3, Route, Truck } from 'lucide-react';
import { StatsCard, Button, EmptyState } from '@/components/design-system';
import { DashboardGrid, DashboardPanel } from '@/components/dashboard/DashboardSurface';

type DashboardExceptionItem = {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  href: string;
  severityLabel: string;
  ageDays: number;
};

type DashboardAgingExceptionsPanelProps = {
  dispatchStuckCount: number;
  dispatchThresholdDays: number;
  containerPastEtaCount: number;
  releasedAwaitingTransitCount: number;
  releasedAwaitingTransitThresholdDays: number;
  transitsOverdueCount: number;
  totalExceptions: number;
  exceptions: DashboardExceptionItem[];
};

export default function DashboardAgingExceptionsPanel({
  dispatchStuckCount,
  dispatchThresholdDays,
  containerPastEtaCount,
  releasedAwaitingTransitCount,
  releasedAwaitingTransitThresholdDays,
  transitsOverdueCount,
  totalExceptions,
  exceptions,
}: DashboardAgingExceptionsPanelProps) {
  const getSeverityColor = (ageDays: number) => {
    if (ageDays > 14) {
      return 'var(--error)';
    }

    if (ageDays > 7) {
      return 'var(--warning)';
    }

    return 'var(--text-primary)';
  };

  return (
    <DashboardPanel
      title="Stage Aging Exceptions"
      description="Operational exceptions by workflow age and missed SLAs"
      actions={
        <Button href="/dashboard/shipments" variant="ghost" size="sm">
          Open shipments
        </Button>
      }
    >
        <div className="space-y-6">
          <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="Dispatch Aging"
              value={dispatchStuckCount}
              icon={<Clock3 className="w-5 h-5" />}
              variant="warning"
              subtitle={`More than ${dispatchThresholdDays} days in dispatch stage`}
            />
            <StatsCard
              title="Past Container ETA"
              value={containerPastEtaCount}
              icon={<Anchor className="w-5 h-5" />}
              variant="error"
              subtitle="Shipping-stage shipments past container ETA"
            />
            <StatsCard
              title="Released Awaiting Transit"
              value={releasedAwaitingTransitCount}
              icon={<Truck className="w-5 h-5" />}
              variant="warning"
              subtitle={`Released more than ${releasedAwaitingTransitThresholdDays} days ago`}
            />
            <StatsCard
              title="Transits Overdue"
              value={transitsOverdueCount}
              icon={<Route className="w-5 h-5" />}
              variant="error"
              subtitle="Transit records beyond estimated delivery"
            />
          </DashboardGrid>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Exception queue</p>
              <p className="text-xs text-muted-foreground">Top {totalExceptions} active exceptions</p>
            </div>

            {exceptions.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="w-8 h-8" />}
                title="No aging exceptions"
                description="Dispatch, container, release, and transit SLA exceptions will appear here as they age."
              />
            ) : (
              <div className="space-y-2">
                {exceptions.map((item) => (
                (() => {
                const severityColor = getSeverityColor(item.ageDays);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3 transition-all duration-200 hover:bg-background/70 hover:border-[rgba(var(--accent-gold-rgb),0.4)] hover:shadow-[0_4px_12px_rgba(var(--text-primary-rgb),0.08)] hover:translate-x-[2px]"
                    style={{
                      borderLeft: `3px solid ${severityColor}`,
                      transition: 'all 200ms ease',
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                      <p className="mt-1 text-xs text-primary">{item.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--warning)]">{item.severityLabel}</p>
                      <p className="text-sm font-semibold" style={{ color: severityColor }}>{item.ageDays}d</p>
                    </div>
                  </Link>
                );
                })()
                ))}
              </div>
            )}
          </div>
        </div>
    </DashboardPanel>
  );
}