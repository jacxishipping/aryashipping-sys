import { prisma } from '@/lib/db';
import { buildCustomerTrackingView, type CustomerTrackingView } from '@/lib/customer-tracking';
import { trackingAPI, type ContainerTrackingSnapshot } from '@/lib/services/tracking-api';

export type NormalizedTrackingEvent = {
  id: string;
  status: string;
  statusCode?: string;
  location?: string;
  terminal?: string;
  timestamp?: string;
  actual: boolean;
  vessel?: string;
  voyage?: string;
  description?: string;
};

export type NormalizedTracking = {
  containerNumber: string;
  isContainerAssigned?: boolean;
  containerType?: string;
  shipmentStatus?: string;
  origin?: string;
  originDate?: string;
  pol?: string;
  polDate?: string;
  destination?: string;
  destinationDate?: string;
  pod?: string;
  podDate?: string;
  estimatedDeparture?: string;
  estimatedArrival?: string;
  company?: { name?: string; url?: string | null; scacs?: string[] };
  currentLocation?: string;
  lastUpdated?: string;
  progress?: number | null;
  customerTracking?: CustomerTrackingView;
  requestedNumber: string;
  events: NormalizedTrackingEvent[];
};

import { sanitizeTrackNumber } from '@/lib/tracking-sanitize';
export { sanitizeTrackNumber };

async function getInternalTrackingSnapshot(containerIdOrNumber: string) {
  const container = await prisma.container.findFirst({
    where: {
      OR: [
        { containerNumber: containerIdOrNumber },
        { trackingNumber: containerIdOrNumber },
        { id: containerIdOrNumber },
      ],
    },
    select: {
      status: true,
      loadingDate: true,
      departureDate: true,
      actualArrival: true,
      shipments: {
        select: {
          status: true,
          dispatchId: true,
          transitId: true,
          dispatch: { select: { dispatchDate: true } },
          transit: { select: { dispatchDate: true, actualDelivery: true } },
        },
      },
    },
  });

  if (!container) {
    return null;
  }

  const dispatchDates = sortIsoStrings(
    container.shipments.map((s) => (s.dispatch?.dispatchDate ? s.dispatch.dispatchDate.toISOString() : undefined))
  );
  const transitDispatchDates = sortIsoStrings(
    container.shipments.map((s) => (s.transit?.dispatchDate ? s.transit.dispatchDate.toISOString() : undefined))
  );
  const deliveryDates = sortIsoStrings(
    container.shipments.map((s) => (s.transit?.actualDelivery ? s.transit.actualDelivery.toISOString() : undefined))
  );

  return {
    shipmentStatuses: container.shipments.map((s) => s.status),
    hasDispatch: container.shipments.some((s) => Boolean(s.dispatchId)),
    hasTransit: container.shipments.some((s) => Boolean(s.transitId)),
    containerStatus: container.status,
    dispatchDate: dispatchDates[0],
    loadingDate: container.loadingDate?.toISOString(),
    departureDate: container.departureDate?.toISOString(),
    actualArrival: container.actualArrival?.toISOString(),
    transitDispatchDate: transitDispatchDates[0],
    actualDelivery: deliveryDates[deliveryDates.length - 1],
  };
}

function sortIsoStrings(values: Array<string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right));
}

function normalizeTrackingFromSnapshot(
  snapshot: ContainerTrackingSnapshot
): Omit<NormalizedTracking, 'customerTracking' | 'requestedNumber'> {
  const events = snapshot.trackingEvents.map((event, index) => ({
    id: `${snapshot.containerNumber}-${index}`,
    status: event.status,
    statusCode: undefined,
    location: event.location,
    terminal: undefined,
    timestamp: event.eventDate,
    actual: event.completed,
    vessel: event.vesselName,
    voyage: snapshot.voyageNumber,
    description: event.description,
  }));

  return {
    containerNumber: snapshot.containerNumber,
    containerType: snapshot.containerType,
    shipmentStatus: snapshot.status,
    origin: snapshot.loadingPort,
    originDate: snapshot.loadingDate,
    pol: snapshot.loadingPort,
    polDate: snapshot.departureDate || snapshot.loadingDate,
    destination: snapshot.destinationPort,
    destinationDate: snapshot.estimatedArrival,
    pod: snapshot.destinationPort,
    podDate: snapshot.estimatedArrival,
    estimatedDeparture: snapshot.departureDate,
    estimatedArrival: snapshot.estimatedArrival,
    company: snapshot.shippingLine
      ? {
          name: snapshot.shippingLine,
          url: null,
          scacs: undefined,
        }
      : undefined,
    currentLocation: snapshot.currentLocation || snapshot.loadingPort,
    lastUpdated: events[0]?.timestamp,
    progress: snapshot.progress,
    events,
  };
}

/**
 * Universal tracking resolver:
 * Handles VINs, Shipment IDs, Lot Numbers, and Container Numbers with seamless fallback.
 */
export async function buildTrackingResponse(
  rawTrackNumber: string
): Promise<NormalizedTracking | null> {
  const requestedNumber = sanitizeTrackNumber(rawTrackNumber);
  if (!requestedNumber) {
    return null;
  }

  // 1. Try finding a shipment by VIN, ID, or Lot Number in our database
  const shipment = await prisma.shipment.findFirst({
    where: {
      OR: [
        { vehicleVIN: { equals: requestedNumber, mode: 'insensitive' } },
        { id: requestedNumber },
        { id: requestedNumber.toLowerCase() },
        { lotNumber: { equals: requestedNumber, mode: 'insensitive' } },
      ],
    },
    include: {
      container: {
        include: {
          company: true,
          trackingEvents: { orderBy: { eventDate: 'desc' } },
        },
      },
      dispatch: {
        include: {
          company: true,
        },
      },
      transit: {
        include: {
          company: true,
        },
      },
      user: {
        select: { name: true },
      },
    },
  });

  if (shipment) {
    const vehicleLabel =
      [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') ||
      shipment.vehicleType ||
      'Vehicle';

    // If shipment is loaded in a container
    if (shipment.container) {
      const containerNumber = shipment.container.containerNumber;

      // Try fetching live PGL tracking for the container
      const pglSnapshot = await trackingAPI.fetchContainerTrackingData(containerNumber);
      if (pglSnapshot) {
        const normalized = normalizeTrackingFromSnapshot(pglSnapshot);
        const internalSnapshot = await getInternalTrackingSnapshot(containerNumber);
        const customerTracking = buildCustomerTrackingView({
          shipmentStatus: shipment.status,
          originDate: normalized.originDate,
          polDate: normalized.polDate,
          podDate: normalized.podDate,
          estimatedArrival: normalized.estimatedArrival,
          events: normalized.events,
          internal: internalSnapshot,
        });

        return {
          ...normalized,
          isContainerAssigned: true,
          containerType: `${vehicleLabel} (VIN: ${shipment.vehicleVIN || 'N/A'})`,
          shipmentStatus: shipment.status,
          customerTracking,
          requestedNumber,
        };
      }

      // If PGL tracking unavailable, build from database container record
      const containerEvents: NormalizedTrackingEvent[] = (
        shipment.container.trackingEvents || []
      ).map((e, idx) => ({
        id: e.id || `event-${idx}`,
        status: e.status,
        location: e.location || shipment.container?.currentLocation || undefined,
        timestamp: e.eventDate.toISOString(),
        actual: e.completed,
        vessel: shipment.container?.vesselName || undefined,
        voyage: shipment.container?.voyageNumber || undefined,
        description: e.description || undefined,
      }));

      const internalSnapshot = await getInternalTrackingSnapshot(shipment.container.id);
      const customerTracking = buildCustomerTrackingView({
        shipmentStatus: shipment.status,
        originDate: shipment.container.loadingDate?.toISOString(),
        polDate: shipment.container.departureDate?.toISOString(),
        podDate: shipment.container.estimatedArrival?.toISOString(),
        estimatedArrival: shipment.container.estimatedArrival?.toISOString(),
        events: containerEvents,
        internal: internalSnapshot,
      });

      return {
        containerNumber: shipment.container.containerNumber,
        isContainerAssigned: true,
        containerType: `${vehicleLabel} (VIN: ${shipment.vehicleVIN || 'N/A'})`,
        shipmentStatus: shipment.status,
        origin: shipment.container.loadingPort || shipment.dispatch?.origin || 'Export Port',
        originDate: shipment.container.loadingDate?.toISOString(),
        pol: shipment.container.loadingPort || undefined,
        polDate: shipment.container.departureDate?.toISOString(),
        destination: shipment.container.destinationPort || 'Destination Port',
        destinationDate: shipment.container.estimatedArrival?.toISOString(),
        pod: shipment.container.destinationPort || undefined,
        podDate: shipment.container.estimatedArrival?.toISOString(),
        estimatedDeparture: shipment.container.departureDate?.toISOString(),
        estimatedArrival: shipment.container.estimatedArrival?.toISOString(),
        company: shipment.container.shippingLine
          ? { name: shipment.container.shippingLine }
          : shipment.container.company
            ? { name: shipment.container.company.name }
            : undefined,
        currentLocation:
          shipment.container.currentLocation ||
          shipment.container.destinationPort ||
          shipment.container.loadingPort ||
          undefined,
        progress: shipment.container.progress ?? (shipment.status === 'DELIVERED' ? 100 : 50),
        customerTracking,
        requestedNumber,
        events: containerEvents,
      };
    }

    // Shipment NOT yet in a container (Inland Dispatch / Received at Yard)
    const synthesizedEvents: NormalizedTrackingEvent[] = [
      {
        id: `shipment-created-${shipment.id}`,
        status: 'Shipment Booked',
        location: shipment.purchaseLocation || 'USA Hub',
        timestamp: shipment.createdAt.toISOString(),
        actual: true,
        description: `Booking confirmed for ${vehicleLabel}`,
      },
    ];

    if (shipment.dispatch) {
      synthesizedEvents.push({
        id: `dispatch-${shipment.dispatch.id}`,
        status: 'Inland Transport Dispatched',
        location: shipment.dispatch.origin,
        timestamp: shipment.dispatch.createdAt.toISOString(),
        actual: true,
        description: `Dispatched with carrier ${shipment.dispatch.company?.name || 'Inland Towing'}`,
      });
    }

    if (shipment.status === 'ON_HAND') {
      synthesizedEvents.push({
        id: `yard-onhand-${shipment.id}`,
        status: 'Received at Export Yard Terminal',
        location: 'Savannah / NY Port Terminal',
        timestamp: shipment.updatedAt.toISOString(),
        actual: true,
        description: 'Vehicle received, condition inspected, and queued for container loading',
      });
    }

    synthesizedEvents.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    const internalSnapshot = {
      shipmentStatuses: [shipment.status],
      hasDispatch: Boolean(shipment.dispatchId),
      hasTransit: Boolean(shipment.transitId),
      containerStatus: null,
      loadingDate: undefined,
      departureDate: undefined,
      actualArrival: undefined,
      actualDelivery: undefined,
    };

    const customerTracking = buildCustomerTrackingView({
      shipmentStatus: shipment.status,
      originDate: shipment.createdAt.toISOString(),
      polDate: undefined,
      podDate: undefined,
      estimatedArrival: undefined,
      events: synthesizedEvents,
      internal: internalSnapshot,
    });

    return {
      containerNumber: 'Unassigned',
      isContainerAssigned: false,
      containerType: `${vehicleLabel} (VIN: ${shipment.vehicleVIN || 'N/A'})`,
      shipmentStatus: shipment.status,
      origin: shipment.dispatch?.origin || shipment.purchaseLocation || 'Export Terminal / Yard',
      originDate: shipment.createdAt.toISOString(),
      destination: 'Destination Port (Pending Container Assignment)',
      currentLocation:
        shipment.status === 'ON_HAND'
          ? 'Export Yard Terminal'
          : shipment.dispatch?.origin || 'Inland Transit',
      progress: shipment.status === 'ON_HAND' ? 30 : 15,
      customerTracking,
      requestedNumber,
      events: synthesizedEvents,
    };
  }

  // 2. Check Database Container
  const dbContainer = await prisma.container.findFirst({
    where: {
      OR: [
        { containerNumber: { equals: requestedNumber, mode: 'insensitive' } },
        { trackingNumber: { equals: requestedNumber, mode: 'insensitive' } },
        { bookingNumber: { equals: requestedNumber, mode: 'insensitive' } },
        { id: requestedNumber },
      ],
    },
    include: {
      company: true,
      trackingEvents: { orderBy: { eventDate: 'desc' } },
      shipments: {
        select: {
          id: true,
          vehicleYear: true,
          vehicleMake: true,
          vehicleModel: true,
          vehicleVIN: true,
          status: true,
        },
      },
    },
  });

  // 3. Try PGL upstream API lookup
  const pglContainerNumber = dbContainer?.containerNumber || requestedNumber;
  const pglSnapshot = await trackingAPI.fetchContainerTrackingData(pglContainerNumber);

  if (pglSnapshot) {
    const normalized = normalizeTrackingFromSnapshot(pglSnapshot);
    const internalSnapshot = await getInternalTrackingSnapshot(pglContainerNumber);
    const customerTracking = buildCustomerTrackingView({
      shipmentStatus: normalized.shipmentStatus,
      originDate: normalized.originDate,
      polDate: normalized.polDate,
      podDate: normalized.podDate,
      estimatedArrival: normalized.estimatedArrival,
      events: normalized.events,
      internal: internalSnapshot,
    });

    return {
      ...normalized,
      customerTracking,
      requestedNumber,
    };
  }

  // 4. Fallback to database container if PGL has no records
  if (dbContainer) {
    const containerEvents: NormalizedTrackingEvent[] = (dbContainer.trackingEvents || []).map(
      (e, idx) => ({
        id: e.id || `event-${idx}`,
        status: e.status,
        location: e.location || dbContainer.currentLocation || undefined,
        timestamp: e.eventDate.toISOString(),
        actual: e.completed,
        vessel: dbContainer.vesselName || undefined,
        voyage: dbContainer.voyageNumber || undefined,
        description: e.description || undefined,
      })
    );

    const internalSnapshot = await getInternalTrackingSnapshot(dbContainer.id);
    const customerTracking = buildCustomerTrackingView({
      shipmentStatus: dbContainer.status,
      originDate: dbContainer.loadingDate?.toISOString(),
      polDate: dbContainer.departureDate?.toISOString(),
      podDate: dbContainer.estimatedArrival?.toISOString(),
      estimatedArrival: dbContainer.estimatedArrival?.toISOString(),
      events: containerEvents,
      internal: internalSnapshot,
    });

    return {
      containerNumber: dbContainer.containerNumber,
      containerType: 'Ocean Freight Container',
      shipmentStatus: dbContainer.status,
      origin: dbContainer.loadingPort || 'Export Port',
      originDate: dbContainer.loadingDate?.toISOString(),
      pol: dbContainer.loadingPort || undefined,
      polDate: dbContainer.departureDate?.toISOString(),
      destination: dbContainer.destinationPort || 'Destination Port',
      destinationDate: dbContainer.estimatedArrival?.toISOString(),
      pod: dbContainer.destinationPort || undefined,
      podDate: dbContainer.estimatedArrival?.toISOString(),
      estimatedDeparture: dbContainer.departureDate?.toISOString(),
      estimatedArrival: dbContainer.estimatedArrival?.toISOString(),
      company: dbContainer.shippingLine
        ? { name: dbContainer.shippingLine }
        : dbContainer.company
          ? { name: dbContainer.company.name }
          : undefined,
      currentLocation:
        dbContainer.currentLocation ||
        dbContainer.destinationPort ||
        dbContainer.loadingPort ||
        undefined,
      progress: dbContainer.progress ?? 50,
      customerTracking,
      requestedNumber,
      events: containerEvents,
    };
  }

  return null;
}