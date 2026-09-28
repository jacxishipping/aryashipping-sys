'use client';

import { DashboardGrid, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import type { Shipment } from '@/components/shipments/shipment-detail-types';

type ShipmentDetailsTabProps = {
  shipment: Shipment;
  formatStatus: (status: string) => string;
};

export default function ShipmentDetailsTab({ shipment, formatStatus }: ShipmentDetailsTabProps) {
  return (
    <DashboardGrid className="grid-cols-1 gap-4 lg:grid-cols-2">
      <DashboardPanel title="Vehicle Information">
        <dl className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Vehicle Type</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{formatStatus(shipment.vehicleType)}</dd>
          </div>
          {shipment.vehicleMake && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Make</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleMake}</dd>
            </div>
          )}
          {shipment.vehicleModel && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Model</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleModel}</dd>
            </div>
          )}
          {shipment.vehicleYear && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Year</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleYear}</dd>
            </div>
          )}
          {shipment.vehicleVIN && (
            <div className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">VIN</dt>
              <dd className="mt-1 break-all text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleVIN}</dd>
            </div>
          )}
          {shipment.hasKey !== null && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Has Key</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.hasKey ? 'Yes' : 'No'}</dd>
            </div>
          )}
          {shipment.hasTitle !== null && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Has Title</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.hasTitle ? 'Yes' : 'No'}</dd>
            </div>
          )}
        </dl>
      </DashboardPanel>

      <DashboardPanel title="Additional Details">
        <dl className="grid grid-cols-1 gap-4">
          {shipment.lotNumber && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Lot Number</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.lotNumber}</dd>
            </div>
          )}
          {shipment.auctionName && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Auction Name</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.auctionName}</dd>
            </div>
          )}
          {shipment.vehicleColor && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Color</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleColor}</dd>
            </div>
          )}
          {shipment.weight && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Weight</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.weight} lbs</dd>
            </div>
          )}
          {shipment.dimensions && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Dimensions</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{shipment.dimensions}</dd>
            </div>
          )}
          {shipment.internalNotes && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Internal Notes</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">{shipment.internalNotes}</dd>
            </div>
          )}
        </dl>
      </DashboardPanel>
    </DashboardGrid>
  );
}