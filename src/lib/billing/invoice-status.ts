import { UserInvoiceStatus } from '@prisma/client';

/**
 * Allowed status transitions for a UserInvoice.
 *
 * A transition not listed here is rejected by the API layer, replacing the
 * previous "any status can move to any status" behaviour.
 */
export const INVOICE_STATUS_TRANSITIONS: Record<
  UserInvoiceStatus,
  UserInvoiceStatus[]
> = {
  DRAFT: ['PENDING', 'SENT', 'VOID', 'CANCELLED'],
  PENDING: ['SENT', 'PAID', 'PARTIALLY_PAID', 'VOID', 'CANCELLED', 'OVERDUE'],
  SENT: ['PAID', 'PARTIALLY_PAID', 'VOID', 'OVERDUE', 'REFUNDED'],
  PAID: ['REFUNDED', 'VOID'],
  PARTIALLY_PAID: ['PAID', 'REFUNDED', 'VOID', 'OVERDUE'],
  OVERDUE: ['PAID', 'PARTIALLY_PAID', 'VOID', 'REFUNDED'],
  CANCELLED: [], // terminal
  VOID: [], // terminal
  REFUNDED: ['VOID'], // terminal-ish; can be voided after refund
};

/**
 * Returns `true` if `from` → `to` is a legal transition.
 * `from === to` is always allowed (no-op).
 */
export function canTransitionInvoiceStatus(
  from: UserInvoiceStatus,
  to: UserInvoiceStatus,
): boolean {
  if (from === to) return true;
  const allowed = INVOICE_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Human-readable reason for an invalid transition, useful for API error messages.
 */
export function invoiceTransitionError(
  from: UserInvoiceStatus,
  to: UserInvoiceStatus,
): string | null {
  if (canTransitionInvoiceStatus(from, to)) return null;
  const allowed = INVOICE_STATUS_TRANSITIONS[from] ?? [];
  return `Invalid invoice status transition: ${from} → ${to}. Allowed from ${from}: ${allowed.length ? allowed.join(', ') : '(none — terminal status)'}.`;
}
