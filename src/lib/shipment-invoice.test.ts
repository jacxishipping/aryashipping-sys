import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Prisma } from '@prisma/client';
import { createInvoiceWithUniqueNumber, generateInvoiceNumber, recalculateInvoiceTotal } from './shipment-invoice.ts';

describe('generateInvoiceNumber', () => {
  it('uses the highest current-year invoice sequence instead of total invoice count', async () => {
    const fakeClient = {
      userInvoice: {
        findMany: async () => [
          { invoiceNumber: 'INV-2026-0007' },
          { invoiceNumber: 'INV-2026-0015' },
          { invoiceNumber: 'INV-2025-0002' },
        ],
      },
    };

    const result = await generateInvoiceNumber(fakeClient as any);
    assert.strictEqual(result, 'INV-2026-0016');
  });

  it('retries if a generated invoice number collides with a unique constraint', async () => {
    let attempts = 0;

    const result = await createInvoiceWithUniqueNumber(
      {
        userInvoice: {
          findMany: async () => [{ invoiceNumber: 'INV-2026-0010' }],
        },
      } as any,
      async (invoiceNumber) => {
        attempts += 1;
        if (attempts === 1) {
          const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
            code: 'P2002',
            clientVersion: 'test',
            meta: { modelName: 'UserInvoice', target: ['invoiceNumber'] },
          });
          throw error;
        }

        return invoiceNumber;
      },
      'INV',
      3,
    );

    assert.strictEqual(result, 'INV-2026-0011');
    assert.strictEqual(attempts, 2);
  });
});

describe('recalculateInvoiceTotal', () => {
  it('recalculates subtotal minus discount plus tax', () => {
    assert.strictEqual(recalculateInvoiceTotal(1500, 100, 75), 1475);
  });

  it('keeps totals stable for zero or missing values', () => {
    assert.strictEqual(recalculateInvoiceTotal(1000), 1000);
    assert.strictEqual(recalculateInvoiceTotal(1000, 0, 0), 1000);
  });
});
