'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { hasPermission } from '@/lib/rbac';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Download,
  Printer,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Truck,
  Check,
  Tag,
} from 'lucide-react';
import {
  Alert,
  Button,
  toast,
  StatusBadge,
  DashboardPageSkeleton,
  StatsCard,
  PageHeader,
  Modal,
  ConfirmDialog,
  Select,
} from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ResponsiveDataView, CardField } from '@/components/ui/MobileCardView';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface LedgerEntry {
  id: string;
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  transactionInfoType?: TransactionInfoType;
  amount: number;
  balance: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  shipment?: {
    id: string;
    vehicleMake?: string;
    vehicleModel?: string;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface LedgerSummary {
  totalDebit: number;
  totalCredit: number;
  totalShipmentPurchaseAmount: number;
  totalShipmentExpenses: number;
  currentBalance: number;
  transactionInfoBreakdown: Record<TransactionInfoType, {
    totalDebit: number;
    totalCredit: number;
    balance: number;
  }>;
}

type TransactionInfoType = 'CAR_PAYMENT' | 'SHIPPING_PAYMENT' | 'STORAGE_PAYMENT';

const transactionInfoTypeLabels: Record<TransactionInfoType, string> = {
  CAR_PAYMENT: 'Car Payment',
  SHIPPING_PAYMENT: 'Shipping Payment',
  STORAGE_PAYMENT: 'Storage Payment',
};

export default function UserLedgerManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({
    totalDebit: 0,
    totalCredit: 0,
    totalShipmentPurchaseAmount: 0,
    totalShipmentExpenses: 0,
    currentBalance: 0,
    transactionInfoBreakdown: {
      CAR_PAYMENT: { totalDebit: 0, totalCredit: 0, balance: 0 },
      SHIPPING_PAYMENT: { totalDebit: 0, totalCredit: 0, balance: 0 },
      STORAGE_PAYMENT: { totalDebit: 0, totalCredit: 0, balance: 0 },
    },
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Search input state with debouncing
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    transactionInfoType: '',
    startDate: '',
    endDate: '',
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    type: 'DEBIT' as 'DEBIT' | 'CREDIT',
    transactionInfoType: 'SHIPPING_PAYMENT' as TransactionInfoType,
    amount: '',
    notes: '',
  });

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters(prev => {
        if (prev.search === searchInput) return prev;
        return { ...prev, search: searchInput };
      });
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/auth/signin');
      return;
    }
    if (!hasPermission(session.user?.role, 'finance:manage')) {
      router.replace('/dashboard/finance/ledger');
      return;
    }
    fetchUser();
    fetchLedgerEntries();
  }, [session, status, router, userId, page, filters]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchLedgerEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        userId,
        page: page.toString(),
        limit: '20',
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.transactionInfoType && { transactionInfoType: filters.transactionInfoType }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`/api/ledger?recalc=true&${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch ledger entries');
      }

      const data = await response.json();
      setEntries(data.entries);
      setSummary(data.summary);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching ledger:', error);
      toast.error('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = parseFloat(formData.amount);
      const response = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          description: formData.description,
          type: formData.type,
          transactionInfoType: formData.transactionInfoType,
          amount,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        toast.success('Transaction added successfully');
        setShowAddModal(false);
        setFormData({ description: '', type: 'DEBIT', transactionInfoType: 'SHIPPING_PAYMENT', amount: '', notes: '' });
        fetchLedgerEntries();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add transaction');
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('An error occurred');
    }
  };

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    try {
      const response = await fetch(`/api/ledger/${selectedEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        toast.success('Transaction updated successfully');
        setShowEditModal(false);
        setSelectedEntry(null);
        setFormData({ description: '', type: 'DEBIT', transactionInfoType: 'SHIPPING_PAYMENT', amount: '', notes: '' });
        fetchLedgerEntries();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('An error occurred');
    }
  };

  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  const handleDeleteEntry = (entryId: string) => {
    setDeleteEntryId(entryId);
  };

  const confirmDeleteEntry = async () => {
    if (!deleteEntryId) return;
    const entryId = deleteEntryId;
    setDeleteEntryId(null);

    try {
      const response = await fetch(`/api/ledger/${entryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Transaction deleted successfully');
        fetchLedgerEntries();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('An error occurred');
    }
  };

  const openEditModal = (entry: LedgerEntry) => {
    setSelectedEntry(entry);
    setFormData({
      description: entry.description,
      type: entry.type,
      transactionInfoType: entry.transactionInfoType || 'SHIPPING_PAYMENT',
      amount: entry.amount.toString(),
      notes: entry.notes || '',
    });
    setShowEditModal(true);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams({
        userId,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const endpoint = format === 'pdf' ? '/api/ledger/export-pdf' : '/api/ledger/export';
      const response = await fetch(`${endpoint}?${params}`);

      if (!response.ok) throw new Error('Failed to export ledger');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger-${user?.name || 'user'}-${Date.now()}.${format === 'pdf' ? 'html' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Ledger exported successfully');
    } catch (error) {
      console.error('Error exporting ledger:', error);
      toast.error('Failed to export ledger');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'var(--error)';
    if (balance < 0) return 'var(--success)';
    return 'var(--text-secondary)';
  };

  const columns = useMemo<Column<LedgerEntry>[]>(() => [
    {
      key: 'transactionDate',
      header: 'Date',
      sortable: true,
      width: '15%',
      render: (_, row) => (
        <span className="text-xs text-[var(--text-secondary)]">
          {formatDate(row.transactionDate)}
        </span>
      )
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      width: '35%',
      render: (_, row) => {
        const isPending = row.metadata?.pendingInvoice === true;
        const isInvoicePaid = !isPending && (typeof row.metadata?.invoiceId === 'string' || typeof row.metadata?.invoiceNumber === 'string');
        return (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {row.description}
              </span>
              {isPending && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[rgba(var(--warning-rgb),0.15)] text-[var(--warning-dark)] border border-[rgba(var(--warning-rgb),0.3)] uppercase">
                  Pending Invoice
                </span>
              )}
              {isInvoicePaid && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[rgba(var(--success-rgb),0.15)] text-[var(--success-dark)] border border-[rgba(var(--success-rgb),0.3)] uppercase">
                  Invoice Paid
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--accent-gold)] mt-0.5 font-semibold">
              {row.transactionInfoType ? transactionInfoTypeLabels[row.transactionInfoType] : 'Not specified'}
            </p>
            {row.notes && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {row.notes}
              </p>
            )}
            {row.shipment && (
              <p className="text-xs text-[var(--accent-gold)] mt-0.5">
                {row.shipment.vehicleMake} {row.shipment.vehicleModel}
              </p>
            )}
          </div>
        );
      }
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      align: 'center' as const,
      width: '10%',
      render: (_, row) => (
        <StatusBadge
          status={row.type === 'DEBIT' ? 'ERROR' : 'SUCCESS'}
          label={row.type}
          size="sm"
          icon={row.type === 'DEBIT' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        />
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right' as const,
      width: '15%',
      render: (_, row) => (
        <span
          className="text-sm font-semibold"
          style={{ color: row.type === 'DEBIT' ? 'var(--error)' : 'var(--success)' }}
        >
          {row.type === 'DEBIT' ? '+' : '-'}{formatCurrency(row.amount)}
        </span>
      )
    },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      align: 'right' as const,
      width: '15%',
      render: (_, row) => (
        <span
          className="text-sm font-semibold"
          style={{ color: getBalanceColor(row.balance) }}
        >
          {formatCurrency(row.balance)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center' as const,
      width: '10%',
      render: (_, row) => (
        <div className="flex gap-1 justify-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openEditModal(row)}
            aria-label="Edit transaction"
            className="p-1.5 rounded-lg hover:bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] transition-colors cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteEntry(row.id)}
            aria-label="Delete transaction"
            className="p-1.5 rounded-lg hover:bg-[var(--error)]/10 text-[var(--error)] transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ], []);

  if (status === 'loading' || loading || !user) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <DashboardPageSkeleton />
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  const categoryFilters: { value: string; label: string }[] = [
    { value: '', label: 'All Categories' },
    { value: 'CAR_PAYMENT', label: 'Car Payment' },
    { value: 'SHIPPING_PAYMENT', label: 'Shipping Payment' },
    { value: 'STORAGE_PAYMENT', label: 'Storage Payment' },
  ];

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title={`${user.name || user.email}'s Ledger`}
          description={`Manage financial transactions for ${user.email}`}
          meta={[
            { label: 'Balance', value: formatCurrency(summary.currentBalance), helper: 'Current ledger balance' },
            { label: 'Debits', value: formatCurrency(summary.totalDebit), helper: 'Amount charged' },
            { label: 'Credits', value: formatCurrency(summary.totalCredit), helper: 'Amount paid' },
          ]}
          actions={
            <Link href="/dashboard/finance/admin/ledgers" className="no-underline">
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to All Ledgers
              </Button>
            </Link>
          }
        />

        {/* Summary Cards */}
        <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            icon={<TrendingDown className="w-5 h-5" />}
            title="Total Credits"
            value={formatCurrency(summary.totalCredit)}
            subtitle="Amount paid"
            variant="success"
          />
          <StatsCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Total Debits"
            value={formatCurrency(summary.totalDebit)}
            subtitle="Amount charged"
            variant="warning"
          />
          <StatsCard
            icon={<Truck className="w-5 h-5" />}
            title="Total Shipment Purchase Amount"
            value={formatCurrency(summary.totalShipmentPurchaseAmount)}
            subtitle="Total car purchase amount for this customer"
            variant="default"
          />
          <StatsCard
            icon={<DollarSign className="w-5 h-5" />}
            title="Total Shipment Expenses"
            value={formatCurrency(summary.totalShipmentExpenses)}
            subtitle="All shipment expense debits"
            variant="info"
          />
        </DashboardGrid>

        {/* Filters Panel */}
        <DashboardPanel
          title="Filters & Actions"
          description="Search and filter transactions"
          actions={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Transaction
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search transactions by description or notes..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                icon={<Filter className="w-4 h-4" />}
              >
                {showFilters ? 'Hide' : 'Show'} Advanced Filters
              </Button>
            </div>

            {/* Quick Category Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1 mr-1">
                <Tag className="w-3.5 h-3.5" /> Category:
              </span>
              {categoryFilters.map((cat) => {
                const isActive = filters.transactionInfoType === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setFilters(prev => ({ ...prev, transactionInfoType: cat.value }));
                      setPage(1);
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[var(--accent-gold)] text-[var(--text-primary)] font-semibold shadow-sm'
                        : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent-gold)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border)]">
                <Select
                  label="Type"
                  value={filters.type}
                  onChange={(value) => {
                    setFilters(prev => ({ ...prev, type: String(value) }));
                    setPage(1);
                  }}
                  size="small"
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'DEBIT', label: 'Debit Only' },
                    { value: 'CREDIT', label: 'Credit Only' },
                  ]}
                />
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, startDate: e.target.value }));
                      setPage(1);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, endDate: e.target.value }));
                      setPage(1);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                icon={<Printer className="w-4 h-4" />}
              >
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                icon={<Download className="w-4 h-4" />}
              >
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                icon={<Download className="w-4 h-4" />}
              >
                Excel
              </Button>
            </div>
          </div>
        </DashboardPanel>

        {/* Transactions Table & Responsive View */}
        <DashboardPanel
          title="Transaction History"
          description={`${entries.length} transaction${entries.length !== 1 ? 's' : ''}`}
          fullHeight
        >
          {entries.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              <p>No transactions match your search/filter criteria</p>
            </div>
          ) : (
            <ResponsiveDataView
              data={entries}
              TableComponent={DataTable}
              tableProps={{
                data: entries,
                columns,
                keyField: 'id',
              }}
              keyField="id"
              renderMobileCard={(entry: LedgerEntry): CardField[] => [
                {
                  label: 'Description',
                  value: entry.description,
                  primary: true,
                },
                {
                  label: 'Date',
                  value: formatDate(entry.transactionDate),
                },
                {
                  label: 'Type',
                  value: (
                    <StatusBadge
                      status={entry.type === 'DEBIT' ? 'ERROR' : 'SUCCESS'}
                      label={entry.type}
                      size="sm"
                      icon={entry.type === 'DEBIT' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    />
                  ),
                },
                {
                  label: 'Amount',
                  value: (
                    <span
                      className="font-bold"
                      style={{ color: entry.type === 'DEBIT' ? 'var(--error)' : 'var(--success)' }}
                    >
                      {entry.type === 'DEBIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                    </span>
                  ),
                },
                {
                  label: 'Balance After',
                  value: (
                    <span className="font-semibold" style={{ color: getBalanceColor(entry.balance) }}>
                      {formatCurrency(entry.balance)}
                    </span>
                  ),
                },
                {
                  label: 'Category',
                  value: entry.transactionInfoType ? transactionInfoTypeLabels[entry.transactionInfoType] : '—',
                },
                ...(entry.notes ? [{ label: 'Notes', value: entry.notes }] : []),
                {
                  label: 'Actions',
                  value: (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(entry)}
                        icon={<Pencil className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteEntry(entry.id)}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-[var(--text-secondary)]">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </DashboardPanel>
      </DashboardSurface>

      {/* Add Transaction Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Transaction"
        size="sm"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-ledger-entry-form"
              variant="primary"
              icon={<Check className="w-4 h-4" />}
            >
              Add Transaction
            </Button>
          </>
        }
      >
        <form id="add-ledger-entry-form" onSubmit={handleAddEntry}>
          <div className="flex flex-col gap-4">
            {/* Account balance info */}
            {(() => {
              const enteredAmount = parseFloat(formData.amount) || 0;
              const projectedBalance = formData.type === 'DEBIT'
                ? summary.currentBalance + enteredAmount
                : summary.currentBalance - enteredAmount;
              const currentBalanceLabel = summary.currentBalance > 0
                ? `Customer owes ${formatCurrency(summary.currentBalance)}`
                : summary.currentBalance < 0
                  ? `Customer has ${formatCurrency(Math.abs(summary.currentBalance))} credit`
                  : 'Account is settled';
              const projectedBalanceLabel = projectedBalance > 0
                ? `customer will owe ${formatCurrency(projectedBalance)}`
                : projectedBalance < 0
                  ? `customer will have ${formatCurrency(Math.abs(projectedBalance))} credit`
                  : 'account will be settled';
              return (
                <Alert
                  severity={formData.type === 'DEBIT' ? 'info' : 'success'}
                  className="text-sm font-medium"
                >
                  Current Balance: {currentBalanceLabel}. {enteredAmount > 0 ? `After this transaction, ${projectedBalanceLabel}.` : 'Enter an amount to preview the new balance.'}
                </Alert>
              );
            })()}

            <Select
              label="Type"
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value as 'DEBIT' | 'CREDIT' })}
              required
              options={[
                { value: 'DEBIT', label: 'Debit / Charge Customer' },
                { value: 'CREDIT', label: 'Credit / Customer Payment' },
              ]}
            />

            <Select
              label="Category"
              value={formData.transactionInfoType}
              onChange={(value) => setFormData({ ...formData, transactionInfoType: value as TransactionInfoType })}
              required
              options={Object.entries(transactionInfoTypeLabels).map(([value, label]) => ({ value, label }))}
            />

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Description <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Shipping charge, Customer payment"
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Amount * (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
              {formData.amount && (
                <p className="text-xs text-[var(--success)] mt-1">
                  {(() => {
                    const amt = parseFloat(formData.amount) || 0;
                    const projected = formData.type === 'DEBIT'
                      ? summary.currentBalance + amt
                      : summary.currentBalance - amt;
                    if (projected > 0) return `New balance: customer owes ${formatCurrency(projected)}`;
                    if (projected < 0) return `New balance: customer has ${formatCurrency(Math.abs(projected))} credit`;
                    return 'New balance: account settled';
                  })()}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Transaction"
        size="sm"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-ledger-entry-form"
              variant="primary"
              icon={<Check className="w-4 h-4" />}
            >
              Update Transaction
            </Button>
          </>
        }
      >
        <form id="edit-ledger-entry-form" onSubmit={handleEditEntry}>
          <div className="flex flex-col gap-4">
            <Alert
              severity="warning"
              message="Note: Type and amount cannot be edited to maintain ledger integrity. Only description and notes can be updated."
            />

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Type (Read-only)
              </label>
              <input
                type="text"
                value={formData.type}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-secondary)] opacity-70 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Amount (Read-only)
              </label>
              <input
                type="text"
                value={formatCurrency(parseFloat(formData.amount) || 0)}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-secondary)] opacity-70 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Description <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteEntryId !== null}
        onClose={() => setDeleteEntryId(null)}
        onConfirm={() => void confirmDeleteEntry()}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        severity="error"
      />
    </ProtectedRoute>
  );
}
