'use client';

import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import type { Shipment } from '@/components/shipments/shipment-detail-types';

type ShipmentActivityTabProps = {
  logs: Shipment['auditLogs'];
};

export default function ShipmentActivityTab({ logs }: ShipmentActivityTabProps) {
  return (
    <DashboardPanel
      title="Activity History"
      description="Audit log of shipment updates, assignments, and status changes"
    >
      <ActivityLog logs={logs || []} />
    </DashboardPanel>
  );
}