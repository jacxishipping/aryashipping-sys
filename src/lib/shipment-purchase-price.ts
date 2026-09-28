import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';

type DbClient = Prisma.TransactionClient | typeof prisma;

export type SyncShipmentPurchasePriceInput = {
  shipmentId: string;
  userId: string;
  purchasePriceAmount: number | null;
  serviceType: 'PURCHASE_AND_SHIPPING' | 'SHIPPING_ONLY';
  vehicleLabel: string;
  vehicleVIN?: string | null;
  actorUserId: string;
};

export async function syncShipmentPurchasePriceEntries(
  db: DbClient,
  input: SyncShipmentPurchasePriceInput
) {
  const existingPurchaseEntries = await db.ledgerEntry.findMany({
    where: {
      shipmentId: input.shipmentId,
      metadata: {
        path: ['isShipmentPurchasePrice'],
        equals: true,
      },
    },
    select: { id: true, userId: true },
  });

  const affectedUserIds = new Set(existingPurchaseEntries.map((entry) => entry.userId));

  if (existingPurchaseEntries.length > 0) {
    await db.ledgerEntry.deleteMany({
      where: {
        id: {
          in: existingPurchaseEntries.map((entry) => entry.id),
        },
      },
    });
  }

  const shouldPost =
    input.serviceType === 'PURCHASE_AND_SHIPPING' &&
    typeof input.purchasePriceAmount === 'number' &&
    input.purchasePriceAmount > 0;

  if (shouldPost) {
    const purchaseAmount = input.purchasePriceAmount as number;
    const vinSuffix = input.vehicleVIN ? ` (VIN: ${input.vehicleVIN})` : '';

    await db.ledgerEntry.create({
      data: {
        userId: input.userId,
        shipmentId: input.shipmentId,
        description: `Car purchase price for ${input.vehicleLabel}${vinSuffix}`,
        type: 'DEBIT',
        transactionInfoType: 'CAR_PAYMENT',
        amount: purchaseAmount,
        balance: 0,
        createdBy: input.actorUserId,
        notes: 'Auto-posted from shipment purchase information',
        metadata: {
          isShipmentPurchasePrice: true,
          ledgerCategory: 'PURCHASE_PRICE',
          shipmentId: input.shipmentId,
        } as Prisma.InputJsonValue,
      },
    });

    affectedUserIds.add(input.userId);
  }

  for (const userId of affectedUserIds) {
    await recalculateUserLedgerBalances(db, userId);
  }
}