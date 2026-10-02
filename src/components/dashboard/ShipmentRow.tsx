"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, Truck, CreditCard, MapPin, Calendar, PanelRightOpen, QrCode } from 'lucide-react';
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
		<div className="flex flex-wrap gap-1.5 min-w-0 mt-1">
			<StatusBadge 
				status={status} 
				variant="default" 
				size="sm" 
				showIcon
			/>
			{yardReceived && (
				<StatusBadge
					status="SUCCESS"
					label={yardReceivedAt ? `Yard Received ${new Date(yardReceivedAt).toLocaleDateString()}` : 'Yard Received'}
					size="sm"
				/>
			)}
			{paymentStatus && (
				<StatusBadge 
					status={paymentStatus} 
					variant="default" 
					size="sm" 
					icon={<CreditCard className="w-3 h-3" />}
				/>
			)}
		</div>
	);

	return (
		<article
			tabIndex={0}
			role="link"
			onClick={() => router.push(shipmentHref)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					router.push(shipmentHref);
				}
			}}
			style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}
			className={`animate-in fade-in slide-in-from-bottom-2 duration-200 bg-[var(--panel)] border border-[rgba(var(--panel-rgb),0.9)] border-l-[3px] border-l-transparent rounded-xl shadow-sm hover:shadow-md hover:border-l-[var(--accent-gold)] hover:border-[rgba(var(--accent-gold-rgb),0.35)] hover:-translate-y-0.5 transition-all p-3 sm:p-4 grid gap-3 sm:gap-4 items-center cursor-pointer outline-none ${
				purchasePrice != null
					? 'grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(0,1fr)_auto]'
					: 'grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.15fr)_minmax(0,1fr)_auto]'
			}`}
		>
			{/* Column 1: Vehicle Info & Status */}
			<div className="flex flex-col gap-1 min-w-0 overflow-hidden">
				<span className="text-sm md:text-[0.95rem] font-bold text-[var(--text-primary)] truncate">
					{vehicleInfo}
				</span>
				{vehicleVIN && (
					<div className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full bg-[rgba(var(--border-rgb),0.3)]">
						<span className="text-[10px] text-[var(--text-secondary)]">VIN:</span>
						<span className="text-[10px] text-[var(--text-primary)] font-mono">{vehicleVIN}</span>
					</div>
				)}
				<span className="text-[10px] text-[var(--text-secondary)]">
					Created: {new Date(createdAt).toLocaleDateString()}
				</span>
				<div className="hidden md:flex">{statusRow}</div>
			</div>

			{/* Column 2: Vehicle Type */}
			<div className="min-w-0 overflow-hidden">
				<span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
					Vehicle Type
				</span>
				<span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate block">
					{vehicleType}
				</span>
				{showCustomer && user && (
					<span className="text-[10px] sm:text-xs text-[var(--text-secondary)] mt-0.5 truncate block">
						{user.name || user.email}
					</span>
				)}
			</div>

			{/* Column 2b: Purchase Price (finance roles only) */}
			{purchasePrice != null && (
				<div className="min-w-0 overflow-hidden">
					<span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
						Purchase Price
					</span>
					<span className="text-sm sm:text-base font-bold text-[var(--accent-gold)] block">
						${purchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
					</span>
					{paidAmount > 0 ? (
						<>
							<span className={`text-[11px] font-bold block mt-0.5 ${isPurchasePaidOff ? 'text-green-500' : 'text-amber-400'}`}>
								Paid ${Math.min(paidAmount, totalPurchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${totalPurchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
							</span>
							<span className={`text-[10px] font-semibold block ${isPurchasePaidOff ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}>
								{isPurchasePaidOff ? '✓ Paid Off' : `Remaining $${remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
							</span>
						</>
					) : (
						<span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">Unpaid</span>
					)}
				</div>
			)}

			{/* Column 3: Container Info or Status Info */}
			<div className="min-w-0 overflow-hidden">
				{transit ? (
					<div className="flex flex-col gap-1">
						<span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] block mb-0.5">
							Transit
						</span>
						<div className="flex items-center gap-1.5">
							<Truck className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
							<span className="text-xs font-semibold text-[var(--accent-gold)] truncate">
								{transit.referenceNumber}
							</span>
						</div>
						<span className="text-[10px] text-[var(--text-secondary)]">
							Final-mile delivery in progress
						</span>
						{transit.destination && (
							<span className="text-[10px] text-[var(--text-secondary)] truncate">
								Destination: {transit.destination}
							</span>
						)}
					</div>
				) : container ? (
					<div className="flex flex-col gap-1">
						<span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] block mb-0.5">
							Container Shipping
						</span>
						<div className="flex items-center gap-1.5">
							<Truck className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
							<span className="text-xs font-semibold text-[var(--accent-gold)] font-mono truncate">
								{container.containerNumber}
							</span>
						</div>
						{typeof container.progress === 'number' && (
							<div className="flex flex-col gap-0.5 mt-0.5">
								<div className="flex justify-between items-center text-[10px]">
									<span className="text-[var(--text-secondary)]">Progress</span>
									<span className="font-semibold text-[var(--accent-gold)]">{container.progress}%</span>
								</div>
								<div className="w-full h-1 rounded-full bg-[rgba(var(--border-rgb),0.3)] overflow-hidden">
									<div
										style={{ width: `${container.progress}%` }}
										className="h-full bg-[var(--accent-gold)] rounded-full transition-all"
									/>
								</div>
							</div>
						)}
						{container.status && (
							<span className="text-[10px] text-[var(--text-secondary)]">
								Status: {formatStatus(container.status)}
							</span>
						)}
						{container.currentLocation && (
							<div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
								<MapPin className="w-3 h-3 text-[var(--text-secondary)] shrink-0" />
								<span className="truncate">{container.currentLocation}</span>
							</div>
						)}
						{container.vesselName && (
							<span className="text-[10px] text-[var(--text-secondary)] truncate">
								🚢 {container.vesselName}
							</span>
						)}
						{container.estimatedArrival && (
							<div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
								<Calendar className="w-3 h-3 text-[var(--text-secondary)] shrink-0" />
								<span>ETA: {new Date(container.estimatedArrival).toLocaleDateString()}</span>
							</div>
						)}
					</div>
				) : dispatch ? (
					<div className="flex flex-col gap-1">
						<span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] block mb-0.5">
							Dispatch To Port
						</span>
						<div className="flex items-center gap-1.5">
							<Truck className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
							<span className="text-xs font-semibold text-[var(--accent-gold)] truncate">
								{dispatch.referenceNumber}
							</span>
						</div>
						<span className="text-[10px] text-[var(--text-secondary)]">
							{dispatch.origin || 'USA Yard'} to {dispatch.destination || 'Port of Loading'}
						</span>
						{dispatch.status && (
							<span className="text-[10px] text-[var(--text-secondary)]">
								Status: {formatStatus(dispatch.status)}
							</span>
						)}
					</div>
				) : (
					<div>
						<span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] block mb-0.5">
							Location
						</span>
						<span className="text-xs font-semibold text-[var(--text-primary)] block">
							Warehouse
						</span>
						<span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
							{dispatchId ? 'Dispatch assigned' : 'On Hand'}
						</span>
					</div>
				)}
			</div>

			{/* Desktop Actions */}
			<div className="hidden md:flex justify-end items-center gap-2 shrink-0">
				{onQuickPeek && (
					<Button
						variant="outline"
						size="sm"
						icon={<PanelRightOpen className="w-3.5 h-3.5" />}
						onClick={(event) => {
							event.stopPropagation();
							onQuickPeek(id);
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
					/>
				)}
				<Button
					href={editHref}
					variant="ghost"
					size="sm"
					icon={<Edit className="w-3.5 h-3.5" />}
					onClick={(event) => {
						event.stopPropagation();
					}}
				>
					Edit
				</Button>
			</div>

			{/* Mobile Actions */}
			<div className="flex md:hidden col-span-full justify-between items-center gap-2 pt-2 border-t border-[rgba(var(--border-rgb),0.45)]">
				<div className="min-w-0 overflow-hidden">{statusRow}</div>
				<div className="flex items-center gap-1.5 shrink-0">
					{onQuickPeek && (
						<Button
							variant="outline"
							size="sm"
							icon={<PanelRightOpen className="w-3.5 h-3.5" />}
							onClick={(event) => {
								event.stopPropagation();
								onQuickPeek(id);
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
						/>
					)}
					<Button
						href={shipmentHref}
						variant="outline"
						size="sm"
						onClick={(event) => {
							event.stopPropagation();
						}}
					>
						View
					</Button>
					<Button
						href={editHref}
						variant="ghost"
						size="sm"
						icon={<Edit className="w-3.5 h-3.5" />}
						onClick={(event) => {
							event.stopPropagation();
						}}
					>
						Edit
					</Button>
				</div>
			</div>
		</article>
	);
}
