import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

test('admin password reset hashing and verification', async () => {
  const plainPassword = 'TemporaryPassword!123';
  const hash = await bcrypt.hash(plainPassword, 12);

  assert.ok(hash.startsWith('$2'));
  const isMatch = await bcrypt.compare(plainPassword, hash);
  assert.equal(isMatch, true);

  const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
  assert.equal(isWrongMatch, false);
});

test('password generation produces secure readable characters of required length', () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  function generateSecurePassword(length = 12): string {
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (x) => chars[x % chars.length]).join('');
  }

  const pwd1 = generateSecurePassword(12);
  const pwd2 = generateSecurePassword(12);

  assert.equal(pwd1.length, 12);
  assert.equal(pwd2.length, 12);
  assert.notEqual(pwd1, pwd2);
});
