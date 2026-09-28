'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { hasPermission } from '@/lib/rbac';
import { 
  ArrowLeft, 
  Download, 
  Calendar,
  Filter,
  FileText,
  Users,
  Package,
  Truck,
  HandCoins,
  TrendingUp,
  Building2,
  CheckCircle2,
  DollarSign,
  Percent,
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react';
import AdminRoute from '@/components/auth/AdminRoute';
import { Button, PageHeader, toast, DashboardPageSkeleton, TableSkeleton, SkeletonCard } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ResponsiveDataView, CardField } from '@/components/ui/MobileCardView';
import { Box } from '@mui/material';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { getDispatchStatusLabel } from '@/lib/dispatch-workflow';

type UserBalance = {
  userId: string;
  userName: string;
  currentBalance: number;
};

type UserReport = {
  userId: string;
  userName: string;
  email: string;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  shipmentStats: {
    total: number;
    paid: number;
    due: number;
  };
};

type ShipmentReport = {
  shipmentId: string;
  trackingNumber: string | null;
  vehicle: string;
  price: number | null;
  paymentStatus: string;
  totalCharged: number;
  totalPaid: number;
  amountDue: number;
  totalExpenses: number;
  revenue: number;
  profit: number;
  profitMargin: number;
  user: {
    id: string;
    name: string;
  };
  createdAt?: string;
  expenses?: Array<{
    id: string;
    description: string;
    amount: number;
    type: string;
    date: string;
    linkedCompanyLedgerEntry?: {
      id: string;
      companyId: string;
      description: string;
      reference: string | null;
      notes: string | null;
      company: {
        id: string;
        name: string;
        code: string | null;
      };
    } | null;
  }>;
};

type ReportData = {
  reportType: string;
  period?: {
    startDate: string;
    endDate: string;
  };
  ledgerSummary?: {
    totalDebit: number;
    totalCredit: number;
    netBalance: number;
    debitCount: number;
    creditCount: number;
  };
  shipmentSummary?: Array<{
    status: string;
    totalAmount: number;
    count: number;
  }>;
  userBalances?: UserBalance[];
  users?: UserReport[];
  revenue?: {
    totalRevenue: number;
    freightRevenue: number;
    shipmentCount: number;
  };
  costOfGoodsSold?: {
    totalCOGS: number;
    shipmentDirectExpenses: number;
    dispatchExpenses: number;
    containerExpenses: number;
  };
  grossProfit?: {
    amount: number;
    marginPercent: number;
  };
  operatingExpenses?: {
    totalOpEx: number;
    categories: Array<{
      category: string;
      amount: number;
      count: number;
      percentageOfOpEx: number;
    }>;
    count: number;
  };
  netIncome?: {
    amount: number;
    marginPercent: number;
  };
  summary?: {
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    avgProfitMargin: number;
    shipmentCount: number;
  };
  dispatchSummary?: {
    activeCount: number;
    totalCount: number;
    totalExpenseAmount: number;
    expenseCount: number;
    statuses: Array<{
      status: string;
      count: number;
    }>;
  };
  shipments?: ShipmentReport[];
};

export default function FinancialReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reportType, setReportType] = useState<'pnl' | 'summary' | 'user-wise' | 'shipment-wise'>('pnl');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !hasPermission(session.user?.role, 'finance:manage')) {
      router.replace('/dashboard');
      return;
    }
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router, reportType]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: reportType,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.userId && { userId: filters.userId }),
      });

      const response = await fetch(`/api/reports/financial?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        type: reportType,
        format,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.userId && { userId: filters.userId }),
      });

      const response = await fetch(`/api/reports/financial?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${reportType}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (dateString === 'All time' || dateString === 'Now') return dateString;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const userBalanceColumns = useMemo<Column<UserBalance>[]>(() => [
    {
      key: 'userName',
      header: 'User',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-[var(--text-primary)]">{row.userName}</span>
      ),
    },
    {
      key: 'currentBalance',
      header: 'Balance',
      sortable: true,
      render: (_, row) => (
        <span className={`font-semibold ${row.currentBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--error)]'}`}>
          {formatCurrency(Math.abs(row.currentBalance))}
        </span>
      ),
    },
  ], []);

  const shipmentColumns = useMemo<Column<ShipmentReport>[]>(() => [
    {
      key: 'trackingNumber',
      header: 'Tracking',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-[var(--text-primary)]">
          {row.trackingNumber || '—'}
        </span>
      ),
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-[var(--text-primary)]">{row.vehicle}</span>
      ),
    },
    {
      key: 'totalCharged',
      header: 'Charged',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-right text-[var(--error)]">
          {formatCurrency(row.totalCharged)}
        </span>
      ),
    },
    {
      key: 'totalPaid',
      header: 'Paid',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-right text-[var(--success)]">
          {formatCurrency(row.totalPaid)}
        </span>
      ),
    },
    {
      key: 'amountDue',
      header: 'Due',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-right text-[var(--warning)]">
          {formatCurrency(row.amountDue)}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Status',
      sortable: true,
      render: (_, row) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          row.paymentStatus === 'COMPLETED'
            ? 'bg-[rgba(var(--success-rgb),0.08)] text-[var(--success)]'
            : 'bg-[rgba(var(--warning-rgb),0.08)] text-[var(--warning)]'
        }`}>
          {row.paymentStatus === 'COMPLETED' ? 'Paid' : 'Due'}
        </span>
      ),
    },
    {
      key: 'expenses',
      header: 'Recoveries',
      render: (_, row) => {
        const linkedRecoveries = (row.expenses || []).filter((expense) => expense.linkedCompanyLedgerEntry);

        if (linkedRecoveries.length === 0) {
          return <span className="text-sm text-[var(--text-secondary)]">None</span>;
        }

        if (linkedRecoveries.length === 1 && linkedRecoveries[0].linkedCompanyLedgerEntry) {
          return (
            <button
              type="button"
              onClick={() => router.push(`/dashboard/finance/companies/${linkedRecoveries[0].linkedCompanyLedgerEntry!.companyId}?entryId=${linkedRecoveries[0].linkedCompanyLedgerEntry!.id}`)}
              className="rounded border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
            >
              View Entry
            </button>
          );
        }

        return <span className="text-sm text-[var(--text-primary)]">{linkedRecoveries.length} entries below</span>;
      },
    },
  ], [router]);

  if (status === 'loading' || loading) {
    return (
      <AdminRoute>
        <DashboardSurface>
          <DashboardPageSkeleton />
        </DashboardSurface>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Financial Reports"
          description="Generate and export detailed financial reports"
          actions={
            <div className="flex gap-2 flex-wrap items-center">
              <Link href="/dashboard/finance">
                <Button variant="outline" size="sm" className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportReport('json')}
                className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </div>
          }
        />

        {/* Report Type Selection */}
        <DashboardPanel title="Report Type">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setReportType('pnl')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                reportType === 'pnl'
                  ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]'
                  : 'border-[var(--border)] hover:border-[rgba(var(--accent-gold-rgb),0.5)]'
              }`}
            >
              <TrendingUp className="w-6 h-6 text-[var(--success)] mb-2" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">Unified P&L Statement</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Revenue, Freight COGS & OpEx Net Income</p>
            </button>

            <button
              onClick={() => setReportType('summary')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                reportType === 'summary'
                  ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]'
                  : 'border-[var(--border)] hover:border-[rgba(var(--accent-gold-rgb),0.5)]'
              }`}
            >
              <FileText className="w-6 h-6 text-[var(--info)] mb-2" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">Summary Report</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Overall financial overview</p>
            </button>

            <button
              onClick={() => setReportType('user-wise')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                reportType === 'user-wise'
                  ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]'
                  : 'border-[var(--border)] hover:border-[rgba(var(--accent-gold-rgb),0.5)]'
              }`}
            >
              <Users className="w-6 h-6 text-[var(--info)] mb-2" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">User-wise Report</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Detailed by user accounts</p>
            </button>

            <button
              onClick={() => setReportType('shipment-wise')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                reportType === 'shipment-wise'
                  ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]'
                  : 'border-[var(--border)] hover:border-[rgba(var(--accent-gold-rgb),0.5)]'
              }`}
            >
              <Package className="w-6 h-6 text-[var(--info)] mb-2" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">Shipment-wise Report</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Payment status by shipment</p>
            </button>
          </div>
        </DashboardPanel>

        {/* Filters */}
        {showFilters && (
          <DashboardPanel title="Filters">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)]"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={fetchReport}
                  className="w-full bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)] text-black"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </DashboardPanel>
        )}

        {/* Report Content */}
        {reportData && (
          <>
            {/* Period Info */}
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] px-1">
              <Calendar className="w-4 h-4" />
              <span>
                Report Period: {reportData.period ? `${formatDate(reportData.period.startDate)} - ${formatDate(reportData.period.endDate)}` : 'N/A'}
              </span>
            </div>

            {/* UNIFIED PROFIT & LOSS (P&L) STATEMENT */}
            {reportType === 'pnl' && (
              <div className="space-y-6">
                {/* P&L Top KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                      I. Gross Revenue
                    </p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                      {formatCurrency(reportData.revenue?.totalRevenue || 0)}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {reportData.revenue?.shipmentCount || 0} shipments freight volume
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                      II. Direct Freight Costs (COGS)
                    </p>
                    <p className="text-2xl font-bold text-[var(--error)] mt-1">
                      {formatCurrency(reportData.costOfGoodsSold?.totalCOGS || 0)}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Dispatch, ocean freight & port costs
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                      III. Gross Freight Profit
                    </p>
                    <p className="text-2xl font-bold text-[var(--warning)] mt-1">
                      {formatCurrency(reportData.grossProfit?.amount || 0)}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Margin: <span className="font-semibold text-[var(--text-primary)]">{((reportData.grossProfit?.marginPercent || 0)).toFixed(1)}%</span>
                    </p>
                  </div>

                  <div className={`p-5 rounded-2xl border shadow-sm ${
                    (reportData.netIncome?.amount || 0) >= 0
                      ? 'border-[rgba(var(--success-rgb),0.3)] bg-[rgba(var(--success-rgb),0.06)]'
                      : 'border-[rgba(var(--error-rgb),0.3)] bg-[rgba(var(--error-rgb),0.1)]'
                  }`}>
                    <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                      IV. Net Operating Income (EBITDA)
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${
                      (reportData.netIncome?.amount || 0) >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
                    }`}>
                      {formatCurrency(reportData.netIncome?.amount || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Net Margin: <span className="font-semibold text-foreground">{((reportData.netIncome?.marginPercent || 0)).toFixed(1)}%</span>
                    </p>
                  </div>
                </div>

                {/* Detailed Multi-Tier Financial Statement */}
                <DashboardPanel title="Income Statement (P&L Breakdown)">
                  <div className="divide-y divide-border text-sm">
                    {/* Revenue Section */}
                    <div className="py-3">
                      <div className="flex items-center justify-between font-bold text-foreground mb-2">
                        <span className="text-base text-[var(--accent-gold)]">1. Operating Revenue</span>
                        <span className="text-base">{formatCurrency(reportData.revenue?.totalRevenue || 0)}</span>
                      </div>
                      <div className="pl-4 space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Ocean Freight & Vehicle Shipping Fees</span>
                          <span className="font-mono text-foreground">{formatCurrency(reportData.revenue?.freightRevenue || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* COGS Section */}
                    <div className="py-3">
                      <div className="flex items-center justify-between font-bold text-foreground mb-2">
                        <span className="text-base text-[var(--error)]">2. Cost of Freight Logistics (Direct Expenses)</span>
                        <span className="text-base text-[var(--error)] font-mono">-{formatCurrency(reportData.costOfGoodsSold?.totalCOGS || 0)}</span>
                      </div>
                      <div className="pl-4 space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Dispatch & Domestic Inland Towing</span>
                          <span className="font-mono text-foreground">{formatCurrency(reportData.costOfGoodsSold?.dispatchExpenses || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Container Loading, Drayage & Port Handling</span>
                          <span className="font-mono text-foreground">{formatCurrency(reportData.costOfGoodsSold?.containerExpenses || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Direct Shipment Recoveries & Operational Costs</span>
                          <span className="font-mono text-foreground">{formatCurrency(reportData.costOfGoodsSold?.shipmentDirectExpenses || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gross Profit Bar */}
                    <div className="py-3 bg-muted/20 px-3 rounded-lg flex items-center justify-between font-bold text-foreground">
                      <span className="text-[var(--warning)]">GROSS FREIGHT PROFIT</span>
                      <div className="text-right">
                        <span className="text-base font-mono">{formatCurrency(reportData.grossProfit?.amount || 0)}</span>
                        <span className="text-xs text-muted-foreground ml-2">({((reportData.grossProfit?.marginPercent || 0)).toFixed(1)}% margin)</span>
                      </div>
                    </div>

                    {/* Operating Expenses (OpEx) Section */}
                    <div className="py-3">
                      <div className="flex items-center justify-between font-bold text-foreground mb-2">
                        <span className="text-base text-[var(--status-violet)]">3. Office & Operating Expenses (OpEx)</span>
                        <span className="text-base text-[var(--status-violet)] font-mono">-{formatCurrency(reportData.operatingExpenses?.totalOpEx || 0)}</span>
                      </div>
                      <div className="pl-4 space-y-2 text-xs">
                        {reportData.operatingExpenses?.categories && reportData.operatingExpenses.categories.length > 0 ? (
                          reportData.operatingExpenses.categories.map((c) => (
                            <div key={c.category} className="space-y-1">
                              <div className="flex justify-between text-muted-foreground">
                                <span className="font-medium text-foreground">{c.category.replace(/_/g, ' ')}</span>
                                <span className="font-mono text-foreground">{formatCurrency(c.amount)} ({c.percentageOfOpEx.toFixed(1)}%)</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-[var(--status-violet)] rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(2, c.percentageOfOpEx))}%` }}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground italic">No office expenses recorded in this period.</div>
                        )}
                      </div>
                    </div>

                    {/* Net Operating Income Bar */}
                    <div className={`p-4 rounded-xl flex items-center justify-between font-extrabold ${
                      (reportData.netIncome?.amount || 0) >= 0
                        ? 'bg-[rgba(var(--success-rgb),0.1)] border border-[rgba(var(--success-rgb),0.2)] text-[var(--success)]'
                        : 'bg-[rgba(var(--error-rgb),0.1)] border border-[rgba(var(--error-rgb),0.2)] text-[var(--error)]'
                    }`}>
                      <div>
                        <div className="text-base">NET OPERATING INCOME (EBITDA)</div>
                        <div className="text-xs font-normal opacity-80">Gross Freight Profit minus All Office & Operational Overhead</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-mono">{formatCurrency(reportData.netIncome?.amount || 0)}</div>
                        <div className="text-xs opacity-90">{((reportData.netIncome?.marginPercent || 0)).toFixed(1)}% Net Margin</div>
                      </div>
                    </div>
                  </div>
                </DashboardPanel>
              </div>
            )}

            {/* Summary Report */}
            {reportType === 'summary' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                  <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Total Debit</p>
                    <p className="text-2xl font-bold text-[var(--error)] mt-2">
                      {formatCurrency(reportData.ledgerSummary?.totalDebit || 0)}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {reportData.ledgerSummary?.debitCount} transactions
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Total Credit</p>
                    <p className="text-2xl font-bold text-[var(--success)] mt-2">
                      {formatCurrency(reportData.ledgerSummary?.totalCredit || 0)}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {reportData.ledgerSummary?.creditCount} transactions
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Net Balance</p>
                    <p className={`text-2xl font-bold mt-2 ${
                      (reportData.ledgerSummary?.netBalance || 0) >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
                    }`}>
                      {formatCurrency(Math.abs(reportData.ledgerSummary?.netBalance || 0))}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {(reportData.ledgerSummary?.netBalance || 0) >= 0 ? 'Receivable' : 'Payable'}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
                    <div className="flex items-center gap-2 text-[var(--warning)]">
                      <Truck className="w-4 h-4" />
                      <p className="text-xs uppercase tracking-wide">Active Dispatches</p>
                    </div>
                    <p className="text-2xl font-bold text-[var(--warning)] mt-2">
                      {reportData.dispatchSummary?.activeCount || 0}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {reportData.dispatchSummary?.totalCount || 0} total dispatch records
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
                    <div className="flex items-center gap-2 text-[var(--error)]">
                      <HandCoins className="w-4 h-4" />
                      <p className="text-xs uppercase tracking-wide">Dispatch Expenses</p>
                    </div>
                    <p className="text-2xl font-bold text-[var(--error)] mt-2">
                      {formatCurrency(reportData.dispatchSummary?.totalExpenseAmount || 0)}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {reportData.dispatchSummary?.expenseCount || 0} expense records
                    </p>
                  </div>
                </div>

                <DashboardPanel title="Dispatch Status Summary">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                    {(reportData.dispatchSummary?.statuses || []).map((status) => (
                      <div key={status.status} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                          {getDispatchStatusLabel(status.status)}
                        </p>
                        <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">{status.count}</p>
                      </div>
                    ))}
                    {(reportData.dispatchSummary?.statuses || []).length === 0 && (
                      <p className="text-sm text-[var(--text-secondary)]">No dispatch records matched the selected period.</p>
                    )}
                  </div>
                </DashboardPanel>

                <DashboardPanel title="User Balances" noBodyPadding>
                  <ResponsiveDataView
                    data={reportData.userBalances ?? []}
                    TableComponent={DataTable}
                    tableProps={{
                      data: reportData.userBalances ?? [],
                      columns: userBalanceColumns,
                      keyField: 'userId',
                    }}
                    keyField="userId"
                    renderMobileCard={(user: UserBalance): CardField[] => [
                      { label: 'User', value: user.userName, primary: true },
                      {
                        label: 'Balance',
                        value: (
                          <span className={`font-semibold ${user.currentBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--error)]'}`}>
                            {formatCurrency(Math.abs(user.currentBalance))}
                          </span>
                        ),
                      },
                    ]}
                  />
                </DashboardPanel>
              </>
            )}

            {/* User-wise Report */}
            {reportType === 'user-wise' && (
              <div className="space-y-4">
                {reportData.users?.map((user) => (
                  <DashboardPanel
                    key={user.userId}
                    title={user.userName}
                    description={user.email}
                    actions={
                      <div className={`text-xl font-bold ${user.currentBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--error)]'}`}>
                        {formatCurrency(Math.abs(user.currentBalance))}
                      </div>
                    }
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-[var(--text-secondary)]">Total Debit</p>
                        <p className="text-lg font-semibold text-[var(--error)]">{formatCurrency(user.totalDebit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-secondary)]">Total Credit</p>
                        <p className="text-lg font-semibold text-[var(--success)]">{formatCurrency(user.totalCredit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-secondary)]">Paid Shipments</p>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">{user.shipmentStats.paid}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-secondary)]">Due Shipments</p>
                        <p className="text-lg font-semibold text-[var(--warning)]">{user.shipmentStats.due}</p>
                      </div>
                    </div>
                  </DashboardPanel>
                ))}
              </div>
            )}

            {/* Shipment-wise Report */}
            {reportType === 'shipment-wise' && (
              <div className="space-y-6">
                <DashboardPanel title="Shipment Payment Details" noBodyPadding>
                  <ResponsiveDataView
                    data={reportData.shipments ?? []}
                    TableComponent={DataTable}
                    tableProps={{
                      data: reportData.shipments ?? [],
                      columns: shipmentColumns,
                      keyField: 'shipmentId',
                    }}
                    keyField="shipmentId"
                    renderMobileCard={(shipment: ShipmentReport): CardField[] => [
                      { label: 'Tracking', value: shipment.trackingNumber || '—', primary: true },
                      { label: 'Vehicle', value: shipment.vehicle },
                      {
                        label: 'Charged',
                        value: <span className="text-[var(--error)]">{formatCurrency(shipment.totalCharged)}</span>,
                      },
                      {
                        label: 'Paid',
                        value: <span className="text-[var(--success)]">{formatCurrency(shipment.totalPaid)}</span>,
                      },
                      {
                        label: 'Due',
                        value: <span className="text-[var(--warning)]">{formatCurrency(shipment.amountDue)}</span>,
                      },
                      {
                        label: 'Status',
                        value: (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            shipment.paymentStatus === 'COMPLETED'
                              ? 'bg-[rgba(var(--success-rgb),0.08)] text-[var(--success)]'
                              : 'bg-[rgba(var(--warning-rgb),0.08)] text-[var(--warning)]'
                          }`}>
                            {shipment.paymentStatus === 'COMPLETED' ? 'Paid' : 'Due'}
                          </span>
                        ),
                      },
                    ]}
                  />
                </DashboardPanel>

                {(reportData.shipments ?? []).some((shipment) => (shipment.expenses || []).some((expense) => expense.linkedCompanyLedgerEntry)) && (
                  <DashboardPanel title="Expense Recovery Drill-Through">
                    <div className="space-y-4">
                      {(reportData.shipments ?? []).map((shipment) => {
                        const linkedExpenses = (shipment.expenses || []).filter((expense) => expense.linkedCompanyLedgerEntry);

                        if (linkedExpenses.length === 0) {
                          return null;
                        }

                        return (
                          <div key={shipment.shipmentId} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicle}</p>
                                <p className="text-xs text-[var(--text-secondary)]">{linkedExpenses.length} linked recovery entr{linkedExpenses.length === 1 ? 'y' : 'ies'}</p>
                              </div>
                              <span className="text-sm font-semibold text-[var(--accent-gold)]">{formatCurrency(linkedExpenses.reduce((sum, expense) => sum + expense.amount, 0))}</span>
                            </div>

                            <div className="mt-3 space-y-2">
                              {linkedExpenses.map((expense) => (
                                <div key={expense.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                                  <div>
                                    <p className="text-sm text-[var(--text-primary)]">{expense.description}</p>
                                    <p className="text-xs text-[var(--text-secondary)]">{new Date(expense.date).toLocaleDateString()} • {expense.type}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-[var(--error)]">{formatCurrency(expense.amount)}</span>
                                    <button
                                      type="button"
                                      onClick={() => router.push(`/dashboard/finance/companies/${expense.linkedCompanyLedgerEntry!.companyId}?entryId=${expense.linkedCompanyLedgerEntry!.id}`)}
                                      className="rounded border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
                                    >
                                      Company Entry
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </DashboardPanel>
                )}
              </div>
            )}
          </>
        )}
      </DashboardSurface>
    </AdminRoute>
  );
}