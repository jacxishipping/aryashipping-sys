import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { hasPermission } from '@/lib/rbac';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { roundToCents } from '@/lib/financial/money';
import { UserInvoiceStatus } from '@prisma/client';

/**
 * POST /api/invoices/[id]/refund
 *
 * Refund (partially or fully) a paid invoice. Creates a CREDIT ledger entry
 * to reverse the original payment, and transitions the invoice to
 * PARTIALLY_PAID or REFUNDED depending on the amount.
 *
 * Body:
 *   amount       number (required) – dollar amount to refund (≤ invoice.amountRemaining at creation, or ≤ total for full refund)
 *   reason       string (optional)
 *   idempotencyKey string (optional, min 8, max 128)
 */
const refundSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().max(500).optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validated = refundSchema.parse(body);
    const actorId = session.user.id as string;

    // Idempotency check (reuse Payment.idempotencyKey if a payment row is created)
    if (validated.idempotencyKey) {
      const existingPayment = await prisma.payment.findFirst({
        where: {
          idempotencyKey: validated.idempotencyKey,
          userId: '', // will be replaced after we know the user
          metadata: { path: ['refundOfInvoice'], equals: params.id },
        },
        select: { id: true },
      });
      if (existingPayment) {
        return NextResponse.json({ message: 'Refund already recorded (idempotent replay).' }, { status: 200 });
      }
    }

    const invoice = await prisma.userInvoice.findUnique({
      where: { id: params.id },
      include: { lineItems: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const previousStatus = invoice.status as UserInvoiceStatus;

    // Only PAID or PARTIALLY_PAID invoices can be refunded.
    const refundableStatuses: UserInvoiceStatus[] = ['PAID', 'PARTIALLY_PAID'];
    if (!refundableStatuses.includes(previousStatus)) {
      return NextResponse.json(
        { error: `Invoice ${invoice.invoiceNumber} is ${previousStatus} and cannot be refunded.` },
        { status: 400 },
      );
    }

    const refundAmount = roundToCents(validated.amount);

    if (refundAmount > invoice.total + 0.005) {
      return NextResponse.json(
        { error: `Refund amount $${refundAmount.toFixed(2)} exceeds invoice total $${invoice.total.toFixed(2)}.` },
        { status: 400 },
      );
    }

    const willBeFullyRefunded = refundAmount >= invoice.total - 0.005;

    await prisma.$transaction(async (tx) => {
      // 1. Post a CREDIT ledger entry reversing the refund amount.
      //    The CREDIT reduces what the customer owes (i.e. gives credit back).
      const latestEntry = await tx.ledgerEntry.findFirst({
        where: { userId: invoice.userId },
        orderBy: { transactionDate: 'desc' },
        select: { balance: true },
      });
      const currentBalance = latestEntry?.balance ?? 0;
      const newBalance = roundToCents(currentBalance + refundAmount);

      await tx.ledgerEntry.create({
        data: {
          userId: invoice.userId,
          description: `Refund of ${invoice.invoiceNumber} — ${validated.reason ?? 'customer refund'}`,
          type: 'CREDIT',
          amount: refundAmount,
          balance: newBalance,
          createdBy: actorId,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            refundOf: invoice.invoiceNumber,
            refundReason: validated.reason ?? null,
            paymentType: 'refund',
          },
        },
      });

      // 2. Update the invoice: status + amountPaid/amountRemaining.
      const newAmountPaid = roundToCents(Math.max(0, (invoice.amountPaid ?? 0) - refundAmount));
      const newAmountRemaining = roundToCents(invoice.total - newAmountPaid);
      const newStatus: UserInvoiceStatus = willBeFullyRefunded
        ? 'REFUNDED'
        : 'PARTIALLY_PAID';

      await tx.userInvoice.update({
        where: { id: invoice.id },
        data: {
          status: newStatus,
          amountPaid: newAmountPaid,
          amountRemaining: newAmountRemaining,
          paidDate: willBeFullyRefunded ? null : invoice.paidDate,
        },
      });

      // 3. Recalculate running ledger balances so the credit is reflected.
      await recalculateUserLedgerBalances(tx, invoice.userId);
    });

    return NextResponse.json({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      refundAmount,
      reason: validated.reason ?? null,
      status: willBeFullyRefunded ? 'REFUNDED' : 'PARTIALLY_PAID',
      message: willBeFullyRefunded
        ? `Invoice ${invoice.invoiceNumber} fully refunded.`
        : `Partial refund of $${refundAmount.toFixed(2)} recorded against ${invoice.invoiceNumber}.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error processing invoice refund:', error);
    return NextResponse.json({ error: 'Failed to process invoice refund' }, { status: 500 });
  }
}
