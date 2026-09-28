'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, useScroll, useTransform, useSpring, type Variants } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, MapPin, Search, Ship, Package, ArrowRight, Camera } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import TrackingRouteMap from '@/components/tracking/TrackingRouteMap';
import LandingScrollAnimator from '@/components/sections/home/LandingScrollAnimator';
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
	customerTracking?: {
		currentStageKey: string;
		currentStageLabel: string;
		summary: string;
		progressPercent: number;
		milestones: Array<{
			key: string;
			label: string;
			description: string;
			state: 'pending' | 'current' | 'complete';
			timestamp?: string;
		}>;
	};
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

const containerVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.1, delayChildren: 0.1 },
	},
};

const itemVariants: Variants = {
	hidden: { opacity: 0, y: 24 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.6, ease: 'easeOut' as const },
	},
};

export default function TrackingPage() {
	return (
		<Suspense fallback={null}>
			<TrackingPageInner />
		</Suspense>
	);
}

function TrackingPageInner() {
	const searchParams = useSearchParams();
	const heroRef = useRef<HTMLElement>(null);
	const initialParam =
		searchParams.get('vin') ||
		searchParams.get('container') ||
		searchParams.get('q') ||
		searchParams.get('trackNumber') ||
		searchParams.get('trackingNumber') ||
		searchParams.get('id') ||
		'';
	const [trackingNumber, setTrackingNumber] = useState(() => initialParam.trim());
	const [trackingDetails, setTrackingDetails] = useState<TrackingDetails | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [scannerOpen, setScannerOpen] = useState(false);
	const [showRouteMap, setShowRouteMap] = useState(false);
	const autoSearchDone = useRef(false);

	const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
	const smoothY = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
	const heroContentY = useTransform(smoothY, [0, 1], ['0%', '30%']);
	const heroOpacity = useTransform(smoothY, [0, 0.6], [1, 0]);

	const handleTrack = useCallback(async (overrideValue?: string) => {
		const raw = (overrideValue ?? trackingNumber).trim();
		const value = sanitizeTrackNumber(raw) || raw;
		if (!value) {
			setErrorMessage('Enter a container or tracking number to continue.');
			setTrackingDetails(null);
			return;
		}

		setIsLoading(true);
		setErrorMessage(null);
		setTrackingDetails(null);

		try {
			const response = await fetch('/api/tracking', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
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
		} catch (error: unknown) {
			console.error('Tracking error:', error);
			setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch tracking information.');
		} finally {
			setIsLoading(false);
		}
	}, [trackingNumber]);

	useEffect(() => {
		const param =
			searchParams.get('vin') ||
			searchParams.get('container') ||
			searchParams.get('q') ||
			searchParams.get('trackNumber') ||
			searchParams.get('trackingNumber') ||
			searchParams.get('id');

		if (param && !autoSearchDone.current) {
			autoSearchDone.current = true;
			const clean = param.trim();
			setTrackingNumber(clean);
			handleTrack(clean);
		}
	}, [handleTrack, searchParams]);

	// RTL support for Dari (dr) and Pashto (ps) customers, activated via
	// ?lang=ps|dr on the share links we send them. Direction applies while the
	// tracking page is open and resets afterwards so the ops dashboard is
	// unaffected.
	useEffect(() => {
		const langParam = searchParams.get('lang');
		const isRtl = langParam === 'ps' || langParam === 'dr';
		document.documentElement.lang = langParam || 'en';
		document.documentElement.dir = isRtl ? 'rtl' : 'ltr';

		return () => {
			document.documentElement.dir = 'ltr';
		};
	}, [searchParams]);

	const progressValue = normalizeProgress(trackingDetails?.progress);
	const customerMilestones = trackingDetails?.customerTracking?.milestones || [];

	return (
		<div className="min-h-screen bg-[#F9FAFB] text-gray-900">
			<LandingScrollAnimator />
			<Header isAuthenticated={false} />

			{/* ── Hero Section ── */}
			<section
				ref={heroRef}
				className="relative isolate overflow-hidden min-h-[60vh] flex flex-col justify-center pt-28 pb-16 px-4 sm:px-6 lg:px-8"
			>
				{/* Grid texture */}
				<div className="pointer-events-none absolute inset-0 -z-10 bg-[url('/grid.svg')] bg-[length:40px_40px] opacity-[0.04]" />
				{/* Radial glow */}
				<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(var(--accent-gold-rgb),0.07),transparent)]" />

				<motion.div
					style={{ y: heroContentY, opacity: heroOpacity }}
					className="mx-auto w-full max-w-4xl"
				>
					<motion.div
						variants={containerVariants}
						initial="hidden"
						animate="visible"
						className="text-center"
					>
						{/* Label */}
						<motion.div variants={itemVariants} className="inline-flex items-center gap-3 justify-center mb-8">
							<span className="h-px w-6 bg-[var(--accent-gold)]" />
							<span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent-gold)]">Live tracking</span>
							<span className="h-px w-6 bg-[var(--accent-gold)]" />
						</motion.div>

						{/* Headline */}
						<motion.h1
							variants={itemVariants}
							className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6"
						>
							Track Your{' '}
							<span className="relative inline-block">
								<span className="relative z-10">Shipment</span>
								<motion.span
									initial={{ scaleX: 0 }}
									animate={{ scaleX: 1 }}
									transition={{ duration: 0.9, delay: 0.6, ease: 'circOut' as const }}
									style={{ originX: 0 }}
									className="absolute bottom-1 left-0 right-0 h-3 md:h-4 bg-[var(--accent-gold)]/30 -z-10 -rotate-1"
								/>
							</span>
						</motion.h1>

						<motion.p variants={itemVariants} className="text-lg text-black/60 font-medium mb-12 max-w-xl mx-auto">
							Enter your container or tracking number for real-time updates on your vehicle shipment.
						</motion.p>

						{/* Search Card */}
						<motion.div
							variants={itemVariants}
							className="relative rounded-[2rem] border border-black/[0.06] bg-white shadow-[0_20px_60px_-10px_rgba(0,0,0,0.08)] p-6 sm:p-8"
						>
							{/* subtle inner glow */}
							<div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-[var(--accent-gold)]/5 to-transparent" />

							<form
								onSubmit={(e) => { e.preventDefault(); handleTrack(); }}
								className="relative flex flex-col sm:flex-row gap-3"
								role="search"
								aria-label="Container tracking search"
							>
								<div className="flex-1 relative">
									<label htmlFor="tracking-input" className="sr-only">Container or tracking number</label>
									<Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30 pointer-events-none" aria-hidden="true" />
									<input
										id="tracking-input"
										type="text"
										value={trackingNumber}
										onChange={(e) => setTrackingNumber(e.target.value)}
										placeholder="Enter container number, VIN, or scan QR code"
										autoComplete="off"
										aria-required="true"
										aria-describedby={errorMessage ? 'tracking-error' : undefined}
										className="w-full pl-12 pr-12 py-4 text-base rounded-xl bg-[#F9FAFB] border border-black/[0.06] text-gray-900 placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/30 focus:border-[var(--accent-gold)]/60 transition-all touch-manipulation"
									/>
									<button
										type="button"
										onClick={() => setScannerOpen(true)}
										className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-black/40 hover:text-[var(--accent-gold)] hover:bg-black/5 transition-colors"
										title="Scan Barcode or QR Code"
									>
										<Camera className="w-5 h-5" />
									</button>
								</div>
								<motion.button
									type="submit"
									disabled={isLoading}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.97 }}
									className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gray-900 px-8 py-4 text-sm font-bold text-white sm:w-auto w-full transition-all duration-300 disabled:opacity-60"
									aria-label={isLoading ? 'Tracking shipment' : 'Track shipment'}
								>
									<div className="absolute inset-0 translate-y-full bg-[var(--accent-gold)] transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0" />
									{isLoading ? (
										<span className="relative z-10 flex items-center gap-2">
											<span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
											Tracking…
										</span>
									) : (
										<span className="relative z-10 flex items-center gap-2 group-hover:text-gray-900 transition-colors duration-300">
											<Search className="w-4 h-4" aria-hidden="true" />
											Track Now
											<ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
										</span>
									)}
								</motion.button>
							</form>

							{errorMessage && (
								<motion.div
									id="tracking-error"
									initial={{ opacity: 0, y: -8 }}
									animate={{ opacity: 1, y: 0 }}
									className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-600 mt-4"
								>
									<AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
									<span>{errorMessage}</span>
								</motion.div>
							)}
						</motion.div>
					</motion.div>
				</motion.div>
			</section>

			{/* ── Marquee strip ── */}
			<div className="relative overflow-hidden border-y border-black/[0.04] py-5 bg-[#F9FAFB] [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
				<motion.div
					className="flex items-center gap-16 whitespace-nowrap px-8"
					animate={{ x: [0, -2000] }}
					transition={{ duration: 35, ease: 'linear', repeat: Infinity }}
				>
					{Array.from({ length: 3 }).flatMap((_, gi) =>
						['Container tracking', 'Real-time updates', 'Live route visibility', 'USA → Afghanistan', 'Herat • Kabul • Kandahar'].map((t) => (
							<span key={`${gi}-${t}`} className="flex items-center gap-10">
								<span className="text-sm font-bold uppercase tracking-[0.2em] text-black/20">{t}</span>
								<span className="text-[var(--accent-gold)] text-lg font-serif">+</span>
							</span>
						))
					)}
				</motion.div>
			</div>

			{/* ── Results ── */}
			<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 space-y-12">

				{/* Empty state */}
				{!trackingDetails && !errorMessage && (
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="relative rounded-[2rem] border border-black/[0.05] bg-white p-12 text-center overflow-hidden"
					>
						<div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-[length:40px_40px] opacity-[0.03]" />
						<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(var(--accent-gold-rgb),0.05),transparent)]" />
						<div className="relative z-10">
							<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-black/5 bg-[#F9FAFB]">
								<Ship className="w-9 h-9 text-[var(--accent-gold)]" />
							</div>
							<div className="inline-flex items-center gap-3 justify-center mb-4">
								<span className="h-px w-6 bg-[var(--accent-gold)]" />
								<span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent-gold)]">How it works</span>
								<span className="h-px w-6 bg-[var(--accent-gold)]" />
							</div>
							<h3 className="text-2xl font-extrabold tracking-tight mb-3">Need your tracking number?</h3>
							<p className="text-black/60 font-medium mb-6 max-w-md mx-auto">
								Your container number is found in your booking confirmation email or shipping documents.
							</p>
							<p className="text-sm text-black/40">
								Need help?{' '}
								<a href="/#contact-us" className="text-[var(--accent-gold)] hover:underline font-semibold">Contact our team</a>
							</p>
						</div>
					</motion.div>
				)}

				{/* Tracking Results */}
				{trackingDetails && (
					<div className="space-y-10 landing-reveal">

						{/* Container Details Card */}
						<motion.div
							initial={{ opacity: 0, y: 28 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
							className="relative rounded-[2rem] border border-black/[0.05] bg-white p-8 sm:p-10 overflow-hidden"
						>
							<div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-[length:40px_40px] opacity-[0.025]" />
							<div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-[var(--accent-gold)]/5 blur-[80px]" />

							<div className="relative z-10">
								<div className="inline-flex items-center gap-3 mb-8">
									<span className="h-px w-6 bg-[var(--accent-gold)]" />
									<span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent-gold)]">Container details</span>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
									<div>
										<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 font-mono mb-2">Container</p>
										<p className="text-lg font-extrabold tracking-tight break-all">{trackingDetails.containerNumber}</p>
										{trackingDetails.company?.name && (
											<p className="text-xs text-black/40 mt-1">Carrier: {trackingDetails.company.name}</p>
										)}
									</div>
									<div>
										<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 font-mono mb-2">Status</p>
										<span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 px-4 py-1.5 text-sm font-bold text-[var(--accent-gold)]">
											<span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)]" />
											{trackingDetails.customerTracking?.currentStageLabel || trackingDetails.shipmentStatus || 'In Transit'}
										</span>
										{trackingDetails.customerTracking?.summary && (
											<p className="mt-2 text-sm text-black/60 font-medium">{trackingDetails.customerTracking.summary}</p>
										)}
									</div>
									<div>
										<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 font-mono mb-2">Current location</p>
										<p className="text-sm font-bold text-gray-900">{trackingDetails.currentLocation || '—'}</p>
									</div>
									<div>
										<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 font-mono mb-2">Est. arrival</p>
										<p className="text-sm font-bold text-gray-900">{formatDisplayDate(trackingDetails.estimatedArrival) || '—'}</p>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-black/[0.04]">
									{[
										{ label: 'Origin', value: trackingDetails.origin },
										{ label: 'Destination', value: trackingDetails.destination },
										{ label: 'Container type', value: trackingDetails.containerType },
									].map(({ label, value }) => (
										<div key={label}>
											<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 font-mono mb-1">{label}</p>
											<p className="text-sm font-bold text-gray-900">{value || '—'}</p>
										</div>
									))}
								</div>
							</div>
						</motion.div>

						{/* Interactive Route Map Toggle */}
						{trackingDetails.customerTracking && (
							<div className="flex justify-end">
								<button
									type="button"
									onClick={() => setShowRouteMap((prev) => !prev)}
									className="inline-flex items-center gap-2 rounded-2xl border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 px-5 py-2.5 text-sm font-bold text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/20 transition-all shadow-sm"
								>
									<Ship className="w-4 h-4" />
									<span>{showRouteMap ? 'Hide Route Map' : 'View Interactive Route Map'}</span>
								</button>
							</div>
						)}

						{/* Route Map (Only on demand) */}
						{trackingDetails.customerTracking && showRouteMap && (
							<motion.div
								initial={{ opacity: 0, scale: 0.97 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.4 }}
								className="relative rounded-[2rem] border border-black/[0.05] bg-white p-2 overflow-hidden shadow-lg"
							>
								<TrackingRouteMap
									progressPercent={trackingDetails.customerTracking.progressPercent || progressValue || 0}
									origin={trackingDetails.origin || 'USA'}
									destination={trackingDetails.destination || 'Herat'}
									containerNumber={trackingDetails.containerNumber}
									estimatedArrival={trackingDetails.estimatedArrival}
								/>
							</motion.div>
						)}

						{/* Milestones */}
						<motion.div
							initial={{ opacity: 0, y: 24 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
						>
							<div className="inline-flex items-center gap-3 mb-8">
								<span className="h-px w-6 bg-[var(--accent-gold)]" />
								<span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent-gold)]">Milestone updates</span>
							</div>

							<h2 className="text-3xl font-extrabold tracking-tight mb-6">
								Live Status &{' '}
								<span className="text-black/40 italic font-serif font-light">Journey</span>
							</h2>

							<div className="space-y-4">
								{customerMilestones.length === 0 && (
									<div className="rounded-[1.5rem] border border-black/[0.05] bg-white px-8 py-6 text-sm text-black/50 font-medium">
										No shipment milestones available yet.
									</div>
								)}
								{customerMilestones.map((milestone, idx) => {
									const Icon = milestone.state === 'complete'
										? CheckCircle2
										: milestone.state === 'current'
										? Package
										: Clock;
									const isComplete = milestone.state === 'complete';
									const isCurrent = milestone.state === 'current';
									return (
										<motion.div
											key={milestone.key}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ duration: 0.4, delay: 0.05 * idx }}
											className={`group relative rounded-[1.5rem] border p-6 sm:p-8 transition-all duration-300 overflow-hidden ${
												isCurrent
													? 'border-[var(--accent-gold)]/30 bg-white shadow-[0_8px_30px_rgba(var(--accent-gold-rgb),0.08)]'
													: 'border-black/[0.05] bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
											}`}
										>
											{isCurrent && (
												<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent-gold)]/5 to-transparent" />
											)}
											<div className="relative z-10 flex flex-col gap-3">
												<div className="flex items-center gap-4">
													<div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${
														isComplete ? 'bg-green-50 border border-green-500/20'
														: isCurrent ? 'bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30'
														: 'bg-[#F9FAFB] border border-black/[0.06]'
													}`}>
														<Icon className={`w-5 h-5 ${
															isComplete ? 'text-green-500'
															: isCurrent ? 'text-[var(--accent-gold)]'
															: 'text-black/30'
														}`} />
													</div>
													<div className="flex-1 min-w-0">
														<h3 className="text-base font-extrabold tracking-tight">{milestone.label}</h3>
														{isCurrent && (
															<span className="inline-flex items-center gap-1.5 mt-0.5">
																<span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)] animate-pulse" />
																<span className="text-xs font-mono uppercase tracking-widest text-[var(--accent-gold)]">Active</span>
															</span>
														)}
													</div>
													<div className="flex-shrink-0 text-right">
														<p className="text-xs text-black/40 font-mono">
															{formatDisplayDate(milestone.timestamp) || (milestone.state === 'pending' ? 'Pending' : 'Updated')}
														</p>
													</div>
												</div>
												<p className="text-sm text-black/60 font-medium pl-14">{milestone.description}</p>
												{isCurrent && trackingDetails.currentLocation && (
													<p className="text-sm text-[var(--accent-gold)] font-bold pl-14 inline-flex items-center gap-1.5">
														<MapPin className="w-4 h-4" />
														{trackingDetails.currentLocation}
													</p>
												)}
											</div>
										</motion.div>
									);
								})}
							</div>
						</motion.div>

						{/* CTA strip */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.3 }}
							className="relative rounded-[2rem] border border-black/[0.05] bg-gray-900 p-8 sm:p-10 overflow-hidden text-white"
						>
							<div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-[length:40px_40px] opacity-[0.04]" />
							<div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-[var(--accent-gold)]/10 blur-[80px]" />
							<div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
								<div>
									<div className="inline-flex items-center gap-3 mb-3">
										<span className="h-px w-6 bg-[var(--accent-gold)]" />
										<span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent-gold)]">Questions?</span>
									</div>
									<h3 className="text-xl font-extrabold tracking-tight">Need help with your shipment?</h3>
									<p className="text-white/60 text-sm font-medium mt-1">Our team is available to assist you at every step.</p>
								</div>
								<Link
									href="/#contact-us"
									className="group relative inline-flex h-12 items-center justify-center gap-3 overflow-hidden rounded-full bg-white px-7 font-bold text-gray-900 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(255,255,255,0.2)] flex-shrink-0"
								>
									<div className="absolute inset-0 translate-y-full bg-[var(--accent-gold)] transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0" />
									<span className="relative z-10 transition-colors duration-500 group-hover:text-gray-900">Contact us</span>
									<ArrowRight className="relative z-10 w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
								</Link>
							</div>
						</motion.div>
					</div>
				)}
			</div>

			<Footer />

			<BarcodeScannerModal
				open={scannerOpen}
				onClose={() => setScannerOpen(false)}
				onScan={(scanned) => {
					setScannerOpen(false);
					setTrackingNumber(scanned);
					handleTrack(scanned);
				}}
				title="Scan Shipment or Container QR Code"
				description="Align vehicle VIN barcode, thermal yard sticker, or container QR code within the frame"
			/>
		</div>
	);
}

