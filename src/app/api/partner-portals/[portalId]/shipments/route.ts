import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeDeps } from '@/lib/route-deps';
import {
  canAssignShipmentsToPartnerPortals,
  canManagePartnerPortals,
  canReadPartnerPortalShipments,
  getPartnerPortalMembership,
  getPortalMembershipCustomerScope,
  getPartnerPortalOrThrow,
  isCustomerScopedPortalMembership,
  syncPortalShipmentsFromPrimaryMember,
} from '@/lib/partner-portals';

const assignShipmentSchema = z.object({
  shipmentId: z.string().trim().min(1),
  partnerCustomerId: z.string().trim().min(1).nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const hasInternalAccess = canManagePartnerPortals(session.user.role) || canReadPartnerPortalShipments(session.user.role);
    const scopedCustomerId = getPortalMembershipCustomerScope(membership);

    if (!membership && !hasInternalAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await syncPortalShipmentsFromPrimaryMember(portalId, session.user.id);

    const assignments = await routeDeps.prisma.partnerShipmentAssignment.findMany({
      where: {
        portalId,
        ...(scopedCustomerId ? { partnerCustomerId: scopedCustomerId } : {}),
      },
      orderBy: { assignedAt: 'desc' },
      include: {
        partnerCustomer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        shipment: {
          select: {
            id: true,
            serviceType: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehicleVIN: true,
            vehicleColor: true,
            lotNumber: true,
            auctionName: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      portal,
      assignments,
      viewer: {
        canManageAssignments: hasInternalAccess || !isCustomerScopedPortalMembership(membership),
        customerScoped: isCustomerScopedPortalMembership(membership),
        partnerCustomerId: scopedCustomerId,
      },
    });
  } catch (error) {
    routeDeps.logger.error('Failed to fetch portal shipment assignments', error);
    return NextResponse.json({ error: 'Failed to fetch portal shipment assignments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);

    if (isCustomerScopedPortalMembership(membership)) {
      return NextResponse.json({ error: 'Customer-scoped portal accounts cannot assign shipments' }, { status: 403 });
    }

    if (!canAssignShipmentsToPartnerPortals(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const payload = assignShipmentSchema.parse(await request.json());

    const shipment = await routeDeps.prisma.shipment.findUnique({
      where: { id: payload.shipmentId },
      select: { id: true },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    if (payload.partnerCustomerId) {
      const partnerCustomer = await routeDeps.prisma.partnerCustomer.findFirst({
        where: {
          id: payload.partnerCustomerId,
          portalId,
        },
        select: { id: true },
      });

      if (!partnerCustomer) {
        return NextResponse.json({ error: 'Partner customer not found in this portal' }, { status: 404 });
      }
    }

    const existing = await routeDeps.prisma.partnerShipmentAssignment.findUnique({
      where: { shipmentId: payload.shipmentId },
      select: { id: true, portalId: true },
    });

    if (existing) {
      return NextResponse.json({ error: 'Shipment is already assigned to a partner portal' }, { status: 409 });
    }

    let linkedCustomerId = payload.partnerCustomerId || null;
    let linkedCustomerName: string | null = null;
    const manualNotes = payload.notes?.trim();
    const inheritedNotes = manualNotes ? undefined : portal.defaultShipmentNotes?.trim() || undefined;
    const effectiveNotes = manualNotes || inheritedNotes;
    const noteSource = manualNotes ? 'MANUAL' : inheritedNotes ? 'PORTAL_DEFAULT' : undefined;

    if (!linkedCustomerId && portal.autoAssignToSingleCustomer) {
      const partnerCustomers = await routeDeps.prisma.partnerCustomer.findMany({
        where: { portalId },
        select: { id: true, name: true },
        take: 2,
        orderBy: { createdAt: 'asc' },
      });

      if (partnerCustomers.length === 1) {
        linkedCustomerId = partnerCustomers[0].id;
        linkedCustomerName = partnerCustomers[0].name;
      }
    }

    const assignment = await routeDeps.prisma.partnerShipmentAssignment.create({
      data: {
        portalId,
        shipmentId: payload.shipmentId,
        ...(linkedCustomerId ? { partnerCustomerId: linkedCustomerId } : {}),
        assignedBy: session.user.id,
        ...(linkedCustomerId ? { linkedBy: session.user.id, linkedAt: new Date() } : {}),
        ...(effectiveNotes ? { notes: effectiveNotes, noteSource } : {}),
      },
      include: {
        partnerCustomer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        shipment: {
          select: {
            id: true,
            serviceType: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehicleVIN: true,
            status: true,
          },
        },
      },
    });

    if (portal.notifyOnShipmentAssigned) {
      const recipients = await routeDeps.prisma.partnerPortalMembership.findMany({
        where: {
          portalId,
          NOT: { userId: session.user.id },
        },
        select: { userId: true },
      });

      if (recipients.length > 0) {
        const shipmentLabel = [assignment.shipment.vehicleYear, assignment.shipment.vehicleMake, assignment.shipment.vehicleModel]
          .filter(Boolean)
          .join(' ') || assignment.shipment.vehicleType;

        await routeDeps.createNotifications(
          recipients.map((recipient) => ({
            userId: recipient.userId,
            senderId: session.user.id,
            title: 'New shipment assigned to your portal',
            description: linkedCustomerName
              ? `${shipmentLabel} was assigned to ${portal.name} and automatically linked to ${linkedCustomerName}.`
              : `${shipmentLabel} was assigned to ${portal.name} and is ready for customer linking.`,
            link: `/portal/${portalId}/shipments/${assignment.shipment.id}`,
            type: 'INFO' as const,
          })),
        );
      }
    }

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to assign shipment to partner portal', error);
    return NextResponse.json({ error: 'Failed to assign shipment to partner portal' }, { status: 500 });
  }
}