'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertTriangle, Bot, Clock, Filter, RefreshCcw, Search as SearchIcon, ShieldCheck, XCircle } from 'lucide-react';
import { PageHeader, Button, FormField, LoadingState, Select, StatsCard, StatusBadge, Modal, toast } from '@/components/design-system';
import { DashboardGrid, DashboardPanel, DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { DataTable, Column } from '@/components/ui/DataTable';
import { hasPermission } from '@/lib/rbac';

type AiLog = {
  id: string;
  feature: string;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  provider: string;
  model: string | null;
  prompt: string;
  response: string | null;
  requestPayload: unknown;
  responsePayload: unknown;
  status: string;
  createdAt: string;
};

const truncateText = (value: string | null | undefined, length: number) => {
  if (!value) return 'N/A';
  return value.length > length ? `${value.slice(0, length)}...` : value;
};

const quickFilters = [
  { id: 'all', label: 'All activity' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'fallbacks', label: 'Fallbacks' },
  { id: 'tokenrouter', label: 'TokenRouter' },
] as const;

type QuickFilter = (typeof quickFilters)[number]['id'];

function getPayloadValue(payload: unknown, key: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getLogFailureReason(log: AiLog) {
  const payloadReason =
    getPayloadValue(log.responsePayload, 'error') ||
    getPayloadValue(log.responsePayload, 'failureReason') ||
    getPayloadValue(log.responsePayload, 'message');

  if (payloadReason) return payloadReason;
  if (log.status !== 'SUCCESS' && log.response) return log.response;
  if (log.provider === 'rules') return 'Rules fallback was used instead of the live AI provider.';
  return null;
}

function formatFeatureLabel(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AiLogsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feature, setFeature] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [selectedLog, setSelectedLog] = useState<AiLog | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  const canViewAiLogs = hasPermission(session?.user?.role, 'shipments:read_all');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (feature.trim()) params.set('feature', feature.trim());
      if (entityType.trim()) params.set('entityType', entityType.trim());
      if (entityId.trim()) params.set('entityId', entityId.trim());
      params.set('limit', '100');

      const response = await fetch(`/api/ai/logs?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load AI logs');
      }
      setLogs(payload.logs || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load AI logs');
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, feature]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !canViewAiLogs) {
      router.replace('/dashboard');
      return;
    }
    void fetchLogs();
  }, [canViewAiLogs, fetchLogs, router, session, status]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchLogs();
    } finally {
      setRefreshing(false);
    }
  };

  const stats = useMemo(() => {
    const tokenRouterCount = logs.filter((log) => log.provider === 'tokenrouter-ai').length;
    const fallbackCount = logs.filter((log) => log.provider === 'rules').length;
    const failedCount = logs.filter((log) => log.status !== 'SUCCESS').length;
    const latestFailure = logs.find((log) => log.status !== 'SUCCESS' || log.provider === 'rules') || null;
    const featureCount = new Set(logs.map((log) => log.feature)).size;

    return {
      total: logs.length,
      tokenRouterCount,
      fallbackCount,
      failedCount,
      featureCount,
      latestFailure,
    };
  }, [logs]);

  const featureOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.feature))).sort((a, b) => a.localeCompare(b)),
    [logs],
  );

  const visibleLogs = useMemo(() => {
    switch (quickFilter) {
      case 'attention':
        return logs.filter((log) => log.status !== 'SUCCESS' || log.provider === 'rules');
      case 'fallbacks':
        return logs.filter((log) => log.provider === 'rules');
      case 'tokenrouter':
        return logs.filter((log) => log.provider === 'tokenrouter-ai');
      default:
        return logs;
    }
  }, [logs, quickFilter]);

  const aiLogColumns = useMemo<Column<AiLog>[]>(
    () => [
      {
        key: 'feature',
        header: 'Feature',
        sortable: true,
        render: (_, log) => (
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">{formatFeatureLabel(log.feature)}</div>
            <div className="text-xs text-[var(--text-secondary)]">{log.model || 'N/A'}</div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (_, log) => (
          <StatusBadge
            status={log.status === 'SUCCESS' ? 'success' : log.status === 'FALLBACK' ? 'warning' : 'error'}
          />
        ),
      },
      {
        key: 'provider',
        header: 'Provider',
        sortable: true,
        render: (_, log) => (
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">{log.provider}</div>
            <div className="text-[11px] text-[var(--text-secondary)]">
              {log.provider === 'rules' ? 'Fallback' : 'Live provider'}
            </div>
          </div>
        ),
      },
      {
        key: 'entityType',
        header: 'Entity',
        render: (_, log) => (
          <div>
            <div className="text-xs text-[var(--text-primary)]">{log.entityType || 'N/A'}</div>
            <div className="text-xs text-[var(--text-secondary)]">{truncateText(log.entityId, 18)}</div>
          </div>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        sortable: true,
        render: (_, log) => (
          <div>
            <div className="text-xs text-[var(--text-primary)]">{new Date(log.createdAt).toLocaleDateString()}</div>
            <div className="text-[11px] text-[var(--text-secondary)]">{new Date(log.createdAt).toLocaleTimeString()}</div>
          </div>
        ),
      },
      {
        key: 'reason' as unknown as keyof AiLog,
        header: 'Reason',
        render: (_, log) => {
          const reason = getLogFailureReason(log);
          return reason ? (
            <div className="flex gap-2 items-start max-w-[260px]">
              {log.provider === 'rules' ? <Clock className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-[var(--error)] shrink-0 mt-0.5" />}
              <span className={`text-xs ${log.provider === 'rules' ? 'text-[var(--warning)]' : 'text-[var(--error)]'}`}>
                {truncateText(reason, 120)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-[var(--text-secondary)]">No issue reported</span>
          );
        },
      },
      {
        key: 'prompt',
        header: 'Prompt',
        render: (_, log) => (
          <span className="text-xs text-[var(--text-secondary)]">{truncateText(log.prompt, 90)}</span>
        ),
      },
      {
        key: 'actions' as unknown as keyof AiLog,
        header: 'Action',
        align: 'right',
        render: (_, log) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
              View
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const clearFilters = () => {
    setFeature('');
    setEntityType('');
    setEntityId('');
    setQuickFilter('all');
  };

  if (status === 'loading' || loading) {
    return <LoadingState fullScreen message="Loading AI logs..." />;
  }

  return (
    <DashboardSurface>
      <PageHeader
        showBreadcrumbs
        title="AI Interaction Logs"
        description="Browse prompt and response traces for dashboard briefs, shipment drafts, and extraction workflows."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={clearFilters} icon={<XCircle className="w-4 h-4" />}>
              Clear Filters
            </Button>
            <Button variant="secondary" size="sm" onClick={handleRefresh} icon={<RefreshCcw className="w-4 h-4" />} loading={refreshing}>
              Refresh Logs
            </Button>
          </div>
        }
      />

      <DashboardPanel
        title="Filter AI Activity"
        description="Filter by feature domain, entity type, or review reason"
      >
        <div className="flex gap-2 flex-wrap mb-4">
          {quickFilters.map((filter) => (
            <Button
              key={filter.id}
              variant={quickFilter === filter.id ? 'primary' : 'outline'}
              size="sm"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setQuickFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Select
            size="small"
            label="Feature"
            value={feature}
            onChange={(value) => setFeature(String(value))}
            options={[
              { value: '', label: 'All' },
              ...featureOptions.map((option) => ({ value: option, label: formatFeatureLabel(option) })),
            ]}
          />
          <Select
            size="small"
            label="Entity Type"
            value={entityType}
            onChange={(value) => setEntityType(String(value))}
            options={[
              { value: '', label: 'All' },
              { value: 'SHIPMENT', label: 'Shipment' },
              { value: 'CONTAINER', label: 'Container' },
              { value: 'DOCUMENT', label: 'Document' },
            ]}
          />
          <FormField
            label="Entity ID"
            value={entityId}
            onChange={(e: any) => setEntityId(e?.target ? e.target.value : e)}
            placeholder="Filter by exact entity id"
            leftIcon={<SearchIcon className="h-4 w-4" />}
          />
        </div>

        <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Total Logs" value={stats.total} icon={<Bot className="w-5 h-5" />} variant="default" />
          <StatsCard title="TokenRouter AI" value={stats.tokenRouterCount} icon={<ShieldCheck className="w-5 h-5" />} variant="success" />
          <StatsCard title="Fallback Runs" value={stats.fallbackCount} icon={<Bot className="w-5 h-5" />} variant="warning" />
          <StatsCard title="Non-Success Status" value={stats.failedCount} icon={<AlertTriangle className="w-5 h-5" />} variant="error" />
        </DashboardGrid>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Current View
            </div>
            <div className="text-base font-bold text-[var(--text-primary)]">
              Showing {visibleLogs.length} of {logs.length} logs
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {stats.featureCount} feature areas in the latest activity. Use quick filters for live provider runs, fallbacks, or logs needing review.
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${stats.latestFailure ? 'border-[rgba(var(--warning-rgb),0.35)] bg-[rgba(var(--warning-rgb),0.08)]' : 'border-[var(--border)] bg-[var(--background)]'}`}>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Latest Attention Item
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {stats.latestFailure ? formatFeatureLabel(stats.latestFailure.feature) : 'No issues in the latest logs'}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {stats.latestFailure ? truncateText(getLogFailureReason(stats.latestFailure), 150) : 'TokenRouter and fallback activity will appear here when review is needed.'}
            </p>
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel title="Recent AI Activity" description="Latest persisted interactions matching your filters">
        <DataTable
          data={visibleLogs}
          columns={aiLogColumns}
          keyField="id"
          onRowClick={(log) => setSelectedLog(log)}
        />
      </DashboardPanel>

      {/* Modal Inspector */}
      <Modal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        size="lg"
        title="AI Interaction Log Trace"
        description={selectedLog ? `${formatFeatureLabel(selectedLog.feature)} • ${selectedLog.provider}` : undefined}
        actions={
          <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
            Close
          </Button>
        }
      >
        {selectedLog && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 border border-[var(--border)] rounded-xl bg-[var(--background)]">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">Status</div>
                <StatusBadge status={selectedLog.status === 'SUCCESS' ? 'success' : selectedLog.status === 'FALLBACK' ? 'warning' : 'error'} />
              </div>
              <div className="p-3 border border-[var(--border)] rounded-xl bg-[var(--background)]">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">Provider</div>
                <div className="text-sm font-bold text-[var(--text-primary)]">{selectedLog.provider}</div>
                <div className="text-xs text-[var(--text-secondary)]">{selectedLog.model || 'No model recorded'}</div>
              </div>
              <div className="p-3 border border-[var(--border)] rounded-xl bg-[var(--background)]">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">Created</div>
                <div className="text-sm font-bold text-[var(--text-primary)]">{new Date(selectedLog.createdAt).toLocaleString()}</div>
              </div>
            </div>
            {getLogFailureReason(selectedLog) && (
              <div className="p-3 rounded-xl border border-[rgba(var(--warning-rgb),0.35)] bg-[rgba(var(--warning-rgb),0.08)] flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--warning)] mb-0.5">
                    Review reason
                  </div>
                  <div className="text-xs text-[var(--warning)]">
                    {getLogFailureReason(selectedLog)}
                  </div>
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Prompt</div>
              <pre className="whitespace-pre-wrap break-words text-xs p-3 bg-[var(--background)] rounded-xl border border-[var(--border)] max-h-48 overflow-y-auto">
                {selectedLog.prompt}
              </pre>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Response</div>
              <pre className="whitespace-pre-wrap break-words text-xs p-3 bg-[var(--background)] rounded-xl border border-[var(--border)] max-h-48 overflow-y-auto">
                {selectedLog.response || 'N/A'}
              </pre>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Request Payload</div>
              <pre className="whitespace-pre-wrap break-words text-xs p-3 bg-[var(--background)] rounded-xl border border-[var(--border)] max-h-40 overflow-y-auto">
                {JSON.stringify(selectedLog.requestPayload, null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Response Payload</div>
              <pre className="whitespace-pre-wrap break-words text-xs p-3 bg-[var(--background)] rounded-xl border border-[var(--border)] max-h-40 overflow-y-auto">
                {JSON.stringify(selectedLog.responsePayload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </DashboardSurface>
  );
}
