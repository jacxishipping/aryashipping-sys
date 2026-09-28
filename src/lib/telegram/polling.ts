import { telegramClient } from './client';
import { getTelegramBotConfig } from './config';
import { handleTelegramUpdate } from './handler';
import type { TelegramApiResponse, TelegramUpdate } from './types';

/**
 * Runs a long-polling loop for local development and direct bot execution.
 * Deletes any existing webhook so Telegram routes updates to getUpdates.
 */
export async function startTelegramPolling(options?: { verbose?: boolean }) {
  const config = await getTelegramBotConfig();
  if (!config.isConfigured) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not configured in .env');
    return;
  }

  // 1. Verify Bot
  const me = await telegramClient.getMe();
  if (!me.ok || !me.result) {
    console.error('❌ Failed to authenticate with Telegram:', me.description);
    return;
  }

  console.log(`🤖 Telegram Bot started: @${me.result.username} (${me.result.first_name})`);
  console.log('📡 Switching to direct long-polling mode...');

  // 2. Remove webhook to allow getUpdates
  await telegramClient.deleteWebhook(false);

  let offset = 0;
  let isRunning = true;

  const cleanup = () => {
    console.log('\n🛑 Stopping Telegram polling...');
    isRunning = false;
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  console.log('✅ Listening for Telegram messages in real-time!\n');

  while (isRunning) {
    try {
      const token = config.botToken;
      const url = `https://api.telegram.org/bot${token}/getUpdates`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offset,
          timeout: 25,
          allowed_updates: ['message', 'edited_message', 'callback_query'],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const data = (await res.json()) as TelegramApiResponse<TelegramUpdate[]>;

      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          const user = update.message?.from?.username || update.message?.from?.first_name || 'User';
          const text = update.message?.text || update.callback_query?.data || '(media/action)';
          console.log(`📩 Received from [${user}]: ${text}`);

          try {
            await handleTelegramUpdate(update);
            console.log(`   ✅ Replied to [${user}]`);
          } catch (err) {
            console.error(`   ❌ Error handling update:`, err);
          }
        }
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Polling connection error:', error?.message || error);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
