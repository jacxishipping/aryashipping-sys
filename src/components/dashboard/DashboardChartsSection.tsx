import { Activity, Ship } from 'lucide-react';
import { Button, EmptyState } from '@/components/design-system';
import { DashboardGrid, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { ShipmentTrendsChart } from '@/components/charts/ShipmentTrendsChart';
import { ContainerUtilizationChart } from '@/components/charts/ContainerUtilizationChart';

type ShipmentTrendPoint = {
  date: string;
  shipments: number;
  inTransit: number;
};

type ContainerUtilizationPoint = {
  containerNumber: string;
  utilization: number;
  capacity: number;
};

type DashboardChartsSectionProps = {
  shipmentTrends: ShipmentTrendPoint[];
  containerUtilization: ContainerUtilizationPoint[];
};

export default function DashboardChartsSection({
  shipmentTrends,
  containerUtilization,
}: DashboardChartsSectionProps) {
  return (
    <DashboardGrid className="grid-cols-1 xl:grid-cols-2">
      <div id="shipment-trends">
        <DashboardPanel title="Shipment Trends" description="Last 14 days">
          {shipmentTrends.every((item) => item.shipments === 0) ? (
            <EmptyState
              icon={<Activity className="w-8 h-8" />}
              title="No shipment activity yet"
              description="Create your first shipment to see trend data here."
              action={
                <Button href="/dashboard/shipments/new" variant="primary" size="sm">
                  Add Shipment
                </Button>
              }
            />
          ) : (
            <ShipmentTrendsChart data={shipmentTrends} />
          )}
        </DashboardPanel>
      </div>

      <div id="container-utilization">
        <DashboardPanel title="Container Utilization" description="Most recent containers">
          {containerUtilization.length === 0 ? (
            <EmptyState
              icon={<Ship className="w-8 h-8" />}
              title="No containers yet"
              description="Create a container to track utilization and capacity."
              action={
                <Button href="/dashboard/containers/new" variant="primary" size="sm">
                  New Container
                </Button>
              }
            />
          ) : (
            <ContainerUtilizationChart data={containerUtilization} />
          )}
        </DashboardPanel>
      </div>
    </DashboardGrid>
  );
}