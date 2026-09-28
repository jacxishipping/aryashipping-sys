'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { Box, Typography } from '@mui/material';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PageHeader, PaymentStatusBadge, toast } from '@/components/design-system';

type ShipmentDetailResponse = {
  portal: { id: string; name: string; code: string | null; requireCustomerLinkForReady?: boolean; defaultShipmentNotes?: string | null };
  assignment: {
    id: string;
    notes: string | null;
    noteSource?: 'MANUAL' | 'PORTAL_DEFAULT' | null;
    assignedAt: string;
    linkedAt: string | null;
    partnerCustomer: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      city: string | null;
      country: string | null;
    } | null;
    shipment: {
      id: string;
      serviceType: string;
      vehicleType: string;
      vehicleMake: string | null;
      vehicleModel: string | null;
      vehicleYear: number | null;
      vehicleVIN: string | null;
      vehicleColor: string | null;
      lotNumber: string | null;
      auctionName: string | null;
      hasKey: boolean | null;
      hasTitle: boolean | null;
      status: string;
      paymentStatus: string;
      createdAt: string;
      updatedAt: string;
      vehiclePhotos: string[];
      arrivalPhotos: string[];
      documents: Array<{
        id: string;
        name: string;
        description: string | null;
        fileUrl: string;
        category: string;
      }>;
      dispatch: {
        referenceNumber: string;
        origin: string;
        destination: string;
        status: string;
        dispatchDate: string | null;
        events: Array<{
          id: string;
          status: string;
          location: string | null;
          description: string | null;
          eventDate: string;
        }>;
      } | null;
      transit: {
        referenceNumber: string;
        origin: string;
        destination: string;
        status: string;
        estimatedDelivery: string | null;
        actualDelivery: string | null;
        events: Array<{
          id: string;
          origin: string;
          destination: string;
          status: string;
          location: string | null;
          description: string | null;
          eventDate: string;
        }>;
      } | null;
      container: {
        containerNumber: string;
        trackingNumber: string | null;
        vesselName: string | null;
        voyageNumber: string | null;
        loadingPort: string | null;
        destinationPort: string | null;
        estimatedArrival: string | null;
        actualArrival: string | null;
        currentLocation: string | null;
        progress: number | null;
        status: string;
        trackingEvents: Array<{
          id: string;
          status: string;
          location: string | null;
          description: string | null;
          eventDate: string;
          completed: boolean;
        }>;
      } | null;
    };
  };
  customerTracking: {
    currentStageLabel: string;
    summary: string;
    progressPercent: number;
    milestones: Array<{
      key: string;
      label: string;
      description: string;
      state: 'pending' | 'current' | 'complete';
      timestamp?: string;
    }>;
  };
  history: Array<{
    id: string;
    source: string;
    title: string;
    location: string | null;
    description: string | null;
    occurredAt: string;
  }>;
  portalFinance: {
    status: 'PENDING' | 'PARTIAL' | 'PAID';
    balance: number;
    debitAmount: number;
    paidAmount: number;
    ledgerEntryCount: number;
    paymentRecordCount: number;
    recentLedgerEntries: Array<{
      id: string;
      transactionDate: string;
      description: string;
      type: 'DEBIT' | 'CREDIT';
      amount: number;
      balance: number;
      paymentMethod: string | null;
      reference: string | null;
      notes: string | null;
    }>;
    recentPayments: Array<{
      id: string;
      amount: number;
      paymentDate: string;
      paymentMethod: string;
      reference: string | null;
      notes: string | null;
    }>;
  };
};

export default function PortalShipmentDetailPage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const shipmentId = String(params.shipmentId || '');
  const [data, setData] = useState<ShipmentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/partner-portals/${portalId}/shipments/${shipmentId}`, { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load shipment detail');
        }

        setData(payload);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Failed to load shipment detail');
      } finally {
        setLoading(false);
      }
    };

    void fetchDetail();
  }, [portalId, shipmentId]);

  if (loading) {
    return (
      <DashboardSurface>
        <DashboardPanel title="Shipment Detail">
          <Box sx={{ color: 'var(--text-secondary)' }}>Loading shipment detail...</Box>
        </DashboardPanel>
      </DashboardSurface>
    );
  }

  if (!data) {
    return (
      <DashboardSurface>
        <DashboardPanel title="Shipment Detail">
          <EmptyState icon={<Inventory2OutlinedIcon />} title="Shipment unavailable" description="This assigned shipment could not be loaded." />
        </DashboardPanel>
      </DashboardSurface>
    );
  }

  const shipment = data.assignment.shipment;
  const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType;
  const isReadyForPartnerHandling = data.portal.requireCustomerLinkForReady === false || Boolean(data.assignment.partnerCustomer);
  const noteSourceLabel = data.assignment.noteSource === 'PORTAL_DEFAULT'
    ? 'Inherited from portal default'
    : data.assignment.noteSource === 'MANUAL'
      ? 'Manual assignment note'
      : 'No assignment note';

  return (
    <DashboardSurface>
      <PageHeader
        title={vehicleLabel}
        description={`${data.portal.name} shipment workspace`}
        meta={[
          { label: 'Status', value: shipment.status, helper: data.customerTracking.currentStageLabel },
          { label: 'Progress', value: `${data.customerTracking.progressPercent}%`, helper: noteSourceLabel },
        ]}
        actions={
          <Link href={`/portal/${portalId}/shipments`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">Back to Shipments</Button>
          </Link>
        }
      />
        <DashboardGrid className="grid-cols-1 gap-4 lg:grid-cols-3">
          <Box className="lg:col-span-2" sx={{ display: 'grid', gap: 2 }}>
            <DashboardPanel title="Shipment Overview" description={data.customerTracking.summary}>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>{data.customerTracking.currentStageLabel}</Typography>
                  <Typography sx={{ color: 'var(--text-secondary)' }}>Status: {shipment.status}</Typography>
                </Box>
                <Box sx={{ height: 8, borderRadius: 999, bgcolor: 'var(--border)', overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${data.customerTracking.progressPercent}%`, bgcolor: 'var(--accent-gold)' }} />
                </Box>
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  {data.customerTracking.milestones.map((milestone) => (
                    <Box key={milestone.key} sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 2, bgcolor: 'var(--panel)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 600 }}>{milestone.label}</Typography>
                        <Typography sx={{ color: milestone.state === 'complete' ? 'var(--success)' : milestone.state === 'current' ? 'var(--accent-gold)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>
                          {milestone.state}
                        </Typography>
                      </Box>
                      <Typography sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>{milestone.description}</Typography>
                      {milestone.timestamp ? (
                        <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem', mt: 1 }}>
                          {new Date(milestone.timestamp).toLocaleString()}
                        </Typography>
                      ) : null}
                    </Box>
                  ))}
                </Box>
              </Box>
            </DashboardPanel>

            <DashboardPanel title="Status History" description="Customer-facing movement updates">
              {data.history.length === 0 ? (
                <EmptyState icon={<Inventory2OutlinedIcon />} title="No status history" description="No movement updates are available yet." />
              ) : (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  {data.history.map((item) => (
                    <Box key={item.id} sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 600 }}>{item.title}</Typography>
                        <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(item.occurredAt).toLocaleString()}</Typography>
                      </Box>
                      <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem', mt: 0.5 }}>{item.source}</Typography>
                      {item.location ? <Typography sx={{ mt: 1 }}>Location: {item.location}</Typography> : null}
                      {item.description ? <Typography sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>{item.description}</Typography> : null}
                    </Box>
                  ))}
                </Box>
              )}
            </DashboardPanel>

            {shipment.dispatch?.events && shipment.dispatch.events.length > 0 ? (
              <DashboardPanel title="Dispatch Events" description="Internal dispatch movement updates">
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  {shipment.dispatch.events.map((event) => (
                    <Box key={event.id} sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 600 }}>{event.status}</Typography>
                        <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(event.eventDate).toLocaleString()}</Typography>
                      </Box>
                      {event.location ? <Typography sx={{ mt: 0.5 }}><LocationOnOutlinedIcon sx={{ fontSize: 14, mr: 0.5, color: 'var(--text-secondary)' }}/>{event.location}</Typography> : null}
                      {event.description ? <Typography sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>{event.description}</Typography> : null}
                    </Box>
                  ))}
                </Box>
              </DashboardPanel>
            ) : null}

            {shipment.container?.trackingEvents && shipment.container.trackingEvents.length > 0 ? (
              <DashboardPanel title="Container Tracking" description="Container-level tracking events">
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  {shipment.container.trackingEvents.map((event) => (
                    <Box key={event.id} sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: event.completed ? 'var(--success)' : 'var(--accent-gold)' }} />
                        <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)', mt: 0.5, textTransform: 'uppercase' }}>
                          {event.completed ? 'Done' : 'Pending'}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 600 }}>{event.status}</Typography>
                          <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(event.eventDate).toLocaleString()}</Typography>
                        </Box>
                        {event.location ? <Typography sx={{ mt: 0.5 }}><LocationOnOutlinedIcon sx={{ fontSize: 14, mr: 0.5, color: 'var(--text-secondary)' }}/>{event.location}</Typography> : null}
                        {event.description ? <Typography sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>{event.description}</Typography> : null}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </DashboardPanel>
            ) : null}

            <DashboardPanel title="Documents" description="Public shipment documents shared to the portal">
              {shipment.documents.length === 0 ? (
                <EmptyState icon={<DescriptionOutlinedIcon />} title="No public documents" description="No public documents have been shared for this shipment yet." />
              ) : (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  {shipment.documents.map((document) => (
                    <Box key={document.id} sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 2, display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>{document.name}</Typography>
                        <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {document.category} • {document.description || 'Shared file'}
                        </Typography>
                      </Box>
                      <a href={document.fileUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <Button variant="outline" size="sm">Open</Button>
                      </a>
                    </Box>
                  ))}
                </Box>
              )}
            </DashboardPanel>
          </Box>

          <Box sx={{ display: 'grid', gap: 2 }}>
            <DashboardPanel title="Vehicle Info">
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                {(shipment.vehiclePhotos.length > 0 || shipment.arrivalPhotos.length > 0) ? (
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {shipment.vehiclePhotos.slice(0, 3).map((photoUrl, index) => (
                      <a key={`vehicle-${index}`} href={photoUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <Box component="img" src={photoUrl} alt={`Vehicle photo ${index + 1}`} sx={{ width: 80, height: 80, borderRadius: 2, border: '1px solid var(--border)', objectFit: 'cover' }} />
                      </a>
                    ))}
                    {shipment.arrivalPhotos.slice(0, 2).map((photoUrl, index) => (
                      <a key={`arrival-${index}`} href={photoUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <Box component="img" src={photoUrl} alt={`Arrival photo ${index + 1}`} sx={{ width: 80, height: 80, borderRadius: 2, border: '1px solid var(--border)', objectFit: 'cover' }} />
                      </a>
                    ))}
                  </Box>
                ) : null}
                <Typography><strong>VIN:</strong> {shipment.vehicleVIN || '—'}</Typography>
                <Typography><strong>Color:</strong> {shipment.vehicleColor || '—'}</Typography>
                <Typography><strong>Lot:</strong> {shipment.lotNumber || '—'}</Typography>
                <Typography><strong>Auction:</strong> {shipment.auctionName || '—'}</Typography>
                <Typography><strong>Has Key:</strong> {shipment.hasKey == null ? '—' : shipment.hasKey ? 'Yes' : 'No'}</Typography>
                <Typography><strong>Has Title:</strong> {shipment.hasTitle == null ? '—' : shipment.hasTitle ? 'Yes' : 'No'}</Typography>
              </Box>
            </DashboardPanel>

            <DashboardPanel title="Portal Customer">
              {data.assignment.partnerCustomer ? (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{data.assignment.partnerCustomer.name}</Typography>
                  <Typography>{data.assignment.partnerCustomer.email || 'No email'}</Typography>
                  <Typography>{data.assignment.partnerCustomer.phone || 'No phone'}</Typography>
                  <Typography sx={{ color: 'var(--text-secondary)' }}>{[data.assignment.partnerCustomer.city, data.assignment.partnerCustomer.country].filter(Boolean).join(', ') || 'No location'}</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gap: 1.5, alignItems: 'center' }}>
                  <EmptyState icon={<PersonOutlineIcon />} title="No linked portal customer" description="This shipment has not been linked to one of your portal customers yet." />
                  <Link href={`/portal/${portalId}/customers`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">Link a Customer</Button>
                  </Link>
                </Box>
              )}
            </DashboardPanel>

            <DashboardPanel title="Portal Readiness">
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Typography sx={{ fontWeight: 700, color: isReadyForPartnerHandling ? 'var(--success)' : 'var(--warning-dark)' }}>
                  {isReadyForPartnerHandling ? 'Ready for partner handling' : 'Waiting for customer link'}
                </Typography>
                <Typography sx={{ color: 'var(--text-secondary)' }}>
                  {data.portal.requireCustomerLinkForReady === false
                    ? 'This portal allows shipments to be treated as ready even before a portal customer is linked.'
                    : 'This portal requires a linked portal customer before staff should treat the shipment as ready.'}
                </Typography>
                {data.assignment.notes ? (
                  <Box sx={{ display: 'grid', gap: 0.5 }}>
                    <Typography sx={{ fontWeight: 700 }}>{noteSourceLabel}</Typography>
                    <Typography><strong>Assignment Notes:</strong> {data.assignment.notes}</Typography>
                  </Box>
                ) : data.portal.defaultShipmentNotes ? (
                  <Box sx={{ display: 'grid', gap: 0.5 }}>
                    <Typography sx={{ fontWeight: 700, color: 'var(--info-dark)' }}>Portal default is available</Typography>
                    <Typography><strong>Default Portal Notes:</strong> {data.portal.defaultShipmentNotes}</Typography>
                  </Box>
                ) : null}
              </Box>
            </DashboardPanel>

            <DashboardPanel title="Portal Finance">
              <Box sx={{ display: 'grid', gap: 1.25 }}>
                <Typography sx={{ fontWeight: 700 }}>Portal-only status</Typography>
                <PaymentStatusBadge status={data.portalFinance.status} />
                <Typography><strong>Portal Balance:</strong> {formatCurrency(data.portalFinance.balance)}</Typography>
                <Typography><strong>Portal Debits:</strong> {formatCurrency(data.portalFinance.debitAmount)}</Typography>
                <Typography><strong>Portal Payments:</strong> {formatCurrency(data.portalFinance.paidAmount)}</Typography>
                <Typography sx={{ color: 'var(--text-secondary)' }}>
                  {data.portalFinance.paymentRecordCount} payment record(s) and {data.portalFinance.ledgerEntryCount} ledger entry/entries exist only in the portal and do not change the main shipment payment state.
                </Typography>
                {data.portalFinance.recentPayments.length > 0 ? (
                  <Box sx={{ display: 'grid', gap: 0.75, pt: 0.75 }}>
                    <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Recent Portal Payments</Typography>
                    {data.portalFinance.recentPayments.slice(0, 3).map((payment) => (
                      <Box key={payment.id} sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 1.25, bgcolor: 'rgba(var(--success-rgb),0.05)' }}>
                        <Typography sx={{ fontWeight: 700 }}>{formatCurrency(payment.amount)}</Typography>
                        <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{new Date(payment.paymentDate).toLocaleDateString()} • {payment.paymentMethod}</Typography>
                        {payment.reference ? <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Ref: {payment.reference}</Typography> : null}
                      </Box>
                    ))}
                  </Box>
                ) : null}
              </Box>
            </DashboardPanel>

            <DashboardPanel title="Route Snapshot">
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                {shipment.dispatch ? (
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 1.5, bgcolor: 'rgba(var(--brand-primary-rgb),0.04)' }}>
                    <Typography sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <LocalShippingOutlinedIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                      Dispatch: {shipment.dispatch.referenceNumber}
                    </Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {shipment.dispatch.origin} → {shipment.dispatch.destination}
                    </Typography>
                    {shipment.dispatch.dispatchDate ? (
                      <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <ScheduleOutlinedIcon sx={{ fontSize: 12, mr: 0.5 }} />
                        Dispatched: {new Date(shipment.dispatch.dispatchDate).toLocaleString()}
                      </Typography>
                    ) : null}
                  </Box>
                ) : null}
                {shipment.container ? (
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 1.5, bgcolor: 'rgba(var(--accent-rgb),0.05)' }}>
                    <Typography sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Inventory2OutlinedIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                      Container: {shipment.container.containerNumber}
                    </Typography>
                    {shipment.container.vesselName ? <Typography sx={{ fontSize: '0.85rem' }}>Vessel: {shipment.container.vesselName} ({shipment.container.voyageNumber || '—'})</Typography> : null}
                    {shipment.container.trackingNumber ? <Typography sx={{ fontSize: '0.85rem' }}>Tracking: {shipment.container.trackingNumber}</Typography> : null}
                    {shipment.container.currentLocation ? <Typography sx={{ fontSize: '0.85rem' }}><LocationOnOutlinedIcon sx={{ fontSize: 14, mr: 0.5, color: 'var(--text-secondary)' }}/>{shipment.container.currentLocation}</Typography> : null}
                    {shipment.container.estimatedArrival ? <Typography sx={{ fontSize: '0.85rem' }}>ETA: {new Date(shipment.container.estimatedArrival).toLocaleDateString()}</Typography> : null}
                    {shipment.container.actualArrival ? <Typography sx={{ fontSize: '0.85rem' }}>Arrived: {new Date(shipment.container.actualArrival).toLocaleDateString()}</Typography> : null}
                  </Box>
                ) : null}
                {shipment.transit ? (
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 1.5, bgcolor: 'rgba(var(--text-primary-rgb),0.03)' }}>
                    <Typography sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                      Final Transit
                    </Typography>
                    <Typography sx={{ fontSize: '0.85rem' }}>{shipment.transit.origin} → {shipment.transit.destination}</Typography>
                    {shipment.transit.estimatedDelivery ? <Typography sx={{ fontSize: '0.85rem' }}>Estimated Delivery: {new Date(shipment.transit.estimatedDelivery).toLocaleDateString()}</Typography> : null}
                    {shipment.transit.actualDelivery ? <Typography sx={{ fontSize: '0.85rem', color: 'var(--success)' }}>Delivered: {new Date(shipment.transit.actualDelivery).toLocaleDateString()}</Typography> : null}
                  </Box>
                ) : null}
              </Box>
            </DashboardPanel>

            {(shipment.vehiclePhotos.length > 0 || shipment.arrivalPhotos.length > 0) ? (
              <DashboardPanel title="Photos">
                <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                  {[...shipment.vehiclePhotos, ...shipment.arrivalPhotos].slice(0, 8).map((photoUrl, index) => (
                    <a key={`${photoUrl}-${index}`} href={photoUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                      <Box component="img" src={photoUrl} alt={`Shipment photo ${index + 1}`} sx={{ width: '100%', height: 120, borderRadius: 2, border: '1px solid var(--border)', objectFit: 'cover' }} />
                    </a>
                  ))}
                </Box>
              </DashboardPanel>
            ) : null}
          </Box>
        </DashboardGrid>
    </DashboardSurface>
  );
}