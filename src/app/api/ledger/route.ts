import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { hasPermission } from '@/lib/rbac';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { syncShipmentChargeFromLedgerEntry } from '@/lib/billing/shipment-charges';
import { isBankImportMetadata, isRemovedBankImportMetadata } from '@/lib/financial/bankImportSources';
import { sendLedgerTransactionEmail } from '@/lib/email';

const transactionInfoTypeSchema = z.enum(['CAR_PAYMENT', 'SHIPPING_PAYMENT', 'STORAGE_PAYMENT']);
const transactionInfoTypes = ['CAR_PAYMENT', 'SHIPPING_PAYMENT', 'STORAGE_PAYMENT'] as const;

function isPaymentAllocationEntry(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as Record<string, unknown>).isPaymentAllocation === true;
}

function isPendingInvoiceEntry(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as Record<string, unknown>).pendingInvoice === true;
}

function isExpenseEntry(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as Record<string, unknown>).isExpense === true;
}

function getMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

function isShipmentPurchasePriceEntry(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as Record<string, unknown>).isShipmentPurchasePrice === true;
}

// Schema for creating a ledger entry
const createLedgerEntrySchema = z.object({
  userId: z.string(),
  shipmentId: z.string().optional(),
  description: z.string().min(1),
  type: z.enum(['DEBIT', 'CREDIT']),
  transactionInfoType: transactionInfoTypeSchema.optional(),
  amount: z.number().positive(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// GET - Fetch ledger entries with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const shipmentId = searchParams.get('shipmentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');
    const source = searchParams.get('source');
    const finicityCustomerId = searchParams.get('finicityCustomerId');
    const finicityAccountId = searchParams.get('finicityAccountId');
    const transactionInfoType = searchParams.get('transactionInfoType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');
    // Phase 2: balance recalculation is a write. It is now opt-in via
    // `?recalc=true` so a plain GET is a pure read and does not rewrite every
    // ledger balance on each page view.
    const recalcBalances = searchParams.get('recalc') === 'true';

    // Users without finance:manage can only view their own ledger.
    // For finance staff, view the requested userId if provided, all users if all=true/scope=all,
    // or default to their own personal ledger when viewing "My Ledger".
    const canViewAllLedgers = hasPermission(session.user.role, 'finance:manage');
    const isAllScope = searchParams.get('all') === 'true' || searchParams.get('scope') === 'all' || source === 'BANK_IMPORT';
    const targetUserId = !canViewAllLedgers
      ? session.user.id
      : userId
      ? userId
      : isAllScope
      ? undefined
      : session.user.id;
    const ledgerScope = !targetUserId ? 'all' : targetUserId === session.user.id ? 'own' : 'single';

    if (recalcBalances && targetUserId) {
      await recalculateUserLedgerBalances(prisma, targetUserId);
    }

    // Build base where clause for summary cards.
    const summaryWhere: Record<string, unknown> = {
      ...(targetUserId ? { userId: targetUserId } : {}),
    };

    if (shipmentId) {
      summaryWhere.shipmentId = shipmentId;
    }

    // Build filtered where clause for the table.
    const where: Record<string, unknown> = {
      ...summaryWhere,
    };

    if (type && (type === 'DEBIT' || type === 'CREDIT')) {
      where.type = type;
    }

    if (transactionInfoType && transactionInfoTypeSchema.safeParse(transactionInfoType).success) {
      where.transactionInfoType = transactionInfoType;
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        (where.transactionDate as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.transactionDate as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [allEntries, summaryEntriesRaw, latestEntry, shipmentPurchaseSummary, unpaidShipmentPurchaseSummary] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
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
              vehicleVIN: true,
              vehicleMake: true,
              vehicleModel: true,
              price: true,
              paymentStatus: true,
            },
          },
        },
        orderBy: {
          transactionDate: 'desc',
        },
      }),
      prisma.ledgerEntry.findMany({
        where: summaryWhere,
        select: {
          type: true,
          amount: true,
          transactionInfoType: true,
          shipmentId: true,
          metadata: true,
        },
      }),

      prisma.ledgerEntry.findFirst({
        where: { userId: targetUserId },
        orderBy: { transactionDate: 'desc' },
        select: { balance: true },
      }),
      prisma.shipment.aggregate({
        where: {
          userId: targetUserId,
          ...(shipmentId ? { id: shipmentId } : {}),
        },
        _sum: {
          purchasePrice: true,
        },
      }),
      prisma.shipment.aggregate({
        where: {
          userId: targetUserId,
          ...(shipmentId ? { id: shipmentId } : {}),
          paymentStatus: {
            notIn: ['COMPLETED', 'CANCELLED', 'REFUNDED'],
          },
        },
        _sum: {
          purchasePrice: true,
        },
      }),
    ]);

    // Prisma JSON path filtering is unreliable for this dataset when metadata is null/missing.
    // Filter flags in application code to keep ledger visibility deterministic.
    const visibleEntries = allEntries.filter((entry) => {
      const isPaymentAllocation = isPaymentAllocationEntry(entry.metadata);
      if (isPaymentAllocation) return false;

      if (isRemovedBankImportMetadata(entry.metadata)) return false;

      const isBankImport = isBankImportMetadata(entry.metadata);
      if (source === 'BANK_IMPORT' && !isBankImport) return false;
      if (source === 'MANUAL' && isBankImport) return false;

      if (finicityCustomerId && getMetadataString(entry.metadata, 'finicityCustomerId') !== finicityCustomerId) {
        return false;
      }

      if (finicityAccountId && getMetadataString(entry.metadata, 'finicityAccountId') !== finicityAccountId) {
        return false;
      }

      return true;
    });

    const summaryVisibleEntries = summaryEntriesRaw.filter((entry) => {
      const isPaymentAllocation = isPaymentAllocationEntry(entry.metadata);
      if (isPaymentAllocation) return false;

      if (isRemovedBankImportMetadata(entry.metadata)) return false;

      const isBankImport = isBankImportMetadata(entry.metadata);
      if (source === 'BANK_IMPORT' && !isBankImport) return false;
      if (source === 'MANUAL' && isBankImport) return false;

      if (finicityCustomerId && getMetadataString(entry.metadata, 'finicityCustomerId') !== finicityCustomerId) {
        return false;
      }

      if (finicityAccountId && getMetadataString(entry.metadata, 'finicityAccountId') !== finicityAccountId) {
        return false;
      }

      return true;
    });

    const totalCount = visibleEntries.length;
    const pagedEntries = visibleEntries.slice((page - 1) * limit, page * limit);

    // Summary follows the same balance semantics as the running ledger: shipment expenses
    // affect balances immediately, while payment allocation helper rows stay hidden.
    const summaryEntries = summaryVisibleEntries;

    const summary = summaryEntries.reduce(
      (accumulator, entry) => {
        if (entry.type === 'DEBIT') {
          if (!isShipmentPurchasePriceEntry(entry.metadata)) {
            accumulator.totalDebit += entry.amount;
          }
          if (isExpenseEntry(entry.metadata)) {
            accumulator.totalShipmentExpenses += entry.amount;
          }
        } else if (entry.type === 'CREDIT') {
          accumulator.totalCredit += entry.amount;
        }

        if (
          entry.transactionInfoType &&
          (entry.transactionInfoType === 'CAR_PAYMENT' ||
            entry.transactionInfoType === 'SHIPPING_PAYMENT' ||
            entry.transactionInfoType === 'STORAGE_PAYMENT')
        ) {
          const breakdown = accumulator.transactionInfoBreakdown[entry.transactionInfoType];
          if (entry.type === 'DEBIT') {
            breakdown.totalDebit += entry.amount;
          } else if (entry.type === 'CREDIT') {
            breakdown.totalCredit += entry.amount;
          }
          breakdown.balance = breakdown.totalDebit - breakdown.totalCredit;
        }

        return accumulator;
      },
      {
        totalDebit: 0,
        totalCredit: 0,
        totalShipmentExpenses: 0,
        transactionInfoBreakdown: transactionInfoTypes.reduce<Record<string, { totalDebit: number; totalCredit: number; balance: number }>>((accumulator, currentType) => {
          accumulator[currentType] = {
            totalDebit: 0,
            totalCredit: 0,
            balance: 0,
          };
          return accumulator;
        }, {}),
      }
    );

    const filteredSummary = {
      entryCount: totalCount,
      totalDebit: summary.totalDebit,
      totalCredit: summary.totalCredit,
      netChange: summary.totalDebit - summary.totalCredit,
    };

    return NextResponse.json({
      entries: pagedEntries,
      scope: ledgerScope,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalDebit: summary.totalDebit + (unpaidShipmentPurchaseSummary._sum.purchasePrice || 0),
        totalCredit: summary.totalCredit,
        totalShipmentPurchaseAmount: shipmentPurchaseSummary._sum.purchasePrice || 0,
        totalUnpaidShipmentPurchaseAmount: unpaidShipmentPurchaseSummary._sum.purchasePrice || 0,
        totalShipmentExpenses: summary.totalShipmentExpenses,
        currentBalance: ledgerScope === 'all' ? 0 : latestEntry?.balance || 0,
        transactionInfoBreakdown: summary.transactionInfoBreakdown,
      },
      filteredSummary,
    });
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger entries' },
      { status: 500 }
    );
  }
}

// POST - Create a new ledger entry
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only users with finance:manage can create ledger entries
    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createLedgerEntrySchema.parse(body);

    // Get the current balance for the user
    const latestEntry = await prisma.ledgerEntry.findFirst({
      where: { userId: validatedData.userId },
      orderBy: { transactionDate: 'desc' },
      select: { balance: true },
    });

    const currentBalance = latestEntry?.balance || 0;

    // Calculate new balance
    let newBalance = currentBalance;
    if (validatedData.type === 'DEBIT') {
      newBalance += validatedData.amount;
    } else {
      newBalance -= validatedData.amount;
    }

    const entry = await prisma.$transaction(async (tx) => {
      const createdEntry = await tx.ledgerEntry.create({
        data: {
          userId: validatedData.userId,
          shipmentId: validatedData.shipmentId,
          description: validatedData.description,
          type: validatedData.type,
          transactionInfoType: validatedData.transactionInfoType,
          amount: validatedData.amount,
          balance: newBalance,
          createdBy: session.user.id as string,
          notes: validatedData.notes,
          metadata: validatedData.metadata as never,
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
              vehicleVIN: true,
              vehicleMake: true,
              vehicleModel: true,
            },
          },
        },
      });

      await syncShipmentChargeFromLedgerEntry(tx, {
        entryId: createdEntry.id,
        userId: createdEntry.userId,
        shipmentId: createdEntry.shipmentId,
        description: createdEntry.description,
        type: createdEntry.type,
        amount: createdEntry.amount,
        transactionDate: createdEntry.transactionDate,
        transactionInfoType: createdEntry.transactionInfoType,
        notes: createdEntry.notes,
        metadata: createdEntry.metadata as Prisma.JsonValue | undefined,
        actorId: session.user.id as string,
      });

      return createdEntry;
    });

    // Create audit log
    await createAuditLog(
      'LedgerEntry',
      entry.id,
      'CREATE',
      session.user.id as string,
      { entry },
      request
    );

    // If this is a credit entry linked to a shipment, check if it's fully paid
    if (validatedData.shipmentId && validatedData.type === 'CREDIT') {
      const shipment = await prisma.shipment.findUnique({
        where: { id: validatedData.shipmentId },
        select: { id: true, price: true },
      });

      if (shipment && shipment.price) {
        // Get total debits and credits for this shipment
        const shipmentLedger = await prisma.ledgerEntry.groupBy({
          by: ['type'],
          where: { shipmentId: validatedData.shipmentId },
          _sum: {
            amount: true,
          },
        });

        const totalDebit = shipmentLedger.find(e => e.type === 'DEBIT')?._sum.amount || 0;
        const totalCredit = shipmentLedger.find(e => e.type === 'CREDIT')?._sum.amount || 0;

        // Update shipment payment status
        if (totalCredit >= totalDebit) {
          await prisma.shipment.update({
            where: { id: validatedData.shipmentId },
            data: { paymentStatus: 'COMPLETED' },
          });
        }
      }
    }

    if (entry.user?.email) {
      void sendLedgerTransactionEmail({
        to: entry.user.email,
        customerName: entry.user.name,
        direction: entry.type,
        amount: entry.amount,
        description: entry.description,
        balance: entry.balance,
        transactionDate: entry.transactionDate,
        notes: entry.notes,
      });
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating ledger entry:', error);
    return NextResponse.json(
      { error: 'Failed to create ledger entry' },
      { status: 500 }
    );
  }
}
