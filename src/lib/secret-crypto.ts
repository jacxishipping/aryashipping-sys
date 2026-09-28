import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ENCRYPTED_PREFIX = 'enc:v1:';

function getSecretKey() {
  const secret = process.env.SECRET_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret?.trim()) {
    return null;
  }

  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(value: string | null | undefined) {
  const plainText = value?.trim();
  if (!plainText) {
    return null;
  }

  if (plainText.startsWith(ENCRYPTED_PREFIX)) {
    return plainText;
  }

  const key = getSecretKey();
  if (!key) {
    return plainText;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('');
}

export function decryptSecret(value: string | null | undefined) {
  const storedValue = value?.trim();
  if (!storedValue) {
    return '';
  }

  if (!storedValue.startsWith(ENCRYPTED_PREFIX)) {
    return storedValue;
  }

  const key = getSecretKey();
  if (!key) {
    return '';
  }

  const encoded = storedValue.slice(ENCRYPTED_PREFIX.length);

  // encryptSecret joins [iv, tag, ciphertext] with '' (no separators), producing
  // fixed-width base64url segments: IV = 12 bytes -> 16 chars, tag = 16 bytes -> 22 chars.
  // Older/correct-format values may instead be colon-separated; support both.
  let ivText: string;
  let tagText: string;
  let encryptedText: string;
  if (encoded.includes(':')) {
    [ivText, tagText, encryptedText] = encoded.split(':');
  } else {
    ivText = encoded.slice(0, 16);
    tagText = encoded.slice(16, 38);
    encryptedText = encoded.slice(38);
  }
  if (!ivText || !tagText || !encryptedText) {
    return '';
  }

  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedText, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '';
  }
}
