import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { z } from 'zod';
import { fetchExchangeRates, type Currency } from '@/lib/financial/currency';

const upsertRateSchema = z.object({
  currency: z.string(),
  rate: z.number().positive(),
  source: z.string().default('MANUAL'),
});

/**
 * GET /api/finance/exchange-rates
 * Return the latest effective ExchangeRate rows, falling back to the
 * hardcoded defaults when the table is empty (first deploy).
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(session.user.role, 'finance:view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const rows = await prisma.exchangeRate.findMany({
    where: { effective: { lte: now } },
    orderBy: { effective: 'desc' },
  });

  const byCurrency = new Map<string, { rate: number; effective: Date; source: string }>();
  for (const row of rows) {
    if (!byCurrency.has(row.currency)) {
      byCurrency.set(row.currency, {
        rate: row.rate,
        effective: row.effective,
        source: row.source,
      });
    }
  }

  const defaults = await fetchExchangeRates();
  const merged: Record<string, { rate: number; effective: Date; source: string }> = {};
  for (const [currency, rate] of Object.entries(defaults)) {
    merged[currency] = byCurrency.get(currency) || {
      rate,
      effective: now,
      source: 'DEFAULT',
    };
  }

  return NextResponse.json({
    base: 'USD',
    rates: merged,
    fetchedAt: now,
    dbRows: rows.length,
  });
}

/**
 * POST /api/finance/exchange-rates
 * Upsert a single rate. Body: { currency, rate, source? }.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(session.user.role, 'finance:manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = upsertRateSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid data', details: body.error.issues }, { status: 400 });
  }

  const { currency, rate, source } = body.data;

  const known = Object.keys(
    (await import('@/lib/financial/currency')).CURRENCY_CONFIG,
  ) as Currency[];
  if (!known.includes(currency as Currency)) {
    return NextResponse.json(
      { error: `Unsupported currency: ${currency}. Supported: ${known.join(', ')}` },
      { status: 400 },
    );
  }

  const now = new Date();
  const created = await prisma.exchangeRate.create({
    data: { currency, rate, source, effective: now },
  });

  return NextResponse.json({
    success: true,
    rate: {
      currency: created.currency,
      rate: created.rate,
      source: created.source,
      effective: created.effective,
      id: created.id,
    },
  });
}
