import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeDeps } from '@/lib/route-deps';
import { sendShipmentWorkflowNotifications } from '@/lib/workflow-notifications';
import { ensureWorkflowMoveAllowed, isClosedStageOverrideAllowed } from '@/lib/workflow-access';

const confirmDeliverySchema = z.object({
  deliveredDate: z.string().min(1),
  receiverName: z.string().trim().min(1, 'Receiver name is required'),
  proofUrl: z.string().url('Proof of delivery file is required'),
  proofName: z.string().trim().min(1).optional(),
  proofType: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
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

    if (!ensureWorkflowMoveAllowed(session.user?.role) || !routeDeps.hasPermission(session.user?.role, 'transits:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = confirmDeliverySchema.parse(body);

    const transit = await routeDeps.prisma.transit.findUnique({
      where: { id: params.id },
      include: {
        events: {
          orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
        shipments: {
          select: {
            id: true,
            userId: true,
            transitId: true,
            vehicleYear: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleVIN: true,
          },
        },
      },
    });

    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    if (transit.status === 'CANCELLED' && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Cannot confirm delivery for a cancelled transit' }, { status: 400 });
    }

    if (transit.status === 'DELIVERED' && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Transit delivery has already been confirmed' }, { status: 400 });
    }

    const activeShipmentIds = (transit.shipments || [])
      .filter((shipment) => shipment.transitId === params.id)
      .map((shipment) => shipment.id);

    if (activeShipmentIds.length === 0) {
      return NextResponse.json({ error: 'Transit has no active shipments to confirm as delivered' }, { status: 400 });
    }

    const currentEvent = transit.events?.[0] ?? null;

    if (!currentEvent) {
      return NextResponse.json({ error: 'Add at least one transit event before confirming delivery' }, { status: 400 });
    }

    const deliveredAt = new Date(validatedData.deliveredDate);
    const actorId = session.user.id as string;

    const updatedTransit = await routeDeps.prisma.$transaction(async (tx) => {
      const updated = await tx.transit.update({
        where: { id: params.id },
        data: {
          status: 'DELIVERED',
          actualDelivery: deliveredAt,
          deliveryReceiverName: validatedData.receiverName,
          deliveryProofUrl: validatedData.proofUrl,
          deliveryProofName: validatedData.proofName ?? null,
          deliveryProofType: validatedData.proofType ?? null,
          deliveryNotes: validatedData.notes ?? null,
        },
      });

      await tx.shipment.updateMany({
        where: { id: { in: activeShipmentIds }, transitId: params.id },
        data: { status: 'DELIVERED' },
      });

      await tx.transitEvent.create({
        data: {
          transitId: params.id,
          companyId: currentEvent.companyId,
          origin: currentEvent.origin,
          destination: currentEvent.destination,
          status: 'DELIVERY_CONFIRMED',
          location: transit.destination,
          description: `Receiver: ${validatedData.receiverName}${validatedData.notes ? ` | Notes: ${validatedData.notes}` : ''}`,
          eventDate: deliveredAt,
          createdBy: actorId,
        },
      });

      return updated;
    });

    await sendShipmentWorkflowNotifications(
      actorId,
      transit.shipments
        .filter((shipment) => shipment.transitId === params.id)
        .map((shipment) => ({
          shipmentId: shipment.id,
          shipmentUserId: shipment.userId,
          title: 'Shipment workflow updated',
          customerDescription: `Your shipment ${buildShipmentLabel(shipment)} has been confirmed delivered to ${validatedData.receiverName}.`,
          internalDescription: `Shipment ${buildShipmentLabel(shipment)} was confirmed delivered to ${validatedData.receiverName}.`,
          link: `/dashboard/shipments/${shipment.id}`,
        })),
      { prisma: routeDeps.prisma, createNotificationsFn: routeDeps.createNotifications },
    );

    return NextResponse.json({
      transit: updatedTransit,
      deliveryConfirmation: {
        deliveredDate: deliveredAt.toISOString(),
        receiverName: validatedData.receiverName,
        proofUrl: validatedData.proofUrl,
        proofName: validatedData.proofName ?? null,
        proofType: validatedData.proofType ?? null,
        notes: validatedData.notes ?? null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error confirming transit delivery:', error);
    return NextResponse.json({ error: 'Failed to confirm transit delivery' }, { status: 500 });
  }
}