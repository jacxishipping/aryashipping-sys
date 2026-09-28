import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { calculateCompanyPaymentStatus } from '@/lib/company-payment-status';

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      !hasPermission(session.user.role, 'workflow:move') ||
      !hasPermission(session.user.role, 'shipments:manage')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const state = searchParams.get('state') || 'active';
    const where: Prisma.ShipmentWhereInput = {
      companyGetpassStartedAt: { not: null },
      ...(state === 'active' ? { companyGetpassCompletedAt: null } : {}),
      ...(state === 'completed' ? { companyGetpassCompletedAt: { not: null } } : {}),
      ...(search ? {
        OR: [
          { vehicleVIN: { contains: search, mode: 'insensitive' } },
          { vehicleMake: { contains: search, mode: 'insensitive' } },
          { vehicleModel: { contains: search, mode: 'insensitive' } },
          { container: { containerNumber: { contains: search, mode: 'insensitive' } } },
          { shippingCompany: { name: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    };

    const shipments = await prisma.shipment.findMany({
      where,
      select: {
        id: true,
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehicleVIN: true,
        status: true,
        companyGetpassStartedAt: true,
        companyGetpassCompletedAt: true,
        companyGetpassDurationSeconds: true,
        shippingCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        container: {
          select: {
            id: true,
            containerNumber: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        dispatch: {
          select: {
            id: true,
          },
        },
        transit: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { companyGetpassStartedAt: 'desc' },
    });

    const companyLedgerEntries = await prisma.companyLedgerEntry.findMany({
      where: {
        OR: shipments.flatMap((shipment) => [
          { metadata: { path: ['shipmentId'], equals: shipment.id } },
          ...(shipment.container?.id ? [{ metadata: { path: ['containerId'], equals: shipment.container.id } }] : []),
          ...(shipment.dispatch?.id ? [{ metadata: { path: ['dispatchId'], equals: shipment.dispatch.id } }] : []),
          ...(shipment.transit?.id ? [{ metadata: { path: ['transitId'], equals: shipment.transit.id } }] : []),
        ]),
      },
      select: { type: true, amount: true, metadata: true },
    });

    const shipmentsWithExpenses = shipments.map((shipment) => {
      let shippingExpenses = 0;
      let dispatchExpenses = 0;
      let transitExpenses = 0;

      const shipmentCompanyEntries = companyLedgerEntries.filter((entry) => {
        const metadata = asRecord(entry.metadata);
        return metadata.shipmentId === shipment.id ||
          Boolean(shipment.container?.id && metadata.containerId === shipment.container.id) ||
          Boolean(shipment.dispatch?.id && metadata.dispatchId === shipment.dispatch.id) ||
          Boolean(shipment.transit?.id && metadata.transitId === shipment.transit.id);
      });

      for (const entry of shipmentCompanyEntries) {
        if (entry.type !== 'CREDIT') {
          continue;
        }

        const metadata = asRecord(entry.metadata);
        const expenseSource = typeof metadata.expenseSource === 'string' ? metadata.expenseSource.toUpperCase() : null;

        if (expenseSource === 'DISPATCH' || typeof metadata.dispatchId === 'string') {
          dispatchExpenses += entry.amount;
        } else if (expenseSource === 'TRANSIT' || typeof metadata.transitId === 'string') {
          transitExpenses += entry.amount;
        } else if (expenseSource === 'SHIPMENT' || typeof metadata.containerId === 'string') {
          shippingExpenses += entry.amount;
        }
      }

      return {
        ...shipment,
        shippingCompany: shipment.shippingCompany || shipment.container?.company || null,
        companyPayment: calculateCompanyPaymentStatus(
          shipmentCompanyEntries
        ),
        expenses: {
          shipping: shippingExpenses,
          dispatch: dispatchExpenses,
          transit: transitExpenses,
          total: shippingExpenses + dispatchExpenses + transitExpenses,
        },
      };
    });

    return NextResponse.json({ shipments: shipmentsWithExpenses });
  } catch (error) {
    console.error('Error fetching Company Getpasses:', error);
    return NextResponse.json({ error: 'Failed to fetch Company Getpasses' }, { status: 500 });
  }
}