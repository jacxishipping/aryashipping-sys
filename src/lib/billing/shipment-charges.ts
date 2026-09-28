import {
  LineItemType,
  Prisma,
  ShipmentBillingMilestone,
  ShipmentChargeCategory,
  ShipmentChargeSourceType,
  ShipmentChargeStatus,
} from '@prisma/client';
import { prisma } from '@/lib/db';

type ShipmentChargeDbClient = Prisma.TransactionClient | typeof prisma;

type ShipmentChargeRecord = {
  id: string;
  chargeCode: string;
  category: ShipmentChargeCategory;
  description: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  shipmentId: string;
};

type LedgerChargeSyncInput = {
  entryId: string;
  userId: string;
  shipmentId?: string | null;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  transactionDate: Date;
  transactionInfoType?: 'CAR_PAYMENT' | 'SHIPPING_PAYMENT' | 'STORAGE_PAYMENT' | null;
  notes?: string | null;
  metadata?: Prisma.JsonValue;
  actorId: string;
};

function asRecord(value: Prisma.JsonValue | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function sanitizeCodePart(value: string) {
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function resolveChargeCategory(expenseType?: string | null, transactionInfoType?: string | null, metadata?: Prisma.JsonValue) {
  const record = asRecord(metadata);

  if (record.isShipmentPurchasePrice === true || transactionInfoType === 'CAR_PAYMENT') {
    return ShipmentChargeCategory.PURCHASE;
  }

  switch ((expenseType || '').toUpperCase()) {
    case 'INSURANCE':
      return ShipmentChargeCategory.INSURANCE;
    case 'CUSTOMS':
    case 'CUSTOMS_DUTY':
    case 'PORT_CHARGES':
      return ShipmentChargeCategory.CUSTOMS;
    case 'STORAGE_FEE':
      return ShipmentChargeCategory.STORAGE;
    case 'HANDLING_FEE':
    case 'TOWING':
      return ShipmentChargeCategory.HANDLING;
    case 'DAMAGE':
      return ShipmentChargeCategory.DAMAGE;
    case 'DISCOUNT':
    case 'CREDIT':
      return ShipmentChargeCategory.CREDIT;
    case 'SHIPPING_FEE':
    case 'INLAND_TRANSPORT':
      return ShipmentChargeCategory.SHIPPING;
    default:
      return ShipmentChargeCategory.OTHER;
  }
}

function resolveBillingMilestone(category: ShipmentChargeCategory) {
  switch (category) {
    case ShipmentChargeCategory.PURCHASE:
      return ShipmentBillingMilestone.PURCHASE;
    case ShipmentChargeCategory.SHIPPING:
    case ShipmentChargeCategory.INSURANCE:
    case ShipmentChargeCategory.HANDLING:
      return ShipmentBillingMilestone.ORIGIN_HANDOFF;
    case ShipmentChargeCategory.CUSTOMS:
    case ShipmentChargeCategory.STORAGE:
      return ShipmentBillingMilestone.DESTINATION_PORT;
    case ShipmentChargeCategory.DAMAGE:
    case ShipmentChargeCategory.CREDIT:
      return ShipmentBillingMilestone.FINAL_SETTLEMENT;
    default:
      return ShipmentBillingMilestone.MANUAL;
  }
}

function resolveLineItemType(category: ShipmentChargeCategory, totalAmount: number): LineItemType {
  if (totalAmount < 0 || category === ShipmentChargeCategory.CREDIT || category === ShipmentChargeCategory.DAMAGE) {
    return 'DISCOUNT';
  }

  switch (category) {
    case ShipmentChargeCategory.PURCHASE:
      return 'PURCHASE_PRICE';
    case ShipmentChargeCategory.SHIPPING:
      return 'SHIPPING_FEE';
    case ShipmentChargeCategory.INSURANCE:
      return 'INSURANCE';
    case ShipmentChargeCategory.CUSTOMS:
      return 'CUSTOMS_FEE';
    case ShipmentChargeCategory.STORAGE:
      return 'STORAGE_FEE';
    case ShipmentChargeCategory.HANDLING:
      return 'HANDLING_FEE';
    default:
      return 'OTHER_FEE';
  }
}

function shouldSyncFromLedgerEntry(input: LedgerChargeSyncInput) {
  if (!input.shipmentId || input.type !== 'DEBIT') {
    return false;
  }

  const metadata = asRecord(input.metadata);

  if (metadata.isShipmentPurchasePrice === true || input.transactionInfoType === 'CAR_PAYMENT') {
    return false;
  }

  if (metadata.isPaymentAllocation === true) {
    return false;
  }

  if (metadata.paymentType === 'invoice_payment') {
    return false;
  }

  if (typeof metadata.invoiceId === 'string' || typeof metadata.invoiceNumber === 'string') {
    return false;
  }

  const isInvoiceableExpense =
    metadata.isExpense === true ||
    metadata.pendingInvoice === true ||
    typeof metadata.expenseType === 'string';

  if (!isInvoiceableExpense) {
    return false;
  }

  return true;
}

async function reopenShipmentPaymentStatusIfNeeded(
  db: ShipmentChargeDbClient,
  shipmentId: string,
  chargeStatus: ShipmentChargeStatus,
) {
  if (chargeStatus === ShipmentChargeStatus.PAID || chargeStatus === ShipmentChargeStatus.VOID) {
    return;
  }

  await db.shipment.updateMany({
    where: {
      id: shipmentId,
      paymentStatus: 'COMPLETED',
    },
    data: {
      paymentStatus: 'PENDING',
    },
  });
}

export async function syncShipmentChargeFromLedgerEntry(
  db: ShipmentChargeDbClient,
  input: LedgerChargeSyncInput,
) {
  const shipmentId = input.shipmentId;
  if (!shipmentId) {
    return null;
  }

  const existingCharge = await db.shipmentCharge.findFirst({
    where: {
      sourceType: 'LEDGER_ENTRY',
      sourceId: input.entryId,
    },
    select: {
      id: true,
      status: true,
      invoiceId: true,
    },
  });

  if (!shouldSyncFromLedgerEntry(input)) {
    if (existingCharge && existingCharge.status !== ShipmentChargeStatus.PAID) {
      await db.shipmentCharge.update({
        where: { id: existingCharge.id },
        data: {
          invoiceId: null,
          status: ShipmentChargeStatus.VOID,
          invoicedAt: null,
          voidedAt: new Date(),
        },
      });

      await db.shipmentChargeAuditLog.create({
        data: {
          chargeId: existingCharge.id,
          action: 'LEDGER_SYNC_SKIPPED',
          description: `Shipment charge detached from non-invoiceable ledger entry ${input.entryId}`,
          performedBy: input.actorId,
          metadata: {
            ledgerEntryId: input.entryId,
          },
        },
      });
    }

    return null;
  }

  const metadata = asRecord(input.metadata);
  const expenseType = typeof metadata.expenseType === 'string' ? metadata.expenseType : null;
  const category = resolveChargeCategory(expenseType, input.transactionInfoType, input.metadata);
  const billingMilestone = resolveBillingMilestone(category);
  const chargeCode = sanitizeCodePart(
    typeof metadata.chargeCode === 'string'
      ? metadata.chargeCode
      : expenseType || input.transactionInfoType || category,
  ) || 'MANUAL_DEBIT';

  const chargeData = {
    shipmentId,
    userId: input.userId,
    chargeCode,
    category,
    billingMilestone,
    sourceType: 'LEDGER_ENTRY' as const,
    sourceId: input.entryId,
    description: input.description,
    quantity: 1,
    unitAmount: input.amount,
    totalAmount: input.amount,
    currency: typeof metadata.currency === 'string' ? metadata.currency : 'USD',
    status: 'APPROVED' as const,
    billableAt: input.transactionDate,
    approvedBy: input.actorId,
    approvedAt: new Date(),
    notes: input.notes,
    metadata: {
      ...metadata,
      ledgerEntryId: input.entryId,
      ledgerTransactionInfoType: input.transactionInfoType ?? null,
      origin: 'ledger-sync',
    } satisfies Prisma.InputJsonValue,
  };

  const nextStatus =
    existingCharge?.status === 'PAID'
      ? ShipmentChargeStatus.PAID
      : existingCharge?.status === 'INVOICED'
      ? ShipmentChargeStatus.INVOICED
      : existingCharge?.status === 'DISPUTED'
      ? ShipmentChargeStatus.DISPUTED
      : ShipmentChargeStatus.APPROVED;

  if (existingCharge) {
    const charge = await db.shipmentCharge.update({
      where: { id: existingCharge.id },
      data: {
        ...chargeData,
        status: nextStatus,
      },
    });

    await db.shipmentChargeAuditLog.create({
      data: {
        chargeId: charge.id,
        action: 'SYNC_FROM_LEDGER',
        description: `Shipment charge synced from ledger entry ${input.entryId}`,
        performedBy: input.actorId,
        metadata: {
          ledgerEntryId: input.entryId,
        },
      },
    });

    await reopenShipmentPaymentStatusIfNeeded(db, shipmentId, nextStatus);

    return charge;
  }

  const charge = await db.shipmentCharge.create({
    data: {
      ...chargeData,
      status: ShipmentChargeStatus.APPROVED,
    },
  });

  await db.shipmentChargeAuditLog.create({
    data: {
      chargeId: charge.id,
      action: 'CREATE_FROM_LEDGER',
      description: `Shipment charge created from ledger entry ${input.entryId}`,
      performedBy: input.actorId,
      metadata: {
        ledgerEntryId: input.entryId,
      },
    },
  });

  await reopenShipmentPaymentStatusIfNeeded(db, shipmentId, ShipmentChargeStatus.APPROVED);

  return charge;
}

type UpsertSystemShipmentChargeInput = {
  shipmentId: string;
  userId: string;
  sourceType: ShipmentChargeSourceType;
  sourceId: string;
  chargeCode: string;
  category: ShipmentChargeCategory;
  billingMilestone?: ShipmentBillingMilestone;
  description: string;
  quantity?: number;
  unitAmount: number;
  totalAmount: number;
  currency?: string;
  actorId: string;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function upsertShipmentSystemCharge(
  db: ShipmentChargeDbClient,
  input: UpsertSystemShipmentChargeInput,
) {
  const existingCharge = await db.shipmentCharge.findFirst({
    where: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  const preservedStatus =
    existingCharge?.status === 'PAID'
      ? ShipmentChargeStatus.PAID
      : existingCharge?.status === 'INVOICED'
      ? ShipmentChargeStatus.INVOICED
      : ShipmentChargeStatus.APPROVED;

  const chargeData = {
    shipmentId: input.shipmentId,
    userId: input.userId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    chargeCode: input.chargeCode,
    category: input.category,
    billingMilestone: input.billingMilestone ?? resolveBillingMilestone(input.category),
    description: input.description,
    quantity: input.quantity ?? 1,
    unitAmount: input.unitAmount,
    totalAmount: input.totalAmount,
    currency: input.currency ?? 'USD',
    status: preservedStatus,
    billableAt: new Date(),
    approvedBy: input.actorId,
    approvedAt: new Date(),
    notes: input.notes,
    metadata: input.metadata,
  };

  if (existingCharge) {
    const charge = await db.shipmentCharge.update({
      where: { id: existingCharge.id },
      data: chargeData,
    });

    await reopenShipmentPaymentStatusIfNeeded(db, input.shipmentId, preservedStatus);

    return charge;
  }

  const charge = await db.shipmentCharge.create({
    data: chargeData,
  });

  await reopenShipmentPaymentStatusIfNeeded(db, input.shipmentId, preservedStatus);

  return charge;
}

export async function voidShipmentChargeSource(
  db: ShipmentChargeDbClient,
  sourceType: ShipmentChargeSourceType,
  sourceId: string,
) {
  await db.shipmentCharge.updateMany({
    where: {
      sourceType,
      sourceId,
      status: {
        not: ShipmentChargeStatus.PAID,
      },
    },
    data: {
      invoiceId: null,
      status: ShipmentChargeStatus.VOID,
      voidedAt: new Date(),
      invoicedAt: null,
    },
  });
}

export function buildInvoiceLineItemFromCharge(charge: ShipmentChargeRecord) {
  return {
    description: charge.description,
    shipmentId: charge.shipmentId,
    type: resolveLineItemType(charge.category, charge.totalAmount),
    quantity: charge.quantity || 1,
    unitPrice: charge.unitAmount,
    amount: charge.totalAmount,
    chargeId: charge.id, // Phase 3: schema-enforced link to the source charge
  };
}

export async function markInvoiceShipmentChargesInvoiced(
  db: ShipmentChargeDbClient,
  invoiceId: string,
  chargeIds: string[],
) {
  if (!chargeIds.length) {
    return;
  }

  await db.shipmentCharge.updateMany({
    where: {
      id: { in: chargeIds },
    },
    data: {
      invoiceId,
      status: ShipmentChargeStatus.INVOICED,
      invoicedAt: new Date(),
    },
  });
}

export async function releaseInvoiceShipmentCharges(
  db: ShipmentChargeDbClient,
  invoiceId: string,
) {
  await db.shipmentCharge.updateMany({
    where: {
      invoiceId,
      status: {
        not: ShipmentChargeStatus.PAID,
      },
    },
    data: {
      invoiceId: null,
      status: ShipmentChargeStatus.APPROVED,
      invoicedAt: null,
    },
  });
}

export async function resetInvoiceShipmentCharges(
  db: ShipmentChargeDbClient,
  invoiceId: string,
) {
  await db.shipmentCharge.updateMany({
    where: {
      invoiceId,
    },
    data: {
      invoiceId: null,
      status: ShipmentChargeStatus.APPROVED,
      invoicedAt: null,
      paidAt: null,
    },
  });
}

export async function markInvoiceShipmentChargesPaid(
  db: ShipmentChargeDbClient,
  invoiceId: string,
) {
  await db.shipmentCharge.updateMany({
    where: {
      invoiceId,
    },
    data: {
      status: ShipmentChargeStatus.PAID,
      paidAt: new Date(),
    },
  });
}