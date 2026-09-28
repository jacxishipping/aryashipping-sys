'use client';

import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import UnifiedShipmentTimeline from '@/components/shipments/UnifiedShipmentTimeline';
import type { UnifiedShipmentTimelineItem } from '@/lib/shipment-timeline';

type ShipmentTimelineTabProps = {
  items: UnifiedShipmentTimelineItem[];
  onOpenCompanyLedgerEntry: (companyId: string, entryId: string) => void;
};

export default function ShipmentTimelineTab({
  items,
  onOpenCompanyLedgerEntry,
}: ShipmentTimelineTabProps) {
  return (
    <DashboardPanel
      title="Unified Shipment Timeline"
      description="Merged workflow events, status changes, container milestones, and ledger activity in one chronology"
    >
      <UnifiedShipmentTimeline
        items={items}
        onOpenCompanyLedgerEntry={onOpenCompanyLedgerEntry}
      />
    </DashboardPanel>
  );
}