import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { NotificationType } from '@prisma/client';
import { createNotification } from '@/lib/notifications';

const disputeSchema = z.object({
  shipmentId: z.string().nullable().optional(),
  description: z.string().min(1).max(500),
  amount: z.number().finite(),
  reason: z.string().min(5, 'Please describe the reason (at least a few words)').max(1000),
  note: z.string().max(2000).optional(),
});

/**
 * POST /api/invoices/[id]/dispute
 *
 * Lets the invoice owner (the customer) dispute an invoice line. The server
 * maps the line back to the shipment charge that produced it and flips it to
 * DISPUTED (keeping the invoice link so the issued document is untouched),
 * writes audit entries, and notifies the finance team.
 *
 * Staff with invoices:manage may also use this endpoint.
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = disputeSchema.parse(await req.json());

    const invoice = await prisma.userInvoice.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        invoiceNumber: true,
        shipmentId: true,
      },
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const isStaff = hasPermission(session.user.role, 'invoices:manage');
    const isOwner = invoice.userId === session.user.id;
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') {
      return NextResponse.json(
        { error: `This invoice is ${invoice.status.toLowerCase()} and cannot be disputed.` },
        { status: 400 }
      );
    }

    // Map the line back to the shipment charge that produced it.
    const shipmentId = body.shipmentId ?? invoice.shipmentId ?? undefined;
    const charges = await prisma.shipmentCharge.findMany({
      where: {
        invoiceId: invoice.id,
        ...(shipmentId ? { shipmentId } : {}),
        totalAmount: body.amount,
      },
      orderBy: [{ status: 'asc' }],
      select: { id: true, status: true, description: true, notes: true, metadata: true },
    });

    const exact = charges.find((charge) => charge.description === body.description);
    const charge = exact ?? charges[0];

    if (!charge) {
      return NextResponse.json(
        {
          error:
            'This line could not be matched to a billable charge, so it cannot be disputed online. Please contact our support team.',
        },
        { status: 400 }
      );
    }

    const existingMetadata = (charge.metadata ?? {}) as Record<string, unknown>;

    await prisma.$transaction(async (tx) => {
      await tx.shipmentCharge.update({
        where: { id: charge.id },
        data: {
          status: 'DISPUTED',
          notes: [charge.notes, `Customer dispute: ${body.reason}`].filter(Boolean).join(' — '),
          metadata: {
            ...existingMetadata,
            customerDispute: {
              reason: body.reason,
              note: body.note?.trim() || null,
              by: session.user.id,
              byRole: session.user.role,
              at: new Date().toISOString(),
            },
          },
        },
      });

      await tx.shipmentChargeAuditLog.create({
        data: {
          chargeId: charge.id,
          action: 'CUSTOMER_DISPUTE',
          description: `Invoice line disputed: ${body.description}`,
          performedBy: session.user.id as string,
          oldValue: charge.status,
          newValue: 'DISPUTED',
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            reason: body.reason,
            ...(body.note?.trim() ? { note: body.note.trim() } : {}),
          },
        },
      });

      await tx.invoiceAuditLog.create({
        data: {
          invoiceId: invoice.id,
          action: 'CUSTOMER_DISPUTE',
          description: `Customer disputed line "${body.description}" (${body.amount.toFixed(2)}) — ${body.reason}`,
          performedBy: session.user.id as string,
          metadata: body.note?.trim() ? { note: body.note.trim() } : undefined,
        },
      });
    });

    // Notify the finance team so the dispute is actually seen.
    const staff = await prisma.user.findMany({
      where: { role: { in: ['admin', 'manager', 'finance'] } },
      select: { id: true },
    });
    for (const member of staff) {
      try {
        await createNotification({
          userId: member.id,
          senderId: session.user.id as string,
          title: 'Invoice dispute submitted',
          description: `Customer disputed a line on invoice ${invoice.invoiceNumber}: ${body.reason}`,
          type: NotificationType.INFO,
          link: `/dashboard/invoices/${invoice.id}`,
        });
      } catch {
        // Notification failures must not fail the dispute submission.
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Dispute submitted — our team will review it and reply shortly.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }
    console.error('Error submitting invoice dispute:', error);
    return NextResponse.json({ error: 'Failed to submit dispute' }, { status: 500 });
  }
}
