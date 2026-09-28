import { getStoredCommunicationSettings } from '@/lib/communication-settings';

export type TelegramBotConfig = {
  botToken: string;
  botUsername?: string;
  webhookSecret?: string;
  appUrl: string;
  isConfigured: boolean;
};

export async function getTelegramBotConfig(): Promise<TelegramBotConfig> {
  const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  const envUsername = process.env.TELEGRAM_BOT_USERNAME?.trim() || '';
  const envSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || process.env.TELEGRAM_BOT_SECRET?.trim() || '';
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://jacxishipping.com'
  ).replace(/\/$/, '');

  if (envToken) {
    return {
      botToken: envToken,
      botUsername: envUsername || undefined,
      webhookSecret: envSecret || undefined,
      appUrl,
      isConfigured: true,
    };
  }

  // Fallback: check communication provider settings if configured in the database
  try {
    const settings = await getStoredCommunicationSettings();
    // We can also support custom parameters or fallback
  } catch {
    // Database might not be ready or settings table doesn't have telegram yet
  }

  return {
    botToken: '',
    botUsername: envUsername || undefined,
    webhookSecret: envSecret || undefined,
    appUrl,
    isConfigured: false,
  };
}

export function getWebhookUrl(appUrl: string): string {
  const cleanAppUrl = appUrl.replace(/\/$/, '');
  return `${cleanAppUrl}/api/telegram/webhook`;
}
