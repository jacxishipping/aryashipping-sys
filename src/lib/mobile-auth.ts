import { createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

type HeaderBag = Headers | Record<string, string | string[] | undefined> | null | undefined;

const MOBILE_AUTH_TOKEN_PREFIX = 'jacxi-mobile';
const MOBILE_AUTH_TTL_SECONDS = 30 * 24 * 60 * 60;

const mobileAuthUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  phone: true,
  loginCode: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type MobileAuthUser = Prisma.UserGetPayload<{
  select: typeof mobileAuthUserSelect;
}>;

type MobileTokenPayload = {
  sub: string;
  exp: number;
};

function getMobileAuthSecret(): string {
  const secret = process.env.MOBILE_AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET_2;

  if (!secret) {
    if (process.env.NODE_ENV === 'test' || !process.env.NODE_ENV) {
      return 'jacxi-default-secret-mobile-auth-token-fallback';
    }
    throw new Error('Missing mobile auth secret');
  }

  return secret;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payloadSegment: string): Buffer {
  return createHmac('sha256', getMobileAuthSecret()).update(payloadSegment).digest();
}

function extractHeaderValue(headers: HeaderBag, key: string): string | null {
  if (!headers) {
    return null;
  }

  if (headers instanceof Headers) {
    return headers.get(key);
  }

  const direct = headers[key] ?? headers[key.toLowerCase()];
  if (Array.isArray(direct)) {
    return direct[0] ?? null;
  }

  return typeof direct === 'string' ? direct : null;
}

function getRequestIp(headers: HeaderBag): string | null {
  const forwarded = extractHeaderValue(headers, 'x-forwarded-for');
  if (!forwarded) {
    return null;
  }

  const ip = forwarded.split(',')[0]?.trim();
  return ip || null;
}

function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token.trim();
}

async function getMobileAuthUserById(userId: string): Promise<MobileAuthUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: mobileAuthUserSelect,
  });
}

export async function enforceLoginRateLimit(headers: HeaderBag): Promise<boolean> {
  const ip = getRequestIp(headers);

  if (!ip) {
    return true;
  }

  const { success } = await checkRateLimit(ip);
  if (!success) {
    console.warn(`Login rate limit exceeded for IP: ${ip}`);
  }

  return success;
}

export async function authenticateWithEmailPassword(email: string, password: string): Promise<MobileAuthUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      ...mobileAuthUserSelect,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function authenticateWithLoginCode(loginCode: string): Promise<MobileAuthUser | null> {
  const code = loginCode.replace(/[\s\-_]/g, '').trim().toUpperCase();
  if (code.length !== 8) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      loginCode: {
        equals: code,
        mode: 'insensitive',
      },
    },
    select: mobileAuthUserSelect,
  });
}

export function toMobileUser(user: MobileAuthUser) {
  const mobileRole = (() => {
    switch ((user.role || '').toLowerCase()) {
      case 'admin':
        return 'ADMIN';
      case 'manager':
      case 'finance':
      case 'operations':
      case 'customer_service':
        return 'MANAGER';
      default:
        return 'USER';
    }
  })();

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    role: mobileRole,
    loginCode: user.loginCode ?? undefined,
    phone: user.phone ?? undefined,
    avatar: user.image ?? undefined,
    isActive: true,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function issueMobileAuthToken(user: MobileAuthUser): { token: string; expiresAt: string } {
  const exp = Math.floor(Date.now() / 1000) + MOBILE_AUTH_TTL_SECONDS;
  const payloadSegment = base64UrlEncode(JSON.stringify({ sub: user.id, exp } satisfies MobileTokenPayload));
  const signatureSegment = signPayload(payloadSegment).toString('base64url');

  return {
    token: `${MOBILE_AUTH_TOKEN_PREFIX}.${payloadSegment}.${signatureSegment}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export async function verifyMobileAuthToken(token: string | null) {
  if (!token) {
    return null;
  }

  const [prefix, payloadSegment, signatureSegment] = token.split('.');
  if (!prefix || !payloadSegment || !signatureSegment || prefix !== MOBILE_AUTH_TOKEN_PREFIX) {
    return null;
  }

  const expectedSignature = signPayload(payloadSegment);
  const actualSignature = Buffer.from(signatureSegment, 'base64url');
  if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) {
    return null;
  }

  let payload: MobileTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadSegment)) as MobileTokenPayload;
  } catch {
    return null;
  }

  if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const user = await getMobileAuthUserById(payload.sub);
  if (!user) {
    return null;
  }

  return {
    user: {
      id: user.id,
      name: user.name ?? user.email,
      email: user.email,
      image: user.image ?? undefined,
      role: user.role,
    },
    expires: new Date(payload.exp * 1000).toISOString(),
  };
}

export async function readMobileSessionFromAuthorizationHeader(authorizationHeader: string | null) {
  const token = parseBearerToken(authorizationHeader);
  return verifyMobileAuthToken(token);
}