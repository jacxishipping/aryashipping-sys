/**
 * Tracking integration service.
 * Fetches container tracking history by first querying the new ContainerTracking Supabase API,
 * and seamlessly falling back to the legacy PGL endpoint if no data is found.
 */

import { logger } from '@/lib/logger';
import { containerTrackingClient, type SupabaseTrackingData } from '@/lib/services/container-tracking-client';

const PGL_TRACKING_ENDPOINT = 'https://api.pglsystem.com/api/public/tracking';

// In-memory TTL cache for lookups to speed up repeated queries
const TRACKING_CACHE_TTL_MS = 5 * 60 * 1000;
const trackingCache = new Map<string, { snapshot: ContainerTrackingSnapshot; expiresAt: number }>();

export interface ExternalTrackingEvent {
	status: string;
	location: string;
	timestamp: string;
	description?: string;
	vesselName?: string;
	voyageNumber?: string;
	latitude?: number;
	longitude?: number;
	completed?: boolean;
}

export interface ContainerTrackingSnapshot {
	containerNumber: string;
	trackingNumber: string;
	bookingNumber?: string;
	vesselName?: string;
	voyageNumber?: string;
	shippingLine?: string;
	loadingPort?: string;
	destinationPort?: string;
	loadingDate?: string;
	departureDate?: string;
	estimatedArrival?: string;
	containerType?: string;
	status?: string;
	trackingEvents: Array<{
		status: string;
		location?: string;
		vesselName?: string;
		description?: string;
		eventDate: string;
		completed: boolean;
		source: 'API';
	}>;
	progress: number;
	currentLocation?: string;
}

interface PGLTrackingResponse {
	result?: boolean;
	type?: string;
	data?: PGLTrackingEntry[];
}

interface PGLTrackingEntry {
	status?: string | null;
	container_id?: number;
	created_at?: string | null;
	containers?: {
		company_id?: number;
		container_number?: string | null;
		cover_photo?: string | null;
		photo_link?: string | null;
		vehicles?: Array<{
			pol_locations?: {
				name?: string | null;
			} | null;
		}>;
		bookings?: {
			booking_number?: string | null;
			eta?: string | null;
			destinations?: {
				name?: string | null;
			} | null;
			vessels?: {
				etd?: string | null;
				name?: string | null;
				vessel?: string | null;
				voyage?: string | null;
				voyage_number?: string | null;
			} | null;
		} | null;
	};
}

export class TrackingAPIService {
	/**
	 * Fetch tracking data as normalized tracking events.
	 * Tries Supabase first, then falls back to PGL.
	 */
	async fetchTrackingData(
		trackingNumber: string,
		_shippingLine?: string
	): Promise<ExternalTrackingEvent[]> {
		try {
			const snapshot = await this.fetchContainerTrackingData(trackingNumber);
			if (!snapshot) {
				return [];
			}

			return snapshot.trackingEvents.map((ev) => ({
				status: ev.status,
				location: ev.location || 'Unknown',
				timestamp: ev.eventDate,
				description: ev.description,
				vesselName: ev.vesselName || snapshot.vesselName,
				voyageNumber: snapshot.voyageNumber,
				completed: ev.completed,
			}));
		} catch (error) {
			logger.error('Error fetching tracking data:', error);
			return [];
		}
	}

	/**
	 * Fetch full tracking data for a container.
	 * Strategy:
	 * 1. Query the new ContainerTracking Supabase URL backend.
	 * 2. If no data / error, fallback to legacy PGL API.
	 */
	async fetchContainerTrackingData(
		containerNumber: string
	): Promise<ContainerTrackingSnapshot | null> {
		try {
			const normalizedContainerNumber = containerNumber.trim().toUpperCase();

			// Check in-memory cache
			const cached = trackingCache.get(normalizedContainerNumber);
			if (cached && cached.expiresAt > Date.now()) {
				return cached.snapshot;
			}

			// 1. PRIMARY: Try the new Supabase Tracking URL backend
			try {
				const supabaseData = await containerTrackingClient.fetchContainerTracking(normalizedContainerNumber);
				if (
					supabaseData &&
					(Boolean(supabaseData.events?.length) || Boolean(supabaseData.pol) || Boolean(supabaseData.pod))
				) {
					logger.info(`Container tracking data retrieved via Supabase for ${normalizedContainerNumber}`);
					const snapshot = this.buildSnapshotFromSupabaseData(normalizedContainerNumber, supabaseData);
					trackingCache.set(normalizedContainerNumber, {
						snapshot,
						expiresAt: Date.now() + TRACKING_CACHE_TTL_MS,
					});
					return snapshot;
				}
			} catch (supabaseError) {
				logger.warn(`Supabase tracking lookup failed for ${normalizedContainerNumber}, attempting PGL fallback:`, supabaseError);
			}

			// 2. FALLBACK: Query legacy PGL endpoint if Supabase didn't have data
			logger.info(`Supabase returned no tracking for ${normalizedContainerNumber}. Falling back to legacy PGL tracking URL...`);
			const pglEntries = await this.fetchPGLEntries(normalizedContainerNumber);
			if (pglEntries.length > 0) {
				logger.info(`Container tracking data retrieved via legacy PGL for ${normalizedContainerNumber}`);
				const snapshot = this.buildSnapshotFromPGLEntries(normalizedContainerNumber, pglEntries);
				trackingCache.set(normalizedContainerNumber, {
					snapshot,
					expiresAt: Date.now() + TRACKING_CACHE_TTL_MS,
				});
				return snapshot;
			}

			logger.info(`No tracking data found in either Supabase or legacy PGL for container: ${normalizedContainerNumber}`);
			return null;
		} catch (error) {
			logger.error('Error fetching container tracking data:', error);
			return null;
		}
	}

	/**
	 * Transform Supabase tracking payload into normalized ContainerTrackingSnapshot
	 */
	private buildSnapshotFromSupabaseData(
		normalizedContainerNumber: string,
		data: SupabaseTrackingData
	): ContainerTrackingSnapshot {
		const pol = data.pol || {};
		const pod = data.pod || {};
		const rawEvents = data.events || [];

		let vesselName: string | undefined = undefined;
		let voyageNumber: string | undefined = undefined;

		for (const ev of rawEvents) {
			if (ev.mode?.vessel?.vessel_name && !vesselName) {
				vesselName = ev.mode.vessel.vessel_name;
			}
			if (ev.mode?.vessel?.voyage_nr && !voyageNumber) {
				voyageNumber = ev.mode.vessel.voyage_nr;
			}
		}

		const loadingPort = [pol.port, pol.country].filter(Boolean).join(', ') || undefined;
		const destinationPort = [pod.port, pod.country].filter(Boolean).join(', ') || undefined;

		const trackingEvents = rawEvents.map((ev) => {
			const locStr = [ev.location?.port, ev.location?.country].filter(Boolean).join(', ') || undefined;
			const rawStatus = ev.action?.action_name || 'Carrier Event';
			const normalizedStatus = this.normalizeStatus(rawStatus);

			return {
				status: normalizedStatus,
				location: locStr || (ev.event_type === 'expected' ? destinationPort : loadingPort),
				vesselName: ev.mode?.vessel?.vessel_name || vesselName,
				description: ev.event_type === 'expected' ? 'Estimated Milestone' : 'Actual Carrier Event',
				eventDate: ev.event_date ? new Date(ev.event_date).toISOString() : new Date().toISOString(),
				completed: ev.event_type === 'actual',
				source: 'API' as const,
			};
		});

		// Sort events chronologically descending
		trackingEvents.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

		const latestEvent = trackingEvents[0];
		const latestStatus = latestEvent?.status;
		const isCompleted = Boolean(data.container?.completed);

		return {
			containerNumber: data.container?.number || normalizedContainerNumber,
			trackingNumber: data.container?.number || normalizedContainerNumber,
			bookingNumber: undefined,
			vesselName,
			voyageNumber,
			shippingLine: data.scac || undefined,
			loadingPort,
			destinationPort,
			loadingDate: pol.etd_date ? new Date(pol.etd_date).toISOString() : undefined,
			departureDate: pol.etd_date ? new Date(pol.etd_date).toISOString() : undefined,
			estimatedArrival: pod.eta_date ? new Date(pod.eta_date).toISOString() : undefined,
			containerType: data.container?.type || undefined,
			status: isCompleted ? 'Delivered' : latestStatus,
			trackingEvents,
			progress: isCompleted ? 100 : this.calculateProgressFromStatus(latestStatus),
			currentLocation: latestEvent?.location || loadingPort || destinationPort || undefined,
		};
	}

	/**
	 * Get estimated arrival from tracking data.
	 */
	async getEstimatedArrival(trackingNumber: string): Promise<Date | null> {
		try {
			const snapshot = await this.fetchContainerTrackingData(trackingNumber);
			if (!snapshot?.estimatedArrival) {
				return null;
			}

			const date = new Date(snapshot.estimatedArrival);
			return Number.isNaN(date.getTime()) ? null : date;
		} catch (error) {
			logger.error('Error fetching ETA:', error);
			return null;
		}
	}

	/**
	 * Transform PGL tracking history to our normalized event format.
	 */
	private transformEntriesToEvents(entries: PGLTrackingEntry[]): ExternalTrackingEvent[] {
		try {
			return entries
				.map((entry) => {
					const rawStatus = entry.status || undefined;
					const status = this.normalizeStatus(rawStatus);
					const location = this.getEventLocation(entry, rawStatus);
					const vesselName = this.getVesselName(entry);
					const voyageNumber = this.getVoyageNumber(entry);
					const bookingNumber = entry.containers?.bookings?.booking_number;
					const descriptionParts = [
						bookingNumber ? `Booking: ${bookingNumber}` : null,
						voyageNumber ? `Voyage: ${voyageNumber}` : null,
						rawStatus ? `Source status: ${rawStatus}` : null,
					].filter(Boolean);

					return {
						status,
						location: location || 'Unknown',
						timestamp: this.toIsoString(entry.created_at) || new Date().toISOString(),
						description: descriptionParts.length > 0 ? descriptionParts.join(' • ') : undefined,
						vesselName: vesselName || undefined,
						voyageNumber: voyageNumber || undefined,
						latitude: undefined,
						longitude: undefined,
						completed: true,
					};
				})
				.filter((event) => event.status !== 'Status Update');
		} catch (error) {
			logger.error('Error transforming PGL response:', error);
			return [];
		}
	}

	private buildSnapshotFromPGLEntries(
		normalizedContainerNumber: string,
		entries: PGLTrackingEntry[]
	): ContainerTrackingSnapshot {
		const trackingEvents = this.transformEntriesToEvents(entries).map((event) => ({
			status: event.status,
			location: event.location || undefined,
			vesselName: event.vesselName || undefined,
			description: event.description || undefined,
			eventDate: event.timestamp,
			completed: Boolean(event.completed),
			source: 'API' as const,
		}));

		const latestEntry = entries[0];
		const metadata = latestEntry.containers;
		const booking = metadata?.bookings;
		const loadingPort = this.getLoadingPort(latestEntry);
		const destinationPort = this.getDestinationPort(latestEntry);
		const latestEvent = trackingEvents[0];
		const latestStatus = latestEvent?.status;

		return {
			containerNumber: metadata?.container_number || normalizedContainerNumber,
			trackingNumber: metadata?.container_number || normalizedContainerNumber,
			bookingNumber: booking?.booking_number || undefined,
			vesselName: this.getVesselName(latestEntry),
			voyageNumber: this.getVoyageNumber(latestEntry),
			shippingLine: undefined,
			loadingPort: loadingPort || undefined,
			destinationPort: destinationPort || undefined,
			loadingDate: this.findEventTimestamp(entries, ['at_loading', 'loaded']) || undefined,
			departureDate:
				this.toIsoString(booking?.vessels?.etd) ||
				this.findEventTimestamp(entries, ['depart', 'on_board', 'in_transit']) ||
				undefined,
			estimatedArrival: this.toIsoString(booking?.eta) || undefined,
			containerType: undefined,
			status: latestStatus,
			trackingEvents,
			progress: this.calculateProgressFromStatus(latestStatus),
			currentLocation: latestEvent?.location || loadingPort || undefined,
		};
	}

	private async fetchPGLEntries(containerNumber: string): Promise<PGLTrackingEntry[]> {
		const normalizedContainerNumber = containerNumber.trim().toUpperCase();
		const url = `${PGL_TRACKING_ENDPOINT}?tracking_value=${encodeURIComponent(normalizedContainerNumber)}`;

		try {
			const response = await fetch(url, {
				cache: 'no-store',
				headers: {
					Accept: 'application/json',
				},
			});

			if (!response.ok) {
				logger.error('PGL tracking API error:', response.status);
				return [];
			}

			const payload = (await response.json()) as PGLTrackingResponse;
			if (!payload?.result || !Array.isArray(payload.data) || payload.data.length === 0) {
				return [];
			}

			return payload.data
				.slice()
				.sort((left, right) => this.getTimestamp(right.created_at) - this.getTimestamp(left.created_at));
		} catch (err) {
			logger.error('PGL fetch request failed:', err);
			return [];
		}
	}

	private normalizeStatus(status?: string | null): string {
		const rawStatus = status?.trim().toLowerCase();
		if (!rawStatus) {
			return 'Status Update';
		}

		const statusMap: Record<string, string> = {
			pending: 'Container Booked',
			at_loading: 'Loaded at Origin',
			loaded: 'Loaded at Origin',
			at_the_dock: 'At Origin Dock',
			on_board: 'In Transit - Ocean',
			in_transit: 'In Transit - Ocean',
			at_sea: 'In Transit - Ocean',
			transshipment: 'Transshipment',
			arrived_destination: 'Arrived at Destination Port',
			arrived_at_destination: 'Arrived at Destination Port',
			customs_clearance: 'Customs Clearance',
			released_from_customs: 'Released from Customs',
			out_for_delivery: 'Out for Delivery',
			delivered: 'Delivered',
		};

		if (statusMap[rawStatus]) {
			return statusMap[rawStatus];
		}

		return rawStatus
			.split('_')
			.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
			.join(' ');
	}

	private getLoadingPort(entry: PGLTrackingEntry): string | undefined {
		return entry.containers?.vehicles?.find((vehicle) => vehicle.pol_locations?.name)?.pol_locations?.name || undefined;
	}

	private getDestinationPort(entry: PGLTrackingEntry): string | undefined {
		return entry.containers?.bookings?.destinations?.name || undefined;
	}

	private getVesselName(entry: PGLTrackingEntry): string | undefined {
		return entry.containers?.bookings?.vessels?.name || entry.containers?.bookings?.vessels?.vessel || undefined;
	}

	private getVoyageNumber(entry: PGLTrackingEntry): string | undefined {
		return entry.containers?.bookings?.vessels?.voyage_number || entry.containers?.bookings?.vessels?.voyage || undefined;
	}

	private getEventLocation(entry: PGLTrackingEntry, rawStatus?: string | null): string | undefined {
		const status = rawStatus?.toLowerCase() || '';
		const loadingPort = this.getLoadingPort(entry);
		const destinationPort = this.getDestinationPort(entry);

		if (
			status.includes('destination') ||
			status.includes('deliver') ||
			status.includes('customs') ||
			status.includes('release') ||
			status.includes('arrived') ||
			status.includes('discharge')
		) {
			return destinationPort || loadingPort;
		}

		return loadingPort || destinationPort;
	}

	private findEventTimestamp(entries: PGLTrackingEntry[], patterns: string[]): string | undefined {
		const match = entries
			.slice()
			.reverse()
			.find((entry) => {
				const status = entry.status?.toLowerCase() || '';
				return patterns.some((pattern) => status.includes(pattern));
			});

		return this.toIsoString(match?.created_at);
	}

	private calculateProgressFromStatus(status?: string): number {
		const normalizedStatus = status?.toLowerCase() || '';

		if (normalizedStatus.includes('booked')) return 10;
		if (normalizedStatus.includes('loading')) return 25;
		if (normalizedStatus.includes('loaded')) return 30;
		if (normalizedStatus.includes('dock')) return 35;
		if (normalizedStatus.includes('depart')) return 40;
		if (normalizedStatus.includes('transit') || normalizedStatus.includes('ocean')) return 60;
		if (normalizedStatus.includes('arrived')) return 75;
		if (normalizedStatus.includes('customs')) return 85;
		if (normalizedStatus.includes('released') || normalizedStatus.includes('cleared')) return 90;
		if (normalizedStatus.includes('delivery')) return 95;
		if (normalizedStatus.includes('delivered')) return 100;

		return 50;
	}

	private toIsoString(value?: string | null): string | undefined {
		if (!value) {
			return undefined;
		}

		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
	}

	private getTimestamp(value?: string | null): number {
		if (!value) {
			return 0;
		}

		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? 0 : date.getTime();
	}
}

// Singleton instance
export const trackingAPI = new TrackingAPIService();

