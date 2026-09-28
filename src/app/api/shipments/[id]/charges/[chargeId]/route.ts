import { NextRequest, NextResponse } from 'next/server';
import { ShipmentChargeStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';

const mutableStatuses = new Set<ShipmentChargeStatus>(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISPUTED']);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chargeId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user.id;

    if (!hasAnyPermission(session.user.role, ['shipments:manage', 'invoices:manage', 'finance:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, chargeId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      status?: 'APPROVED' | 'DISPUTED';
      note?: string;
    };

    if (body.status !== 'APPROVED' && body.status !== 'DISPUTED') {
      return NextResponse.json({ error: 'Invalid charge status update' }, { status: 400 });
    }

    const charge = await prisma.shipmentCharge.findFirst({
      where: {
        id: chargeId,
        shipmentId: id,
      },
      select: {
        id: true,
        shipmentId: true,
        status: true,
        description: true,
        invoiceId: true,
      },
    });

    if (!charge) {
      return NextResponse.json({ error: 'Shipment charge not found' }, { status: 404 });
    }

    const canReadAllShipments = hasPermission(session.user.role, 'shipments:read_all');
    if (!canReadAllShipments) {
      const shipment = await prisma.shipment.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (shipment?.userId === session.user.id && !hasPermission(session.user.role, 'shipments:manage')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // A charge linked to a DRAFT/PENDING (not yet issued) invoice can still be
    // approved/disputed: the link is released and the invoice is refreshed the
    // next time it is generated. Charges on issued invoices must be reversed first.
    let linkedInvoice: { id: string; invoiceNumber: string; status: string } | null = null;
    if (charge.invoiceId) {
      linkedInvoice = await prisma.userInvoice.findUnique({
        where: { id: charge.invoiceId },
        select: { id: true, invoiceNumber: true, status: true },
      });

      const invoiceIsMutable = linkedInvoice ? ['DRAFT', 'PENDING'].includes(linkedInvoice.status) : false;
      if (!invoiceIsMutable) {
        return NextResponse.json(
          {
            error: `Charge is locked to invoice ${linkedInvoice?.invoiceNumber ?? ''} (${(linkedInvoice?.status || 'unknown').toLowerCase()}). Reverse that invoice first, then dispute or approve this row.`,
          },
          { status: 400 },
        );
      }
    }

    const statusIsMutable =
      mutableStatuses.has(charge.status) || (charge.status === 'INVOICED' && Boolean(linkedInvoice));
    if (!statusIsMutable) {
      return NextResponse.json(
        { error: `Charge cannot be updated while it is ${charge.status.toLowerCase()}.` },
        { status: 400 },
      );
    }

    const updatedCharge = await prisma.$transaction(async (tx) => {
      const nextCharge = await tx.shipmentCharge.update({
        where: { id: charge.id },
        data: {
          status: body.status,
          approvedAt: body.status === 'APPROVED' ? new Date() : null,
          approvedBy: body.status === 'APPROVED' ? session.user.id : null,
          notes: body.note ? body.note.trim() : undefined,
          // Release the charge from a not-yet-issued invoice so it can be disputed
          // or approved again. The next invoice generation rebuilds the draft.
          invoiceId: linkedInvoice ? null : undefined,
          invoicedAt: linkedInvoice ? null : undefined,
        },
      });

      await tx.shipmentChargeAuditLog.create({
        data: {
          chargeId: charge.id,
          action: body.status === 'APPROVED' ? 'MANUAL_APPROVAL' : 'MANUAL_DISPUTE',
          description:
            body.status === 'APPROVED'
              ? `Shipment charge approved: ${charge.description}`
              : `Shipment charge disputed: ${charge.description}`,
          performedBy: actorId,
          oldValue: charge.status,
          newValue: body.status,
          metadata: {
            ...(body.note ? { note: body.note.trim() } : {}),
            ...(linkedInvoice
              ? { releasedFromInvoice: linkedInvoice.invoiceNumber, releasedFromInvoiceStatus: linkedInvoice.status }
              : {}),
          },
        },
      });

      return nextCharge;
    });

    return NextResponse.json({ charge: updatedCharge });
  } catch (error) {
    console.error('Error updating shipment charge status:', error);
    return NextResponse.json({ error: 'Failed to update shipment charge' }, { status: 500 });
  }
}