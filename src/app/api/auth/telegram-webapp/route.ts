import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { issueMobileAuthToken, toMobileUser } from '@/lib/mobile-auth';
import { verifyTelegramWebAppData, setTelegramSessionCookies } from '@/lib/telegram/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const initData = body.initData;

    if (!initData || typeof initData !== 'string') {
      return NextResponse.json({ error: 'Missing Telegram initData' }, { status: 400 });
    }

    const verification = verifyTelegramWebAppData(initData);
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: 401 });
    }

    const tgUser = verification.user;
    const providerAccountId = String(tgUser.id);

    // Look up user linked to this Telegram user ID
    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'telegram',
          providerAccountId,
        },
      },
      include: {
        user: true,
      },
    });

    if (account?.user) {
      const { token, expiresAt } = issueMobileAuthToken(account.user);

      const response = NextResponse.json({
        ok: true,
        linked: true,
        user: toMobileUser(account.user),
        token,
        expiresAt,
      });

      await setTelegramSessionCookies(response, account.user, token);
      return response;
    }

    // Telegram user is verified, but not yet linked to a Jacxi customer account
    return NextResponse.json({
      ok: true,
      linked: false,
      telegramUser: {
        id: tgUser.id,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
      },
    });
  } catch (error) {
    console.error('Telegram WebApp auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
