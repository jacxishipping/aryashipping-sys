import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  allocateDispatchExpense,
  getDispatchStatusLabel,
  isDispatchActive,
  isDispatchClosed,
  shouldReleaseDispatchShipments,
} from './dispatch-workflow.ts';

describe('dispatch workflow helpers', () => {
  it('marks only completed and cancelled dispatches as closed', () => {
    assert.strictEqual(isDispatchClosed('PENDING'), false);
    assert.strictEqual(isDispatchClosed('DISPATCHED'), false);
    assert.strictEqual(isDispatchClosed('ARRIVED_AT_PORT'), false);
    assert.strictEqual(isDispatchClosed('COMPLETED'), true);
    assert.strictEqual(isDispatchClosed('CANCELLED'), true);
  });

  it('treats pending, dispatched, and arrived-at-port dispatches as active', () => {
    assert.strictEqual(isDispatchActive('PENDING'), true);
    assert.strictEqual(isDispatchActive('DISPATCHED'), true);
    assert.strictEqual(isDispatchActive('ARRIVED_AT_PORT'), true);
    assert.strictEqual(isDispatchActive('COMPLETED'), false);
  });

  it('releases shipments when a dispatch reaches handoff or is cancelled', () => {
    assert.strictEqual(shouldReleaseDispatchShipments('PENDING'), false);
    assert.strictEqual(shouldReleaseDispatchShipments('DISPATCHED'), false);
    assert.strictEqual(shouldReleaseDispatchShipments('ARRIVED_AT_PORT'), true);
    assert.strictEqual(shouldReleaseDispatchShipments('COMPLETED'), true);
    assert.strictEqual(shouldReleaseDispatchShipments('CANCELLED'), true);
  });

  it('returns readable labels for known statuses', () => {
    assert.strictEqual(getDispatchStatusLabel('ARRIVED_AT_PORT'), 'Arrived At Port');
    assert.strictEqual(getDispatchStatusLabel('COMPLETED'), 'Completed');
    assert.strictEqual(getDispatchStatusLabel('CUSTOM_STATUS'), 'CUSTOM_STATUS');
  });

  it('allocates dispatch expenses evenly and preserves cents', () => {
    const allocations = allocateDispatchExpense(
      [
        { id: 's1', insuranceValue: null, weight: null },
        { id: 's2', insuranceValue: null, weight: null },
        { id: 's3', insuranceValue: null, weight: null },
      ],
      100,
    );

    assert.deepStrictEqual(allocations, [
      { shipmentId: 's1', amount: 33.34 },
      { shipmentId: 's2', amount: 33.33 },
      { shipmentId: 's3', amount: 33.33 },
    ]);
  });

  it('returns no allocations when no shipments are present', () => {
    assert.deepStrictEqual(allocateDispatchExpense([], 42), []);
  });
});