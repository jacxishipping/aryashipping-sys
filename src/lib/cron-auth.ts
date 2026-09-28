import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Validates that the request is authorized for cron jobs.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param request The incoming NextRequest
 * @returns boolean indicating if the request is authorized
 */
export function validateCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET ?? process.env.CRON_SECRET_2;

  // Fail closed if secret is missing or empty
  if (!cronSecret) {
    console.error('CRON_SECRET is not set');
    return false;
  }

  // Fail closed if auth header is missing
  if (!authHeader) {
    return false;
  }

  const expectedAuth = `Bearer ${cronSecret}`;

  try {
    // Convert to buffers for constant-time comparison
    const a = Buffer.from(authHeader);
    const b = Buffer.from(expectedAuth);

    // Check length first to avoid error in timingSafeEqual
    if (a.length !== b.length) {
        return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch (error) {
    // Catch any encoding errors
    return false;
  }
}
