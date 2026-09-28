import { randomInt } from 'node:crypto';

/**
 * Generates a random 8-character alphanumeric login code
 * Only uses uppercase letters and numbers to avoid confusion (no O/0, I/1/l)
 */
export function generateLoginCode(): string {
  // Exclude confusing characters: O, 0, I, 1, l
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < 8; i++) {
    const randomIndex = randomInt(0, chars.length);
    code += chars[randomIndex];
  }

  return code;
}
