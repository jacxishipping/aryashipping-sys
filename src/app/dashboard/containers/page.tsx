'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Package, Ship, MapPin, TrendingUp, Calendar, FileText, DollarSign, Receipt, MoreVertical, Eye, Copy, Trash2, Download, PanelRightOpen, QrCode, Layers, Compass } from 'lucide-react';

function sxToStyle(sx?: any): React.CSSProperties {
  if (!sx) return {};
  const style: any = {};
  for (const [key, val] of Object.entries(sx)) {
    if (key.startsWith('&') || key.startsWith('@')) continue;
    if (typeof val === 'object' && val !== null) {
      const resolved = (val as any).xs ?? (val as any).md ?? (val as any).lg;
      if (resolved !== undefined) style[key] = resolved;
      continue;
    }
    if (key === 'bgcolor') style.backgroundColor = val;
    else if (key === 'p') style.padding = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'px') { style.paddingLeft = typeof val === 'number' ? `${val * 8}px` : val; style.paddingRight = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'py') { style.paddingTop = typeof val === 'number' ? `${val * 8}px` : val; style.paddingBottom = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'pt') style.paddingTop = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pb') style.paddingBottom = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pl') style.paddingLeft = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pr') style.paddingRight = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'm') style.margin = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mx') { style.marginLeft = typeof val === 'number' ? `${val * 8}px` : val; style.marginRight = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'my') { style.marginTop = typeof val === 'number' ? `${val * 8}px` : val; style.marginBottom = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'mt') style.marginTop = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mb') style.marginBottom = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'ml') style.marginLeft = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mr') style.marginRight = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'gap') style.gap = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'borderRadius') style.borderRadius = typeof val === 'number' ? `${val * 8}px` : val;
    else style[key] = val;
  }
  return style;
}

function Box({ children, className = '', component: Component = 'div', sx, style, ...props }: any) {
  return (
    <Component className={className} style={{ ...sxToStyle(sx), ...style }} {...props}>
      {children}
    </Component>
  );
}

function Typography({ children, className = '', component: Component = 'div', variant, color, noWrap, sx, style, ...props }: any) {
  const variantClass = variant === 'caption' ? 'text-xs text-[var(--text-secondary)]' : variant === 'subtitle2' ? 'text-sm font-semibold' : variant === 'body2' ? 'text-sm' : '';
  return (
    <Component className={`${variantClass} ${noWrap ? 'truncate' : ''} ${className}`} style={{ ...sxToStyle(sx), ...style }} {...props}>
      {children}
    </Component>
  );
}

function IconButton({ children, onClick, size, className = '', sx, ...props }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded-lg hover:bg-[var(--panel-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center justify-center ${className}`}
      style={sxToStyle(sx)}
      {...props}
    >
      {children}
    </button>
  );
}

function Divider({ sx, className = '' }: any) {
  return <hr className={`border-[var(--border)] my-1 ${className}`} style={sxToStyle(sx)} />;
}

function Menu({ anchorEl, open, onClose, children }: { anchorEl: HTMLElement | null; open: boolean; onClose: () => void; children: React.ReactNode; [key: string]: any }) {
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (open && anchorEl && !anchorEl.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [open, anchorEl, onClose]);

  if (!open || !anchorEl) return null;
  const rect = anchorEl.getBoundingClientRect();

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div 
        className="absolute z-50 min-w-[190px] rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-xl py-1 text-sm text-[var(--text-primary)] animate-fade-in overflow-hidden"
        style={{ top: `${rect.bottom + window.scrollY + 4}px`, right: `${Math.max(12, window.innerWidth - rect.right)}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function MenuItem({ children, onClick, sx, className = '' }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center px-4 py-2.5 text-left text-sm hover:bg-[rgba(var(--accent-gold-rgb),0.1)] transition-colors text-[var(--text-primary)] ${className}`}
      style={sxToStyle(sx)}
    >
      {children}
    </button>
  );
}
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, StatsCard, Button, EmptyState, FormField, Select, toast, SkeletonCard, DashboardPageSkeleton, CompactSkeleton, StatusBadge, CopyButton, StatusFilterPills } from '@/components/design-system';
import ContainerQuickPeek from '@/components/dashboard/ContainerQuickPeek';
import { QRCodeModal, type QRCodeData } from '@/components/dashboard/QRCodeModal';
import { SavedFilterPresets } from '@/components/dashboard/SavedFilterPresets';
import { OceanRouteMap } from '@/components/dashboard/OceanRouteMap';
import { ContainerLoadPlanner } from '@/components/dashboard/ContainerLoadPlanner';
import { addWorkspaceItem } from '@/components/dashboard/WorkspaceTray';
import { DataTable, Column } from '@/components/ui/DataTable';
import { exportToCSVWithHeaders } from '@/lib/export';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';

interface Container {
  id: string;
  containerNumber: string;
  trackingNumber: string | null;
  vesselName: string | null;
  voyageNumber?: string | null;
  shippingLine: string | null;
  loadingPort?: string | null;
  destinationPort: string | null;
  departureDate?: string | null;
  estimatedArrival: string | null;
  status: string;
  progress: number;
  currentCount: number;
  maxCapacity: number;
  createdAt: string;
  _count: {
    shipments: number;
    expenses: number;
    invoices: number;
    documents: number;
  };
}

const statusLabels: Record<string, string> = {
  CREATED: 'Created',
  WAITING_FOR_LOADING: 'Waiting',
  LOADED: 'Loaded',
  IN_TRANSIT: 'In Transit',
  ARRIVED_PORT: 'Arrived',
  CUSTOMS_CLEARANCE: 'Customs',
  RELEASED: 'Released',
  CLOSED: 'Closed',
};

export default function ContainersPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showBulkTable, setShowBulkTable] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [quickPeekContainerId, setQuickPeekContainerId] = useState<string | null>(null);
  const [qrModalData, setQrModalData] = useState<QRCodeData | null>(null);
  const [plannerContainer, setPlannerContainer] = useState<Container | null>(null);
  const [showOceanTracker, setShowOceanTracker] = useState(false);
  const [activeOceanContainerId, setActiveOceanContainerId] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const handleOpenQR = (container: Container, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQrModalData({
      type: 'CONTAINER',
      id: container.id,
      title: `Container ${container.containerNumber}`,
      code: container.containerNumber,
      trackingUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/tracking?container=${container.containerNumber}`,
      metadata: {
        vesselName: container.vesselName || undefined,
        destination: container.destinationPort || undefined,
        status: container.status,
      },
    });
  };

  useEffect(() => {
    fetchContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, searchQuery]);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/containers?${params}`, { cache: 'no-store' });
      const data = await response.json();

      if (response.ok) {
        setContainers(data.containers);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching containers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContainers();
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/containers/export-excel?${params}`);
      
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `containers-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Export started successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export containers');
    }
  };

  const confirmAction = useConfirmAction();

  const handleBulkDelete = async (containerIds: string[]) => {
    if (!isAdmin) return;

    if (!(await confirmAction({
      message: `Delete ${containerIds.length} container(s)? This cannot be undone.`,
      confirmText: 'Delete containers',
      severity: 'error',
    }))) {
      return;
    }

    try {
      const response = await fetch('/api/bulk/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', containerIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Bulk delete failed');
      }

      toast.success('Containers deleted', {
        description: `${data.deletedCount || 0} container(s) removed`,
      });

      if (data.skipped?.length) {
        toast.error('Some containers were not deleted', {
          description: data.skipped.map((item: { containerNumber: string }) => item.containerNumber).join(', '),
        });
      }

      fetchContainers();
    } catch (error) {
      console.error('Error deleting containers:', error);
      toast.error('Failed to delete containers');
    }
  };

  const handleBulkExport = (rows: Container[]) => {
    try {
      exportToCSVWithHeaders(
        rows.map((row) => ({
          containerNumber: row.containerNumber,
          status: row.status,
          trackingNumber: row.trackingNumber ?? '-',
          vesselName: row.vesselName ?? '-',
          destinationPort: row.destinationPort ?? '-',
          estimatedArrival: row.estimatedArrival ? new Date(row.estimatedArrival).toLocaleDateString() : '-',
          capacity: `${row.currentCount}/${row.maxCapacity}`,
        })),
        [
          { key: 'containerNumber', label: 'Container' },
          { key: 'status', label: 'Status' },
          { key: 'trackingNumber', label: 'Tracking' },
          { key: 'vesselName', label: 'Vessel' },
          { key: 'destinationPort', label: 'Destination' },
          { key: 'estimatedArrival', label: 'ETA' },
          { key: 'capacity', label: 'Capacity' },
        ],
        'containers'
      );
      toast.success('Export ready');
    } catch (error) {
      console.error('Error exporting containers:', error);
      toast.error('Failed to export containers');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, container: Container) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedContainer(container);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedContainer(null);
  };

  const handleViewContainer = () => {
    if (selectedContainer) {
      router.push(`/dashboard/containers/${selectedContainer.id}`);
    }
    handleMenuClose();
  };

  const handleDuplicateContainer = () => {
    if (selectedContainer) {
      router.push(`/dashboard/containers/${selectedContainer.id}?action=duplicate`);
    }
    handleMenuClose();
  };

  const handleDeleteContainer = async () => {
    if (!selectedContainer) return;
    
    if (selectedContainer.currentCount > 0) {
      toast.error('Cannot delete container', {
        description: 'Remove all shipments first'
      });
      handleMenuClose();
      return;
    }

    if (!(await confirmAction({
      message: `Delete container ${selectedContainer.containerNumber}? This cannot be undone.`,
      confirmText: 'Delete container',
      severity: 'error',
    }))) {
      handleMenuClose();
      return;
    }

    try {
      const response = await fetch(`/api/containers/${selectedContainer.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Container deleted successfully');
        fetchContainers();
      } else {
        const data = await response.json();
        toast.error('Failed to delete container', {
          description: data.error
        });
      }
    } catch (error) {
      console.error('Error deleting container:', error);
      toast.error('An error occurred');
    }
    
    handleMenuClose();
  };

  const stats = {
    total: containers.length,
    inTransit: containers.filter(c => c.status === 'IN_TRANSIT').length,
    arrived: containers.filter(c => c.status === 'ARRIVED_PORT' || c.status === 'RELEASED').length,
    avgCapacity: containers.length > 0 
      ? Math.round((containers.reduce((sum, c) => sum + (c.currentCount / c.maxCapacity * 100), 0) / containers.length))
      : 0,
  };

  const containerStatusOptions = Object.entries(statusLabels).map(([value, label]) => ({
    value,
    label,
  }));
  const statusFilterOptions = [
    { value: 'all', label: 'All Status' },
    ...containerStatusOptions,
  ];

  const containerColumns: Column<Container>[] = [
    {
      key: 'containerNumber',
      header: 'Container',
      sortable: true,
      render: (value) => (
        <span className="inline-flex items-center gap-1.5 font-mono font-semibold">
          <span>{String(value)}</span>
          <CopyButton value={String(value)} label="Container #" />
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <StatusBadge status={String(value)} size="sm" />,
    },
    {
      key: 'trackingNumber',
      header: 'Tracking',
      sortable: true,
      render: (value) =>
        value ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs">
            <span>{String(value)}</span>
            <CopyButton value={String(value)} label="Tracking #" />
          </span>
        ) : (
          <span className="text-[var(--text-secondary)]">-</span>
        ),
    },
    { key: 'vesselName', header: 'Vessel', sortable: true },
    { key: 'destinationPort', header: 'Destination', sortable: true },
    {
      key: 'estimatedArrival',
      header: 'ETA',
      sortable: true,
      render: (value) => (value ? new Date(String(value)).toLocaleDateString() : '-'),
    },
    {
      key: 'currentCount',
      header: 'Capacity',
      render: (_value, row) => `${row.currentCount}/${row.maxCapacity}`,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_value, row) => (
        <div className="inline-flex items-center gap-1 whitespace-nowrap justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              setActiveOceanContainerId(row.id);
              setShowOceanTracker(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              toast.info(`Tracking route for container ${row.containerNumber}`);
            }}
            title="Track route on Ocean Map"
            aria-label="Track route on Ocean Map"
            className="p-1.5 rounded-lg text-[var(--info)] hover:bg-[rgba(var(--info-rgb),0.1)] transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlannerContainer(row)}
            title="2D Visual Load Planner"
            aria-label="2D Visual Load Planner"
            className="p-1.5 rounded-lg text-[var(--accent-gold)] hover:bg-[rgba(var(--accent-gold-rgb),0.12)] transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setQuickPeekContainerId(row.id)}
            title="Quick peek container manifest"
            aria-label="Quick peek container manifest"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--text-primary-rgb),0.06)] transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/containers/${row.id}`)}
            title="View container details"
            aria-label="View container details"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--text-primary-rgb),0.06)] transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleBulkStatusUpdate = async (containerIds: string[], status: string) => {
    if (!isAdmin) return;

    try {
      const response = await fetch('/api/bulk/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', containerIds, data: { status } }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Bulk status update failed');
      }

      toast.success('Containers updated', {
        description: `${data.count || 0} container(s) updated`,
      });

      fetchContainers();
    } catch (error) {
      console.error('Error updating containers:', error);
      toast.error('Failed to update containers');
    }
  };

  if (loading && containers.length === 0) {
    return (
      <ProtectedRoute>
        <DashboardPageSkeleton />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Containers"
          description="Manage shipping containers and tracking"
          actions={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant={showOceanTracker ? 'primary' : 'outline'}
                onClick={() => setShowOceanTracker((prev) => !prev)}
                icon={<Compass className="w-4 h-4" />}
              >
                {showOceanTracker ? 'Hide Ocean Map' : 'Live Ocean Map'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const target = containers.find(c => c.id === activeOceanContainerId) || containers[0] || null;
                  if (target) setPlannerContainer(target);
                }}
                icon={<Layers className="w-4 h-4 text-[var(--accent-gold)]" />}
              >
                2D Load Planner
              </Button>
              {isAdmin && (
                <Button 
                  variant="outline"
                  onClick={() => setShowBulkTable((prev) => !prev)}
                >
                  {showBulkTable ? 'Card view' : 'Bulk mode'}
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={handleExport}
                icon={<Download className="w-4 h-4" />}
              >
                Export CSV
              </Button>
              {isAdmin && (
                <Button href="/dashboard/containers/new" variant="primary" icon={<Package className="w-4 h-4" />}>
                  New Container
                </Button>
              )}
            </Box>
          }
        />

        {/* Live Ocean Freight & Vessel Route Tracker */}
        {showOceanTracker && containers.length > 0 && (() => {
          const activeContainer = containers.find(c => c.id === activeOceanContainerId) || containers[0];
          if (!activeContainer) return null;

          const etaDays = activeContainer.estimatedArrival 
            ? Math.max(1, Math.ceil((new Date(activeContainer.estimatedArrival).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : 9;

          return (
            <OceanRouteMap 
              originPort={activeContainer.loadingPort || activeContainer.shippingLine || 'Port of Newark (USNWK)'}
              destinationPort={activeContainer.destinationPort || 'Port of Jebel Ali (AEJEA)'}
              vesselName={activeContainer.vesselName || 'MAERSK VOYAGER'}
              voyageNumber={activeContainer.voyageNumber || activeContainer.trackingNumber || 'V-2409W'}
              containerNumber={activeContainer.containerNumber}
              currentProgressPct={activeContainer.progress ?? 68}
              departureDate={activeContainer.departureDate}
              estimatedArrival={activeContainer.estimatedArrival}
              etaDays={etaDays}
              status={statusLabels[activeContainer.status] || activeContainer.status || 'In Transit'}
              containersList={containers.map((c) => ({
                id: c.id,
                containerNumber: c.containerNumber,
                progress: c.progress,
                vesselName: c.vesselName,
                destinationPort: c.destinationPort,
                status: c.status,
              }))}
              selectedContainerId={activeContainer.id}
              onSelectContainer={(id) => setActiveOceanContainerId(id)}
            />
          );
        })()}

        {/* Stats */}
        <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<Package style={{ fontSize: 18 }} />}
            title="Total Containers"
            value={stats.total}
            variant="default"
            size="md"
          />
          <StatsCard
            icon={<Ship style={{ fontSize: 18 }} />}
            title="In Transit"
            value={stats.inTransit}
            variant="info"
            size="md"
          />
          <StatsCard
            icon={<MapPin style={{ fontSize: 18 }} />}
            title="Arrived"
            value={stats.arrived}
            variant="success"
            size="md"
          />
          <StatsCard
            icon={<TrendingUp style={{ fontSize: 18 }} />}
            title="Avg Capacity"
            value={`${stats.avgCapacity}%`}
            variant="warning"
            size="md"
          />
        </DashboardGrid>

        {/* Filters */}
        <DashboardPanel title="Search & Filter" description="Find containers quickly">
          <form onSubmit={handleSearch}>
            <FormField
              label=""
              placeholder="Search by container #, tracking #, vessel, destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Package style={{ fontSize: 20, color: 'var(--text-secondary)' }} />}
            />
            <button type="submit" className="sr-only">
              Search containers
            </button>
          </form>
          <Box sx={{ mt: 1.5 }}>
            <SavedFilterPresets
              storageKey="containers"
              currentFilters={{ status: statusFilter, search: searchQuery }}
              onApplyPreset={(filters) => {
                if (filters.status) setStatusFilter(filters.status);
                if (typeof filters.search === 'string') setSearchQuery(filters.search);
                setPage(1);
              }}
            />
          </Box>
        </DashboardPanel>

        {/* Status Filter Carousel */}
        <div className="pt-1 pb-1">
          <StatusFilterPills
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'CREATED', label: 'Created', color: 'var(--text-secondary)' },
              { value: 'WAITING_FOR_LOADING', label: 'Waiting for Loading', color: 'var(--warning)' },
              { value: 'LOADED', label: 'Loaded', color: 'var(--info)' },
              { value: 'IN_TRANSIT', label: 'In Transit', color: 'var(--status-violet)' },
              { value: 'ARRIVED_PORT', label: 'Arrived Port', color: 'var(--success)' },
              { value: 'CUSTOMS_CLEARANCE', label: 'Customs', color: 'var(--status-orange)' },
              { value: 'RELEASED', label: 'Released', color: 'var(--status-emerald)' },
              { value: 'CLOSED', label: 'Closed', color: 'var(--status-slate)' },
            ]}
            selectedValue={statusFilter}
            onSelect={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          />
        </div>

        {/* Container Grid */}
        <DashboardPanel title={`All Containers (${containers.length})`} fullHeight>
          {loading ? (
            <CompactSkeleton />
          ) : containers.length === 0 ? (
            <EmptyState
              icon={<Package />}
              title="No containers found"
              description={isAdmin ? "Create your first container to get started" : "You have no containers with your shipments yet"}
              action={
                isAdmin ? (
                  <Button href="/dashboard/containers/new" variant="primary">
                    Create First Container
                  </Button>
                ) : undefined
              }
            />
          ) : showBulkTable ? (
            <DataTable
              data={containers}
              columns={containerColumns}
              keyField="id"
              selectable={isAdmin}
              onRowClick={(row) => setQuickPeekContainerId(row.id)}
              onDelete={isAdmin ? handleBulkDelete : undefined}
              onExport={isAdmin ? handleBulkExport : undefined}
              bulkStatusOptions={containerStatusOptions}
              onBulkStatusChange={isAdmin ? handleBulkStatusUpdate : undefined}
              currentPage={page}
              totalPages={totalPages}
            />
          ) : (
            <>
              <DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {containers.map((container, index) => (
                  <Box
                    key={container.id}
                    onClick={() => router.push(`/dashboard/containers/${container.id}`)}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid var(--border)',
                      background: 'var(--panel)',
                      boxShadow: '0 12px 30px rgba(var(--text-primary-rgb), 0.08)',
                      p: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 20px 40px rgba(var(--text-primary-rgb), 0.12)',
                      },
                    }}
                  >
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            {container.containerNumber}
                          </Typography>
                          <span onClick={(e) => e.stopPropagation()}>
                            <CopyButton value={container.containerNumber} label="Container #" />
                          </span>
                        </Box>
                        {container.trackingNumber && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                              {container.trackingNumber}
                            </Typography>
                            <span onClick={(e) => e.stopPropagation()}>
                              <CopyButton value={container.trackingNumber} label="Tracking #" />
                            </span>
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StatusBadge status={container.status} size="sm" />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveOceanContainerId(container.id);
                            setShowOceanTracker(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            toast.info(`Tracking route for container ${container.containerNumber}`);
                          }}
                          title="Track route on Ocean Map"
                          sx={{
                            color: 'var(--text-secondary)',
                            '&:hover': {
                              bgcolor: 'rgba(var(--info-rgb), 0.12)',
                              color: 'var(--info)',
                            },
                          }}
                        >
                          <Compass style={{ width: 16, height: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlannerContainer(container);
                          }}
                          title="2D Visual Load Planner"
                          sx={{
                            color: 'var(--text-secondary)',
                            '&:hover': {
                              bgcolor: 'rgba(var(--accent-gold-rgb), 0.12)',
                              color: 'var(--accent-gold)',
                            },
                          }}
                        >
                          <Layers style={{ width: 16, height: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickPeekContainerId(container.id);
                          }}
                          title="Quick peek container manifest"
                          sx={{
                            color: 'var(--text-secondary)',
                            '&:hover': {
                              bgcolor: 'rgba(var(--accent-gold-rgb), 0.12)',
                              color: 'var(--accent-gold)',
                            },
                          }}
                        >
                          <PanelRightOpen style={{ width: 16, height: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, container)}
                          sx={{
                            color: 'var(--text-secondary)',
                            '&:hover': {
                              bgcolor: 'rgba(var(--text-primary-rgb), 0.05)',
                            },
                          }}
                        >
                          <MoreVertical style={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Progress */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Progress
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {container.progress}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: '100%',
                          height: 6,
                          borderRadius: 1,
                          bgcolor: 'var(--background)',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${container.progress}%`,
                            height: '100%',
                            bgcolor: 'var(--accent-gold)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Details */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                      {container.vesselName && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Ship style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {container.vesselName}
                          </Typography>
                        </Box>
                      )}
                      {container.destinationPort && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MapPin style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {container.destinationPort}
                          </Typography>
                        </Box>
                      )}
                      {container.estimatedArrival && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Calendar style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            ETA: {new Date(container.estimatedArrival).toLocaleDateString()}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Stats */}
                    <Box
                      sx={{
                        pt: 2,
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Package style={{ fontSize: 14, color: 'var(--accent-gold)' }} />
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {container._count.shipments}/{container.maxCapacity}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <FileText style={{ fontSize: 12 }} />
                          <span>{container._count.documents}</span>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DollarSign style={{ fontSize: 12 }} />
                          <span>{container._count.expenses}</span>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Receipt style={{ fontSize: 12 }} />
                          <span>{container._count.invoices}</span>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </DashboardGrid>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 3 }}>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Page {page} of {totalPages}
                  </Typography>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    size="sm"
                  >
                    Next
                  </Button>
                </Box>
              )}
            </>
          )}
        </DashboardPanel>

        {/* Quick Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              bgcolor: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 2,
              minWidth: 180,
              boxShadow: '0 8px 24px rgba(var(--text-primary-rgb), 0.15)',
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem
            onClick={() => {
              if (selectedContainer) {
                setActiveOceanContainerId(selectedContainer.id);
                setShowOceanTracker(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                toast.info(`Tracking route for container ${selectedContainer.containerNumber}`);
              }
              handleMenuClose();
            }}
            sx={{
              fontSize: '0.875rem',
              py: 1.5,
              px: 2,
              color: 'var(--text-primary)',
              '&:hover': {
                bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
              },
            }}
          >
            <Compass style={{ width: 16, height: 16, marginRight: 12, color: 'var(--info)' }} />
            Track Ocean Route
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedContainer) {
                setPlannerContainer(selectedContainer);
              }
              handleMenuClose();
            }}
            sx={{
              fontSize: '0.875rem',
              py: 1.5,
              px: 2,
              color: 'var(--text-primary)',
              '&:hover': {
                bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
              },
            }}
          >
            <Layers style={{ width: 16, height: 16, marginRight: 12, color: 'var(--accent-gold)' }} />
            2D Load Planner
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedContainer) {
                setQuickPeekContainerId(selectedContainer.id);
              }
              handleMenuClose();
            }}
            sx={{
              fontSize: '0.875rem',
              py: 1.5,
              px: 2,
              color: 'var(--text-primary)',
              '&:hover': {
                bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
              },
            }}
          >
            <PanelRightOpen style={{ width: 16, height: 16, marginRight: 12 }} />
            Quick Peek
          </MenuItem>
          <MenuItem
            onClick={handleViewContainer}
            sx={{
              fontSize: '0.875rem',
              py: 1.5,
              px: 2,
              color: 'var(--text-primary)',
              '&:hover': {
                bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
              },
            }}
          >
            <Eye style={{ fontSize: 16, marginRight: 12 }} />
            Full Details
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedContainer) handleOpenQR(selectedContainer);
              handleMenuClose();
            }}
            sx={{
              fontSize: '0.875rem',
              py: 1.5,
              px: 2,
              color: 'var(--text-primary)',
              '&:hover': {
                bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
              },
            }}
          >
            <QrCode style={{ width: 16, height: 16, marginRight: 12 }} />
            Yard QR Label
          </MenuItem>
          {session?.user?.role === 'admin' && (
            <MenuItem
              onClick={handleDuplicateContainer}
              sx={{
                fontSize: '0.875rem',
                py: 1.5,
                px: 2,
                color: 'var(--text-primary)',
                '&:hover': {
                  bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
                },
              }}
            >
              <Copy style={{ fontSize: 16, marginRight: 12 }} />
              Duplicate
            </MenuItem>
          )}
          {session?.user?.role === 'admin' && <Divider sx={{ my: 0.5, borderColor: 'var(--border)' }} />}
          {session?.user?.role === 'admin' && (
            <MenuItem
              onClick={handleDeleteContainer}
              sx={{
                fontSize: '0.875rem',
                py: 1.5,
                px: 2,
                color: 'var(--error)',
                '&:hover': {
                  bgcolor: 'rgba(var(--error-rgb), 0.1)',
                },
              }}
            >
              <Trash2 style={{ fontSize: 16, marginRight: 12 }} />
              Delete
            </MenuItem>
          )}
        </Menu>

        {/* Slide-over Quick Peek Drawer */}
        <ContainerQuickPeek
          containerId={quickPeekContainerId}
          open={Boolean(quickPeekContainerId)}
          onClose={() => setQuickPeekContainerId(null)}
        />

        {/* 2D Visual Container Load Planner Modal */}
        {plannerContainer && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--panel)] shadow-2xl border border-[var(--border)]">
              <ContainerLoadPlanner
                containerNumber={plannerContainer.containerNumber}
                containerType="40ft_hc"
                containersList={containers.map((c) => ({
                  id: c.id,
                  containerNumber: c.containerNumber,
                  capacity: `${c.currentCount}/${c.maxCapacity}`,
                }))}
                selectedContainerId={plannerContainer.id}
                onSelectContainer={(id) => {
                  const target = containers.find((c) => c.id === id);
                  if (target) {
                    setPlannerContainer(target);
                    toast.info(`Switched to container ${target.containerNumber}`);
                  }
                }}
                onClose={() => setPlannerContainer(null)}
                onSave={() => setPlannerContainer(null)}
              />
            </div>
          </div>
        )}

        {/* Yard QR Code & Thermal Label Modal */}
        <QRCodeModal
          open={Boolean(qrModalData)}
          onClose={() => setQrModalData(null)}
          data={qrModalData}
        />
      </DashboardSurface>
    </ProtectedRoute>
  );
}
