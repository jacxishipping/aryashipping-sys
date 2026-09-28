import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authenticateWithEmailPassword,
  enforceLoginRateLimit,
  issueMobileAuthToken,
  toMobileUser,
} from '@/lib/mobile-auth';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const allowed = await enforceLoginRateLimit(request.headers);
    if (!allowed) {
      return NextResponse.json({ message: 'Too many login attempts. Please try again later.' }, { status: 429 });
    }

    const payload = signInSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 400 });
    }

    const user = await authenticateWithEmailPassword(payload.data.email, payload.data.password);
    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    const { token, expiresAt } = issueMobileAuthToken(user);

    return NextResponse.json({
      user: toMobileUser(user),
      token,
      expiresAt,
    });
  } catch (error) {
    console.error('Mobile sign-in error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}