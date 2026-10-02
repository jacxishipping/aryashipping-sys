'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Link2,
  PhoneCall,
  Radio,
  RefreshCw,
  Webhook,
  XCircle,
} from 'lucide-react';

import { DashboardGrid, DashboardPanel, DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Alert, Breadcrumbs, Button, FormField, LoadingState, Modal, PageHeader, StatsCard, toast } from '@/components/design-system';

const DEFAULT_TWILIO_VALUES = {
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioApiKey: '',
  twilioApiSecret: '',
  twilioPhoneNumber: '',
  twilioPhoneNumberSid: '',
};

const DEFAULT_GEMINI_VALUES = {
  geminiApiKey: '',
  geminiLiveApiKey: '',
  geminiVoiceModel: 'gemini-2.5-flash',
  geminiLiveModel: 'gemini-3.1-flash-live-preview',
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
  twilioInspection: {
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
  twilioValues: typeof DEFAULT_TWILIO_VALUES;
  geminiValues: typeof DEFAULT_GEMINI_VALUES;
};

function StatusLine({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
      <div className="min-w-0">
        <div className="text-[0.92rem] font-bold text-[var(--text-primary)]">
          {label}
        </div>
        <div className="text-[0.8rem] text-[var(--text-secondary)] mt-1">
          {detail}
        </div>
      </div>
      <div className={`flex items-center gap-1.5 shrink-0 text-xs font-bold ${ready ? 'text-[var(--success-dark)]' : 'text-[var(--error-dark)]'}`}>
        {ready ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        <span>{ready ? 'Ready' : 'Missing'}</span>
      </div>
    </div>
  );
}

export default function CallAgentSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [config, setConfig] = useState<CallAgentConfig | null>(null);
  const [twilioForm, setTwilioForm] = useState(DEFAULT_TWILIO_VALUES);
  const [geminiForm, setGeminiForm] = useState(DEFAULT_GEMINI_VALUES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingTwilioSettings, setSavingTwilioSettings] = useState(false);
  const [savingGeminiSettings, setSavingGeminiSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async (showToastOnError = false) => {
    try {
      setError(null);
      const response = await fetch('/api/settings/call-agent', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load call agent settings');
      }

      setConfig(data);
      setTwilioForm(data.twilioValues || DEFAULT_TWILIO_VALUES);
      setGeminiForm(data.geminiValues || DEFAULT_GEMINI_VALUES);
      return true;
    } catch (fetchError) {
      console.error(fetchError);
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load call agent settings';
      setError(message);
      if (showToastOnError) {
        toast.error(message);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (!session || session.user.role !== 'admin') {
      router.replace('/dashboard/settings');
      return;
    }

    const loadConfig = async () => {
      setLoading(true);
      await fetchConfig();
      setLoading(false);
    };

    void loadConfig();
  }, [fetchConfig, router, session, status]);

  const [testingCall, setTestingCall] = useState(false);
  const [testCallModalOpen, setTestCallModalOpen] = useState(false);
  const [testCallNumber, setTestCallNumber] = useState('');

  const handleTestCall = () => {
    if (!config?.twilioInspection.phoneNumber) {
      toast.error('No Twilio phone number available');
      return;
    }

    setTestCallNumber('');
    setTestCallModalOpen(true);
  };

  const confirmTestCall = async () => {
    const toField = testCallNumber.trim();
    if (!toField) {
      toast.error('Enter a phone number to test');
      return;
    }
    setTestCallModalOpen(false);

    setTestingCall(true);
    try {
      const response = await fetch('/api/voice/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toField, webhookUrl: config?.urls?.webhookUrl }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Failed to start test call');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setTestingCall(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const success = await fetchConfig(true);
    if (success) {
      toast.success('Twilio inspection refreshed');
    }
    setRefreshing(false);
  };

  const handleTwilioFieldChange = (field: keyof typeof DEFAULT_TWILIO_VALUES, value: string) => {
    setTwilioForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGeminiFieldChange = (field: keyof typeof DEFAULT_GEMINI_VALUES, value: string) => {
    setGeminiForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveTwilioSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingTwilioSettings(true);

    try {
      const response = await fetch('/api/settings/call-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(twilioForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save Twilio settings');
      }

      setConfig(data);
      setTwilioForm(data.twilioValues || DEFAULT_TWILIO_VALUES);
      toast.success('Twilio settings saved');
    } catch (saveError) {
      console.error(saveError);
      toast.error(saveError instanceof Error ? saveError.message : 'Unable to save Twilio settings');
    } finally {
      setSavingTwilioSettings(false);
    }
  };

  const handleSaveGeminiSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingGeminiSettings(true);

    try {
      const response = await fetch('/api/settings/call-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save Gemini settings');
      }

      setConfig(data);
      setGeminiForm(data.geminiValues || DEFAULT_GEMINI_VALUES);
      toast.success('Gemini settings saved');
    } catch (saveError) {
      console.error(saveError);
      toast.error(saveError instanceof Error ? saveError.message : 'Unable to save Gemini settings');
    } finally {
      setSavingGeminiSettings(false);
    }
  };

  const warnings = useMemo(() => {
    if (!config) {
      return [] as string[];
    }

    const nextWarnings: string[] = [];
    if (!config.status.voiceWebhookTokenConfigured) {
      nextWarnings.push('VOICE_WEBHOOK_TOKEN is missing. The webhook URL will work without a token, but inbound requests are no longer protected.');
    }
    if (!config.status.geminiStandardConfigured) {
      nextWarnings.push('Gemini standard API key is not configured on this page, so the fallback text assistant is unavailable.');
    }
    if (!config.status.geminiLiveConfigured) {
      nextWarnings.push('Gemini live configuration is incomplete on this page, so menu option 4 cannot open the live audio session.');
    }
    if (!config.status.twilioConfigured) {
      nextWarnings.push('Twilio API credentials are not configured on this page. Manual webhook setup still works, but this app cannot inspect your Twilio account automatically.');
    }
    if (config.status.twilioConfigured && config.twilioInspection.error) {
      nextWarnings.push(config.twilioInspection.error);
    }
    if (config.twilioInspection.inspected && config.twilioInspection.matchesExpectedWebhook === false) {
      nextWarnings.push('The inspected Twilio phone number does not currently point to the webhook URL shown on this page, or it is not using POST.');
    }
    return nextWarnings;
  }, [config]);

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch (copyError) {
      console.error(copyError);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  if (status === 'loading' || loading) {
    return <LoadingState fullScreen message="Loading call agent settings..." />;
  }

  if (error || !config) {
    return (
      <DashboardSurface>
        <div className="px-2 pt-2">
          <Breadcrumbs />
        </div>
        <PageHeader
          title="Call Agent"
          description="Voice webhook endpoints and provider readiness"
          actions={
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => void handleRefresh()}
                loading={refreshing}
              >
                Refresh Twilio Inspection
              </Button>

              <Button
                variant="outline"
                icon={<PhoneCall className="w-4 h-4" />}
                onClick={() => void handleTestCall()}
                disabled={!config?.status.twilioPhoneNumberConfigured && !config?.status.twilioPhoneNumberSidConfigured}
                loading={testingCall}
              >
                Test Call
              </Button>
              <Link href="/dashboard/settings" className="no-underline">
                <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
                  Back To Settings
                </Button>
              </Link>
            </div>
          }
        />
        <DashboardPanel className="max-w-3xl mx-auto">
          <Alert severity="error">{error || 'Unable to load call agent settings.'}</Alert>
        </DashboardPanel>
      </DashboardSurface>
    );
  }

  return (
    <DashboardSurface>
      <div className="px-2 pt-2">
        <Breadcrumbs />
      </div>

      <PageHeader
        title="Call Agent"
        description="Twilio endpoints, Gemini readiness, and live voice configuration"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => void handleRefresh()}
              loading={refreshing}
            >
              Refresh Twilio Inspection
            </Button>

            <Button
              variant="outline"
              icon={<PhoneCall className="w-4 h-4" />}
              onClick={() => void handleTestCall()}
              disabled={!config?.status.twilioPhoneNumberConfigured && !config?.status.twilioPhoneNumberSidConfigured}
              loading={testingCall}
            >
              Test Call
            </Button>
            <Link href="/dashboard/settings" className="no-underline">
              <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
                Back To Settings
              </Button>
            </Link>
          </div>
        }
      />

      <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-5">
        <StatsCard
          icon={<Webhook style={{ fontSize: 18 }} />}
          title="Webhook Token"
          value={config.status.voiceWebhookTokenConfigured ? 'Configured' : 'Missing'}
          variant={config.status.voiceWebhookTokenConfigured ? 'success' : 'error'}
          size="md"
        />
        <StatsCard
          icon={<Radio style={{ fontSize: 18 }} />}
          title="Gemini Live"
          value={config.status.geminiLiveConfigured ? 'Ready' : 'Missing'}
          subtitle={config.status.geminiLiveModel}
          variant={config.status.geminiLiveConfigured ? 'success' : 'warning'}
          size="md"
        />
        <StatsCard
          icon={<PhoneCall style={{ fontSize: 18 }} />}
          title="Twilio API"
          value={config.status.twilioConfigured ? 'Configured' : 'Manual Only'}
          subtitle={config.status.twilioAuthMode === 'auth-token' ? 'Auth token mode' : config.status.twilioAuthMode === 'api-key' ? 'API key mode' : 'No API credentials'}
          variant={config.status.twilioConfigured ? 'success' : 'warning'}
          size="md"
        />
        <StatsCard
          icon={<PhoneCall style={{ fontSize: 18 }} />}
          title="Inspected Number"
          value={config.twilioInspection.phoneNumber || config.twilioInspection.target || 'Not linked'}
          subtitle={config.twilioInspection.inspected
            ? config.twilioInspection.matchesExpectedWebhook === true
              ? 'Webhook matches expected URL'
              : 'Webhook needs review'
            : 'Automatic inspection not available yet'}
          variant={config.twilioInspection.matchesExpectedWebhook === true ? 'success' : config.twilioInspection.inspected ? 'warning' : 'default'}
          size="md"
        />
        <StatsCard
          icon={<Link2 style={{ fontSize: 18 }} />}
          title="Base URL"
          value={config.urls.source === 'NEXT_PUBLIC_APP_URL' ? 'Configured' : 'Detected'}
          subtitle={config.urls.preferredBaseUrl.replace(/^https?:\/\//, '')}
          variant="info"
          size="md"
        />
      </DashboardGrid>

      <DashboardGrid className="grid-cols-1 xl:grid-cols-2">
        <DashboardPanel title="Gemini Configuration" description="Saved Call Agent Gemini keys and model overrides used by both the IVR assistant and live audio bridge.">
          <form onSubmit={handleSaveGeminiSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="GEMINI_API_KEY"
                type="password"
                value={geminiForm.geminiApiKey}
                onChange={(event) => handleGeminiFieldChange('geminiApiKey', event.target.value)}
                placeholder="Gemini API key"
                autoComplete="new-password"
              />
              <FormField
                label="GEMINI_LIVE_API_KEY"
                type="password"
                value={geminiForm.geminiLiveApiKey}
                onChange={(event) => handleGeminiFieldChange('geminiLiveApiKey', event.target.value)}
                placeholder="Optional dedicated live API key"
                autoComplete="new-password"
              />
              <FormField
                label="GEMINI_VOICE_MODEL"
                value={geminiForm.geminiVoiceModel}
                onChange={(event) => handleGeminiFieldChange('geminiVoiceModel', event.target.value)}
                placeholder="gemini-2.5-flash"
                autoComplete="off"
              />
              <FormField
                label="GEMINI_LIVE_MODEL"
                value={geminiForm.geminiLiveModel}
                onChange={(event) => handleGeminiFieldChange('geminiLiveModel', event.target.value)}
                placeholder="gemini-3.1-flash-live-preview"
                autoComplete="off"
              />
            </div>

            <Alert severity="info">
              If GEMINI_LIVE_API_KEY is empty, the live bridge falls back to GEMINI_API_KEY. The model fields can be left at their defaults unless you need to override them.
            </Alert>

            <Alert severity="warning">
              These Gemini values are stored in the application database and visible to admins on this page.
            </Alert>

            <div className="flex justify-end pt-1">
              <Button type="submit" variant="primary" loading={savingGeminiSettings}>
                Save Gemini Settings
              </Button>
            </div>
          </form>
        </DashboardPanel>

        <DashboardPanel title="Twilio Number Inspection" description="Live readback of the configured Twilio phone number when API credentials are available.">
          <div className="flex flex-col gap-3">
            <StatusLine
              label="Inspection target"
              ready={config.twilioInspection.inspected}
              detail={config.twilioInspection.inspected
                ? `${config.twilioInspection.phoneNumber || 'Unknown number'}${config.twilioInspection.sid ? ` (${config.twilioInspection.sid})` : ''}`
                : config.twilioInspection.error || 'Twilio number inspection is not available yet.'}
            />
            <StatusLine
              label="Webhook matches expected URL"
              ready={config.twilioInspection.matchesExpectedWebhook === true}
              detail={config.twilioInspection.inspected
                ? `Twilio voice URL is ${config.twilioInspection.voiceUrl || 'not set'} and method is ${config.twilioInspection.voiceMethod || 'not set'}.`
                : 'A successful inspection is required before this comparison can be made.'}
            />

            {config.twilioInspection.inspected ? (
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                  Current Twilio phone number config
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2">
                  <div className="text-sm text-[var(--text-secondary)]">Phone number</div>
                  <div className="text-sm text-[var(--text-primary)] break-all font-medium">{config.twilioInspection.phoneNumber || 'Not available'}</div>
                  <div className="text-sm text-[var(--text-secondary)]">Voice URL</div>
                  <div className="text-sm text-[var(--text-primary)] break-all font-mono">{config.twilioInspection.voiceUrl || 'Not set'}</div>
                  <div className="text-sm text-[var(--text-secondary)]">Voice method</div>
                  <div className="text-sm text-[var(--text-primary)] font-medium">{config.twilioInspection.voiceMethod || 'Not set'}</div>
                  <div className="text-sm text-[var(--text-secondary)]">Fallback URL</div>
                  <div className="text-sm text-[var(--text-primary)] break-all font-mono">{config.twilioInspection.voiceFallbackUrl || 'Not set'}</div>
                  <div className="text-sm text-[var(--text-secondary)]">TwiML App SID</div>
                  <div className="text-sm text-[var(--text-primary)] break-all font-mono">{config.twilioInspection.voiceApplicationSid || 'Not set'}</div>
                  <div className="text-sm text-[var(--text-secondary)]">Status callback</div>
                  <div className="text-sm text-[var(--text-primary)] break-all font-mono">{config.twilioInspection.statusCallback || 'Not set'}</div>
                  <div className="text-sm text-[var(--text-secondary)]">Trunk SID</div>
                  <div className="text-sm text-[var(--text-primary)] break-all font-mono">{config.twilioInspection.trunkSid || 'Not set'}</div>
                </div>
              </div>
            ) : null}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Twilio Credentials & Number Target" description="Shared Call Agent values saved in the database for Twilio API inspection.">
          <form onSubmit={handleSaveTwilioSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="TWILIO_ACCOUNT_SID"
                value={twilioForm.twilioAccountSid}
                onChange={(event) => handleTwilioFieldChange('twilioAccountSid', event.target.value)}
                placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                autoComplete="off"
              />
              <FormField
                label="TWILIO_AUTH_TOKEN"
                type="password"
                value={twilioForm.twilioAuthToken}
                onChange={(event) => handleTwilioFieldChange('twilioAuthToken', event.target.value)}
                placeholder="Twilio auth token"
                autoComplete="new-password"
              />
              <FormField
                label="TWILIO_API_KEY"
                type="password"
                value={twilioForm.twilioApiKey}
                onChange={(event) => handleTwilioFieldChange('twilioApiKey', event.target.value)}
                placeholder="SKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                autoComplete="new-password"
              />
              <FormField
                label="TWILIO_API_SECRET"
                type="password"
                value={twilioForm.twilioApiSecret}
                onChange={(event) => handleTwilioFieldChange('twilioApiSecret', event.target.value)}
                placeholder="Twilio API secret"
                autoComplete="new-password"
              />
              <FormField
                label="TWILIO_PHONE_NUMBER"
                value={twilioForm.twilioPhoneNumber}
                onChange={(event) => handleTwilioFieldChange('twilioPhoneNumber', event.target.value)}
                placeholder="+14344488601"
                autoComplete="off"
              />
              <FormField
                label="TWILIO_PHONE_NUMBER_SID"
                value={twilioForm.twilioPhoneNumberSid}
                onChange={(event) => handleTwilioFieldChange('twilioPhoneNumberSid', event.target.value)}
                placeholder="PNXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                autoComplete="off"
              />
            </div>

            <Alert severity="info">
              Use either TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN or TWILIO_ACCOUNT_SID + TWILIO_API_KEY + TWILIO_API_SECRET. TWILIO_PHONE_NUMBER and TWILIO_PHONE_NUMBER_SID are optional unless the Twilio account has multiple incoming numbers.
            </Alert>

            <Alert severity="warning">
              These values are stored in the application database and visible to admins on this page.
            </Alert>

            <div className="flex justify-end pt-1">
              <Button type="submit" variant="primary" loading={savingTwilioSettings}>
                Save Twilio Settings
              </Button>
            </div>
          </form>
        </DashboardPanel>
      </DashboardGrid>

      <DashboardGrid className="grid-cols-1 xl:grid-cols-2">
        <DashboardPanel title="Twilio Endpoints" description="Use these exact values when wiring the phone number to the call agent.">
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Inbound voice webhook
              </div>
              <div className="text-sm font-bold text-[var(--text-primary)] mb-1">
                Method: {config.urls.webhookMethod}
              </div>
              <div className="font-mono text-xs text-[var(--text-primary)] break-all bg-[var(--panel)] p-2 rounded border border-[var(--border)]">
                {config.urls.webhookUrl}
              </div>
              <div className="flex justify-end mt-3">
                <Button variant="outline" size="sm" icon={<Copy className="w-4 h-4" />} onClick={() => void copyValue(config.urls.webhookUrl, 'Webhook URL')}>
                  Copy Webhook URL
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Live media WebSocket
              </div>
              <div className="font-mono text-xs text-[var(--text-primary)] break-all bg-[var(--panel)] p-2 rounded border border-[var(--border)]">
                {config.urls.websocketUrl}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                Do not paste this into the phone number webhook field. Twilio opens this stream automatically when the caller chooses the live Gemini option.
              </p>
              <div className="flex justify-end mt-3">
                <Button variant="outline" size="sm" icon={<Copy className="w-4 h-4" />} onClick={() => void copyValue(config.urls.websocketUrl, 'WebSocket URL')}>
                  Copy WebSocket URL
                </Button>
              </div>
            </div>

            <Alert severity="info">
              The current endpoint host is based on {config.urls.source === 'NEXT_PUBLIC_APP_URL' ? 'NEXT_PUBLIC_APP_URL' : 'the active request host'}. Recommended base URL: {config.urls.preferredBaseUrl}
            </Alert>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Provider Status" description="Non-secret readiness checks for Gemini, Twilio, and webhook protection.">
          <div className="flex flex-col gap-3">
            <StatusLine
              label="Voice webhook token"
              ready={config.status.voiceWebhookTokenConfigured}
              detail="Protects /api/voice and /api/voice/live from unauthenticated external requests."
            />
            <StatusLine
              label="Gemini standard assistant"
              ready={config.status.geminiStandardConfigured}
              detail={`Fallback model: ${config.status.geminiVoiceModel}`}
            />
            <StatusLine
              label="Gemini live audio"
              ready={config.status.geminiLiveConfigured}
              detail={`Live model: ${config.status.geminiLiveModel}`}
            />
            <StatusLine
              label="Twilio API credentials"
              ready={config.status.twilioConfigured}
              detail={config.status.twilioAuthMode === 'auth-token' ? 'Using TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.' : config.status.twilioAuthMode === 'api-key' ? 'Using TWILIO_ACCOUNT_SID + TWILIO_API_KEY + TWILIO_API_SECRET.' : 'No Twilio API credentials detected. Manual Twilio setup still works.'}
            />
          </div>
        </DashboardPanel>
      </DashboardGrid>

      {warnings.length ? (
        <DashboardPanel title="Action Items" description="Items that will block or limit the call agent until configured.">
          <div className="flex flex-col gap-2">
            {warnings.map((warning) => (
              <Alert key={warning} severity="warning">
                {warning}
              </Alert>
            ))}
          </div>
        </DashboardPanel>
      ) : null}

      <DashboardPanel title="Twilio Setup Notes" description="Use this as the operator checklist when configuring the phone number.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
            <div className="text-sm font-bold text-[var(--text-primary)] mb-1">
              Phone number configuration
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Set “A Call Comes In” to Webhook, use the webhook URL shown above, and keep the method set to POST.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
            <div className="text-sm font-bold text-[var(--text-primary)] mb-1">
              Live audio behavior
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              The WebSocket endpoint is only used when option 4 is selected from the IVR menu. It is not entered manually in the Twilio number settings.
            </p>
          </div>
        </div>
      </DashboardPanel>

      <Modal
        open={testCallModalOpen}
        onClose={() => setTestCallModalOpen(false)}
        title="Test Call"
        description="Enter the phone number that should receive the test call from your Twilio number."
        size="sm"
        actions={
          <>
            <Button variant="outline" onClick={() => setTestCallModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void confirmTestCall()} disabled={!testCallNumber.trim()}>Start Test Call</Button>
          </>
        }
      >
        <FormField
          label="Phone number"
          value={testCallNumber}
          onChange={(event) => setTestCallNumber(event.target.value)}
          placeholder="+1..."
          autoComplete="off"
        />
      </Modal>
    </DashboardSurface>
  );
}