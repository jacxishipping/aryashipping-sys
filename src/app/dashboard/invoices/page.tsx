'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';
import Link from 'next/link';
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

function TextField({ label, value, onChange, disabled, type = 'text', size, placeholder, helperText, multiline, rows = 3, className = '', InputProps, ...props }: any) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-semibold text-[var(--text-secondary)]">{label}</label>}
      <div className="relative flex items-center">
        {InputProps?.startAdornment && (
          <div className="absolute left-3 text-[var(--text-secondary)]">{InputProps.startAdornment}</div>
        )}
        <input
          type={type}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full ${InputProps?.startAdornment ? 'pl-9' : 'pl-3'} ${InputProps?.endAdornment ? 'pr-9' : 'pr-3'} ${size === 'small' ? 'py-1.5 text-xs' : 'py-2 text-sm'} rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors disabled:opacity-50`}
          {...props}
        />
        {InputProps?.endAdornment && (
          <div className="absolute right-3 text-[var(--text-secondary)]">{InputProps.endAdornment}</div>
        )}
      </div>
      {helperText && <span className="text-[0.75rem] text-[var(--text-secondary)]">{helperText}</span>}
    </div>
  );
}

function InputAdornment({ children, position }: any) {
  return <>{children}</>;
}
import {
	FileText,
	Search,
	Download,
	Eye,
	Calendar,
	DollarSign,
	User,
	Package,
	PanelRightOpen,
} from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import InvoiceQuickPeek from '@/components/dashboard/InvoiceQuickPeek';
import { 
	PageHeader, 
	Button, 
	Breadcrumbs, 
	toast, 
	LoadingState, 
	EmptyState, 
	StatsCard,
	DashboardPageSkeleton,
	StatusBadge,
	CopyButton,
	StatusFilterPills,
	Select,
} from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { exportToCSVWithHeaders } from '@/lib/export';
import { SavedFilterPresets } from '@/components/dashboard/SavedFilterPresets';

interface Invoice {
	id: string;
	invoiceNumber: string;
	userId: string;
	containerId: string | null;
	shipmentId: string | null;
	status: string;
	reversedAt?: string | null;
	reversedBy?: { name: string | null; email: string } | null;
	issueDate: string;
	dueDate: string | null;
	total: number;
	user: {
		name: string | null;
		email: string;
	};
	container: {
		containerNumber: string;
	} | null;
	shipment: {
		id: string;
		vehicleYear: number | null;
		vehicleMake: string | null;
		vehicleModel: string | null;
		vehicleVIN: string | null;
		vehicleType: string;
	} | null;
	_count: {
		lineItems: number;
	};
}

interface InvoiceTableRow {
	id: string;
	invoiceNumber: string;
	customer: string;
	reference: string;
	referenceId: string | null;
	referenceType: 'container' | 'shipment' | 'none';
	issueDate: string;
	dueDate: string | null;
	status: string;
	total: number;
	reversedAt?: string | null;
	reversedByLabel?: string | null;
}

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
	DRAFT: { label: 'Draft', color: 'default' },
	PENDING: { label: 'Pending', color: 'warning' },
	SENT: { label: 'Sent', color: 'info' },
	PAID: { label: 'Paid', color: 'success' },
	OVERDUE: { label: 'Overdue', color: 'error' },
	CANCELLED: { label: 'Cancelled', color: 'default' },
};

export default function InvoicesPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { data: session } = useSession();
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [backfillingCharges, setBackfillingCharges] = useState(false);
	const [itemsPerPage, setItemsPerPage] = useState(25);
	const [currentPage, setCurrentPage] = useState(1);
	const [pagination, setPagination] = useState({ total: 0, totalAll: 0, limit: 25, offset: 0, hasMore: false });
	const [quickPeekInvoiceId, setQuickPeekInvoiceId] = useState<string | null>(null);

	const isAdmin = hasPermission(session?.user?.role, 'invoices:manage');
	const customerFilterUserId = searchParams.get('userId');
	const customerFilterLabel = searchParams.get('customer') || 'Selected Customer';

	useEffect(() => {
		setCurrentPage(1);
		const timeout = setTimeout(() => {
			fetchInvoices(0, itemsPerPage);
		}, 250);

		return () => clearTimeout(timeout);
	}, [statusFilter, itemsPerPage, searchTerm, customerFilterUserId]);

	const fetchInvoices = async (offset = 0, limit = itemsPerPage) => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (statusFilter !== 'all') {
				params.append('status', statusFilter.toUpperCase());
			}
			if (searchTerm.trim()) {
				params.append('search', searchTerm.trim());
			}
			if (customerFilterUserId) {
				params.append('userId', customerFilterUserId);
			}
			params.append('limit', limit.toString());
			params.append('offset', offset.toString());
			
			const response = await fetch(`/api/invoices?${params}`, { cache: 'no-store' });
			const data = await response.json();

			if (response.ok) {
				setInvoices(data.invoices || []);
				setPagination(data.pagination || { total: 0, totalAll: 0, limit, offset, hasMore: false });
			} else {
				toast.error('Failed to load invoices');
			}
		} catch (error) {
			console.error('Error fetching invoices:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const handlePageChange = (newPage: number) => {
		const offset = (newPage - 1) * itemsPerPage;
		setCurrentPage(newPage);
		fetchInvoices(offset, itemsPerPage);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleItemsPerPageChange = (newLimit: number) => {
		setItemsPerPage(newLimit);
		setCurrentPage(1);
	};

	const handleDownloadPDF = async (invoice: Invoice) => {
		try {
			toast.success('Generating PDF...', {
				description: 'Please wait a moment'
			});

			// Fetch full invoice details
			const response = await fetch(`/api/invoices/${invoice.id}`, { cache: 'no-store' });
			const fullInvoice = await response.json();

			// Dynamically import the PDF generator
			const { downloadInvoicePDF } = await import('@/lib/utils/generateInvoicePDF');
			
			// Generate and download the PDF
			await downloadInvoicePDF(fullInvoice);

			toast.success('PDF downloaded successfully!', {
				description: 'Check your downloads folder'
			});
		} catch (error) {
			console.error('Error generating PDF:', error);
			toast.error('Failed to generate PDF', {
				description: 'Please try again'
			});
		}
	};

	const handleBackfillShipmentCharges = async () => {
		try {
			setBackfillingCharges(true);
			const response = await fetch('/api/admin/billing/backfill-shipment-charges', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			});
			const payload = (await response.json().catch(() => ({}))) as {
				error?: string;
				processedEntries?: number;
				shipmentsTouched?: number;
				totalLedgerEntries?: number;
			};

			if (!response.ok) {
				throw new Error(payload.error || 'Failed to backfill shipment charges');
			}

			toast.success('Shipment charge backfill completed', {
				description: `${payload.processedEntries || 0} ledger-backed charges synced across ${payload.shipmentsTouched || 0} shipment${payload.shipmentsTouched === 1 ? '' : 's'}.`,
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to backfill shipment charges');
		} finally {
			setBackfillingCharges(false);
		}
	};

	const formatDate = (date: string | null) => {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	// Search and orphan filtering are handled by the API.
	const filteredInvoices = invoices;

	const invoiceRows: InvoiceTableRow[] = filteredInvoices.map((invoice) => {
		// Determine reference: per-shipment invoices show vehicle info, container-based show container number
		let reference = 'N/A';
		let referenceId: string | null = null;
		let referenceType: 'container' | 'shipment' | 'none' = 'none';

		if (invoice.shipment) {
			const s = invoice.shipment;
			reference = [s.vehicleYear, s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || s.vehicleType;
			if (s.vehicleVIN) reference += ` (${s.vehicleVIN})`;
			referenceId = s.id;
			referenceType = 'shipment';
		} else if (invoice.container) {
			reference = invoice.container.containerNumber;
			referenceId = invoice.containerId;
			referenceType = 'container';
		}

		return {
			id: invoice.id,
			invoiceNumber: invoice.invoiceNumber,
			customer: invoice.user.name || invoice.user.email,
			reference,
			referenceId,
			referenceType,
			issueDate: invoice.issueDate,
			dueDate: invoice.dueDate,
			status: invoice.status,
			total: invoice.total,
			reversedAt: (invoice as { reversedAt?: string | null }).reversedAt ?? null,
			reversedByLabel: (invoice as { reversedBy?: { name: string | null; email: string } | null }).reversedBy
				? ((invoice as { reversedBy: { name: string | null; email: string } }).reversedBy.name ||
					(invoice as { reversedBy: { name: string | null; email: string } }).reversedBy.email)
				: null,
		};
	});

	const invoiceColumns: Column<InvoiceTableRow>[] = [
		{
			key: 'invoiceNumber',
			header: 'Invoice #',
			sortable: true,
			render: (value) => (
				<span className="inline-flex items-center gap-1.5 font-mono font-semibold">
					<span>{String(value)}</span>
					<CopyButton value={String(value)} label="Invoice #" />
				</span>
			),
		},
		...(isAdmin ? [{ key: 'customer', header: 'Customer', sortable: true }] : []),
		{
			key: 'reference',
			header: 'Shipment / Container',
			render: (value, row) => {
				if (row.referenceType === 'shipment' && row.referenceId) {
					return (
						<Link
							href={`/dashboard/shipments/${row.referenceId}`}
							style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}
						>
							{String(value)}
						</Link>
					);
				}
				if (row.referenceType === 'container' && row.referenceId) {
					return (
						<Link
							href={`/dashboard/containers/${row.referenceId}`}
							style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontFamily: 'monospace', fontWeight: 600 }}
						>
							{String(value)}
						</Link>
					);
				}
				return <span>{String(value)}</span>;
			},
		},
		{
			key: 'issueDate',
			header: 'Issue Date',
			sortable: true,
			render: (value) => formatDate(String(value)),
		},
		{
			key: 'dueDate',
			header: 'Due Date',
			render: (value) => formatDate(value ? String(value) : null),
		},
		{
			key: 'status',
			header: 'Status',
			render: (value) => <StatusBadge status={String(value)} size="sm" />,
		},
		{
			key: 'reversedAt',
			header: 'Reversed',
			render: (value, row) => {
				if (!row.reversedAt) {
					return <span className="text-[var(--text-secondary)]">-</span>;
				}
				return (
					<span style={{ fontSize: '0.8rem' }}>
						{formatDate(String(row.reversedAt))}
						{row.reversedByLabel ? (
							<Box component="span" sx={{ display: 'block', color: 'var(--text-secondary)' }}>
								by {row.reversedByLabel}
							</Box>
						) : null}
					</span>
				);
			},
		},
		{
			key: 'total',
			header: 'Total',
			render: (value) => formatCurrency(Number(value)),
		},
		{
			key: 'actions',
			header: 'Actions',
			align: 'right',
			render: (_, row) => (
				<Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
					<Button
						variant="outline"
						size="sm"
						icon={<PanelRightOpen className="w-3 h-3" />}
						onClick={() => setQuickPeekInvoiceId(row.id)}
						title="Quick peek invoice details"
					>
						Peek
					</Button>
					<Button
						variant="outline"
						size="sm"
						icon={<Eye className="w-3 h-3" />}
						onClick={() => router.push(`/dashboard/invoices/${row.id}`)}
					>
						View
					</Button>
					<Button
						variant="outline"
						size="sm"
						icon={<Download className="w-3 h-3" />}
						onClick={() => {
							const inv = invoices.find((i) => i.id === row.id);
							if (inv) handleDownloadPDF(inv);
						}}
					>
						PDF
					</Button>
				</Box>
			),
		},
	];

	const invoiceStatusOptions = Object.entries(statusConfig).map(([value, config]) => ({
		value,
		label: config.label,
	}));

	const handleBulkStatusUpdate = async (invoiceIds: string[], status: string) => {
		if (!isAdmin) return;

		try {
			const response = await fetch('/api/bulk/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'updateStatus', invoiceIds, data: { status } }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || 'Bulk status update failed');
			}

			toast.success('Invoices updated', {
				description: `${data.count || 0} invoice(s) updated`,
			});
			fetchInvoices();
		} catch (error) {
			console.error('Error updating invoices:', error);
			toast.error('Failed to update invoices');
		}
	};

const confirmAction = useConfirmAction();

        const handleBulkDelete = async (invoiceIds: string[]) => {
                if (!isAdmin) return;

                if (!(await confirmAction({
                        message: `Delete ${invoiceIds.length} invoice(s)? This cannot be undone.`,
                        confirmText: 'Delete invoices',
                        severity: 'error',
                }))) {
			return;
		}

		try {
			const response = await fetch('/api/bulk/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'delete', invoiceIds }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || 'Bulk delete failed');
			}

			toast.success('Invoices deleted', {
				description: `${data.count || 0} invoice(s) removed`,
			});
			fetchInvoices();
		} catch (error) {
			console.error('Error deleting invoices:', error);
			toast.error('Failed to delete invoices');
		}
	};

	const handleBulkExport = (rows: InvoiceTableRow[]) => {
		try {
			exportToCSVWithHeaders(
				rows.map((row) => ({
					invoiceNumber: row.invoiceNumber,
					customer: row.customer,
					reference: row.reference,
					issueDate: formatDate(row.issueDate),
					dueDate: formatDate(row.dueDate),
					status: row.status,
					total: formatCurrency(row.total),
				})),
				[
					{ key: 'invoiceNumber', label: 'Invoice #' },
					{ key: 'customer', label: 'Customer' },
					{ key: 'reference', label: 'Shipment / Container' },
					{ key: 'issueDate', label: 'Issue Date' },
					{ key: 'dueDate', label: 'Due Date' },
					{ key: 'status', label: 'Status' },
					{ key: 'total', label: 'Total' },
				],
				'invoices'
			);
			toast.success('Export ready');
		} catch (error) {
			console.error('Error exporting invoices:', error);
			toast.error('Failed to export invoices');
		}
	};

	// Calculate stats
	// ⚡ Bolt: Consolidated multiple filter and reduce operations into a single O(N) loop
	const stats = {
		total: pagination.totalAll,
		paid: 0,
		pending: 0,
		overdue: 0,
		totalAmount: 0,
		paidAmount: 0,
	};

	for (const i of invoices) {
		stats.totalAmount += i.total;
		if (i.status === 'PAID') {
			stats.paid++;
			stats.paidAmount += i.total;
		} else if (i.status === 'PENDING' || i.status === 'SENT') {
			stats.pending++;
		} else if (i.status === 'OVERDUE') {
			stats.overdue++;
		}
	}
	const quickStatusFilters = [
		{ value: 'all', label: 'All', count: pagination.totalAll },
		{ value: 'overdue', label: 'Overdue', count: stats.overdue },
		{ value: 'pending', label: 'Pending', count: stats.pending },
		{ value: 'paid', label: 'Paid', count: stats.paid },
		{ value: 'draft', label: 'Draft', count: invoices.filter((invoice) => invoice.status === 'DRAFT').length },
		{ value: 'cancelled', label: 'Reversed', count: invoices.filter((invoice) => invoice.status === 'CANCELLED').length },
	];

	if (loading) {
		return <DashboardPageSkeleton />;
	}

	return (
		<DashboardSurface>
			{/* Page Header */}
			<PageHeader
				showBreadcrumbs
				title={isAdmin ? 'All Invoices' : 'My Invoices'}
				description={isAdmin ? 'Manage customer invoices' : 'View and download your invoices'}
				actions={
					isAdmin ? (
						<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
							<Button variant="outline" onClick={handleBackfillShipmentCharges} disabled={backfillingCharges}>
								{backfillingCharges ? 'Backfilling...' : 'Backfill Shipment Charges'}
							</Button>
						</Box>
					) : null
				}
			/>

			{/* Stats Cards */}
			<Box sx={{ 
				display: 'grid', 
				gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, 
				gap: 3, 
				mb: 3 
			}}>
				<StatsCard
					title="Total Invoices"
					value={stats.total}
					icon={<FileText className="w-5 h-5" />}
					trend={{ value: 0, isPositive: true }}
				/>
				<StatsCard
					title="Paid"
					value={stats.paid}
					subtitle={formatCurrency(stats.paidAmount)}
					icon={<DollarSign className="w-5 h-5" />}
					trend={{ value: 0, isPositive: true }}
					variant="success"
				/>
				<StatsCard
					title="Pending"
					value={stats.pending}
					icon={<Calendar className="w-5 h-5" />}
					trend={{ value: 0, isPositive: true }}
					variant="warning"
				/>
				<StatsCard
					title="Overdue"
					value={stats.overdue}
					icon={<FileText className="w-5 h-5" />}
					trend={{ value: 0, isPositive: false }}
					variant="error"
				/>
			</Box>

			<DashboardPanel title="Invoice Health" description="Jump straight to the invoice queue that needs attention.">
				<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.25fr 1fr' }, gap: 2 }}>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, overflow: 'hidden' }}>
						<StatusFilterPills
							options={[
								{ value: 'all', label: `All (${pagination.totalAll})` },
								{ value: 'overdue', label: `Overdue (${stats.overdue})`, color: 'var(--error)' },
								{ value: 'pending', label: `Pending (${stats.pending})`, color: 'var(--warning)' },
								{ value: 'paid', label: `Paid (${stats.paid})`, color: 'var(--success)' },
								{ value: 'draft', label: `Draft (${invoices.filter((i) => i.status === 'DRAFT').length})`, color: 'var(--text-secondary)' },
								{ value: 'cancelled', label: `Reversed (${invoices.filter((i) => i.status === 'CANCELLED').length})`, color: 'var(--text-secondary)' },
							]}
							selectedValue={statusFilter}
							onSelect={(val) => setStatusFilter(val)}
						/>
					</Box>
					<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
						{[
							{ label: 'Open Amount', value: formatCurrency(Math.max(stats.totalAmount - stats.paidAmount, 0)) },
							{ label: 'Paid Amount', value: formatCurrency(stats.paidAmount) },
							{ label: 'Visible Total', value: formatCurrency(stats.totalAmount) },
						].map((item) => (
							<Box key={item.label} sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid var(--border)', background: 'var(--background)' }}>
								<Box sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>{item.label}</Box>
								<Box sx={{ mt: 0.25, fontWeight: 800, color: 'var(--text-primary)' }}>{item.value}</Box>
							</Box>
						))}
					</Box>
				</Box>
			</DashboardPanel>

			{/* Main Invoices Panel */}
			<DashboardPanel 
				title="Invoices"
				description={customerFilterUserId ? `${pagination.total} invoice(s) for ${customerFilterLabel}` : `${pagination.total} invoice(s)`}
			>
				{customerFilterUserId ? (
					<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', mb: 3, p: 2, border: '1px solid var(--border)', borderRadius: 2, background: 'var(--panel)' }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
							<User className="w-4 h-4" />
							<Box>
								<Box sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Customer Filter</Box>
								<Box sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{customerFilterLabel}</Box>
							</Box>
						</Box>
						<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/invoices')}>
							Clear Filter
						</Button>
					</Box>
				) : null}

				{/* Filters */}
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
					<TextField
						placeholder="Search by invoice #, customer, VIN, vehicle, or container..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						size="small"
						fullWidth
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<Search className="w-4 h-4" />
								</InputAdornment>
							),
						}}
					/>
					<SavedFilterPresets
						storageKey="invoices"
						currentFilters={{ status: statusFilter, search: searchTerm }}
						onApplyPreset={(filters) => {
							if (filters.status) setStatusFilter(filters.status);
							if (typeof filters.search === 'string') setSearchTerm(filters.search);
						}}
					/>
				</Box>

				{/* Invoices Table */}
				{filteredInvoices.length === 0 ? (
					<EmptyState
						icon={<FileText className="w-12 h-12" />}
						title="No Invoices"
						description={searchTerm ? 'No invoices match your search' : 'No invoices have been created yet'}
					/>
				) : (
					<DataTable
						data={invoiceRows}
						columns={invoiceColumns}
						keyField="id"
						selectable={isAdmin}
						onRowClick={(row) => router.push(`/dashboard/invoices/${row.id}`)}
						onDelete={isAdmin ? handleBulkDelete : undefined}
						onExport={isAdmin ? handleBulkExport : undefined}
						bulkStatusOptions={invoiceStatusOptions}
						onBulkStatusChange={isAdmin ? handleBulkStatusUpdate : undefined}
					/>
				)}
			</DashboardPanel>

				{/* Pagination Controls */}
				<Box sx={{ mt: 4, pt: 3, borderTop: '1px solid var(--border-color)' }}>
					<Box sx={{ 
						display: 'flex', 
						justifyContent: 'space-between', 
						alignItems: 'center',
						flexWrap: 'wrap',
						gap: 2,
						mb: 3
					}}>
						{/* Items per page selector */}
						<Box sx={{ minWidth: 130 }}>
							<Select
								label="Items per page"
								value={itemsPerPage}
								onChange={(value) => handleItemsPerPageChange(Number(value))}
								size="small"
								options={[
									{ value: 10, label: '10' },
									{ value: 25, label: '25' },
									{ value: 50, label: '50' },
									{ value: 100, label: '100' },
								]}
							/>
						</Box>

						{/* Pagination info and controls */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
							<span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
								{pagination.total === 0
									? 'Showing 0 of 0 invoices'
									: `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, pagination.total)} of ${pagination.total} invoices`}
							</span>
						</Box>

						{/* Page Navigation */}
						<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage === 1 || loading}
								onClick={() => handlePageChange(currentPage - 1)}
							>
								← Previous
							</Button>

							{/* Page Numbers */}
							<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
								{Array.from({ length: Math.min(5, Math.ceil(pagination.total / itemsPerPage)) }).map((_, index) => {
									const totalPages = Math.ceil(pagination.total / itemsPerPage);
									let pageNum = index + 1;

									// Show pages around current page
									if (currentPage > 3 && index === 0) {
										pageNum = 1;
									} else if (currentPage > 3) {
										pageNum = currentPage - 2 + index;
									}

									if (pageNum > totalPages) return null;

									return (
										<Button
											key={pageNum}
											variant={pageNum === currentPage ? 'primary' : 'outline'}
											size="sm"
											disabled={loading}
											onClick={() => handlePageChange(pageNum)}
											sx={{ minWidth: '32px' }}
										>
											{pageNum}
										</Button>
									);
								})}
							</Box>

							<Button
								variant="outline"
								size="sm"
								disabled={currentPage >= Math.ceil(pagination.total / itemsPerPage) || loading}
								onClick={() => handlePageChange(currentPage + 1)}
							>
								Next →
							</Button>
						</Box>
					</Box>
				</Box>

				{/* Slide-over Quick Peek Drawer */}
				<InvoiceQuickPeek
					invoiceId={quickPeekInvoiceId}
					open={Boolean(quickPeekInvoiceId)}
					onClose={() => setQuickPeekInvoiceId(null)}
				/>
		</DashboardSurface>
	);
}