import type { DispatchStatus } from '@prisma/client';

export const DISPATCH_STATUS_OPTIONS: DispatchStatus[] = [
  'PENDING',
  'DISPATCHED',
  'ARRIVED_AT_PORT',
  'COMPLETED',
  'CANCELLED',
];

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  PENDING: 'Pending',
  DISPATCHED: 'Dispatched',
  ARRIVED_AT_PORT: 'Arrived At Port',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const DISPATCH_STATUS_COLORS: Record<DispatchStatus, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'rgba(156, 163, 175, 0.15)', text: 'rgb(156, 163, 175)', border: 'rgba(156, 163, 175, 0.3)' },
  DISPATCHED: { bg: 'rgba(234, 179, 8, 0.15)', text: 'rgb(161, 98, 7)', border: 'rgba(234, 179, 8, 0.35)' },
  ARRIVED_AT_PORT: { bg: 'rgba(59, 130, 246, 0.15)', text: 'rgb(59, 130, 246)', border: 'rgba(59, 130, 246, 0.3)' },
  COMPLETED: { bg: 'rgba(34, 197, 94, 0.15)', text: 'rgb(34, 197, 94)', border: 'rgba(34, 197, 94, 0.3)' },
  CANCELLED: { bg: 'rgba(239, 68, 68, 0.15)', text: 'rgb(239, 68, 68)', border: 'rgba(239, 68, 68, 0.3)' },
};

export function getDispatchStatusLabel(status: DispatchStatus | string): string {
  return DISPATCH_STATUS_LABELS[status as DispatchStatus] ?? status;
}

export function isDispatchClosed(status: DispatchStatus | string): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED';
}

export function isDispatchActive(status: DispatchStatus | string): boolean {
  return status === 'PENDING' || status === 'DISPATCHED' || status === 'ARRIVED_AT_PORT';
}

export function shouldReleaseDispatchShipments(status: DispatchStatus | string): boolean {
  return status === 'ARRIVED_AT_PORT' || status === 'COMPLETED' || status === 'CANCELLED';
}

export function allocateDispatchExpense(
  shipments: Array<{ id: string; insuranceValue: number | null; weight: number | null }>,
  totalAmount: number,
) {
  if (shipments.length === 0) {
    return [] as Array<{ shipmentId: string; amount: number }>;
  }

  const base = Math.floor((totalAmount / shipments.length) * 100) / 100;
  const allocations = shipments.map((shipment) => ({ shipmentId: shipment.id, amount: base }));
  const assigned = allocations.reduce((sum, item) => sum + item.amount, 0);
  const remainder = Number((totalAmount - assigned).toFixed(2));
  allocations[0].amount = Number((allocations[0].amount + remainder).toFixed(2));
  return allocations;
}