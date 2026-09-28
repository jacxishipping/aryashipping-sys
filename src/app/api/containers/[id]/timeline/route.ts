import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch timeline data for a container
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch container
    const container = await prisma.container.findUnique({
      where: { id: params.id },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    // Build timeline based on container lifecycle
    const timeline = [];

    // 1. Container Created
    timeline.push({
      id: 'created',
      status: 'CREATED',
      label: 'Container Created',
      description: `Container ${container.containerNumber} created`,
      date: container.createdAt,
      completed: true,
      icon: 'create',
    });

    // 2. Waiting for Loading
    if (container.status !== 'CREATED') {
      timeline.push({
        id: 'waiting',
        status: 'WAITING_FOR_LOADING',
        label: 'Waiting for Loading',
        description: 'Container ready for loading',
        date: container.loadingDate || container.updatedAt,
        completed: container.status !== 'WAITING_FOR_LOADING',
        icon: 'schedule',
      });
    }

    // 3. Loaded
    if (container.loadingDate) {
      timeline.push({
        id: 'loaded',
        status: 'LOADED',
        label: 'Loaded',
        description: `Container loaded at ${container.loadingPort || 'port'}`,
        date: container.loadingDate,
        completed: ['LOADED', 'IN_TRANSIT', 'ARRIVED_PORT', 'CUSTOMS_CLEARANCE', 'RELEASED', 'CLOSED'].includes(container.status),
        icon: 'local_shipping',
      });
    }

    // 4. Departed / In Transit
    if (container.departureDate) {
      timeline.push({
        id: 'departed',
        status: 'IN_TRANSIT',
        label: 'In Transit',
        description: `Vessel: ${container.vesselName || 'Unknown'}`,
        date: container.departureDate,
        completed: ['IN_TRANSIT', 'ARRIVED_PORT', 'CUSTOMS_CLEARANCE', 'RELEASED', 'CLOSED'].includes(container.status),
        icon: 'sailing',
      });
    }

    // 5. Arrived at Port
    if (container.actualArrival) {
      timeline.push({
        id: 'arrived',
        status: 'ARRIVED_PORT',
        label: 'Arrived at Port',
        description: `Arrived at ${container.destinationPort || 'destination'}`,
        date: container.actualArrival,
        completed: ['ARRIVED_PORT', 'CUSTOMS_CLEARANCE', 'RELEASED', 'CLOSED'].includes(container.status),
        icon: 'anchor',
      });
    } else if (container.estimatedArrival) {
      timeline.push({
        id: 'eta',
        status: 'ARRIVING',
        label: 'Expected Arrival',
        description: `ETA: ${container.estimatedArrival.toLocaleDateString()}`,
        date: container.estimatedArrival,
        completed: false,
        icon: 'schedule',
        estimated: true,
      });
    }

    // 6. Customs Clearance
    if (['CUSTOMS_CLEARANCE', 'RELEASED', 'CLOSED'].includes(container.status)) {
      timeline.push({
        id: 'customs',
        status: 'CUSTOMS_CLEARANCE',
        label: 'Customs Clearance',
        description: 'Processing through customs',
        date: container.actualArrival,
        completed: ['RELEASED', 'CLOSED'].includes(container.status),
        icon: 'check_circle',
      });
    }

    // 7. Released
    if (['RELEASED', 'CLOSED'].includes(container.status)) {
      timeline.push({
        id: 'released',
        status: 'RELEASED',
        label: 'Released',
        description: 'Container released from port',
        date: container.updatedAt,
        completed: true,
        icon: 'task_alt',
      });
    }

    // 8. Closed
    if (container.status === 'CLOSED') {
      timeline.push({
        id: 'closed',
        status: 'CLOSED',
        label: 'Closed',
        description: 'Container shipment completed',
        date: container.updatedAt,
        completed: true,
        icon: 'done_all',
      });
    }

    // Fetch actual tracking events for additional detail
    const trackingEvents = await prisma.containerTrackingEvent.findMany({
      where: { containerId: params.id },
      orderBy: { eventDate: 'asc' },
      take: 20,
    });

    return NextResponse.json({
      container: {
        id: container.id,
        containerNumber: container.containerNumber,
        status: container.status,
        progress: container.progress,
      },
      timeline,
      trackingEvents,
    });
  } catch (error) {
    console.error('Error fetching container timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}
