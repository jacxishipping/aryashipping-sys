import Link from 'next/link';
import { Truck } from 'lucide-react';
import { Button, EmptyState } from '@/components/design-system';
import { DashboardGrid, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import ShipmentCalculator from '@/components/dashboard/ShipmentCalculator';

type ShipmentStatusStat = {
  status: string;
  _count: number;
};

type DispatchStat = {
  status: string;
  label: string;
  count: number;
};

type RecentDispatch = {
  id: string;
  referenceNumber: string;
  statusLabel: string;
  origin: string;
  destination: string;
  company: {
    name: string;
  };
  _count: {
    shipments: number;
  };
};

type DashboardOperationsSectionProps = {
  canManageDispatches: boolean;
  shipmentStats: ShipmentStatusStat[];
  dispatchStats: DispatchStat[];
  recentDispatches: RecentDispatch[];
};

export default function DashboardOperationsSection({
  canManageDispatches,
  shipmentStats,
  dispatchStats,
  recentDispatches,
}: DashboardOperationsSectionProps) {
  return (
    <DashboardGrid className="grid-cols-1 xl:grid-cols-3">
      <div className="xl:col-span-2" id="shipment-calculator">
        <ShipmentCalculator />
      </div>

      <div className="space-y-6">
        <DashboardPanel title="Shipment Mix" description="Current workload by status.">
          <div className="grid grid-cols-2 gap-3">
            {shipmentStats.map((stat) => (
              <div key={stat.status} className="flex flex-col rounded-lg border border-border bg-background p-3">
                <span className="mb-1 truncate text-xs text-gray-500 capitalize">{stat.status.replace('_', ' ').toLowerCase()}</span>
                <span className="text-lg font-bold text-primary">{stat._count}</span>
              </div>
            ))}
          </div>
        </DashboardPanel>

        {canManageDispatches && (
          <DashboardPanel title="Dispatch Pipeline" description="Current origin-to-port workload.">
            {dispatchStats.length === 0 ? (
              <EmptyState
                icon={<Truck className="w-8 h-8" />}
                title="No dispatch activity yet"
                description="Create a dispatch to track yard-to-port movements and handoff readiness."
                action={
                  <Button href="/dashboard/dispatches" variant="primary" size="sm">
                    Open Dispatches
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {dispatchStats.map((stat) => (
                    <div key={stat.status} className="flex flex-col rounded-lg border border-border bg-background p-3">
                      <span className="mb-1 truncate text-xs text-gray-500">{stat.label}</span>
                      <span className="text-lg font-bold text-primary">{stat.count}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Active dispatches</p>
                    <Button href="/dashboard/dispatches" variant="ghost" size="sm">
                      View all
                    </Button>
                  </div>

                  {recentDispatches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active dispatches right now.</p>
                  ) : (
                    <div className="space-y-2">
                      {recentDispatches.map((dispatch) => (
                        <Link
                          key={dispatch.id}
                          href={`/dashboard/dispatches/${dispatch.id}`}
                          className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:bg-background/70"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-primary">{dispatch.referenceNumber}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {dispatch.company.name} • {dispatch.origin} to {dispatch.destination}
                            </p>
                          </div>
                          <div className="ml-3 text-right">
                            <p className="text-xs font-semibold text-primary">{dispatch._count.shipments} shipments</p>
                            <p className="text-xs text-muted-foreground">{dispatch.statusLabel}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DashboardPanel>
        )}
      </div>
    </DashboardGrid>
  );
}
