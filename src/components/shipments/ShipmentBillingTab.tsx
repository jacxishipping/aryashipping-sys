'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertCircle, AlertTriangle, Download, FileText, Wallet } from 'lucide-react';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, FormField, toast } from '@/components/design-system';
import { hasAnyPermission } from '@/lib/rbac';
import { formatMoney } from '@/lib/format';
import { statusChipClass, statusTone } from '@/lib/status';

type ShipmentCharge = {
  id: string;
  chargeCode: string;
  category: string;
  billingMilestone: string;
  description: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  billableAt: string | null;
  approvedAt: string | null;
  invoicedAt: string | null;
  paidAt: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
  } | null;
  auditLogs: Array<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    actorLabel: string;
    oldValue: string | null;
    newValue: string | null;
    timestamp: string;
    metadata?: Record<string, unknown> | null;
  }>;
};

type ShipmentBillingResponse = {
  charges: ShipmentCharge[];
  summary: {
    total: number;
    invoiced: number;
    paid: number;
    open: number;
    counts: Record<string, number>;
  };
  readiness: {
    status: 'NOT_BILLABLE' | 'PARTIALLY_BILLABLE' | 'READY_TO_INVOICE' | 'INVOICED' | 'PAID';
    label: string;
    description: string;
    approvedUninvoicedCount: number;
    blockedCount: number;
    settledCount: number;
    totalCharges: number;
  };
  postIssueDelta: {
    active: boolean;
    kind: 'SUPPLEMENTAL_INVOICE' | 'CREDIT_NOTE' | 'ADJUSTMENT';
    approvedUninvoicedCount: number;
    deltaAmount: number;
    latestIssuedInvoiceNumber: string | null;
    latestIssuedInvoiceStatus: string | null;
    description: string | null;
  };
};

type InvoicePdfPayload = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  paidDate: string | null;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  user: {
    name: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
  };
  container: {
    containerNumber: string;
    trackingNumber: string | null;
    vesselName: string | null;
    loadingPort: string | null;
    destinationPort: string | null;
  } | null;
  shipment: {
    id: string;
    vehicleType: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    vehicleVIN: string | null;
    vehicleColor: string | null;
    paymentStatus: string | null;
  } | null;
  lineItems: Array<{
    description: string;
    type: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    shipment?: {
      vehicleYear: number | null;
      vehicleMake: string | null;
      vehicleModel: string | null;
      vehicleVIN: string | null;
    };
  }>;
};

type ShipmentBillingTabProps = {
  shipmentId: string;
  refreshKey?: string;
  purchasePriceRecord?: {
    description: string;
    amount: number;
    transactionDate: string;
  } | null;
};

const shipmentChargeStatusKeys = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'INVOICED', 'PAID', 'DISPUTED', 'VOID'];
const statusStyles: Record<string, string> = Object.fromEntries(
  shipmentChargeStatusKeys.map((value) => [value, statusChipClass(statusTone('shipmentCharge', value))]),
);

const readinessStyles: Record<ShipmentBillingResponse['readiness']['status'], string> = {
  NOT_BILLABLE: statusChipClass(statusTone('readiness', 'NOT_BILLABLE')),
  PARTIALLY_BILLABLE: statusChipClass(statusTone('readiness', 'PARTIALLY_BILLABLE')),
  READY_TO_INVOICE: statusChipClass(statusTone('readiness', 'READY_TO_INVOICE')),
  INVOICED: statusChipClass(statusTone('readiness', 'INVOICED')),
  PAID: statusChipClass(statusTone('readiness', 'PAID')),
};

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatChargeCode(value: string) {
  const friendlyChargeCodes: Record<string, string> = {
    PRICE_LIST_DISPATCH: 'Dispatch portion from price list',
    PRICE_LIST_SHIPPING: 'Shipping portion from price list',
  };

  return friendlyChargeCodes[value] || formatLabel(value);
}

function isActionableCharge(charge: ShipmentCharge) {
  // Charges locked to an issued (sent/past-due/paid) invoice can only be changed
  // after that invoice is reversed. Draft/pending invoices do not lock rows.
  if (charge.invoice && !['DRAFT', 'PENDING'].includes(charge.invoice.status)) {
    return false;
  }

  if (['PAID', 'VOID'].includes(charge.status)) {
    return false;
  }

  if (charge.status === 'INVOICED') {
    return Boolean(charge.invoice && ['DRAFT', 'PENDING'].includes(charge.invoice.status));
  }

  return ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISPUTED'].includes(charge.status);
}

function canDisputeCharge(charge: ShipmentCharge) {
  if (charge.status === 'APPROVED') return true;
  // A charge sitting on a draft/pending invoice can be pulled off it and disputed.
  if (charge.status === 'INVOICED') {
    return Boolean(charge.invoice && ['DRAFT', 'PENDING'].includes(charge.invoice.status));
  }
  return false;
}

function formatAuditAction(action: string) {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractAuditNote(metadata?: Record<string, unknown> | null) {
  if (!metadata || typeof metadata.note !== 'string') {
    return null;
  }

  const note = metadata.note.trim();
  return note || null;
}

export default function ShipmentBillingTab({ shipmentId, refreshKey, purchasePriceRecord }: ShipmentBillingTabProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<ShipmentBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingChargeId, setUpdatingChargeId] = useState<string | null>(null);
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkNote, setBulkNote] = useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceActioningId, setInvoiceActioningId] = useState<string | null>(null);

  const canManageChargeStatus = hasAnyPermission(session?.user?.role, ['shipments:manage', 'invoices:manage', 'finance:manage']);
  const canGenerateInvoices = hasAnyPermission(session?.user?.role, ['invoices:manage']);

  const fetchCharges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/shipments/${shipmentId}/charges?materialize=true`, { cache: 'no-store' });
      const payload = (await response.json()) as ShipmentBillingResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load shipment billing');
      }

      setData(payload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load shipment billing');
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    const load = async () => {
      await fetchCharges();
    };

    void load();
  }, [fetchCharges, refreshKey]);

  useEffect(() => {
    setSelectedChargeIds((current) => {
      const validIds = new Set((data?.charges || []).filter(isActionableCharge).map((charge) => charge.id));
      return current.filter((id) => validIds.has(id));
    });
  }, [data]);

  const updateChargeStatus = async (chargeId: string, status: 'APPROVED' | 'DISPUTED') => {
    try {
      setUpdatingChargeId(chargeId);
      const response = await fetch(`/api/shipments/${shipmentId}/charges/${chargeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update shipment charge');
      }

      toast.success(status === 'APPROVED' ? 'Charge approved' : 'Charge disputed');
      await fetchCharges();
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : 'Failed to update shipment charge');
    } finally {
      setUpdatingChargeId(null);
    }
  };

  const toggleSelectedCharge = (chargeId: string) => {
    setSelectedChargeIds((current) =>
      current.includes(chargeId) ? current.filter((id) => id !== chargeId) : [...current, chargeId],
    );
  };

  const charges = data?.charges || [];
  const actionableCharges = charges.filter(isActionableCharge);
  const allActionableSelected = actionableCharges.length > 0 && actionableCharges.every((charge) => selectedChargeIds.includes(charge.id));

  const toggleAllActionableCharges = () => {
    if (allActionableSelected) {
      setSelectedChargeIds([]);
      return;
    }

    setSelectedChargeIds(actionableCharges.map((charge) => charge.id));
  };

  const bulkUpdateCharges = async (status: 'APPROVED' | 'DISPUTED') => {
    if (!selectedChargeIds.length) {
      toast.error('Select at least one shipment charge first');
      return;
    }

    try {
      setBulkUpdating(true);
      const response = await fetch(`/api/shipments/${shipmentId}/charges`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chargeIds: selectedChargeIds,
          status,
          note: bulkNote.trim() || undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; updated?: number };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to bulk update shipment charges');
      }

      toast.success(
        status === 'APPROVED'
          ? `${payload.updated || selectedChargeIds.length} charge(s) approved`
          : `${payload.updated || selectedChargeIds.length} charge(s) disputed`,
      );
      setSelectedChargeIds([]);
      setBulkNote('');
      await fetchCharges();
    } catch (bulkError) {
      toast.error(bulkError instanceof Error ? bulkError.message : 'Failed to bulk update shipment charges');
    } finally {
      setBulkUpdating(false);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      setDownloadingInvoiceId(invoiceId);
      const response = await fetch(`/api/invoices/${invoiceId}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as InvoicePdfPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load invoice for download');
      }

      const { downloadInvoicePDF } = await import('@/lib/utils/generateInvoicePDF');
      await downloadInvoicePDF(payload);
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : 'Failed to download invoice');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleDiscardDraftInvoice = async (invoice: { id: string; invoiceNumber: string }) => {
    const confirmed = window.confirm(
      `Discard draft invoice ${invoice.invoiceNumber}?\n\nThe draft will be deleted and its charges released back to Approved so you can dispute or edit the rows. A new invoice will be generated next time you click Generate.`,
    );
    if (!confirmed) return;

    try {
      setInvoiceActioningId(invoice.id);
      const response = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Failed to discard draft invoice');
      toast.success(`Draft invoice ${invoice.invoiceNumber} discarded — charges released`);
      await fetchCharges();
    } catch (discardError) {
      toast.error(discardError instanceof Error ? discardError.message : 'Failed to discard draft invoice');
    } finally {
      setInvoiceActioningId(null);
    }
  };

  const handleReverseInvoice = async (invoice: { id: string; invoiceNumber: string }) => {
    const confirmed = window.confirm(
      `Reverse invoice ${invoice.invoiceNumber}?\n\nThe invoice will be cancelled (kept for the audit trail) and its charges released back to Approved so you can dispute or edit the rows. You can then generate a fresh invoice.`,
    );
    if (!confirmed) return;

    try {
      setInvoiceActioningId(invoice.id);
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          notes: 'Reversed from shipment billing so rows could be disputed/edited',
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Failed to reverse invoice');
      toast.success(`Invoice ${invoice.invoiceNumber} reversed — charges released for dispute`);
      await fetchCharges();
    } catch (reverseError) {
      toast.error(reverseError instanceof Error ? reverseError.message : 'Failed to reverse invoice');
    } finally {
      setInvoiceActioningId(null);
    }
  };

  const handleDisputeIssuedCharge = async (charge: ShipmentCharge) => {
    if (!charge.invoice) return;
    const confirmed = window.confirm(
      `Dispute this charge on issued invoice ${charge.invoice.invoiceNumber}?\n\nThe invoice will be reversed (cancelled) first, which releases ALL of its charges back to Approved so they can be reviewed. You can then fix the rows and generate a fresh invoice.`,
    );
    if (!confirmed) return;

    try {
      setInvoiceActioningId(charge.invoice.id);
      // 1. Reverse the issued invoice (releases its charges server-side).
      const reverseResponse = await fetch(`/api/invoices/${charge.invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          notes: 'Reversed to dispute a charge from the billing tab',
        }),
      });
      const reversePayload = (await reverseResponse.json().catch(() => ({}))) as { error?: string };
      if (!reverseResponse.ok) throw new Error(reversePayload.error || 'Failed to reverse invoice');

      // 2. Dispute the charge itself.
      const disputeResponse = await fetch(`/api/shipments/${shipmentId}/charges/${charge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISPUTED' }),
      });
      const disputePayload = (await disputeResponse.json().catch(() => ({}))) as { error?: string };
      if (!disputeResponse.ok) throw new Error(disputePayload.error || 'Failed to dispute charge');

      toast.success('Invoice reversed and charge disputed');
      await fetchCharges();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to dispute charge');
    } finally {
      setInvoiceActioningId(null);
    }
  };

  const generateInvoice = async () => {
    try {
      setGeneratingInvoice(true);
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentId,
          sendEmail: false,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        summary?: {
          newInvoices?: number;
          updatedInvoices?: number;
          supplementalInvoices?: number;
          creditNotes?: number;
        };
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate shipment invoice');
      }

      const detailParts = [
        payload.summary?.newInvoices ? `Created ${payload.summary.newInvoices} new invoice(s)` : null,
        payload.summary?.updatedInvoices ? `updated ${payload.summary.updatedInvoices} draft invoice(s)` : null,
        payload.summary?.supplementalInvoices ? `issued ${payload.summary.supplementalInvoices} supplemental invoice(s)` : null,
        payload.summary?.creditNotes ? `issued ${payload.summary.creditNotes} credit note(s)` : null,
      ].filter(Boolean);

      toast.success('Shipment invoice generated', {
        description: detailParts.join(', ') || 'No invoice changes were required.',
      });
      await fetchCharges();
    } catch (generationError) {
      toast.error(generationError instanceof Error ? generationError.message : 'Failed to generate shipment invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  if (loading) {
    return (
      <DashboardPanel title="Shipment Billing" description="Charge lifecycle for this shipment.">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-secondary)]">
          Loading billing charges...
        </div>
      </DashboardPanel>
    );
  }

  if (error) {
    return (
      <DashboardPanel title="Shipment Billing" description="Charge lifecycle for this shipment.">
        <div className="flex items-center gap-3 rounded-lg border border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.08)] p-4 text-sm text-[rgb(185,28,28)]">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      </DashboardPanel>
    );
  }

  const summary = data?.summary || { total: 0, invoiced: 0, paid: 0, open: 0, counts: {} };
  const readOnlyOrDraftInvoice = charges.some((charge) => charge.invoice && ['DRAFT', 'PENDING'].includes(charge.invoice.status));
  const readiness =
    data?.readiness ||
    {
      status: 'NOT_BILLABLE' as const,
      label: 'Not Billable',
      description: 'No shipment charges are available yet.',
      approvedUninvoicedCount: 0,
      blockedCount: 0,
      settledCount: 0,
      totalCharges: 0,
    };
  const canGenerateFromDraft = readiness.approvedUninvoicedCount > 0 || readOnlyOrDraftInvoice;
  const postIssueDelta =
    data?.postIssueDelta ||
    {
      active: false,
      kind: 'ADJUSTMENT' as const,
      approvedUninvoicedCount: 0,
      deltaAmount: 0,
      latestIssuedInvoiceNumber: null,
      latestIssuedInvoiceStatus: null,
      description: null,
    };

  return (
    <DashboardPanel
      title="Shipment Billing"
      description="Approved shipment charges are the source of truth for invoice generation and settlement."
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canGenerateInvoices && (
            <Button
              size="sm"
              onClick={() => void generateInvoice()}
              disabled={generatingInvoice || !canGenerateFromDraft}
            >
              {generatingInvoice
                ? 'Generating...'
                : postIssueDelta.active
                ? postIssueDelta.kind === 'CREDIT_NOTE'
                  ? 'Generate Credit Note'
                  : 'Generate Supplemental Invoice'
                : readOnlyOrDraftInvoice && readiness.approvedUninvoicedCount === 0
                ? 'Refresh Draft Invoice'
                : 'Generate Invoice'}
            </Button>
          )}
          {canManageChargeStatus && actionableCharges.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void bulkUpdateCharges('DISPUTED')}
                disabled={!selectedChargeIds.length || bulkUpdating}
              >
                {bulkUpdating ? 'Working...' : `Bulk Dispute${selectedChargeIds.length ? ` (${selectedChargeIds.length})` : ''}`}
              </Button>
              <Button
                size="sm"
                onClick={() => void bulkUpdateCharges('APPROVED')}
                disabled={!selectedChargeIds.length || bulkUpdating}
              >
                {bulkUpdating ? 'Working...' : `Bulk Approve${selectedChargeIds.length ? ` (${selectedChargeIds.length})` : ''}`}
              </Button>
            </>
          )}
          <div className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            {charges.length} charge{charges.length === 1 ? '' : 's'}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            { label: 'Open To Invoice', amount: summary.open, tone: 'text-[rgb(29,78,216)]' },
            { label: 'Invoiced', amount: summary.invoiced, tone: 'text-[var(--accent-gold)]' },
            { label: 'Paid', amount: summary.paid, tone: 'text-[rgb(21,128,61)]' },
            { label: 'Total Charges', amount: summary.total, tone: 'text-[var(--text-primary)]' },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{card.label}</p>
              <p className={`mt-2 text-lg font-semibold ${card.tone}`}>{formatMoney(card.amount, 'USD')}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.counts).map(([status, count]) => (
              <span
                key={status}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusStyles[status] || statusStyles.DRAFT}`}
              >
                {formatLabel(status)}: {count}
              </span>
            ))}
          </div>
        </div>

        {purchasePriceRecord ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Car Price Record</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{purchasePriceRecord.description}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Customer ledger reference from {new Date(purchasePriceRecord.transactionDate).toLocaleDateString()}.
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Amount</p>
                <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                  {formatMoney(purchasePriceRecord.amount, 'USD')}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              This matches the purchase-price entry shown in Ledger Comparison and stays outside the invoiceable shipment-charge workflow.
            </p>
          </div>
        ) : null}

        {postIssueDelta.active && (
          <div className="rounded-lg border border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.10)] p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(180,83,9)]" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(180,83,9)]">Post-Issue Delta Detected</p>
                <p className="mt-1 text-sm text-[rgb(120,53,15)]">
                  {postIssueDelta.description}
                  {postIssueDelta.latestIssuedInvoiceNumber ? ` Latest issued invoice: ${postIssueDelta.latestIssuedInvoiceNumber}.` : ''}
                </p>
                <p className="mt-2 text-sm text-[rgb(120,53,15)]">
                  The issued invoice stays unchanged. Any newly approved expenses will generate a
                  {postIssueDelta.kind === 'CREDIT_NOTE' ? ' credit note' : ' supplemental invoice'} instead of modifying the original document.
                </p>
                <p className="mt-2 text-xs text-[rgb(120,53,15)]">
                  Current approved delta: {formatMoney(postIssueDelta.deltaAmount, 'USD')} across {postIssueDelta.approvedUninvoicedCount} charge{postIssueDelta.approvedUninvoicedCount === 1 ? '' : 's'}.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Invoice Readiness</p>
              <div className="mt-2 flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${readinessStyles[readiness.status]}`}>
                  {readiness.label}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">{readiness.totalCharges} total charge{readiness.totalCharges === 1 ? '' : 's'}</span>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">{readiness.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Ready</p>
                <p className="mt-1 text-base font-semibold text-[rgb(29,78,216)]">{readiness.approvedUninvoicedCount}</p>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Review</p>
                <p className="mt-1 text-base font-semibold text-[rgb(180,83,9)]">{readiness.blockedCount}</p>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Settled</p>
                <p className="mt-1 text-base font-semibold text-[var(--accent-gold)]">{readiness.settledCount}</p>
              </div>
            </div>
          </div>
        </div>

        {canManageChargeStatus && actionableCharges.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Bulk Charge Actions</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Select multiple approved, draft, or disputed charges to update invoiceability in one action.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--border)]"
                      checked={allActionableSelected}
                      onChange={toggleAllActionableCharges}
                    />
                    Select all actionable charges
                  </label>
                </div>
              </div>
              <FormField
                id="bulk-charge-note"
                label="Bulk Action Note"
                multiline
                minRows={3}
                value={bulkNote}
                onChange={(event) => setBulkNote(event.target.value)}
                placeholder="Optional note explaining why these charges were approved or disputed together."
                helperText="Saved onto each selected charge and its audit log."
              />
            </div>
          </div>
        )}

        {charges.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] px-6 py-10 text-center">
            <Wallet className="h-8 w-8 text-[var(--text-secondary)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">No shipment charges yet</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Charges will appear here as shipment expenses, service fees, and invoice-linked amounts are approved.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <div className="grid grid-cols-12 border-b border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              <div className="col-span-1">Select</div>
              <div className="col-span-3">Charge</div>
              <div className="col-span-2">Milestone</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Invoice</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-1 text-right">Action</div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {charges.map((charge) => (
                <div key={charge.id} className="grid grid-cols-12 items-start gap-3 px-4 py-3 text-sm">
                  <div className="col-span-1 pt-1">
                    {canManageChargeStatus && isActionableCharge(charge) ? (
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[var(--border)]"
                        checked={selectedChargeIds.includes(charge.id)}
                        onChange={() => toggleSelectedCharge(charge.id)}
                      />
                    ) : (
                      <span className="text-[11px] text-[var(--text-secondary)]">-</span>
                    )}
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="truncate font-medium text-[var(--text-primary)]" title={charge.description}>
                      {charge.description}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {formatChargeCode(charge.chargeCode)} · {formatLabel(charge.category)}
                      {charge.billableAt ? ` · ${new Date(charge.billableAt).toLocaleDateString()}` : ''}
                    </p>
                    {charge.auditLogs.length > 0 && (
                      <details className="mt-2 rounded-md border border-[var(--border)] bg-[var(--panel)] p-2">
                        <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                          Audit History ({charge.auditLogs.length})
                        </summary>
                        <div className="mt-2 space-y-2">
                          {charge.auditLogs.map((log) => {
                            const note = extractAuditNote(log.metadata);

                            return (
                              <div key={log.id} className="rounded-md border border-[var(--border)] bg-[var(--background)] p-2 text-[11px] text-[var(--text-secondary)]">
                                <div className="flex flex-wrap gap-1">
                                  <span className="font-medium text-[var(--text-primary)]">{formatAuditAction(log.action)}</span>
                                  <span>· {log.actorLabel}</span>
                                  <span>· {new Date(log.timestamp).toLocaleString()}</span>
                                  {log.oldValue ? <span>· {formatLabel(log.oldValue)}</span> : null}
                                  {log.newValue ? <span>to {formatLabel(log.newValue)}</span> : null}
                                </div>
                                <p className="mt-1 text-[var(--text-primary)]">{log.description}</p>
                                {note ? <p className="mt-1 italic text-[var(--text-secondary)]">Note: {note}</p> : null}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                  <div className="col-span-2 text-xs text-[var(--text-secondary)]">{formatLabel(charge.billingMilestone)}</div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusStyles[charge.status] || statusStyles.DRAFT}`}>
                      {formatLabel(charge.status)}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs">
                    {charge.invoice ? (
                      <div className="flex flex-col items-start gap-2">
                        <Link href={`/dashboard/invoices/${charge.invoice.id}`} className="inline-flex items-center gap-1 font-semibold text-[var(--accent-gold)] hover:underline">
                          <FileText className="h-3.5 w-3.5" />
                          {charge.invoice.invoiceNumber}
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Download className="h-3.5 w-3.5" />}
                          onClick={() => void downloadInvoice(charge.invoice!.id)}
                          disabled={downloadingInvoiceId === charge.invoice.id}
                        >
                          {downloadingInvoiceId === charge.invoice.id ? 'Downloading...' : 'Download'}
                        </Button>
                        {canGenerateInvoices &&
                          ['DRAFT', 'PENDING'].includes(charge.invoice!.status) && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => void handleDiscardDraftInvoice(charge.invoice!)}
                              disabled={invoiceActioningId === charge.invoice.id}
                            >
                              {invoiceActioningId === charge.invoice.id ? 'Discarding...' : 'Discard Draft'}
                            </Button>
                          )}
                        {canGenerateInvoices &&
                          ['SENT', 'OVERDUE'].includes(charge.invoice!.status) && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => void handleReverseInvoice(charge.invoice!)}
                              disabled={invoiceActioningId === charge.invoice.id}
                            >
                              {invoiceActioningId === charge.invoice.id ? 'Reversing...' : 'Reverse'}
                            </Button>
                          )}
                      </div>
                    ) : (
                      <span className="text-[var(--text-secondary)]">Not invoiced</span>
                    )}
                  </div>
                  <div className={`col-span-1 text-right font-semibold ${charge.totalAmount < 0 ? 'text-[rgb(185,28,28)]' : 'text-[var(--text-primary)]'}`}>
                    {formatMoney(charge.totalAmount, charge.currency)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {canManageChargeStatus && isActionableCharge(charge) ? (
                      canDisputeCharge(charge) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void updateChargeStatus(charge.id, 'DISPUTED')}
                          disabled={updatingChargeId === charge.id || bulkUpdating}
                        >
                          {updatingChargeId === charge.id ? '...' : 'Dispute'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => void updateChargeStatus(charge.id, 'APPROVED')}
                          disabled={updatingChargeId === charge.id || bulkUpdating}
                        >
                          {updatingChargeId === charge.id ? '...' : 'Approve'}
                        </Button>
                      )
                    ) : canGenerateInvoices &&
                      charge.invoice &&
                      ['SENT', 'OVERDUE'].includes(charge.invoice.status) &&
                      charge.status === 'INVOICED' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleDisputeIssuedCharge(charge)}
                        disabled={invoiceActioningId === charge.invoice.id || bulkUpdating}
                        title="Disputing this charge first reverses (cancels) its invoice and releases all its charges"
                      >
                        {invoiceActioningId === charge.invoice.id ? 'Working...' : 'Dispute'}
                      </Button>
                    ) : (
                      <span className="text-[11px] text-[var(--text-secondary)]">-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardPanel>
  );
}
