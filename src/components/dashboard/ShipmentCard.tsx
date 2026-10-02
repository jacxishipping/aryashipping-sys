"use client";

import Link from 'next/link';
import { ArrowRight, Truck, MapPin, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { StatusBadge } from '@/components/design-system';

type ShipmentCardProps = {
	id: string;
	vehicleType: string;
	vehicleMake?: string | null;
	vehicleModel?: string | null;
	vehicleYear?: number | null;
	vehicleVIN?: string | null;
	status: string;
	containerId?: string | null;
	container?: {
		containerNumber: string;
		trackingNumber?: string | null;
		status?: string;
		currentLocation?: string | null;
		estimatedArrival?: string | null;
		vesselName?: string | null;
		shippingLine?: string | null;
		progress?: number;
	} | null;
	delay?: number;
};

export default function ShipmentCard({
	id,
	vehicleType,
	vehicleMake,
	vehicleModel,
	vehicleYear,
	vehicleVIN,
	status,
	containerId,
	container,
	delay = 0,
}: ShipmentCardProps) {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setIsVisible(true), delay * 1000);
		return () => clearTimeout(timer);
	}, [delay]);

	const vehicleInfo = [vehicleMake, vehicleModel, vehicleYear].filter(Boolean).join(' ') || vehicleType;

	if (!isVisible) return null;

	return (
		<article className="rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-sm p-3 flex flex-col gap-2.5 text-[var(--text-primary)] min-w-0 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
			{/* Header: Vehicle Info & Status */}
			<div className="flex justify-between gap-2 min-w-0 items-start">
				<div className="min-w-0 flex-1 overflow-hidden">
					<div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
						{vehicleInfo}
					</div>
					{vehicleVIN && (
						<div className="text-[10px] sm:text-xs text-[var(--text-secondary)] font-mono truncate mt-0.5">
							VIN: {vehicleVIN}
						</div>
					)}
				</div>
				<StatusBadge 
					status={status} 
					variant="outline"
					size="sm"
				/>
			</div>

			{/* Vehicle Details */}
			<div className="flex flex-col gap-0.5 min-w-0">
				<span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">
					Vehicle Type
				</span>
				<span className="text-xs font-medium text-[var(--text-primary)] truncate">
					{vehicleType}
				</span>
			</div>

			{/* Container Shipping Info */}
			{container && (
				<div className="flex flex-col gap-2 min-w-0 pt-1 border-t border-[var(--border)]">
					{/* Container Number and Status */}
					<div className="flex items-center justify-between gap-2 min-w-0">
						<div className="flex items-center gap-1.5 min-w-0 flex-1">
							<Truck className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
							<Link href={`/dashboard/containers/${containerId}`} className="min-w-0 truncate no-underline">
								<span className="text-xs font-semibold text-[var(--accent-gold)] font-mono hover:underline truncate block">
									{container.containerNumber}
								</span>
							</Link>
						</div>
						{container.status && (
							<StatusBadge 
								status={container.status} 
								variant="outline"
								size="sm"
							/>
						)}
					</div>

					{/* Shipping Progress */}
					{typeof container.progress === 'number' && (
						<div className="flex flex-col gap-1 min-w-0">
							<div className="flex justify-between items-center text-[10px]">
								<span className="uppercase tracking-wider text-[var(--text-secondary)] font-medium">
									Shipping Progress
								</span>
								<span className="font-semibold text-[var(--accent-gold)]">
									{container.progress}%
								</span>
							</div>
							<div className="w-full h-1 rounded-full bg-[rgba(var(--text-primary-rgb),0.1)] overflow-hidden">
								<div
									style={{ width: `${container.progress}%` }}
									className="h-full rounded-full bg-[var(--accent-gold)] transition-all"
								/>
							</div>
						</div>
					)}

					{/* Current Location */}
					{container.currentLocation && (
						<div className="flex items-center gap-1.5 min-w-0 text-[11px] text-[var(--text-secondary)]">
							<MapPin className="w-3 h-3 text-[var(--text-secondary)] shrink-0" />
							<span className="truncate">{container.currentLocation}</span>
						</div>
					)}

					{/* Vessel and ETA */}
					<div className="flex flex-col gap-0.5 min-w-0 text-[11px] text-[var(--text-secondary)]">
						{container.vesselName && (
							<div className="truncate">
								<span className="font-semibold">Vessel:</span> {container.vesselName}
							</div>
						)}
						{container.estimatedArrival && (
							<div className="flex items-center gap-1.5 min-w-0">
								<Calendar className="w-3 h-3 text-[var(--text-secondary)] shrink-0" />
								<span className="truncate">
									ETA: {new Date(container.estimatedArrival).toLocaleDateString()}
								</span>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Footer: View Details Button */}
			<div className="flex items-center justify-end gap-1 min-w-0 pt-1">
				<Link
					href={`/dashboard/shipments/${id}`}
					className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-gold)] hover:underline no-underline"
				>
					<span>View Details</span>
					<ArrowRight className="w-3.5 h-3.5" />
				</Link>
			</div>
		</article>
	);
}