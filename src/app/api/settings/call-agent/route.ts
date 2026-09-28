import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { auth } from '@/lib/auth';
import {
  CALL_AGENT_SETTING_KEYS,
  DEFAULT_GEMINI_LIVE_MODEL,
  DEFAULT_GEMINI_VOICE_MODEL,
  type CallAgentSettingsValues,
  getEffectiveGeminiApiKey,
  getEffectiveGeminiLiveApiKey,
  getEffectiveGeminiLiveModel,
  getEffectiveGeminiVoiceModel,
  getStoredCallAgentSettings,
  isSecretCallAgentSettingKey,
  saveStoredCallAgentSettings,
} from '@/lib/call-agent-settings';
import { prisma } from '@/lib/db';
import { createSystemAuditLog, redactSecretAuditFields } from '@/lib/system-audit';

export const dynamic = 'force-dynamic';

type TwilioAuthMode = 'auth-token' | 'api-key' | 'missing';

type TwilioPhoneRecord = {
  sid?: string | null;
  phone_number?: string | null;
  voice_url?: string | null;
  voice_method?: string | null;
  voice_fallback_url?: string | null;
  voice_application_sid?: string | null;
  status_callback?: string | null;
  trunk_sid?: string | null;
};

type TwilioInspection = {
  attempted: boolean;
  inspected: boolean;
  source: 'phone-number' | 'phone-sid' | 'single-number' | 'multiple-numbers' | 'missing-target' | 'missing-credentials';
  target: string | null;
  phoneNumber: string | null;
  sid: string | null;
  voiceUrl: string | null;
  voiceMethod: string | null;
  voiceFallbackUrl: string | null;
  voiceApplicationSid: string | null;
  statusCallback: string | null;
  trunkSid: string | null;
  matchesExpectedWebhook: boolean | null;
  error: string | null;
};

function normalizeBaseUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  try {
    return new URL(raw).toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function isLocalBaseUrl(value: string) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

function getDetectedBaseUrl(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const requestUrl = new URL(request.url);
  const protocol = forwardedProto || requestUrl.protocol.replace(':', '');
  const host = forwardedHost || request.headers.get('host') || requestUrl.host;

  return `${protocol}://${host}`.replace(/\/$/, '');
}

function toWebsocketUrl(baseUrl: string) {
  return baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
}

function sanitizeStoredString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function getTwilioAuthMode(settings: CallAgentSettingsValues): TwilioAuthMode {
  return settings.twilioAccountSid && settings.twilioAuthToken
    ? 'auth-token'
    : settings.twilioAccountSid && settings.twilioApiKey && settings.twilioApiSecret
      ? 'api-key'
      : 'missing';
}

function normalizeComparableUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const params = [...url.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    });
    const normalizedSearch = new URLSearchParams(params).toString();
    return `${url.origin}${url.pathname}${normalizedSearch ? `?${normalizedSearch}` : ''}`;
  } catch {
    return value.trim();
  }
}

function createTwilioAuthHeader(authMode: TwilioAuthMode, settings: CallAgentSettingsValues) {
  if (authMode === 'auth-token') {
    const username = settings.twilioAccountSid;
    const password = settings.twilioAuthToken;
    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  if (authMode === 'api-key') {
    const username = settings.twilioApiKey;
    const password = settings.twilioApiSecret;
    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  return null;
}

async function fetchTwilioJson(pathname: string, authHeader: string, accountSid: string) {
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}${pathname}`, {
    headers: {
      Authorization: authHeader,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Twilio API request failed with status ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

function buildTwilioInspection(record: TwilioPhoneRecord, source: TwilioInspection['source'], target: string | null, expectedWebhookUrl: string) {
  const voiceUrl = record.voice_url?.trim() || null;
  const voiceMethod = record.voice_method?.trim() || null;
  const matchesExpectedWebhook = voiceUrl
    ? normalizeComparableUrl(voiceUrl) === normalizeComparableUrl(expectedWebhookUrl) && (voiceMethod || '').toUpperCase() === 'POST'
    : null;

  return {
    attempted: true,
    inspected: true,
    source,
    target,
    phoneNumber: record.phone_number?.trim() || null,
    sid: record.sid?.trim() || null,
    voiceUrl,
    voiceMethod,
    voiceFallbackUrl: record.voice_fallback_url?.trim() || null,
    voiceApplicationSid: record.voice_application_sid?.trim() || null,
    statusCallback: record.status_callback?.trim() || null,
    trunkSid: record.trunk_sid?.trim() || null,
    matchesExpectedWebhook,
    error: null,
  } satisfies TwilioInspection;
}

async function buildCallAgentResponse(request: NextRequest, settings: CallAgentSettingsValues) {
  const configuredBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  const detectedBaseUrl = getDetectedBaseUrl(request);
  const preferredBaseUrl = configuredBaseUrl && !isLocalBaseUrl(configuredBaseUrl)
    ? configuredBaseUrl
    : detectedBaseUrl;
  const voiceWebhookToken = process.env.VOICE_WEBHOOK_TOKEN?.trim() || '';

  const webhookUrl = new URL('/api/voice', preferredBaseUrl);
  const websocketUrl = new URL('/api/voice/live', toWebsocketUrl(preferredBaseUrl));

  if (voiceWebhookToken) {
    webhookUrl.searchParams.set('token', voiceWebhookToken);
    websocketUrl.searchParams.set('token', voiceWebhookToken);
  }

  const geminiStandardConfigured = Boolean(getEffectiveGeminiApiKey(settings));
  const geminiLiveConfigured = Boolean(getEffectiveGeminiLiveApiKey(settings));
  const twilioAccountSidConfigured = Boolean(settings.twilioAccountSid);
  const twilioAuthTokenConfigured = Boolean(settings.twilioAuthToken);
  const twilioApiKeyConfigured = Boolean(settings.twilioApiKey);
  const twilioApiSecretConfigured = Boolean(settings.twilioApiSecret);
  const twilioPhoneNumberConfigured = Boolean(settings.twilioPhoneNumber);
  const twilioPhoneNumberSidConfigured = Boolean(settings.twilioPhoneNumberSid);
  const twilioAuthMode = getTwilioAuthMode(settings);

  let twilioInspection: TwilioInspection = {
    attempted: false,
    inspected: false,
    source: twilioAuthMode === 'missing' ? 'missing-credentials' : 'missing-target',
    target: settings.twilioPhoneNumberSid || settings.twilioPhoneNumber || null,
    phoneNumber: null,
    sid: null,
    voiceUrl: null,
    voiceMethod: null,
    voiceFallbackUrl: null,
    voiceApplicationSid: null,
    statusCallback: null,
    trunkSid: null,
    matchesExpectedWebhook: null,
    error: twilioAuthMode === 'missing'
      ? 'Twilio API credentials are not configured in Call Agent settings.'
      : 'Save TWILIO_PHONE_NUMBER or TWILIO_PHONE_NUMBER_SID on this page to inspect a specific number, or keep only one number on the Twilio account.',
  };

  if (twilioAuthMode !== 'missing') {
    const authHeader = createTwilioAuthHeader(twilioAuthMode, settings);

    if (authHeader) {
      try {
        if (settings.twilioPhoneNumberSid) {
          const record = (await fetchTwilioJson(`/IncomingPhoneNumbers/${encodeURIComponent(settings.twilioPhoneNumberSid)}.json`, authHeader, settings.twilioAccountSid)) as TwilioPhoneRecord;
          twilioInspection = buildTwilioInspection(record, 'phone-sid', settings.twilioPhoneNumberSid, webhookUrl.toString());
        } else {
          const query = new URLSearchParams({ PageSize: '20' });
          if (settings.twilioPhoneNumber) {
            query.set('PhoneNumber', settings.twilioPhoneNumber);
          }

          const payload = await fetchTwilioJson(`/IncomingPhoneNumbers.json?${query.toString()}`, authHeader, settings.twilioAccountSid);
          const numbers = Array.isArray(payload.incoming_phone_numbers)
            ? (payload.incoming_phone_numbers as TwilioPhoneRecord[])
            : [];

          if (numbers.length === 1) {
            twilioInspection = buildTwilioInspection(
              numbers[0],
              settings.twilioPhoneNumber ? 'phone-number' : 'single-number',
              settings.twilioPhoneNumber || numbers[0].phone_number || null,
              webhookUrl.toString(),
            );
          } else if (numbers.length > 1) {
            twilioInspection = {
              ...twilioInspection,
              attempted: true,
              source: 'multiple-numbers',
              error: 'Multiple Twilio phone numbers are on this account. Save TWILIO_PHONE_NUMBER or TWILIO_PHONE_NUMBER_SID on this page to inspect the correct number.',
            };
          } else {
            twilioInspection = {
              ...twilioInspection,
              attempted: true,
              source: settings.twilioPhoneNumber ? 'phone-number' : 'missing-target',
              error: settings.twilioPhoneNumber
                ? 'No Twilio number matched the saved TWILIO_PHONE_NUMBER.'
                : 'No incoming Twilio phone numbers were found on this account.',
            };
          }
        }
      } catch (twilioError) {
        twilioInspection = {
          ...twilioInspection,
          attempted: true,
          error: twilioError instanceof Error ? twilioError.message : 'Failed to inspect Twilio phone number configuration.',
        };
      }
    }
  }

  return {
    urls: {
      preferredBaseUrl,
      configuredBaseUrl,
      detectedBaseUrl,
      source: preferredBaseUrl === configuredBaseUrl ? 'NEXT_PUBLIC_APP_URL' : 'request',
      webhookUrl: webhookUrl.toString(),
      websocketUrl: websocketUrl.toString(),
      webhookMethod: 'POST' as const,
    },
    status: {
      voiceWebhookTokenConfigured: Boolean(voiceWebhookToken),
      geminiStandardConfigured,
      geminiLiveConfigured,
      geminiVoiceModel: getEffectiveGeminiVoiceModel(settings),
      geminiLiveModel: getEffectiveGeminiLiveModel(settings),
      twilioAccountSidConfigured,
      twilioAuthTokenConfigured,
      twilioApiKeyConfigured,
      twilioApiSecretConfigured,
      twilioAuthMode,
      twilioConfigured: twilioAuthMode !== 'missing',
      twilioPhoneNumberConfigured,
      twilioPhoneNumberSidConfigured,
    },
    twilioValues: {
      twilioAccountSid: settings.twilioAccountSid,
      twilioAuthToken: settings.twilioAuthToken,
      twilioApiKey: settings.twilioApiKey,
      twilioApiSecret: settings.twilioApiSecret,
      twilioPhoneNumber: settings.twilioPhoneNumber,
      twilioPhoneNumberSid: settings.twilioPhoneNumberSid,
    },
    geminiValues: {
      geminiApiKey: settings.geminiApiKey,
      geminiLiveApiKey: settings.geminiLiveApiKey,
      geminiVoiceModel: settings.geminiVoiceModel || DEFAULT_GEMINI_VOICE_MODEL,
      geminiLiveModel: settings.geminiLiveModel || DEFAULT_GEMINI_LIVE_MODEL,
    },
    twilioInspection,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getStoredCallAgentSettings();

    return NextResponse.json(await buildCallAgentResponse(request, settings), { status: 200 });
  } catch (error) {
    console.error('Error fetching call agent settings:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json() as Record<string, unknown>;
    const partial: Partial<CallAgentSettingsValues> = {};

    for (const key of CALL_AGENT_SETTING_KEYS) {
      if (key in payload) {
        partial[key] = sanitizeStoredString(payload[key]);
      }
    }

    if (Object.keys(partial).length === 0) {
      return NextResponse.json({ message: 'No valid call agent settings provided' }, { status: 400 });
    }

    const settings = await saveStoredCallAgentSettings(partial);
    const secretKeys = new Set(
      CALL_AGENT_SETTING_KEYS.filter(isSecretCallAgentSettingKey),
    ) as Set<string>;

    await createSystemAuditLog({
      action: 'call-agent-settings-update',
      entityType: 'CALL_AGENT_SETTINGS',
      entityId: 'default',
      actorUserId: session.user.id,
      summary: `Updated call-agent settings fields: ${Object.keys(partial).join(', ')}`,
      metadata: {
        fields: Object.keys(partial),
        values: redactSecretAuditFields(partial as Record<string, unknown>, secretKeys),
      } as Prisma.InputJsonValue,
    }).catch(() => null);

    return NextResponse.json(await buildCallAgentResponse(request, settings), { status: 200 });
  } catch (error) {
    console.error('Error updating call agent settings:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
