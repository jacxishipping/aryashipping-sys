import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { syncShipmentChargeFromLedgerEntry } from '@/lib/billing/shipment-charges';

type ShipmentChargeDbClient = Prisma.TransactionClient | typeof prisma;

export type ShipmentLedgerChargeBackfillEntry = {
  id: string;
  userId: string;
  shipmentId: string | null;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  transactionDate: Date;
  transactionInfoType: 'CAR_PAYMENT' | 'SHIPPING_PAYMENT' | 'STORAGE_PAYMENT' | null;
  notes: string | null;
  metadata: Prisma.JsonValue;
  createdBy: string | null;
};

export async function materializeShipmentLedgerCharges(
  db: ShipmentChargeDbClient,
  entries: ShipmentLedgerChargeBackfillEntry[],
  fallbackActorId: string,
) {
  let processed = 0;

  for (const entry of entries) {
    const charge = await syncShipmentChargeFromLedgerEntry(db, {
      entryId: entry.id,
      userId: entry.userId,
      shipmentId: entry.shipmentId,
      description: entry.description,
      type: entry.type,
      amount: entry.amount,
      transactionDate: entry.transactionDate,
      transactionInfoType: entry.transactionInfoType,
      notes: entry.notes,
      metadata: entry.metadata,
      actorId: entry.createdBy || fallbackActorId,
    });

    if (charge) {
      processed += 1;
    }
  }

  return processed;
}