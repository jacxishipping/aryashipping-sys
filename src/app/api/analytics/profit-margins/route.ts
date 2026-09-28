import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/analytics/profit-margins
 * Returns profit margin analysis by service type, container, and customer
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user?.role, 'analytics:view')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all containers with their shipments, invoices, and expenses
    const containers = await prisma.container.findMany({
      include: {
        shipments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        userInvoices: {
          include: {
            lineItems: true,
          },
        },
        expenses: true,
      },
    });

    // ⚡ Bolt: Replace O(N * M) chained iterations with single-pass loops
    const profitAnalysis = [];
    let summaryTotalRevenue = 0;
    let summaryTotalCosts = 0;
    let summaryTotalProfit = 0;
    let summaryTotalProfitMargin = 0;

    for (const container of containers) {
      if (container.shipments.length === 0) continue;

      let revenue = 0;
      for (const invoice of container.userInvoices) {
        for (const item of invoice.lineItems) {
          revenue += item.amount;
        }
      }

      let totalExpenses = 0;
      for (const exp of container.expenses) {
        totalExpenses += exp.amount;
      }

      let purchaseCosts = 0;
      let purchaseAndShippingCount = 0;
      let shippingOnlyCount = 0;
      const vehicles = [];

      for (const shipment of container.shipments) {
        if (shipment.serviceType === "PURCHASE_AND_SHIPPING") {
          purchaseCosts += shipment.purchasePrice || 0;
          purchaseAndShippingCount++;
        } else if (shipment.serviceType === "SHIPPING_ONLY") {
          shippingOnlyCount++;
        }

        vehicles.push({
          id: shipment.id,
          vin: shipment.vehicleVIN,
          vehicle: `${shipment.vehicleYear} ${shipment.vehicleMake} ${shipment.vehicleModel}`,
          serviceType: shipment.serviceType,
          customer: shipment.user?.name || shipment.user?.email || "Unknown",
        });
      }

      const totalCost = purchaseCosts + totalExpenses;
      const profit = revenue - totalCost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      profitAnalysis.push({
        containerId: container.id,
        containerNumber: container.containerNumber,
        status: container.status,
        shipmentCount: container.shipments.length,
        serviceTypes: {
          purchaseAndShipping: purchaseAndShippingCount,
          shippingOnly: shippingOnlyCount,
        },
        revenue,
        costs: {
          purchaseCosts,
          containerExpenses: totalExpenses,
          total: totalCost,
        },
        profit,
        profitMargin: Number(profitMargin.toFixed(2)),
        invoiceCount: container.userInvoices.length,
        vehicles,
      });

      summaryTotalRevenue += revenue;
      summaryTotalCosts += totalCost;
      summaryTotalProfit += profit;
      summaryTotalProfitMargin += profitMargin;
    }

    const summary = {
      overall: {
        containerCount: profitAnalysis.length,
        totalRevenue: summaryTotalRevenue,
        totalCosts: summaryTotalCosts,
        totalProfit: summaryTotalProfit,
        avgProfitMargin: profitAnalysis.length > 0
          ? summaryTotalProfitMargin / profitAnalysis.length
          : 0,
      },
    };

    return NextResponse.json({
      summary,
      containers: profitAnalysis.sort((a, b) => b.profitMargin - a.profitMargin),
    });
  } catch (error) {
    console.error("Error fetching profit margins:", error);
    return NextResponse.json(
      { error: "Failed to fetch profit margins" },
      { status: 500 }
    );
  }
}
