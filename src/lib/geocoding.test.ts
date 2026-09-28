
import { describe, it, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getCoordinates } from './geocoding.ts';

describe('geocoding', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Restore fetch before each test to ensure a clean slate
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
        // @ts-ignore
        delete global.fetch;
    }
  });

  after(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // Clean up if fetch wasn't originally defined (though in Node 22 it likely is)
      // @ts-ignore
      delete global.fetch;
    }
  });

  it('should return known coordinates for known ports synchronously', async () => {
    const coords = await getCoordinates('New York');
    assert.deepStrictEqual(coords, [40.6848, -74.0088]);
  });

  it('should fetch coordinates for unknown locations', async () => {
    // Mock fetch for success
    global.fetch = (async () => {
      return {
        ok: true,
        json: async () => [{ lat: "10.0", lon: "20.0" }]
      } as Response;
    }) as any;

    const coords = await getCoordinates('Unknown Place');
    assert.deepStrictEqual(coords, [10.0, 20.0]);
  });

  it('should return null on fetch error', async () => {
    // Mock fetch error
    global.fetch = (async () => {
      return {
        ok: false,
        status: 500
      } as Response;
    }) as any;

    const coords = await getCoordinates('Error Place');
    assert.strictEqual(coords, null);
  });

  it('should return null on empty response', async () => {
      // Mock fetch empty response
      global.fetch = (async () => {
          return {
              ok: true,
              json: async () => []
          } as Response;
      }) as any;

      const coords = await getCoordinates('Empty Place');
      assert.strictEqual(coords, null);
  });

  it('should use cache for subsequent requests', async () => {
    let callCount = 0;
    // Mock fetch for success
    global.fetch = (async () => {
      callCount++;
      return {
        ok: true,
        json: async () => [{ lat: "30.0", lon: "40.0" }]
      } as Response;
    }) as any;

    const locationName = 'Unique Place For Caching Test';

    // First call - should trigger fetch
    const coords1 = await getCoordinates(locationName);
    assert.deepStrictEqual(coords1, [30.0, 40.0]);
    assert.strictEqual(callCount, 1, 'First call should trigger fetch');

    // Second call - should use cache
    const coords2 = await getCoordinates(locationName);
    assert.deepStrictEqual(coords2, [30.0, 40.0]);
    assert.strictEqual(callCount, 1, 'Second call should use cache');
  });
});
