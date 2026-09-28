import { describe, it } from 'node:test';
import assert from 'node:assert';
import { allocateExpenses, validateAllocationMethod } from './expense-allocation.ts';

// Mock types to avoid importing from @prisma/client which might not be fully resolvable in test environment without build
type Shipment = any;
type ContainerExpense = any;

describe('Expense Allocation', () => {
  const shipments: Shipment[] = [
    { id: 's1', insuranceValue: 1000, weight: 100 },
    { id: 's2', insuranceValue: 2000, weight: 200 },
  ];
  const expenses: ContainerExpense[] = [
    { amount: 300 },
  ];

  describe('allocateExpenses', () => {
    it('should allocate equally', () => {
      const result = allocateExpenses(shipments, expenses, 'EQUAL');
      assert.strictEqual(result['s1'], 150);
      assert.strictEqual(result['s2'], 150);
    });

    it('should allocate by value', () => {
      const result = allocateExpenses(shipments, expenses, 'BY_VALUE');
      // Total value = 3000. s1 = 1/3, s2 = 2/3.
      // Total expense = 300. s1 = 100, s2 = 200.
      assert.strictEqual(result['s1'], 100);
      assert.strictEqual(result['s2'], 200);
    });

    it('should allocate by weight', () => {
      const result = allocateExpenses(shipments, expenses, 'BY_WEIGHT');
      // Total weight = 300. s1 = 1/3, s2 = 2/3.
      assert.strictEqual(result['s1'], 100);
      assert.strictEqual(result['s2'], 200);
    });

    it('should handle zero value fallback to equal', () => {
      const zeroValueShipments = [{ id: 's1', insuranceValue: 0 }, { id: 's2', insuranceValue: 0 }];
      const result = allocateExpenses(zeroValueShipments, expenses, 'BY_VALUE');
      assert.strictEqual(result['s1'], 150);
      assert.strictEqual(result['s2'], 150);
    });
  });

  describe('validateAllocationMethod', () => {
    it('should validate EQUAL', () => {
      const result = validateAllocationMethod(shipments, 'EQUAL');
      assert.strictEqual(result.valid, true);
    });

    it('should validate BY_VALUE with values', () => {
      const result = validateAllocationMethod(shipments, 'BY_VALUE');
      assert.strictEqual(result.valid, true);
    });

    it('should invalidate BY_VALUE without values', () => {
      const noValueShipments = [{ id: 's1', insuranceValue: 0 }];
      const result = validateAllocationMethod(noValueShipments, 'BY_VALUE');
      assert.strictEqual(result.valid, false);
      assert.match(result.reason || '', /No insurance values set/);
    });
  });
});
