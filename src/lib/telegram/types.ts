export type TelegramUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TelegramChat = {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  first_name?: string;
  last_name?: string;
  username?: string;
  title?: string;
};

export type TelegramWebAppInfo = {
  url: string;
};

export type TelegramInlineKeyboardButton = {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: TelegramWebAppInfo;
};

export type TelegramInlineKeyboardMarkup = {
  inline_keyboard: TelegramInlineKeyboardButton[][];
};

export type TelegramKeyboardButton = {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
  web_app?: TelegramWebAppInfo;
};

export type TelegramReplyKeyboardMarkup = {
  keyboard: TelegramKeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  is_persistent?: boolean;
};

export type TelegramReplyKeyboardRemove = {
  remove_keyboard: true;
  selective?: boolean;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  date: number;
  chat: TelegramChat;
  text?: string;
  caption?: string;
  reply_to_message?: TelegramMessage;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  inline_message_id?: string;
  chat_instance?: string;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramInputMediaPhoto = {
  type: 'photo';
  media: string;
  caption?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
};

export type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
};
