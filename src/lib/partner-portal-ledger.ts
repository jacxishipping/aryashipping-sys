import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type DbClient = Prisma.TransactionClient | typeof prisma;

function applyLedgerDelta(currentBalance: number, type: 'DEBIT' | 'CREDIT', amount: number) {
  return type === 'DEBIT' ? currentBalance + amount : currentBalance - amount;
}

export async function recalculatePartnerPortalLedgerBalances(
  db: DbClient,
  portalId: string,
  partnerCustomerId: string,
) {
  const entries = await db.partnerPortalLedgerEntry.findMany({
    where: {
      portalId,
      partnerCustomerId,
    },
    orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
  });

  let runningBalance = 0;
  const updates = [];

  for (const entry of entries) {
    runningBalance = applyLedgerDelta(runningBalance, entry.type, entry.amount);

    if (entry.balance !== runningBalance) {
      updates.push(
        db.partnerPortalLedgerEntry.update({
          where: { id: entry.id },
          data: { balance: runningBalance },
        }),
      );
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return runningBalance;
}