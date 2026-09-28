import { NextRequest, NextResponse } from 'next/server';
import { ShipmentChargeStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { materializeShipmentLedgerCharges } from '@/lib/billing/shipment-charge-backfill';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';

const mutableStatuses = new Set<ShipmentChargeStatus>(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISPUTED']);
const mutableInvoiceStatuses = new Set(['DRAFT', 'PENDING']);

function buildPostIssueDelta(
  charges: Array<{
    totalAmount: number;
    status: string;
    invoice: { id: string; invoiceNumber: string; status: string } | null;
  }>,
) {
  const approvedUninvoicedCharges = charges.filter((charge) => charge.status === 'APPROVED' && !charge.invoice);
  const issuedInvoices = Array.from(
    new Map(
      charges
        .filter(
          (charge) =>
            charge.invoice &&
            !mutableInvoiceStatuses.has(charge.invoice.status) &&
            charge.invoice.status !== 'CANCELLED',
        )
        .map((charge) => [charge.invoice!.id, charge.invoice]),
    ).values(),
  );

  const deltaAmount = approvedUninvoicedCharges.reduce((sum, charge) => sum + charge.totalAmount, 0);
  const latestIssuedInvoice = issuedInvoices[issuedInvoices.length - 1] || null;
  const kind = deltaAmount < 0 ? 'CREDIT_NOTE' : deltaAmount > 0 ? 'SUPPLEMENTAL_INVOICE' : 'ADJUSTMENT';

  return {
    active: issuedInvoices.length > 0 && approvedUninvoicedCharges.length > 0,
    kind,
    approvedUninvoicedCount: approvedUninvoicedCharges.length,
    deltaAmount,
    latestIssuedInvoiceNumber: latestIssuedInvoice?.invoiceNumber || null,
    latestIssuedInvoiceStatus: latestIssuedInvoice?.status || null,
    description:
      issuedInvoices.length > 0 && approvedUninvoicedCharges.length > 0
        ? deltaAmount < 0
          ? `${approvedUninvoicedCharges.length} approved post-issue charge${approvedUninvoicedCharges.length === 1 ? '' : 's'} would generate a credit note instead of changing the issued invoice.`
          : `${approvedUninvoicedCharges.length} approved post-issue charge${approvedUninvoicedCharges.length === 1 ? '' : 's'} would generate a supplemental invoice instead of changing the issued invoice.`
        : null,
  };
}

function buildBillingReadiness(charges: Array<{ status: string; invoice: { id: string } | null }>) {
  const approvedUninvoicedCount = charges.filter((charge) => charge.status === 'APPROVED' && !charge.invoice).length;
  const blockedCount = charges.filter((charge) => ['DRAFT', 'PENDING_APPROVAL', 'DISPUTED'].includes(charge.status)).length;
  const settledCount = charges.filter((charge) => ['INVOICED', 'PAID'].includes(charge.status) || Boolean(charge.invoice)).length;
  const paidCount = charges.filter((charge) => charge.status === 'PAID').length;

  if (!charges.length) {
    return {
      status: 'NOT_BILLABLE',
      label: 'Not Billable',
      description: 'No shipment charges are available yet. Add or sync billable activity before invoicing.',
      approvedUninvoicedCount,
      blockedCount,
      settledCount,
      totalCharges: 0,
    };
  }

  if (paidCount === charges.length) {
    return {
      status: 'PAID',
      label: 'Paid',
      description: 'All shipment charges linked to this shipment have been settled.',
      approvedUninvoicedCount,
      blockedCount,
      settledCount,
      totalCharges: charges.length,
    };
  }

  if (settledCount === charges.length && approvedUninvoicedCount === 0 && blockedCount === 0) {
    return {
      status: 'INVOICED',
      label: 'Invoiced',
      description: 'All shipment charges are already tied to invoices or completed payment.',
      approvedUninvoicedCount,
      blockedCount,
      settledCount,
      totalCharges: charges.length,
    };
  }

  if (approvedUninvoicedCount > 0 && blockedCount === 0) {
    return {
      status: 'READY_TO_INVOICE',
      label: 'Ready To Invoice',
      description: `${approvedUninvoicedCount} approved charge${approvedUninvoicedCount === 1 ? '' : 's'} can be picked up by invoice generation now.`,
      approvedUninvoicedCount,
      blockedCount,
      settledCount,
      totalCharges: charges.length,
    };
  }

  return {
    status: 'PARTIALLY_BILLABLE',
    label: 'Partially Billable',
    description:
      approvedUninvoicedCount > 0
        ? `${approvedUninvoicedCount} approved charge${approvedUninvoicedCount === 1 ? '' : 's'} are invoiceable, but ${blockedCount} still need review.`
        : `${blockedCount} charge${blockedCount === 1 ? '' : 's'} still need review before this shipment becomes invoice-ready.`,
    approvedUninvoicedCount,
    blockedCount,
    settledCount,
    totalCharges: charges.length,
  };
}

async function assertShipmentAccess(shipmentId: string, sessionUserId: string, role: string | undefined) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!shipment) {
    return { error: NextResponse.json({ error: 'Shipment not found' }, { status: 404 }) };
  }

  const canReadAllShipments = hasPermission(role, 'shipments:read_all');
  if (!canReadAllShipments && shipment.userId !== sessionUserId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { shipment };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const access = await assertShipmentAccess(id, session.user.id, session.user.role);
    if ('error' in access) {
      return access.error;
    }

    const fallbackActorId = session.user.id as string;

    // Phase 2: make the GET a pure read by default. Materializing charges is
    // a write — it is only performed when the client explicitly opts in with
    // `?materialize=true` (e.g. the billing tab that needs up-to-date rows).
    const { searchParams } = new URL(request.url);
    const shouldMaterialize = searchParams.get('materialize') === 'true';

    if (shouldMaterialize) {
      await prisma.$transaction(async (tx) => {
        const ledgerEntries = await tx.ledgerEntry.findMany({
          where: {
            shipmentId: id,
            type: 'DEBIT',
          },
          select: {
            id: true,
            userId: true,
            shipmentId: true,
            description: true,
            type: true,
            amount: true,
            transactionDate: true,
            transactionInfoType: true,
            notes: true,
            metadata: true,
            createdBy: true,
          },
        });

        await materializeShipmentLedgerCharges(tx, ledgerEntries, fallbackActorId);
      });
    }

    const charges = await prisma.shipmentCharge.findMany({
      where: {
        shipmentId: id,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
          },
        },
        auditLogs: {
          select: {
            id: true,
            action: true,
            description: true,
            performedBy: true,
            oldValue: true,
            newValue: true,
            metadata: true,
            timestamp: true,
          },
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
      orderBy: [
        { billableAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const actorIds = Array.from(
      new Set(
        charges.flatMap((charge) => charge.auditLogs.map((log) => log.performedBy)).filter(Boolean),
      ),
    );

    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: {
            id: {
              in: actorIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const actorMap = new Map(
      actors.map((actor) => [actor.id, actor.name?.trim() || actor.email || actor.id]),
    );

    const chargesWithActors = charges.map((charge) => ({
      ...charge,
      auditLogs: charge.auditLogs.map((log) => ({
        ...log,
        actorLabel: actorMap.get(log.performedBy) || log.performedBy,
      })),
    }));

    const summary = chargesWithActors.reduce(
      (accumulator, charge) => {
        accumulator.total += charge.totalAmount;

        if (charge.status === 'PAID') {
          accumulator.paid += charge.totalAmount;
        } else if (charge.status === 'INVOICED') {
          accumulator.invoiced += charge.totalAmount;
        } else if (charge.status === 'APPROVED') {
          accumulator.open += charge.totalAmount;
        }

        accumulator.counts[charge.status] = (accumulator.counts[charge.status] || 0) + 1;
        return accumulator;
      },
      {
        total: 0,
        invoiced: 0,
        paid: 0,
        open: 0,
        counts: {} as Record<string, number>,
      },
    );

    return NextResponse.json({
      charges: chargesWithActors,
      summary,
      readiness: buildBillingReadiness(chargesWithActors),
      postIssueDelta: buildPostIssueDelta(chargesWithActors),
    });
  } catch (error) {
    console.error('Error fetching shipment charges:', error);
    return NextResponse.json({ error: 'Failed to fetch shipment charges' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user.role, ['shipments:manage', 'invoices:manage', 'finance:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const access = await assertShipmentAccess(id, session.user.id, session.user.role);
    if ('error' in access) {
      return access.error;
    }

    const body = (await request.json().catch(() => ({}))) as {
      chargeIds?: string[];
      status?: 'APPROVED' | 'DISPUTED';
      note?: string;
    };

    if (!Array.isArray(body.chargeIds) || body.chargeIds.length === 0) {
      return NextResponse.json({ error: 'At least one charge ID is required' }, { status: 400 });
    }

    if (body.status !== 'APPROVED' && body.status !== 'DISPUTED') {
      return NextResponse.json({ error: 'Invalid bulk charge status update' }, { status: 400 });
    }

    const trimmedNote = body.note?.trim();
    const uniqueChargeIds = Array.from(new Set(body.chargeIds));
    const charges = await prisma.shipmentCharge.findMany({
      where: {
        id: { in: uniqueChargeIds },
        shipmentId: id,
      },
      select: {
        id: true,
        status: true,
        description: true,
        invoiceId: true,
      },
    });

    if (charges.length !== uniqueChargeIds.length) {
      return NextResponse.json({ error: 'One or more shipment charges were not found' }, { status: 404 });
    }

    // Load the invoices linked to selected charges so draft/pending links can be
    // released while issued-invoice links stay blocked.
    const linkedInvoiceIds = Array.from(
      new Set(charges.map((charge) => charge.invoiceId).filter((value): value is string => Boolean(value))),
    );
    const linkedInvoices = linkedInvoiceIds.length
      ? await prisma.userInvoice.findMany({
          where: { id: { in: linkedInvoiceIds } },
          select: { id: true, invoiceNumber: true, status: true },
        })
      : [];
    const linkedInvoiceMap = new Map(linkedInvoices.map((invoice) => [invoice.id, invoice]));
    const mutableInvoiceStatuses = new Set(['DRAFT', 'PENDING']);

    const blockedCharge = charges.find((charge) => {
      const linkedInvoice = charge.invoiceId ? linkedInvoiceMap.get(charge.invoiceId) : undefined;
      const invoiceMutable = Boolean(linkedInvoice && mutableInvoiceStatuses.has(linkedInvoice.status));

      if (charge.invoiceId && !invoiceMutable) {
        return true; // locked to an issued invoice
      }

      return !mutableStatuses.has(charge.status) && !(charge.status === 'INVOICED' && invoiceMutable);
    });

    if (blockedCharge) {
      return NextResponse.json(
        {
          error: blockedCharge.invoiceId
            ? 'One or more charges are locked to an issued invoice. Reverse that invoice first.'
            : `Charge cannot be updated while it is ${blockedCharge.status.toLowerCase()}.`,
        },
        { status: 400 },
      );
    }

    const actorId = session.user.id;
    await prisma.$transaction(async (tx) => {
      for (const charge of charges) {
        const linkedInvoice = charge.invoiceId ? linkedInvoiceMap.get(charge.invoiceId) : undefined;

        await tx.shipmentCharge.update({
          where: { id: charge.id },
          data: {
            status: body.status,
            approvedAt: body.status === 'APPROVED' ? new Date() : null,
            approvedBy: body.status === 'APPROVED' ? actorId : null,
            notes: trimmedNote,
            // Release the charge from a not-yet-issued invoice; the next invoice
            // generation rebuilds the draft from approved charges.
            ...(linkedInvoice
              ? { invoiceId: null, invoicedAt: null }
              : {}),
          },
        });

        await tx.shipmentChargeAuditLog.create({
          data: {
            chargeId: charge.id,
            action: body.status === 'APPROVED' ? 'BULK_APPROVAL' : 'BULK_DISPUTE',
            description:
              body.status === 'APPROVED'
                ? `Shipment charge approved in bulk: ${charge.description}`
                : `Shipment charge disputed in bulk: ${charge.description}`,
            performedBy: actorId,
            oldValue: charge.status,
            newValue: body.status,
            metadata: {
              mode: 'bulk',
              chargeIds: uniqueChargeIds,
              ...(trimmedNote ? { note: trimmedNote } : {}),
              ...(linkedInvoice
                ? { releasedFromInvoice: linkedInvoice.invoiceNumber, releasedFromInvoiceStatus: linkedInvoice.status }
                : {}),
            },
          },
        });
      }
    });

    return NextResponse.json({ success: true, updated: uniqueChargeIds.length });
  } catch (error) {
    console.error('Error bulk updating shipment charges:', error);
    return NextResponse.json({ error: 'Failed to bulk update shipment charges' }, { status: 500 });
  }
}