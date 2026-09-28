import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from '@/lib/rbac';

type CustomerAR = {
  customerId: string;
  customerName: string;
  invoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    dueDate: Date | null;
    status: string;
  }>;
  totalOutstanding: number;
};

/**
 * GET /api/analytics/ar-aging
 * Returns Accounts Receivable aging report
 * Categorizes outstanding invoices by age: Current, 1-30, 31-60, 61-90, 90+ days
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user?.role, 'analytics:view')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all unpaid invoices
    const invoices = await prisma.userInvoice.findMany({
      where: {
        status: {
          in: ["PENDING", "OVERDUE"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        container: {
          select: {
            id: true,
            containerNumber: true,
            shipments: {
              select: {
                id: true,
                vehicleVIN: true,
                vehicleMake: true,
                vehicleModel: true,
                vehicleYear: true,
              },
              take: 1, // Just get first shipment for reference
            },
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    const today = new Date();
    // ⚡ Bolt: Consolidated O(3N) multiple iterations into a single O(N) pass
    const aging = {
      current: [] as any[],
      days1to30: [] as any[],
      days31to60: [] as any[],
      days61to90: [] as any[],
      days90plus: [] as any[],
    };

    const summary = {
      current: { count: 0, amount: 0 },
      days1to30: { count: 0, amount: 0 },
      days31to60: { count: 0, amount: 0 },
      days61to90: { count: 0, amount: 0 },
      days90plus: { count: 0, amount: 0 },
      total: { count: 0, amount: 0 },
    };

    const byCustomer: Record<string, CustomerAR> = {};

    for (const invoice of invoices) {
      const customerId = invoice.user?.id || "unknown";
      const customerName = invoice.user?.name || invoice.user?.email || "Unknown";

      // ⚡ Bolt: Accumulate overall totals and customer data for all invoices
      summary.total.count++;
      summary.total.amount += invoice.total;

      if (!byCustomer[customerId]) {
        byCustomer[customerId] = {
          customerId,
          customerName,
          invoices: [],
          totalOutstanding: 0,
        };
      }

      byCustomer[customerId].invoices.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.total,
        dueDate: invoice.dueDate,
        status: invoice.status,
      });
      byCustomer[customerId].totalOutstanding += invoice.total;

      // ⚡ Bolt: Skip aging buckets if there's no due date
      if (!invoice.dueDate) continue;

      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      const invoiceDetail = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId,
        customerName,
        amount: invoice.total,
        dueDate: invoice.dueDate,
        daysOverdue: Math.max(0, daysOverdue),
        status: invoice.status,
        container: invoice.container?.containerNumber || "N/A",
        shipment: invoice.container?.shipments[0]
          ? `${invoice.container.shipments[0].vehicleYear} ${invoice.container.shipments[0].vehicleMake} ${invoice.container.shipments[0].vehicleModel} (${invoice.container.shipments[0].vehicleVIN})`
          : "N/A",
      };

      if (daysOverdue < 0) {
        aging.current.push(invoiceDetail);
        summary.current.count++;
        summary.current.amount += invoice.total;
      } else if (daysOverdue <= 30) {
        aging.days1to30.push(invoiceDetail);
        summary.days1to30.count++;
        summary.days1to30.amount += invoice.total;
      } else if (daysOverdue <= 60) {
        aging.days31to60.push(invoiceDetail);
        summary.days31to60.count++;
        summary.days31to60.amount += invoice.total;
      } else if (daysOverdue <= 90) {
        aging.days61to90.push(invoiceDetail);
        summary.days61to90.count++;
        summary.days61to90.amount += invoice.total;
      } else {
        aging.days90plus.push(invoiceDetail);
        summary.days90plus.count++;
        summary.days90plus.amount += invoice.total;
      }
    }

    return NextResponse.json({
      summary,
      aging,
      byCustomer: Object.values(byCustomer).sort(
        (a, b) => b.totalOutstanding - a.totalOutstanding
      ),
      generatedAt: today.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching AR aging report:", error);
    return NextResponse.json(
      { error: "Failed to fetch AR aging report" },
      { status: 500 }
    );
  }
}
