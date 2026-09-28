import { getTelegramBotConfig } from './config';
import type {
  TelegramApiResponse,
  TelegramInlineKeyboardMarkup,
  TelegramInputMediaPhoto,
  TelegramMessage,
  TelegramReplyKeyboardMarkup,
  TelegramReplyKeyboardRemove,
  TelegramUser,
} from './types';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

export class TelegramClient {
  private token: string;

  constructor(token?: string) {
    this.token = token || '';
  }

  private async getToken(): Promise<string> {
    if (this.token) return this.token;
    const config = await getTelegramBotConfig();
    return config.botToken;
  }

  private async request<T>(method: string, payload?: Record<string, unknown>): Promise<TelegramApiResponse<T>> {
    const token = await this.getToken();
    if (!token) {
      return {
        ok: false,
        description: 'Telegram Bot Token is not configured. Please set TELEGRAM_BOT_TOKEN environment variable.',
      };
    }

    const url = `${TELEGRAM_API_BASE}/bot${token}/${method}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = (await response.json()) as TelegramApiResponse<T>;
      return data;
    } catch (error) {
      clearTimeout(timeout);
      return {
        ok: false,
        description: error instanceof Error ? error.message : 'Unknown network error communicating with Telegram API',
      };
    }
  }

  async getMe(): Promise<TelegramApiResponse<TelegramUser>> {
    return this.request<TelegramUser>('getMe');
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    options?: {
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      reply_markup?: TelegramInlineKeyboardMarkup | TelegramReplyKeyboardMarkup | TelegramReplyKeyboardRemove;
      disable_web_page_preview?: boolean;
    }
  ): Promise<TelegramApiResponse<TelegramMessage>> {
    return this.request<TelegramMessage>('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode ?? 'HTML',
      reply_markup: options?.reply_markup,
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
    });
  }

  async editMessageText(
    chatId: number | string,
    messageId: number,
    text: string,
    options?: {
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      reply_markup?: TelegramInlineKeyboardMarkup;
      disable_web_page_preview?: boolean;
    }
  ): Promise<TelegramApiResponse<TelegramMessage>> {
    return this.request<TelegramMessage>('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options?.parse_mode ?? 'HTML',
      reply_markup: options?.reply_markup,
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
    });
  }

  async editMessageCaption(
    chatId: number | string,
    messageId: number,
    caption?: string,
    options?: {
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      reply_markup?: TelegramInlineKeyboardMarkup;
    }
  ): Promise<TelegramApiResponse<TelegramMessage>> {
    return this.request<TelegramMessage>('editMessageCaption', {
      chat_id: chatId,
      message_id: messageId,
      caption,
      parse_mode: options?.parse_mode ?? 'HTML',
      reply_markup: options?.reply_markup,
    });
  }

  async deleteMessage(
    chatId: number | string,
    messageId: number
  ): Promise<TelegramApiResponse<boolean>> {
    return this.request<boolean>('deleteMessage', {
      chat_id: chatId,
      message_id: messageId,
    });
  }

  async sendPhoto(
    chatId: number | string,
    photoUrl: string,
    options?: {
      caption?: string;
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      reply_markup?: TelegramInlineKeyboardMarkup | TelegramReplyKeyboardMarkup | TelegramReplyKeyboardRemove;
    }
  ): Promise<TelegramApiResponse<TelegramMessage>> {
    return this.request<TelegramMessage>('sendPhoto', {
      chat_id: chatId,
      photo: photoUrl,
      caption: options?.caption,
      parse_mode: options?.parse_mode ?? 'HTML',
      reply_markup: options?.reply_markup,
    });
  }

  async sendMediaGroup(
    chatId: number | string,
    media: TelegramInputMediaPhoto[]
  ): Promise<TelegramApiResponse<TelegramMessage[]>> {
    return this.request<TelegramMessage[]>('sendMediaGroup', {
      chat_id: chatId,
      media,
    });
  }

  async sendChatAction(
    chatId: number | string,
    action: 'typing' | 'upload_photo' | 'record_video' | 'upload_document' | 'choose_sticker' | 'find_location'
  ): Promise<TelegramApiResponse<boolean>> {
    return this.request<boolean>('sendChatAction', {
      chat_id: chatId,
      action,
    });
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    options?: {
      text?: string;
      show_alert?: boolean;
      url?: string;
    }
  ): Promise<TelegramApiResponse<boolean>> {
    return this.request<boolean>('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text: options?.text,
      show_alert: options?.show_alert,
      url: options?.url,
    });
  }

  async setWebhook(
    url: string,
    secretToken?: string
  ): Promise<TelegramApiResponse<boolean>> {
    return this.request<boolean>('setWebhook', {
      url,
      secret_token: secretToken,
      allowed_updates: ['message', 'edited_message', 'callback_query'],
      drop_pending_updates: false,
    });
  }

  async getWebhookInfo(): Promise<TelegramApiResponse<{
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    ip_address?: string;
    last_error_date?: number;
    last_error_message?: string;
    max_connections?: number;
    allowed_updates?: string[];
  }>> {
    return this.request('getWebhookInfo');
  }

  async deleteWebhook(dropPendingUpdates = false): Promise<TelegramApiResponse<boolean>> {
    return this.request<boolean>('deleteWebhook', {
      drop_pending_updates: dropPendingUpdates,
    });
  }

  async setChatMenuButton(
    menuButton?: { type: 'default' | 'commands' } | { type: 'web_app'; text: string; web_app: { url: string } }
  ): Promise<TelegramApiResponse<boolean>> {
    return this.request<boolean>('setChatMenuButton', {
      menu_button: menuButton,
    });
  }

  async getChatMenuButton(chatId?: number): Promise<TelegramApiResponse<unknown>> {
    return this.request('getChatMenuButton', chatId ? { chat_id: chatId } : undefined);
  }
}

export const telegramClient = new TelegramClient();
