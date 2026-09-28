import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBotConfig } from '@/lib/telegram/config';
import { handleTelegramUpdate } from '@/lib/telegram/handler';
import type { TelegramUpdate } from '@/lib/telegram/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const config = await getTelegramBotConfig();

    // Verify secret token if configured
    if (config.webhookSecret) {
      const secretHeader = request.headers.get('x-telegram-bot-api-secret-token')?.trim();
      if (secretHeader !== config.webhookSecret) {
        console.warn('Telegram webhook rejected: invalid secret token');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload = (await request.json()) as TelegramUpdate;

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Process update
    const result = await handleTelegramUpdate(payload);

    return NextResponse.json({ ok: result.ok, action: result.action });
  } catch (error) {
    console.error('Telegram webhook runtime error:', error);
    // Return 200 to avoid Telegram retry storms on unrecoverable logic errors
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Jacxi Shipping Telegram Bot Webhook',
    timestamp: new Date().toISOString(),
  });
}
