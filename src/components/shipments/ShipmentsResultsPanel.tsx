'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Package, Plus } from 'lucide-react';
import ShipmentRow from '@/components/dashboard/ShipmentRow';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, SkeletonTable, toast } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { BatchActionsHUD, type BatchItem } from '@/components/dashboard/BatchActionsHUD';
import { CustomerNotificationModal, type CustomerNotificationPayload } from '@/components/dashboard/CustomerNotificationModal';
import { addWorkspaceItem } from '@/components/dashboard/WorkspaceTray';
import type { Shipment, ShipmentTableRow } from '@/components/shipments/shipment-list-types';

type BulkStatusOption = {
	value: string;
	label: string;
};

type ShipmentsResultsPanelProps = {
	loading: boolean;
	shipments: Shipment[];
	searchQuery: string;
	canManageShipments: boolean;
	canUseBulkMode: boolean;
	showBulkTable: boolean;
	onToggleBulkMode: () => void;
	shipmentTableRows: ShipmentTableRow[];
	shipmentColumns: Column<ShipmentTableRow>[];
	onRowClick: (row: ShipmentTableRow) => void;
	onBulkDelete?: (shipmentIds: string[]) => void;
	onBulkExport?: (rows: ShipmentTableRow[]) => void;
	bulkStatusOptions: BulkStatusOption[];
	onBulkStatusChange?: (shipmentIds: string[], status: string) => void;
	isAdmin: boolean;
	canViewFinance: boolean;
	currentPage: number;
	totalPages: number;
	onPreviousPage: () => void;
	onNextPage: () => void;
	onQuickPeek?: (id: string) => void;
	onOpenQR?: (shipment: any) => void;
};

export default function ShipmentsResultsPanel({
	loading,
	shipments,
	searchQuery,
	canManageShipments,
	canUseBulkMode,
	showBulkTable,
	onToggleBulkMode,
	shipmentTableRows,
	shipmentColumns,
	onRowClick,
	onBulkDelete,
	onBulkExport,
	bulkStatusOptions,
	onBulkStatusChange,
	isAdmin,
	canViewFinance,
	currentPage,
	totalPages,
	onPreviousPage,
	onNextPage,
	onQuickPeek,
	onOpenQR,
}: ShipmentsResultsPanelProps) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [notificationPayload, setNotificationPayload] = useState<CustomerNotificationPayload | null>(null);

	const selectedBatchItems: BatchItem[] = shipments
		.filter((s) => selectedIds.has(s.id))
		.map((s) => ({
			id: s.id,
			title: `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || 'Vehicle'}`.trim(),
			subtitle: `VIN: ${s.vehicleVIN || 'N/A'}`,
			status: s.status,
			consignee: s.user?.name || s.user?.email,
			vin: s.vehicleVIN || undefined,
		}));

	const handleRowQuickPeek = (id: string) => {
		const target = shipments.find((s) => s.id === id);
		if (target) {
			addWorkspaceItem({
				id: target.id,
				type: 'shipment',
				title: `${target.vehicleYear || ''} ${target.vehicleMake || ''} ${target.vehicleModel || 'Shipment'}`.trim(),
				subtitle: target.vehicleVIN ? `VIN: ${target.vehicleVIN}` : target.status,
				url: `/dashboard/shipments/${target.id}`,
			});
		}
		if (onQuickPeek) onQuickPeek(id);
	};

	const handleOpenNotification = (shipment: Shipment) => {
		setNotificationPayload({
			customerName: shipment.user?.name || 'Customer',
			customerEmail: shipment.user?.email || '',
			vehicleDetails: `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Vehicle',
			vin: shipment.vehicleVIN || 'N/A',
			containerNumber: shipment.container?.containerNumber || 'PENDING',
			portOfOrigin: shipment.dispatch?.origin || 'US Export Yard',
			destinationPort: shipment.container?.currentLocation || 'Middle East Port',
			trackingLink: `${typeof window !== 'undefined' ? window.location.origin : ''}/tracking?vin=${shipment.vehicleVIN || shipment.id}`,
			eta: shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : '3-4 Weeks',
		});
	};

	return (
		<DashboardPanel
			title={
				<div className="inline-flex items-center gap-2">
					<span>Results</span>
					<span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)] border border-[rgba(var(--accent-gold-rgb),0.25)] text-xs font-bold leading-tight">
						{shipments.length}
					</span>
				</div>
			}
			description={
				shipments.length
					? `Showing ${shipments.length} shipment${shipments.length !== 1 ? 's' : ''}`
					: 'No shipments found'
			}
			fullHeight
			className="overflow-hidden"
			bodyClassName="overflow-hidden"
			actions={
				<div className="flex items-center gap-2">
					{canUseBulkMode ? (
						<Button variant="outline" size="sm" onClick={onToggleBulkMode}>
							{showBulkTable ? 'Card view' : 'Bulk mode'}
						</Button>
					) : null}
				</div>
			}
		>
			{loading ? (
				<SkeletonTable rows={5} columns={6} />
			) : shipments.length === 0 ? (
				<EmptyState
					icon={<Package className="h-10 w-10" />}
					title="No shipments found"
					description={searchQuery ? 'Try adjusting your search filters' : 'Get started by creating your first shipment'}
					action={
						canManageShipments ? (
							<Button href="/dashboard/shipments/new" variant="primary" icon={<Plus className="h-4 w-4" />} iconPosition="start">
								Create shipment
							</Button>
						) : undefined
					}
				/>
			) : (
				<>
					{showBulkTable ? (
						<div className="hidden md:block">
							<DataTable
								data={shipmentTableRows}
								columns={shipmentColumns}
								keyField="id"
								selectable={canUseBulkMode}
								onRowClick={(row) => {
									addWorkspaceItem({
										id: row.id,
										type: 'shipment',
										title: row.vehicle || 'Shipment',
										subtitle: row.vin ? `VIN: ${row.vin}` : row.status,
										url: `/dashboard/shipments/${row.id}`,
									});
									onRowClick(row);
								}}
								onDelete={onBulkDelete}
								onExport={onBulkExport}
								bulkStatusOptions={bulkStatusOptions}
								onBulkStatusChange={onBulkStatusChange}
								currentPage={currentPage}
								totalPages={totalPages}
							/>
						</div>
					) : null}

					<div className={`flex flex-col gap-2 min-w-0 w-full overflow-hidden ${showBulkTable ? 'md:hidden' : ''}`}>
						{shipments.map((shipment, index) => (
							<ShipmentRow
								key={shipment.id}
								{...shipment}
								purchasePrice={canViewFinance ? (shipment.purchasePrice ?? null) : null}
								purchasePricePaid={canViewFinance ? (shipment.purchasePricePaid ?? null) : null}
								showCustomer={isAdmin}
								delay={index * 0.05}
								onQuickPeek={handleRowQuickPeek}
								onOpenQR={onOpenQR}
							/>
						))}
					</div>

					{/* Floating Batch Actions HUD */}
					<BatchActionsHUD
						selectedItems={selectedBatchItems}
						entityName="Shipments"
						onClearSelection={() => setSelectedIds(new Set())}
						onBulkThermalPrint={() => {
							window.print();
							toast.success(`Printing batch thermal QR labels for ${selectedBatchItems.length} vehicles`);
						}}
						onBulkMessage={() => {
							if (selectedBatchItems.length > 0) {
								const first = shipments.find((s) => s.id === selectedBatchItems[0].id);
								if (first) handleOpenNotification(first);
							}
						}}
					/>

					{/* Customer Notification Studio Modal */}
					{notificationPayload && (
						<CustomerNotificationModal
							open={Boolean(notificationPayload)}
							onClose={() => setNotificationPayload(null)}
							payload={notificationPayload}
						/>
					)}

					{totalPages > 1 && (
						<div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
							<Button
								variant="outline"
								size="sm"
								icon={<ChevronLeft className="h-4 w-4" />}
								iconPosition="start"
								onClick={onPreviousPage}
								disabled={currentPage === 1}
								className="w-full sm:w-auto"
							>
								Previous
							</Button>
							<div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[rgba(var(--accent-gold-rgb),0.08)] border border-[rgba(var(--accent-gold-rgb),0.2)]">
								<span className="text-xs text-[var(--accent-gold)] font-bold">
									Page {currentPage} of {totalPages}
								</span>
							</div>
							<Button
								variant="outline"
								size="sm"
								icon={<ChevronRight className="h-4 w-4" />}
								iconPosition="end"
								onClick={onNextPage}
								disabled={currentPage === totalPages}
								className="w-full sm:w-auto"
							>
								Next
							</Button>
						</div>
					)}
				</>
			)}
		</DashboardPanel>
	);
}
