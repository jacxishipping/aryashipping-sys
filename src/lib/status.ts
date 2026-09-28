/**
 * Shared status chip tokens.
 *
 * One semantic color language for every status chip in the app:
 *   neutral  — draft / cancelled / void / not applicable
 *   active   — in progress, in transit, invoiced-pending (blue)
 *   success  — done, paid, delivered (green)
 *   warning  — needs attention, pending approval (amber)
 *   danger   — disputed, overdue, errors (red)
 *   brand    — issued/invoiced, the company gold accent
 *
 * Pages should replace their locally-duplicated status->class maps with
 * `statusChipClass(domain, status)` (or the tone helpers) over time.
 */

export type StatusTone = 'neutral' | 'active' | 'success' | 'warning' | 'danger' | 'brand';

export const STATUS_TONE_CHIP: Record<StatusTone, string> = {
  neutral: 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)]',
  active: 'border-[rgba(59,130,246,0.32)] bg-[rgba(59,130,246,0.12)] text-[rgb(29,78,216)]',
  success: 'border-[rgba(34,197,94,0.34)] bg-[rgba(34,197,94,0.12)] text-[rgb(21,128,61)]',
  warning: 'border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] text-[rgb(180,83,9)]',
  danger: 'border-[rgba(239,68,68,0.34)] bg-[rgba(239,68,68,0.12)] text-[rgb(185,28,28)]',
  brand: 'border-[rgba(var(--accent-gold-rgb),0.32)] bg-[rgba(var(--accent-gold-rgb),0.14)] text-[var(--accent-gold)]',
};

export function statusChipClass(tone: StatusTone): string {
  return STATUS_TONE_CHIP[tone];
}

/**
 * Domain statuses -> tone. Canonical status strings only; unknown values fall
 * back to neutral so new enum values never crash the UI.
 */
export const STATUS_TONE_BY_DOMAIN: Record<string, Record<string, StatusTone>> = {
  shipment: {
    ON_HAND: 'active',
    DISPATCHING: 'warning',
    IN_TRANSIT: 'active',
    RELEASED: 'success',
    IN_TRANSIT_TO_DESTINATION: 'active',
    DELIVERED: 'success',
    CANCELLED: 'neutral',
    VOID: 'neutral',
  },
  shipmentCharge: {
    DRAFT: 'neutral',
    PENDING_APPROVAL: 'warning',
    APPROVED: 'active',
    INVOICED: 'brand',
    PAID: 'success',
    DISPUTED: 'danger',
    VOID: 'neutral',
  },
  invoice: {
    DRAFT: 'neutral',
    PENDING: 'warning',
    SENT: 'active',
    PAID: 'success',
    OVERDUE: 'danger',
    CANCELLED: 'neutral',
  },
  transit: {
    PENDING: 'active',
    DISPATCHED: 'warning',
    IN_TRANSIT: 'active',
    ARRIVED: 'success',
    DELIVERED: 'success',
    CANCELLED: 'neutral',
  },
  readiness: {
    NOT_BILLABLE: 'neutral',
    PARTIALLY_BILLABLE: 'warning',
    READY_TO_INVOICE: 'active',
    INVOICED: 'brand',
    PAID: 'success',
  },
};

export function statusTone(domain: string, status: string | null | undefined): StatusTone {
  if (!status) return 'neutral';
  return STATUS_TONE_BY_DOMAIN[domain]?.[status] ?? 'neutral';
}

export function statusToneChipClass(domain: string, status: string | null | undefined): string {
  return statusChipClass(statusTone(domain, status));
}

/** Shared chip markup class used by every status chip in the app. */
export const STATUS_CHIP_BASE =
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide';
