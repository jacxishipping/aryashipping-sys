'use client';
import { formatMoney } from '@/lib/format';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, DetailPageSkeleton, StatusBadge } from '@/components/design-system';
import {
  ArrowLeft,
  CalendarCheck,
  Clock3,
  FileText,
  DollarSign,
  Image as ImageIcon,
  MapPin,
  PackageCheck,
  PenLine,
  ReceiptText,
  Trash2,
  Truck,
  Wallet,
  Info,
  History,
  User,
  Ship,
  AlertTriangle,
  Radio,
} from 'lucide-react';

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

function Box({ children, className = '', component: Component = 'div', sx, style, ...props }: React.HTMLAttributes<HTMLElement> & { component?: any; sx?: any; [key: string]: any }) {
  return (
    <Component className={className} style={{ ...sxToStyle(sx), ...style }} {...props}>
      {children}
    </Component>
  );
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

function Tabs({ value, onChange, children, className = '', variant, scrollButtons, allowScrollButtonsMobile, sx }: any) {
  return (
    <div className={`flex items-center gap-1 border-b border-[var(--border)] overflow-x-auto ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as any, {
          selected: value === index,
          onClick: () => onChange && onChange(null, index),
        });
      })}
    </div>
  );
}

function Tab({ label, icon, selected, onClick, className = '' }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all duration-150 ${
        selected
          ? 'border-[var(--accent-gold)] text-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.06)]'
          : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
      } ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
import { MoreVertical } from 'lucide-react';
import { Breadcrumbs, ConfirmDialog, CopyButton, PageHeader, toast, Tooltip } from '@/components/design-system';
import ShipmentMilestoneStepper from '@/components/shipments/ShipmentMilestoneStepper';
import ShipmentLiveMapPanel from '@/components/shipments/ShipmentLiveMapPanel';

import ShipmentDetailOverlays from '@/components/shipments/ShipmentDetailOverlays';
import ShipmentActivityTab from '@/components/shipments/ShipmentActivityTab';
import ShipmentCustomerTab from '@/components/shipments/ShipmentCustomerTab';
import ShipmentCompanyGetpassTab from '@/components/shipments/ShipmentCompanyGetpassTab';
import ShipmentCompanyLedgerTab from '@/components/shipments/ShipmentCompanyLedgerTab';
import ShipmentDamagesTab from '@/components/shipments/ShipmentDamagesTab';
import ShipmentDetailsTab from '@/components/shipments/ShipmentDetailsTab';
import ShipmentBillingTab from '@/components/shipments/ShipmentBillingTab';
import ShipmentDocumentsTab from '@/components/shipments/ShipmentDocumentsTab';
import ShipmentFinancialsTab from '@/components/shipments/ShipmentFinancialsTab';
import ShipmentNextActionPanel from '@/components/shipments/ShipmentNextActionPanel';
import ShipmentOverviewTab from '@/components/shipments/ShipmentOverviewTab';
import ShipmentPhotosTab from '@/components/shipments/ShipmentPhotosTab';
import ShipmentTimelineTab from '@/components/shipments/ShipmentTimelineTab';
import ShipmentWorkflowStrip from '@/components/shipments/ShipmentWorkflowStrip';
import { downloadShipmentInvoicePDF } from '@/lib/utils/generateShipmentInvoicePDF';
import { downloadReleaseTokenPDF } from '@/lib/utils/generateReleaseTokenPDF';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';
import { getShipmentWorkflowStage } from '@/lib/shipment-workflow-stage';
import type {
  AvailableDispatchOption,
  AvailableTransitOption,
  ClassifiedExpenseSource,
  ComparisonTransactionWithDrillDown,
  ExpenseActionContext,
  ExpenseSourceFilter,
  LinkedCompanyLedgerEntry,
  Shipment,
  ShipmentPhotoLightboxState,
  StatusColors,
} from '@/components/shipments/shipment-detail-types';

const statusColors: Record<string, StatusColors> = {
  'ON_HAND': { bg: 'rgba(var(--accent-gold-rgb), 0.15)', text: 'var(--accent-gold)', border: 'rgba(var(--accent-gold-rgb), 0.4)' },
  'IN_TRANSIT': { bg: 'rgba(var(--accent-gold-rgb), 0.15)', text: 'var(--accent-gold)', border: 'rgba(var(--accent-gold-rgb), 0.4)' },
  'DELIVERED': { bg: 'rgba(var(--success-rgb), 0.15)', text: 'var(--success-dark)', border: 'rgba(var(--success-rgb), 0.4)' },
  'CANCELLED': { bg: 'rgba(var(--error-rgb), 0.15)', text: 'var(--error)', border: 'rgba(var(--error-rgb), 0.4)' },
};

const containerStatusColors: Record<string, StatusColors> = {
  'CREATED': { bg: 'rgba(var(--text-secondary-rgb), 0.15)', text: 'var(--text-secondary)', border: 'rgba(var(--text-secondary-rgb), 0.4)' },
  'WAITING_FOR_LOADING': { bg: 'rgba(var(--warning-rgb), 0.15)', text: 'var(--warning-dark)', border: 'rgba(var(--warning-rgb), 0.4)' },
  'LOADED': { bg: 'rgba(var(--info-rgb), 0.15)', text: 'var(--info-dark)', border: 'rgba(var(--info-rgb), 0.4)' },
  'IN_TRANSIT': { bg: 'rgba(var(--status-violet-rgb), 0.15)', text: 'var(--status-violet-dark)', border: 'rgba(var(--status-violet-rgb), 0.4)' },
  'ARRIVED_PORT': { bg: 'rgba(var(--success-rgb), 0.15)', text: 'var(--success-dark)', border: 'rgba(var(--success-rgb), 0.4)' },
  'CUSTOMS_CLEARANCE': { bg: 'rgba(var(--status-orange-rgb), 0.15)', text: 'var(--status-orange-dark)', border: 'rgba(var(--status-orange-rgb), 0.4)' },
  'RELEASED': { bg: 'rgba(var(--status-emerald-rgb), 0.15)', text: 'var(--status-emerald-dark)', border: 'rgba(var(--status-emerald-rgb), 0.4)' },
  'CLOSED': { bg: 'rgba(var(--status-slate-rgb), 0.15)', text: 'var(--status-slate-dark)', border: 'rgba(var(--status-slate-rgb), 0.4)' },
};

const shipmentTabSlugs = [
  'overview',
  'map',
  'timeline',
  'photos',
  'documents',
  'financials',
  'billing',
  'damages',
  'details',
  'activity',
  'customer',
  'company-getpass',
  'company-ledger',
];

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`shipment-tabpanel-${index}`} aria-labelledby={`shipment-tab-${index}`}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

type ShipmentTabLabelTone = 'neutral' | 'ready' | 'warning' | 'danger';

function ShipmentTabLabel({
  label,
  meta,
  tone = 'neutral',
}: {
  label: string;
  meta?: string;
  tone?: ShipmentTabLabelTone;
}) {
  const toneClassNames: Record<ShipmentTabLabelTone, string> = {
    neutral: 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]',
    ready: 'border-[rgba(var(--success-rgb),0.32)] bg-[rgba(var(--success-rgb),0.12)] text-[var(--success-dark)]',
    warning: 'border-[rgba(var(--warning-rgb),0.32)] bg-[rgba(var(--warning-rgb),0.12)] text-[var(--warning)]',
    danger: 'border-[rgba(var(--error-rgb),0.32)] bg-[rgba(var(--error-rgb),0.12)] text-[var(--error)]',
  };

  return (
    <span className="flex items-center gap-2">
      <span>{label}</span>
      {meta ? (
        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${toneClassNames[tone]}`}>
          {meta}
        </span>
      ) : null}
    </span>
  );
}

const expenseSourceLabels: Record<ClassifiedExpenseSource, string> = {
  SHIPMENT: 'Shipping',
  DISPATCH: 'Dispatch',
  TRANSIT: 'Transit',
};

const expenseSourceDescriptions: Record<ClassifiedExpenseSource, string> = {
  SHIPMENT: 'Container or shipment-stage recovery',
  DISPATCH: 'Origin yard to port movement',
  TRANSIT: 'Destination delivery leg',
};

const expenseSourceStyles: Record<ClassifiedExpenseSource, StatusColors> = {
  SHIPMENT: { bg: 'rgba(var(--info-rgb), 0.12)', text: 'var(--info-dark)', border: 'rgba(var(--info-rgb), 0.28)' },
  DISPATCH: { bg: 'rgba(var(--status-yellow-rgb), 0.14)', text: 'var(--status-yellow-dark)', border: 'rgba(var(--status-yellow-rgb), 0.32)' },
  TRANSIT: { bg: 'rgba(var(--status-violet-rgb), 0.14)', text: 'var(--status-violet-dark)', border: 'rgba(var(--status-violet-rgb), 0.3)' },
};

function classifyExpenseSource(metadata: Record<string, unknown>): ClassifiedExpenseSource {
  const explicitSource = typeof metadata.expenseSource === 'string' ? metadata.expenseSource.toUpperCase() : undefined;

  if (explicitSource === 'DISPATCH' || explicitSource === 'TRANSIT' || explicitSource === 'SHIPMENT') {
    return explicitSource;
  }

  if (typeof metadata.dispatchId === 'string' && metadata.dispatchId) {
    return 'DISPATCH';
  }

  if (typeof metadata.transitId === 'string' && metadata.transitId) {
    return 'TRANSIT';
  }

  return 'SHIPMENT';
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [arrivalPhotos, setArrivalPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Array<{ name: string; progress: number }>>([]);
  const [lightbox, setLightbox] = useState<ShipmentPhotoLightboxState>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [openAssignDispatch, setOpenAssignDispatch] = useState(false);
  const [openAssignTransit, setOpenAssignTransit] = useState(false);
  const [dispatchIdToAssign, setDispatchIdToAssign] = useState('');
  const [transitIdToAssign, setTransitIdToAssign] = useState('');
  const [releaseTokenToAssign, setReleaseTokenToAssign] = useState('');
  const [showReleaseToken, setShowReleaseToken] = useState(false);
  const [availableDispatches, setAvailableDispatches] = useState<AvailableDispatchOption[]>([]);
  const [loadingDispatches, setLoadingDispatches] = useState(false);
  const [availableTransits, setAvailableTransits] = useState<AvailableTransitOption[]>([]);
  const [loadingTransits, setLoadingTransits] = useState(false);
  const [assigningDispatch, setAssigningDispatch] = useState(false);
  const [assigningTransit, setAssigningTransit] = useState(false);
  const [creatingReleaseToken, setCreatingReleaseToken] = useState(false);
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<null | HTMLElement>(null);
  const [expenseAction, setExpenseAction] = useState<ExpenseActionContext | null>(null);
  const [expenseSourceFilter, setExpenseSourceFilter] = useState<ExpenseSourceFilter>('ALL');
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const index = tab ? shipmentTabSlugs.indexOf(tab) : -1;
    if (index >= 0 && index !== activeTab) setActiveTab(index);
  }, [activeTab, searchParams]);

  const fetchShipment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${params.id}`, { cache: 'no-store' });
      const data = await response.json();

      if (response.ok) {
        setShipment(data.shipment);
        setArrivalPhotos(data.shipment.arrivalPhotos || []);
      } else {
        setError(data.message || 'Failed to load shipment');
      }
    } catch (error) {
      console.error('Error fetching shipment:', error);
      setError('An error occurred while loading the shipment');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const refreshShipmentPage = useCallback(async () => {
    await fetchShipment();
    router.refresh();
  }, [fetchShipment, router]);

  useEffect(() => {
    void fetchShipment();
  }, [fetchShipment]);

  useEffect(() => {
    if (!openAssignDispatch) return;

    const fetchDispatches = async () => {
      try {
        setLoadingDispatches(true);
        const response = await fetch('/api/dispatches?all=true');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load dispatches');
        setAvailableDispatches((data.dispatches || []).filter((dispatch: { status?: string }) => dispatch.status !== 'COMPLETED' && dispatch.status !== 'CANCELLED'));
      } catch (error) {
        console.error('Error fetching dispatches:', error);
        toast.error('Failed to load dispatches');
      } finally {
        setLoadingDispatches(false);
      }
    };

    void fetchDispatches();
  }, [openAssignDispatch]);

  useEffect(() => {
    if (!openAssignTransit) return;

    const fetchTransits = async () => {
      try {
        setLoadingTransits(true);
        const response = await fetch('/api/transits');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load transits');
        setAvailableTransits(
          (data.transits || []).filter(
            (transit: AvailableTransitOption) => transit.status !== 'DELIVERED' && transit.status !== 'CANCELLED'
          )
        );
      } catch (error) {
        console.error('Error fetching transits:', error);
        toast.error('Failed to load transits');
      } finally {
        setLoadingTransits(false);
      }
    };

    void fetchTransits();
  }, [openAssignTransit]);

  const openLightbox = (images: string[], index: number, title: string) => {
    if (!images.length) return;
    setLightbox({ images, index, title });
  };

  const downloadPhoto = async (url: string, index: number) => {
    const title = lightbox?.title ?? 'photo';
    const filename = `${title.replace(/\s+/g, '-')}-${index + 1}.jpg`;
    try {
      setDownloading(true);
      const response = await fetch(`/api/photos/download?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast.error('Failed to download photo', { description: 'Please try again' });
    } finally {
      setDownloading(false);
    }
  };

  const downloadAllPhotos = async (urls: string[], label: string) => {
    try {
      setDownloading(true);
      const response = await fetch('/api/photos/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: urls, filename: `${label.replace(/\s+/g, '-')}-photos.zip` }),
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${label.replace(/\s+/g, '-')}-photos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading photos:', error);
      toast.error('Failed to download photos', { description: 'Please try again' });
    } finally {
      setDownloading(false);
    }
  };

  const [pendingConfirm, setPendingConfirm] = useState<{ title: string; message: string; confirmText: string; action: () => void } | null>(null);

  const handleDeleteExpense = (entryId: string) => {
    setPendingConfirm({
      title: 'Delete Expense',
      message: 'Delete this expense? This will reverse the transaction from both the customer and company ledger.',
      confirmText: 'Delete',
      action: () => void runDeleteExpense(entryId),
    });
  };

  const runDeleteExpense = async (entryId: string) => {
    try {
      setDeletingExpenseId(entryId);
      const response = await fetch(`/api/ledger/${entryId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete expense');
      toast.success('Expense deleted', { description: 'Ledger entries reversed successfully' });
      void refreshShipmentPage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleDelete = () => {
    setPendingConfirm({
      title: 'Delete Shipment',
      message: 'Are you sure you want to delete this shipment?',
      confirmText: 'Delete',
      action: () => void runDeleteShipment(),
    });
  };

  const runDeleteShipment = async () => {
    try {
      const response = await fetch(`/api/shipments/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/dashboard/shipments');
      } else {
        const data = await response.json();
        toast.error('Failed to delete shipment', data.message || 'Please try again');
      }
    } catch (error) {
      console.error('Error deleting shipment:', error);
      toast.error('Failed to delete shipment', { description: 'An error occurred. Please try again' });
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const openAssignTransitDialog = () => {
    // Seed the release token from this shipment so the operator does not have to
    // copy/paste it (the server still verifies it on submit).
    setReleaseTokenToAssign(shipment?.releaseToken || '');
    setTransitIdToAssign('');
    setOpenAssignTransit(true);
  };

  const handleAssignTransit = async () => {
    if (!transitIdToAssign.trim()) {
      toast.error('Select a transit');
      return;
    }

    if (!releaseTokenToAssign.trim()) {
      toast.error('Release token is required');
      return;
    }

    try {
      setAssigningTransit(true);
      const response = await fetch(`/api/transits/${transitIdToAssign}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: params.id, releaseToken: releaseTokenToAssign.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to assign transit');
      toast.success('Shipment assigned to transit');
      setOpenAssignTransit(false);
      setTransitIdToAssign('');
      setReleaseTokenToAssign('');
      await fetchShipment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign transit');
    } finally {
      setAssigningTransit(false);
    }
  };

  const handleAssignDispatch = async () => {
    if (!dispatchIdToAssign.trim()) {
      toast.error('Dispatch is required');
      return;
    }

    try {
      setAssigningDispatch(true);
      const response = await fetch(`/api/dispatches/${dispatchIdToAssign}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: params.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to assign dispatch');
      toast.success('Shipment assigned to dispatch');
      setOpenAssignDispatch(false);
      setDispatchIdToAssign('');
      await fetchShipment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign dispatch');
    } finally {
      setAssigningDispatch(false);
    }
  };

  const handleGenerateReleaseToken = async () => {
    if (!shipment) return;

    try {
      setCreatingReleaseToken(true);
      const response = await fetch(`/api/shipments/${shipment.id}/release-token`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate release token');
      }

      setShipment((prev) =>
        prev
          ? {
              ...prev,
              releaseToken: data.shipment.releaseToken,
              releaseTokenCreatedAt: data.shipment.releaseTokenCreatedAt,
            }
          : prev
      );

      toast.success('Release token generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate release token');
    } finally {
      setCreatingReleaseToken(false);
    }
  };

  const handleRemoveFromTransit = () => {
    if (!shipment?.transitId) return;
    const transitId = shipment.transitId;
    const shipmentId = shipment.id;
    setPendingConfirm({
      title: 'Remove From Transit',
      message: 'Remove this shipment from its transit?',
      confirmText: 'Remove',
      action: () => void runRemoveFromTransit(transitId, shipmentId),
    });
  };

  const runRemoveFromTransit = async (transitId: string, shipmentId: string) => {
    try {
      const response = await fetch(`/api/transits/${transitId}/shipments?shipmentId=${shipmentId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove from transit');
      toast.success('Removed from transit');
      await fetchShipment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove from transit');
    }
  };

  const handleRemoveFromDispatch = () => {
    if (!shipment?.dispatchId) return;
    const dispatchId = shipment.dispatchId;
    const shipmentId = shipment.id;
    setPendingConfirm({
      title: 'Remove From Dispatch',
      message: 'Remove this shipment from its dispatch?',
      confirmText: 'Remove',
      action: () => void runRemoveFromDispatch(dispatchId, shipmentId),
    });
  };

  const runRemoveFromDispatch = async (dispatchId: string, shipmentId: string) => {
    try {
      const response = await fetch(`/api/dispatches/${dispatchId}/shipments?shipmentId=${shipmentId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove from dispatch');
      toast.success('Removed from dispatch');
      await fetchShipment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove from dispatch');
    }
  };

  const handleDownloadReceipt = async () => {
    if (!shipment) return;
    
    try {
        const expenses = shipment.ledgerEntries
            .filter((e) => {
              if (e.type !== 'DEBIT') return false;
              const metadata = (e.metadata ?? {}) as Record<string, unknown>;
              const isExpense = metadata.isExpense === true || metadata.isExpense === 'true';
              const expenseSource = typeof metadata.expenseSource === 'string' ? metadata.expenseSource.toUpperCase() : undefined;
              const isContainerExpense = metadata.isContainerExpense === true || metadata.isContainerExpense === 'true';
              return (isExpense || expenseSource === 'SHIPMENT') && !isContainerExpense;
            })
            .map(e => ({
                description: e.description,
                amount: e.amount,
                metadata: (e as any).metadata
            }));

        const invoiceData = {
            invoiceNumber: `RECEIPT-${shipment.vehicleVIN?.slice(-6) || shipment.id.slice(0,6)}-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
            date: new Date().toISOString(),
            shipment: {
                ...shipment,
                user: {
                    ...shipment.user,
                    address: null,
                    city: null,
                    country: null
                }
            },
            expenses: expenses
        };

        downloadShipmentInvoicePDF(invoiceData);
        toast.success('Receipt downloaded');
    } catch (error) {
        console.error('Error generating receipt:', error);
        toast.error('Failed to generate receipt');
    }
  };

  const handleDownloadReleaseToken = () => {
    if (!shipment) {
      toast.error('Shipment is not loaded yet');
      return;
    }

    if (!shipment.releaseToken) {
      toast.error('Generate release token first');
      return;
    }

    try {
      downloadReleaseTokenPDF({
        id: shipment.id,
        serviceType: shipment.serviceType,
        vehicleType: shipment.vehicleType,
        vehicleMake: shipment.vehicleMake,
        vehicleModel: shipment.vehicleModel,
        vehicleYear: shipment.vehicleYear,
        vehicleVIN: shipment.vehicleVIN,
        vehicleColor: shipment.vehicleColor,
        lotNumber: shipment.lotNumber,
        auctionName: shipment.auctionName,
        hasKey: shipment.hasKey,
        hasTitle: shipment.hasTitle,
        titleStatus: shipment.titleStatus,
        price: shipment.price,
        insuranceValue: shipment.insuranceValue,
        paymentStatus: shipment.paymentStatus,
        paymentMode: shipment.paymentMode,
        releaseToken: shipment.releaseToken,
        releaseTokenCreatedAt: shipment.releaseTokenCreatedAt,
        container: shipment.container
          ? {
              containerNumber: shipment.container.containerNumber,
              loadingPort: shipment.container.loadingPort,
              destinationPort: shipment.container.destinationPort,
            }
          : null,
        user: {
          name: shipment.user.name,
          email: shipment.user.email,
          phone: shipment.user.phone,
          address: shipment.user.address,
          city: shipment.user.city,
          country: shipment.user.country,
        },
      });
      toast.success('Release token PDF downloaded');
    } catch (error) {
      console.error('Error generating release token PDF:', error);
      toast.error('Failed to generate release token PDF');
    }
  };

  /** Upload multiple arrival photo files, tracking per-file progress */
  const handleArrivalPhotosUpload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);

    // Initialise progress items
    const initialProgress = files.map(f => ({ name: f.name, progress: 0 }));
    setUploadProgress(initialProgress);

    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const formData = new FormData();
        formData.append('file', files[i]);
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        if (response.ok) {
          const result = await response.json();
          uploadedUrls.push(result.url as string);
          setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, progress: 100 } : p));
        } else {
          const err = await response.json();
          throw new Error((err as { message?: string }).message || 'Upload failed');
        }
      } catch (err) {
        console.error('Error uploading file:', err);
        setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, progress: -1 } : p));
        toast.error(`Failed to upload ${files[i].name}`);
      }
    }

    if (uploadedUrls.length > 0) {
      try {
        const response = await fetch(`/api/shipments/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ arrivalPhotos: uploadedUrls }),
        });
        if (response.ok) {
          const data = await response.json();
          setShipment(data.shipment);
          setArrivalPhotos((data.shipment as { arrivalPhotos: string[] }).arrivalPhotos || []);
          toast.success(`${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} uploaded`);
        } else {
          const err = await response.json();
          toast.error('Failed to save photos', { description: (err as { message?: string }).message || 'Please try again' });
        }
      } catch (err) {
        console.error('Error saving arrival photos:', err);
        toast.error('Failed to save photos', { description: 'An error occurred. Please try again' });
      }
    }

    setUploading(false);
    const UPLOAD_PROGRESS_CLEAR_DELAY_MS = 2000;
    setTimeout(() => setUploadProgress([]), UPLOAD_PROGRESS_CLEAR_DELAY_MS);
  };

  const removeArrivalPhoto = async (index: number) => {
    const newPhotos = arrivalPhotos.filter((_, i) => i !== index);
    setArrivalPhotos(newPhotos);

    try {
      const response = await fetch(`/api/shipments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrivalPhotos: newPhotos }),
      });

      if (response.ok) {
        const data = await response.json();
        setShipment(data.shipment);
      } else {
        setArrivalPhotos(arrivalPhotos);
        const err = await response.json();
        toast.error('Failed to remove photo', { description: (err as { message?: string }).message || 'Please try again' });
      }
    } catch (err) {
      setArrivalPhotos(arrivalPhotos);
      console.error('Error removing photo:', err);
      toast.error('Failed to remove photo', { description: 'An error occurred. Please try again' });
    }
  };

  const canManageWorkflow = hasPermission(session?.user?.role, 'workflow:move') && hasPermission(session?.user?.role, 'shipments:manage');
  const canManageShipmentRecord = hasPermission(session?.user?.role, 'shipments:manage');
  // Adding shipment expenses posts to /api/ledger/expense, which allows finance:manage OR shipments:manage.
  const canAddLedgerExpense = hasAnyPermission(session?.user?.role, ['finance:manage', 'shipments:manage']);
  // Editing/deleting an expense row hits /api/ledger/[id], which requires finance:manage.
  const canManageShipmentExpenses = hasPermission(session?.user?.role, 'finance:manage');
  const canViewPurchasePrice = hasPermission(session?.user?.role, 'finance:manage');
  const canUploadArrivalPhotos = canManageWorkflow && 
    (shipment?.container?.status === 'ARRIVED_PORT' || 
     shipment?.container?.status === 'CUSTOMS_CLEARANCE' ||
     shipment?.container?.status === 'RELEASED');

  /** Delete handler passed to PhotoLightbox — removes the photo and closes the viewer */
  const handleLightboxDelete = useCallback(async (idx: number) => {
    await removeArrivalPhoto(idx);
    setLightbox(null);
  }, [arrivalPhotos]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusStyles = useMemo(() => statusColors, []);
  const isAdmin = session?.user?.role === 'admin';
  const canViewLedgerComparison = hasAnyPermission(session?.user?.role, ['finance:view', 'finance:manage', 'shipments:read_all']);
  const canManageCompanyLedger = hasPermission(session?.user?.role, 'finance:manage');
  const canViewWorkflowCompanyDetails = hasPermission(session?.user?.role, 'shipments:read_all');
  const isReleasedForTransit = shipment?.status === 'RELEASED' || shipment?.container?.status === 'RELEASED';
  const isShippingStage = shipment ? getShipmentWorkflowStage(shipment) === 'SHIPPING' : false;
  const canUseCompanyGetpass = isShippingStage || Boolean(shipment?.companyGetpassStartedAt || shipment?.companyGetpassCompletedAt);
  const canAssignDispatch = canManageWorkflow && !shipment?.dispatchId && !shipment?.containerId && !shipment?.transitId && shipment?.status === 'ON_HAND';
  const canAddShipmentExpense = Boolean(shipment?.containerId || shipment?.dispatchId || (shipment?.transitId && shipment?.transit?.currentCompany));
  const canAddDispatchExpense = Boolean(shipment?.dispatchId);
  const canAddTransitExpense = Boolean(shipment?.transitId && shipment?.transit?.currentCompany);
  const openShipmentTab = useCallback((target: number | string) => {
    let index: number;
    if (typeof target === 'string') {
      index = shipmentTabSlugs.indexOf(target);
      if (index === -1) index = 0;
    } else {
      index = target;
    }
    setActiveTab(index);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', shipmentTabSlugs[index] || shipmentTabSlugs[0]);
    router.replace(`?${nextParams.toString()}`, { scroll: false });
  }, [router, searchParams]);
  const expenseContextType = shipment?.containerId
    ? 'CONTAINER'
    : shipment?.transitId
    ? 'TRANSIT'
    : shipment?.dispatchId
    ? 'DISPATCH'
    : undefined;
  const expenseContextId = shipment?.containerId || shipment?.transitId || shipment?.dispatchId || undefined;
  const expenseLedgerHelpText = shipment?.container
    ? `Expenses from this page will recover against the container company ledger for ${shipment.container.containerNumber}.`
    : shipment?.transit?.currentCompany
    ? `Expenses from this page will recover against the current transit event company ledger for ${shipment.transit.referenceNumber}.`
    : shipment?.dispatch
    ? `Expenses from this page will recover against the dispatch company ledger for ${shipment.dispatch.referenceNumber}.`
    : 'Assign this shipment to a dispatch or container company, or add a transit event company, before posting expenses.';
  const expenseActionHelpText = [
    'Shipment Expense uses the shipment\'s primary accounting route.',
    canAddDispatchExpense ? `Dispatch Expense posts to dispatch ${shipment?.dispatch?.referenceNumber}.` : 'Dispatch Expense is available after dispatch assignment.',
    canAddTransitExpense ? `Transit Expense posts to the current transit event for ${shipment?.transit?.referenceNumber}.` : 'Transit Expense is available after transit assignment and event company setup.',
  ].join(' ');
  const classifiedShipmentExpenseData = useMemo(() => {
    const totals: Record<ClassifiedExpenseSource, number> = {
      SHIPMENT: 0,
      DISPATCH: 0,
      TRANSIT: 0,
    };
    const counts: Record<ClassifiedExpenseSource, number> = {
      SHIPMENT: 0,
      DISPATCH: 0,
      TRANSIT: 0,
    };
    const entries: Array<Shipment['ledgerEntries'][number] & { source: ClassifiedExpenseSource }> = [];

    for (const entry of shipment?.ledgerEntries || []) {
      if (entry.type !== 'DEBIT') continue;

      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
      const isExpense = metadata.isExpense === true || metadata.isExpense === 'true';
      const explicitSource = typeof metadata.expenseSource === 'string' ? metadata.expenseSource.toUpperCase() : undefined;
      const isContainerExpense = metadata.isContainerExpense === true || metadata.isContainerExpense === 'true';

      if (!isExpense && explicitSource !== 'SHIPMENT' && explicitSource !== 'DISPATCH' && explicitSource !== 'TRANSIT') {
        continue;
      }

      if (isContainerExpense) {
        continue;
      }

      const source = classifyExpenseSource(metadata);
      totals[source] += entry.amount;
      counts[source] += 1;
      entries.push({ ...entry, source });
    }

    return {
      entries,
      totals,
      counts,
      total: entries.reduce((sum, entry) => sum + entry.amount, 0),
    };
  }, [shipment?.ledgerEntries]);

  const filteredShipmentExpenseEntries = useMemo(() => {
    if (expenseSourceFilter === 'ALL') {
      return classifiedShipmentExpenseData.entries;
    }

    return classifiedShipmentExpenseData.entries.filter((entry) => entry.source === expenseSourceFilter);
  }, [classifiedShipmentExpenseData.entries, expenseSourceFilter]);

  const filteredShipmentExpenseTotal = useMemo(
    () => filteredShipmentExpenseEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [filteredShipmentExpenseEntries]
  );

  // ⚡ Bolt: Consolidated multiple array iterations (.filter().reduce()) into single O(N) loops
  let userLedgerDebitsTotal = 0;
  let userLedgerCreditsTotal = 0;
  for (const entry of shipment?.ledgerEntries || []) {
    if (entry.type === 'DEBIT') userLedgerDebitsTotal += entry.amount;
    else if (entry.type === 'CREDIT') userLedgerCreditsTotal += entry.amount;
  }
  const netUserCharged = userLedgerDebitsTotal - userLedgerCreditsTotal;

  const companyLedgerEntries = shipment?.companyLedgerEntries || [];
  const companyLedgerCompanies = useMemo(() => {
    const candidates = [
      shipment?.shippingCompany ? { ...shipment.shippingCompany, source: 'Shipping' as const } : null,
      shipment?.dispatch?.company ? { ...shipment.dispatch.company, source: 'Dispatch' as const } : null,
      shipment?.transit?.currentCompany ? { ...shipment.transit.currentCompany, source: 'Transit' as const } : null,
    ].filter((company): company is { id: string; name: string; source: 'Shipping' | 'Dispatch' | 'Transit' } => Boolean(company));

    return Array.from(new Map(candidates.map((company) => [company.id, company])).values());
  }, [shipment?.dispatch?.company, shipment?.shippingCompany, shipment?.transit?.currentCompany]);
  let companyLedgerDebitsTotal = 0;
  let companyLedgerCreditsTotal = 0;
  for (const entry of companyLedgerEntries) {
    if (entry.type === 'DEBIT') companyLedgerDebitsTotal += entry.amount;
    else if (entry.type === 'CREDIT') companyLedgerCreditsTotal += entry.amount;
  }
  const netCompanyCharged = companyLedgerDebitsTotal - companyLedgerCreditsTotal;
  // Use normalized charged amounts for comparison so difference reflects what is displayed.
  const customerChargedForComparison = Math.abs(netUserCharged);
  const companyChargedForComparison = Math.abs(netCompanyCharged);
  const netDifference = customerChargedForComparison - companyChargedForComparison;

  const linkedCompanyLedgerEntriesByUserEntryId = useMemo(() => {
    const map = new Map<string, LinkedCompanyLedgerEntry>();

    for (const entry of companyLedgerEntries) {
      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
      const linkedUserExpenseEntryId = typeof metadata.linkedUserExpenseEntryId === 'string'
        ? metadata.linkedUserExpenseEntryId
        : typeof entry.reference === 'string' && entry.reference.startsWith('shipment-expense:')
        ? entry.reference.replace('shipment-expense:', '')
        : null;

      if (linkedUserExpenseEntryId) {
        map.set(linkedUserExpenseEntryId, entry);
      }
    }

    return map;
  }, [companyLedgerEntries]);

  const expenseEntriesWithCompanyLedger = useMemo(
    () =>
      filteredShipmentExpenseEntries.map((entry) => ({
        ...entry,
        linkedCompanyLedgerEntry: linkedCompanyLedgerEntriesByUserEntryId.get(entry.id) || null,
      })),
    [filteredShipmentExpenseEntries, linkedCompanyLedgerEntriesByUserEntryId]
  );

  const comparisonTransactionsWithDrillDown = useMemo(
    () => {
      const companyEntries: ComparisonTransactionWithDrillDown[] = companyLedgerEntries.map((entry) => ({
        id: `company-${entry.id}`,
        source: 'COMPANY',
        companyLedgerEntry: entry,
        transactionDate: entry.transactionDate,
        description: entry.description,
        type: entry.type,
        amount: entry.amount,
      }));

      const customerEntries: ComparisonTransactionWithDrillDown[] = (shipment?.ledgerEntries || []).map((entry) => ({
        id: `customer-${entry.id}`,
        source: 'CUSTOMER',
        transactionDate: entry.transactionDate,
        description: entry.description,
        type: entry.type,
        amount: entry.amount,
        userLedgerEntryId: entry.id,
        linkedCompanyLedgerEntry: linkedCompanyLedgerEntriesByUserEntryId.get(entry.id) || null,
      }));

      return [...companyEntries, ...customerEntries].sort(
        (left, right) => new Date(right.transactionDate).getTime() - new Date(left.transactionDate).getTime()
      );
    },
    [companyLedgerEntries, linkedCompanyLedgerEntriesByUserEntryId, shipment?.ledgerEntries]
  );

  const purchasePriceRecord = useMemo(() => {
    const ledgerEntry = (shipment?.ledgerEntries || []).find((entry) => {
      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
      return metadata.isShipmentPurchasePrice === true;
    });

    if (ledgerEntry) {
      return {
        description: ledgerEntry.description,
        amount: ledgerEntry.amount,
        transactionDate: ledgerEntry.transactionDate,
      };
    }

    if (shipment?.serviceType === 'PURCHASE_AND_SHIPPING' && typeof shipment.purchasePrice === 'number' && shipment.purchasePrice > 0) {
      const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
        .filter(Boolean)
        .join(' ')
        .trim();
      const vinSuffix = shipment.vehicleVIN ? ` (VIN: ${shipment.vehicleVIN})` : '';

      return {
        description: `Car purchase price for ${vehicleLabel || 'shipment'}${vinSuffix}`,
        amount: shipment.purchasePrice,
        transactionDate: shipment.updatedAt,
      };
    }

    return null;
  }, [shipment]);

  const openCompanyLedgerEntry = useCallback((entry: LinkedCompanyLedgerEntry) => {
    router.push(`/dashboard/finance/companies/${entry.companyId}?entryId=${entry.id}`);
  }, [router]);

  const totalEstimatedCost = (shipment?.price || 0) + (shipment?.insuranceValue || 0) + userLedgerDebitsTotal;

  if (loading) {
    return (
      <ProtectedRoute>
        <DetailPageSkeleton />
      </ProtectedRoute>
    );
  }

  if (error || !shipment) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <DashboardPanel>
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Shipment Unavailable</h2>
              <p className="text-[var(--text-secondary)]">{error || 'We could not find this shipment.'}</p>
              <Button href="/dashboard/shipments">Back to Shipments</Button>
            </div>
          </DashboardPanel>
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  const statusStyle = statusStyles[shipment.status] || statusColors['ON_HAND'];
  const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim() || 'Shipment Details';
  const shipmentRoute = shipment.container
    ? [shipment.container.loadingPort, shipment.container.destinationPort].filter(Boolean).join(' to ')
    : shipment.dispatch
    ? [shipment.dispatch.origin, shipment.dispatch.destination].filter(Boolean).join(' to ')
    : shipment.transit
    ? [shipment.transit.origin, shipment.transit.destination].filter(Boolean).join(' to ')
    : 'Route not assigned';
  const primaryPhoto = shipment.vehiclePhotos?.[0] || arrivalPhotos[0];
  const activeMovement = shipment.container?.containerNumber || shipment.dispatch?.referenceNumber || shipment.transit?.referenceNumber || 'Not assigned';
  const movementLabel = shipment.container
    ? 'Container'
    : shipment.dispatch
    ? 'Dispatch'
    : shipment.transit
    ? 'Transit'
    : 'Movement';
  const serviceLabel = shipment.serviceType === 'PURCHASE_AND_SHIPPING' ? 'Purchase + Shipping' : 'Shipping Only';
  const photoCount = (shipment.vehiclePhotos?.length || 0) + arrivalPhotos.length;
  const documentCount = shipment.documents?.length || 0;
  const damageCount = shipment.containerDamages?.length || 0;
  const priceListDispatchPosted = Boolean(shipment.priceListPricingSnapshot?.posted?.dispatch?.chargeId);
  const priceListShippingPosted = Boolean(shipment.priceListPricingSnapshot?.posted?.shipping?.chargeId);
  const priceListMatched = typeof shipment.priceListPricingSnapshot?.totalPrice === 'number' && shipment.priceListPricingSnapshot.totalPrice > 0;
  const priceListFullyPosted = priceListDispatchPosted && priceListShippingPosted;
  const priceListTabMeta = priceListFullyPosted ? 'posted' : priceListMatched ? 'matched' : 'setup';
  const priceListTabTone: ShipmentTabLabelTone = priceListFullyPosted ? 'ready' : priceListMatched ? 'warning' : 'neutral';
  const billingTabMeta = priceListFullyPosted ? 'ready' : shipment.paymentStatus ? formatStatus(shipment.paymentStatus) : 'review';
  const billingTabTone: ShipmentTabLabelTone = shipment.paymentStatus === 'OVERDUE' || shipment.paymentStatus === 'FAILED' ? 'danger' : priceListFullyPosted ? 'ready' : 'neutral';
  const priceListHeaderStatus = priceListFullyPosted ? 'Posted' : priceListMatched ? 'Matched' : 'Needs Setup';
  const priceListHeaderDetail = priceListFullyPosted
    ? 'Dispatch and shipping posted'
    : priceListMatched
    ? `${formatMoney(shipment.priceListPricingSnapshot?.totalPrice || 0)} matched`
    : 'No active match yet';
  const priceListHeaderClass = priceListFullyPosted
    ? 'border-[rgba(var(--success-rgb),0.32)] bg-[rgba(var(--success-rgb),0.10)]'
    : priceListMatched
    ? 'border-[rgba(var(--warning-rgb),0.32)] bg-[rgba(var(--warning-rgb),0.10)]'
    : 'border-[var(--border)] bg-[var(--background)]';

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <div className="flex flex-col gap-4">
          <Breadcrumbs
            items={[
              { label: 'Shipments', href: '/dashboard/shipments' },
              { label: shipment.vehicleVIN || vehicleLabel, href: '' },
            ]}
          />

          <PageHeader
            title={vehicleLabel}
            description={`VIN ${shipment.vehicleVIN || 'Not recorded'} · Lot ${shipment.lotNumber || 'Not recorded'} · Auction ${shipment.auctionName || 'Not recorded'}`}
            actions={
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusBadge status={shipment.status} size="sm" />
                {shipment.paymentStatus && (
                  <StatusBadge status={shipment.paymentStatus} size="sm" />
                )}
                {shipment.releaseToken && (
                  <StatusBadge status="SUCCESS" size="sm" />
                )}
                {shipment.vehicleVIN && <CopyButton value={shipment.vehicleVIN} label="VIN" />}
                {shipment.lotNumber && <CopyButton value={shipment.lotNumber} label="Lot #" />}
                <Button href="/dashboard/shipments" variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openShipmentTab('map')}
                  className="border-[rgba(var(--info-rgb),0.4)] text-[var(--info)] hover:bg-[rgba(var(--info-rgb),0.1)]"
                >
                  <Radio className="mr-2 h-4 w-4 animate-pulse text-[var(--info)]" />
                  Live Map
                </Button>
                <Tooltip title="Download a PDF receipt for this shipment. For official invoices, use the Billing tab on this shipment.">
                  <Button variant="outline" size="sm" onClick={handleDownloadReceipt}>
                    <FileText className="mr-2 h-4 w-4" />
                    Receipt
                  </Button>
                </Tooltip>
                {shipment.releaseToken && (
                  <Tooltip title="Download release token document as PDF with customer, vehicle, and payment details.">
                    <Button variant="outline" size="sm" onClick={handleDownloadReleaseToken}>
                      <FileText className="mr-2 h-4 w-4" />
                      Token PDF
                    </Button>
                  </Tooltip>
                )}
                {canManageShipmentRecord && (
                  <Button href={`/dashboard/shipments/${shipment.id}/edit`} size="sm">
                    <PenLine className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </Box>
            }
          />

          <DashboardPanel noHeaderBorder>
            <div className="flex flex-col gap-5 lg:flex-row">
              <button
                type="button"
                onClick={() => openLightbox(primaryPhoto ? [primaryPhoto] : [], 0, 'Vehicle Photo')}
                className="relative h-44 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] text-left lg:h-auto lg:w-72 lg:flex-shrink-0"
              >
                {primaryPhoto ? (
                  <Image src={primaryPhoto} alt={vehicleLabel} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 288px" />
                ) : (
                  <div className="flex h-full min-h-44 items-center justify-center text-[var(--text-secondary)]">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute left-3 top-3 rounded-full border border-white/30 bg-black/55 px-3 py-1 text-xs font-semibold text-white">
                  {serviceLabel}
                </div>
              </button>

              <div className="min-w-0 flex-1">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                      <User className="h-4 w-4" />
                      Customer
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">{shipment.user.name || shipment.user.email}</div>
                    <div className="truncate text-xs text-[var(--text-secondary)]">{shipment.user.email}</div>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                      <MapPin className="h-4 w-4" />
                      Route
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">{shipmentRoute}</div>
                    <div className="truncate text-xs text-[var(--text-secondary)]">{movementLabel}: {activeMovement}</div>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                      <CalendarCheck className="h-4 w-4" />
                      ETA
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{formatShortDate(shipment.container?.estimatedArrival)}</div>
                    <div className="text-xs text-[var(--text-secondary)]">Created {formatShortDate(shipment.createdAt)}</div>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                      <DollarSign className="h-4 w-4" />
                      Customer Balance
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{formatMoney(netUserCharged)}</div>
                    <div className="text-xs text-[var(--text-secondary)]">Expenses {formatMoney(classifiedShipmentExpenseData.total)}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openShipmentTab('financials')}
                    className={`rounded-lg border p-3 text-left transition-colors hover:border-[rgba(var(--accent-gold-rgb),0.45)] ${priceListHeaderClass}`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                      <ReceiptText className="h-4 w-4" />
                      Price List
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">{priceListHeaderStatus}</div>
                    <div className="truncate text-xs text-[var(--text-secondary)]">{priceListHeaderDetail}</div>
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {canAssignDispatch && (
                    <Button variant="outline" size="sm" onClick={() => setOpenAssignDispatch(true)}>
                      <Truck className="mr-2 h-4 w-4" />
                      Assign Dispatch
                    </Button>
                  )}
                  {canManageWorkflow && isReleasedForTransit && !shipment.transitId && (
                    <Button variant="outline" size="sm" onClick={openAssignTransitDialog}>
                      <Ship className="mr-2 h-4 w-4" />
                      Assign Transit
                    </Button>
                  )}
                  {((canManageWorkflow && !shipment.releaseToken) || canManageShipmentRecord) && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<MoreVertical className="h-4 w-4" />}
                        onClick={(event) => setHeaderMenuAnchor(event.currentTarget)}
                      >
                        More
                      </Button>
                      <Menu
                        anchorEl={headerMenuAnchor}
                        open={Boolean(headerMenuAnchor)}
                        onClose={() => setHeaderMenuAnchor(null)}
                      >
                        {canManageWorkflow && !shipment.releaseToken && (
                          <MenuItem
                            onClick={() => {
                              setHeaderMenuAnchor(null);
                              void handleGenerateReleaseToken();
                            }}
                            disabled={creatingReleaseToken || !isReleasedForTransit}
                          >
                            Generate Release Token
                          </MenuItem>
                        )}
                        {canManageShipmentRecord && (
                          <MenuItem
                            onClick={() => {
                              setHeaderMenuAnchor(null);
                              handleDelete();
                            }}
                            sx={{ color: 'var(--error)' }}
                          >
                            Delete Shipment
                          </MenuItem>
                        )}
                      </Menu>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DashboardPanel>
        </div>

        <ShipmentMilestoneStepper
          shipment={shipment}
          onOpenTab={openShipmentTab}
        />

        <ShipmentWorkflowStrip
          shipmentStatus={shipment.status}
          dispatchId={shipment.dispatchId}
          dispatchReference={shipment.dispatch?.referenceNumber}
          containerId={shipment.containerId}
          containerLabel={shipment.container?.containerNumber}
          transitId={shipment.transitId}
          transitReference={shipment.transit?.referenceNumber}
        />

        <ShipmentNextActionPanel
          shipment={shipment}
          canAssignDispatch={canAssignDispatch}
          canManageWorkflow={canManageWorkflow}
          isReleasedForTransit={isReleasedForTransit}
          creatingReleaseToken={creatingReleaseToken}
          onAssignDispatch={() => setOpenAssignDispatch(true)}
          onAssignTransit={openAssignTransitDialog}
          onGenerateReleaseToken={handleGenerateReleaseToken}
          onOpenFinancials={() => openShipmentTab('financials')}
          onOpenBilling={() => openShipmentTab('billing')}
          onOpenDetails={() => openShipmentTab('details')}
        />

        {/* Tabs Navigation */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 15,
            border: '1px solid var(--border)',
            borderRadius: '12px',
            backgroundColor: 'var(--panel)',
            boxShadow: '0 12px 28px rgba(var(--text-primary-rgb),0.08)',
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => {
              openShipmentTab(newValue);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 52,
              '& .MuiTabs-flexContainer': {
                gap: 0.25,
                px: 1,
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 650,
                color: 'var(--text-secondary)',
                minHeight: 52,
                borderRadius: '10px',
                my: 0.75,
                px: 1.5,
                '&:hover': {
                  color: 'var(--accent-gold)',
                  backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)',
                },
              },
              '& .Mui-selected': {
                color: 'var(--accent-gold) !important',
                backgroundColor: 'rgba(var(--accent-gold-rgb), 0.1)',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'var(--accent-gold)',
                height: 3,
              },
            }}
          >
            <Tab value={0} icon={<Info className="h-4 w-4" />} iconPosition="start" label="Overview" />
            <Tab value={1} icon={<Radio className="h-4 w-4" />} iconPosition="start" label={<ShipmentTabLabel label="Live Map" meta="AIS Live" tone="ready" />} />
            <Tab value={2} icon={<History className="h-4 w-4" />} iconPosition="start" label="Timeline" />
            <Tab value={3} icon={<ImageIcon className="h-4 w-4" />} iconPosition="start" label={<ShipmentTabLabel label="Photos" meta={String(photoCount)} tone={photoCount > 0 ? 'ready' : 'neutral'} />} />
            <Tab value={4} icon={<FileText className="h-4 w-4" />} iconPosition="start" label={<ShipmentTabLabel label="Documents" meta={String(documentCount)} tone={documentCount > 0 ? 'ready' : 'warning'} />} />
            <Tab value={5} icon={<DollarSign className="h-4 w-4" />} iconPosition="start" label={<ShipmentTabLabel label="Financials" meta={priceListTabMeta} tone={priceListTabTone} />} />
            <Tab value={6} icon={<Wallet className="h-4 w-4" />} iconPosition="start" label={<ShipmentTabLabel label="Billing" meta={billingTabMeta} tone={billingTabTone} />} />
            <Tab value={7} icon={<AlertTriangle className="h-4 w-4" />} iconPosition="start" label={<ShipmentTabLabel label="Damages" meta={String(damageCount)} tone={damageCount > 0 ? 'danger' : 'ready'} />} />
            <Tab value={8} icon={<PackageCheck className="h-4 w-4" />} iconPosition="start" label="Details" />
            {isAdmin && <Tab value={9} icon={<History className="h-4 w-4" />} iconPosition="start" label="Activity" />}
            {isAdmin && <Tab value={10} icon={<User className="h-4 w-4" />} iconPosition="start" label="Customer" />}
            {canUseCompanyGetpass && <Tab value={11} icon={<Clock3 className="h-4 w-4" />} iconPosition="start" label="Company Getpass" />}
            {canViewLedgerComparison && <Tab value={12} icon={<Wallet className="h-4 w-4" />} iconPosition="start" label="Company Ledger" />}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <TabPanel value={activeTab} index={0}>
          <ShipmentOverviewTab
            shipment={shipment}
            statusStyle={statusStyle}
            containerStatusColors={containerStatusColors}
            isAdmin={isAdmin}
            canViewWorkflowCompanyDetails={canViewWorkflowCompanyDetails}
            canAssignDispatch={canAssignDispatch}
            canManageWorkflow={canManageWorkflow}
            canManageShipmentRecord={canManageShipmentRecord}
            canViewPurchasePrice={canViewPurchasePrice}
            isReleasedForTransit={isReleasedForTransit}
            creatingReleaseToken={creatingReleaseToken}
            formatStatus={formatStatus}
            onOpenAssignDispatch={() => setOpenAssignDispatch(true)}
            onOpenAssignTransit={openAssignTransitDialog}
            onGenerateReleaseToken={() => {
              void handleGenerateReleaseToken();
            }}
            onRemoveFromDispatch={() => {
              void handleRemoveFromDispatch();
            }}
            onRemoveFromTransit={() => {
              void handleRemoveFromTransit();
            }}
          />
        </TabPanel>

        {/* Live Map Tab */}
        <TabPanel value={activeTab} index={1}>
          <ShipmentLiveMapPanel shipment={shipment} isExpandedView />
        </TabPanel>

        {/* Timeline Tab */}
        <TabPanel value={activeTab} index={2}>
          <ShipmentTimelineTab
            items={shipment.unifiedTimeline || []}
            onOpenCompanyLedgerEntry={(companyId, entryId) => {
              router.push(`/dashboard/finance/companies/${companyId}?entryId=${entryId}`);
            }}
          />
        </TabPanel>

        {/* Photos Tab */}
        <TabPanel value={activeTab} index={3}>
          <ShipmentPhotosTab
            vehicleLabel={vehicleLabel}
            vehiclePhotos={shipment.vehiclePhotos || []}
            arrivalPhotos={arrivalPhotos}
            canUploadArrivalPhotos={canUploadArrivalPhotos}
            uploading={uploading}
            uploadProgress={uploadProgress}
            onVehiclePhotoClick={(idx) => openLightbox(shipment.vehiclePhotos || [], idx, 'Vehicle Photos')}
            onArrivalPhotoClick={(idx) => openLightbox(arrivalPhotos, idx, 'Arrival Photos')}
            onDownloadSingle={downloadPhoto}
            onDownloadAll={downloadAllPhotos}
            onUploadArrivalPhotos={handleArrivalPhotosUpload}
            onRemoveArrivalPhoto={removeArrivalPhoto}
          />
        </TabPanel>

        {/* Documents Tab */}
        <TabPanel value={activeTab} index={4}>
          <ShipmentDocumentsTab
            documents={shipment.documents || []}
            shipmentId={shipment.id}
            readOnly={!hasPermission(session?.user?.role, 'documents:manage')}
            onDocumentsChange={() => {
              void refreshShipmentPage();
            }}
          />
        </TabPanel>

        {/* Financials Tab */}
        <TabPanel value={activeTab} index={5}>
          <ShipmentFinancialsTab
            shipment={shipment}
            canManageShipmentExpenses={canManageShipmentExpenses}
            canAddLedgerExpense={canAddLedgerExpense}
            canAddShipmentExpense={canAddShipmentExpense}
            canAddDispatchExpense={canAddDispatchExpense}
            canAddTransitExpense={canAddTransitExpense}
            canViewLedgerComparison={canViewLedgerComparison}
            expenseActionHelpText={expenseActionHelpText}
            expenseLedgerHelpText={expenseLedgerHelpText}
            companyChargedForComparison={companyChargedForComparison}
            companyLedgerDebitsTotal={companyLedgerDebitsTotal}
            companyLedgerCreditsTotal={companyLedgerCreditsTotal}
            customerChargedForComparison={customerChargedForComparison}
            userLedgerDebitsTotal={userLedgerDebitsTotal}
            userLedgerCreditsTotal={userLedgerCreditsTotal}
            netDifference={netDifference}
            comparisonTransactions={comparisonTransactionsWithDrillDown}
            classifiedShipmentExpenseData={classifiedShipmentExpenseData}
            filteredShipmentExpenseTotal={filteredShipmentExpenseTotal}
            expenseSourceFilter={expenseSourceFilter}
            expenseEntriesWithCompanyLedger={expenseEntriesWithCompanyLedger}
            deletingExpenseId={deletingExpenseId}
            totalEstimatedCost={totalEstimatedCost}
            expenseSourceLabels={expenseSourceLabels}
            expenseSourceDescriptions={expenseSourceDescriptions}
            expenseSourceStyles={expenseSourceStyles}
            onOpenShipmentExpense={() => setExpenseAction({
              modalTitle: 'Add Shipment Expense',
              contextType: expenseContextType,
              contextId: expenseContextId,
            })}
            onOpenDispatchExpense={() => setExpenseAction({
              modalTitle: 'Add Dispatch Expense',
              contextType: 'DISPATCH',
              contextId: shipment?.dispatchId || undefined,
            })}
            onOpenTransitExpense={() => setExpenseAction({
              modalTitle: 'Add Transit Expense',
              contextType: 'TRANSIT',
              contextId: shipment?.transitId || undefined,
            })}
            onExpenseSourceFilterChange={setExpenseSourceFilter}
            onOpenCompanyLedgerEntry={openCompanyLedgerEntry}
            onDeleteExpense={(entryId) => {
              void handleDeleteExpense(entryId);
            }}
            onExpenseUpdated={() => {
              void refreshShipmentPage();
            }}
          />
        </TabPanel>

        {/* Billing Tab */}
        <TabPanel value={activeTab} index={6}>
          <ShipmentBillingTab
            shipmentId={shipment.id}
            refreshKey={`${shipment.updatedAt}-${shipment.ledgerEntries.length}-${shipment.containerDamages.length}`}
            purchasePriceRecord={purchasePriceRecord}
          />
        </TabPanel>

        {/* Damages Tab */}
        <TabPanel value={activeTab} index={7}>
          <ShipmentDamagesTab damages={shipment.containerDamages || []} shipment={shipment} />
        </TabPanel>

        {/* Details Tab */}
        <TabPanel value={activeTab} index={8}>
          <ShipmentDetailsTab shipment={shipment} formatStatus={formatStatus} />
        </TabPanel>

        {isAdmin && (
          <TabPanel value={activeTab} index={9}>
            <ShipmentActivityTab logs={shipment.auditLogs || []} />
          </TabPanel>
        )}

        {/* Customer Tab (Admin Only) */}
        {isAdmin && (
          <TabPanel value={activeTab} index={10}>
            <ShipmentCustomerTab user={shipment.user} shipmentId={shipment.id} />
          </TabPanel>
        )}

        {canUseCompanyGetpass && (
          <TabPanel value={activeTab} index={11}>
            <ShipmentCompanyGetpassTab
              shipmentId={shipment.id}
              company={shipment.shippingCompany}
              startedAt={shipment.companyGetpassStartedAt}
              completedAt={shipment.companyGetpassCompletedAt}
              durationSeconds={shipment.companyGetpassDurationSeconds}
              canStart={canManageWorkflow}
              onStarted={(companyGetpassStartedAt) => {
                setShipment((currentShipment) =>
                  currentShipment ? { ...currentShipment, companyGetpassStartedAt } : currentShipment
                );
              }}
              onCompleted={(companyGetpassCompletedAt, companyGetpassDurationSeconds) => {
                setShipment((currentShipment) =>
                  currentShipment
                    ? { ...currentShipment, companyGetpassCompletedAt, companyGetpassDurationSeconds }
                    : currentShipment
                );
              }}
              onUndone={() => {
                setShipment((currentShipment) =>
                  currentShipment ? { ...currentShipment, companyGetpassStartedAt: null } : currentShipment
                );
              }}
            />
          </TabPanel>
        )}

        {canViewLedgerComparison && (
          <TabPanel value={activeTab} index={12}>
            <ShipmentCompanyLedgerTab
              shipmentId={shipment.id}
              companies={companyLedgerCompanies}
              entries={companyLedgerEntries}
              paymentSummary={shipment.companyPaymentSummary || { charged: 0, paid: 0, remaining: 0, status: 'NOT_DUE' }}
              canManageLedger={canManageCompanyLedger}
              onTransactionCreated={() => {
                void refreshShipmentPage();
              }}
            />
          </TabPanel>
        )}
      </DashboardSurface>

      <ShipmentDetailOverlays
        lightbox={lightbox}
        canDeleteArrivalLightbox={Boolean(canUploadArrivalPhotos && lightbox?.title === 'Arrival Photos')}
        downloading={downloading}
        onCloseLightbox={() => setLightbox(null)}
        onNavigateLightbox={(idx) => setLightbox((prev) => (prev ? { ...prev, index: idx } : prev))}
        onDeleteFromLightbox={canUploadArrivalPhotos ? handleLightboxDelete : undefined}
        onDownloadPhoto={downloadPhoto}
        onDownloadAllPhotos={downloadAllPhotos}
        canManageWorkflow={canManageWorkflow}
        openAssignDispatch={openAssignDispatch}
        onCloseAssignDispatch={() => setOpenAssignDispatch(false)}
        loadingDispatches={loadingDispatches}
        assigningDispatch={assigningDispatch}
        availableDispatches={availableDispatches}
        dispatchIdToAssign={dispatchIdToAssign}
        onDispatchIdChange={setDispatchIdToAssign}
        onAssignDispatch={handleAssignDispatch}
        openAssignTransit={openAssignTransit}
        onCloseAssignTransit={() => setOpenAssignTransit(false)}
        loadingTransits={loadingTransits}
        assigningTransit={assigningTransit}
        availableTransits={availableTransits}
        transitIdToAssign={transitIdToAssign}
        onTransitIdChange={setTransitIdToAssign}
        releaseTokenToAssign={releaseTokenToAssign}
        onReleaseTokenChange={setReleaseTokenToAssign}
        showReleaseToken={showReleaseToken}
        onToggleReleaseToken={() => setShowReleaseToken((prev) => !prev)}
        onAssignTransit={handleAssignTransit}
        shipmentId={shipment?.id || null}
        expenseAction={expenseAction}
        onCloseExpenseAction={() => setExpenseAction(null)}
        onExpenseSuccess={() => {
          void refreshShipmentPage();
        }}
      />

      <ConfirmDialog
        open={pendingConfirm !== null}
        onClose={() => setPendingConfirm(null)}
        onConfirm={() => { const pending = pendingConfirm; setPendingConfirm(null); pending?.action(); }}
        title={pendingConfirm?.title ?? 'Confirm'}
        message={pendingConfirm?.message ?? ''}
        confirmText={pendingConfirm?.confirmText ?? 'Confirm'}
        severity="error"
      />
    </ProtectedRoute>
  );
}