/**
 * Validates a login code format
 */
export function isValidLoginCode(code: string): boolean {
  if (!code || code.length !== 8) {
    return false;
  }
  
  // Check if it only contains valid characters
  const validChars = /^[A-Z0-9]+$/;
  return validChars.test(code.toUpperCase());
}

const phoneKeypadMap: Record<string, string> = {
  A: '2',
  B: '2',
  C: '2',
  D: '3',
  E: '3',
  F: '3',
  G: '4',
  H: '4',
  I: '4',
  J: '5',
  K: '5',
  L: '5',
  M: '6',
  N: '6',
  O: '6',
  P: '7',
  Q: '7',
  R: '7',
  S: '7',
  T: '8',
  U: '8',
  V: '8',
  W: '9',
  X: '9',
  Y: '9',
  Z: '9',
};

export function loginCodeToVoiceDigits(code: string): string {
  if (!isValidLoginCode(code)) {
    return '';
  }

  return code
    .toUpperCase()
    .split('')
    .map((char) => (/\d/.test(char) ? char : phoneKeypadMap[char] || ''))
    .join('');
}

/**
 * Formats a login code for display (adds spaces for readability)
 * Example: "ABCD1234" -> "ABCD 1234"
 */
export function formatLoginCode(code: string): string {
  if (!code || code.length !== 8) {
    return code;
  }
  
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}
