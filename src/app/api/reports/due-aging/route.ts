import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { roundToCents, sumCents } from '@/lib/financial/money';

// GET - Generate due aging report.
// Phase 2: now ages by **invoice dueDate** (or shipment createdAt as fallback),
// not shipment createdAt alone. This fixes the bug where a shipment created
// 80 days ago but only invoiced yesterday would land in the 60+ bucket.
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view aging reports
    if (!hasPermission(session.user?.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Build where clause for shipments
    const shipmentWhere: Record<string, unknown> = {
      paymentStatus: 'PENDING', // Only unpaid shipments
    };

    if (userId) {
      shipmentWhere.userId = userId;
    }

    // Fetch shipments with their invoices so we can age by the invoice due date.
    const shipments = await prisma.shipment.findMany({
      where: shipmentWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ledgerEntries: {
          select: {
            type: true,
            amount: true,
          },
        },
        invoices: {
          where: {
            status: { not: 'CANCELLED' },
          },
          select: {
            id: true,
            dueDate: true,
            issueDate: true,
            status: true,
          },
        },
      },
    });

    const now = new Date();
    
    type ShipmentData = {
      id: string;
      vehicleMake: string | null;
      vehicleModel: string | null;
      user: { id: string; name: string | null; email: string };
      amountDue: number;
      ageInDays: number;
      price: number | null;
      /** The reference date used to compute ageInDays. */
      ageReference: 'invoiceDueDate' | 'shipmentCreatedAt';
    };
    
    const agingBuckets = {
      current: [] as ShipmentData[],      // 0-30 days
      aging30: [] as ShipmentData[],       // 31-60 days
      aging60: [] as ShipmentData[],       // 61-90 days
      aging90: [] as ShipmentData[],       // 90+ days
    };

    let totalCurrent = 0;
    let totalAging30 = 0;
    let totalAging60 = 0;
    let totalAging90 = 0;

    for (const shipment of shipments) {
      const ledgerAmounts = shipment.ledgerEntries.map((e) =>
        e.type === 'DEBIT' ? e.amount : -e.amount,
      );
      const netDue = roundToCents(Math.max(0, sumCents(ledgerAmounts)));

      if (netDue <= 0) {
        continue;
      }

      // Phase 2: age by the earliest open invoice dueDate; fall back to
      // shipment createdAt when the shipment has no open invoices yet.
      const openInvoices = shipment.invoices.filter((inv) => inv.status !== 'CANCELLED');
      let ageReference: ShipmentData['ageReference'] = 'shipmentCreatedAt';
      let referenceDate = shipment.createdAt;

      const dueDates = openInvoices
        .map((inv) => inv.dueDate)
        .filter((d): d is Date => Boolean(d));

      if (dueDates.length > 0) {
        // Use the earliest (most-overdue) open due date as the age reference.
        const earliestDue = dueDates.reduce((min, d) => (d < min ? d : min), dueDates[0]);
        if (earliestDue < now) {
          referenceDate = earliestDue;
          ageReference = 'invoiceDueDate';
        }
      }

      const ageInDays = Math.max(
        0,
        Math.floor((now.getTime() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24)),
      );

      const shipmentData: ShipmentData = {
        id: shipment.id,
        vehicleMake: shipment.vehicleMake,
        vehicleModel: shipment.vehicleModel,
        user: shipment.user,
        amountDue: netDue,
        ageInDays,
        price: shipment.price || 0,
        ageReference,
      };

      // Categorize by age
      if (ageInDays <= 30) {
        agingBuckets.current.push(shipmentData);
        totalCurrent = roundToCents(totalCurrent + netDue);
      } else if (ageInDays <= 60) {
        agingBuckets.aging30.push(shipmentData);
        totalAging30 = roundToCents(totalAging30 + netDue);
      } else if (ageInDays <= 90) {
        agingBuckets.aging60.push(shipmentData);
        totalAging60 = roundToCents(totalAging60 + netDue);
      } else {
        agingBuckets.aging90.push(shipmentData);
        totalAging90 = roundToCents(totalAging90 + netDue);
      }
    }

    // Calculate totals and percentages
    const grandTotal = roundToCents(totalCurrent + totalAging30 + totalAging60 + totalAging90);

    const report = {
      reportType: 'due-aging',
      generatedAt: now,
      summary: {
        totalShipments: shipments.length,
        totalAmountDue: grandTotal,
        buckets: {
          current: {
            count: agingBuckets.current.length,
            total: totalCurrent,
            percentage: grandTotal > 0 ? (totalCurrent / grandTotal) * 100 : 0,
            label: '0-30 Days',
          },
          aging30: {
            count: agingBuckets.aging30.length,
            total: totalAging30,
            percentage: grandTotal > 0 ? (totalAging30 / grandTotal) * 100 : 0,
            label: '31-60 Days',
          },
          aging60: {
            count: agingBuckets.aging60.length,
            total: totalAging60,
            percentage: grandTotal > 0 ? (totalAging60 / grandTotal) * 100 : 0,
            label: '61-90 Days',
          },
          aging90: {
            count: agingBuckets.aging90.length,
            total: totalAging90,
            percentage: grandTotal > 0 ? (totalAging90 / grandTotal) * 100 : 0,
            label: '90+ Days',
          },
        },
      },
      details: agingBuckets,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating due aging report:', error);
    return NextResponse.json(
      { error: 'Failed to generate due aging report' },
      { status: 500 }
    );
  }
}
