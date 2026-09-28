import { describe, it } from 'node:test';
import assert from 'node:assert';
import { recalculateUserLedgerBalances } from './user-ledger';
import { recalculateCompanyLedgerBalances } from './company-ledger';
import { invoiceLineItemMatchesLedgerEntry, normalizeInvoiceExpenseDescription } from './invoice-ledger-sync';

describe('Financial Ledger & Invoicing Gap Resolutions', () => {
  it('user ledger recalculation correctly accumulates balances and batches updates', async () => {
    const entries = [
      { id: 'e1', type: 'DEBIT', amount: 500, balance: 0, metadata: {} },
      { id: 'e2', type: 'CREDIT', amount: 200, balance: 0, metadata: {} },
      { id: 'e3', type: 'CREDIT', amount: 200, balance: 0, metadata: { isPaymentAllocation: true } }, // Should be skipped
      { id: 'e4', type: 'DEBIT', amount: 150, balance: 0, metadata: {} },
    ];

    const updatedBalances: Record<string, number> = {};
    const fakeDb = {
      ledgerEntry: {
        findMany: async () => entries,
        update: async ({ where, data }: { where: { id: string }; data: { balance: number } }) => {
          updatedBalances[where.id] = data.balance;
          return { id: where.id, ...data };
        },
      },
    };

    const finalBalance = await recalculateUserLedgerBalances(fakeDb as any, 'user-1');

    // Running calculation:
    // e1: DEBIT 500 -> 500
    // e2: CREDIT 200 -> 300
    // e3: isPaymentAllocation -> skipped
    // e4: DEBIT 150 -> 450
    assert.strictEqual(finalBalance, 450);
    assert.strictEqual(updatedBalances['e1'], 500);
    assert.strictEqual(updatedBalances['e2'], 300);
    assert.strictEqual(updatedBalances['e3'], 300); // e3 gets updated to current running balance, but does not affect it
    assert.strictEqual(updatedBalances['e4'], 450);
  });

  it('company ledger recalculation correctly accumulates balances and updates entries', async () => {
    const entries = [
      { id: 'c1', type: 'CREDIT', amount: 1200, balance: 0 },
      { id: 'c2', type: 'DEBIT', amount: 500, balance: 0 },
    ];

    const updatedBalances: Record<string, number> = {};
    const fakeDb = {
      companyLedgerEntry: {
        findMany: async () => entries,
        update: async ({ where, data }: { where: { id: string }; data: { balance: number } }) => {
          updatedBalances[where.id] = data.balance;
          return { id: where.id, ...data };
        },
      },
    };

    const finalBalance = await recalculateCompanyLedgerBalances(fakeDb as any, 'company-1');

    // CREDIT decreases balance (-1200), DEBIT increases balance (+500) -> -700
    assert.strictEqual(finalBalance, -700);
    assert.strictEqual(updatedBalances['c1'], -1200);
    assert.strictEqual(updatedBalances['c2'], -700);
  });

  it('invoice line item matcher normalizes descriptions and matches correctly', () => {
    const lineItem = {
      shipmentId: 'ship-1',
      description: 'Port Storage & Demurrage Fee',
      amount: 150.00,
    };

    const matchingLedgerEntry = {
      shipmentId: 'ship-1',
      description: 'port storage & demurrage fee',
      amount: 150.00,
    };

    const differentAmountEntry = {
      shipmentId: 'ship-1',
      description: 'port storage & demurrage fee',
      amount: 250.00,
    };

    assert.strictEqual(invoiceLineItemMatchesLedgerEntry(lineItem, matchingLedgerEntry), true);
    assert.strictEqual(invoiceLineItemMatchesLedgerEntry(lineItem, differentAmountEntry), false);
    assert.strictEqual(normalizeInvoiceExpenseDescription('Port Storage & Demurrage Fee!'), 'port storage demurrage fee');
  });
});
