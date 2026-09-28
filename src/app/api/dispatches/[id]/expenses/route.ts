import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { hasAnyPermission } from '@/lib/rbac';
import { allocateDispatchExpense, isDispatchClosed } from '@/lib/dispatch-workflow';
import { createAuditLog } from '@/lib/audit';
import {
  DEFAULT_DISPATCH_EXPENSE_CATEGORY,
  isDispatchExpenseCategory,
  isDispatchExpenseTypeForCategory,
  isValidDispatchExpenseInvoiceNumber,
  normalizeOptionalDispatchExpenseText,
  type DispatchExpenseCategory,
} from '@/lib/dispatch-expenses';
import { ensureExpensePostingAllowed, isClosedStageOverrideAllowed } from '@/lib/workflow-access';
import { addExpenseLineItemToShipmentInvoice, mapExpenseTypeToLineItemType } from '@/lib/shipment-invoice';

const expenseSchema = z.object({
  expenseId: z.string().optional(),
  category: z.string().min(1).default(DEFAULT_DISPATCH_EXPENSE_CATEGORY),
  type: z.string().min(1),
  description: z.string().trim().min(3).max(200),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  date: z.string().optional(),
  vendor: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  attachmentUrl: z.string().url().optional().nullable(),
  attachmentName: z.string().optional().nullable(),
  attachmentType: z.string().optional().nullable(),
});

async function findDispatchForExpenseWrite(dispatchId: string) {
  return prisma.dispatch.findUnique({
    where: { id: dispatchId },
    select: {
      id: true,
      companyId: true,
      referenceNumber: true,
      status: true,
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
}

async function replaceDispatchExpenseLedgerEffects(
  tx: Prisma.TransactionClient,
  input: {
    dispatchId: string;
    dispatchReferenceNumber: string;
    companyId: string;
    expenseId: string;
    type: string;
    description: string;
    amount: number;
    date: Date;
    notes: string | null;
    createdBy: string;
    shipments: Array<{
      id: string;
      userId: string;
      insuranceValue: number | null;
      weight: number | null;
      vehicleYear: number | null;
      vehicleMake: string | null;
      vehicleModel: string | null;
      vehicleVIN: string | null;
    }>;
  },
) {
  const linkedUserEntries = await tx.ledgerEntry.findMany({
    where: {
      metadata: {
        path: ['dispatchExpenseId'],
        equals: input.expenseId,
      },
    },
    select: { id: true, userId: true },
  });

  const linkedCompanyEntries = await tx.companyLedgerEntry.findMany({
    where: {
      metadata: {
        path: ['dispatchExpenseId'],
        equals: input.expenseId,
      },
    },
    select: { id: true, companyId: true },
  });

  if (linkedUserEntries.length > 0) {
    await tx.ledgerEntry.deleteMany({ where: { id: { in: linkedUserEntries.map((entry) => entry.id) } } });
  }

  if (linkedCompanyEntries.length > 0) {
    await tx.companyLedgerEntry.deleteMany({ where: { id: { in: linkedCompanyEntries.map((entry) => entry.id) } } });
  }

  const reference = `dispatch-expense:${input.expenseId}`;

  await tx.companyLedgerEntry.create({
    data: {
      companyId: input.companyId,
      description: `Dispatch expense recovery - ${input.type} (${input.dispatchReferenceNumber})`,
      type: 'CREDIT',
      amount: input.amount,
      balance: 0,
      transactionDate: input.date,
      category: 'Dispatch Expense Recovery',
      reference,
      notes: input.notes,
      createdBy: input.createdBy,
      metadata: {
        isDispatchExpense: true,
        dispatchExpenseId: input.expenseId,
        dispatchId: input.dispatchId,
        dispatchRef: input.dispatchReferenceNumber,
      },
    },
  });

  const allocations = allocateDispatchExpense(
    input.shipments.map((shipment) => ({
      id: shipment.id,
      insuranceValue: shipment.insuranceValue,
      weight: shipment.weight,
    })),
    input.amount,
  );

  for (const allocation of allocations) {
    if (allocation.amount <= 0) continue;

    const shipment = input.shipments.find((item) => item.id === allocation.shipmentId);
    if (!shipment) continue;

    const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
      .filter(Boolean)
      .join(' ');
    const vinSuffix = shipment.vehicleVIN ? ` (VIN: ${shipment.vehicleVIN})` : '';

    await tx.ledgerEntry.create({
      data: {
        userId: shipment.userId,
        shipmentId: shipment.id,
        description: `Dispatch expense allocation - ${input.type} for ${vehicleLabel || 'shipment'}${vinSuffix}`,
        type: 'DEBIT',
        amount: allocation.amount,
        balance: 0,
        createdBy: input.createdBy,
        notes: input.notes,
        metadata: {
          isExpense: true,
          isDispatchExpense: true,
          paymentMode: 'DUE',
          pendingInvoice: true,
          dispatchExpenseId: input.expenseId,
          dispatchId: input.dispatchId,
          dispatchRef: input.dispatchReferenceNumber,
          expenseType: input.type,
          linkedCompanyId: input.companyId,
        },
      },
    });

    // Add line item to this shipment's pending invoice
    await addExpenseLineItemToShipmentInvoice(
      shipment.id,
      {
        description: input.description,
        type: mapExpenseTypeToLineItemType(input.type),
        amount: allocation.amount,
        expenseSource: 'DISPATCH',
      },
      tx
    );
  }

  const affectedUserIds = new Set([
    ...linkedUserEntries.map((entry) => entry.userId),
    ...input.shipments.map((shipment) => shipment.userId),
  ]);
  for (const userId of affectedUserIds) {
    await recalculateUserLedgerBalances(tx, userId);
  }

  const companyIds = new Set([input.companyId, ...linkedCompanyEntries.map((entry) => entry.companyId)]);
  for (const companyId of companyIds) {
    await recalculateCompanyLedgerBalances(tx, companyId);
  }
}

function validateDispatchExpensePayload(data: z.infer<typeof expenseSchema>) {
  const category = data.category as DispatchExpenseCategory;
  if (!isDispatchExpenseCategory(category)) {
    return 'A valid dispatch expense category is required';
  }

  if (!isDispatchExpenseTypeForCategory(category, data.type)) {
    return 'Select an expense type that matches the chosen category';
  }

  if (data.invoiceNumber && !isValidDispatchExpenseInvoiceNumber(data.invoiceNumber.trim())) {
    return 'Invoice number must be 3-40 characters and use only letters, numbers, dash, slash, underscore, or period';
  }

  return null;
}

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user?.role, ['finance:view', 'dispatches:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dispatch = await prisma.dispatch.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    const expenses = await prisma.dispatchExpense.findMany({
      where: { dispatchId: params.id },
      include: {
        shipment: { select: { id: true, vehicleMake: true, vehicleModel: true, vehicleVIN: true } },
      },
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    return NextResponse.json({ expenses, total });
  } catch (error) {
    console.error('Error fetching dispatch expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch dispatch expenses' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
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

    const dispatch = await findDispatchForExpenseWrite(params.id);

    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    if (isDispatchClosed(dispatch.status) && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json(
        { error: 'Cannot add expenses to a completed or cancelled dispatch' },
        { status: 400 },
      );
    }

    if (!dispatch.companyId) {
      return NextResponse.json({ error: 'Assign a company to this dispatch before adding expenses' }, { status: 400 });
    }

    if (dispatch.shipments.length === 0) {
      return NextResponse.json({ error: 'Add at least one shipment to the dispatch before posting expenses' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = expenseSchema.parse(body);
    const payloadError = validateDispatchExpensePayload(validatedData);
    if (payloadError) {
      return NextResponse.json({ error: payloadError }, { status: 400 });
    }

    const normalizedInvoiceNumber = normalizeOptionalDispatchExpenseText(validatedData.invoiceNumber);
    if (normalizedInvoiceNumber) {
      const existingInvoice = await prisma.dispatchExpense.findFirst({
        where: {
          dispatchId: params.id,
          invoiceNumber: normalizedInvoiceNumber,
        },
        select: { id: true },
      });
      if (existingInvoice) {
        return NextResponse.json({ error: 'Invoice number already exists on this dispatch expense history' }, { status: 409 });
      }
    }

    const expenseDate = validatedData.date ? new Date(validatedData.date) : new Date();
    const normalizedNotes = normalizeOptionalDispatchExpenseText(validatedData.notes);

    const expense = await prisma.$transaction(async (tx) => {
      const createdExpense = await tx.dispatchExpense.create({
        data: {
          dispatchId: params.id,
          category: validatedData.category,
          type: validatedData.type,
          description: validatedData.description,
          amount: validatedData.amount,
          currency: validatedData.currency,
          date: expenseDate,
          vendor: normalizeOptionalDispatchExpenseText(validatedData.vendor),
          invoiceNumber: normalizedInvoiceNumber,
          notes: normalizedNotes,
          attachmentUrl: validatedData.attachmentUrl ?? null,
          attachmentName: normalizeOptionalDispatchExpenseText(validatedData.attachmentName),
          attachmentType: normalizeOptionalDispatchExpenseText(validatedData.attachmentType),
          createdBy: session.user.id as string,
        },
      });

      await replaceDispatchExpenseLedgerEffects(tx, {
        dispatchId: params.id,
        dispatchReferenceNumber: dispatch.referenceNumber,
        companyId: dispatch.companyId,
        expenseId: createdExpense.id,
        type: validatedData.type,
        description: validatedData.description,
        amount: validatedData.amount,
        date: expenseDate,
        notes: normalizedNotes,
        createdBy: session.user.id as string,
        shipments: dispatch.shipments,
      });

      return createdExpense;
    });

    await createAuditLog(
      'dispatch-expense',
      expense.id,
      'CREATE',
      session.user.id as string,
      {
        dispatchId: params.id,
        category: validatedData.category,
        type: validatedData.type,
        amount: validatedData.amount,
        description: validatedData.description,
        invoiceNumber: normalizedInvoiceNumber,
        hasAttachment: Boolean(validatedData.attachmentUrl),
      },
      request,
    );

    return NextResponse.json({ expense, message: 'Expense added successfully' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error creating dispatch expense:', error);
    return NextResponse.json({ error: 'Failed to create dispatch expense' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
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

    const dispatch = await findDispatchForExpenseWrite(params.id);
    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    if (isDispatchClosed(dispatch.status) && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Closed dispatch expenses cannot be edited' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = expenseSchema.parse(body);
    if (!validatedData.expenseId) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const payloadError = validateDispatchExpensePayload(validatedData);
    if (payloadError) {
      return NextResponse.json({ error: payloadError }, { status: 400 });
    }

    const existingExpense = await prisma.dispatchExpense.findUnique({
      where: { id: validatedData.expenseId },
      select: {
        id: true,
        dispatchId: true,
        category: true,
        type: true,
        description: true,
        amount: true,
        currency: true,
        date: true,
        vendor: true,
        invoiceNumber: true,
        notes: true,
        attachmentUrl: true,
        attachmentName: true,
        attachmentType: true,
      },
    });

    if (!existingExpense || existingExpense.dispatchId !== params.id) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const normalizedInvoiceNumber = normalizeOptionalDispatchExpenseText(validatedData.invoiceNumber);
    if (normalizedInvoiceNumber) {
      const duplicateInvoice = await prisma.dispatchExpense.findFirst({
        where: {
          dispatchId: params.id,
          invoiceNumber: normalizedInvoiceNumber,
          id: { not: validatedData.expenseId },
        },
        select: { id: true },
      });
      if (duplicateInvoice) {
        return NextResponse.json({ error: 'Invoice number already exists on this dispatch expense history' }, { status: 409 });
      }
    }

    const normalizedNotes = normalizeOptionalDispatchExpenseText(validatedData.notes);
    const normalizedVendor = normalizeOptionalDispatchExpenseText(validatedData.vendor);
    const normalizedAttachmentName = normalizeOptionalDispatchExpenseText(validatedData.attachmentName);
    const normalizedAttachmentType = normalizeOptionalDispatchExpenseText(validatedData.attachmentType);
    const expenseDate = validatedData.date ? new Date(validatedData.date) : existingExpense.date;

    const updatedExpense = await prisma.$transaction(async (tx) => {
      const expense = await tx.dispatchExpense.update({
        where: { id: validatedData.expenseId },
        data: {
          category: validatedData.category,
          type: validatedData.type,
          description: validatedData.description,
          amount: validatedData.amount,
          currency: validatedData.currency,
          date: expenseDate,
          vendor: normalizedVendor,
          invoiceNumber: normalizedInvoiceNumber,
          notes: normalizedNotes,
          attachmentUrl: validatedData.attachmentUrl ?? null,
          attachmentName: normalizedAttachmentName,
          attachmentType: normalizedAttachmentType,
        },
      });

      await replaceDispatchExpenseLedgerEffects(tx, {
        dispatchId: params.id,
        dispatchReferenceNumber: dispatch.referenceNumber,
        companyId: dispatch.companyId as string,
        expenseId: expense.id,
        type: validatedData.type,
        description: validatedData.description,
        amount: validatedData.amount,
        date: expenseDate,
        notes: normalizedNotes,
        createdBy: session.user.id as string,
        shipments: dispatch.shipments,
      });

      return expense;
    });

    await createAuditLog(
      'dispatch-expense',
      updatedExpense.id,
      'UPDATE',
      session.user.id as string,
      {
        before: existingExpense,
        after: {
          category: validatedData.category,
          type: validatedData.type,
          description: validatedData.description,
          amount: validatedData.amount,
          currency: validatedData.currency,
          date: expenseDate.toISOString(),
          vendor: normalizedVendor,
          invoiceNumber: normalizedInvoiceNumber,
          notes: normalizedNotes,
          attachmentUrl: validatedData.attachmentUrl ?? null,
          attachmentName: normalizedAttachmentName,
          attachmentType: normalizedAttachmentType,
        },
      },
      request,
    );

    return NextResponse.json({ expense: updatedExpense, message: 'Expense updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error updating dispatch expense:', error);
    return NextResponse.json({ error: 'Failed to update dispatch expense' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user || !ensureExpensePostingAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('expenseId');
    if (!expenseId) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    const dispatch = await findDispatchForExpenseWrite(params.id);
    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    if (isDispatchClosed(dispatch.status) && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Closed dispatch expenses cannot be deleted' }, { status: 400 });
    }

    const expense = await prisma.dispatchExpense.findUnique({
      where: { id: expenseId },
      select: {
        id: true,
        dispatchId: true,
        category: true,
        type: true,
        description: true,
        amount: true,
        invoiceNumber: true,
      },
    });

    if (!expense || expense.dispatchId !== params.id) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const linkedUserEntries = await tx.ledgerEntry.findMany({
        where: {
          metadata: {
            path: ['dispatchExpenseId'],
            equals: expenseId,
          },
        },
        select: { id: true, userId: true },
      });

      const linkedCompanyEntries = await tx.companyLedgerEntry.findMany({
        where: {
          metadata: {
            path: ['dispatchExpenseId'],
            equals: expenseId,
          },
        },
        select: { id: true, companyId: true },
      });

      if (linkedUserEntries.length > 0) {
        await tx.ledgerEntry.deleteMany({ where: { id: { in: linkedUserEntries.map((entry) => entry.id) } } });
      }

      if (linkedCompanyEntries.length > 0) {
        await tx.companyLedgerEntry.deleteMany({ where: { id: { in: linkedCompanyEntries.map((entry) => entry.id) } } });
      }

      await tx.dispatchExpense.delete({ where: { id: expenseId } });

      const affectedUserIds = new Set(linkedUserEntries.map((entry) => entry.userId));
      for (const userId of affectedUserIds) {
        await recalculateUserLedgerBalances(tx, userId);
      }

      const companyIds = new Set([dispatch.companyId as string, ...linkedCompanyEntries.map((entry) => entry.companyId)]);
      for (const companyId of companyIds) {
        await recalculateCompanyLedgerBalances(tx, companyId);
      }
    });

    await createAuditLog(
      'dispatch-expense',
      expenseId,
      'DELETE',
      session.user.id as string,
      {
        dispatchId: params.id,
        deletedExpense: expense,
      },
      request,
    );

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting dispatch expense:', error);
    return NextResponse.json({ error: 'Failed to delete dispatch expense' }, { status: 500 });
  }
}