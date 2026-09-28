import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { telegramClient } from '@/lib/telegram/client';
import { getTelegramBotConfig, getWebhookUrl } from '@/lib/telegram/config';

export const dynamic = 'force-dynamic';

async function checkAuth(request: NextRequest) {
  // Check admin session
  const session = await auth();
  if (session?.user && session.user.role === 'admin') {
    return true;
  }

  // Check setup key if passed via header or query
  const setupKey = request.headers.get('x-setup-key') || request.nextUrl.searchParams.get('key');
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET;
  if (setupKey && cronSecret && setupKey === cronSecret) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await checkAuth(request);
    const config = await getTelegramBotConfig();

    if (!config.isConfigured) {
      return NextResponse.json({
        configured: false,
        message: 'Telegram Bot Token is not set. Please set TELEGRAM_BOT_TOKEN in your environment variables.',
      });
    }

    const [meResponse, webhookInfoResponse] = await Promise.all([
      telegramClient.getMe(),
      telegramClient.getWebhookInfo(),
    ]);

    return NextResponse.json({
      configured: true,
      bot: meResponse.ok ? meResponse.result : { error: meResponse.description },
      webhookInfo: webhookInfoResponse.ok ? webhookInfoResponse.result : { error: webhookInfoResponse.description },
      expectedWebhookUrl: getWebhookUrl(config.appUrl),
      isAuthorized,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve Telegram bot status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuthorized = await checkAuth(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized. Admin access or secret key required.' }, { status: 401 });
    }

    const config = await getTelegramBotConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        { error: 'TELEGRAM_BOT_TOKEN is not configured in environment variables.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const webhookUrl = body.url?.trim() || getWebhookUrl(config.appUrl);
    const secretToken = body.secretToken?.trim() || config.webhookSecret;

    const result = await telegramClient.setWebhook(webhookUrl, secretToken);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.description || 'Failed to register webhook with Telegram API' },
        { status: 400 }
      );
    }

    // Also configure the default chat menu button to launch the Telegram Mini App
    const menuAppUrl = `${config.appUrl}/telegram-app`;
    await telegramClient.setChatMenuButton({
      type: 'web_app',
      text: '🚀 Jacxi Portal',
      web_app: { url: menuAppUrl },
    }).catch(() => null);

    const webhookInfo = await telegramClient.getWebhookInfo();

    return NextResponse.json({
      success: true,
      message: `Webhook successfully registered to ${webhookUrl}`,
      webhookInfo: webhookInfo.result,
      miniAppUrl: menuAppUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error registering Telegram webhook' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAuthorized = await checkAuth(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const result = await telegramClient.deleteWebhook(true);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.description || 'Failed to remove webhook' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Telegram webhook removed successfully.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error removing Telegram webhook' },
      { status: 500 }
    );
  }
}
