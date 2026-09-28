import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { executeLedgerTransfer } from './ledger-transfer';

describe('Ledger Transfers', () => {
  describe('Validation', () => {
    it('throws error when amount is <= 0', async () => {
      await assert.rejects(
        async () => {
          await executeLedgerTransfer({
            transferType: 'USER_TO_USER',
            amount: 0,
            sourceUserId: 'user-1',
            destUserId: 'user-2',
          });
        },
        {
          message: 'Transfer amount must be greater than zero.',
        }
      );
    });

    it('throws error when USER_TO_USER has same source and destination', async () => {
      await assert.rejects(
        async () => {
          await executeLedgerTransfer({
            transferType: 'USER_TO_USER',
            amount: 100,
            sourceUserId: 'user-1',
            destUserId: 'user-1',
          });
        },
        {
          message: 'Source and destination customer cannot be the same account.',
        }
      );
    });

    it('throws error when COMPANY_TO_COMPANY has same source and destination', async () => {
      await assert.rejects(
        async () => {
          await executeLedgerTransfer({
            transferType: 'COMPANY_TO_COMPANY',
            amount: 100,
            sourceCompanyId: 'comp-1',
            destCompanyId: 'comp-1',
          });
        },
        {
          message: 'Source and destination company cannot be the same.',
        }
      );
    });

    it('throws error when required party is missing', async () => {
      await assert.rejects(
        async () => {
          await executeLedgerTransfer({
            transferType: 'USER_TO_COMPANY',
            amount: 100,
            sourceUserId: 'user-1',
          });
        },
        {
          message: 'Source customer and destination company are required.',
        }
      );
    });
  });
});
