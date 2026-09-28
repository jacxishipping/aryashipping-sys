import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { routeDeps } from '@/lib/route-deps';
import { recalculatePartnerPortalLedgerBalances } from '@/lib/partner-portal-ledger';
import { sendLedgerTransactionEmail } from '@/lib/email';
import {
  canManagePartnerPortals,
  canReadPartnerPortalCustomers,
  canReadPartnerPortalShipments,
  getPartnerPortalMembership,
  isCustomerScopedPortalMembership,
} from '@/lib/partner-portals';

const createPortalPaymentRecordSchema = z.object({
  amount: z.number().positive(),
  shipmentId: z.string().trim().min(1).nullable().optional(),
  paymentDate: z.string().datetime().optional(),
  paymentMethod: z.string().trim().min(1).max(60),
  reference: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

function buildShipmentReference(shipment: {
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
}) {
  const label = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();

  if (shipment.vehicleVIN && label) {
    return `${label} (${shipment.vehicleVIN})`;
  }

  return shipment.vehicleVIN || label || 'shipment';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string; customerId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId, customerId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const hasInternalAccess = canManagePartnerPortals(session.user.role)
      || canReadPartnerPortalCustomers(session.user.role)
      || canReadPartnerPortalShipments(session.user.role);

    if (!membership && !hasInternalAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isCustomerScopedPortalMembership(membership) && !hasInternalAccess) {
      return NextResponse.json({ error: 'Customer-scoped portal accounts cannot record payments' }, { status: 403 });
    }

    const payload = createPortalPaymentRecordSchema.parse(await request.json());

    const customer = await routeDeps.prisma.partnerCustomer.findFirst({
      where: {
        id: customerId,
        portalId,
      },
      select: { id: true, name: true, email: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Portal customer not found' }, { status: 404 });
    }

    let shipmentSummary: { id: string; vehicleYear: number | null; vehicleMake: string | null; vehicleModel: string | null; vehicleVIN: string | null } | null = null;

    if (payload.shipmentId) {
      const assignment = await routeDeps.prisma.partnerShipmentAssignment.findFirst({
        where: {
          portalId,
          partnerCustomerId: customerId,
          shipmentId: payload.shipmentId,
        },
        select: {
          shipment: {
            select: {
              id: true,
              vehicleYear: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleVIN: true,
            },
          },
        },
      });

      if (!assignment?.shipment) {
        return NextResponse.json({ error: 'Shipment is not linked to this portal customer' }, { status: 404 });
      }

      shipmentSummary = assignment.shipment;
    }

    const result = await routeDeps.prisma.$transaction(async (tx) => {
      const paymentRecord = await tx.partnerPortalPaymentRecord.create({
        data: {
          portalId,
          partnerCustomerId: customerId,
          shipmentId: payload.shipmentId || null,
          amount: payload.amount,
          paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
          paymentMethod: payload.paymentMethod,
          reference: payload.reference || null,
          notes: payload.notes || null,
          metadata: {
            portalOnly: true,
          } satisfies Prisma.InputJsonValue,
          createdBy: session.user.id as string,
        },
      });

      const ledgerEntry = await tx.partnerPortalLedgerEntry.create({
        data: {
          portalId,
          partnerCustomerId: customerId,
          shipmentId: payload.shipmentId || null,
          paymentRecordId: paymentRecord.id,
          transactionDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
          description: shipmentSummary
            ? `Portal payment received for ${buildShipmentReference(shipmentSummary)}`
            : `Portal payment received for ${customer.name}`,
          type: 'CREDIT',
          amount: payload.amount,
          balance: 0,
          paymentMethod: payload.paymentMethod,
          reference: payload.reference || null,
          notes: payload.notes || null,
          metadata: {
            source: 'PORTAL_PAYMENT_RECORD',
            portalOnly: true,
          } satisfies Prisma.InputJsonValue,
          createdBy: session.user.id as string,
        },
      });

      await recalculatePartnerPortalLedgerBalances(tx, portalId, customerId);

      return {
        paymentRecord: await tx.partnerPortalPaymentRecord.findUnique({
          where: { id: paymentRecord.id },
          include: {
            shipment: {
              select: {
                id: true,
                vehicleYear: true,
                vehicleMake: true,
                vehicleModel: true,
                vehicleVIN: true,
              },
            },
          },
        }),
        ledgerEntry: await tx.partnerPortalLedgerEntry.findUnique({
          where: { id: ledgerEntry.id },
        }),
      };
    });

    if (result.ledgerEntry && customer.email) {
      void sendLedgerTransactionEmail({
        to: customer.email,
        customerName: customer.name,
        direction: result.ledgerEntry.type,
        amount: result.ledgerEntry.amount,
        description: result.ledgerEntry.description,
        balance: result.ledgerEntry.balance,
        transactionDate: result.ledgerEntry.transactionDate,
        notes: result.ledgerEntry.notes,
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to create partner portal payment record', error);
    return NextResponse.json({ error: 'Failed to create partner portal payment record' }, { status: 500 });
  }
}