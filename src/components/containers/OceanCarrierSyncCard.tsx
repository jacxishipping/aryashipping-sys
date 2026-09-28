'use client';

import React, { useState } from 'react';
import {
  Ship,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  Radio,
  Navigation,
  Anchor,
  Globe,
  Waves,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Box, Typography, Chip, Tooltip, CircularProgress } from '@mui/material';
import { Button, toast } from '@/components/design-system';
import { detectOceanCarrier } from '@/lib/services/ocean-carriers/carrier-detector';
import { type OceanCarrierSyncSnapshot } from '@/lib/services/ocean-carriers/types';

interface OceanCarrierSyncCardProps {
  containerId: string;
  containerNumber: string;
  shippingLine?: string | null;
  vesselName?: string | null;
  voyageNumber?: string | null;
  estimatedArrival?: string | Date | null;
  departureDate?: string | Date | null;
  loadingPort?: string | null;
  destinationPort?: string | null;
  status?: string | null;
  onSyncComplete?: () => void;
  className?: string;
}

export function OceanCarrierSyncCard({
  containerId,
  containerNumber,
  shippingLine,
  vesselName,
  voyageNumber,
  estimatedArrival,
  departureDate,
  loadingPort,
  destinationPort,
  status,
  onSyncComplete,
  className = '',
}: OceanCarrierSyncCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<any | null>(null);

  // Auto-detect ocean shipping line
  const carrier = detectOceanCarrier(shippingLine || containerNumber);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/carriers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to sync with carrier.');
      }

      setLastSyncResult(data);
      toast.success(`Synced with ${data.carrierName || carrier.name}! ${data.newEventsCount} new events.`);
      onSyncComplete?.();
    } catch (err: any) {
      toast.error(err.message || 'Carrier synchronization failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={`w-full rounded-2xl bg-[var(--panel)] border border-[var(--border)] p-4 shadow-sm space-y-4 ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md font-bold text-sm"
            style={{ backgroundColor: carrier.accentColor }}
          >
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-sm text-[var(--text-primary)]">
                {shippingLine || carrier.name}
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]">
                SCAC: {carrier.scac}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                DCSA 2.0 API
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Container: <strong className="font-mono text-[var(--text-primary)]">{containerNumber}</strong></span>
              <span>•</span>
              <span>{carrier.apiType.replace(/_/g, ' ')}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {carrier.trackingBaseUrl && (
            <a
              href={`${carrier.trackingBaseUrl}${encodeURIComponent(containerNumber)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
            >
              <span>Carrier Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <Button
            size="sm"
            variant="primary"
            onClick={handleSync}
            loading={isSyncing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync with {carrier.code === 'GENERIC_DCSA' ? 'Carrier' : carrier.code}
          </Button>
        </div>
      </div>

      {/* Vessel & Route Telematics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Vessel Name</span>
          <p className="font-bold text-[var(--text-primary)] mt-0.5 flex items-center gap-1 truncate">
            <Ship className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{vesselName || 'MAERSK VOYAGER'}</span>
          </p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Voyage Code</span>
          <p className="font-mono font-bold text-[var(--text-primary)] mt-0.5">
            {voyageNumber || 'V-2409W'}
          </p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Loading Port (POL)</span>
          <p className="font-bold text-[var(--text-primary)] mt-0.5 truncate">
            {loadingPort || 'Port of Newark (USNWK)'}
          </p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Port of Discharge (POD)</span>
          <p className="font-bold text-emerald-400 mt-0.5 truncate">
            {destinationPort || 'Port of Jebel Ali (AEJEA)'}
          </p>
        </div>
      </div>

      {/* Sync Status Feedback Banner */}
      {lastSyncResult && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Carrier sync updated: <strong>{lastSyncResult.newEventsCount} new events</strong>
              {lastSyncResult.updatedEta ? ' • ETA Recalculated' : ''}
              {lastSyncResult.milestoneAlertTriggered ? ` • ${lastSyncResult.milestoneAlertTriggered} alert sent to client` : ''}
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-500/80">Just now</span>
        </div>
      )}
    </div>
  );
}
