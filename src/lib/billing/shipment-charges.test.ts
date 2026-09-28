import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { syncShipmentChargeFromLedgerEntry } from './shipment-charges';

describe('syncShipmentChargeFromLedgerEntry', () => {
  it('preserves a disputed shipment charge instead of re-approving it during ledger sync', async () => {
    const updates: any[] = [];
    const auditLogs: any[] = [];

    const db = {
      shipmentCharge: {
        findFirst: async () => ({
          id: 'charge-1',
          status: 'DISPUTED',
          invoiceId: null,
        }),
        update: async (args: any) => {
          updates.push(args);
          return { id: 'charge-1', status: args.data.status };
        },
        create: async () => ({ id: 'charge-2', status: 'APPROVED' }),
      },
      shipmentChargeAuditLog: {
        create: async (args: any) => {
          auditLogs.push(args);
          return args;
        },
      },
      shipment: {
        updateMany: async () => ({ count: 0 }),
      },
    } as any;

    await syncShipmentChargeFromLedgerEntry(db, {
      entryId: 'entry-1',
      userId: 'user-1',
      shipmentId: 'shipment-1',
      description: 'Fuel surcharge',
      type: 'DEBIT',
      amount: 150,
      transactionDate: new Date('2026-09-01'),
      transactionInfoType: 'SHIPPING_PAYMENT',
      notes: 'Fuel',
      metadata: { isExpense: true, expenseType: 'SHIPPING_FEE' },
      actorId: 'actor-1',
    });

    assert.equal(updates.length, 1);
    assert.equal(updates[0].data.status, 'DISPUTED');
    assert.equal(auditLogs.length, 1);
  });
});
