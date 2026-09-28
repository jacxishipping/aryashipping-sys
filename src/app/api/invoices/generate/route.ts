import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { allocateExpenses, type AllocationMethod } from '@/lib/expense-allocation';
import { sendInvoiceEmail } from '@/lib/email';
import { NotificationType, Prisma } from '@prisma/client';
import { createNotification } from '@/lib/notifications';
import { createInvoiceAuditLogs } from '@/lib/entity-audit-history';
import { hasPermission } from '@/lib/rbac';
import { materializeContainerShipmentCharges } from '@/lib/billing/container-shipment-charge-materialization';
import {
  buildInvoiceLineItemFromCharge,
  markInvoiceShipmentChargesInvoiced,
  releaseInvoiceShipmentCharges,
} from '@/lib/billing/shipment-charges';
import { createInvoiceWithUniqueNumber, generateInvoiceNumber } from '@/lib/shipment-invoice';
import { applyPercentDiscount, roundToCents, sumCents } from '@/lib/financial/money';
import { captureFxSnapshot } from '@/lib/financial/fx-snapshot';
import type { Currency } from '@/lib/financial/currency';

const mutableInvoiceStatuses = new Set(['DRAFT', 'PENDING']);

// Schema for generating invoices
const generateInvoicesSchema = z.object({
  containerId: z.string().optional(),
  shipmentId: z.string().optional(),
  dueDate: z.string().optional(),
  sendEmail: z.boolean().default(true), // Changed default to true
  discountPercent: z.number().min(0).max(100).default(0),
}).refine((value) => Boolean(value.containerId) !== Boolean(value.shipmentId), {
  message: 'Provide either a containerId or a shipmentId',
  path: ['containerId'],
});


/**
 * POST /api/invoices/generate
 * 
 * Generate official UserInvoices for either a container scope or a single shipment.
 * 
 * This is the PRIMARY method for creating customer invoices. It:
 * 1. Groups all shipments in the container by customer
 * 2. Creates ONE invoice per customer (consolidating all their shipments)
 * 3. Allocates container expenses across shipments based on allocation method
 * 4. Saves invoices to database with tracking and status
 * 5. Sends email notifications with PDF links
 * 6. Creates in-app notifications
 * 
 * Important: This is different from the quick PDF export on shipment pages.
 * Those PDFs are for reference only and are NOT saved to the database.
 * 
 * @requires Admin role
 * @param containerId - ID of the container
 * @param shipmentId - ID of the shipment
 * @param dueDate - Optional due date for payment
 * @param sendEmail - Whether to send email notifications (default: true)
 * @param discountPercent - Percentage discount to apply (0-100)
 * 
 * @returns Array of generated invoice objects with user details
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can generate invoices
    if (!hasPermission(session.user?.role, 'invoices:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { containerId, shipmentId, dueDate, sendEmail, discountPercent } = generateInvoicesSchema.parse(body);

    type InvoiceScopeShipment = {
      id: string;
      userId: string;
      user: {
        id: string;
        name: string | null;
        email: string;
      };
      serviceType: 'PURCHASE_AND_SHIPPING' | 'SHIPPING_ONLY';
      purchasePrice: number | null;
      price: number | null;
      priceListPricingSnapshot: Prisma.JsonValue | null;
      insuranceValue: number | null;
      damageCredit: number | null;
      vehicleYear: number | null;
      vehicleMake: string | null;
      vehicleModel: string | null;
      vehicleVIN: string | null;
      containerId: string | null;
    };

    let scopeContainerId: string | null = null;
    let allocationMethod: AllocationMethod = 'EQUAL';
    let expenseAllocations: Record<string, number> = {};
    let materializationShipments: InvoiceScopeShipment[] = [];
    let invoiceTargetShipments: InvoiceScopeShipment[] = [];

    if (containerId) {
      const container = await prisma.container.findUnique({
        where: { id: containerId },
        include: {
          shipments: {
            include: {
              user: true,
            },
          },
          expenses: true,
        },
      });

      if (!container) {
        return NextResponse.json({ error: 'Container not found' }, { status: 404 });
      }

      if (container.shipments.length === 0) {
        return NextResponse.json({ error: 'No shipments in container' }, { status: 400 });
      }

      scopeContainerId = container.id;
      allocationMethod = (container.expenseAllocationMethod as AllocationMethod | null) || 'EQUAL';
      expenseAllocations = allocateExpenses(container.shipments, container.expenses, allocationMethod);
      materializationShipments = container.shipments as InvoiceScopeShipment[];
      invoiceTargetShipments = container.shipments as InvoiceScopeShipment[];
    } else {
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId! },
        include: {
          user: true,
          container: {
            include: {
              shipments: {
                include: {
                  user: true,
                },
              },
              expenses: true,
            },
          },
        },
      });

      if (!shipment) {
        return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
      }

      invoiceTargetShipments = [shipment as InvoiceScopeShipment];

      if (shipment.container) {
        scopeContainerId = shipment.container.id;
        allocationMethod = (shipment.container.expenseAllocationMethod as AllocationMethod | null) || 'EQUAL';
        expenseAllocations = allocateExpenses(shipment.container.shipments, shipment.container.expenses, allocationMethod);
        materializationShipments = shipment.container.shipments as InvoiceScopeShipment[];
      } else {
        materializationShipments = [shipment as InvoiceScopeShipment];
      }
    }

    const shipmentIds = materializationShipments.map((shipment) => shipment.id);
    const shipmentLedgerEntries = shipmentIds.length
      ? await prisma.ledgerEntry.findMany({
          where: {
            shipmentId: { in: shipmentIds },
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
          },
        })
      : [];

    const shipmentDamageRecords = shipmentIds.length
      ? await prisma.containerDamage.findMany({
          where: {
            shipmentId: { in: shipmentIds },
            damageType: 'WE_PAY',
          },
          select: {
            shipmentId: true,
            amount: true,
          },
        })
      : [];

    await prisma.$transaction(async (tx) => {
      await materializeContainerShipmentCharges(tx, {
        actorId,
        allocationMethod,
        containerId: scopeContainerId || `shipment:${shipmentId}`,
        expenseAllocations,
        shipmentDamageRecords,
        shipmentLedgerEntries: shipmentLedgerEntries.map((entry) => ({
          ...entry,
          type: entry.type as 'DEBIT' | 'CREDIT',
          transactionInfoType: entry.transactionInfoType as 'CAR_PAYMENT' | 'SHIPPING_PAYMENT' | 'STORAGE_PAYMENT' | null,
          metadata: (entry.metadata ?? {}) as Prisma.JsonValue,
        })),
        shipments: materializationShipments.map((shipment) => ({
          id: shipment.id,
          userId: shipment.userId,
          serviceType: shipment.serviceType,
          purchasePrice: shipment.purchasePrice,
          price: shipment.price,
          priceListPricingSnapshot: shipment.priceListPricingSnapshot as Prisma.JsonValue | null,
          insuranceValue: shipment.insuranceValue,
          damageCredit: shipment.damageCredit,
          vehicleYear: shipment.vehicleYear,
          vehicleMake: shipment.vehicleMake,
          vehicleModel: shipment.vehicleModel,
          vehicleVIN: shipment.vehicleVIN,
        })),
      });
    });

    // Group shipment targets by user
    const shipmentsByUser = invoiceTargetShipments.reduce((acc, shipment) => {
      const userId = shipment.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: shipment.user,
          shipments: [],
        };
      }
      acc[userId].shipments.push(shipment);
      return acc;
    }, {} as Record<string, { user: any; shipments: any[] }>);

    // Generate invoices for each user
    const generatedInvoices: Array<{
      userId: string;
      userName: string | null;
      invoiceId: string;
      invoiceNumber: string;
      total: number;
      status: 'created' | 'updated' | 'supplemental' | 'credit_note';
    }> = [];
    const invoiceAuditLogs: Array<{
      invoiceId: string;
      action: string;
      description: string;
      performedBy: string;
      oldValue?: string | null;
      newValue?: string | null;
      metadata?: Prisma.InputJsonValue;
    }> = [];

    const isShipmentScopedGeneration = Boolean(shipmentId);

    for (const [userId, { user, shipments }] of Object.entries(shipmentsByUser)) {
      const shipmentScopeIds = shipments.map((shipment) => shipment.id);
      const existingInvoices = await prisma.userInvoice.findMany({
        where: isShipmentScopedGeneration
          ? {
              userId,
              status: {
                not: 'CANCELLED',
              },
              OR: [
                {
                  shipmentId: {
                    in: shipmentScopeIds,
                  },
                },
                {
                  shipmentCharges: {
                    some: {
                      shipmentId: {
                        in: shipmentScopeIds,
                      },
                    },
                  },
                },
              ],
            }
          : {
              userId,
              containerId,
              status: {
                not: 'CANCELLED',
              },
            },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          createdAt: true,
          shipmentId: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const mutableInvoice = existingInvoices.find((invoice) => mutableInvoiceStatuses.has(invoice.status));
      const latestIssuedInvoice = existingInvoices.find((invoice) => !mutableInvoiceStatuses.has(invoice.status));

      // Set due date (30 days from now if not provided)
      const invoiceDueDate = dueDate 
        ? new Date(dueDate) 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const invoice = await prisma.$transaction(async (tx) => {
        if (mutableInvoice) {
          await releaseInvoiceShipmentCharges(tx, mutableInvoice.id);
        }

        const invoiceCharges = await tx.shipmentCharge.findMany({
          where: {
            userId,
            shipmentId: {
              in: shipmentScopeIds,
            },
            status: 'APPROVED',
            invoiceId: null,
          },
          orderBy: [{ billableAt: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            chargeCode: true,
            category: true,
            description: true,
            quantity: true,
            unitAmount: true,
            totalAmount: true,
            shipmentId: true,
          },
        });

        if (!invoiceCharges.length && !mutableInvoice) {
          return null;
        }

        const subtotal = sumCents(invoiceCharges.map((c) => c.totalAmount));
        const { discount: discountAmount, total } = applyPercentDiscount(subtotal, discountPercent);
        const lineItems = invoiceCharges.map((charge) => buildInvoiceLineItemFromCharge(charge));
        const isIssuedDelta = !mutableInvoice && Boolean(latestIssuedInvoice);
        const documentKind: 'created' | 'updated' | 'supplemental' | 'credit_note' = mutableInvoice
          ? 'updated'
          : isIssuedDelta
          ? total < 0
            ? 'credit_note'
            : 'supplemental'
          : 'created';

        let nextInvoice: { id: string; invoiceNumber: string; total: number };

        if (mutableInvoice) {
          nextInvoice = await tx.userInvoice.update({
            where: { id: mutableInvoice.id },
            data: {
              dueDate: invoiceDueDate,
              subtotal,
              discount: discountAmount,
              total,
              lineItems: {
                deleteMany: {},
                create: lineItems,
              },
            },
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
            },
          });
        } else {
          const invoiceNumber = await generateInvoiceNumber(
            tx,
            documentKind === 'credit_note'
              ? 'CRN'
              : documentKind === 'supplemental'
              ? 'SUP'
              : 'INV',
          );

          const deltaNote = latestIssuedInvoice
            ? documentKind === 'credit_note'
              ? `Credit note issued for post-issue shipment adjustments after ${latestIssuedInvoice.invoiceNumber}.`
              : `Supplemental invoice issued for shipment charges approved after ${latestIssuedInvoice.invoiceNumber}.`
            : null;

          nextInvoice = await createInvoiceWithUniqueNumber(
            tx,
            async (generatedInvoiceNumber) =>
              tx.userInvoice.create({
                data: {
                  invoiceNumber: generatedInvoiceNumber,
                  userId,
                  containerId: scopeContainerId,
                  shipmentId: isShipmentScopedGeneration ? shipments[0]?.id : null,
                  status: 'DRAFT',
                  issueDate: new Date(),
                  dueDate: invoiceDueDate,
                  subtotal,
                  discount: discountAmount,
                  total,
                  amountPaid: 0,
                  amountRemaining: total,
                  notes: deltaNote,
                  internalNotes: deltaNote,
                  lineItems: {
                    create: lineItems,
                  },
                },
                select: {
                  id: true,
                  invoiceNumber: true,
                  total: true,
                },
              }),
            documentKind === 'credit_note' ? 'CRN' : documentKind === 'supplemental' ? 'SUP' : 'INV',
          );
        }

        await markInvoiceShipmentChargesInvoiced(
          tx,
          nextInvoice.id,
          invoiceCharges.map((charge) => charge.id),
        );

        // Phase 3: capture an FX snapshot when the container's expenses carry
        // a non-USD currency, so the invoice preserves the exact rate used.
        const firstChargeCurrency = invoiceCharges.length
          ? (await tx.shipmentCharge.findFirst({
              where: { id: invoiceCharges[0].id },
              select: { currency: true },
            }))?.currency
          : null;

        if (firstChargeCurrency && firstChargeCurrency !== 'USD') {
          await captureFxSnapshot(tx, nextInvoice.id, firstChargeCurrency as Currency);
        }

        return {
          ...nextInvoice,
          generationKind: documentKind,
          relatedInvoiceNumber: latestIssuedInvoice?.invoiceNumber || null,
        };
      });

      if (!invoice) {
        continue;
      }

      invoiceAuditLogs.push({
        invoiceId: invoice.id,
        action:
          invoice.generationKind === 'updated'
            ? 'INVOICE_REFRESHED'
            : invoice.generationKind === 'supplemental'
            ? 'SUPPLEMENTAL_INVOICE_CREATED'
            : invoice.generationKind === 'credit_note'
            ? 'CREDIT_NOTE_CREATED'
            : 'INVOICE_CREATED',
        description:
          invoice.generationKind === 'updated'
            ? `Invoice ${invoice.invoiceNumber} refreshed from approved shipment charges`
            : invoice.generationKind === 'supplemental'
            ? `Supplemental invoice ${invoice.invoiceNumber} created for post-issue shipment charges after ${invoice.relatedInvoiceNumber}`
            : invoice.generationKind === 'credit_note'
            ? `Credit note ${invoice.invoiceNumber} created for post-issue shipment adjustments after ${invoice.relatedInvoiceNumber}`
            : `Invoice ${invoice.invoiceNumber} created from approved shipment charges`,
        performedBy: actorId,
        metadata: {
          containerId: scopeContainerId,
          userId,
          shipmentIds: shipments.map((shipment) => shipment.id),
          generationKind: invoice.generationKind,
          relatedInvoiceNumber: invoice.relatedInvoiceNumber,
          scope: isShipmentScopedGeneration ? 'shipment' : 'container',
        },
      });

      generatedInvoices.push({
        userId,
        userName: user.name,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        status: invoice.generationKind,
      });

      try {
        await createNotification({
          userId,
          senderId: actorId,
          title:
            invoice.generationKind === 'credit_note'
              ? 'Credit note created'
              : invoice.generationKind === 'supplemental'
              ? 'Supplemental invoice created'
              : 'Invoice created',
          description:
            invoice.generationKind === 'credit_note'
              ? `Credit note ${invoice.invoiceNumber} is ready for review.`
              : invoice.generationKind === 'supplemental'
              ? `Supplemental invoice ${invoice.invoiceNumber} is ready for review.`
              : `Invoice ${invoice.invoiceNumber} is ready for review.`,
          type: NotificationType.INFO,
          link: `/dashboard/invoices/${invoice.id}`,
        });
      } catch (notificationError) {
        console.error('Failed to create invoice notification:', notificationError);
      }

      // Send email notification if sendEmail is true and user has email
      if (sendEmail && user.email) {
        try {
          const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/invoices/${invoice.id}/pdf`;
          
          await sendInvoiceEmail({
            to: user.email,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.total,
            dueDate: invoiceDueDate.toLocaleDateString(),
            pdfUrl,
          });
          
          // Update invoice status to SENT after successful email
          await prisma.userInvoice.update({
            where: { id: invoice.id },
            data: { status: 'SENT' },
          });
        } catch (emailError) {
          console.error(`Failed to send email for invoice ${invoice.invoiceNumber}:`, emailError);
          // Don't fail the whole operation if email fails
        }
      }
    }

    await createInvoiceAuditLogs(invoiceAuditLogs);

    return NextResponse.json({
      success: true,
      message: `Processed ${generatedInvoices.length} invoice(s)`,
      invoices: generatedInvoices,
      summary: {
        totalInvoices: generatedInvoices.length,
        newInvoices: generatedInvoices.filter(i => i.status === 'created').length,
        updatedInvoices: generatedInvoices.filter(i => i.status === 'updated').length,
        supplementalInvoices: generatedInvoices.filter(i => i.status === 'supplemental').length,
        creditNotes: generatedInvoices.filter(i => i.status === 'credit_note').length,
        existingPaidInvoices: 0,
      },
      scope: isShipmentScopedGeneration ? 'shipment' : 'container',
    });

  } catch (error) {
    console.error('Error generating invoices:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate invoices' },
      { status: 500 }
    );
  }
}
