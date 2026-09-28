"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Typography, Divider, LinearProgress } from '@mui/material';
import { 
  Package, 
  Ship, 
  MapPin, 
  Calendar, 
  DollarSign, 
  ExternalLink, 
  FileText, 
  Layers,
  ArrowRight,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { 
  Drawer, 
  StatusBadge, 
  Button, 
  CopyButton, 
  MilestoneStepper, 
  type MilestoneStep,
  Skeleton
} from '@/components/design-system';
import { formatMoney as formatCurrency } from '@/lib/format';

interface ContainerQuickPeekProps {
  containerId: string | null;
  open: boolean;
  onClose: () => void;
}

interface ContainerDetail {
  id: string;
  containerNumber: string;
  trackingNumber: string | null;
  vesselName: string | null;
  shippingLine: string | null;
  destinationPort: string | null;
  estimatedArrival: string | null;
  status: string;
  progress: number;
  currentCount: number;
  maxCapacity: number;
  createdAt: string;
  shipments?: Array<{
    id: string;
    vehicleVIN: string | null;
    vehicleYear: number | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    status: string;
    price: number;
    user?: { name: string | null; email: string };
  }>;
  _count?: {
    shipments: number;
    expenses: number;
    invoices: number;
  };
}

const CONTAINER_STEPS: MilestoneStep[] = [
  { id: 'CREATED', label: 'Created' },
  { id: 'WAITING_FOR_LOADING', label: 'Waiting' },
  { id: 'LOADED', label: 'Loaded' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'ARRIVED_PORT', label: 'Arrived Port' },
  { id: 'CUSTOMS_CLEARANCE', label: 'Customs' },
  { id: 'RELEASED', label: 'Released' },
  { id: 'CLOSED', label: 'Closed' },
];

export default function ContainerQuickPeek({
  containerId,
  open,
  onClose,
}: ContainerQuickPeekProps) {
  const [container, setContainer] = useState<ContainerDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !containerId) {
      setContainer(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchDetails() {
      try {
        const res = await fetch(`/api/containers/${containerId}`);
        if (!res.ok) throw new Error('Failed to load container');
        const data = await res.json();
        if (!cancelled) {
          setContainer(data.container || data);
        }
      } catch (err) {
        console.error('Error loading container quick peek:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [open, containerId]);

  const capacityPercent = container && container.maxCapacity > 0
    ? Math.min(100, Math.round((container.currentCount / container.maxCapacity) * 100))
    : 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={
        container ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span className="font-mono font-bold tracking-tight text-base sm:text-lg">
              {container.containerNumber}
            </span>
            <CopyButton value={container.containerNumber} label="Container Number" />
          </Box>
        ) : (
          'Container Details'
        )
      }
      description={container?.shippingLine ? `${container.shippingLine} • ${container.destinationPort || 'Port TBD'}` : undefined}
      badge={container ? <StatusBadge status={container.status} /> : undefined}
      actions={
        container && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              href={`/dashboard/containers/${container.id}`}
              onClick={onClose}
              variant="primary"
              size="sm"
              icon={<ExternalLink className="w-4 h-4" />}
            >
              Open Full View
            </Button>
          </Box>
        )
      }
    >
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rounded" height={90} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={160} />
        </Box>
      ) : container ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Milestone Stepper */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'var(--background, #F9FAFB)',
              border: '1px solid var(--border, #E5E7EB)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary, #6B7280)', mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Milestone Progression
            </Typography>
            <MilestoneStepper
              steps={CONTAINER_STEPS}
              currentStepId={container.status}
              status={container.status === 'CLOSED' ? 'completed' : 'default'}
              orientation="horizontal"
            />
          </Box>

          {/* Capacity Progress Bar */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'var(--panel-bg, #FFFFFF)',
              border: '1px solid var(--border, #E5E7EB)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary, #6B7280)' }}>
                Cargo Loading Capacity
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary, #111827)' }}>
                {container.currentCount} / {container.maxCapacity} ({capacityPercent}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={capacityPercent}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'var(--background, #F3F4F6)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: capacityPercent >= 100 ? 'var(--error, #EF4444)' : 'var(--accent-gold, #D4AF37)',
                  borderRadius: 4,
                },
              }}
            />
          </Box>

          {/* Quick Metrics Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-secondary, #6B7280)', mb: 0.5 }}>
                <Ship className="w-4 h-4 text-amber-600" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Vessel</Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary, #111827)' }} noWrap>
                {container.vesselName || 'Unassigned'}
              </Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-secondary, #6B7280)', mb: 0.5 }}>
                <MapPin className="w-4 h-4 text-emerald-600" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Destination Port</Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary, #111827)' }} noWrap>
                {container.destinationPort || 'TBD'}
              </Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-secondary, #6B7280)', mb: 0.5 }}>
                <Calendar className="w-4 h-4 text-blue-600" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>ETA</Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary, #111827)' }} noWrap>
                {container.estimatedArrival ? new Date(container.estimatedArrival).toLocaleDateString() : 'Pending'}
              </Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-secondary, #6B7280)', mb: 0.5 }}>
                <Layers className="w-4 h-4 text-purple-600" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Manifest Items</Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary, #111827)' }}>
                {container._count?.shipments ?? container.shipments?.length ?? 0} Vehicles
              </Typography>
            </Box>
          </Box>

          {/* Manifest Preview List */}
          {container.shipments && container.shipments.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary, #111827)' }}>
                  Loaded Cargo Manifest ({container.shipments.length})
                </Typography>
                <Link
                  href={`/dashboard/containers/${container.id}?tab=cargo`}
                  onClick={onClose}
                  style={{ fontSize: '0.75rem', color: 'var(--accent-gold, #D4AF37)', fontWeight: 600, textDecoration: 'none' }}
                >
                  View All &rarr;
                </Link>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 220, overflowY: 'auto' }}>
                {container.shipments.map((shipment) => (
                  <Box
                    key={shipment.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      border: '1px solid var(--border, #E5E7EB)',
                      bgcolor: 'var(--background, #F9FAFB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      '&:hover': {
                        bgcolor: 'var(--panel, #FFFFFF)',
                        borderColor: 'var(--accent-gold, #D4AF37)',
                      },
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary, #111827)' }} noWrap>
                        {[shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}
                      </Typography>
                      {shipment.vehicleVIN && (
                        <span className="font-mono text-xs text-[var(--text-secondary)] tracking-tight">
                          VIN: {shipment.vehicleVIN}
                        </span>
                      )}
                    </Box>
                    <StatusBadge status={shipment.status} size="sm" />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No container selected.
        </Typography>
      )}
    </Drawer>
  );
}
