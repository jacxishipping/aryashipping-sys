import { telegramClient } from './client';
import {
  escapeHtml,
  formatFinanceTelegramMessage,
  formatPortFlag,
  formatProgressBar,
  formatShipmentHeroCard,
  formatShipmentListItem,
  buildShipmentHeroKeyboard,
  getCustomerFinanceOverview,
  getCustomerShipmentByIdOrVin,
  getCustomerShipments,
  type TelegramShipmentSummary,
} from './services';
import {
  findUserByAccessCode,
  getTelegramSessionUser,
  linkTelegramSession,
  sanitizeAccessCode,
  unlinkTelegramSession,
  type TelegramLinkedUser,
} from './session';
import { buildTelegramMiniAppUrl } from './auth';
import type {
  TelegramCallbackQuery,
  TelegramInlineKeyboardButton,
  TelegramInlineKeyboardMarkup,
  TelegramInputMediaPhoto,
  TelegramMessage,
  TelegramReplyKeyboardMarkup,
  TelegramUpdate,
} from './types';
import { buildTrackingResponse } from '@/lib/tracking-response';

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'https://www.jacxishipping.com'
).replace(/\/$/, '');

export const MAIN_MENU_KEYBOARD: TelegramReplyKeyboardMarkup = {
  keyboard: [
    [{ text: '📦 My Shipments' }, { text: '📸 Vehicle Photos' }],
    [{ text: '💰 Finance & Invoices' }, { text: '📍 Live Tracking' }],
    [{ text: 'ℹ️ My Account' }, { text: '🚪 Logout' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

export const AUTH_PROMPT_KEYBOARD: TelegramReplyKeyboardMarkup = {
  keyboard: [
    [{ text: '🔑 Enter Access Code' }, { text: '❓ How to find my code' }],
    [{ text: '📞 Contact Support' }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
};

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<{ ok: boolean; action?: string }> {
  try {
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return { ok: true, action: 'callback_query' };
    }

    if (update.message) {
      await handleMessage(update.message);
      return { ok: true, action: 'message' };
    }

    return { ok: true, action: 'ignored' };
  } catch (error) {
    console.error('Error handling Telegram update:', error);
    return { ok: false, action: 'error' };
  }
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const rawText = (message.text || '').trim();
  const lowerText = rawText.toLowerCase();

  // Check if chat is already authenticated
  const user = await getTelegramSessionUser(chatId);

  // If not authenticated, handle login and auth flow
  if (!user) {
    await handleUnauthenticatedMessage(message, rawText);
    return;
  }

  // User is authenticated, handle authenticated commands and menu items
  if (lowerText === '/start' || lowerText === 'menu' || lowerText === '/menu') {
    await sendAuthenticatedWelcome(chatId, user);
    return;
  }

  if (lowerText === '📦 my shipments' || lowerText === '/shipments') {
    await sendShipmentsCarousel(chatId, user, 0);
    return;
  }

  if (lowerText === '📸 vehicle photos' || lowerText === '📸 photos' || lowerText === '/photos') {
    await sendPhotosMenu(chatId, user);
    return;
  }

  if (lowerText === '💰 finance & invoices' || lowerText === '💰 finance' || lowerText === '/finance') {
    await sendFinanceSummary(chatId, user);
    return;
  }

  if (lowerText === '📍 live tracking' || lowerText === '/track') {
    await sendTrackingPrompt(chatId, user);
    return;
  }

  if (lowerText === 'ℹ️ my account' || lowerText === '/account' || lowerText === '/profile') {
    await sendAccountInfo(chatId, user);
    return;
  }

  if (lowerText === '🚪 logout' || lowerText === '/logout') {
    await unlinkTelegramSession(chatId);
    await telegramClient.sendMessage(
      chatId,
      '🔒 <b>You have been logged out.</b>\n\nYour Telegram session has been disconnected from your Jacxi account. To log back in anytime, enter your 8-digit access code.',
      {
        parse_mode: 'HTML',
        reply_markup: {
          remove_keyboard: true,
        },
      }
    );
    return;
  }

  if (lowerText === '/help' || lowerText === 'help') {
    await sendHelpMessage(chatId, true);
    return;
  }

  // Check if message is a VIN or Container number search
  const isPossibleVinOrContainer = /^[A-Z0-9]{5,20}$/i.test(rawText.replace(/[\s-]/g, ''));
  if (isPossibleVinOrContainer) {
    await handleSearchQuery(chatId, user, rawText);
    return;
  }

  // Default reply for unrecognized text
  await telegramClient.sendMessage(
    chatId,
    `I didn't quite catch that. Please use the menu buttons below or type a <b>VIN</b> / <b>Container number</b> to track your shipment.`,
    {
      parse_mode: 'HTML',
      reply_markup: MAIN_MENU_KEYBOARD,
    }
  );
}

async function handleUnauthenticatedMessage(message: TelegramMessage, rawText: string): Promise<void> {
  const chatId = message.chat.id;
  const lowerText = rawText.toLowerCase();
  const username = message.from?.username;

  if (lowerText === '🔑 enter access code' || lowerText === 'enter access code') {
    await telegramClient.sendMessage(
      chatId,
      [
        '🔑 <b>Please enter your 8-digit Access Code:</b>',
        '━━━━━━━━━━━━━━━━━━━━━',
        'Type or paste your code directly into this chat (e.g. <code>83492019</code> or <code>JACX1234</code>).',
        '',
        '💡 <i>Tip: Tap "❓ How to find my code" if you need help finding your code.</i>',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: AUTH_PROMPT_KEYBOARD,
      }
    );
    return;
  }

  if (lowerText === '❓ how to find my code') {
    await telegramClient.sendMessage(
      chatId,
      [
        '🔑 <b>How to find your 8-digit Access Code:</b>',
        '━━━━━━━━━━━━━━━━━━━━━',
        '1. Log into the <b>Jacxi Portal</b> (web or mobile app).',
        '2. Open your <b>Profile / Settings</b> page.',
        '3. Your unique <b>Access Code</b> (e.g. <code>JACX1234</code> or <code>83492019</code>) is shown there.',
        '4. You can also find your access code on your shipment invoices and booking confirmations.',
        '',
        '👉 Simply type or paste your <b>8-digit code</b> directly here in the chat to login!',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: AUTH_PROMPT_KEYBOARD,
      }
    );
    return;
  }

  if (lowerText === '📞 contact support') {
    await telegramClient.sendMessage(
      chatId,
      [
        '📞 <b>Jacxi Shipping Customer Care:</b>',
        '━━━━━━━━━━━━━━━━━━━━━',
        `🌐 <b>Website:</b> ${APP_URL}`,
        '📧 <b>Email:</b> support@jacxishipping.com',
        '🕒 <b>Support Hours:</b> Mon - Sat (8:00 AM - 7:00 PM)',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: AUTH_PROMPT_KEYBOARD,
      }
    );
    return;
  }

  // Check if text is or contains an 8-character access code
  let candidateCode = sanitizeAccessCode(rawText);
  if (candidateCode.length !== 8) {
    const codeMatch = rawText.match(/\b([A-Za-z0-9]{4}[-\s]?[A-Za-z0-9]{4})\b/) || rawText.match(/\b([A-Za-z0-9]{8})\b/);
    if (codeMatch) {
      candidateCode = sanitizeAccessCode(codeMatch[1]);
    }
  }

  if (candidateCode.length === 8) {
    const matchedUser = await findUserByAccessCode(candidateCode);
    if (matchedUser) {
      await linkTelegramSession(chatId, matchedUser, username);
      await telegramClient.sendMessage(
        chatId,
        [
          `🎉 <b>Welcome, ${escapeHtml(matchedUser.name || matchedUser.email)}!</b>`,
          '━━━━━━━━━━━━━━━━━━━━━',
          '✅ <b>Authentication Successful!</b> Your Telegram is now securely linked with your Jacxi Shipping account.',
          '',
          `👤 <b>Customer:</b> ${escapeHtml(matchedUser.name || 'Account Holder')}`,
          `📧 <b>Email:</b> ${escapeHtml(matchedUser.email)}`,
          `🔑 <b>Access Code:</b> <code>${matchedUser.loginCode || candidateCode}</code>`,
          '',
          'Use the options below to browse your vehicle cards, view high-res arrival photos, check live container status, and inspect invoices.',
        ].join('\n'),
        {
          parse_mode: 'HTML',
          reply_markup: MAIN_MENU_KEYBOARD,
        }
      );

      // Auto-display shipments carousel after successful login
      await sendShipmentsCarousel(chatId, matchedUser, 0);
      return;
    } else {
      await telegramClient.sendMessage(
        chatId,
        [
          '❌ <b>Invalid Access Code</b>',
          '',
          `The code <code>${escapeHtml(candidateCode)}</code> was not recognized in our system.`,
          'Please verify the 8-digit code from your Jacxi Shipping dashboard or invoice and try again.',
        ].join('\n'),
        {
          parse_mode: 'HTML',
          reply_markup: AUTH_PROMPT_KEYBOARD,
        }
      );
      return;
    }
  }

  // Default unauthenticated greeting with Mini App launch option
  const webAppLaunchUrl = buildTelegramMiniAppUrl('/dashboard', undefined, APP_URL);
  await telegramClient.sendMessage(
    chatId,
    [
      '🚢 <b>Welcome to Jacxi Shipping Assistant!</b>',
      '━━━━━━━━━━━━━━━━━━━━━',
      'Track your ocean containers, inspect vehicle arrival & warehouse condition photos, and monitor your invoices directly in Telegram.',
      '',
      '🔐 <b>Please enter your 8-digit Customer Access Code to start:</b>',
      '<i>(Example: <code>83492019</code> or <code>JACX1234</code>)</i>',
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Launch Jacxi Mini App', web_app: { url: webAppLaunchUrl } }],
        ],
      },
    }
  );
}

async function sendAuthenticatedWelcome(chatId: number, user: TelegramLinkedUser): Promise<void> {
  const shipments = await getCustomerShipments(user.id);
  const portalUrl = buildTelegramMiniAppUrl('/dashboard', user, APP_URL);

  const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
    [
      { text: '📦 Browse Shipments', callback_data: 'shipment:page:0' },
      { text: '💰 Finance & Invoices', callback_data: 'finance:overview' },
    ],
    [
      { text: '🚀 Open Jacxi Portal', web_app: { url: portalUrl } },
    ],
  ];

  await telegramClient.sendMessage(
    chatId,
    [
      `👋 <b>Welcome Back, ${escapeHtml(user.name || user.email)}!</b>`,
      '━━━━━━━━━━━━━━━━━━━━━',
      `📦 <b>Active Shipments:</b> <code>${shipments.length} vehicle(s)</code>`,
      '',
      'Select an option below or type any <b>VIN / Container #</b> at any time:',
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: inlineKeyboard },
    }
  );
}

async function sendShipmentsCarousel(
  chatId: number,
  user: TelegramLinkedUser,
  pageIndex = 0
): Promise<void> {
  await telegramClient.sendChatAction(chatId, 'typing');
  const shipments = await getCustomerShipments(user.id);

  if (shipments.length === 0) {
    await telegramClient.sendMessage(
      chatId,
      '📦 <b>No Active Shipments Found</b>\n\nThere are currently no vehicle shipments associated with your Jacxi account. Once your booking is created, your live tracking and warehouse photos will appear here automatically.',
      {
        parse_mode: 'HTML',
        reply_markup: MAIN_MENU_KEYBOARD,
      }
    );
    return;
  }

  const validIndex = Math.max(0, Math.min(pageIndex, shipments.length - 1));
  const current = shipments[validIndex];
  const cardText = formatShipmentHeroCard(current, validIndex, shipments.length);
  const keyboard = buildShipmentHeroKeyboard(current, validIndex, shipments.length, APP_URL, user);

  const heroPhoto = current.arrivalPhotos[0] || current.vehiclePhotos[0];

  if (heroPhoto) {
    await telegramClient.sendChatAction(chatId, 'upload_photo');
    const photoResult = await telegramClient.sendPhoto(chatId, heroPhoto, {
      caption: cardText,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    if (photoResult.ok) {
      return;
    }
  }

  // Fallback to rich text message if no photo or photo fails to load
  await telegramClient.sendMessage(chatId, cardText, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

async function sendPhotosMenu(chatId: number, user: TelegramLinkedUser): Promise<void> {
  await telegramClient.sendChatAction(chatId, 'typing');
  const shipments = await getCustomerShipments(user.id);

  if (shipments.length === 0) {
    await telegramClient.sendMessage(chatId, '📷 No shipments found to show photos for.');
    return;
  }

  // If customer has only 1 shipment, directly send its photos
  if (shipments.length === 1) {
    await sendShipmentPhotosAlbum(chatId, user, shipments[0].id);
    return;
  }

  // If multiple shipments, show selector
  const buttons: TelegramInlineKeyboardButton[][] = shipments.map((s) => [
    {
      text: `📸 ${s.vehicleLabel} (${s.totalPhotosCount} photos)`,
      callback_data: `photos:${s.id}`,
    },
  ]);

  await telegramClient.sendMessage(
    chatId,
    '📸 <b>Select a vehicle below to view its high-res arrival & condition photos:</b>',
    {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons },
    }
  );
}

async function sendShipmentPhotosAlbum(
  chatId: number,
  user: TelegramLinkedUser,
  shipmentId: string
): Promise<void> {
  await telegramClient.sendChatAction(chatId, 'upload_photo');
  const shipment = await getCustomerShipmentByIdOrVin(user.id, shipmentId);

  if (!shipment) {
    await telegramClient.sendMessage(chatId, '❌ Shipment not found.');
    return;
  }

  const allPhotos = [...shipment.arrivalPhotos, ...shipment.vehiclePhotos].filter(Boolean);

  if (allPhotos.length === 0) {
    await telegramClient.sendMessage(
      chatId,
      `📷 <b>No photos available yet</b> for <b>${escapeHtml(shipment.vehicleLabel)}</b>.\n\nArrival inspection photos will appear here as soon as the vehicle is processed at the export yard.`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Telegram allows up to 10 photos per sendMediaGroup
  const photosToSend = allPhotos.slice(0, 10);
  const mediaGroup: TelegramInputMediaPhoto[] = photosToSend.map((url, idx) => ({
    type: 'photo',
    media: url,
    caption:
      idx === 0
        ? `📸 <b>${escapeHtml(shipment.vehicleLabel)}</b>\n🔑 VIN: <code>${shipment.vehicleVIN || 'N/A'}</code>\n📍 Status: ${shipment.statusLabel}\n🖼 Showing ${photosToSend.length} of ${allPhotos.length} photo(s)`
        : undefined,
    parse_mode: 'HTML',
  }));

  const res = await telegramClient.sendMediaGroup(chatId, mediaGroup);

  if (!res.ok) {
    // If media group failed (e.g. invalid URL format), fallback to sending first photo with caption
    if (photosToSend.length > 0) {
      await telegramClient.sendPhoto(chatId, photosToSend[0], {
        caption: `📸 <b>${escapeHtml(shipment.vehicleLabel)}</b>\n🔑 VIN: <code>${shipment.vehicleVIN || 'N/A'}</code>\n📍 Status: ${shipment.statusLabel}`,
        parse_mode: 'HTML',
      });
    }
  }

  // If there are more than 10 photos, mention it with direct portal link
  if (allPhotos.length > 10) {
    const portalPhotoUrl = buildTelegramMiniAppUrl(`/dashboard/shipments/${shipment.id}`, user, APP_URL);
    await telegramClient.sendMessage(
      chatId,
      `ℹ️ <i>There are ${allPhotos.length - 10} additional photos available in the portal.</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🖼 View All Photos in Portal', web_app: { url: portalPhotoUrl } }],
          ],
        },
      }
    );
  }
}

async function sendFinanceSummary(chatId: number, user: TelegramLinkedUser): Promise<void> {
  await telegramClient.sendChatAction(chatId, 'typing');
  const finance = await getCustomerFinanceOverview(user.id);
  const text = formatFinanceTelegramMessage(finance);
  const portalFinanceUrl = buildTelegramMiniAppUrl('/dashboard/finance/ledger', user, APP_URL);

  const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
    [
      { text: '💳 View Due Invoices', callback_data: 'finance:invoices' },
      { text: '🚀 Open Finance Portal', web_app: { url: portalFinanceUrl } },
    ],
  ];

  await telegramClient.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: inlineKeyboard },
  });
}

async function sendTrackingPrompt(chatId: number, user: TelegramLinkedUser): Promise<void> {
  const shipments = await getCustomerShipments(user.id);

  if (shipments.length === 0) {
    await telegramClient.sendMessage(
      chatId,
      '📍 Type any <b>VIN</b> or <b>Container Number</b> in the chat to track live ocean freight.',
      { parse_mode: 'HTML' }
    );
    return;
  }

  const buttons: TelegramInlineKeyboardButton[][] = shipments.map((s) => [
    {
      text: `📍 Track ${s.vehicleLabel} (${s.containerNumber || 'Yard'})`,
      callback_data: `track:${s.id}`,
    },
  ]);

  await telegramClient.sendMessage(
    chatId,
    '📍 <b>Select a shipment below or type any VIN / Container number:</b>',
    {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons },
    }
  );
}

async function sendAccountInfo(chatId: number, user: TelegramLinkedUser): Promise<void> {
  const portalUrl = buildTelegramMiniAppUrl('/dashboard', user, APP_URL);
  await telegramClient.sendMessage(
    chatId,
    [
      'ℹ️ <b>Your Customer Profile</b>',
      '━━━━━━━━━━━━━━━━━━━━━',
      `👤 <b>Name:</b> ${escapeHtml(user.name || 'Customer')}`,
      `📧 <b>Email:</b> ${escapeHtml(user.email)}`,
      `📞 <b>Phone:</b> ${escapeHtml(user.phone || 'N/A')}`,
      `🔑 <b>Access Code:</b> <code>${user.loginCode || 'N/A'}</code>`,
      `📱 <b>Telegram ID:</b> <code>${chatId}</code>`,
      '',
      '🔒 <i>Your Telegram session is verified and authenticated.</i>',
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Launch Web Portal', web_app: { url: portalUrl } }],
        ],
      },
    }
  );
}

async function sendHelpMessage(chatId: number, isAuthenticated: boolean): Promise<void> {
  const text = [
    '🤖 <b>Jacxi Shipping Bot Manual:</b>',
    '━━━━━━━━━━━━━━━━━━━━━',
    '/shipments - Interactive vehicle cards & carousel',
    '/photos - High-res arrival & inspection photo albums',
    '/track &lt;VIN&gt; - Live ocean container tracking & ETA',
    '/finance - Ledger balance & invoice breakdown',
    '/account - Customer profile details',
    '/logout - Disconnect your Telegram session',
    '/help - Show this guide',
  ].join('\n');

  await telegramClient.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: isAuthenticated ? MAIN_MENU_KEYBOARD : AUTH_PROMPT_KEYBOARD,
  });
}

async function handleSearchQuery(
  chatId: number,
  user: TelegramLinkedUser,
  query: string
): Promise<void> {
  await telegramClient.sendChatAction(chatId, 'typing');
  const clean = query.replace(/[\s-]/g, '').toUpperCase();

  // 1. Check if matches user's shipment directly
  const localShipment = await getCustomerShipmentByIdOrVin(user.id, clean);
  if (localShipment) {
    const card = formatShipmentHeroCard(localShipment);
    const keyboard = buildShipmentHeroKeyboard(localShipment, 0, 1, APP_URL);

    const heroPhoto = localShipment.arrivalPhotos[0] || localShipment.vehiclePhotos[0];
    if (heroPhoto) {
      await telegramClient.sendPhoto(chatId, heroPhoto, {
        caption: card,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
      return;
    }

    await telegramClient.sendMessage(chatId, card, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    return;
  }

  // 2. Query universal tracking resolver
  const tracking = await buildTrackingResponse(clean);
  if (tracking) {
    const lines = [
      `🔍 <b>Tracking Result for <code>${escapeHtml(tracking.requestedNumber)}</code>:</b>`,
      '━━━━━━━━━━━━━━━━━━━━━',
      `📦 <b>Container:</b> <code>${escapeHtml(tracking.containerNumber)}</code>`,
      `📍 <b>Status:</b> ${escapeHtml(tracking.shipmentStatus || 'In Progress')}`,
      `🌐 <b>Current Location:</b> ${escapeHtml(tracking.currentLocation || 'In Transit')}`,
      `🛫 <b>Origin:</b> ${formatPortFlag(tracking.origin)}`,
      `🛬 <b>Destination:</b> ${formatPortFlag(tracking.destination)}`,
      tracking.estimatedArrival ? `📅 <b>ETA:</b> ${escapeHtml(tracking.estimatedArrival)}` : '',
    ].filter(Boolean);

    await telegramClient.sendMessage(chatId, lines.join('\n'), {
      parse_mode: 'HTML',
      reply_markup: MAIN_MENU_KEYBOARD,
    });
    return;
  }

  await telegramClient.sendMessage(
    chatId,
    `❌ No shipment or container found matching <code>${escapeHtml(query)}</code>. Please verify the VIN or Container Number and try again.`,
    {
      parse_mode: 'HTML',
      reply_markup: MAIN_MENU_KEYBOARD,
    }
  );
}

async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  const chatId = query.message?.chat.id || query.from.id;
  const messageId = query.message?.message_id;
  const data = query.data || '';
  const user = await getTelegramSessionUser(chatId);

  // Acknowledge query to clear loading spinner
  await telegramClient.answerCallbackQuery(query.id);

  if (!user) {
    await telegramClient.sendMessage(
      chatId,
      '🔒 Your session has expired. Please enter your 8-digit access code to log in.',
      { parse_mode: 'HTML', reply_markup: AUTH_PROMPT_KEYBOARD }
    );
    return;
  }

  if (data === 'shipment:noop') {
    return;
  }

  // Handle carousel page flip
  if (data.startsWith('shipment:page:')) {
    const targetIdx = parseInt(data.replace('shipment:page:', ''), 10) || 0;
    const shipments = await getCustomerShipments(user.id);
    if (shipments.length > 0) {
      const validIdx = Math.max(0, Math.min(targetIdx, shipments.length - 1));
      const current = shipments[validIdx];
      const cardText = formatShipmentHeroCard(current, validIdx, shipments.length);
      const keyboard = buildShipmentHeroKeyboard(current, validIdx, shipments.length, APP_URL, user);

      if (messageId) {
        // Attempt in-place caption update if message has a photo
        if (query.message?.caption !== undefined) {
          const res = await telegramClient.editMessageCaption(chatId, messageId, cardText, {
            parse_mode: 'HTML',
            reply_markup: keyboard,
          });
          if (res.ok) return;
        }

        // Attempt in-place text edit
        const editRes = await telegramClient.editMessageText(chatId, messageId, cardText, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
        if (editRes.ok) return;
      }

      // Fallback: send fresh message
      await sendShipmentsCarousel(chatId, user, validIdx);
    }
    return;
  }

  if (data.startsWith('photos:')) {
    const shipmentId = data.replace('photos:', '');
    await sendShipmentPhotosAlbum(chatId, user, shipmentId);
    return;
  }

  if (data.startsWith('detail:')) {
    const parts = data.split(':');
    const shipmentId = parts[1];
    const pageIndex = parseInt(parts[2] || '0', 10);
    const shipments = await getCustomerShipments(user.id);
    const shipment = shipments.find((s) => s.id === shipmentId) || shipments[0];

    if (shipment) {
      const card = formatShipmentHeroCard(shipment, pageIndex, shipments.length);
      const keyboard = buildShipmentHeroKeyboard(shipment, pageIndex, shipments.length, APP_URL, user);

      if (messageId) {
        if (query.message?.caption !== undefined) {
          await telegramClient.editMessageCaption(chatId, messageId, card, {
            parse_mode: 'HTML',
            reply_markup: keyboard,
          });
          return;
        }
        await telegramClient.editMessageText(chatId, messageId, card, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
        return;
      }

      await telegramClient.sendMessage(chatId, card, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
    return;
  }

  if (data.startsWith('track:')) {
    const shipmentId = data.replace('track:', '');
    const shipment = await getCustomerShipmentByIdOrVin(user.id, shipmentId);
    if (shipment) {
      const tracking = await buildTrackingResponse(shipment.vehicleVIN || shipment.containerNumber || shipment.id);
      const portalMapUrl = buildTelegramMiniAppUrl(`/dashboard/shipments/${shipment.id}`, user, APP_URL);

      const originStr = shipment.loadingPort ? formatPortFlag(shipment.loadingPort) : 'Export Port';
      const destStr = shipment.destinationPort ? formatPortFlag(shipment.destinationPort) : 'Destination Port';

      const lines = [
        `📍 <b>Live Ocean Tracking: ${escapeHtml(shipment.vehicleLabel)}</b>`,
        '━━━━━━━━━━━━━━━━━━━━━',
        `📦 <b>Container:</b> <code>${escapeHtml(shipment.containerNumber || 'Pending')}</code>`,
        `🔑 <b>VIN:</b> <code>${escapeHtml(shipment.vehicleVIN || 'N/A')}</code>`,
        `🚢 <b>Vessel:</b> ${escapeHtml(shipment.vesselName || 'TBA')}${shipment.voyageNumber ? ` (Voy: ${escapeHtml(shipment.voyageNumber)})` : ''}`,
        `🏢 <b>Carrier:</b> ${escapeHtml(shipment.shippingLine || 'Ocean Line')}`,
        `🛫 <b>Origin:</b> ${originStr}`,
        `🛬 <b>Destination:</b> ${destStr}`,
        shipment.departureDate ? `🛫 <b>Departed:</b> ${escapeHtml(shipment.departureDate)}` : '',
        shipment.estimatedArrival ? `📅 <b>ETA:</b> <b>${escapeHtml(shipment.estimatedArrival)}</b>` : '',
        `🌐 <b>Current Location:</b> ${escapeHtml(tracking?.currentLocation || shipment.currentLocation || 'In Transit')}`,
        `📊 <b>Transit Progress:</b> <code>${formatProgressBar(shipment.progress)}</code>`,
      ].filter(Boolean);

      await telegramClient.sendMessage(chatId, lines.join('\n'), {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: `📸 View Photos (${shipment.totalPhotosCount})`, callback_data: `photos:${shipment.id}` },
              { text: '🗺 Interactive Map', web_app: { url: portalMapUrl } },
            ],
            [
              { text: '◀ Back to Vehicle Card', callback_data: `detail:${shipment.id}:0` },
            ],
          ],
        },
      });
    }
    return;
  }

  if (data === 'finance:overview' || data === 'finance:invoices') {
    await sendFinanceSummary(chatId, user);
    return;
  }
}
