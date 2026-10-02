'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Wallet, History, Receipt, AlertTriangle, Package, FileText, ExternalLink, PlusCircle, CreditCard, FileCheck } from 'lucide-react';
import { DashboardGrid, DashboardPanel, DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PageHeader, PaymentStatusBadge, Select, FormField, Skeleton, SkeletonTable, toast } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
};

type CustomerInfo = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  createdAt: string;
};

type InvoiceHistoryRow = {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'PENDING' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  total: number;
  issueDate: string;
  dueDate: string | null;
  paidDate: string | null;
  daysOverdue: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  shipmentId: string;
  shipmentReference: string;
  lineItemCount: number;
};

type UnbilledChargeRow = {
  id: string;
  shipmentId: string;
  shipmentReference: string;
  chargeCode: string;
  category: string;
  description: string;
  billingMilestone: string;
  status: string;
  totalAmount: number;
  billableAt: string | null;
  createdAt: string;
};

type ShipmentRow = {
  id: string;
  reference: string;
  paymentStatus: string;
  portalPaymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  portalBalance: number;
  portalPaidAmount: number;
  assignedAt: string;
  notes: string | null;
};

type PortalLedgerEntryRow = {
  id: string;
  shipmentId: string | null;
  shipmentReference: string | null;
  paymentRecordId: string | null;
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
};

type PortalPaymentRecordRow = {
  id: string;
  shipmentId: string | null;
  shipmentReference: string | null;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
};

type CustomerFinanceDetailResponse = {
  portal: PortalInfo;
  customer: CustomerInfo;
  summary: {
    linkedShipmentCount: number;
    invoiceCount: number;
    openInvoiceCount: number;
    overdueInvoiceCount: number;
    outstandingAmount: number;
    overdueAmount: number;
    paidAmount: number;
    unbilledAmount: number;
    unbilledChargeCount: number;
  };
  portalLedgerSummary: {
    balance: number;
    debitAmount: number;
    creditAmount: number;
    paymentRecordCount: number;
    ledgerEntryCount: number;
  };
  activityFilters: {
    activityStartDate: string | null;
    activityEndDate: string | null;
  };
  activitySummary: {
    debitAmount: number;
    creditAmount: number;
    paymentRecordCount: number;
    ledgerEntryCount: number;
  };
  aging: {
    current: { count: number; amount: number };
    days1to30: { count: number; amount: number };
    days31to60: { count: number; amount: number };
    days61to90: { count: number; amount: number };
    days90plus: { count: number; amount: number };
  };
  invoices: InvoiceHistoryRow[];
  unbilledCharges: UnbilledChargeRow[];
  shipments: ShipmentRow[];
  portalLedgerEntries: PortalLedgerEntryRow[];
  portalPaymentRecords: PortalPaymentRecordRow[];
  viewer?: {
    customerScoped: boolean;
    canManageFinance: boolean;
    partnerCustomerId: string | null;
  };
};

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString();
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

export default function PortalCustomerFinanceDetailPage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const customerId = String(params.customerId || '');
  const [activityStartDate, setActivityStartDate] = useState('');
  const [activityEndDate, setActivityEndDate] = useState('');
  const [data, setData] = useState<CustomerFinanceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingLedgerEntry, setSavingLedgerEntry] = useState(false);
  const [savingPaymentRecord, setSavingPaymentRecord] = useState(false);
  const [ledgerForm, setLedgerForm] = useState({
    description: '',
    type: 'DEBIT' as 'DEBIT' | 'CREDIT',
    amount: '',
    shipmentId: '',
    transactionDate: todayInputValue(),
    paymentMethod: '',
    reference: '',
    notes: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    shipmentId: '',
    paymentDate: todayInputValue(),
    paymentMethod: 'BANK_TRANSFER',
    reference: '',
    notes: '',
  });

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const searchParams = new URLSearchParams();
      if (activityStartDate) {
        searchParams.set('activityStartDate', activityStartDate);
      }
      if (activityEndDate) {
        searchParams.set('activityEndDate', activityEndDate);
      }

      const response = await fetch(`/api/partner-portals/${portalId}/finance/${customerId}${searchParams.size ? `?${searchParams.toString()}` : ''}`, { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load customer finance');
      }

      setData(payload);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load customer finance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (portalId && customerId) {
      void fetchDetail();
    }
  }, [activityEndDate, activityStartDate, customerId, portalId]);

  const activityExportHref = useMemo(() => {
    const searchParams = new URLSearchParams({ format: 'csv' });
    if (activityStartDate) {
      searchParams.set('activityStartDate', activityStartDate);
    }
    if (activityEndDate) {
      searchParams.set('activityEndDate', activityEndDate);
    }

    return `/api/partner-portals/${portalId}/finance/${customerId}?${searchParams.toString()}`;
  }, [activityEndDate, activityStartDate, customerId, portalId]);

  useEffect(() => {
    if (!data?.shipments?.length) {
      return;
    }

    if (data.shipments.length === 1) {
      const onlyShipmentId = data.shipments[0].id;
      setLedgerForm((current) => (current.shipmentId ? current : { ...current, shipmentId: onlyShipmentId }));
      setPaymentForm((current) => (current.shipmentId ? current : { ...current, shipmentId: onlyShipmentId }));
    }
  }, [data?.shipments]);

  const handleCreateLedgerEntry = async () => {
    const amount = Number.parseFloat(ledgerForm.amount);
    if (!ledgerForm.description.trim()) {
      toast.error('Ledger description is required');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Ledger amount must be greater than zero');
      return;
    }

    try {
      setSavingLedgerEntry(true);
      const response = await fetch(`/api/partner-portals/${portalId}/finance/${customerId}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: ledgerForm.description,
          type: ledgerForm.type,
          amount,
          shipmentId: ledgerForm.shipmentId || null,
          transactionDate: toIsoDate(ledgerForm.transactionDate),
          paymentMethod: ledgerForm.paymentMethod || undefined,
          reference: ledgerForm.reference || undefined,
          notes: ledgerForm.notes || undefined,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create portal ledger entry');
      }

      toast.success('Portal ledger entry created');
      setLedgerForm({
        description: '',
        type: 'DEBIT',
        amount: '',
        shipmentId: data?.shipments.length === 1 ? data.shipments[0].id : '',
        transactionDate: todayInputValue(),
        paymentMethod: '',
        reference: '',
        notes: '',
      });
      await fetchDetail();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create portal ledger entry');
    } finally {
      setSavingLedgerEntry(false);
    }
  };

  const handleCreatePaymentRecord = async () => {
    const amount = Number.parseFloat(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }
    if (data?.shipments.length && !paymentForm.shipmentId) {
      toast.error('Select the portal shipment this payment should affect');
      return;
    }

    try {
      setSavingPaymentRecord(true);
      const response = await fetch(`/api/partner-portals/${portalId}/finance/${customerId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          shipmentId: paymentForm.shipmentId || null,
          paymentDate: toIsoDate(paymentForm.paymentDate),
          paymentMethod: paymentForm.paymentMethod,
          reference: paymentForm.reference || undefined,
          notes: paymentForm.notes || undefined,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create portal payment record');
      }

      toast.success('Portal payment recorded');
      setPaymentForm({
        amount: '',
        shipmentId: data?.shipments.length === 1 ? data.shipments[0].id : '',
        paymentDate: todayInputValue(),
        paymentMethod: 'BANK_TRANSFER',
        reference: '',
        notes: '',
      });
      await fetchDetail();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create portal payment record');
    } finally {
      setSavingPaymentRecord(false);
    }
  };

  const invoiceColumns = useMemo<Column<InvoiceHistoryRow>[]>(() => [
    {
      key: 'invoice',
      header: 'Invoice',
      render: (_, row) => (
        <div className="grid gap-0.5">
          <p className="text-sm font-bold text-[var(--text-primary)]">{row.invoiceNumber}</p>
          <p className="text-xs text-[var(--text-secondary)]">Issued {formatDate(row.issueDate)}</p>
        </div>
      ),
    },
    {
      key: 'shipment',
      header: 'Shipment',
      render: (_, row) => row.shipmentReference,
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => <PaymentStatusBadge status={row.status === 'SENT' ? 'PENDING' : row.status === 'DRAFT' || row.status === 'CANCELLED' ? 'PENDING' : row.status} />,
    },
    {
      key: 'due',
      header: 'Due',
      render: (_, row) => row.dueDate ? `${formatDate(row.dueDate)}${row.daysOverdue && row.daysOverdue > 0 ? ` (${row.daysOverdue}d overdue)` : ''}` : '—',
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (_, row) => formatCurrency(row.total),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex gap-2 justify-end flex-nowrap whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <Link href={`/portal/${portalId}/shipments/${row.shipmentId}`}>
            <Button variant="outline" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
              Shipment
            </Button>
          </Link>
          <a href={`/api/partner-portals/${portalId}/finance/invoices/${row.id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">View PDF</Button>
          </a>
          <a href={`/api/partner-portals/${portalId}/finance/invoices/${row.id}/pdf?download=1`}>
            <Button variant="outline" size="sm">Download</Button>
          </a>
        </div>
      ),
    },
  ], [portalId]);

  const chargeColumns = useMemo<Column<UnbilledChargeRow>[]>(() => [
    {
      key: 'shipment',
      header: 'Shipment',
      render: (_, row) => row.shipmentReference,
    },
    {
      key: 'description',
      header: 'Charge',
      render: (_, row) => (
        <div className="grid gap-0.5">
          <p className="text-sm font-bold text-[var(--text-primary)]">{row.description}</p>
          <p className="text-xs text-[var(--text-secondary)]">{row.chargeCode} • {row.category.replace(/_/g, ' ')}</p>
        </div>
      ),
    },
    {
      key: 'milestone',
      header: 'Milestone',
      render: (_, row) => row.billingMilestone.replace(/_/g, ' '),
    },
    {
      key: 'billableAt',
      header: 'Billable',
      render: (_, row) => formatDate(row.billableAt || row.createdAt),
    },
    {
      key: 'amount',
      header: 'Unbilled Amount',
      render: (_, row) => formatCurrency(row.totalAmount),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex justify-end flex-nowrap whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <Link href={`/portal/${portalId}/shipments/${row.shipmentId}`}>
            <Button variant="outline" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
              Shipment
            </Button>
          </Link>
        </div>
      ),
    },
  ], [portalId]);

  const shipmentColumns = useMemo<Column<ShipmentRow>[]>(() => [
    {
      key: 'reference',
      header: 'Shipment',
      render: (_, row) => row.reference,
    },
    {
      key: 'portalStatus',
      header: 'Portal-Only Payment',
      render: (_, row) => <PaymentStatusBadge status={row.portalPaymentStatus} />,
    },
    {
      key: 'portalBalance',
      header: 'Portal-Only Balance',
      render: (_, row) => formatCurrency(row.portalBalance),
    },
    {
      key: 'portalPaidAmount',
      header: 'Portal-Only Paid',
      render: (_, row) => formatCurrency(row.portalPaidAmount),
    },
    {
      key: 'mainStatus',
      header: 'Main Shipment Payment',
      render: (_, row) => <span className="text-xs text-[var(--text-secondary)]">{row.paymentStatus}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex justify-end flex-nowrap whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <Link href={`/portal/${portalId}/shipments/${row.id}`}>
            <Button variant="outline" size="sm">Open</Button>
          </Link>
        </div>
      ),
    },
  ], [portalId]);

  const ledgerColumns = useMemo<Column<PortalLedgerEntryRow>[]>(() => [
    {
      key: 'transactionDate',
      header: 'Date',
      render: (_, row) => formatDate(row.transactionDate),
    },
    {
      key: 'description',
      header: 'Entry',
      render: (_, row) => (
        <div className="grid gap-0.5">
          <p className="text-sm font-bold text-[var(--text-primary)]">{row.description}</p>
          <p className="text-xs text-[var(--text-secondary)]">{row.shipmentReference || 'Customer-level entry'}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (_, row) => <PaymentStatusBadge status={row.type === 'DEBIT' ? 'OVERDUE' : 'PAID'} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (_, row) => formatCurrency(row.amount),
    },
    {
      key: 'balance',
      header: 'Running Balance',
      render: (_, row) => formatCurrency(row.balance),
    },
  ], []);

  const paymentColumns = useMemo<Column<PortalPaymentRecordRow>[]>(() => [
    {
      key: 'paymentDate',
      header: 'Date',
      render: (_, row) => formatDate(row.paymentDate),
    },
    {
      key: 'shipmentReference',
      header: 'Shipment',
      render: (_, row) => row.shipmentReference || 'Customer-level payment',
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (_, row) => row.paymentMethod,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (_, row) => formatCurrency(row.amount),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (_, row) => row.reference || '—',
    },
  ], []);

  return (
    <DashboardSurface>
      <PageHeader
        title={data ? `${data.customer.name} Finance` : 'Customer Finance'}
        description={data?.viewer?.canManageFinance
          ? 'Review main-system receivables while maintaining portal-only ledgers, payment records, and activity history for this customer.'
          : 'Review main-system receivables and portal-only activity for this customer. Manual finance controls are hidden for customer-scoped logins.'}
        meta={data ? [
          { label: 'Open Invoices', value: formatCurrency(data.summary.outstandingAmount), helper: `${data.summary.openInvoiceCount} main-system invoices` },
          { label: 'Portal-Only Balance', value: formatCurrency(data.portalLedgerSummary.balance), helper: 'Current customer balance inside the portal only' },
          { label: 'Portal-Only Payments', value: data.portalLedgerSummary.paymentRecordCount, helper: 'Recorded inside the portal only' },
          { label: 'Shipments', value: data.summary.linkedShipmentCount, helper: 'Linked to this customer' },
        ] : undefined}
        actions={
          <div className="no-print flex gap-2 flex-wrap">
            <a href={activityExportHref}>
              <Button variant="outline" size="sm">Export Portal-Only Activity</Button>
            </a>
            <Link href={`/portal/${portalId}/finance`}>
              <Button variant="outline" size="sm">Back To Finance</Button>
            </Link>
            <Link href={`/portal/${portalId}/customers`}>
              <Button variant="outline" size="sm">Customers</Button>
            </Link>
          </div>
        }
      />

      {loading ? (
        <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[0.95fr_1.35fr]">
          <DashboardPanel title="Customer Profile" description="Portal identity, main aging, and downstream customer context.">
            <div className="grid gap-3">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} variant="rounded" height={44} />
              ))}
            </div>
          </DashboardPanel>
          <DashboardPanel title="Balances" description="Outstanding, overdue, and paid totals.">
            <div className="grid gap-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} variant="rounded" height={72} />
              ))}
            </div>
          </DashboardPanel>
        </DashboardGrid>
      ) : !data ? (
        <DashboardPanel title="Customer finance unavailable">
          <EmptyState icon={<Wallet className="w-12 h-12" />} title="Customer finance unavailable" description="This customer finance view could not be loaded." />
        </DashboardPanel>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[0.95fr_1.35fr]">
            <DashboardPanel title="Customer Profile" description="Portal identity, main aging, and downstream customer context.">
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{data.customer.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{data.customer.email || 'No email saved'}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{data.customer.phone || 'No phone saved'}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{[data.customer.city, data.customer.country].filter(Boolean).join(', ') || 'No location saved'}</p>
                </div>
                {data.customer.notes ? (
                  <div className="border border-[var(--border)] rounded-2xl p-3 bg-[rgba(var(--text-primary-rgb),0.03)]">
                    <p className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">Portal Notes</p>
                    <p className="text-xs text-[var(--text-secondary)]">{data.customer.notes}</p>
                  </div>
                ) : null}
                <div className="border border-[var(--border)] rounded-2xl p-3 bg-[rgba(var(--brand-primary-rgb),0.06)]">
                  <p className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">Main Invoice Aging</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Current', value: data.aging.current.amount, count: data.aging.current.count },
                      { label: '1-30 Days', value: data.aging.days1to30.amount, count: data.aging.days1to30.count },
                      { label: '31-60 Days', value: data.aging.days31to60.amount, count: data.aging.days31to60.count },
                      { label: '61-90 Days', value: data.aging.days61to90.amount, count: data.aging.days61to90.count },
                      { label: '90+ Days', value: data.aging.days90plus.amount, count: data.aging.days90plus.count },
                    ].map((bucket) => (
                      <div key={bucket.label} className="border border-[var(--border)] rounded-xl p-2.5 bg-[var(--panel)]">
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] block">{bucket.label}</span>
                        <span className="text-sm font-bold text-[var(--text-primary)] block">{formatCurrency(bucket.value)}</span>
                        <span className="text-[11px] text-[var(--text-secondary)]">{bucket.count} invoices</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Portal Ledger Controls" description="Create portal-only debits, credits, and payment records without changing the main shipment or customer finance tables.">
              {data.viewer?.canManageFinance ? (
                <div className="grid gap-4">
                  <div className="border border-[var(--border)] rounded-2xl p-4 grid gap-3 bg-[rgba(var(--brand-primary-rgb),0.05)]">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-[var(--text-secondary)]" />
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">Create Manual Ledger Entry</h4>
                    </div>
                    <FormField label="Description" value={ledgerForm.description} onChange={(event) => setLedgerForm((current) => ({ ...current, description: event.target.value }))} />
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                      <Select label="Type" value={ledgerForm.type} onChange={(value) => setLedgerForm((current) => ({ ...current, type: String(value) as 'DEBIT' | 'CREDIT' }))} options={[{ value: 'DEBIT', label: 'Debit' }, { value: 'CREDIT', label: 'Credit' }]} />
                      <FormField label="Amount" type="number" value={ledgerForm.amount} onChange={(event) => setLedgerForm((current) => ({ ...current, amount: event.target.value }))} />
                      <FormField label="Date" type="date" value={ledgerForm.transactionDate} onChange={(event) => setLedgerForm((current) => ({ ...current, transactionDate: event.target.value }))} />
                    </div>
                    <Select label="Portal Shipment" value={ledgerForm.shipmentId} onChange={(value) => setLedgerForm((current) => ({ ...current, shipmentId: String(value) }))} options={[{ value: '', label: 'Customer-level entry' }, ...data.shipments.map((shipment) => ({ value: shipment.id, label: shipment.reference }))]} />
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                      <FormField label="Payment Method" value={ledgerForm.paymentMethod} onChange={(event) => setLedgerForm((current) => ({ ...current, paymentMethod: event.target.value }))} placeholder="Optional" />
                      <FormField label="Reference" value={ledgerForm.reference} onChange={(event) => setLedgerForm((current) => ({ ...current, reference: event.target.value }))} placeholder="Optional" />
                    </div>
                    <FormField label="Notes" multiline minRows={2} value={ledgerForm.notes} onChange={(event) => setLedgerForm((current) => ({ ...current, notes: event.target.value }))} />
                    <div className="flex justify-between gap-4 items-center flex-wrap">
                      <p className="text-xs text-[var(--text-secondary)]">This portal-only entry does not alter the main shipment finance state.</p>
                      <Button variant="primary" onClick={() => void handleCreateLedgerEntry()} disabled={savingLedgerEntry}>
                        {savingLedgerEntry ? 'Saving...' : 'Create Ledger Entry'}
                      </Button>
                    </div>
                  </div>

                  <div className="border border-[var(--border)] rounded-2xl p-4 grid gap-3 bg-[rgba(var(--success-rgb),0.06)]">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[var(--text-secondary)]" />
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">Record Portal Payment</h4>
                    </div>
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                      <FormField label="Amount" type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} />
                      <FormField label="Date" type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))} />
                      <Select label="Method" value={paymentForm.paymentMethod} onChange={(value) => setPaymentForm((current) => ({ ...current, paymentMethod: String(value) }))} options={[{ value: 'BANK_TRANSFER', label: 'Bank Transfer' }, { value: 'CASH', label: 'Cash' }, { value: 'CHECK', label: 'Check' }, { value: 'CREDIT_CARD', label: 'Credit Card' }, { value: 'WIRE', label: 'Wire' }]} />
                    </div>
                    <Select label="Portal Shipment" value={paymentForm.shipmentId} onChange={(value) => setPaymentForm((current) => ({ ...current, shipmentId: String(value) }))} options={[{ value: '', label: 'Customer-level payment' }, ...data.shipments.map((shipment) => ({ value: shipment.id, label: shipment.reference }))]} />
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                      <FormField label="Reference" value={paymentForm.reference} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} placeholder="Receipt, wire ref, check number" />
                      <FormField label="Notes" value={paymentForm.notes} onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional" />
                    </div>
                    <div className="flex justify-between gap-4 items-center flex-wrap">
                      <p className="text-xs text-[var(--text-secondary)]">Portal-only payments write a portal-only credit and update the portal shipment balance, not the main shipment payment state.</p>
                      <Button variant="primary" onClick={() => void handleCreatePaymentRecord()} disabled={savingPaymentRecord}>
                        {savingPaymentRecord ? 'Recording...' : 'Record Payment'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[var(--text-secondary)] text-sm">
                  This login can review portal-only balances and payment history, but manual ledger and payment controls are restricted to portal staff.
                </div>
              )}
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
            <DashboardPanel title="Portal Shipment Balances" description="Current portal-only payment status derived from all portal ledger entries and payment records for this customer.">
              {data.shipments.length === 0 ? (
                <EmptyState icon={<Package className="w-12 h-12" />} title="No linked shipments" description="This customer does not have any linked shipments yet." />
              ) : (
                <DataTable data={data.shipments} columns={shipmentColumns} keyField="id" />
              )}
            </DashboardPanel>

            <DashboardPanel title="Portal Ledger Activity" description="Filtered portal-only debits, credits, and payment records for this customer. Current portal balance above remains all-time.">
              <div className="grid gap-4">
                <div className="flex gap-2.5 flex-wrap items-end">
                  <div className="min-w-[180px]">
                    <FormField
                      label="Activity Start"
                      type="date"
                      value={activityStartDate}
                      onChange={(event) => setActivityStartDate(event.target.value)}
                    />
                  </div>
                  <div className="min-w-[180px]">
                    <FormField
                      label="Activity End"
                      type="date"
                      value={activityEndDate}
                      onChange={(event) => setActivityEndDate(event.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setActivityStartDate('');
                    setActivityEndDate('');
                  }}>
                    Clear Dates
                  </Button>
                  <a href={activityExportHref}>
                    <Button variant="outline" size="sm">Export Filtered CSV</Button>
                  </a>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {activityStartDate || activityEndDate
                      ? `Showing portal-only activity from ${activityStartDate || 'the beginning'} to ${activityEndDate || 'today'}.`
                      : 'Showing all portal-only activity.'}
                  </span>
                </div>

                <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="border border-[var(--border)] rounded-2xl p-3 bg-[rgba(var(--brand-primary-rgb),0.08)] grid gap-1">
                    <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Current Portal-Only Balance</span>
                    <span className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(data.portalLedgerSummary.balance)}</span>
                  </div>
                  <div className="border border-[var(--border)] rounded-2xl p-3 bg-[rgba(var(--warning-rgb),0.08)] grid gap-1">
                    <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Activity Debits</span>
                    <span className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(data.activitySummary.debitAmount)}</span>
                  </div>
                  <div className="border border-[var(--border)] rounded-2xl p-3 bg-[rgba(var(--success-rgb),0.08)] grid gap-1">
                    <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Activity Credits</span>
                    <span className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(data.activitySummary.creditAmount)}</span>
                  </div>
                  <div className="border border-[var(--border)] rounded-2xl p-3 bg-[rgba(var(--text-primary-rgb),0.05)] grid gap-1">
                    <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Activity Payments</span>
                    <span className="text-lg font-bold text-[var(--text-primary)]">{data.activitySummary.paymentRecordCount}</span>
                  </div>
                </DashboardGrid>

                {data.portalLedgerEntries.length === 0 ? (
                  <EmptyState icon={<FileCheck className="w-12 h-12" />} title="No portal-only ledger entries" description="Adjust the date range or create a debit, credit, or payment record to populate this portal-only activity window." />
                ) : (
                  <DataTable data={data.portalLedgerEntries} columns={ledgerColumns} keyField="id" />
                )}

                <h5 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] pt-2">Portal-Only Payment Records</h5>
                {data.portalPaymentRecords.length === 0 ? (
                  <div className="text-[var(--text-secondary)] text-sm">No portal-only payment records match the selected activity window.</div>
                ) : (
                  <DataTable data={data.portalPaymentRecords} columns={paymentColumns} keyField="id" />
                )}
              </div>
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <DashboardPanel title="Invoice History" description="Main-system invoice trail for this customer's linked shipments.">
              {data.invoices.length === 0 ? (
                <EmptyState icon={<Receipt className="w-12 h-12" />} title="No invoice history" description="No invoices have been created yet for this customer's linked shipments." />
              ) : (
                <DataTable data={data.invoices} columns={invoiceColumns} keyField="id" />
              )}
            </DashboardPanel>

            <DashboardPanel title="Unbilled Charges" description="Main-system shipment charges that exist but have not yet been invoiced.">
              {data.unbilledCharges.length === 0 ? (
                <EmptyState icon={<FileText className="w-12 h-12" />} title="No unbilled charges" description="All currently visible shipment charges for this customer are already invoiced or there are no charges yet." />
              ) : (
                <DataTable data={data.unbilledCharges} columns={chargeColumns} keyField="id" />
              )}
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-4">
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--brand-primary-rgb),0.08)] grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Invoice History</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">{data.summary.invoiceCount}</span>
              <History className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--warning-rgb),0.08)] grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Overdue Exposure</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(data.summary.overdueAmount)}</span>
              <AlertTriangle className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--text-primary-rgb),0.05)] grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Portal-Only Ledger Entries</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">{data.portalLedgerSummary.ledgerEntryCount}</span>
              <PlusCircle className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--success-rgb),0.08)] grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Portal-Only Payments</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">{data.portalLedgerSummary.paymentRecordCount}</span>
              <CreditCard className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
          </DashboardGrid>
        </>
      )}
    </DashboardSurface>
  );
}