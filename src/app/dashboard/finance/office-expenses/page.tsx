'use client';

import { useEffect, useState, useMemo, useCallback, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { formatMoney } from '@/lib/format';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, StatsCard, TableSkeleton, Modal, Select, toast } from '@/components/design-system';
import {
  Building2,
  DollarSign,
  Calendar,
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Receipt,
  Trash2,
  Edit2,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Tag,
  Store,
  FileCheck,
  Repeat,
  Sliders,
  Zap,
  Users,
  Paperclip,
  Laptop,
  Cloud,
  Wrench,
  Plane,
  Megaphone,
  Scale,
  Wifi,
  Landmark,
  Coffee,
  Package,
} from 'lucide-react';
import RecurringExpensesTab from './RecurringExpensesTab';
import BudgetsTab from './BudgetsTab';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';

export type OfficeExpenseCategory =
  | 'RENT'
  | 'UTILITIES'
  | 'SALARIES_PAYROLL'
  | 'OFFICE_SUPPLIES'
  | 'EQUIPMENT_HARDWARE'
  | 'SOFTWARE_SUBSCRIPTIONS'
  | 'MAINTENANCE_REPAIRS'
  | 'TRAVEL_TRANSPORT'
  | 'MARKETING_ADVERTISING'
  | 'LEGAL_PROFESSIONAL'
  | 'COMMUNICATION_INTERNET'
  | 'TAXES_GOVERNMENT_FEES'
  | 'BANK_FEES'
  | 'MEALS_ENTERTAINMENT'
  | 'OTHER';

export type ExpensePaymentStatus = 'PAID' | 'PENDING' | 'CANCELLED';

interface OfficeExpenseItem {
  id: string;
  title: string;
  category: OfficeExpenseCategory;
  amount: number;
  currency: string;
  expenseDate: string;
  paymentMethod: string;
  vendor: string | null;
  referenceNumber: string | null;
  receiptUrl: string | null;
  receiptName: string | null;
  notes: string | null;
  status: ExpensePaymentStatus;
  recordedById: string | null;
  recordedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseSummary {
  totalAmount: number;
  averageAmount: number;
  totalCount: number;
  thisMonthAmount: number;
  thisMonthCount: number;
  thisYearAmount: number;
  thisYearCount: number;
  categoryBreakdown: Array<{
    category: OfficeExpenseCategory;
    amount: number;
    count: number;
  }>;
}

interface ExpenseStats {
  year: number;
  summary: {
    totalYearAmount: number;
    totalYearCount: number;
    averageMonthly: number;
  };
  monthlyTrend: Array<{
    month: string;
    monthIndex: number;
    total: number;
    count: number;
  }>;
  categoryDistribution: Array<{
    category: OfficeExpenseCategory;
    amount: number;
    count: number;
    percentage: number;
  }>;
  topVendors: Array<{
    vendor: string;
    amount: number;
    count: number;
  }>;
}

const CATEGORY_METADATA: Record<OfficeExpenseCategory, { label: string; color: string; bg: string; border: string; icon: ReactNode }> = {
  RENT: { label: 'Office Rent', color: 'var(--status-violet-dark)', bg: 'rgba(var(--status-violet-rgb), 0.15)', border: 'rgba(var(--status-violet-rgb), 0.35)', icon: <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--status-violet)' }} /> },
  UTILITIES: { label: 'Utilities (Power/Water)', color: 'var(--warning-dark)', bg: 'rgba(var(--warning-rgb), 0.15)', border: 'rgba(var(--warning-rgb), 0.35)', icon: <Zap className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} /> },
  SALARIES_PAYROLL: { label: 'Salaries & Payroll', color: 'var(--success-dark)', bg: 'rgba(var(--success-rgb), 0.15)', border: 'rgba(var(--success-rgb), 0.35)', icon: <Users className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} /> },
  OFFICE_SUPPLIES: { label: 'Office Supplies', color: 'var(--error-dark)', bg: 'rgba(var(--error-rgb), 0.15)', border: 'rgba(var(--error-rgb), 0.35)', icon: <Paperclip className="w-3.5 h-3.5" style={{ color: 'var(--error)' }} /> },
  EQUIPMENT_HARDWARE: { label: 'Equipment & Computers', color: 'var(--status-violet-dark)', bg: 'rgba(var(--status-violet-rgb), 0.15)', border: 'rgba(var(--status-violet-rgb), 0.35)', icon: <Laptop className="w-3.5 h-3.5" style={{ color: 'var(--status-violet)' }} /> },
  SOFTWARE_SUBSCRIPTIONS: { label: 'Software & Cloud', color: 'var(--info-dark)', bg: 'rgba(var(--info-rgb), 0.15)', border: 'rgba(var(--info-rgb), 0.35)', icon: <Cloud className="w-3.5 h-3.5" style={{ color: 'var(--info)' }} /> },
  MAINTENANCE_REPAIRS: { label: 'Maintenance & Repairs', color: 'var(--warning-dark)', bg: 'rgba(var(--warning-rgb), 0.15)', border: 'rgba(var(--warning-rgb), 0.35)', icon: <Wrench className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} /> },
  TRAVEL_TRANSPORT: { label: 'Travel & Transport', color: 'var(--info-dark)', bg: 'rgba(var(--info-rgb), 0.15)', border: 'rgba(var(--info-rgb), 0.35)', icon: <Plane className="w-3.5 h-3.5" style={{ color: 'var(--info)' }} /> },
  MARKETING_ADVERTISING: { label: 'Marketing & Ads', color: 'var(--error-dark)', bg: 'rgba(var(--error-rgb), 0.15)', border: 'rgba(var(--error-rgb), 0.35)', icon: <Megaphone className="w-3.5 h-3.5" style={{ color: 'var(--error)' }} /> },
  LEGAL_PROFESSIONAL: { label: 'Legal & Accounting', color: 'var(--status-emerald-dark)', bg: 'rgba(var(--status-emerald-rgb), 0.15)', border: 'rgba(var(--status-emerald-rgb), 0.35)', icon: <Scale className="w-3.5 h-3.5" style={{ color: 'var(--status-emerald)' }} /> },
  COMMUNICATION_INTERNET: { label: 'Internet & Telecom', color: 'var(--info-dark)', bg: 'rgba(var(--info-rgb), 0.15)', border: 'rgba(var(--info-rgb), 0.35)', icon: <Wifi className="w-3.5 h-3.5" style={{ color: 'var(--info)' }} /> },
  TAXES_GOVERNMENT_FEES: { label: 'Taxes & Gov Fees', color: 'var(--error-dark)', bg: 'rgba(var(--error-rgb), 0.15)', border: 'rgba(var(--error-rgb), 0.35)', icon: <Landmark className="w-3.5 h-3.5" style={{ color: 'var(--error)' }} /> },
  BANK_FEES: { label: 'Bank & Wire Fees', color: 'var(--status-slate-dark)', bg: 'rgba(var(--status-slate-rgb), 0.15)', border: 'rgba(var(--status-slate-rgb), 0.35)', icon: <CreditCard className="w-3.5 h-3.5" style={{ color: 'var(--status-slate)' }} /> },
  MEALS_ENTERTAINMENT: { label: 'Meals & Hospitality', color: 'var(--status-orange-dark)', bg: 'rgba(var(--status-orange-rgb), 0.15)', border: 'rgba(var(--status-orange-rgb), 0.35)', icon: <Coffee className="w-3.5 h-3.5" style={{ color: 'var(--status-orange)' }} /> },
  OTHER: { label: 'Other Operating Expenses', color: 'var(--text-secondary)', bg: 'rgba(var(--text-secondary-rgb), 0.15)', border: 'rgba(var(--text-secondary-rgb), 0.35)', icon: <Package className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} /> },
};

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Wire / ACH' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'CHECK', label: 'Check' },
  { value: 'ZELLE', label: 'Zelle / Online' },
  { value: 'OTHER', label: 'Other' },
];

export default function OfficeExpensesPage() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<OfficeExpenseItem[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics' | 'recurring' | 'budgets'>('list');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OfficeExpenseItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<{ url: string; name: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'RENT' as OfficeExpenseCategory,
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'BANK_TRANSFER',
    vendor: '',
    referenceNumber: '',
    receiptUrl: '',
    receiptName: '',
    notes: '',
    status: 'PAID' as ExpensePaymentStatus,
  });

  const calculateDateRange = useCallback(() => {
    const now = new Date();
    if (dateRangePreset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      return { startDate: start, endDate: '' };
    }
    if (dateRangePreset === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      return { startDate: start, endDate: end };
    }
    if (dateRangePreset === 'THIS_YEAR') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      return { startDate: start, endDate: '' };
    }
    return { startDate: '', endDate: '' };
  }, [dateRangePreset]);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = calculateDateRange();
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
      });

      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (paymentMethodFilter !== 'ALL') params.set('paymentMethod', paymentMethodFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/finance/office-expenses?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch expenses');

      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
        setSummary(data.summary || null);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load office expenses');
    } finally {
      setLoading(false);
    }
  }, [calculateDateRange, categoryFilter, page, paymentMethodFilter, searchQuery, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/office-expenses/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setStats(data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleOpenModal = (expense?: OfficeExpenseItem) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        title: expense.title,
        category: expense.category,
        amount: String(expense.amount),
        expenseDate: new Date(expense.expenseDate).toISOString().slice(0, 10),
        paymentMethod: expense.paymentMethod || 'CASH',
        vendor: expense.vendor || '',
        referenceNumber: expense.referenceNumber || '',
        receiptUrl: expense.receiptUrl || '',
        receiptName: expense.receiptName || '',
        notes: expense.notes || '',
        status: expense.status,
      });
    } else {
      setEditingExpense(null);
      setFormData({
        title: '',
        category: 'RENT',
        amount: '',
        expenseDate: new Date().toISOString().slice(0, 10),
        paymentMethod: 'BANK_TRANSFER',
        vendor: '',
        referenceNumber: '',
        receiptUrl: '',
        receiptName: '',
        notes: '',
        status: 'PAID',
      });
    }
    setModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter an expense title');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSaving(true);
      const url = editingExpense
        ? `/api/finance/office-expenses/${editingExpense.id}`
        : '/api/finance/office-expenses';
      const method = editingExpense ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: amt,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save expense');
      }

      toast.success(editingExpense ? 'Expense updated successfully' : 'Expense recorded successfully');
      setModalOpen(false);
      fetchExpenses();
      fetchStats();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteConfirmId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/finance/office-expenses/${deleteConfirmId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete');

      toast.success('Expense deleted successfully');
      setDeleteConfirmId(null);
      fetchExpenses();
      fetchStats();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete expense';
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCsv = () => {
    const { startDate, endDate } = calculateDateRange();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (paymentMethodFilter !== 'ALL') params.set('paymentMethod', paymentMethodFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    window.open(`/api/finance/office-expenses/export?${params.toString()}`, '_blank');
  };

  const topCategory = useMemo(() => {
    if (!summary?.categoryBreakdown?.length) return null;
    return summary.categoryBreakdown[0];
  }, [summary]);

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Office & Operating Expenses"
          description="Manage operational overhead, facilities, staff compensation, vendor bills, and office running costs."
          actions={
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={loading || expenses.length === 0}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenModal()}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Expense
              </Button>
            </Box>
          }
        />

        {/* Top KPI Metric Cards */}
        <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatsCard
            title="This Month Expenses"
            value={formatMoney(summary?.thisMonthAmount || 0)}
            icon={<Calendar className="w-5 h-5 text-[var(--info)]" />}
            subtitle={`${summary?.thisMonthCount || 0} bills recorded this month`}
            variant="default"
          />
          <StatsCard
            title="This Year Expenses"
            value={formatMoney(summary?.thisYearAmount || 0)}
            icon={<TrendingUp className="w-5 h-5 text-[var(--success)]" />}
            subtitle={`${summary?.thisYearCount || 0} entries in ${new Date().getFullYear()}`}
            variant="default"
          />
          <StatsCard
            title="Top Spending Category"
            value={topCategory ? formatMoney(topCategory.amount) : '$0.00'}
            icon={<PieIcon className="w-5 h-5 text-[var(--warning)]" />}
            subtitle={topCategory ? CATEGORY_METADATA[topCategory.category]?.label || topCategory.category : 'No data'}
            variant="default"
          />
          <StatsCard
            title="Total Recorded"
            value={formatMoney(summary?.totalAmount || 0)}
            icon={<DollarSign className="w-5 h-5 text-[var(--info)]" />}
            subtitle={`Avg ${formatMoney(summary?.averageAmount || 0)} per entry`}
            variant="default"
          />
        </DashboardGrid>

        {/* View Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            textColor="inherit"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': {
                color: 'var(--text-secondary)',
                fontWeight: 600,
                textTransform: 'none',
                minHeight: 48,
                '&.Mui-selected': {
                  color: 'var(--accent-gold)',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'var(--accent-gold)',
              },
            }}
          >
            <Tab
              value="list"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Layers className="w-4 h-4" />
                  <span>Expense Ledger ({summary?.totalCount || expenses.length})</span>
                </Box>
              }
            />
            <Tab
              value="analytics"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PieIcon className="w-4 h-4" />
                  <span>Category Breakdown & Trends</span>
                </Box>
              }
            />
            <Tab
              value="recurring"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Repeat className="w-4 h-4" />
                  <span>Recurring Schedules</span>
                </Box>
              }
            />
            <Tab
              value="budgets"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Sliders className="w-4 h-4" />
                  <span>Budgets & Caps</span>
                </Box>
              }
            />
          </Tabs>
        </Box>

        {activeTab === 'list' && (
          <DashboardPanel>
            {/* Filter Toolbar */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(var(--panel-rgb), 0.5)',
                border: '1px solid rgba(var(--panel-rgb), 0.8)',
              }}
            >
              {/* Search Bar */}
              <Box sx={{ flex: '1 1 260px', minWidth: 220 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search title, vendor, check #, notes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search className="w-4 h-4 text-[var(--text-secondary)]" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'var(--background)',
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>

              {/* Category Filter */}
              <Box sx={{ minWidth: 160 }}>
                <Select
                  label="Category"
                  value={categoryFilter}
                  onChange={(value) => {
                    setCategoryFilter(String(value));
                    setPage(1);
                  }}
                  size="small"
                  options={[
                    { value: 'ALL', label: 'All Categories' },
                    ...Object.entries(CATEGORY_METADATA).map(([catKey, meta]) => ({
                      value: catKey,
                      label: meta.label,
                      icon: meta.icon,
                    })),
                  ]}
                />
              </Box>

              {/* Payment Method Filter */}
              <Box sx={{ minWidth: 150 }}>
                <Select
                  label="Payment"
                  value={paymentMethodFilter}
                  onChange={(value) => {
                    setPaymentMethodFilter(String(value));
                    setPage(1);
                  }}
                  size="small"
                  options={[
                    { value: 'ALL', label: 'All Methods' },
                    ...PAYMENT_METHODS.map((pm) => ({ value: pm.value, label: pm.label })),
                  ]}
                />
              </Box>

              {/* Date Preset Filter */}
              <Box sx={{ minWidth: 140 }}>
                <Select
                  label="Period"
                  value={dateRangePreset}
                  onChange={(value) => {
                    setDateRangePreset(String(value));
                    setPage(1);
                  }}
                  size="small"
                  options={[
                    { value: 'ALL', label: 'All Time' },
                    { value: 'THIS_MONTH', label: 'This Month' },
                    { value: 'LAST_MONTH', label: 'Last Month' },
                    { value: 'THIS_YEAR', label: 'This Year' },
                  ]}
                />
              </Box>

              {/* Status Filter */}
              <Box sx={{ minWidth: 130 }}>
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(String(value));
                    setPage(1);
                  }}
                  size="small"
                  options={[
                    { value: 'ALL', label: 'All Status' },
                    { value: 'PAID', label: 'Paid' },
                    { value: 'PENDING', label: 'Pending' },
                    { value: 'CANCELLED', label: 'Cancelled' },
                  ]}
                />
              </Box>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                  setPaymentMethodFilter('ALL');
                  setDateRangePreset('ALL');
                  setPage(1);
                }}
              >
                Reset
              </Button>
            </Box>

            {/* Expenses Table */}
            {loading ? (
              <TableSkeleton rows={8} />
            ) : expenses.length === 0 ? (
              <Box
                sx={{
                  py: 10,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 className="w-12 h-12 text-[var(--text-secondary)] mb-3 opacity-60" />
                <Typography variant="h6" className="font-semibold text-[var(--text-primary)]">
                  No office expenses found
                </Typography>
                <Typography variant="body2" className="text-[var(--text-secondary)] mt-1 max-w-sm">
                  {searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                    ? 'Try adjusting your search query or filters.'
                    : 'Start tracking your office overhead, payroll, utilities, and running expenses by adding your first expense.'}
                </Typography>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => handleOpenModal()}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add First Expense
                </Button>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      <th className="py-3 px-4">Expense / Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Vendor / Payee</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-sm">
                    {expenses.map((expense) => {
                      const meta = CATEGORY_METADATA[expense.category] || CATEGORY_METADATA.OTHER;
                      return (
                        <tr
                          key={expense.id}
                          className="hover:bg-[rgba(var(--text-primary-rgb),0.03)] transition-colors group"
                        >
                          {/* Title & Details */}
                          <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                            <div className="flex items-center gap-2">
                              <span>{expense.title}</span>
                              {expense.receiptUrl && (
                                <Tooltip title="Receipt Attached">
                                  <button
                                    onClick={() =>
                                      setReceiptPreviewUrl({
                                        url: expense.receiptUrl!,
                                        name: expense.receiptName || 'Receipt Attachment',
                                      })
                                    }
                                    className="text-[var(--info)] hover:text-[var(--info-dark)]"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                            {expense.referenceNumber && (
                              <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                                Ref: <span className="font-mono">{expense.referenceNumber}</span>
                              </div>
                            )}
                            {expense.notes && (
                              <div className="text-xs text-[var(--text-secondary)] italic mt-0.5 line-clamp-1">
                                {expense.notes}
                              </div>
                            )}
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 px-4">
                            <Chip
                              size="small"
                              label={
                                <span className="flex items-center gap-1">
                                  <span className="inline-flex items-center">{meta.icon}</span>
                                  <span>{meta.label}</span>
                                </span>
                              }
                              sx={{
                                bgcolor: meta.bg,
                                color: meta.color,
                                border: `1px solid ${meta.border}`,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                          </td>

                          {/* Vendor */}
                          <td className="py-3.5 px-4 text-[var(--text-primary)]">
                            {expense.vendor ? (
                              <div className="flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
                                <span>{expense.vendor}</span>
                              </div>
                            ) : (
                              <span className="text-[var(--text-secondary)] italic">—</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-[var(--text-primary)] whitespace-nowrap">
                            {new Date(expense.expenseDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>

                          {/* Payment Method */}
                          <td className="py-3.5 px-4 text-[var(--text-primary)]">
                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                              <CreditCard className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                              <span>{expense.paymentMethod.replace(/_/g, ' ')}</span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 text-right font-semibold text-[var(--text-primary)] whitespace-nowrap">
                            {formatMoney(expense.amount)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            {expense.status === 'PAID' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(var(--success-rgb),0.1)] text-[var(--success)] border border-[rgba(var(--success-rgb),0.2)]">
                                <CheckCircle2 className="w-3 h-3" />
                                Paid
                              </span>
                            ) : expense.status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(var(--warning-rgb),0.1)] text-[var(--warning)] border border-[rgba(var(--warning-rgb),0.2)]">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(var(--error-rgb),0.1)] text-[var(--error)] border border-[rgba(var(--error-rgb),0.2)]">
                                <XCircle className="w-3 h-3" />
                                Cancelled
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                              <Tooltip title="Edit Expense">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenModal(expense)}
                                  sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--accent-gold)' } }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Expense">
                                <IconButton
                                  size="small"
                                  onClick={() => setDeleteConfirmId(expense.id)}
                                  sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--error)' } }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mt: 3,
                      pt: 2,
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <Typography variant="body2" className="text-[var(--text-secondary)]">
                      Page {page} of {totalPages}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Next
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </DashboardPanel>
        )}

        {/* Analytics & Breakdown Tab */}
        {activeTab === 'analytics' && (
          <DashboardGrid className="grid-cols-1 lg:grid-cols-2">
            {/* Category Breakdown Card */}
            <DashboardPanel title="Spending by Category" description={`Distribution across ${stats?.year || new Date().getFullYear()}`}>
              {stats?.categoryDistribution?.length ? (
                <div className="space-y-4 pt-2">
                  {stats.categoryDistribution.map((item) => {
                    const meta = CATEGORY_METADATA[item.category] || CATEGORY_METADATA.OTHER;
                    return (
                      <div key={item.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                            <span className="inline-flex items-center">{meta.icon}</span>
                            <span>{meta.label}</span>
                            <span className="text-xs text-[var(--text-secondary)]">({item.count} bills)</span>
                          </div>
                          <div className="font-semibold text-[var(--text-primary)]">
                            {formatMoney(item.amount)}{' '}
                            <span className="text-xs text-[var(--text-secondary)] font-normal">
                              ({item.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-[rgba(var(--text-primary-rgb),0.08)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(3, item.percentage)}%`,
                              backgroundColor: meta.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-[var(--text-secondary)] text-sm">
                  No category spending recorded yet.
                </div>
              )}
            </DashboardPanel>

            {/* Monthly Trend & Top Vendors */}
            <div className="space-y-6">
              {/* Monthly Trend */}
              <DashboardPanel title="Monthly Expense Trend" description="Month-by-month spending summary">
                {stats?.monthlyTrend ? (
                  <div className="grid grid-cols-6 gap-2 pt-2">
                    {stats.monthlyTrend.map((m) => (
                      <div
                        key={m.month}
                        className="p-2.5 rounded-xl bg-[rgba(var(--text-primary-rgb),0.04)] border border-[var(--border)] text-center flex flex-col justify-between"
                      >
                        <div className="text-xs font-semibold text-[var(--text-secondary)]">{m.month}</div>
                        <div className="my-1.5 font-bold text-[var(--text-primary)] text-sm">
                          {m.total > 0 ? formatMoney(m.total) : '$0'}
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)]">{m.count} bills</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-[var(--text-secondary)] text-sm">Loading trend data...</div>
                )}
              </DashboardPanel>

              {/* Top Vendors */}
              <DashboardPanel title="Top Payees & Vendors" description="Highest spending recipients">
                {stats?.topVendors?.length ? (
                  <div className="divide-y divide-[var(--border)]">
                    {stats.topVendors.map((v, i) => (
                      <div key={v.vendor} className="py-2.5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                          <span className="w-5 h-5 rounded-full bg-[rgba(var(--text-primary-rgb),0.08)] text-[var(--text-secondary)] text-xs flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          <span>{v.vendor}</span>
                          <span className="text-xs text-[var(--text-secondary)]">({v.count} payments)</span>
                        </div>
                        <div className="font-semibold text-[var(--text-primary)]">{formatMoney(v.amount)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-[var(--text-secondary)] text-sm">No vendor data available.</div>
                )}
              </DashboardPanel>
            </div>
          </DashboardGrid>
        )}

        {activeTab === 'recurring' && (
          <RecurringExpensesTab
            onExpenseGenerated={() => {
              fetchExpenses();
              fetchStats();
            }}
            categoryLabels={Object.fromEntries(
              Object.entries(CATEGORY_METADATA).map(([k, v]) => [k, v.label])
            ) as Record<OfficeExpenseCategory, string>}
          />
        )}

        {activeTab === 'budgets' && (
          <BudgetsTab
            categoryLabels={Object.fromEntries(
              Object.entries(CATEGORY_METADATA).map(([k, v]) => [k, v.label])
            ) as Record<OfficeExpenseCategory, string>}
          />
        )}

        {/* Add / Edit Expense Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingExpense ? 'Edit Office Expense' : 'Record New Office Expense'}
          description="Enter the overhead details, category, payee, and payment confirmation."
        >
          <form onSubmit={handleSaveExpense} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5">
                Expense Title *
              </label>
              <TextField
                fullWidth
                size="small"
                required
                placeholder="e.g. Office Rent (September), High-Speed Internet Bill"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2 } }}
              />
            </div>

            {/* Category & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Select
                  label="Category"
                  value={formData.category}
                  onChange={(value) =>
                    setFormData({ ...formData, category: value as OfficeExpenseCategory })
                  }
                  size="small"
                  required
                  options={Object.entries(CATEGORY_METADATA).map(([catKey, meta]) => ({
                    value: catKey,
                    label: meta.label,
                    icon: meta.icon,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5">
                  Amount (USD) *
                </label>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  required
                  placeholder="0.00"
                  inputProps={{ step: '0.01', min: '0.01' }}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2 } }}
                />
              </div>
            </div>

            {/* Date & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5">
                  Expense Date *
                </label>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  required
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2 } }}
                />
              </div>

              <div>
                <Select
                  label="Payment Method"
                  value={formData.paymentMethod}
                  onChange={(value) => setFormData({ ...formData, paymentMethod: String(value) })}
                  size="small"
                  options={PAYMENT_METHODS.map((pm) => ({ value: pm.value, label: pm.label }))}
                />
              </div>
            </div>

            {/* Vendor / Payee & Reference # */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5">
                  Vendor / Payee
                </label>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. Landlord Name, Verizon, Staples"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2 } }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5">
                  Reference # (Invoice / Check)
                </label>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. INV-9042, Check #1042"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2 } }}
                />
              </div>
            </div>

            {/* Receipt URL / Attachment Link */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5">
                Receipt / Document Link
              </label>
              <TextField
                fullWidth
                size="small"
                placeholder="https://... (Receipt image or PDF link)"
                value={formData.receiptUrl}
                onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Receipt className="w-4 h-4 text-[var(--text-secondary)]" />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2 } }}
              />
            </div>

            {/* Notes & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5">
                  Internal Notes
                </label>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Additional context or notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--background)', borderRadius: 2 } }}
                />
              </div>

              <div>
                <Select
                  label="Status"
                  value={formData.status}
                  onChange={(value) =>
                    setFormData({ ...formData, status: value as ExpensePaymentStatus })
                  }
                  size="small"
                  options={[
                    { value: 'PAID', label: 'Paid' },
                    { value: 'PENDING', label: 'Pending' },
                    { value: 'CANCELLED', label: 'Cancelled' },
                  ]}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          open={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Office Expense"
          description="Are you sure you want to delete this expense record? This action cannot be undone."
        >
          <div className="space-y-4">
            <div className="p-3 bg-[rgba(var(--error-rgb),0.1)] border border-[rgba(var(--error-rgb),0.2)] rounded-xl text-sm text-[var(--error)] flex items-center gap-2">
              <Trash2 className="w-5 h-5 flex-shrink-0" />
              <span>This will permanently remove this expense from all financial summaries.</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteExpense}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Receipt Attachment Preview Modal */}
        <Modal
          open={!!receiptPreviewUrl}
          onClose={() => setReceiptPreviewUrl(null)}
          title={receiptPreviewUrl?.name || 'Receipt Document'}
          description="Attached receipt preview"
        >
          {receiptPreviewUrl && (
            <div className="space-y-4 text-center">
              <div className="max-h-[60vh] overflow-auto rounded-xl border border-[var(--border)] p-2 bg-black/40">
                {receiptPreviewUrl.url.endsWith('.pdf') ? (
                  <iframe
                    src={receiptPreviewUrl.url}
                    className="w-full h-96 rounded-lg"
                    title="PDF Preview"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={receiptPreviewUrl.url}
                    alt="Receipt"
                    className="max-h-[55vh] mx-auto rounded-lg object-contain"
                  />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(receiptPreviewUrl.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Open in New Tab
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReceiptPreviewUrl(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </DashboardSurface>
    </ProtectedRoute>
  );
}
