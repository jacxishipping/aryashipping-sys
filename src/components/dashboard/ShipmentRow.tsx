"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, LocalShipping, CreditCard, LocationOn, CalendarToday } from '@mui/icons-material';
import { PanelRightOpen, QrCode } from 'lucide-react';
import { Box, Typography, LinearProgress, Chip } from '@mui/material';
import { StatusBadge, Button } from '@/components/design-system';

interface ShipmentRowProps {
	id: string;
	vehicleType: string;
	vehicleMake: string | null;
	vehicleModel: string | null;
	vehicleYear?: number | null;
	vehicleVIN?: string | null;
	status: string;
	createdAt: string;
	paymentStatus?: string;
	dispatchId?: string | null;
	containerId?: string | null;
	dispatch?: {
		id: string;
		referenceNumber: string;
		status?: string | null;
		origin?: string | null;
		destination?: string | null;
	} | null;
	container?: {
		id: string;
		containerNumber: string;
		trackingNumber?: string | null;
		status?: string;
		currentLocation?: string | null;
		progress?: number;
		estimatedArrival?: string | null;
		vesselName?: string | null;
		shippingLine?: string | null;
	} | null;
	transit?: {
		id: string;
		referenceNumber: string;
		status?: string | null;
		destination?: string | null;
	} | null;
	yardReceived?: boolean;
	yardReceivedAt?: string | null;
	purchasePrice?: number | null;
	purchasePricePaid?: number | null;
	user?: {
		name: string | null;
		email: string;
	};
	showCustomer?: boolean;
	isAdmin?: boolean;
	onStatusUpdated?: () => void;
	delay?: number;
	onQuickPeek?: (id: string) => void;
	onOpenQR?: (shipment: any) => void;
}

const formatStatus = (status: string) => {
	return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function ShipmentRow({
	id,
	vehicleType,
	vehicleMake,
	vehicleModel,
	vehicleYear,
	vehicleVIN,
	status,
	createdAt,
	paymentStatus,
	dispatchId,
	dispatch,
	containerId,
	container,
	transit,
	yardReceived = false,
	yardReceivedAt,
	purchasePrice,
	purchasePricePaid,
	user,
	showCustomer = false,
	delay = 0,
	onQuickPeek,
	onOpenQR,
}: ShipmentRowProps) {
	const router = useRouter();
	const vehicleInfo = [vehicleMake, vehicleModel, vehicleYear].filter(Boolean).join(' ') || vehicleType;
	const paidAmount = Math.max(0, purchasePricePaid || 0);
	const totalPurchasePrice = Math.max(0, purchasePrice || 0);
	const remainingAmount = Math.max(0, totalPurchasePrice - paidAmount);
	const isPurchasePaidOff = totalPurchasePrice > 0 && remainingAmount <= 0;
	const shipmentHref = `/dashboard/shipments/${id}`;
	const editHref = `/dashboard/shipments/${id}/edit`;
    const statusRow = (
		<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, minWidth: 0, mt: 0.5 }}>
			<StatusBadge 
				status={status} 
				variant="default" 
				size="sm"
				showIcon
			/>
			{yardReceived && (
				<Chip
					label={yardReceivedAt ? `Yard Received ${new Date(yardReceivedAt).toLocaleDateString()}` : 'Yard Received'}
					size="small"
					sx={{
						height: 24,
						fontSize: '0.7rem',
						fontWeight: 700,
						bgcolor: 'rgba(34, 197, 94, 0.12)',
						color: 'rgb(21, 128, 61)',
						border: '1px solid rgba(34, 197, 94, 0.28)',
					}}
				/>
			)}
			{paymentStatus && (
				<StatusBadge 
					status={paymentStatus} 
					variant="default" 
					size="sm"
					icon={<CreditCard sx={{ fontSize: 12 }} />}
				/>
			)}
		</Box>
	);

	// ⚡ Bolt: Removed `useState` and `useEffect` for visibility and replaced `<Slide>` with a pure CSS animation
	// from `globals.css` (`className="animate-fade-in-up"`) applying the delay using inline styles.
	// This eliminates the double-render on mount for each row, significantly boosting list rendering performance.
	return (
			<Box
				component="article"
				className="animate-fade-in-up"
				tabIndex={0}
				role="link"
				onClick={() => router.push(shipmentHref)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						router.push(shipmentHref);
					}
				}}
				sx={{
					animationDelay: `${delay}s`,
					animationFillMode: 'both',
					background: 'var(--panel)',
					border: '1px solid rgba(var(--panel-rgb), 0.9)',
					borderLeft: '3px solid transparent',
					borderRadius: 2,
					boxShadow: '0 18px 32px rgba(var(--text-primary-rgb), 0.08)',
					padding: { xs: 1.25, sm: 1.5, md: 1.75 },
					display: 'grid',
					gridTemplateColumns: {
						xs: '1fr',
						md: purchasePrice != null
							? 'minmax(0, 1.6fr) minmax(0, 1.15fr) minmax(0, 0.95fr) minmax(0, 1fr) auto'
							: 'minmax(0, 1.6fr) minmax(0, 1.15fr) minmax(0, 1fr) auto',
					},
					gap: { xs: 1.25, md: 1.5 },
					alignItems: 'center',
						minHeight: { xs: '120px', md: 'auto' },
					minWidth: 0,
					width: '100%',
					boxSizing: 'border-box',
					cursor: 'pointer',
					textDecoration: 'none',
					color: 'inherit',
					transition: 'all 200ms ease',
					outline: 'none',
					'&:hover': {
						borderColor: 'rgba(var(--accent-gold-rgb), 0.35)',
						borderLeft: '3px solid var(--accent-gold)',
						boxShadow: '0 8px 24px rgba(var(--text-primary-rgb), 0.10)',
						transform: 'translateY(-1px)',
					},
					'&:focus-visible': {
						borderColor: 'rgba(var(--accent-gold-rgb), 0.45)',
						borderLeft: '3px solid var(--accent-gold)',
						boxShadow: '0 0 0 3px rgba(var(--accent-gold-rgb), 0.14)',
					},
				}}
			>
				{/* Column 1: Vehicle Info & Status */}
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, overflow: 'hidden' }}>
					<Typography
						sx={{
							fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.95rem' },
							fontWeight: 700,
							color: 'var(--text-primary)',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{vehicleInfo}
					</Typography>
					{vehicleVIN && (
						<Box
							sx={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 0.5,
								width: 'fit-content',
								px: 0.75,
								py: 0.2,
								borderRadius: '999px',
								bgcolor: 'rgba(var(--border-rgb), 0.3)',
							}}
						>
							<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)' }}>
								VIN:
							</Typography>
							<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
								{vehicleVIN}
							</Typography>
						</Box>
					)}
					<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)' }}>
						Created: {new Date(createdAt).toLocaleDateString()}
					</Typography>
				<Box sx={{ display: { xs: 'none', md: 'flex' } }}>{statusRow}</Box>
				</Box>

				{/* Column 2: Vehicle Type */}
				<Box sx={{ minWidth: 0, overflow: 'hidden' }}>
					<Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.62rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', mb: 0.3 }}>
						Vehicle Type
					</Typography>
					<Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.78rem', md: '0.8rem' }, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vehicleType}</Typography>
					{showCustomer && user && (
						<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)', mt: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
							{user.name || user.email}
						</Typography>
					)}
				</Box>

				{/* Column 2b: Purchase Price (finance roles only) */}
				{purchasePrice != null && (
					<Box sx={{ minWidth: 0, overflow: 'hidden' }}>
						<Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.62rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', mb: 0.3 }}>
							Purchase Price
						</Typography>
						<Typography sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.95rem' }, fontWeight: 700, color: 'var(--accent-gold)' }}>
							${purchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</Typography>
						{paidAmount > 0 ? (
							<>
								<Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: isPurchasePaidOff ? 'rgb(34, 197, 94)' : 'rgb(251, 191, 36)', mt: 0.3 }}>
									Paid ${Math.min(paidAmount, totalPurchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${totalPurchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
								</Typography>
								<Typography sx={{ fontSize: '0.66rem', fontWeight: 600, color: isPurchasePaidOff ? 'rgb(34, 197, 94)' : 'var(--text-secondary)', mt: 0.2 }}>
									{isPurchasePaidOff ? '✓ Paid Off' : `Remaining $${remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
								</Typography>
							</>
						) : (
							<Typography sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', mt: 0.3 }}>Unpaid</Typography>
						)}
					</Box>
				)}

				{/* Column 3: Container Info or Status Info */}
				<Box sx={{ minWidth: 0, overflow: 'hidden' }}>
					{transit ? (
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
							<Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.62rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', mb: 0.3 }}>
								Transit
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
								<LocalShipping sx={{ fontSize: { xs: 14, sm: 16 }, color: 'var(--accent-gold)' }} />
								<Typography
									sx={{
										fontSize: { xs: '0.72rem', sm: '0.75rem', md: '0.78rem' },
										fontWeight: 600,
										color: 'var(--accent-gold)',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
									}}
								>
									{transit.referenceNumber}
								</Typography>
							</Box>
							<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)', mt: 0.2 }}>
								Final-mile delivery in progress
							</Typography>
							{transit.destination && (
								<Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' }, color: 'var(--text-secondary)', mt: 0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
									Destination: {transit.destination}
								</Typography>
							)}
						</Box>
					) : container ? (
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
							<Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.62rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', mb: 0.3 }}>
								Container Shipping
							</Typography>
							
							{/* Container Number */}
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
								<LocalShipping sx={{ fontSize: { xs: 14, sm: 16 }, color: 'var(--accent-gold)' }} />
								<Typography
									sx={{
										fontSize: { xs: '0.72rem', sm: '0.75rem', md: '0.78rem' },
										fontWeight: 600,
										color: 'var(--accent-gold)',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
									}}
								>
									{container.containerNumber}
								</Typography>
							</Box>

							{/* Progress Bar */}
							{typeof container.progress === 'number' && (
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.3 }}>
									<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<Typography
											sx={{
												fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' },
												color: 'var(--text-secondary)',
											}}
										>
											Progress
										</Typography>
										<Typography
											sx={{
												fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' },
												fontWeight: 600,
												color: 'var(--accent-gold)',
											}}
										>
											{container.progress}%
										</Typography>
									</Box>
									<LinearProgress
										variant="determinate"
										value={container.progress}
										sx={{
											height: 4,
											borderRadius: 1,
											backgroundColor: 'rgba(var(--border-rgb), 0.3)',
											'& .MuiLinearProgress-bar': {
												backgroundColor: 'var(--accent-gold)',
												borderRadius: 1,
											},
										}}
									/>
								</Box>
							)}

							{/* Status */}
							{container.status && (
								<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)', mt: 0.2 }}>
									Status: {formatStatus(container.status)}
								</Typography>
							)}

							{/* Current Location */}
							{container.currentLocation && (
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
									<LocationOn sx={{ fontSize: { xs: 12, sm: 14 }, color: 'var(--text-secondary)' }} />
									<Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' }, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{container.currentLocation}
									</Typography>
								</Box>
							)}

							{/* Vessel Name */}
							{container.vesselName && (
								<Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' }, color: 'var(--text-secondary)', mt: 0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
									🚢 {container.vesselName}
								</Typography>
							)}

							{/* Estimated Arrival */}
							{container.estimatedArrival && (
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
									<CalendarToday sx={{ fontSize: { xs: 12, sm: 14 }, color: 'var(--text-secondary)' }} />
									<Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' }, color: 'var(--text-secondary)' }}>
										ETA: {new Date(container.estimatedArrival).toLocaleDateString()}
									</Typography>
								</Box>
							)}

							{/* Shipping Line */}
							{container.shippingLine && (
								<Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' }, color: 'var(--text-secondary)', mt: 0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
									Line: {container.shippingLine}
									</Typography>
							)}
						</Box>
					) : dispatch ? (
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
							<Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.62rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', mb: 0.3 }}>
								Dispatch To Port
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
								<LocalShipping sx={{ fontSize: { xs: 14, sm: 16 }, color: 'var(--accent-gold)' }} />
								<Typography
									sx={{
										fontSize: { xs: '0.72rem', sm: '0.75rem', md: '0.78rem' },
										fontWeight: 600,
										color: 'var(--accent-gold)',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
									}}
								>
									{dispatch.referenceNumber}
								</Typography>
							</Box>
							<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)', mt: 0.2 }}>
								{dispatch.origin || 'USA Yard'} to {dispatch.destination || 'Port of Loading'}
							</Typography>
							{dispatch.status && (
								<Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.6rem', md: '0.62rem' }, color: 'var(--text-secondary)', mt: 0.2 }}>
									Status: {formatStatus(dispatch.status)}
								</Typography>
							)}
						</Box>
					) : (
						<>
							<Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.62rem', md: '0.65rem' }, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)', mb: 0.3 }}>
								Location
							</Typography>
							<Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.78rem', md: '0.8rem' }, fontWeight: 600, color: 'var(--text-primary)' }}>
								Warehouse
							</Typography>
							<Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.65rem', md: '0.68rem' }, color: 'var(--text-secondary)', mt: 0.2 }}>
								{dispatchId ? 'Dispatch assigned' : 'On Hand'}
							</Typography>
						</>
					)}
				</Box>

				<Box
					sx={{
						display: { xs: 'none', md: 'flex' },
						justifyContent: 'flex-end',
						alignItems: 'center',
						gap: 0.75,
						flexShrink: 0,
					}}
				>
					{onQuickPeek && (
						<Button
							variant="outline"
							size="sm"
							icon={<PanelRightOpen className="w-3.5 h-3.5" />}
							iconPosition="start"
							onClick={(event) => {
								event.stopPropagation();
								onQuickPeek(id);
							}}
							sx={{
								borderRadius: '999px',
								minWidth: 'auto',
								px: 1.25,
								fontSize: '0.75rem',
							}}
						>
							Quick Peek
						</Button>
					)}
					{onOpenQR && (
						<Button
							variant="outline"
							size="sm"
							icon={<QrCode className="w-3.5 h-3.5" />}
							onClick={(event) => {
								event.stopPropagation();
								onOpenQR({
									id,
									vehicle: vehicleInfo,
									vin: vehicleVIN || '-',
									customer: user?.name || user?.email || '-',
									status,
								});
							}}
							title="Print Yard QR Sticker"
							sx={{
								borderRadius: '999px',
								minWidth: 'auto',
								px: 1,
							}}
						/>
					)}
					<Button
						component={Link}
						href={editHref}
						variant="ghost"
						size="sm"
						icon={<Edit sx={{ fontSize: 14 }} />}
						iconPosition="start"
						onClick={(event) => {
							event.stopPropagation();
						}}
						sx={{
							borderRadius: '999px',
							minWidth: 'auto',
							minHeight: { xs: '44px', md: 'auto' },
							px: 1.25,
							color: 'var(--accent-gold)',
							'&:hover': {
								bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)',
								color: 'var(--accent-gold)',
							},
						}}
					>
						Edit
					</Button>
				</Box>

				<Box
					sx={{
						display: { xs: 'flex', md: 'none' },
						gridColumn: '1 / -1',
						justifyContent: 'space-between',
						alignItems: 'center',
						gap: 1,
						pt: 0.5,
						borderTop: '1px solid rgba(var(--border-rgb), 0.45)',
					}}
				>
					<Box sx={{ minWidth: 0, overflow: 'hidden' }}>{statusRow}</Box>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
						{onQuickPeek && (
							<Button
								variant="outline"
								size="sm"
								icon={<PanelRightOpen className="w-3.5 h-3.5" />}
								onClick={(event) => {
									event.stopPropagation();
									onQuickPeek(id);
								}}
								sx={{
									minHeight: { xs: '44px', md: 'auto' },
									borderRadius: '999px',
									px: 1.25,
								}}
							/>
						)}
						{onOpenQR && (
							<Button
								variant="outline"
								size="sm"
								icon={<QrCode className="w-3.5 h-3.5" />}
								onClick={(event) => {
									event.stopPropagation();
									onOpenQR({
										id,
										vehicle: vehicleInfo,
										vin: vehicleVIN || '-',
										customer: user?.name || user?.email || '-',
										status,
									});
								}}
								sx={{
									minHeight: { xs: '44px', md: 'auto' },
									borderRadius: '999px',
									px: 1,
								}}
							/>
						)}
						<Button
							component={Link}
							href={shipmentHref}
							variant="outline"
							size="sm"
							onClick={(event) => {
								event.stopPropagation();
							}}
							sx={{
								minHeight: { xs: '44px', md: 'auto' },
								borderRadius: '999px',
								px: 1.5,
							}}
						>
							View
						</Button>
						<Button
							component={Link}
							href={editHref}
							variant="ghost"
							size="sm"
							icon={<Edit sx={{ fontSize: 14 }} />}
							iconPosition="start"
							onClick={(event) => {
								event.stopPropagation();
							}}
							sx={{
								minHeight: { xs: '44px', md: 'auto' },
								borderRadius: '999px',
								px: 1.25,
								color: 'var(--accent-gold)',
								'&:hover': {
									bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)',
									color: 'var(--accent-gold)',
								},
							}}
						>
							Edit
						</Button>
					</Box>
				</Box>
			</Box>
	);
}
