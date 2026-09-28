import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { roundToCents } from '@/lib/financial/money';
import type { Currency } from '@/lib/financial/currency';

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * Phase 3: Capture an FX snapshot on an invoice so a foreign-currency invoice
 * preserves the exact rate used at issue time.
 *
 * - Reads the most recent `ExchangeRate` row for the target currency.
 * - Falls back to the hardcoded `DEFAULT_RATES` when no row exists yet.
 * - Stores `fxRate` and `fxEffective` on the invoice.
 *
 * The `total` field is always stored in the invoice's own `currency`. If the
 * caller wants a USD-normalised total for reporting, use `convertToUsd`.
 */
export async function captureFxSnapshot(
  tx: DbClient,
  invoiceId: string,
  currency: Currency,
): Promise<void> {
  if (currency === 'USD') {
    await tx.userInvoice.update({
      where: { id: invoiceId },
      data: { currency, fxRate: null, fxEffective: null },
    });
    return;
  }

  const now = new Date();
  const row = await tx.exchangeRate.findFirst({
    where: { currency, effective: { lte: now } },
    orderBy: { effective: 'desc' },
  });

  // `row.rate` is "1 base = rate of currency". We store the inverse on the
  // invoice so that `total / fxRate` gives USD.
  const fxRate = row ? roundToCents(1 / row.rate) : null;
  const fxEffective = row?.effective ?? now;

  await tx.userInvoice.update({
    where: { id: invoiceId },
    data: { currency, fxRate, fxEffective },
  });
}

/**
 * Convert an invoice's `total` (stored in its own currency) to USD using the
 * FX snapshot captured at issue time. Returns the invoice total when the
 * invoice is USD or has no FX snapshot.
 */
export function convertToUsd(
  invoice: { total: number; currency: string; fxRate: number | null },
): number {
  if (invoice.currency === 'USD' || invoice.fxRate == null || invoice.fxRate === 0) {
    return roundToCents(invoice.total);
  }
  // total is in `currency`; fxRate = 1 base USD → fxRate of currency.
  // So USD = total / fxRate.
  return roundToCents(invoice.total / invoice.fxRate);
}
