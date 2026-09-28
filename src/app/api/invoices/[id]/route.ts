import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LineItemType, NotificationType, Prisma } from '@prisma/client';
import { createNotification } from '@/lib/notifications';
import { createInvoiceAuditLogs } from '@/lib/entity-audit-history';
import { z } from 'zod';
import { hasPermission } from '@/lib/rbac';
import { buildLinkedCompanyLedgerEntryMap } from '@/lib/company-ledger-links';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import {
  markInvoiceShipmentChargesPaid,
  releaseInvoiceShipmentCharges,
  resetInvoiceShipmentCharges,
} from '@/lib/billing/shipment-charges';
import { invoiceTransitionError } from '@/lib/billing/invoice-status';
import { recalculateInvoiceTotal } from '@/lib/shipment-invoice';
import { invoiceLineItemMatchesLedgerEntry, normalizeInvoiceExpenseDescription } from '@/lib/invoice-ledger-sync';
import { roundToCents, withinOneCent } from '@/lib/financial/money';

async function syncInvoiceLineItemLedgerEntries(
  tx: Prisma.TransactionClient,
  invoice: { id: string; userId: string; notes?: string | null },
  lineItem: {
    id?: string;
    chargeId?: string | null;
    shipmentId: string | null;
    description: string;
    amount: number;
    type: string;
    expenseSource?: string | null;
  },
  actorId: string,
) {
  if (!lineItem.shipmentId) {
    return;
  }

  const shipment = await tx.shipment.findUnique({
    where: { id: lineItem.shipmentId },
    select: {
      userId: true,
      container: {
        select: {
          companyId: true,
        },
      },
    },
  });

  if (!shipment) {
    return;
  }

  const pendingEntries = await tx.ledgerEntry.findMany({
    where: {
      userId: invoice.userId,
      shipmentId: lineItem.shipmentId,
      type: 'DEBIT',
      metadata: {
        path: ['pendingInvoice'],
        equals: true,
      },
    },
    select: {
      id: true,
      description: true,
      amount: true,
      metadata: true,
      shipmentId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const matchingEntry =
    pendingEntries.find((entry) => {
      const meta = (entry.metadata ?? {}) as Record<string, unknown>;
      if (lineItem.id && meta.invoiceLineItemId === lineItem.id) return true;
      if (lineItem.chargeId && meta.chargeId === lineItem.chargeId) return true;
      return false;
    }) ??
    pendingEntries.find((entry) =>
      invoiceLineItemMatchesLedgerEntry(
        {
          shipmentId: lineItem.shipmentId,
          description: lineItem.description,
          amount: lineItem.amount,
        },
        {
          shipmentId: entry.shipmentId,
          description: entry.description,
          amount: Number(entry.amount ?? 0),
        },
      )
    ) ??
    pendingEntries.find((entry) => {
      const lineDesc = normalizeInvoiceExpenseDescription(lineItem.description);
      const entryDesc = normalizeInvoiceExpenseDescription(entry.description);
      return Boolean(lineDesc && entryDesc && (lineDesc === entryDesc || entryDesc.includes(lineDesc) || lineDesc.includes(entryDesc)));
    });

  if (matchingEntry) {
    await tx.ledgerEntry.update({
      where: { id: matchingEntry.id },
      data: {
        description: lineItem.description,
        amount: lineItem.amount,
        notes: invoice.notes ?? null,
        metadata: {
          ...(matchingEntry.metadata && typeof matchingEntry.metadata === 'object' && !Array.isArray(matchingEntry.metadata)
            ? (matchingEntry.metadata as Record<string, unknown>)
            : {}),
          ...(lineItem.id ? { invoiceLineItemId: lineItem.id } : {}),
          ...(lineItem.chargeId ? { chargeId: lineItem.chargeId } : {}),
          pendingInvoice: true,
          isExpense: true,
          expenseType: lineItem.type,
          expenseSource: lineItem.expenseSource ?? 'SHIPMENT',
          paymentMode: 'DUE',
        },
      },
    });

    const companyLedgerEntry = await tx.companyLedgerEntry.findFirst({
      where: {
        OR: [
          {
            reference: `shipment-expense:${matchingEntry.id}`,
          },
          {
            metadata: {
              path: ['linkedUserExpenseEntryId'],
              equals: matchingEntry.id,
            },
          },
        ],
      },
      select: { id: true, metadata: true },
    });

    if (companyLedgerEntry) {
      await tx.companyLedgerEntry.update({
        where: { id: companyLedgerEntry.id },
        data: {
          description: `Expense recovery - ${lineItem.description}`,
          amount: lineItem.amount,
          notes: invoice.notes ?? null,
          metadata: {
            ...(companyLedgerEntry.metadata && typeof companyLedgerEntry.metadata === 'object' && !Array.isArray(companyLedgerEntry.metadata)
              ? (companyLedgerEntry.metadata as Record<string, unknown>)
              : {}),
            linkedUserExpenseEntryId: matchingEntry.id,
            shipmentId: lineItem.shipmentId,
            userId: invoice.userId,
            expenseType: lineItem.type,
            paymentMode: 'DUE',
          },
        },
      });
      if (shipment.container?.companyId) {
        await recalculateCompanyLedgerBalances(tx, shipment.container.companyId);
      }
    } else if (shipment.container?.companyId) {
      await tx.companyLedgerEntry.create({
        data: {
          companyId: shipment.container.companyId,
          description: `Expense recovery - ${lineItem.description}`,
          type: 'CREDIT',
          amount: lineItem.amount,
          balance: 0,
          category: 'Shipment Expense Recovery',
          reference: `shipment-expense:${matchingEntry.id}`,
          notes: invoice.notes ?? null,
          createdBy: actorId,
          metadata: {
            isExpenseRecovery: true,
            expenseSource: lineItem.expenseSource ?? 'SHIPMENT',
            linkedUserExpenseEntryId: matchingEntry.id,
            shipmentId: lineItem.shipmentId,
            userId: invoice.userId,
            expenseType: lineItem.type,
            paymentMode: 'DUE',
          },
        },
      });
      await recalculateCompanyLedgerBalances(tx, shipment.container.companyId);
    }

    return;
  }

  if (lineItem.amount <= 0) {
    return;
  }

  const createdEntry = await tx.ledgerEntry.create({
    data: {
      userId: invoice.userId,
      shipmentId: lineItem.shipmentId,
      description: lineItem.description,
      type: 'DEBIT',
      amount: lineItem.amount,
      balance: 0,
      createdBy: actorId,
      notes: invoice.notes ?? null,
      metadata: {
        isExpense: true,
        paymentMode: 'DUE',
        pendingInvoice: true,
        ...(lineItem.id ? { invoiceLineItemId: lineItem.id } : {}),
        ...(lineItem.chargeId ? { chargeId: lineItem.chargeId } : {}),
        expenseType: lineItem.type,
        expenseSource: lineItem.expenseSource ?? 'SHIPMENT',
        ...(shipment.container?.companyId ? { linkedCompanyId: shipment.container.companyId } : {}),
      },
    },
  });

  if (shipment.container?.companyId) {
    await tx.companyLedgerEntry.create({
      data: {
        companyId: shipment.container.companyId,
        description: `Expense recovery - ${lineItem.description}`,
        type: 'CREDIT',
        amount: lineItem.amount,
        balance: 0,
        category: 'Shipment Expense Recovery',
        reference: `shipment-expense:${createdEntry.id}`,
        notes: invoice.notes ?? null,
        createdBy: actorId,
        metadata: {
          isExpenseRecovery: true,
          expenseSource: lineItem.expenseSource ?? 'SHIPMENT',
          linkedUserExpenseEntryId: createdEntry.id,
          shipmentId: lineItem.shipmentId,
          userId: invoice.userId,
          expenseType: lineItem.type,
          paymentMode: 'DUE',
        },
      },
    });
    await recalculateCompanyLedgerBalances(tx, shipment.container.companyId);
  }
}

async function removeInvoiceLineItemLedgerEntries(
  tx: Prisma.TransactionClient,
  invoice: { userId: string },
  lineItem: { shipmentId: string | null; description: string; amount: number },
) {
  if (!lineItem.shipmentId) {
    return;
  }

  const pendingEntries = await tx.ledgerEntry.findMany({
    where: {
      userId: invoice.userId,
      shipmentId: lineItem.shipmentId,
      type: 'DEBIT',
      metadata: {
        path: ['pendingInvoice'],
        equals: true,
      },
    },
    select: {
      id: true,
      description: true,
      amount: true,
      shipmentId: true,
    },
  });

  const matchingEntryIds = pendingEntries
    .filter((entry) =>
      invoiceLineItemMatchesLedgerEntry(
        {
          shipmentId: lineItem.shipmentId,
          description: lineItem.description,
          amount: lineItem.amount,
        },
        {
          shipmentId: entry.shipmentId,
          description: entry.description,
          amount: Number(entry.amount ?? 0),
        },
      )
    )
    .map((entry) => entry.id);

  if (!matchingEntryIds.length) {
    return;
  }

  const companyEntries = await tx.companyLedgerEntry.findMany({
    where: {
      OR: [
        {
          reference: {
            in: matchingEntryIds.map((entryId) => `shipment-expense:${entryId}`),
          },
        },
        {
          metadata: {
            path: ['linkedUserExpenseEntryId'],
            equals: matchingEntryIds[0],
          },
        },
      ],
    },
    select: { id: true, companyId: true },
  });

  if (companyEntries.length) {
    const affectedCompanyIds = [...new Set(companyEntries.map((e) => e.companyId).filter(Boolean))];
    await tx.companyLedgerEntry.deleteMany({
      where: {
        id: { in: companyEntries.map((entry) => entry.id) },
      },
    });
    for (const companyId of affectedCompanyIds) {
      await recalculateCompanyLedgerBalances(tx, companyId);
    }
  }

  await tx.ledgerEntry.deleteMany({
    where: {
      id: { in: matchingEntryIds },
    },
  });
}

function normalizeShipmentRefInDescription(
  description: string,
  shipment?: { id: string; vehicleVIN: string | null }
) {
  if (!shipment?.id || !shipment.vehicleVIN) return description;
  return description
    .replace(new RegExp(`\\(Shipment\\s+${shipment.id}\\)`, 'gi'), `(VIN ${shipment.vehicleVIN})`)
    .replace(new RegExp(`Shipment\\s+${shipment.id}`, 'gi'), `VIN ${shipment.vehicleVIN}`)
    .replace(new RegExp(`shipment\\s+${shipment.id}`, 'g'), `VIN ${shipment.vehicleVIN}`);
}

function coerceLineItemType(value: string | null | undefined): LineItemType {
  const normalized = (value ?? 'OTHER_FEE')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const aliasMap: Record<string, LineItemType> = {
    SHIPPING: LineItemType.SHIPPING_FEE,
    SHIPPING_FEE: LineItemType.SHIPPING_FEE,
    INSURANCE: LineItemType.INSURANCE,
    CUSTOMS: LineItemType.CUSTOMS_FEE,
    CUSTOMS_FEE: LineItemType.CUSTOMS_FEE,
    STORAGE: LineItemType.STORAGE_FEE,
    STORAGE_FEE: LineItemType.STORAGE_FEE,
    HANDLING: LineItemType.HANDLING_FEE,
    HANDLING_FEE: LineItemType.HANDLING_FEE,
    OTHER: LineItemType.OTHER_FEE,
    OTHER_FEE: LineItemType.OTHER_FEE,
    DISCOUNT: LineItemType.DISCOUNT,
    VEHICLE: LineItemType.VEHICLE_PRICE,
    VEHICLE_PRICE: LineItemType.VEHICLE_PRICE,
    PURCHASE: LineItemType.PURCHASE_PRICE,
    PURCHASE_PRICE: LineItemType.PURCHASE_PRICE,
  };

  return aliasMap[normalized] ?? LineItemType.OTHER_FEE;
}

function buildExpenseLineItemKey(shipmentId: string, description: string, amount: number) {
  return `${shipmentId}::${description.trim().toLowerCase()}::${amount.toFixed(2)}`;
}

function isShipmentFinancialExpenseLineItem(lineItem: {
  shipmentId: string | null;
  description: string;
}) {
  if (!lineItem.shipmentId) return false;

  const description = lineItem.description.toLowerCase();

  if (description.includes('shared container expenses')) return false;
  if (description.includes('damage note')) return false;
  if (description.includes('damage compensation')) return false;
  if (description.includes('damage credit')) return false;
  if (description.endsWith('- vehicle price')) return false;
  if (description.endsWith('- insurance')) return false;

  return description.includes('(vin ') || description.includes('(shipment ');
}

/**
 * GET /api/invoices/[id]
 * Get a specific invoice
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canReadAllInvoices = hasPermission(session.user?.role, 'invoices:manage');

    const invoice = await prisma.userInvoice.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
          },
        },
        container: {
          select: {
            id: true,
            containerNumber: true,
            trackingNumber: true,
            status: true,
            vesselName: true,
            loadingPort: true,
            destinationPort: true,
            estimatedArrival: true,
          },
        },
        shipment: {
          select: {
            id: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehicleVIN: true,
            vehicleColor: true,
            status: true,
            paymentStatus: true,
          },
        },
        lineItems: {
          include: {
            shipment: {
              select: {
                id: true,
                vehicleType: true,
                vehicleMake: true,
                vehicleModel: true,
                vehicleYear: true,
                vehicleVIN: true,
                vehicleColor: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        auditLogs: canReadAllInvoices
          ? {
              select: {
                id: true,
                action: true,
                description: true,
                performedBy: true,
                oldValue: true,
                newValue: true,
                timestamp: true,
                metadata: true,
              },
              orderBy: {
                timestamp: 'desc',
              },
              take: 50,
            }
          : false,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check permissions: users can only view their own invoices
    if (!canReadAllInvoices && invoice.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const actorIds = canReadAllInvoices
      ? Array.from(
          new Set((invoice.auditLogs || []).map((log) => log.performedBy).filter(Boolean))
        )
      : [];

    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: {
            id: {
              in: actorIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const actorMap = new Map(
      actors.map((actor) => [actor.id, actor.name?.trim() || actor.email || actor.id])
    );

    const containerIds = canReadAllInvoices
      ? Array.from(
          new Set(
            (invoice.auditLogs || [])
              .flatMap((log) => {
                const metadata =
                  log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
                    ? (log.metadata as Record<string, unknown>)
                    : null;

                return [
                  typeof metadata?.oldContainerId === 'string' ? metadata.oldContainerId : null,
                  typeof metadata?.newContainerId === 'string' ? metadata.newContainerId : null,
                  typeof metadata?.containerId === 'string' ? metadata.containerId : null,
                ].filter((value): value is string => Boolean(value));
              })
          )
        )
      : [];

    const containers = containerIds.length
      ? await prisma.container.findMany({
          where: {
            id: {
              in: containerIds,
            },
          },
          select: {
            id: true,
            containerNumber: true,
          },
        })
      : [];

    const containerMap = new Map(
      containers.map((container) => [container.id, container.containerNumber])
    );

    const auditLogs = canReadAllInvoices
      ? (invoice.auditLogs || []).map((log) => {
          const metadata =
            log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
              ? { ...(log.metadata as Record<string, unknown>) }
              : log.metadata;

          if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
            const oldContainerId = typeof metadata.oldContainerId === 'string' ? metadata.oldContainerId : null;
            const newContainerId = typeof metadata.newContainerId === 'string' ? metadata.newContainerId : null;
            const containerId = typeof metadata.containerId === 'string' ? metadata.containerId : null;

            if (oldContainerId && containerMap.has(oldContainerId)) {
              metadata.oldContainerNumber = containerMap.get(oldContainerId);
            }

            if (newContainerId && containerMap.has(newContainerId)) {
              metadata.newContainerNumber = containerMap.get(newContainerId);
            }

            if (containerId && containerMap.has(containerId)) {
              metadata.containerNumber = containerMap.get(containerId);
            }
          }

          return {
            id: log.id,
            action: log.action,
            description: log.description,
            performedBy: actorMap.get(log.performedBy) || log.performedBy,
            oldValue: log.oldValue,
            newValue: log.newValue,
            timestamp: log.timestamp,
            metadata,
          };
        })
      : [];

    const shipmentIds = Array.from(
      new Set(invoice.lineItems.map((lineItem) => lineItem.shipmentId).filter((value): value is string => Boolean(value)))
    );

    const shipmentExpenseEntries = shipmentIds.length
      ? await prisma.ledgerEntry.findMany({
          where: {
            shipmentId: { in: shipmentIds },
            type: 'DEBIT',
          },
          select: {
            id: true,
            shipmentId: true,
            description: true,
            amount: true,
            transactionDate: true,
            metadata: true,
          },
          orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
        })
      : [];

    const expenseEntryIds = shipmentExpenseEntries.map((entry) => entry.id);
    const companyLedgerEntries = expenseEntryIds.length
      ? await prisma.companyLedgerEntry.findMany({
          where: {
            reference: {
              in: expenseEntryIds.map((entryId) => `shipment-expense:${entryId}`),
            },
          },
          select: {
            id: true,
            companyId: true,
            description: true,
            reference: true,
            notes: true,
            metadata: true,
            company: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        })
      : [];

    const linkedCompanyEntriesByUserExpenseId = buildLinkedCompanyLedgerEntryMap(companyLedgerEntries);
    const shipmentById = new Map(
      invoice.lineItems
        .filter((lineItem) => lineItem.shipment)
        .map((lineItem) => [lineItem.shipment!.id, lineItem.shipment!])
    );
    const queuedExpenseEntriesByKey = new Map<string, typeof shipmentExpenseEntries>();

    for (const entry of shipmentExpenseEntries) {
      if (!entry.shipmentId) continue;

      const shipment = shipmentById.get(entry.shipmentId);
      const normalizedDescription = normalizeShipmentRefInDescription(entry.description || '', shipment);
      const key = buildExpenseLineItemKey(entry.shipmentId, normalizedDescription, entry.amount);
      const queuedEntries = queuedExpenseEntriesByKey.get(key) || [];
      queuedEntries.push(entry);
      queuedExpenseEntriesByKey.set(key, queuedEntries);
    }

    const lineItemsWithLinks = invoice.lineItems.map((lineItem) => {
      if (!lineItem.shipmentId) {
        return { ...lineItem, linkedCompanyLedgerEntry: null, matchedUserExpenseEntryId: null };
      }

      const key = buildExpenseLineItemKey(lineItem.shipmentId, lineItem.description, lineItem.amount);
      const queuedEntries = queuedExpenseEntriesByKey.get(key);
      const matchedUserExpenseEntry = queuedEntries?.shift();

      return {
        ...lineItem,
        matchedUserExpenseEntryId: matchedUserExpenseEntry?.id || null,
        linkedCompanyLedgerEntry: matchedUserExpenseEntry
          ? linkedCompanyEntriesByUserExpenseId.get(matchedUserExpenseEntry.id) || null
          : null,
      };
    });

    const isEditableInvoice = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
    const lineItems = isEditableInvoice
      ? lineItemsWithLinks.filter((lineItem) => {
          if (!isShipmentFinancialExpenseLineItem({ shipmentId: lineItem.shipmentId, description: lineItem.description })) {
            return true;
          }

          return Boolean(lineItem.matchedUserExpenseEntryId || lineItem.linkedCompanyLedgerEntry);
        })
      : lineItemsWithLinks;

    const subtotal = isEditableInvoice
      ? lineItems.reduce((sum, lineItem) => sum + lineItem.amount, 0)
      : invoice.subtotal;
    const total = isEditableInvoice
      ? subtotal - (invoice.discount ?? 0) + (invoice.tax ?? 0)
      : invoice.total;

    return NextResponse.json({
      ...invoice,
      lineItems,
      subtotal,
      total,
      auditLogs,
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/invoices/[id]
 * Update an invoice (admin only)
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update invoices
    if (!hasPermission(session.user?.role, 'invoices:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    const lineItemOperationSchema = z.object({
      action: z.enum(['add', 'remove', 'update']).optional(),
      id: z.string().optional(),
      description: z.string().min(1).optional(),
      type: z.string().min(1).optional(),
      quantity: z.number().min(0).optional(),
      unitPrice: z.number().min(0).optional(),
      amount: z.number().finite().optional(),
      companyAmount: z.number().min(0).optional(),
      shipmentId: z.string().nullable().optional(),
      expenseSource: z.string().nullable().optional(),
    });

    const updateSchema = z.object({
      status: z.enum(['DRAFT', 'PENDING', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED', 'VOID', 'REFUNDED']).optional(),
      dueDate: z.string().nullable().optional(),
      paidDate: z.string().nullable().optional(),
      paymentMethod: z.string().nullable().optional(),
      paymentReference: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      internalNotes: z.string().nullable().optional(),
      discount: z.number().min(0).optional(),
      tax: z.number().min(0).optional(),
      lineItems: z.array(lineItemOperationSchema).optional(),
    });

    const validatedData = updateSchema.parse(body);
    const { lineItems: lineItemOperations, ...invoiceUpdateData } = validatedData;

    // Get current invoice to recalculate total if discount or tax changes
    const currentInvoice = await prisma.userInvoice.findUnique({
      where: { id: params.id },
      include: {
        lineItems: true,
      },
    });
    if (!currentInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const previousStatus = currentInvoice.status;

    // State-machine guard: reject any status transition not explicitly allowed.
    if (validatedData.status && validatedData.status !== previousStatus) {
      const transitionError = invoiceTransitionError(previousStatus, validatedData.status);
      if (transitionError) {
        return NextResponse.json({ error: transitionError }, { status: 400 });
      }
    }

    if (lineItemOperations?.length && ['PAID', 'CANCELLED', 'VOID', 'REFUNDED'].includes(currentInvoice.status)) {
      return NextResponse.json(
        { error: `Invoice ${currentInvoice.invoiceNumber} is ${currentInvoice.status.toLowerCase()} and cannot have its line items changed.` },
        { status: 400 },
      );
    }

    let subtotal = currentInvoice.subtotal;
    let total = currentInvoice.total;

    const invoice = await prisma.$transaction(async (tx) => {
      if (lineItemOperations?.length) {
        for (const operation of lineItemOperations) {
          if (operation.action === 'remove') {
            if (!operation.id) {
              throw new Error('A line item removal requires an id.');
            }

            const lineItem = await tx.invoiceLineItem.findUnique({ where: { id: operation.id } });
            if (!lineItem || lineItem.invoiceId !== currentInvoice.id) {
              continue;
            }

            await removeInvoiceLineItemLedgerEntries(
              tx,
              { userId: currentInvoice.userId },
              {
                shipmentId: lineItem.shipmentId,
                description: lineItem.description,
                amount: Number(lineItem.amount ?? 0),
              },
            );

            await tx.invoiceLineItem.delete({ where: { id: operation.id } });
            continue;
          }

          if (operation.action === 'update') {
            if (!operation.id) {
              throw new Error('A line item update requires an id.');
            }

            const lineItem = await tx.invoiceLineItem.findUnique({ where: { id: operation.id } });
            if (!lineItem || lineItem.invoiceId !== currentInvoice.id) {
              continue;
            }

            const nextDescription = operation.description?.trim() ?? lineItem.description;
            const nextQuantity = Number(operation.quantity ?? lineItem.quantity ?? 1);
            const nextUnitPrice = Number(operation.unitPrice ?? lineItem.unitPrice ?? 0);
            const nextAmount = Number(operation.amount ?? lineItem.amount ?? 0);
            const computedAmount = nextAmount > 0 ? nextAmount : nextQuantity * nextUnitPrice;

            if (!nextDescription) {
              throw new Error('Invoice line item description is required.');
            }

            if (!Number.isFinite(computedAmount) || computedAmount < 0) {
              throw new Error('Invoice line item amount must be a valid non-negative number.');
            }

            const updatedLineItem = {
              shipmentId: operation.shipmentId ?? lineItem.shipmentId ?? null,
              description: nextDescription,
              amount: computedAmount,
              type: coerceLineItemType(operation.type ?? lineItem.type),
              expenseSource: operation.expenseSource ?? lineItem.expenseSource ?? null,
            };

            await removeInvoiceLineItemLedgerEntries(
              tx,
              { userId: currentInvoice.userId },
              {
                shipmentId: lineItem.shipmentId,
                description: lineItem.description,
                amount: Number(lineItem.amount ?? 0),
              },
            );

            await tx.invoiceLineItem.update({
              where: { id: operation.id },
              data: {
                description: nextDescription,
                shipmentId: updatedLineItem.shipmentId,
                type: updatedLineItem.type,
                quantity: nextQuantity,
                unitPrice: nextAmount > 0 && nextQuantity > 0 ? nextAmount / nextQuantity : nextUnitPrice,
                amount: computedAmount,
                expenseSource: updatedLineItem.expenseSource,
              },
            });

            await syncInvoiceLineItemLedgerEntries(
              tx,
              { id: currentInvoice.id, userId: currentInvoice.userId, notes: invoiceUpdateData.notes ?? currentInvoice.notes },
              {
                id: operation.id,
                shipmentId: updatedLineItem.shipmentId,
                description: updatedLineItem.description,
                amount: updatedLineItem.amount,
                type: updatedLineItem.type,
                expenseSource: updatedLineItem.expenseSource,
              },
              actorId,
            );
            continue;
          }

          if (operation.action === 'add' || (!operation.action && operation.description)) {
            const quantity = Number(operation.quantity ?? 1);
            const unitPrice = Number(operation.unitPrice ?? 0);
            const explicitAmount = Number(operation.amount ?? 0);
            const computedAmount = explicitAmount > 0 ? explicitAmount : quantity * unitPrice;
            const finalDescription = operation.description?.trim();

            if (!finalDescription) {
              throw new Error('Invoice line item description is required.');
            }

            if (!Number.isFinite(computedAmount) || computedAmount < 0) {
              throw new Error('Invoice line item amount must be a valid non-negative number.');
            }

            const createdLineItem = await tx.invoiceLineItem.create({
              data: {
                invoiceId: currentInvoice.id,
                description: finalDescription,
                shipmentId: operation.shipmentId ?? null,
                type: coerceLineItemType(operation.type ?? 'OTHER_FEE'),
                quantity,
                unitPrice: explicitAmount > 0 && quantity > 0 ? explicitAmount / quantity : unitPrice,
                amount: computedAmount,
                expenseSource: operation.expenseSource ?? null,
              },
            });

            await syncInvoiceLineItemLedgerEntries(
              tx,
              { id: currentInvoice.id, userId: currentInvoice.userId, notes: invoiceUpdateData.notes ?? currentInvoice.notes },
              {
                id: createdLineItem.id,
                chargeId: createdLineItem.chargeId,
                shipmentId: createdLineItem.shipmentId,
                description: createdLineItem.description,
                amount: createdLineItem.amount,
                type: createdLineItem.type,
                expenseSource: createdLineItem.expenseSource,
              },
              actorId,
            );
          }
        }
      }

      const refreshedLineItems = await tx.invoiceLineItem.findMany({
        where: { invoiceId: currentInvoice.id },
      });

      subtotal = roundToCents(refreshedLineItems.reduce((sum, lineItem) => sum + lineItem.amount, 0));
      const discount = invoiceUpdateData.discount ?? currentInvoice.discount;
      const tax = invoiceUpdateData.tax ?? currentInvoice.tax;
      total = roundToCents(recalculateInvoiceTotal(subtotal, discount, tax));

      // For partial-payment tracking: compute how much of this invoice has been paid.
      let amountPaid = currentInvoice.amountPaid ?? 0;
      if (invoiceUpdateData.status === 'PAID') {
        amountPaid = total;
      } else if (invoiceUpdateData.status === 'PARTIALLY_PAID') {
        // Partially paid: update amountPaid via payments/allocation later;
        // for now, keep existing amountPaid (will be set by the payment endpoint).
      }
      const amountRemaining = roundToCents(Math.max(0, total - amountPaid));

      const updatedInvoice = await tx.userInvoice.update({
        where: { id: params.id },
        data: {
          ...invoiceUpdateData,
          total,
          subtotal,
          amountPaid,
          amountRemaining,
          dueDate: invoiceUpdateData.dueDate ? new Date(invoiceUpdateData.dueDate) : invoiceUpdateData.dueDate === null ? null : undefined,
          paidDate: invoiceUpdateData.paidDate ? new Date(invoiceUpdateData.paidDate) : invoiceUpdateData.paidDate === null ? null : undefined,
          paymentMethod: invoiceUpdateData.paymentMethod ?? null,
          paymentReference: invoiceUpdateData.paymentReference ?? null,
          notes: invoiceUpdateData.notes ?? null,
          internalNotes: invoiceUpdateData.internalNotes ?? null,
          discount,
          tax,
          status: invoiceUpdateData.status ?? currentInvoice.status,
        },
        include: {
          user: true,
          container: true,
          lineItems: {
            include: {
              shipment: true,
            },
          },
        },
      });

      // When marking as VOID: release charges so they can be re-invoiced.
      if (invoiceUpdateData.status === 'VOID' && previousStatus !== 'VOID') {
        await releaseInvoiceShipmentCharges(tx, updatedInvoice.id);
      }

      // When marking as REFUNDED: flip related charges to a refund-able state.
      if (invoiceUpdateData.status === 'REFUNDED' && previousStatus !== 'REFUNDED') {
        await tx.shipmentCharge.updateMany({
          where: { invoiceId: updatedInvoice.id, status: 'PAID' },
          data: { status: 'VOID', voidedAt: new Date() },
        });
      }

      return updatedInvoice;
    });

    if (invoiceUpdateData.discount !== undefined || invoiceUpdateData.tax !== undefined) {
      const discount = invoiceUpdateData.discount ?? currentInvoice.discount;
      const tax = invoiceUpdateData.tax ?? currentInvoice.tax;
      total = recalculateInvoiceTotal(subtotal, discount, tax);
    }

    // When marking as PAID:
    //   1. Check customer credit balance is sufficient for the portion not already posted
    //      into the ledger (excluding car purchase price)
    //   2. Tag pending DUE expense ledger entries with invoice details
    //   3. Create a DEBIT for the non-expense portion (excluding car purchase price)
    //   4. Recalculate running balances
    let paymentLedgerEntryId: string | undefined;
    if (validatedData.status === 'PAID' && previousStatus !== 'PAID') {
      const invoiceTotal = total;

      // Collect shipment IDs from invoice line items
      // Collect shipment IDs from invoice line items AND the invoice's direct shipmentId
      const invoiceShipmentIds = [
        ...new Set(
          [
            ...currentInvoice.lineItems
              .map((li) => li.shipmentId)
              .filter((id): id is string => Boolean(id)),
            currentInvoice.shipmentId ?? undefined,
          ].filter((id): id is string => Boolean(id))
        ),
      ];

      // Car purchase price line items are excluded from the customer ledger.
      // Fetch a fresh line-item snapshot (post-transaction) to avoid the stale-data
      // bug where a line-item add/remove in the same request changed `total`
      // but the purchase-price total was computed from the pre-transaction read.
      const freshLineItems = await prisma.invoiceLineItem.findMany({
        where: { invoiceId: currentInvoice.id },
      });
      const purchasePriceTotal = Math.min(
        roundToCents(
          freshLineItems
            .filter((li) => li.type === 'PURCHASE_PRICE')
            .reduce((sum, li) => sum + li.amount, 0),
        ),
        invoiceTotal
      );

      // The ledger-relevant total excludes the car purchase price
      const ledgerRelevantTotal = roundToCents(invoiceTotal - purchasePriceTotal);

      // Find all pending expense entries for those shipments belonging to this customer
      const pendingExpenseEntries = invoiceShipmentIds.length > 0
        ? await prisma.ledgerEntry.findMany({
            where: {
              userId: currentInvoice.userId,
              shipmentId: { in: invoiceShipmentIds },
              type: 'DEBIT',
              metadata: {
                path: ['pendingInvoice'],
                equals: true,
              },
            },
            select: { id: true, amount: true, metadata: true },
          })
        : [];

      const pendingExpenseTotal = roundToCents(pendingExpenseEntries.reduce((sum, e) => sum + e.amount, 0));

      // Effective balance already includes pending shipment expenses.
      const latestEntry = await prisma.ledgerEntry.findFirst({
        where: { userId: currentInvoice.userId },
        orderBy: { transactionDate: 'desc' },
        select: { balance: true },
      });
      const effectiveBalance = latestEntry?.balance ?? 0;
      const availableCredit = effectiveBalance < 0 ? -effectiveBalance : 0;

      // The non-expense portion = invoice items not already tracked as ledger entries
      // (insurance, shared container expenses, etc.) — car purchase price is excluded.
      const nonExpenseAmount = roundToCents(Math.max(0, ledgerRelevantTotal - pendingExpenseTotal));

      // Calculate how much available credit can be used, and how much is covered via direct payment
      const creditToDraw = Math.min(availableCredit, nonExpenseAmount);
      const directPaymentNeeded = roundToCents(Math.max(0, nonExpenseAmount - creditToDraw));

      await prisma.$transaction(async (tx) => {
        // Tag each pending expense entry with invoice details. The entry already affects the
        // balance; clearing pendingInvoice just marks it as invoiced/settled in workflow terms.
        for (const entry of pendingExpenseEntries) {
          const meta = (entry.metadata ?? {}) as Record<string, unknown>;
          await tx.ledgerEntry.update({
            where: { id: entry.id },
            data: {
              metadata: {
                ...meta,
                pendingInvoice: false,
                invoiceId: currentInvoice.id,
                invoiceNumber: currentInvoice.invoiceNumber,
              },
            },
          });
        }

        // Create a DEBIT for the non-expense portion (vehicle price, insurance, shipping fare, etc.)
        let nonExpenseEntry: { id: string } | undefined;
        if (nonExpenseAmount > 0.001) {
          nonExpenseEntry = await tx.ledgerEntry.create({
            data: {
              userId: currentInvoice.userId,
              description: `Invoice ${currentInvoice.invoiceNumber} charges — shipping / other charges`,
              type: 'DEBIT',
              transactionInfoType: 'SHIPPING_PAYMENT',
              amount: nonExpenseAmount,
              balance: 0, // will be corrected by recalculate below
              createdBy: actorId,
              notes: validatedData.notes,
              metadata: {
                invoiceId: currentInvoice.id,
                invoiceNumber: currentInvoice.invoiceNumber,
                paymentMethod: validatedData.paymentMethod ?? null,
                paymentType: 'invoice_charge',
              },
            },
          });
        }

        // If direct payment covers the portion not paid from pre-existing credit, record the payment receipt
        let directPaymentEntry: { id: string } | undefined;
        if (directPaymentNeeded > 0.001) {
          const method = validatedData.paymentMethod || currentInvoice.paymentMethod || 'CASH';
          directPaymentEntry = await tx.ledgerEntry.create({
            data: {
              userId: currentInvoice.userId,
              description: `Payment received for Invoice ${currentInvoice.invoiceNumber}`,
              type: 'CREDIT',
              transactionInfoType: 'SHIPPING_PAYMENT',
              amount: directPaymentNeeded,
              balance: 0,
              createdBy: actorId,
              notes: validatedData.notes,
              metadata: {
                invoiceId: currentInvoice.id,
                invoiceNumber: currentInvoice.invoiceNumber,
                paymentMethod: method,
                paymentType: 'payment_received',
                directInvoicePayment: true,
              },
            },
          });

          const paymentRecord = await tx.payment.create({
            data: {
              userId: currentInvoice.userId,
              shipmentId: invoiceShipmentIds[0] ?? null,
              invoiceId: currentInvoice.id,
              amount: directPaymentNeeded,
              status: 'COMPLETED',
              method: (['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'WIRE_TRANSFER'].includes(method)
                ? method
                : 'BANK_TRANSFER') as any,
            },
          });

          await tx.paymentAllocation.create({
            data: {
              paymentId: paymentRecord.id,
              invoiceId: currentInvoice.id,
              amount: directPaymentNeeded,
            },
          });
        }

        // Update the invoice amountPaid and amountRemaining to full settlement
        await tx.userInvoice.update({
          where: { id: currentInvoice.id },
          data: {
            amountPaid: invoiceTotal,
            amountRemaining: 0,
            paidDate: new Date(),
            paymentMethod: validatedData.paymentMethod || currentInvoice.paymentMethod || 'CASH',
            paymentReference: directPaymentEntry?.id ?? currentInvoice.paymentReference ?? null,
          },
        });

        // Recalculate all running balances (pending entries now activated)
        await recalculateUserLedgerBalances(tx, currentInvoice.userId);

        // Mark related shipments as paymentStatus COMPLETED
        if (invoiceShipmentIds.length > 0) {
          await tx.shipment.updateMany({
            where: { id: { in: invoiceShipmentIds } },
            data: { paymentStatus: 'COMPLETED' },
          });
        }

        await markInvoiceShipmentChargesPaid(tx, currentInvoice.id);

        paymentLedgerEntryId = directPaymentEntry?.id ?? nonExpenseEntry?.id ?? pendingExpenseEntries[0]?.id;
      });
    }


    const invoiceAuditLogs: Array<{
      invoiceId: string;
      action: string;
      description: string;
      performedBy: string;
      oldValue?: string | null;
      newValue?: string | null;
      metadata?: Prisma.InputJsonValue;
    }> = [];

    if (validatedData.status && validatedData.status !== previousStatus) {
      invoiceAuditLogs.push({
        invoiceId: invoice.id,
        action: 'STATUS_CHANGE',
        description: `Invoice status changed from ${previousStatus} to ${validatedData.status}`,
        performedBy: actorId,
        oldValue: previousStatus,
        newValue: validatedData.status,
      });
    }

    const updatedFieldNames = Object.keys(validatedData).filter((fieldName) => {
      if (fieldName === 'status') {
        return false;
      }

      return validatedData[fieldName as keyof typeof validatedData] !== undefined;
    });

    if (updatedFieldNames.length > 0) {
      invoiceAuditLogs.push({
        invoiceId: invoice.id,
        action: 'INVOICE_UPDATED',
        description: `Invoice fields updated: ${updatedFieldNames.join(', ')}`,
        performedBy: actorId,
        metadata: {
          updatedFields: updatedFieldNames,
        },
      });
    }

    await createInvoiceAuditLogs(invoiceAuditLogs);

    if (validatedData.status && validatedData.status !== previousStatus) {
      const formattedStatus = validatedData.status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());

      try {
        await createNotification({
          userId: invoice.userId,
          senderId: actorId,
          title: 'Invoice status updated',
          description: `Invoice ${invoice.invoiceNumber} is now ${formattedStatus}.`,
          type: NotificationType.INFO,
          link: `/dashboard/invoices/${invoice.id}`,
        });
      } catch (notificationError) {
        console.error('Failed to create invoice status notification:', notificationError);
      }
    }

    return NextResponse.json(invoice);

  } catch (error) {
    console.error('Error updating invoice:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invoices/[id]
 * Delete an invoice (admin only)
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete invoices
    if (!hasPermission(session.user?.role, 'invoices:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if invoice exists
    const invoice = await prisma.userInvoice.findUnique({
      where: { id: params.id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Only un-issued invoices may be deleted. Issued invoices carry customer and
    // ledger state; they must be reversed (cancelled) instead, which keeps the
    // document for the audit trail and releases its charges for dispute.
    if (!['DRAFT', 'PENDING'].includes(invoice.status)) {
      return NextResponse.json(
        {
          error:
            invoice.status === 'PAID'
              ? 'Paid invoices cannot be deleted. Record the refund/reversal first.'
              : `Invoice ${invoice.invoiceNumber} is ${invoice.status.toLowerCase()} and cannot be deleted. Reverse it instead — that releases its charges while keeping the audit trail.`,
        },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const userLedgerLinks = await tx.ledgerEntry.findMany({
        where: {
          OR: [
            {
              metadata: {
                path: ['invoiceId'],
                equals: invoice.id,
              },
            },
            {
              metadata: {
                path: ['invoiceNumber'],
                equals: invoice.invoiceNumber,
              },
            },
            ...(invoice.paymentReference
              ? [
                  {
                    id: invoice.paymentReference,
                  },
                ]
              : []),
          ],
        },
        select: { id: true },
      });

      const companyLedgerLinks = await tx.companyLedgerEntry.findMany({
        where: {
          OR: [
            {
              metadata: {
                path: ['invoiceId'],
                equals: invoice.id,
              },
            },
            {
              metadata: {
                path: ['invoiceNumber'],
                equals: invoice.invoiceNumber,
              },
            },
            {
              reference: invoice.invoiceNumber,
            },
          ],
        },
        select: { id: true },
      });

      const userLedgerEntryIds = userLedgerLinks.map((entry) => entry.id);
      const companyLedgerEntryIds = companyLedgerLinks.map((entry) => entry.id);

      if (userLedgerEntryIds.length > 0) {
        await tx.ledgerEntry.deleteMany({
          where: {
            id: { in: userLedgerEntryIds },
          },
        });
      }

      if (companyLedgerEntryIds.length > 0) {
        await tx.companyLedgerEntry.deleteMany({
          where: {
            id: { in: companyLedgerEntryIds },
          },
        });
      }

      await resetInvoiceShipmentCharges(tx, invoice.id);

      // Delete invoice (cascade will delete line items)
      await tx.userInvoice.delete({
        where: { id: params.id },
      });

      return {
        removedUserLedgerEntries: userLedgerEntryIds.length,
        removedCompanyLedgerEntries: companyLedgerEntryIds.length,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice and linked ledger transactions deleted successfully',
      ...result,
    });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
