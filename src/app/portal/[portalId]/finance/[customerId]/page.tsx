'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import { Box, MenuItem, TextField, Typography } from '@mui/material';
import { DashboardGrid, DashboardPanel, DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PageHeader, PaymentStatusBadge, Skeleton, SkeletonTable, toast } from '@/components/design-system';
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
        <Box sx={{ display: 'grid', gap: 0.35 }}>
          <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>{row.invoiceNumber}</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Issued {formatDate(row.issueDate)}</Typography>
        </Box>
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
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          <Link href={`/portal/${portalId}/shipments/${row.shipmentId}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">
              <OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />
              Shipment
            </Button>
          </Link>
          <a href={`/api/partner-portals/${portalId}/finance/invoices/${row.id}/pdf`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">View PDF</Button>
          </a>
          <a href={`/api/partner-portals/${portalId}/finance/invoices/${row.id}/pdf?download=1`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">Download</Button>
          </a>
        </Box>
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
        <Box sx={{ display: 'grid', gap: 0.35 }}>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{row.description}</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{row.chargeCode} • {row.category.replace(/_/g, ' ')}</Typography>
        </Box>
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          <Link href={`/portal/${portalId}/shipments/${row.shipmentId}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">
              <OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />
              Shipment
            </Button>
          </Link>
        </Box>
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
      render: (_, row) => <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{row.paymentStatus}</Typography>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          <Link href={`/portal/${portalId}/shipments/${row.id}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">Open</Button>
          </Link>
        </Box>
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
        <Box sx={{ display: 'grid', gap: 0.3 }}>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{row.description}</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{row.shipmentReference || 'Customer-level entry'}</Typography>
        </Box>
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
          <Box className="no-print" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <a href={activityExportHref} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">Export Portal-Only Activity</Button>
            </a>
            <Link href={`/portal/${portalId}/finance`} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">Back To Finance</Button>
            </Link>
            <Link href={`/portal/${portalId}/customers`} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">Customers</Button>
            </Link>
          </Box>
        }
      />

      {loading ? (
        <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[0.95fr_1.35fr]">
          <DashboardPanel title="Customer Profile" description="Portal identity, main aging, and downstream customer context.">
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} variant="rounded" height={44} />
              ))}
            </Box>
          </DashboardPanel>
          <DashboardPanel title="Balances" description="Outstanding, overdue, and paid totals.">
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} variant="rounded" height={72} />
              ))}
            </Box>
          </DashboardPanel>
        </DashboardGrid>
      ) : !data ? (
        <DashboardPanel title="Customer finance unavailable">
          <EmptyState icon={<AccountBalanceWalletOutlinedIcon />} title="Customer finance unavailable" description="This customer finance view could not be loaded." />
        </DashboardPanel>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[0.95fr_1.35fr]">
            <DashboardPanel title="Customer Profile" description="Portal identity, main aging, and downstream customer context.">
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <Box sx={{ display: 'grid', gap: 0.35 }}>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 800 }}>{data.customer.name}</Typography>
                  <Typography sx={{ color: 'var(--text-secondary)' }}>{data.customer.email || 'No email saved'}</Typography>
                  <Typography sx={{ color: 'var(--text-secondary)' }}>{data.customer.phone || 'No phone saved'}</Typography>
                  <Typography sx={{ color: 'var(--text-secondary)' }}>{[data.customer.city, data.customer.country].filter(Boolean).join(', ') || 'No location saved'}</Typography>
                </Box>
                {data.customer.notes ? (
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.5, bgcolor: 'rgba(var(--text-primary-rgb),0.03)' }}>
                    <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.75 }}>Portal Notes</Typography>
                    <Typography sx={{ color: 'var(--text-secondary)' }}>{data.customer.notes}</Typography>
                  </Box>
                ) : null}
                <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.5, bgcolor: 'rgba(var(--brand-primary-rgb),0.06)' }}>
                  <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.75 }}>Main Invoice Aging</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
                    {[
                      { label: 'Current', value: data.aging.current.amount, count: data.aging.current.count },
                      { label: '1-30 Days', value: data.aging.days1to30.amount, count: data.aging.days1to30.count },
                      { label: '31-60 Days', value: data.aging.days31to60.amount, count: data.aging.days31to60.count },
                      { label: '61-90 Days', value: data.aging.days61to90.amount, count: data.aging.days61to90.count },
                      { label: '90+ Days', value: data.aging.days90plus.amount, count: data.aging.days90plus.count },
                    ].map((bucket) => (
                      <Box key={bucket.label} sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 1.25, bgcolor: 'var(--panel)' }}>
                        <Typography sx={{ fontSize: '0.74rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{bucket.label}</Typography>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 800 }}>{formatCurrency(bucket.value)}</Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{bucket.count} invoices</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </DashboardPanel>

            <DashboardPanel title="Portal Ledger Controls" description="Create portal-only debits, credits, and payment records without changing the main shipment or customer finance tables.">
              {data.viewer?.canManageFinance ? (
                <Box sx={{ display: 'grid', gap: 2.5 }}>
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.75, display: 'grid', gap: 1.25, bgcolor: 'rgba(var(--brand-primary-rgb),0.05)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <NoteAddOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
                      <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Create Manual Ledger Entry</Typography>
                    </Box>
                    <TextField label="Description" value={ledgerForm.description} onChange={(event) => setLedgerForm((current) => ({ ...current, description: event.target.value }))} />
                    <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
                      <TextField select label="Type" value={ledgerForm.type} onChange={(event) => setLedgerForm((current) => ({ ...current, type: event.target.value as 'DEBIT' | 'CREDIT' }))}>
                        <MenuItem value="DEBIT">Debit</MenuItem>
                        <MenuItem value="CREDIT">Credit</MenuItem>
                      </TextField>
                      <TextField label="Amount" type="number" value={ledgerForm.amount} onChange={(event) => setLedgerForm((current) => ({ ...current, amount: event.target.value }))} />
                      <TextField label="Date" type="date" value={ledgerForm.transactionDate} onChange={(event) => setLedgerForm((current) => ({ ...current, transactionDate: event.target.value }))} InputLabelProps={{ shrink: true }} />
                    </Box>
                    <TextField select label="Portal Shipment" value={ledgerForm.shipmentId} onChange={(event) => setLedgerForm((current) => ({ ...current, shipmentId: event.target.value }))}>
                      <MenuItem value="">Customer-level entry</MenuItem>
                      {data.shipments.map((shipment) => (
                        <MenuItem key={shipment.id} value={shipment.id}>{shipment.reference}</MenuItem>
                      ))}
                    </TextField>
                    <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
                      <TextField label="Payment Method" value={ledgerForm.paymentMethod} onChange={(event) => setLedgerForm((current) => ({ ...current, paymentMethod: event.target.value }))} placeholder="Optional" />
                      <TextField label="Reference" value={ledgerForm.reference} onChange={(event) => setLedgerForm((current) => ({ ...current, reference: event.target.value }))} placeholder="Optional" />
                    </Box>
                    <TextField label="Notes" multiline minRows={2} value={ledgerForm.notes} onChange={(event) => setLedgerForm((current) => ({ ...current, notes: event.target.value }))} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>This portal-only entry does not alter the main shipment finance state.</Typography>
                      <Button variant="primary" onClick={() => void handleCreateLedgerEntry()} disabled={savingLedgerEntry}>
                        {savingLedgerEntry ? 'Saving...' : 'Create Ledger Entry'}
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.75, display: 'grid', gap: 1.25, bgcolor: 'rgba(var(--success-rgb),0.06)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PaymentsOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
                      <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Record Portal Payment</Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
                      <TextField label="Amount" type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} />
                      <TextField label="Date" type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))} InputLabelProps={{ shrink: true }} />
                      <TextField select label="Method" value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMethod: event.target.value }))}>
                        <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                        <MenuItem value="CASH">Cash</MenuItem>
                        <MenuItem value="CHECK">Check</MenuItem>
                        <MenuItem value="CREDIT_CARD">Credit Card</MenuItem>
                        <MenuItem value="WIRE">Wire</MenuItem>
                      </TextField>
                    </Box>
                    <TextField select label="Portal Shipment" value={paymentForm.shipmentId} onChange={(event) => setPaymentForm((current) => ({ ...current, shipmentId: event.target.value }))}>
                      <MenuItem value="">Customer-level payment</MenuItem>
                      {data.shipments.map((shipment) => (
                        <MenuItem key={shipment.id} value={shipment.id}>{shipment.reference}</MenuItem>
                      ))}
                    </TextField>
                    <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
                      <TextField label="Reference" value={paymentForm.reference} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} placeholder="Receipt, wire ref, check number" />
                      <TextField label="Notes" value={paymentForm.notes} onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Portal-only payments write a portal-only credit and update the portal shipment balance, not the main shipment payment state.</Typography>
                      <Button variant="primary" onClick={() => void handleCreatePaymentRecord()} disabled={savingPaymentRecord}>
                        {savingPaymentRecord ? 'Recording...' : 'Record Payment'}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ color: 'var(--text-secondary)' }}>
                  This login can review portal-only balances and payment history, but manual ledger and payment controls are restricted to portal staff.
                </Box>
              )}
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
            <DashboardPanel title="Portal Shipment Balances" description="Current portal-only payment status derived from all portal ledger entries and payment records for this customer.">
              {data.shipments.length === 0 ? (
                <EmptyState icon={<Inventory2OutlinedIcon />} title="No linked shipments" description="This customer does not have any linked shipments yet." />
              ) : (
                <DataTable data={data.shipments} columns={shipmentColumns} keyField="id" />
              )}
            </DashboardPanel>

            <DashboardPanel title="Portal Ledger Activity" description="Filtered portal-only debits, credits, and payment records for this customer. Current portal balance above remains all-time.">
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'end' }}>
                  <TextField
                    label="Activity Start"
                    type="date"
                    value={activityStartDate}
                    onChange={(event) => setActivityStartDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 180 }}
                  />
                  <TextField
                    label="Activity End"
                    type="date"
                    value={activityEndDate}
                    onChange={(event) => setActivityEndDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 180 }}
                  />
                  <Button variant="outline" size="sm" onClick={() => {
                    setActivityStartDate('');
                    setActivityEndDate('');
                  }}>
                    Clear Dates
                  </Button>
                  <a href={activityExportHref} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">Export Filtered CSV</Button>
                  </a>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {activityStartDate || activityEndDate
                      ? `Showing portal-only activity from ${activityStartDate || 'the beginning'} to ${activityEndDate || 'today'}.`
                      : 'Showing all portal-only activity.'}
                  </Typography>
                </Box>

                <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-4">
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.6, bgcolor: 'rgba(var(--brand-primary-rgb),0.08)', display: 'grid', gap: 0.65 }}>
                    <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Current Portal-Only Balance</Typography>
                    <Typography sx={{ fontSize: '1.35rem', fontWeight: 800 }}>{formatCurrency(data.portalLedgerSummary.balance)}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.6, bgcolor: 'rgba(var(--warning-rgb),0.08)', display: 'grid', gap: 0.65 }}>
                    <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Activity Debits</Typography>
                    <Typography sx={{ fontSize: '1.35rem', fontWeight: 800 }}>{formatCurrency(data.activitySummary.debitAmount)}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.6, bgcolor: 'rgba(var(--success-rgb),0.08)', display: 'grid', gap: 0.65 }}>
                    <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Activity Credits</Typography>
                    <Typography sx={{ fontSize: '1.35rem', fontWeight: 800 }}>{formatCurrency(data.activitySummary.creditAmount)}</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.6, bgcolor: 'rgba(var(--text-primary-rgb),0.05)', display: 'grid', gap: 0.65 }}>
                    <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Activity Payments</Typography>
                    <Typography sx={{ fontSize: '1.35rem', fontWeight: 800 }}>{data.activitySummary.paymentRecordCount}</Typography>
                  </Box>
                </DashboardGrid>

                {data.portalLedgerEntries.length === 0 ? (
                  <EmptyState icon={<ReceiptOutlinedIcon />} title="No portal-only ledger entries" description="Adjust the date range or create a debit, credit, or payment record to populate this portal-only activity window." />
                ) : (
                  <DataTable data={data.portalLedgerEntries} columns={ledgerColumns} keyField="id" />
                )}

                <Typography sx={{ fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Portal-Only Payment Records</Typography>
                {data.portalPaymentRecords.length === 0 ? (
                  <Box sx={{ color: 'var(--text-secondary)' }}>No portal-only payment records match the selected activity window.</Box>
                ) : (
                  <DataTable data={data.portalPaymentRecords} columns={paymentColumns} keyField="id" />
                )}
              </Box>
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <DashboardPanel title="Invoice History" description="Main-system invoice trail for this customer's linked shipments.">
              {data.invoices.length === 0 ? (
                <EmptyState icon={<ReceiptLongOutlinedIcon />} title="No invoice history" description="No invoices have been created yet for this customer's linked shipments." />
              ) : (
                <DataTable data={data.invoices} columns={invoiceColumns} keyField="id" />
              )}
            </DashboardPanel>

            <DashboardPanel title="Unbilled Charges" description="Main-system shipment charges that exist but have not yet been invoiced.">
              {data.unbilledCharges.length === 0 ? (
                <EmptyState icon={<RequestQuoteOutlinedIcon />} title="No unbilled charges" description="All currently visible shipment charges for this customer are already invoiced or there are no charges yet." />
              ) : (
                <DataTable data={data.unbilledCharges} columns={chargeColumns} keyField="id" />
              )}
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-4">
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'rgba(var(--brand-primary-rgb),0.08)', display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Invoice History</Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800 }}>{data.summary.invoiceCount}</Typography>
              <HistoryOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
            </Box>
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'rgba(var(--warning-rgb),0.08)', display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Overdue Exposure</Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800 }}>{formatCurrency(data.summary.overdueAmount)}</Typography>
              <WarningAmberOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
            </Box>
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'rgba(var(--text-primary-rgb),0.05)', display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Portal-Only Ledger Entries</Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800 }}>{data.portalLedgerSummary.ledgerEntryCount}</Typography>
              <NoteAddOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
            </Box>
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'rgba(var(--success-rgb),0.08)', display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Portal-Only Payments</Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800 }}>{data.portalLedgerSummary.paymentRecordCount}</Typography>
              <PaymentsOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
            </Box>
          </DashboardGrid>
        </>
      )}
    </DashboardSurface>
  );
}