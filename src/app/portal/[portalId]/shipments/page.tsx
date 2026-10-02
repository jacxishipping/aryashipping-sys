'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Package,
  CheckSquare,
  CheckCircle2,
  Truck,
  User,
  Eye,
} from 'lucide-react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, ConfirmDialog, EmptyState, FormField, PageHeader, Select, Skeleton, SkeletonTable, toast } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';

type PortalCustomer = {
  id: string;
  name: string;
};

type ShipmentAssignment = {
  id: string;
  notes: string | null;
  noteSource?: 'MANUAL' | 'PORTAL_DEFAULT' | null;
  partnerCustomer: { id: string; name: string; email: string | null; phone: string | null } | null;
  shipment: {
    id: string;
    vehicleType: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    vehicleVIN: string | null;
    status: string;
    serviceType: string;
    createdAt: string;
  };
};

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  requireCustomerLinkForReady?: boolean;
};

function formatShipmentLabel(shipment: ShipmentAssignment['shipment']) {
  return [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType;
}

function formatStatusLabel(status: string) {
  return status.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function getPortalReadiness(portal: PortalInfo | null, assignment: ShipmentAssignment) {
  const requiresCustomerLink = portal?.requireCustomerLinkForReady !== false;

  if (requiresCustomerLink && !assignment.partnerCustomer) {
    return { label: 'Waiting for customer link', tone: 'warning' as const };
  }

  return { label: 'Ready for partner handling', tone: 'ready' as const };
}

function getAssignmentNoteSource(assignment: ShipmentAssignment) {
  if (assignment.noteSource === 'PORTAL_DEFAULT') {
    return { label: 'Portal default', tone: 'default' as const };
  }

  if (assignment.noteSource === 'MANUAL') {
    return { label: 'Manual note', tone: 'manual' as const };
  }

  return { label: 'No notes', tone: 'none' as const };
}

export default function PortalShipmentsPage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [assignments, setAssignments] = useState<ShipmentAssignment[]>([]);
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<'all' | 'ready' | 'not-ready'>('all');
  const [selectedCustomers, setSelectedCustomers] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<'LINK_CUSTOMER' | 'SET_NOTES' | ''>('');
  const [bulkCustomerId, setBulkCustomerId] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [bulkUnassignTargets, setBulkUnassignTargets] = useState<string[] | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shipmentsResponse, customersResponse] = await Promise.all([
        fetch(`/api/partner-portals/${portalId}/shipments`, { cache: 'no-store' }),
        fetch(`/api/partner-portals/${portalId}/customers`, { cache: 'no-store' }),
      ]);

      const shipmentsData = await shipmentsResponse.json();
      const customersData = await customersResponse.json();

      if (!shipmentsResponse.ok) {
        throw new Error(shipmentsData.error || 'Failed to load assigned shipments');
      }

      if (!customersResponse.ok) {
        throw new Error(customersData.error || 'Failed to load customers');
      }

      setPortal(shipmentsData.portal);
      setAssignments(shipmentsData.assignments || []);
      setCustomers(customersData.customers || []);
      setLastRefreshedAt(new Date());
      setSelectedCustomers(
        Object.fromEntries(
          (shipmentsData.assignments || []).map((assignment: ShipmentAssignment) => [assignment.shipment.id, assignment.partnerCustomer?.id || ''])
        )
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load portal shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [portalId]);

  const filteredAssignments = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return assignments;
    }

    return assignments.filter((assignment) => {
      const readiness = getPortalReadiness(portal, assignment).tone;
      if (readinessFilter === 'ready' && readiness !== 'ready') {
        return false;
      }

      if (readinessFilter === 'not-ready' && readiness === 'ready') {
        return false;
      }

      const vehicle = formatShipmentLabel(assignment.shipment).toLowerCase();
      const vin = assignment.shipment.vehicleVIN?.toLowerCase() || '';
      const status = assignment.shipment.status.toLowerCase();
      const customer = assignment.partnerCustomer?.name?.toLowerCase() || '';
      return vehicle.includes(value) || vin.includes(value) || status.includes(value) || customer.includes(value);
    });
  }, [assignments, portal, query, readinessFilter]);

  const linkedCount = filteredAssignments.filter((assignment) => assignment.partnerCustomer).length;
  const unlinkedCount = filteredAssignments.length - linkedCount;
  const uniqueStatuses = new Set(filteredAssignments.map((assignment) => assignment.shipment.status)).size;
  const readyCount = filteredAssignments.filter((assignment) => getPortalReadiness(portal, assignment).tone === 'ready').length;
  const topCustomers = useMemo(() => {
    const counts = new Map<string, number>();
    assignments.forEach((assignment) => {
      if (assignment.partnerCustomer?.name) {
        counts.set(assignment.partnerCustomer.name, (counts.get(assignment.partnerCustomer.name) || 0) + 1);
      }
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [assignments]);

  const handleLinkCustomer = async (shipmentId: string) => {
    try {
      setSavingId(shipmentId);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerCustomerId: selectedCustomers[shipmentId] || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update assignment');
      }

      toast.success('Shipment customer link updated');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update shipment assignment');
    } finally {
      setSavingId(null);
    }
  };

  const runBulkAction = async (
    action: 'UNASSIGN' | 'LINK_CUSTOMER' | 'SET_NOTES' | 'CLEAR_NOTES',
    shipmentIds: string[],
    options?: { partnerCustomerId?: string | null; notes?: string },
  ) => {
    if (shipmentIds.length === 0) {
      toast.error('Select at least one shipment first');
      return;
    }

    try {
      setBulkBusy(true);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          shipmentIds,
          ...(action === 'LINK_CUSTOMER' ? { partnerCustomerId: options?.partnerCustomerId || null } : {}),
          ...(action === 'SET_NOTES' ? { notes: options?.notes || '' } : {}),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk action failed');
      }

      const labels: Record<string, string> = {
        UNASSIGN: 'removed from portal',
        LINK_CUSTOMER: options?.partnerCustomerId ? 'linked to customer' : 'unlinked from customers',
        SET_NOTES: 'notes updated',
        CLEAR_NOTES: 'notes cleared',
      };

      toast.success(`${data.updatedCount} shipment${data.updatedCount === 1 ? '' : 's'} ${labels[action]}`);
      setBulkAction('');
      setBulkCustomerId('');
      setBulkNotes('');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bulk action failed');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = (selectedIds: string[]) => {
    setBulkUnassignTargets(selectedIds);
  };

  const handleBulkLinkCustomer = (selectedIds: string[]) => {
    void runBulkAction('LINK_CUSTOMER', selectedIds, {
      partnerCustomerId: bulkCustomerId || null,
    });
  };

  const handleBulkSetNotes = (selectedIds: string[]) => {
    void runBulkAction('SET_NOTES', selectedIds, { notes: bulkNotes });
  };

  const columns = useMemo<Column<ShipmentAssignment>[]>(() => [
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (_, row) => [row.shipment.vehicleYear, row.shipment.vehicleMake, row.shipment.vehicleModel].filter(Boolean).join(' ') || row.shipment.vehicleType,
    },
    {
      key: 'vin',
      header: 'VIN',
      render: (_, row) => row.shipment.vehicleVIN || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => row.shipment.status,
    },
    {
      key: 'customer',
      header: 'My Customer',
      render: (_, row) => row.partnerCustomer?.name || 'Unassigned',
    },
    {
      key: 'readiness',
      header: 'Ready State',
      render: (_, row) => {
        const readiness = getPortalReadiness(portal, row);
        return (
          <span
            role="status"
            aria-label={readiness.label}
            className={`px-3 py-1 rounded-full inline-flex items-center text-xs font-bold ${
              readiness.tone === 'ready'
                ? 'bg-[rgba(var(--success-rgb),0.12)] text-[var(--success)]'
                : 'bg-[rgba(var(--warning-rgb),0.14)] text-[var(--warning)]'
            }`}
          >
            {readiness.label}
          </span>
        );
      },
    },
    {
      key: 'noteSource',
      header: 'Notes Source',
      render: (_, row) => {
        const noteSource = getAssignmentNoteSource(row);
        return (
          <span
            className={`px-3 py-1 rounded-full inline-flex items-center text-xs font-bold ${
              noteSource.tone === 'manual'
                ? 'bg-[rgba(var(--brand-primary-rgb),0.12)] text-[var(--brand-primary)]'
                : noteSource.tone === 'default'
                ? 'bg-[rgba(var(--info-rgb),0.12)] text-[var(--info)]'
                : 'bg-[rgba(var(--text-primary-rgb),0.08)] text-[var(--text-secondary)]'
            }`}
          >
            {noteSource.label}
          </span>
        );
      },
    },
    {
      key: 'assign',
      header: 'Link To Customer',
      render: (_, row) => (
        <div className="flex gap-2 items-center min-w-[280px]">
          <select
            aria-label="Link to customer"
            value={selectedCustomers[row.shipment.id] || ''}
            onChange={(event) => setSelectedCustomers((prev) => ({ ...prev, [row.shipment.id]: event.target.value }))}
            className="flex-1 h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
          >
            <option value="">Unassigned</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => void handleLinkCustomer(row.shipment.id)} disabled={savingId === row.shipment.id}>
            {savingId === row.shipment.id ? 'Saving...' : 'Save'}
          </Button>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex justify-end flex-nowrap whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <Link href={`/portal/${portalId}/shipments/${row.shipment.id}`} className="no-underline">
            <Button variant="outline" size="sm" icon={<Eye className="w-4 h-4" />}>
              View
            </Button>
          </Link>
        </div>
      ),
    },
  ], [customers, portal, portalId, savingId, selectedCustomers]);

  return (
    <DashboardSurface>
      <PageHeader
        title={portal ? `${portal.companyLabel || portal.name} Shipments` : 'Assigned Shipments'}
        description="Work through the shipment layer your team received from the main system, then map each unit to your own portal customers."
        meta={[
          { label: 'Assigned', value: assignments.length, helper: 'Shared from the main workspace' },
          { label: 'Linked', value: assignments.filter((assignment) => assignment.partnerCustomer).length, helper: 'Already mapped to portal customers' },
          { label: 'Customers', value: customers.length, helper: 'Available for assignment handoff' },
        ]}
        actions={
          <div className="flex gap-2 items-center flex-wrap">
            {lastRefreshedAt ? (
              <span className="text-xs text-[var(--text-secondary)]" aria-live="polite">
                Updated {lastRefreshedAt.toLocaleTimeString()}
              </span>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => void fetchData()} disabled={loading}>
              Refresh
            </Button>
            <Link href={`/portal/${portalId}/customers`} className="no-underline">
              <Button variant="outline" size="sm">Open Customers</Button>
            </Link>
          </div>
        }
      />

      {loading ? (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--panel)] grid gap-2">
                <Skeleton variant="text" width="60%" height={14} />
                <Skeleton variant="text" width="35%" height={34} />
              </div>
            ))}
          </DashboardGrid>
          <DashboardPanel title="Shipment Workspace" description="Search, review, and link assigned shipments to portal customers.">
            <div className="grid gap-4">
              <Skeleton variant="rounded" height={56} />
              <Skeleton variant="rounded" height={48} />
              <SkeletonTable rows={6} columns={5} />
            </div>
          </DashboardPanel>
        </>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--brand-primary-rgb),0.08)] grid gap-1">
              <div className="text-xs tracking-wider uppercase text-[var(--text-secondary)]">Assigned Units</div>
              <div className="text-2xl font-extrabold text-[var(--text-primary)]">{filteredAssignments.length}</div>
              <Truck className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--accent-rgb),0.08)] grid gap-1">
              <div className="text-xs tracking-wider uppercase text-[var(--text-secondary)]">Customer Linked</div>
              <div className="text-2xl font-extrabold text-[var(--text-primary)]">{linkedCount}</div>
              <CheckSquare className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--text-primary-rgb),0.05)] grid gap-1">
              <div className="text-xs tracking-wider uppercase text-[var(--text-secondary)]">Needs Handoff</div>
              <div className="text-2xl font-extrabold text-[var(--text-primary)]">{unlinkedCount}</div>
              <User className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--warning-rgb),0.08)] grid gap-1">
              <div className="text-xs tracking-wider uppercase text-[var(--text-secondary)]">Active Statuses</div>
              <div className="text-2xl font-extrabold text-[var(--text-primary)]">{uniqueStatuses}</div>
              <Package className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--success-rgb),0.08)] grid gap-1">
              <div className="text-xs tracking-wider uppercase text-[var(--text-secondary)]">Ready Now</div>
              <div className="text-2xl font-extrabold text-[var(--text-primary)]">{readyCount}</div>
              <CheckCircle2 className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.35fr_0.9fr]">
            <DashboardPanel title="Shipment Workspace" description="Search, review, and link assigned shipments to portal customers.">
              <div className="grid gap-4">
                <FormField
                  label="Search shipments"
                  placeholder="Search by vehicle, VIN, status, or customer"
                  value={query}
                  onChange={(value) => setQuery(value)}
                />
                <div className="max-w-[240px]">
                  <Select
                    label="Ready filter"
                    value={readinessFilter}
                    onChange={(value) => setReadinessFilter(String(value) as 'all' | 'ready' | 'not-ready')}
                    options={[
                      { value: 'all', label: 'All shipments' },
                      { value: 'ready', label: 'Ready only' },
                      { value: 'not-ready', label: 'Not ready only' },
                    ]}
                  />
                </div>

                <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--panel)] grid gap-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs font-semibold tracking-wider uppercase text-[var(--text-secondary)]">
                      Bulk actions
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Select rows in the table below, then apply an action to all of them at once.
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="min-w-[200px]">
                      <Select
                        size="small"
                        label="Action"
                        value={bulkAction}
                        onChange={(value) => setBulkAction(String(value) as 'LINK_CUSTOMER' | 'SET_NOTES' | '')}
                        options={[
                          { value: '', label: 'Choose action...' },
                          { value: 'LINK_CUSTOMER', label: 'Link / unlink customer' },
                          { value: 'SET_NOTES', label: 'Set notes' },
                        ]}
                      />
                    </div>

                    {bulkAction === 'LINK_CUSTOMER' ? (
                      <div className="min-w-[220px]">
                        <Select
                          size="small"
                          label="Customer"
                          value={bulkCustomerId}
                          onChange={(value) => setBulkCustomerId(String(value))}
                          options={[
                            { value: '', label: 'Unassigned (unlink all)' },
                            ...customers.map((customer) => ({ value: customer.id, label: customer.name })),
                          ]}
                        />
                      </div>
                    ) : null}

                    {bulkAction === 'SET_NOTES' ? (
                      <div className="min-w-[260px] max-w-[380px]">
                        <FormField
                          label="Notes"
                          placeholder="Note to apply to selected shipments"
                          value={bulkNotes}
                          onChange={(value) => setBulkNotes(value)}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!bulkAction || bulkBusy || selectedShipmentIds.length === 0}
                      onClick={() => {
                        if (bulkAction === 'LINK_CUSTOMER') {
                          handleBulkLinkCustomer(selectedShipmentIds);
                        } else if (bulkAction === 'SET_NOTES') {
                          handleBulkSetNotes(selectedShipmentIds);
                        }
                      }}
                    >
                      {bulkBusy
                        ? 'Applying...'
                        : `Apply to ${selectedShipmentIds.length} selected`}
                    </Button>
                    {selectedShipmentIds.length === 0 && !bulkBusy ? (
                      <div className="text-xs text-[var(--warning)] font-semibold" role="status">
                        Select shipments using the checkboxes in the table to enable this.
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Tip: use the checkboxes in the table and the toolbar that appears above it to remove shipments from the portal in bulk. Removing a shipment only unassigns it from this portal — the shipment itself stays untouched in the main system.
                  </p>
                </div>

                {assignments.length === 0 ? (
                  <EmptyState icon={<Package className="w-8 h-8 text-[var(--text-secondary)]" />} title="No assigned shipments" description="Your portal does not have any shipments assigned yet. Ask the internal team to assign shipments to this portal first." />
                ) : filteredAssignments.length === 0 ? (
                  <div className="text-sm text-[var(--text-secondary)]">No shipments matched the current search and ready-state filters.</div>
                ) : (
                  <DataTable
                    data={filteredAssignments}
                    columns={columns}
                    keyField="id"
                    selectable
                    onSelectionChange={setSelectedShipmentIds}
                    onDelete={handleBulkDelete}
                    onExport={(rows) => {
                      const csv = [
                        ['Vehicle', 'VIN', 'Status', 'Customer', 'Ready State'].join(','),
                        ...rows.map((row) => [
                          formatShipmentLabel(row.shipment),
                          row.shipment.vehicleVIN || '',
                          row.shipment.status,
                          row.partnerCustomer?.name || 'Unassigned',
                          getPortalReadiness(portal, row).label,
                        ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')),
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const anchor = document.createElement('a');
                      anchor.href = url;
                      anchor.download = `portal-shipments-${new Date().toISOString().slice(0, 10)}.csv`;
                      anchor.click();
                      URL.revokeObjectURL(url);
                    }}
                  />
                )}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Assignment Board" description="Use customer mapping to turn shared logistics into partner-owned workload.">
              <div className="grid gap-4">
                <div className="p-4 rounded-xl bg-[rgba(var(--brand-primary-rgb),0.07)]">
                  <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)]">Coverage</div>
                  <div className="text-2xl font-extrabold text-[var(--text-primary)]">{assignments.length === 0 ? '0%' : `${Math.round((assignments.filter((assignment) => assignment.partnerCustomer).length / assignments.length) * 100)}%`}</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {assignments.filter((assignment) => assignment.partnerCustomer).length} of {assignments.length} shipments are already linked to portal customers.
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)]">Top customer destinations</div>
                  {topCustomers.length === 0 ? (
                    <div className="text-sm text-[var(--text-secondary)]">No shipment links have been created yet.</div>
                  ) : (
                    topCustomers.map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-[rgba(var(--text-primary-rgb),0.04)]">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{name}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{count} linked</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="grid gap-2">
                  <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)]">Recent portal-visible units</div>
                  {assignments.slice(0, 4).map((assignment) => (
                    <div key={assignment.id} className="border border-[var(--border)] rounded-xl p-3 grid gap-1">
                      <div className="text-sm font-bold text-[var(--text-primary)]">{formatShipmentLabel(assignment.shipment)}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{formatStatusLabel(assignment.shipment.status)}</div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {assignment.partnerCustomer?.name || 'Awaiting portal customer link'}
                      </div>
                      <div className={`text-xs font-bold ${getAssignmentNoteSource(assignment).tone === 'manual' ? 'text-[var(--brand-primary)]' : getAssignmentNoteSource(assignment).tone === 'default' ? 'text-[var(--info)]' : 'text-[var(--text-secondary)]'}`}>
                        {getAssignmentNoteSource(assignment).label}
                      </div>
                      <div className={`text-xs font-bold ${getPortalReadiness(portal, assignment).tone === 'ready' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                        {getPortalReadiness(portal, assignment).label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardPanel>
          </DashboardGrid>
        </>
      )}

      <ConfirmDialog
        open={bulkUnassignTargets !== null}
        onClose={() => setBulkUnassignTargets(null)}
        onConfirm={() => {
          if (bulkUnassignTargets) {
            void runBulkAction('UNASSIGN', bulkUnassignTargets);
          }
          setBulkUnassignTargets(null);
        }}
        title="Remove shipments from portal"
        message={`Remove ${bulkUnassignTargets?.length || 0} shipment${(bulkUnassignTargets?.length || 0) === 1 ? '' : 's'} from this portal? The shipments stay in the main system but will no longer be visible to this portal.`}
        confirmText="Remove"
        severity="warning"
        loading={bulkBusy}
      />
    </DashboardSurface>
  );
}