import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { validatePublicApiKeyRequest } from './public-api-auth';

describe('validatePublicApiKeyRequest', () => {
  let originalEnv: NodeJS.ProcessEnv;

  before(() => {
    originalEnv = { ...process.env };
    process.env.PUBLIC_TRACKING_API_KEY = 'tracking-secret';
    delete process.env.PUBLIC_TRACKING_API_KEYS;
  });

  after(() => {
    process.env = originalEnv;
  });

  it('accepts a bearer token', () => {
    const request = new NextRequest('http://localhost', {
      headers: { authorization: 'Bearer tracking-secret' },
    });

    assert.deepStrictEqual(validatePublicApiKeyRequest(request), { ok: true });
  });

  it('accepts x-api-key', () => {
    const request = new NextRequest('http://localhost', {
      headers: { 'x-api-key': 'tracking-secret' },
    });

    assert.deepStrictEqual(validatePublicApiKeyRequest(request), { ok: true });
  });

  it('rejects missing header', () => {
    const request = new NextRequest('http://localhost');

    assert.deepStrictEqual(validatePublicApiKeyRequest(request), { ok: false, reason: 'missing_header' });
  });

  it('rejects invalid key', () => {
    const request = new NextRequest('http://localhost', {
      headers: { authorization: 'Bearer wrong-secret' },
    });

    assert.deepStrictEqual(validatePublicApiKeyRequest(request), { ok: false, reason: 'invalid' });
  });

  it('accepts any configured key in PUBLIC_TRACKING_API_KEYS', () => {
    process.env.PUBLIC_TRACKING_API_KEYS = 'alpha-key, beta-key';
    delete process.env.PUBLIC_TRACKING_API_KEY;

    const request = new NextRequest('http://localhost', {
      headers: { authorization: 'Bearer beta-key' },
    });

    assert.deepStrictEqual(validatePublicApiKeyRequest(request), { ok: true });
  });

  it('fails closed when no key is configured', () => {
    delete process.env.PUBLIC_TRACKING_API_KEY;
    delete process.env.PUBLIC_TRACKING_API_KEYS;

    const request = new NextRequest('http://localhost', {
      headers: { authorization: 'Bearer tracking-secret' },
    });

    assert.deepStrictEqual(validatePublicApiKeyRequest(request), { ok: false, reason: 'missing_secret' });
  });
});