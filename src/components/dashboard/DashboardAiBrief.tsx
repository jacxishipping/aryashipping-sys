'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, RefreshCw, Sparkles } from 'lucide-react';
import { Button, toast } from '@/components/design-system';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import type { DashboardAssistantMode } from '@/lib/ai/dashboard-assistant';

type DashboardAiBriefProps = {
  aiEnabled: boolean;
  payload: {
    activeShipmentsCount: number;
    activeContainersCount: number;
    pendingRevenue: number;
    activeDispatchesCount: number;
    shipmentStats: Array<{
      status: string;
      count: number;
    }>;
    dispatchStats: Array<{
      status: string;
      label: string;
      count: number;
    }>;
    agingMetrics: {
      dispatchStuckCount: number;
      dispatchThresholdDays: number;
      containerPastEtaCount: number;
      releasedAwaitingTransitCount: number;
      releasedAwaitingTransitThresholdDays: number;
      transitsOverdueCount: number;
      totalExceptions: number;
      exceptions: Array<{
        title: string;
        subtitle: string;
        detail: string;
        severityLabel: string;
        ageDays: number;
      }>;
    };
    recentDispatches: Array<{
      referenceNumber: string;
      statusLabel: string;
      origin: string;
      destination: string;
      shipmentCount: number;
      companyName: string;
    }>;
  };
};

type DashboardBriefResult = {
  brief: string;
  model: string;
  generatedAt: string;
  mode: DashboardAssistantMode;
  source: 'tokenrouter-ai' | 'digitalocean-ai' | 'rules';
  remainingRequests?: number;
};

const modes: Array<{
  value: DashboardAssistantMode;
  label: string;
  description: string;
}> = [
  {
    value: 'overview',
    label: 'Ops Overview',
    description: 'Broad management summary of movement, blockers, and next steps.',
  },
  {
    value: 'exception-triage',
    label: 'Exception Triage',
    description: 'Prioritizes late, blocked, and aging workflow items.',
  },
  {
    value: 'finance-watch',
    label: 'Finance Watch',
    description: 'Focuses on pending revenue and blockers affecting collection.',
  },
  {
    value: 'dispatch-focus',
    label: 'Dispatch Focus',
    description: 'Examines yard-to-port coordination and dispatch pipeline pressure.',
  },
  {
    value: 'custom',
    label: 'Custom Ask',
    description: 'Lets you steer the summary with a focused operations question.',
  },
];

export default function DashboardAiBrief({ aiEnabled, payload }: DashboardAiBriefProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DashboardBriefResult | null>(null);
  const [mode, setMode] = useState<DashboardAssistantMode>('overview');
  const [focus, setFocus] = useState('');

  const generateBrief = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/dashboard-brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          focus: focus.trim() || undefined,
          payload,
        }),
      });

      const data = (await response.json()) as DashboardBriefResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate dashboard brief.');
      }

      setResult({
        brief: data.brief,
        model: data.model,
        generatedAt: data.generatedAt,
        mode: data.mode,
        source: data.source,
        remainingRequests: data.remainingRequests,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate dashboard brief.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardPanel
      title="AI Ops Brief"
      description="Multi-mode analysis for operations, exceptions, finance pressure, and dispatch coordination."
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={generateBrief}
          disabled={loading}
          icon={loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        >
          {result ? 'Run again' : 'Generate brief'}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <div className="flex flex-wrap gap-2">
            {modes.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  mode === item.value
                    ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.12)] text-primary'
                    : 'border-[var(--border)] bg-transparent text-muted-foreground hover:bg-background/80 hover:text-primary'
                }`}
              >
                <span className="block font-medium">{item.label}</span>
                <span className="block text-xs opacity-80">{item.description}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="dashboard-ai-focus">
              Focus Prompt
            </label>
            <textarea
              id="dashboard-ai-focus"
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              rows={3}
              placeholder="Example: Which delays are most likely to trigger customer escalation this week?"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-primary outline-none transition-colors placeholder:text-muted-foreground focus:border-[var(--accent-gold)]"
            />
            <p className="text-xs text-muted-foreground">
              {aiEnabled
                ? 'TokenRouter AI is enabled. If the model request fails, the assistant falls back to a rule-based ops summary.'
                : 'TokenRouter AI is not configured. The assistant will use the built-in rule-based fallback until AI provider settings are saved.'}
            </p>
          </div>
        </div>

        {result ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span>{modes.find((item) => item.value === result.mode)?.label ?? result.mode}</span>
            <span>•</span>
            <span>{result.model}</span>
            <span>•</span>
            <span>{result.source === 'rules' ? 'Rules fallback' : 'AI'}</span>
            <span>•</span>
            <span>{new Date(result.generatedAt).toLocaleString()}</span>
            {typeof result.remainingRequests === 'number' && (
              <>
                <span>•</span>
                <span>{result.remainingRequests} requests left</span>
              </>
            )}
          </div>
          <div className="prose prose-sm max-w-none text-primary prose-headings:text-primary prose-p:text-primary prose-strong:text-primary prose-li:text-primary">
            <ReactMarkdown>{result.brief}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
          Run one of the preset modes to get a management summary, exception triage, finance watch, dispatch analysis, or a custom-focused brief from the current dashboard metrics.
        </div>
      )}
      </div>
    </DashboardPanel>
  );
}
