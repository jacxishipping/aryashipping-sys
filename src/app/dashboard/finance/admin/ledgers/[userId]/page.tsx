'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { hasPermission } from '@/lib/rbac';
import {
  ArrowBack,
  Add,
  Edit,
  Delete,
  Download,
  Print,
  FilterList,
  Search,
  ChevronLeft,
  ChevronRight,
  AttachMoney,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  LocalShipping,
  Check,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Chip,
} from '@mui/material';
import { Alert, Button, toast, EmptyState, SkeletonCard, SkeletonTable, Tooltip, StatusBadge, DashboardPageSkeleton, StatsCard, PageHeader, Modal, ConfirmDialog, Select } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
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
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
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
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                {row.description}
              </Typography>
              {isPending && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    backgroundColor: 'rgba(var(--warning-rgb), 0.15)',
                    color: 'var(--warning-dark)',
                    border: '1px solid rgba(var(--warning-rgb), 0.3)',
                    textTransform: 'uppercase',
                  }}
                >
                  Pending Invoice
                </Box>
              )}
              {isInvoicePaid && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    backgroundColor: 'rgba(var(--success-rgb), 0.15)',
                    color: 'var(--success-dark)',
                    border: '1px solid rgba(var(--success-rgb), 0.3)',
                    textTransform: 'uppercase',
                  }}
                >
                  Invoice Paid
                </Box>
              )}
            </Box>
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--accent-gold)', mt: 0.5, fontWeight: 600 }}>
              {row.transactionInfoType ? transactionInfoTypeLabels[row.transactionInfoType] : 'Not specified'}
            </Typography>
            {row.notes && (
              <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                {row.notes}
              </Typography>
            )}
            {row.shipment && (
              <Typography sx={{ fontSize: '0.75rem', color: 'var(--accent-gold)', mt: 0.5 }}>
                {row.shipment.vehicleMake} {row.shipment.vehicleModel}
              </Typography>
            )}
          </Box>
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
        <Chip
          label={row.type}
          size="small"
          icon={row.type === 'DEBIT' ? <TrendingUpIcon /> : <TrendingDownIcon />}
          sx={{
            backgroundColor: row.type === 'DEBIT' ? 'rgba(var(--error-rgb), 0.1)' : 'rgba(var(--success-rgb), 0.1)',
            color: row.type === 'DEBIT' ? 'var(--error)' : 'var(--success)',
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
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
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: row.type === 'DEBIT' ? 'var(--error)' : 'var(--success)' }}>
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
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: getBalanceColor(row.balance) }}>
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
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          <IconButton
            size="small"
            onClick={() => openEditModal(row)}
            sx={{ color: 'var(--accent-gold)' }}
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteEntry(row.id)}
            sx={{ color: 'var(--error)' }}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Box>
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
            <Link href="/dashboard/finance/admin/ledgers" style={{ textDecoration: 'none' }}>
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowBack />}
                sx={{ textTransform: 'none', fontSize: '0.78rem' }}
              >
                Back to All Ledgers
              </Button>
            </Link>
          }
        />

        {/* Summary Cards */}
        <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            icon={<TrendingDownIcon />}
            title="Total Credits"
            value={formatCurrency(summary.totalCredit)}
            subtitle="Amount paid"
            variant="success"
          />
          <StatsCard
            icon={<TrendingUpIcon />}
            title="Total Debits"
            value={formatCurrency(summary.totalDebit)}
            subtitle="Amount charged"
            variant="warning"
          />
          <StatsCard
            icon={<LocalShipping />}
            title="Total Shipment Purchase Amount"
            value={formatCurrency(summary.totalShipmentPurchaseAmount)}
            subtitle="Total car purchase amount for this customer"
            variant="default"
          />
          <StatsCard
            icon={<AttachMoney />}
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
              icon={<Add />}
              sx={{ textTransform: 'none', fontSize: '0.78rem', fontWeight: 600 }}
            >
              Add Transaction
            </Button>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Search transactions..."
                size="small"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'var(--text-secondary)', fontSize: 20 }} />,
                }}
                fullWidth
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                icon={<FilterList />}
                sx={{ textTransform: 'none', fontSize: '0.75rem', minWidth: 120 }}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </Box>

            {showFilters && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                <Select
                  label="Type"
                  value={filters.type}
                  onChange={(value) => setFilters({ ...filters, type: String(value) })}
                  size="small"
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'DEBIT', label: 'Debit Only' },
                    { value: 'CREDIT', label: 'Credit Only' },
                  ]}
                />
                <TextField
                  label="Start Date"
                  type="date"
                  size="small"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End Date"
                  type="date"
                  size="small"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                icon={<Print />}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                icon={<Download />}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                icon={<Download />}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Excel
              </Button>
            </Box>
          </Box>
        </DashboardPanel>

        {/* Transactions Table */}
        <DashboardPanel
          title="Transaction History"
          description={`${entries.length} transaction${entries.length !== 1 ? 's' : ''}`}
          fullHeight
        >
          <DataTable 
            data={entries}
            columns={columns}
            keyField="id"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3 }}>
              <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  icon={<ChevronLeft />}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  icon={<ChevronRight />}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Next
                </Button>
              </Box>
            </Box>
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
            <Button onClick={() => setShowAddModal(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-ledger-entry-form"
              variant="primary"
              icon={<Check />}
              sx={{ textTransform: 'none' }}
            >
              Add Transaction
            </Button>
          </>
        }
      >
        <form id="add-ledger-entry-form" onSubmit={handleAddEntry}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  <>
                    <Alert
                      severity={formData.type === 'DEBIT' ? 'info' : 'success'}
                      sx={{ fontSize: '0.9rem', fontWeight: 500 }}
                    >
                      Current Balance: {currentBalanceLabel}. {enteredAmount > 0 ? `After this transaction, ${projectedBalanceLabel}.` : 'Enter an amount to preview the new balance.'}
                    </Alert>
                  </>
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

              <TextField
                label="Description *"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Shipping charge, Customer payment"
                required
                fullWidth
              />

              <TextField
                label="Amount * (USD)"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                inputProps={{ step: '0.01', min: '0.01' }}
                helperText={
                  formData.amount
                    ? (() => {
                        const amt = parseFloat(formData.amount) || 0;
                        const projected = formData.type === 'DEBIT'
                          ? summary.currentBalance + amt
                          : summary.currentBalance - amt;
                        if (projected > 0) return `New balance: customer owes ${formatCurrency(projected)}`;
                        if (projected < 0) return `New balance: customer has ${formatCurrency(Math.abs(projected))} credit`;
                        return 'New balance: account settled';
                      })()
                    : ''
                }
                FormHelperTextProps={{ sx: { color: 'var(--success)' } }}
                required
                fullWidth
              />

              <TextField
                label="Notes (Optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes"
                multiline
                rows={3}
                fullWidth
              />
            </Box>
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
            <Button onClick={() => setShowEditModal(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button type="submit" form="edit-ledger-entry-form" variant="primary" icon={<Check />} sx={{ textTransform: 'none' }}>
              Update Transaction
            </Button>
          </>
        }
      >
        <form id="edit-ledger-entry-form" onSubmit={handleEditEntry}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert
                severity="warning"
                message="Note: Type and amount cannot be edited to maintain ledger integrity. Only description and notes can be updated."
              />

              <TextField
                label="Type (Read-only)"
                value={formData.type}
                disabled
                fullWidth
              />

              <TextField
                label="Amount (Read-only)"
                value={formatCurrency(parseFloat(formData.amount))}
                disabled
                fullWidth
              />

              <TextField
                label="Description *"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            </Box>
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