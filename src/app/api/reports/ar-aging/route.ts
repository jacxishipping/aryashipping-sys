import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { roundToCents } from '@/lib/financial/money';

/**
 * GET /api/reports/ar-aging
 *
 * Phase 2: Accounts-receivable aging **by invoice**, not by shipment.
 * Each open (PENDING/SENT/OVERDUE) invoice is bucketed by how many days it
 * is past its due date. This replaces the semantic bug in `due-aging` where
 * a shipment created 80 days ago but invoiced yesterday would land in the
 * 60+ bucket.
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

    const now = new Date();

    const where: Record<string, unknown> = {
      status: { in: ['PENDING', 'SENT', 'OVERDUE'] },
      dueDate: { lt: now },
    };

    if (userId) {
      where.userId = userId;
    }

    const invoices = await prisma.userInvoice.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ dueDate: 'asc' }],
    });

    type Bucket = {
      invoices: Array<{
        id: string;
        invoiceNumber: string;
        user: { id: string; name: string | null; email: string };
        total: number;
        amountRemaining: number;
        dueDate: Date;
        daysOverdue: number;
        status: string;
      }>;
      total: number;
    };

    const buckets: Record<'current' | 'aging30' | 'aging60' | 'aging90', Bucket> = {
      current: { invoices: [], total: 0 },
      aging30: { invoices: [], total: 0 },
      aging60: { invoices: [], total: 0 },
      aging90: { invoices: [], total: 0 },
    };

    for (const invoice of invoices) {
      const remaining = roundToCents(Math.max(0, invoice.total - (invoice.amountPaid ?? 0)));
      if (remaining <= 0) continue;

      const daysOverdue = Math.max(
        0,
        Math.floor((now.getTime() - new Date(invoice.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
      );

      const entry = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        user: invoice.user,
        total: invoice.total,
        amountRemaining: remaining,
        dueDate: invoice.dueDate!,
        daysOverdue,
        status: String(invoice.status),
      };

      if (daysOverdue <= 30) {
        buckets.current.invoices.push(entry);
        buckets.current.total = roundToCents(buckets.current.total + remaining);
      } else if (daysOverdue <= 60) {
        buckets.aging30.invoices.push(entry);
        buckets.aging30.total = roundToCents(buckets.aging30.total + remaining);
      } else if (daysOverdue <= 90) {
        buckets.aging60.invoices.push(entry);
        buckets.aging60.total = roundToCents(buckets.aging60.total + remaining);
      } else {
        buckets.aging90.invoices.push(entry);
        buckets.aging90.total = roundToCents(buckets.aging90.total + remaining);
      }
    }

    const grandTotal = roundToCents(
      buckets.current.total + buckets.aging30.total + buckets.aging60.total + buckets.aging90.total,
    );

    return NextResponse.json({
      reportType: 'ar-aging',
      generatedAt: now,
      summary: {
        totalInvoices: invoices.length,
        totalAmountDue: grandTotal,
        buckets: {
          current: {
            count: buckets.current.invoices.length,
            total: buckets.current.total,
            percentage: grandTotal > 0 ? (buckets.current.total / grandTotal) * 100 : 0,
            label: '0-30 Days Overdue',
          },
          aging30: {
            count: buckets.aging30.invoices.length,
            total: buckets.aging30.total,
            percentage: grandTotal > 0 ? (buckets.aging30.total / grandTotal) * 100 : 0,
            label: '31-60 Days Overdue',
          },
          aging60: {
            count: buckets.aging60.invoices.length,
            total: buckets.aging60.total,
            percentage: grandTotal > 0 ? (buckets.aging60.total / grandTotal) * 100 : 0,
            label: '61-90 Days Overdue',
          },
          aging90: {
            count: buckets.aging90.invoices.length,
            total: buckets.aging90.total,
            percentage: grandTotal > 0 ? (buckets.aging90.total / grandTotal) * 100 : 0,
            label: '90+ Days Overdue',
          },
        },
      },
      details: buckets,
    });
  } catch (error) {
    console.error('Error generating AR aging report:', error);
    return NextResponse.json(
      { error: 'Failed to generate AR aging report' },
      { status: 500 },
    );
  }
}
