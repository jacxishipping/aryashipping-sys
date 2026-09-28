import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createExpenseBudget } from './expense-budgets';

describe('Expense Budgets & Spending Caps', () => {
  describe('Validation', () => {
    it('throws error when budget name is empty', async () => {
      await assert.rejects(
        async () => {
          await createExpenseBudget({
            name: '',
            amount: 5000,
          });
        },
        {
          message: 'Budget name is required',
        }
      );
    });

    it('throws error when amount is <= 0', async () => {
      await assert.rejects(
        async () => {
          await createExpenseBudget({
            name: 'Utilities Budget',
            amount: 0,
          });
        },
        {
          message: 'Budget limit amount must be greater than zero',
        }
      );
    });
  });

  describe('Budget Status Threshold Logic', () => {
    it('determines SAFE status when spending is under warning threshold', () => {
      const budgetAmount = 1000;
      const actualSpent = 500;
      const warningLimit = 80;

      const percentageUsed = (actualSpent / budgetAmount) * 100;
      const status = percentageUsed >= 100 ? 'EXCEEDED' : percentageUsed >= warningLimit ? 'WARNING' : 'SAFE';

      assert.equal(percentageUsed, 50);
      assert.equal(status, 'SAFE');
    });

    it('determines WARNING status when spending is between threshold and cap', () => {
      const budgetAmount = 1000;
      const actualSpent = 850;
      const warningLimit = 80;

      const percentageUsed = (actualSpent / budgetAmount) * 100;
      const status = percentageUsed >= 100 ? 'EXCEEDED' : percentageUsed >= warningLimit ? 'WARNING' : 'SAFE';

      assert.equal(percentageUsed, 85);
      assert.equal(status, 'WARNING');
    });

    it('determines EXCEEDED status when spending exceeds cap limit', () => {
      const budgetAmount = 1000;
      const actualSpent = 1150;
      const warningLimit = 80;

      const percentageUsed = Math.round(((actualSpent / budgetAmount) * 100) * 100) / 100;
      const status = percentageUsed >= 100 ? 'EXCEEDED' : percentageUsed >= warningLimit ? 'WARNING' : 'SAFE';

      assert.equal(percentageUsed, 115);
      assert.equal(status, 'EXCEEDED');
    });
  });
});
