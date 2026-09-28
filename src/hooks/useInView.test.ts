import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { useInView } from './useInView.ts';

// Types for better clarity (optional in stripped environment but good for docs)
type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[], observer: IntersectionObserver) => void;

describe('useInView Hook', () => {
  let originalIntersectionObserver: any;
  let mockObserverInstance: any;
  let observerCallback: ObserverCallback | null = null;

  // Setup Mock IntersectionObserver
  before(() => {
    originalIntersectionObserver = global.IntersectionObserver;

    // @ts-ignore
    global.IntersectionObserver = class MockIntersectionObserver {
      constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
        observerCallback = callback;
        mockObserverInstance = this;
      }

      observe = mock.fn();
      unobserve = mock.fn();
      disconnect = mock.fn();
      takeRecords = mock.fn(() => []);
    };
  });

  after(() => {
    global.IntersectionObserver = originalIntersectionObserver;
  });

  beforeEach(() => {
    mockObserverInstance = null;
    observerCallback = null;
  });

  // Helper to simulate hook execution
  function setupHook(options?: any) {
    const setState = mock.fn();
    const useState = mock.fn((initial: any) => [initial, setState]);

    let effectCleanup: (() => void) | undefined;
    const useEffect = mock.fn((cb: () => any) => {
      effectCleanup = cb();
    });

    const ref = { current: { tagName: 'DIV' } }; // Mock element
    const useRef = mock.fn(() => ref);

    const hooks = { useState, useEffect, useRef };

    // 1. Render hook
    const result = useInView(options, hooks as any);

    // 2. Return tools to interact with the hook instance
    return {
      result,
      setState,
      useEffect,
      useRef,
      ref,
      unmount: () => {
        if (effectCleanup) effectCleanup();
      },
      triggerIntersection: (isIntersecting: boolean) => {
        if (observerCallback && mockObserverInstance) {
          observerCallback(
            [{ isIntersecting, target: ref.current } as any],
            mockObserverInstance
          );
        }
      }
    };
  }

  it('should initialize with false state', () => {
    const { result } = setupHook();
    assert.strictEqual(result.isInView, false);
    assert.ok(result.ref.current);
  });

  it('should start observing on mount', () => {
    const { useEffect, ref } = setupHook();

    // useEffect should be called
    assert.strictEqual(useEffect.mock.calls.length, 1);

    // Observer should be instantiated (implied by setup) and observe called
    assert.ok(mockObserverInstance);
    assert.strictEqual(mockObserverInstance.observe.mock.calls.length, 1);
    assert.strictEqual(mockObserverInstance.observe.mock.calls[0].arguments[0], ref.current);
  });

  it('should set state to true when intersecting', () => {
    const { setState, triggerIntersection } = setupHook();

    triggerIntersection(true);

    assert.strictEqual(setState.mock.calls.length, 1);
    assert.strictEqual(setState.mock.calls[0].arguments[0], true);
  });

  it('should set state to false when not intersecting', () => {
    const { setState, triggerIntersection } = setupHook();

    // First intersect to set true (though our mock useState doesn't update state returned by hook, we check calls)
    triggerIntersection(true);
    assert.strictEqual(setState.mock.calls.length, 1);

    // Then exit
    triggerIntersection(false);
    assert.strictEqual(setState.mock.calls.length, 2);
    assert.strictEqual(setState.mock.calls[1].arguments[0], false);
  });

  it('should respect "once" option', () => {
    const { setState, triggerIntersection } = setupHook({ once: true });

    triggerIntersection(true);

    assert.strictEqual(setState.mock.calls.length, 1);
    assert.strictEqual(setState.mock.calls[0].arguments[0], true);

    // Should verify disconnect was called
    assert.strictEqual(mockObserverInstance.disconnect.mock.calls.length, 1);

    // Subsequent intersection changes shouldn't matter if disconnected,
    // but our triggerIntersection simulates the observer calling back.
    // In reality, disconnect stops callbacks.
    // We can verify that "once" logic prevents setting state to false if we manually triggered it again?
    // The code says:
    // if (entry.isIntersecting) { ... disconnect() }
    // else if (!options?.once) { setIsInView(false) }

    // So if we trigger false, it shouldn't set state because options.once is true
    setState.mock.resetCalls();
    triggerIntersection(false);
    assert.strictEqual(setState.mock.calls.length, 0);
  });

  it('should disconnect observer on unmount', () => {
    const { unmount } = setupHook();

    assert.ok(mockObserverInstance);
    // Initial disconnect might be called if we had previous tests leaking, but beforeEach handles it.
    // Actually, disconnect is called in cleanup.

    unmount();

    assert.strictEqual(mockObserverInstance.disconnect.mock.calls.length, 1);
  });
});
