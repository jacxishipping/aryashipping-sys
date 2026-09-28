import { Prisma } from '@prisma/client';
import {
  syncShipmentChargeFromLedgerEntry,
  upsertShipmentSystemCharge,
  voidShipmentChargeSource,
} from '@/lib/billing/shipment-charges';

type ShipmentChargeDbClient = Prisma.TransactionClient;

type MaterializeContainerShipmentChargesInput = {
  actorId: string;
  allocationMethod: string;
  containerId: string;
  expenseAllocations: Record<string, number>;
  shipmentDamageRecords: Array<{ shipmentId: string | null; amount: number }>;
  shipmentLedgerEntries: Array<{
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
  }>;
  shipments: Array<{
    id: string;
    userId: string;
    serviceType: 'PURCHASE_AND_SHIPPING' | 'SHIPPING_ONLY';
    purchasePrice: number | null;
    price: number | null;
    priceListPricingSnapshot?: Prisma.JsonValue | null;
    insuranceValue: number | null;
    damageCredit: number | null;
    vehicleYear: number | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleVIN: string | null;
  }>;
};

function buildShipmentLabel(shipment: {
  id: string;
  vehicleYear?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleVIN?: string | null;
}) {
  const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (shipment.vehicleVIN && vehicleLabel) {
    return `${vehicleLabel} (${shipment.vehicleVIN})`;
  }

  return shipment.vehicleVIN || vehicleLabel || shipment.id;
}

function buildSharedExpenseDescription(allocationMethod: string) {
  if (allocationMethod === 'BY_VALUE') {
    return 'Shared Container Expenses (By Value)';
  }

  if (allocationMethod === 'BY_WEIGHT') {
    return 'Shared Container Expenses (By Weight)';
  }

  return 'Shared Container Expenses (Equal Split)';
}

export async function materializeContainerShipmentCharges(
  tx: ShipmentChargeDbClient,
  input: MaterializeContainerShipmentChargesInput,
) {
  for (const entry of input.shipmentLedgerEntries) {
    await syncShipmentChargeFromLedgerEntry(tx, {
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
      actorId: input.actorId,
    });
  }

  const damageCreditsByShipmentId = input.shipmentDamageRecords.reduce<Record<string, number>>((accumulator, record) => {
    if (!record.shipmentId) {
      return accumulator;
    }

    accumulator[record.shipmentId] = (accumulator[record.shipmentId] || 0) + record.amount;
    return accumulator;
  }, {});

  for (const shipment of input.shipments) {
    const shipmentLabel = buildShipmentLabel(shipment);
    const purchaseSourceId = `shipment:${shipment.id}:purchase-price`;
    const serviceSourceId = `shipment:${shipment.id}:primary-service`;
    const insuranceSourceId = `shipment:${shipment.id}:insurance`;
    const allocationSourceId = `container:${input.containerId}:allocation:${shipment.id}`;
    const damageCreditSourceId = `shipment:${shipment.id}:damage-credit`;
    const damageCompensationSourceId = `shipment:${shipment.id}:damage-compensation`;

    if ((shipment.purchasePrice || 0) > 0) {
      await upsertShipmentSystemCharge(tx, {
        shipmentId: shipment.id,
        userId: shipment.userId,
        sourceType: 'SHIPMENT',
        sourceId: purchaseSourceId,
        chargeCode: 'PURCHASE_PRICE',
        category: 'PURCHASE',
        billingMilestone: 'PURCHASE',
        description: `${shipmentLabel} - Vehicle Purchase`,
        unitAmount: shipment.purchasePrice || 0,
        totalAmount: shipment.purchasePrice || 0,
        actorId: input.actorId,
      });
    } else {
      await voidShipmentChargeSource(tx, 'SHIPMENT', purchaseSourceId);
    }

    if (shipment.priceListPricingSnapshot) {
      await voidShipmentChargeSource(tx, 'SHIPMENT', serviceSourceId);
    } else if ((shipment.price || 0) > 0) {
      await upsertShipmentSystemCharge(tx, {
        shipmentId: shipment.id,
        userId: shipment.userId,
        sourceType: 'SHIPMENT',
        sourceId: serviceSourceId,
        chargeCode: shipment.serviceType === 'PURCHASE_AND_SHIPPING' ? 'SHIPPING_SERVICE' : 'PRIMARY_SERVICE',
        category: 'SHIPPING',
        billingMilestone: 'ORIGIN_HANDOFF',
        description: `${shipmentLabel} - Shipping Service`,
        unitAmount: shipment.price || 0,
        totalAmount: shipment.price || 0,
        actorId: input.actorId,
      });
    } else {
      await voidShipmentChargeSource(tx, 'SHIPMENT', serviceSourceId);
    }

    if ((shipment.insuranceValue || 0) > 0) {
      await upsertShipmentSystemCharge(tx, {
        shipmentId: shipment.id,
        userId: shipment.userId,
        sourceType: 'SHIPMENT',
        sourceId: insuranceSourceId,
        chargeCode: 'INSURANCE',
        category: 'INSURANCE',
        billingMilestone: 'ORIGIN_HANDOFF',
        description: `${shipmentLabel} - Insurance`,
        unitAmount: shipment.insuranceValue || 0,
        totalAmount: shipment.insuranceValue || 0,
        actorId: input.actorId,
      });
    } else {
      await voidShipmentChargeSource(tx, 'SHIPMENT', insuranceSourceId);
    }

    const allocatedExpense = input.expenseAllocations[shipment.id] || 0;
    if (allocatedExpense > 0) {
      await upsertShipmentSystemCharge(tx, {
        shipmentId: shipment.id,
        userId: shipment.userId,
        sourceType: 'CONTAINER_ALLOCATION',
        sourceId: allocationSourceId,
        chargeCode: 'CONTAINER_ALLOCATION',
        category: 'SHIPPING',
        billingMilestone: 'OCEAN_FREIGHT',
        description: `${shipmentLabel} - ${buildSharedExpenseDescription(input.allocationMethod)}`,
        unitAmount: allocatedExpense,
        totalAmount: allocatedExpense,
        actorId: input.actorId,
        metadata: {
          containerId: input.containerId,
          allocationMethod: input.allocationMethod,
        },
      });
    } else {
      await voidShipmentChargeSource(tx, 'CONTAINER_ALLOCATION', allocationSourceId);
    }

    if ((shipment.damageCredit || 0) > 0) {
      const credit = shipment.damageCredit || 0;
      await upsertShipmentSystemCharge(tx, {
        shipmentId: shipment.id,
        userId: shipment.userId,
        sourceType: 'SHIPMENT',
        sourceId: damageCreditSourceId,
        chargeCode: 'DAMAGE_CREDIT',
        category: 'CREDIT',
        billingMilestone: 'FINAL_SETTLEMENT',
        description: `${shipmentLabel} - Damage Credit (Company Absorbed)`,
        unitAmount: -credit,
        totalAmount: -credit,
        actorId: input.actorId,
      });
    } else {
      await voidShipmentChargeSource(tx, 'SHIPMENT', damageCreditSourceId);
    }

    const damageCompensation = damageCreditsByShipmentId[shipment.id] || 0;
    if (damageCompensation > 0) {
      await upsertShipmentSystemCharge(tx, {
        shipmentId: shipment.id,
        userId: shipment.userId,
        sourceType: 'DAMAGE',
        sourceId: damageCompensationSourceId,
        chargeCode: 'DAMAGE_COMPENSATION',
        category: 'DAMAGE',
        billingMilestone: 'FINAL_SETTLEMENT',
        description: `${shipmentLabel} - Damage Compensation`,
        unitAmount: -damageCompensation,
        totalAmount: -damageCompensation,
        actorId: input.actorId,
      });
    } else {
      await voidShipmentChargeSource(tx, 'DAMAGE', damageCompensationSourceId);
    }
  }
}
