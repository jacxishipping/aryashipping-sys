import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type ShipmentAuditLogInput = {
  shipmentId: string;
  action: string;
  description: string;
  performedBy: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

type InvoiceAuditLogInput = {
  invoiceId: string;
  action: string;
  description: string;
  performedBy: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export async function createShipmentAuditLogs(inputs: ShipmentAuditLogInput[]) {
  if (inputs.length === 0) {
    return { count: 0 };
  }

  return prisma.shipmentAuditLog.createMany({
    data: inputs.map((input) => ({
      shipmentId: input.shipmentId,
      action: input.action,
      description: input.description,
      performedBy: input.performedBy,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      metadata: input.metadata ?? Prisma.JsonNull,
    })),
  });
}

export async function createInvoiceAuditLogs(inputs: InvoiceAuditLogInput[]) {
  if (inputs.length === 0) {
    return { count: 0 };
  }

  return prisma.invoiceAuditLog.createMany({
    data: inputs.map((input) => ({
      invoiceId: input.invoiceId,
      action: input.action,
      description: input.description,
      performedBy: input.performedBy,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      metadata: input.metadata ?? Prisma.JsonNull,
    })),
  });
}