'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { AlertCircle, Calendar, CheckCircle2, Clock, Copy, MapPin, Package, Search, Ship, XCircle, Camera } from 'lucide-react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, EmptyState, FormField, Breadcrumbs, toast, DashboardPageSkeleton, StatusBadge } from '@/components/design-system';
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
				<Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
					<Box sx={{ flex: 1 }}>
						<FormField
							label=""
							type="text"
							value={trackingNumber}
							onChange={(e) => setTrackingNumber(e.target.value)}
							placeholder="Container or tracking number (e.g., UETU6059142)"
							leftIcon={<Search style={{ fontSize: 20, color: 'var(--text-secondary)' }} />}
							onKeyPress={(e) => {
								if (e.key === 'Enter') {
									void handleTrack();
								}
							}}
						/>
					</Box>
					<Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
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
					</Box>
				</Box>

				<Box
					sx={{
						mt: 2,
						display: 'grid',
						gridTemplateColumns: { xs: '1fr', lg: '1.2fr 0.8fr' },
						gap: 2,
					}}
				>
					<Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
							<Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
								Recent lookups
							</Typography>
							{recentTrackingNumbers.length > 0 && (
								<Button variant="ghost" size="sm" icon={<XCircle className="w-4 h-4" />} onClick={clearRecentTrackingNumbers}>
									Clear
								</Button>
							)}
						</Box>
						{recentTrackingNumbers.length === 0 ? (
							<Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
								Successful tracking searches will appear here for fast repeat checks.
							</Typography>
						) : (
							<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
							</Box>
						)}
					</Box>

					<Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
						<Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 1 }}>
							Tracking readiness
						</Typography>
						<Typography sx={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 700 }}>
							Container number, booking number, or carrier tracking ID
						</Typography>
						<Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', mt: 0.5 }}>
							Results include carrier milestones, route, ETA, and progress when the provider returns those fields.
						</Typography>
					</Box>
				</Box>

				{errorMessage && (
					<Box
						sx={{
							mt: 2,
							p: 2,
							borderRadius: 2,
							border: '1px solid rgba(var(--error-rgb), 0.3)',
							bgcolor: 'rgba(var(--error-rgb), 0.1)',
							display: 'flex',
							alignItems: 'start',
							gap: 1.5,
						}}
					>
						<AlertCircle style={{ fontSize: 18, color: 'var(--error-dark)', flexShrink: 0 }} />
						<Typography sx={{ fontSize: '0.85rem', color: 'var(--error-dark)' }}>
							{errorMessage}
						</Typography>
					</Box>
				)}
			</DashboardPanel>

			{/* Tracking Results */}
			{trackingDetails ? (
				<>
					{/* Interactive Route Map Toggle Button */}
					<Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
						<Button
							variant={showRouteMap ? 'primary' : 'outline'}
							size="sm"
							icon={<Ship className="w-4 h-4" />}
							onClick={() => setShowRouteMap((prev) => !prev)}
						>
							{showRouteMap ? 'Hide Route Map' : 'View Interactive Route Map'}
						</Button>
					</Box>

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
							<Box>
								<Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', mb: 0.5 }}>
									Container Number
								</Typography>
								<Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
									{trackingDetails.containerNumber}
								</Typography>
								<Button
									variant="ghost"
									size="sm"
									icon={<Copy className="w-4 h-4" />}
									onClick={() => void copyTrackingNumber(trackingDetails.containerNumber)}
									sx={{ mt: 1 }}
								>
									Copy
								</Button>
								{trackingDetails.company?.name && (
									<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
										Carrier: {trackingDetails.company.name}
									</Typography>
								)}
							</Box>

							<Box>
								<Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', mb: 0.5 }}>
									Status
								</Typography>
								<Box sx={{ mt: 0.5 }}>
									<StatusBadge status={trackingDetails.shipmentStatus || 'IN_TRANSIT'} size="md" />
								</Box>
							</Box>

							<Box>
								<Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', mb: 0.5 }}>
									Current Location
								</Typography>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
									<MapPin style={{ fontSize: 16, color: 'var(--text-secondary)' }} />
									<Typography sx={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
										{trackingDetails.currentLocation || 'Not available'}
									</Typography>
								</Box>
							</Box>

							<Box>
								<Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', mb: 0.5 }}>
									Estimated Arrival
								</Typography>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
									<Calendar style={{ fontSize: 16, color: 'var(--text-secondary)' }} />
									<Typography sx={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
										{formatDisplayDate(trackingDetails.estimatedArrival) || 'Not available'}
									</Typography>
								</Box>
							</Box>
						</DashboardGrid>

						{/* Route Information */}
						<Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
							<Box sx={{ p: 2, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--background)' }}>
								<Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
									Origin
								</Typography>
								<Typography sx={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
									{trackingDetails.origin || 'Not available'}
								</Typography>
							</Box>

							<Box sx={{ p: 2, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--background)' }}>
								<Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
									Destination
								</Typography>
								<Typography sx={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
									{trackingDetails.destination || 'Not available'}
								</Typography>
							</Box>

							<Box sx={{ p: 2, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--background)' }}>
								<Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
									Container Type
								</Typography>
								<Typography sx={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
									{trackingDetails.containerType || 'Not available'}
								</Typography>
							</Box>
						</Box>

						{/* Progress Bar */}
						{progressValue !== null && (
							<Box sx={{ mt: 3 }}>
								<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
									<Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										Shipment Progress
									</Typography>
									<Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
										{progressValue}%
									</Typography>
								</Box>
								<Box
									sx={{
										width: '100%',
										height: 8,
										borderRadius: 1,
										bgcolor: 'var(--background)',
										border: '1px solid var(--border)',
										overflow: 'hidden',
									}}
								>
									<Box
										sx={{
											width: `${progressValue}%`,
											height: '100%',
											bgcolor: 'var(--accent-gold)',
											transition: 'width 0.5s ease',
										}}
									/>
								</Box>
							</Box>
						)}
					</DashboardPanel>

					{/* Timeline/Milestones */}
					<DashboardPanel title="Carrier Milestones" description="Tracking history and updates" fullHeight>
						{timelineEvents.length === 0 ? (
							<EmptyState
								icon={<Package />}
								title="No milestone history"
								description="No tracking events available for this container yet"
							/>
						) : (
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								{timelineEvents.map((event) => {
									const Icon = event.icon;
									const isActual = event.actual;
									return (
										<Box
											key={event.id}
											sx={{
												p: 2,
												borderRadius: 2,
												border: `1px solid ${isActual ? 'rgba(var(--info-rgb), 0.3)' : 'var(--border)'}`,
												bgcolor: isActual ? 'rgba(var(--info-rgb), 0.05)' : 'var(--panel)',
												transition: 'all 0.2s ease',
												'&:hover': {
													transform: 'translateX(4px)',
													borderColor: isActual ? 'rgba(var(--info-rgb), 0.5)' : 'var(--accent-gold)',
												},
											}}
										>
											<Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
												<Box
													sx={{
														width: 40,
														height: 40,
														borderRadius: 2,
														bgcolor: isActual ? 'rgba(var(--info-rgb), 0.15)' : 'var(--background)',
														border: `1px solid ${isActual ? 'rgba(var(--info-rgb), 0.3)' : 'var(--border)'}`,
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														flexShrink: 0,
													}}
												>
													<Icon style={{ fontSize: 18, color: isActual ? 'var(--info)' : 'var(--text-secondary)' }} />
												</Box>

												<Box sx={{ flex: 1, minWidth: 0 }}>
													<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', mb: 0.5 }}>
														{event.status}
													</Typography>
													
													<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
														{event.location && (
															<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
																<MapPin style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
																<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
																	{event.location}
																</Typography>
															</Box>
														)}
														<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
															<Clock style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
															<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
																{event.displayTimestamp}
															</Typography>
														</Box>
													</Box>

													{event.description && (
														<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
															{event.description}
														</Typography>
													)}
												</Box>
											</Box>
										</Box>
									);
								})}
							</Box>
						)}
					</DashboardPanel>
				</>
			) : !isLoading && !errorMessage && (
				<DashboardPanel fullHeight>
					<EmptyState
						icon={<Ship />}
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
