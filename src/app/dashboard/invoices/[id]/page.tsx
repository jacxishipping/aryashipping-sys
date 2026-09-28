'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';
import { 
	Box, 
	Table, 
	TableBody, 
	TableCell, 
	TableContainer, 
	TableHead, 
	TableRow,
	Divider,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
	TextField,
	Tabs,
	Tab,
	InputAdornment,
	Tooltip,
	Typography,
} from '@mui/material';
import {
	ArrowLeft,
	FileText,
	Package,
	User,
	Download,
	Check,
	Pencil,
	Plus,
	Trash2,
	RotateCcw,
	DollarSign,
	Calendar,
	CreditCard,
	Tag,
	AlertCircle,
} from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { 
	PageHeader,
	Button, 
	Breadcrumbs, 
	toast, 
	EmptyState, 
	DetailPageSkeleton,
	CopyButton,
	StatusBadge,
	Modal,
} from '@/components/design-system';
import { AdminRoute } from '@/components/auth/AdminRoute';

interface LineItem {
	id: string;
	description: string;
	type: string;
	quantity: number;
	unitPrice: number;
	amount: number;
	linkedCompanyLedgerEntry?: {
		id: string;
		companyId: string;
		description: string;
		reference: string | null;
		notes: string | null;
		company: {
			id: string;
			name: string;
			code: string | null;
		};
	} | null;
	shipment?: {
		id: string;
		vehicleType: string;
		vehicleMake: string | null;
		vehicleModel: string | null;
		vehicleYear: number | null;
		vehicleVIN: string | null;
		vehicleColor: string | null;
	};
}

interface Invoice {
	id: string;
	invoiceNumber: string;
	userId: string;
	containerId: string | null;
	shipmentId: string | null;
	status: string;
	issueDate: string;
	dueDate: string | null;
	paidDate: string | null;
	subtotal: number;
	tax: number;
	discount: number;
	total: number;
	paymentMethod: string | null;
	paymentReference: string | null;
	notes: string | null;
	internalNotes: string | null;
	user: {
		id: string;
		name: string | null;
		email: string;
		phone: string | null;
		address: string | null;
		city: string | null;
		country: string | null;
	};
	container: {
		id: string;
		containerNumber: string;
		trackingNumber: string | null;
		status: string;
		vesselName: string | null;
		loadingPort: string | null;
		destinationPort: string | null;
		estimatedArrival: string | null;
	} | null;
	shipment: {
		id: string;
		vehicleType: string;
		vehicleMake: string | null;
		vehicleModel: string | null;
		vehicleYear: number | null;
		vehicleVIN: string | null;
		vehicleColor: string | null;
		status: string;
		paymentStatus: string | null;
	} | null;
	lineItems: LineItem[];
	auditLogs?: Array<{
		id: string;
		action: string;
		description: string;
		performedBy: string;
		oldValue?: string | null;
		newValue?: string | null;
		timestamp: string;
		metadata?: Record<string, unknown> | null;
	}>;
}

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
	DRAFT: { label: 'Draft', color: 'default' },
	PENDING: { label: 'Pending', color: 'warning' },
	SENT: { label: 'Sent', color: 'info' },
	PAID: { label: 'Paid', color: 'success' },
	OVERDUE: { label: 'Overdue', color: 'error' },
	CANCELLED: { label: 'Cancelled', color: 'default' },
};

export default function InvoiceDetailPage() {
	const params = useParams();
	const router = useRouter();
	const { data: session } = useSession();
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);
	const [disputedLineIds, setDisputedLineIds] = useState<Set<string>>(() => new Set());
	const [disputeTarget, setDisputeTarget] = useState<{ line: { id: string; description: string; amount: number }; shipmentId: string | null } | null>(null);
	const [disputeReason, setDisputeReason] = useState('');
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editModalTab, setEditModalTab] = useState<'details' | 'items'>('details');
	const [editForm, setEditForm] = useState({
		dueDate: '',
		discount: '0',
		tax: '0',
		paymentMethod: '',
		paymentReference: '',
		notes: '',
		internalNotes: '',
	});
	const [manualLineItem, setManualLineItem] = useState({
		description: '',
		type: 'OTHER_FEE',
		quantity: '1',
		amount: '0',
		companyAmount: '0',
	});
	const [lineItemEdits, setLineItemEdits] = useState<Record<string, {
		description: string;
		type: string;
		quantity: string;
		amount: string;
		companyAmount: string;
	}>>({});

	const isAdmin = hasPermission(session?.user?.role, 'invoices:manage');

	useEffect(() => {
		fetchInvoice();
	}, [params.id]);

	useEffect(() => {
		if (!invoice) return;
		setLineItemEdits(
			Object.fromEntries(
				invoice.lineItems.map((item) => [
					item.id,
					{
						description: item.description,
						type: item.type,
						quantity: String(item.quantity ?? 1),
						amount: String(item.amount ?? 0),
						companyAmount: String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
					},
				])
			)
		);
	}, [invoice]);

	const fetchInvoice = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/invoices/${params.id}`);
			const data = await response.json();

			if (response.ok) {
				setInvoice(data);
			} else {
				toast.error('Failed to load invoice');
			}
		} catch (error) {
			console.error('Error fetching invoice:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const handleDisputeLine = (line: { id: string; description: string; amount: number }, shipmentId: string | null) => {
		if (!invoice) return;
		setDisputeTarget({ line, shipmentId });
		setDisputeReason('');
	};

	const closeDisputeModal = () => {
		setDisputeTarget(null);
		setDisputeReason('');
	};

	const submitDisputeLine = async () => {
		if (!invoice || !disputeTarget) return;
		const trimmedReason = disputeReason.trim();
		if (trimmedReason.length < 5) {
			toast.error('Please describe the reason in a few words');
			return;
		}

		try {
			const response = await fetch(`/api/invoices/${invoice.id}/dispute`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shipmentId: disputeTarget.shipmentId,
					description: disputeTarget.line.description,
					amount: disputeTarget.line.amount,
					reason: trimmedReason,
				}),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || 'Failed to submit dispute');
			toast.success('Dispute submitted', { description: 'Our team will review it and reply shortly.' });
			setDisputedLineIds((current) => {
				const next = new Set(current);
				next.add(disputeTarget.line.id);
				return next;
			});
			closeDisputeModal();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to submit dispute');
		}
	};

	const resetLineItemEdit = (lineItemId: string) => {
		if (!invoice) return;
		const item = invoice.lineItems.find((entry) => entry.id === lineItemId);
		if (!item) return;

		setLineItemEdits((current) => ({
			...current,
			[lineItemId]: {
				description: item.description,
				type: item.type,
				quantity: String(item.quantity ?? 1),
				amount: String(item.amount ?? 0),
				companyAmount: String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
			},
		}));
	};

	const resetAllLineItemEdits = () => {
		if (!invoice) return;
		setLineItemEdits(
			Object.fromEntries(
				invoice.lineItems.map((item) => [
					item.id,
					{
						description: item.description,
						type: item.type,
						quantity: String(item.quantity ?? 1),
						amount: String(item.amount ?? 0),
						companyAmount: String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
					},
				])
			)
		);
	};

	const isLineItemDirty = (item: LineItem) => {
		const edit = lineItemEdits[item.id];
		if (!edit) return false;
		const origCompanyAmount = String((item as any).linkedCompanyLedgerEntry?.amount ?? 0);
		return (
			edit.description !== item.description ||
			edit.type !== item.type ||
			edit.quantity !== String(item.quantity ?? 1) ||
			edit.amount !== String(item.amount ?? 0) ||
			edit.companyAmount !== origCompanyAmount
		);
	};

	const hasAnyDirtyLineItems = useMemo(() => {
		if (!invoice?.lineItems) return false;
		return invoice.lineItems.some((item) => isLineItemDirty(item));
	}, [invoice?.lineItems, lineItemEdits]);

	const liveLineItemsSubtotal = useMemo(() => {
		if (!invoice?.lineItems) return 0;
		return invoice.lineItems.reduce((sum, item) => {
			const itemEdit = lineItemEdits[item.id];
			const amount = itemEdit ? parseFloat(itemEdit.amount) || 0 : item.amount;
			const qty = itemEdit ? parseFloat(itemEdit.quantity) || 1 : item.quantity;
			return sum + amount * qty;
		}, 0);
	}, [invoice?.lineItems, lineItemEdits]);

	const liveDiscount = Math.max(0, parseFloat(editForm.discount) || 0);
	const liveTax = Math.max(0, parseFloat(editForm.tax) || 0);
	const liveGrandTotal = Math.max(0, liveLineItemsSubtotal - liveDiscount + liveTax);

	const openInvoiceEditor = (initialTab: 'details' | 'items' = 'details') => {
		if (!invoice) return;
		setEditForm({
			dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : '',
			discount: String(invoice.discount ?? 0),
			tax: String(invoice.tax ?? 0),
			paymentMethod: invoice.paymentMethod ?? '',
			paymentReference: invoice.paymentReference ?? '',
			notes: invoice.notes ?? '',
			internalNotes: invoice.internalNotes ?? '',
		});
		setManualLineItem({ description: '', type: 'OTHER_FEE', quantity: '1', amount: '0', companyAmount: '0' });
		resetAllLineItemEdits();
		setEditModalTab(initialTab);
		setIsEditOpen(true);
	};

	const handleAddManualLineItem = async () => {
		if (!invoice) return;

		const description = manualLineItem.description.trim();
		const quantity = Number(manualLineItem.quantity || 1);
		const amount = Number(manualLineItem.amount || 0);
		const companyAmount = Number(manualLineItem.companyAmount || 0);

		if (!description) {
			toast.error('Expense description is required');
			return;
		}
		if (!Number.isFinite(quantity) || quantity <= 0) {
			toast.error('Quantity must be greater than zero');
			return;
		}
		if (!Number.isFinite(amount) || amount < 0) {
			toast.error('Expense amount must be a valid non-negative number');
			return;
		}
		if (!Number.isFinite(companyAmount) || companyAmount < 0) {
			toast.error('Company amount must be a valid non-negative number');
			return;
		}
		if (companyAmount > amount) {
			toast.error('Company amount cannot exceed the expense amount');
			return;
		}

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${invoice.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lineItems: [{
						action: 'add',
						description,
						type: manualLineItem.type,
						quantity,
						amount,
						companyAmount,
					}],
				}),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(payload.error || 'Failed to add expense line');

			toast.success('Expense line added');
			setManualLineItem({ description: '', type: 'OTHER_FEE', quantity: '1', amount: '0', companyAmount: '0' });
			await fetchInvoice();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add expense line');
		} finally {
			setUpdating(false);
		}
	};

	const handleRemoveLineItem = async (lineItemId: string) => {
		if (!invoice) return;

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${invoice.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lineItems: [{ action: 'remove', id: lineItemId }],
				}),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(payload.error || 'Failed to remove expense line');

			toast.success('Expense line removed');
			await fetchInvoice();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to remove expense line');
		} finally {
			setUpdating(false);
		}
	};

	const handleUpdateLineItem = async (lineItemId: string) => {
		if (!invoice) return;
		const edit = lineItemEdits[lineItemId];
		if (!edit) return;

		const description = edit.description.trim();
		const quantity = Number(edit.quantity || 1);
		const amount = Number(edit.amount || 0);
		const companyAmount = Number(edit.companyAmount || 0);

		if (!description) {
			toast.error('Expense description is required');
			return;
		}
		if (!Number.isFinite(quantity) || quantity < 0) {
			toast.error('Quantity must be a valid non-negative number');
			return;
		}
		if (!Number.isFinite(amount) || amount < 0) {
			toast.error('Amount must be a valid non-negative number');
			return;
		}
		if (!Number.isFinite(companyAmount) || companyAmount < 0) {
			toast.error('Company amount must be a valid non-negative number');
			return;
		}
		if (companyAmount > amount) {
			toast.error('Company amount cannot exceed the expense amount');
			return;
		}

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${invoice.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lineItems: [{
						action: 'update',
						id: lineItemId,
						description,
						type: edit.type,
						quantity,
						amount,
						companyAmount,
					}],
				}),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(payload.error || 'Failed to update expense line');

			toast.success('Expense line updated');
			await fetchInvoice();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update expense line');
		} finally {
			setUpdating(false);
		}
	};

	const handleInvoiceEdit = async () => {
		if (!invoice) return;

		const discount = Number(editForm.discount);
		const tax = Number(editForm.tax);
		if (!Number.isFinite(discount) || !Number.isFinite(tax) || discount < 0 || tax < 0) {
			toast.error('Discount and tax must be valid non-negative numbers');
			return;
		}

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					dueDate: editForm.dueDate || null,
					discount,
					tax,
					paymentMethod: editForm.paymentMethod || null,
					paymentReference: editForm.paymentReference || null,
					notes: editForm.notes || null,
					internalNotes: editForm.internalNotes || null,
				}),
			});

			if (response.ok) {
				toast.success('Invoice updated successfully');
				setIsEditOpen(false);
				await fetchInvoice();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to update invoice');
			}
		} catch (error) {
			console.error('Error updating invoice:', error);
			toast.error('An error occurred while saving the invoice');
		} finally {
			setUpdating(false);
		}
	};

	const handleStatusUpdate = async (newStatus: string) => {
		if (!invoice) return;

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});

			if (response.ok) {
				toast.success('Status updated successfully');
				fetchInvoice();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to update status');
			}
		} catch (error) {
			console.error('Error updating status:', error);
			toast.error('An error occurred');
		} finally {
			setUpdating(false);
		}
	};

	const handleMarkAsPaid = async () => {
		if (!invoice) return;

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					status: 'PAID',
					paidDate: new Date().toISOString(),
				}),
			});

			if (response.ok) {
				toast.success('Invoice marked as paid');
				fetchInvoice();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to update invoice');
			}
		} catch (error) {
			console.error('Error marking as paid:', error);
			toast.error('An error occurred');
		} finally {
			setUpdating(false);
		}
	};

	const handleDownloadPDF = async () => {
		if (!invoice) return;
		try {
			const { downloadInvoicePDF } = await import('@/lib/utils/generateInvoicePDF');
			await downloadInvoicePDF(invoice);
		} catch (error) {
			console.error('PDF generation error:', error);
			toast.error('Failed to generate PDF');
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

	const getLineItemTypeLabel = (item: LineItem) => {
		if (item.type === 'DISCOUNT' && /damage/i.test(item.description)) {
			return 'DAMAGE CREDIT';
		}
		return item.type.replace(/_/g, ' ');
	};

	const getExpenseShortLabel = (item: LineItem): string => {
		const typeMap: Record<string, string> = {
			PURCHASE_PRICE: 'Vehicle Purchase',
			VEHICLE_PRICE: 'Vehicle Purchase',
			SHIPPING_FEE: 'Shipping',
			INSURANCE: 'Insurance',
			CUSTOMS_FEE: 'Customs',
			STORAGE_FEE: 'Storage',
			HANDLING_FEE: 'Handling / Towing',
			OTHER_FEE: 'Other',
			DISCOUNT: 'Discount',
		};
		return typeMap[item.type] ?? item.type.replace(/_/g, ' ');
	};

	const openCompanyLedgerEntry = (entry: NonNullable<LineItem['linkedCompanyLedgerEntry']>) => {
		router.push(`/dashboard/finance/companies/${entry.companyId}?entryId=${entry.id}`);
	};

	// Group line items by shipment
	const groupedLineItems = invoice?.lineItems.reduce((acc, item) => {
		const key = item.shipment?.id || 'other';
		if (!acc[key]) {
			acc[key] = {
				shipment: item.shipment,
				items: [],
			};
		}
		acc[key].items.push(item);
		return acc;
	}, {} as Record<string, { shipment?: LineItem['shipment']; items: LineItem[] }>);

	if (loading) {
		return <DetailPageSkeleton />;
	}

	if (!invoice) {
		return (
			<EmptyState
				icon={<FileText className="w-16 h-16" />}
				title="Invoice Not Found"
				description="The invoice you're looking for doesn't exist or you don't have permission to view it"
			/>
		);
	}

	const statusInfo = statusConfig[invoice.status] || { label: invoice.status, color: 'default' };
	const groupedEntries = Object.entries(groupedLineItems || {});
	const hasMultipleShipmentGroups = groupedEntries.length > 1;
	const purchasePaid = invoice.shipment?.paymentStatus === 'COMPLETED'
		? invoice.lineItems
			.filter((i) => i.type === 'PURCHASE_PRICE' || i.type === 'VEHICLE_PRICE')
			.reduce((sum, i) => sum + i.amount, 0)
		: 0;
	const balanceDue = invoice.total - purchasePaid;

	const viewerIsOwner = Boolean(session?.user?.id && invoice.userId === session.user.id);
	const canViewInvoice = isAdmin || viewerIsOwner;
	const canDisputeLines =
		canViewInvoice && invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED' && invoice.status !== 'PENDING';

	if (!canViewInvoice) {
		return (
			<Box sx={{ maxWidth: '1400px', mx: 'auto', p: { xs: 2, md: 3 } }}>
				<EmptyState
					icon={<FileText className="w-16 h-16" />}
					title="Invoice Not Found"
					description="The invoice you're looking for doesn't exist or you don't have permission to view it"
				/>
			</Box>
		);
	}

	return (
		<>
			<Modal
				open={isEditOpen}
				onClose={() => setIsEditOpen(false)}
				title={
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
						<Box sx={{
							p: 1,
							borderRadius: 2,
							bgcolor: 'rgba(var(--accent-gold-rgb), 0.12)',
							color: 'var(--accent-gold)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center'
						}}>
							<Pencil className="w-5 h-5" />
						</Box>
						<div>
							<Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
								Edit Invoice & Charges
							</Typography>
							<Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
								Invoice #{invoice.invoiceNumber} &bull; {invoice.user.name || invoice.user.email}
							</Typography>
						</div>
					</Box>
				}
				size="md"
				actions={
					<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, width: '100%' }}>
						{/* Live Totals Bar */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem' }}>
								<span className="text-[var(--text-secondary)]">Subtotal:</span>
								<span className="font-semibold text-[var(--text-primary)]">{formatCurrency(liveLineItemsSubtotal)}</span>
							</Box>
							{liveDiscount > 0 && (
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem' }}>
									<span className="text-[var(--text-secondary)]">Discount:</span>
									<span className="font-semibold text-[var(--success)]">-{formatCurrency(liveDiscount)}</span>
								</Box>
							)}
							{liveTax > 0 && (
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem' }}>
									<span className="text-[var(--text-secondary)]">Tax:</span>
									<span className="font-semibold text-[var(--text-primary)]">+{formatCurrency(liveTax)}</span>
								</Box>
							)}
							<Box sx={{
								display: 'flex',
								alignItems: 'center',
								gap: 1,
								bgcolor: 'rgba(var(--accent-gold-rgb), 0.12)',
								border: '1px solid rgba(var(--accent-gold-rgb), 0.3)',
								borderRadius: 1.5,
								px: 1.75,
								py: 0.5
							}}>
								<span className="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--accent-gold)]">Grand Total:</span>
								<span className="text-[0.95rem] font-bold text-[var(--accent-gold)]">{formatCurrency(liveGrandTotal)}</span>
							</Box>
						</Box>

						{/* Action Buttons */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
							<Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={updating}>
								Cancel
							</Button>
							<Button
								variant="primary"
								onClick={handleInvoiceEdit}
								disabled={updating}
								sx={{ bgcolor: 'var(--accent-gold)', color: 'white' }}
							>
								{updating ? 'Saving...' : 'Save Invoice Details'}
							</Button>
						</Box>
					</Box>
				}
			>
					{/* Navigation Tabs */}
					<Box sx={{ mb: 2, borderBottom: '1px solid var(--border)' }}>
						<Tabs
							value={editModalTab}
							onChange={(_, val) => setEditModalTab(val)}
							sx={{
								minHeight: 40,
								'& .MuiTabs-indicator': {
									bgcolor: 'var(--accent-gold)',
									height: 3,
									borderRadius: '3px 3px 0 0',
								},
								'& .MuiTab-root': {
									textTransform: 'none',
									fontWeight: 600,
									fontSize: '0.875rem',
									color: 'var(--text-secondary)',
									minHeight: 40,
									py: 1,
									px: 2,
									'&.Mui-selected': {
										color: 'var(--accent-gold)',
									},
								},
							}}
						>
							<Tab
								value="details"
								label={
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<FileText className="w-4 h-4" />
										<span>Terms & Payment Details</span>
									</Box>
								}
							/>
							<Tab
								value="items"
								label={
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<DollarSign className="w-4 h-4" />
										<span>Line Items & Charges ({invoice.lineItems.length})</span>
										{hasAnyDirtyLineItems && (
											<span className="w-2 h-2 rounded-full bg-[var(--accent-gold)] animate-pulse" />
										)}
									</Box>
								}
							/>
						</Tabs>
					</Box>
					{editModalTab === 'details' ? (
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
							{/* Section 1: Schedule & Payment */}
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									<Calendar className="w-4 h-4 text-[var(--accent-gold)]" />
									<Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										Schedule & Payment Terms
									</Typography>
								</Box>
								<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
									<TextField
										label="Due Date"
										type="date"
										size="small"
										value={editForm.dueDate}
										onChange={(event) => setEditForm((current) => ({ ...current, dueDate: event.target.value }))}
										InputLabelProps={{ shrink: true }}
										fullWidth
									/>
									<TextField
										label="Payment Method"
										placeholder="e.g. Bank Wire, Card, Cash"
										size="small"
										value={editForm.paymentMethod}
										onChange={(event) => setEditForm((current) => ({ ...current, paymentMethod: event.target.value }))}
										fullWidth
									/>
									<TextField
										label="Payment Reference"
										placeholder="e.g. Wire ID / Cheque #"
										size="small"
										value={editForm.paymentReference}
										onChange={(event) => setEditForm((current) => ({ ...current, paymentReference: event.target.value }))}
										fullWidth
									/>
								</Box>
							</Box>

							<Divider sx={{ borderColor: 'var(--border)' }} />

							{/* Section 2: Adjustments */}
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									<DollarSign className="w-4 h-4 text-[var(--accent-gold)]" />
									<Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										Discounts & Taxes
									</Typography>
								</Box>
								<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
									<TextField
										label="Overall Discount"
										type="number"
										size="small"
										value={editForm.discount}
										onChange={(event) => setEditForm((current) => ({ ...current, discount: event.target.value }))}
										inputProps={{ min: 0, step: '0.01' }}
										InputProps={{
											startAdornment: <InputAdornment position="start">$</InputAdornment>,
										}}
										helperText="Deducted directly from line items subtotal"
										fullWidth
									/>
									<TextField
										label="Tax Amount"
										type="number"
										size="small"
										value={editForm.tax}
										onChange={(event) => setEditForm((current) => ({ ...current, tax: event.target.value }))}
										inputProps={{ min: 0, step: '0.01' }}
										InputProps={{
											startAdornment: <InputAdornment position="start">$</InputAdornment>,
										}}
										helperText="Sales tax or VAT applied to total"
										fullWidth
									/>
								</Box>
							</Box>

							<Divider sx={{ borderColor: 'var(--border)' }} />

							{/* Section 3: Notes & Disclosures */}
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									<FileText className="w-4 h-4 text-[var(--accent-gold)]" />
									<Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										Notes & Disclosures
									</Typography>
								</Box>
								<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
									<TextField
										label="Customer Notes"
										placeholder="Public notes visible on printed PDF and customer portal"
										value={editForm.notes}
										onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
										multiline
										rows={3}
										fullWidth
										helperText="Visible to customer"
									/>
									<TextField
										label="Internal Notes"
										placeholder="Private administrative notes (accounting, exceptions, audit log)"
										value={editForm.internalNotes}
										onChange={(event) => setEditForm((current) => ({ ...current, internalNotes: event.target.value }))}
										multiline
										rows={3}
										fullWidth
										helperText="Visible to staff only"
									/>
								</Box>
							</Box>
						</Box>
					) : (
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
							{/* Line Items Top Bar */}
							<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
								<Box>
									<Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										Active Charge Lines ({invoice.lineItems.length})
									</Typography>
									<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
										Click 'Save' on any modified row to immediately update that line item.
									</Typography>
								</Box>
								<Button 
									variant="outline" 
									size="sm" 
									icon={<RotateCcw className="w-3.5 h-3.5" />}
									onClick={resetAllLineItemEdits} 
									disabled={updating || invoice.lineItems.length === 0}
								>
									Reset all
								</Button>
							</Box>

							{/* Line Items List */}
							{invoice.lineItems.length === 0 ? (
								<Box sx={{ 
									p: 4, 
									textAlign: 'center', 
									borderRadius: 2, 
									border: '1px dashed var(--border)',
									bgcolor: 'var(--background)' 
								}}>
									<Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
										No expense lines on this invoice yet. Use the form below to add one.
									</Typography>
								</Box>
							) : (
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
									{invoice.lineItems.map((item) => {
										const isDirty = isLineItemDirty(item);
										const edit = lineItemEdits[item.id];
										const qty = edit ? parseFloat(edit.quantity) || 1 : item.quantity;
										const unitPrice = edit ? parseFloat(edit.amount) || 0 : item.amount;
										const lineTotal = qty * unitPrice;

										return (
											<Box 
												key={item.id} 
												sx={{ 
													border: isDirty ? '1px solid rgba(var(--accent-gold-rgb), 0.6)' : '1px solid var(--border)', 
													borderRadius: 2, 
													p: 2, 
													display: 'flex', 
													flexDirection: 'column', 
													gap: 1.5,
													bgcolor: isDirty ? 'rgba(var(--accent-gold-rgb), 0.03)' : 'var(--background)',
													boxShadow: isDirty ? '0 0 14px rgba(var(--accent-gold-rgb), 0.08)' : 'none',
													transition: 'all 0.2s ease',
												}}
											>
												{/* Item Header */}
												<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
													<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
														<Box sx={{ 
															p: 0.75, 
															borderRadius: 1.5, 
															bgcolor: 'var(--panel)', 
															border: '1px solid var(--border)',
															display: 'flex', 
															alignItems: 'center', 
															justifyContent: 'center' 
														}}>
															<Tag className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
														</Box>
														<Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
															{item.description || 'Expense Line'}
														</Typography>
														{isDirty && (
															<StatusBadge 
																status="WARNING"
																label="Unsaved Changes" 
																size="sm" 
															/>
														)}
													</Box>
													<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
														<Box sx={{ textAlign: 'right', mr: 0.5 }}>
															<Typography sx={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
																Line Total
															</Typography>
															<Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
																{formatCurrency(lineTotal)}
															</Typography>
														</Box>
														{isDirty && (
															<Button 
																variant="outline" 
																size="sm" 
																icon={<RotateCcw className="w-3.5 h-3.5" />}
																onClick={() => resetLineItemEdit(item.id)} 
																disabled={updating}
															>
																Reset
															</Button>
														)}
														<Button 
															variant={isDirty ? 'primary' : 'outline'} 
															size="sm" 
															icon={<Check className="w-3.5 h-3.5" />}
															onClick={() => void handleUpdateLineItem(item.id)} 
															disabled={updating || !isDirty}
															sx={isDirty ? { bgcolor: 'var(--accent-gold)', color: 'white' } : {}}
														>
															Save
														</Button>
														<Button 
															variant="outline" 
															size="sm" 
															color="error" 
															icon={<Trash2 className="w-3.5 h-3.5 text-[var(--error)]" />}
															onClick={() => void handleRemoveLineItem(item.id)} 
															disabled={updating}
															title="Remove Line"
														/>
													</Box>
												</Box>

												{/* Row 1: Description & Type */}
												<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1.2fr' }, gap: 1.5 }}>
													<TextField
														label="Description"
														size="small"
														value={lineItemEdits[item.id]?.description ?? item.description}
														onChange={(event) => setLineItemEdits((current) => ({
															...current,
															[item.id]: {
																type: current[item.id]?.type ?? item.type,
																quantity: current[item.id]?.quantity ?? String(item.quantity ?? 1),
																amount: current[item.id]?.amount ?? String(item.amount ?? 0),
																companyAmount: current[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
																description: event.target.value,
															},
														}))}
														fullWidth
													/>
													<FormControl fullWidth size="small">
														<InputLabel>Category / Type</InputLabel>
														<Select
															label="Category / Type"
															value={lineItemEdits[item.id]?.type ?? item.type}
															onChange={(event) => setLineItemEdits((current) => ({
																...current,
																[item.id]: {
																	description: current[item.id]?.description ?? item.description,
																	type: event.target.value,
																	quantity: current[item.id]?.quantity ?? String(item.quantity ?? 1),
																	amount: current[item.id]?.amount ?? String(item.amount ?? 0),
																	companyAmount: current[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
																},
															}))}
														>
															<MenuItem value="OTHER_FEE">Other Fee</MenuItem>
															<MenuItem value="SHIPPING_FEE">Shipping Fee</MenuItem>
															<MenuItem value="INSURANCE">Insurance</MenuItem>
															<MenuItem value="CUSTOMS_FEE">Customs Fee</MenuItem>
															<MenuItem value="STORAGE_FEE">Storage Fee</MenuItem>
															<MenuItem value="HANDLING_FEE">Handling Fee</MenuItem>
														</Select>
													</FormControl>
												</Box>

												{/* Row 2: Quantity, Amount, Company Cost */}
												<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: isAdmin ? '1fr 1.5fr 1.5fr' : '1fr 2fr' }, gap: 1.5 }}>
													<TextField
														label="Quantity"
														size="small"
														type="number"
														value={lineItemEdits[item.id]?.quantity ?? String(item.quantity ?? 1)}
														onChange={(event) => setLineItemEdits((current) => ({
															...current,
															[item.id]: {
																description: current[item.id]?.description ?? item.description,
																type: current[item.id]?.type ?? item.type,
																quantity: event.target.value,
																amount: current[item.id]?.amount ?? String(item.amount ?? 0),
																companyAmount: current[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
															},
														}))}
														inputProps={{ min: 0, step: '1' }}
													/>
													<TextField
														label="Unit Price"
														size="small"
														type="number"
														value={lineItemEdits[item.id]?.amount ?? String(item.amount ?? 0)}
														onChange={(event) => setLineItemEdits((current) => ({
															...current,
															[item.id]: {
																description: current[item.id]?.description ?? item.description,
																type: current[item.id]?.type ?? item.type,
																quantity: current[item.id]?.quantity ?? String(item.quantity ?? 1),
																amount: event.target.value,
																companyAmount: current[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
															},
														}))}
														inputProps={{ min: 0, step: '0.01' }}
														InputProps={{
															startAdornment: <InputAdornment position="start">$</InputAdornment>,
														}}
														fullWidth
													/>
													{isAdmin && (
														<TextField
															label="Company Cost"
															size="small"
															type="number"
															value={lineItemEdits[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0)}
															onChange={(event) => setLineItemEdits((current) => ({
																...current,
																[item.id]: {
																	description: current[item.id]?.description ?? item.description,
																	type: current[item.id]?.type ?? item.type,
																	quantity: current[item.id]?.quantity ?? String(item.quantity ?? 1),
																	amount: current[item.id]?.amount ?? String(item.amount ?? 0),
																	companyAmount: event.target.value,
																},
															}))}
															inputProps={{ min: 0, step: '0.01' }}
															InputProps={{
																startAdornment: <InputAdornment position="start">$</InputAdornment>,
															}}
															helperText="Internal ledger cost"
															fullWidth
														/>
													)}
												</Box>
											</Box>
										);
									})}
								</Box>
							)}

							{/* Add Expense Line Form */}
							<Box 
								sx={{ 
									border: '1px dashed rgba(var(--accent-gold-rgb), 0.6)', 
									borderRadius: 2, 
									p: 2.5, 
									bgcolor: 'rgba(var(--accent-gold-rgb), 0.03)',
									display: 'flex', 
									flexDirection: 'column', 
									gap: 2 
								}}
							>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
									<Box sx={{ 
										p: 0.75, 
										borderRadius: 1.5, 
										bgcolor: 'rgba(var(--accent-gold-rgb), 0.15)', 
										color: 'var(--accent-gold)',
										display: 'flex', 
										alignItems: 'center', 
										justifyContent: 'center' 
									}}>
										<Plus className="w-4 h-4" />
									</Box>
									<div>
										<Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
											Add Expense Line
										</Typography>
										<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
											Insert additional freight charges, customs duties, storage, or miscellaneous fees
										</Typography>
									</div>
								</Box>

								<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1.2fr' }, gap: 1.5 }}>
									<TextField
										label="Description"
										placeholder="e.g. Additional warehouse storage fee"
										size="small"
										value={manualLineItem.description}
										onChange={(event) => setManualLineItem((current) => ({ ...current, description: event.target.value }))}
										fullWidth
									/>
									<FormControl fullWidth size="small">
										<InputLabel>Type</InputLabel>
										<Select
											label="Type"
											value={manualLineItem.type}
											onChange={(event) => setManualLineItem((current) => ({ ...current, type: event.target.value }))}
										>
											<MenuItem value="OTHER_FEE">Other Fee</MenuItem>
											<MenuItem value="SHIPPING_FEE">Shipping</MenuItem>
											<MenuItem value="INSURANCE">Insurance</MenuItem>
											<MenuItem value="CUSTOMS_FEE">Customs</MenuItem>
											<MenuItem value="STORAGE_FEE">Storage</MenuItem>
											<MenuItem value="HANDLING_FEE">Handling</MenuItem>
										</Select>
									</FormControl>
								</Box>

								<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: isAdmin ? '1fr 1.5fr 1.5fr' : '1fr 2fr' }, gap: 1.5 }}>
									<TextField
										label="Quantity"
										size="small"
										type="number"
										value={manualLineItem.quantity}
										onChange={(event) => setManualLineItem((current) => ({ ...current, quantity: event.target.value }))}
										inputProps={{ min: 1, step: '1' }}
									/>
									<TextField
										label="Amount"
										size="small"
										type="number"
										value={manualLineItem.amount}
										onChange={(event) => setManualLineItem((current) => ({ ...current, amount: event.target.value }))}
										inputProps={{ min: 0, step: '0.01' }}
										InputProps={{
											startAdornment: <InputAdornment position="start">$</InputAdornment>,
										}}
										fullWidth
									/>
									{isAdmin && (
										<TextField
											label="Company Amount"
											size="small"
											type="number"
											value={manualLineItem.companyAmount}
											onChange={(event) => setManualLineItem((current) => ({ ...current, companyAmount: event.target.value }))}
											inputProps={{ min: 0, step: '0.01' }}
											InputProps={{
												startAdornment: <InputAdornment position="start">$</InputAdornment>,
											}}
											helperText="Internal ledger cost"
											fullWidth
										/>
									)}
								</Box>

								<Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
									<Button 
										variant="primary" 
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => void handleAddManualLineItem()} 
										disabled={updating || !manualLineItem.description.trim()}
										sx={{ bgcolor: 'var(--accent-gold)', color: 'white' }}
									>
										Add Line Item
									</Button>
								</Box>
							</Box>
						</Box>
					)}
			</Modal>

			<Box sx={{ maxWidth: '1400px', mx: 'auto', p: { xs: 2, md: 3 } }}>
				{/* Breadcrumbs */}
				<Breadcrumbs
					items={[
						{ label: 'Dashboard', href: '/dashboard' },
						{ label: 'Invoices', href: '/dashboard/invoices' },
						...(invoice.container
							? [{ label: invoice.container.containerNumber, href: `/dashboard/containers/${invoice.containerId}` }]
							: invoice.shipment
							? [{ label: [invoice.shipment.vehicleYear, invoice.shipment.vehicleMake, invoice.shipment.vehicleModel].filter(Boolean).join(' ') || 'Shipment', href: `/dashboard/shipments/${invoice.shipmentId}` }]
							: []),
						{ label: invoice.invoiceNumber, href: '#' },
					]}
				/>

				{/* Page Header */}
				<PageHeader
					title={invoice.invoiceNumber}
					description={`Invoice for ${invoice.user.name || invoice.user.email}`}
					actions={
						<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
							<StatusBadge status={invoice.status} />
							<CopyButton value={invoice.invoiceNumber} label="Invoice #" />
							{isAdmin && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
								<Button
									variant="outline"
									size="sm"
									icon={<Check className="w-4 h-4" />}
									onClick={handleMarkAsPaid}
									disabled={updating}
								>
									Mark as Paid
								</Button>
							)}
							{isAdmin && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
								<Button
									variant="outline"
									size="sm"
									icon={<Pencil className="w-4 h-4" />}
									onClick={() => openInvoiceEditor('details')}
									disabled={updating}
								>
									Edit Invoice
								</Button>
							)}
							<Button
								variant="primary"
								size="sm"
								icon={<Download className="w-4 h-4" />}
								onClick={handleDownloadPDF}
								sx={{
									bgcolor: 'var(--accent-gold)',
									color: 'white',
									'&:hover': {
										bgcolor: 'var(--accent-gold)',
										opacity: 0.9,
									}
								}}
							>
								Download PDF
							</Button>
							<Button
								variant="outline"
								size="sm"
								icon={<ArrowLeft className="w-4 h-4" />}
								onClick={() => router.push(
									invoice.containerId
										? `/dashboard/containers/${invoice.containerId}`
										: invoice.shipmentId
										? `/dashboard/shipments/${invoice.shipmentId}`
										: '/dashboard/invoices'
								)}
							>
								{invoice.containerId ? 'Back to Container' : invoice.shipmentId ? 'Back to Shipment' : 'Back to Invoices'}
							</Button>
						</Box>
					}
				/>

				{/* Main Content */}
				<DashboardSurface>
					<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
						{/* Invoice Information */}
						<DashboardPanel 
							title="Invoice Details"
							description="Basic invoice information"
						>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Invoice Number</Box>
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
											{invoice.invoiceNumber}
										</span>
										<CopyButton value={invoice.invoiceNumber} label="Invoice #" />
									</Box>
								</Box>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Issue Date</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{formatDate(invoice.issueDate)}
									</Box>
								</Box>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Due Date</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{formatDate(invoice.dueDate)}
									</Box>
								</Box>
								{invoice.paidDate && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Paid Date</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)' }}>
											{formatDate(invoice.paidDate)}
										</Box>
									</Box>
								)}
								<Divider sx={{ borderColor: 'var(--border)' }} />
								<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status</Box>
									<StatusBadge status={invoice.status} size="sm" />
								</Box>
								{isAdmin && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
									<FormControl fullWidth size="small">
										<InputLabel>Update Status</InputLabel>
										<Select
											value={invoice.status}
											onChange={(e) => handleStatusUpdate(e.target.value)}
											disabled={updating}
										>
											<MenuItem value="DRAFT">Draft</MenuItem>
											<MenuItem value="PENDING">Pending</MenuItem>
											<MenuItem value="SENT">Sent</MenuItem>
											<MenuItem value="PAID">Paid</MenuItem>
											<MenuItem value="CANCELLED">Cancelled</MenuItem>
										</Select>
									</FormControl>
								)}
							</Box>
						</DashboardPanel>

						{/* Customer Information */}
						<DashboardPanel 
							title="Customer"
							description="Customer details"
						>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>Name</Box>
									<Box sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{invoice.user.name || 'N/A'}
									</Box>
								</Box>
								<Box>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>Email</Box>
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{invoice.user.email}</span>
										<CopyButton value={invoice.user.email} label="Email" />
									</Box>
								</Box>
								{invoice.user.phone && (
									<Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>Phone</Box>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
											<span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{invoice.user.phone}</span>
											<CopyButton value={invoice.user.phone} label="Phone" />
										</Box>
									</Box>
								)}
								{invoice.user.address && (
									<Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>Address</Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
											{invoice.user.address}
											{invoice.user.city && `, ${invoice.user.city}`}
											{invoice.user.country && `, ${invoice.user.country}`}
										</Box>
									</Box>
								)}
								<Divider sx={{ borderColor: 'var(--border)' }} />
								<Button
									variant="outline"
									size="sm"
									icon={<User className="w-3 h-3" />}
									onClick={() => router.push(`/dashboard/customers?search=${invoice.user.email}`)}
								>
									View Customer
								</Button>
							</Box>
						</DashboardPanel>

						{/* Container or Shipment Information */}
						{invoice.container ? (
						<DashboardPanel 
							title="Container"
							description="Shipping container"
						>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Container #</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
										{invoice.container.containerNumber}
									</Box>
								</Box>
								{invoice.container.trackingNumber && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tracking #</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
											{invoice.container.trackingNumber}
										</Box>
									</Box>
								)}
								{invoice.container.vesselName && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Vessel</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
											{invoice.container.vesselName}
										</Box>
									</Box>
								)}
								{invoice.container.loadingPort && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>From</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
											{invoice.container.loadingPort}
										</Box>
									</Box>
								)}
								{invoice.container.destinationPort && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>To</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
											{invoice.container.destinationPort}
										</Box>
									</Box>
								)}
								<Divider sx={{ borderColor: 'var(--border)' }} />
								<Button
									variant="outline"
									size="sm"
									icon={<Package className="w-3 h-3" />}
									onClick={() => router.push(`/dashboard/containers/${invoice.containerId}`)}
								>
									View Container
								</Button>
							</Box>
						</DashboardPanel>
						) : invoice.shipment ? (
						<DashboardPanel
							title="Vehicle"
							description="Shipment details"
						>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Vehicle</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{[invoice.shipment.vehicleYear, invoice.shipment.vehicleMake, invoice.shipment.vehicleModel].filter(Boolean).join(' ') || invoice.shipment.vehicleType}
									</Box>
								</Box>
								{invoice.shipment.vehicleVIN && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>VIN</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
											{invoice.shipment.vehicleVIN}
										</Box>
									</Box>
								)}
								{invoice.shipment.vehicleColor && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Color</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
											{invoice.shipment.vehicleColor}
										</Box>
									</Box>
								)}
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{invoice.shipment.status.replace(/_/g, ' ')}
									</Box>
								</Box>
								<Divider sx={{ borderColor: 'var(--border)' }} />
								<Button
									variant="outline"
									size="sm"
									icon={<Package className="w-3 h-3" />}
									onClick={() => router.push(`/dashboard/shipments/${invoice.shipmentId}`)}
								>
									View Shipment
								</Button>
							</Box>
						</DashboardPanel>
						) : null}
					</Box>

					{/* Line Items */}
					<Box sx={{ mt: 3 }}>
						<DashboardPanel 
							title="Line Items"
							description="Detailed breakdown of charges"
							actions={
								isAdmin && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' ? (
									<Button
										variant="outline"
										size="sm"
										icon={<Pencil className="w-3.5 h-3.5" />}
										onClick={() => openInvoiceEditor('items')}
										disabled={updating}
									>
										Edit Charges
									</Button>
								) : undefined
							}
						>
						<TableContainer sx={{ border: '1px solid var(--border)', borderRadius: 2 }}>
							<Table
								size="small"
								sx={{
									'& .MuiTableCell-head': {
										bgcolor: 'var(--background)',
										color: 'var(--text-secondary)',
									},
								}}
							>
								<TableHead>
									<TableRow>
										<TableCell sx={{ fontWeight: 600 }} align="left">Description</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="left">Type</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="center">Qty</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="center">Unit Price</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="center">Amount</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{groupedEntries.map(([key, group]) => (
										<React.Fragment key={key}>
											{group.shipment && hasMultipleShipmentGroups && (
												<TableRow key={`header-${key}`}>
													<TableCell colSpan={5} align="left" sx={{ 
														bgcolor: 'var(--background)', 
														fontWeight: 600,
														fontSize: '0.875rem',
														py: 1,
													}}>
														{group.shipment.vehicleYear} {group.shipment.vehicleMake} {group.shipment.vehicleModel}
														{group.shipment.vehicleVIN && ` (VIN: ${group.shipment.vehicleVIN})`}
													</TableCell>
												</TableRow>
											)}
											{group.items.map((item) => (
													<TableRow key={item.id} hover>
													<TableCell align="left" sx={{ pl: 2, pr: 2 }}>
														<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1, flexWrap: 'wrap', textAlign: 'left' }}>
															<span>{getExpenseShortLabel(item)}</span>
								{canDisputeLines && !disputedLineIds.has(item.id) && (
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											void handleDisputeLine(
												{ id: item.id, description: item.description, amount: item.amount },
												group.shipment?.id ?? null,
											)}
										sx={{ minWidth: 'auto', px: 1 }}
									>
										Dispute
									</Button>
								)}
															{(item.type === 'PURCHASE_PRICE' || item.type === 'VEHICLE_PRICE') &&
																invoice.shipment?.paymentStatus === 'COMPLETED' && (
																<StatusBadge
																	status="PAID"
																	label="Purchase Paid"
																	size="sm"
																/>
															)}
															{isAdmin && item.linkedCompanyLedgerEntry && (
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => openCompanyLedgerEntry(item.linkedCompanyLedgerEntry!)}
																	sx={{ minWidth: 'auto', px: 1 }}
																>
																	Company Ledger
																</Button>
															)}
														</Box>
													</TableCell>
													<TableCell align="left">
														<StatusBadge 
															status="DEFAULT"
															label={getLineItemTypeLabel(item)} 
															size="sm"
														/>
													</TableCell>
													<TableCell align="center">{item.quantity}</TableCell>
													<TableCell align="center">{formatCurrency(item.unitPrice)}</TableCell>
													<TableCell align="center" sx={{ fontWeight: 600 }}>
														{formatCurrency(item.amount)}
													</TableCell>
												</TableRow>
											))}
										</React.Fragment>
									))}
									<TableRow>
										<TableCell colSpan={4} align="right" sx={{ fontWeight: 600, borderTop: '2px solid var(--border)' }}>
											Subtotal
										</TableCell>
										<TableCell align="right" sx={{ fontWeight: 600, borderTop: '2px solid var(--border)' }}>
											{formatCurrency(invoice.subtotal)}
										</TableCell>
									</TableRow>
									{invoice.discount > 0 && (
										<TableRow>
											<TableCell colSpan={4} align="right" sx={{ fontWeight: 600, color: 'var(--success)' }}>
												Discount
											</TableCell>
											<TableCell align="right" sx={{ fontWeight: 600, color: 'var(--success)' }}>
												-{formatCurrency(invoice.discount)}
											</TableCell>
										</TableRow>
									)}
									{invoice.tax > 0 && (
										<TableRow>
											<TableCell colSpan={4} align="right" sx={{ fontWeight: 600 }}>
												Tax
											</TableCell>
											<TableCell align="right" sx={{ fontWeight: 600 }}>
												{formatCurrency(invoice.tax)}
											</TableCell>
										</TableRow>
									)}
									<TableRow>
										<TableCell colSpan={4} align="right" sx={{ 
											fontWeight: 700, 
											fontSize: '1.1rem',
											borderTop: '2px solid var(--border)',
										}}>
											TOTAL
										</TableCell>
										<TableCell align="right" sx={{ 
											fontWeight: 700, 
											fontSize: '1.1rem',
											color: 'var(--accent-gold)',
											borderTop: '2px solid var(--border)',
										}}>
											{formatCurrency(invoice.total)}
										</TableCell>
									</TableRow>
									{purchasePaid > 0 && (
										<>
											<TableRow>
												<TableCell colSpan={4} align="right" sx={{ color: 'var(--success)', fontWeight: 600 }}>
													Purchase Price Already Paid
												</TableCell>
												<TableCell align="right" sx={{ color: 'var(--success)', fontWeight: 600 }}>
													-{formatCurrency(purchasePaid)}
												</TableCell>
											</TableRow>
											<TableRow>
												<TableCell colSpan={4} align="right" sx={{ 
													fontWeight: 700,
													fontSize: '1.1rem',
													borderTop: '2px solid var(--border)',
												}}>
													BALANCE DUE
												</TableCell>
												<TableCell align="right" sx={{ 
													fontWeight: 700,
													fontSize: '1.1rem',
													color: balanceDue > 0 ? 'var(--error)' : 'var(--success)',
													borderTop: '2px solid var(--border)',
												}}>
													{formatCurrency(balanceDue)}
												</TableCell>
											</TableRow>
										</>
									)}
								</TableBody>
							</Table>
						</TableContainer>
						</DashboardPanel>
					</Box>

					{/* Notes */}
					{(invoice.notes || invoice.internalNotes) && (
						<Box sx={{ mt: 3 }}>
							<DashboardPanel 
								title="Notes"
								description="Additional information"
							>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								{invoice.notes && (
									<Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 1 }}>
											Customer Notes
										</Box>
										<Box sx={{ 
											p: 2, 
											bgcolor: 'var(--background)', 
											borderRadius: 1,
											fontSize: '0.875rem',
											color: 'var(--text-primary)',
										}}>
											{invoice.notes}
										</Box>
									</Box>
								)}
								{isAdmin && invoice.internalNotes && (
									<Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 1 }}>
											Internal Notes
										</Box>
										<Box sx={{ 
											p: 2, 
											bgcolor: 'rgba(var(--warning-rgb), 0.1)', 
											border: '1px solid rgba(var(--warning-rgb), 0.3)',
											borderRadius: 1,
											fontSize: '0.875rem',
											color: 'var(--text-primary)',
										}}>
											{invoice.internalNotes}
										</Box>
									</Box>
								)}
							</Box>
							</DashboardPanel>
						</Box>
					)}
					<Box sx={{ mt: 3 }}>
						<DashboardPanel
							title="Activity History"
							description="Audit log of invoice creation, updates, and status changes"
						>
							{isAdmin && (
								<ActivityLog logs={invoice.auditLogs || []} />
							)}
						</DashboardPanel>
					</Box>

					<Modal
						open={disputeTarget !== null}
						onClose={closeDisputeModal}
						title="Dispute Line Item"
						description={`Why are you disputing "${disputeTarget?.line.description ?? ''}"? Please describe the issue briefly so our team can review it.`}
						size="sm"
						actions={
							<>
								<Button variant="outline" onClick={closeDisputeModal}>Cancel</Button>
								<Button variant="primary" onClick={() => void submitDisputeLine()} disabled={disputeReason.trim().length < 5}>Submit Dispute</Button>
							</>
						}
					>
						<TextField
							autoFocus
							fullWidth
							multiline
							rows={4}
							label="Reason"
							placeholder="Describe the issue in a few words"
							value={disputeReason}
							onChange={(event) => setDisputeReason(event.target.value)}
						/>
					</Modal>
				</DashboardSurface>
			</Box>
		</>
	);
}