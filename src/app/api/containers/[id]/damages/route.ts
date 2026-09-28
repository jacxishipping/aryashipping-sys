import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { hasAnyPermission } from '@/lib/rbac';
import { z } from 'zod';
import { LineItemType } from '@prisma/client';

const damageSchema = z.object({
  shipmentId: z.string().min(1),
  damageType: z.enum(['WE_PAY', 'COMPANY_PAYS']),
  amount: z.number().positive(),
  companyAmount: z.number().positive().optional(),
  description: z.string().min(1),
});

// GET - List damage records for a container
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user?.role, ['finance:view', 'containers:read_all'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const damages = await prisma.containerDamage.findMany({
      where: { containerId: params.id },
      include: {
        shipment: {
          select: {
            id: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleVIN: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ damages, count: damages.length });
  } catch (error) {
    console.error('Error fetching container damages:', error);
    return NextResponse.json({ error: 'Failed to fetch damages' }, { status: 500 });
  }
}

// POST - Add a damage record
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user?.role, ['finance:manage', 'containers:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch container with company and shipments
    const container = await prisma.container.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        companyId: true,
        shipments: {
          select: {
            id: true,
            userId: true,
            vehicleYear: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleVIN: true,
          },
        },
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    if (!container.companyId) {
      return NextResponse.json(
        { error: 'This container must be assigned to a shipping company before adding expenses or damages.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = damageSchema.parse(body);
    const companyChargeAmount =
      validatedData.damageType === 'COMPANY_PAYS'
        ? validatedData.companyAmount ?? validatedData.amount
        : validatedData.amount;

    // Ensure the shipment belongs to this container
    const shipment = container.shipments.find((s) => s.id === validatedData.shipmentId);
    if (!shipment) {
      return NextResponse.json(
        { error: 'Shipment does not belong to this container' },
        { status: 400 }
      );
    }

    const damage = await prisma.$transaction(async (tx) => {
      // Create the damage record
      const createdDamage = await tx.containerDamage.create({
        data: {
          containerId: params.id,
          shipmentId: validatedData.shipmentId,
          damageType: validatedData.damageType,
          amount: validatedData.amount,
          description: validatedData.description,
        },
      });

      const reference = `container-damage:${createdDamage.id}`;
      const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
        .filter(Boolean)
        .join(' ') || 'Vehicle';
      const vinSuffix = shipment.vehicleVIN ? ` (VIN: ${shipment.vehicleVIN})` : '';

      if (validatedData.damageType === 'WE_PAY') {
        // WE_PAY: credit user ledger (compensation to customer)
        await tx.ledgerEntry.create({
          data: {
            userId: shipment.userId,
            shipmentId: validatedData.shipmentId,
            description: `Damage compensation - ${validatedData.description} for ${vehicleLabel}${vinSuffix}`,
            type: 'CREDIT',
            amount: validatedData.amount,
            balance: 0,
            createdBy: session.user!.id as string,
            notes: validatedData.description,
            metadata: {
              isDamage: true,
              damageType: 'WE_PAY',
              containerDamageId: createdDamage.id,
              containerId: params.id,
            },
          },
        });

        await recalculateUserLedgerBalances(tx, shipment.userId);

        // Add a DISCOUNT line item to the shipment's active invoice so the
        // customer sees the damage compensation reflected in their full invoice.
        const shipmentInvoice = await tx.userInvoice.findFirst({
          where: { shipmentId: validatedData.shipmentId, status: { notIn: ['CANCELLED', 'PAID'] } },
          select: { id: true, subtotal: true, discount: true, tax: true },
        });

        if (shipmentInvoice) {
          await tx.invoiceLineItem.create({
            data: {
              invoiceId: shipmentInvoice.id,
              shipmentId: validatedData.shipmentId,
              description: `${vehicleLabel} - Damage Compensation (${validatedData.description})`.trim(),
              type: LineItemType.DISCOUNT,
              quantity: 1,
              unitPrice: -validatedData.amount,
              amount: -validatedData.amount,
            },
          });

          const newSubtotal = shipmentInvoice.subtotal - validatedData.amount;
          await tx.userInvoice.update({
            where: { id: shipmentInvoice.id },
            data: {
              subtotal: newSubtotal,
              total: newSubtotal - (shipmentInvoice.discount ?? 0) + (shipmentInvoice.tax ?? 0),
            },
          });
        }
      } else {
        // COMPANY_PAYS: credit company ledger only (company service credit, no customer ledger credit)
        await tx.companyLedgerEntry.create({
          data: {
            companyId: container.companyId as string,
            description: `Shipment damage charge - ${validatedData.description} for ${vehicleLabel}${vinSuffix}`,
            type: 'CREDIT',
            amount: companyChargeAmount,
            balance: 0,
            category: 'Shipment Damage',
            reference,
            notes: validatedData.description,
            createdBy: session.user!.id as string,
            metadata: {
              isDamage: true,
              damageType: 'COMPANY_PAYS',
              containerDamageId: createdDamage.id,
              containerId: params.id,
              shipmentId: validatedData.shipmentId,
              userId: shipment.userId,
              companyChargeAmount,
            },
          },
        });

        await recalculateCompanyLedgerBalances(tx, container.companyId as string);

        // Add an informational $0 line item to the shipment's active invoice so
        // the customer is aware of the damage (company absorbed the cost).
        const shipmentInvoice = await tx.userInvoice.findFirst({
          where: { shipmentId: validatedData.shipmentId, status: { notIn: ['CANCELLED', 'PAID'] } },
          select: { id: true },
        });

        if (shipmentInvoice) {
          await tx.invoiceLineItem.create({
            data: {
              invoiceId: shipmentInvoice.id,
              shipmentId: validatedData.shipmentId,
              description: `${vehicleLabel} - Damage Note (Company Pays $${validatedData.amount.toFixed(2)}): ${validatedData.description}`.trim(),
              type: LineItemType.OTHER_FEE,
              quantity: 1,
              unitPrice: validatedData.amount,
              amount: 0,
            },
          });
          // subtotal unchanged — company absorbs the cost
        }
      }

      return createdDamage;
    });

    // Create audit log
    await prisma.containerAuditLog.create({
      data: {
        containerId: params.id,
        action: 'DAMAGE_ADDED',
        description:
          validatedData.damageType === 'COMPANY_PAYS' && validatedData.companyAmount
            ? `Damage added: ${validatedData.damageType} - company charge $${companyChargeAmount} - ${validatedData.description}`
            : `Damage added: ${validatedData.damageType} - $${validatedData.amount} - ${validatedData.description}`,
        performedBy: session.user.id as string,
        newValue: JSON.stringify({
          damageType: validatedData.damageType,
          amount: validatedData.amount,
          companyAmount: validatedData.damageType === 'COMPANY_PAYS' ? companyChargeAmount : undefined,
          shipmentId: validatedData.shipmentId,
        }),
      },
    });

    return NextResponse.json({ damage, message: 'Damage record created successfully' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error creating damage record:', error);
    return NextResponse.json({ error: 'Failed to create damage record' }, { status: 500 });
  }
}

// DELETE - Remove a damage record
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();

    if (!session?.user || !hasAnyPermission(session.user?.role, ['finance:manage', 'containers:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const damageId = searchParams.get('damageId');

    if (!damageId) {
      return NextResponse.json({ error: 'Damage ID required' }, { status: 400 });
    }

    const damage = await prisma.containerDamage.findUnique({
      where: { id: damageId },
      include: {
        container: { select: { id: true, companyId: true } },
        shipment: { select: { id: true, userId: true } },
      },
    });

    if (!damage) {
      return NextResponse.json({ error: 'Damage record not found' }, { status: 404 });
    }

    if (damage.containerId !== params.id) {
      return NextResponse.json({ error: 'Damage does not belong to this container' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // Remove linked ledger entries
      if (damage.damageType === 'WE_PAY') {
        const linkedEntries = await tx.ledgerEntry.findMany({
          where: {
            metadata: { path: ['containerDamageId'], equals: damageId },
          },
          select: { id: true, userId: true },
        });

        if (linkedEntries.length > 0) {
          await tx.ledgerEntry.deleteMany({
            where: { id: { in: linkedEntries.map((e) => e.id) } },
          });
          const userIds = Array.from(new Set(linkedEntries.map((e) => e.userId)));
          for (const userId of userIds) {
            await recalculateUserLedgerBalances(tx, userId);
          }
        }

        // Remove the corresponding DISCOUNT line item from the shipment's invoice.
        // Filter on description (contains damage.description) to avoid accidentally
        // removing a different damage entry that shares the same amount.
        const shipmentInvoice = await tx.userInvoice.findFirst({
          where: { shipmentId: damage.shipment.id, status: { notIn: ['CANCELLED', 'PAID'] } },
          select: { id: true, subtotal: true, discount: true, tax: true },
        });

        if (shipmentInvoice) {
          const matchingLineItems = await tx.invoiceLineItem.findMany({
            where: {
              invoiceId: shipmentInvoice.id,
              shipmentId: damage.shipment.id,
              type: LineItemType.DISCOUNT,
              amount: -damage.amount,
              description: { contains: damage.description },
            },
            select: { id: true },
            take: 1,
          });

          if (matchingLineItems.length > 0) {
            await tx.invoiceLineItem.delete({ where: { id: matchingLineItems[0].id } });
            const newSubtotal = shipmentInvoice.subtotal + damage.amount;
            await tx.userInvoice.update({
              where: { id: shipmentInvoice.id },
              data: {
                subtotal: newSubtotal,
                total: newSubtotal - (shipmentInvoice.discount ?? 0) + (shipmentInvoice.tax ?? 0),
              },
            });
          }
        }
      } else {
        const linkedEntries = await tx.companyLedgerEntry.findMany({
          where: {
            metadata: { path: ['containerDamageId'], equals: damageId },
          },
          select: { id: true, companyId: true },
        });

        if (linkedEntries.length > 0) {
          await tx.companyLedgerEntry.deleteMany({
            where: { id: { in: linkedEntries.map((e) => e.id) } },
          });
          const companyIds = new Set(linkedEntries.map((e) => e.companyId));
          for (const companyId of companyIds) {
            await recalculateCompanyLedgerBalances(tx, companyId);
          }
        }

        const linkedUserCredits = await tx.ledgerEntry.findMany({
          where: {
            metadata: { path: ['containerDamageId'], equals: damageId },
          },
          select: { id: true, userId: true },
        });

        if (linkedUserCredits.length > 0) {
          await tx.ledgerEntry.deleteMany({
            where: { id: { in: linkedUserCredits.map((e) => e.id) } },
          });

          const userIds = Array.from(new Set(linkedUserCredits.map((e) => e.userId)));
          for (const userId of userIds) {
            await recalculateUserLedgerBalances(tx, userId);
          }
        }

        // Remove the informational $0 line item from the shipment's invoice.
        // Filter on description (contains damage.description) to avoid accidentally
        // removing a different damage entry that shares the same amount.
        const shipmentInvoice = await tx.userInvoice.findFirst({
          where: { shipmentId: damage.shipment.id, status: { notIn: ['CANCELLED', 'PAID'] } },
          select: { id: true },
        });

        if (shipmentInvoice) {
          const matchingLineItems = await tx.invoiceLineItem.findMany({
            where: {
              invoiceId: shipmentInvoice.id,
              shipmentId: damage.shipment.id,
              type: LineItemType.OTHER_FEE,
              amount: 0,
              unitPrice: damage.amount,
              description: { contains: damage.description },
            },
            select: { id: true },
            take: 1,
          });

          if (matchingLineItems.length > 0) {
            await tx.invoiceLineItem.delete({ where: { id: matchingLineItems[0].id } });
          }
        }
      }

      await tx.containerDamage.delete({ where: { id: damageId } });
    });

    return NextResponse.json({ message: 'Damage record deleted successfully' });
  } catch (error) {
    console.error('Error deleting damage record:', error);
    return NextResponse.json({ error: 'Failed to delete damage record' }, { status: 500 });
  }
}
