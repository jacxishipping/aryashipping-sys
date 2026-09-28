import { NextRequest, NextResponse } from 'next/server';
import { routeDeps } from '@/lib/route-deps';
import { z } from 'zod';
import { sendShipmentWorkflowNotifications } from '@/lib/workflow-notifications';
import { postShipmentPriceListLifecycleCharge } from '@/lib/shipment-price-list-lifecycle';

const assignShipmentsSchema = z.object({
  shipmentIds: z.array(z.string()),
});

function buildShipmentLabel(shipment: {
  vehicleYear?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleVIN?: string | null;
  id: string;
}) {
  const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();
  if (shipment.vehicleVIN && vehicleLabel) {
    return `${vehicleLabel} (${shipment.vehicleVIN})`;
  }

  return shipment.vehicleVIN || vehicleLabel || shipment.id;
}

// GET - Fetch shipments assigned to container
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await routeDeps.auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shipments = await routeDeps.prisma.shipment.findMany({
      where: { containerId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      shipments,
      count: shipments.length,
    });
  } catch (error) {
    console.error('Error fetching container shipments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipments' },
      { status: 500 }
    );
  }
}

// POST - Assign shipments to container
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await routeDeps.auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!routeDeps.hasPermission(session.user?.role, 'containers:manage') || !routeDeps.hasPermission(session.user?.role, 'shipments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify container exists
    const container = await routeDeps.prisma.container.findUnique({
      where: { id: params.id },
      include: {
        shipments: true,
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    if (!container.companyId) {
      return NextResponse.json(
        { error: 'Assign a company to this container before adding shipments' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { shipmentIds } = assignShipmentsSchema.parse(body);

    // Check capacity
    const currentCount = container.shipments.length;
    const newCount = currentCount + shipmentIds.length;
    
    if (newCount > container.maxCapacity) {
      return NextResponse.json(
        { 
          error: `Container capacity exceeded. Current: ${currentCount}, Max: ${container.maxCapacity}, Attempting to add: ${shipmentIds.length}` 
        },
        { status: 400 }
      );
    }

    // Verify all shipments exist and are ON_HAND
    const shipments = await routeDeps.prisma.shipment.findMany({
      where: {
        id: { in: shipmentIds },
      },
    });

    if (shipments.length !== shipmentIds.length) {
      return NextResponse.json(
        { error: 'Some shipments not found' },
        { status: 404 }
      );
    }

    const invalidShipments = shipments.filter(s => s.status !== 'ON_HAND');
    if (invalidShipments.length > 0) {
      return NextResponse.json(
        { error: 'Can only assign shipments with status ON_HAND' },
        { status: 400 }
      );
    }

    const companyMismatch = shipments.find(
      (shipment) => shipment.shippingCompanyId && shipment.shippingCompanyId !== container.companyId
    );

    if (companyMismatch) {
      return NextResponse.json(
        {
          error:
            'One or more shipments are linked to a different company. Update shipment company first or assign them to a matching container.',
        },
        { status: 400 }
      );
    }

    // ⚡ Bolt: Replaced O(N) transaction mapping with a single optimized updateMany query
    // Assign shipments to container and ensure company linkage for expense accounting
    await routeDeps.prisma.shipment.updateMany({
      where: { id: { in: shipmentIds }, status: 'ON_HAND' },
      data: {
        containerId: params.id,
        status: 'IN_TRANSIT',
        shippingCompanyId: container.companyId,
      },
    });

    await Promise.all(
      shipmentIds.flatMap((shipmentId) => [
        postShipmentPriceListLifecycleCharge(routeDeps.prisma, {
          shipmentId,
          companyId: container.companyId,
          phase: 'DISPATCH',
          actorId: session.user.id as string,
        }),
        postShipmentPriceListLifecycleCharge(routeDeps.prisma, {
          shipmentId,
          companyId: container.companyId,
          phase: 'SHIPPING',
          actorId: session.user.id as string,
        }),
      ]),
    );

    // Update container count
    await routeDeps.prisma.container.update({
      where: { id: params.id },
      data: {
        currentCount: newCount,
      },
    });

    // Create audit log
    await routeDeps.prisma.containerAuditLog.create({
      data: {
        containerId: params.id,
        action: 'SHIPMENTS_ASSIGNED',
        description: `${shipmentIds.length} shipments assigned to container`,
        performedBy: session.user.id as string,
        metadata: { shipmentIds },
      },
    });

    await sendShipmentWorkflowNotifications(
      session.user.id as string,
      shipments.map((shipment) => ({
        shipmentId: shipment.id,
        shipmentUserId: shipment.userId,
        title: 'Shipment workflow updated',
        customerDescription: `Your shipment ${buildShipmentLabel(shipment)} has been assigned to container ${container.containerNumber}.`,
        internalDescription: `Shipment ${buildShipmentLabel(shipment)} was assigned directly to container ${container.containerNumber}.`,
        link: `/dashboard/shipments/${shipment.id}`,
      })),
      { prisma: routeDeps.prisma, createNotificationsFn: routeDeps.createNotifications },
    );

    return NextResponse.json({
      message: 'Shipments assigned successfully',
      count: shipmentIds.length,
      newTotal: newCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error assigning shipments:', error);
    return NextResponse.json(
      { error: 'Failed to assign shipments' },
      { status: 500 }
    );
  }
}

// DELETE - Remove shipment from container
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await routeDeps.auth();
    
    if (!session?.user || !routeDeps.hasPermission(session.user?.role, 'containers:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipmentId');

    if (!shipmentId) {
      return NextResponse.json({ error: 'Shipment ID required' }, { status: 400 });
    }

    const shipment = await routeDeps.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, containerId: true, transitId: true },
    });

    if (!shipment || shipment.containerId !== params.id) {
      return NextResponse.json({ error: 'Shipment not found in this container' }, { status: 404 });
    }

    if (shipment.transitId) {
      return NextResponse.json(
        { error: 'Cannot remove a shipment from the container while it is assigned to a transit' },
        { status: 400 }
      );
    }

    // Remove shipment from container
    await routeDeps.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        containerId: null,
        status: 'ON_HAND',
      },
    });

    // Update container count
    const container = await routeDeps.prisma.container.findUnique({
      where: { id: params.id },
      include: { shipments: true },
    });

    if (container) {
      await routeDeps.prisma.container.update({
        where: { id: params.id },
        data: {
          currentCount: container.shipments.length,
        },
      });
    }

    return NextResponse.json({ message: 'Shipment removed from container' });
  } catch (error) {
    console.error('Error removing shipment:', error);
    return NextResponse.json(
      { error: 'Failed to remove shipment' },
      { status: 500 }
    );
  }
}
