import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { issueMobileAuthToken, toMobileUser } from '@/lib/mobile-auth';
import { verifyTelegramWebAppData, setTelegramSessionCookies } from '@/lib/telegram/auth';
import { findUserByAccessCode, sanitizeAccessCode } from '@/lib/telegram/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { initData, accessCode } = body;

    if (!initData || typeof initData !== 'string') {
      return NextResponse.json({ error: 'Missing Telegram initData' }, { status: 400 });
    }

    if (!accessCode || typeof accessCode !== 'string') {
      return NextResponse.json({ error: 'Please enter your 8-digit access code' }, { status: 400 });
    }

    const verification = verifyTelegramWebAppData(initData);
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: 401 });
    }

    const tgUser = verification.user;
    const providerAccountId = String(tgUser.id);
    const sanitizedCode = sanitizeAccessCode(accessCode);

    if (sanitizedCode.length !== 8) {
      return NextResponse.json(
        { error: 'Access code must be 8 alphanumeric characters or digits (e.g. 83492019 or JACX1234)' },
        { status: 400 }
      );
    }

    const matchedUser = await findUserByAccessCode(sanitizedCode);
    if (!matchedUser) {
      return NextResponse.json(
        { error: `The access code "${sanitizedCode}" was not found. Please verify your invoice or portal code.` },
        { status: 404 }
      );
    }

    // Link the Telegram Account in the database
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'telegram',
          providerAccountId,
        },
      },
      update: {
        userId: matchedUser.id,
        session_state: JSON.stringify({
          username: tgUser.username,
          first_name: tgUser.first_name,
          linkedAt: Date.now(),
        }),
      },
      create: {
        userId: matchedUser.id,
        provider: 'telegram',
        providerAccountId,
        type: 'telegram_webapp',
        session_state: JSON.stringify({
          username: tgUser.username,
          first_name: tgUser.first_name,
          linkedAt: Date.now(),
        }),
      },
    });

    // Fetch full user record to issue token
    const fullUser = await prisma.user.findUnique({
      where: { id: matchedUser.id },
    });

    if (!fullUser) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const { token, expiresAt } = issueMobileAuthToken(fullUser);

    const response = NextResponse.json({
      ok: true,
      linked: true,
      message: 'Telegram account successfully linked!',
      user: toMobileUser(fullUser),
      token,
      expiresAt,
    });

    await setTelegramSessionCookies(response, fullUser, token);
    return response;
  } catch (error) {
    console.error('Telegram WebApp link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
