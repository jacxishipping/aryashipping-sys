'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Package,
  User as UserIcon,
  Layers,
  RefreshCcw,
  Truck,
  HandCoins,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  BarChart,
  Bar,
} from 'recharts';
import { 
  PageHeader,
  Breadcrumbs,
  Button, 
  StatsCard, 
  LoadingState 
} from '@/components/design-system';

import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { getDispatchStatusLabel } from '@/lib/dispatch-workflow';

interface SummaryRow {
  totalShipments: number;
  activeShipments: number;
  activeDispatches: number;
  adminUsers: number;
  totalRevenue: number;
  totalDispatchSpend: number;
  overdueInvoices: number;
  activeContainers: number;
}

interface StatusDatum {
  status: string;
  count: number;
}

interface MonthDatum {
  month: string;
  count?: number;
  totalUSD?: number;
}

interface InvoiceStatusDatum {
  status: string;
  count: number;
  totalUSD: number;
}

interface OutstandingInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalUSD: number;
  dueDate: string | null;
}

interface TopCustomer {
  userId: string;
  name: string;
  email: string;
  shipmentCount: number;
  revenue: number;
  lastShipmentAt: string | null;
}

interface AnalyticsPayload {
  summary: SummaryRow;
  shipmentsByStatus: StatusDatum[];
  dispatchesByStatus: StatusDatum[];
  shipmentsByMonth: Array<Required<Pick<MonthDatum, 'month' | 'count'>>>;
  revenueByMonth: Array<Required<Pick<MonthDatum, 'month' | 'totalUSD'>>>;
  dispatchSpendByMonth: Array<Required<Pick<MonthDatum, 'month' | 'totalUSD'>>>;
  invoiceStatusDistribution: InvoiceStatusDatum[];
  outstandingInvoices: OutstandingInvoice[];
  topCustomers: TopCustomer[];
  lastUpdated: string;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !isAdmin) {
      router.replace('/dashboard');
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/analytics');
        if (!response.ok) throw new Error('Failed to load analytics payload.');
        const payload: AnalyticsPayload = await response.json();
        setData(payload);
        setError(null);
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unexpected analytics error.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [session, status, isAdmin, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/analytics', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to refresh analytics.');
      const payload: AnalyticsPayload = await response.json();
      setData(payload);
      setError(null);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unexpected analytics error.');
    } finally {
      setRefreshing(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (!data?.summary) return [];
    const summary = data.summary;
    return [
      {
        label: 'Total Shipments',
        value: summary.totalShipments,
        icon: <Package style={{ fontSize: 18 }} />,
        description: 'All shipments recorded',
        variant: 'default',
      },
      {
        label: 'Active Shipments',
        value: summary.activeShipments,
        icon: <Activity style={{ fontSize: 18 }} />,
        description: 'Dispatching or in transit',
        variant: 'info',
      },
      {
        label: 'Total Revenue',
        value: formatCurrency(summary.totalRevenue),
        icon: <TrendingUp style={{ fontSize: 18 }} />,
        description: 'Paid invoices',
        variant: 'success',
      },
      {
        label: 'Active Dispatches',
        value: summary.activeDispatches,
        icon: <Truck style={{ fontSize: 18 }} />,
        description: 'Pending to port handoff',
        variant: 'warning',
      },
      {
        label: 'Dispatch Spend',
        value: formatCurrency(summary.totalDispatchSpend),
        icon: <HandCoins style={{ fontSize: 18 }} />,
        description: 'Logged dispatch expenses',
        variant: 'secondary',
      },
      {
        label: 'Team Admins',
        value: summary.adminUsers,
        icon: <UserIcon style={{ fontSize: 18 }} />,
        description: 'Dashboard access',
        variant: 'secondary',
      },
      {
        label: 'Overdue Invoices',
        value: summary.overdueInvoices,
        icon: <AlertTriangle style={{ fontSize: 18 }} />,
        description: 'Past due date',
        variant: 'error',
      },
      {
        label: 'Active Containers',
        value: summary.activeContainers,
        icon: <Layers style={{ fontSize: 18 }} />,
        description: 'Assigned & active',
        variant: 'warning',
      },
    ];
  }, [data]);

  if (status === 'loading' || loading) {
    return <LoadingState fullScreen message="Loading analytics..." />;
  }

  if (!session || !isAdmin) {
    return null;
  }

  // Handle error state gracefully, showing error message even if data is null
  if (error && !data) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <div className="px-4 pt-4">
            <Breadcrumbs />
          </div>
          <div className="mx-4 my-8 rounded-xl border border-[var(--error)] bg-[rgba(var(--error-rgb),0.08)] p-8 text-[var(--error)] flex flex-col items-center gap-4">
            <AlertTriangle size={48} />
            <div className="text-xl font-semibold">Failed to load analytics</div>
            <p className="text-sm">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  // If no data and no error, show error state (shouldn't happen but handle gracefully)
  if (!data) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <div className="px-4 pt-4">
            <Breadcrumbs />
          </div>
          <div className="mx-4 my-8 rounded-xl border border-[var(--error)] bg-[rgba(var(--error-rgb),0.08)] p-8 text-[var(--error)] flex flex-col items-center gap-4">
            <AlertTriangle size={48} />
            <div className="text-xl font-semibold">No data available</div>
            <p className="text-sm">Unable to load analytics data. Please try refreshing the page.</p>
            <Button variant="outline" onClick={handleRefresh}>
              Refresh
            </Button>
          </div>
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  const headerMeta = [
    { label: 'Shipments', value: data?.summary?.totalShipments ?? 0 },
    { label: 'Revenue', value: formatCurrency(data?.summary?.totalRevenue ?? 0) },
    { label: 'Admins', value: data?.summary?.adminUsers ?? 0 },
  ];

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Analytics"
          description="Financial and operational intelligence updated in real time"
          meta={headerMeta}
          actions={
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCcw size={14} />}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              Refresh
            </Button>
          }
        />

      {error && (
        <div className="mx-4 md:mx-6 rounded-xl border border-[var(--error)] bg-[rgba(var(--error-rgb),0.08)] px-5 py-3 text-[var(--error)] text-sm">
          {error}
        </div>
      )}

      <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card, index) => (
          <StatsCard
            key={card.label}
            icon={card.icon}
            title={card.label}
            value={card.value}
            subtitle={card.description}
            variant={card.variant as any}
            size="md"
            delay={index * 0.1}
          />
        ))}
      </DashboardGrid>

      <DashboardGrid className="lg:grid-cols-2">
        <DashboardPanel title="Shipment volume" description="Six month rolling window" fullHeight>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.shipmentsByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                <ChartTooltip contentStyle={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                <Line type="monotone" dataKey="count" stroke="var(--accent-gold)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Revenue (USD)" description="Paid invoices (six months)" fullHeight>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                <ChartTooltip
                  contentStyle={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                />
                <Bar dataKey="totalUSD" fill="var(--accent-gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Dispatch spend (USD)" description="Dispatch expenses over six months" fullHeight>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dispatchSpendByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                <ChartTooltip
                  contentStyle={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                />
                <Bar dataKey="totalUSD" fill="var(--warning)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Dispatch status mix" description="Current workflow distribution" fullHeight>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(data.dispatchesByStatus || []).map((item) => (
              <div
                key={item.status}
                className="border border-[var(--border)] rounded-xl p-4 bg-[var(--panel)]"
              >
                <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
                  {getDispatchStatusLabel(item.status)}
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                  {item.count}
                </div>
              </div>
            ))}
            {(data.dispatchesByStatus || []).length === 0 && (
              <div className="text-sm text-[var(--text-secondary)]">
                No dispatch activity recorded yet.
              </div>
            )}
          </div>
        </DashboardPanel>
      </DashboardGrid>
    </DashboardSurface>
    </ProtectedRoute>
  );
}