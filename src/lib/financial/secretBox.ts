import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTE_LENGTH = 12;
const TAG_BYTE_LENGTH = 16;

function getEncryptionKey() {
  const secret =
    process.env.BANK_PROVIDER_ENCRYPTION_KEY?.trim() ||
    process.env.FINICITY_ENCRYPTION_KEY?.trim() ||
    process.env.PLAID_ENCRYPTION_KEY?.trim();

  if (!secret) {
    throw new Error('BANK_PROVIDER_ENCRYPTION_KEY, FINICITY_ENCRYPTION_KEY, or PLAID_ENCRYPTION_KEY must be configured');
  }

  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plainText: string) {
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64url');
}

export function decryptSecret(cipherText: string) {
  const payload = Buffer.from(cipherText, 'base64url');
  const iv = payload.subarray(0, IV_BYTE_LENGTH);
  const authTag = payload.subarray(IV_BYTE_LENGTH, IV_BYTE_LENGTH + TAG_BYTE_LENGTH);
  const encrypted = payload.subarray(IV_BYTE_LENGTH + TAG_BYTE_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);

  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}