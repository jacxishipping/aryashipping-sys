import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { logger } from './logger.ts';

describe('Logger', () => {
    let originalConsole: any;
    let originalEnv: string | undefined;
    const setNodeEnv = (value: string | undefined) => {
        (process.env as Record<string, string | undefined>).NODE_ENV = value;
    };

    before(() => {
        originalConsole = { ...console };
        originalEnv = process.env.NODE_ENV;

        // Mock console methods
        console.log = mock.fn();
        console.info = mock.fn();
        console.warn = mock.fn();
        console.error = mock.fn();
        console.debug = mock.fn();
    });

    after(() => {
        // Restore console methods
        console.log = originalConsole.log;
        console.info = originalConsole.info;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
        console.debug = originalConsole.debug;
        setNodeEnv(originalEnv);
    });

    it('should log info messages correctly in development', (t) => {
        setNodeEnv('development');
        const mockInfo = console.info as any;
        mockInfo.mock.resetCalls();

        logger.info('Test message', { foo: 'bar' });

        assert.strictEqual(mockInfo.mock.calls.length, 1);
        const args = mockInfo.mock.calls[0].arguments;

        // Check prefix format: [ISOString] [INFO]
        assert.match(args[0], /^\[.*\] \[INFO\]$/);
        assert.strictEqual(args[1], 'Test message');
        assert.deepStrictEqual(args[2], { foo: 'bar' });
    });

    it('should log info messages correctly in production', (t) => {
        setNodeEnv('production');
        const mockInfo = console.info as any;
        mockInfo.mock.resetCalls();

        logger.info('Test message', { foo: 'bar' });

        assert.strictEqual(mockInfo.mock.calls.length, 1);
        const args = mockInfo.mock.calls[0].arguments;

        // In production, it should be a single JSON string
        const json = JSON.parse(args[0]);

        assert.strictEqual(json.level, 'info');
        assert.strictEqual(json.message, 'Test message');
        assert.deepStrictEqual(json.data, [{ foo: 'bar' }]);
        assert.ok(json.timestamp);
    });

    it('should log error messages correctly', (t) => {
        setNodeEnv('development');
        const mockError = console.error as any;
        mockError.mock.resetCalls();

        const error = new Error('Test error');
        logger.error('Something went wrong', error);

        assert.strictEqual(mockError.mock.calls.length, 1);
        const args = mockError.mock.calls[0].arguments;

        assert.match(args[0], /^\[.*\] \[ERROR\]$/);
        assert.strictEqual(args[1], 'Something went wrong');
        assert.strictEqual(args[2], error);
    });

    it('should log warn messages correctly', (t) => {
        setNodeEnv('development');
        const mockWarn = console.warn as any;
        mockWarn.mock.resetCalls();

        logger.warn('Warning message');

        assert.strictEqual(mockWarn.mock.calls.length, 1);
        const args = mockWarn.mock.calls[0].arguments;

        assert.match(args[0], /^\[.*\] \[WARN\]$/);
        assert.strictEqual(args[1], 'Warning message');
    });
});
