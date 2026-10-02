'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { toast, StatusBadge, ConfirmDialog, StatusFilterPills, PageHeader, Button } from '@/components/design-system';
import ShipmentsResultsPanel from '@/components/shipments/ShipmentsResultsPanel';
import ShipmentsSearchPanel from '@/components/shipments/ShipmentsSearchPanel';
import type { Shipment, ShipmentTableRow } from '@/components/shipments/shipment-list-types';
import { Column } from '@/components/ui/DataTable';
import { exportToCSVWithHeaders } from '@/lib/export';
import { hasPermission } from '@/lib/rbac';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';
import ShipmentQuickPeek from '@/components/dashboard/ShipmentQuickPeek';
import Link from 'next/link';
import { QRCodeModal, type QRCodeData } from '@/components/dashboard/QRCodeModal';
import { SavedFilterPresets } from '@/components/dashboard/SavedFilterPresets';
import { QrCode, Eye, Trash2, PanelRightOpen, Plus } from 'lucide-react';
import { BarcodeScannerModal } from '@/components/ui/BarcodeScannerModal';
import { sanitizeTrackNumber } from '@/lib/tracking-sanitize';

export default function ShipmentsListPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const [shipments, setShipments] = useState<Shipment[]>([]);
	const [loading, setLoading] = useState(true);
	const [showBulkTable, setShowBulkTable] = useState(false);
	const [quickPeekShipmentId, setQuickPeekShipmentId] = useState<string | null>(null);
	const [qrModalData, setQrModalData] = useState<QRCodeData | null>(null);
	const [searchFilters, setSearchFilters] = useState<SearchFilters>({
		query: '',
		type: 'shipments',
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	const fetchShipments = useCallback(async () => {
		try {
			setLoading(true);
			
			// Build query params from search filters
			const params = new URLSearchParams();
			params.append('page', currentPage.toString());
			params.append('limit', '10');
			
			if (searchFilters.query) params.append('query', searchFilters.query);
			if (searchFilters.status) params.append('status', searchFilters.status);
			if (searchFilters.workflowStage) params.append('workflowStage', searchFilters.workflowStage);
			if (searchFilters.yardReceived) params.append('yardReceived', searchFilters.yardReceived);
			if (searchFilters.delivery) params.append('delivery', searchFilters.delivery);
			if (searchFilters.dateFrom) params.append('dateFrom', searchFilters.dateFrom);
			if (searchFilters.dateTo) params.append('dateTo', searchFilters.dateTo);
			if (searchFilters.minPrice) params.append('minPrice', searchFilters.minPrice);
			if (searchFilters.maxPrice) params.append('maxPrice', searchFilters.maxPrice);

			const response = await fetch(`/api/search?${params.toString()}&type=shipments&sortBy=createdAt&sortOrder=desc`, { cache: 'no-store' });
			const data = await response.json();
			
			setShipments(data.shipments ?? []);
			setTotalPages(Math.ceil((data.totalShipments ?? 0) / 10) || 1);
		} catch (error) {
			console.error('Error fetching shipments:', error);
			toast.error('Failed to load shipments', {
				description: 'Please try again or refresh the page'
			});
			setShipments([]);
		} finally {
			setLoading(false);
		}
	}, [searchFilters, currentPage]);

	useEffect(() => {
		fetchShipments();
	}, [fetchShipments]);

	const [scannerOpen, setScannerOpen] = useState(false);

	const handleSearch = (filters: SearchFilters) => {
		setSearchFilters(filters);
		setCurrentPage(1); // Reset to first page on new search
	};

	const handleScanTrack = async (rawScanned: string) => {
		try {
			setScannerOpen(false);
			const clean = sanitizeTrackNumber(rawScanned);
			if (!clean) {
				toast.error('Invalid QR code', {
					description: 'Could not extract a valid VIN, container number, or tracking ID from QR code',
				});
				return;
			}

			// Immediately set search filters to clean code so table displays matching shipment(s)
			setSearchFilters((prev) => ({ ...prev, query: clean }));
			setCurrentPage(1);

			// Query search endpoint
			setLoading(true);
			const params = new URLSearchParams();
			params.append('query', clean);
			params.append('type', 'shipments');
			params.append('limit', '10');

			const searchRes = await fetch(`/api/search?${params.toString()}&sortBy=createdAt&sortOrder=desc`, { cache: 'no-store' });
			const searchData = await searchRes.json();
			const matched = searchData.shipments || [];

			if (matched.length === 1) {
				const target = matched[0];
				setShipments(matched);
				setTotalPages(1);
				setQuickPeekShipmentId(target.id);
				const vehicleTitle = [target.vehicleYear, target.vehicleMake, target.vehicleModel].filter(Boolean).join(' ') || target.vehicleType || 'Vehicle';
				toast.success(`Tracked: ${vehicleTitle}`, {
					description: `VIN: ${target.vehicleVIN || target.id} • Status: ${target.status}`,
				});
			} else if (matched.length > 1) {
				setShipments(matched);
				setTotalPages(Math.ceil(matched.length / 10) || 1);
				toast.success(`Found ${matched.length} shipments matching ${clean}`);
			} else {
				// No match in current user shipment list, check universal tracking endpoint
				const trackingRes = await fetch('/api/tracking', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ trackNumber: clean }),
				});
				if (trackingRes.ok) {
					const trackData = await trackingRes.json();
					if (trackData.tracking) {
						toast.info(`Found tracking record for ${clean}. Opening tracking view...`);
						router.push(`/tracking?vin=${encodeURIComponent(clean)}`);
						return;
					}
				}
				toast.error(`No shipment found for "${clean}"`, {
					description: 'Please verify the VIN, container number, or gate pass and try again.',
				});
				setShipments([]);
				setTotalPages(1);
			}
		} catch (err) {
			console.error('Error tracking scanned code:', err);
			toast.error('Failed to track scanned QR code');
		} finally {
			setLoading(false);
		}
	};

	const isAdmin = session?.user?.role === 'admin';
	const canManageShipments = hasPermission(session?.user?.role, 'shipments:manage');
	const canMoveWorkflow = hasPermission(session?.user?.role, 'workflow:move') && canManageShipments;
	const canUseBulkMode = canManageShipments || canMoveWorkflow;

	const formatDate = (value: string) => new Date(value).toLocaleDateString();

	const shipmentTableRows: ShipmentTableRow[] = shipments.map((shipment) => {
		const vehicleInfo =
			[shipment.vehicleMake, shipment.vehicleModel, shipment.vehicleYear]
				.filter(Boolean)
				.join(' ') || shipment.vehicleType;

		return {
			id: shipment.id,
			vehicle: vehicleInfo,
			vin: shipment.vehicleVIN ?? '-',
			purchasePrice: shipment.purchasePrice ?? null,
			purchasePricePaid: shipment.purchasePricePaid ?? null,
			status: shipment.status,
			yardReceived: Boolean(shipment.yardReceived),
			paymentStatus: shipment.paymentStatus ?? '-',
			container: shipment.transit?.referenceNumber
				? `Transit ${shipment.transit.referenceNumber}`
				: shipment.container?.containerNumber
					? `Container ${shipment.container.containerNumber}`
					: shipment.dispatch?.referenceNumber
						? `Dispatch ${shipment.dispatch.referenceNumber}`
						: 'Warehouse',
			createdAt: shipment.createdAt,
			customer: shipment.user?.name || shipment.user?.email || '-',
		};
	});

	const canViewFinance = hasPermission(session?.user?.role, 'finance:manage');

	const handleOpenQR = (row: ShipmentTableRow, e?: React.MouseEvent) => {
		if (e) e.stopPropagation();
		setQrModalData({
			type: 'SHIPMENT',
			id: row.id,
			title: row.vehicle,
			code: row.vin && row.vin !== '-' ? row.vin : row.id,
			trackingUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/tracking?vin=${row.vin && row.vin !== '-' ? row.vin : row.id}`,
			metadata: {
				customerName: row.customer !== '-' ? row.customer : undefined,
				status: row.status,
			},
		});
	};

	const confirmAction = useConfirmAction();

	const handleBulkDelete = async (shipmentIds: string[]) => {
		if (!canManageShipments) return;
		if (!(await confirmAction({
			message: `Delete ${shipmentIds.length} shipment(s)? This cannot be undone.`,
			confirmText: 'Delete shipments',
			severity: 'error',
		}))) {
			return;
		}

		try {
			const response = await fetch('/api/bulk/shipments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'delete', shipmentIds }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data?.message || 'Bulk delete failed');
			}

			const data = await response.json();
			toast.success('Shipments deleted', {
				description: `${data.count || 0} shipment(s) removed`,
			});
			fetchShipments();
		} catch (error) {
			console.error('Error deleting shipments:', error);
			toast.error('Failed to delete shipments');
		}
	};

	const shipmentColumns: Column<ShipmentTableRow>[] = [
		{ key: 'vehicle', header: 'Vehicle', sortable: true },
		...(canViewFinance ? [{
			key: 'purchasePrice' as const,
			header: 'Purchase Price',
			sortable: true,
			render: (_: unknown, row: ShipmentTableRow) => {
				if (row.purchasePrice == null) {
					return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
				}

				const total = Math.max(0, row.purchasePrice);
				const paid = Math.max(0, row.purchasePricePaid || 0);
				const remaining = Math.max(0, total - paid);
				const isPaidOff = total > 0 && remaining <= 0;

				return (
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
						<span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
							${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</span>
						{paid > 0 ? (
							<>
								<span style={{ fontSize: '0.74rem', fontWeight: 700, color: isPaidOff ? 'var(--success-dark)' : 'var(--warning-dark)' }}>
									Paid ${Math.min(paid, total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
								</span>
								<span style={{ fontSize: '0.72rem', fontWeight: 600, color: isPaidOff ? 'var(--success-dark)' : 'var(--text-secondary)' }}>
									{isPaidOff ? '✓ Paid Off' : `Remaining $${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
								</span>
							</>
						) : (
							<span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Unpaid</span>
						)}
					</Box>
				);
			},
		}] : []),
		{ key: 'vin', header: 'VIN', sortable: true },
		{
			key: 'status',
			header: 'Status',
			render: (value, row) => (
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
					<StatusBadge status={String(value)} size="sm" />
					{row.yardReceived && (
						<Box
							sx={{
								display: 'inline-flex',
								alignItems: 'center',
								px: 1,
								py: 0.35,
								borderRadius: 999,
								fontSize: '0.72rem',
								fontWeight: 700,
								bgcolor: 'rgba(var(--success-rgb), 0.12)',
								color: 'var(--success-dark)',
								border: '1px solid rgba(var(--success-rgb), 0.28)',
							}}
						>
							Yard Received
						</Box>
					)}
				</Box>
			),
		},
		{
			key: 'paymentStatus',
			header: 'Payment',
			render: (value) => <StatusBadge status={String(value)} size="sm" />,
		},
		{ key: 'container', header: 'Workflow', sortable: true },
		{
			key: 'createdAt',
			header: 'Created',
			sortable: true,
			render: (value) => formatDate(String(value)),
		},
		...(isAdmin ? [{ key: 'customer', header: 'Customer', sortable: true }] : []),
		{
			key: 'actions' as const,
			header: 'Actions',
			align: 'right' as const,
			render: (_: unknown, row: ShipmentTableRow) => (
				<div className="inline-flex items-center gap-1 justify-end whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
					<button
						type="button"
						onClick={() => setQuickPeekShipmentId(row.id)}
						className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--text-primary-rgb),0.06)] transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
						title="Quick peek shipment"
						aria-label="Quick peek shipment"
					>
						<PanelRightOpen className="w-4 h-4" />
					</button>
					<Link
						href={`/dashboard/shipments/${row.id}`}
						className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--text-primary-rgb),0.06)] transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
						title="View shipment details"
						aria-label="View shipment details"
					>
						<Eye className="w-4 h-4" />
					</Link>
					<button
						type="button"
						onClick={(e) => handleOpenQR(row, e)}
						className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:bg-[rgba(var(--accent-gold-rgb),0.12)] transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
						title="Print Yard QR Sticker"
						aria-label="Print Yard QR Sticker"
					>
						<QrCode className="w-4 h-4" />
					</button>
					{canManageShipments && (
						<button
							type="button"
							onClick={() => void handleBulkDelete([row.id])}
							className="p-1.5 rounded-lg text-[var(--error)] hover:bg-[rgba(var(--error-rgb),0.1)] transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
							title="Delete shipment"
							aria-label="Delete shipment"
						>
							<Trash2 className="w-4 h-4" />
						</button>
					)}
				</div>
			),
		},
	];

	const shipmentStatusOptions = [
		{ value: 'ON_HAND', label: 'On Hand' },
		{ value: 'IN_TRANSIT', label: 'In Transit' },
		{ value: 'RELEASED', label: 'Released' },
	];

	const handleBulkExport = (rows: ShipmentTableRow[]) => {
		try {
			exportToCSVWithHeaders(
				rows,
				[
					{ key: 'vehicle', label: 'Vehicle' },
					{ key: 'vin', label: 'VIN' },
					{ key: 'status', label: 'Status' },
					{ key: 'paymentStatus', label: 'Payment' },
						{ key: 'container', label: 'Workflow' },
					{ key: 'createdAt', label: 'Created' },
					...(isAdmin ? [{ key: 'customer' as const, label: 'Customer' }] : []),
				],
				'shipments'
			);
			toast.success('Export ready');
		} catch (error) {
			console.error('Error exporting shipments:', error);
			toast.error('Failed to export shipments');
		}
	};

	const handleBulkStatusUpdate = async (shipmentIds: string[], status: string) => {
		if (!canMoveWorkflow) return;

		try {
			const response = await fetch('/api/bulk/shipments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'updateStatus', shipmentIds, data: { status } }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || 'Bulk status update failed');
			}

			toast.success('Shipments updated', {
				description: `${data.count || 0} shipment(s) updated`,
			});
			fetchShipments();
		} catch (error) {
			console.error('Error updating shipments:', error);
			toast.error('Failed to update shipments');
		}
	};

	return (
		<DashboardSurface className="overflow-hidden">
			<PageHeader
				showBreadcrumbs
				title="Shipments"
				description="Search, filter, and manage your shipments"
				actions={
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							icon={<QrCode className="w-4 h-4 text-[var(--accent-gold)]" />}
							onClick={() => setScannerOpen(true)}
						>
							Scan & Track
						</Button>
						{canManageShipments ? (
							<Button
								href="/dashboard/shipments/new"
								variant="primary"
								size="sm"
								icon={<Plus className="w-4 h-4" />}
								iconPosition="start"
							>
								New shipment
							</Button>
						) : null}
					</div>
				}
			/>

			<ShipmentsSearchPanel
				hideHeader
				onSearch={handleSearch}
				onScan={handleScanTrack}
				canManageShipments={canManageShipments}
				isAdmin={isAdmin}
				showDeliveryFilter
			/>

			<div className="pt-1 pb-1">
				<StatusFilterPills
					options={[
						{ value: '', label: 'All Statuses' },
						{ value: 'ON_HAND', label: 'On Hand', color: 'var(--accent-gold)' },
						{ value: 'DISPATCHING', label: 'Dispatching', color: 'var(--warning)' },
						{ value: 'IN_TRANSIT', label: 'In Transit', color: 'var(--info)' },
						{ value: 'ARRIVED_AT_PORT', label: 'Port Arrival', color: 'var(--status-violet)' },
						{ value: 'DELIVERED', label: 'Delivered', color: 'var(--success)' },
					]}
					selectedValue={searchFilters.status || ''}
					onSelect={(status) => {
						setSearchFilters((prev) => ({ ...prev, status }));
						setCurrentPage(1);
					}}
				/>
				<Box sx={{ mt: 1, px: 0.5 }}>
					<SavedFilterPresets
						storageKey="shipments"
						currentFilters={searchFilters}
						onApplyPreset={(filters) => {
							setSearchFilters(filters);
							setCurrentPage(1);
						}}
					/>
				</Box>
			</div>

			<ShipmentsResultsPanel
				loading={loading}
				shipments={shipments}
				searchQuery={searchFilters.query}
				canManageShipments={canManageShipments}
				canUseBulkMode={canUseBulkMode}
				showBulkTable={showBulkTable}
				onToggleBulkMode={() => setShowBulkTable((prev) => !prev)}
				shipmentTableRows={shipmentTableRows}
				shipmentColumns={shipmentColumns}
				onRowClick={(row) => setQuickPeekShipmentId(row.id)}
				onBulkDelete={canManageShipments ? handleBulkDelete : undefined}
				onBulkExport={canUseBulkMode ? handleBulkExport : undefined}
				bulkStatusOptions={shipmentStatusOptions}
				onBulkStatusChange={canMoveWorkflow ? handleBulkStatusUpdate : undefined}
				isAdmin={isAdmin}
				canViewFinance={canViewFinance}
				currentPage={currentPage}
				totalPages={totalPages}
				onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
				onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
				onQuickPeek={(id) => setQuickPeekShipmentId(id)}
				onOpenQR={(shipment) => handleOpenQR(shipment)}
			/>

			{/* Slide-over Quick Peek Drawer */}
			<ShipmentQuickPeek
				shipmentId={quickPeekShipmentId}
				open={Boolean(quickPeekShipmentId)}
				onClose={() => setQuickPeekShipmentId(null)}
			/>

			{/* Yard QR Code & Thermal Label Modal */}
			<QRCodeModal
				open={Boolean(qrModalData)}
				onClose={() => setQrModalData(null)}
				data={qrModalData}
			/>

			{/* Scan to Track Shipment Modal */}
			<BarcodeScannerModal
				open={scannerOpen}
				onClose={() => setScannerOpen(false)}
				onScan={handleScanTrack}
				title="Scan to Track Shipment"
				description="Align vehicle VIN barcode, yard QR sticker, or container code within the camera frame"
			/>
		</DashboardSurface>
	);
}
