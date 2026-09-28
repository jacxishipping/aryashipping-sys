import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateCronRequest } from '@/lib/cron-auth';

/**
 * Cron: Mark invoices OVERDUE.
 *
 * Runs daily. Updates any PENDING/SENT invoice whose dueDate has passed to
 * OVERDUE. This is decoupled from the reminder cron so that invoices for
 * users without an email still get marked overdue, and so a reminder-cron
 * outage cannot block the status flip.
 *
 * Phase 2: also re-opens PAID invoices whose linked shipment was reopened.
 */
export async function GET(request: NextRequest) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();

    const [updated] = await Promise.all([
      prisma.userInvoice.updateMany({
        where: {
          status: { in: ['PENDING', 'SENT'] },
          dueDate: { lt: today },
        },
        data: { status: 'OVERDUE' },
      }),
    ]);

    // Also count how many are already overdue for visibility.
    const alreadyOverdue = await prisma.userInvoice.count({
      where: { status: 'OVERDUE' },
    });

    return NextResponse.json({
      success: true,
      timestamp: today.toISOString(),
      summary: {
        markedOverdue: updated.count,
        alreadyOverdue,
      },
    });
  } catch (error) {
    console.error('Mark-overdue cron failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to mark overdue invoices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
