import { Prisma, LedgerTransferType, LedgerPartyType, LedgerTransferStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { createAuditLog } from '@/lib/audit';

export interface ExecuteTransferInput {
  transferType: LedgerTransferType;
  amount: number;
  currency?: string;
  transferDate?: Date | string;
  sourceUserId?: string;
  sourceCompanyId?: string;
  destUserId?: string;
  destCompanyId?: string;
  reference?: string;
  notes?: string;
  createdById?: string;
}

export interface CancelTransferInput {
  transferId: string;
  cancelledById?: string;
  reason?: string;
}

function generateTransferNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TRF-${dateStr}-${randomSuffix}`;
}

export async function executeLedgerTransfer(input: ExecuteTransferInput) {
  const {
    transferType,
    amount,
    currency = 'USD',
    transferDate = new Date(),
    sourceUserId,
    sourceCompanyId,
    destUserId,
    destCompanyId,
    reference,
    notes,
    createdById,
  } = input;

  if (!amount || amount <= 0) {
    throw new Error('Transfer amount must be greater than zero.');
  }

  const txDate = typeof transferDate === 'string' ? new Date(transferDate) : transferDate;

  // Validation according to transfer type
  let sourceType: LedgerPartyType;
  let destType: LedgerPartyType;
  let sourceName = '';
  let destName = '';

  switch (transferType) {
    case 'USER_TO_USER':
      if (!sourceUserId || !destUserId) {
        throw new Error('Both source and destination customers are required.');
      }
      if (sourceUserId === destUserId) {
        throw new Error('Source and destination customer cannot be the same account.');
      }
      sourceType = 'USER';
      destType = 'USER';
      break;

    case 'USER_TO_COMPANY':
      if (!sourceUserId || !destCompanyId) {
        throw new Error('Source customer and destination company are required.');
      }
      sourceType = 'USER';
      destType = 'COMPANY';
      break;

    case 'COMPANY_TO_USER':
      if (!sourceCompanyId || !destUserId) {
        throw new Error('Source company and destination customer are required.');
      }
      sourceType = 'COMPANY';
      destType = 'USER';
      break;

    case 'COMPANY_TO_COMPANY':
      if (!sourceCompanyId || !destCompanyId) {
        throw new Error('Both source and destination companies are required.');
      }
      if (sourceCompanyId === destCompanyId) {
        throw new Error('Source and destination company cannot be the same.');
      }
      sourceType = 'COMPANY';
      destType = 'COMPANY';
      break;

    default:
      throw new Error(`Unsupported transfer type: ${transferType}`);
  }

  // Fetch names
  if (sourceType === 'USER' && sourceUserId) {
    const user = await prisma.user.findUnique({
      where: { id: sourceUserId },
      select: { id: true, name: true, email: true },
    });
    if (!user) throw new Error('Source customer not found.');
    sourceName = user.name || user.email;
  } else if (sourceType === 'COMPANY' && sourceCompanyId) {
    const company = await prisma.company.findUnique({
      where: { id: sourceCompanyId },
      select: { id: true, name: true },
    });
    if (!company) throw new Error('Source company not found.');
    sourceName = company.name;
  }

  if (destType === 'USER' && destUserId) {
    const user = await prisma.user.findUnique({
      where: { id: destUserId },
      select: { id: true, name: true, email: true },
    });
    if (!user) throw new Error('Destination customer not found.');
    destName = user.name || user.email;
  } else if (destType === 'COMPANY' && destCompanyId) {
    const company = await prisma.company.findUnique({
      where: { id: destCompanyId },
      select: { id: true, name: true },
    });
    if (!company) throw new Error('Destination company not found.');
    destName = company.name;
  }

  const transferNumber = generateTransferNumber();

  // Execute in atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    let sourceLedgerEntryId: string | null = null;
    let sourceCompanyLedgerEntryId: string | null = null;
    let destLedgerEntryId: string | null = null;
    let destCompanyLedgerEntryId: string | null = null;

    // 1. Create Source Entry (DEBIT - funds leaving source account)
    if (sourceType === 'USER' && sourceUserId) {
      const entry = await tx.ledgerEntry.create({
        data: {
          userId: sourceUserId,
          type: 'DEBIT',
          amount,
          balance: 0, // will be recalculated
          transactionDate: txDate,
          description: `Transfer to ${destName} (${transferNumber})`,
          notes: notes || `Inter-ledger transfer to ${destName}`,
          createdBy: createdById || 'SYSTEM',
          metadata: {
            isInterLedgerTransfer: true,
            transferNumber,
            transferType,
            role: 'SOURCE',
            counterpartyType: destType,
            counterpartyId: destType === 'USER' ? destUserId : destCompanyId,
            counterpartyName: destName,
            reference: reference || null,
          },
        },
      });
      sourceLedgerEntryId = entry.id;
    } else if (sourceType === 'COMPANY' && sourceCompanyId) {
      const entry = await tx.companyLedgerEntry.create({
        data: {
          companyId: sourceCompanyId,
          type: 'DEBIT',
          amount,
          balance: 0,
          transactionDate: txDate,
          description: `Transfer to ${destName} (${transferNumber})`,
          category: 'Inter-Ledger Transfer',
          reference: transferNumber,
          notes: notes || `Inter-ledger transfer to ${destName}`,
          createdBy: createdById || 'SYSTEM',
          metadata: {
            isInterLedgerTransfer: true,
            transferNumber,
            transferType,
            role: 'SOURCE',
            counterpartyType: destType,
            counterpartyId: destType === 'USER' ? destUserId : destCompanyId,
            counterpartyName: destName,
            customReference: reference || null,
          },
        },
      });
      sourceCompanyLedgerEntryId = entry.id;
    }

    // 2. Create Destination Entry (CREDIT - funds entering destination account)
    if (destType === 'USER' && destUserId) {
      const entry = await tx.ledgerEntry.create({
        data: {
          userId: destUserId,
          type: 'CREDIT',
          amount,
          balance: 0,
          transactionDate: txDate,
          description: `Transfer from ${sourceName} (${transferNumber})`,
          notes: notes || `Inter-ledger transfer from ${sourceName}`,
          createdBy: createdById || 'SYSTEM',
          metadata: {
            isInterLedgerTransfer: true,
            transferNumber,
            transferType,
            role: 'DESTINATION',
            counterpartyType: sourceType,
            counterpartyId: sourceType === 'USER' ? sourceUserId : sourceCompanyId,
            counterpartyName: sourceName,
            reference: reference || null,
          },
        },
      });
      destLedgerEntryId = entry.id;
    } else if (destType === 'COMPANY' && destCompanyId) {
      const entry = await tx.companyLedgerEntry.create({
        data: {
          companyId: destCompanyId,
          type: 'CREDIT',
          amount,
          balance: 0,
          transactionDate: txDate,
          description: `Transfer from ${sourceName} (${transferNumber})`,
          category: 'Inter-Ledger Transfer',
          reference: transferNumber,
          notes: notes || `Inter-ledger transfer from ${sourceName}`,
          createdBy: createdById || 'SYSTEM',
          metadata: {
            isInterLedgerTransfer: true,
            transferNumber,
            transferType,
            role: 'DESTINATION',
            counterpartyType: sourceType,
            counterpartyId: sourceType === 'USER' ? sourceUserId : sourceCompanyId,
            counterpartyName: sourceName,
            customReference: reference || null,
          },
        },
      });
      destCompanyLedgerEntryId = entry.id;
    }

    // 3. Create Transfer record
    const transfer = await tx.ledgerTransfer.create({
      data: {
        transferNumber,
        transferType,
        amount,
        currency,
        transferDate: txDate,
        sourceType,
        sourceUserId: sourceUserId || null,
        sourceCompanyId: sourceCompanyId || null,
        sourceLedgerEntryId,
        sourceCompanyLedgerEntryId,
        destType,
        destUserId: destUserId || null,
        destCompanyId: destCompanyId || null,
        destLedgerEntryId,
        destCompanyLedgerEntryId,
        reference: reference || null,
        notes: notes || null,
        status: 'COMPLETED',
        createdById: createdById || null,
      },
    });

    // 4. Recalculate balances on both sides
    let sourceNewBalance = 0;
    let destNewBalance = 0;

    if (sourceType === 'USER' && sourceUserId) {
      sourceNewBalance = await recalculateUserLedgerBalances(tx, sourceUserId);
    } else if (sourceType === 'COMPANY' && sourceCompanyId) {
      sourceNewBalance = await recalculateCompanyLedgerBalances(tx, sourceCompanyId);
    }

    if (destType === 'USER' && destUserId) {
      destNewBalance = await recalculateUserLedgerBalances(tx, destUserId);
    } else if (destType === 'COMPANY' && destCompanyId) {
      destNewBalance = await recalculateCompanyLedgerBalances(tx, destCompanyId);
    }

    return {
      transfer,
      sourceNewBalance,
      destNewBalance,
      sourceName,
      destName,
    };
  });

  if (createdById) {
    await createAuditLog(
      'LedgerTransfer',
      result.transfer.id,
      'CREATE',
      createdById,
      {
        transferNumber: result.transfer.transferNumber,
        transferType: result.transfer.transferType,
        amount: result.transfer.amount,
        source: { type: sourceType, id: sourceUserId || sourceCompanyId, name: sourceName },
        dest: { type: destType, id: destUserId || destCompanyId, name: destName },
      }
    );
  }

  return result;
}

export async function cancelLedgerTransfer(input: CancelTransferInput) {
  const { transferId, cancelledById, reason } = input;

  const transfer = await prisma.ledgerTransfer.findUnique({
    where: { id: transferId },
    include: {
      sourceUser: { select: { id: true, name: true, email: true } },
      sourceCompany: { select: { id: true, name: true } },
      destUser: { select: { id: true, name: true, email: true } },
      destCompany: { select: { id: true, name: true } },
    },
  });

  if (!transfer) {
    throw new Error('Ledger transfer record not found.');
  }

  if (transfer.status === 'CANCELLED') {
    throw new Error('This transfer has already been cancelled.');
  }

  const result = await prisma.$transaction(async (tx) => {
    // Delete or reverse entries
    if (transfer.sourceLedgerEntryId) {
      await tx.ledgerEntry.delete({ where: { id: transfer.sourceLedgerEntryId } }).catch(() => null);
    }
    if (transfer.sourceCompanyLedgerEntryId) {
      await tx.companyLedgerEntry.delete({ where: { id: transfer.sourceCompanyLedgerEntryId } }).catch(() => null);
    }
    if (transfer.destLedgerEntryId) {
      await tx.ledgerEntry.delete({ where: { id: transfer.destLedgerEntryId } }).catch(() => null);
    }
    if (transfer.destCompanyLedgerEntryId) {
      await tx.companyLedgerEntry.delete({ where: { id: transfer.destCompanyLedgerEntryId } }).catch(() => null);
    }

    const updatedTransfer = await tx.ledgerTransfer.update({
      where: { id: transferId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${transfer.notes ? `${transfer.notes} | ` : ''}Cancelled: ${reason}` : transfer.notes,
      },
    });

    // Recalculate
    if (transfer.sourceType === 'USER' && transfer.sourceUserId) {
      await recalculateUserLedgerBalances(tx, transfer.sourceUserId);
    } else if (transfer.sourceType === 'COMPANY' && transfer.sourceCompanyId) {
      await recalculateCompanyLedgerBalances(tx, transfer.sourceCompanyId);
    }

    if (transfer.destType === 'USER' && transfer.destUserId) {
      await recalculateUserLedgerBalances(tx, transfer.destUserId);
    } else if (transfer.destType === 'COMPANY' && transfer.destCompanyId) {
      await recalculateCompanyLedgerBalances(tx, transfer.destCompanyId);
    }

    return updatedTransfer;
  });

  if (cancelledById) {
    await createAuditLog(
      'LedgerTransfer',
      transfer.id,
      'UPDATE',
      cancelledById,
      {
        action: 'CANCEL_TRANSFER',
        transferNumber: transfer.transferNumber,
        reason: reason || 'Transfer cancelled and ledger entries reversed',
      }
    );
  }

  return result;
}

export async function getLedgerTransferParties() {
  const [users, companies] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { not: 'admin' }, // or include all non-system users
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        ledgerEntries: {
          orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: { balance: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        companyType: true,
        ledgerEntries: {
          orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: { balance: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const userOptions = users.map((u) => ({
    id: u.id,
    type: 'USER' as const,
    name: u.name || u.email,
    email: u.email,
    phone: u.phone,
    balance: u.ledgerEntries[0]?.balance ?? 0,
  }));

  const companyOptions = companies.map((c) => ({
    id: c.id,
    type: 'COMPANY' as const,
    name: c.name,
    code: c.code,
    companyType: c.companyType,
    balance: c.ledgerEntries[0]?.balance ?? 0,
  }));

  return {
    users: userOptions,
    companies: companyOptions,
  };
}
