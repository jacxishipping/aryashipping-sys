'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Check,
  X,
  Download,
  Printer,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Trash2,
  Edit2,
  FileText,
  FileSpreadsheet,
  BookOpen,
} from 'lucide-react';
import {
  Box,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import {
  Alert,
  Button,
  toast,
  Tooltip,
  TableSkeleton,
  StatsCard,
  PageHeader,
  Modal,
  ConfirmDialog,
  Select,
} from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { hasPermission } from '@/lib/rbac';
import { formatMoney as formatCurrency } from '@/lib/format';

interface LedgerEntry {
  id: string;
  user?: { id: string; name: string | null; email: string } | null;
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
    vehicleVIN?: string | null;
    vehicleMake?: string;
    vehicleModel?: string;
  };
}

type LedgerSourceFilter = '' | 'BANK_IMPORT' | 'MANUAL';

interface LedgerSummary {
  totalDebit: number;
  totalCredit: number;
  totalShipmentPurchaseAmount: number;
  totalShipmentExpenses: number;
  currentBalance: number;
  transactionInfoBreakdown?: Partial<Record<TransactionInfoType, {
    totalDebit: number;
    totalCredit: number;
    balance: number;
  }>>;
}

type TransactionInfoType = 'CAR_PAYMENT' | 'SHIPPING_PAYMENT' | 'STORAGE_PAYMENT';

const transactionInfoTypeLabels: Record<TransactionInfoType, string> = {
  CAR_PAYMENT: 'Car Payment',
  SHIPPING_PAYMENT: 'Shipping Payment',
  STORAGE_PAYMENT: 'Storage Payment',
};

export default function LedgerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'admin';
  const canManageLedger = hasPermission(session?.user?.role, 'finance:manage');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [ledgerScope, setLedgerScope] = useState<'own' | 'single' | 'all'>('single');
  const [summary, setSummary] = useState<LedgerSummary>({
    totalDebit: 0,
    totalCredit: 0,
    totalShipmentPurchaseAmount: 0,
    totalShipmentExpenses: 0,
    currentBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    source: '' as LedgerSourceFilter,
    transactionInfoType: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null);
  const [editForm, setEditForm] = useState({ description: '', notes: '' });
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
    fetchLedgerEntries();
  }, [session, status, page, filters, router]);

  const fetchLedgerEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(session?.user?.id && { userId: session.user.id }),
        page: page.toString(),
        limit: '20',
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.source && { source: filters.source }),
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
      setLedgerScope(data.scope === 'all' ? 'all' : data.scope === 'own' ? 'own' : 'single');
      setSummary(data.summary);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams({
        ...(session?.user?.id && { userId: session.user.id }),
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.source && { source: filters.source }),
        ...(filters.transactionInfoType && { transactionInfoType: filters.transactionInfoType }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      let endpoint = '/api/ledger/export';
      if (format === 'pdf') {
        endpoint = '/api/ledger/export-pdf';
      } else if (format === 'excel') {
        endpoint = '/api/ledger/export-excel';
      }

      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export ledger');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      if (format === 'pdf') {
        a.download = `ledger-${Date.now()}.html`;
      } else if (format === 'excel') {
        a.download = `ledger-${Date.now()}.csv`;
      } else {
        a.download = `ledger-${Date.now()}.csv`;
      }
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (format === 'pdf') {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error exporting ledger:', error);
      toast.error('Failed to export ledger');
    }
  };

  const handlePrint = () => {
    window.print();
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
      const response = await fetch(`/api/ledger/${entryId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete transaction');
      }

      toast.success('Transaction deleted successfully');
      await fetchLedgerEntries();
    } catch (error) {
      toast.error('Unable to delete transaction', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const openEditEntry = (entry: LedgerEntry) => {
    setEditEntry(entry);
    setEditForm({
      description: entry.description,
      notes: entry.notes || '',
    });
    setShowEditModal(true);
  };

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEntry) return;

    try {
      const response = await fetch(`/api/ledger/${editEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          notes: editForm.notes,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success('Transaction updated successfully');
        setShowEditModal(false);
        setEditEntry(null);
        setEditForm({ description: '', notes: '' });
        await fetchLedgerEntries();
      } else {
        toast.error(data.error || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Unable to update transaction', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    try {
      const amount = parseFloat(formData.amount);
      const response = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
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

  const isBankImportEntry = (entry: LedgerEntry) => entry.metadata?.importSource === 'BANK_OF_AMERICA_CSV';

  const normalizeShipmentReference = (entry: LedgerEntry) => {
    if (!entry.shipment?.id || !entry.shipment?.vehicleVIN) {
      return entry.description;
    }

    const shipmentId = entry.shipment.id;
    const vinLabel = `VIN ${entry.shipment.vehicleVIN}`;

    return entry.description
      .replace(new RegExp(`\\(Shipment\\s+${shipmentId}\\)`, 'gi'), `(${vinLabel})`)
      .replace(new RegExp(`Shipment\\s+${shipmentId}`, 'gi'), vinLabel)
      .replace(new RegExp(`shipment\\s+${shipmentId}`, 'g'), vinLabel);
  };

  const columns = useMemo<Column<LedgerEntry>[]>(() => [
    ...(ledgerScope === 'all' && canManageLedger
      ? [
          {
            key: 'userEmail' as const,
            header: 'Customer',
            width: '18%',
            render: (_: unknown, row: LedgerEntry) => (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {row.user?.name || row.user?.email || '—'}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'transactionDate',
      header: 'Date',
      sortable: true,
      width: '15%',
      render: (_, row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {formatDate(row.transactionDate)}
        </span>
      )
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      width: '40%',
      render: (_, row) => {
        const isPending = row.metadata?.pendingInvoice === true;
        const isInvoicePaid = !isPending && (typeof row.metadata?.invoiceId === 'string' || typeof row.metadata?.invoiceNumber === 'string');
        const isBankImport = isBankImportEntry(row);

        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                {normalizeShipmentReference(row)}
              </Typography>
              {isBankImport && (
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
                    backgroundColor: 'rgba(var(--info-rgb), 0.12)',
                    color: 'var(--info-dark)',
                    border: '1px solid rgba(var(--info-rgb), 0.22)',
                    textTransform: 'uppercase',
                  }}
                >
                  Bank Import
                </Box>
              )}
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
                    backgroundColor: 'rgba(var(--status-yellow-rgb), 0.15)',
                    color: 'var(--status-yellow-dark)',
                    border: '1px solid rgba(var(--status-yellow-rgb), 0.3)',
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
                {row.shipment.vehicleVIN
                  ? `VIN: ${row.shipment.vehicleVIN}`
                  : `${row.shipment.vehicleMake || ''} ${row.shipment.vehicleModel || ''}`.trim() || row.shipment.id}
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
      width: '15%',
      render: (_, row) => (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: row.type === 'DEBIT' ? 'rgba(var(--error-rgb), 0.1)' : 'rgba(var(--success-rgb), 0.1)',
            color: row.type === 'DEBIT' ? 'var(--error)' : 'var(--success)',
          }}
        >
          {row.type === 'DEBIT' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {row.type}
        </Box>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right' as const,
      width: '15%',
      render: (_, row) => (
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: row.type === 'DEBIT' ? 'var(--error)' : 'var(--success-dark)' }}>
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
    ...(canManageLedger ? [{
      key: 'actions' as const,
      header: 'Actions',
      align: 'center' as const,
      width: '12%',
      render: (_: unknown, row: LedgerEntry) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Edit transaction">
            <IconButton
              size="small"
              aria-label={`Edit ${row.description}`}
              onClick={() => openEditEntry(row)}
              sx={{ color: 'var(--accent-gold)' }}
            >
              <Edit2 size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete transaction">
            <IconButton
              size="small"
              color="error"
              aria-label={`Delete ${row.description}`}
              onClick={() => void handleDeleteEntry(row.id)}
            >
              <Trash2 size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    }] : [])
  ], [canManageLedger, ledgerScope]);

  if (status === 'loading' || loading) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <PageHeader
            title="General Ledger"
            description="Detailed double-entry records and transaction reconciliation"
            showBreadcrumbs
          />
          <Box sx={{ px: 2 }}>
            <TableSkeleton rows={5} />
          </Box>
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <PageHeader
          title="General Ledger"
          description="Detailed double-entry records and transaction reconciliation"
          showBreadcrumbs
          actions={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {isAdmin && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                  icon={<Plus size={16} />}
                >
                  Add Transaction
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                icon={<Printer size={16} />}
              >
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                icon={<FileText size={16} />}
              >
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                icon={<FileSpreadsheet size={16} />}
              >
                Excel
              </Button>
            </Box>
          }
        />

        {/* Stats Cards */}
        <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            icon={<TrendingDown size={22} />}
            title="Total Credits"
            value={formatCurrency(summary.totalCredit)}
            subtitle="Amount paid into accounts"
            variant="success"
          />
          <StatsCard
            icon={<TrendingUp size={22} />}
            title="Total Debits"
            value={formatCurrency(summary.totalDebit)}
            subtitle="Total amount charged"
            variant="warning"
          />
          <StatsCard
            icon={<Truck size={22} />}
            title="Shipment Purchases"
            value={formatCurrency(summary.totalShipmentPurchaseAmount)}
            subtitle="Total car purchase amount in ledger"
            variant="default"
          />
          <StatsCard
            icon={<DollarSign size={22} />}
            title="Shipment Expenses"
            value={formatCurrency(summary.totalShipmentExpenses)}
            subtitle="All shipment expense debits"
            variant="info"
          />
        </DashboardGrid>

        {/* Filters Panel */}
        <DashboardPanel
          title="Filters & Search"
          description="Filter ledger transactions by type, category, date range, or origin"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              icon={<Filter size={15} />}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          }
        >
          {showFilters && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                placeholder="Search transactions..."
                size="small"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: <Search size={18} style={{ marginRight: 8, color: 'var(--text-secondary)' }} />,
                }}
                fullWidth
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                <Select
                  label="Type"
                  value={filters.type}
                  onChange={(value) => setFilters({ ...filters, type: String(value) })}
                  size="small"
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'DEBIT', label: 'Debit' },
                    { value: 'CREDIT', label: 'Credit' },
                  ]}
                />
                <Select
                  label="Source"
                  value={filters.source}
                  onChange={(value) => setFilters({ ...filters, source: value as LedgerSourceFilter })}
                  size="small"
                  options={[
                    { value: '', label: 'All Sources' },
                    { value: 'BANK_IMPORT', label: 'Bank Imports' },
                    { value: 'MANUAL', label: 'Manual Entries' },
                  ]}
                />
                <Select
                  label="Transaction Info"
                  value={filters.transactionInfoType}
                  onChange={(value) => setFilters({ ...filters, transactionInfoType: String(value) })}
                  size="small"
                  options={[
                    { value: '', label: 'All Transaction Types' },
                    ...(Object.entries(transactionInfoTypeLabels) as Array<[TransactionInfoType, string]>).map(([value, label]) => ({ value, label })),
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
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
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
            </Box>
          )}
        </DashboardPanel>

        {/* Transactions Table */}
        <DashboardPanel
          title="Transaction History"
          description={`Showing ${entries.length} transaction${entries.length !== 1 ? 's' : ''}${filters.source === 'BANK_IMPORT' ? ' from bank imports' : filters.source === 'MANUAL' ? ' from manual entries' : ''}`}
          fullHeight
        >
          <DataTable 
            data={entries}
            columns={columns}
            keyField="id"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: '1px solid var(--border)' }}>
              <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  icon={<ChevronLeft size={16} />}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  icon={<ChevronRight size={16} />}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
        </DashboardPanel>

        {/* Add Transaction Modal */}
        <Modal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add Transaction"
          description="Post a manual debit or credit entry to the customer ledger"
          size="md"
        >
          <form onSubmit={handleAddEntry}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              {(() => {
                const enteredAmount = parseFloat(formData.amount) || 0;
                const projectedBalance = formData.type === 'DEBIT'
                  ? summary.currentBalance + enteredAmount
                  : summary.currentBalance - enteredAmount;
                const currentBalanceLabel = summary.currentBalance > 0
                  ? `You owe ${formatCurrency(summary.currentBalance)}`
                  : summary.currentBalance < 0
                    ? `You have ${formatCurrency(Math.abs(summary.currentBalance))} credit`
                    : 'Account is settled';
                const projectedBalanceLabel = projectedBalance > 0
                  ? `you will owe ${formatCurrency(projectedBalance)}`
                  : projectedBalance < 0
                    ? `you will have ${formatCurrency(Math.abs(projectedBalance))} credit`
                    : 'account will be settled';
                return (
                  <Alert
                    severity={formData.type === 'DEBIT' ? 'info' : 'success'}
                    message={
                      <>
                        Current Balance: <strong>{currentBalanceLabel}</strong>. {enteredAmount > 0 ? `After this transaction, ${projectedBalanceLabel}.` : 'Enter an amount to preview the new balance.'}
                      </>
                    }
                  />
                );
              })()}

              <Select
                label="Type"
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value as 'DEBIT' | 'CREDIT' })}
                size="small"
                required
                options={[
                  { value: 'DEBIT', label: 'Debit / Charge' },
                  { value: 'CREDIT', label: 'Credit / Payment' },
                ]}
              />

              <Select
                label="Category"
                value={formData.transactionInfoType}
                onChange={(value) => setFormData({ ...formData, transactionInfoType: value as TransactionInfoType })}
                size="small"
                required
                options={Object.entries(transactionInfoTypeLabels).map(([value, label]) => ({ value, label }))}
              />

              <TextField
                label="Description *"
                size="small"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Shipping charge, Payment"
                required
                fullWidth
              />

              <TextField
                label="Amount * (USD)"
                size="small"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                inputProps={{ step: '0.01', min: '0.01' }}
                required
                fullWidth
              />

              <TextField
                label="Notes (Optional)"
                size="small"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes"
                multiline
                rows={3}
                fullWidth
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" icon={<Check size={16} />}>
                  Add Transaction
                </Button>
              </Box>
            </Box>
          </form>
        </Modal>

        {/* Edit Transaction Modal */}
        <Modal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Transaction"
          description="Update transaction description and audit notes"
          size="md"
        >
          <form onSubmit={handleEditEntry}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              <Alert
                severity="warning"
                message="Note: Type and amount cannot be edited to maintain ledger integrity. Only description and notes can be updated."
              />

              <TextField
                label="Type (Read-only)"
                size="small"
                value={editEntry?.type || ''}
                disabled
                fullWidth
              />

              <TextField
                label="Amount (Read-only)"
                size="small"
                value={editEntry ? formatCurrency(editEntry.amount) : ''}
                disabled
                fullWidth
              />

              <TextField
                label="Description *"
                size="small"
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                required
                fullWidth
              />

              <TextField
                label="Notes"
                size="small"
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={3}
                fullWidth
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" icon={<Check size={16} />}>
                  Update Transaction
                </Button>
              </Box>
            </Box>
          </form>
        </Modal>

        <ConfirmDialog
          open={deleteEntryId !== null}
          onClose={() => setDeleteEntryId(null)}
          onConfirm={() => void confirmDeleteEntry()}
          title="Delete Transaction"
          message="Delete this transaction? This cannot be undone."
          confirmText="Delete"
          severity="error"
        />
      </DashboardSurface>
    </ProtectedRoute>
  );
}
