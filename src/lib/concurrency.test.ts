import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { runWithConcurrency } from './concurrency.ts';

describe('runWithConcurrency', () => {
  test('processes all items', async () => {
    const items = [1, 2, 3, 4, 5];
    const processed: number[] = [];

    await runWithConcurrency(items, async (item) => {
      processed.push(item);
    }, 2);

    assert.deepStrictEqual(processed.sort(), items.sort());
  });

  test('respects concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    await runWithConcurrency(items, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async work
      active--;
    }, 3);

    assert.ok(maxActive <= 3, `Expected max concurrency <= 3, got ${maxActive}`);
  });

  test('runs work concurrently when limit is greater than one', async () => {
    const items = Array.from({ length: 5 }, (_, i) => i);
    let active = 0;
    let observedOverlap = false;

    await runWithConcurrency(items, async () => {
      active += 1;
      if (active > 1) {
        observedOverlap = true;
      }
      await new Promise(resolve => setTimeout(resolve, 25));
      active -= 1;
    }, 2);

    assert.equal(observedOverlap, true);
  });
});
