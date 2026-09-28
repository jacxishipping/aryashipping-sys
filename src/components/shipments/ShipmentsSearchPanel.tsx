'use client';

import Link from 'next/link';
import { Add, Inventory2 } from '@mui/icons-material';
import { Box } from '@mui/material';
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
				<Box sx={{ mb: 1.5 }}>
					<Breadcrumbs />
				</Box>
			)}
			<DashboardPanel
				title={
					!hideHeader ? (
						<Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
							<Inventory2 sx={{ fontSize: 18, color: 'var(--accent-gold)' }} />
							<span>Shipments</span>
						</Box>
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
							icon={<Add fontSize="small" />}
							iconPosition="start"
						>
							New shipment
						</Button>
					) : null
				}
			>
				<Box sx={{ px: { xs: 1, sm: 1.25, md: 1.5 }, py: { xs: 1, sm: 1.25, md: 1.5 } }}>
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
				</Box>
			</DashboardPanel>
		</>
	);
}
