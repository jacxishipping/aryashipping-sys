'use client';

import React from 'react';
import {
  CalendarCheck,
  Warehouse,
  Truck,
  Ship,
  Anchor,
  ShieldCheck,
  PackageCheck,
  CheckCircle2,
  Clock,
  CircleDot,
  Compass,
} from 'lucide-react';
import type { Shipment } from '@/components/shipments/shipment-detail-types';
import { cn } from '@/lib/utils';

type MilestoneStatus = 'complete' | 'current' | 'pending';

interface MilestoneStage {
  id: string;
  title: string;
  shortLabel: string;
  description: string;
  detail: string;
  status: MilestoneStatus;
  icon: React.ComponentType<{ className?: string }>;
}

interface ShipmentMilestoneStepperProps {
  shipment: Shipment;
  className?: string;
  onOpenTab?: (tab: number | string) => void;
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export default function ShipmentMilestoneStepper({
  shipment,
  className,
  onOpenTab,
}: ShipmentMilestoneStepperProps) {
  const isDelivered = shipment.status === 'DELIVERED';
  const isReleased = shipment.status === 'RELEASED' || shipment.container?.status === 'RELEASED' || Boolean(shipment.releaseToken);
  const isPortArrived = isReleased || shipment.container?.status === 'ARRIVED_PORT' || shipment.container?.status === 'CUSTOMS_CLEARANCE';
  const isVesselLoaded = isPortArrived || Boolean(shipment.containerId) || shipment.status === 'IN_TRANSIT';
  const isDispatched = isVesselLoaded || Boolean(shipment.dispatchId);
  const isYardReceived = isDispatched || shipment.status === 'ON_HAND';
  const isBooked = true; // Always booked if shipment exists

  // Determine stage status
  const getStageStatus = (
    isPassed: boolean,
    isNextPassed: boolean,
    isTerminal = false
  ): MilestoneStatus => {
    if (isTerminal) {
      return isPassed ? 'complete' : 'pending';
    }
    if (isPassed && isNextPassed) return 'complete';
    if (isPassed && !isNextPassed) return 'current';
    return 'pending';
  };

  const bookedDate = formatShortDate(shipment.createdAt);
  const containerEta = formatShortDate(shipment.container?.estimatedArrival);
  const transitEta = formatShortDate(shipment.transit?.estimatedDelivery);

  const stages: MilestoneStage[] = [
    {
      id: 'booked',
      title: 'Booking Created',
      shortLabel: 'Booked',
      description: 'Order registered in system',
      detail: bookedDate ? `Booked ${bookedDate}` : 'Shipment registered',
      status: getStageStatus(isBooked, isYardReceived),
      icon: CalendarCheck,
    },
    {
      id: 'yard',
      title: 'Origin Yard',
      shortLabel: 'Yard Check-in',
      description: 'Vehicle received & inspected',
      detail: shipment.purchaseLocation || 'Yard verified & photos taken',
      status: getStageStatus(isYardReceived, isDispatched),
      icon: Warehouse,
    },
    {
      id: 'dispatch',
      title: 'Inland Dispatch',
      shortLabel: 'Dispatched',
      description: 'Ground transit to port',
      detail: shipment.dispatch?.referenceNumber
        ? `Ref #${shipment.dispatch.referenceNumber}`
        : shipment.dispatchId
        ? 'Dispatch scheduled'
        : 'Awaiting inland dispatch',
      status: getStageStatus(isDispatched, isVesselLoaded),
      icon: Truck,
    },
    {
      id: 'vessel',
      title: 'Ocean Freight',
      shortLabel: 'On Vessel',
      description: 'Ocean carrier voyage',
      detail: shipment.container?.containerNumber
        ? `Cont. ${shipment.container.containerNumber}`
        : shipment.containerId
        ? 'Container assigned'
        : 'Awaiting vessel load',
      status: getStageStatus(isVesselLoaded, isPortArrived),
      icon: Ship,
    },
    {
      id: 'port',
      title: 'Port Arrival',
      shortLabel: 'Port Arrival',
      description: 'Destination seaport arrival',
      detail: shipment.container?.destinationPort
        ? `Port ${shipment.container.destinationPort}`
        : containerEta
        ? `ETA ${containerEta}`
        : 'Destination port leg',
      status: getStageStatus(isPortArrived, isReleased),
      icon: Anchor,
    },
    {
      id: 'customs',
      title: 'Customs & Release',
      shortLabel: 'Customs',
      description: 'Port clearance & release token',
      detail: shipment.releaseToken
        ? 'Release token issued'
        : shipment.container?.status === 'CUSTOMS_CLEARANCE'
        ? 'Customs processing'
        : 'Awaiting discharge clearance',
      status: getStageStatus(isReleased, isDelivered),
      icon: ShieldCheck,
    },
    {
      id: 'delivery',
      title: 'Final Delivery',
      shortLabel: 'Delivered',
      description: 'Delivered to recipient',
      detail: isDelivered
        ? 'Successfully completed'
        : transitEta
        ? `Est. ${transitEta}`
        : shipment.transit?.referenceNumber
        ? `Transit #${shipment.transit.referenceNumber}`
        : 'Final destination transit',
      status: isDelivered ? 'complete' : (shipment.transitId || isReleased ? 'current' : 'pending'),
      icon: PackageCheck,
    },
  ];

  const completedCount = stages.filter((s) => s.status === 'complete').length;
  const activeStage = stages.find((s) => s.status === 'current') || (isDelivered ? stages[stages.length - 1] : stages[0]);
  const progressPercent = Math.round(((completedCount + (activeStage.status === 'current' ? 0.5 : 0)) / stages.length) * 100);

  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5 shadow-sm transition-all',
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-gold)]">
              Logistics Lifecycle
            </span>
            <span className="inline-flex items-center rounded-full bg-[rgba(var(--accent-gold-rgb),0.12)] border border-[rgba(var(--accent-gold-rgb),0.3)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-gold)]">
              {progressPercent}% Completed
            </span>
          </div>
          <h3 className="mt-0.5 text-base font-semibold text-[var(--text-primary)]">
            Stage: <span className="text-[var(--accent-gold)]">{activeStage.title}</span>
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-semibold text-[var(--text-primary)]">{completedCount}</span> of {stages.length} milestones
          </span>
          {onOpenTab && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenTab('map')}
                className="flex items-center gap-1 font-medium text-cyan-500 hover:text-cyan-400 hover:underline dark:text-cyan-400"
              >
                <Compass className="h-3.5 w-3.5 animate-pulse text-cyan-500 dark:text-cyan-400" />
                Live Map
              </button>
              <button
                type="button"
                onClick={() => onOpenTab('timeline')}
                className="flex items-center gap-1 font-medium text-[var(--accent-gold)] hover:underline"
              >
                <Clock className="h-3.5 w-3.5" />
                Full History &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar Line */}
      <div className="relative mt-4 mb-6">
        <div className="h-1.5 w-full rounded-full bg-[var(--background)] border border-[var(--border)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-[var(--accent-gold)] to-[var(--accent-gold)] transition-all duration-700 ease-out"
            style={{ width: `${Math.min(Math.max(progressPercent, 5), 100)}%` }}
          />
        </div>
      </div>

      {/* Stepper Horizontal Scroll Container */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div className="min-w-[760px] grid grid-cols-7 gap-2">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const isComplete = stage.status === 'complete';
            const isCurrent = stage.status === 'current';
            const isPending = stage.status === 'pending';

            return (
              <div
                key={stage.id}
                className={cn(
                  'relative flex flex-col p-2.5 rounded-xl border transition-all text-left',
                  isComplete && 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10',
                  isCurrent && 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)] shadow-[0_0_15px_rgba(var(--accent-gold-rgb),0.12)]',
                  isPending && 'border-[var(--border)] bg-[var(--background)]/60 opacity-65'
                )}
              >
                {/* Step Top Bar: Icon + Step # */}
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold transition-all',
                      isComplete && 'border-emerald-500/40 bg-emerald-500/20 text-emerald-500',
                      isCurrent && 'border-[var(--accent-gold)] bg-[var(--accent-gold)] text-black animate-pulse',
                      isPending && 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]'
                    )}
                  >
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-bold tracking-tight uppercase px-1.5 py-0.5 rounded',
                      isComplete && 'text-emerald-500 bg-emerald-500/10',
                      isCurrent && 'text-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.15)] font-extrabold',
                      isPending && 'text-[var(--text-secondary)]'
                    )}
                  >
                    {isComplete ? 'Done' : isCurrent ? 'Active' : `Step ${idx + 1}`}
                  </span>
                </div>

                {/* Title */}
                <h4
                  className={cn(
                    'text-xs font-semibold leading-tight line-clamp-1',
                    isCurrent ? 'text-[var(--accent-gold)]' : isComplete ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  )}
                  title={stage.title}
                >
                  {stage.title}
                </h4>

                {/* Subtitle / Detail */}
                <p
                  className="mt-1 text-[11px] leading-tight text-[var(--text-secondary)] truncate font-mono"
                  title={stage.detail}
                >
                  {stage.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
