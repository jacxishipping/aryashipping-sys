import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { hasPermission, hasAnyPermission } from '@/lib/rbac';
import { z } from 'zod';
import { ensureExpensePostingAllowed, isClosedStageOverrideAllowed } from '@/lib/workflow-access';
import { addExpenseLineItemToShipmentInvoice, mapExpenseTypeToLineItemType } from '@/lib/shipment-invoice';

function allocateContainerExpense(
  shipments: Array<{ id: string; insuranceValue: number | null; weight: number | null }>,
  totalAmount: number,
  method: 'EQUAL' | 'BY_VALUE' | 'BY_WEIGHT' | 'CUSTOM'
) {
  if (shipments.length === 0) {
    return [] as Array<{ shipmentId: string; amount: number }>;
  }

  const safeEqualSplit = () => {
    const base = Math.floor((totalAmount / shipments.length) * 100) / 100;
    const allocations = shipments.map((shipment) => ({ shipmentId: shipment.id, amount: base }));
    const assigned = allocations.reduce((sum, item) => sum + item.amount, 0);
    const remainder = Number((totalAmount - assigned).toFixed(2));
    allocations[0].amount = Number((allocations[0].amount + remainder).toFixed(2));
    return allocations;
  };

  if (method === 'EQUAL' || method === 'CUSTOM') {
    return safeEqualSplit();
  }

  const metricTotal = shipments.reduce((sum, shipment) => {
    if (method === 'BY_VALUE') {
      return sum + (shipment.insuranceValue || 0);
    }
    return sum + (shipment.weight || 0);
  }, 0);

  if (metricTotal <= 0) {
    return safeEqualSplit();
  }

  const allocations = shipments.map((shipment) => {
    const metric = method === 'BY_VALUE' ? shipment.insuranceValue || 0 : shipment.weight || 0;
    const raw = (totalAmount * metric) / metricTotal;
    return {
      shipmentId: shipment.id,
      amount: Math.floor(raw * 100) / 100,
    };
  });

  const assigned = allocations.reduce((sum, item) => sum + item.amount, 0);
  const remainder = Number((totalAmount - assigned).toFixed(2));
  allocations[0].amount = Number((allocations[0].amount + remainder).toFixed(2));

  return allocations;
}

const expenseSchema = z.object({
  expenseId: z.string().optional(),
  type: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  date: z.string().optional(),
  vendor: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET - Fetch expenses for a container
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

    const expenses = await prisma.containerExpense.findMany({
      where: { containerId: params.id },
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return NextResponse.json({
      expenses,
      total,
      count: expenses.length,
    });
  } catch (error) {
    console.error('Error fetching container expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// POST - Add expense to container
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

    // Only admins can add expenses
    if (!ensureExpensePostingAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify container exists
    const container = await prisma.container.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        companyId: true,
        expenseAllocationMethod: true,
        shipments: {
          select: {
            id: true,
            userId: true,
            insuranceValue: true,
            weight: true,
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

    if (container.status === 'CLOSED' && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Cannot add expenses to a closed container' }, { status: 400 });
    }

    if (!container.companyId) {
      return NextResponse.json(
        { error: 'Assign a company to this container before adding expenses' },
        { status: 400 }
      );
    }

    if (container.shipments.length === 0) {
      return NextResponse.json(
        { error: 'Add at least one shipment to the container before posting expenses' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = expenseSchema.parse(body);

    const allocations = allocateContainerExpense(
      container.shipments.map((shipment) => ({
        id: shipment.id,
        insuranceValue: shipment.insuranceValue,
        weight: shipment.weight,
      })),
      validatedData.amount,
      container.expenseAllocationMethod
    );

    const expense = await prisma.$transaction(async (tx) => {
      const createdExpense = await tx.containerExpense.create({
        data: {
          containerId: params.id,
          type: validatedData.type,
          amount: validatedData.amount,
          currency: validatedData.currency,
          date: validatedData.date ? new Date(validatedData.date) : new Date(),
          vendor: validatedData.vendor,
          invoiceNumber: validatedData.invoiceNumber,
          notes: validatedData.notes,
        },
      });

      const reference = `container-expense:${createdExpense.id}`;

      await tx.companyLedgerEntry.create({
        data: {
          companyId: container.companyId as string,
          description: `Container expense recovery - ${validatedData.type}`,
          type: 'CREDIT',
          amount: validatedData.amount,
          balance: 0,
          category: 'Container Expense Recovery',
          reference,
          notes: validatedData.notes,
          createdBy: session.user!.id as string,
          metadata: {
            isContainerExpense: true,
            containerExpenseId: createdExpense.id,
            containerId: params.id,
            allocationMethod: container.expenseAllocationMethod,
          },
        },
      });

      for (const allocation of allocations) {
        if (allocation.amount <= 0) {
          continue;
        }

        const shipment = container.shipments.find((item) => item.id === allocation.shipmentId);
        if (!shipment) {
          continue;
        }

        const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
          .filter(Boolean)
          .join(' ');
        const vinSuffix = shipment.vehicleVIN ? ` (VIN: ${shipment.vehicleVIN})` : '';

        await tx.ledgerEntry.create({
          data: {
            userId: shipment.userId,
            shipmentId: shipment.id,
            description: `Container expense allocation - ${validatedData.type} for ${vehicleLabel || 'shipment'}${vinSuffix}`,
            type: 'DEBIT',
            amount: allocation.amount,
            balance: 0,
            createdBy: session.user!.id as string,
            notes: validatedData.notes,
            metadata: {
              isExpense: true,
              isContainerExpense: true,
              paymentMode: 'DUE',
              pendingInvoice: true,
              containerExpenseId: createdExpense.id,
              containerId: params.id,
              expenseType: validatedData.type,
              linkedCompanyId: container.companyId,
            },
          },
        });

        // Add line item to this shipment's pending invoice
        await addExpenseLineItemToShipmentInvoice(
          shipment.id,
          {
            description: validatedData.type,
            type: mapExpenseTypeToLineItemType(validatedData.type),
            amount: allocation.amount,
            expenseSource: 'SHIPMENT',
          },
          tx
        );
      }

      const affectedUserIds = Array.from(new Set(container.shipments.map((shipment) => shipment.userId)));
      for (const userId of affectedUserIds) {
        await recalculateUserLedgerBalances(tx, userId);
      }
      await recalculateCompanyLedgerBalances(tx, container.companyId as string);

      return createdExpense;
    });

    // Create audit log
    await prisma.containerAuditLog.create({
      data: {
        containerId: params.id,
        action: 'EXPENSE_ADDED',
        description: `Expense added: ${validatedData.type} - $${validatedData.amount}`,
        performedBy: session.user.id as string,
        newValue: JSON.stringify({ type: validatedData.type, amount: validatedData.amount }),
      },
    });

    return NextResponse.json({
      expense,
      message: 'Expense added successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error adding expense:', error);
    return NextResponse.json(
      { error: 'Failed to add expense' },
      { status: 500 }
    );
  }
}

// PATCH - Update a container expense (rebuilds the linked ledger effects)
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ensureExpensePostingAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify container exists and fetch current allocation context
    const container = await prisma.container.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        companyId: true,
        expenseAllocationMethod: true,
        shipments: {
          select: {
            id: true,
            userId: true,
            insuranceValue: true,
            weight: true,
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

    if (container.status === 'CLOSED' && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Cannot edit expenses on a closed container' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = expenseSchema.parse(body);
    if (!validatedData.expenseId) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const existingExpense = await prisma.containerExpense.findUnique({
      where: { id: validatedData.expenseId },
    });

    if (!existingExpense || existingExpense.containerId !== params.id) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (!container.companyId) {
      return NextResponse.json(
        { error: 'Assign a company to this container before editing expenses' },
        { status: 400 }
      );
    }

    const allocations = allocateContainerExpense(
      container.shipments.map((shipment) => ({
        id: shipment.id,
        insuranceValue: shipment.insuranceValue,
        weight: shipment.weight,
      })),
      validatedData.amount,
      container.expenseAllocationMethod
    );

    const expenseDate = validatedData.date ? new Date(validatedData.date) : existingExpense.date;

    const updatedExpense = await prisma.$transaction(async (tx) => {
      const expense = await tx.containerExpense.update({
        where: { id: validatedData.expenseId },
        data: {
          type: validatedData.type,
          amount: validatedData.amount,
          currency: validatedData.currency,
          date: expenseDate,
          vendor: validatedData.vendor ?? null,
          invoiceNumber: validatedData.invoiceNumber ?? null,
          notes: validatedData.notes ?? null,
        },
      });

      // Remove the ledger entries created by the previous version of this expense,
      // then recreate them from the updated values so balances stay aligned.
      const linkedUserEntries = await tx.ledgerEntry.findMany({
        where: {
          metadata: {
            path: ['containerExpenseId'],
            equals: validatedData.expenseId,
          },
        },
        select: { id: true, userId: true },
      });

      const linkedCompanyEntries = await tx.companyLedgerEntry.findMany({
        where: {
          metadata: {
            path: ['containerExpenseId'],
            equals: validatedData.expenseId,
          },
        },
        select: { id: true, companyId: true },
      });

      if (linkedUserEntries.length > 0) {
        await tx.ledgerEntry.deleteMany({
          where: {
            id: { in: linkedUserEntries.map((entry) => entry.id) },
          },
        });
      }

      if (linkedCompanyEntries.length > 0) {
        await tx.companyLedgerEntry.deleteMany({
          where: {
            id: { in: linkedCompanyEntries.map((entry) => entry.id) },
          },
        });
      }

      const reference = `container-expense:${expense.id}`;

      await tx.companyLedgerEntry.create({
        data: {
          companyId: container.companyId as string,
          description: `Container expense recovery - ${validatedData.type}`,
          type: 'CREDIT',
          amount: validatedData.amount,
          balance: 0,
          category: 'Container Expense Recovery',
          reference,
          notes: validatedData.notes ?? null,
          createdBy: session.user!.id as string,
          metadata: {
            isContainerExpense: true,
            containerExpenseId: expense.id,
            containerId: params.id,
            allocationMethod: container.expenseAllocationMethod,
          },
        },
      });

      for (const allocation of allocations) {
        if (allocation.amount <= 0) {
          continue;
        }

        const shipment = container.shipments.find((item) => item.id === allocation.shipmentId);
        if (!shipment) {
          continue;
        }

        const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
          .filter(Boolean)
          .join(' ');
        const vinSuffix = shipment.vehicleVIN ? ` (VIN: ${shipment.vehicleVIN})` : '';

        await tx.ledgerEntry.create({
          data: {
            userId: shipment.userId,
            shipmentId: shipment.id,
            description: `Container expense allocation - ${validatedData.type} for ${vehicleLabel || 'shipment'}${vinSuffix}`,
            type: 'DEBIT',
            amount: allocation.amount,
            balance: 0,
            createdBy: session.user!.id as string,
            notes: validatedData.notes ?? null,
            metadata: {
              isExpense: true,
              isContainerExpense: true,
              paymentMode: 'DUE',
              pendingInvoice: true,
              containerExpenseId: expense.id,
              containerId: params.id,
              expenseType: validatedData.type,
              linkedCompanyId: container.companyId,
            },
          },
        });

        // Add line item to this shipment's pending invoice
        await addExpenseLineItemToShipmentInvoice(
          shipment.id,
          {
            description: validatedData.type,
            type: mapExpenseTypeToLineItemType(validatedData.type),
            amount: allocation.amount,
            expenseSource: 'SHIPMENT',
          },
          tx
        );
      }

      const affectedUserIds = Array.from(new Set([
        ...linkedUserEntries.map((entry) => entry.userId),
        ...container.shipments.map((shipment) => shipment.userId),
      ]));
      for (const userId of affectedUserIds) {
        await recalculateUserLedgerBalances(tx, userId);
      }

      const affectedCompanyIds = new Set([
        container.companyId as string,
        ...linkedCompanyEntries.map((entry) => entry.companyId),
      ]);
      for (const companyId of affectedCompanyIds) {
        await recalculateCompanyLedgerBalances(tx, companyId);
      }

      await tx.containerAuditLog.create({
        data: {
          containerId: params.id,
          action: 'EXPENSE_UPDATED',
          description: `Expense updated: ${validatedData.type} - $${validatedData.amount}`,
          performedBy: session.user.id as string,
          oldValue: JSON.stringify({
            type: existingExpense.type,
            amount: existingExpense.amount,
            currency: existingExpense.currency,
            date: existingExpense.date,
            vendor: existingExpense.vendor,
            invoiceNumber: existingExpense.invoiceNumber,
          }),
          newValue: JSON.stringify({
            type: validatedData.type,
            amount: validatedData.amount,
            currency: validatedData.currency,
            date: expenseDate,
            vendor: validatedData.vendor,
            invoiceNumber: validatedData.invoiceNumber,
          }),
        },
      });

      return expense;
    });

    return NextResponse.json({
      expense: updatedExpense,
      message: 'Expense updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// DELETE - Remove expense
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user || !ensureExpensePostingAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('expenseId');
    const shipmentExpenseEntryId = searchParams.get('shipmentExpenseEntryId');

    if (!expenseId && !shipmentExpenseEntryId) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    const baseContainer = await prisma.container.findUnique({ where: { id: params.id }, select: { status: true } });
    if (baseContainer?.status === 'CLOSED' && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Cannot delete expenses from a closed container' }, { status: 400 });
    }

    if (shipmentExpenseEntryId) {
      await prisma.$transaction(async (tx) => {
        const baseEntry = await tx.ledgerEntry.findFirst({
          where: {
            id: shipmentExpenseEntryId,
            type: 'DEBIT',
            metadata: {
              path: ['isExpense'],
              equals: true,
            },
            shipment: {
              containerId: params.id,
            },
          },
          include: {
            shipment: {
              select: {
                id: true,
                userId: true,
                containerId: true,
                container: {
                  select: {
                    companyId: true,
                  },
                },
              },
            },
          },
        });

        if (!baseEntry || !baseEntry.shipment || baseEntry.shipment.containerId !== params.id) {
          throw new Error('Shipment expense not found');
        }

        const baseMetadata = (baseEntry.metadata ?? {}) as Record<string, unknown>;
        const expenseType = typeof baseMetadata.expenseType === 'string' ? baseMetadata.expenseType : undefined;

        const linkedCompanyEntries = await tx.companyLedgerEntry.findMany({
          where: {
            OR: [
              {
                reference: `shipment-expense:${baseEntry.id}`,
              },
              {
                metadata: {
                  path: ['linkedUserExpenseEntryId'],
                  equals: baseEntry.id,
                },
              },
            ],
          },
          select: { id: true, companyId: true },
        });

        const linkedCashCredits = await tx.ledgerEntry.findMany({
          where: {
            userId: baseEntry.userId,
            shipmentId: baseEntry.shipmentId,
            type: 'CREDIT',
            metadata: {
              path: ['parentExpenseEntryId'],
              equals: baseEntry.id,
            },
          },
          select: { id: true },
        });

        const fallbackCashCredits = linkedCashCredits.length > 0
          ? linkedCashCredits
          : await tx.ledgerEntry.findMany({
              where: {
                userId: baseEntry.userId,
                shipmentId: baseEntry.shipmentId,
                type: 'CREDIT',
                amount: baseEntry.amount,
                notes: baseEntry.notes,
                createdAt: {
                  gte: new Date(baseEntry.createdAt.getTime() - 2 * 60 * 1000),
                  lte: new Date(baseEntry.createdAt.getTime() + 2 * 60 * 1000),
                },
                metadata: {
                  path: ['isCashPayment'],
                  equals: true,
                },
              },
              select: { id: true },
            });

        const userEntryIdsToDelete = [
          baseEntry.id,
          ...fallbackCashCredits.map((entry) => entry.id),
        ];

        await tx.ledgerEntry.deleteMany({
          where: {
            id: { in: userEntryIdsToDelete },
          },
        });

        if (linkedCompanyEntries.length > 0) {
          await tx.companyLedgerEntry.deleteMany({
            where: {
              id: { in: linkedCompanyEntries.map((entry) => entry.id) },
            },
          });
        }

        await recalculateUserLedgerBalances(tx, baseEntry.userId);

        const companyIds = new Set(linkedCompanyEntries.map((entry) => entry.companyId));
        if (baseEntry.shipment.container?.companyId) {
          companyIds.add(baseEntry.shipment.container.companyId);
        }
        for (const companyId of companyIds) {
          await recalculateCompanyLedgerBalances(tx, companyId);
        }

        await tx.containerAuditLog.create({
          data: {
            containerId: params.id,
            action: 'EXPENSE_DELETED',
            description: `Shipment expense deleted${expenseType ? `: ${expenseType}` : ''}`,
            performedBy: session.user!.id as string,
            oldValue: JSON.stringify({
              shipmentExpenseEntryId: baseEntry.id,
              amount: baseEntry.amount,
              expenseType,
            }),
          },
        });
      });

      return NextResponse.json({ message: 'Shipment expense and linked transactions deleted successfully' });
    }

    const expense = await prisma.containerExpense.findUnique({
      where: { id: expenseId as string },
      include: {
        container: {
          select: {
            id: true,
            companyId: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const linkedUserEntries = await tx.ledgerEntry.findMany({
        where: {
          metadata: {
            path: ['containerExpenseId'],
            equals: expenseId as string,
          },
        },
        select: { id: true, userId: true },
      });

      const linkedCompanyEntries = await tx.companyLedgerEntry.findMany({
        where: {
          metadata: {
            path: ['containerExpenseId'],
            equals: expenseId as string,
          },
        },
        select: { id: true, companyId: true },
      });

      if (linkedUserEntries.length > 0) {
        await tx.ledgerEntry.deleteMany({
          where: {
            id: { in: linkedUserEntries.map((entry) => entry.id) },
          },
        });
      }

      if (linkedCompanyEntries.length > 0) {
        await tx.companyLedgerEntry.deleteMany({
          where: {
            id: { in: linkedCompanyEntries.map((entry) => entry.id) },
          },
        });
      }

      await tx.containerExpense.delete({ where: { id: expenseId as string } });

      const userIds = Array.from(new Set(linkedUserEntries.map((entry) => entry.userId)));
      for (const userId of userIds) {
        await recalculateUserLedgerBalances(tx, userId);
      }

      const companyIds = new Set(linkedCompanyEntries.map((entry) => entry.companyId));
      if (expense.container.companyId) {
        companyIds.add(expense.container.companyId);
      }

      for (const companyId of companyIds) {
        await recalculateCompanyLedgerBalances(tx, companyId);
      }
    });

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
