import { LineItemType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { roundToCents } from '@/lib/financial/money';

type DbClient = Prisma.TransactionClient | typeof prisma;

const db = (client: DbClient) => client as typeof prisma;

export function recalculateInvoiceTotal(subtotal: number, discount = 0, tax = 0): number {
  return roundToCents(subtotal - discount + tax);
}

/**
 * Generate the next invoice number for the given prefix.
 * Examples: INV-2026-0001, SUP-2026-0001, CRN-2026-0001, AUTO-INV-2026-0001.
 * Uses the highest existing sequence for the current year to avoid collisions
 * without relying on a global invoice count.
 */
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function generateInvoiceNumber(client: DbClient, prefix = 'INV'): Promise<string> {
  const year = new Date().getFullYear();
  const normalizedPrefix = prefix.replace(/-+$/, '');
  const prefixString = `${normalizedPrefix}-${year}-`;
  const invoices = await db(client).userInvoice.findMany({
    where: {
      invoiceNumber: {
        startsWith: prefixString,
      },
    },
    select: {
      invoiceNumber: true,
    },
  });

  let maxSequence = 0;
  const pattern = new RegExp(`^${escapeRegExp(normalizedPrefix)}-${year}-(\\d+)$`);

  for (const invoice of invoices) {
    const match = invoice.invoiceNumber.match(pattern);
    if (!match) continue;

    const sequence = Number.parseInt(match[1], 10);
    if (!Number.isNaN(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  return `${prefixString}${String(maxSequence + 1).padStart(4, '0')}`;
}

export async function createInvoiceWithUniqueNumber<T>(
  client: DbClient,
  create: (invoiceNumber: string) => Promise<T>,
  prefix = 'INV',
  maxAttempts = 10,
): Promise<T> {
  let attempt = 0;

  while (attempt < maxAttempts) {
    const invoiceNumber = await generateInvoiceNumber(client, prefix);

    try {
      return await create(invoiceNumber);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        attempt < maxAttempts - 1
      ) {
        attempt += 1;
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Failed to create unique invoice number for prefix ${prefix} after ${maxAttempts} attempts`);
}

/**
 * Get the active (non-cancelled) invoice for a shipment.
 */
export async function getShipmentInvoice(shipmentId: string, client: DbClient = prisma) {
  return db(client).userInvoice.findFirst({
    where: {
      shipmentId,
      status: { not: 'CANCELLED' },
    },
    select: { id: true, subtotal: true, discount: true, tax: true, status: true },
  });
}

/**
 * Map a free-form expense type string to a Prisma LineItemType enum value.
 */
export function mapExpenseTypeToLineItemType(expenseType: string): LineItemType {
  const normalized = expenseType.toUpperCase().replace(/[- ]/g, '_');
  const map: Record<string, LineItemType> = {
    SHIPPING_FEE: LineItemType.SHIPPING_FEE,
    SHIPPING: LineItemType.SHIPPING_FEE,
    INSURANCE: LineItemType.INSURANCE,
    CUSTOMS: LineItemType.CUSTOMS_FEE,
    CUSTOMS_FEE: LineItemType.CUSTOMS_FEE,
    STORAGE_FEE: LineItemType.STORAGE_FEE,
    STORAGE: LineItemType.STORAGE_FEE,
    HANDLING_FEE: LineItemType.HANDLING_FEE,
    HANDLING: LineItemType.HANDLING_FEE,
    TOWING: LineItemType.HANDLING_FEE,
    PORT_CHARGES: LineItemType.HANDLING_FEE,
    FUEL: LineItemType.OTHER_FEE,
    OTHER: LineItemType.OTHER_FEE,
  };
  return map[normalized] ?? LineItemType.OTHER_FEE;
}

/**
 * Add an expense line item to a shipment's pending invoice and update the invoice total.
 * Safe to call inside or outside a Prisma transaction.
 * Returns the invoiceId if updated, or null if no active invoice found.
 */
export async function addExpenseLineItemToShipmentInvoice(
  shipmentId: string,
  lineItemData: {
    description: string;
    type: LineItemType;
    amount: number;
    quantity?: number;
    expenseSource?: 'DISPATCH' | 'SHIPMENT' | 'TRANSIT';
  },
  client: DbClient = prisma
): Promise<string | null> {
  const invoice = await getShipmentInvoice(shipmentId, client);
  if (!invoice) return null;

  // Only add to PENDING invoices (not PAID/CANCELLED)
  if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') return null;

  const quantity = lineItemData.quantity ?? 1;
  const unitPrice = lineItemData.amount / quantity;

  await db(client).invoiceLineItem.create({
    data: {
      invoiceId: invoice.id,
      shipmentId,
      description: lineItemData.description,
      type: lineItemData.type,
      quantity,
      unitPrice,
      amount: lineItemData.amount,
      expenseSource: lineItemData.expenseSource,
    },
  });

  const newSubtotal = invoice.subtotal + lineItemData.amount;
  const newTotal = recalculateInvoiceTotal(newSubtotal, invoice.discount ?? 0, invoice.tax ?? 0);

  await db(client).userInvoice.update({
    where: { id: invoice.id },
    data: { subtotal: newSubtotal, total: newTotal },
  });

  return invoice.id;
}
