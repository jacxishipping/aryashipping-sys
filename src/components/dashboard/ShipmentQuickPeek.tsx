"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Ship, 
  DollarSign, 
  ExternalLink, 
  User,
  CreditCard,
} from 'lucide-react';
import { 
  Drawer, 
  StatusBadge, 
  Button, 
  CopyButton, 
  MilestoneStepper, 
  type MilestoneStep,
  Skeleton
} from '@/components/design-system';
import { formatMoney as formatCurrency } from '@/lib/format';

interface ShipmentQuickPeekProps {
  shipmentId: string | null;
  open: boolean;
  onClose: () => void;
}

interface ShipmentDetail {
  id: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  vehicleColor?: string | null;
  lotNumber?: string | null;
  status: string;
  paymentStatus?: string;
  price: number;
  paidAmount?: number;
  createdAt: string;
  user?: {
    id?: string;
    name: string | null;
    email: string;
  };
  container?: {
    id: string;
    containerNumber: string;
    vesselName?: string | null;
    destinationPort?: string | null;
    estimatedArrival?: string | null;
    status?: string;
  } | null;
  dispatch?: {
    id: string;
    driverName?: string | null;
    status?: string | null;
  } | null;
}

const SHIPMENT_STEPS: MilestoneStep[] = [
  { id: 'ON_HAND', label: 'On Hand' },
  { id: 'DISPATCHING', label: 'Dispatching' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'RELEASED', label: 'Released' },
  { id: 'IN_TRANSIT_TO_DESTINATION', label: 'To Destination' },
  { id: 'DELIVERED', label: 'Delivered' },
];

export default function ShipmentQuickPeek({
  shipmentId,
  open,
  onClose,
}: ShipmentQuickPeekProps) {
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !shipmentId) {
      setShipment(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchDetails() {
      try {
        const res = await fetch(`/api/shipments/${shipmentId}`);
        if (!res.ok) throw new Error('Failed to load shipment');
        const data = await res.json();
        if (!cancelled) {
          setShipment(data.shipment || data);
        }
      } catch (err) {
        console.error('Error loading shipment quick peek:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [open, shipmentId]);

  const vehicleTitle = shipment
    ? [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle Shipment'
    : 'Shipment Details';

  const remainingBalance = shipment ? Math.max(0, (shipment.price || 0) - (shipment.paidAmount || 0)) : 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={
        shipment ? (
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-base sm:text-lg">
              {vehicleTitle}
            </span>
          </div>
        ) : (
          'Shipment Details'
        )
      }
      description={
        shipment?.vehicleVIN ? (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs text-[var(--text-secondary)] font-semibold">
              VIN: {shipment.vehicleVIN}
            </span>
            <CopyButton value={shipment.vehicleVIN} label="VIN" />
          </div>
        ) : undefined
      }
      badge={shipment ? <StatusBadge status={shipment.status} /> : undefined}
      actions={
        shipment && (
          <div className="flex items-center justify-between w-full gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <div className="flex items-center gap-2">
              <Button
                href={`/tracking?vin=${encodeURIComponent(shipment.vehicleVIN && shipment.vehicleVIN !== '-' ? shipment.vehicleVIN : shipment.id)}`}
                variant="outline"
                size="sm"
                icon={<Ship className="w-4 h-4 text-[var(--accent-gold)]" />}
              >
                Live Tracking
              </Button>
              <Button
                href={`/dashboard/shipments/${shipment.id}`}
                onClick={onClose}
                variant="primary"
                size="sm"
                icon={<ExternalLink className="w-4 h-4" />}
              >
                Open Full View
              </Button>
            </div>
          </div>
        )
      }
    >
      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton variant="rounded" height={90} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={160} />
        </div>
      ) : shipment ? (
        <div className="flex flex-col gap-5">
          {/* Milestone Progression */}
          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <span className="font-bold text-xs text-[var(--text-secondary)] mb-3 block uppercase tracking-wider">
              Milestone Progression
            </span>
            <MilestoneStepper
              steps={SHIPMENT_STEPS}
              currentStepId={shipment.status}
              status={shipment.status === 'DELIVERED' ? 'completed' : 'default'}
              orientation="horizontal"
            />
          </div>

          {/* Key Details Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Customer */}
            <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)] mb-1">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold">Customer</span>
              </div>
              <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                {shipment.user?.name || shipment.user?.email || 'Direct / Unassigned'}
              </div>
            </div>

            {/* Container Assignment */}
            <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)] mb-1">
                <Package className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold">Container</span>
              </div>
              {shipment.container ? (
                <>
                  <Link
                    href={`/dashboard/containers/${shipment.container.id}`}
                    onClick={onClose}
                    className="no-underline"
                  >
                    <span className="font-mono font-bold text-sm text-[var(--accent-gold)] hover:underline block truncate">
                      {shipment.container.containerNumber}
                    </span>
                  </Link>
                  {shipment.container.destinationPort && (
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                      {shipment.container.destinationPort}
                    </div>
                  )}
                  {shipment.container.estimatedArrival && (
                    <div className="text-[11px] text-[var(--text-secondary)] truncate">
                      ETA: {new Date(shipment.container.estimatedArrival).toLocaleDateString()}
                    </div>
                  )}
                </>
              ) : (
                <div className="font-semibold text-sm text-[var(--text-secondary)]">
                  Unallocated
                </div>
              )}
            </div>

            {/* Total Price */}
            <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)] mb-1">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold">Total Price</span>
              </div>
              <div className="font-bold text-sm text-[var(--text-primary)]">
                {formatCurrency(shipment.price || 0)}
              </div>
            </div>

            {/* Payment Status */}
            <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)] mb-1">
                <CreditCard className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold">Payment Status</span>
              </div>
              <div className="mt-1">
                <StatusBadge status={shipment.paymentStatus || 'PENDING'} size="sm" />
              </div>
            </div>
          </div>

          {/* Vehicle Metadata Box */}
          <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--border)] flex flex-col gap-3">
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Vehicle Specifications
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-[var(--text-secondary)] block">Color</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicleColor || 'Standard'}</span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-secondary)] block">Lot Number</span>
                <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{shipment.lotNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-secondary)] block">Booking Date</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-secondary)] block">Outstanding Balance</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(remainingBalance)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-[var(--text-secondary)] text-center py-8">
          No shipment selected.
        </div>
      )}
    </Drawer>
  );
}
