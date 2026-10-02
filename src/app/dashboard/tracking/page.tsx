'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Calendar, CheckCircle2, Clock, Copy, MapPin, Package, Search, Ship, XCircle, Camera } from 'lucide-react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, EmptyState, FormField, toast, DashboardPageSkeleton, StatusBadge } from '@/components/design-system';
import TrackingRouteMap from '@/components/tracking/TrackingRouteMap';
import { BarcodeScannerModal } from '@/components/ui/BarcodeScannerModal';
import { sanitizeTrackNumber } from '@/lib/tracking-sanitize';

interface TrackingEventEntry {
	id: string;
	status: string;
	statusCode?: string;
	location?: string;
	terminal?: string;
	timestamp?: string;
	actual: boolean;
	description?: string;
}

interface TrackingDetails {
	containerNumber: string;
	isContainerAssigned?: boolean;
	containerType?: string;
	shipmentStatus?: string;
	origin?: string;
	destination?: string;
	currentLocation?: string;
	estimatedArrival?: string;
	estimatedDeparture?: string;
	progress?: number | null;
	company?: {
		name?: string;
		url?: string | null;
		scacs?: string[];
	};
	events: TrackingEventEntry[];
}

const normalizeProgress = (value: TrackingDetails['progress']) => {
	if (typeof value !== 'number' || Number.isNaN(value)) return null;
	return Math.min(100, Math.max(0, Math.round(value)));
};

const formatDisplayDate = (value?: string) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleString(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
};

const RECENT_TRACKING_KEY = 'jacxi.recentTrackingNumbers';

function getStoredTrackingNumbers() {
	if (typeof window === 'undefined') return [];
	try {
		const value = window.localStorage.getItem(RECENT_TRACKING_KEY);
		const parsed = value ? JSON.parse(value) : [];
		return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 6) : [];
	} catch {
		return [];
	}
}

export default function DashboardTrackingPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [trackingNumber, setTrackingNumber] = useState('');
	const [trackingDetails, setTrackingDetails] = useState<TrackingDetails | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [recentTrackingNumbers, setRecentTrackingNumbers] = useState<string[]>([]);
	const [scannerOpen, setScannerOpen] = useState(false);
	const [showRouteMap, setShowRouteMap] = useState(false);

	useEffect(() => {
		if (status === 'unauthenticated') {
			router.replace('/auth/signin?callbackUrl=/dashboard/tracking');
		}
	}, [status, router]);

	useEffect(() => {
		setRecentTrackingNumbers(getStoredTrackingNumbers());
	}, []);

	const saveRecentTrackingNumber = (value: string) => {
		const next = [value, ...recentTrackingNumbers.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 6);
		setRecentTrackingNumbers(next);
		window.localStorage.setItem(RECENT_TRACKING_KEY, JSON.stringify(next));
	};

	const clearRecentTrackingNumbers = () => {
		setRecentTrackingNumbers([]);
		window.localStorage.removeItem(RECENT_TRACKING_KEY);
	};

	const copyTrackingNumber = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value);
			toast.success('Tracking number copied');
		} catch {
			toast.error('Unable to copy tracking number');
		}
	};

	const handleTrack = async (overrideNumber?: string) => {
		const raw = (overrideNumber || trackingNumber).trim();
		const value = sanitizeTrackNumber(raw) || raw;
		if (!value) {
			setErrorMessage('Enter a container or tracking number to continue.');
			setTrackingDetails(null);
			return;
		}

		setTrackingNumber(value);
		setIsLoading(true);
		setErrorMessage(null);
		setTrackingDetails(null);

		try {
			const response = await fetch('/api/tracking', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ trackNumber: value, needRoute: true }),
			});

			const payload = (await response.json()) as {
				tracking?: TrackingDetails;
				message?: string;
			};

			if (!response.ok) {
				setErrorMessage(payload?.message || 'Unable to fetch tracking information.');
				return;
			}

			const details: TrackingDetails | undefined = payload?.tracking;
			if (!details) {
				setErrorMessage('No tracking data returned for that number.');
				return;
			}

			setTrackingDetails(details);
			saveRecentTrackingNumber(value);
		} catch (error: unknown) {
			console.error('Dashboard tracking error:', error);
			setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch tracking information.');
		} finally {
			setIsLoading(false);
		}
	};

	if (status === 'loading') {
		return <DashboardPageSkeleton />;
	}

	if (!session) {
		return null;
	}

	const progressValue = normalizeProgress(trackingDetails?.progress);
	const timelineEvents = (trackingDetails?.events || []).map((event) => ({
		...event,
		displayTimestamp: formatDisplayDate(event.timestamp) || event.timestamp || 'Pending update',
		icon: event.actual ? CheckCircle2 : Clock,
	}));

	return (
		<DashboardSurface>
			<PageHeader
				showBreadcrumbs
				title="Shipment Tracking"
				description="Monitor containers and track shipment milestones in real-time"
			/>

			{/* Search Panel */}
			<DashboardPanel title="Track Shipment" description="Enter container or tracking number">
				<div className="flex flex-col sm:flex-row gap-4">
					<div className="flex-1">
						<FormField
							label=""
							type="text"
							value={trackingNumber}
							onChange={(value) => setTrackingNumber(value)}
							placeholder="Container or tracking number (e.g., UETU6059142)"
							leftIcon={<Search className="w-5 h-5 text-[var(--text-secondary)]" />}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									void handleTrack();
								}
							}}
						/>
					</div>
					<div className="flex items-end gap-2">
						<Button
							variant="outline"
							onClick={() => setScannerOpen(true)}
							icon={<Camera className="w-4 h-4" />}
						>
							Scan
						</Button>
						<Button
							variant="primary"
							onClick={() => void handleTrack()}
							disabled={isLoading}
							icon={isLoading ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
						>
							{isLoading ? 'Tracking...' : 'Track'}
						</Button>
					</div>
				</div>

				<div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
					<div className="p-4 border border-[var(--border)] rounded-xl bg-[var(--background)]">
						<div className="flex items-center justify-between gap-2 mb-3">
							<div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
								Recent lookups
							</div>
							{recentTrackingNumbers.length > 0 && (
								<Button variant="ghost" size="sm" icon={<XCircle className="w-4 h-4" />} onClick={clearRecentTrackingNumbers}>
									Clear
								</Button>
							)}
						</div>
						{recentTrackingNumbers.length === 0 ? (
							<p className="text-xs text-[var(--text-secondary)]">
								Successful tracking searches will appear here for fast repeat checks.
							</p>
						) : (
							<div className="flex flex-wrap gap-2">
								{recentTrackingNumbers.map((number) => (
									<Button
										key={number}
										variant="outline"
										size="sm"
										icon={<Clock className="w-4 h-4" />}
										onClick={() => void handleTrack(number)}
										disabled={isLoading}
									>
										{number}
									</Button>
								))}
							</div>
						)}
					</div>

					<div className="p-4 border border-[var(--border)] rounded-xl bg-[var(--background)]">
						<div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
							Tracking readiness
						</div>
						<div className="text-sm text-[var(--text-primary)] font-bold">
							Container number, booking number, or carrier tracking ID
						</div>
						<p className="text-xs text-[var(--text-secondary)] mt-1">
							Results include carrier milestones, route, ETA, and progress when the provider returns those fields.
						</p>
					</div>
				</div>

				{errorMessage && (
					<div className="mt-4 p-4 rounded-xl border border-[rgba(var(--error-rgb),0.3)] bg-[rgba(var(--error-rgb),0.1)] flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-[var(--error)] shrink-0 mt-0.5" />
						<span className="text-sm text-[var(--error)]">
							{errorMessage}
						</span>
					</div>
				)}
			</DashboardPanel>

			{/* Tracking Results */}
			{trackingDetails ? (
				<>
					{/* Interactive Route Map Toggle Button */}
					<div className="flex justify-end mb-2">
						<Button
							variant={showRouteMap ? 'primary' : 'outline'}
							size="sm"
							icon={<Ship className="w-4 h-4" />}
							onClick={() => setShowRouteMap((prev) => !prev)}
						>
							{showRouteMap ? 'Hide Route Map' : 'View Interactive Route Map'}
						</Button>
					</div>

					{/* Interactive Route Map (Only on demand) */}
					{showRouteMap && (
						<DashboardPanel title="Interactive Route Map" description="Live vessel and overland transit visualization">
							<TrackingRouteMap
								progressPercent={progressValue ?? 35}
								origin={trackingDetails.origin || 'USA / Canada'}
								destination={trackingDetails.destination || 'Afghanistan'}
								containerNumber={trackingDetails.containerNumber}
								estimatedArrival={trackingDetails.estimatedArrival}
							/>
						</DashboardPanel>
					)}

					{/* Container Details */}
					<DashboardPanel title="Container Details" description="Current status and information">
						<DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
							<div>
								<div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
									Container Number
								</div>
								<div className="text-base font-bold text-[var(--text-primary)] break-all">
									{trackingDetails.containerNumber}
								</div>
								<div className="mt-2">
									<Button
										variant="ghost"
										size="sm"
										icon={<Copy className="w-4 h-4" />}
										onClick={() => void copyTrackingNumber(trackingDetails.containerNumber)}
									>
										Copy
									</Button>
								</div>
								{trackingDetails.company?.name && (
									<div className="text-xs text-[var(--text-secondary)] mt-1">
										Carrier: {trackingDetails.company.name}
									</div>
								)}
							</div>

							<div>
								<div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
									Status
								</div>
								<div className="mt-1">
									<StatusBadge status={trackingDetails.shipmentStatus || 'IN_TRANSIT'} size="md" />
								</div>
							</div>

							<div>
								<div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
									Current Location
								</div>
								<div className="flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
									<MapPin className="w-4 h-4 text-[var(--text-secondary)]" />
									<span>{trackingDetails.currentLocation || 'Not available'}</span>
								</div>
							</div>

							<div>
								<div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
									Estimated Arrival
								</div>
								<div className="flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
									<Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
									<span>{formatDisplayDate(trackingDetails.estimatedArrival) || 'Not available'}</span>
								</div>
							</div>
						</DashboardGrid>

						{/* Route Information */}
						<div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
								<div className="text-xs font-semibold uppercase text-[var(--text-secondary)] mb-1">
									Origin
								</div>
								<div className="text-sm text-[var(--text-primary)] font-medium">
									{trackingDetails.origin || 'Not available'}
								</div>
							</div>

							<div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
								<div className="text-xs font-semibold uppercase text-[var(--text-secondary)] mb-1">
									Destination
								</div>
								<div className="text-sm text-[var(--text-primary)] font-medium">
									{trackingDetails.destination || 'Not available'}
								</div>
							</div>

							<div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
								<div className="text-xs font-semibold uppercase text-[var(--text-secondary)] mb-1">
									Container Type
								</div>
								<div className="text-sm text-[var(--text-primary)] font-medium">
									{trackingDetails.containerType || 'Not available'}
								</div>
							</div>
						</div>

						{/* Progress Bar */}
						{progressValue !== null && (
							<div className="mt-6">
								<div className="flex justify-between items-center mb-2">
									<span className="text-xs font-semibold text-[var(--text-primary)]">
										Shipment Progress
									</span>
									<span className="text-xs font-bold text-[var(--accent-gold)]">
										{progressValue}%
									</span>
								</div>
								<div className="w-full h-2 rounded-full bg-[var(--background)] border border-[var(--border)] overflow-hidden">
									<div
										className="h-full bg-[var(--accent-gold)] transition-all duration-500"
										style={{ width: `${progressValue}%` }}
									/>
								</div>
							</div>
						)}
					</DashboardPanel>

					{/* Timeline/Milestones */}
					<DashboardPanel title="Carrier Milestones" description="Tracking history and updates" fullHeight>
						{timelineEvents.length === 0 ? (
							<EmptyState
								icon={<Package className="w-8 h-8 text-[var(--text-secondary)]" />}
								title="No milestone history"
								description="No tracking events available for this container yet"
							/>
						) : (
							<div className="flex flex-col gap-4">
								{timelineEvents.map((event) => {
									const Icon = event.icon;
									const isActual = event.actual;
									return (
										<div
											key={event.id}
											className={`p-4 rounded-xl border transition-all hover:translate-x-1 ${
												isActual
													? 'border-[rgba(var(--info-rgb),0.3)] bg-[rgba(var(--info-rgb),0.05)] hover:border-[rgba(var(--info-rgb),0.5)]'
													: 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent-gold)]'
											}`}
										>
											<div className="flex items-start gap-4">
												<div
													className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
														isActual
															? 'bg-[rgba(var(--info-rgb),0.15)] border-[rgba(var(--info-rgb),0.3)]'
															: 'bg-[var(--background)] border-[var(--border)]'
													}`}
												>
													<Icon className={`w-5 h-5 ${isActual ? 'text-[var(--info)]' : 'text-[var(--text-secondary)]'}`} />
												</div>

												<div className="flex-1 min-w-0">
													<div className="text-sm font-semibold text-[var(--text-primary)] mb-1">
														{event.status}
													</div>
													
													<div className="flex items-center gap-3 flex-wrap mb-1 text-xs text-[var(--text-secondary)]">
														{event.location && (
															<div className="flex items-center gap-1">
																<MapPin className="w-3.5 h-3.5" />
																<span>{event.location}</span>
															</div>
														)}
														<div className="flex items-center gap-1">
															<Clock className="w-3.5 h-3.5" />
															<span>{event.displayTimestamp}</span>
														</div>
													</div>

													{event.description && (
														<p className="text-xs text-[var(--text-secondary)] mt-1">
															{event.description}
														</p>
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</DashboardPanel>
				</>
			) : !isLoading && !errorMessage && (
				<DashboardPanel fullHeight>
					<EmptyState
						icon={<Ship className="w-8 h-8 text-[var(--text-secondary)]" />}
						title="Start tracking"
						description="Enter a container or tracking number above to view shipment details and milestones"
					/>
				</DashboardPanel>
			)}
			<BarcodeScannerModal
				open={scannerOpen}
				onClose={() => setScannerOpen(false)}
				onScan={(scanned) => {
					setScannerOpen(false);
					setTrackingNumber(scanned);
					void handleTrack(scanned);
				}}
				title="Scan Container or VIN QR Code"
				description="Align vehicle VIN barcode, tracking QR code, or container label within the camera frame"
			/>
		</DashboardSurface>
	);
}
