import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { buildMaritimeRoute, generateVesselAISTelemetry } from '@/lib/maritime/sea-routes';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const container = await prisma.container.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        containerNumber: true,
        trackingNumber: true,
        vesselName: true,
        voyageNumber: true,
        shippingLine: true,
        loadingPort: true,
        destinationPort: true,
        departureDate: true,
        estimatedArrival: true,
        actualArrival: true,
        status: true,
        currentLocation: true,
        progress: true,
        trackingEvents: {
          orderBy: { eventDate: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            location: true,
            vesselName: true,
            eventDate: true,
            latitude: true,
            longitude: true,
            completed: true,
          },
        },
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    const origin = container.loadingPort || container.shippingLine || 'Port of Newark (USNWK)';
    const destination = container.destinationPort || 'Port of Jebel Ali (AEJEA)';
    const vesselName = container.vesselName || 'MAERSK VOYAGER';
    const voyageNumber = container.voyageNumber || container.trackingNumber || 'V-2409W';
    const progress = container.progress ?? 68;

    const routeAnalysis = buildMaritimeRoute(
      origin,
      destination,
      progress,
      container.departureDate,
      container.estimatedArrival
    );

    // If real GPS coordinates exist on the latest tracking event, reflect them
    const latestEventWithCoords = container.trackingEvents.find(
      (e) => typeof e.latitude === 'number' && typeof e.longitude === 'number'
    );

    if (latestEventWithCoords && latestEventWithCoords.latitude && latestEventWithCoords.longitude) {
      routeAnalysis.vesselCurrentPos = {
        lat: latestEventWithCoords.latitude,
        lng: latestEventWithCoords.longitude,
      };
    }

    const telemetry = generateVesselAISTelemetry(vesselName, voyageNumber, routeAnalysis);

    return NextResponse.json({
      success: true,
      container: {
        id: container.id,
        containerNumber: container.containerNumber,
        status: container.status,
        progress: routeAnalysis.progressPct,
        currentLocation: container.currentLocation || routeAnalysis.currentZoneName,
      },
      route: routeAnalysis,
      telemetry,
    });
  } catch (error) {
    console.error('Error fetching container AIS sea route:', error);
    return NextResponse.json(
      { error: 'Failed to compute AIS sea route telemetry' },
      { status: 500 }
    );
  }
}
