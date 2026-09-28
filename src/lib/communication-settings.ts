import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { decryptSecret, encryptSecret } from '@/lib/secret-crypto';

const COMMUNICATION_SETTINGS_SCOPE = 'default';

export type CommunicationProviderSettingsValues = {
  emailEnabled: boolean;
  emailProvider: string;
  emailApiKey: string;
  emailFromAddress: string;
  emailReplyToAddress: string;
  smsEnabled: boolean;
  smsProvider: string;
  smsAccountSid: string;
  smsAuthToken: string;
  smsFromNumber: string;
  smsMessagingServiceSid: string;
};

export const EMPTY_COMMUNICATION_SETTINGS: CommunicationProviderSettingsValues = {
  emailEnabled: false,
  emailProvider: 'resend',
  emailApiKey: '',
  emailFromAddress: 'notifications@jacxishipping.com',
  emailReplyToAddress: 'support@jacxishipping.com',
  smsEnabled: false,
  smsProvider: 'twilio',
  smsAccountSid: '',
  smsAuthToken: '',
  smsFromNumber: '',
  smsMessagingServiceSid: '',
};

function normalizeValue(value: string | null | undefined, fallback = '') {
  return value?.trim() || fallback;
}

export function mapCommunicationSettings(
  record?: Partial<Record<keyof CommunicationProviderSettingsValues, string | boolean | null>> | null,
): CommunicationProviderSettingsValues {
  const emailApiKey = decryptSecret(record?.emailApiKey as string | null | undefined) || process.env.RESEND_API_KEY?.trim() || '';
  const smsAuthToken = decryptSecret(record?.smsAuthToken as string | null | undefined) || process.env.TWILIO_AUTH_TOKEN?.trim() || '';

  return {
    emailEnabled: Boolean(record?.emailEnabled ?? Boolean(emailApiKey)),
    emailProvider: normalizeValue(record?.emailProvider as string | null | undefined, 'resend'),
    emailApiKey,
    emailFromAddress: normalizeValue(
      record?.emailFromAddress as string | null | undefined,
      process.env.EMAIL_FROM || EMPTY_COMMUNICATION_SETTINGS.emailFromAddress,
    ),
    emailReplyToAddress: normalizeValue(
      record?.emailReplyToAddress as string | null | undefined,
      process.env.EMAIL_REPLY_TO || EMPTY_COMMUNICATION_SETTINGS.emailReplyToAddress,
    ),
    smsEnabled: Boolean(record?.smsEnabled ?? Boolean(process.env.TWILIO_ACCOUNT_SID && smsAuthToken)),
    smsProvider: normalizeValue(record?.smsProvider as string | null | undefined, 'twilio'),
    smsAccountSid: normalizeValue(record?.smsAccountSid as string | null | undefined, process.env.TWILIO_ACCOUNT_SID || ''),
    smsAuthToken,
    smsFromNumber: normalizeValue(record?.smsFromNumber as string | null | undefined, process.env.TWILIO_PHONE_NUMBER || ''),
    smsMessagingServiceSid: normalizeValue(
      record?.smsMessagingServiceSid as string | null | undefined,
      process.env.TWILIO_MESSAGING_SERVICE_SID || '',
    ),
  };
}

export function toPersistedCommunicationSettingsData(settings: CommunicationProviderSettingsValues) {
  return {
    emailEnabled: settings.emailEnabled,
    emailProvider: settings.emailProvider || 'resend',
    emailApiKey: encryptSecret(settings.emailApiKey),
    emailFromAddress: settings.emailFromAddress || null,
    emailReplyToAddress: settings.emailReplyToAddress || null,
    smsEnabled: settings.smsEnabled,
    smsProvider: settings.smsProvider || 'twilio',
    smsAccountSid: settings.smsAccountSid || null,
    smsAuthToken: encryptSecret(settings.smsAuthToken),
    smsFromNumber: settings.smsFromNumber || null,
    smsMessagingServiceSid: settings.smsMessagingServiceSid || null,
  };
}

export async function getStoredCommunicationSettings() {
  const settings = await prisma.communicationProviderSettings.findUnique({
    where: { scope: COMMUNICATION_SETTINGS_SCOPE },
    select: {
      emailEnabled: true,
      emailProvider: true,
      emailApiKey: true,
      emailFromAddress: true,
      emailReplyToAddress: true,
      smsEnabled: true,
      smsProvider: true,
      smsAccountSid: true,
      smsAuthToken: true,
      smsFromNumber: true,
      smsMessagingServiceSid: true,
    },
  });

  return mapCommunicationSettings(settings);
}

export async function saveStoredCommunicationSettings(partial: Partial<CommunicationProviderSettingsValues>) {
  const current = await getStoredCommunicationSettings();
  const next = { ...current, ...partial } satisfies CommunicationProviderSettingsValues;

  await prisma.communicationProviderSettings.upsert({
    where: { scope: COMMUNICATION_SETTINGS_SCOPE },
    create: {
      scope: COMMUNICATION_SETTINGS_SCOPE,
      ...toPersistedCommunicationSettingsData(next),
    },
    update: toPersistedCommunicationSettingsData(next),
  });

  return next;
}

export function maskCommunicationSecret(value: string) {
  if (!value) return '';
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export function isEmailConfigured(settings: CommunicationProviderSettingsValues) {
  return Boolean(settings.emailEnabled && settings.emailProvider === 'resend' && settings.emailApiKey && settings.emailFromAddress);
}

export function isSmsConfigured(settings: CommunicationProviderSettingsValues) {
  return Boolean(
    settings.smsEnabled &&
      settings.smsProvider === 'twilio' &&
      settings.smsAccountSid &&
      settings.smsAuthToken &&
      (settings.smsFromNumber || settings.smsMessagingServiceSid),
  );
}

export async function sendConfiguredEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}) {
  const settings = await getStoredCommunicationSettings();
  if (!isEmailConfigured(settings)) {
    return { success: false, error: 'Email provider is not configured.' };
  }

  const resend = new Resend(settings.emailApiKey);
  await resend.emails.send({
    from: input.from || settings.emailFromAddress,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo || settings.emailReplyToAddress || undefined,
  });

  return { success: true };
}

export async function sendConfiguredSms(input: { to: string; body: string }) {
  const settings = await getStoredCommunicationSettings();
  if (!isSmsConfigured(settings)) {
    return { success: false, error: 'SMS provider is not configured.' };
  }

  const body = new URLSearchParams({
    To: input.to,
    Body: input.body,
  });
  if (settings.smsMessagingServiceSid) {
    body.set('MessagingServiceSid', settings.smsMessagingServiceSid);
  } else {
    body.set('From', settings.smsFromNumber);
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${settings.smsAccountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${settings.smsAccountSid}:${settings.smsAuthToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, error: payload?.message || `Twilio returned status ${response.status}` };
  }

  return { success: true, sid: payload?.sid as string | undefined };
}
