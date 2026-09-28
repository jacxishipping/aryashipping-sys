import { StatsCard } from '@/components/design-system';
import { DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { DollarSign, Package, Ship, Truck } from 'lucide-react';

type DashboardKpiGridProps = {
  activeShipmentsCount: number;
  activeContainersCount: number;
  pendingRevenue: string;
  shipmentTrend?: { value: number; isPositive: boolean };
  canManageDispatches: boolean;
  activeDispatchesCount: number;
};

export default function DashboardKpiGrid({
  activeShipmentsCount,
  activeContainersCount,
  pendingRevenue,
  shipmentTrend,
  canManageDispatches,
  activeDispatchesCount,
}: DashboardKpiGridProps) {
  return (
    <div id="kpi-grid" className="animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
      <DashboardGrid className={`${canManageDispatches ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'} gap-3.5`}>
        <StatsCard
          title="Active Shipments"
          value={activeShipmentsCount}
          icon={<Package className="w-4 h-4" />}
          variant="default"
          subtitle="On hand or moving"
          trend={shipmentTrend}
          size="md"
        />
        <StatsCard
          title="Active Containers"
          value={activeContainersCount}
          icon={<Ship className="w-4 h-4" />}
          variant="info"
          subtitle="Port, customs & vessel"
          size="md"
        />
        <StatsCard
          title="Pending Revenue"
          value={pendingRevenue}
          icon={<DollarSign className="w-4 h-4" />}
          variant="warning"
          subtitle="Invoices awaiting settlement"
          size="md"
        />
        {canManageDispatches && (
          <StatsCard
            title="Active Dispatches"
            value={activeDispatchesCount}
            icon={<Truck className="w-4 h-4" />}
            variant="success"
            subtitle="Pending & port transits"
            size="md"
          />
        )}
      </DashboardGrid>
    </div>
  );
}