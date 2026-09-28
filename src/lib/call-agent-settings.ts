import { prisma } from './db';
import { decryptSecret, encryptSecret } from './secret-crypto';

export const DEFAULT_GEMINI_VOICE_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_LIVE_MODEL = 'gemini-3.1-flash-live-preview';

export type CallAgentSettingsValues = {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioApiKey: string;
  twilioApiSecret: string;
  twilioPhoneNumber: string;
  twilioPhoneNumberSid: string;
  geminiApiKey: string;
  geminiLiveApiKey: string;
  geminiVoiceModel: string;
  geminiLiveModel: string;
};

const CALL_AGENT_SETTINGS_SCOPE = 'default';

export const EMPTY_CALL_AGENT_SETTINGS: CallAgentSettingsValues = {
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioApiKey: '',
  twilioApiSecret: '',
  twilioPhoneNumber: '',
  twilioPhoneNumberSid: '',
  geminiApiKey: '',
  geminiLiveApiKey: '',
  geminiVoiceModel: DEFAULT_GEMINI_VOICE_MODEL,
  geminiLiveModel: DEFAULT_GEMINI_LIVE_MODEL,
};

export const CALL_AGENT_SETTING_KEYS = Object.keys(EMPTY_CALL_AGENT_SETTINGS) as Array<keyof CallAgentSettingsValues>;
const SECRET_CALL_AGENT_KEYS = new Set<keyof CallAgentSettingsValues>([
  'twilioAuthToken',
  'twilioApiSecret',
  'geminiApiKey',
  'geminiLiveApiKey',
]);

function normalizeStoredValue(value: string | null | undefined, fallback = '', isSecret = false) {
  const normalized = isSecret ? decryptSecret(value) : value?.trim();
  return normalized || fallback;
}

export function mapCallAgentSettings(
  record?: Partial<Record<keyof CallAgentSettingsValues, string | null>> | null,
): CallAgentSettingsValues {
  return {
    twilioAccountSid: normalizeStoredValue(record?.twilioAccountSid),
    twilioAuthToken: normalizeStoredValue(record?.twilioAuthToken, '', true),
    twilioApiKey: normalizeStoredValue(record?.twilioApiKey),
    twilioApiSecret: normalizeStoredValue(record?.twilioApiSecret, '', true),
    twilioPhoneNumber: normalizeStoredValue(record?.twilioPhoneNumber),
    twilioPhoneNumberSid: normalizeStoredValue(record?.twilioPhoneNumberSid),
    geminiApiKey: normalizeStoredValue(record?.geminiApiKey, '', true),
    geminiLiveApiKey: normalizeStoredValue(record?.geminiLiveApiKey, '', true),
    geminiVoiceModel: normalizeStoredValue(record?.geminiVoiceModel, DEFAULT_GEMINI_VOICE_MODEL),
    geminiLiveModel: normalizeStoredValue(record?.geminiLiveModel, DEFAULT_GEMINI_LIVE_MODEL),
  };
}

export function toPersistedCallAgentSettingsData(settings: CallAgentSettingsValues) {
  return {
    twilioAccountSid: settings.twilioAccountSid || null,
    twilioAuthToken: encryptSecret(settings.twilioAuthToken),
    twilioApiKey: settings.twilioApiKey || null,
    twilioApiSecret: encryptSecret(settings.twilioApiSecret),
    twilioPhoneNumber: settings.twilioPhoneNumber || null,
    twilioPhoneNumberSid: settings.twilioPhoneNumberSid || null,
    geminiApiKey: encryptSecret(settings.geminiApiKey),
    geminiLiveApiKey: encryptSecret(settings.geminiLiveApiKey),
    geminiVoiceModel: settings.geminiVoiceModel || null,
    geminiLiveModel: settings.geminiLiveModel || null,
  };
}

export function isSecretCallAgentSettingKey(key: keyof CallAgentSettingsValues) {
  return SECRET_CALL_AGENT_KEYS.has(key);
}

export async function getStoredCallAgentSettings() {
  const settings = await prisma.callAgentSettings.findUnique({
    where: { scope: CALL_AGENT_SETTINGS_SCOPE },
    select: {
      twilioAccountSid: true,
      twilioAuthToken: true,
      twilioApiKey: true,
      twilioApiSecret: true,
      twilioPhoneNumber: true,
      twilioPhoneNumberSid: true,
      geminiApiKey: true,
      geminiLiveApiKey: true,
      geminiVoiceModel: true,
      geminiLiveModel: true,
    },
  });

  return mapCallAgentSettings(settings);
}

export async function saveStoredCallAgentSettings(partial: Partial<CallAgentSettingsValues>) {
  const current = await getStoredCallAgentSettings();
  const next = {
    ...current,
    ...partial,
  } satisfies CallAgentSettingsValues;

  await prisma.callAgentSettings.upsert({
    where: { scope: CALL_AGENT_SETTINGS_SCOPE },
    create: {
      scope: CALL_AGENT_SETTINGS_SCOPE,
      ...toPersistedCallAgentSettingsData(next),
    },
    update: toPersistedCallAgentSettingsData(next),
  });

  return next;
}

export function getEffectiveGeminiApiKey(settings: CallAgentSettingsValues) {
  return settings.geminiApiKey.trim();
}

export function getEffectiveGeminiLiveApiKey(settings: CallAgentSettingsValues) {
  return (settings.geminiLiveApiKey || settings.geminiApiKey).trim();
}

export function getEffectiveGeminiVoiceModel(settings: CallAgentSettingsValues) {
  return (settings.geminiVoiceModel || DEFAULT_GEMINI_VOICE_MODEL).trim();
}

export function getEffectiveGeminiLiveModel(settings: CallAgentSettingsValues) {
  return (settings.geminiLiveModel || settings.geminiVoiceModel || DEFAULT_GEMINI_LIVE_MODEL).trim();
}
