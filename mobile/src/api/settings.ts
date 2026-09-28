import client from './client';

export interface UserSettingsResponse {
  settings: {
    theme: string;
    accentColor: string;
    sidebarDensity: string;
    animationsEnabled: boolean;
    notifyShipmentEmail: boolean;
    notifyShipmentPush: boolean;
    notifyPaymentEmail: boolean;
    notifyCriticalSms: boolean;
    twoFactorEnabled: boolean;
    language: string;
  };
}

export interface CallAgentSettingsResponse {
  urls: {
    preferredBaseUrl: string;
    configuredBaseUrl: string | null;
    detectedBaseUrl: string;
    source: 'NEXT_PUBLIC_APP_URL' | 'request';
    webhookUrl: string;
    websocketUrl: string;
    webhookMethod: 'POST';
  };
  status: {
    voiceWebhookTokenConfigured: boolean;
    geminiStandardConfigured: boolean;
    geminiLiveConfigured: boolean;
    geminiVoiceModel: string;
    geminiLiveModel: string;
    twilioAccountSidConfigured: boolean;
    twilioAuthTokenConfigured: boolean;
    twilioApiKeyConfigured: boolean;
    twilioApiSecretConfigured: boolean;
    twilioAuthMode: 'auth-token' | 'api-key' | 'missing';
    twilioConfigured: boolean;
    twilioPhoneNumberConfigured: boolean;
    twilioPhoneNumberSidConfigured: boolean;
  };
  twilioInspection: {
    attempted: boolean;
    inspected: boolean;
    source: string;
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
}

export interface AiLogRecord {
  id: string;
  feature: string;
  entityType: string | null;
  entityId: string | null;
  provider: string;
  model: string | null;
  status: string;
  createdAt: string;
  prompt: string;
}

export interface AiLogsResponse {
  logs: AiLogRecord[];
  count: number;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  performedAt: string;
  performedBy: string;
  actor?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  target?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface AuditLogsResponse {
  logs: AuditLogRecord[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export const settingsApi = {
  async getSettings(): Promise<UserSettingsResponse> {
    const response = await client.get<UserSettingsResponse>('/api/settings');
    return response.data;
  },

  async getCallAgentSettings(): Promise<CallAgentSettingsResponse> {
    const response = await client.get<CallAgentSettingsResponse>('/api/settings/call-agent');
    return response.data;
  },

  async getAiLogs(limit = 20): Promise<AiLogsResponse> {
    const response = await client.get<AiLogsResponse>('/api/ai/logs', {
      params: { limit },
    });
    return response.data;
  },

  async getAuditLogs(limit = 20): Promise<AuditLogsResponse> {
    const response = await client.get<AuditLogsResponse>('/api/audit-logs', {
      params: { limit },
    });
    return response.data;
  },
};