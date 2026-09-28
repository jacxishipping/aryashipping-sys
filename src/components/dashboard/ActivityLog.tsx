'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Box, Chip, List, ListItem, ListItemIcon, ListItemText, TextField, Typography } from '@mui/material';
import { 
  ArrowRight,
  BadgeDollarSign,
  FileText, 
  CheckCircle, 
  Container,
  RefreshCw,
  Search,
  User, 
  Edit, 
  Plus, 
  Trash 
} from 'lucide-react';

interface LogEntry {
  id: string;
  action: string;
  description: string;
  performedBy: string;
  timestamp: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: unknown;
}

interface ActivityLogProps {
  logs: LogEntry[];
}

type ActivityCategory = 'all' | 'status' | 'assignment' | 'payment' | 'invoice' | 'other';
type ActivityDateRange = 'all' | 'today' | '7d' | '30d';

export function ActivityLog({ logs }: ActivityLogProps) {
  const pathname = usePathname();
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<ActivityDateRange>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const storageKey = `activity-log:${pathname}`;

  const normalizeAction = (action: string) => action.trim().replace(/[\s-]+/g, '_').toUpperCase();
  const getMetadataRecord = (metadata: unknown): Record<string, unknown> | null => {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    return metadata as Record<string, unknown>;
  };

  const getActionCategory = (action: string): ActivityCategory => {
    switch (normalizeAction(action)) {
      case 'STATUS_CHANGE':
        return 'status';
      case 'CONTAINER_ASSIGNED':
      case 'CONTAINER_REMOVED':
      case 'USER_REASSIGNED':
      case 'SHIPMENT_ADDED':
      case 'SHIPMENT_REMOVED':
        return 'assignment';
      case 'PAYMENT_STATUS_UPDATED':
        return 'payment';
      case 'INVOICE_CREATED':
      case 'INVOICE_REFRESHED':
      case 'SUPPLEMENTAL_INVOICE_CREATED':
      case 'CREDIT_NOTE_CREATED':
      case 'INVOICE_UPDATED':
        return 'invoice';
      default:
        return 'other';
    }
  };

  const getActionMeta = (action: string) => {
    switch (normalizeAction(action)) {
      case 'CONTAINER_ASSIGNED':
        return {
          label: 'Container Assigned',
          color: 'rgba(34, 197, 94, 0.12)',
          textColor: 'rgb(34, 197, 94)',
        };
      case 'CONTAINER_REMOVED':
        return {
          label: 'Container Removed',
          color: 'rgba(239, 68, 68, 0.12)',
          textColor: 'rgb(239, 68, 68)',
        };
      case 'PAYMENT_STATUS_UPDATED':
        return {
          label: 'Payment Status',
          color: 'rgba(59, 130, 246, 0.12)',
          textColor: 'rgb(59, 130, 246)',
        };
      case 'INVOICE_REFRESHED':
        return {
          label: 'Invoice Refreshed',
          color: 'rgba(14, 165, 233, 0.12)',
          textColor: 'rgb(14, 165, 233)',
        };
      case 'INVOICE_CREATED':
        return {
          label: 'Invoice Created',
          color: 'rgba(34, 197, 94, 0.12)',
          textColor: 'rgb(34, 197, 94)',
        };
      case 'SUPPLEMENTAL_INVOICE_CREATED':
        return {
          label: 'Supplemental Invoice',
          color: 'rgba(59, 130, 246, 0.12)',
          textColor: 'rgb(29, 78, 216)',
        };
      case 'CREDIT_NOTE_CREATED':
        return {
          label: 'Credit Note',
          color: 'rgba(245, 158, 11, 0.12)',
          textColor: 'rgb(180, 83, 9)',
        };
      case 'INVOICE_UPDATED':
        return {
          label: 'Invoice Updated',
          color: 'rgba(59, 130, 246, 0.12)',
          textColor: 'rgb(59, 130, 246)',
        };
      case 'STATUS_CHANGE':
        return {
          label: 'Status Changed',
          color: 'rgba(var(--accent-gold-rgb), 0.14)',
          textColor: 'var(--accent-gold)',
        };
      case 'USER_REASSIGNED':
        return {
          label: 'Owner Reassigned',
          color: 'rgba(16, 185, 129, 0.12)',
          textColor: 'rgb(16, 185, 129)',
        };
      case 'SHIPMENT_ADDED':
        return {
          label: 'Shipment Added',
          color: 'rgba(34, 197, 94, 0.12)',
          textColor: 'rgb(34, 197, 94)',
        };
      case 'SHIPMENT_REMOVED':
        return {
          label: 'Shipment Removed',
          color: 'rgba(239, 68, 68, 0.12)',
          textColor: 'rgb(239, 68, 68)',
        };
      case 'ETA_UPDATED':
        return {
          label: 'ETA Updated',
          color: 'rgba(14, 165, 233, 0.12)',
          textColor: 'rgb(14, 165, 233)',
        };
      case 'EXPENSE_ADDED':
        return {
          label: 'Expense Added',
          color: 'rgba(59, 130, 246, 0.12)',
          textColor: 'rgb(59, 130, 246)',
        };
      default:
        return {
          label: action.replace(/[_-]/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()),
          color: 'rgba(148, 163, 184, 0.12)',
          textColor: 'rgb(148, 163, 184)',
        };
    }
  };

  const getIcon = (action: string) => {
    switch (normalizeAction(action)) {
      case 'CONTAINER_ASSIGNED':
      case 'SHIPMENT_ADDED':
      case 'SHIPMENTS_ASSIGNED':
        return <Container className="w-4 h-4 text-green-500" />;
      case 'CREATE':
      case 'INVOICE_CREATED':
      case 'SUPPLEMENTAL_INVOICE_CREATED':
      case 'CREDIT_NOTE_CREATED':
      case 'USER_REASSIGNED':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'INVOICE_UPDATED':
      case 'INVOICE_REFRESHED':
        return <RefreshCw className="w-4 h-4 text-sky-500" />;
      case 'UPDATE':
      case 'PAYMENT_STATUS_UPDATED':
      case 'ETA_UPDATED':
      case 'EXPENSE_ADDED':
        return <BadgeDollarSign className="w-4 h-4 text-blue-500" />;
      case 'STATUS_CHANGE':
        return <CheckCircle className="w-4 h-4 text-[var(--accent-gold)]" />;
      case 'DELETE':
      case 'CONTAINER_REMOVED':
      case 'SHIPMENT_REMOVED':
        return <Trash className="w-4 h-4 text-red-500" />;
      default:
        return <Edit className="w-4 h-4 text-blue-500" />;
    }
  };

  const getDateRangeLabel = (range: ActivityDateRange) => {
    switch (range) {
      case 'today':
        return 'Today';
      case '7d':
        return '7 Days';
      case '30d':
        return '30 Days';
      default:
        return 'All Time';
    }
  };

  const isLogInDateRange = (timestamp: string, range: ActivityDateRange) => {
    if (range === 'all') {
      return true;
    }

    const logDate = new Date(timestamp);
    const now = new Date();

    if (range === 'today') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return logDate >= startOfToday;
    }

    const dayCount = range === '7d' ? 7 : 30;
    const threshold = new Date(now);
    threshold.setDate(now.getDate() - dayCount);
    return logDate >= threshold;
  };

  const getMetadataSubtitles = (log: LogEntry) => {
    const metadata = getMetadataRecord(log.metadata);
    if (!metadata) {
      return [] as string[];
    }

    const subtitles: string[] = [];
    const newContainerId = typeof metadata.newContainerId === 'string' ? metadata.newContainerId : null;
    const oldContainerId = typeof metadata.oldContainerId === 'string' ? metadata.oldContainerId : null;
    const containerNumber = typeof metadata.containerNumber === 'string' ? metadata.containerNumber : null;
    const newContainerNumber = typeof metadata.newContainerNumber === 'string' ? metadata.newContainerNumber : null;
    const oldContainerNumber = typeof metadata.oldContainerNumber === 'string' ? metadata.oldContainerNumber : null;
    const oldUserLabel = typeof metadata.oldUserLabel === 'string' ? metadata.oldUserLabel : null;
    const newUserLabel = typeof metadata.newUserLabel === 'string' ? metadata.newUserLabel : null;
    const paymentSource = typeof metadata.paymentSource === 'string'
      ? metadata.paymentSource
      : typeof metadata.expenseSource === 'string'
      ? metadata.expenseSource
      : typeof metadata.source === 'string'
      ? metadata.source
      : null;
    const updatedFields = Array.isArray(metadata.updatedFields)
      ? metadata.updatedFields.filter((value): value is string => typeof value === 'string')
      : [];
    const shipmentIds = Array.isArray(metadata.shipmentIds)
      ? metadata.shipmentIds.filter((value): value is string => typeof value === 'string')
      : [];

    if (oldContainerNumber || newContainerNumber) {
      subtitles.push(`Container change: ${oldContainerNumber || oldContainerId || 'Unassigned'} -> ${newContainerNumber || newContainerId || 'Unassigned'}`);
    } else if (containerNumber) {
      subtitles.push(`Container: ${containerNumber}`);
    } else if (newContainerId || oldContainerId) {
      subtitles.push(`Container target: ${newContainerId || oldContainerId}`);
    }

    if (oldUserLabel || newUserLabel) {
      subtitles.push(`Customer change: ${oldUserLabel || 'Unassigned'} -> ${newUserLabel || 'Unassigned'}`);
    }

    if (paymentSource) {
      subtitles.push(`Source: ${paymentSource.replace(/_/g, ' ')}`);
    }

    if (updatedFields.length > 0) {
      subtitles.push(`Fields: ${updatedFields.join(', ')}`);
    }

    if (shipmentIds.length > 0) {
      subtitles.push(`Shipments affected: ${shipmentIds.length}`);
    }

    return subtitles;
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const categoryLabels: Record<ActivityCategory, string> = {
    all: 'All',
    status: 'Status',
    assignment: 'Assignment',
    payment: 'Payment',
    invoice: 'Invoice',
    other: 'Other',
  };

  const availableCategories = useMemo(() => {
    const categories = new Set<ActivityCategory>(['all']);
    for (const log of logs) {
      categories.add(getActionCategory(log.action));
    }

    return Array.from(categories);
  }, [logs]);

  useEffect(() => {
    if (!availableCategories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [availableCategories, selectedCategory]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedValue = window.localStorage.getItem(storageKey);
    if (!savedValue) {
      return;
    }

    try {
      const parsed = JSON.parse(savedValue) as {
        selectedCategory?: ActivityCategory;
        selectedDateRange?: ActivityDateRange;
        searchTerm?: string;
      };

      if (parsed.selectedCategory) {
        setSelectedCategory(parsed.selectedCategory);
      }

      if (parsed.selectedDateRange) {
        setSelectedDateRange(parsed.selectedDateRange);
      }

      if (typeof parsed.searchTerm === 'string') {
        setSearchTerm(parsed.searchTerm);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        selectedCategory,
        selectedDateRange,
        searchTerm,
      })
    );
  }, [searchTerm, selectedCategory, selectedDateRange, storageKey]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      const categoryMatches = selectedCategory === 'all' || getActionCategory(log.action) === selectedCategory;
      const dateMatches = isLogInDateRange(log.timestamp, selectedDateRange);
      if (!categoryMatches || !dateMatches) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const actionLabel = getActionMeta(log.action).label;
      const subtitles = getMetadataSubtitles(log);
      const searchableText = [
        actionLabel,
        log.description,
        log.performedBy,
        log.oldValue || '',
        log.newValue || '',
        ...subtitles,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [logs, searchTerm, selectedCategory, selectedDateRange]);

  const renderValuePill = (value: string | null | undefined, variant: 'old' | 'new') => {
    if (!value) {
      return null;
    }

    return (
      <Chip
        label={value}
        size="small"
        sx={{
          height: 24,
          fontSize: '0.72rem',
          fontWeight: 600,
          bgcolor: variant === 'old' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
          color: variant === 'old' ? 'rgb(248, 113, 113)' : 'rgb(74, 222, 128)',
          border: variant === 'old' ? '1px solid rgba(248, 113, 113, 0.18)' : '1px solid rgba(74, 222, 128, 0.18)',
          '& .MuiChip-label': {
            px: 1.2,
          },
        }}
      />
    );
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Activity Log
      </Typography>

      {availableCategories.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {availableCategories.map((category) => (
            <Chip
              key={category}
              clickable
              label={`${categoryLabels[category]}${category === 'all' ? ` (${logs.length})` : ` (${logs.filter((log) => getActionCategory(log.action) === category).length})`}`}
              color={selectedCategory === category ? 'primary' : 'default'}
              onClick={() => setSelectedCategory(category)}
              variant={selectedCategory === category ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 600,
                bgcolor: selectedCategory === category ? 'rgba(var(--accent-gold-rgb), 0.14)' : 'transparent',
                color: selectedCategory === category ? 'var(--accent-gold)' : 'var(--text-secondary)',
                borderColor: selectedCategory === category ? 'rgba(var(--accent-gold-rgb), 0.28)' : 'var(--border)',
              }}
            />
          ))}
        </Box>
      )}

      <TextField
        fullWidth
        size="small"
        placeholder="Search actor, status, invoice fields, or container reference"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            bgcolor: 'var(--panel)',
          },
        }}
        InputProps={{
          startAdornment: <Search className="mr-2 h-4 w-4 text-[var(--text-secondary)]" />,
        }}
      />

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {(['all', 'today', '7d', '30d'] as ActivityDateRange[]).map((range) => (
          <Chip
            key={range}
            clickable
            label={getDateRangeLabel(range)}
            onClick={() => setSelectedDateRange(range)}
            variant={selectedDateRange === range ? 'filled' : 'outlined'}
            sx={{
              fontWeight: 600,
              bgcolor: selectedDateRange === range ? 'rgba(59, 130, 246, 0.14)' : 'transparent',
              color: selectedDateRange === range ? 'rgb(96, 165, 250)' : 'var(--text-secondary)',
              borderColor: selectedDateRange === range ? 'rgba(96, 165, 250, 0.28)' : 'var(--border)',
            }}
          />
        ))}
      </Box>
      
      {filteredLogs.length === 0 ? (
        <Typography color="textSecondary" sx={{ fontStyle: 'italic', fontSize: '0.875rem' }}>
          {logs.length === 0 ? 'No activity recorded yet.' : 'No activity matches the selected filter.'}
        </Typography>
      ) : (
        <List sx={{ 
            bgcolor: 'var(--panel)', 
            borderRadius: 2, 
            border: '1px solid var(--border)',
            py: 0
        }}>
          {filteredLogs.map((log, index) => (
            (() => {
              const actionMeta = getActionMeta(log.action);
              const subtitles = getMetadataSubtitles(log);
              return (
            <ListItem 
                key={log.id} 
                sx={{ 
                    borderBottom: index < filteredLogs.length - 1 ? '1px solid var(--border)' : 'none',
                    py: 1.5
                }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getIcon(log.action)}
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={{ component: 'div' }}
                secondaryTypographyProps={{ component: 'div' }}
                primary={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={actionMeta.label}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          bgcolor: actionMeta.color,
                          color: actionMeta.textColor,
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {log.description}
                    </Typography>
                    {subtitles.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                        {subtitles.map((subtitle) => (
                          <Typography key={subtitle} variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                            {subtitle}
                          </Typography>
                        ))}
                      </Box>
                    )}
                    {(log.oldValue || log.newValue) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                          Change
                        </Typography>
                        {renderValuePill(log.oldValue, 'old')}
                        <ArrowRight className="w-3 h-3 text-[var(--text-secondary)]" />
                        {renderValuePill(log.newValue, 'new')}
                      </Box>
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <User className="w-3 h-3 text-[var(--text-secondary)]" />
                    <Typography variant="caption" color="textSecondary">
                      {log.performedBy}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      • {formatTime(log.timestamp)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
              );
            })()
          ))}
        </List>
      )}
    </Box>
  );
}

