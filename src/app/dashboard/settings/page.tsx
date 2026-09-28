'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Bell, 
  Palette, 
  Shield, 
  Activity, 
  Sun, 
  Moon, 
  Database, 
  RefreshCw, 
  UploadCloud,
  PhoneCall,
  ArrowRight,
  FileText,
  DollarSign,
  Bot,
  CheckCircle2,
  PlugZap,
  XCircle,
  Mail,
  MessageSquare,
  Monitor,
  Check,
  Maximize2,
  Minimize2,
  Send,
  Radio,
  Smartphone,
} from 'lucide-react';
import { Box, Switch, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useTheme, type ThemeMode, type DensityMode } from '@/hooks/useTheme';

import { 
  DashboardSurface, 
  DashboardPanel, 
  DashboardGrid 
} from '@/components/dashboard/DashboardSurface';
import { 
  Button, 
  toast, 
  PageHeader, 
  StatsCard, 
  FormField,
  Select,
  LoadingState
} from '@/components/design-system';
import {
  DEFAULT_SHIPPING_RATE_CONFIG,
  normalizeShippingRateConfig,
  US_STATES,
  type ShippingRateCalculatorConfig,
} from '@/lib/shipping-rate-calculator';

const DEFAULT_SETTINGS = {
  theme: 'light',
  accentColor: 'var(--accent-gold)',
  sidebarDensity: 'comfortable',
  animationsEnabled: true,
  notifyShipmentEmail: true,
  notifyShipmentPush: true,
  notifyPaymentEmail: true,
  notifyCriticalSms: false,
  twoFactorEnabled: false,
  language: 'en',
  calculatorConfig: DEFAULT_SHIPPING_RATE_CONFIG,
};

const baseSettingsTabSlugs = ['profile', 'preferences', 'notifications', 'security'];
const adminSettingsTabSlugs = ['ai', 'communications', 'call-agent', 'price-calculator'];

function TabPanel({ children, value, index }: { children: ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`} aria-labelledby={`settings-tab-${index}`}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

type ProfileData = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
};

type UserSettingsData = {
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
  calculatorConfig: ShippingRateCalculatorConfig;
  createdAt: string;
  updatedAt: string;
};

type BackupInfo = {
  lastBackupAt: string | null;
  backupPath: string | null;
};

type BackupState = {
  loading: boolean;
  running: boolean;
  info: BackupInfo | null;
};

type AiConnectivityStatus = {
  provider: string;
  configured: boolean;
  enabled?: boolean;
  model: string;
  chatCompletionsUrl?: string;
  modelsUrl?: string;
  maxTokens?: number;
  temperature?: number;
  maskedApiKey?: string;
  lookbackHours: number;
  stats: {
    totalRuns: number;
    providerRuns: number;
    tokenRouterRuns: number;
    fallbackRuns: number;
    successRuns: number;
    failedRuns: number;
    successRate: number | null;
  };
  latestLog: {
    provider: string;
    model: string | null;
    status: string;
    createdAt: string;
  } | null;
  latestSuccess: {
    provider: string;
    model: string | null;
    createdAt: string;
  } | null;
  latestFailure: {
    provider: string;
    model: string | null;
    status: string;
    reason: string | null;
    createdAt: string;
  } | null;
};

type AiProviderSettingsData = {
  enabled: boolean;
  provider: string;
  apiKey: string;
  apiKeyMasked: string;
  apiKeyConfigured: boolean;
  apiKeyNeedsReset: boolean;
  chatCompletionsUrl: string;
  modelsUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
};

type CommunicationSettingsData = {
  emailEnabled: boolean;
  emailProvider: string;
  emailApiKey: string;
  emailApiKeyConfigured: boolean;
  emailApiKeyMasked: string;
  emailFromAddress: string;
  emailReplyToAddress: string;
  emailConfigured: boolean;
  smsEnabled: boolean;
  smsProvider: string;
  smsAccountSid: string;
  smsAuthToken: string;
  smsAuthTokenConfigured: boolean;
  smsAuthTokenMasked: string;
  smsFromNumber: string;
  smsMessagingServiceSid: string;
  smsConfigured: boolean;
};

type CallAgentSettingsData = {
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

type CallAgentConfig = {
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
  twilioValues: Pick<CallAgentSettingsData, 'twilioAccountSid' | 'twilioAuthToken' | 'twilioApiKey' | 'twilioApiSecret' | 'twilioPhoneNumber' | 'twilioPhoneNumberSid'>;
  geminiValues: Pick<CallAgentSettingsData, 'geminiApiKey' | 'geminiLiveApiKey' | 'geminiVoiceModel' | 'geminiLiveModel'>;
  twilioInspection: {
    inspected: boolean;
    matchesExpectedWebhook: boolean | null;
    phoneNumber: string | null;
    target: string | null;
    voiceUrl: string | null;
    voiceMethod: string | null;
    error: string | null;
  };
};

const DEFAULT_CALL_AGENT_SETTINGS: CallAgentSettingsData = {
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioApiKey: '',
  twilioApiSecret: '',
  twilioPhoneNumber: '',
  twilioPhoneNumberSid: '',
  geminiApiKey: '',
  geminiLiveApiKey: '',
  geminiVoiceModel: 'gemini-2.5-flash',
  geminiLiveModel: 'gemini-3.1-flash-live-preview',
};

const DEFAULT_COMMUNICATION_SETTINGS: CommunicationSettingsData = {
  emailEnabled: false,
  emailProvider: 'resend',
  emailApiKey: '',
  emailApiKeyConfigured: false,
  emailApiKeyMasked: '',
  emailFromAddress: 'notifications@jacxishipping.com',
  emailReplyToAddress: 'support@jacxishipping.com',
  emailConfigured: false,
  smsEnabled: false,
  smsProvider: 'twilio',
  smsAccountSid: '',
  smsAuthToken: '',
  smsAuthTokenConfigured: false,
  smsAuthTokenMasked: '',
  smsFromNumber: '',
  smsMessagingServiceSid: '',
  smsConfigured: false,
};

const DEFAULT_AI_PROVIDER_SETTINGS: AiProviderSettingsData = {
  enabled: true,
  provider: 'tokenrouter-ai',
  apiKey: '',
  apiKeyMasked: '',
  apiKeyConfigured: false,
  apiKeyNeedsReset: false,
  chatCompletionsUrl: 'https://api.tokenrouter.com/v1/chat/completions',
  modelsUrl: 'https://api.tokenrouter.com/v1/models',
  model: 'MiniMax-M3',
  maxTokens: 500,
  temperature: 0.3,
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes <= 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
};

const parseJsonResponse = async (response: Response) => {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      message: text.startsWith('<!DOCTYPE')
        ? `Server returned an HTML error page with status ${response.status}`
        : text || `Request failed with status ${response.status}`,
    };
  }
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = session?.user?.role === 'admin';
  const [activeTab, setActiveTab] = useState(0);
  const { 
    theme: currentTheme, 
    setTheme: setGlobalTheme,
    density: currentDensity,
    setDensity: setGlobalDensity
  } = useTheme();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '', city: '', country: '' });
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const [backupState, setBackupState] = useState<BackupState>({
    loading: true,
    running: false,
    info: null,
  });
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [ratePdfFile, setRatePdfFile] = useState<File | null>(null);
  const [rateConfig, setRateConfig] = useState<ShippingRateCalculatorConfig>(DEFAULT_SHIPPING_RATE_CONFIG);
  const [aiConnectivity, setAiConnectivity] = useState<AiConnectivityStatus | null>(null);
  const [aiProviderSettings, setAiProviderSettings] = useState<AiProviderSettingsData>(DEFAULT_AI_PROVIDER_SETTINGS);
  const [communicationSettings, setCommunicationSettings] = useState<CommunicationSettingsData>(DEFAULT_COMMUNICATION_SETTINGS);
  const [communicationTestTarget, setCommunicationTestTarget] = useState({ email: '', sms: '' });
  const [callAgentConfig, setCallAgentConfig] = useState<CallAgentConfig | null>(null);
  const [callAgentSettings, setCallAgentSettings] = useState<CallAgentSettingsData>(DEFAULT_CALL_AGENT_SETTINGS);
  const [aiTestResult, setAiTestResult] = useState<{
    latencyMs: number;
    responsePreview: string;
    model: string;
    testedAt: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [importingRates, setImportingRates] = useState(false);
  const [refreshingAiConnectivity, setRefreshingAiConnectivity] = useState(false);
  const [testingAiConnectivity, setTestingAiConnectivity] = useState(false);
  const [savingAiProviderSettings, setSavingAiProviderSettings] = useState(false);
  const [savingCommunicationSettings, setSavingCommunicationSettings] = useState(false);
  const [testingCommunicationChannel, setTestingCommunicationChannel] = useState<'email' | 'sms' | null>(null);
  const [savingCallAgentSettings, setSavingCallAgentSettings] = useState(false);

  // Milestone Alerts State
  const [milestoneConfig, setMilestoneConfig] = useState({
    enabled: true,
    enableWhatsApp: true,
    enableTelegram: false,
    enableSms: true,
    telegramBotToken: '',
    telegramChatId: '',
    whatsAppPhoneNumber: '',
    webhookUrl: '',
    customTemplates: {} as Record<string, string>,
  });
  const [defaultMilestoneTemplates, setDefaultMilestoneTemplates] = useState<any>({});
  const [savingMilestoneConfig, setSavingMilestoneConfig] = useState(false);
  const [testingMilestone, setTestingMilestone] = useState<string | null>(null);

  useEffect(() => {
    const slugs = isAdmin ? [...baseSettingsTabSlugs, ...adminSettingsTabSlugs] : baseSettingsTabSlugs;
    const tab = searchParams.get('tab');
    const index = tab ? slugs.indexOf(tab) : -1;
    if (index >= 0 && index !== activeTab) setActiveTab(index);
  }, [activeTab, isAdmin, searchParams]);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/auth/signin?callbackUrl=/dashboard/settings');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, settingsRes, backupRes, aiConnectivityRes, aiProviderRes, communicationRes, callAgentRes, milestoneRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/settings'),
          isAdmin ? fetch('/api/settings/backup', { cache: 'no-store' }) : Promise.resolve(null),
          isAdmin ? fetch('/api/settings/ai-connectivity', { cache: 'no-store' }) : Promise.resolve(null),
          isAdmin ? fetch('/api/settings/ai-provider', { cache: 'no-store' }) : Promise.resolve(null),
          isAdmin ? fetch('/api/settings/communications', { cache: 'no-store' }) : Promise.resolve(null),
          isAdmin ? fetch('/api/settings/call-agent', { cache: 'no-store' }) : Promise.resolve(null),
          isAdmin ? fetch('/api/notifications/milestone-alerts', { cache: 'no-store' }) : Promise.resolve(null),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.user);
          setProfileForm({
            name: data.user.name ?? '',
            phone: data.user.phone ?? '',
            address: data.user.address ?? '',
            city: data.user.city ?? '',
            country: data.user.country ?? '',
          });
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          const values = data.settings;
          const calculatorConfig = normalizeShippingRateConfig(values.calculatorConfig);
          setSettings(values);
          setSettingsForm({
            theme: values.theme,
            accentColor: values.accentColor,
            sidebarDensity: values.sidebarDensity,
            animationsEnabled: values.animationsEnabled,
            notifyShipmentEmail: values.notifyShipmentEmail,
            notifyShipmentPush: values.notifyShipmentPush,
            notifyPaymentEmail: values.notifyPaymentEmail,
            notifyCriticalSms: values.notifyCriticalSms,
            twoFactorEnabled: values.twoFactorEnabled,
            language: values.language,
            calculatorConfig,
          });
          setRateConfig(calculatorConfig);
        }

        if (backupRes?.ok) {
          const data = await backupRes.json();
          setBackupState(prev => ({
            ...prev,
            info: {
              lastBackupAt: data.lastBackupAt ?? null,
              backupPath: data.backupPath ?? null,
            },
            loading: false
          }));
        } else {
          setBackupState(prev => ({
            ...prev,
            loading: false,
          }));
        }

        if (aiConnectivityRes?.ok) {
          const data = await aiConnectivityRes.json();
          setAiConnectivity(data);
        }

        if (aiProviderRes?.ok) {
          const data = await aiProviderRes.json();
          setAiProviderSettings({ ...DEFAULT_AI_PROVIDER_SETTINGS, ...data.settings });
        }

        if (communicationRes?.ok) {
          const data = await communicationRes.json();
          setCommunicationSettings({ ...DEFAULT_COMMUNICATION_SETTINGS, ...data.settings });
        }

        if (callAgentRes?.ok) {
          const data = await callAgentRes.json() as CallAgentConfig;
          setCallAgentConfig(data);
          setCallAgentSettings({
            ...DEFAULT_CALL_AGENT_SETTINGS,
            ...data.twilioValues,
            ...data.geminiValues,
          });
        }

        if (milestoneRes?.ok) {
          const data = await milestoneRes.json();
          if (data.config) setMilestoneConfig((prev) => ({ ...prev, ...data.config }));
          if (data.defaultTemplates) setDefaultMilestoneTemplates(data.defaultTemplates);
        }
      } catch (error) {
        console.error('Error fetching settings data:', error);
        toast.error('Failed to load settings data');
        setBackupState(prev => ({
          ...prev,
          loading: false,
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, session, status, router]);

  const handleProfileFieldChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      const data = await response.json();
      setProfile(data.user);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Unable to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const updateSettings = async (fields: Partial<typeof settingsForm>, successMessage: string) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      const data = await response.json();
      setSettings(data.settings);
      setSettingsForm(prev => ({ ...prev, ...fields }));
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error('Unable to update settings');
    }
  };

  const handleSavePreferences = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingPreferences(true);
    await updateSettings(
      {
        theme: settingsForm.theme,
        accentColor: settingsForm.accentColor,
        sidebarDensity: settingsForm.sidebarDensity,
        animationsEnabled: settingsForm.animationsEnabled,
        language: settingsForm.language,
      },
      'Preferences saved'
    );
    setSavingPreferences(false);
  };

  const handleSaveNotifications = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingNotifications(true);
    await updateSettings(
      {
        notifyShipmentEmail: settingsForm.notifyShipmentEmail,
        notifyShipmentPush: settingsForm.notifyShipmentPush,
        notifyPaymentEmail: settingsForm.notifyPaymentEmail,
        notifyCriticalSms: settingsForm.notifyCriticalSms,
      },
      'Notification preferences saved'
    );
    setSavingNotifications(false);
  };

  const handleToggleTwoFactor = async () => {
    setSavingSecurity(true);
    await updateSettings(
      { twoFactorEnabled: !settingsForm.twoFactorEnabled },
      settingsForm.twoFactorEnabled ? 'Two-factor authentication disabled' : 'Two-factor authentication enabled'
    );
    setSavingSecurity(false);
  };

  const handleCreateBackup = async () => {
    setBackupState(prev => ({ ...prev, running: true }));
    try {
      const response = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Failed to create backup');
      
      setBackupState(prev => ({
        ...prev,
        info: {
          lastBackupAt: data.lastBackupAt ?? prev.info?.lastBackupAt ?? null,
          backupPath: data.backupPath ?? prev.info?.backupPath ?? null,
        },
      }));
      toast.success('Backup created successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create backup');
    } finally {
      setBackupState(prev => ({ ...prev, running: false }));
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupFile) {
      toast.error('Please select a backup file');
      return;
    }
    
    setBackupState(prev => ({ ...prev, running: true }));
    try {
      const content = await backupFile.text();
      const response = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', backupContent: content }),
      });
      
      if (!response.ok) throw new Error('Failed to restore backup');
      toast.success('Database restored successfully');
      setBackupFile(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to restore database');
    } finally {
      setBackupState(prev => ({ ...prev, running: false }));
    }
  };

  const handleRateConfigChange = <T extends keyof ShippingRateCalculatorConfig>(
    field: T,
    value: ShippingRateCalculatorConfig[T],
  ) => {
    setRateConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleStateRateChange = (stateCode: string, value: string) => {
    const parsed = Number(value);
    setRateConfig(prev => ({
      ...prev,
      stateRates: {
        ...prev.stateRates,
        [stateCode]: Number.isFinite(parsed) ? parsed : 0,
      },
    }));
  };

  const handleSaveRates = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingRates(true);
    try {
      const response = await fetch('/api/settings/shipping-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rateConfig),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Failed to save rate settings');
      setRateConfig(data.config);
      setSettingsForm(prev => ({ ...prev, calculatorConfig: data.config }));
      toast.success('Calculator rates saved');
    } catch (error) {
      console.error(error);
      toast.error('Unable to save calculator rates');
    } finally {
      setSavingRates(false);
    }
  };

  const handleImportRatesPdf = async () => {
    if (!ratePdfFile) {
      toast.error('Select a rate PDF first');
      return;
    }

    setImportingRates(true);
    try {
      const formData = new FormData();
      formData.append('file', ratePdfFile);
      const response = await fetch('/api/settings/shipping-rates/import-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Failed to import PDF rates');
      setRateConfig(data.config);
      setSettingsForm(prev => ({ ...prev, calculatorConfig: data.config }));
      setRatePdfFile(null);
      toast.success(`Imported ${data.importedAuctionRateCount || data.importedCount} rates from PDF`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to import PDF rates');
    } finally {
      setImportingRates(false);
    }
  };

  const refreshAiConnectivity = async (showToastOnError = true) => {
    try {
      setRefreshingAiConnectivity(true);
      const response = await fetch('/api/settings/ai-connectivity', { cache: 'no-store' });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Failed to load AI connectivity');
      setAiConnectivity(data);
      return true;
    } catch (error) {
      if (showToastOnError) {
        toast.error(error instanceof Error ? error.message : 'Unable to refresh AI connectivity');
      }
      return false;
    } finally {
      setRefreshingAiConnectivity(false);
    }
  };

  const handleTestAiConnectivity = async () => {
    try {
      setTestingAiConnectivity(true);
      const response = await fetch('/api/settings/ai-connectivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        if (data?.status) setAiConnectivity(data.status);
        throw new Error(data?.message || 'AI connectivity test failed');
      }

      setAiConnectivity(data.status);
      setAiTestResult({
        latencyMs: data.latencyMs,
        responsePreview: data.responsePreview,
        model: data.model,
        testedAt: new Date().toISOString(),
      });
      toast.success('AI connectivity test passed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI connectivity test failed');
    } finally {
      setTestingAiConnectivity(false);
    }
  };

  const handleAiProviderFieldChange = <T extends keyof AiProviderSettingsData>(
    field: T,
    value: AiProviderSettingsData[T],
  ) => {
    setAiProviderSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAiProviderSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSavingAiProviderSettings(true);
      const response = await fetch('/api/settings/ai-provider', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: aiProviderSettings.enabled,
          provider: aiProviderSettings.provider,
          apiKey: aiProviderSettings.apiKey,
          chatCompletionsUrl: aiProviderSettings.chatCompletionsUrl,
          modelsUrl: aiProviderSettings.modelsUrl,
          model: aiProviderSettings.model,
          maxTokens: Number(aiProviderSettings.maxTokens),
          temperature: Number(aiProviderSettings.temperature),
        }),
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Failed to save AI provider settings');
      setAiProviderSettings({ ...DEFAULT_AI_PROVIDER_SETTINGS, ...data.settings });
      await refreshAiConnectivity(false);
      toast.success('AI provider settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save AI provider settings');
    } finally {
      setSavingAiProviderSettings(false);
    }
  };

  const handleCommunicationFieldChange = <T extends keyof CommunicationSettingsData>(
    field: T,
    value: CommunicationSettingsData[T],
  ) => {
    setCommunicationSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCommunicationSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSavingCommunicationSettings(true);
      const response = await fetch('/api/settings/communications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailEnabled: communicationSettings.emailEnabled,
          emailProvider: communicationSettings.emailProvider,
          emailApiKey: communicationSettings.emailApiKey,
          emailFromAddress: communicationSettings.emailFromAddress,
          emailReplyToAddress: communicationSettings.emailReplyToAddress,
          smsEnabled: communicationSettings.smsEnabled,
          smsProvider: communicationSettings.smsProvider,
          smsAccountSid: communicationSettings.smsAccountSid,
          smsAuthToken: communicationSettings.smsAuthToken,
          smsFromNumber: communicationSettings.smsFromNumber,
          smsMessagingServiceSid: communicationSettings.smsMessagingServiceSid,
        }),
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Failed to save communication settings');
      setCommunicationSettings({ ...DEFAULT_COMMUNICATION_SETTINGS, ...data.settings });
      toast.success('Communication settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save communication settings');
    } finally {
      setSavingCommunicationSettings(false);
    }
  };

  const handleTestCommunication = async (channel: 'email' | 'sms') => {
    const to = communicationTestTarget[channel].trim();
    if (!to) {
      toast.error(channel === 'email' ? 'Enter a test email address' : 'Enter a test phone number');
      return;
    }

    try {
      setTestingCommunicationChannel(channel);
      const response = await fetch('/api/settings/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, to }),
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Communication test failed');
      toast.success(`${channel === 'email' ? 'Email' : 'SMS'} test sent`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Communication test failed');
    } finally {
      setTestingCommunicationChannel(null);
    }
  };

  const handleCallAgentFieldChange = <T extends keyof CallAgentSettingsData>(
    field: T,
    value: CallAgentSettingsData[T],
  ) => {
    setCallAgentSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCallAgentSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSavingCallAgentSettings(true);
      const response = await fetch('/api/settings/call-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callAgentSettings),
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Failed to save live call agent settings');

      const config = data as CallAgentConfig;
      setCallAgentConfig(config);
      setCallAgentSettings({
        ...DEFAULT_CALL_AGENT_SETTINGS,
        ...config.twilioValues,
        ...config.geminiValues,
      });
      toast.success('Live call agent settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save live call agent settings');
    } finally {
      setSavingCallAgentSettings(false);
    }
  };

  const handleSaveMilestoneConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingMilestoneConfig(true);
    try {
      const res = await fetch('/api/notifications/milestone-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          config: milestoneConfig,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save milestone alert configuration.');
      }

      toast.success('Shipment Milestone Alert settings saved successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Could not save milestone settings.');
    } finally {
      setSavingMilestoneConfig(false);
    }
  };

  const handleTestMilestoneTrigger = async (milestone: string, customerPhone?: string) => {
    setTestingMilestone(milestone);
    try {
      const res = await fetch('/api/notifications/milestone-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger',
          milestone,
          customerPhone: customerPhone || communicationTestTarget.sms || '+15555555555',
          customerName: 'Ahmad Al-Mansoor',
          vehicleInfo: '2023 Mercedes-Benz GLE 450',
          vin: '4JGFF5KE7PA194821',
          lotNumber: '58291048',
          containerNumber: 'MSKU9048123',
          vesselName: 'MAERSK VOYAGER',
          originPort: 'Port of Newark (USNWK)',
          destinationPort: 'Port of Jebel Ali (AEJEA)',
          etaDate: 'Oct 15, 2026',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Test trigger failed.');
      }

      const successfulDispatches = (data.dispatches || []).filter((d: any) => d.success).map((d: any) => d.channel);
      if (successfulDispatches.length > 0) {
        toast.success(`Milestone alert sent via: ${successfulDispatches.join(', ')}`);
      } else {
        toast.warning('Milestone simulated (check channel credentials).');
      }
    } catch (err: any) {
      toast.error(err.message || 'Milestone test dispatch failed.');
    } finally {
      setTestingMilestone(null);
    }
  };

  const notificationSummary = useMemo(() => {
    const channels = [];
    if (settingsForm.notifyShipmentEmail || settingsForm.notifyPaymentEmail) channels.push('Email');
    if (settingsForm.notifyShipmentPush) channels.push('Push');
    if (settingsForm.notifyCriticalSms) channels.push('SMS');
    return channels.length ? channels.join(' + ') : 'Disabled';
  }, [settingsForm]);

  const settingsTabs = useMemo(() => {
    const tabs = [
      { label: 'Profile', icon: <User className="h-4 w-4" /> },
      { label: 'Preferences', icon: <Palette className="h-4 w-4" /> },
      { label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
      { label: isAdmin ? 'Security & Backup' : 'Security', icon: <Shield className="h-4 w-4" /> },
    ];

    if (isAdmin) {
      tabs.push(
        { label: 'AI', icon: <Bot className="h-4 w-4" /> },
        { label: 'Communications', icon: <Mail className="h-4 w-4" /> },
        { label: 'Call Agent', icon: <PhoneCall className="h-4 w-4" /> },
        { label: 'Price Calculator', icon: <DollarSign className="h-4 w-4" /> },
      );
    }

    return tabs;
  }, [isAdmin]);

  if (status === 'loading' || loading) {
    return <LoadingState fullScreen message="Loading settings..." />;
  }

  return (
    <DashboardSurface>
      <PageHeader 
        showBreadcrumbs
        title={isAdmin ? 'Admin Settings' : 'Settings'} 
        description={isAdmin ? 'Manage your profile, preferences, and system configuration' : 'Manage your profile, preferences, and account settings'}
      />

      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 15,
          border: '1px solid var(--border)',
          borderRadius: '12px',
          backgroundColor: 'var(--panel)',
          boxShadow: '0 12px 28px rgba(var(--text-primary-rgb),0.08)',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => {
            setActiveTab(newValue);
            const slugs = isAdmin ? [...baseSettingsTabSlugs, ...adminSettingsTabSlugs] : baseSettingsTabSlugs;
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.set('tab', slugs[newValue] || slugs[0]);
            router.replace(`?${nextParams.toString()}`, { scroll: false });
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 52,
            '& .MuiTabs-flexContainer': {
              gap: 0.25,
              px: 1,
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 650,
              color: 'var(--text-secondary)',
              minHeight: 52,
              borderRadius: '10px',
              my: 0.75,
              px: 1.5,
              '&:hover': {
                color: 'var(--accent-gold)',
                backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)',
              },
            },
            '& .Mui-selected': {
              color: 'var(--accent-gold) !important',
              backgroundColor: 'rgba(var(--accent-gold-rgb), 0.1)',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'var(--accent-gold)',
              height: 3,
            },
          }}
        >
          {settingsTabs.map((tab, index) => (
            <Tab
              key={tab.label}
              id={`settings-tab-${index}`}
              aria-controls={`settings-tabpanel-${index}`}
              icon={tab.icon}
              iconPosition="start"
              label={tab.label}
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab 0: Profile */}
      <TabPanel value={activeTab} index={0}>
        <div className="space-y-6">
          <DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              icon={<Shield style={{ fontSize: 18 }} />}
              title="Security Score"
              value={settingsForm.twoFactorEnabled ? '92%' : '68%'}
              variant={settingsForm.twoFactorEnabled ? 'success' : 'warning'}
              size="md"
            />
            <StatsCard
              icon={<Bell style={{ fontSize: 18 }} />}
              title="Notifications"
              value={settingsForm.notifyShipmentEmail ? 'Active' : 'Paused'}
              subtitle={notificationSummary}
              variant="info"
              size="md"
            />
            <StatsCard
              icon={isAdmin ? <Activity style={{ fontSize: 18 }} /> : <Palette style={{ fontSize: 18 }} />}
              title={isAdmin ? 'Last Backup' : 'Theme'}
              value={isAdmin ? (backupState.info?.lastBackupAt ? new Date(backupState.info.lastBackupAt).toLocaleDateString() : 'None') : settingsForm.theme}
              variant={isAdmin ? (backupState.info?.lastBackupAt ? 'success' : 'error') : 'default'}
              size="md"
            />
            <StatsCard
              icon={<User style={{ fontSize: 18 }} />}
              title="Profile Status"
              value={profile?.name ? 'Complete' : 'Incomplete'}
              variant="default"
              size="md"
            />
          </DashboardGrid>

          <DashboardPanel 
            title="Profile & Identity" 
            description="Update your personal information"
          >
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Full Name"
                  value={profileForm.name}
                  onChange={(e) => handleProfileFieldChange('name', e.target.value)}
                  placeholder="John Doe"
                />
                <FormField
                  label="Phone Number"
                  value={profileForm.phone}
                  onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                />
                <FormField
                  label="Address"
                  value={profileForm.address}
                  onChange={(e) => handleProfileFieldChange('address', e.target.value)}
                  placeholder="123 Main St"
                />
                <FormField
                  label="City"
                  value={profileForm.city}
                  onChange={(e) => handleProfileFieldChange('city', e.target.value)}
                  placeholder="New York"
                />
                <FormField
                  label="Country"
                  value={profileForm.country}
                  onChange={(e) => handleProfileFieldChange('country', e.target.value)}
                  placeholder="USA"
                />
                <FormField
                  label="Email"
                  value={session?.user?.email ?? ''}
                  disabled
                  helperText="Contact admin to change email"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingProfile} variant="primary">
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </DashboardPanel>
        </div>
      </TabPanel>

      {/* Tab 1: Preferences */}
      <TabPanel value={activeTab} index={1}>
        <div className="max-w-3xl">
          <DashboardPanel 
            title="Interface Preferences" 
            description="Customize your dashboard experience and visual appearance"
          >
            <form onSubmit={handleSavePreferences} className="space-y-6">
              {/* Visual Theme Selector */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2.5">
                  Theme Appearance
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'light',
                      name: 'Light Mode',
                      desc: 'Clean daylight enterprise view',
                      icon: Sun,
                    },
                    {
                      id: 'dark',
                      name: 'Dark Mode',
                      desc: 'Deep contrast for low-light work',
                      icon: Moon,
                    },
                    {
                      id: 'system',
                      name: 'System Default',
                      desc: 'Syncs automatically with OS settings',
                      icon: Monitor,
                    },
                  ].map((item) => {
                    const isSelected = (settingsForm.theme || currentTheme) === item.id;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSettingsForm((prev) => ({ ...prev, theme: item.id }));
                          setGlobalTheme(item.id as ThemeMode);
                        }}
                        className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-[var(--accent-gold)] bg-[var(--panel)] shadow-md'
                            : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent-gold)]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isSelected
                                ? 'bg-[var(--accent-gold)] text-white'
                                : 'bg-[var(--background)] text-[var(--text-secondary)]'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[var(--accent-gold)] text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {item.name}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)] mt-1">
                          {item.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Visual UI Density & Layout Selector */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2.5">
                  Layout Density & Theme Scale
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'comfortable',
                      name: 'Comfort Theme (Relaxed)',
                      desc: 'Spacious padding, standard row heights, and optimal readability',
                      icon: Maximize2,
                      tag: 'Default',
                    },
                    {
                      id: 'compact',
                      name: 'Compact Theme (High Density)',
                      desc: 'Condensed table rows, tighter card paddings, and higher data density for power operations',
                      icon: Minimize2,
                      tag: 'Power Users',
                    },
                  ].map((item) => {
                    const isSelected = (settingsForm.sidebarDensity || currentDensity) === item.id;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSettingsForm((prev) => ({ ...prev, sidebarDensity: item.id }));
                          setGlobalDensity(item.id as DensityMode);
                        }}
                        className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-[var(--accent-gold)] bg-[var(--panel)] shadow-md'
                            : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent-gold)]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`p-2 rounded-lg ${
                                isSelected
                                  ? 'bg-[var(--accent-gold)] text-white'
                                  : 'bg-[var(--background)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]">
                              {item.tag}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[var(--accent-gold)] text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {item.name}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)] mt-1">
                          {item.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Language"
                  value={settingsForm.language}
                  onChange={(value) => setSettingsForm(prev => ({ ...prev, language: String(value) }))}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'ar', label: 'Arabic' },
                    { value: 'fr', label: 'French' },
                  ]}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingPreferences} variant="primary">
                  {savingPreferences ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </form>
          </DashboardPanel>
        </div>
      </TabPanel>

      {/* Tab 2: Notifications */}
      <TabPanel value={activeTab} index={2}>
        <div className="max-w-3xl">
          <DashboardPanel 
            title="Notification Rules" 
            description="Manage your alert preferences"
          >
            <form onSubmit={handleSaveNotifications} className="space-y-4">
              {[
                { key: 'notifyShipmentEmail', label: 'Email: Shipment Updates' },
                { key: 'notifyShipmentPush', label: 'Push: Shipment Updates' },
                { key: 'notifyPaymentEmail', label: 'Email: Payment Reminders' },
                { key: 'notifyCriticalSms', label: 'SMS: Critical Alerts' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg">
                  <Typography variant="body2" color="text.primary">
                    {item.label}
                  </Typography>
                  <Button
                    type="button"
                    variant={settingsForm[item.key as keyof typeof settingsForm] ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSettingsForm(prev => ({ 
                      ...prev, 
                      [item.key]: !prev[item.key as keyof typeof settingsForm] 
                    }))}
                  >
                    {settingsForm[item.key as keyof typeof settingsForm] ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingNotifications} variant="primary">
                  {savingNotifications ? 'Saving...' : 'Save Rules'}
                </Button>
              </div>
            </form>
          </DashboardPanel>
        </div>
      </TabPanel>

      {/* Tab 3: Security & Backup */}
      <TabPanel value={activeTab} index={3}>
        <div className="max-w-3xl">
          <DashboardPanel 
            title={isAdmin ? 'System & Backup' : 'Security'} 
            description={isAdmin ? 'Database management and security' : 'Account security controls'}
          >
            <div className="space-y-6">
              <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--background)]">
                <div className="flex items-center justify-between mb-2">
                  <Typography variant="subtitle2" fontWeight="600">Two-Factor Authentication</Typography>
                  <Button 
                    variant={settingsForm.twoFactorEnabled ? 'primary' : 'outline'} 
                    size="sm"
                    onClick={handleToggleTwoFactor}
                    disabled={savingSecurity}
                  >
                    {settingsForm.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                <Typography variant="caption" color="text.secondary">
                  {isAdmin ? 'Require authenticator verification for admin dashboard sign-in.' : 'Require extra verification for your account sign-in.'}
                </Typography>
              </div>

              {isAdmin ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Typography variant="subtitle2" fontWeight="600">Create Backup</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Generate a JSON snapshot of current data.
                    </Typography>
                    <Button 
                      onClick={handleCreateBackup} 
                      disabled={backupState.running}
                      variant="primary"
                      fullWidth
                      icon={backupState.running ? <RefreshCw className="animate-spin" /> : <Database />}
                    >
                      {backupState.running ? 'Backing up...' : 'Create Backup'}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Typography variant="subtitle2" fontWeight="600">Restore Data</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Upload a JSON backup file to restore.
                    </Typography>
                    <input
                      type="file"
                      accept="application/json"
                      onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="backup-upload"
                    />
                    <label htmlFor="backup-upload">
                      <Button 
                        component="span" 
                        variant="outline" 
                        fullWidth
                        icon={<UploadCloud />}
                      >
                        {backupFile ? 'File Selected' : 'Select File'}
                      </Button>
                    </label>
                    {backupFile && (
                      <Button 
                        onClick={handleRestoreBackup} 
                        disabled={backupState.running}
                        variant="danger"
                        fullWidth
                        size="sm"
                      >
                        Confirm Restore
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </DashboardPanel>
        </div>
      </TabPanel>

      {/* Tab 4: AI Connectivity */}
      <TabPanel value={activeTab} index={4}>
      {isAdmin ? (
        <DashboardPanel
          title="AI Connectivity"
          description="TokenRouter provider status, recent usage, fallbacks, and a live connectivity test."
          actions={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => void refreshAiConnectivity()}
                loading={refreshingAiConnectivity}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<PlugZap className="w-4 h-4" />}
                onClick={() => void handleTestAiConnectivity()}
                loading={testingAiConnectivity}
              >
                Test AI
              </Button>
            </Box>
          }
        >
          <div className="space-y-4">
            <Box
              component="form"
              onSubmit={handleSaveAiProviderSettings}
              sx={{
                p: 2,
                border: '1px solid var(--border)',
                borderRadius: 2,
                bgcolor: 'var(--background)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Box>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Editable AI Provider
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                    These values power dashboard AI, document extraction, OCR, and price-list parsing. Environment variables are only used as fallback defaults.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {aiProviderSettings.enabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                  <Switch
                    checked={aiProviderSettings.enabled}
                    onChange={(event) => handleAiProviderFieldChange('enabled', event.target.checked)}
                    disabled={savingAiProviderSettings}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                <TextField
                  size="small"
                  label="Provider"
                  value={aiProviderSettings.provider}
                  onChange={(event) => handleAiProviderFieldChange('provider', event.target.value)}
                  disabled={savingAiProviderSettings}
                />
                <TextField
                  size="small"
                  label="Model"
                  value={aiProviderSettings.model}
                  onChange={(event) => handleAiProviderFieldChange('model', event.target.value)}
                  disabled={savingAiProviderSettings}
                />
                <TextField
                  size="small"
                  label="API Key"
                  type="password"
                  value={aiProviderSettings.apiKey}
                  onChange={(event) => handleAiProviderFieldChange('apiKey', event.target.value)}
                  placeholder={aiProviderSettings.apiKeyConfigured ? `Saved: ${aiProviderSettings.apiKeyMasked}` : 'Paste API key'}
                  helperText={
                    aiProviderSettings.apiKeyNeedsReset
                      ? 'Stored key cannot be decrypted with the current app secret. Paste the API key again and save.'
                      : aiProviderSettings.apiKeyConfigured
                      ? 'Leave blank to keep the saved encrypted key.'
                      : 'Saved encrypted using the app secret.'
                  }
                  disabled={savingAiProviderSettings}
                />
                <TextField
                  size="small"
                  label="Max Tokens"
                  type="number"
                  value={aiProviderSettings.maxTokens}
                  onChange={(event) => handleAiProviderFieldChange('maxTokens', Number(event.target.value))}
                  inputProps={{ min: 1, max: 4000 }}
                  disabled={savingAiProviderSettings}
                />
                <TextField
                  size="small"
                  label="Chat Completions URL"
                  value={aiProviderSettings.chatCompletionsUrl}
                  onChange={(event) => handleAiProviderFieldChange('chatCompletionsUrl', event.target.value)}
                  disabled={savingAiProviderSettings}
                  sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
                />
                <TextField
                  size="small"
                  label="Models URL"
                  value={aiProviderSettings.modelsUrl}
                  onChange={(event) => handleAiProviderFieldChange('modelsUrl', event.target.value)}
                  disabled={savingAiProviderSettings}
                  sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
                />
                <TextField
                  size="small"
                  label="Temperature"
                  type="number"
                  value={aiProviderSettings.temperature}
                  onChange={(event) => handleAiProviderFieldChange('temperature', Number(event.target.value))}
                  inputProps={{ min: 0, max: 2, step: 0.1 }}
                  disabled={savingAiProviderSettings}
                />
              </Box>

              {aiProviderSettings.apiKeyNeedsReset ? (
                <Box
                  sx={{
                    border: '1px solid rgba(var(--warning-rgb), 0.4)',
                    borderRadius: 2,
                    bgcolor: 'rgba(var(--warning-rgb), 0.12)',
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--warning-dark)' }}>
                    AI key needs reset
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: 'var(--warning-dark)' }}>
                    The saved AI API key cannot be decrypted in this environment. Re-enter the key in the API Key field and save.
                  </Typography>
                </Box>
              ) : null}

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={savingAiProviderSettings}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Save AI Settings
                </Button>
              </Box>
            </Box>

            <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                icon={aiConnectivity?.configured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="TokenRouter"
                value={aiConnectivity?.configured ? 'Configured' : 'Needs Setup'}
                subtitle={aiConnectivity?.model || 'MiniMax-M3'}
                variant={aiConnectivity?.configured ? 'success' : 'error'}
                size="md"
              />
              <StatsCard
                icon={<Bot style={{ fontSize: 18 }} />}
                title="24h AI Runs"
                value={aiConnectivity ? String(aiConnectivity.stats.providerRuns) : '0'}
                subtitle={`${aiConnectivity?.stats.tokenRouterRuns ?? 0} TokenRouter`}
                variant="info"
                size="md"
              />
              <StatsCard
                icon={<Activity style={{ fontSize: 18 }} />}
                title="24h Success"
                value={aiConnectivity?.stats.successRate === null || aiConnectivity?.stats.successRate === undefined ? 'No Runs' : `${aiConnectivity.stats.successRate}%`}
                subtitle={`${aiConnectivity?.stats.failedRuns ?? 0} failed`}
                variant={(aiConnectivity?.stats.failedRuns ?? 0) > 0 ? 'warning' : 'success'}
                size="md"
              />
              <StatsCard
                icon={<RefreshCw style={{ fontSize: 18 }} />}
                title="Fallbacks"
                value={aiConnectivity ? String(aiConnectivity.stats.fallbackRuns) : '0'}
                subtitle={`Last ${aiConnectivity?.lookbackHours ?? 24} hours`}
                variant={(aiConnectivity?.stats.fallbackRuns ?? 0) > 0 ? 'warning' : 'default'}
                size="md"
              />
            </DashboardGrid>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
              <Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', mb: 1 }}>
                  Latest activity
                </Typography>
                <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {aiConnectivity?.latestLog
                    ? `${aiConnectivity.latestLog.provider} · ${aiConnectivity.latestLog.status}`
                    : 'No AI activity logged yet'}
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 0.75 }}>
                  {aiConnectivity?.latestLog
                    ? `${aiConnectivity.latestLog.model || 'Unknown model'} · ${formatRelativeTime(aiConnectivity.latestLog.createdAt)}`
                    : 'Run a dashboard brief, document extraction, shipment draft, or connectivity test to create a log.'}
                </Typography>
              </Box>

              {aiConnectivity?.latestFailure?.reason && (
                <Box
                  sx={{
                    gridColumn: { xs: '1', lg: '1 / -1' },
                    p: 2,
                    border: '1px solid rgba(var(--warning-rgb), 0.35)',
                    borderRadius: 2,
                    bgcolor: 'rgba(var(--warning-rgb), 0.08)',
                  }}
                >
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--warning-dark)', mb: 0.75 }}>
                    Latest AI failure reason
                  </Typography>
                  <Typography sx={{ fontSize: '0.88rem', color: 'var(--warning-dark)' }}>
                    {aiConnectivity.latestFailure.reason}
                  </Typography>
                </Box>
              )}

              <Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', mb: 1 }}>
                  Last test result
                </Typography>
                <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {aiTestResult ? `${aiTestResult.latencyMs} ms · ${aiTestResult.model}` : 'No test run this session'}
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 0.75 }}>
                  {aiTestResult
                    ? `${aiTestResult.responsePreview} · ${formatRelativeTime(aiTestResult.testedAt)}`
                    : aiConnectivity?.configured
                      ? 'Use Test AI to verify live provider connectivity.'
                      : 'Save an API key in Settings > AI to enable live testing.'}
                </Typography>
              </Box>
            </Box>
          </div>
        </DashboardPanel>
      ) : null}
      </TabPanel>

      {/* Tab 5: Communications */}
      <TabPanel value={activeTab} index={5}>
      {isAdmin ? (
        <DashboardPanel
          title="Communications"
          description="Configure email and SMS/message providers for invoices, reminders, and customer notifications."
          actions={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                size="sm"
                icon={<Mail className="w-4 h-4" />}
                onClick={() => void handleTestCommunication('email')}
                loading={testingCommunicationChannel === 'email'}
                disabled={!communicationSettings.emailConfigured}
              >
                Test Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<MessageSquare className="w-4 h-4" />}
                onClick={() => void handleTestCommunication('sms')}
                loading={testingCommunicationChannel === 'sms'}
                disabled={!communicationSettings.smsConfigured}
              >
                Test SMS
              </Button>
            </Box>
          }
        >
          <Box component="form" onSubmit={handleSaveCommunicationSettings} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <DashboardGrid className="grid-cols-1 md:grid-cols-2">
              <StatsCard
                icon={communicationSettings.emailConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="Email Provider"
                value={communicationSettings.emailConfigured ? 'Configured' : 'Needs Setup'}
                subtitle={communicationSettings.emailProvider}
                variant={communicationSettings.emailConfigured ? 'success' : 'warning'}
                size="md"
              />
              <StatsCard
                icon={communicationSettings.smsConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="SMS Provider"
                value={communicationSettings.smsConfigured ? 'Configured' : 'Needs Setup'}
                subtitle={communicationSettings.smsProvider}
                variant={communicationSettings.smsConfigured ? 'success' : 'warning'}
                size="md"
              />
            </DashboardGrid>

            <Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, mb: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Mail className="w-4 h-4" />
                    Email API
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                    Used by invoice generation, payment reminders, shipment emails, and invoice templates.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{communicationSettings.emailEnabled ? 'Enabled' : 'Disabled'}</Typography>
                  <Switch checked={communicationSettings.emailEnabled} onChange={(event) => handleCommunicationFieldChange('emailEnabled', event.target.checked)} disabled={savingCommunicationSettings} />
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                <TextField size="small" label="Email Provider" value={communicationSettings.emailProvider} onChange={(event) => handleCommunicationFieldChange('emailProvider', event.target.value)} disabled={savingCommunicationSettings} />
                <TextField
                  size="small"
                  label="Resend API Key"
                  type="password"
                  value={communicationSettings.emailApiKey}
                  onChange={(event) => handleCommunicationFieldChange('emailApiKey', event.target.value)}
                  placeholder={communicationSettings.emailApiKeyConfigured ? `Saved: ${communicationSettings.emailApiKeyMasked}` : 'Paste API key'}
                  helperText={communicationSettings.emailApiKeyConfigured ? 'Leave blank to keep the saved encrypted key.' : 'Saved encrypted using the app secret.'}
                  disabled={savingCommunicationSettings}
                />
                <TextField size="small" label="From Email" value={communicationSettings.emailFromAddress} onChange={(event) => handleCommunicationFieldChange('emailFromAddress', event.target.value)} disabled={savingCommunicationSettings} />
                <TextField size="small" label="Reply-To Email" value={communicationSettings.emailReplyToAddress} onChange={(event) => handleCommunicationFieldChange('emailReplyToAddress', event.target.value)} disabled={savingCommunicationSettings} />
                <TextField
                  size="small"
                  label="Test Email Recipient"
                  value={communicationTestTarget.email}
                  onChange={(event) => setCommunicationTestTarget((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="admin@example.com"
                  sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
                />
              </Box>
            </Box>

            <Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, mb: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MessageSquare className="w-4 h-4" />
                    SMS / Number Messages
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                    Used for critical alerts and future customer number-message workflows.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{communicationSettings.smsEnabled ? 'Enabled' : 'Disabled'}</Typography>
                  <Switch checked={communicationSettings.smsEnabled} onChange={(event) => handleCommunicationFieldChange('smsEnabled', event.target.checked)} disabled={savingCommunicationSettings} />
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                <TextField size="small" label="SMS Provider" value={communicationSettings.smsProvider} onChange={(event) => handleCommunicationFieldChange('smsProvider', event.target.value)} disabled={savingCommunicationSettings} />
                <TextField size="small" label="Twilio Account SID" value={communicationSettings.smsAccountSid} onChange={(event) => handleCommunicationFieldChange('smsAccountSid', event.target.value)} disabled={savingCommunicationSettings} />
                <TextField
                  size="small"
                  label="Twilio Auth Token"
                  type="password"
                  value={communicationSettings.smsAuthToken}
                  onChange={(event) => handleCommunicationFieldChange('smsAuthToken', event.target.value)}
                  placeholder={communicationSettings.smsAuthTokenConfigured ? `Saved: ${communicationSettings.smsAuthTokenMasked}` : 'Paste auth token'}
                  helperText={communicationSettings.smsAuthTokenConfigured ? 'Leave blank to keep the saved encrypted token.' : 'Saved encrypted using the app secret.'}
                  disabled={savingCommunicationSettings}
                />
                <TextField size="small" label="From Number" value={communicationSettings.smsFromNumber} onChange={(event) => handleCommunicationFieldChange('smsFromNumber', event.target.value)} disabled={savingCommunicationSettings} />
                <TextField size="small" label="Messaging Service SID" value={communicationSettings.smsMessagingServiceSid} onChange={(event) => handleCommunicationFieldChange('smsMessagingServiceSid', event.target.value)} disabled={savingCommunicationSettings} />
                <TextField size="small" label="Test Phone Number" value={communicationTestTarget.sms} onChange={(event) => setCommunicationTestTarget((prev) => ({ ...prev, sms: event.target.value }))} placeholder="+15555555555" />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="primary" loading={savingCommunicationSettings} icon={<CheckCircle2 className="w-4 h-4" />}>
                Save Communications
              </Button>
            </Box>
          </Box>

          {/* Automated Shipment Milestone Alerts Subpanel */}
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid var(--border)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Smartphone className="w-5 h-5 text-[var(--accent-gold)]" />
                  Automated WhatsApp & SMS Milestone Alerts
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                  Automatic trigger notifications dispatched to clients as vehicle cargo advances through global milestones.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {milestoneConfig.enabled ? 'Automations Active' : 'Automations Paused'}
                </Typography>
                <Switch
                  checked={milestoneConfig.enabled}
                  onChange={(e) => setMilestoneConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                />
              </Box>
            </Box>

            <form onSubmit={handleSaveMilestoneConfig} className="space-y-4">
              {/* Channel Toggles Grid */}
              <DashboardGrid className="grid-cols-1 sm:grid-cols-3">
                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--background)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      WhatsApp Business
                    </Typography>
                    <Switch
                      size="small"
                      checked={milestoneConfig.enableWhatsApp}
                      onChange={(e) => setMilestoneConfig(prev => ({ ...prev, enableWhatsApp: e.target.checked }))}
                    />
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Direct WhatsApp notifications via Twilio / Meta API.
                  </Typography>
                </Box>

                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--background)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Twilio SMS
                    </Typography>
                    <Switch
                      size="small"
                      checked={milestoneConfig.enableSms}
                      onChange={(e) => setMilestoneConfig(prev => ({ ...prev, enableSms: e.target.checked }))}
                    />
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Cellular text messaging for instant mobile notifications.
                  </Typography>
                </Box>

                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--background)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Telegram Bot
                    </Typography>
                    <Switch
                      size="small"
                      checked={milestoneConfig.enableTelegram}
                      onChange={(e) => setMilestoneConfig(prev => ({ ...prev, enableTelegram: e.target.checked }))}
                    />
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Instant dispatch to company Telegram bot / channels.
                  </Typography>
                </Box>
              </DashboardGrid>

              {/* Webhook & Telegram Optional Credentials */}
              <Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', mb: 1.5 }}>
                  Telegram & Webhook Integrations
                </Typography>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <TextField
                    label="Telegram Bot Token"
                    size="small"
                    value={milestoneConfig.telegramBotToken || ''}
                    onChange={(e) => setMilestoneConfig(prev => ({ ...prev, telegramBotToken: e.target.value }))}
                    placeholder="bot123456:ABC-DEF..."
                  />
                  <TextField
                    label="Telegram Chat / Channel ID"
                    size="small"
                    value={milestoneConfig.telegramChatId || ''}
                    onChange={(e) => setMilestoneConfig(prev => ({ ...prev, telegramChatId: e.target.value }))}
                    placeholder="-100123456789"
                  />
                  <TextField
                    label="Custom Webhook URL"
                    size="small"
                    value={milestoneConfig.webhookUrl || ''}
                    onChange={(e) => setMilestoneConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    placeholder="https://hooks.zapier.com/..."
                  />
                </div>
              </Box>

              {/* Milestone Template Cards */}
              <Box sx={{ spaceY: 3 }}>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', mb: 1 }}>
                  Configurable Milestone Message Templates
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)', mb: 2 }}>
                  Variables: {'{customerName}'}, {'{vehicle}'}, {'{vin}'}, {'{lotNumber}'}, {'{containerNumber}'}, {'{vesselName}'}, {'{originPort}'}, {'{destinationPort}'}, {'{etaDate}'}, {'{trackingUrl}'}
                </Typography>

                <div className="space-y-3">
                  {[
                    { key: 'VEHICLE_PICKED_UP', label: '1. Vehicle Picked Up (Auction/Gate Pass)' },
                    { key: 'CONTAINER_LOADED', label: '2. Container Loaded & Sealed' },
                    { key: 'VESSEL_DEPARTED', label: '3. Ocean Vessel Departed (AIS Active)' },
                    { key: 'ARRIVED_AT_PORT', label: '4. Arrived at Destination Port' },
                    { key: 'CUSTOMS_CLEARED', label: '5. Customs Cleared & Ready for Pickup' },
                  ].map((m) => {
                    const currentVal = milestoneConfig.customTemplates[m.key] || defaultMilestoneTemplates[m.key]?.defaultTemplate || '';
                    return (
                      <Box key={m.key} sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {m.label}
                          </Typography>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            icon={<Send className="w-3.5 h-3.5" />}
                            onClick={() => handleTestMilestoneTrigger(m.key)}
                            loading={testingMilestone === m.key}
                          >
                            Send Test
                          </Button>
                        </Box>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          size="small"
                          value={currentVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMilestoneConfig(prev => ({
                              ...prev,
                              customTemplates: {
                                ...prev.customTemplates,
                                [m.key]: val,
                              },
                            }));
                          }}
                        />
                      </Box>
                    );
                  })}
                </div>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                <Button type="submit" variant="primary" loading={savingMilestoneConfig} icon={<CheckCircle2 className="w-4 h-4" />}>
                  Save Milestone Automations
                </Button>
              </Box>
            </form>
          </Box>
        </DashboardPanel>
      ) : null}
      </TabPanel>

      {/* Tab 6: Live Call Agent */}
      <TabPanel value={activeTab} index={6}>
      {isAdmin ? (
        <DashboardPanel
          title="Live Call Agent"
          description="Configure Twilio voice routing, Gemini Live audio, and webhook readiness from one place."
          actions={
            <Link href="/dashboard/settings/call-agent" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                Advanced View
              </Button>
            </Link>
          }
        >
          <Box component="form" onSubmit={handleSaveCallAgentSettings} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <DashboardGrid className="grid-cols-1 md:grid-cols-4">
              <StatsCard
                icon={callAgentConfig?.status.geminiLiveConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="Gemini Live"
                value={callAgentConfig?.status.geminiLiveConfigured ? 'Ready' : 'Needs Setup'}
                subtitle={callAgentConfig?.status.geminiLiveModel || callAgentSettings.geminiLiveModel}
                variant={callAgentConfig?.status.geminiLiveConfigured ? 'success' : 'warning'}
                size="md"
              />
              <StatsCard
                icon={callAgentConfig?.status.geminiStandardConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="Fallback AI"
                value={callAgentConfig?.status.geminiStandardConfigured ? 'Ready' : 'Needs Setup'}
                subtitle={callAgentConfig?.status.geminiVoiceModel || callAgentSettings.geminiVoiceModel}
                variant={callAgentConfig?.status.geminiStandardConfigured ? 'success' : 'warning'}
                size="md"
              />
              <StatsCard
                icon={callAgentConfig?.status.twilioConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="Twilio API"
                value={callAgentConfig?.status.twilioConfigured ? 'Configured' : 'Manual Only'}
                subtitle={callAgentConfig?.status.twilioAuthMode === 'auth-token' ? 'Auth token mode' : callAgentConfig?.status.twilioAuthMode === 'api-key' ? 'API key mode' : 'No API credentials'}
                variant={callAgentConfig?.status.twilioConfigured ? 'success' : 'warning'}
                size="md"
              />
              <StatsCard
                icon={callAgentConfig?.status.voiceWebhookTokenConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="Webhook Token"
                value={callAgentConfig?.status.voiceWebhookTokenConfigured ? 'Protected' : 'Missing'}
                subtitle={callAgentConfig?.urls.source === 'NEXT_PUBLIC_APP_URL' ? 'Fixed app URL' : 'Request host'}
                variant={callAgentConfig?.status.voiceWebhookTokenConfigured ? 'success' : 'warning'}
                size="md"
              />
            </DashboardGrid>

            <DashboardGrid className="grid-cols-1 lg:grid-cols-2">
              <Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: '8px', bgcolor: 'var(--background)' }}>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PhoneCall className="w-4 h-4" />
                  Twilio Voice
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField size="small" label="Account SID" value={callAgentSettings.twilioAccountSid} onChange={(event) => handleCallAgentFieldChange('twilioAccountSid', event.target.value)} disabled={savingCallAgentSettings} />
                  <TextField size="small" label="Auth Token" type="password" value={callAgentSettings.twilioAuthToken} onChange={(event) => handleCallAgentFieldChange('twilioAuthToken', event.target.value)} disabled={savingCallAgentSettings} />
                  <TextField size="small" label="API Key" value={callAgentSettings.twilioApiKey} onChange={(event) => handleCallAgentFieldChange('twilioApiKey', event.target.value)} disabled={savingCallAgentSettings} />
                  <TextField size="small" label="API Secret" type="password" value={callAgentSettings.twilioApiSecret} onChange={(event) => handleCallAgentFieldChange('twilioApiSecret', event.target.value)} disabled={savingCallAgentSettings} />
                  <TextField size="small" label="Phone Number" value={callAgentSettings.twilioPhoneNumber} onChange={(event) => handleCallAgentFieldChange('twilioPhoneNumber', event.target.value)} disabled={savingCallAgentSettings} />
                  <TextField size="small" label="Phone Number SID" value={callAgentSettings.twilioPhoneNumberSid} onChange={(event) => handleCallAgentFieldChange('twilioPhoneNumberSid', event.target.value)} disabled={savingCallAgentSettings} />
                </Box>
                <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)', mt: 2, lineHeight: 1.6 }}>
                  Use either Account SID + Auth Token or Account SID + API Key + API Secret. The phone number fields help the app inspect the live Twilio webhook target.
                </Typography>
              </Box>

              <Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: '8px', bgcolor: 'var(--background)' }}>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Bot className="w-4 h-4" />
                  Gemini Live
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField size="small" label="Gemini API Key" type="password" value={callAgentSettings.geminiApiKey} onChange={(event) => handleCallAgentFieldChange('geminiApiKey', event.target.value)} disabled={savingCallAgentSettings} />
                  <TextField size="small" label="Gemini Live API Key" type="password" value={callAgentSettings.geminiLiveApiKey} onChange={(event) => handleCallAgentFieldChange('geminiLiveApiKey', event.target.value)} disabled={savingCallAgentSettings} />
                  <TextField size="small" label="Fallback Voice Model" value={callAgentSettings.geminiVoiceModel} onChange={(event) => handleCallAgentFieldChange('geminiVoiceModel', event.target.value)} disabled={savingCallAgentSettings} />
                  <TextField size="small" label="Live Audio Model" value={callAgentSettings.geminiLiveModel} onChange={(event) => handleCallAgentFieldChange('geminiLiveModel', event.target.value)} disabled={savingCallAgentSettings} />
                </Box>
                <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)', mt: 2, lineHeight: 1.6 }}>
                  The live key and model power the caller audio bridge. The fallback key/model handle the IVR assistant when live audio is unavailable.
                </Typography>
              </Box>
            </DashboardGrid>

            <Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: '8px', bgcolor: 'var(--background)', display: 'grid', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Inbound Voice Webhook</Typography>
                <Typography sx={{ fontSize: '0.86rem', color: 'var(--text-primary)', wordBreak: 'break-all', mt: 0.5 }}>
                  {callAgentConfig?.urls.webhookUrl || 'Load settings to see the webhook URL'}
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)', mt: 0.5 }}>Method: {callAgentConfig?.urls.webhookMethod || 'POST'}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Live Media WebSocket</Typography>
                <Typography sx={{ fontSize: '0.86rem', color: 'var(--text-primary)', wordBreak: 'break-all', mt: 0.5 }}>
                  {callAgentConfig?.urls.websocketUrl || 'Load settings to see the WebSocket URL'}
                </Typography>
              </Box>
              {callAgentConfig?.twilioInspection.error ? (
                <Typography sx={{ fontSize: '0.82rem', color: 'var(--warning)', lineHeight: 1.6 }}>
                  Twilio inspection: {callAgentConfig.twilioInspection.error}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Twilio inspection: {callAgentConfig?.twilioInspection.inspected ? `${callAgentConfig.twilioInspection.phoneNumber || callAgentConfig.twilioInspection.target || 'Configured number'} is ${callAgentConfig.twilioInspection.matchesExpectedWebhook ? 'pointing to this webhook' : 'not pointing to this webhook yet'}.` : 'Add Twilio credentials and a phone target to inspect webhook routing.'}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="primary" loading={savingCallAgentSettings}>
                Save Live Call Agent
              </Button>
            </Box>
          </Box>
        </DashboardPanel>
      ) : null}
      </TabPanel>

      {/* Tab 7: Price Calculator */}
      <TabPanel value={activeTab} index={7}>
      {isAdmin ? (
        <DashboardPanel
          title="Price Calculator"
          description="Configure dashboard calculator rates and import state prices from PDF sheets."
        >
          <form onSubmit={handleSaveRates} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label="Destination"
                value={rateConfig.destinationLabel}
                onChange={(e) => handleRateConfigChange('destinationLabel', e.target.value)}
                placeholder="Jebel Ali, UAE"
              />
              <FormField
                label="Fallback Rate"
                type="number"
                value={rateConfig.fallbackRate}
                onChange={(e) => handleRateConfigChange('fallbackRate', Number(e.target.value))}
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
              <FormField
                label="Currency"
                value={rateConfig.currency}
                onChange={(e) => handleRateConfigChange('currency', e.target.value.toUpperCase())}
                placeholder="USD"
              />
            </div>

            <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--background)]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <Typography variant="subtitle2" fontWeight="600">Import Rates From PDF</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Reads rows like CA $1300, California 1300, or similar state/rate pairs.
                  </Typography>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setRatePdfFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="rate-pdf-upload"
                  />
                  <label htmlFor="rate-pdf-upload">
                    <Button component="span" variant="outline" icon={<FileText className="w-4 h-4" />}>
                      {ratePdfFile ? ratePdfFile.name : 'Select PDF'}
                    </Button>
                  </label>
                  <Button
                    type="button"
                    onClick={handleImportRatesPdf}
                    disabled={!ratePdfFile || importingRates}
                    loading={importingRates}
                    variant="primary"
                  >
                    Import PDF
                  </Button>
                </div>
              </div>
              {rateConfig.updatedFromPdfName ? (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                  Last imported from {rateConfig.updatedFromPdfName}
                </Typography>
              ) : null}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {US_STATES.map((state) => (
                <FormField
                  key={state.code}
                  label={`${state.code} Rate`}
                  type="number"
                  value={rateConfig.stateRates[state.code] ?? ''}
                  onChange={(e) => handleStateRateChange(state.code, e.target.value)}
                  helperText={state.name}
                />
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingRates} loading={savingRates} variant="primary">
                Save Calculator
              </Button>
            </div>
          </form>
        </DashboardPanel>
      ) : null}
      </TabPanel>
    </DashboardSurface>
  );
}
