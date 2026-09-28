import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { verifySignature } from './webhook-auth.ts';

describe('verifySignature', () => {
  const secret = 'test-secret';
  const body = JSON.stringify({ message: 'Hello World' });
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  it('should return true for valid signature', () => {
    const isValid = verifySignature(validSignature, body, secret);
    assert.strictEqual(isValid, true);
  });

  it('should return false for invalid signature', () => {
    const invalidSignature = 'invalid-signature';
    const isValid = verifySignature(invalidSignature, body, secret);
    assert.strictEqual(isValid, false);
  });

  it('should return false for tampered body', () => {
    const tamperedBody = JSON.stringify({ message: 'Hello World!' });
    const isValid = verifySignature(validSignature, tamperedBody, secret);
    assert.strictEqual(isValid, false);
  });

  it('should return false for different secret', () => {
    const differentSecret = 'different-secret';
    const isValid = verifySignature(validSignature, body, differentSecret);
    assert.strictEqual(isValid, false);
  });

  it('should return false if signature is missing', () => {
    const isValid = verifySignature('', body, secret);
    assert.strictEqual(isValid, false);
  });

  it('should return false if body is missing', () => {
    const isValid = verifySignature(validSignature, '', secret);
    assert.strictEqual(isValid, false);
  });

  it('should return false if secret is missing', () => {
    const isValid = verifySignature(validSignature, body, '');
    assert.strictEqual(isValid, false);
  });
});
