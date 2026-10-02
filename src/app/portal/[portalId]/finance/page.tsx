'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Wallet, Users, Receipt, AlertTriangle, CircleDollarSign, ExternalLink } from 'lucide-react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PageHeader, PaymentStatusBadge, Select, FormField, toast } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
};

type CustomerFinance = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  linkedShipmentCount: number;
  invoiceCount: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  outstandingAmount: number;
  overdueAmount: number;
  paidAmount: number;
  unbilledAmount?: number;
  unbilledChargeCount?: number;
  portalBalance?: number;
  portalDebitAmount?: number;
  portalCreditAmount?: number;
  portalPaymentRecordCount?: number;
  portalLedgerEntryCount?: number;
  lastInvoiceDate: string | null;
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'PENDING' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  total: number;
  issueDate: string;
  dueDate: string | null;
  paidDate: string | null;
  daysOverdue: number | null;
  customerId: string;
  customerName: string;
  shipmentId: string;
  shipmentReference: string;
  paymentMethod: string | null;
  paymentReference: string | null;
};

type FinanceResponse = {
  portal: PortalInfo;
  summary: {
    linkedCustomerCount: number;
    linkedShipmentCount: number;
    invoiceCount: number;
    openInvoiceCount: number;
    overdueInvoiceCount: number;
    outstandingAmount: number;
    overdueAmount: number;
    paidAmount: number;
    portalBalance: number;
    portalDebitAmount: number;
    portalCreditAmount: number;
    portalPaymentRecordCount: number;
    portalLedgerEntryCount: number;
  };
  aging: {
    current: { count: number; amount: number };
    days1to30: { count: number; amount: number };
    days31to60: { count: number; amount: number };
    days61to90: { count: number; amount: number };
    days90plus: { count: number; amount: number };
  };
  customers: CustomerFinance[];
  invoices: InvoiceRow[];
};

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString();
}

export default function PortalFinancePage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const exportHref = useMemo(() => `/api/partner-portals/${portalId}/finance?format=csv`, [portalId]);
  const [data, setData] = useState<FinanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;

    const fetchFinance = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/partner-portals/${portalId}/finance`, { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load portal finance');
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load portal finance');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (portalId) {
      void fetchFinance();
    }

    return () => {
      cancelled = true;
    };
  }, [portalId]);

  const filteredInvoices = useMemo(() => {
    const value = query.trim().toLowerCase();
    const invoices = data?.invoices || [];

    return invoices.filter((invoice) => {
      if (customerFilter !== 'all' && invoice.customerId !== customerFilter) {
        return false;
      }

      if (statusFilter !== 'all' && invoice.status !== statusFilter) {
        return false;
      }

      if (!value) {
        return true;
      }

      return invoice.invoiceNumber.toLowerCase().includes(value)
        || invoice.customerName.toLowerCase().includes(value)
        || invoice.shipmentReference.toLowerCase().includes(value)
        || (invoice.paymentReference || '').toLowerCase().includes(value);
    });
  }, [customerFilter, data?.invoices, query, statusFilter]);

  const customerRows = useMemo(() => {
    const customers = data?.customers || [];
    const value = query.trim().toLowerCase();

    return customers.filter((customer) => {
      if (customerFilter !== 'all' && customer.id !== customerFilter) {
        return false;
      }

      if (!value) {
        return true;
      }

      return customer.name.toLowerCase().includes(value)
        || (customer.email || '').toLowerCase().includes(value)
        || [customer.city, customer.country].filter(Boolean).join(' ').toLowerCase().includes(value);
    });
  }, [customerFilter, data?.customers, query]);

  const customerColumns = useMemo<Column<CustomerFinance>[]>(() => [
    {
      key: 'name',
      header: 'Customer',
      render: (_, row) => (
        <div className="grid gap-0.5">
          <p className="text-sm font-bold text-[var(--text-primary)]">{row.name}</p>
          <p className="text-xs text-[var(--text-secondary)]">{row.email || row.phone || 'No direct contact saved'}</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (_, row) => [row.city, row.country].filter(Boolean).join(', ') || '—',
    },
    {
      key: 'shipments',
      header: 'Linked Shipments',
      render: (_, row) => row.linkedShipmentCount,
    },
    {
      key: 'open',
      header: 'Open Invoices',
      render: (_, row) => row.openInvoiceCount,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      render: (_, row) => formatCurrency(row.outstandingAmount),
    },
    {
      key: 'overdue',
      header: 'Overdue',
      render: (_, row) => formatCurrency(row.overdueAmount),
    },
    {
      key: 'paid',
      header: 'Paid',
      render: (_, row) => formatCurrency(row.paidAmount),
    },
    {
      key: 'portalBalance',
      header: 'Portal-Only Balance',
      render: (_, row) => formatCurrency(row.portalBalance || 0),
    },
    {
      key: 'portalDebits',
      header: 'Portal-Only Debits',
      render: (_, row) => formatCurrency(row.portalDebitAmount || 0),
    },
    {
      key: 'portalCredits',
      header: 'Portal-Only Credits',
      render: (_, row) => formatCurrency(row.portalCreditAmount || 0),
    },
    {
      key: 'portalPayments',
      header: 'Portal-Only Payments',
      render: (_, row) => row.portalPaymentRecordCount || 0,
    },
    {
      key: 'unbilled',
      header: 'Unbilled',
      render: (_, row) => formatCurrency(row.unbilledAmount || 0),
    },
    {
      key: 'actions',
      header: 'Details',
      render: (_, row) => (
        <Link href={`/portal/${portalId}/finance/${row.id}`}>
          <Button variant="outline" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
            Open
          </Button>
        </Link>
      ),
    },
  ], [portalId]);

  const invoiceColumns = useMemo<Column<InvoiceRow>[]>(() => [
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
      key: 'customer',
      header: 'Customer',
      render: (_, row) => row.customerName,
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
      key: 'dueDate',
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

  return (
    <DashboardSurface>
      <PageHeader
        title={data?.portal ? `${data.portal.companyLabel || data.portal.name} Finance` : 'Portal Finance'}
        description="Track main-system invoice exposure alongside portal-only ledger totals for the customers your portal has linked to assigned shipments."
        meta={data ? [
          { label: 'Customers', value: data.summary.linkedCustomerCount, helper: 'Portal customers with linked shipment finance' },
          { label: 'Open', value: formatCurrency(data.summary.outstandingAmount), helper: `${data.summary.openInvoiceCount} invoices still open` },
          { label: 'Portal-Only Balance', value: formatCurrency(data.summary.portalBalance), helper: `${data.summary.portalLedgerEntryCount} portal-only ledger entries` },
          { label: 'Portal-Only Payments', value: data.summary.portalPaymentRecordCount, helper: formatCurrency(data.summary.portalCreditAmount) },
        ] : undefined}
        actions={
          <>
            <a href={exportHref}>
              <Button variant="outline" size="sm">Export Portal-Only CSV</Button>
            </a>
            <Link href={`/portal/${portalId}/customers`}>
              <Button variant="outline" size="sm">Customers</Button>
            </Link>
            <Link href={`/portal/${portalId}/shipments`}>
              <Button variant="outline" size="sm">Shipments</Button>
            </Link>
          </>
        }
      />

      {loading ? (
        <DashboardPanel title="Loading finance" description="Collecting shipment-linked invoice data for this portal.">
          <div className="text-[var(--text-secondary)] text-sm py-4">Loading portal finance...</div>
        </DashboardPanel>
      ) : !data ? (
        <DashboardPanel title="Finance unavailable">
          <EmptyState icon={<Wallet className="w-12 h-12" />} title="Finance unavailable" description="Portal finance could not be loaded." />
        </DashboardPanel>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--brand-primary-rgb),0.08)] grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Linked Customers</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">{data.summary.linkedCustomerCount}</span>
              <Users className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--accent-rgb),0.08)] grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Invoice Register</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">{data.summary.invoiceCount}</span>
              <Receipt className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--warning-rgb),0.08)] grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Overdue Exposure</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(data.summary.overdueAmount)}</span>
              <AlertTriangle className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--text-primary-rgb),0.05)] grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Portal-Only Balance</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(data.summary.portalBalance)}</span>
              <Wallet className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--warning-rgb),0.12)] grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Portal-Only Debits</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(data.summary.portalDebitAmount)}</span>
              <Receipt className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--success-rgb),0.12)] grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Portal-Only Credits</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(data.summary.portalCreditAmount)}</span>
              <CircleDollarSign className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--success-rgb),0.08)] grid gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Portal-Only Payments</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">{data.summary.portalPaymentRecordCount}</span>
              <CircleDollarSign className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
          </DashboardGrid>

          <DashboardPanel title="Aging Buckets" description="Outstanding invoice exposure grouped by due age across the full portal.">
            <DashboardGrid className="grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: 'Current', bucket: data.aging.current, tone: 'rgba(var(--brand-primary-rgb),0.08)' },
                { label: '1-30 Days', bucket: data.aging.days1to30, tone: 'rgba(var(--accent-rgb),0.08)' },
                { label: '31-60 Days', bucket: data.aging.days31to60, tone: 'rgba(var(--warning-rgb),0.08)' },
                { label: '61-90 Days', bucket: data.aging.days61to90, tone: 'rgba(var(--status-orange-rgb),0.08)' },
                { label: '90+ Days', bucket: data.aging.days90plus, tone: 'rgba(var(--error-rgb),0.08)' },
              ].map(({ label, bucket, tone }) => (
                <div key={label} className="border border-[var(--border)] rounded-2xl p-4 grid gap-1" style={{ backgroundColor: tone }}>
                  <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">{label}</span>
                  <span className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(bucket.amount)}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{bucket.count} open invoices</span>
                </div>
              ))}
            </DashboardGrid>
          </DashboardPanel>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[0.95fr_1.35fr]">
            <DashboardPanel title="Customer Accounts" description="Main invoice visibility plus portal-only ledger rollups for customers linked to this portal's assigned shipments.">
              {customerRows.length === 0 ? (
                <EmptyState
                  icon={<Users className="w-12 h-12" />}
                  title="No customer finance yet"
                  description="Link assigned shipments to portal customers first. Their invoice summaries will appear here automatically."
                />
              ) : (
                <DataTable data={customerRows} columns={customerColumns} keyField="id" />
              )}
            </DashboardPanel>

            <DashboardPanel title="Invoice Register" description="Read-only invoice visibility for portal-linked customer work.">
              <div className="grid gap-4">
                <div className="grid gap-3 grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(180px,0.4fr))]">
                  <FormField
                    label="Search invoices"
                    placeholder="Invoice, shipment, customer, payment reference"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <Select
                    label="Customer"
                    value={customerFilter}
                    onChange={(value) => setCustomerFilter(String(value))}
                    options={[
                      { value: 'all', label: 'All customers' },
                      ...data.customers.map((customer) => ({ value: customer.id, label: customer.name })),
                    ]}
                  />
                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(String(value))}
                    options={[
                      { value: 'all', label: 'All statuses' },
                      { value: 'PENDING', label: 'Pending' },
                      { value: 'SENT', label: 'Sent' },
                      { value: 'PAID', label: 'Paid' },
                      { value: 'OVERDUE', label: 'Overdue' },
                      { value: 'DRAFT', label: 'Draft' },
                    ]}
                  />
                </div>

                {filteredInvoices.length === 0 ? (
                  <EmptyState icon={<Receipt className="w-12 h-12" />} title="No invoices matched" description="Try a different customer, status, or search term." />
                ) : (
                  <DataTable data={filteredInvoices} columns={invoiceColumns} keyField="id" />
                )}
              </div>
            </DashboardPanel>
          </DashboardGrid>
        </>
      )}
    </DashboardSurface>
  );
}