import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authenticateWithLoginCode,
  enforceLoginRateLimit,
  issueMobileAuthToken,
  toMobileUser,
} from '@/lib/mobile-auth';

const signInCodeSchema = z.object({
  loginCode: z.string().trim().min(8).max(8),
});

export async function POST(request: NextRequest) {
  try {
    const allowed = await enforceLoginRateLimit(request.headers);
    if (!allowed) {
      return NextResponse.json({ message: 'Too many login attempts. Please try again later.' }, { status: 429 });
    }

    const payload = signInCodeSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ message: 'Invalid login code' }, { status: 400 });
    }

    const user = await authenticateWithLoginCode(payload.data.loginCode);
    if (!user) {
      return NextResponse.json({ message: 'Invalid login code' }, { status: 401 });
    }

    const { token, expiresAt } = issueMobileAuthToken(user);

    return NextResponse.json({
      user: toMobileUser(user),
      token,
      expiresAt,
    });
  } catch (error) {
    console.error('Mobile login-code sign-in error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}