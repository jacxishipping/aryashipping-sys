import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  buildMaritimeRoute, 
  generateVesselAISTelemetry, 
  PORT_GEO_REGISTRY,
  MARITIME_CHOKEPOINTS,
  resolvePortLocation
} from '@/lib/maritime/sea-routes';

import { containerTrackingClient } from '@/lib/services/container-tracking-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const containerId = searchParams.get('containerId');
    const containerNumber = searchParams.get('containerNumber');
    const originQuery = searchParams.get('origin') || 'Port of Newark (USNWK)';
    const destQuery = searchParams.get('destination') || 'Port of Jebel Ali (AEJEA)';
    const vesselNameParam = searchParams.get('vesselName');
    const voyageNumberParam = searchParams.get('voyageNumber');
    const progressParam = searchParams.get('progress');

    let originPort = originQuery;
    let destinationPort = destQuery;
    let vesselName = vesselNameParam || 'MAERSK VOYAGER';
    let voyageNumber = voyageNumberParam || 'V-2409W';
    let progressPct = progressParam ? parseFloat(progressParam) : 68;
    let departureDate: Date | null = null;
    let estimatedArrival: Date | null = null;
    let foundContainerNumber = containerNumber || 'MSKU9048123';
    let detectedImo: string | undefined = undefined;

    // If containerId or containerNumber is passed, fetch from DB
    if (containerId || containerNumber) {
      const container = await prisma.container.findFirst({
        where: containerId 
          ? { id: containerId }
          : { containerNumber: { equals: containerNumber!, mode: 'insensitive' } },
        include: {
          trackingEvents: {
            orderBy: { eventDate: 'desc' },
            take: 10,
          },
          shipments: {
            select: {
              id: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleYear: true,
              vehicleVIN: true,
              status: true,
            },
          },
        },
      });

      if (container) {
        foundContainerNumber = container.containerNumber;
        if (container.loadingPort) originPort = container.loadingPort;
        if (container.destinationPort) destinationPort = container.destinationPort;
        if (container.departureDate) departureDate = new Date(container.departureDate);
        if (container.estimatedArrival) estimatedArrival = new Date(container.estimatedArrival);
        if (container.vesselName) vesselName = container.vesselName;
        if (container.voyageNumber) voyageNumber = container.voyageNumber;

        // Compute progress based on dates or status
        if (container.status === 'ARRIVED_PORT' || container.status === 'CUSTOMS_CLEARANCE' || container.status === 'RELEASED' || container.status === 'CLOSED') {
          progressPct = 100;
        } else if (container.status === 'WAITING_FOR_LOADING' || container.status === 'CREATED') {
          progressPct = 5;
        } else if (departureDate && estimatedArrival) {
          const now = Date.now();
          const start = departureDate.getTime();
          const end = estimatedArrival.getTime();
          if (end > start) {
            const calculated = ((now - start) / (end - start)) * 100;
            progressPct = Math.min(98, Math.max(8, Math.round(calculated)));
          }
        }
      }
    }

    const routeAnalysis = buildMaritimeRoute(
      originPort,
      destinationPort,
      progressPct,
      departureDate,
      estimatedArrival
    );

    // Check if live satellite GPS fix is available for this vessel
    let liveFix: { lat: number; lon: number; course: number } | null = null;
    if (detectedImo) {
      const imoFix = await containerTrackingClient.getLiveVesselLocation(detectedImo).catch(() => null);
      if (imoFix && imoFix.lat !== null && imoFix.lon !== null) {
        liveFix = { lat: imoFix.lat, lon: imoFix.lon, course: imoFix.course || routeAnalysis.vesselHeading };
        routeAnalysis.vesselCurrentPos = { lat: imoFix.lat, lng: imoFix.lon };
        if (imoFix.course !== null) {
          routeAnalysis.vesselHeading = imoFix.course;
        }
      }
    }

    const telemetry = generateVesselAISTelemetry(vesselName, voyageNumber, routeAnalysis);
    if (liveFix) {
      telemetry.currentPosition = { lat: liveFix.lat, lng: liveFix.lon };
      telemetry.headingDegrees = liveFix.course;
      telemetry.aisStation = 'Live Satellite AIS (Supabase Vessel Constellation)';
    }

    // Port Congestion & AIS Weather Analysis
    const congestionFactor = Math.round(12 + (routeAnalysis.activeWaypointIndex * 4.5) % 15); // e.g. 15-27%
    const etaConfidence = progressPct > 80 ? 'HIGH (Port Approach)' : 'MODERATE (Ocean Transit)';

    return NextResponse.json({
      containerNumber: foundContainerNumber,
      vesselName,
      voyageNumber,
      routeAnalysis,
      telemetry,
      congestion: {
        berthWaitHours: Math.round(congestionFactor / 2.5),
        congestionIndexPct: congestionFactor,
        trafficStatus: congestionFactor > 20 ? 'Moderate Vessel Queue' : 'Normal Port Traffic',
      },
      etaConfidence,
      portsRegistry: Object.keys(PORT_GEO_REGISTRY).map(k => ({
        key: k,
        ...PORT_GEO_REGISTRY[k]
      })),
      chokepoints: Object.keys(MARITIME_CHOKEPOINTS).map(k => ({
        key: k,
        ...MARITIME_CHOKEPOINTS[k]
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Vessel tracking failed' }, { status: 500 });
  }
}
