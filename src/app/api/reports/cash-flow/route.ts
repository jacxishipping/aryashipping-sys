import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { roundToCents } from '@/lib/financial/money';

/**
 * GET /api/reports/cash-flow
 *
 * Phase 2: Cash-flow forecast.
 * Sums `UserInvoice.total - amountPaid` across open (PENDING/SENT/OVERDUE)
 * invoices whose dueDate falls within the requested horizon (default: 30 days).
 * Buckets expected receipts by week so the dashboard can render a forward
 * cash-in curve.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const horizonDays = Math.max(
      1,
      Math.min(365, parseInt(searchParams.get('horizonDays') || '30', 10) || 30),
    );

    const now = new Date();
    const horizonEnd = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      status: { in: ['PENDING', 'SENT', 'OVERDUE'] },
      dueDate: { gte: now, lte: horizonEnd },
    };

    if (userId) {
      where.userId = userId;
    }

    const invoices = await prisma.userInvoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        amountPaid: true,
        dueDate: true,
      },
      orderBy: [{ dueDate: 'asc' }],
    });

    // Bucket by 7-day windows starting from `now`.
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const weekCount = Math.ceil(horizonDays / 7);
    const weeks: Array<{ week: number; label: string; expected: number; invoices: number }> = [];

    for (let w = 0; w < weekCount; w++) {
      weeks.push({
        week: w + 1,
        label: `Week ${w + 1} (Day ${w * 7 + 1}-${Math.min((w + 1) * 7, horizonDays)})`,
        expected: 0,
        invoices: 0,
      });
    }

    let totalExpected = 0;
    for (const invoice of invoices) {
      const remaining = roundToCents(Math.max(0, invoice.total - (invoice.amountPaid ?? 0)));
      if (remaining <= 0 || !invoice.dueDate) continue;

      const weekIndex = Math.min(
        weekCount - 1,
        Math.floor((new Date(invoice.dueDate).getTime() - now.getTime()) / WEEK_MS),
      );
      const bucket = weeks[weekIndex];
      bucket.expected = roundToCents(bucket.expected + remaining);
      bucket.invoices += 1;
      totalExpected = roundToCents(totalExpected + remaining);
    }

    return NextResponse.json({
      reportType: 'cash-flow',
      generatedAt: now,
      horizonDays,
      summary: {
        totalExpected: totalExpected,
        invoiceCount: invoices.length,
      },
      weeks,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate,
        expected: roundToCents(Math.max(0, inv.total - (inv.amountPaid ?? 0))),
      })),
    });
  } catch (error) {
    console.error('Error generating cash-flow forecast:', error);
    return NextResponse.json(
      { error: 'Failed to generate cash-flow forecast' },
      { status: 500 },
    );
  }
}
