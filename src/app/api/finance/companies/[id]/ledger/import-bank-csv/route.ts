import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { parseBankOfAmericaCsv } from '@/lib/financial/bankOfAmericaCsv';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { hasPermission } from '@/lib/rbac';

const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024;

type DuplicateReason = 'ALREADY_IMPORTED' | 'DUPLICATE_IN_FILE';

interface PreparedImportRow {
  transactionDate: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  reference?: string;
  notes?: string;
  rawRow: Record<string, string>;
  importFingerprint: string;
  isDuplicate: boolean;
  duplicateReason: DuplicateReason | null;
  ledgerDate: Date;
}

function getFormText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function parseOptionalCurrencyAmount(value: string) {
  const normalized = value.replace(/[\$,]/g, '').trim();

  if (!normalized) {
    return null;
  }

  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid ending balance \"${value}\"`);
  }

  return amount;
}

function getImportFingerprint(input: {
  transactionDate: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  reference?: string;
}) {
  return createHash('sha256')
    .update([
      input.transactionDate,
      input.type,
      input.amount.toFixed(2),
      input.description.trim().toLowerCase(),
      input.reference?.trim().toLowerCase() || '',
    ].join('|'))
    .digest('hex');
}

function getLedgerDate(transactionDate: string, offsetSeconds: number) {
  const date = new Date(`${transactionDate}T12:00:00.000Z`);
  date.setUTCSeconds(date.getUTCSeconds() + offsetSeconds);
  return date;
}

function getStartOfDay(transactionDate: string) {
  return new Date(`${transactionDate}T00:00:00.000Z`);
}

function getEndOfDay(transactionDate: string) {
  return new Date(`${transactionDate}T23:59:59.999Z`);
}

function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100;
}

function isBankImportMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }

  return (metadata as Record<string, unknown>).importSource === 'BANK_OF_AMERICA_CSV';
}

async function buildImportPreview(input: {
  companyId: string;
  csvText: string;
  statementEndingBalance: number | null;
}) {
  const parsedTransactions = parseBankOfAmericaCsv(input.csvText).map((transaction, index) => ({
    ...transaction,
    originalIndex: index,
  }));

  const sortedTransactions = [...parsedTransactions].sort((left, right) => {
    if (left.transactionDate === right.transactionDate) {
      return left.originalIndex - right.originalIndex;
    }
    return left.transactionDate.localeCompare(right.transactionDate);
  });

  const firstDate = sortedTransactions[0]?.transactionDate;
  const lastDate = sortedTransactions[sortedTransactions.length - 1]?.transactionDate;

  const [latestEntry, existingImports] = await Promise.all([
    prisma.companyLedgerEntry.findFirst({
      where: { companyId: input.companyId },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      select: { balance: true },
    }),
    firstDate && lastDate
      ? prisma.companyLedgerEntry.findMany({
          where: {
            companyId: input.companyId,
            transactionDate: {
              gte: getStartOfDay(firstDate),
              lte: getEndOfDay(lastDate),
            },
          },
          select: {
            metadata: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const existingFingerprints = new Set(
    existingImports
      .map((entry) => {
        if (!isBankImportMetadata(entry.metadata)) {
          return null;
        }

        const metadata = entry.metadata as Record<string, unknown>;
        return typeof metadata.importFingerprint === 'string' ? metadata.importFingerprint : null;
      })
      .filter((value): value is string => Boolean(value))
  );

  const fileFingerprints = new Set<string>();
  const rows: PreparedImportRow[] = sortedTransactions.map((transaction, offset) => {
    const importFingerprint = getImportFingerprint(transaction);
    const duplicateReason = existingFingerprints.has(importFingerprint)
      ? 'ALREADY_IMPORTED'
      : fileFingerprints.has(importFingerprint)
      ? 'DUPLICATE_IN_FILE'
      : null;

    fileFingerprints.add(importFingerprint);

    return {
      ...transaction,
      importFingerprint,
      isDuplicate: duplicateReason !== null,
      duplicateReason,
      ledgerDate: getLedgerDate(transaction.transactionDate, offset),
    };
  });

  const currentBalance = latestEntry?.balance || 0;
  const importableRows = rows.filter((row) => !row.isDuplicate);
  const importableNetChange = roundCurrency(
    importableRows.reduce((sum, row) => sum + (row.type === 'DEBIT' ? row.amount : -row.amount), 0)
  );
  const projectedEndingBalance = roundCurrency(currentBalance + importableNetChange);
  const reconciliationDifference = input.statementEndingBalance === null
    ? null
    : roundCurrency(input.statementEndingBalance - projectedEndingBalance);

  return {
    rows,
    currentBalance,
    importableRows,
    totalCount: rows.length,
    duplicateCount: rows.length - importableRows.length,
    importableCount: importableRows.length,
    importableNetChange,
    projectedEndingBalance,
    statementEndingBalance: input.statementEndingBalance,
    reconciliationDifference,
    reconciliationStatus:
      input.statementEndingBalance === null
        ? 'NOT_PROVIDED'
        : Math.abs(reconciliationDifference || 0) < 0.005
        ? 'MATCH'
        : 'VARIANCE',
  };
}

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

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const action = getFormText(formData, 'action') || 'import';
    const category = getFormText(formData, 'category') || 'Bank Statement';
    const sourceLabel = getFormText(formData, 'sourceLabel') || 'Bank of America CSV';
    const statementEndingBalance = parseOptionalCurrencyAmount(getFormText(formData, 'statementEndingBalance'));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A CSV file is required' }, { status: 400 });
    }

    const normalizedName = file.name.toLowerCase();
    if (!normalizedName.endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 });
    }

    if (file.size > MAX_CSV_SIZE_BYTES) {
      return NextResponse.json({ error: 'CSV file exceeds the 5MB size limit' }, { status: 400 });
    }

    const csvText = await file.text();
    const preview = await buildImportPreview({
      companyId: params.id,
      csvText,
      statementEndingBalance,
    });

    if (action === 'preview') {
      return NextResponse.json({
        preview: {
          totalCount: preview.totalCount,
          duplicateCount: preview.duplicateCount,
          importableCount: preview.importableCount,
          importableNetChange: preview.importableNetChange,
          currentBalance: preview.currentBalance,
          projectedEndingBalance: preview.projectedEndingBalance,
          statementEndingBalance: preview.statementEndingBalance,
          reconciliationDifference: preview.reconciliationDifference,
          reconciliationStatus: preview.reconciliationStatus,
          rows: preview.rows.map((row) => ({
            transactionDate: row.transactionDate,
            description: row.description,
            type: row.type,
            amount: row.amount,
            reference: row.reference || null,
            notes: row.notes || null,
            isDuplicate: row.isDuplicate,
            duplicateReason: row.duplicateReason,
          })),
        },
        category,
        sourceLabel,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let importedCount = 0;

      for (const transaction of preview.importableRows) {
        await tx.companyLedgerEntry.create({
          data: {
            companyId: params.id,
            description: transaction.description,
            type: transaction.type,
            amount: transaction.amount,
            balance: 0,
            transactionDate: transaction.ledgerDate,
            category,
            reference: transaction.reference || null,
            notes: transaction.notes || null,
            metadata: {
              importSource: 'BANK_OF_AMERICA_CSV',
              importFingerprint: transaction.importFingerprint,
              importedAt: new Date().toISOString(),
              importedFileName: file.name,
              sourceLabel,
              rawRow: transaction.rawRow,
            } as Prisma.InputJsonValue,
            createdBy: session.user.id as string,
          },
        });
        importedCount += 1;
      }

      if (importedCount > 0) {
        await recalculateCompanyLedgerBalances(tx, params.id);
      }

      return {
        importedCount,
        skippedCount: preview.duplicateCount,
        totalCount: preview.totalCount,
      };
    });

    await createAuditLog(
      'CompanyLedgerEntry',
      company.id,
      'CREATE',
      session.user.id as string,
      {
        importType: 'BANK_OF_AMERICA_CSV',
        companyName: company.name,
        fileName: file.name,
        category,
        statementEndingBalance,
        projectedEndingBalance: preview.projectedEndingBalance,
        reconciliationDifference: preview.reconciliationDifference,
        reconciliationStatus: preview.reconciliationStatus,
        ...result,
      },
      request
    );

    return NextResponse.json({
      ...result,
      category,
      sourceLabel,
      currentBalance: preview.currentBalance,
      projectedEndingBalance: preview.projectedEndingBalance,
      statementEndingBalance: preview.statementEndingBalance,
      reconciliationDifference: preview.reconciliationDifference,
      reconciliationStatus: preview.reconciliationStatus,
    });
  } catch (error) {
    console.error('Error importing Bank of America CSV:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import CSV' },
      { status: 400 }
    );
  }
}