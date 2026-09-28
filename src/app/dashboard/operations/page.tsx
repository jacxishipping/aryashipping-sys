'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Truck,
  Package,
  Ship,
  Layers,
  Search,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Eye,
  Trash2,
  X,
  GripVertical,
  CheckSquare,
  Square,
  ArrowUpRight,
  Filter,
  Sparkles,
  Info,
  Clock,
  Compass,
  ArrowLeftRight,
  Key,
  FileCheck,
  FileX,
  Printer,
  Share2,
  Send,
  Zap,
  BarChart3,
  DollarSign,
  Maximize2,
  Car,
  Camera,
} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, StatsCard, Button, toast, CopyButton, Modal, FormField, Select, CompactSkeleton } from '@/components/design-system';
import { DISPATCH_STATUS_LABELS } from '@/lib/dispatch-workflow';
import VehicleDamageInspectionModal from '@/components/inspections/VehicleDamageInspectionModal';
import { BarcodeScannerModal } from '@/components/ui/BarcodeScannerModal';

interface ShipmentItem {
  id: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  lotNumber: string | null;
  status: string;
  destinationPort?: string | null;
  auctionName?: string | null;
  purchaseLocation?: string | null;
  purchasePrice?: number | null;
  hasKey?: boolean | null;
  hasTitle?: boolean | null;
  titleStatus?: string | null;
  createdAt?: string;
  user?: { id: string; name: string | null; email: string; phone?: string | null };
  dispatch?: { id: string; referenceNumber: string; status: string } | null;
  container?: { id: string; containerNumber: string; status: string; destinationPort?: string | null } | null;
  dispatchId?: string | null;
  containerId?: string | null;
}

interface DispatchItem {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  estimatedArrival: string | null;
  notes?: string | null;
  company: { id: string; name: string; code: string | null };
  shipments: {
    id: string;
    vehicleYear: number | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleVIN: string | null;
    status: string;
    lotNumber?: string | null;
    hasKey?: boolean | null;
    hasTitle?: boolean | null;
  }[];
  _count: { shipments: number; events: number; expenses: number };
}

interface ContainerItem {
  id: string;
  containerNumber: string;
  status: string;
  vesselName: string | null;
  voyageNumber?: string | null;
  shippingLine?: string | null;
  loadingPort?: string | null;
  destinationPort: string | null;
  maxCapacity: number;
  currentCount: number;
  departureDate?: string | null;
  estimatedArrival?: string | null;
  company?: { id: string; name: string; code: string | null } | null;
  shipments: {
    id: string;
    vehicleYear: number | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleVIN: string | null;
    status: string;
    lotNumber?: string | null;
    hasKey?: boolean | null;
    hasTitle?: boolean | null;
    destinationPort?: string | null;
  }[];
}

interface CompanyItem {
  id: string;
  name: string;
  code: string | null;
  type?: string | null;
}

type BoardMode = 'dispatch' | 'container' | 'pipeline' | 'analytics';
type FilterTag = 'all' | 'title_ok' | 'title_pending' | 'has_keys' | 'aging_alert';

const PIPELINE_COLUMNS = [
  { key: 'ON_HAND', label: 'Yard / Warehouse', color: 'var(--warning)', desc: 'Vehicles received and ready for dispatch' },
  { key: 'DISPATCHING', label: 'Inland Dispatch', color: 'var(--info)', desc: 'Assigned to carrier or in transit to port' },
  { key: 'IN_TRANSIT', label: 'Ocean Container', color: 'var(--status-violet)', desc: 'Loaded into vessel container' },
  { key: 'ARRIVED_PORT', label: 'Port & Customs', color: 'var(--success)', desc: 'Discharged at destination port' },
  { key: 'DELIVERED', label: 'Delivered / Handover', color: 'var(--status-emerald)', desc: 'Final release and gatepass issued' },
];

export default function OperationsBoardPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [mode, setMode] = useState<BoardMode>('dispatch');
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);
  const [containers, setContainers] = useState<ContainerItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeFilterTag, setActiveFilterTag] = useState<FilterTag>('all');
  const [portFilter, setPortFilter] = useState<string>('all');
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  
  // Dragging State
  const [draggedShipmentIds, setDraggedShipmentIds] = useState<string[]>([]);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);

  // Quick Action Modals
  const [showCreateDispatchModal, setShowCreateDispatchModal] = useState(false);
  const [creatingDispatch, setCreatingDispatch] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    companyId: '',
    origin: 'USA East Coast Yard',
    destination: 'Port of Newark (USNWK)',
    estimatedArrival: '',
    notes: '',
  });

  const [showCreateContainerModal, setShowCreateContainerModal] = useState(false);
  const [creatingContainer, setCreatingContainer] = useState(false);
  const [containerForm, setContainerForm] = useState({
    containerNumber: '',
    destinationPort: 'Port of Jebel Ali (AEJEA)',
    maxCapacity: 4,
    companyId: '',
    notes: '',
  });

  // Quick Assign Modal State (for click / touch-friendly workflow)
  const [assignTargetType, setAssignTargetType] = useState<'dispatch' | 'container' | null>(null);
  const [singleAssignShipment, setSingleAssignShipment] = useState<ShipmentItem | null>(null);
  const [inspectingShipment, setInspectingShipment] = useState<ShipmentItem | null>(null);

  // Printable Load Sheet Modal
  const [printManifestData, setPrintManifestData] = useState<{
    type: 'dispatch' | 'container';
    referenceNumber: string;
    carrierName: string;
    origin: string;
    destination: string;
    eta?: string | null;
    shipments: ShipmentItem[];
  } | null>(null);

  const fetchBoardData = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/operations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load operations data');

      setShipments(data.shipments || []);
      setDispatches(data.dispatches || []);
      setContainers(data.containers || []);
      setCompanies(data.companies || []);
      if (data.companies?.length > 0 && !dispatchForm.companyId) {
        setDispatchForm((prev) => ({ ...prev, companyId: data.companies[0].id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load board data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatchForm.companyId]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Unique Destination Ports list for filtering
  const availablePorts = useMemo(() => {
    const ports = new Set<string>();
    shipments.forEach((s) => {
      if (s.destinationPort) ports.add(s.destinationPort);
    });
    containers.forEach((c) => {
      if (c.destinationPort) ports.add(c.destinationPort);
    });
    return Array.from(ports);
  }, [shipments, containers]);

  // Yard aging dwell time helper
  const getDwellDays = (createdAt?: string) => {
    if (!createdAt) return 0;
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  // Filtered pool of ready shipments
  const readyShipmentsPool = useMemo(() => {
    return shipments.filter((s) => {
      // Mode suitability
      let matchesMode = true;
      if (mode === 'dispatch') {
        matchesMode = !s.dispatchId;
      } else if (mode === 'container') {
        matchesMode = !s.containerId;
      }

      if (!matchesMode) return false;

      // Port filter
      if (portFilter !== 'all' && s.destinationPort !== portFilter) {
        return false;
      }

      // Operational Filter Tag
      if (activeFilterTag === 'title_ok' && !s.hasTitle) return false;
      if (activeFilterTag === 'title_pending' && s.hasTitle) return false;
      if (activeFilterTag === 'has_keys' && !s.hasKey) return false;
      if (activeFilterTag === 'aging_alert' && getDwellDays(s.createdAt) < 14) return false;

      // Text Search
      if (searchQuery) {
        const text = `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || ''} ${s.vehicleVIN || ''} ${s.lotNumber || ''} ${s.user?.name || ''} ${s.destinationPort || ''} ${s.auctionName || ''}`.toLowerCase();
        if (!text.includes(searchQuery.toLowerCase())) return false;
      }

      return true;
    });
  }, [shipments, mode, portFilter, activeFilterTag, searchQuery]);

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, shipmentId: string) => {
    let idsToDrag = [shipmentId];
    if (selectedShipmentIds.includes(shipmentId) && selectedShipmentIds.length > 1) {
      idsToDrag = selectedShipmentIds;
    } else {
      setSelectedShipmentIds([shipmentId]);
    }

    setDraggedShipmentIds(idsToDrag);
    e.dataTransfer.setData('text/plain', JSON.stringify(idsToDrag));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropTarget !== targetId) {
      setActiveDropTarget(targetId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (activeDropTarget === targetId) {
      setActiveDropTarget(null);
    }
  };

  // Drop into a Dispatch Lane
  const handleDropToDispatch = async (dispatchId: string) => {
    setActiveDropTarget(null);
    const ids = draggedShipmentIds.length > 0 ? draggedShipmentIds : selectedShipmentIds;
    if (!ids || ids.length === 0) return;

    const targetDispatch = dispatches.find((d) => d.id === dispatchId);
    const count = ids.length;

    // Optimistic UI Update
    setShipments((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, dispatchId, status: 'DISPATCHING' } : s))
    );

    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_to_dispatch',
          targetId: dispatchId,
          shipmentIds: ids,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to assign to dispatch');

      toast.success(`Assigned ${count} vehicle(s) to ${targetDispatch?.referenceNumber || 'Dispatch'}`);
      setSelectedShipmentIds([]);
      setDraggedShipmentIds([]);
      fetchBoardData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to assign shipment to dispatch');
      fetchBoardData();
    }
  };

  // Drop into a Container
  const handleDropToContainer = async (containerId: string) => {
    setActiveDropTarget(null);
    const ids = draggedShipmentIds.length > 0 ? draggedShipmentIds : selectedShipmentIds;
    if (!ids || ids.length === 0) return;

    const targetContainer = containers.find((c) => c.id === containerId);
    const count = ids.length;

    if (targetContainer && targetContainer.shipments.length + count > targetContainer.maxCapacity) {
      toast.error(`Exceeds capacity: ${targetContainer.shipments.length + count}/${targetContainer.maxCapacity}`);
      return;
    }

    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_to_container',
          targetId: containerId,
          shipmentIds: ids,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to assign to container');

      toast.success(`Stowed ${count} vehicle(s) into container ${targetContainer?.containerNumber || ''}`);
      setSelectedShipmentIds([]);
      setDraggedShipmentIds([]);
      fetchBoardData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to assign shipment to container');
      fetchBoardData();
    }
  };

  // Drop into Pipeline Stage
  const handleDropToPipelineStage = async (newStatus: string) => {
    setActiveDropTarget(null);
    const ids = draggedShipmentIds.length > 0 ? draggedShipmentIds : selectedShipmentIds;
    if (!ids || ids.length === 0) return;

    const count = ids.length;

    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move_shipment_status',
          status: newStatus,
          shipmentIds: ids,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update shipment status');

      toast.success(`Moved ${count} vehicle(s) to ${newStatus.replace('_', ' ')}`);
      setSelectedShipmentIds([]);
      setDraggedShipmentIds([]);
      fetchBoardData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update status');
      fetchBoardData();
    }
  };

  // Unassign actions
  const handleUnassignFromDispatch = async (shipmentId: string) => {
    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign_from_dispatch', shipmentIds: [shipmentId] }),
      });
      if (!res.ok) throw new Error('Failed to unassign');
      toast.info('Vehicle returned to ready pool');
      fetchBoardData();
    } catch {
      toast.error('Failed to unassign vehicle');
    }
  };

  const handleUnassignFromContainer = async (shipmentId: string) => {
    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign_from_container', shipmentIds: [shipmentId] }),
      });
      if (!res.ok) throw new Error('Failed to unassign');
      toast.info('Vehicle removed from container');
      fetchBoardData();
    } catch {
      toast.error('Failed to unassign vehicle');
    }
  };

  // 1-Click Smart Auto-Stow by Destination Port
  const handleAutoStowByPort = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_stow_by_port' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auto-stow failed');

      if (data.count === 0) {
        toast.info('No matching open containers or vehicles for auto-stow');
      } else {
        toast.success(`Smart Auto-Stow: Stowed ${data.count} vehicle(s) by destination port`);
      }
      fetchBoardData();
    } catch (err: any) {
      toast.error(err.message || 'Auto-stow failed');
    } finally {
      setRefreshing(false);
    }
  };

  // Update Dispatch status
  const handleUpdateDispatchStatus = async (dispatchId: string, nextStatus: string) => {
    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_dispatch_status',
          targetId: dispatchId,
          status: nextStatus,
        }),
      });
      if (!res.ok) throw new Error('Failed to update dispatch status');
      toast.success(`Dispatch marked as ${nextStatus}`);
      fetchBoardData();
    } catch {
      toast.error('Failed to update dispatch status');
    }
  };

  // Create Dispatch
  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchForm.companyId) {
      toast.error('Please select a carrier');
      return;
    }

    try {
      setCreatingDispatch(true);
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_dispatch',
          data: dispatchForm,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create dispatch');

      toast.success(`Created dispatch ${result.dispatch?.referenceNumber || ''}`);
      setShowCreateDispatchModal(false);
      fetchBoardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create dispatch');
    } finally {
      setCreatingDispatch(false);
    }
  };

  // Create Container
  const handleCreateContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerForm.containerNumber) {
      toast.error('Container number is required');
      return;
    }

    try {
      setCreatingContainer(true);
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_container',
          data: containerForm,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create container');

      toast.success(`Created container ${result.container?.containerNumber || ''}`);
      setShowCreateContainerModal(false);
      setContainerForm({
        containerNumber: '',
        destinationPort: 'Port of Jebel Ali (AEJEA)',
        maxCapacity: 4,
        companyId: '',
        notes: '',
      });
      fetchBoardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create container');
    } finally {
      setCreatingContainer(false);
    }
  };

  // Selection toggle
  const toggleSelectShipment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedShipmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllPool = () => {
    if (selectedShipmentIds.length === readyShipmentsPool.length) {
      setSelectedShipmentIds([]);
    } else {
      setSelectedShipmentIds(readyShipmentsPool.map((s) => s.id));
    }
  };

  // Quick Open Print Manifest
  const openDispatchManifest = (dispatch: DispatchItem) => {
    const fullShipments = shipments.filter((s) => s.dispatchId === dispatch.id);
    setPrintManifestData({
      type: 'dispatch',
      referenceNumber: dispatch.referenceNumber,
      carrierName: dispatch.company?.name || 'Inland Towing Carrier',
      origin: dispatch.origin,
      destination: dispatch.destination,
      eta: dispatch.estimatedArrival,
      shipments: fullShipments,
    });
  };

  const openContainerManifest = (container: ContainerItem) => {
    const fullShipments = shipments.filter((s) => s.containerId === container.id);
    setPrintManifestData({
      type: 'container',
      referenceNumber: container.containerNumber,
      carrierName: container.shippingLine || container.company?.name || 'Ocean Freight Line',
      origin: container.loadingPort || 'Port of Loading',
      destination: container.destinationPort || 'Port of Destination',
      eta: container.estimatedArrival,
      shipments: fullShipments,
    });
  };

  return (
    <ProtectedRoute>
      <DashboardSurface>
        {/* Page Header */}
        <PageHeader
          title="Logistics Operations & Command Board"
          description="Drag-and-drop command center for inland carrier dispatches, ocean container stowing, and fleet pipeline"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
                onClick={fetchBoardData}
                disabled={refreshing}
              >
                Sync Board
              </Button>
              {mode === 'container' && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Zap className="w-4 h-4 text-[var(--accent-gold)]" />}
                  onClick={handleAutoStowByPort}
                  disabled={refreshing}
                >
                  Auto-Stow by Port
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreateDispatchModal(true)}
              >
                New Dispatch
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Ship className="w-4 h-4" />}
                onClick={() => setShowCreateContainerModal(true)}
              >
                New Container
              </Button>
            </div>
          }
        />

        {/* Top Key Operational Metrics */}
        <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<Package className="w-5 h-5 text-[var(--accent-gold)]" />}
            title="Ready Vehicles (Pool)"
            value={readyShipmentsPool.length}
            variant="warning"
            size="sm"
          />
          <StatsCard
            icon={<Truck className="w-5 h-5 text-[var(--info)]" />}
            title="Active Dispatches"
            value={dispatches.filter((d) => d.status !== 'COMPLETED' && d.status !== 'CANCELLED').length}
            variant="info"
            size="sm"
          />
          <StatsCard
            icon={<Ship className="w-5 h-5 text-[var(--status-violet)]" />}
            title="Ocean Containers"
            value={containers.length}
            variant="default"
            size="sm"
          />
          <StatsCard
            icon={<AlertTriangle className="w-5 h-5 text-[var(--warning)]" />}
            title="Yard Aging Alert (>14d)"
            value={shipments.filter((s) => !s.containerId && getDwellDays(s.createdAt) >= 14).length}
            variant="warning"
            size="sm"
          />
        </DashboardGrid>

        {/* Mode Selector, Filters & Search Toolbar */}
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setMode('dispatch')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'dispatch'
                    ? 'bg-[var(--accent-gold)] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Inland Dispatch</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('container')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'container'
                    ? 'bg-[var(--accent-gold)] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Ship className="w-4 h-4" />
                <span>Container Stowing</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('pipeline')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'pipeline'
                    ? 'bg-[var(--accent-gold)] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Pipeline Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('analytics')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'analytics'
                    ? 'bg-[var(--accent-gold)] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Yard Radar</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2 flex-1 max-w-md min-w-[240px]">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search VIN, make/model, lot #, client, port..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:bg-[var(--panel)] transition-colors"
                  title="Scan VIN or Yard QR Code"
                  aria-label="Scan VIN or Yard QR Code"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Operational Quick Filter Pills */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[var(--border)] text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mr-1">
                Filter:
              </span>
              <button
                type="button"
                onClick={() => setActiveFilterTag('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeFilterTag === 'all'
                    ? 'bg-[var(--text-primary)] text-[var(--background)]'
                    : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                All Ready ({shipments.filter(s => mode === 'dispatch' ? !s.dispatchId : !s.containerId).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTag('title_ok')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  activeFilterTag === 'title_ok'
                    ? 'bg-[var(--success)] text-white'
                    : 'bg-[var(--background)] text-[var(--success)] border border-[rgba(var(--success-rgb),0.3)]'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Title Ready</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTag('title_pending')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  activeFilterTag === 'title_pending'
                    ? 'bg-[var(--warning)] text-white'
                    : 'bg-[var(--background)] text-[var(--warning)] border border-[rgba(var(--warning-rgb),0.3)]'
                }`}
              >
                <FileX className="w-3.5 h-3.5" />
                <span>Title Pending (Customs Hold)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTag('has_keys')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  activeFilterTag === 'has_keys'
                    ? 'bg-[var(--info)] text-white'
                    : 'bg-[var(--background)] text-[var(--info)] border border-[rgba(var(--info-rgb),0.3)]'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Keys Present</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTag('aging_alert')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  activeFilterTag === 'aging_alert'
                    ? 'bg-[var(--error)] text-white'
                    : 'bg-[var(--background)] text-[var(--error)] border border-[rgba(var(--error-rgb),0.3)]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Yard Aging &gt; 14 Days</span>
              </button>
            </div>

            {/* Port Filter Dropdown */}
            {availablePorts.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <select
                  value={portFilter}
                  onChange={(e) => setPortFilter(e.target.value)}
                  className="bg-[var(--background)] text-xs font-mono font-bold text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1 outline-none cursor-pointer"
                >
                  <option value="all">All Destination Ports</option>
                  {availablePorts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* WORKSPACE CONTENT */}
        {loading ? (
          <CompactSkeleton />
        ) : mode === 'dispatch' ? (
          /* ============================================================
             MODE 1: INLAND DISPATCH ALLOCATION (READY POOL -> DISPATCH LANES)
             ============================================================ */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Ready Vehicles Queue (Pool) */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[var(--accent-gold)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Ready Vehicles Pool ({readyShipmentsPool.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={selectAllPool}
                  className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-gold)]"
                >
                  {selectedShipmentIds.length === readyShipmentsPool.length && readyShipmentsPool.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              {/* Vehicle Cards List */}
              <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {readyShipmentsPool.length === 0 ? (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--border)] text-center text-[var(--text-secondary)]">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50 text-[var(--accent-gold)]" />
                    <p className="text-xs font-bold">No vehicles match current filters</p>
                    <p className="text-[11px] mt-1 opacity-70">Adjust search or tag filters above.</p>
                  </div>
                ) : (
                  readyShipmentsPool.map((s) => {
                    const isSelected = selectedShipmentIds.includes(s.id);
                    const dwellDays = getDwellDays(s.createdAt);

                    return (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, s.id)}
                        className={`group relative p-3 rounded-xl border bg-[var(--panel)] transition-all cursor-grab active:cursor-grabbing hover:shadow-md select-none ${
                          isSelected
                            ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5'
                            : 'border-[var(--border)] hover:border-[var(--accent-gold)]/60'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Selection Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => toggleSelectShipment(s.id, e)}
                            className="mt-0.5 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[var(--accent-gold)]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                                {s.vehicleYear || ''} {s.vehicleMake || 'Vehicle'} {s.vehicleModel || ''}
                              </h4>
                              {dwellDays >= 14 ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[rgba(var(--error-rgb),0.1)] text-[var(--error)] border border-[rgba(var(--error-rgb),0.3)]">
                                  {dwellDays}d Dwell
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]">
                                  {dwellDays}d
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
                              <span>VIN: {s.vehicleVIN ? `${s.vehicleVIN.slice(0, 8)}...${s.vehicleVIN.slice(-4)}` : 'N/A'}</span>
                              {s.lotNumber && <span>• Lot #{s.lotNumber}</span>}
                            </div>

                            {/* Tags: Keys, Title, Destination Port */}
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              {s.hasKey ? (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[rgba(var(--success-rgb),0.1)] text-[var(--success)] flex items-center gap-0.5">
                                  <Key className="w-2.5 h-2.5" /> Keys
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[rgba(var(--text-secondary-rgb),0.1)] text-[var(--text-secondary)]">
                                  No Keys
                                </span>
                              )}

                              {s.hasTitle ? (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[rgba(var(--success-rgb),0.1)] text-[var(--success)] flex items-center gap-0.5">
                                  <FileCheck className="w-2.5 h-2.5" /> Title OK
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[rgba(var(--warning-rgb),0.15)] text-[var(--warning)] font-bold flex items-center gap-0.5">
                                  <AlertCircle className="w-2.5 h-2.5" /> Title Pending
                                </span>
                              )}

                              {s.destinationPort && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[rgba(var(--info-rgb),0.1)] text-[var(--info)]">
                                  {s.destinationPort.split('(')[0]}
                                </span>
                              )}
                            </div>

                            {s.user?.name && (
                              <p className="mt-1 text-[10px] text-[var(--text-secondary)] truncate">
                                Client: <strong className="text-[var(--text-primary)]">{s.user.name}</strong>
                              </p>
                            )}

                            {/* 1-Tap Quick Assign Button (Mobile / Non-Drag) */}
                            <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => {
                                  setSingleAssignShipment(s);
                                  setAssignTargetType('dispatch');
                                }}
                                className="text-[11px] font-bold text-[var(--info)] hover:text-[var(--info)] flex items-center gap-1"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Assign to Dispatch →</span>
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectingShipment(s);
                                  }}
                                  className="text-[11px] font-semibold text-[var(--accent-gold)] hover:brightness-110 flex items-center gap-1"
                                  title="Inspect 2D damage blueprint & yard intake"
                                >
                                  <Car className="w-3 h-3" />
                                  <span>Inspect</span>
                                </button>

                                <Link href={`/dashboard/shipments/${s.id}`} style={{ textDecoration: 'none' }}>
                                  <Eye className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" />
                                </Link>
                              </div>
                            </div>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center self-center text-[var(--text-secondary)]">
                            <GripVertical className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Dispatch Lanes / Carrier Targets */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Active Dispatch Lanes ({dispatches.length}) • Drag vehicles or use Quick Assign
                </span>
                <span className="text-xs text-[var(--accent-gold)] font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Tactile Dropzones Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dispatches.map((dispatch) => {
                  const isDropActive = activeDropTarget === dispatch.id;
                  return (
                    <div
                      key={dispatch.id}
                      onDragOver={(e) => handleDragOver(e, dispatch.id)}
                      onDragLeave={(e) => handleDragLeave(e, dispatch.id)}
                      onDrop={() => handleDropToDispatch(dispatch.id)}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[280px] ${
                        isDropActive
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 ring-4 ring-[var(--accent-gold)]/30 scale-[1.01] shadow-xl'
                          : 'border-[var(--border)] bg-[var(--panel)] shadow-sm'
                      }`}
                    >
                      {/* Dispatch Header */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                                {dispatch.referenceNumber}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[rgba(var(--info-rgb),0.1)] text-[var(--info)] border border-[rgba(var(--info-rgb),0.2)]">
                                {DISPATCH_STATUS_LABELS[dispatch.status as keyof typeof DISPATCH_STATUS_LABELS] || dispatch.status}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                              Carrier: <strong className="text-[var(--text-primary)]">{dispatch.company?.name || 'General Carrier'}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openDispatchManifest(dispatch)}
                              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
                              title="Print Load Order & Gatepass"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <Link href={`/dashboard/dispatches/${dispatch.id}`} style={{ textDecoration: 'none' }}>
                              <button
                                type="button"
                                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
                                title="View Dispatch Details"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </button>
                            </Link>
                          </div>
                        </div>

                        {/* Route Info */}
                        <div className="mt-3 p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-[var(--text-secondary)] truncate">
                            <MapPin className="w-3.5 h-3.5 text-[var(--info)] shrink-0" />
                            <span className="truncate">{dispatch.origin}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0 mx-1" />
                          <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-semibold truncate">
                            <span className="truncate">{dispatch.destination}</span>
                          </div>
                        </div>
                      </div>

                      {/* Assigned Shipments Dropzone Container */}
                      <div className="mt-3 flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            Assigned Vehicles ({dispatch.shipments?.length || 0})
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {dispatch.shipments && dispatch.shipments.length > 0 ? (
                            dispatch.shipments.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Truck className="w-3.5 h-3.5 text-[var(--info)] shrink-0" />
                                  <span className="font-bold text-[var(--text-primary)] truncate">
                                    {item.vehicleYear || ''} {item.vehicleMake || ''} {item.vehicleModel || ''}
                                  </span>
                                  {item.vehicleVIN && (
                                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                                      ({item.vehicleVIN.slice(-4)})
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUnassignFromDispatch(item.id)}
                                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors"
                                  title="Unassign vehicle from dispatch"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div
                              className={`p-4 rounded-xl border-2 border-dashed text-center transition-colors ${
                                isDropActive
                                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] font-bold'
                                  : 'border-[var(--border)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <span className="text-xs">
                                {isDropActive ? '⚡ Drop vehicle(s) here to assign' : 'Drag & drop vehicles here'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Status Advance Toolbar */}
                      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                          ETA: {dispatch.estimatedArrival ? new Date(dispatch.estimatedArrival).toLocaleDateString() : 'TBD'}
                        </span>
                        <div className="flex items-center gap-1">
                          {dispatch.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateDispatchStatus(dispatch.id, 'DISPATCHED')}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--info)] text-white hover:bg-[var(--info)] transition-colors"
                            >
                              Dispatch Now
                            </button>
                          )}
                          {dispatch.status === 'DISPATCHED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateDispatchStatus(dispatch.id, 'IN_TRANSIT')}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--status-violet)] text-white hover:bg-[var(--status-violet-dark)] transition-colors"
                            >
                              Mark In Transit
                            </button>
                          )}
                          {dispatch.status === 'IN_TRANSIT' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateDispatchStatus(dispatch.id, 'COMPLETED')}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--success)] text-white hover:bg-[var(--success-dark)] transition-colors"
                            >
                              Mark Arrived
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : mode === 'container' ? (
          /* ============================================================
             MODE 2: CONTAINER STOWING (READY POOL -> OCEAN CONTAINERS)
             ============================================================ */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Ready Vehicles Queue (Pool) */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Ship className="w-4 h-4 text-[var(--accent-gold)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Ready to Stow ({readyShipmentsPool.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={selectAllPool}
                  className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-gold)]"
                >
                  {selectedShipmentIds.length === readyShipmentsPool.length && readyShipmentsPool.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {readyShipmentsPool.map((s) => {
                  const isSelected = selectedShipmentIds.includes(s.id);
                  const dwellDays = getDwellDays(s.createdAt);

                  return (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, s.id)}
                      className={`group relative p-3 rounded-xl border bg-[var(--panel)] transition-all cursor-grab active:cursor-grabbing hover:shadow-md select-none ${
                        isSelected
                          ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5'
                          : 'border-[var(--border)] hover:border-[var(--accent-gold)]/60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => toggleSelectShipment(s.id, e)}
                          className="mt-0.5 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[var(--accent-gold)]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {s.vehicleYear || ''} {s.vehicleMake || 'Vehicle'} {s.vehicleModel || ''}
                            </h4>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]">
                              {dwellDays}d dwell
                            </span>
                          </div>

                          <p className="mt-0.5 text-[11px] font-mono text-[var(--text-secondary)]">
                            VIN: {s.vehicleVIN || 'N/A'}
                          </p>

                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {s.destinationPort && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">
                                Port: {s.destinationPort}
                              </span>
                            )}
                            {s.hasTitle ? (
                              <span className="text-[9px] font-semibold text-[var(--success)]">✓ Title OK</span>
                            ) : (
                              <span className="text-[9px] font-semibold text-[var(--warning)]">⚠️ Title Pending</span>
                            )}
                          </div>

                          {/* 1-Tap Quick Stow Button */}
                          <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                setSingleAssignShipment(s);
                                setAssignTargetType('container');
                              }}
                              className="text-[11px] font-bold text-[var(--status-violet)] hover:text-[var(--info)] flex items-center gap-1"
                            >
                              <Ship className="w-3 h-3" />
                              <span>Stow into Container →</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectingShipment(s);
                                }}
                                className="text-[11px] font-semibold text-[var(--accent-gold)] hover:brightness-110 flex items-center gap-1"
                                title="Inspect 2D damage blueprint & yard intake"
                              >
                                <Car className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>

                              <Link href={`/dashboard/shipments/${s.id}`} style={{ textDecoration: 'none' }}>
                                <Eye className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" />
                              </Link>
                            </div>
                          </div>
                        </div>
                        <GripVertical className="w-4 h-4 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Ocean Containers Grid */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Active Ocean Containers ({containers.length}) • Drag vehicles into a container to stow
                </span>
                <span className="text-xs text-[var(--accent-gold)] font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Stowing Capacity Live
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {containers.map((c) => {
                  const isDropActive = activeDropTarget === c.id;
                  const capacityPct = Math.round(((c.shipments?.length || 0) / c.maxCapacity) * 100);
                  const isFull = (c.shipments?.length || 0) >= c.maxCapacity;

                  return (
                    <div
                      key={c.id}
                      onDragOver={(e) => handleDragOver(e, c.id)}
                      onDragLeave={(e) => handleDragLeave(e, c.id)}
                      onDrop={() => handleDropToContainer(c.id)}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[300px] ${
                        isDropActive
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 ring-4 ring-[var(--accent-gold)]/30 scale-[1.01] shadow-xl'
                          : 'border-[var(--border)] bg-[var(--panel)] shadow-sm'
                      }`}
                    >
                      {/* Container Header */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                                {c.containerNumber}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[rgba(var(--success-rgb),0.1)] text-[var(--success)] border border-[rgba(var(--success-rgb),0.2)]">
                                {c.status}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                              {c.vesselName || 'Vessel Assigned'} • <strong className="text-[var(--accent-gold)]">{c.destinationPort || 'Destination Port'}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openContainerManifest(c)}
                              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
                              title="Print Container Load Order"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <Link href={`/dashboard/containers/${c.id}`} style={{ textDecoration: 'none' }}>
                              <button
                                type="button"
                                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
                                title="View Container Details"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </button>
                            </Link>
                          </div>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[var(--text-secondary)]">Stowing Capacity</span>
                            <span className={`font-bold ${isFull ? 'text-[var(--error)]' : 'text-[var(--accent-gold)]'}`}>
                              {c.shipments?.length || 0} / {c.maxCapacity} Vehicles ({capacityPct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[var(--background)] overflow-hidden border border-[var(--border)]">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isFull ? 'bg-[var(--error)]' : 'bg-[var(--accent-gold)]'
                              }`}
                              style={{ width: `${Math.min(capacityPct, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* 4-Slot Visual Container Stowing Bay Graphic */}
                        <div className="mt-3 p-2 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                          <div className="grid grid-cols-4 gap-1.5">
                            {Array.from({ length: c.maxCapacity }).map((_, slotIdx) => {
                              const vehicleInSlot = c.shipments?.[slotIdx];
                              return (
                                <div
                                  key={slotIdx}
                                  className={`p-1.5 rounded-lg border text-center text-[10px] font-mono truncate transition-all ${
                                    vehicleInSlot
                                      ? 'bg-[var(--panel)] border-[var(--accent-gold)]/40 text-[var(--text-primary)] font-bold'
                                      : 'border-dashed border-[var(--border)] text-[var(--text-secondary)] opacity-60'
                                  }`}
                                  title={vehicleInSlot ? `${vehicleInSlot.vehicleYear || ''} ${vehicleInSlot.vehicleMake || ''} ${vehicleInSlot.vehicleModel || ''}` : `Slot ${slotIdx + 1} Open`}
                                >
                                  {vehicleInSlot ? (
                                    <div className="truncate">
                                      <span>🚗 #{slotIdx + 1}</span>
                                      <p className="truncate text-[9px] text-[var(--text-secondary)]">{vehicleInSlot.vehicleMake || 'Car'}</p>
                                    </div>
                                  ) : (
                                    <span>Empty</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Stowed Vehicles List */}
                      <div className="mt-3 flex-1">
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {c.shipments && c.shipments.length > 0 ? (
                            c.shipments.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Package className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
                                  <span className="font-bold text-[var(--text-primary)] truncate">
                                    {item.vehicleYear || ''} {item.vehicleMake || ''} {item.vehicleModel || ''}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUnassignFromContainer(item.id)}
                                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors"
                                  title="Remove from container"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div
                              className={`p-3 rounded-xl border-2 border-dashed text-center transition-colors ${
                                isDropActive
                                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] font-bold'
                                  : 'border-[var(--border)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <span className="text-xs">
                                {isDropActive ? '⚡ Drop vehicle(s) here to stow' : 'Container empty — drag vehicles here'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : mode === 'pipeline' ? (
          /* ============================================================
             MODE 3: END-TO-END PIPELINE KANBAN (DRAG ACROSS WORKFLOW STAGES)
             ============================================================ */
          <div className="flex items-start gap-4 overflow-x-auto pb-4 no-scrollbar">
            {PIPELINE_COLUMNS.map((col) => {
              const colShipments = shipments.filter((s) => {
                if (col.key === 'ON_HAND') return s.status === 'ON_HAND' || (!s.dispatchId && !s.containerId);
                if (col.key === 'DISPATCHING') return s.status === 'DISPATCHING' || s.dispatchId;
                if (col.key === 'IN_TRANSIT') return s.status === 'IN_TRANSIT' || s.containerId;
                if (col.key === 'ARRIVED_PORT') return s.status === 'ARRIVED_PORT' || s.status === 'CUSTOMS_CLEARANCE';
                if (col.key === 'DELIVERED') return s.status === 'DELIVERED' || s.status === 'RELEASED';
                return s.status === col.key;
              });

              const isDropActive = activeDropTarget === col.key;

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={(e) => handleDragLeave(e, col.key)}
                  onDrop={() => handleDropToPipelineStage(col.key)}
                  className={`w-72 shrink-0 rounded-2xl border bg-[var(--panel)] p-3 transition-all flex flex-col min-h-[500px] ${
                    isDropActive
                      ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 ring-4 ring-[var(--accent-gold)]/30'
                      : 'border-[var(--border)] shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                      <h3 className="text-xs font-bold text-[var(--text-primary)]">
                        {col.label}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-bold font-mono rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]">
                      {colShipments.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
                    {colShipments.length === 0 ? (
                      <div className="p-6 text-center text-[var(--text-secondary)] text-xs border-2 border-dashed border-[var(--border)] rounded-xl">
                        Drop vehicles here
                      </div>
                    ) : (
                      colShipments.map((s) => (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, s.id)}
                          className="group p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)] transition-all cursor-grab active:cursor-grabbing hover:shadow-md select-none"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {s.vehicleYear || ''} {s.vehicleMake || 'Vehicle'} {s.vehicleModel || ''}
                            </h4>
                            <Link href={`/dashboard/shipments/${s.id}`} style={{ textDecoration: 'none' }}>
                              <Eye className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </div>
                          <p className="mt-1 text-[11px] font-mono text-[var(--text-secondary)]">
                            VIN: {s.vehicleVIN ? `${s.vehicleVIN.slice(0, 8)}...` : 'N/A'}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                            <span>{s.destinationPort || 'No Port'}</span>
                            <span>{getDwellDays(s.createdAt)}d dwell</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ============================================================
             MODE 4: YARD RADAR & BOTTLENECK AUDIT (OPERATIONS ANALYTICS)
             ============================================================ */
          <div className="space-y-6">
            <DashboardGrid className="grid-cols-1 md:grid-cols-3">
              <DashboardPanel title="Title & Customs Hold Risk" description="Vehicles blocked from export due to missing original titles">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(var(--warning-rgb),0.1)] border border-[rgba(var(--warning-rgb),0.3)] text-[var(--warning)]">
                    <span className="text-xs font-bold">Titles Pending:</span>
                    <span className="text-lg font-mono font-extrabold">
                      {shipments.filter((s) => !s.hasTitle).length}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    US Customs requires original titles prior to container loading. Ensure titles are received before stowing.
                  </p>
                </div>
              </DashboardPanel>

              <DashboardPanel title="Yard Aging & Storage Accumulation" description="Vehicles dwelling in warehouse for over 14 days">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(var(--error-rgb),0.1)] border border-[rgba(var(--error-rgb),0.3)] text-[var(--error)]">
                    <span className="text-xs font-bold">Aging Alerts (&gt;14d):</span>
                    <span className="text-lg font-mono font-extrabold">
                      {shipments.filter((s) => !s.containerId && getDwellDays(s.createdAt) >= 14).length}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Vehicles exceeding 14 days may trigger yard demurrage and storage penalties. Prioritize for dispatch.
                  </p>
                </div>
              </DashboardPanel>

              <DashboardPanel title="Stowing Efficiency" description="Fleet-wide container capacity utilization">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(var(--status-violet-rgb),0.1)] border border-[rgba(var(--status-violet-rgb),0.3)] text-[var(--info)]">
                    <span className="text-xs font-bold">Avg Container Load:</span>
                    <span className="text-lg font-mono font-extrabold">
                      {containers.length > 0
                        ? Math.round(
                            (containers.reduce((acc, c) => acc + (c.shipments?.length || 0), 0) /
                              containers.reduce((acc, c) => acc + c.maxCapacity, 0)) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Target is 90%+ utilization per 40ft High Cube container (4 vehicles per container).
                  </p>
                </div>
              </DashboardPanel>
            </DashboardGrid>
          </div>
        )}

        {/* FLOATING BATCH ACTION DOCK (Appears when 1+ vehicles selected) */}
        {selectedShipmentIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 flex-wrap max-w-[calc(100vw-32px)]">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-gold)] animate-pulse" />
              <span className="text-xs font-mono font-bold text-slate-200">
                {selectedShipmentIds.length} Vehicle{selectedShipmentIds.length > 1 ? 's' : ''} Selected
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAssignTargetType('dispatch')}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Assign to Dispatch</span>
            </button>

            <button
              type="button"
              onClick={() => setAssignTargetType('container')}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Ship className="w-3.5 h-3.5" />
              <span>Stow into Container</span>
            </button>

            {selectedShipmentIds.length === 1 && (
              <button
                type="button"
                onClick={() => {
                  const s = shipments.find((u) => u.id === selectedShipmentIds[0]);
                  if (s) setInspectingShipment(s);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Car className="w-3.5 h-3.5" />
                <span>Damage Blueprint</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedShipmentIds([])}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Assign Target Modal (For Touch / Click-to-Assign) */}
        <Modal
          open={Boolean(assignTargetType)}
          onClose={() => {
            setAssignTargetType(null);
            setSingleAssignShipment(null);
          }}
          title={
            assignTargetType === 'dispatch'
              ? `Assign to Dispatch Lane (${singleAssignShipment ? 1 : selectedShipmentIds.length} vehicle(s))`
              : `Stow into Ocean Container (${singleAssignShipment ? 1 : selectedShipmentIds.length} vehicle(s))`
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">
              Select the destination {assignTargetType === 'dispatch' ? 'dispatch lane' : 'container'} to allocate the selected vehicle(s):
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {assignTargetType === 'dispatch' ? (
                dispatches.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      if (singleAssignShipment) {
                        setDraggedShipmentIds([singleAssignShipment.id]);
                      }
                      handleDropToDispatch(d.id);
                      setAssignTargetType(null);
                      setSingleAssignShipment(null);
                    }}
                    className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)] flex items-center justify-between text-left transition-all hover:bg-[var(--panel)]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[var(--text-primary)]">{d.referenceNumber}</span>
                        <span className="text-[10px] text-[var(--info)] font-semibold">({d.company?.name || 'Carrier'})</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{d.origin} → {d.destination}</p>
                    </div>
                    <span className="text-xs font-bold text-[var(--info)]">Assign →</span>
                  </button>
                ))
              ) : (
                containers.map((c) => {
                  const isFull = (c.shipments?.length || 0) >= c.maxCapacity;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => {
                        if (singleAssignShipment) {
                          setDraggedShipmentIds([singleAssignShipment.id]);
                        }
                        handleDropToContainer(c.id);
                        setAssignTargetType(null);
                        setSingleAssignShipment(null);
                      }}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                        isFull
                          ? 'border-[var(--border)] bg-[var(--background)] opacity-50 cursor-not-allowed'
                          : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)] hover:bg-[var(--panel)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[var(--text-primary)]">{c.containerNumber}</span>
                          <span className="text-[10px] text-[var(--accent-gold)] font-semibold">({c.destinationPort || 'Port'})</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          Capacity: {c.shipments?.length || 0} / {c.maxCapacity} {isFull ? '(FULL)' : ''}
                        </p>
                      </div>
                      <span className={`text-xs font-bold ${isFull ? 'text-[var(--text-secondary)]' : 'text-[var(--status-violet)]'}`}>
                        {isFull ? 'Full' : 'Stow →'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </Modal>

        {/* Printable Load Order & Gatepass Manifest Modal */}
        <Modal
          open={Boolean(printManifestData)}
          onClose={() => setPrintManifestData(null)}
          title={`Load Order & Gatepass Manifest (${printManifestData?.referenceNumber || ''})`}
        >
          {printManifestData && (
            <div className="space-y-4 font-sans text-xs">
              {/* Header Box */}
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--text-primary)]">JACXI LOGISTICS MANIFEST</span>
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[var(--panel)] border">
                    {printManifestData.referenceNumber}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Carrier / Shipping Line: <strong>{printManifestData.carrierName}</strong>
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border)] text-[11px]">
                  <span>Origin: <strong>{printManifestData.origin}</strong></span>
                  <span>Destination: <strong>{printManifestData.destination}</strong></span>
                </div>
              </div>

              {/* Vehicles Manifest Table */}
              <div>
                <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-secondary)] block mb-1">
                  Loaded Vehicles List ({printManifestData.shipments.length})
                </span>
                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[var(--panel)] text-[10px] uppercase font-bold text-[var(--text-secondary)] border-b">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Vehicle</th>
                        <th className="p-2 font-mono">VIN</th>
                        <th className="p-2">Lot #</th>
                        <th className="p-2">Keys</th>
                        <th className="p-2">Title</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-[11px]">
                      {printManifestData.shipments.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-[var(--background)]">
                          <td className="p-2 font-mono">{idx + 1}</td>
                          <td className="p-2 font-bold">{s.vehicleYear || ''} {s.vehicleMake || ''} {s.vehicleModel || ''}</td>
                          <td className="p-2 font-mono text-[10px]">{s.vehicleVIN || 'N/A'}</td>
                          <td className="p-2 font-mono">{s.lotNumber || '—'}</td>
                          <td className="p-2">{s.hasKey ? '✓ Yes' : '— No'}</td>
                          <td className="p-2">{s.hasTitle ? '✓ Yes' : '⚠️ Pending'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Driver & Yard Signature Block */}
              <div className="pt-3 border-t border-[var(--border)] grid grid-cols-2 gap-4 text-[10px]">
                <div className="p-2 rounded border border-dashed text-center">
                  <p className="text-[var(--text-secondary)]">Driver Handoff Signature</p>
                  <div className="h-8" />
                  <p className="border-t pt-1 font-mono">Date: _______________</p>
                </div>
                <div className="p-2 rounded border border-dashed text-center">
                  <p className="text-[var(--text-secondary)]">Yard Dispatcher Signature</p>
                  <div className="h-8" />
                  <p className="border-t pt-1 font-mono">Date: _______________</p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <Button variant="outline" onClick={() => setPrintManifestData(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  icon={<Printer className="w-4 h-4" />}
                  onClick={() => window.print()}
                >
                  Print Manifest
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Quick Create Dispatch Modal */}
        <Modal
          open={showCreateDispatchModal}
          onClose={() => setShowCreateDispatchModal(false)}
          title="Create New Inland Dispatch"
        >
          <form onSubmit={handleCreateDispatch} className="space-y-4">
            <Select
              label="Logistics Carrier / Company"
              value={dispatchForm.companyId}
              onChange={(val) => setDispatchForm({ ...dispatchForm, companyId: String(val) })}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
            />

            <FormField
              label="Origin (Yard / Pickup Location)"
              value={dispatchForm.origin}
              onChange={(e) => setDispatchForm({ ...dispatchForm, origin: e.target.value })}
              placeholder="e.g., USA East Coast Yard"
            />

            <FormField
              label="Destination (Port / Delivery Location)"
              value={dispatchForm.destination}
              onChange={(e) => setDispatchForm({ ...dispatchForm, destination: e.target.value })}
              placeholder="e.g., Port of Newark (USNWK)"
            />

            <FormField
              label="Estimated Arrival (ETA)"
              type="date"
              value={dispatchForm.estimatedArrival}
              onChange={(e) => setDispatchForm({ ...dispatchForm, estimatedArrival: e.target.value })}
            />

            <FormField
              label="Notes / Instructions"
              value={dispatchForm.notes}
              onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
              placeholder="Optional notes for truck driver or carrier"
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowCreateDispatchModal(false)}
                disabled={creatingDispatch}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={creatingDispatch}>
                {creatingDispatch ? 'Creating...' : 'Create Dispatch Lane'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Quick Create Container Modal */}
        <Modal
          open={showCreateContainerModal}
          onClose={() => setShowCreateContainerModal(false)}
          title="Create New Ocean Container"
        >
          <form onSubmit={handleCreateContainer} className="space-y-4">
            <FormField
              label="Container Number"
              value={containerForm.containerNumber}
              onChange={(e) => setContainerForm({ ...containerForm, containerNumber: e.target.value })}
              placeholder="e.g., MSKU9048123"
            />

            <FormField
              label="Destination Port"
              value={containerForm.destinationPort}
              onChange={(e) => setContainerForm({ ...containerForm, destinationPort: e.target.value })}
              placeholder="e.g., Port of Jebel Ali (AEJEA)"
            />

            <Select
              label="Ocean Shipping Line (Optional)"
              value={containerForm.companyId}
              onChange={(val) => setContainerForm({ ...containerForm, companyId: String(val) })}
              options={[
                { value: '', label: 'Select Carrier (Optional)' },
                ...companies.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />

            <FormField
              label="Max Capacity (Vehicles)"
              type="number"
              value={containerForm.maxCapacity}
              onChange={(e) => setContainerForm({ ...containerForm, maxCapacity: Number(e.target.value) || 4 })}
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowCreateContainerModal(false)}
                disabled={creatingContainer}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={creatingContainer}>
                {creatingContainer ? 'Creating...' : 'Create Container'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Vehicle Damage 2D Blueprint & Yard Intake Modal */}
        {inspectingShipment && (
          <VehicleDamageInspectionModal
            isOpen={Boolean(inspectingShipment)}
            onClose={() => setInspectingShipment(null)}
            shipment={{
              id: inspectingShipment.id,
              vehicleYear: inspectingShipment.vehicleYear,
              vehicleMake: inspectingShipment.vehicleMake,
              vehicleModel: inspectingShipment.vehicleModel,
              vehicleVIN: inspectingShipment.vehicleVIN,
              lotNumber: inspectingShipment.lotNumber,
              auctionName: inspectingShipment.auctionName,
              purchaseLocation: inspectingShipment.purchaseLocation,
              hasKey: inspectingShipment.hasKey,
              user: inspectingShipment.user,
            }}
            onInspectionSaved={() => {
              fetchBoardData();
            }}
          />
        )}

        {/* Yard Sticker & VIN Barcode Scanner */}
        <BarcodeScannerModal
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(scanned) => {
            setScannerOpen(false);
            setSearchQuery(scanned);
            toast.success('Sticker scanned', { description: `Filtering board to: ${scanned}` });
          }}
          title="Scan Yard Sticker or VIN"
          description="Align the QR code sticker or VIN barcode within the camera frame"
        />
      </DashboardSurface>
    </ProtectedRoute>
  );
}
