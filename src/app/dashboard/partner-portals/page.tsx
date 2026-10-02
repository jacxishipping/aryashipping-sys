'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Building2, Users, Package, ShieldCheck } from 'lucide-react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, EmptyState, StatsCard, toast } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { hasPermission } from '@/lib/rbac';
import { useSession } from 'next-auth/react';

type PortalSummary = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  memberships?: Array<{ role: string }>;
  _count?: {
    memberships?: number;
    customers?: number;
    shipmentAssignments?: number;
  };
};

export default function PartnerPortalsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [portals, setPortals] = useState<PortalSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const canAccess = hasPermission(session?.user?.role, 'customers:manage') || hasPermission(session?.user?.role, 'users:manage');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !canAccess) {
      router.replace('/dashboard');
    }
  }, [canAccess, router, session, status]);

  const fetchPortals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/partner-portals', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load partner portals');
      }

      setPortals(data.portals || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load partner portals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && canAccess) {
      void fetchPortals();
    }
  }, [status, canAccess]);

  const totalMembers = portals.reduce((acc, p) => acc + (p._count?.memberships || 0), 0);
  const totalAssignedShipments = portals.reduce((acc, p) => acc + (p._count?.shipmentAssignments || 0), 0);

  const columns = useMemo<Column<PortalSummary>[]>(() => [
    { 
      key: 'name', 
      header: 'Partner Portal', 
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] border border-[rgba(var(--accent-gold-rgb),0.25)] flex items-center justify-center text-[var(--accent-gold)] shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-[var(--text-primary)]">
              {row.name}
            </div>
            <span className="font-mono text-xs text-[var(--text-secondary)]">{row.code || 'NO-CODE'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'memberships',
      header: 'Portal Members',
      render: (_, row) => (
        <span className="inline-flex items-center gap-1 font-semibold text-xs text-[var(--text-secondary)] bg-[rgba(var(--text-secondary-rgb),0.1)] px-2 py-0.5 rounded-full">
          <Users className="w-3 h-3" />
          {row._count?.memberships || 0}
        </span>
      ),
    },
    {
      key: 'customers',
      header: 'Clients Attached',
      render: (_, row) => row._count?.customers || 0,
    },
    {
      key: 'shipments',
      header: 'Assigned Shipments',
      render: (_, row) => (
        <span className="inline-flex items-center gap-1 font-bold text-xs text-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.1)] px-2.5 py-0.5 rounded-full">
          <Package className="w-3 h-3" />
          {row._count?.shipmentAssignments || 0}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex justify-end flex-nowrap whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <Link href={`/dashboard/partner-portals/${row.id}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">Manage Workspace</Button>
          </Link>
        </div>
      ),
    },
  ], []);

  if (status === 'loading' || !session || !canAccess) {
    return null;
  }

  return (
    <DashboardSurface>
      {/* Standardized Header */}
      <PageHeader
        showBreadcrumbs
        title="Partner Portals"
        description="Manage partner workspaces, delegating operational visibility and cargo consignments"
        actions={
          <Link href="/dashboard/partner-portals/new" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
              New Partner Portal
            </Button>
          </Link>
        }
      />

      {/* Summary Stats */}
      <DashboardGrid className="grid-cols-1 sm:grid-cols-3">
        <StatsCard
          icon={<Building2 className="w-5 h-5 text-[var(--accent-gold)]" />}
          title="Active Portals"
          value={portals.length}
          variant="default"
          size="md"
        />
        <StatsCard
          icon={<Users className="w-5 h-5 text-[var(--info)]" />}
          title="Portal Members"
          value={totalMembers}
          variant="info"
          size="md"
        />
        <StatsCard
          icon={<Package className="w-5 h-5 text-[var(--success-dark)]" />}
          title="Assigned Consignments"
          value={totalAssignedShipments}
          variant="success"
          size="md"
        />
      </DashboardGrid>

      {/* Main Table Panel */}
      <DashboardPanel
        title={`Partner Workspaces (${portals.length})`}
        description="All configured affiliate and partner organizations"
        fullHeight
      >
        {loading ? (
          <div className="text-[var(--text-secondary)] py-8 text-center">Loading partner portals...</div>
        ) : portals.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-10 h-10" />}
            title="No partner portals created"
            description="Create the first portal to start assigning shipments into dedicated partner workspaces."
            action={
              <Link href="/dashboard/partner-portals/new" style={{ textDecoration: 'none' }}>
                <Button variant="primary" icon={<Plus className="w-4 h-4" />}>Create First Portal</Button>
              </Link>
            }
          />
        ) : (
          <DataTable data={portals} columns={columns} keyField="id" />
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}
