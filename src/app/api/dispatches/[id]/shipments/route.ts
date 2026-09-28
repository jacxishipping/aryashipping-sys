import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeDeps } from '@/lib/route-deps';
import { isDispatchClosed } from '@/lib/dispatch-workflow';
import { sendShipmentWorkflowNotifications } from '@/lib/workflow-notifications';
import { ensureWorkflowMoveAllowed, isClosedStageOverrideAllowed } from '@/lib/workflow-access';
import { postShipmentPriceListLifecycleCharge } from '@/lib/shipment-price-list-lifecycle';

const addShipmentSchema = z.object({
  shipmentId: z.string().min(1),
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

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ensureWorkflowMoveAllowed(session.user?.role) || !routeDeps.hasPermission(session.user?.role, 'dispatches:manage') || !routeDeps.hasPermission(session.user?.role, 'shipments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dispatch = await routeDeps.prisma.dispatch.findUnique({ where: { id: params.id } });
    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    if (isDispatchClosed(dispatch.status) && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Cannot add shipments to a completed or cancelled dispatch' }, { status: 400 });
    }

    const body = await request.json();
    const { shipmentId } = addShipmentSchema.parse(body);

    const shipment = await routeDeps.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, status: true, dispatchId: true, containerId: true, transitId: true },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    if (shipment.containerId || shipment.transitId) {
      return NextResponse.json({ error: 'Shipment is already in container or transit workflow' }, { status: 400 });
    }

    if (shipment.status !== 'ON_HAND' && shipment.dispatchId !== params.id) {
      return NextResponse.json({ error: 'Shipment can be assigned to dispatch only while ON_HAND' }, { status: 400 });
    }

    if (shipment.dispatchId && shipment.dispatchId !== params.id) {
      return NextResponse.json({ error: 'Shipment is already assigned to another dispatch' }, { status: 400 });
    }

    const updatedShipment = await routeDeps.prisma.shipment.update({
      where: { id: shipmentId },
      data: { dispatchId: params.id, status: 'DISPATCHING' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await postShipmentPriceListLifecycleCharge(routeDeps.prisma, {
      shipmentId: updatedShipment.id,
      companyId: updatedShipment.shippingCompanyId,
      phase: 'DISPATCH',
      actorId: session.user.id as string,
    });

    const shipmentLabel = buildShipmentLabel(updatedShipment);
    await sendShipmentWorkflowNotifications(
      session.user.id as string,
      [
        {
          shipmentId: updatedShipment.id,
          shipmentUserId: updatedShipment.userId,
          title: 'Shipment workflow updated',
          customerDescription: `Your shipment ${shipmentLabel} has been assigned to dispatch ${dispatch.referenceNumber} and is now moving toward the port.`,
          internalDescription: `Shipment ${shipmentLabel} was assigned to dispatch ${dispatch.referenceNumber}.`,
          link: `/dashboard/shipments/${updatedShipment.id}`,
        },
      ],
      { prisma: routeDeps.prisma, createNotificationsFn: routeDeps.createNotifications },
    );

    return NextResponse.json({ shipment: updatedShipment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error adding shipment to dispatch:', error);
    return NextResponse.json({ error: 'Failed to add shipment to dispatch' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ensureWorkflowMoveAllowed(session.user?.role) || !routeDeps.hasPermission(session.user?.role, 'dispatches:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipmentId');

    if (!shipmentId) {
      return NextResponse.json({ error: 'shipmentId query parameter is required' }, { status: 400 });
    }

    const shipment = await routeDeps.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment || shipment.dispatchId !== params.id) {
      return NextResponse.json({ error: 'Shipment not found in this dispatch' }, { status: 404 });
    }

    const dispatch = await routeDeps.prisma.dispatch.findUnique({ where: { id: params.id }, select: { status: true } });
    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    if (isDispatchClosed(dispatch.status) && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Cannot remove shipments from a completed or cancelled dispatch' }, { status: 400 });
    }

    if (shipment.containerId || shipment.transitId) {
      return NextResponse.json({ error: 'Cannot remove a shipment from dispatch after handoff to container or transit' }, { status: 400 });
    }

    await routeDeps.prisma.shipment.update({
      where: { id: shipmentId },
      data: { dispatchId: null, status: 'ON_HAND' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing shipment from dispatch:', error);
    return NextResponse.json({ error: 'Failed to remove shipment from dispatch' }, { status: 500 });
  }
}
