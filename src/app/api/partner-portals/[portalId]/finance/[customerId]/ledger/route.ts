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

const createPortalLedgerEntrySchema = z.object({
  description: z.string().trim().min(1).max(255),
  type: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number().positive(),
  shipmentId: z.string().trim().min(1).nullable().optional(),
  transactionDate: z.string().datetime().optional(),
  paymentMethod: z.string().trim().max(60).optional().or(z.literal('')),
  reference: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

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
      return NextResponse.json({ error: 'Customer-scoped portal accounts cannot create ledger entries' }, { status: 403 });
    }

    const payload = createPortalLedgerEntrySchema.parse(await request.json());

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

    const entry = await routeDeps.prisma.$transaction(async (tx) => {
      const createdEntry = await tx.partnerPortalLedgerEntry.create({
        data: {
          portalId,
          partnerCustomerId: customerId,
          shipmentId: payload.shipmentId || null,
          transactionDate: payload.transactionDate ? new Date(payload.transactionDate) : new Date(),
          description: payload.description,
          type: payload.type,
          amount: payload.amount,
          balance: 0,
          paymentMethod: payload.paymentMethod || null,
          reference: payload.reference || null,
          notes: payload.notes || null,
          metadata: {
            source: 'MANUAL_PORTAL_LEDGER',
            portalOnly: true,
          } satisfies Prisma.InputJsonValue,
          createdBy: session.user.id as string,
        },
      });

      await recalculatePartnerPortalLedgerBalances(tx, portalId, customerId);

      return tx.partnerPortalLedgerEntry.findUnique({
        where: { id: createdEntry.id },
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
      });
    });

    if (entry && customer.email) {
      void sendLedgerTransactionEmail({
        to: customer.email,
        customerName: customer.name,
        direction: entry.type,
        amount: entry.amount,
        description: entry.description,
        balance: entry.balance,
        transactionDate: entry.transactionDate,
        notes: entry.notes,
      });
    }

    return NextResponse.json({
      entry,
      customer,
      shipment: shipmentSummary,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to create partner portal ledger entry', error);
    return NextResponse.json({ error: 'Failed to create partner portal ledger entry' }, { status: 500 });
  }
}