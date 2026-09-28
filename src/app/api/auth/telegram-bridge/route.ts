import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileAuthToken } from '@/lib/mobile-auth';
import { setTelegramSessionCookies } from '@/lib/telegram/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const target = request.nextUrl.searchParams.get('target') || '/dashboard';

  if (!token) {
    // If no token provided, simply redirect to the target page or signin
    const redirectUrl = new URL(target, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  const session = await verifyMobileAuthToken(token);
  if (!session) {
    const loginUrl = new URL('/telegram-app', request.url);
    loginUrl.searchParams.set('target', target);
    loginUrl.searchParams.set('error', 'invalid_token');
    return NextResponse.redirect(loginUrl);
  }

  const redirectUrl = new URL(target.startsWith('/') ? target : `/${target}`, request.url);
  const response = NextResponse.redirect(redirectUrl);
  await setTelegramSessionCookies(response, session.user, token);
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = body.token || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const target = body.target || '/dashboard';

    if (!token) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 400 });
    }

    const session = await verifyMobileAuthToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session token' }, { status: 401 });
    }

    const response = NextResponse.json({
      ok: true,
      user: session.user,
      target,
    });

    await setTelegramSessionCookies(response, session.user, token);
    return response;
  } catch (error) {
    console.error('Telegram bridge error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
