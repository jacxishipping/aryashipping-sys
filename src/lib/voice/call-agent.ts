import crypto from 'crypto';

import type { NextRequest } from 'next/server';

import {
  getEffectiveGeminiApiKey,
  getEffectiveGeminiLiveApiKey,
  getEffectiveGeminiLiveModel,
  getEffectiveGeminiVoiceModel,
  getStoredCallAgentSettings,
} from '../call-agent-settings';
import { prisma } from '../db';
import { isValidLoginCode, loginCodeToVoiceDigits } from '../loginCode';
import { buildTrackingResponse } from '../tracking-response';
import {
  buildFinanceSpeech,
  buildShipmentListSpeech,
  buildTrackingSpeech,
  clipVoiceReply,
  normalizeVoiceDigits,
} from './speech';

const openInvoiceStatuses = new Set(['PENDING', 'OVERDUE']);

export type VoiceAccountUser = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  loginCode: string | null;
};

const voiceDigitsPattern = /^\d{8}$/;

function safeCompare(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

function getConfiguredVoiceToken() {
  return process.env.VOICE_WEBHOOK_TOKEN?.trim() || '';
}

export function isVoiceTokenValid(presentedToken?: string | null) {
  const configuredToken = getConfiguredVoiceToken();
  if (!configuredToken) {
    return true;
  }

  return safeCompare(configuredToken, (presentedToken || '').trim());
}

export function isVoiceWebhookAuthorized(request: NextRequest) {
  const presentedToken =
    request.nextUrl.searchParams.get('token')?.trim() ||
    request.headers.get('x-voice-webhook-token')?.trim() ||
    '';

  return isVoiceTokenValid(presentedToken);
}

export function buildVoiceStepUrl(
  request: NextRequest,
  step: string,
  params: Record<string, string | undefined> = {},
) {
  const urlParams = new URLSearchParams();
  const token = request.nextUrl.searchParams.get('token') || request.headers.get('x-voice-webhook-token');

  if (token) {
    urlParams.set('token', token);
  }

  urlParams.set('step', step);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      urlParams.set(key, value);
    }
  });

  return `/api/voice?${urlParams.toString()}`;
}

export function buildVoiceLiveStreamUrl(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const requestUrl = new URL(request.url);
  const protocol = forwardedProto || requestUrl.protocol.replace(':', '');
  const host = forwardedHost || request.headers.get('host') || requestUrl.host;
  const url = new URL(`${protocol === 'https' ? 'wss' : 'ws'}://${host}/api/voice/live`);
  const token = request.nextUrl.searchParams.get('token') || request.headers.get('x-voice-webhook-token');

  if (token) {
    url.searchParams.set('token', token);
  }

  return url.toString();
}

export async function getVoiceUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      loginCode: true,
    },
  });
}

export async function findVoiceUserByAccessCode(accessCode: string) {
  const normalizedCode = normalizeVoiceDigits(accessCode);

  if (normalizedCode.length !== 8) {
    return null;
  }

  if (isValidLoginCode(normalizedCode)) {
    const directMatch = await prisma.user.findFirst({
      where: {
        loginCode: {
          equals: normalizedCode,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        loginCode: true,
      },
    });

    if (directMatch) {
      return directMatch;
    }
  }

  if (!voiceDigitsPattern.test(normalizedCode)) {
    return null;
  }

  const usersWithLoginCodes = await prisma.user.findMany({
    where: {
      loginCode: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      loginCode: true,
    },
  });

  return usersWithLoginCodes.find((user) => {
    if (!user.loginCode) {
      return false;
    }

    return loginCodeToVoiceDigits(user.loginCode) === normalizedCode;
  }) || null;
}

export async function getVoiceFinanceSummary(userId: string) {
  const [latestLedgerEntry, invoices, shipments] = await Promise.all([
    prisma.ledgerEntry.findFirst({
      where: { userId },
      orderBy: { transactionDate: 'desc' },
      select: { balance: true },
    }),
    prisma.userInvoice.findMany({
      where: {
        userId,
        status: {
          in: ['PENDING', 'OVERDUE', 'PAID'],
        },
      },
      select: {
        status: true,
        total: true,
      },
    }),
    prisma.shipment.findMany({
      where: { userId },
      select: {
        paymentStatus: true,
      },
    }),
  ]);

  let totalDue = 0;
  let totalPaid = 0;

  for (const invoice of invoices) {
    if (openInvoiceStatuses.has(invoice.status)) {
      totalDue += invoice.total;
    }

    if (invoice.status === 'PAID') {
      totalPaid += invoice.total;
    }
  }

  const completedShipments = shipments.filter((shipment) => shipment.paymentStatus === 'COMPLETED').length;
  const pendingShipments = shipments.filter((shipment) => shipment.paymentStatus !== 'COMPLETED').length;
  const currentBalance = latestLedgerEntry?.balance ?? totalDue;

  return {
    summary: {
      currentBalance,
      totalDue,
      totalPaid,
      pendingShipments,
      completedShipments,
    },
    speech: buildFinanceSpeech({
      currentBalance,
      totalDue,
      totalPaid,
      pendingShipments,
      completedShipments,
    }),
  };
}

export async function getRecentVoiceShipments(userId: string) {
  const shipments = await prisma.shipment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      vehicleYear: true,
      vehicleMake: true,
      vehicleModel: true,
      container: {
        select: {
          containerNumber: true,
        },
      },
    },
  });

  const summaries = shipments.map((shipment) => ({
    reference: shipment.container?.containerNumber || shipment.id.slice(-6).toUpperCase(),
    status: shipment.status,
    paymentStatus: shipment.paymentStatus,
    vehicleLabel: [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' '),
  }));

  return {
    shipments: summaries,
    speech: buildShipmentListSpeech(summaries),
  };
}

export async function buildVoiceAssistantContext(user: VoiceAccountUser) {
  const [finance, recentShipments] = await Promise.all([
    getVoiceFinanceSummary(user.id),
    getRecentVoiceShipments(user.id),
  ]);

  return {
    finance,
    recentShipments,
    systemPrompt: [
      'You are Jacxi Shipping\'s live phone assistant.',
      'Speak naturally, briefly, and helpfully for a caller on a phone line.',
      'You can help with shipment tracking, finance status, and recent shipment questions.',
      'If the caller asks for something outside that scope, say so briefly and redirect them to shipping or finance help.',
      `Caller name: ${user.name || user.email}.`,
      `Caller email: ${user.email}.`,
      `Finance summary: ${finance.speech}`,
      `Recent shipments: ${recentShipments.speech}`,
    ].join(' '),
  };
}

export async function getAuthorizedTrackingSpeech(userId: string, requestedNumber: string) {
  const trackNumber = normalizeVoiceDigits(requestedNumber);
  if (!trackNumber) {
    return null;
  }

  const allowedContainer = await prisma.container.findFirst({
    where: {
      shipments: {
        some: {
          userId,
        },
      },
      OR: [
        {
          containerNumber: {
            equals: trackNumber,
            mode: 'insensitive',
          },
        },
        {
          trackingNumber: {
            equals: trackNumber,
            mode: 'insensitive',
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (!allowedContainer) {
    return null;
  }

  const tracking = await buildTrackingResponse(trackNumber);
  if (!tracking) {
    return null;
  }

  return buildTrackingSpeech({
    requestedNumber: tracking.requestedNumber,
    containerNumber: tracking.containerNumber,
    shipmentStatus: tracking.shipmentStatus,
    currentLocation: tracking.currentLocation,
    estimatedArrival: tracking.estimatedArrival,
    events: tracking.events,
  });
}

export async function isGeminiLiveConfigured() {
  const settings = await getStoredCallAgentSettings();
  return Boolean(getEffectiveGeminiLiveApiKey(settings));
}

export async function getGeminiLiveRuntimeConfig() {
  const settings = await getStoredCallAgentSettings();

  return {
    apiKey: getEffectiveGeminiLiveApiKey(settings),
    model: getEffectiveGeminiLiveModel(settings),
  };
}

function extractGeminiText(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const candidates: unknown[] = 'candidates' in payload && Array.isArray(payload.candidates)
    ? payload.candidates
    : [];

  return candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== 'object') {
        return [];
      }

      const content = 'content' in candidate && candidate.content && typeof candidate.content === 'object'
        ? candidate.content
        : null;
      const parts: unknown[] = content && 'parts' in content && Array.isArray(content.parts)
        ? content.parts
        : [];

      return parts
        .map((part) => (part && typeof part === 'object' && 'text' in part ? part.text : ''))
        .filter((text): text is string => typeof text === 'string' && text.trim().length > 0);
    })
    .join(' ')
    .trim();
}

export async function generateVoiceAssistantReply(user: VoiceAccountUser, question: string) {
  const settings = await getStoredCallAgentSettings();
  const apiKey = getEffectiveGeminiApiKey(settings);
  if (!apiKey) {
    return null;
  }

  const model = getEffectiveGeminiVoiceModel(settings);
  const [finance, recentShipments] = await Promise.all([
    getVoiceFinanceSummary(user.id),
    getRecentVoiceShipments(user.id),
  ]);

  const prompt = [
    'You are Jacxi Shipping\'s phone assistant.',
    'Answer as plain spoken text for text-to-speech.',
    'Keep the reply under 3 short sentences.',
    'Do not use markdown, bullet points, or special formatting.',
    'If the caller asks for information not present in the provided context, say that you can help with shipment tracking, finance status, and recent shipment questions only.',
    `Caller name: ${user.name || user.email}.`,
    `Caller email: ${user.email}.`,
    `Finance summary: ${finance.speech}`,
    `Recent shipments: ${recentShipments.speech}`,
    `Caller question: ${question.trim()}`,
  ].join(' ');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 220,
        },
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const reply = extractGeminiText(payload);

  if (!reply) {
    throw new Error('Gemini returned an empty assistant response.');
  }

  return clipVoiceReply(reply, 520);
}
