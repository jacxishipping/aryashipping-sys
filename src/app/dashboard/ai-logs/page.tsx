'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Box,
  TextField,
  Typography,
} from '@mui/material';
import { AlertTriangle, Bot, Clock, Filter, RefreshCcw, Search as SearchIcon, ShieldCheck, XCircle } from 'lucide-react';
import { PageHeader, Button, EmptyState, LoadingState, Select, StatsCard, StatusBadge, Modal, toast } from '@/components/design-system';
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
          <Box>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatFeatureLabel(log.feature)}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.model || 'N/A'}</Typography>
          </Box>
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
          <Box>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{log.provider}</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {log.provider === 'rules' ? 'Fallback' : 'Live provider'}
            </Typography>
          </Box>
        ),
      },
      {
        key: 'entityType',
        header: 'Entity',
        render: (_, log) => (
          <Box>
            <Typography sx={{ fontSize: '0.8rem' }}>{log.entityType || 'N/A'}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{truncateText(log.entityId, 18)}</Typography>
          </Box>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        sortable: true,
        render: (_, log) => (
          <Box>
            <Typography sx={{ fontSize: '0.8rem' }}>{new Date(log.createdAt).toLocaleDateString()}</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{new Date(log.createdAt).toLocaleTimeString()}</Typography>
          </Box>
        ),
      },
      {
        key: 'reason' as unknown as keyof AiLog,
        header: 'Reason',
        render: (_, log) => {
          const reason = getLogFailureReason(log);
          return reason ? (
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', maxWidth: 260 }}>
              {log.provider === 'rules' ? <Clock className="w-4 h-4 text-[var(--warning)]" /> : <AlertTriangle className="w-4 h-4 text-[var(--error)]" />}
              <Typography sx={{ fontSize: '0.78rem', color: log.provider === 'rules' ? 'var(--warning)' : 'var(--error)' }}>
                {truncateText(reason, 120)}
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>No issue reported</Typography>
          );
        },
      },
      {
        key: 'prompt',
        header: 'Prompt',
        render: (_, log) => (
          <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{truncateText(log.prompt, 90)}</Typography>
        ),
      },
      {
        key: 'actions' as unknown as keyof AiLog,
        header: 'Action',
        align: 'right',
        render: (_, log) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
              View
            </Button>
          </Box>
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
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outline" size="sm" onClick={clearFilters} icon={<XCircle className="w-4 h-4" />}>
              Clear Filters
            </Button>
            <Button variant="secondary" size="sm" onClick={handleRefresh} icon={<RefreshCcw className="w-4 h-4" />} loading={refreshing}>
              Refresh Logs
            </Button>
          </Box>
        }
      />

      <DashboardPanel
        title="Filter AI Activity"
        description="Filter by feature domain, entity type, or review reason"
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
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
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2, mb: 3 }}>
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
          <TextField
            size="small"
            label="Entity ID"
            value={entityId}
            onChange={(event) => setEntityId(event.target.value)}
            placeholder="Filter by exact entity id"
            InputProps={{
              startAdornment: <SearchIcon className="mr-2 h-4 w-4 text-[var(--text-secondary)]" />,
            }}
          />
        </Box>

        <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Total Logs" value={stats.total} icon={<Bot className="w-5 h-5" />} variant="default" />
          <StatsCard title="TokenRouter AI" value={stats.tokenRouterCount} icon={<ShieldCheck className="w-5 h-5" />} variant="success" />
          <StatsCard title="Fallback Runs" value={stats.fallbackCount} icon={<Bot className="w-5 h-5" />} variant="warning" />
          <StatsCard title="Non-Success Status" value={stats.failedCount} icon={<AlertTriangle className="w-5 h-5" />} variant="error" />
        </DashboardGrid>

        <Box
          sx={{
            mt: 3,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.25fr 0.75fr' },
            gap: 2,
          }}
        >
          <Box sx={{ p: 2, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--background)' }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.75 }}>
              Current View
            </Typography>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Showing {visibleLogs.length} of {logs.length} logs
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 0.5 }}>
              {stats.featureCount} feature areas in the latest activity. Use quick filters for live provider runs, fallbacks, or logs needing review.
            </Typography>
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: stats.latestFailure ? '1px solid rgba(var(--warning-rgb), 0.35)' : '1px solid var(--border)',
              bgcolor: stats.latestFailure ? 'rgba(var(--warning-rgb), 0.08)' : 'var(--background)',
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.75 }}>
              Latest Attention Item
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.latestFailure ? formatFeatureLabel(stats.latestFailure.feature) : 'No issues in the latest logs'}
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', mt: 0.5 }}>
              {stats.latestFailure ? truncateText(getLogFailureReason(stats.latestFailure), 150) : 'TokenRouter and fallback activity will appear here when review is needed.'}
            </Typography>
          </Box>
        </Box>
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
              <Box sx={{ p: 1.5, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
                <Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>Status</Typography>
                <StatusBadge status={selectedLog.status === 'SUCCESS' ? 'success' : selectedLog.status === 'FALLBACK' ? 'warning' : 'error'} />
              </Box>
              <Box sx={{ p: 1.5, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
                <Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>Provider</Typography>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700 }}>{selectedLog.provider}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedLog.model || 'No model recorded'}</Typography>
              </Box>
              <Box sx={{ p: 1.5, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
                <Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>Created</Typography>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700 }}>{new Date(selectedLog.createdAt).toLocaleString()}</Typography>
              </Box>
            </Box>
            {getLogFailureReason(selectedLog) && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid rgba(var(--warning-rgb), 0.35)',
                  bgcolor: 'rgba(var(--warning-rgb), 0.08)',
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-start',
                }}
              >
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning-dark)', marginTop: 2 }} />
                <Box>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--warning-dark)', mb: 0.5 }}>
                    Review reason
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', color: 'var(--warning-dark)' }}>
                    {getLogFailureReason(selectedLog)}
                  </Typography>
                </Box>
              </Box>
            )}
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>Prompt</Typography>
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', p: 2, bgcolor: 'var(--background)', borderRadius: 2, border: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto' }}>
                {selectedLog.prompt}
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>Response</Typography>
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', p: 2, bgcolor: 'var(--background)', borderRadius: 2, border: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto' }}>
                {selectedLog.response || 'N/A'}
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>Request Payload</Typography>
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', p: 2, bgcolor: 'var(--background)', borderRadius: 2, border: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}>
                {JSON.stringify(selectedLog.requestPayload, null, 2)}
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>Response Payload</Typography>
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', p: 2, bgcolor: 'var(--background)', borderRadius: 2, border: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}>
                {JSON.stringify(selectedLog.responsePayload, null, 2)}
              </Box>
            </Box>
          </Box>
        )}
      </Modal>
    </DashboardSurface>
  );
}
