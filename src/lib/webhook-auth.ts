import crypto from 'crypto';

/**
 * Verifies the webhook signature using HMAC-SHA256.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param signature The signature from the x-webhook-signature header.
 * @param body The raw request body as a string.
 * @param secret The webhook secret used to sign the payload.
 * @returns boolean indicating if the signature is valid.
 */
export function verifySignature(signature: string, body: string, secret: string): boolean {
  if (!signature || !body || !secret) {
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(body).digest('hex');

    const signatureBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);

    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}
