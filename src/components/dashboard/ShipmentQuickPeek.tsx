"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Typography, Divider } from '@mui/material';
import { 
  Car, 
  Package, 
  Ship, 
  MapPin, 
  Calendar, 
  DollarSign, 
  ExternalLink, 
  FileText, 
  User,
  CreditCard,
  Truck,
  CheckCircle2
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

interface ShipmentQuickPeekProps {
  shipmentId: string | null;
  open: boolean;
  onClose: () => void;
}

interface ShipmentDetail {
  id: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  vehicleColor?: string | null;
  lotNumber?: string | null;
  status: string;
  paymentStatus?: string;
  price: number;
  paidAmount?: number;
  createdAt: string;
  user?: {
    id?: string;
    name: string | null;
    email: string;
  };
  container?: {
    id: string;
    containerNumber: string;
    vesselName?: string | null;
    destinationPort?: string | null;
    estimatedArrival?: string | null;
    status?: string;
  } | null;
  dispatch?: {
    id: string;
    driverName?: string | null;
    status?: string | null;
  } | null;
}

const SHIPMENT_STEPS: MilestoneStep[] = [
  { id: 'ON_HAND', label: 'On Hand' },
  { id: 'DISPATCHING', label: 'Dispatching' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'RELEASED', label: 'Released' },
  { id: 'IN_TRANSIT_TO_DESTINATION', label: 'To Destination' },
  { id: 'DELIVERED', label: 'Delivered' },
];

export default function ShipmentQuickPeek({
  shipmentId,
  open,
  onClose,
}: ShipmentQuickPeekProps) {
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !shipmentId) {
      setShipment(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchDetails() {
      try {
        const res = await fetch(`/api/shipments/${shipmentId}`);
        if (!res.ok) throw new Error('Failed to load shipment');
        const data = await res.json();
        if (!cancelled) {
          setShipment(data.shipment || data);
        }
      } catch (err) {
        console.error('Error loading shipment quick peek:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [open, shipmentId]);

  const vehicleTitle = shipment
    ? [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle Shipment'
    : 'Shipment Details';

  const remainingBalance = shipment ? Math.max(0, (shipment.price || 0) - (shipment.paidAmount || 0)) : 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={
        shipment ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span className="font-bold tracking-tight text-base sm:text-lg">
              {vehicleTitle}
            </span>
          </Box>
        ) : (
          'Shipment Details'
        )
      }
      description={
        shipment?.vehicleVIN ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
            <span className="font-mono text-xs text-[var(--text-secondary)] font-semibold">
              VIN: {shipment.vehicleVIN}
            </span>
            <CopyButton value={shipment.vehicleVIN} label="VIN" />
          </Box>
        ) : undefined
      }
      badge={shipment ? <StatusBadge status={shipment.status} /> : undefined}
      actions={
        shipment && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                href={`/tracking?vin=${encodeURIComponent(shipment.vehicleVIN && shipment.vehicleVIN !== '-' ? shipment.vehicleVIN : shipment.id)}`}
                variant="outline"
                size="sm"
                icon={<Ship className="w-4 h-4 text-[var(--accent-gold)]" />}
              >
                Live Tracking
              </Button>
              <Button
                href={`/dashboard/shipments/${shipment.id}`}
                onClick={onClose}
                variant="primary"
                size="sm"
                icon={<ExternalLink className="w-4 h-4" />}
              >
                Open Full View
              </Button>
            </Box>
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
      ) : shipment ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Milestone Progression */}
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
              steps={SHIPMENT_STEPS}
              currentStepId={shipment.status}
              status={shipment.status === 'DELIVERED' ? 'completed' : 'default'}
              orientation="horizontal"
            />
          </Box>

          {/* Key Details Cards Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            {/* Customer */}
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-secondary, #6B7280)', mb: 0.5 }}>
                <User className="w-4 h-4 text-blue-600" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Customer</Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary, #111827)' }} noWrap>
                {shipment.user?.name || shipment.user?.email || 'Direct / Unassigned'}
              </Typography>
            </Box>

            {/* Container Assignment */}
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-secondary, #6B7280)', mb: 0.5 }}>
                <Package className="w-4 h-4 text-amber-600" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Container</Typography>
              </Box>
              {shipment.container ? (
                <>
                  <Link
                    href={`/dashboard/containers/${shipment.container.id}`}
                    onClick={onClose}
                    style={{ textDecoration: 'none' }}
                  >
                    <span className="font-mono font-bold text-sm text-[var(--accent-gold,#D4AF37)] hover:underline block truncate">
                      {shipment.container.containerNumber}
                    </span>
                  </Link>
                  {shipment.container.destinationPort && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'var(--text-secondary, #6B7280)', mt: 0.25 }} noWrap>
                      {shipment.container.destinationPort}
                    </Typography>
                  )}
                  {shipment.container.estimatedArrival && (
                    <Typography sx={{ fontSize: '0.68rem', color: 'var(--text-secondary, #6B7280)' }} noWrap>
                      ETA: {new Date(shipment.container.estimatedArrival).toLocaleDateString()}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary, #6B7280)' }}>
                  Unallocated
                </Typography>
              )}
            </Box>

            {/* Total Price */}
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-secondary, #6B7280)', mb: 0.5 }}>
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Total Price</Typography>
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary, #111827)' }}>
                {formatCurrency(shipment.price || 0)}
              </Typography>
            </Box>

            {/* Payment Status */}
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--background, #F9FAFB)', border: '1px solid var(--border, #E5E7EB)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-secondary, #6B7280)', mb: 0.5 }}>
                <CreditCard className="w-4 h-4 text-purple-600" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Payment Status</Typography>
              </Box>
              <Box sx={{ mt: 0.25 }}>
                <StatusBadge status={shipment.paymentStatus || 'PENDING'} size="sm" />
              </Box>
            </Box>
          </Box>

          {/* Vehicle Metadata Box */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'var(--panel-bg, #FFFFFF)',
              border: '1px solid var(--border, #E5E7EB)',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vehicle Specifications
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              <div>
                <span className="text-xs text-[var(--text-secondary)] block">Color</span>
                <span className="text-sm font-semibold text-gray-900">{shipment.vehicleColor || 'Standard'}</span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-secondary)] block">Lot Number</span>
                <span className="font-mono text-sm font-semibold text-gray-900">{shipment.lotNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-secondary)] block">Booking Date</span>
                <span className="text-sm font-semibold text-gray-900">
                  {shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-[var(--text-secondary)] block">Outstanding Balance</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(remainingBalance)}</span>
              </div>
            </Box>
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No shipment selected.
        </Typography>
      )}
    </Drawer>
  );
}
