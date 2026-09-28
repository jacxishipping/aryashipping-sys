import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeNextDueDate } from './recurring-expenses';

describe('Recurring Expenses Scheduler', () => {
  describe('computeNextDueDate', () => {
    it('computes next monthly due date', () => {
      const fromDate = new Date('2026-01-01T00:00:00Z');
      const nextDue = computeNextDueDate(fromDate, 'MONTHLY', 1);

      assert.equal(nextDue.getMonth(), 1); // February (0-indexed: 1)
      assert.equal(nextDue.getDate(), 1);
    });

    it('computes next quarterly due date (3 months)', () => {
      const fromDate = new Date('2026-01-15T00:00:00Z');
      const nextDue = computeNextDueDate(fromDate, 'QUARTERLY', 15);

      assert.equal(nextDue.getMonth(), 3); // April
      assert.equal(nextDue.getDate(), 15);
    });

    it('computes next yearly due date', () => {
      const fromDate = new Date('2026-05-10T00:00:00Z');
      const nextDue = computeNextDueDate(fromDate, 'YEARLY', 10);

      assert.equal(nextDue.getFullYear(), 2027);
      assert.equal(nextDue.getMonth(), 4); // May
      assert.equal(nextDue.getDate(), 10);
    });

    it('computes next weekly due date (+7 days)', () => {
      const fromDate = new Date('2026-03-01T00:00:00Z');
      const nextDue = computeNextDueDate(fromDate, 'WEEKLY');

      assert.equal(nextDue.getDate(), 8);
    });

    it('computes next bi-weekly due date (+14 days)', () => {
      const fromDate = new Date('2026-03-01T00:00:00Z');
      const nextDue = computeNextDueDate(fromDate, 'BIWEEKLY');

      assert.equal(nextDue.getDate(), 15);
    });
  });
});
