import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { z } from 'zod';
import { hasPermission } from '@/lib/rbac';

// Schema for updating a ledger entry
const updateLedgerEntrySchema = z.object({
  description: z.string().min(1).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// GET - Fetch a single ledger entry
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shipment: {
          select: {
            id: true,
            vehicleMake: true,
            vehicleModel: true,
            price: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
    }

    // Users without finance permissions can only view their own entries
    if (!hasPermission(session.user.role, 'finance:manage') && entry.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Error fetching ledger entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger entry' },
      { status: 500 }
    );
  }
}

// PATCH - Update a ledger entry (only description, notes, metadata)
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only users with finance:manage can update ledger entries
    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateLedgerEntrySchema.parse(body);

    // Update only non-financial fields
    const updatedEntry = await prisma.ledgerEntry.update({
      where: { id: params.id },
      data: {
        description: validatedData.description,
        notes: validatedData.notes,
        metadata: validatedData.metadata
          ? ({
              ...(typeof entry.metadata === 'object' && entry.metadata !== null
                ? (entry.metadata as Record<string, unknown>)
                : {}),
              ...validatedData.metadata,
            } as never)
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shipment: {
          select: {
            id: true,
            vehicleMake: true,
            vehicleModel: true,
          },
        },
      },
    });

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating ledger entry:', error);
    return NextResponse.json(
      { error: 'Failed to update ledger entry' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a ledger entry (admin only, with balance recalculation)
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only users with finance:manage can delete ledger entries
    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
    }

    // Use transaction to ensure both user and company ledger entries are deleted atomically
    await prisma.$transaction(async (tx) => {
      // Find and delete the corresponding company ledger entry (if it exists)
      // Company ledger entries created from expenses have reference: "shipment-expense:{ledgerEntryId}"
      const companyLedgerReference = `shipment-expense:${params.id}`;
      const companyLedgerEntry = await tx.companyLedgerEntry.findFirst({
        where: { reference: companyLedgerReference },
      });

      if (companyLedgerEntry) {
        await tx.companyLedgerEntry.delete({
          where: { id: companyLedgerEntry.id },
        });

        // Recalculate company ledger balances
        await recalculateCompanyLedgerBalances(tx, companyLedgerEntry.companyId);
      }

      // If this is an expense entry linked to a shipment, remove the matching invoice line item
      const metadata = entry.metadata as Record<string, unknown> | null;
      const isExpense = metadata?.isExpense === true || metadata?.isExpense === 'true';
      if (isExpense && entry.shipmentId) {
        // Remove all matching line items from editable invoices so refreshed and draft invoices
        // stay aligned with the current shipment financials.
        const matchingLineItems = await tx.invoiceLineItem.findMany({
          where: {
            shipmentId: entry.shipmentId,
            description: entry.description,
            amount: entry.amount,
            invoice: { status: { notIn: ['PAID', 'CANCELLED'] } },
          },
          include: { invoice: { select: { id: true, subtotal: true, discount: true, tax: true } } },
        });

        if (matchingLineItems.length > 0) {
          const invoiceAdjustments = new Map<string, { subtotal: number; discount: number | null; tax: number | null; removedAmount: number }>();

          for (const lineItem of matchingLineItems) {
            const existing = invoiceAdjustments.get(lineItem.invoice.id);
            if (existing) {
              existing.removedAmount += lineItem.amount;
            } else {
              invoiceAdjustments.set(lineItem.invoice.id, {
                subtotal: lineItem.invoice.subtotal,
                discount: lineItem.invoice.discount,
                tax: lineItem.invoice.tax,
                removedAmount: lineItem.amount,
              });
            }
          }

          await tx.invoiceLineItem.deleteMany({
            where: {
              id: { in: matchingLineItems.map((lineItem) => lineItem.id) },
            },
          });

          for (const [invoiceId, adjustment] of invoiceAdjustments.entries()) {
            const newSubtotal = adjustment.subtotal - adjustment.removedAmount;
            const newTotal = newSubtotal - (adjustment.discount ?? 0) + (adjustment.tax ?? 0);
            await tx.userInvoice.update({
              where: { id: invoiceId },
              data: { subtotal: newSubtotal, total: newTotal },
            });
          }
        }
      }

      // Delete the user ledger entry
      await tx.ledgerEntry.delete({
        where: { id: params.id },
      });

      // Recalculate balances for all subsequent user ledger entries
      const subsequentEntries = await tx.ledgerEntry.findMany({
        where: {
          userId: entry.userId,
          transactionDate: {
            gte: entry.transactionDate,
          },
        },
        orderBy: {
          transactionDate: 'asc',
        },
      });

      // Get the balance before the deleted entry
      const previousEntry = await tx.ledgerEntry.findFirst({
        where: {
          userId: entry.userId,
          transactionDate: {
            lt: entry.transactionDate,
          },
        },
        orderBy: {
          transactionDate: 'desc',
        },
      });

      let runningBalance = previousEntry?.balance || 0;

      // Update balances for all subsequent entries
      for (const subsequentEntry of subsequentEntries) {
        if (subsequentEntry.type === 'DEBIT') {
          runningBalance += subsequentEntry.amount;
        } else {
          runningBalance -= subsequentEntry.amount;
        }

        await tx.ledgerEntry.update({
          where: { id: subsequentEntry.id },
          data: { balance: runningBalance },
        });
      }
    });

    return NextResponse.json({ message: 'Ledger entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting ledger entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete ledger entry' },
      { status: 500 }
    );
  }
}
