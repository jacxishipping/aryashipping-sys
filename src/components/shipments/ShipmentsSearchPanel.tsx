'use client';

import { Package, Plus } from 'lucide-react';
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button } from '@/components/design-system';

type ShipmentsSearchPanelProps = {
	onSearch: (filters: SearchFilters) => void;
	onScan?: (scanned: string) => void;
	canManageShipments?: boolean;
	isAdmin: boolean;
	showBreadcrumbs?: boolean;
	showDeliveryFilter?: boolean;
	hideHeader?: boolean;
};

export default function ShipmentsSearchPanel({
	onSearch,
	onScan,
	canManageShipments,
	isAdmin,
	showBreadcrumbs = false,
	showDeliveryFilter = false,
	hideHeader = false,
}: ShipmentsSearchPanelProps) {
	return (
		<>
			{showBreadcrumbs && !hideHeader && (
				<div className="mb-3">
					<Breadcrumbs />
				</div>
			)}
			<DashboardPanel
				title={
					!hideHeader ? (
						<div className="inline-flex items-center gap-2">
							<Package className="h-4 w-4 text-[var(--accent-gold)]" />
							<span>Shipments</span>
						</div>
					) : undefined
				}
				description={!hideHeader ? "Search, filter, and manage your shipments" : undefined}
				noBodyPadding
				className="overflow-hidden"
				actions={
					!hideHeader && canManageShipments ? (
						<Button
							href="/dashboard/shipments/new"
							variant="primary"
							size="sm"
							icon={<Plus className="h-4 w-4" />}
							iconPosition="start"
						>
							New shipment
						</Button>
					) : null
				}
			>
				<div className="p-3 sm:p-4">
					<SmartSearch
						onSearch={onSearch}
						onScan={onScan}
						placeholder="Search shipments by tracking number, VIN, origin, destination..."
						showTypeFilter={false}
						showStatusFilter={false}
						showWorkflowStageFilter={false}
						showYardFilter
						showDateFilter
						showPriceFilter
						showUserFilter={isAdmin}
						showDeliveryFilter={showDeliveryFilter}
						defaultType="shipments"
					/>
				</div>
			</DashboardPanel>
		</>
	);
}
