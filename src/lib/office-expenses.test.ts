import test from 'node:test';
import assert from 'node:assert/strict';
import { OfficeExpenseCategory, ExpensePaymentStatus } from '@prisma/client';

test('OfficeExpenseCategory includes required operational overhead types', () => {
  assert.equal(OfficeExpenseCategory.RENT, 'RENT');
  assert.equal(OfficeExpenseCategory.UTILITIES, 'UTILITIES');
  assert.equal(OfficeExpenseCategory.SALARIES_PAYROLL, 'SALARIES_PAYROLL');
  assert.equal(OfficeExpenseCategory.OFFICE_SUPPLIES, 'OFFICE_SUPPLIES');
  assert.equal(OfficeExpenseCategory.SOFTWARE_SUBSCRIPTIONS, 'SOFTWARE_SUBSCRIPTIONS');
  assert.equal(OfficeExpenseCategory.MAINTENANCE_REPAIRS, 'MAINTENANCE_REPAIRS');
  assert.equal(OfficeExpenseCategory.LEGAL_PROFESSIONAL, 'LEGAL_PROFESSIONAL');
  assert.equal(OfficeExpenseCategory.OTHER, 'OTHER');
});

test('ExpensePaymentStatus covers payment states', () => {
  assert.equal(ExpensePaymentStatus.PAID, 'PAID');
  assert.equal(ExpensePaymentStatus.PENDING, 'PENDING');
  assert.equal(ExpensePaymentStatus.CANCELLED, 'CANCELLED');
});
