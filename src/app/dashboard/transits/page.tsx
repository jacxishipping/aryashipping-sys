'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Package, Pencil, Plus, Search, Trash2, Truck } from 'lucide-react';
import AdminRoute from '@/components/auth/AdminRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, StatsCard, toast, CopyButton, StatusFilterPills, StatusBadge, Modal, FormField, Select } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';

interface Company {
  id: string;
  name: string;
  code: string | null;
}

interface TransitEventSummary {
  id: string;
  companyId: string;
  origin: string;
  destination: string;
  status: string;
  company: Company;
}

interface Transit {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  dispatchDate: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  cost: number | null;
  notes: string | null;
  createdAt: string;
  currentEvent: TransitEventSummary | null;
  currentCompany: Company | null;
  _count: {
    shipments: number;
    events: number;
    expenses: number;
  };
}

const editableStatusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'ARRIVED', label: 'Arrived' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function TransitsPage() {
  const router = useRouter();
  const confirmAction = useConfirmAction();
  const [transits, setTransits] = useState<Transit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingTransitId, setEditingTransitId] = useState<string | null>(null);
  const [deletingTransitId, setDeletingTransitId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    origin: 'Dubai, UAE',
    destination: 'Kabul, Afghanistan',
    dispatchDate: '',
    estimatedDelivery: '',
    cost: '',
    notes: '',
  });
  const [editFormData, setEditFormData] = useState({
    origin: '',
    destination: '',
    status: 'PENDING',
    dispatchDate: '',
    estimatedDelivery: '',
    actualDelivery: '',
    cost: '',
    notes: '',
  });

  const fetchTransits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const response = await fetch(`/api/transits?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch');
      setTransits(data.transits || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load transits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTransits();
  }, [search, statusFilter]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') setIsShiftPressed(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleCreate = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/transits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: formData.origin,
          destination: formData.destination,
          dispatchDate: formData.dispatchDate || undefined,
          estimatedDelivery: formData.estimatedDelivery || undefined,
          cost: formData.cost ? parseFloat(formData.cost) : undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create transit');

      toast.success(`Transit ${data.transit.referenceNumber} created`);
      setOpenCreate(false);
      setFormData({ origin: 'Dubai, UAE', destination: 'Kabul, Afghanistan', dispatchDate: '', estimatedDelivery: '', cost: '', notes: '' });
      await fetchTransits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create transit');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTransit = async (transit: Transit) => {
    const confirmed = await confirmAction({
      title: 'Delete Transit',
      message: `Delete transit ${transit.referenceNumber}? This action cannot be undone.`,
      confirmText: 'Delete transit',
      severity: 'error',
    });
    if (!confirmed) return;

    try {
      setDeletingTransitId(transit.id);
      const response = await fetch(`/api/transits/${transit.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete transit');

      toast.success(`Transit ${transit.referenceNumber} deleted`);
      await fetchTransits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete transit');
    } finally {
      setDeletingTransitId(null);
    }
  };

  const handleOpenEdit = (transit: Transit) => {
    if (transit.status === 'DELIVERED') {
      toast.error('Use the transit detail page to review delivery confirmation records for delivered transits');
      router.push(`/dashboard/transits/${transit.id}`);
      return;
    }
    setEditingTransitId(transit.id);
    setEditFormData({
      origin: transit.origin,
      destination: transit.destination,
      status: transit.status,
      dispatchDate: transit.dispatchDate ? transit.dispatchDate.slice(0, 10) : '',
      estimatedDelivery: transit.estimatedDelivery ? transit.estimatedDelivery.slice(0, 10) : '',
      actualDelivery: transit.actualDelivery ? transit.actualDelivery.slice(0, 10) : '',
      cost: transit.cost != null ? String(transit.cost) : '',
      notes: transit.notes || '',
    });
    setOpenEdit(true);
  };

  const handleUpdateTransit = async () => {
    if (!editingTransitId) return;

    try {
      setEditing(true);
      const response = await fetch(`/api/transits/${editingTransitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: editFormData.origin,
          destination: editFormData.destination,
          status: editFormData.status,
          dispatchDate: editFormData.dispatchDate || null,
          estimatedDelivery: editFormData.estimatedDelivery || null,
          cost: editFormData.cost ? parseFloat(editFormData.cost) : null,
          notes: editFormData.notes || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update transit');
      }

      toast.success('Transit updated successfully');
      setOpenEdit(false);
      setEditingTransitId(null);
      await fetchTransits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update transit');
    } finally {
      setEditing(false);
    }
  };

  const stats = useMemo(() => ({
    total: transits.length,
    active: transits.filter(t => ['DISPATCHED', 'IN_TRANSIT', 'ARRIVED'].includes(t.status)).length,
    delivered: transits.filter(t => t.status === 'DELIVERED').length,
    pending: transits.filter(t => t.status === 'PENDING').length,
  }), [transits]);

  const columns = useMemo<Column<Transit>[]>(() => [
    {
      key: 'referenceNumber',
      header: 'Reference',
      sortable: true,
      render: (_, row) => (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{row.referenceNumber}</span>
            <CopyButton value={row.referenceNumber} label="Transit #" />
          </Box>
          <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.currentCompany?.name || 'No current event company'}</Box>
        </Box>
      ),
    },
    {
      key: 'origin',
      header: 'Route',
      render: (_, row) => (
        <Box sx={{ fontSize: '0.8rem' }}>
          <Box>{row.currentEvent?.origin || row.origin}</Box>
          <Box sx={{ color: 'var(--text-secondary)' }}>→ {row.currentEvent?.destination || row.destination}</Box>
        </Box>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (_, row) => (
        <StatusBadge status={row.status} size="sm" />
      ),
    },
    {
      key: 'estimatedDelivery',
      header: 'Est. Delivery',
      render: (_, row) =>
        row.estimatedDelivery ? new Date(row.estimatedDelivery).toLocaleDateString() : '-',
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right',
      render: (_, row) => (row.cost != null ? formatCurrency(row.cost) : '-'),
    },
    {
      key: '_count',
      header: 'Shipments',
      align: 'center',
      render: (_, row) => row._count.shipments,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.75, flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/dashboard/transits/${row.id}`);
            }}
          >
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Pencil className="w-3.5 h-3.5" />}
            onClick={(event) => {
              event.stopPropagation();
              handleOpenEdit(row);
            }}
            disabled={row.status === 'DELIVERED'}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={(event) => {
              event.stopPropagation();
              void handleDeleteTransit(row);
            }}
            disabled={deletingTransitId === row.id}
            sx={{
              color: 'var(--error)',
              borderColor: 'var(--error)',
              '&:hover': {
                bgcolor: 'rgba(var(--error-rgb), 0.1)',
              },
            }}
          >
            {deletingTransitId === row.id ? 'Deleting...' : 'Delete'}
          </Button>
        </Box>
      ),
    },
  ], [deletingTransitId, router]);

  return (
    <AdminRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Transits"
          description="Manage overland transits from UAE to Afghanistan"
          actions={
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenCreate(true)}>
              New Transit
            </Button>
          }
        />

        {/* Stats */}
        <DashboardGrid className="grid-cols-2 md:grid-cols-4">
          <StatsCard icon={<Truck className="w-5 h-5" />} title="Total Transits" value={stats.total} variant="default" />
          <StatsCard icon={<Truck className="w-5 h-5" />} title="Active Transits" value={stats.active} variant="info" />
          <StatsCard icon={<Truck className="w-5 h-5" />} title="Delivered" value={stats.delivered} variant="success" />
          <StatsCard icon={<Package className="w-5 h-5" />} title="Pending" value={stats.pending} variant="warning" />
        </DashboardGrid>

        {/* Search & Filter */}
        <DashboardPanel title="Search & Filter" description="Find transits quickly">
          <FormField
            label=""
            placeholder="Search by reference #, destination, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-[var(--text-secondary)]" />}
          />
        </DashboardPanel>

        {/* Status Filter Carousel */}
        <div className="pt-1 pb-1">
          <StatusFilterPills
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'PENDING', label: 'Pending', color: 'var(--text-secondary)' },
              { value: 'DISPATCHED', label: 'Dispatched', color: 'var(--warning)' },
              { value: 'IN_TRANSIT', label: 'In Transit', color: 'var(--status-violet)' },
              { value: 'ARRIVED', label: 'Arrived', color: 'var(--status-violet)' },
              { value: 'DELIVERED', label: 'Delivered', color: 'var(--success)' },
              { value: 'CANCELLED', label: 'Cancelled', color: 'var(--error)' },
            ]}
            selectedValue={statusFilter}
            onSelect={(val) => setStatusFilter(val)}
          />
        </div>

        {/* Data Table Panel */}
        <DashboardPanel title={`Transits List (${transits.length})`} fullHeight>
          {loading ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading transits...</Box>
          ) : (
            <DataTable
              data={transits}
              columns={columns}
              keyField="id"
              onRowClick={(row) => {
                if (isShiftPressed) {
                  handleOpenEdit(row);
                  return;
                }
                router.push(`/dashboard/transits/${row.id}`);
              }}
            />
          )}
        </DashboardPanel>

        {/* Create Modal */}
        <Modal
          open={openCreate}
          onClose={() => !creating && setOpenCreate(false)}
          title="Create New Transit"
          description="Transit companies are assigned per event. Create the transit first, then add route legs."
          size="md"
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={creating}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Transit'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Origin"
                value={formData.origin}
                onChange={(e) => setFormData(prev => ({ ...prev, origin: e.target.value }))}
                placeholder="Dubai, UAE"
              />
              <FormField
                label="Destination"
                value={formData.destination}
                onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                placeholder="Kabul, Afghanistan"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Dispatch Date"
                type="date"
                value={formData.dispatchDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dispatchDate: e.target.value }))}
              />
              <FormField
                label="Est. Delivery Date"
                type="date"
                value={formData.estimatedDelivery}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
              />
            </div>
            <FormField
              label="Agreed Cost (USD)"
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
              placeholder="0.00"
            />
            <FormField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes..."
            />
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal
          open={openEdit}
          onClose={() => !editing && setOpenEdit(false)}
          title="Edit Transit"
          description="Update transit parameters and status."
          size="md"
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={editing}>Cancel</Button>
              <Button variant="primary" onClick={handleUpdateTransit} disabled={editing}>
                {editing ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Origin"
                value={editFormData.origin}
                onChange={(e) => setEditFormData(prev => ({ ...prev, origin: e.target.value }))}
              />
              <FormField
                label="Destination"
                value={editFormData.destination}
                onChange={(e) => setEditFormData(prev => ({ ...prev, destination: e.target.value }))}
              />
            </div>
            <Select
              label="Status"
              value={editFormData.status}
              onChange={(val) => setEditFormData(prev => ({ ...prev, status: String(val) }))}
              options={editableStatusOptions}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Dispatch Date"
                type="date"
                value={editFormData.dispatchDate}
                onChange={(e) => setEditFormData(prev => ({ ...prev, dispatchDate: e.target.value }))}
              />
              <FormField
                label="Est. Delivery Date"
                type="date"
                value={editFormData.estimatedDelivery}
                onChange={(e) => setEditFormData(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
              />
            </div>
            <FormField
              label="Agreed Cost (USD)"
              type="number"
              value={editFormData.cost}
              onChange={(e) => setEditFormData(prev => ({ ...prev, cost: e.target.value }))}
            />
            <FormField
              label="Notes"
              value={editFormData.notes}
              onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </Modal>
      </DashboardSurface>
    </AdminRoute>
  );
}