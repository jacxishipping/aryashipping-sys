'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FolderGit2, ArrowRight, Package, Users, UserCheck } from 'lucide-react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PageHeader, toast } from '@/components/design-system';

type PortalSummary = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  memberships?: Array<{ role: string }>;
  _count?: {
    customers?: number;
    shipmentAssignments?: number;
  };
};

export default function PortalHomePage() {
  const [portals, setPortals] = useState<PortalSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortals = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/partner-portals', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load portals');
        }

        setPortals(data.portals || []);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load your portals');
      } finally {
        setLoading(false);
      }
    };

    void fetchPortals();
  }, []);

  const totals = useMemo(() => {
    return portals.reduce(
      (accumulator, portal) => {
        accumulator.customers += portal._count?.customers || 0;
        accumulator.shipments += portal._count?.shipmentAssignments || 0;
        accumulator.active += portal.isActive ? 1 : 0;
        return accumulator;
      },
      { customers: 0, shipments: 0, active: 0 },
    );
  }, [portals]);

  return (
    <DashboardSurface>
      <PageHeader
        title="Partner Workspaces"
        description="A partner-facing slice of the main system where each workspace carries its own shipments, customers, member access, and activity trail."
        meta={[
          { label: 'Workspaces', value: portals.length, helper: 'Portal environments assigned to you' },
          { label: 'Shipments', value: totals.shipments, helper: 'Visible across all partner workspaces' },
          { label: 'Customers', value: totals.customers, helper: 'Portal-managed downstream accounts' },
        ]}
      />

      <DashboardPanel title="My Portals" description="Open a workspace to manage partner shipments, downstream customers, and member access in one place.">
        {loading ? (
          <div className="text-[var(--text-secondary)] text-sm py-4">Loading portals...</div>
        ) : portals.length === 0 ? (
          <EmptyState icon={<FolderGit2 className="w-12 h-12" />} title="No portal access" description="You are signed in, but no partner portal workspace has been assigned to your account yet." />
        ) : (
          <DashboardGrid className="grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {portals.map((portal) => (
              <div
                key={portal.id}
                className="border border-[var(--border)] bg-gradient-to-b from-[rgba(var(--panel-rgb),0.92)] to-[rgba(var(--brand-primary-rgb),0.05)] rounded-2xl p-5 grid gap-4 shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
              >
                <div className="flex justify-between gap-3 items-start">
                  <div>
                    <h3 className="font-bold text-base tracking-tight text-[var(--text-primary)]">{portal.name}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {portal.code || 'No workspace code'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${portal.isActive ? 'bg-[rgba(var(--brand-primary-rgb),0.12)] text-[var(--brand-primary)]' : 'bg-[var(--background)] text-[var(--text-secondary)]'}`}>
                    {portal.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-[rgba(var(--brand-primary-rgb),0.08)]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Shipments</span>
                      <Package className="w-4 h-4 text-[var(--text-secondary)]" />
                    </div>
                    <span className="text-lg font-bold text-[var(--text-primary)]">{portal._count?.shipmentAssignments || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[rgba(var(--accent-rgb),0.10)]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Customers</span>
                      <Users className="w-4 h-4 text-[var(--text-secondary)]" />
                    </div>
                    <span className="text-lg font-bold text-[var(--text-primary)]">{portal._count?.customers || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[rgba(var(--text-primary-rgb),0.05)]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Role</span>
                      <UserCheck className="w-4 h-4 text-[var(--text-secondary)]" />
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">{portal.memberships?.[0]?.role || 'Member'}</span>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Use this workspace as the partner-facing operating layer for assigned vehicles, customer handoffs, and shared member access.
                </p>

                <div className="flex gap-2 flex-wrap pt-1">
                  <Link href={`/portal/${portal.id}`}>
                    <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />} iconPosition="end">
                      Open Workspace
                    </Button>
                  </Link>
                  <Link href={`/portal/${portal.id}/shipments`}>
                    <Button variant="outline" size="sm">Shipments</Button>
                  </Link>
                  <Link href={`/portal/${portal.id}/customers`}>
                    <Button variant="outline" size="sm">Customers</Button>
                  </Link>
                </div>

                <div className="flex gap-4 text-xs text-[var(--text-secondary)] flex-wrap pt-2 border-t border-[var(--border)]">
                  <span>{portal.isActive ? 'Workspace is live for partner operations' : 'Workspace is currently inactive'}</span>
                  <span>{portal.memberships?.[0]?.role === 'ADMIN' ? 'You can manage members and activity' : 'You have member-level access'}</span>
                </div>
              </div>
            ))}
          </DashboardGrid>
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}