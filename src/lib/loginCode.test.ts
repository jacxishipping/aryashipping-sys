import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatLoginCode, isValidLoginCode, loginCodeToVoiceDigits } from './loginCode.ts';
import { generateLoginCode } from './loginCodeGenerator.ts';

describe('Login Code Generation', () => {
  it('should generate an 8-character string', () => {
    const code = generateLoginCode();
    assert.strictEqual(code.length, 8);
  });

  it('should only contain valid characters', () => {
    const code = generateLoginCode();
    // Valid characters are A-Z, 0-9, excluding O, 0, I, 1, l
    const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    assert.ok(validChars.test(code), `Code ${code} contains invalid characters`);
  });

  it('should generate different codes', () => {
    const code1 = generateLoginCode();
    const code2 = generateLoginCode();
    assert.notStrictEqual(code1, code2);
  });

  // Security test: Ensure randomness is cryptographically secure
  // We can't easily mock `node:crypto` in this environment as it is a built-in module
  // and we are running with `node --experimental-strip-types`.
  // However, we can assert that the function exists and is being used correctly by checking imports if we were parsing the file,
  // but for a runtime test, we rely on the behavior.
  // We can check that it doesn't return the same value repeatedly, which we did above.

  // To be absolutely sure, we can check if `Math.random` is NOT used by spying on it.
  it('should NOT use Math.random()', () => {
    const originalMathRandom = Math.random;
    let callCount = 0;
    Math.random = () => {
      callCount++;
      return 0.5; // Return a predictable value if called
    };

    try {
      generateLoginCode();
      assert.strictEqual(callCount, 0, 'Math.random() should not be called during secure code generation');
    } finally {
      Math.random = originalMathRandom;
    }
  });
});

describe('Login Code Validation', () => {
  it('should validate correct codes', () => {
    assert.strictEqual(isValidLoginCode('ABCDEFGH'), true);
    assert.strictEqual(isValidLoginCode('12345678'), true);
  });

  it('should invalidate incorrect lengths', () => {
    assert.strictEqual(isValidLoginCode('ABC'), false);
    assert.strictEqual(isValidLoginCode('ABCDEFGHI'), false);
  });

  it('should invalidate incorrect characters', () => {
    assert.strictEqual(isValidLoginCode('ABC-DEFG'), false);
    assert.strictEqual(isValidLoginCode('abcdefg'), false); // Case sensitive check in test, though function converts to upper case?
    // Wait, the function does `code.toUpperCase()`, so 'abcdefg' should be valid if it was 8 chars.
    // Let's re-read isValidLoginCode:
    // return validChars.test(code.toUpperCase());
    // So 'abcdefgh' should be true.

    assert.strictEqual(isValidLoginCode('abcdefgh'), true);
    assert.strictEqual(isValidLoginCode('ABCDEFG!'), false);
  });
});

describe('Login Code Formatting', () => {
  it('should format code with a space in the middle', () => {
    assert.strictEqual(formatLoginCode('ABCDEFGH'), 'ABCD EFGH');
  });

  it('should not format invalid length codes', () => {
    assert.strictEqual(formatLoginCode('ABC'), 'ABC');
  });
});

describe('Voice Keypad Mapping', () => {
  it('should map letters to standard phone keypad digits', () => {
    assert.strictEqual(loginCodeToVoiceDigits('ABCD1234'), '22231234');
  });

  it('should preserve numeric codes', () => {
    assert.strictEqual(loginCodeToVoiceDigits('12345678'), '12345678');
  });

  it('should return an empty string for invalid codes', () => {
    assert.strictEqual(loginCodeToVoiceDigits('BAD-CODE'), '');
  });
});
