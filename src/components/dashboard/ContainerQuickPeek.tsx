"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Ship, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Layers,
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

interface ContainerQuickPeekProps {
  containerId: string | null;
  open: boolean;
  onClose: () => void;
}

interface ContainerDetail {
  id: string;
  containerNumber: string;
  trackingNumber: string | null;
  vesselName: string | null;
  shippingLine: string | null;
  destinationPort: string | null;
  estimatedArrival: string | null;
  status: string;
  progress: number;
  currentCount: number;
  maxCapacity: number;
  createdAt: string;
  shipments?: Array<{
    id: string;
    vehicleVIN: string | null;
    vehicleYear: number | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    status: string;
    price: number;
    user?: { name: string | null; email: string };
  }>;
  _count?: {
    shipments: number;
    expenses: number;
    invoices: number;
  };
}

const CONTAINER_STEPS: MilestoneStep[] = [
  { id: 'CREATED', label: 'Created' },
  { id: 'WAITING_FOR_LOADING', label: 'Waiting' },
  { id: 'LOADED', label: 'Loaded' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'ARRIVED_PORT', label: 'Arrived Port' },
  { id: 'CUSTOMS_CLEARANCE', label: 'Customs' },
  { id: 'RELEASED', label: 'Released' },
  { id: 'CLOSED', label: 'Closed' },
];

export default function ContainerQuickPeek({
  containerId,
  open,
  onClose,
}: ContainerQuickPeekProps) {
  const [container, setContainer] = useState<ContainerDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !containerId) {
      setContainer(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchDetails() {
      try {
        const res = await fetch(`/api/containers/${containerId}`);
        if (!res.ok) throw new Error('Failed to load container');
        const data = await res.json();
        if (!cancelled) {
          setContainer(data.container || data);
        }
      } catch (err) {
        console.error('Error loading container quick peek:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [open, containerId]);

  const capacityPercent = container && container.maxCapacity > 0
    ? Math.min(100, Math.round((container.currentCount / container.maxCapacity) * 100))
    : 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={
        container ? (
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-tight text-base sm:text-lg">
              {container.containerNumber}
            </span>
            <CopyButton value={container.containerNumber} label="Container Number" />
          </div>
        ) : (
          'Container Details'
        )
      }
      description={container?.shippingLine ? `${container.shippingLine} • ${container.destinationPort || 'Port TBD'}` : undefined}
      badge={container ? <StatusBadge status={container.status} /> : undefined}
      actions={
        container && (
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              href={`/dashboard/containers/${container.id}`}
              onClick={onClose}
              variant="primary"
              size="sm"
              icon={<ExternalLink className="w-4 h-4" />}
            >
              Open Full View
            </Button>
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
      ) : container ? (
        <div className="flex flex-col gap-6">
          {/* Milestone Stepper */}
          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <span className="font-bold text-xs text-[var(--text-secondary)] mb-3 block uppercase tracking-wider">
              Milestone Progression
            </span>
            <MilestoneStepper
              steps={CONTAINER_STEPS}
              currentStepId={container.status}
              status={container.status === 'CLOSED' ? 'completed' : 'default'}
              orientation="horizontal"
            />
          </div>

          {/* Capacity Progress Bar */}
          <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--border)]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Cargo Loading Capacity
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {container.currentCount} / {container.maxCapacity} ({capacityPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[rgba(var(--text-primary-rgb),0.08)] overflow-hidden">
              <div
                style={{ width: `${capacityPercent}%` }}
                className={`h-full rounded-full transition-all ${
                  capacityPercent >= 100 ? 'bg-[var(--error)]' : 'bg-[var(--accent-gold)]'
                }`}
              />
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                <Ship className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold">Vessel</span>
              </div>
              <div className="font-bold text-[0.9375rem] text-[var(--text-primary)] truncate">
                {container.vesselName || 'Unassigned'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold">Destination Port</span>
              </div>
              <div className="font-bold text-[0.9375rem] text-[var(--text-primary)] truncate">
                {container.destinationPort || 'TBD'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold">ETA</span>
              </div>
              <div className="font-bold text-[0.9375rem] text-[var(--text-primary)] truncate">
                {container.estimatedArrival ? new Date(container.estimatedArrival).toLocaleDateString() : 'Pending'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                <Layers className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold">Manifest Items</span>
              </div>
              <div className="font-bold text-[0.9375rem] text-[var(--text-primary)]">
                {container._count?.shipments ?? container.shipments?.length ?? 0} Vehicles
              </div>
            </div>
          </div>

          {/* Manifest Preview List */}
          {container.shipments && container.shipments.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  Loaded Cargo Manifest ({container.shipments.length})
                </span>
                <Link
                  href={`/dashboard/containers/${container.id}?tab=cargo`}
                  onClick={onClose}
                  className="text-xs text-[var(--accent-gold)] font-semibold no-underline hover:underline"
                >
                  View All &rarr;
                </Link>
              </div>

              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                {container.shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--panel)] hover:border-[var(--accent-gold)] flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-[0.8125rem] font-bold text-[var(--text-primary)] truncate">
                        {[shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}
                      </div>
                      {shipment.vehicleVIN && (
                        <span className="font-mono text-xs text-[var(--text-secondary)] tracking-tight">
                          VIN: {shipment.vehicleVIN}
                        </span>
                      )}
                    </div>
                    <StatusBadge status={shipment.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-[var(--text-secondary)] text-center py-8">
          No container selected.
        </div>
      )}
    </Drawer>
  );
}
