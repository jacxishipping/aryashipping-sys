import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, FileText, PackageCheck, Ship, Truck } from 'lucide-react';
import { Button } from '@/components/design-system';
import type { Shipment } from '@/components/shipments/shipment-detail-types';

type ShipmentNextActionPanelProps = {
  shipment: Shipment;
  canAssignDispatch: boolean;
  canManageWorkflow: boolean;
  isReleasedForTransit: boolean;
  creatingReleaseToken: boolean;
  onAssignDispatch: () => void;
  onAssignTransit: () => void;
  onGenerateReleaseToken: () => void | Promise<void>;
  onOpenFinancials: () => void;
  onOpenBilling: () => void;
  onOpenDetails: () => void;
};

type ActionState = {
  title: string;
  description: string;
  helper: string;
  tone: 'ready' | 'waiting' | 'done' | 'attention';
  icon: ReactNode;
  primary?: {
    label: string;
    onClick?: () => void | Promise<void>;
    href?: string;
    disabled?: boolean;
  };
  secondary?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
};

function hasPriceListDispatchPosted(shipment: Shipment) {
  return Boolean(shipment.priceListPricingSnapshot?.posted?.dispatch?.chargeId);
}

function hasPriceListShippingPosted(shipment: Shipment) {
  return Boolean(shipment.priceListPricingSnapshot?.posted?.shipping?.chargeId);
}

function getNextActionState({
  shipment,
  canAssignDispatch,
  canManageWorkflow,
  isReleasedForTransit,
  creatingReleaseToken,
  onAssignDispatch,
  onAssignTransit,
  onGenerateReleaseToken,
  onOpenFinancials,
  onOpenBilling,
  onOpenDetails,
}: ShipmentNextActionPanelProps): ActionState {
  if (shipment.status === 'DELIVERED') {
    return {
      title: 'Shipment delivered',
      description: 'Review billing, documents, and final activity before closing out the file.',
      helper: 'The movement workflow is complete.',
      tone: 'done',
      icon: <CheckCircle2 className="h-5 w-5" />,
      primary: { label: 'Review Billing', onClick: onOpenBilling },
      secondary: { label: 'Review Financials', onClick: onOpenFinancials },
    };
  }

  if (shipment.status === 'CANCELLED') {
    return {
      title: 'Shipment cancelled',
      description: 'Review financials and documents for credits, adjustments, or remaining records.',
      helper: 'No workflow action is currently expected.',
      tone: 'attention',
      icon: <AlertTriangle className="h-5 w-5" />,
      primary: { label: 'Review Financials', onClick: onOpenFinancials },
    };
  }

  if (canAssignDispatch) {
    return {
      title: 'Assign dispatch',
      description: 'This shipment is on hand and ready to enter the origin movement stage.',
      helper: hasPriceListDispatchPosted(shipment)
        ? 'Dispatch price-list charge has already posted.'
        : 'Dispatch price-list charge can post after dispatch handoff when pricing is matched.',
      tone: 'ready',
      icon: <Truck className="h-5 w-5" />,
      primary: { label: 'Assign Dispatch', onClick: onAssignDispatch },
      secondary: { label: 'Open Financials', onClick: onOpenFinancials },
    };
  }

  if (shipment.dispatchId && !shipment.containerId && !shipment.transitId) {
    return {
      title: 'Move to container handoff',
      description: 'The shipment is in dispatch. Hand it off to the shipping container when the origin leg is ready.',
      helper: hasPriceListShippingPosted(shipment)
        ? 'Shipping price-list charge has posted.'
        : 'Container assignment posts the shipping portion when a matching company price list exists.',
      tone: 'waiting',
      icon: <Ship className="h-5 w-5" />,
      primary: {
        label: shipment.dispatch?.referenceNumber ? 'Open Dispatch' : 'Open Dispatches',
        href: shipment.dispatchId ? `/dashboard/dispatches/${shipment.dispatchId}` : '/dashboard/dispatches',
      },
      secondary: { label: 'Review Price List', onClick: onOpenFinancials },
    };
  }

  if (isReleasedForTransit && !shipment.releaseToken && canManageWorkflow) {
    return {
      title: 'Generate release token',
      description: 'The shipment is released. Create the token required for final transit assignment.',
      helper: 'The token is used to verify the release before delivery transit.',
      tone: 'ready',
      icon: <FileText className="h-5 w-5" />,
      primary: {
        label: creatingReleaseToken ? 'Generating...' : 'Generate Token',
        onClick: onGenerateReleaseToken,
        disabled: creatingReleaseToken,
      },
      secondary: { label: 'Review Billing', onClick: onOpenBilling },
    };
  }

  if (isReleasedForTransit && !shipment.transitId && canManageWorkflow) {
    return {
      title: 'Assign transit',
      description: 'The shipment is released and ready for final inland transit.',
      helper: 'Use the release token to verify the handoff.',
      tone: 'ready',
      icon: <Truck className="h-5 w-5" />,
      primary: { label: 'Assign Transit', onClick: onAssignTransit },
      secondary: { label: 'Review Billing', onClick: onOpenBilling },
    };
  }

  if (shipment.containerId && !isReleasedForTransit) {
    return {
      title: 'Track container progress',
      description: 'The shipment is in the shipping stage. Keep container milestones and ETA current.',
      helper: hasPriceListShippingPosted(shipment)
        ? 'Shipping price-list charge is already available in billing.'
        : 'Check Financials if the shipping price-list charge has not posted.',
      tone: 'waiting',
      icon: <Ship className="h-5 w-5" />,
      primary: {
        label: shipment.container?.containerNumber ? 'Open Container' : 'Open Containers',
        href: shipment.containerId ? `/dashboard/containers/${shipment.containerId}` : '/dashboard/containers',
      },
      secondary: { label: 'Open Billing', onClick: onOpenBilling },
    };
  }

  return {
    title: 'Review shipment setup',
    description: 'Confirm the customer, vehicle details, pickup lane, documents, and workflow assignment.',
    helper: 'Complete missing setup before moving the shipment through the workflow.',
    tone: 'attention',
    icon: <PackageCheck className="h-5 w-5" />,
    primary: { label: 'Review Details', onClick: onOpenDetails },
    secondary: { label: 'Open Financials', onClick: onOpenFinancials },
  };
}

const toneStyles: Record<ActionState['tone'], string> = {
  ready: 'border-[rgba(var(--accent-gold-rgb),0.35)] bg-[rgba(var(--accent-gold-rgb),0.08)]',
  waiting: 'border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.08)]',
  done: 'border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.08)]',
  attention: 'border-[rgba(var(--warning-rgb),0.32)] bg-[rgba(var(--warning-rgb),0.08)]',
};

export default function ShipmentNextActionPanel(props: ShipmentNextActionPanelProps) {
  const action = getNextActionState(props);

  return (
    <div className={`rounded-2xl border p-4 ${toneStyles[action.tone]}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] text-[var(--accent-gold)]">
            {action.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Next Best Action</p>
            <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">{action.title}</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{action.description}</p>
            <p className="mt-2 text-xs text-[var(--text-primary)]">{action.helper}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {action.secondary?.href ? (
            <Link href={action.secondary.href}>
              <Button variant="outline" size="sm">{action.secondary.label}</Button>
            </Link>
          ) : action.secondary ? (
            <Button variant="outline" size="sm" onClick={action.secondary.onClick}>
              {action.secondary.label}
            </Button>
          ) : null}

          {action.primary?.href ? (
            <Link href={action.primary.href}>
              <Button size="sm">{action.primary.label}</Button>
            </Link>
          ) : action.primary ? (
            <Button size="sm" onClick={() => void action.primary?.onClick?.()} disabled={action.primary.disabled}>
              {action.primary.label}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Dispatch Charge</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {hasPriceListDispatchPosted(props.shipment) ? 'Posted' : 'Not posted yet'}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Shipping Charge</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {hasPriceListShippingPosted(props.shipment) ? 'Posted' : 'Not posted yet'}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Billing</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {props.shipment.paymentStatus ? props.shipment.paymentStatus.replace(/_/g, ' ') : 'Unknown'}
          </p>
        </div>
      </div>
    </div>
  );
}
