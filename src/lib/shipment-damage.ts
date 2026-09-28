import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';

type DbClient = Prisma.TransactionClient | typeof prisma;

const DAMAGE_REFERENCE_PREFIX = 'shipment-damage:';

export type SyncShipmentDamageInput = {
  shipmentId: string;
  userId: string;
  shippingCompanyId: string | null;
  damageCost: number | null; // Cost charged to company (company credit)
  damageCredit: number | null; // Credit to user (user credit)
  vehicleLabel: string;
  vehicleVIN?: string | null;
  actorUserId: string;
  shouldPost: boolean;
};

export async function syncShipmentDamageEntries(
  db: DbClient,
  input: SyncShipmentDamageInput
) {
  const damageReference = `${DAMAGE_REFERENCE_PREFIX}${input.shipmentId}`;

  // Find existing damage entries
  const existingCompanyDamageEntries = await db.companyLedgerEntry.findMany({
    where: {
      reference: damageReference,
      metadata: {
        path: ['isShipmentDamage'],
        equals: true,
      },
    },
    select: { id: true, companyId: true },
  });

  const hasExistingUserDamageEntries = await db.ledgerEntry.findFirst({
    where: {
      shipmentId: input.shipmentId,
      metadata: {
        path: ['isShipmentDamage'],
        equals: true,
      },
    },
    select: { id: true },
  });

  // Delete existing entries to prepare for new ones
  if (hasExistingUserDamageEntries) {
    await db.ledgerEntry.deleteMany({
      where: {
        shipmentId: input.shipmentId,
        metadata: {
          path: ['isShipmentDamage'],
          equals: true,
        },
      },
    });
  }

  if (existingCompanyDamageEntries.length > 0) {
    await db.companyLedgerEntry.deleteMany({
      where: {
        id: {
          in: existingCompanyDamageEntries.map((entry) => entry.id),
        },
      },
    });
  }

  if (input.shouldPost) {
    const vinSuffix = input.vehicleVIN ? ` (VIN: ${input.vehicleVIN})` : '';

    // Post damage cost as CREDIT to company ledger (company charge)
    if (input.shippingCompanyId && input.damageCost && input.damageCost > 0) {
      await db.companyLedgerEntry.create({
        data: {
          companyId: input.shippingCompanyId,
          description: `Damage cost for ${input.vehicleLabel}${vinSuffix}`,
          type: 'CREDIT',
          amount: input.damageCost,
          balance: 0,
          category: 'Damage Cost',
          reference: damageReference,
          notes: 'Auto-posted damage charged to company',
          createdBy: input.actorUserId,
          metadata: {
            isShipmentDamage: true,
            damageType: 'COMPANY_CHARGEABLE',
            shipmentId: input.shipmentId,
            userId: input.userId,
          } as Prisma.InputJsonValue,
        },
      });
    }

    // Post damage credit as CREDIT to user ledger (customer gets credit/discount)
    if (input.damageCredit && input.damageCredit > 0) {
      await db.ledgerEntry.create({
        data: {
          userId: input.userId,
          shipmentId: input.shipmentId,
          description: `Damage credit for ${input.vehicleLabel}${vinSuffix}`,
          type: 'CREDIT',
          amount: input.damageCredit,
          balance: 0,
          createdBy: input.actorUserId,
          notes: 'Auto-posted damage credit (company absorbs damage)',
          metadata: {
            isShipmentDamage: true,
            damageType: 'COMPANY_ABSORBED',
            shipmentId: input.shipmentId,
            shippingCompanyId: input.shippingCompanyId,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  await recalculateUserLedgerBalances(db, input.userId);

  const companyIdsToRecalculate = new Set(existingCompanyDamageEntries.map((entry) => entry.companyId));
  if (input.shouldPost && input.shippingCompanyId) {
    companyIdsToRecalculate.add(input.shippingCompanyId);
  }

  for (const companyId of companyIdsToRecalculate) {
    await recalculateCompanyLedgerBalances(db, companyId);
  }
}
