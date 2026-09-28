import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { materializeShipmentLedgerCharges } from '@/lib/billing/shipment-charge-backfill';
import { hasAnyPermission } from '@/lib/rbac';

const BATCH_SIZE = 200;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user.role, ['finance:manage', 'invoices:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { shipmentId?: string };
    const fallbackActorId = session.user.id as string;

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        shipmentId: body.shipmentId || { not: null },
        type: 'DEBIT',
      },
      select: {
        id: true,
        userId: true,
        shipmentId: true,
        description: true,
        type: true,
        amount: true,
        transactionDate: true,
        transactionInfoType: true,
        notes: true,
        metadata: true,
        createdBy: true,
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    let processedEntries = 0;
    for (let index = 0; index < ledgerEntries.length; index += BATCH_SIZE) {
      const batch = ledgerEntries.slice(index, index + BATCH_SIZE);
      processedEntries += await prisma.$transaction((tx: Parameters<typeof materializeShipmentLedgerCharges>[0]) => materializeShipmentLedgerCharges(tx, batch, fallbackActorId));
    }

    const shipmentIds = new Set(ledgerEntries.map((entry: { shipmentId: string | null }) => entry.shipmentId).filter(Boolean));

    return NextResponse.json({
      success: true,
      processedEntries,
      totalLedgerEntries: ledgerEntries.length,
      shipmentsTouched: shipmentIds.size,
      scope: body.shipmentId ? 'single-shipment' : 'all-shipments',
    });
  } catch (error) {
    console.error('Error backfilling shipment charges:', error);
    return NextResponse.json({ error: 'Failed to backfill shipment charges' }, { status: 500 });
  }
}