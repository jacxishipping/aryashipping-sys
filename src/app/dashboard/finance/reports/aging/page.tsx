'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { Button, Breadcrumbs, PageHeader, LoadingState } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ResponsiveDataView, CardField } from '@/components/ui/MobileCardView';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import AdminRoute from '@/components/auth/AdminRoute';

interface ShipmentDetail {
  id: string;
  trackingNumber: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  amountDue: number;
  createdAt: string;
  ageInDays: number;
  price: number | null;
}

interface AgingReport {
  reportType: string;
  generatedAt: string;
  summary: {
    totalShipments: number;
    totalAmountDue: number;
    buckets: {
      [key: string]: {
        count: number;
        total: number;
        percentage: number;
        label: string;
      };
    };
  };
  details: {
    current: ShipmentDetail[];
    aging30: ShipmentDetail[];
    aging60: ShipmentDetail[];
    aging90: ShipmentDetail[];
  };
}

export default function AgingReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [report, setReport] = useState<AgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBucket, setSelectedBucket] = useState<'current' | 'aging30' | 'aging60' | 'aging90'>('current');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchReport();
  }, [session, status, router]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/due-aging');
      
      if (!response.ok) {
        throw new Error('Failed to fetch aging report');
      }

      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Error fetching aging report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case 'current':
        return 'text-[var(--success)] bg-[rgba(var(--success-rgb),0.08)] border-[rgba(var(--success-rgb),0.3)]';
      case 'aging30':
        return 'text-[var(--warning)] bg-[rgba(var(--warning-rgb),0.08)] border-[rgba(var(--warning-rgb),0.3)]';
      case 'aging60':
        // Orange between warning and error per status mapping (61-90 days)
        return 'text-[var(--status-orange-dark)] bg-[rgba(var(--status-orange-rgb),0.08)] border-[rgba(var(--status-orange-rgb),0.3)]';
      case 'aging90':
        return 'text-[var(--error)] bg-[rgba(var(--error-rgb),0.08)] border-[rgba(var(--error-rgb),0.3)]';
      default:
        return 'text-[var(--text-primary)]';
    }
  };

  const detailColumns = useMemo<Column<ShipmentDetail>[]>(() => [
    {
      key: 'trackingNumber',
      header: 'Tracking',
      sortable: true,
      render: (_, shipment) => (
        <Link
          href={`/dashboard/shipments/${shipment.id}`}
          className="text-[var(--accent-gold)] hover:underline"
        >
          {shipment.trackingNumber || '—'}
        </Link>
      ),
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      sortable: true,
      render: (_, shipment) => (
        <span className="text-sm text-[var(--text-primary)]">
          {shipment.vehicleMake} {shipment.vehicleModel}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      sortable: true,
      render: (_, shipment) => (
        <span className="text-sm text-[var(--text-primary)]">
          {shipment.user.name || shipment.user.email}
        </span>
      ),
    },
    {
      key: 'amountDue',
      header: 'Amount Due',
      sortable: true,
      render: (_, shipment) => (
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {formatCurrency(shipment.amountDue)}
        </span>
      ),
    },
    {
      key: 'ageInDays',
      header: 'Age (Days)',
      sortable: true,
      render: (_, shipment) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getBucketColor(selectedBucket)}`}>
          {shipment.ageInDays} days
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (_, shipment) => (
        <span className="text-sm text-[var(--text-primary)]">
          {formatDate(shipment.createdAt)}
        </span>
      ),
    },
  ], [selectedBucket]);

  if (status === 'loading' || loading) {
    return (
      <AdminRoute>
        <DashboardSurface>
          <div className="px-2 pt-2">
            <Breadcrumbs />
          </div>
          <LoadingState message="Loading aging report..." />
        </DashboardSurface>
      </AdminRoute>
    );
  }

  if (!report) {
    return (
      <AdminRoute>
        <DashboardSurface>
          <div className="px-2 pt-2">
            <Breadcrumbs />
          </div>
          <div className="text-center py-12 space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-[var(--text-secondary)] opacity-50" />
            <p className="text-[var(--text-secondary)]">Failed to load aging report</p>
            <Button onClick={fetchReport} variant="outline">Retry</Button>
          </div>
        </DashboardSurface>
      </AdminRoute>
    );
  }

  const selectedDetails = report.details[selectedBucket] || [];

  return (
    <AdminRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Due Aging Report"
          description="Track overdue payments and accounts receivable by age bucket"
          actions={
            <Link href="/dashboard/finance/reports">
              <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </Link>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current (0-30 days) */}
          <button
            onClick={() => setSelectedBucket('current')}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              selectedBucket === 'current' ? 'border-[var(--success)] bg-[rgba(var(--success-rgb),0.08)]' : 'border-[var(--border)] bg-[var(--panel)] hover:border-[rgba(var(--success-rgb),0.5)]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-[var(--success)]" />
              <span className="text-xs font-semibold text-[var(--success)]">
                {report.summary.buckets.current.percentage.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              {report.summary.buckets.current.label}
            </p>
            <p className="text-2xl font-bold text-[var(--success)]">
              {formatCurrency(report.summary.buckets.current.total)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {report.summary.buckets.current.count} shipments
            </p>
          </button>

          {/* Aging 31-60 days */}
          <button
            onClick={() => setSelectedBucket('aging30')}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              selectedBucket === 'aging30' ? 'border-[var(--warning)] bg-[rgba(var(--warning-rgb),0.08)]' : 'border-[var(--border)] bg-[var(--panel)] hover:border-[rgba(var(--warning-rgb),0.5)]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-[var(--warning)]" />
              <span className="text-xs font-semibold text-[var(--warning)]">
                {report.summary.buckets.aging30.percentage.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              {report.summary.buckets.aging30.label}
            </p>
            <p className="text-2xl font-bold text-[var(--warning)]">
              {formatCurrency(report.summary.buckets.aging30.total)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {report.summary.buckets.aging30.count} shipments
            </p>
          </button>

          {/* Aging 61-90 days */}
          <button
            onClick={() => setSelectedBucket('aging60')}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              selectedBucket === 'aging60' ? 'border-[var(--warning)] bg-[rgba(var(--warning-rgb),0.08)]' : 'border-[var(--border)] bg-[var(--panel)] hover:border-[rgba(var(--warning-rgb),0.5)]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-[var(--warning)]" />
              <span className="text-xs font-semibold text-[var(--warning)]">
                {report.summary.buckets.aging60.percentage.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              {report.summary.buckets.aging60.label}
            </p>
            <p className="text-2xl font-bold text-[var(--warning)]">
              {formatCurrency(report.summary.buckets.aging60.total)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {report.summary.buckets.aging60.count} shipments
            </p>
          </button>

          {/* Aging 90+ days */}
          <button
            onClick={() => setSelectedBucket('aging90')}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              selectedBucket === 'aging90' ? 'border-[var(--error)] bg-[rgba(var(--error-rgb),0.08)]' : 'border-[var(--border)] bg-[var(--panel)] hover:border-[rgba(var(--error-rgb),0.5)]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-5 h-5 text-[var(--error)]" />
              <span className="text-xs font-semibold text-[var(--error)]">
                {report.summary.buckets.aging90.percentage.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              {report.summary.buckets.aging90.label}
            </p>
            <p className="text-2xl font-bold text-[var(--error)]">
              {formatCurrency(report.summary.buckets.aging90.total)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {report.summary.buckets.aging90.count} shipments
            </p>
          </button>
        </div>

        {/* Total Summary Panel */}
        <DashboardPanel>
          <div className="flex items-center justify-between p-2">
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Total Outstanding</p>
              <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                {formatCurrency(report.summary.totalAmountDue)}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Across {report.summary.totalShipments} shipments
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-[var(--accent-gold)] opacity-70" />
          </div>
        </DashboardPanel>

        {/* Details Table Panel */}
        <DashboardPanel
          title={`${report.summary.buckets[selectedBucket].label} - Detailed View`}
          description={`Showing ${selectedDetails.length} shipment(s) in this aging category`}
          noBodyPadding
        >
          {selectedDetails.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No shipments in this category</p>
            </div>
          ) : (
            <ResponsiveDataView
              data={selectedDetails}
              TableComponent={DataTable}
              tableProps={{
                data: selectedDetails,
                columns: detailColumns,
                keyField: 'id',
              }}
              keyField="id"
              renderMobileCard={(shipment: ShipmentDetail): CardField[] => [
                {
                  label: 'Tracking',
                  value: shipment.trackingNumber || '—',
                  primary: true,
                },
                {
                  label: 'Vehicle',
                  value: `${shipment.vehicleMake ?? ''} ${shipment.vehicleModel ?? ''}`.trim() || '—',
                },
                {
                  label: 'User',
                  value: shipment.user.name || shipment.user.email,
                },
                {
                  label: 'Amount Due',
                  value: <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(shipment.amountDue)}</span>,
                },
                {
                  label: 'Age',
                  value: (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getBucketColor(selectedBucket)}`}>
                      {shipment.ageInDays} days
                    </span>
                  ),
                },
                {
                  label: 'Created',
                  value: formatDate(shipment.createdAt),
                },
              ]}
            />
          )}
        </DashboardPanel>
      </DashboardSurface>
    </AdminRoute>
  );
}