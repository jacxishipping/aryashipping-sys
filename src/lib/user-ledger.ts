import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { isRemovedBankImportMetadata } from '@/lib/financial/bankImportSources';

type DbClient = Prisma.TransactionClient | typeof prisma;

function applyLedgerDelta(currentBalance: number, type: 'DEBIT' | 'CREDIT', amount: number) {
  return type === 'DEBIT' ? currentBalance + amount : currentBalance - amount;
}

export async function recalculateUserLedgerBalances(db: DbClient, userId: string) {
  const entries = await db.ledgerEntry.findMany({
    where: { userId },
    orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
  });

  let runningBalance = 0;

  const updates = [];

  for (const entry of entries) {
    const meta = (entry.metadata ?? {}) as Record<string, unknown>;
    // Payment allocation entries track how a payment was split across shipments.
    // The overall balance impact is already captured by the main CREDIT payment entry,
    // so these per-shipment entries must be excluded to prevent double-counting.
    const isPaymentAllocation = meta.isPaymentAllocation === true;
    const isRemovedBankImport = isRemovedBankImportMetadata(entry.metadata);

    if (!isPaymentAllocation && !isRemovedBankImport) {
      runningBalance = applyLedgerDelta(runningBalance, entry.type, entry.amount);
    }

    if (entry.balance !== runningBalance) {
      updates.push(
        db.ledgerEntry.update({
          where: { id: entry.id },
          data: { balance: runningBalance },
        })
      );
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return runningBalance;
}
