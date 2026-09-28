import { prisma } from '@/lib/db';
import { decryptSecret, encryptSecret } from '@/lib/secret-crypto';

export const DEFAULT_AI_PROVIDER = 'tokenrouter-ai';
export const DEFAULT_TOKENROUTER_MODEL = 'MiniMax-M3';
export const DEFAULT_TOKENROUTER_CHAT_COMPLETIONS_URL = 'https://api.tokenrouter.com/v1/chat/completions';
export const DEFAULT_TOKENROUTER_MODELS_URL = 'https://api.tokenrouter.com/v1/models';

const AI_PROVIDER_SETTINGS_SCOPE = 'default';

export type AiProviderSettingsValues = {
  enabled: boolean;
  provider: string;
  apiKey: string;
  chatCompletionsUrl: string;
  modelsUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
};

export const EMPTY_AI_PROVIDER_SETTINGS: AiProviderSettingsValues = {
  enabled: true,
  provider: DEFAULT_AI_PROVIDER,
  apiKey: '',
  chatCompletionsUrl: DEFAULT_TOKENROUTER_CHAT_COMPLETIONS_URL,
  modelsUrl: DEFAULT_TOKENROUTER_MODELS_URL,
  model: DEFAULT_TOKENROUTER_MODEL,
  maxTokens: 500,
  temperature: 0.3,
};

function normalizeUrl(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;

  try {
    return new URL(trimmed).toString();
  } catch {
    return fallback;
  }
}

function normalizeNumber(value: number | null | undefined, fallback: number, min: number, max: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function mapAiProviderSettings(
  record?: {
    enabled?: boolean | null;
    provider?: string | null;
    apiKey?: string | null;
    chatCompletionsUrl?: string | null;
    modelsUrl?: string | null;
    model?: string | null;
    maxTokens?: number | null;
    temperature?: number | null;
  } | null,
): AiProviderSettingsValues {
  const decryptedApiKey = decryptSecret(record?.apiKey);

  return {
    enabled: record?.enabled ?? true,
    provider: record?.provider?.trim() || DEFAULT_AI_PROVIDER,
    apiKey: decryptedApiKey,
    chatCompletionsUrl: normalizeUrl(
      record?.chatCompletionsUrl,
      DEFAULT_TOKENROUTER_CHAT_COMPLETIONS_URL,
    ),
    modelsUrl: normalizeUrl(record?.modelsUrl, DEFAULT_TOKENROUTER_MODELS_URL),
    model: record?.model?.trim() || DEFAULT_TOKENROUTER_MODEL,
    maxTokens: normalizeNumber(record?.maxTokens, EMPTY_AI_PROVIDER_SETTINGS.maxTokens, 1, 4000),
    temperature: normalizeNumber(record?.temperature, EMPTY_AI_PROVIDER_SETTINGS.temperature, 0, 2),
  };
}

export function toPersistedAiProviderSettingsData(settings: AiProviderSettingsValues) {
  return {
    enabled: settings.enabled,
    provider: settings.provider || DEFAULT_AI_PROVIDER,
    apiKey: encryptSecret(settings.apiKey),
    chatCompletionsUrl: settings.chatCompletionsUrl || null,
    modelsUrl: settings.modelsUrl || null,
    model: settings.model || null,
    maxTokens: Math.round(normalizeNumber(settings.maxTokens, EMPTY_AI_PROVIDER_SETTINGS.maxTokens, 1, 4000)),
    temperature: normalizeNumber(settings.temperature, EMPTY_AI_PROVIDER_SETTINGS.temperature, 0, 2),
  };
}

export async function getStoredAiProviderSettings() {
  const settings = await prisma.aiProviderSettings.findUnique({
    where: { scope: AI_PROVIDER_SETTINGS_SCOPE },
    select: {
      enabled: true,
      provider: true,
      apiKey: true,
      chatCompletionsUrl: true,
      modelsUrl: true,
      model: true,
      maxTokens: true,
      temperature: true,
    },
  });

  return mapAiProviderSettings(settings);
}

export async function saveStoredAiProviderSettings(partial: Partial<AiProviderSettingsValues>) {
  const current = await getStoredAiProviderSettings();
  const next = {
    ...current,
    ...partial,
  } satisfies AiProviderSettingsValues;

  await prisma.aiProviderSettings.upsert({
    where: { scope: AI_PROVIDER_SETTINGS_SCOPE },
    create: {
      scope: AI_PROVIDER_SETTINGS_SCOPE,
      ...toPersistedAiProviderSettingsData(next),
    },
    update: toPersistedAiProviderSettingsData(next),
  });

  return next;
}

export async function getEffectiveAiProviderSettings() {
  return getStoredAiProviderSettings();
}

export function isAiProviderConfigured(settings: AiProviderSettingsValues) {
  return Boolean(settings.enabled && settings.apiKey.trim() && settings.chatCompletionsUrl.trim());
}

export function maskSecret(value: string) {
  if (!value) return '';
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
