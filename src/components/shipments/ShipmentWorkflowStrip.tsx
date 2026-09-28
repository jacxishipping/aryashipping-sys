import { CheckCircle2, CircleDashed, MapPinned, Ship, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

type ShipmentWorkflowStripProps = {
  shipmentStatus?: string | null;
  dispatchId?: string | null;
  dispatchReference?: string | null;
  containerId?: string | null;
  containerLabel?: string | null;
  transitId?: string | null;
  transitReference?: string | null;
  className?: string;
};

type StageState = 'pending' | 'current' | 'complete';

type StageConfig = {
  key: string;
  title: string;
  description: string;
  summary: string;
  state: StageState;
  icon: typeof Truck;
};

function getCurrentStageIndex(props: ShipmentWorkflowStripProps) {
  if (props.shipmentStatus === 'DELIVERED') {
    return 2;
  }

  if (props.transitId || props.shipmentStatus === 'IN_TRANSIT_TO_DESTINATION') {
    return 2;
  }

  if (props.containerId || props.shipmentStatus === 'IN_TRANSIT' || props.shipmentStatus === 'RELEASED') {
    return 1;
  }

  return 0;
}

function getStageState(index: number, currentStageIndex: number, delivered: boolean): StageState {
  if (delivered) {
    return 'complete';
  }

  if (index < currentStageIndex) {
    return 'complete';
  }

  if (index === currentStageIndex) {
    return 'current';
  }

  return 'pending';
}

function getStageSummary(props: ShipmentWorkflowStripProps, currentStageIndex: number) {
  const isDelivered = props.shipmentStatus === 'DELIVERED';

  return {
    dispatching:
      props.dispatchReference ||
      (props.dispatchId ? 'Dispatch assigned' : currentStageIndex === 0 ? 'Create or assign a dispatch' : 'Dispatch leg completed'),
    shipping:
      props.containerLabel ||
      (props.containerId
        ? 'Container assigned'
        : currentStageIndex > 1 || props.shipmentStatus === 'RELEASED'
        ? 'Shipping leg completed'
        : 'Awaiting container handoff'),
    transit:
      isDelivered
        ? 'Shipment delivered'
        : props.transitReference ||
          (props.transitId
            ? 'Transit assigned'
            : props.shipmentStatus === 'RELEASED'
            ? 'Ready for transit assignment'
            : 'Awaiting transit / delivery handoff'),
  };
}

const cardStyles: Record<StageState, string> = {
  pending: 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)]',
  current: 'border-[rgba(var(--accent-gold-rgb),0.45)] bg-[rgba(var(--accent-gold-rgb),0.1)] text-[var(--text-primary)]',
  complete: 'border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.08)] text-[var(--text-primary)]',
};

const badgeStyles: Record<StageState, string> = {
  pending: 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]',
  current: 'border-[rgba(var(--accent-gold-rgb),0.45)] bg-[rgba(var(--accent-gold-rgb),0.16)] text-[var(--accent-gold)]',
  complete: 'border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.14)] text-[rgb(34,197,94)]',
};

const markerStyles: Record<StageState, string> = {
  pending: 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]',
  current: 'border-[var(--accent-gold)] bg-[var(--accent-gold)] text-white',
  complete: 'border-[rgb(34,197,94)] bg-[rgb(34,197,94)] text-white',
};

export default function ShipmentWorkflowStrip(props: ShipmentWorkflowStripProps) {
  const currentStageIndex = getCurrentStageIndex(props);
  const delivered = props.shipmentStatus === 'DELIVERED';
  const progressWidth = delivered ? 100 : currentStageIndex * 50;
  const summaries = getStageSummary(props, currentStageIndex);

  const stages: StageConfig[] = [
    {
      key: 'dispatching',
      title: 'Dispatching',
      description: 'Origin yard to port handoff',
      summary: summaries.dispatching,
      state: getStageState(0, currentStageIndex, delivered),
      icon: Truck,
    },
    {
      key: 'shipping',
      title: 'Shipping',
      description: 'Container and ocean freight stage',
      summary: summaries.shipping,
      state: getStageState(1, currentStageIndex, delivered),
      icon: Ship,
    },
    {
      key: 'transit',
      title: 'Transit / Delivery',
      description: 'Final inland transit and delivery',
      summary: summaries.transit,
      state: getStageState(2, currentStageIndex, delivered),
      icon: MapPinned,
    },
  ];

  return (
    <div className={cn('rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5', props.className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Shipment Workflow</p>
          <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">Three-stage movement overview</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Current stage: <span className="font-semibold text-[var(--text-primary)]">{delivered ? 'Delivered' : stages[currentStageIndex].title}</span>
        </p>
      </div>

      <div className="mt-4">
        <div className="relative h-2 rounded-full bg-[var(--background)]">
          <div
            className="h-2 rounded-full bg-[var(--accent-gold)] transition-all duration-300"
            style={{ width: `${progressWidth}%` }}
          />
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-1">
            {stages.map((stage) => {
              const Icon = stage.state === 'complete' ? CheckCircle2 : stage.state === 'current' ? stage.icon : CircleDashed;
              return (
                <span
                  key={stage.key}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] shadow-sm transition-colors',
                    markerStyles[stage.state],
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.key}
              className={cn('rounded-2xl border p-4 transition-colors', cardStyles[stage.state])}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-current/20 bg-black/5">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Stage {index + 1}</p>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">{stage.title}</h4>
                  </div>
                </div>
                <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]', badgeStyles[stage.state])}>
                  {stage.state}
                </span>
              </div>

              <p className="mt-3 text-sm text-[var(--text-secondary)]">{stage.description}</p>
              <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{stage.summary}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}