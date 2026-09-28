'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Box,
  Checkbox,
  CircularProgress,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import {
  ArrowLeft,
  DollarSign,
  History,
  Package,
  Pencil,
  Plus,
  Trash2,
  Truck,
  Upload,
  User,
} from 'lucide-react';
import PermissionRoute from '@/components/auth/PermissionRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, Select, StatsCard, TableSkeleton, toast, CopyButton, PageHeader, MilestoneStepper, Modal, ConfirmDialog, Tooltip , FormField } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import AddShipmentExpenseModal from '@/components/shipments/AddShipmentExpenseModal';
import AddTransitExpenseModal from '@/components/transits/AddTransitExpenseModal';
import { hasPermission } from '@/lib/rbac';
import { formatMoney as formatCurrency } from '@/lib/format';

interface Company {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
}

interface Shipment {
  id: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  status: string;
  user: { id: string; name: string | null; email: string; phone: string | null };
}

interface AssignableShipment {
  id: string;
  status: string;
  transitId: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  user: { id: string; name: string | null; email: string };
  container?: { status: string | null } | null;
}

interface TransitEvent {
  id: string;
  companyId: string;
  origin: string;
  destination: string;
  status: string;
  location: string | null;
  description: string | null;
  eventDate: string;
  createdAt: string;
  company: Company;
}

interface TransitExpense {
  id: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  vendor: string | null;
  invoiceNumber: string | null;
  category: string | null;
  notes: string | null;
  shipment: { id: string; vehicleMake: string | null; vehicleModel: string | null; vehicleVIN: string | null } | null;
  transitEvent?: {
    id: string;
    origin: string;
    destination: string;
    company: { id: string; name: string; code: string | null };
  } | null;
  source: 'TRANSIT_EXPENSE' | 'SHIPMENT_EXPENSE';
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
  deliveryReceiverName: string | null;
  deliveryProofUrl: string | null;
  deliveryProofName: string | null;
  deliveryProofType: string | null;
  deliveryNotes: string | null;
  cost: number | null;
  notes: string | null;
  createdAt: string;
  currentEvent: TransitEvent | null;
  currentCompany: Company | null;
  shipments: Shipment[];
  events: TransitEvent[];
  expenses: TransitExpense[];
  _count: { shipments: number; events: number; expenses: number };
}

const STATUS_OPTIONS = ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'CANCELLED'];
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'rgba(var(--text-secondary-rgb), 0.15)', text: 'var(--text-secondary)', border: 'rgba(var(--text-secondary-rgb), 0.3)' },
  DISPATCHED: { bg: 'rgba(var(--warning-rgb), 0.15)', text: 'var(--warning-dark)', border: 'rgba(var(--warning-rgb), 0.3)' },
  IN_TRANSIT: { bg: 'rgba(var(--status-violet-rgb), 0.15)', text: 'var(--status-violet-dark)', border: 'rgba(var(--status-violet-rgb), 0.3)' },
  ARRIVED: { bg: 'rgba(var(--success-rgb), 0.15)', text: 'var(--success-dark)', border: 'rgba(var(--success-rgb), 0.3)' },
  DELIVERED: { bg: 'rgba(var(--status-emerald-rgb), 0.15)', text: 'var(--status-emerald-dark)', border: 'rgba(var(--status-emerald-rgb), 0.3)' },
  CANCELLED: { bg: 'rgba(var(--error-rgb), 0.15)', text: 'var(--error-dark)', border: 'rgba(var(--error-rgb), 0.3)' },
};
const statusLabels: Record<string, string> = { PENDING: 'Pending', DISPATCHED: 'Dispatched', IN_TRANSIT: 'In Transit', ARRIVED: 'Arrived', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' };

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}</div>
);

export default function TransitDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const transitId = String(params.id || '');
  const userRole = session?.user?.role;
  const canManageWorkflow = hasPermission(userRole, 'workflow:move') && hasPermission(userRole, 'transits:manage');
  const canManageExpenses = hasPermission(userRole, 'expenses:post');
  const canOverrideClosedStages = hasPermission(userRole, 'workflow:override_closed');
  const [transit, setTransit] = useState<Transit | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [transitCompanies, setTransitCompanies] = useState<Company[]>([]);

  // Edit transit state
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', dispatchDate: '', estimatedDelivery: '', actualDelivery: '', cost: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [openConfirmDelivery, setOpenConfirmDelivery] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ deliveredDate: new Date().toISOString().slice(0, 16), receiverName: '', proofUrl: '', proofName: '', proofType: '', notes: '' });
  const proofInputRef = useRef<HTMLInputElement | null>(null);

  // Add event state
  const [openEvent, setOpenEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ companyId: '', origin: '', destination: '', status: '', location: '', description: '', eventDate: new Date().toISOString().slice(0, 16) });
  const [postingEvent, setPostingEvent] = useState(false);

  // Add expense state
  const [shipmentExpenseModalOpen, setShipmentExpenseModalOpen] = useState(false);
  const [selectedShipmentForExpense, setSelectedShipmentForExpense] = useState<string | undefined>(undefined);
  const [transitExpenseModalOpen, setTransitExpenseModalOpen] = useState(false);
  const [selectedTransitExpense, setSelectedTransitExpense] = useState<TransitExpense | null>(null);

  // Add shipments to transit (bulk multi-select)
  const [openAddShipment, setOpenAddShipment] = useState(false);
  const [addingShipment, setAddingShipment] = useState(false);
  const [availableShipments, setAvailableShipments] = useState<AssignableShipment[]>([]);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [loadingAvailableShipments, setLoadingAvailableShipments] = useState(false);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const isClosedTransitState = transit ? transit.status === 'DELIVERED' || transit.status === 'CANCELLED' : false;
  const isTransitWorkflowLocked = isClosedTransitState && !canOverrideClosedStages;

  const transitMilestones = useMemo(() => [
    { id: 'PENDING', label: 'Transit Booked', description: 'Assigned to forwarder' },
    { id: 'DISPATCHED', label: 'Dispatched', description: 'Carrier in motion' },
    { id: 'IN_TRANSIT', label: 'In Transit', description: `${transit?.origin || 'Origin'} → ${transit?.destination || 'Destination'}` },
    { id: 'ARRIVED', label: 'Arrived', description: 'Border / Port inspection' },
    { id: 'DELIVERED', label: 'Delivered', description: 'Destination handover' },
  ], [transit?.origin, transit?.destination]);

  const fetchAvailableShipments = async (searchTerm = '') => {
    try {
      setLoadingAvailableShipments(true);
      // Fetch a broad set and filter client-side using the same rule as the server
      // (released = shipment released OR its container released) so that shipments
      // released at container level are not hidden from the picker.
      const query = new URLSearchParams({
        limit: '100',
        page: '1',
      });

      if (searchTerm.trim()) {
        query.set('search', searchTerm.trim());
      }

      const response = await fetch(`/api/shipments?${query.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load shipments');
      }

      const eligible = (data.shipments || []).filter((shipment: AssignableShipment) => {
        const released = shipment.status === 'RELEASED' || shipment.container?.status === 'RELEASED';
        return released && !shipment.transitId;
      });
      setAvailableShipments(eligible as AssignableShipment[]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load released shipments');
      setAvailableShipments([]);
    } finally {
      setLoadingAvailableShipments(false);
    }
  };

  const fetchTransit = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transits/${transitId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch');
      setTransit(data.transit);
      setTotalExpenses(data.totalExpenses || 0);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load transit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transitId) void fetchTransit();
  }, [transitId]);

  useEffect(() => {
    const fetchTransitCompanies = async () => {
      try {
        const response = await fetch('/api/finance/companies?active=true&companyType=TRANSIT');
        const data = await response.json();
        if (response.ok) {
          setTransitCompanies(data.companies || []);
        }
      } catch (error) {
        console.error('Failed to load transit companies:', error);
      }
    };

    void fetchTransitCompanies();
  }, []);

  useEffect(() => {
    if (!openAddShipment) return;

    const timer = setTimeout(() => {
      void fetchAvailableShipments(shipmentSearch);
    }, 250);

    return () => clearTimeout(timer);
  }, [openAddShipment, shipmentSearch]);

  const openEditDialog = () => {
    if (!transit) return;
    if (transit.status === 'DELIVERED') {
      toast.error('Delivered transits should be updated through the delivery confirmation record instead of the generic edit form');
      return;
    }
    setEditForm({
      status: transit.status,
      dispatchDate: transit.dispatchDate ? transit.dispatchDate.slice(0, 10) : '',
      estimatedDelivery: transit.estimatedDelivery ? transit.estimatedDelivery.slice(0, 10) : '',
      actualDelivery: transit.actualDelivery ? transit.actualDelivery.slice(0, 10) : '',
      cost: transit.cost != null ? String(transit.cost) : '',
      notes: transit.notes || '',
    });
    setOpenEdit(true);
  };

  const handleEdit = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/transits/${transitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editForm.status,
          dispatchDate: editForm.dispatchDate || null,
          estimatedDelivery: editForm.estimatedDelivery || null,
          cost: editForm.cost ? parseFloat(editForm.cost) : null,
          notes: editForm.notes || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update');
      toast.success('Transit updated');
      setOpenEdit(false);
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleProofUpload = async (file: File) => {
    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload proof of delivery');
      }

      setDeliveryForm((prev) => ({
        ...prev,
        proofUrl: data.url,
        proofName: file.name,
        proofType: file.type,
      }));
      toast.success('Proof of delivery uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload proof of delivery');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryForm.deliveredDate) {
      toast.error('Delivered date is required');
      return;
    }
    if (!deliveryForm.receiverName.trim()) {
      toast.error('Receiver name is required');
      return;
    }
    if (!deliveryForm.proofUrl) {
      toast.error('Proof of delivery file is required');
      return;
    }

    try {
      setConfirmingDelivery(true);
      const response = await fetch(`/api/transits/${transitId}/confirm-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveredDate: new Date(deliveryForm.deliveredDate).toISOString(),
          receiverName: deliveryForm.receiverName.trim(),
          proofUrl: deliveryForm.proofUrl,
          proofName: deliveryForm.proofName || undefined,
          proofType: deliveryForm.proofType || undefined,
          notes: deliveryForm.notes.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to confirm delivery');

      toast.success('Transit delivery confirmed');
      setOpenConfirmDelivery(false);
      setDeliveryForm({ deliveredDate: new Date().toISOString().slice(0, 16), receiverName: '', proofUrl: '', proofName: '', proofType: '', notes: '' });
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to confirm delivery');
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const handleAddEvent = async () => {
    if (!eventForm.status.trim()) { toast.error('Status is required'); return; }
    if (!eventForm.companyId) { toast.error('Transit company is required'); return; }
    if (!eventForm.origin.trim() || !eventForm.destination.trim()) { toast.error('Transit leg origin and destination are required'); return; }
    try {
      setPostingEvent(true);
      const response = await fetch(`/api/transits/${transitId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: eventForm.companyId,
          origin: eventForm.origin,
          destination: eventForm.destination,
          status: eventForm.status,
          location: eventForm.location || undefined,
          description: eventForm.description || undefined,
          eventDate: eventForm.eventDate || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add event');
      toast.success('Event added');
      setOpenEvent(false);
      setEventForm({ companyId: '', origin: '', destination: '', status: '', location: '', description: '', eventDate: new Date().toISOString().slice(0, 16) });
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add event');
    } finally {
      setPostingEvent(false);
    }
  };

  const toggleShipmentSelection = (shipmentId: string) => {
    setSelectedShipmentIds((current) =>
      current.includes(shipmentId) ? current.filter((id) => id !== shipmentId) : [...current, shipmentId],
    );
  };

  const handleAddShipment = async () => {
    if (selectedShipmentIds.length === 0) {
      toast.error('Select at least one released shipment');
      return;
    }
    try {
      setAddingShipment(true);
      const response = await fetch(`/api/transits/${transitId}/shipments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentIds: selectedShipmentIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add shipments');

      const assigned = Number(data.assigned || 0);
      const errors = Array.isArray(data.errors) ? data.errors : [];
      if (assigned > 0) {
        toast.success(assigned === 1 ? 'Shipment added to transit' : `${assigned} shipments added to transit`);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} shipment(s) skipped`, {
          description: errors.map((entry: { shipmentId: string; error: string }) => entry.error).join(' | '),
        });
      }

      // Keep the dialog open so another batch can be picked; clear the selection
      // and refresh the eligible list so added shipments drop off.
      setSelectedShipmentIds([]);
      await fetchTransit();
      void fetchAvailableShipments(shipmentSearch);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add shipments');
    } finally {
      setAddingShipment(false);
    }
  };

  const handleCloseAddShipment = () => {
    if (addingShipment) return;
    setOpenAddShipment(false);
    setShipmentSearch('');
    setAvailableShipments([]);
    setSelectedShipmentIds([]);
  };

  const [pendingConfirm, setPendingConfirm] = useState<{ title: string; message: string; confirmText: string; action: () => void } | null>(null);

  const handleRemoveShipment = (shipmentId: string) => {
    setPendingConfirm({
      title: 'Remove Shipment',
      message: 'Remove this shipment from the transit?',
      confirmText: 'Remove',
      action: () => void runRemoveShipment(shipmentId),
    });
  };

  const runRemoveShipment = async (shipmentId: string) => {
    try {
      const response = await fetch(`/api/transits/${transitId}/shipments?shipmentId=${shipmentId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove');
      toast.success('Shipment removed from transit');
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove shipment');
    }
  };

  const handleDeleteExpense = (expense: TransitExpense) => {
    setPendingConfirm({
      title: 'Delete Expense',
      message: 'Delete this expense? This will also reverse the ledger entries.',
      confirmText: 'Delete',
      action: () => void runDeleteExpense(expense),
    });
  };

  const runDeleteExpense = async (expense: TransitExpense) => {
    try {
      let response;
      if (expense.source === 'SHIPMENT_EXPENSE') {
        // Delete shipment expense via ledger API
        response = await fetch(`/api/ledger/${expense.id}`, { method: 'DELETE' });
      } else {
        // Delete transit expense via transit API
        response = await fetch(`/api/transits/${transitId}/expenses?expenseId=${expense.id}`, { method: 'DELETE' });
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete expense');
      toast.success('Expense deleted');
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    }
  };

  const shipmentColumns: Column<Shipment>[] = [
    {
      key: 'vehicleMake',
      header: 'Vehicle',
      render: (_, row) => (
        <Box>
          <Box sx={{ fontWeight: 600 }}>{`${row.vehicleYear || ''} ${row.vehicleMake || ''} ${row.vehicleModel || ''}`.trim() || 'Unknown'}</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontFamily: 'monospace' }}>{row.vehicleVIN || '-'}</span>
            {row.vehicleVIN && <CopyButton value={row.vehicleVIN} label="VIN" />}
          </Box>
        </Box>
      ),
    },
    {
      key: 'user',
      header: 'Customer',
      render: (_, row) => (
        <Box>
          <Box sx={{ fontWeight: 500 }}>{row.user.name || row.user.email}</Box>
          <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.user.phone || row.user.email}</Box>
        </Box>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => {
        const color = row.status === 'IN_TRANSIT_TO_DESTINATION'
          ? { bg: 'rgba(var(--status-violet-rgb), 0.15)', text: 'var(--status-violet-dark)', border: 'rgba(var(--status-violet-rgb), 0.3)' }
          : { bg: 'rgba(var(--status-emerald-rgb), 0.15)', text: 'var(--status-emerald-dark)', border: 'rgba(var(--status-emerald-rgb), 0.3)' };
        return (
          <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
            {row.status === 'IN_TRANSIT_TO_DESTINATION' ? 'In Transit' : row.status.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          {canManageExpenses ? (
            <Tooltip title="Add expense">
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedShipmentForExpense(row.id);
                  setShipmentExpenseModalOpen(true);
                }}
                sx={{ color: 'var(--accent-gold)' }}
                disabled={isTransitWorkflowLocked}
              >
                <DollarSign className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title="View shipment">
            <IconButton size="small" component="a" href={`/dashboard/shipments/${row.id}`} target="_blank">
              <Package className="w-4 h-4" />
            </IconButton>
          </Tooltip>
          {canManageWorkflow ? (
            <Tooltip title="Remove from transit">
              <IconButton size="small" color="error" onClick={() => void handleRemoveShipment(row.id)} disabled={isTransitWorkflowLocked}>
                <Trash2 className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      ),
    },
  ];

  const eventColumns: Column<TransitEvent>[] = [
    { key: 'eventDate', header: 'Date', render: (_, row) => new Date(row.eventDate).toLocaleString() },
    {
      key: 'origin',
      header: 'Leg',
      render: (_, row) => (
        <Box>
          <Box sx={{ fontWeight: 600 }}>{row.origin}</Box>
          <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>→ {row.destination}</Box>
        </Box>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (_, row) => row.company.name,
    },
    { key: 'status', header: 'Status', render: (_, row) => <Box sx={{ fontWeight: 600 }}>{row.status}</Box> },
    { key: 'location', header: 'Location', render: (_, row) => row.location || '-' },
    { key: 'description', header: 'Description', render: (_, row) => row.description || '-' },
  ];

  const expenseColumns: Column<TransitExpense>[] = [
    { key: 'date', header: 'Date', render: (_, row) => new Date(row.date).toLocaleDateString() },
    {
      key: 'type',
      header: 'Type',
      render: (_, row) => (
        <Box>
          <Box sx={{ fontWeight: 500 }}>{row.type.replace(/_/g, ' ')}</Box>
          {row.vendor && <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.vendor}</Box>}
        </Box>
      ),
    },
    {
      key: 'transitEvent',
      header: 'Transit Leg',
      render: (_, row) => row.transitEvent ? (
        <Box>
          <Box sx={{ fontWeight: 500, fontSize: '0.875rem' }}>{row.transitEvent.origin} → {row.transitEvent.destination}</Box>
          <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.transitEvent.company.name}</Box>
        </Box>
      ) : (
        <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No linked event</Box>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (_, row) => <span style={{ fontWeight: 600, color: 'var(--error)' }}>{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'shipment',
      header: 'Shipment',
      render: (_, row) => row.shipment ? (
        <Box>
          <Box sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
            {[row.shipment.vehicleMake, row.shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}
          </Box>
          {row.shipment.vehicleVIN && (
            <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.shipment.vehicleVIN}</Box>
          )}
        </Box>
      ) : (
        <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>General transit expense</Box>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (_, row) => (
        canManageExpenses ? (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            {row.source === 'TRANSIT_EXPENSE' && (
              <Tooltip title="Edit expense">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedTransitExpense(row);
                    setTransitExpenseModalOpen(true);
                  }}
                  disabled={isTransitWorkflowLocked}
                  sx={{ color: 'var(--accent-gold)' }}
                >
                  <Pencil className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Delete expense">
              <IconButton size="small" color="error" onClick={() => void handleDeleteExpense(row)} disabled={isTransitWorkflowLocked}>
                <Trash2 className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : null
      ),
    },
  ];

  if (loading) {
    return (
      <PermissionRoute anyOf={['transits:manage', 'finance:manage']}>
        <DashboardSurface><TableSkeleton rows={8} /></DashboardSurface>
      </PermissionRoute>
    );
  }

  if (!transit) {
    return (
      <PermissionRoute anyOf={['transits:manage', 'finance:manage']}>
        <DashboardSurface>
          <DashboardPanel title="Transit not found">
            <Box sx={{ color: 'var(--text-secondary)' }}>The requested transit could not be found.</Box>
            <Link href="/dashboard/transits"><Button variant="outline">Back to Transits</Button></Link>
          </DashboardPanel>
        </DashboardSurface>
      </PermissionRoute>
    );
  }

  const statusColor = statusColors[transit.status] || statusColors.PENDING;
  const canConfirmDelivery = canManageWorkflow && transit.status !== 'DELIVERED' && transit.status !== 'CANCELLED' && transit.shipments.length > 0;
  const currentLegLabel = transit.currentEvent
    ? `${transit.currentEvent.origin} → ${transit.currentEvent.destination}`
    : `${transit.origin} → ${transit.destination}`;
  const currentCompanyLabel = transit.currentCompany?.name || 'No current event company';

  return (
    <PermissionRoute anyOf={['transits:manage', 'finance:manage']}>
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

        <PageHeader
          title={transit.referenceNumber}
          description={`${currentLegLabel} • ${currentCompanyLabel}`}
          actions={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <CopyButton value={transit.referenceNumber} label="Transit #" />
              <Link href="/dashboard/transits" style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
              </Link>
              {canConfirmDelivery && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Truck className="w-4 h-4" />}
                  onClick={() => setOpenConfirmDelivery(true)}
                >
                  Confirm Delivery
                </Button>
              )}
              {canManageWorkflow && (!isClosedTransitState || canOverrideClosedStages) ? <Button variant="outline" size="sm" icon={<Pencil className="w-4 h-4" />} onClick={openEditDialog} disabled={isTransitWorkflowLocked}>Edit</Button> : null}
            </Box>
          }
        />

        {/* Milestone Progression Stepper */}
        <Box sx={{ px: 2, mb: 3 }}>
          <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)', boxShadow: '0 4px 20px rgba(var(--text-primary-rgb),0.04)' }}>
            <MilestoneStepper
              steps={transitMilestones}
              currentStepId={transit.status}
              status={transit.status === 'DELIVERED' || transit.status === 'ARRIVED' ? 'completed' : transit.status === 'CANCELLED' ? 'cancelled' : 'default'}
            />
          </Box>
        </Box>

        <DashboardPanel>
          <DashboardGrid className="grid-cols-2 md:grid-cols-4 mb-4">
            <StatsCard icon={<Truck className="w-5 h-5" />} title="Status" value={statusLabels[transit.status] || transit.status} variant="default" />
            <StatsCard icon={<Package className="w-5 h-5" />} title="Shipments" value={transit._count.shipments} variant="info" />
            <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Total Expenses" value={formatCurrency(totalExpenses)} variant="error" />
            <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Agreed Cost" value={transit.cost != null ? formatCurrency(transit.cost) : 'N/A'} variant="success" />
          </DashboardGrid>

          {isClosedTransitState && (
            <Box sx={{ mb: 2, p: 2, borderRadius: 2, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              {canOverrideClosedStages
                ? 'This transit is closed. Admin override is enabled for workflow corrections and protected expense changes.'
                : 'This transit is closed. Workflow changes are locked and expense updates are limited to admin overrides.'}
            </Box>
          )}

          {/* Status Badge + Info */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2, p: 2, borderRadius: 2, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Box>
              <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>STATUS</Box>
              <span style={{ display: 'inline-flex', padding: '3px 12px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600, background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>
                {statusLabels[transit.status] || transit.status}
              </span>
            </Box>
            <Box>
              <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>CURRENT LEG</Box>
              <Box sx={{ fontWeight: 600 }}>{currentLegLabel}</Box>
            </Box>
            <Box>
              <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>CURRENT COMPANY</Box>
              <Box sx={{ fontWeight: 600 }}>{currentCompanyLabel}</Box>
            </Box>
            {transit.dispatchDate && (
              <Box>
                <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>DISPATCHED</Box>
                <Box sx={{ fontWeight: 600 }}>{new Date(transit.dispatchDate).toLocaleDateString()}</Box>
              </Box>
            )}
            {transit.estimatedDelivery && (
              <Box>
                <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>EST. DELIVERY</Box>
                <Box sx={{ fontWeight: 600 }}>{new Date(transit.estimatedDelivery).toLocaleDateString()}</Box>
              </Box>
            )}
            {transit.actualDelivery && (
              <Box>
                <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>DELIVERED</Box>
                <Box sx={{ fontWeight: 600, color: 'var(--success)' }}>{new Date(transit.actualDelivery).toLocaleDateString()}</Box>
              </Box>
            )}
            {transit.deliveryReceiverName && (
              <Box>
                <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>RECEIVED BY</Box>
                <Box sx={{ fontWeight: 600 }}>{transit.deliveryReceiverName}</Box>
              </Box>
            )}
            {transit.deliveryProofUrl && (
              <Box>
                <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>PROOF OF DELIVERY</Box>
                <a href={transit.deliveryProofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-gold)', fontWeight: 600, textDecoration: 'none' }}>
                  {transit.deliveryProofName || 'Open proof file'}
                </a>
              </Box>
            )}
          </Box>

          {transit.status === 'DELIVERED' && (transit.deliveryNotes || transit.deliveryProofType) && (
            <Box sx={{ mb: 2, p: 2, borderRadius: 2, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 1 }}>DELIVERY CONFIRMATION</Box>
              {transit.deliveryProofType && (
                <Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>
                  Proof type: {transit.deliveryProofType}
                </Box>
              )}
              {transit.deliveryNotes && <Box sx={{ whiteSpace: 'pre-wrap' }}>{transit.deliveryNotes}</Box>}
            </Box>
          )}

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'var(--border)', mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': { textTransform: 'none', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', minHeight: 44, '&:hover': { color: 'var(--accent-gold)' } },
                '& .Mui-selected': { color: 'var(--accent-gold) !important' },
                '& .MuiTabs-indicator': { backgroundColor: 'var(--accent-gold)' },
              }}
            >
              <Tab icon={<Package className="h-4 w-4" />} iconPosition="start" label={`Shipments (${transit._count.shipments})`} />
              <Tab icon={<History className="h-4 w-4" />} iconPosition="start" label={`Events (${transit._count.events})`} />
              <Tab icon={<DollarSign className="h-4 w-4" />} iconPosition="start" label={`Expenses (${transit._count.expenses})`} />
              <Tab icon={<User className="h-4 w-4" />} iconPosition="start" label="Company Info" />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {canManageExpenses ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      setSelectedShipmentForExpense(undefined);
                      setShipmentExpenseModalOpen(true);
                    }}
                    disabled={isTransitWorkflowLocked}
                  >
                    Add Shipment Expense
                  </Button>
                ) : null}
                {canManageWorkflow ? <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenAddShipment(true)} disabled={isTransitWorkflowLocked}>
                  Add Shipment
                </Button> : null}
              </Box>
            </Box>
            <DataTable data={transit.shipments} columns={shipmentColumns} keyField="id" />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
              {canManageWorkflow ? <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenEvent(true)} disabled={isTransitWorkflowLocked}>
                Add Event
              </Button> : null}
            </Box>
            <DataTable data={transit.events} columns={eventColumns} keyField="id" />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 2, background: 'var(--surface-secondary)', borderRadius: 2, border: '1px solid var(--border)' }}>
              <Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Transit expenses and shipment transit expenses post against the latest transit event. Add a new event whenever the route or company changes.
              </Box>
            </Box>
            <Box sx={{ mt: 2 }}>
              <DataTable data={transit.expenses} columns={expenseColumns} keyField="id" />
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            {transit.currentCompany ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 2, background: 'var(--surface)', borderRadius: 2, border: '1px solid var(--border)' }}>
                <Box><Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>COMPANY NAME</Box><Box sx={{ fontWeight: 600, mt: 0.5 }}>{transit.currentCompany.name}</Box></Box>
                {transit.currentCompany.code && <Box><Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CODE</Box><Box sx={{ fontWeight: 600, mt: 0.5 }}>{transit.currentCompany.code}</Box></Box>}
                {transit.currentCompany.phone && <Box><Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PHONE</Box><Box sx={{ fontWeight: 600, mt: 0.5 }}>{transit.currentCompany.phone}</Box></Box>}
                {transit.currentCompany.email && <Box><Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>EMAIL</Box><Box sx={{ fontWeight: 600, mt: 0.5 }}>{transit.currentCompany.email}</Box></Box>}
              </Box>
            ) : (
              <Box sx={{ p: 2, background: 'var(--surface)', borderRadius: 2, border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                No transit company is assigned yet. Add a transit event to set the active leg company.
              </Box>
            )}
            {transit.notes && (
              <Box sx={{ mt: 2, p: 2, background: 'var(--surface)', borderRadius: 2, border: '1px solid var(--border)' }}>
                <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>NOTES</Box>
                <Box sx={{ whiteSpace: 'pre-wrap' }}>{transit.notes}</Box>
              </Box>
            )}
          </TabPanel>
        </DashboardPanel>

        {/* Edit Transit Dialog */}
        <Modal
          open={openEdit}
          onClose={() => !saving && setOpenEdit(false)}
          title="Edit Transit"
          size="sm"
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </>
          }
        >
          <Box sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <Select
              label="Status"
              value={editForm.status}
              onChange={(value) => setEditForm(prev => ({ ...prev, status: String(value) }))}
              options={STATUS_OPTIONS.map(s => ({ value: s, label: statusLabels[s] || s }))}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormField label="Dispatch Date" type="date" value={editForm.dispatchDate} onChange={(e) => setEditForm(prev => ({ ...prev, dispatchDate: e.target.value }))} />
              <FormField label="Est. Delivery" type="date" value={editForm.estimatedDelivery} onChange={(e) => setEditForm(prev => ({ ...prev, estimatedDelivery: e.target.value }))} />
            </Box>
            <FormField label="Agreed Cost (USD)" type="number" min={0} step={0.01}  value={editForm.cost} onChange={(e) => setEditForm(prev => ({ ...prev, cost: e.target.value }))} />
            <FormField label="Notes" multiline rows={3} value={editForm.notes} onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))} />
          </Box>
        </Modal>

        {/* Add Event Dialog */}
        <Modal
          open={openEvent}
          onClose={() => !postingEvent && setOpenEvent(false)}
          title="Add Transit Event"
          size="sm"
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenEvent(false)} disabled={postingEvent}>Cancel</Button>
              <Button variant="primary" onClick={handleAddEvent} disabled={postingEvent}>{postingEvent ? 'Adding...' : 'Add Event'}</Button>
            </>
          }
        >
          <Box sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <Select
              label="Transit Company"
              value={eventForm.companyId}
              onChange={(value) => setEventForm(prev => ({ ...prev, companyId: String(value) }))}
              required
              options={[
                { value: '', label: 'Select a company...' },
                ...transitCompanies.map((company) => ({ value: company.id, label: `${company.name}${company.code ? ` (${company.code})` : ''}` })),
              ]}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormField label="From" value={eventForm.origin} onChange={(e) => setEventForm(prev => ({ ...prev, origin: e.target.value }))} required placeholder="e.g. Herat" />
              <FormField label="To" value={eventForm.destination} onChange={(e) => setEventForm(prev => ({ ...prev, destination: e.target.value }))} required placeholder="e.g. Kabul" />
            </Box>
            <FormField label="Status / Event" value={eventForm.status} onChange={(e) => setEventForm(prev => ({ ...prev, status: e.target.value }))} required placeholder="e.g. Loaded, Border Crossed, Arrived Kabul" />
            <FormField label="Location" value={eventForm.location} onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g. Islam Qala Border" />
            <FormField label="Description" multiline rows={2} value={eventForm.description} onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))} />
            <FormField label="Event Date" type="datetime-local" value={eventForm.eventDate} onChange={(e) => setEventForm(prev => ({ ...prev, eventDate: e.target.value }))} />
          </Box>
        </Modal>

        {/* Add Shipment Expense Modal */}
        <AddShipmentExpenseModal
          open={shipmentExpenseModalOpen}
          onClose={() => {
            setShipmentExpenseModalOpen(false);
            setSelectedShipmentForExpense(undefined);
          }}
          shipmentId={selectedShipmentForExpense}
          shipments={selectedShipmentForExpense ? undefined : transit.shipments.map((s) => ({
            id: s.id,
            vehicleMake: s.vehicleMake,
            vehicleModel: s.vehicleModel,
            vehicleVIN: s.vehicleVIN,
            user: s.user,
          }))}
          contextType="TRANSIT"
          contextId={transitId}
          onSuccess={() => void fetchTransit()}
        />

        {/* Add / Edit Transit Expense Modal */}
        <AddTransitExpenseModal
          open={transitExpenseModalOpen}
          onClose={() => {
            setTransitExpenseModalOpen(false);
            setSelectedTransitExpense(null);
          }}
          transitId={transitId}
          initialExpense={selectedTransitExpense}
          onSuccess={() => void fetchTransit()}
        />

        {/* Add Shipment Modal */}
        <Modal
          open={openAddShipment}
          onClose={handleCloseAddShipment}
          title="Add Shipments to Transit"
          size="sm"
          actions={
            <>
              <Button variant="outline" onClick={handleCloseAddShipment} disabled={addingShipment}>Cancel</Button>
              <Button variant="primary" onClick={handleAddShipment} disabled={addingShipment || selectedShipmentIds.length === 0}>
                {addingShipment ? 'Adding...' : `Add${selectedShipmentIds.length ? ` (${selectedShipmentIds.length})` : ' Shipments'}`}
              </Button>
            </>
          }
        >
          <Box sx={{ pt: 1.5 }}>
            <FormField
              fullWidth
              size="small"
              label="Search shipments"
              value={shipmentSearch}
              onChange={(e) => setShipmentSearch(e.target.value)}
              helperText={loadingAvailableShipments ? 'Loading released shipments...' : 'Search by vehicle, VIN, or customer - released shipments only'}
              className="mb-3"
              rightIcon={loadingAvailableShipments ? <CircularProgress color="inherit" size={16} /> : undefined}
            />
            {loadingAvailableShipments ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : availableShipments.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                No released shipments found.
              </Box>
            ) : (
              <Box sx={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 1 }}>
                {availableShipments.map((shipment) => {
                  const vehicle = `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Vehicle';
                  const checked = selectedShipmentIds.includes(shipment.id);
                  return (
                    <Box
                      key={shipment.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1,
                        py: 0.75,
                        borderBottom: '1px solid var(--border)',
                        '&:hover': { bgcolor: 'var(--panel)' },
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleShipmentSelection(shipment.id)}
                    >
                      <Checkbox
                        size="small"
                        checked={checked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleShipmentSelection(shipment.id)}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{vehicle}</Box>
                        <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {shipment.vehicleVIN ? `VIN ${shipment.vehicleVIN}` : shipment.id} - {shipment.user.name || shipment.user.email}
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
            <Box sx={{ mt: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {selectedShipmentIds.length > 0
                ? `${selectedShipmentIds.length} shipment(s) selected - release tokens are verified automatically.`
                : 'Select one or more released shipments to add. You can add another batch right after.'}
            </Box>
          </Box>
        </Modal>

        {/* Confirm Final Delivery Modal */}
        <Modal
          open={openConfirmDelivery}
          onClose={() => !confirmingDelivery && !uploadingProof && setOpenConfirmDelivery(false)}
          title="Confirm Final Delivery"
          size="sm"
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenConfirmDelivery(false)} disabled={confirmingDelivery || uploadingProof}>Cancel</Button>
              <Button variant="primary" onClick={handleConfirmDelivery} disabled={confirmingDelivery || uploadingProof}>
                {confirmingDelivery ? 'Confirming...' : 'Confirm Delivery'}
              </Button>
            </>
          }
        >
          <Box sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <FormField
              label="Delivered Date"
              type="datetime-local"
              value={deliveryForm.deliveredDate}
              onChange={(e) => setDeliveryForm((prev) => ({ ...prev, deliveredDate: e.target.value }))}
            />
            <FormField
              label="Receiver Name"
              value={deliveryForm.receiverName}
              onChange={(e) => setDeliveryForm((prev) => ({ ...prev, receiverName: e.target.value }))}
              helperText="Person who accepted the vehicle(s)"
            />
            <Box sx={{ p: 2, borderRadius: 2, border: '1px dashed var(--border)', background: 'var(--surface)' }}>
              <input
                ref={proofInputRef}
                type="file"
                hidden
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleProofUpload(file);
                  }
                  e.currentTarget.value = '';
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Box sx={{ fontWeight: 600 }}>Proof of Delivery</Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Upload a delivery photo, signed PDF, or receiver document.
                  </Box>
                  {deliveryForm.proofName && (
                    <Box sx={{ mt: 1, fontSize: '0.875rem', color: 'var(--success)' }}>{deliveryForm.proofName}</Box>
                  )}
                </Box>
                <Button
                  variant="outline"
                  icon={<Upload className="w-4 h-4" />}
                  onClick={() => proofInputRef.current?.click()}
                  disabled={uploadingProof}
                >
                  {uploadingProof ? 'Uploading...' : deliveryForm.proofUrl ? 'Replace File' : 'Upload File'}
                </Button>
              </Box>
            </Box>
            <FormField
              label="Delivery Notes"
              multiline
              rows={3}
              value={deliveryForm.notes}
              onChange={(e) => setDeliveryForm((prev) => ({ ...prev, notes: e.target.value }))}
              helperText="Optional notes for support, disputes, or handover context"
            />
          </Box>
        </Modal>

        <ConfirmDialog
          open={pendingConfirm !== null}
          onClose={() => setPendingConfirm(null)}
          onConfirm={() => { const pending = pendingConfirm; setPendingConfirm(null); pending?.action(); }}
          title={pendingConfirm?.title ?? 'Confirm'}
          message={pendingConfirm?.message ?? ''}
          confirmText={pendingConfirm?.confirmText ?? 'Confirm'}
          severity="error"
        />
      </DashboardSurface>
    </PermissionRoute>
  );
}