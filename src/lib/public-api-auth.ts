import crypto from 'crypto';
import { NextRequest } from 'next/server';

type PublicApiAuthResult = {
  ok: boolean;
  reason?: 'missing_secret' | 'missing_header' | 'invalid';
};

function getConfiguredApiKeys() {
  const combined = [process.env.PUBLIC_TRACKING_API_KEYS, process.env.PUBLIC_TRACKING_API_KEY]
    .filter(Boolean)
    .join(',');

  return combined
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function getPresentedApiKey(request: NextRequest) {
  const xApiKey = request.headers.get('x-api-key')?.trim();
  if (xApiKey) {
    return xApiKey;
  }

  const authHeader = request.headers.get('authorization')?.trim();
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token.trim() || null;
}

function timingSafeMatch(left: string, right: string) {
  try {
    const a = Buffer.from(left);
    const b = Buffer.from(right);

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function validatePublicApiKeyRequest(request: NextRequest): PublicApiAuthResult {
  const configuredKeys = getConfiguredApiKeys();
  if (configuredKeys.length === 0) {
    return { ok: false, reason: 'missing_secret' };
  }

  const presentedKey = getPresentedApiKey(request);
  if (!presentedKey) {
    return { ok: false, reason: 'missing_header' };
  }

  const matched = configuredKeys.some((key) => timingSafeMatch(presentedKey, key));
  if (!matched) {
    return { ok: false, reason: 'invalid' };
  }

  return { ok: true };
}