import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { validateCronRequest } from './cron-auth.ts';

// Mock NextRequest and Headers if needed
// Assuming node_modules/next/server.js is correctly mocked

describe('validateCronRequest', () => {
    let originalEnv: NodeJS.ProcessEnv;

    before(() => {
        originalEnv = { ...process.env };
        process.env.CRON_SECRET = 'super-secret-key';
    });

    after(() => {
        process.env = originalEnv;
    });

    it('should return true for valid authorization header', () => {
        const req = new NextRequest('http://localhost', {
            headers: { authorization: 'Bearer super-secret-key' }
        });
        assert.strictEqual(validateCronRequest(req), true);
    });

    it('should return false for missing authorization header', () => {
        const req = new NextRequest('http://localhost', {
            headers: {}
        });
        assert.strictEqual(validateCronRequest(req), false);
    });

    it('should return false for invalid authorization header', () => {
        const req = new NextRequest('http://localhost', {
            headers: { authorization: 'Bearer wrong-key' }
        });
        assert.strictEqual(validateCronRequest(req), false);
    });

    it('should return false for malformed authorization header', () => {
        const req = new NextRequest('http://localhost', {
            headers: { authorization: 'Basic super-secret-key' }
        });
        assert.strictEqual(validateCronRequest(req), false);
    });

    it('should return false if CRON_SECRET is not set', () => {
        delete process.env.CRON_SECRET;
        const req = new NextRequest('http://localhost', {
            headers: { authorization: 'Bearer super-secret-key' }
        });
        assert.strictEqual(validateCronRequest(req), false);
        process.env.CRON_SECRET = 'super-secret-key'; // Restore
    });

    it('should return false if CRON_SECRET is empty string', () => {
        process.env.CRON_SECRET = '';
        const req = new NextRequest('http://localhost', {
            headers: { authorization: 'Bearer ' }
        });
        assert.strictEqual(validateCronRequest(req), false);
        process.env.CRON_SECRET = 'super-secret-key'; // Restore
    });

    it('should be resilient to timing attacks (basic check)', () => {
        const secret = 'super-secret-key';
        process.env.CRON_SECRET = secret;

        // Very simplistic check, just verifying functionality not strict timing
        const req1 = new NextRequest('http://localhost', {
            headers: { authorization: `Bearer ${secret}` }
        });
        assert.strictEqual(validateCronRequest(req1), true);

        const req2 = new NextRequest('http://localhost', {
            headers: { authorization: `Bearer ${secret}extra` }
        });
        assert.strictEqual(validateCronRequest(req2), false);
    });
});
