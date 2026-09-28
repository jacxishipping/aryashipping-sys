import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { issueMobileAuthToken, type MobileAuthUser } from '@/lib/mobile-auth';
import type { TelegramLinkedUser } from './session';

export type TelegramWebUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
};

export type VerifyTelegramDataResult =
  | { ok: true; user: TelegramWebUser; authDate: number }
  | { ok: false; error: string };

/**
 * Validates Telegram Mini App initData according to Telegram's HMAC-SHA256 specification.
 */
export function verifyTelegramWebAppData(initData: string, explicitBotToken?: string): VerifyTelegramDataResult {
  if (!initData || typeof initData !== 'string') {
    return { ok: false, error: 'Empty initData provided' };
  }

  const botToken = (explicitBotToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!botToken) {
    return { ok: false, error: 'Telegram bot token is not configured' };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      return { ok: false, error: 'Missing hash in initData' };
    }
    params.delete('hash');

    const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash.toLowerCase() !== hash.toLowerCase()) {
      return { ok: false, error: 'Hash mismatch: invalid Telegram signature' };
    }

    const authDateStr = params.get('auth_date');
    const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Validate auth_date isn't older than 24 hours (86400s) to prevent replay attacks
    if (authDate > 0 && nowSeconds - authDate > 86400) {
      return { ok: false, error: 'initData has expired (older than 24 hours)' };
    }

    const userStr = params.get('user');
    if (!userStr) {
      return { ok: false, error: 'No user information found in initData' };
    }

    const user = JSON.parse(userStr) as TelegramWebUser;
    return { ok: true, user, authDate };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Error parsing initData' };
  }
}

/**
 * Builds a seamless Telegram Mini App URL with an embedded, time-limited bridge token
 * so users opening the Mini App from the Telegram bot are logged in instantly.
 */
export function buildTelegramMiniAppUrl(
  targetPath: string,
  user?: TelegramLinkedUser | MobileAuthUser,
  appUrl?: string
): string {
  const base = (
    appUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    'https://www.jacxishipping.com'
  ).replace(/\/$/, '');

  const normalizedTarget = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;

  if (!user) {
    return `${base}/telegram-app?target=${encodeURIComponent(normalizedTarget)}`;
  }

  // Cast user to MobileAuthUser structure expected by issueMobileAuthToken
  const mobileUser: MobileAuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: null,
    role: user.role,
    phone: user.phone,
    loginCode: user.loginCode,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const { token } = issueMobileAuthToken(mobileUser);
  return `${base}/telegram-app?target=${encodeURIComponent(normalizedTarget)}&token=${encodeURIComponent(token)}`;
}

/**
 * Sets both the Telegram mobile session cookie and NextAuth JWT session cookie
 * so users opening the Telegram Mini App or WebApp are instantly authenticated across
 * all client components (useSession, ProtectedRoute) and server components (auth()).
 */
export async function setTelegramSessionCookies(
  response: NextResponse,
  user: { id: string; name?: string | null; email: string; role?: string; image?: string | null },
  token: string
) {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Set jacxi_session_token cookie
  response.cookies.set('jacxi_session_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // 2. Set NextAuth session cookie
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET_2;
    if (secret) {
      const cookieName = `${isProduction ? '__Secure-' : ''}next-auth.session-token`;
      const nextAuthToken = await encode({
        token: {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email,
          role: String(user.role || 'user').trim().toLowerCase(),
          image: user.image ?? undefined,
          sub: user.id,
        },
        secret,
        salt: cookieName,
        maxAge: 30 * 24 * 60 * 60,
      });

      response.cookies.set(cookieName, nextAuthToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });
    }
  } catch (error) {
    console.error('Failed to issue NextAuth token for Telegram session:', error);
  }
}
